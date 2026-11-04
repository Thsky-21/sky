"""Gate B review sheets for "Did We Make It?".
Builds review/STORYBOARD.jpg (9 key frames with timestamp, scene, shot, framing, description and the exact line from
dialogue.json) and review/CONTACT_SHEET.jpg (model sheets + style frames + storyboard).
usage: <library .venv python> tools/board.py   (after sh tools/look.sh)
"""
import json, os, textwrap
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REV = os.path.join(ROOT, 'review')
F = 'C:/Windows/Fonts/'
def font(name, size):
    try: return ImageFont.truetype(F + name, size)
    except OSError: return ImageFont.load_default()
BF = os.path.join(ROOT, 'fonts', 'BarlowSemiCondensed-')
def bar(w, size):
    try: return ImageFont.truetype(BF + w + '.ttf', size)
    except OSError: return ImageFont.load_default()
B = lambda s: bar('SemiBold', s + 2)
S = lambda s: bar('Regular', s + 2)
SB = lambda s: bar('SemiBold', s + 1)

LINES = {l['id']: l for l in json.load(open(os.path.join(ROOT, 'dialogue.json'), encoding='utf-8'))['lines']}
SPEAKER = {'FIRST_YEAR_SKY': 'FIRST-YEAR', 'THIRD_YEAR_SKY': 'THIRD-YEAR'}

# frame, timecode, scene, shot (SHOT_LIST.md), framing, description, dialogue id (None = no dialogue)
BOARD = [
    ('sb1', '0:00.5–0:03', 'SCENE 1 · The blank page', 'S1-02', 'W two-shot · eye level · slow push-in (~8 %)',
     'First-year sits forward on his chair edge, studying Third-year; Third-year sits back, elbows near the desk. The blank sheet lies between them. Night room, lamp amber, midnight shadows.', None),
    ('sb2', '0:20–0:25', 'SCENE 1 · The blank page', 'S1-07', 'CU Third-year, 3/4 facing left · eye level · very slow push-in',
     'His eyes drop to the page; a breath before he answers. The first vulnerability. Lamp key full on his face, ink shadow side.', 'T02'),
    ('sb3', '0:41–0:47', 'SCENE 2 · Why Bengaluru?', 'S2-03', 'M First-year, back 3/4 · slightly low angle · locked, clouds drift',
     'Memory, late afternoon. First-year stops at the campus edge with his bag and looks toward the city: hopeful, slightly impatient.', 'Y05'),
    ('sb4', '1:22–1:26', 'SCENE 3 · The first build', 'S3-04', 'MCU First-year · eye level · locked, snap turn on twos',
     'At the 2024 hostel desk he turns sharply from the laptop toward Third-year\'s position: brows up, a small smile. Monitor teal on one side, lamp amber on the other.', 'Y08'),
    ('sb5', '1:53–2:00', 'SCENE 4 · Three directions', 'S4-06', 'INS the sheet · high angle · pull back on ones',
     'Three cards in order; the third becomes a small codebase inside permission gates. TypeScript, Python, React, Redis lie on the desk as objects. Third-year\'s hand places the last card.', 'T09'),
    ('sb6', '2:06–2:13', 'SCENE 5 · Shipping is not selling', 'S5-02', 'CU Third-year · eye level · locked, held',
     'Dry and direct, no self-pity. The inbox appears behind him (blank rows, no names) and 50 builds quietly. True silence on "Zero".', 'T10'),
    ('sb7', '2:25.5–2:30', 'SCENE 5 · Shipping is not selling', 'S5-05', 'W two-shot · eye level · locked',
     'Back in the room, low saturation. Third-year turns the laptop slightly away; both sit still. SHIPPING ≠ SELLING from ~146.5 s, held to 150 s.', 'T11'),
    ('sb8', '2:49–2:56', 'SCENE 6 · The unfinished answer', 'S6-05', 'M Third-year, then a slow push-in · eye level',
     'Third-year leans forward into the lamp for the first time and looks straight at First-year (his shoulder at the frame edge). Lamp amber meets morning sage.', 'T13'),
    ('sb9', '2:58–3:00', 'SCENE 6 · The unfinished answer', 'S6-07', 'W, the opening composition repainted · locked',
     'Morning. First-year reaches the open door first, backlit; Third-year follows. Chairs left by the desk, the sheet on the table. End card fading up (from 176 s).', 'Y15'),
]

def wrap(d, xy, text, fnt, width_px, fill, gap=4):
    x, y = xy; avg = fnt.getlength('abcdefghijklmnopqrstuvwxyz') / 26
    for para in text.split('\n'):
        for ln in textwrap.wrap(para, max(10, int(width_px / avg))):
            d.text((x, y), ln, font=fnt, fill=fill); y += fnt.size + gap
    return y

def storyboard():
    cols, pw = 3, 640; ph = pw * 9 // 16; cap = 250; pad = 18; top = 96
    W = cols * pw + (cols + 1) * pad; H = top + 3 * (ph + cap + pad) + pad
    im = Image.new('RGB', (W, H), (17, 24, 32)); d = ImageDraw.Draw(im)
    d.text((pad, 22), 'DID WE MAKE IT? — STORYBOARD, 9 KEY FRAMES', font=B(36), fill=(241, 235, 221))
    d.text((pad, 64), 'Rendered by the film\'s own drawing code (src/sky.js, src/body.js, src/plates.js) · timings and framing from SHOT_LIST.md · lines verbatim from dialogue.json', font=S(17), fill=(139, 154, 136))
    for k, (f, tc, scene, shot, framing, desc, lid) in enumerate(BOARD):
        x = pad + (k % cols) * (pw + pad); y = top + (k // cols) * (ph + cap + pad)
        fr = Image.open(os.path.join(REV, f + '.jpg')).convert('RGB').resize((pw, ph), Image.LANCZOS); im.paste(fr, (x, y))
        d.rectangle([x, y + ph, x + pw, y + ph + cap], fill=(29, 43, 58))
        d.text((x + 12, y + ph + 10), f'{k + 1}', font=B(30), fill=(211, 161, 95))
        d.text((x + 46, y + ph + 12), tc, font=B(24), fill=(241, 235, 221))
        d.text((x + pw - 12 - B(20).getlength(shot), y + ph + 15), shot, font=B(20), fill=(111, 155, 154))
        d.text((x + 46, y + ph + 44), scene, font=SB(16), fill=(211, 161, 95))
        yy = wrap(d, (x + 12, y + ph + 72), 'CAMERA  ' + framing, S(15), pw - 24, (174, 190, 200))
        yy = wrap(d, (x + 12, yy + 4), desc, S(15), pw - 24, (220, 214, 202))
        if lid:
            L = LINES[lid]; who = SPEAKER[L['speaker']]
            wrap(d, (x + 12, yy + 8), f'{lid} · {who}:  \u201c{L["text"]}\u201d', SB(15), pw - 24, (241, 235, 221))
        else:
            d.text((x + 12, yy + 8), 'No dialogue (room tone, fan, traffic, chair creak).', font=SB(15), fill=(150, 160, 168))
    out = os.path.join(REV, 'STORYBOARD.jpg'); im.save(out, quality=90); print(out, im.size)
    return out

def contact(sb_path):
    pages = [('fy_turn', 'A1 · First-year · turnaround (front, 3/4, side)'), ('fy_expr', 'A2 · First-year · curious, excited, confused, disappointed'),
             ('fy_pose', 'A3 · First-year · standing, sitting, colour models'), ('ty_turn', 'A4 · Third-year · turnaround (front, 3/4, side)'),
             ('ty_expr', 'A5 · Third-year · calm, defensive, thoughtful, empathetic'), ('ty_pose', 'A6 · Third-year · standing, sitting, colour models'),
             ('compare', 'A7 · Same young man: overlay + height check'), ('detail', 'A8 · Hands + rear view'), ('sf_open', 'B1 · Style frame · opening (0:00.5)'), ('sf_end', 'B2 · Style frame · ending (2:58)'), ('sb4', 'C4 · First-year at the 2024 desk (1:22)'), ('sb8', 'C8 · Third-year leans in (2:49)')]
    cols, cw = 3, 760; ch = cw * 9 // 16; lab = 34; pad = 14; top = 80
    sb = Image.open(sb_path); sbw = cols * cw + (cols - 1) * pad; sbh = sb.height * sbw // sb.width
    W = cols * cw + (cols + 1) * pad; H = top + 4 * (ch + lab + pad) + sbh + 60
    im = Image.new('RGB', (W, H), (17, 24, 32)); d = ImageDraw.Draw(im)
    d.text((pad, 18), 'DID WE MAKE IT? — GATE B CONTACT SHEET', font=B(34), fill=(241, 235, 221))
    d.text((pad, 56), 'A: model sheets · B: style frames · C: storyboard.  Full-size pages in review/*.jpg', font=S(16), fill=(139, 154, 136))
    for k, (f, t) in enumerate(pages):
        x = pad + (k % cols) * (cw + pad); y = top + (k // cols) * (ch + lab + pad)
        d.text((x, y + 6), t, font=SB(18), fill=(211, 161, 95))
        im.paste(Image.open(os.path.join(REV, f + '.jpg')).convert('RGB').resize((cw, ch), Image.LANCZOS), (x, y + lab))
    y = top + 4 * (ch + lab + pad)
    d.text((pad, y + 8), 'C · Storyboard, 9 key frames (full size: review/STORYBOARD.jpg)', font=SB(18), fill=(211, 161, 95))
    im.paste(sb.convert('RGB').resize((sbw, sbh), Image.LANCZOS), (pad, y + 44))
    out = os.path.join(REV, 'CONTACT_SHEET.jpg'); im.save(out, quality=88); print(out, im.size)

contact(storyboard())
