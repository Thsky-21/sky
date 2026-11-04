"""Voices → timeline for "Did We Make It?" (script v2). Everything downstream (picture, mouths, subtitles, mix) reads
what this writes, so a new set of audio files re-times the whole film.

usage: <LIB>/.venv/Scripts/python.exe tools/voices.py [--tmp] [--report]
  --tmp     (re)generate the temporary Kokoro takes into voices/tmp/ first (needs LIB)
  --report  print the swap report against the last temp-only timeline (voices/tmp_timeline.json)

Source of truth: dialogue.json v2 (never edited here). Lines with "include": false are skipped.
1. TEMP VOICES  one Kokoro voice for both Skys (same person): voices/tmp/<ID>.wav, or <ID>_p1.wav … for lines with parts.
2. RESOLVER     per ID / part, the first file that exists:
                  voices/clone/<ID>[_pN].wav|.m4a|.mp3  →  voices/tmp/<ID>[_pN].wav
                converted to 48 kHz mono, silence trimmed to 0.1 s at both ends, loudness-normalised;
                parts joined with exactly beat_s of silence → voices/final/<ID>.wav. Logs clone vs temp.
3. TIMELINE     preroll, then start(line) = end(previous) + gap_before_s, length = measured; end card after the
                last line (end_card.hold_before_s + end_card.seconds). → timeline.json (regenerated every build).
4. MOUTHS       voices/mouth.json from the final files (tools/lipsync.track: amplitude envelope + mouth drawings).
5. SUBTITLES    subs/film.srt + subs/film.vtt from dialogue.json text and the timeline (≤ 2 lines per cue).
"""
import json, os, re, shutil, subprocess, sys
import numpy as np, soundfile as sf, soxr

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from lipsync import track  # noqa: E402

LIB = os.environ.get('LIB', 'C:/Users/User/lemo-opuscar')
V = lambda *p: os.path.join(ROOT, 'voices', *p)
SR = 48000
PAD = 0.1            # silence kept at each end of every part
TARGET_DB = -20.0    # loudness target: RMS of the voiced frames, dBFS
MAX_RUNTIME = 180.0

# ——— temp casting (Kokoro). Same voice, two performances: the difference is speed, never pitch. ———
VOICE = 'am_liam'
SPEED = {'FY': 0.94, 'TY': 0.79}   # Kokoro am_liam reads fast: these hit the top of 160-170 / 135-145 wpm (measured)
SPEED_LINE = {'VN01': 0.90}          # the late-night voice note: fast, ~180 wpm
# punctuation-only steering for the TTS (words never change; checked)
SAY = {}

words = lambda s: re.findall(r"[A-Za-z0-9$']+", s.replace('’', "'").lower())


def dialogue():
    with open(os.path.join(ROOT, 'dialogue.json'), encoding='utf-8') as f:
        d = json.load(f)
    d['lines'] = [l for l in d['lines'] if l.get('include', True) is not False]
    return d


def units(l):
    """the audio units of a line: [(file id, text)], one per part"""
    if l.get('parts'):
        return [(f"{l['id']}_p{k + 1}", p) for k, p in enumerate(l['parts'])]
    return [(l['id'], l['text'])]


# ——— 1. temp voices ———
def make_tmp(D):
    os.makedirs(V('tmp'), exist_ok=True)
    todo = []
    for l in D['lines']:
        for uid, text in units(l):
            say = SAY.get(uid, text)
            if words(say) != words(text):
                sys.exit(f'voices.py: {uid}: TTS text changes words: {say!r} vs {text!r}')
            todo.append({'id': uid, 'text': say, 'voice': VOICE, 'speed': SPEED_LINE.get(l['id'], SPEED[l['speaker']])})
    p = os.path.join(ROOT, 'tts', 'lines_v2.json')
    os.makedirs(os.path.dirname(p), exist_ok=True)
    json.dump(todo, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    py = os.path.join(LIB, '.venv', 'Scripts', 'python.exe')
    if not os.path.exists(py): py = os.path.join(LIB, '.venv', 'bin', 'python')
    subprocess.run([py, os.path.join(LIB, 'core', 'tts', 'tts.py'), p, V('tmp')], check=True)


# ——— 2. resolver ———
def find(uid):
    for ext in ('.wav', '.m4a', '.mp3'):
        p = V('clone', uid + ext)
        if os.path.exists(p): return p, 'clone'
    p = V('tmp', uid + '.wav')
    if os.path.exists(p): return p, 'temp'
    return None, None


def load(path):
    if path.endswith('.wav'):
        a, sr = sf.read(path, dtype='float32', always_2d=True)
    else:   # m4a / mp3 through ffmpeg
        r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True)
        a, sr = np.frombuffer(r.stdout, 'float32')[:, None], SR
    a = a.mean(1)
    if sr != SR: a = soxr.resample(a, sr, SR)
    return a.astype('float32')


def trim(a):
    """cut leading/trailing silence, keep exactly PAD s at each end"""
    win = int(.01 * SR)
    n = len(a) // win
    if n == 0: return np.zeros(int(2 * PAD * SR), 'float32')
    rms = np.sqrt((a[:n * win].reshape(n, win) ** 2).mean(1))
    thr = max(rms.max() * 10 ** (-40 / 20), 1e-5)
    on = np.where(rms > thr)[0]
    if not len(on): return np.zeros(int(2 * PAD * SR), 'float32')
    s, e = on[0] * win, min(len(a), (on[-1] + 1) * win)
    x = a[s:e].copy()
    f = min(len(x) // 2, int(.004 * SR))   # no clicks at the cut
    if f: x[:f] *= np.linspace(0, 1, f); x[-f:] *= np.linspace(1, 0, f)
    z = np.zeros(int(PAD * SR), 'float32')
    return np.concatenate([z, x, z])


def normalise(a):
    win = int(.02 * SR); n = len(a) // win
    if n == 0: return a
    rms = np.sqrt((a[:n * win].reshape(n, win) ** 2).mean(1))
    act = rms[rms > rms.max() * .1]
    level = 20 * np.log10(np.sqrt((act ** 2).mean()) + 1e-12)
    y = a * 10 ** ((TARGET_DB - level) / 20)
    pk = np.abs(y).max()
    return y * (.95 / pk) if pk > .95 else y


def resolve(D):
    os.makedirs(V('final'), exist_ok=True)
    out, missing = {}, []
    for l in D['lines']:
        parts, srcs, xs = [], [], []
        for uid, _ in units(l):
            p, src = find(uid)
            if not p: missing.append(uid); continue
            x = trim(load(p)); xs.append(x); srcs.append(src)
        if len(xs) != len(units(l)): continue
        beat = np.zeros(int(round(l.get('beat_s', 0) * SR)), 'float32')
        t, buf = 0.0, []
        for k, x in enumerate(xs):
            if k: buf.append(beat); t += len(beat) / SR
            parts.append([round(t + PAD, 3), round(t + len(x) / SR - PAD, 3)])   # voiced span of the part inside the file
            buf.append(x); t += len(x) / SR
        y = normalise(np.concatenate(buf))
        sf.write(V('final', l['id'] + '.wav'), y, SR, subtype='PCM_16')
        out[l['id']] = {'dur': round(len(y) / SR, 3), 'parts': parts, 'src': 'clone' if all(s == 'clone' for s in srcs) else ('mixed' if 'clone' in srcs else 'temp')}
    if missing:
        sys.exit('voices.py: MISSING audio for: ' + ', '.join(missing) + '\n  (expected voices/clone/<ID>.wav or voices/tmp/<ID>.wav)')
    return out


# ——— 3. timeline ———
def build_timeline(D, R):
    t = D['preroll']['seconds']
    lines = {}
    for l in D['lines']:
        r = R[l['id']]
        t0 = round(t + l['gap_before_s'], 3)
        t1 = round(t0 + r['dur'], 3)
        lines[l['id']] = {'start': t0, 'end': t1, 'dur': r['dur'], 'speaker': l['speaker'], 'shot': l['shot'],
                          'on_camera': l['on_camera'], 'src': r['src'],
                          'parts': [[round(t0 + a, 3), round(t0 + b, 3)] for a, b in r['parts']]}
        if l.get('cut_to'): lines[l['id']]['cut_to'] = l['cut_to']
        t = t1
    ec = D['end_card']
    card = [round(t + ec['hold_before_s'], 3), round(t + ec['hold_before_s'] + ec['seconds'], 3)]
    total = card[1]
    TL = {'note': 'GENERATED by tools/voices.py from dialogue.json v2 and the measured voice files; do not edit. '
                  'start = previous end + gap_before_s; parts = voiced spans; every animation event anchors to these.',
          'fps': 24, 'preroll': D['preroll']['seconds'], 'order': [l['id'] for l in D['lines']],
          'lines': lines, 'end_card': card, 'total': total}
    json.dump(TL, open(os.path.join(ROOT, 'timeline.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return TL


# ——— 5. subtitles ———
def wrap(text, width=42):
    out, cur = [], ''
    for w in text.split(' '):
        if cur and len(cur) + 1 + len(w) > width: out.append(cur); cur = w
        else: cur = (cur + ' ' + w).strip()
    if cur: out.append(cur)
    return out


def chunks(text, width=42):
    """split a line into cues of ≤ 2 lines, at sentence ends when possible (text kept exactly, only split)"""
    if len(wrap(text, width)) <= 2: return [text]
    sents = re.findall(r'.+?(?:[.?!…—]+["’”]?(?=\s|$)|$)', text)
    sents = [s.strip() for s in sents if s.strip()]
    out, cur = [], ''
    for s in sents:
        cand = (cur + ' ' + s).strip()
        if cur and len(wrap(cand, width)) > 2: out.append(cur); cur = s
        else: cur = cand
    if cur: out.append(cur)
    fixed = []
    for c in out:   # a single sentence longer than two lines: split by words
        ws = wrap(c, width)
        while len(ws) > 2: fixed.append(' '.join(ws[:2])); ws = ws[2:]
        fixed.append(' '.join(ws))
    assert ' '.join(fixed) == text, (fixed, text)
    return fixed


def subtitles(D, TL):
    cues = []
    for l in D['lines']:
        L = TL['lines'][l['id']]
        a, b = L['parts'][0][0], L['parts'][-1][1]
        cs = chunks(l['text'])
        n = sum(len(c) for c in cs)
        t = a
        for c in cs:
            d = (b - a) * len(c) / n
            cues.append({'t0': round(t, 3), 't1': round(t + d, 3), 'text': '\n'.join(wrap(c)), 'who': l['speaker']})
            t += d
    for k, c in enumerate(cues):   # read time: hold each cue a little past its speech, never into the next one
        nxt = cues[k + 1]['t0'] if k + 1 < len(cues) else TL['end_card'][0]
        c['t1'] = round(min(max(c['t1'] + .35, c['t0'] + 1.0), nxt - .04), 3)
    os.makedirs(os.path.join(ROOT, 'subs'), exist_ok=True)
    json.dump(cues, open(os.path.join(ROOT, 'subs', 'film_cues.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    ts = lambda s, sep: f"{int(s // 3600):02d}:{int(s // 60 % 60):02d}:{int(s % 60):02d}{sep}{int(round(s * 1000)) % 1000:03d}"
    srt = '\n'.join(f"{k + 1}\n{ts(c['t0'], ',')} --> {ts(c['t1'], ',')}\n{c['text']}\n" for k, c in enumerate(cues))
    vtt = 'WEBVTT\n\n' + '\n'.join(f"{ts(c['t0'], '.')} --> {ts(c['t1'], '.')} line:85%\n<v {'First-year Sky' if c['who'] == 'FY' else 'Third-year Sky'}>{c['text']}\n" for c in cues)
    open(os.path.join(ROOT, 'subs', 'film.srt'), 'w', encoding='utf-8').write(srt)
    open(os.path.join(ROOT, 'subs', 'film.vtt'), 'w', encoding='utf-8').write(vtt)
    return cues


def wpm(D, TL):
    agg = {}
    for l in D['lines']:
        k = 'VN01' if l['id'] == 'VN01' else l['speaker']
        L = TL['lines'][l['id']]
        speech = sum(b - a for a, b in L['parts'])
        w = len(words(l['text']))
        s = agg.setdefault(k, [0, 0.0]); s[0] += w; s[1] += speech
    return {k: round(w / s * 60) for k, (w, s) in agg.items()}


def report(D, TL):
    p = V('tmp_timeline.json')
    if not os.path.exists(p): print('swap report: no temp-only timeline saved yet'); return
    old = json.load(open(p, encoding='utf-8'))
    print('\nSWAP REPORT\n  ID     temp s  clone s   diff')
    for i in TL['order']:
        a, b = old['lines'][i]['dur'], TL['lines'][i]['dur']
        flag = '  <-- CHANGED' if abs(b - a) > 1.0 or abs(b - a) > .3 * a else ''
        print(f"  {i:<6} {a:6.2f}  {b:6.2f}  {b - a:+6.2f}{flag}")
    print(f"  runtime {old['total']:.2f} s → {TL['total']:.2f} s;  Y01 starts at {TL['lines']['Y01']['start']:.2f} s")
    tmp = [i for i in TL['order'] if TL['lines'][i]['src'] != 'clone']
    print('  still on temporary voice:', ', '.join(tmp) if tmp else 'none')


def main():
    D = dialogue()
    if '--tmp' in sys.argv: make_tmp(D)
    R = resolve(D)
    TL = build_timeline(D, R)
    M = {i: track(V('final', i + '.wav')) for i in TL['order']}
    json.dump(M, open(V('mouth.json'), 'w', encoding='utf-8'), separators=(',', ':'))
    json.dump({i: TL['lines'][i]['dur'] for i in TL['order']}, open(V('dur.json'), 'w', encoding='utf-8'), indent=1)
    cues = subtitles(D, TL)
    if all(TL['lines'][i]['src'] == 'temp' for i in TL['order']): shutil.copy(os.path.join(ROOT, 'timeline.json'), V('tmp_timeline.json'))
    clone = [i for i in TL['order'] if TL['lines'][i]['src'] == 'clone']
    print(f"voices: {len(clone)} clone, {len(TL['order']) - len(clone)} temporary" + (f" (clone: {', '.join(clone)})" if clone else ''))
    print('words per minute:', ', '.join(f'{k} {v}' for k, v in wpm(D, TL).items()))
    print(f"timeline.json: {len(TL['order'])} lines · total runtime {TL['total']:.2f} s ({int(TL['total'] // 60)}:{TL['total'] % 60:05.2f}) · "
          f"Y01 starts at {TL['lines']['Y01']['start']:.2f} s · {len(cues)} subtitle cues")
    if '--report' in sys.argv: report(D, TL)
    if TL['lines']['Y01']['start'] >= 7.0: print('WARNING: Y01 starts at or after 0:07')
    if TL['total'] > MAX_RUNTIME: sys.exit(f"voices.py: runtime {TL['total']:.2f} s exceeds 3:00")


if __name__ == '__main__':
    main()
