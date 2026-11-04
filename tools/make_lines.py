"""Generate tts/lines.json (the library's TTS input) from dialogue.json, the only dialogue source.

usage: python tools/make_lines.py [--from 0] [--to 180]
Keeps dialogue.json's IDs and text exactly (one WAV per line: voices/<ID>.wav), so Sky's real recordings
(VOICE_REPLACEMENT.md) can replace any file with the same name. Only the voice casting lives here.
Lines are included when their window starts inside [from, to).
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# temp casting: ONE voice for both Skys (same young man, PLAN §11.3); Third-year a touch steadier and slower,
# First-year a touch quicker (SCRIPT_TIMELINE "Dialogue performance notes")
CAST = {
    'FIRST_YEAR_SKY': {'who': 'FY', 'voice': 'am_liam', 'speed': 1.0},
    'THIRD_YEAR_SKY': {'who': 'TY', 'voice': 'am_liam', 'speed': 0.92},
}


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
        c = CAST[l['speaker']]
        out.append({'id': l['id'], 'who': c['who'], 'text': l['text'], 'voice': c['voice'], 'speed': c['speed']})
    os.makedirs(os.path.join(ROOT, 'tts'), exist_ok=True)
    with open(os.path.join(ROOT, 'tts', 'lines.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f'tts/lines.json: {len(out)} lines ({", ".join(x["id"] for x in out)})')


if __name__ == '__main__':
    main()
