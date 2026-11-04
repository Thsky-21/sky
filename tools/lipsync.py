"""Mouth tracks from the voice files: voices/<ID>.wav → voices/mouth.json.

usage: <LIB>/.venv/bin/python tools/lipsync.py
Reads every voices/<ID>.wav, so it works the same for temp TTS and for Sky's real recordings (re-run after replacing).
Mouths change on twos (12 drawings/s at 24 fps; Sky asked for smoother motion, 2026-11-04). Each drawing is chosen from the audio slightly ahead of
it (animators lead the sound by about a frame) using loudness and a rounded-vs-bright spectral balance:
  C closed (M/B/P, pauses) · T talk (small open) · O "oh" (rounded) · A open wide (bright vowels)
Also stores a 24 fps loudness envelope `a` (0..1) for head accents.
"""
import glob, json, os
import numpy as np, soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICES = os.path.join(ROOT, 'voices')
MFPS, AFPS, LEAD = 12, 24, 0.04


def band(spec, freqs, lo, hi):
    m = (freqs >= lo) & (freqs < hi)
    return spec[m].sum()


def track(path):
    a, sr = sf.read(path, dtype='float32')
    if a.ndim > 1:
        a = a.mean(1)
    dur = len(a) / sr

    def window(t0, t1):
        s0, s1 = max(0, int(t0 * sr)), min(len(a), int(t1 * sr))
        return a[s0:s1] if s1 > s0 else np.zeros(1, 'float32')

    # loudness envelope at 24 fps
    env = np.array([np.sqrt(np.mean(window(k / AFPS, (k + 1) / AFPS) ** 2)) for k in range(int(np.ceil(dur * AFPS)))])
    ref = np.percentile(env[env > 0], 95) if (env > 0).any() else 1.0
    envn = np.clip(env / (ref or 1), 0, 1)

    shapes = []
    for k in range(int(np.ceil(dur * MFPS)) + 1):
        t0, t1 = k / MFPS + LEAD, (k + 1) / MFPS + LEAD
        w = window(t0, t1)
        r = min(1.0, np.sqrt(np.mean(w ** 2)) / (ref or 1))
        if r < .14 or len(w) < 64:
            shapes.append('C'); continue
        spec = np.abs(np.fft.rfft(w * np.hanning(len(w)))) ** 2
        freqs = np.fft.rfftfreq(len(w), 1 / sr)
        low, high = band(spec, freqs, 250, 900), band(spec, freqs, 1200, 3800)
        bright = high / (low + high + 1e-12)
        # fricatives (s, sh, t: bright, weaker) stay narrow; loud voiced vowels open: rounded (oh/oo) or wide (ah/eh)
        if r > .5 and bright < .05:
            shapes.append('O')
        elif r > .6 and bright < .45:
            shapes.append('A')
        else:
            shapes.append('T')
    # the last drawing always closes the mouth
    shapes[-1] = 'C'
    return {'dur': round(dur, 3), 'fps': MFPS, 'm': ''.join(shapes), 'a': [round(float(x), 2) for x in envn]}


def main():
    out = {}
    for p in sorted(glob.glob(os.path.join(VOICES, '*.wav'))):
        lid = os.path.splitext(os.path.basename(p))[0]
        out[lid] = track(p)
        print(f'{lid} {out[lid]["dur"]:6.3f} s  {out[lid]["m"]}')
    with open(os.path.join(VOICES, 'mouth.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, separators=(',', ':'))
    dur = {k: v['dur'] for k, v in out.items()}
    with open(os.path.join(VOICES, 'dur.json'), 'w', encoding='utf-8') as f:
        json.dump(dur, f, indent=1)
    print(f'voices/mouth.json, voices/dur.json: {len(out)} lines')


if __name__ == '__main__':
    main()
