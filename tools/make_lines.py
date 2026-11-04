"""Generate tts/lines.json (the library's TTS input) from dialogue.json, the only dialogue source.

usage: python tools/make_lines.py [--from 0] [--to 180]
Keeps dialogue.json's IDs and words exactly (one WAV per line: voices/<ID>.wav), so Sky's real recordings
(VOICE_REPLACEMENT.md) can replace any file with the same name. Only the temp casting and performance live here.
Lines are included when their window starts inside [from, to).

Each entry: id, who, script (dialogue.json text, exact), text (what the TTS reads), voice, speed, and optionally
`pitch` (tools/perform.py: a melody reshaping of the temp take, PSOLA, length unchanged).
`text` may differ from `script` ONLY in punctuation that steers the TTS delivery; the words never change (checked).
Subtitles and on-screen text always use dialogue.json.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# temp casting: ONE voice for both Skys (same young man, PLAN §11.3)
CAST = {
    'FIRST_YEAR_SKY': {'who': 'FY', 'voice': 'am_liam', 'speed': 1.1},    # eager, a little quicker
    'THIRD_YEAR_SKY': {'who': 'TY', 'voice': 'am_liam', 'speed': 0.92},   # steadier, measured
}
# per-line performance for the temp voices (Sky's direction 2026-11-04: First-year sounds excited, fast-paced early on)
#   say:   punctuation-only variant of the script line read by the TTS
#   pitch: {lift: semitones over the whole line, rise: [from fraction of the line, semitones added by the end]}
PERF = {
    'Y01': {'say': 'So… did we make it?!', 'speed': 1.2, 'pitch': {'lift': 1.5, 'rise': [.5, 8.0]}},
    'Y02': {'speed': 1.0, 'pitch': {'lift': 0.5, 'rise': [.6, 2.0]}},
    'Y03': {'speed': 1.14, 'pitch': {'lift': 1.0, 'rise': [.86, 6.0]}},
    'Y04': {'speed': 1.08, 'pitch': {'lift': 1.0}},
}

words = lambda s: re.findall(r"[A-Za-z0-9']+", s.replace('’', "'").lower())


def arg(name, default):
    return float(sys.argv[sys.argv.index(name) + 1]) if name in sys.argv else default


def main():
    t0, t1 = arg('--from', 0), arg('--to', 180)
    with open(os.path.join(ROOT, 'dialogue.json'), encoding='utf-8') as f:
        lines = json.load(f)['lines']
    out = []
    for l in lines:
        if not t0 <= l['start_seconds'] < t1:
            continue
        c, p = CAST[l['speaker']], PERF.get(l['id'], {})
        say = p.get('say', l['text'])
        if words(say) != words(l['text']):
            sys.exit(f"make_lines.py: {l['id']}: the TTS text changes words, not only punctuation:\n  {say!r}\n  {l['text']!r}")
        e = {'id': l['id'], 'who': c['who'], 'script': l['text'], 'text': say, 'voice': c['voice'], 'speed': p.get('speed', c['speed'])}
        if 'pitch' in p: e['pitch'] = p['pitch']
        out.append(e)
    os.makedirs(os.path.join(ROOT, 'tts'), exist_ok=True)
    with open(os.path.join(ROOT, 'tts', 'lines.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f'tts/lines.json: {len(out)} lines ({", ".join(x["id"] for x in out)})')


if __name__ == '__main__':
    main()
