"""Contact sheet: one frame per line (middle of its voiced span), labelled with the line ID, its shot and start time;
plus the title and the end card. Frames come from the rendered video, so the sheet shows exactly what was built.

usage: <LIB>/.venv/Scripts/python.exe tools/contact.py --video out/film_preview.mp4 --out preview/film_CONTACT.jpg
"""
import io, json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
arg = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
VID, OUT = arg('--video'), arg('--out')
TL = json.load(open(os.path.join(ROOT, 'timeline.json'), encoding='utf-8'))
TEXT = {l['id']: l['text'] for l in json.load(open(os.path.join(ROOT, 'dialogue.json'), encoding='utf-8'))['lines']}
F = lambda w, s: ImageFont.truetype(os.path.join(ROOT, 'fonts', f'BarlowSemiCondensed-{w}.ttf'), s)


def frame(t):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.3f}', '-i', VID, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True, check=True)
    return Image.open(io.BytesIO(r.stdout)).convert('RGB')


items = []
for i in TL['order']:
    L = TL['lines'][i]
    a, b = L['parts'][0][0], L['parts'][-1][1]
    t = (a + b) / 2
    shot = L['shot'] + (f" -> {L['cut_to']['shot']}" if L.get('cut_to') else '')
    items.append((t, i, shot, a, TEXT[i]))
y04, y05 = TL['lines']['Y04'], TL['lines']['Y05']
items.append((y04['end'] + .5 + .75, 'TITLE', 'W', y04['end'] + .5, 'DID WE MAKE IT?'))
items.append((TL['end_card'][0] + 3.2, 'END', 'BLACK', TL['end_card'][0], 'end card'))

TW, TH, CAP, COLS = 480, 270, 64, 6
rows = (len(items) + COLS - 1) // COLS
HEAD = 70
sheet = Image.new('RGB', (COLS * TW, HEAD + rows * (TH + CAP)), '#111820')
d = ImageDraw.Draw(sheet)
d.text((16, 14), f"DID WE MAKE IT? · animatic contact sheet · {len(TL['order'])} lines · runtime {int(TL['total'] // 60)}:{TL['total'] % 60:05.2f} · Y01 at {TL['lines']['Y01']['start']:.2f} s", fill='#F1EBDD', font=F('SemiBold', 30))
for k, (t, i, shot, start, text) in enumerate(items):
    x, y = (k % COLS) * TW, HEAD + (k // COLS) * (TH + CAP)
    sheet.paste(frame(t).resize((TW, TH)), (x, y))
    d.text((x + 8, y + TH + 4), f"{i}  ·  {shot}  ·  {int(start // 60)}:{start % 60:05.2f}", fill='#D3A15F', font=F('SemiBold', 22))
    s = text if len(text) <= 58 else text[:56] + '…'
    d.text((x + 8, y + TH + 32), s, fill='#F1EBDD', font=F('Regular', 19))
sheet.save(OUT, quality=88)
print(OUT, len(items), 'frames')
