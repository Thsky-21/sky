"""Duration gate + subtitle cues: every placed line must fit its dialogue.json window with its MEASURED length.

usage: python tools/check_timing.py [--clip 01]
  reads dialogue.json (windows, text), timeline.json (where each line starts), voices/dur.json (measured lengths)
  writes subs/clip<NN>_cues.json ([{t0, t1, text}], clip-relative) for <LIB>/core/render/srt.py
Nothing is time-stretched or moved: a line that overflows is reported (CLAUDE.md, "Voice overflow") and the gate fails.
Subtitle text is dialogue.json's text exactly; each cue stays up at least 1.2 s (when the window allows) and never
past the window or the next line.
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda *p: json.load(open(os.path.join(ROOT, *p), encoding='utf-8'))


def wrap(text, width=46):
    """two balanced subtitle rows for long lines: a line break at the space nearest the middle (the words are untouched)"""
    if len(text) <= width: return text
    mid = len(text) // 2
    sp = min((i for i, ch in enumerate(text) if ch == ' '), key=lambda i: abs(i - mid), default=None)
    return text if sp is None else text[:sp] + '\n' + text[sp + 1:]


def main():
    clip = sys.argv[sys.argv.index('--clip') + 1] if '--clip' in sys.argv else '01'
    D = {l['id']: l for l in J('dialogue.json')['lines']}
    TL, dur = J('timeline.json'), J('voices', 'dur.json')
    c0, c1 = TL['clips'][clip]
    placed = sorted(((t, i) for i, t in TL['lines'].items() if c0 <= t < c1))
    bad, cues = 0, []
    print(f'{"ID":4} {"window":>11} {"start":>6} {"len":>6} {"end":>6} {"spare":>6}')
    for k, (t, lid) in enumerate(placed):
        l = D[lid]; a, b = l['start_seconds'], l['end_seconds']
        if lid not in dur:
            print(f'{lid:4} no voice file voices/{lid}.wav'); bad += 1; continue
        end = t + dur[lid]; spare = b - end
        flag = '' if (t >= a and end <= b) else '  OVERFLOW' if end > b else '  STARTS EARLY'
        bad += bool(flag)
        print(f'{lid:4} {a:>5}–{b:<5} {t:6.2f} {dur[lid]:6.2f} {end:6.2f} {spare:6.2f}{flag}')
        nxt = placed[k + 1][0] if k + 1 < len(placed) else c1
        t1 = min(b, nxt - .05, max(end + .35, t + 1.2))
        cues.append({'t0': round(t - c0, 3), 't1': round(t1 - c0, 3), 'text': wrap(l['text'])})
    os.makedirs(os.path.join(ROOT, 'subs'), exist_ok=True)
    with open(os.path.join(ROOT, 'subs', f'clip{clip}_cues.json'), 'w', encoding='utf-8') as f:
        json.dump(cues, f, ensure_ascii=False, indent=1)
    print(f'\nsubs/clip{clip}_cues.json: {len(cues)} cues')
    print('timing gate:', 'FAILED' if bad else 'PASSED', f'({len(placed)} lines in clip {clip})')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
