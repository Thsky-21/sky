"""Gate C dialogue gate for "Did We Make It?".

Checks dialogue.json against SCRIPT_TIMELINE.md before any voice is generated:
  1. dialogue.json structure: fields, ID pattern/uniqueness, speakers, audio_file = audio/<ID>.wav.
  2. Every quoted line in the script's dialogue column matches a dialogue.json line, in order,
     character for character (curly quotes, apostrophes, … and — included), with the same speaker
     and the same start/end window as its table row.
  3. Windows: start < end, inside 0..runtime, sorted, non-overlapping.
  4. V.O. lines (from the script's "(V.O.)" labels) equal the locked set in CLAUDE.md.
  5. Pacing estimate: words per second of window. A warning only: the real check is the measured
     voice duration (step after temp voices). Lines are never paraphrased or re-timed here.

usage: python tools/check_dialogue.py [--quiet]
exit code 0 = gate passed (warnings allowed), 1 = at least one error.
Standard library only.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIALOGUE = os.path.join(ROOT, 'dialogue.json')
SCRIPT = os.path.join(ROOT, 'SCRIPT_TIMELINE.md')

SPEAKERS = {'FIRST-YEAR SKY': 'FIRST_YEAR_SKY', 'THIRD-YEAR SKY': 'THIRD_YEAR_SKY'}
ID_PREFIX = {'FIRST_YEAR_SKY': 'Y', 'THIRD_YEAR_SKY': 'T'}
FIELDS = ['id', 'start_seconds', 'end_seconds', 'speaker', 'text', 'delivery', 'audio_file']
VO_LOCKED = {'T03', 'T04', 'T05', 'T06', 'T07', 'T11'}  # CLAUDE.md, decision 2026-11-04
WPS_WARN = 3.0  # words/second of window above which a temp voice will likely overflow

ROW = re.compile(r'^\|\s*(\d\d):(\d\d)\s*[–-]\s*(\d\d):(\d\d)\s*\|')
LINE = re.compile(r'\*\*(FIRST-YEAR SKY|THIRD-YEAR SKY)( \(V\.O\.\))?:\*\*\s*“(.*?)”')

errors, warnings = [], []
err = errors.append
warn = warnings.append


def script_lines():
    """Yield (row_no, start, end, speaker, vo, text) for each quoted line in the dialogue column."""
    with open(SCRIPT, encoding='utf-8') as f:
        for n, row in enumerate(f, 1):
            m = ROW.match(row)
            if not m:
                continue
            a, b = int(m[1]) * 60 + int(m[2]), int(m[3]) * 60 + int(m[4])
            cells = [c.strip() for c in row.strip().strip('|').split('|')]
            if len(cells) != 4:
                err(f'SCRIPT_TIMELINE.md:{n}: expected 4 table cells, found {len(cells)}')
                continue
            dialogue_cell = cells[2]
            found = LINE.findall(dialogue_cell)
            if not found and 'No dialogue' not in dialogue_cell:
                err(f'SCRIPT_TIMELINE.md:{n}: dialogue cell has no recognisable line: {dialogue_cell[:60]}')
            if len(found) > 1:
                err(f'SCRIPT_TIMELINE.md:{n}: {len(found)} lines in one row; each row should hold one line')
            for who, vo, text in found:
                yield n, a, b, SPEAKERS[who], bool(vo), text


def main():
    quiet = '--quiet' in sys.argv
    with open(DIALOGUE, encoding='utf-8') as f:
        data = json.load(f)
    runtime = data.get('runtime_seconds')
    if runtime != 180:
        err(f'runtime_seconds is {runtime!r}, expected 180')
    lines = data.get('lines', [])

    # 1. structure
    seen = set()
    count = {'Y': 0, 'T': 0}
    for i, l in enumerate(lines):
        lid = l.get('id', f'#{i}')
        if sorted(l) != sorted(FIELDS):
            err(f'{lid}: fields {sorted(l)} != {sorted(FIELDS)}')
        if lid in seen:
            err(f'{lid}: duplicate id')
        seen.add(lid)
        sp = l.get('speaker')
        if sp not in ID_PREFIX:
            err(f'{lid}: unknown speaker {sp!r}')
            continue
        p = ID_PREFIX[sp]
        count[p] += 1
        if lid != f'{p}{count[p]:02d}':
            err(f'{lid}: expected id {p}{count[p]:02d} for {sp} line {count[p]} (IDs must run in order per speaker)')
        if l.get('audio_file') != f'audio/{lid}.wav':
            err(f'{lid}: audio_file {l.get("audio_file")!r} != audio/{lid}.wav')
        if not str(l.get('text', '')).strip():
            err(f'{lid}: empty text')
        if not str(l.get('delivery', '')).strip():
            warn(f'{lid}: empty delivery note')

    # 2. script ↔ dialogue.json
    script = list(script_lines())
    if len(script) != len(lines):
        err(f'line count: SCRIPT_TIMELINE.md has {len(script)}, dialogue.json has {len(lines)}')
    vo_found = set()
    for (n, a, b, sp, vo, text), l in zip(script, lines):
        lid = l.get('id')
        if l.get('text') != text:
            # point at the first differing character so a curly/straight quote swap is obvious
            j = next((k for k, (x, y) in enumerate(zip(text, l.get('text', ''))) if x != y),
                     min(len(text), len(l.get('text', ''))))
            err(f'{lid}: text differs from SCRIPT_TIMELINE.md:{n} at char {j}\n'
                f'      script: {text!r}\n      json:   {l.get("text")!r}')
        if l.get('speaker') != sp:
            err(f'{lid}: speaker {l.get("speaker")} != script {sp} (SCRIPT_TIMELINE.md:{n})')
        if (l.get('start_seconds'), l.get('end_seconds')) != (a, b):
            err(f'{lid}: window {l.get("start_seconds")}–{l.get("end_seconds")} s != script {a}–{b} s '
                f'(SCRIPT_TIMELINE.md:{n})')
        if vo:
            vo_found.add(lid)

    # 3. windows
    prev = None
    for l in lines:
        s, e, lid = l.get('start_seconds'), l.get('end_seconds'), l.get('id')
        if not all(isinstance(v, (int, float)) for v in (s, e)):
            err(f'{lid}: non-numeric window')
            continue
        if not 0 <= s < e <= (runtime or 180):
            err(f'{lid}: window {s}–{e} s is empty or outside 0–{runtime} s')
        if prev and s < prev[2]:
            err(f'{lid}: window starts at {s} s, before {prev[0]} ends at {prev[2]} s')
        prev = (lid, s, e)

    # 4. V.O.
    if vo_found != VO_LOCKED:
        err(f'V.O. lines in script {sorted(vo_found)} != locked set {sorted(VO_LOCKED)}')

    # 5. pacing estimate
    rows = []
    for l in lines:
        words = len(re.findall(r"[\w'’.$]+", l['text']))
        win = l['end_seconds'] - l['start_seconds']
        wps = words / win
        flag = 'TIGHT' if wps > WPS_WARN else ''
        if flag:
            warn(f'{l["id"]}: {words} words in a {win:g} s window ({wps:.2f} w/s): likely to overflow; '
                 f'confirm with the measured temp voice')
        rows.append((l['id'], l['start_seconds'], l['end_seconds'], 'V.O.' if l['id'] in VO_LOCKED else '',
                     words, wps, flag, l['text']))

    if not quiet:
        print(f'{"ID":4} {"window":>9} {"":4} {"words":>5} {"w/s":>5}  text')
        for lid, s, e, vo, w, r, flag, t in rows:
            short = t if len(t) <= 70 else t[:67] + '...'
            print(f'{lid:4} {s:>4}–{e:<4} {vo:4} {w:>5} {r:>5.2f}  {short}  {flag}')
        print()
    for w in warnings:
        print('WARN ', w)
    for e in errors:
        print('ERROR', e)
    print(f'\ndialogue gate: {"FAILED" if errors else "PASSED"} '
          f'({len(lines)} lines, {len(errors)} errors, {len(warnings)} warnings)')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
