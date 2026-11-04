"""Temp sound for "Did We Make It?": ambience + foley + voices → stems + mix, from events.json.

usage: <LIB>/.venv/bin/python tools/mix.py [--clip 01]
  needs: events.json (node $LIB/core/render/events.mjs <film> --out <film>/events.json), voices/<ID>.wav
  writes: out/stems/clip01_voice.wav, clip01_amb.wav, clip01_foley.wav, out/clip01_mix.wav (48 kHz stereo)
Every sound is synthesised here (no samples, nothing to license). Voices are read from voices/<ID>.wav, so Sky's real
recordings replace the temp TTS by file name; re-run tools/lipsync.py, events.mjs and this script, nothing else.
No music in clip 01 apart from one soft e-piano note at ~28 s (SHOT_LIST S1-08). Mastering (−14 LUFS) is mux.sh's job.
"""
import json, os, sys
import numpy as np, soundfile as sf, soxr

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.environ.get('LIB') or os.path.join(os.path.dirname(ROOT), 'lemomo-ai', 'lemo-opuscar')
sys.path.insert(0, os.path.join(LIB, 'core', 'audio'))
from sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, brown, creak, compress, limit, add  # noqa: E402

rng = np.random.default_rng(2026)
clip = sys.argv[sys.argv.index('--clip') + 1] if '--clip' in sys.argv else '01'
E = json.load(open(os.path.join(ROOT, 'events.json'), encoding='utf-8'))
DUR = E['dur']; N = int(round(DUR * SR)); tt = np.arange(N) / SR
db = lambda d: 10 ** (d / 20)


def curve(keys):
    k = np.array(keys, float); return np.interp(tt, k[:, 0], k[:, 1])


def fade(x, a=.01, b=.05):
    n = len(x); ia, ib = min(n, int(a * SR)), min(n, int(b * SR))
    if ia: x[:ia] *= np.linspace(0, 1, ia)
    if ib: x[-ib:] *= np.linspace(1, 0, ib)
    return x


# —— foley, all procedural ——
def breath_in(d=.45):
    x = bp(noise(d), 500, 3200) * np.sin(np.pi * np.clip(t_(d) / d, 0, 1) * .5) ** 2 * np.linspace(.3, 1, len(t_(d)))
    return fade(norm(x) * .6, .02, .08)


def breath_out(d=.6):
    x = bp(noise(d), 300, 1800) * env_exp(d, .22) * np.minimum(1, t_(d) / .05)
    return fade(norm(x) * .5)


def paper_slide(d):
    n = noise(d); tt_ = t_(d)
    grain = 1 + .6 * lp(rng.standard_normal(len(n)), 40) / .05   # uneven friction on the wood
    x = bp(n, 1400, 7000) * np.abs(grain) * np.sin(np.pi * tt_ / d) ** .7
    return fade(norm(x) * .7 + norm(lp(noise(d), 300)) * .08 * np.sin(np.pi * tt_ / d), .02, .1)


def crinkle(d=.25, k=6):
    out = np.zeros(int(d * SR))
    for _ in range(k):
        s = int(rng.uniform(0, d * .8) * SR); c = hp(noise(.02), 2500) * env_exp(.02, .003) * rng.uniform(.4, 1)
        out[s:s + len(c)] += c[:len(out) - s]
    return norm(out) * .8


def paper_turn(d=.7):
    tt_ = t_(d)
    sw = bp(noise(d), 600, 4000) * np.sin(np.pi * tt_ / d) ** 2
    x = norm(sw) * .5
    c = crinkle(.3, 7); x[:len(c)] += c * .6
    c2 = crinkle(.25, 5); s = int(d * .6 * SR); x[s:s + len(c2)] += c2[:len(x) - s] * .5
    return fade(x)


def swoosh(d=.35):
    return fade(norm(bp(noise(d), 800, 3500) * np.sin(np.pi * t_(d) / d) ** 2) * .5)


def shimmer(d):
    tt_ = t_(d); x = np.zeros(len(tt_))
    for f, a in [(1175, 1), (1568, .7), (2349, .5), (3136, .3)]:
        x += a * np.sin(2 * np.pi * f * tt_ + rng.uniform(0, 6)) * (.6 + .4 * np.sin(2 * np.pi * (5.3 + f / 900) * tt_))
    env = np.minimum(1, tt_ / .5) * np.clip((d - tt_) / 1.2, 0, 1)
    return norm(x) * env * .5


def bus(d):
    tt_ = t_(d); f0 = 38 + 4 * np.sin(2 * np.pi * .3 * tt_)
    ph = np.cumsum(f0 / SR) * 2 * np.pi
    eng = sum(a * np.sin(ph * h + h) for h, a in [(1, 1), (2, .6), (3, .4), (4, .25), (6, .12)])
    rum = lp(brown(d), 220)
    x = np.tanh(eng * .8) * .6 + rum * .5 + bp(noise(d), 300, 1200) * .05
    return norm(lp(x, 1400)) * (np.minimum(1, tt_ / d) ** 1.6)   # grows under the line (J-cut), still rising at the cut


def epiano(note=64, d=3.0):
    f = 440 * 2 ** ((note - 69) / 12); tt_ = t_(d)
    mod = np.sin(2 * np.pi * f * 1.0 * tt_) * 1.2 * env_exp(d, .4)
    x = np.sin(2 * np.pi * f * tt_ + mod) * env_exp(d, 1.1) + .25 * np.sin(2 * np.pi * f * 2 * tt_) * env_exp(d, .5)
    return fade(norm(x) * .8, .005, .3)


# —— ambience: hostel fan + distant Bengaluru traffic, from silence ——
def ambience():
    a = np.zeros((N, 2))
    fan_air = bp(noise(DUR), 180, 1600) * (.75 + .25 * np.sin(2 * np.pi * 4.1 * tt))   # three blades, ~80 rpm
    hum = sum(am * np.sin(2 * np.pi * f * tt) for f, am in [(50, .5), (100, .3), (150, .12)]) * .08
    traffic = lp(brown(DUR), 380) * (.7 + .3 * np.sin(2 * np.pi * .05 * tt + 1))
    room = lp(noise(DUR), 900) * .05
    horn = np.zeros(N)
    for at, f in [(5.6, 410), (17.2, 380), (23.8, 440)]:   # far-off horns, very soft
        d = .5; x = np.sign(np.sin(2 * np.pi * f * t_(d))) + np.sign(np.sin(2 * np.pi * f * 1.26 * t_(d)))
        x = lp(x, 900) * np.sin(np.pi * t_(d) / d) ** .5; s = int(at * SR); horn[s:s + len(x)] += x[:N - s] * .05
    g_in = curve([(0, 0), (1.2, 1), (DUR, 1)])
    bus_duck = curve([(0, 1), (26, 1), (29.5, .55), (DUR, .5)])   # the room recedes under the bus J-cut
    mono_fan = norm(fan_air) * db(-38) + hum * db(-14)
    tr = norm(traffic) * db(-36) + horn * db(-6)
    for ch, pan in [(0, -.3), (1, .3)]:
        a[:, ch] += np.roll(mono_fan, ch * 3301) * g_in * bus_duck
        a[:, ch] += np.roll(tr, ch * 7001) * g_in * bus_duck * (1.1 if pan > 0 else .9)
        a[:, ch] += norm(np.roll(room, ch * 1999)) * db(-44) * g_in
    return a


def load_voice(lid):
    x, sr = sf.read(os.path.join(ROOT, 'voices', lid + '.wav'), dtype='float32')
    if x.ndim > 1: x = x.mean(1)
    if sr != SR: x = soxr.resample(x, sr, SR)
    x = hp(x, 80)
    x = compress(norm(x, .9), thr=.3, ratio=3.0)
    # a small room: three early reflections, very low
    y = x.copy()
    for d_, g_ in [(.011, .12), (.019, .08), (.031, .05)]:
        s = int(d_ * SR); y[s:] += lp(x, 4000)[:-s] * g_
    return norm(y, 1.0)


def main():
    amb, fol, voc = ambience(), np.zeros((N, 2)), np.zeros((N, 2))
    for ev in E['ev']:
        t, ty, g, pan = ev['t'], ev['type'], ev.get('gain', 1), ev.get('pan', 0)
        if ty == 'voice':
            add(voc, load_voice(ev['id']) * db(-12), t, 1.0, -.12 if ev['who'] == 'FY' else .12)
        elif ty == 'creak': add(fol, creak(1.0) * db(-18), t, g, pan)
        elif ty == 'inhale': add(fol, breath_in() * db(-24), t, g, pan)
        elif ty == 'breath': add(fol, breath_out() * db(-24), t, g, pan)
        elif ty == 'paperSlide': add(fol, paper_slide(ev['dur']) * db(-16), t, g, pan)
        elif ty == 'paperCatch': add(fol, crinkle(.18, 4) * db(-18), t, g, pan)
        elif ty == 'paperLift': add(fol, swoosh(.3) * db(-20), t, g, pan)
        elif ty == 'paperTurn': add(fol, paper_turn(ev['dur']) * db(-14), t, g, pan)
        elif ty == 'shimmer': add(fol, shimmer(ev['dur']) * db(-22), t, g, pan)
        elif ty == 'bus': add(fol, bus(min(ev['dur'], DUR - t)) * db(-12), t, g, 0)
        elif ty == 'epiano': add(fol, epiano(ev.get('note', 64)) * db(-14), t, g, .05)
    os.makedirs(os.path.join(ROOT, 'out', 'stems'), exist_ok=True)
    for name, x in [('voice', voc), ('amb', amb), ('foley', fol)]:
        sf.write(os.path.join(ROOT, 'out', 'stems', f'clip{clip}_{name}.wav'), x.astype('float32'), SR)
    mix = voc + amb + fol
    mix = np.stack([limit(mix[:, 0], .95), limit(mix[:, 1], .95)], 1)
    sf.write(os.path.join(ROOT, 'out', f'clip{clip}_mix.wav'), mix.astype('float32'), SR)
    rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
    print(f'out/clip{clip}_mix.wav {DUR:.2f} s · RMS voice {rms(voc):.1f} dB, amb {rms(amb):.1f} dB, foley {rms(fol):.1f} dB, peak {np.abs(mix).max():.2f}')


if __name__ == '__main__':
    main()
