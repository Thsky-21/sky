"""Temp sound for "Did We Make It?": placed sound events + voices → stems + a pre-mastered mix, from events.json.

usage: <LIB>/.venv/bin/python tools/mix.py [--clip 01]
  needs: events.json (node $LIB/core/render/events.mjs <film> --out <film>/events.json), voices/<ID>.wav
  writes: out/stems/clip<NN>_voice.wav, _amb.wav, _foley.wav and out/clip<NN>_mix.wav (48 kHz stereo, ≈ −14 LUFS)
Every sound is synthesised here (no samples, nothing to license) and every one is a PLACED EVENT: there is no constant
bed (fan hiss, hum, room noise) under the voices (Sky, 2026-11-04: "a constant noise in the voice"). Silence between
sounds is digital silence. The mix is pre-mastered to about −14 LUFS with a peak limiter, so mux.sh's loudnorm only
trims it (a big make-up gain there would lift any low-level sound between the lines).
Voices are read from voices/<ID>.wav, so Sky's recordings replace the temp TTS by file name.
"""
import json, os, re, subprocess, sys
import numpy as np, soundfile as sf, soxr

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.environ.get('LIB') or os.path.join(os.path.dirname(ROOT), 'lemomo-ai', 'lemo-opuscar')
sys.path.insert(0, os.path.join(LIB, 'core', 'audio'))
from sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, creak, compress, limit, add  # noqa: E402

rng = np.random.default_rng(2026)
clip = sys.argv[sys.argv.index('--clip') + 1] if '--clip' in sys.argv else '01'
E = json.load(open(os.path.join(ROOT, 'events.json'), encoding='utf-8'))
DUR = E['dur']; N = int(round(DUR * SR))
db = lambda d: 10 ** (d / 20)


def fade(x, a=.01, b=.05):
    x = np.asarray(x, float).copy(); n = len(x); ia, ib = min(n, int(a * SR)), min(n, int(b * SR))
    if ia: x[:ia] *= np.linspace(0, 1, ia)
    if ib: x[-ib:] *= np.linspace(1, 0, ib)
    return x


# —— foley (each a short, enveloped event) ——
def breath_in(d=.4):
    tt = t_(d); x = bp(noise(d), 600, 3500) * np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 1.5 * np.linspace(.4, 1, len(tt))
    return fade(norm(x) * .6, .02, .08)


def breath_out(d=.55):
    return fade(norm(bp(noise(d), 300, 1800) * env_exp(d, .2) * np.minimum(1, t_(d) / .05)) * .5)


def rustle(d=.3):
    """cotton / denim moving: a few overlapping soft scrapes"""
    out = np.zeros(int(d * SR))
    for _ in range(5):
        L = rng.uniform(.06, .16); s = int(rng.uniform(0, d - L) * SR); x = bp(noise(L), 900, 5000) * np.sin(np.pi * t_(L) / L) ** 2 * rng.uniform(.4, 1)
        out[s:s + len(x)] += x[:len(out) - s]
    return fade(norm(out) * .6, .01, .05)


def tap(v=1.0):
    """a sneaker heel on the hostel floor: a soft low knock"""
    d = .12; tt = t_(d)
    return fade(norm(np.sin(2 * np.pi * 95 * tt) * env_exp(d, .025) + lp(noise(d), 700) * env_exp(d, .01) * .6) * v, .001, .03)


def paper_slide(d):
    tt = t_(d); grain = np.abs(1 + .6 * lp(rng.standard_normal(len(tt)), 40) / .05)   # uneven friction on the wood
    return fade(norm(bp(noise(d), 1400, 7000) * grain * np.sin(np.pi * tt / d) ** .7) * .7, .02, .1)


def crinkle(d=.25, k=6):
    out = np.zeros(int(d * SR))
    for _ in range(k):
        s = int(rng.uniform(0, d * .8) * SR); c = hp(noise(.02), 2500) * env_exp(.02, .003) * rng.uniform(.4, 1)
        out[s:s + len(c)] += c[:len(out) - s]
    return norm(out) * .8


def paper_pat():
    """hands landing on a sheet on the desk: a soft thump + a paper tick"""
    d = .15; tt = t_(d)
    x = np.sin(2 * np.pi * 120 * tt) * env_exp(d, .02) * .7 + bp(noise(d), 1500, 6000) * env_exp(d, .015) * .5
    return fade(norm(x) * .7, .001, .03)


def paper_tap():
    d = .08; return fade(norm(hp(noise(d), 1800) * env_exp(d, .008) + np.sin(2 * np.pi * 900 * t_(d)) * env_exp(d, .006) * .3) * .6, .001, .02)


def paper_flip(d=.5):
    tt = t_(d); x = norm(bp(noise(d), 500, 3500) * np.sin(np.pi * tt / d) ** 2) * .55
    c = crinkle(.2, 6); x[:len(c)] += c * .5
    c2 = crinkle(.2, 5); s = int(d * .62 * SR); x[s:s + len(c2)] += c2[:len(x) - s] * .45
    return fade(x)


def paper_flutter(d=.45):
    tt = t_(d); am = .5 + .5 * np.sin(2 * np.pi * 14 * tt) ** 2
    return fade(norm(bp(noise(d), 700, 4500) * am * np.sin(np.pi * tt / d)) * .5)


def swoosh(d=.3):
    return fade(norm(bp(noise(d), 800, 3500) * np.sin(np.pi * t_(d) / d) ** 2) * .45)


def shimmer(d):
    tt = t_(d); x = np.zeros(len(tt))
    for f, a in [(1175, 1), (1568, .7), (2349, .5), (3136, .3)]:
        x += a * np.sin(2 * np.pi * f * tt + rng.uniform(0, 6)) * (.6 + .4 * np.sin(2 * np.pi * (5.3 + f / 900) * tt))
    return norm(x) * np.minimum(1, tt / .5) * np.clip((d - tt) / 1.2, 0, 1) * .5


def passby(d, f0=46):
    """a vehicle passing far off: engine harmonics with a doppler bend, low-passed by distance; swells and fades"""
    tt = t_(d); u = tt / d
    f = f0 * (1 + .05 * np.tanh((.5 - u) * 6))
    ph = np.cumsum(f / SR) * 2 * np.pi
    eng = sum(a * np.sin(ph * h + h) for h, a in [(1, 1), (2, .7), (3, .5), (4, .3), (5, .2), (7, .1)])
    tyre = lp(bp(noise(d), 200, 1200), 900) * .25
    env = np.exp(-((u - .5) / .22) ** 2)
    return fade(lp(np.tanh(eng * .7) + tyre, 1000) * env, .05, .2)


def horn(f=420):
    d = .45; tt = t_(d); x = np.sin(2 * np.pi * f * tt) + .6 * np.sin(2 * np.pi * f * 1.26 * tt) + .3 * np.sin(2 * np.pi * f * 2 * tt)
    return fade(lp(x, 1500) * np.sin(np.pi * tt / d) ** .4, .02, .08)


def bus(d):
    tt = t_(d); f0 = 38 + 4 * np.sin(2 * np.pi * .3 * tt)
    ph = np.cumsum(f0 / SR) * 2 * np.pi
    eng = sum(a * np.sin(ph * h + h) for h, a in [(1, 1), (2, .6), (3, .4), (4, .25), (6, .12)])
    x = np.tanh(eng * .8) * .7 + lp(bp(noise(d), 60, 400), 300) * .25
    return norm(lp(x, 1400)) * (np.minimum(1, tt / d) ** 1.6)   # grows under the line (J-cut), still rising at the cut


def epiano(note=64, d=3.0):
    f = 440 * 2 ** ((note - 69) / 12); tt = t_(d)
    mod = np.sin(2 * np.pi * f * tt) * 1.2 * env_exp(d, .4)
    x = np.sin(2 * np.pi * f * tt + mod) * env_exp(d, 1.1) + .25 * np.sin(2 * np.pi * f * 2 * tt) * env_exp(d, .5)
    return fade(norm(x) * .8, .005, .3)


def load_voice(lid):
    x, sr = sf.read(os.path.join(ROOT, 'voices', lid + '.wav'), dtype='float32')
    if x.ndim > 1: x = x.mean(1)
    if sr != SR: x = soxr.resample(x, sr, SR)
    x = hp(x, 90)
    # gate the take's own low-level floor (breath noise / resynthesis hiss) between words: below −45 dB re its peak
    env = np.convolve(np.abs(x), np.ones(480) / 480, 'same'); thr = np.abs(x).max() * db(-45)
    g = np.clip((env - thr) / thr, 0, 1); g = np.convolve(g, np.ones(240) / 240, 'same')
    x = x * g
    x = compress(norm(x, .9), thr=.3, ratio=3.0)
    y = x.copy()   # a small room: three early reflections, very low
    for d_, g_ in [(.011, .1), (.019, .07), (.031, .04)]:
        s = int(d_ * SR); y[s:] += lp(x, 4000)[:-s] * g_
    return norm(y, 1.0)


def lufs(x):
    p = os.path.join(ROOT, 'out', '.lufs.wav'); sf.write(p, x.astype('float32'), SR)
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', p, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True)
    os.remove(p); m = re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr)
    return float(m[-1]) if m else None


def main():
    amb, fol, voc = np.zeros((N, 2)), np.zeros((N, 2)), np.zeros((N, 2))
    for ev in E['ev']:
        t, ty, g, pan = ev['t'], ev['type'], ev.get('gain', 1), ev.get('pan', 0)
        if ty == 'voice': add(voc, load_voice(ev['id']) * db(-10 if ev['id'] == 'Y01' else -12), t, 1.0, -.12 if ev['who'] == 'FY' else .12)
        elif ty == 'passby': add(amb, passby(min(ev['dur'], DUR - t), ev.get('f', 46)) * db(-30), t, g, pan)
        elif ty == 'horn': add(amb, horn(ev.get('f', 420)) * db(-34), t, g, pan)
        elif ty == 'bus': add(amb, bus(min(ev['dur'], DUR - t)) * db(-14), t, g, 0)
        elif ty == 'tap': add(fol, tap() * db(-24), t, g, pan)
        elif ty == 'creak': add(fol, creak(1.0) * db(-22), t, g, pan)
        elif ty == 'rustle': add(fol, rustle(ev.get('dur', .3)) * db(-26), t, g, pan)
        elif ty == 'inhale': add(fol, breath_in(ev.get('dur', .4)) * db(-24), t, g, pan)
        elif ty == 'breath': add(fol, breath_out() * db(-26), t, g, pan)
        elif ty == 'paperSlide': add(fol, paper_slide(ev['dur']) * db(-20), t, g, pan)
        elif ty == 'paperTap': add(fol, paper_tap() * db(-20), t, g, pan)
        elif ty == 'paperPat': add(fol, paper_pat() * db(-18), t, g, pan)
        elif ty == 'paperLift': add(fol, swoosh(.3) * db(-22), t, g, pan)
        elif ty == 'paperFlip': add(fol, paper_flip(ev.get('dur', .5)) * db(-16), t, g, pan)
        elif ty == 'paperFlutter': add(fol, paper_flutter() * db(-20), t, g, pan)
        elif ty == 'shimmer': add(fol, shimmer(ev['dur']) * db(-24), t, g, pan)
        elif ty == 'epiano': add(fol, epiano(ev.get('note', 64)) * db(-16), t, g, .05)
    os.makedirs(os.path.join(ROOT, 'out', 'stems'), exist_ok=True)
    for name, x in [('voice', voc), ('amb', amb), ('foley', fol)]:
        sf.write(os.path.join(ROOT, 'out', 'stems', f'clip{clip}_{name}.wav'), x.astype('float32'), SR)
    mix = voc + amb + fol
    # pre-master: gain to −14 LUFS, then a peak limiter at −1.5 dBFS; one more short pass if the limiter cost loudness
    for _ in range(2):
        L = lufs(mix)
        if L is None: break
        mix = mix * db(-14 - L)
        mix = np.stack([limit(mix[:, 0], db(-1.5)), limit(mix[:, 1], db(-1.5))], 1)
    sf.write(os.path.join(ROOT, 'out', f'clip{clip}_mix.wav'), mix.astype('float32'), SR)
    rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
    print(f'out/clip{clip}_mix.wav {DUR:.2f} s · {lufs(mix):.1f} LUFS, peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS · stems RMS: voice {rms(voc):.1f}, amb {rms(amb):.1f}, foley {rms(fol):.1f} dB')


if __name__ == '__main__':
    main()
