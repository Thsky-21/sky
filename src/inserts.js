// Inserts: PAPER (top-down sheet: every memory is drawn here), PHONE (a generic phone on the desk), the title and the
// end card. All timing comes from line anchors (src/tl.js). No logos, no real app UI, no view counts.
// Pencil on warm ivory, revealed stroke by stroke with a slight hand wobble; rust #A76550 only for the X and crossings.
import { poly, cel, line, rgba, mix, airbrush, hash, TAU, LWK } from './cel.js';
import { TOK } from './pal.js';
import { limbOutline, handShape } from './body.js';
import { seg, ss, eio, eo, lerp, lerpV, clamp } from './perf.js';
import { P } from './stage.js';

const W = 1920, H = 1080;
const { ink, ivory, amber, teal, rust, slate } = TOK;
const GRAPHITE = '#4B4842', HAND = '"Hand", "Barlow SC", cursive', SC = '"Barlow SC", sans-serif';

// ——— the desk seen from above, lit by the lamp (upper right) ———
function deskTop(g, e, lit = 1) {
  const gr = g.createLinearGradient(0, 0, W, H);
  gr.addColorStop(0, mix('#6B5038', '#2A1C10', .25)); gr.addColorStop(1, mix('#4A3524', '#1A120C', .3));
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let k = 0; k < 38; k++) {   // grain
    const y = k * 30 + 8 * Math.sin(k * 1.3);
    g.strokeStyle = rgba('#8C6C4E', .08 + .05 * hash(k)); g.lineWidth = 1.2 + hash(k * 3) * 1.5;
    g.beginPath(); g.moveTo(-20, y); for (let x = 0; x <= W + 40; x += 80) g.lineTo(x, y + 6 * Math.sin(x / 260 + k)); g.stroke();
  }
  airbrush(g, W * .78, H * .1, 1100, 760, '#F2C27C', .28 * lit, .95);
  airbrush(g, W * .5, H * .5, 900, 600, '#FFD9A0', .08 * lit, .95);
  airbrush(g, 0, H, 900, 600, '#0A0604', .45, .95);
}

// the sheet seen from above: centre c, size w (A4 landscape proportions 236:167), rotation r, x-scale (flip) sx
const SHEET_W = 1080, SHEET_H = SHEET_W * 167 / 236;
function sheet(g, e, c, r = -.03, sx = 1, o = {}) {
  g.save(); g.translate(c[0], c[1]); g.rotate(r); g.scale(sx, 1);
  // soft shadow
  g.save(); g.filter = 'blur(14px)'; g.fillStyle = rgba('#120A05', .45); g.fillRect(-SHEET_W / 2 + 14, -SHEET_H / 2 + 18, SHEET_W, SHEET_H); g.restore();
  const back = sx < 0;
  g.fillStyle = back ? mix(ivory, '#CFC5B0', .3) : ivory; g.fillRect(-SHEET_W / 2, -SHEET_H / 2, SHEET_W, SHEET_H);
  const lg = g.createLinearGradient(-SHEET_W / 2, -SHEET_H / 2, SHEET_W / 2, SHEET_H / 2);
  lg.addColorStop(0, rgba('#FFF6E4', .35)); lg.addColorStop(1, rgba('#B8A88C', .22)); g.fillStyle = lg; g.fillRect(-SHEET_W / 2, -SHEET_H / 2, SHEET_W, SHEET_H);
  g.strokeStyle = rgba('#7A6E58', .5); g.lineWidth = 1.5; g.strokeRect(-SHEET_W / 2, -SHEET_H / 2, SHEET_W, SHEET_H);
  if (o.backlit) { airbrush(g, 0, 0, SHEET_W * .7, SHEET_H * .7, '#FFF4DC', .55 * o.backlit, .9); }
  if (o.draw && !back) o.draw(g);
  g.restore();
}

// ——— pencil tools: everything takes a reveal fraction u (0..1) ———
const wob = (x, y, k) => [x + 1.2 * Math.sin(y * .09 + k * 2.1), y + 1.2 * Math.sin(x * .07 + k * 1.3)];
function stroke(g, pts, u, col = GRAPHITE, lw = 3.2, seed = 0) {
  if (u <= 0) return;
  let L = 0; const d = [];
  for (let i = 1; i < pts.length; i++) { const s = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); d.push(s); L += s; }
  let left = L * clamp(u);
  g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.globalAlpha = .9;
  g.beginPath(); const p0 = wob(...pts[0], seed); g.moveTo(...p0);
  for (let i = 1; i < pts.length && left > 0; i++) {
    const k = Math.min(1, left / d[i - 1]); left -= d[i - 1];
    const a = pts[i - 1], b = pts[i];
    const steps = Math.max(1, Math.ceil(d[i - 1] * k / 12));
    for (let s = 1; s <= steps; s++) { const v = k * s / steps; g.lineTo(...wob(a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v, seed + i)); }
  }
  g.stroke(); g.globalAlpha = 1;
}
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
const circ = (x, y, r, a0 = -Math.PI / 2, n = 40) => Array.from({ length: n + 1 }, (_, i) => [x + r * Math.cos(a0 + TAU * i / n), y + r * Math.sin(a0 + TAU * i / n)]);
// handwriting: the text appears letter by letter, left to right, with a pencil-tip wobble
function write(g, text, x, y, u, size = 64, col = GRAPHITE, o = {}) {
  if (u <= 0) return;
  g.save(); g.font = `${o.weight || 600} ${size}px ${o.font || HAND}`; g.fillStyle = col; g.textBaseline = 'middle'; g.textAlign = 'left';
  const w = g.measureText(text).width, x0 = o.center ? x - w / 2 : x;
  g.beginPath(); g.rect(x0 - 10, y - size, (w + 20) * clamp(u), size * 2); g.clip();
  g.globalAlpha = .92; g.fillText(text, x0, y + Math.sin(x0) * 1.5); g.restore();
}
function xMark(g, x, y, r, u, seed = 0) {
  stroke(g, [[x - r, y - r], [x + r, y + r]], seg(u, 0, .5), rust, 6, seed);
  stroke(g, [[x + r, y - r], [x - r, y + r]], seg(u, .5, 1), rust, 6, seed + 3);
}

// ——— what each line draws on the sheet (sheet-local coordinates, origin at the centre) ———
// v(f0, f1): the line's progress mapped into a reveal window; t = absolute time (for small life)
const DRAW = {
  T05B: (g, v) => {   // pencil laptop, then the page goes live, then a "www." box ticks
    stroke(g, rect(-300, -190, 360, 220), v(.0, .25), GRAPHITE, 3.5, 1);
    stroke(g, [[-340, 30], [100, 30], [70, 70], [-310, 70], [-340, 30]], v(.15, .35), GRAPHITE, 3.5, 2);
    stroke(g, rect(-270, -160, 300, 30), v(.3, .45), GRAPHITE, 2.4, 3);
    for (let k = 0; k < 4; k++) stroke(g, [[-260, -100 + k * 28], [-260 + 200 - k * 30, -100 + k * 28]], v(.38 + k * .04, .5 + k * .04), GRAPHITE, 2.2, 4 + k);
    stroke(g, rect(170, -120, 300, 90), v(.55, .7), GRAPHITE, 3.2, 9);
    write(g, 'www.', 196, -75, v(.65, .78), 58);
    stroke(g, [[400, -80], [420, -55], [455, -105]], v(.82, .92), GRAPHITE, 5, 11);
  },
  T06: (g, v) => {
    write(g, '10 SENT', -420, -40, v(0, .35), 110, GRAPHITE, { font: SC, weight: 600 });
    write(g, '· 1 REPLY', 30, -40, v(.62, .85), 110, GRAPHITE, { font: SC, weight: 600 });
  },
  T07: (g, v) => {   // small sites vs big sites, a small rust X at the split
    for (let k = 0; k < 3; k++) stroke(g, rect(-420 + k * 90, -40, 60, 70), v(.05 + k * .05, .2 + k * .05), GRAPHITE, 3, k);
    write(g, 'small', -400, 80, v(.2, .35), 52);
    stroke(g, rect(140, -200, 260, 230), v(.45, .62), GRAPHITE, 3.5, 7);
    stroke(g, rect(170, -170, 200, 40), v(.55, .66), GRAPHITE, 2.4, 8);
    write(g, 'big', 230, 80, v(.62, .75), 52);
    stroke(g, [[0, -230], [0, 200]], v(.3, .45), GRAPHITE, 2.4, 10);
    xMark(g, 0, -20, 34, v(.85, .98), 12);
  },
  T08: (g, v, u) => {
    const dx = 520 * eio(seg(u, .82, 1));
    g.save(); g.translate(dx, 0); g.rotate(.12 * eio(seg(u, .82, 1)));
    stroke(g, rect(-300, -110, 600, 200), v(0, .3), GRAPHITE, 3.5, 1);
    write(g, 'AI SPEND LIMITS', 0, -10, v(.15, .55), 76, GRAPHITE, { font: SC, center: true });
    g.restore();
  },
  T09: (g, v) => {
    write(g, 'AGENT SAFETY · 5 MONTHS', 0, -220, v(0, .4), 64, GRAPHITE, { font: SC, center: true });
    for (let k = 0; k < 4; k++) stroke(g, [[-60, -40 + k * 30], [60 - k * 20, -40 + k * 30]], v(.35 + k * .03, .45 + k * .03), GRAPHITE, 2.4, k);   // a small codebase
    stroke(g, rect(-90, -80, 180, 160), v(.3, .45), GRAPHITE, 3, 5);
    for (let k = 0; k < 8; k++) {   // gates around it
      const a = k / 8 * TAU, x = Math.cos(a) * 240, y = Math.sin(a) * 150;
      stroke(g, [[x - 18, y + 22], [x - 18, y - 22], [x + 18, y - 22], [x + 18, y + 22]], v(.5 + k * .05, .6 + k * .05), GRAPHITE, 3, 9 + k);
    }
  },
  T10B: (g, v, u) => {   // a drawn clock, hands sweep from 12 to 3
    stroke(g, circ(0, -10, 200), v(0, .25), GRAPHITE, 4, 1);
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU - Math.PI / 2; stroke(g, [[Math.cos(a) * 170, -10 + Math.sin(a) * 170], [Math.cos(a) * 186, -10 + Math.sin(a) * 186]], v(.15 + k * .01, .2 + k * .01), GRAPHITE, 3, k); }
    const sweep = eio(seg(u, .3, .8)), hr = -Math.PI / 2 + sweep * Math.PI / 2, mn = -Math.PI / 2 + sweep * 6 * TAU;
    if (u > .25) {
      g.strokeStyle = GRAPHITE; g.lineCap = 'round';
      g.lineWidth = 7; g.beginPath(); g.moveTo(0, -10); g.lineTo(Math.cos(hr) * 105, -10 + Math.sin(hr) * 105); g.stroke();
      g.lineWidth = 4; g.beginPath(); g.moveTo(0, -10); g.lineTo(Math.cos(mn) * 155, -10 + Math.sin(mn) * 155); g.stroke();
    }
  },
  T12: (g, v, u) => {   // a generic post card, a line rising, then a flat grey REMOVED stamp
    stroke(g, rect(-330, -230, 660, 420), v(0, .15), GRAPHITE, 3.2, 1);
    for (let k = 0; k < 3; k++) stroke(g, [[-290, -180 + k * 34], [180 - k * 70, -180 + k * 34]], v(.1 + k * .03, .2 + k * .03), GRAPHITE, 2.4, 2 + k);
    stroke(g, [[-280, 150], [-200, 140], [-120, 120], [-40, 70], [40, -10], [120, -60], [260, -80]], v(.18, .5), GRAPHITE, 4, 6);
    const st = seg(u, .66, .7);
    if (st > 0) {
      g.save(); g.translate(20, 0); g.rotate(-.12); g.scale(1.25 - .25 * eo(st), 1.25 - .25 * eo(st)); g.globalAlpha = .85 * st;
      g.strokeStyle = '#6E6E6E'; g.lineWidth = 8; g.strokeRect(-230, -60, 460, 120);
      g.font = `700 92px ${SC}`; g.fillStyle = '#6E6E6E'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('REMOVED', 0, 4);
      g.restore();
    }
  },
  T14: (g, v) => {
    write(g, '$5K / MONTH BY DEC?', 0, -20, v(0, .55), 96, GRAPHITE, { center: true });
    stroke(g, [[-420, 0], [-200, -16], [60, -8], [420, -30]], v(.7, .8), rust, 7, 3);
    stroke(g, [[-410, 30], [-100, 8], [200, 18], [430, -2]], v(.8, .9), rust, 6, 5);
  },
  T15: (g, v) => {
    stroke(g, [[0, -300], [4, 0], [0, 300]], v(0, .25), GRAPHITE, 3.5, 1);
    write(g, 'PLACEMENTS · JULY', -250, -40, v(.25, .55), 54, GRAPHITE, { font: SC, center: true });
    stroke(g, rect(110, -200, 150, 100), v(.55, .65), GRAPHITE, 2.6, 4);
    stroke(g, rect(300, -170, 170, 60), v(.62, .72), GRAPHITE, 2.6, 5);
    stroke(g, circ(220, 70, 60), v(.7, .8), GRAPHITE, 2.6, 6);
    for (let k = 0; k < 4; k++) { const a = k / 4 * TAU; stroke(g, [[220 + Math.cos(a) * 80, 70 + Math.sin(a) * 80], [220 + Math.cos(a) * 100, 70 + Math.sin(a) * 100]], v(.78, .85), GRAPHITE, 2.6, 7 + k); }
  },
  T18: (g, v) => {   // a prompt box gets crossed out, then small figures of people talking (no faces)
    stroke(g, rect(-460, -150, 400, 90), v(0, .15), GRAPHITE, 3.2, 1);
    stroke(g, [[-430, -105], [-150, -105]], v(.1, .2), GRAPHITE, 2.4, 2);
    stroke(g, [[-470, -160], [-50, -50]], v(.32, .4), rust, 6, 3);
    const fig = (x, y, k, a, b) => {
      stroke(g, circ(x, y - 70, 22, 0, 24), v(a, a + .06), GRAPHITE, 3, k);
      stroke(g, [[x - 30, y + 40], [x - 26, y - 30], [x, y - 44], [x + 26, y - 30], [x + 30, y + 40]], v(a + .04, b), GRAPHITE, 3, k + 1);
    };
    fig(60, 160, 10, .5, .6); fig(170, 150, 12, .56, .66); fig(300, 170, 14, .62, .72); fig(420, 150, 16, .68, .78);
    stroke(g, [[85, 40], [140, 20], [150, 40]], v(.8, .86), GRAPHITE, 2.6, 18);
    stroke(g, [[330, 40], [380, 18], [395, 42]], v(.86, .92), GRAPHITE, 2.6, 19);
  },
  T19: (g, v) => {   // an unfinished pencil sketch of a robot arm, construction lines visible
    g.save(); g.globalAlpha = .55; stroke(g, [[-400, 200], [400, 200]], v(0, .2), GRAPHITE, 1.4, 1); stroke(g, circ(-120, 120, 70, 0, 30), v(0, .2), GRAPHITE, 1.4, 2); stroke(g, [[-120, 120], [60, -120], [260, -60]], v(.05, .3), GRAPHITE, 1.4, 3); g.restore();
    stroke(g, rect(-200, 160, 160, 40), v(.1, .35), GRAPHITE, 3.2, 4);
    stroke(g, [[-140, 160], [-120, 120], [40, -110], [70, -130], [90, -100], [250, -50]], v(.25, .7), GRAPHITE, 3.6, 5);
    stroke(g, circ(60, -118, 26, 0, 24), v(.5, .65), GRAPHITE, 3, 6);
    stroke(g, [[250, -50], [290, -80]], v(.7, .8), GRAPHITE, 3, 7); stroke(g, [[250, -50], [292, -24]], v(.75, .85), GRAPHITE, 3, 8);
  },
  T22: (g, v) => { write(g, 'Okay. New idea. Hear me out.', 0, 0, v(0, 1), 96, GRAPHITE, { center: true }); },
};

// forearms over the sheet (top-down): a sleeve + a hand at wrist w pointing angle a
function forearm(g, w, a, sleeve, scale = 3.4) {
  g.save(); g.translate(w[0], w[1]); g.rotate(a); g.scale(scale, scale);
  const kk = LWK.k; LWK.k = 1.2 / scale;
  const st = { so: [0, 0], rim: null };
  if (sleeve) cel(g, limbOutline([[-260, 0], [-10, 0]], [92, 78], .05, .4), { f: sleeve.f, s: sleeve.s, l: sleeve.l, lw: 1.6 });
  else cel(g, limbOutline([[-260, 0], [-10, 0]], [74, 62], .05, .4), { f: P.skin.f, s: P.skin.s, l: P.skin.l, lw: 1.6 });
  handShape(g, P, [0, 0], 0, 'flat', st);
  LWK.k = kk; g.restore();
}

// ——— PAPER: the top-down insert ———
export function paper(g, e, T, t, shot) {
  deskTop(g, e, 1);
  const id = shot.line;
  const C = [W / 2 + 10, H / 2 + 10];
  // T01: TY's hand slides the blank sheet across (enters from screen right); Y02's gap: the flip gag
  if (id === 'T01' || id === 'Y02') {
    const s0 = shot.t0, s1 = T.at('T01', 'end', .1);
    const k = eio(seg(t, s0, s1)), cx = lerp(W + 700, C[0], k);
    // Y02 gap: flip (sx 1 → -1), flip back, then hold it up to the lamp
    const g0 = T.at('T01', 'end', .2), g1 = T.at('Y02', 'start', -.05), gd = g1 - g0;
    const f1 = seg(t, g0, g0 + gd * .25), f2 = seg(t, g0 + gd * .3, g0 + gd * .55), up = ss(seg(t, g0 + gd * .6, g0 + gd * .8)) * (1 - ss(seg(t, T.at('Y02', 'end', -.2), T.at('Y02', 'end', .3))));
    const sxx = f2 > 0 ? -Math.cos(Math.PI * eio(f2)) : Math.cos(Math.PI * eio(f1));   // 1 → -1 (flip), -1 → 1 (back)
    const scale = 1 + .08 * up;
    g.save(); g.translate(C[0], C[1]); g.scale(scale, scale); g.translate(-C[0], -C[1]);
    sheet(g, e, [cx, C[1] - 20 * up], -.03 + .02 * up, Math.abs(sxx) < .02 ? .02 : sxx, { backlit: up });
    g.restore();
    if (t < s1 + .6) forearm(g, [cx + SHEET_W / 2 - 40, C[1] + 60], Math.PI - .12, P.over, 3.0);   // TY's hand (slate sleeve) pushing it
    if (t > g0 - .1) { const a = ss(seg(t, g0 - .2, g0 + .15));   // FY's hands at the lower corners (short sleeves: bare forearms)
      forearm(g, [C[0] - SHEET_W * .42, H + 240 - 330 * a - 40 * up], -Math.PI / 2 + .25, null, 2.6);
      forearm(g, [C[0] + SHEET_W * .42, H + 240 - 330 * a - 40 * up], -Math.PI / 2 - .25, null, 2.6); }
    if (up > 0) airbrush(e, C[0], C[1], 600, 400, '#FFF4DC', .25 * up, .9);
    return;
  }
  const L = T.L[id];
  const [a, b] = T.voiced(id), u = clamp((t - a) / (b - a));
  // T05's insert starts at its part 2; T19's is a brief flash
  const span = id === 'T19' ? [shot.t0, shot.t1] : [a, b];
  const uu = clamp((t - span[0]) / (span[1] - span[0]));
  const v = (f0, f1) => clamp((uu - f0) / (f1 - f0));
  const fn = DRAW[id];
  sheet(g, e, C, -.03, 1, { draw: fn ? (q => fn(q, v, uu, t)) : null });
  // a soft notification on "reply": a small glow on the counter (no UI)
  airbrush(e, W * .78, H * .1, 600, 400, '#F2C27C', .12, .9);
}

// ——— PHONE: a generic phone face-up on the desk; a voice-note waveform; no brand, no app UI ———
function waveform(g, e, x, y, w, h, env, playU, live) {
  const n = 46, bw = w / n;
  for (let k = 0; k < n; k++) {
    const idx = Math.floor(k / n * env.length), v = env.length ? Math.max(.06, env[Math.min(env.length - 1, idx)]) : .06;
    const played = live ? k / n < playU : k / n <= playU;
    if (live && !played) continue;
    const hh = h * v;
    g.fillStyle = played ? mix(ivory, teal, .25) : rgba(ivory, .35);
    g.fillRect(x + k * bw + bw * .2, y - hh / 2, bw * .6, hh);
    if (played) { e.fillStyle = rgba(mix(ivory, teal, .3), .5); e.fillRect(x + k * bw, y - hh / 2 - 3, bw, hh + 6); }
  }
}
export function phone(g, e, T, M, t, shot) {
  const vn = shot.line === 'VN01';
  const lit = vn ? 0 : 1;
  // the desk: pitch dark at the start (the phone is the only light), lamp-lit at the end
  g.fillStyle = vn ? '#07080B' : '#000'; g.fillRect(0, 0, W, H);
  if (!vn) deskTop(g, e, 1);
  else {
    for (let k = 0; k < 30; k++) { const y = k * 38; g.strokeStyle = rgba('#2A2018', .25); g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y + 10 * Math.sin(k)); g.stroke(); }
  }
  const cx = W / 2 + 30, cy = H / 2 + 10, pw = 420, ph = 860, r = -.18 + (vn ? .02 * Math.sin(t * .4) : 0);
  // screen spill on the desk around the phone
  airbrush(g, cx, cy, 760, 640, mix(ivory, teal, .55), vn ? .32 : .12, .9);
  airbrush(e, cx, cy, 520, 520, mix(ivory, teal, .5), vn ? .35 : .1, .85);
  g.save(); g.translate(cx, cy); g.rotate(r);
  g.save(); g.filter = 'blur(18px)'; g.fillStyle = rgba('#000', .6); g.beginPath(); g.roundRect(-pw / 2 + 20, -ph / 2 + 26, pw, ph, 56); g.fill(); g.restore();
  g.fillStyle = '#15181D'; g.beginPath(); g.roundRect(-pw / 2, -ph / 2, pw, ph, 56); g.fill();
  g.strokeStyle = '#2E333B'; g.lineWidth = 4; g.stroke();
  const sw = pw - 34, shh = ph - 34;
  const sg = g.createLinearGradient(0, -shh / 2, 0, shh / 2); sg.addColorStop(0, '#1C2A33'); sg.addColorStop(1, '#0F161C');
  g.fillStyle = sg; g.beginPath(); g.roundRect(-sw / 2, -shh / 2, sw, shh, 42); g.fill();
  // the waveform: VN01 plays back (playhead); T22 records live (grows from the left)
  const id = vn ? 'VN01' : 'T22', m = M[id], L = T.L[id];
  const env = m ? m.a.filter((_, i) => i % 2 === 0) : [];
  const u = clamp((t - L.start) / L.dur);
  waveform(g, e, -sw / 2 + 30, -40, sw - 60, 230, env, u, !vn);
  // one round control: play/stop (VN01, teal-ivory) or record (T22, amber; TY's thumb on it)
  const bx = 0, by = shh / 2 - 130;
  const stopped = vn && t > T.at('VN01', 'end', .05);
  g.fillStyle = vn ? rgba(ivory, .85) : amber; g.beginPath(); g.arc(bx, by, 56, 0, TAU); g.fill();
  g.fillStyle = '#15181D';
  if (vn) { if (stopped) { g.beginPath(); g.moveTo(bx - 14, by - 22); g.lineTo(bx + 24, by); g.lineTo(bx - 14, by + 22); g.closePath(); g.fill(); } else g.fillRect(bx - 18, by - 18, 36, 36); }
  else { g.beginPath(); g.arc(bx, by, 20, 0, TAU); g.fill(); }
  g.restore();
  // glow from the screen
  airbrush(e, cx, cy, 300, 420, mix(ivory, teal, .4), stopped ? .05 : .22, .8);
  if (!vn) {   // TY's thumb holding record (slate sleeve from the lower right)
    const press = ss(seg(t, shot.t0 + .15, shot.t0 + .35));
    const pr = [cx + Math.cos(r) * 0 - Math.sin(r) * by, cy + Math.sin(r) * 0 + Math.cos(r) * by];
    forearm(g, [pr[0] + 120 - 10 * press, pr[1] + 150 - 10 * press], -Math.PI * .72, P.over, 2.4);
  }
  if (vn) { g.fillStyle = rgba('#000', .25); g.fillRect(0, 0, W, H); }
}

// ——— the title over W (after Y04, in Y05's gap): small, lower third, fades in and out over 1.5 s ———
export function title(g, T, t, shot) {
  const a = t - shot.t0, d = 1.5;
  if (a < 0 || a > d) return;
  const al = Math.min(ss(a / .45), ss((d - a) / .45));
  g.setTransform(1, 0, 0, 1, 0, 0); g.save(); g.globalAlpha = al * .95;
  g.font = `600 44px ${SC}`; g.letterSpacing = '6px'; g.fillStyle = ivory; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 12; g.fillText('DID WE MAKE IT?', W / 2, H * .82); g.restore();
}

// ——— the end card: warm ivory on deep ink, text from dialogue.json ———
export function endCard(g, e, T, t, lines) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = ink; g.fillRect(0, 0, W, H);
  const a = t - T.card[0], dur = T.card[1] - T.card[0], out = ss((dur - a) / .5);
  const show = (k, at) => Math.min(ss((a - at) / .6), out);
  g.save(); g.fillStyle = ivory; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.globalAlpha = show(0, .25); g.font = `600 88px ${SC}`; g.letterSpacing = '10px'; g.fillText(lines[0], W / 2, H * .42);
  g.globalAlpha = show(1, 1.25); g.font = `500 64px ${SC}`; g.letterSpacing = '8px'; g.fillText(lines[1], W / 2, H * .54);
  g.globalAlpha = show(2, 2.2) * .8; g.font = `400 34px ${SC}`; g.letterSpacing = '3px'; g.fillText(lines[2], W / 2, H * .7);
  g.restore();
}
