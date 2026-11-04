// Gate B pages: model sheets, comparison, expression sheets, style frames, storyboard key frames.
// Every drawing here comes from the same head() / figure() functions in sky.js.
import { cel, poly, line, mix, rgba, LWK } from './cel.js';
import { PAL, TOK } from './pal.js';
import { head, EXPR } from './sky.js';
import { figure, handShape } from './body.js';
import { chair } from './props.js';
import { FRAMES } from './frames.js';

export const FONT = '"Barlow SC", sans-serif';
const PAPER = '#DCD6CA', INK = '#2A2F38', GUIDE = 'rgba(64,87,106,.28)';
export const SIZE = {};

function cell(g, x, y, w, h, label, fn, bg = '#E6E1D6') {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = bg; g.fillRect(x, y, w, h);
  fn(); g.restore();
  g.strokeStyle = '#A39C8E'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
  if (label) { g.fillStyle = INK; g.font = `600 22px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(label, x + 14, y + 10); }
}
function title(g, W, a, b) {
  g.fillStyle = PAPER; g.fillRect(0, 0, W, 64);
  g.fillStyle = INK; g.font = `700 34px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(a, 22, 34);
  const w = g.measureText(a).width;
  g.font = `400 21px ${FONT}`; g.fillStyle = '#5A606A'; g.fillText(b, 22 + w + 24, 36);
}
// head-height guides (1 head = 198 units: top of hair -80 → chin 118)
function guides(g, x0, x1, floorY, s) {
  g.save(); g.strokeStyle = GUIDE; g.lineWidth = 1; g.setLineDash([6, 6]); g.font = `400 15px ${FONT}`; g.fillStyle = 'rgba(64,87,106,.7)';
  for (let k = 0; k <= 7; k++) { const y = floorY - 1386 * s + k * 198 * s; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); g.fillText(String(k), x0 + 4, y + 3); }
  g.restore();
}
const DEF = { FY: 'curious', TY: 'calm' };
const NAME = { FY: 'FIRST-YEAR SKY', TY: 'THIRD-YEAR SKY' };

function turnSheet(who) {
  return ({ g, W, H }) => {
    g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
    title(g, W, `${NAME[who]} — TURNAROUND`, `model sheet v1 · neutral light · same head() and body rig for both Skys · proposed design (replace from Sky's photos)`);
    const P = PAL.neutral, s = .66, floor = 1050;
    const views = [['FRONT', 0], ['3/4', .78], ['SIDE', Math.PI / 2]];
    views.forEach(([lab, yaw], i) => cell(g, 10 + i * 400, 74, 396, 996, lab, () => {
      guides(g, 10 + i * 400, 406 + i * 400, floor, s);
      figure(g, P, { who, pose: 'stand', yaw, x: 208 + i * 400, y: floor, s, expr: who === 'FY' ? 'neutral' : 'neutral', light: [.8, -.7] });
    }));
    const hv = [['HEAD · FRONT', 'front'], ['HEAD · 3/4', 'q'], ['HEAD · SIDE', 'side']];
    hv.forEach(([lab, view], i) => cell(g, 1214, 74 + i * 332, 696, 328, lab, () => {
      g.save(); g.translate(1214 + 348, 74 + i * 332 + 150); g.scale(1.22, 1.22); LWK.k = .9;
      head(g, P, { who, view, expr: 'neutral', light: [.8, -.7] }); LWK.k = 1; g.restore();
    }));
    return { raw: true };
  };
}
function exprSheet(who) {
  const list = who === 'FY' ? [['DEFAULT', 'neutral'], ['CURIOUS', 'curious'], ['EXCITED', 'excited'], ['CONFUSED', 'confused'], ['DISAPPOINTED', 'disappointed']]
    : [['DEFAULT', 'neutral'], ['CALM', 'calm'], ['DEFENSIVE', 'defensive'], ['THOUGHTFUL', 'thoughtful'], ['EMPATHETIC', 'empathetic']];
  return ({ g, W, H }) => {
    g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
    title(g, W, `${NAME[who]} — EXPRESSIONS`, `brows + lid height + mouth corners + shoulders carry the emotion · no sweat drops, tears or chibi shorthand`);
    const P = PAL.neutral;
    list.forEach(([lab, ex], i) => {
      cell(g, 10 + i * 380, 74, 376, 500, lab + ' · 3/4', () => { g.save(); g.translate(10 + i * 380 + 196, 74 + 236); g.scale(1.55, 1.55); LWK.k = .85; head(g, P, { who, view: 'q', expr: ex, light: [.8, -.7] }); LWK.k = 1; g.restore(); });
      cell(g, 10 + i * 380, 580, 376, 490, lab + ' · FRONT', () => { g.save(); g.translate(10 + i * 380 + 188, 580 + 226); g.scale(1.5, 1.5); LWK.k = .85; head(g, P, { who, view: 'front', expr: ex, light: [.8, -.7] }); LWK.k = 1; g.restore(); });
    });
    return { raw: true };
  };
}
function poseSheet(who) {
  return ({ g, W, H }) => {
    g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
    title(g, W, `${NAME[who]} — POSES + COLOUR MODELS`, who === 'FY' ? 'forward, quick, open · warm amber accent (lanyard, strap)' : 'back, still, contained · muted teal / slate accent (stitching, notebook)');
    const P = PAL.neutral, s = .62;
    cell(g, 10, 74, 440, 996, 'STANDING', () => {
      figure(g, P, { who, pose: who === 'FY' ? 'standStraps' : 'standPocket', yaw: .72, x: 230, y: 1050, s, expr: DEF[who], light: [.8, -.7] });
    });
    cell(g, 454, 74, 560, 996, who === 'FY' ? 'SITTING · on the chair edge' : 'SITTING · back in the chair', () => {
      const yaw = 1.05, x = 690, y = 1000;
      chair(g, P, { yaw, x, y, s });
      figure(g, P, { who, pose: who === 'FY' ? 'sitKnees' : 'sitKnees', yaw, x, y, s, expr: DEF[who], light: [.8, -.7], E: who === 'FY' ? {} : {} , leanAdd: who === 'FY' ? .14 : -.1 });
    });
    const sets = ['neutral', 'night', 'memory', 'build', 'noreply', 'morning', 'backlit'];
    const SETBG = { neutral: '#E6E1D6', night: TOK.midnight, memory: '#B98A5A', build: '#18263A', noreply: '#3E4A56', morning: '#A9B4A2', backlit: '#EFE2C4' };
    sets.forEach((k, i) => {
      const cx = 1018 + (i % 2) * 446, cy = 74 + Math.floor(i / 2) * 250;
      cell(g, cx, cy, 442, 246, k.toUpperCase(), () => {
        const Q = PAL[k];
        figure(g, Q, { who, pose: 'stand', yaw: .78, x: cx + 160, y: cy + 744, s: .5, expr: DEF[who], light: [1, -.6], rim: k === 'build' ? TOK.teal : k === 'backlit' ? Q.rim : null });
        const sw = who === 'FY' ? [Q.skin.f, Q.skin.s, Q.hair.f, Q.tee1.f, Q.tee1.s, Q.amber.f, Q.jeans.f] : [Q.skin.f, Q.skin.s, Q.hair.f, Q.over.f, Q.over.s, Q.teal.f, Q.jeans3.f];
        sw.forEach((c, j) => { g.fillStyle = c; g.fillRect(cx + 270 + (j % 2) * 76, cy + 40 + Math.floor(j / 2) * 48, 68, 40); g.strokeStyle = 'rgba(0,0,0,.25)'; g.strokeRect(cx + 270 + (j % 2) * 76, cy + 40 + Math.floor(j / 2) * 48, 68, 40); });
      }, SETBG[k]);
    });
    return { raw: true };
  };
}
function compareSheet({ g, W, H }) {
  g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  title(g, W, 'SAME YOUNG MAN, TWO YEARS APART', 'identical head(): face, eyes, nose, mouth, ears, skin, hairline, height · different: clothes, grooming, default lids/brows, posture');
  const P = PAL.neutral;
  [['front', 'FRONT'], ['q', '3/4']].forEach(([view, lab], r) => {
    const y = 74 + r * 330;
    cell(g, 10, y, 380, 326, 'FIRST-YEAR · ' + lab, () => { g.save(); g.translate(200, y + 166); g.scale(1.12, 1.12); LWK.k = .95; head(g, P, { who: 'FY', view, expr: 'neutral' }); LWK.k = 1; g.restore(); });
    cell(g, 394, y, 380, 326, 'THIRD-YEAR · ' + lab, () => { g.save(); g.translate(584, y + 166); g.scale(1.12, 1.12); LWK.k = .95; head(g, P, { who: 'TY', view, expr: 'neutral' }); LWK.k = 1; g.restore(); });
    cell(g, 778, y, 380, 326, 'OVERLAY 50 % · ' + lab, () => {
      // each head on its own layer, then the Third-year layer at 50 % over the First-year layer
      const lay = who => { const c = document.createElement('canvas'); c.width = 380; c.height = 326; const q = c.getContext('2d'); q.translate(190, 166); q.scale(1.12, 1.12); LWK.k = .95; head(q, P, { who, view, expr: 'neutral' }); LWK.k = 1; return c; };
      g.drawImage(lay('FY'), 778, y); g.globalAlpha = .5; g.drawImage(lay('TY'), 778, y); g.globalAlpha = 1;
    });
  });
  cell(g, 10, 734, 1148, 336, 'NEVER DIFFERENT: age markers (lines, beard, grey, weight), face proportions, height, voice pitch', () => {
    g.fillStyle = INK; g.font = `400 22px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'top';
    const rows = [['', 'FIRST-YEAR (~19)', 'THIRD-YEAR (~21)'], ['Clothes', 'warm-ivory crew tee, amber lanyard, navy pack', 'dark slate overshirt open, dark tee, sleeves pushed up'],
      ['Accent', 'muted amber ' + TOK.amber, 'muted teal ' + TOK.teal + ' / slate ' + TOK.slate], ['Hair', 'same cut, freshly trimmed', 'same cut, a few weeks longer, loose locks'],
      ['Default face', 'lids a touch more open, brows a touch up', 'lids neutral, brows level'], ['Posture', 'forward, quick, open', 'back, still, contained (until 169 s)']];
    rows.forEach((rw, i) => rw.forEach((c, j) => { g.font = `${i === 0 || j === 0 ? 700 : 400} 21px ${FONT}`; g.fillText(c, 30 + [0, 180, 640][j], 790 + i * 42); }));
  });
  cell(g, 1162, 74, 748, 996, 'SAME HEIGHT, SAME BUILD', () => {
    guides(g, 1162, 1910, 1050, .66);
    figure(g, P, { who: 'FY', pose: 'stand', yaw: .62, x: 1380, y: 1050, s: .66, expr: 'neutral' });
    figure(g, P, { who: 'TY', pose: 'stand', yaw: .62, x: 1700, y: 1050, s: .66, expr: 'neutral', mirror: true });
  });
  return { raw: true };
}

function detailSheet({ g, W, H }) {
  g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  title(g, W, 'HANDS + REAR VIEW', 'the same hand for both Skys: palm, four fingers, two-joint thumb · rear 3/4: smooth waves taper into the nape, ears half showing');
  const P = PAL.neutral;
  [['RELAXED (hanging)', 'hang', Math.PI / 2], ['FLAT (on the desk)', 'flat', 0], ['CLASPED', 'clasp', 0], ['GRIP (strap / notebook)', 'grip', 0]].forEach(([lab, t, ang], i) => {
    const x = 10 + (i % 2) * 400, y = 74 + Math.floor(i / 2) * 500;
    cell(g, x, y, 396, 496, lab, () => {
      g.save(); g.translate(x + (ang ? 198 : 70), y + (ang ? 110 : 260)); g.scale(2.6, 2.6); LWK.k = .8;
      g.fillStyle = P.skin.f; g.strokeStyle = P.skin.l;
      handShape(g, P, [0, 0], ang, t, { so: [16, -10], rim: null }); LWK.k = 1; g.restore();
    });
  });
  cell(g, 814, 74, 540, 996, 'REAR 3/4 · FIRST-YEAR (pack)', () => figure(g, P, { who: 'FY', pose: 'standStraps', yaw: 2.45, x: 1084, y: 1050, s: .66, expr: 'neutral', light: [-.6, -.8] }));
  cell(g, 1358, 74, 552, 496, 'REAR HEAD · FIRST-YEAR', () => { g.save(); g.translate(1634, 74 + 250); g.scale(1.25, 1.25); LWK.k = .9; head(g, P, { who: 'FY', view: 'back', light: [-.6, -.8] }); LWK.k = 1; g.restore(); });
  cell(g, 1358, 574, 552, 496, 'REAR HEAD · THIRD-YEAR', () => { g.save(); g.translate(1634, 574 + 250); g.scale(1.25, 1.25); LWK.k = .9; head(g, P, { who: 'TY', view: 'back', light: [-.6, -.8] }); LWK.k = 1; g.restore(); });
  return { raw: true };
}

function faceSheet({ g, W, H }) {
  g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  title(g, W, 'FACE CLOSE-UP', 'one face for both Skys · front, 3/4, profile at close-up scale · First-year top, Third-year bottom');
  const P = PAL.neutral;
  ['FY', 'TY'].forEach((who, r) => [['FRONT', 'front'], ['3/4', 'q'], ['PROFILE', 'side']].forEach(([lab, view], i) => {
    const x = 10 + i * 636, y = 74 + r * 500;
    cell(g, x, y, 632, 496, (who === 'FY' ? 'FIRST-YEAR · ' : 'THIRD-YEAR · ') + lab, () => { g.save(); g.translate(x + 316, y + 236); g.scale(1.75, 1.75); LWK.k = .8; head(g, P, { who, view, expr: 'neutral', light: [.8, -.7] }); LWK.k = 1; g.restore(); });
  }));
  return { raw: true };
}

export const SHEETS = {
  fy_turn: turnSheet('FY'), ty_turn: turnSheet('TY'),
  fy_expr: exprSheet('FY'), ty_expr: exprSheet('TY'),
  fy_pose: poseSheet('FY'), ty_pose: poseSheet('TY'),
  compare: compareSheet, detail: detailSheet, face: faceSheet,
  ...FRAMES,
};
