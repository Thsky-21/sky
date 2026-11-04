"""Reshape the melody of the TEMP voices (Praat PSOLA via parselmouth): tts/lines.json `pitch` → voices/<ID>.wav in place.

usage: <LIB>/.venv/bin/python tools/perform.py
Kokoro reads every question with a falling end; an excited "did we make it?!" rises. This lifts a line's pitch by
`lift` semitones and, from `rise[0]` (fraction of the voiced span) to its end, replaces the falling tail with a rise of
`rise[1]` semitones from the pitch it had there (30 % of the natural wobble kept).
Length and words are unchanged (overlap-add resynthesis). Only run right after TTS: build_clip.sh --keep-voices skips it,
so Sky's real recordings are never touched.
"""
import json, os
import parselmouth
from parselmouth.praat import call

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    lines = json.load(open(os.path.join(ROOT, 'tts', 'lines.json'), encoding='utf-8'))
    for L in lines:
        p = L.get('pitch')
        if not p: continue
        path = os.path.join(ROOT, 'voices', L['id'] + '.wav')
        snd = parselmouth.Sound(path); T = snd.get_total_duration()
        man = call(snd, 'To Manipulation', 0.01, 70, 320)
        tier = call(man, 'Extract pitch tier')
        lift = p.get('lift', 0); r0, rs = p.get('rise', [1, 0])
        # the ramp runs over the VOICED span (first → last pitch point): the trailing consonant and silence carry no pitch
        n = call(tier, 'Get number of points')
        v0, v1 = call(tier, 'Get time from index', 1), call(tier, 'Get time from index', n)
        ta = v0 + r0 * (v1 - v0)
        if rs:
            # replace the tail's own (falling) melody with a rise from the pitch at ta; keep 30 % of its natural wobble
            pa = call(tier, 'Get value at time', ta)
            u = f'min(1, (x - {ta}) / ({v1} - {ta} + 1e-6))'
            call(tier, 'Formula', f'if x > {ta} then {pa} * 2^(({lift} + {rs} * {u}) / 12) * (self / {pa})^0.3 else self * 2^({lift} / 12) fi')
        else:
            call(tier, 'Formula', f'self * 2^({lift} / 12)')
        call([tier, man], 'Replace pitch tier')
        out = call(man, 'Get resynthesis (overlap-add)')
        out.save(path, 'WAV')
        print(f"{L['id']}: +{lift} st, rising +{rs} st over the last {round((1 - r0) * 100)} % ({T:.2f} s)")


if __name__ == '__main__':
    main()
