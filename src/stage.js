// The one room (src/apartment.js) with both Skys at the table, drawn under any camera setup: W (the existing two-shot),
// FY / TY medium close-ups, TY_CU. Every setup is a camera transform; the characters and props are vector cels
// redrawn at render resolution each frame, and the golden plate is cached at 3× so even the CU never upscales a bitmap.
// Characters only through figure() (body.js → sky.js, locked); palette PAL.golden. State comes from src/acting.js.
import { canvas, poly, cel, line, rgba, mix, airbrush, hash, TAU, LWK } from './cel.js';
import { PAL, TOK } from './pal.js';
import { figure, limbOutline, proj, POSES } from './body.js';
import { chair } from './props.js';
import { apartmentPlate, windowLife, table, deskLamp, TABLE, PENDANT } from './apartment.js';
import { lerp, lerpV } from './perf.js';

const { ivory, amber, teal, ink } = TOK;
export const P = PAL.golden;
const W = 1920, H = 1080;
export const FLOOR_Y = 1250, S = .8, YAW = .95, CY = Math.cos(YAW), SY = Math.sin(YAW);
export const FYX = 560, TYX = 1360;

// ——— camera setups: [zoom, centre x, centre y] in world px. Heads sit near (635, 440) and (1366, 440). ———
export const SETUPS = {
  W: [1.15, 960, 605],
  FY: [2.0, 735, 500],       // MCU, head on the left third, looking room to the right
  TY: [2.0, 1265, 500],      // MCU, head on the right third, looking left
  TY_CU: [2.75, 1318, 468],  // CU
};
export function cam(x, z, cx, cy, d = [0, 0]) {
  const hw = 960 / z, hh = 540 / z;
  cx = Math.min(W - hw, Math.max(hw, cx)); cy = Math.min(H - hh, Math.max(hh, cy));
  x.setTransform(z, 0, 0, z, 960 - cx * z + d[0], 540 - cy * z + d[1]);
}
export const drift = (t, seed = 0, a = 3) => [a * (.6 * Math.sin(t * .41 + seed) + .4 * Math.sin(t * .93 + seed * 2.3)), a * .7 * (.6 * Math.sin(t * .37 + seed * 1.7) + .4 * Math.sin(t * .77 + seed * .9))];

// ——— layers: characters are stamped out of the emissive canvas so glow never blooms through them ———
let IC = null, L1 = null, SH = null;
function layer(g, e, fn, o = {}) {
  if (!L1) L1 = canvas(W, H);
  const [c, q] = L1; q.setTransform(1, 0, 0, 1, 0, 0); q.clearRect(0, 0, W, H);
  q.setTransform(g.getTransform()); fn(q); q.setTransform(1, 0, 0, 1, 0, 0);
  for (const sh of [].concat(o.shadow || [])) shadowFrom(g, c, sh);
  const m = g.getTransform(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(c, 0, 0); g.setTransform(m);
  const me = e.getTransform(); e.setTransform(1, 0, 0, 1, 0, 0);
  e.globalCompositeOperation = 'destination-out'; e.drawImage(c, 0, 0);
  e.globalCompositeOperation = 'destination-over'; e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  e.globalCompositeOperation = 'source-over'; e.setTransform(me);
}
function shadowFrom(g, src, o) {
  if (!SH) SH = canvas(W / 4, H / 4);
  const [c, q] = SH;
  q.setTransform(1, 0, 0, 1, 0, 0); q.globalCompositeOperation = 'source-over'; q.clearRect(0, 0, c.width, c.height);
  q.filter = `blur(${o.blur ?? 2}px)`; q.setTransform(.25, 0, 0, .25, (o.off?.[0] || 0) * .25, (o.off?.[1] || 0) * .25);
  q.drawImage(src, 0, 0); q.filter = 'none';
  q.setTransform(1, 0, 0, 1, 0, 0); q.globalCompositeOperation = 'source-in'; q.fillStyle = o.color || '#1A0E08'; q.fillRect(0, 0, c.width, c.height);
  q.globalCompositeOperation = 'source-over';
  g.save(); if (o.clip) { g.beginPath(); o.clip(g); g.clip(); }
  const m = g.getTransform(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = o.alpha ?? .35; g.drawImage(c, 0, 0, W, H); g.setTransform(m); g.restore();
}
export const tableTop = c => { const { far, near } = TABLE; c.moveTo(far[0], far[2]); c.lineTo(far[1], far[2]); c.lineTo(near[1], near[2]); c.lineTo(near[0], near[2]); c.closePath(); };

// ——— rig helpers ———
export function pose(name, base, side, extra = {}) {
  const B = POSES[base];
  POSES[name] = { ...B, ...extra, R: { ...B.R, ...(side.R || {}) }, L: { ...B.L, ...(side.L || {}) } };
  return name;
}
// the rig z that puts a wrist (rig x = xr) at screen x = sx, for a figure at X (mirrored figures face screen left)
export const zFor = (X, mirror, xr, sx) => ((mirror ? X - sx : sx - X) / S - xr * CY) / SY;
export function handFrame(o, side) {
  const Q = POSES[o.pose][side], th = o.yaw ?? 0, b = proj(Q.elbow, th), c = proj(Q.wrist, th), sg = o.mirror ? -1 : 1;
  const ang = Math.atan2(c[1] - b[1], c[0] - b[0]);
  return { w: [o.x + sg * o.s * c[0], o.y + o.s * c[1]], dir: [sg * Math.cos(ang), Math.sin(ang)], local: { c, ang } };
}
export function thumb(q, o, side) {
  const { c, ang } = handFrame(o, side).local, s = o.s;
  const lx = o.light?.[0] ?? 1, ly = o.light?.[1] ?? -.6;
  const kk = LWK.k; LWK.k = (o.lwk ?? 1) * 1.15 / s;
  q.save(); q.translate(o.x, o.y); if (o.mirror) q.scale(-1, 1); q.scale(s, s); q.translate(c[0], c[1]); q.rotate(ang);
  cel(q, limbOutline([[14, -16], [32, -32], [50, -38]], [21, 16, 13], .4, 1), { f: P.skin.f, s: P.skin.s, l: P.skin.l, lw: 1.8, so: [lx * 22 * .4, ly * 14 * .4] });
  q.restore(); LWK.k = kk;
}

// ——— the sheet: ONE A4 page, always the same physical size (236 × 167 rig units × the figures' scale) ———
export const A4 = [236 * S, 167 * S];
export function flatPage(c, rot = 0) {
  const hw = A4[0] / 2, hd = A4[1] * .15, cs = Math.cos(rot), sn = Math.sin(rot), R = (x, y) => [c[0] + x * cs - y * sn * .2, c[1] + x * sn * .2 + y * cs];
  return [R(-hw * .97, -hd), R(hw * .97, -hd), R(hw, hd), R(-hw, hd)];
}
export function heldPage(o, sides, w, h, tilt = 0) {
  const F = sides.map(sd => handFrame(o, sd)), s = o.s;
  const grip = F.map(f => [f.w[0] + f.dir[0] * 58 * s, f.w[1] + f.dir[1] * 58 * s]);
  let bx, by;
  if (grip.length === 2) { bx = (grip[0][0] + grip[1][0]) / 2; by = (grip[0][1] + grip[1][1]) / 2 + 14 * s; }
  else { bx = grip[0][0] + w * .36; by = grip[0][1] + 18 * s; }
  const cs = Math.cos(tilt), sn = Math.sin(tilt), R = (x, y) => [bx + x * cs - y * sn, by + x * sn + y * cs];
  return { pts: [R(-w / 2, -h), R(w / 2, -h), R(w / 2, 0), R(-w / 2, 0)], c: R(0, -h / 2) };
}
export const lerpQ = (A, B, u) => A.map((p, i) => lerpV(p, B[i], u));
function paperQuad(g, e, pts, glow = .06, back = false) {
  const f = back ? mix(P.paper.f, P.paper.s, .25) : P.paper.f;
  cel(g, poly(pts), { f, s: P.paper.s, l: P.paper.l, lw: 1.6 });
  e.fillStyle = rgba(ivory, glow); e.beginPath(); pts.forEach((p, i) => e[i ? 'lineTo' : 'moveTo'](p[0], p[1])); e.closePath(); e.fill();
}

// ——— small props: the phone lying on the table, the laptop (open / closed), three plain books ———
function phoneOnTable(g, e, x, y, glow) {
  cel(g, poly([[x - 26, y - 5], [x + 22, y - 6], [x + 28, y + 5], [x - 22, y + 6]]), { f: '#1A1D22', s: '#0E1014', l: '#06070A', lw: 1.4 });
  if (glow > 0) {
    g.fillStyle = rgba(mix(ivory, teal, .5), .85 * glow); g.beginPath(); g.moveTo(x - 22, y - 3); g.lineTo(x + 19, y - 4); g.lineTo(x + 24, y + 3); g.lineTo(x - 19, y + 4); g.closePath(); g.fill();
    airbrush(e, x, y, 60, 26, mix(ivory, teal, .4), .55 * glow, .7);
  }
}
function laptop(g, e, x, y, open) {
  // seen from FY's side: the lid's back (plain, no logo); `open` 1 → lid up, 0 → shut flat
  const st = { f: '#4A525C', s: '#2E343B', h: '#6A747E', l: '#14181C', lw: 1.6 };
  cel(g, poly([[x - 70, y - 8], [x + 62, y - 10], [x + 74, y + 8], [x - 60, y + 10]]), st);   // base
  const hgt = 92 * open;
  if (open > .02) {
    cel(g, poly([[x - 70, y - 8 - hgt], [x + 62, y - 10 - hgt * 1.02], [x + 62, y - 10], [x - 70, y - 8]]), { ...st, f: mix(st.f, st.h, .15) });
    airbrush(e, x + 30, y - hgt * .5, 70, 50 * open, mix(teal, ivory, .5), .18 * open, .8);
  } else cel(g, poly([[x - 68, y - 12], [x + 60, y - 14], [x + 70, y + 2], [x - 58, y + 4]]), { ...st, f: mix(st.f, st.h, .25) });
}
function books(g, x, y) {
  const cols = [['#5D4636', '#3C2C22'], ['#2F4A55', '#1E333B'], ['#7A6A50', '#544833']];
  cols.forEach(([f, s], k) => { const yy = y - k * 13; cel(g, poly([[x - 52 + k * 3, yy - 6], [x + 50 + k * 2, yy - 7], [x + 54, yy + 6], [x - 50 + k * 3, yy + 7]]), { f, s, l: '#1A120C', lw: 1.4 });
    line(g, [[x - 46 + k * 3, yy + 1], [x + 46, yy]], mix(ivory, f, .5), .8); });
}

// ——— the frame ———
// st = { cam:{z,cx,cy}, life (clock for city/dust), lamp, gold, FY:{figure opts}, TY:{figure opts},
//        page:{ pts, held, back }, phone:{x,y,glow,shown}, laptop (0..1 open, or null), books, wave (0..1), dark }
export function room(g, e, st) {
  const C = st.cam, dr = st.still ? [0, 0] : drift(st.life, 1, 2.5 / C.z * 1.15), gold = st.gold;
  cam(g, C.z, C.cx, C.cy, [dr[0] * .5, dr[1] * .5]); cam(e, C.z, C.cx, C.cy, [dr[0] * .5, dr[1] * .5]);
  const D = apartmentPlate('dark'), G = apartmentPlate('gold', 3);
  if (gold < 1) g.drawImage(D.g, 0, 0, W, H);
  if (gold > 0) { g.globalAlpha = gold; g.drawImage(G.g, 0, 0, W, H); g.globalAlpha = 1; }
  e.globalCompositeOperation = 'lighter';
  if (gold < 1) { e.globalAlpha = 1 - gold; e.drawImage(D.e, 0, 0, W, H); }
  if (gold > 0) { e.globalAlpha = gold * (st.plateGlow ?? 1); e.drawImage(G.e, 0, 0, W, H); }
  e.globalAlpha = 1; e.globalCompositeOperation = 'source-over';
  windowLife(g, e, st.life);

  if (!IC) IC = canvas(W, H);
  const [ci, gi] = IC; gi.setTransform(1, 0, 0, 1, 0, 0); gi.clearRect(0, 0, W, H);
  cam(gi, C.z, C.cx, C.cy, dr); cam(e, C.z, C.cx, C.cy, dr);
  const FY = st.FY, TY = st.TY;

  layer(gi, e, q => {
    chair(q, P, { yaw: YAW, x: FY.x, y: FLOOR_Y, s: S }); chair(q, P, { yaw: YAW, x: TYX, y: FLOOR_Y, s: S, mirror: true });
    figure(q, P, { ...FY, layer: 'base' }); figure(q, P, { ...TY, layer: 'base' });
  });
  table(gi, e, P, gold);
  if (st.books) books(gi, 1205, 752);
  if (st.laptop != null) laptop(gi, e, 1150, 772, st.laptop);
  deskLamp(gi, e, st.lamp);
  if (st.phone?.shown) phoneOnTable(gi, e, st.phone.x, st.phone.y, st.phone.glow);
  const pg = st.page;
  if (pg && !pg.held) {
    gi.save(); gi.beginPath(); tableTop(gi); gi.clip(); gi.filter = 'blur(3px)'; gi.fillStyle = rgba('#1A0E08', .35);
    gi.beginPath(); pg.pts.forEach((p, i) => gi[i ? 'lineTo' : 'moveTo'](p[0] + 6, p[1] + 4)); gi.closePath(); gi.fill(); gi.restore();
    paperQuad(gi, e, pg.pts, .06 * st.lamp, pg.back);
  }
  layer(gi, e, q => { figure(q, P, { ...FY, layer: 'arms' }); figure(q, P, { ...TY, layer: 'arms' }); },
    { shadow: { off: [10, 8], alpha: .32 * gold, blur: 2, clip: tableTop } });
  if (pg && pg.held) {
    paperQuad(gi, e, pg.pts, .03, pg.back);
    layer(gi, e, q => { for (const sd of pg.thumbs || []) thumb(q, FY, sd); });
  }
  if (st.dust !== false) dust(gi, e, st.life, [800, 200, 340, 560], 26, 5, { a: .45 * gold, focus: [PENDANT[0], 470, 300] });
  if (st.wave > 0) waveOverSheet(gi, e, st.life, st.wave, pg ? pg.pts : null);

  gi.setTransform(1, 0, 0, 1, 0, 0);
  if (gold < 1) { gi.globalCompositeOperation = 'source-atop'; gi.fillStyle = rgba('#04060C', .86 * (1 - gold)); gi.fillRect(0, 0, W, H); gi.globalCompositeOperation = 'source-over'; }
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(ci, 0, 0);
  airbrush(g, 0, H, 520, 320, '#0A0604', .35 * gold, .9); airbrush(g, W, H, 520, 320, '#0A0604', .35 * gold, .9);
}

function dust(g, e, t, box, n, seed, o = {}) {
  const [x0, y0, w, h] = box;
  for (let i = 0; i < n; i++) {
    const r1 = hash(seed + i * 3.1), r2 = hash(seed + i * 7.7), r3 = hash(seed + i * 11.3);
    const x = x0 + ((r1 * w + Math.sin(t * (.2 + r3 * .3) + i) * 26 + t * (r2 - .5) * 8) % w + w) % w;
    const y = y0 + ((r2 * h - t * (5 + r3 * 9)) % h + h) % h;
    const tw = .55 + .45 * Math.sin(t * (1.1 + r1 * 2) + i * 2.1);
    const near = o.focus ? Math.max(0, 1 - Math.hypot(x - o.focus[0], y - o.focus[1]) / o.focus[2]) : 1;
    const a = (o.a ?? .5) * tw * near;
    if (a < .01) continue;
    const rad = .9 + r3 * 1.4;
    g.fillStyle = rgba(mix(ivory, amber, .3), a); g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
    e.fillStyle = rgba(amber, a * .6); e.beginPath(); e.arc(x, y, rad * 2, 0, TAU); e.fill();
  }
}
// Y03: a faint voice-note waveform flickers over the sheet and dies on "that guy"
function waveOverSheet(g, e, t, a, pts) {
  const fl = .8 + .2 * Math.sin(t * 37) * Math.sin(t * 11.3), n = 24, x0 = pts ? (pts[0][0] + pts[1][0]) / 2 - n * 5 : 900, y0 = pts ? Math.min(pts[0][1], pts[1][1]) - 40 : 700;
  const sweep = (t / 1.6) % 1;
  for (let k = 0; k < n; k++) {
    const hgt = 6 + 30 * Math.abs(Math.sin(k * 1.7 + t * 3) * Math.sin(k * .43 + 1.2)), x = x0 + k * 10;
    const band = Math.exp(-Math.pow((k / n - sweep) * 6, 2)), al = a * fl * (.18 + .5 * band);
    g.fillStyle = rgba(mix(teal, ivory, .45), al); g.fillRect(x, y0 - hgt / 2, 4, hgt);
    e.fillStyle = rgba(mix(teal, ivory, .3), al * .9); e.fillRect(x - 2, y0 - hgt / 2 - 2, 8, hgt + 4);
  }
}
