"""The film's sound, from events.json (exported from the page: every event anchored to a line) + voices/final/<ID>.wav.

usage: <LIB>/.venv/Scripts/python.exe tools/mix_film.py [--out out/film_mix.wav]
Voices come from the resolver's output (voices/final), so clone and temp files mix the same way.
VN01 plays through a phone speaker (band-pass ~300–3400 Hz + a little room).
Pre-mastered: about −14 LUFS integrated, peaks limited so the true peak stays below −1 dBTP.
"""
import json, os, sys
import numpy as np, soundfile as sf, soxr

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import mix as M0   # noqa: E402  (synth helpers: rustle, paper_*, lamp_click, epiano, passby, lufs …)
from mix import SR, t_, env_exp, bp, lp, hp, noise, norm, compress, limit, add, fade, db  # noqa: E402

E = json.load(open(os.path.join(ROOT, 'events.json'), encoding='utf-8'))
DUR = E['dur']; N = int(round(DUR * SR)) + SR
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else os.path.join(ROOT, 'out', 'film_mix.wav')
rng = np.random.default_rng(7)


_IR = None
def room_ir():
    """a small, soft room (≈0.35 s): exponentially decaying filtered noise, so every line ends in air, not in a cut"""
    global _IR
    if _IR is None:
        d = .38; tt = t_(d); n = lp(hp(noise(d), 250), 5000) * np.exp(-tt / .075)
        _IR = n / np.sqrt((n ** 2).sum())
    return _IR


def voice(lid, fx=None, who='FY'):
    x, sr = sf.read(os.path.join(ROOT, 'voices', 'final', lid + '.wav'), dtype='float32')
    if x.ndim > 1: x = x.mean(1)
    if sr != SR: x = soxr.resample(x, sr, SR)
    x = hp(x, 80)
    # a touch of tone per character (the take carries the real difference): FY a little brighter, TY a little warmer
    if fx != 'phone':
        x = x + (.18 * bp(x, 2500, 6000) if who == 'FY' else .22 * lp(x, 400))
    x = compress(norm(x, .9), thr=.3, ratio=2.5)
    if fx != 'phone':
        from scipy.signal import fftconvolve
        wet = fftconvolve(x, room_ir())[:len(x) + int(.38 * SR)]
        x = np.concatenate([x, np.zeros(int(.38 * SR), 'float32')]) + wet * 10 ** (-17 / 20)
    if fx == 'phone':   # a small phone speaker on a wooden desk
        x = bp(x, 300, 3400, 4); x = np.tanh(x * 2.2) * .6
        y = x.copy()
        for d_, g_ in [(.007, .25), (.016, .15), (.029, .08)]:
            s = int(d_ * SR); y[s:] += x[:-s] * g_
        return norm(y, .8)
    y = x.copy()
    for d_, g_ in [(.011, .08), (.019, .05), (.031, .03)]:
        s = int(d_ * SR); y[s:] += lp(x, 4000)[:-s] * g_
    return norm(y, 1.0)


def stop_click():
    x = np.zeros(int(.09 * SR)); c = hp(noise(.01), 1500) * env_exp(.01, .002) + np.sin(2 * np.pi * 2400 * t_(.01)) * env_exp(.01, .003) * .4
    x[:len(c)] = c
    return fade(norm(x) * .7, .0005, .02)


def record_blip():
    d = .18; tt = t_(d); x = np.sin(2 * np.pi * 1320 * tt) * env_exp(d, .05) + .4 * np.sin(2 * np.pi * 1980 * tt) * env_exp(d, .03)
    return fade(norm(x) * .5, .002, .04)


def main():
    voc, fol, amb, mus = (np.zeros((N, 2)) for _ in range(4))
    for ev in E['ev']:
        t, ty, g, pan = ev['t'], ev['type'], ev.get('gain', 1), ev.get('pan', 0)
        if ty == 'voice': add(voc, voice(ev['id'], ev.get('fx'), ev['who']) * db(-12), t, 1.0, -.1 if ev['who'] == 'FY' else .1)
        elif ty == 'stopClick': add(fol, stop_click() * db(-18), t, g, pan)
        elif ty == 'recordBlip': add(fol, record_blip() * db(-20), t, g, pan)
        elif ty == 'lampClick': add(fol, M0.lamp_click() * db(-16), t, g, pan)
        elif ty == 'rustle': add(fol, M0.rustle(ev.get('dur', .3)) * db(-26), t, g, pan)
        elif ty == 'paperSlide': add(fol, M0.paper_slide(ev['dur']) * db(-20), t, g, pan)
        elif ty == 'paperFlip': add(fol, M0.paper_flip(ev.get('dur', .5)) * db(-16), t, g, pan)
        elif ty == 'paperPat': add(fol, M0.paper_pat() * db(-18), t, g, pan)
    os.makedirs(os.path.join(ROOT, 'out', 'stems'), exist_ok=True)
    for name, x in [('voice', voc), ('foley', fol), ('amb', amb), ('music', mus)]:
        sf.write(os.path.join(ROOT, 'out', 'stems', f'film_{name}.wav'), x[:int(DUR * SR)].astype('float32'), SR)
    mix = (voc + fol + amb + mus)[:int(DUR * SR)]
    for _ in range(2):
        L = M0.lufs(mix)
        if L is None: break
        mix = mix * db(-14 - L)
        mix = np.stack([limit(mix[:, 0], db(-2.0)), limit(mix[:, 1], db(-2.0))], 1)
    sf.write(OUT, mix.astype('float32'), SR)
    print(f'{os.path.relpath(OUT, ROOT)} {DUR:.2f} s · {M0.lufs(mix):.1f} LUFS · peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS')


if __name__ == '__main__':
    main()
