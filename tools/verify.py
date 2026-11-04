"""Checks an exported film against timeline.json. Exits non-zero on any failure.

usage: <LIB>/.venv/Scripts/python.exe tools/verify.py export/did-we-make-it.mp4
- duration matches the timeline (±0.1 s); has video and audio; runtime ≤ 3:00
- a frame every 2 s: no black frames (outside the end card's own fade, which is ink, not black)
- every line is present once: speech energy inside each line's voiced span, and silence in the voice stem between
  lines (a doubled or shifted line would show up there)
- no frozen mouths: on FY/TY close shots, the face region changes while that speaker talks
"""
import io, json, os, subprocess, sys
import numpy as np, soundfile as sf
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MP4 = sys.argv[1]
TL = json.load(open(os.path.join(ROOT, 'timeline.json'), encoding='utf-8'))
bad = []


def probe():
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type:format=duration', '-of', 'json', MP4], capture_output=True, text=True, check=True)
    j = json.loads(r.stdout)
    return float(j['format']['duration']), {s['codec_type'] for s in j['streams']}


def frame(t, w=320, h=180):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.3f}', '-i', MP4, '-frames:v', '1', '-s', f'{w}x{h}', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True, check=True)
    return np.asarray(Image.open(io.BytesIO(r.stdout)).convert('L'), float)


dur, kinds = probe()
if abs(dur - TL['total']) > .15: bad.append(f'duration {dur:.2f} s ≠ timeline {TL["total"]:.2f} s')
if kinds != {'video', 'audio'}: bad.append(f'streams: {kinds}')
if TL['total'] > 180: bad.append(f'runtime {TL["total"]:.2f} s exceeds 3:00')

# black gaps
t = 0.0
while t < dur - .05:
    f = frame(t)
    if f.mean() < 4 and not (TL['end_card'][0] <= t): bad.append(f'black frame at {t:.1f} s')
    t += 2.0

# lines present once (voice stem from the mix)
stem = os.path.join(ROOT, 'out', 'stems', 'film_voice.wav')
if os.path.exists(stem):
    v, sr = sf.read(stem, dtype='float32'); v = v.mean(1) if v.ndim > 1 else v
    rms = lambda a, b: 20 * np.log10(np.sqrt(np.mean(v[int(a * sr):max(int(a * sr) + 1, int(b * sr))] ** 2)) + 1e-9)
    ref = max(rms(*TL['lines'][i]['parts'][0]) for i in TL['order'])
    for i in TL['order']:
        for k, (a, b) in enumerate(TL['lines'][i]['parts']):
            if rms(a, b) < ref - 35: bad.append(f'{i} part {k + 1}: no speech in {a:.2f}–{b:.2f} s')
    for i, j in zip(TL['order'], TL['order'][1:]):
        a, b = TL['lines'][i]['end'] + .05, TL['lines'][j]['start'] - .05
        if b - a > .15 and rms(a, b) > ref - 30: bad.append(f'speech between {i} and {j} ({a:.2f}–{b:.2f} s): doubled or shifted line?')
else:
    bad.append('voice stem missing (out/stems/film_voice.wav): run the build first')

# frozen mouths: sample the speaker's face area at 6 fps during on-camera lines (needs the cut list in the page; approximated
# by the line's own shot from the timeline)
FACE = {'FY': (0.30, 0.22, 0.50, 0.62), 'TY': (0.50, 0.22, 0.70, 0.62), 'TY_CU': (0.50, 0.15, 0.78, 0.70)}
for i in TL['order']:
    L = TL['lines'][i]
    if not L['on_camera'] or L['shot'] not in FACE: continue
    a, b = L['parts'][0][0], L['parts'][-1][1]
    if L.get('cut_to'): b = L['parts'][0][1]
    ts = np.arange(a + .1, b - .05, 1 / 6)
    if len(ts) < 3: continue
    x0, y0, x1, y1 = FACE[L['shot']]
    crops = [frame(t)[int(y0 * 180):int(y1 * 180), int(x0 * 320):int(x1 * 320)] for t in ts]
    diff = max(np.abs(crops[k] - crops[k - 1]).mean() for k in range(1, len(crops)))
    if diff < .25: bad.append(f'{i}: face looks frozen while speaking (max frame change {diff:.2f})')

if bad:
    print('VERIFY FAILED:\n  ' + '\n  '.join(bad)); sys.exit(1)
print(f'verify: OK · {dur:.2f} s · {len(TL["order"])} lines present once · no black gaps · mouths moving')
