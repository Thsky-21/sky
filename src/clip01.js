// Clip 01 · 0:00–0:30 · Scene 1, the blank page.
// Sky's direction (2026-11-04): ONE set for the film (a high-rise apartment at night, golden light, the city's traffic
// visible through the glass) and BOTH characters in ONE frame the whole time, talking to each other; no cutting between
// singles. So after the black, clip 01 is one continuous two-shot; the camera only drifts, pushes and re-centres
// a little toward whoever is acting, and never loses either of them.
// Built on the locked rig: characters only through figure()/handShape()/limbOutline() (body.js → sky.js); the set is
// src/apartment.js; colours PAL.golden.
import { canvas, poly, cel, line, rgba, mix, airbrush, hash, TAU, LWK } from './cel.js';
import { PAL, TOK } from './pal.js';
import { figure, limbOutline, proj, POSES } from './body.js';
import { chair } from './props.js';
import { apartmentPlate, windowLife, table, deskLamp, TABLE, PENDANT } from './apartment.js';
import { seg, ss, eio, eo, spring, lerp, lerpV, key, blink, openOf, breath, sway, sacc, lipAt, accent } from './perf.js';

const { ink, ivory, amber, teal } = TOK;
const P = PAL.golden;
const W = 1920, H = 1080;

// ——— the staging (world px at camera zoom 1) ———
const FLOOR_Y = 1250, S = .8, YAW = .95, CY = Math.cos(YAW), SY = Math.sin(YAW);
const FYX = 560, TYX = 1360;
const TABLE_Y = FLOOR_Y - 612 * S;   // a hand resting on the table top (rig y −612)

// ——— layers ———
// everything inside the room is drawn on the interior canvas, which is darkened as a whole before the lights come
// on (so the city in the glass stays bright behind the silhouettes); characters are stamped out of the emissive canvas
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
// a layer's silhouette as a soft cast shadow, laid onto the picture inside `clip` (world coordinates)
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
const tableTop = c => { const { far, near } = TABLE; c.moveTo(far[0], far[2]); c.lineTo(far[1], far[2]); c.lineTo(near[1], near[2]); c.lineTo(near[0], near[2]); c.closePath(); };

// ——— light: the hook. Dark room lit only by the city; at 0.75 s the brass desk lamp clicks on and flickers up, then
// the room's own lamps (pendant, floor lamp, cove) warm up on their dimmer and the place fills with gold ———
const LAMP_ON = .75;
function lampLevel(t) {
  const d = t - LAMP_ON;
  if (d < 0) return 0;
  if (d < .05) return .7; if (d < .11) return .12; if (d < .19) return .85; if (d < .23) return .45;
  return .85 + .15 * ss(seg(d, .23, .45));
}
const goldLevel = t => Math.max(.3 * lampLevel(t), ss(seg(t, 1.05, 2.4)));

// ——— camera on ones: zoom z about world point (cx, cy) at the frame centre, plus a slow float; never shows past the set
function cam(x, z, cx, cy, d = [0, 0]) {
  const hw = 960 / z, hh = 540 / z;
  cx = Math.min(W - hw, Math.max(hw, cx)); cy = Math.min(H - hh, Math.max(hh, cy));
  x.setTransform(z, 0, 0, z, 960 - cx * z + d[0], 540 - cy * z + d[1]);
}
const drift = (t, seed = 0, a = 3) => [a * (.6 * Math.sin(t * .41 + seed) + .4 * Math.sin(t * .93 + seed * 2.3)), a * .7 * (.6 * Math.sin(t * .37 + seed * 1.7) + .4 * Math.sin(t * .77 + seed * .9))];
// the framing over the clip: [t, zoom, centre x, centre y]; both characters stay in frame in every key
const CAM = [
  [0.5, 1.08, 960, 590], [3.0, 1.13, 960, 600],       // the push-in as the lights come up
  [4.2, 1.15, 930, 600], [7.0, 1.15, 950, 610],       // First-year's question: drift a little his way
  [8.6, 1.18, 960, 625], [10.2, 1.18, 930, 615],      // the page across the table
  [13.0, 1.15, 920, 605], [19.5, 1.15, 940, 605],     // the page in his hands, the voice-notes line
  [20.3, 1.15, 970, 605], [25.0, 1.2, 1000, 610],     // Third-year's answer: a slow push his way
  [26.5, 1.17, 960, 615], [27.6, 1.17, 960, 615],
  [30.0, 1.36, 955, 650],                              // the push toward the page between them (into clip 02)
];
function camAt(t) {
  const k = key(t, CAM.map(([a, ...v]) => [a, v]), eio);
  return { z: k[0], cx: k[1], cy: k[2] };
}

// ——— dust in the lamplight ———
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

// ——— rig helpers ———
function pose(name, base, side, extra = {}) {
  const B = POSES[base];
  POSES[name] = { ...B, ...extra, R: { ...B.R, ...(side.R || {}) }, L: { ...B.L, ...(side.L || {}) } };
  return name;
}
// the rig z that puts a wrist (rig x = xr) at screen x = sx, for a figure at X (mirrored figures face screen left)
const zFor = (X, mirror, xr, sx) => ((mirror ? X - sx : sx - X) / S - xr * CY) / SY;
function handFrame(o, side) {
  const Q = POSES[o.pose][side], th = o.yaw ?? 0, b = proj(Q.elbow, th), c = proj(Q.wrist, th), sg = o.mirror ? -1 : 1;
  const ang = Math.atan2(c[1] - b[1], c[0] - b[0]);
  return { w: [o.x + sg * o.s * c[0], o.y + o.s * c[1]], dir: [sg * Math.cos(ang), Math.sin(ang)], local: { c, ang } };
}
// the thumb of a rig hand drawn again IN FRONT of a held page (the rest of the hand stays behind it)
function thumb(q, o, side) {
  const { c, ang } = handFrame(o, side).local, s = o.s;
  const lx = o.light?.[0] ?? 1, ly = o.light?.[1] ?? -.6;
  const kk = LWK.k; LWK.k = (o.lwk ?? 1) * 1.15 / s;
  q.save(); q.translate(o.x, o.y); if (o.mirror) q.scale(-1, 1); q.scale(s, s); q.translate(c[0], c[1]); q.rotate(ang);
  cel(q, limbOutline([[14, -16], [32, -32], [50, -38]], [21, 16, 13], .4, 1), { f: P.skin.f, s: P.skin.s, l: P.skin.l, lw: 1.8, so: [lx * 22 * .4, ly * 14 * .4] });
  line(q, [[44, -40], [48, -34]], mix(P.skin.l, P.skin.f, .35), 1.2);
  q.restore(); LWK.k = kk;
}
// ——— the sheet: ONE A4 page, the same physical size all the time (A4 = 236 × 167 rig units × the figures' scale) ———
const A4 = [236 * S, 167 * S];
const PAPER_GLOW = .06;
// lying flat on the table, seen from just above the table top: its depth is foreshortened
function flatPage(c, rot = 0) {
  const hw = A4[0] / 2, hd = A4[1] * .15, cs = Math.cos(rot), sn = Math.sin(rot), R = (x, y) => [c[0] + x * cs - y * sn * .2, c[1] + x * sn * .2 + y * cs];
  return [R(-hw * .97, -hd), R(hw * .97, -hd), R(hw, hd), R(-hw, hd)];
}
// held upright: lower corners in the hands (two hands) or its lower-left corner in one hand
function heldPage(o, sides, w, h, tilt = 0) {
  const F = sides.map(sd => handFrame(o, sd)), s = o.s;
  const grip = F.map(f => [f.w[0] + f.dir[0] * 58 * s, f.w[1] + f.dir[1] * 58 * s]);
  let bx, by;
  if (grip.length === 2) { bx = (grip[0][0] + grip[1][0]) / 2; by = (grip[0][1] + grip[1][1]) / 2 + 14 * s; }
  else { bx = grip[0][0] + w * .36; by = grip[0][1] + 18 * s; }
  const cs = Math.cos(tilt), sn = Math.sin(tilt), R = (x, y) => [bx + x * cs - y * sn, by + x * sn + y * cs];
  return { pts: [R(-w / 2, -h), R(w / 2, -h), R(w / 2, 0), R(-w / 2, 0)], c: R(0, -h / 2) };
}
const lerpQ = (A, B, u) => A.map((p, i) => lerpV(p, B[i], u));
function paperQuad(g, e, pts, glow = PAPER_GLOW, back = false) {
  const f = back ? mix(P.paper.f, P.paper.s, .25) : P.paper.f;
  cel(g, poly(pts), { f, s: P.paper.s, l: P.paper.l, lw: 1.6 });
  e.fillStyle = rgba(ivory, glow); e.beginPath(); pts.forEach((p, i) => e[i ? 'lineTo' : 'moveTo'](p[0], p[1])); e.closePath(); e.fill();
}

// ——— the performances ———
const FY_IDS = ['Y01', 'Y02', 'Y03', 'Y04'], TY_IDS = ['T01', 'T02'];
const FY_MAP = { C: 'closed', T: 'talk', O: 'oh', A: 'smileopen' }, FY_MAP_FLAT = { C: 'closed', T: 'talk', O: 'oh', A: 'talk' };
const TY_MAP = { C: 'closed', T: 'talk', O: 'oh', A: 'talk' };   // Third-year is restrained: never the open smile here
function face(t, X, who, base, extra = {}) {
  const fy = who === 'FY', ids = fy ? FY_IDS : TY_IDS;
  const flat = fy && X.lines.Y02 != null && t >= X.lines.Y02 && t < X.lines.Y02 + 1.2;   // "It's blank." is puzzled
  const lip = lipAt(t, X.lines, X.M, ids, fy ? (flat ? FY_MAP_FLAT : FY_MAP) : TY_MAP);
  const bf = blink(t, fy ? 11 : 23, extra.blinks || [], 0, 30, extra.noBlink || []);
  const sc = sacc(t, fy ? 3 : 7, extra.sacc ?? .04);
  const look = extra.look ? [extra.look[0] + sc[0], extra.look[1] + sc[1]] : undefined;
  return { expr: base, mouth: lip ? lip.shape : (extra.rest || undefined), open: openOf(base, bf, extra.E || {}), E: extra.E || {}, look, acc: accent(t, X.lines, X.M, ids) };
}
const apply = (o, f) => ({ ...o, expr: f.expr, open: f.open, E: f.E, mouth: f.mouth, ...(f.look ? { look: f.look } : {}) });

// First-year's heel jiggle at the start (impatient, excited): taps at 2.6 Hz while `on`
const JIG = { f: 2.6, on: [[.05, 1.25], [1.9, 2.55]] };
const jigAmt = t => JIG.on.reduce((m, [a, b]) => Math.max(m, ss(seg(t, a, a + .12)) * (1 - ss(seg(t, b - .12, b)))), 0);
export const jigTaps = () => { const out = []; for (const [a, b] of JIG.on) for (let k = 0; ; k++) { const tk = (k + .5) / JIG.f + Math.floor(a * JIG.f) / JIG.f; if (tk >= b) break; if (tk > a + .05) out.push(+tk.toFixed(3)); } return out; };

// the page's journey across the table: Third-year has it in front of him; he slides it across (7.2–8.3) and lets it
// glide into First-year's hands (8.75); First-year draws it in; lifts it (10.0), flips it (10.5), holds it one-handed
// for the voice-notes line (13–19), lays it back down (19–19.8); on "start at the beginning" he pushes it back to the
// middle of the table, between them (25.6–26.6)
const SL = { t0: 7.2, t1: 8.3, land: 8.75 };
function pageC(t) {
  if (t < SL.t0) return [1040, 778];
  if (t < SL.t1) return [lerp(1040, 985, eio(seg(t, SL.t0, SL.t1))), 779];
  if (t < 9.05) return [lerp(985, 925, eo(seg(t, SL.t1, SL.land))), 781];
  if (t < 19) return [lerp(925, 895, eio(seg(t, 9.05, 9.8))), 782];
  return [lerp(895, 985, eio(seg(t, 25.6, 26.6))), 782];
}

// First-year's arms: table hands by screen target (R, L), or the held poses
const FY_HOLD2 = { R: { elbow: [-140, -600, 230], wrist: [-100, -800, 318] }, L: { elbow: [140, -600, 236], wrist: [100, -800, 324] } };
function fyTable(sxR, sxL) {
  const zR = zFor(FYX, false, -66, sxR), zL = zFor(FYX, false, 54, sxL);
  return { R: { elbow: [-118, -606, zR - 185], wrist: [-66, -612, zR] }, L: { elbow: [118, -606, zL - 185], wrist: [54, -612, zL] } };
}
const mixArms = (A, B, u) => ({ R: { elbow: lerpV(A.R.elbow, B.R.elbow, u), wrist: lerpV(A.R.wrist, B.R.wrist, u) }, L: { elbow: lerpV(A.L.elbow, B.L.elbow, u), wrist: lerpV(A.L.wrist, B.L.wrist, u) } });
function fyArms(t, X) {
  const pc = pageC(t), REST = [790, 845];
  // on the table
  let tab;
  if (t < 7.0) tab = REST;
  else if (t < 8.15) tab = lerpV(REST, [760, 810], ss(seg(t, 7.0, 7.4)));                    // he draws back, waiting
  else if (t < 19) tab = lerpV([760, 810], [pc[0] - 66, pc[0] - 16], spring(seg(t, 8.15, 8.7)));   // reaches; hands on the page
  else if (t < 25.6) tab = [pc[0] - 66, pc[0] - 16];
  else if (t < 26.6) tab = [pc[0] - 66, pc[0] - 16];                                           // pushes it back
  else tab = lerpV([pc[0] - 66, pc[0] - 16], REST, ss(seg(t, 26.6, 27.3)));
  const T = fyTable(tab[0], tab[1]);
  // the one-handed hold for the voice-notes line: the near hand raises the page and turns it once on "ideas, plans"
  const t0 = X.lines.Y03, d = X.M.Y03?.dur || 4.8;
  const gest = ss(seg(t, t0 + d * .28, t0 + d * .4)) * (1 - ss(seg(t, t0 + d * .62, t0 + d * .8)));
  const ONE = { R: { elbow: [-128, -602, 236], wrist: [-70 + 20 * gest, -700 - 80 * gest + 5 * Math.sin(t * 11) * gest, 370 + 30 * gest] }, L: T.L };
  const lift = eo(seg(t, 10.0, 10.4)), toOne = ss(seg(t, 13.0, 13.4)), down = ss(seg(t, 19.0, 19.8));
  let A = T;
  if (t >= 10.0 && t < 13.0) A = mixArms(T, FY_HOLD2, lift);
  else if (t >= 13.0 && t < 19.0) A = mixArms(FY_HOLD2, { R: ONE.R, L: T.L }, toOne);
  else if (t >= 19.0 && t < 19.8) A = mixArms({ R: ONE.R, L: T.L }, T, down);
  const mode = t < 10.2 ? 'flat' : t < 13.2 ? 'held2' : t < 19.4 ? 'held1' : 'flat';
  return { A, mode, lift, toOne, down, gest };
}

// Third-year's arms: hands clasped, except while he slides the page across (7.0–9.3)
function tyArms(t) {
  // at rest his forearms lie on the table, hands open and relaxed (the clasped fists read as tense at this size)
  const pc = pageC(t);
  const on = ss(seg(t, 7.0, 7.2)), off = ss(seg(t, SL.t1, 9.0));
  const zRest = 290, zPage = zFor(TYX, true, -60, Math.max(pc[0], 985) + 62);
  const z = t < 7.0 ? zRest : lerp(lerp(zRest, zPage, on), zRest, off);
  const reach = t < 7.0 ? 0 : on * (1 - off);
  const name = pose('_ty', 'sitBack', {
    R: { elbow: [-132, -620, z - 190], wrist: [-60, lerp(-616, -612, reach), z], hand: 'flat' },
    L: { elbow: [134, -626, 100], wrist: [40, -616, 268], hand: 'flat' } });
  return { pose: name, reach };
}

// ——— the two-shot (0.5–30 s) ———
// o (website only; the film passes nothing): life = clock for the city/dust/float, lamp/gold/cam overrides, still = no
// camera float, empty = the characters gone, their chairs pushed back, the page alone in the middle of the table
function twoShot(g, e, t, X, o = {}) {
  const tl = o.life ?? t, Lmp = o.lamp ?? lampLevel(t), gold = o.gold ?? goldLevel(t), C = o.cam ?? camAt(t), dr = o.still ? [0, 0] : drift(tl, 1, 2.5);
  // the set: the dark room and the golden room, cross-faded by the light; the far city floats half as much (depth)
  cam(g, C.z, C.cx, C.cy, [dr[0] * .5, dr[1] * .5]); cam(e, C.z, C.cx, C.cy, [dr[0] * .5, dr[1] * .5]);
  const D = apartmentPlate('dark'), G = apartmentPlate('gold');
  if (gold < 1) g.drawImage(D.g, 0, 0, W, H);
  if (gold > 0) { g.globalAlpha = gold; g.drawImage(G.g, 0, 0, W, H); g.globalAlpha = 1; }
  e.globalCompositeOperation = 'lighter';
  if (gold < 1) { e.globalAlpha = 1 - gold; e.drawImage(D.e, 0, 0, W, H); }
  if (gold > 0) { e.globalAlpha = gold; e.drawImage(G.e, 0, 0, W, H); }
  e.globalAlpha = 1; e.globalCompositeOperation = 'source-over';
  windowLife(g, e, tl);

  // the interior (characters, table, props) on its own canvas, under the room camera
  if (!IC) IC = canvas(W, H);
  const [ci, gi] = IC; gi.setTransform(1, 0, 0, 1, 0, 0); gi.clearRect(0, 0, W, H);
  cam(gi, C.z, C.cx, C.cy, dr); cam(e, C.z, C.cx, C.cy, dr);

  // ——— First-year ———
  const shift = spring(seg(t, 1.3, 1.8)) - .45 * ss(seg(t, 1.85, 2.45)), inhale = ss(seg(t, 2.6, 2.95));
  const jig = jigAmt(t) * Math.pow(Math.max(0, Math.sin(2 * Math.PI * JIG.f * t)), 1.4);
  const startle = ss(seg(t, LAMP_ON + .05, LAMP_ON + .3)) * (1 - ss(seg(t, LAMP_ON + .5, LAMP_ON + 1.0)));
  const y1 = X.lines.Y01, d1 = X.M.Y01?.dur || 1.2;
  const lean = spring(seg(t, 3.0, 3.45)) * (1 - ss(seg(t, 6.9, 7.4)));
  const bounce = Math.sin(Math.PI * seg(t, y1 + d1 * .55, y1 + d1 * .95));
  const wait = ss(seg(t, y1 + d1 + .3, y1 + d1 + 1.0)) * (1 - ss(seg(t, 7.0, 7.3)));
  const dart = ss(seg(t, 5.15, 5.27)) * (1 - ss(seg(t, 5.7, 5.82)));
  const edge = spring(seg(t, 6.25, 6.6)) * (1 - ss(seg(t, 7.0, 7.4)));
  const FA = fyArms(t, X);
  const y3 = X.lines.Y03, d3 = X.M.Y03?.dur || 4.8;
  const ask = ss(seg(t, y3 + d3 * .78, y3 + d3 * .86)) * (1 - ss(seg(t, y3 + d3 + .4, y3 + d3 + 1.2)));
  const push = ss(seg(t, 25.0, 25.5));
  let fyF;
  const fyLookTY = [.55, -.02];
  if (t < 3.0) fyF = face(t, X, 'FY', 'curious', { blinks: [LAMP_ON + .04, 2.2], look: [.5 + .1 * startle, -.15 * startle], E: { brow: [-4.5, -3, 2.6], open: 1.1 } });
  else if (t < 7.0) fyF = face(t, X, 'FY', 'excited', { blinks: [5.7, 6.5], noBlink: [[3.0, 5.0]], rest: wait > .3 ? 'softsmile' : 'closed',
    look: lerpV(fyLookTY, [.4, .55], dart), E: { brow: [-5.5 - 1.5 * lean, -4 - lean, 3], open: 1.1 + .04 * lean - .06 * dart } });
  else if (t < 10.0) fyF = face(t, X, 'FY', 'curious', { blinks: [9.55], look: [.35, lerp(.1, .6, ss(seg(t, 7.25, 7.8)))], E: { brow: [-4.5, -3, 2.6] } });
  else if (t < 13.0) fyF = face(t, X, 'FY', 'curious', { blinks: [12.5], noBlink: [[10.4, 12.2]], look: [.2, .25 - .1 * FA.lift], E: { brow: [-4, -1.5, 2.2], open: 1.04 } });
  else if (t < 20.0) fyF = face(t, X, 'FY', 'curious', { blinks: [13.45, 19.3], noBlink: [[13.6, 19.1]], rest: t > y3 + d3 + .2 ? 'softsmile' : 'closed',
    look: [lerp(.3, .55, ss(seg(t, 13.05, 13.4))), lerp(.3, -.02, ss(seg(t, 13.05, 13.4))) + .4 * ss(seg(t, 19.0, 19.5))],
    E: { lid: .06 - .06 * ask, browN: [-5 - 2 * ask, -2.5 - 2 * ask, 2.6], browF: [-3 - 2.5 * ask, -2 - 2 * ask, 2.2] } });
  else if (t < 25.0) fyF = face(t, X, 'FY', 'curious', { blinks: [21.0, 23.6], look: [.55, .05 + .25 * ss(seg(t, 22.4, 23.0))], E: { brow: [-4, 0, 1.8], open: 1.0, lid: .1 } });
  else fyF = face(t, X, 'FY', 'determined', { blinks: [26.9], noBlink: [[25.0, 26.6]], rest: 'softsmile',
    look: [.55, .02 + .45 * ss(seg(t, 25.6, 25.9)) * (1 - ss(seg(t, 26.5, 26.9)))], E: { brow: [-3.5, -2.2, 2.4], lid: .06 } });
  const fyPose = pose('_fy', 'sitLean', {
    R: { ...FA.A.R, hand: 'flat' }, L: { ...FA.A.L, hand: 'flat', ankle: [70, -60 - 26 * jig, 280], knee: [74, -470 - 12 * jig, 250] } });
  const FY = apply({ who: 'FY', pose: fyPose, yaw: YAW, x: FYX + 6 * shift, y: FLOOR_Y, s: S, light: [1, -.35], rim: P.rim, lwk: .95,
    leanAdd: .03 + .03 * shift - .025 * inhale + .006 * breath(t, .1, 3) + .004 * jig + .06 * lean + .03 * bounce * .4 + .02 * edge
      + .02 * spring(seg(t, 8.15, 8.7)) * (1 - ss(seg(t, 9.05, 9.8))) - .03 * FA.lift * (1 - FA.down) + .015 * FA.gest + .03 * push * (1 - ss(seg(t, 26.6, 27.4))),
    headTilt: -.02 * shift + .01 * sway(t, 1) + .015 * inhale - .035 * lean + .03 * fyF.acc - .025 * bounce + .03 * wait + .015 * dart - .03 * ask + .03 * FA.lift * (1 - FA.toOne) }, fyF);

  // ——— Third-year ———
  const TA = tyArms(t);
  const y2t = X.lines.T02;
  const drop = ss(seg(t, 20.2, 20.65)) * (1 - ss(seg(t, 26.8, 27.3)));
  const inb = ss(seg(t, 20.6, 21.05)) * (1 - ss(seg(t, 21.1, 21.7)));
  const nod = Math.sin(Math.PI * seg(t, 27.4, 28.1));
  let tyF;
  if (t < 7.0) tyF = face(t, X, 'TY', 'calm', { blinks: [LAMP_ON + .08, 1.9], rest: t > 5.4 ? 'softsmile' : undefined, look: [.4 - .3 * startle, .1 - .1 * startle] });
  else if (t < 10.0) tyF = face(t, X, 'TY', 'calm', { look: [.35, lerp(.45, .1, ss(seg(t, 8.6, 9.2)))] });
  else if (t < 20.0) tyF = face(t, X, 'TY', 'calm', { look: [.4, .1 + .2 * ss(seg(t, 10.3, 10.6)) * (1 - ss(seg(t, 12.6, 13.0)))] });
  else tyF = face(t, X, 'TY', drop > .5 ? 'thoughtful' : 'calm', { blinks: [20.25, 24.1], noBlink: [[20.5, 24.0]], sacc: .03, rest: t > 27.6 ? 'softsmile' : undefined,
    look: [lerp(.4, .2, drop), lerp(.05, .65, drop)], E: { lid: lerp(.22, .4, drop), open: lerp(.94, .76, drop) } });
  const TY = apply({ who: 'TY', pose: TA.pose, yaw: YAW, x: TYX, y: FLOOR_Y, s: S, mirror: true, light: [1, -.35], rim: P.rim, lwk: .95,
    leanAdd: .006 * breath(t, .55, 4.2) + .12 * TA.reach - .012 * inb + .02 * ss(seg(t, 26.9, 27.6)),
    headTilt: .006 * breath(t, .7, 4.2) + .005 * sway(t, 2) - .02 * startle + .04 * drop + .014 * tyF.acc + .04 * nod }, tyF);

  // ——— the page ———
  const pc = pageC(t);
  let pts, held = false, back = false;
  const flat = flatPage(pc, t < SL.land ? lerp(-.05, .015, seg(t, SL.t0, SL.land)) : .015);
  if (FA.mode === 'flat' && t < 10.0) pts = flat;
  else if (t < 13.0) {   // lift + flip, two hands
    const hp = heldPage(FY, ['R', 'L'], A4[0], A4[1], -.03 + .02 * FA.lift + .006 * Math.sin(t * 1.9));
    const phi = Math.PI * eio(seg(t, 10.5, 10.95)), k = Math.abs(Math.cos(phi));
    let hpts = hp.pts.map(p => [p[0], hp.c[1] + (p[1] - hp.c[1]) * Math.max(k, .02)]);
    back = phi > Math.PI / 2 && phi < Math.PI * .999;
    pts = FA.lift < 1 ? lerpQ(flat, hpts, FA.lift) : hpts; held = FA.lift > .5;
  } else if (t < 19.8) {
    const h2 = heldPage(FY, ['R', 'L'], A4[0], A4[1], -.01);
    const h1 = heldPage(FY, ['R'], A4[0] * .78, A4[1], -.05 + .1 * FA.gest);
    if (t < 13.4) pts = lerpQ(h2.pts, h1.pts, FA.toOne);
    else if (t < 19.0) pts = h1.pts;
    else pts = lerpQ(h1.pts, flatPage(pageC(19.8), .015), FA.down);
    held = t < 19.4;
  } else pts = flatPage(pc, .015);
  if (o.empty) { pts = flatPage([960, 782], .015); held = false; back = false; }

  // ——— draw the interior: chairs + bodies, the table and props, the page / forearms in the right order ———
  layer(gi, e, q => {
    if (o.empty) { chair(q, P, { yaw: YAW, x: FYX - 60, y: FLOOR_Y + 10, s: S }); chair(q, P, { yaw: YAW + .08, x: TYX + 50, y: FLOOR_Y + 6, s: S, mirror: true }); return; }
    chair(q, P, { yaw: YAW, x: FYX + 6 * shift, y: FLOOR_Y, s: S }); chair(q, P, { yaw: YAW, x: TYX, y: FLOOR_Y, s: S, mirror: true });
    figure(q, P, { ...FY, layer: 'base' }); figure(q, P, { ...TY, layer: 'base' });
  });
  table(gi, e, P, gold);
  deskLamp(gi, e, Lmp);
  if (!held) {   // the page lies on the table: its soft shadow, the page, then the hands over it
    gi.save(); gi.beginPath(); tableTop(gi); gi.clip(); gi.filter = 'blur(3px)'; gi.fillStyle = rgba('#1A0E08', .35);
    gi.beginPath(); pts.forEach((p, i) => gi[i ? 'lineTo' : 'moveTo'](p[0] + 6, p[1] + 4)); gi.closePath(); gi.fill(); gi.restore();
    paperQuad(gi, e, pts, PAPER_GLOW * Lmp, back);
  }
  if (!o.empty) layer(gi, e, q => { figure(q, P, { ...FY, layer: 'arms' }); figure(q, P, { ...TY, layer: 'arms' }); },
    { shadow: { off: [10, 8], alpha: .32 * gold, blur: 2, clip: tableTop } });
  if (held) {
    paperQuad(gi, e, pts, PAPER_GLOW * .5, back);
    if (!back) {   // the lamp's highlight sliding across the face of the page
      gi.save(); gi.beginPath(); pts.forEach((p, i) => gi[i ? 'lineTo' : 'moveTo'](p[0], p[1])); gi.closePath(); gi.clip();
      const bx = lerp(600, 1100, seg(t, 10.0, 19.0)), gr = gi.createLinearGradient(bx - 90, 0, bx + 90, 60);
      gr.addColorStop(0, rgba('#ffffff', 0)); gr.addColorStop(.5, rgba('#ffffff', .16)); gr.addColorStop(1, rgba('#ffffff', 0));
      gi.fillStyle = gr; gi.fillRect(0, 0, W, H); gi.restore();
    }
    layer(gi, e, q => { thumb(q, FY, 'R'); if (t < 13.4) thumb(q, FY, 'L'); });
  }
  dust(gi, e, tl, [800, 200, 340, 560], 26, 5, { a: .45 * gold, focus: [PENDANT[0], 470, 300] });

  // the voice-notes waveform: a faint held cel of bars between them, a light band sweeping across it (S1-06)
  const wf = seg(t, 13.6, 14.2) * (1 - seg(t, 18.2, 19.0));
  if (wf > 0 && !o.empty) {
    const fl = .8 + .2 * Math.sin(t * 37) * Math.sin(t * 11.3), x0 = 900, y0 = 400, n = 24, sweep = ((t - 13.6) / 1.6) % 1;
    for (let k = 0; k < n; k++) {
      const hgt = 6 + 36 * Math.abs(Math.sin(k * 1.7) * Math.sin(k * .43 + 1.2)), x = x0 + k * 10;
      const band = Math.exp(-Math.pow((k / n - sweep) * 6, 2)), a = wf * fl * (.18 + .5 * band);
      gi.fillStyle = rgba(mix(teal, ivory, .45), a); gi.fillRect(x, y0 - hgt / 2, 4, hgt);
      e.fillStyle = rgba(mix(teal, ivory, .3), a * .9); e.fillRect(x - 2, y0 - hgt / 2 - 2, 8, hgt + 4);
    }
  }

  // before the lights: the interior sits in the dark, its edges cooled by the city; composite onto the picture
  gi.setTransform(1, 0, 0, 1, 0, 0);
  if (gold < 1) { gi.globalCompositeOperation = 'source-atop'; gi.fillStyle = rgba('#04060C', .86 * (1 - gold)); gi.fillRect(0, 0, W, H); gi.globalCompositeOperation = 'source-over'; }
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(ci, 0, 0);
  // a soft vignette that warms the middle of the frame
  airbrush(g, 0, H, 520, 320, '#0A0604', .35 * gold, .9); airbrush(g, W, H, 520, 320, '#0A0604', .35 * gold, .9);
  return { post: { bloom: .55, halo: .07, thr: .9 } };
}

// ——— the clip ———
export { twoShot as roomShot, LAMP_ON, camAt };
export const SHOTS01 = [
  ['S1-01', 0.0, 0.5, () => ({})],   // black: First-year's heel taps
  ['S1-02', 0.5, 30.0, twoShot],     // one continuous two-shot (Sky, 2026-11-04)
];

// sound events for the mixer (exported by core/render/events.mjs → events.json). No constant beds: every sound is a
// placed event (Sky, 2026-11-04). The city is far below now: traffic as distant pass-bys, one far horn.
export function events01(X) {
  const ev = [
    { t: 0.15, type: 'passby', dur: 4.2, gain: .45, pan: -.4, f: 46 },
    { t: 9.4, type: 'passby', dur: 3.6, gain: .3, pan: .5, f: 52 },
    { t: 16.2, type: 'passby', dur: 4.0, gain: .26, pan: -.5, f: 44 },
    { t: 22.5, type: 'passby', dur: 4.0, gain: .24, pan: .4, f: 48 },
    { t: 23.9, type: 'horn', gain: .14, pan: -.6, f: 440 },
    // the hook: heel taps in the dark, then the lamp's switch and its flicker
    { t: LAMP_ON - .01, type: 'lampClick', gain: .7, pan: .1 },
    ...jigTaps().map(t => ({ t, type: 'tap', gain: .5, pan: -.3 })),
    { t: 1.28, type: 'creak', gain: .5, pan: -.35 }, { t: 1.3, type: 'rustle', dur: .35, gain: .4, pan: -.35 },
    { t: 2.62, type: 'inhale', who: 'FY', dur: .32, gain: .45, pan: -.25 },
    { t: 3.0, type: 'rustle', dur: .3, gain: .45, pan: -.25 }, { t: 3.02, type: 'creak', gain: .28, pan: -.3 },
    { t: 6.25, type: 'rustle', dur: .25, gain: .3, pan: -.25 },
    // the page across the table
    { t: 7.0, type: 'rustle', dur: .3, gain: .35, pan: .3 },
    { t: SL.t0, type: 'paperTap', gain: .45, pan: .15 },
    { t: SL.t0 + .05, type: 'paperSlide', dur: SL.land - SL.t0, gain: .6, pan: 0 },
    { t: 8.15, type: 'rustle', dur: .3, gain: .35, pan: -.2 },
    { t: SL.land - .03, type: 'paperPat', gain: .5, pan: -.1 },
    { t: 9.1, type: 'paperSlide', dur: .55, gain: .3, pan: -.15 },
    // lift, flip, a puzzled breath
    { t: 10.0, type: 'paperLift', gain: .4, pan: -.2 },
    { t: 10.48, type: 'paperFlip', dur: .5, gain: .55, pan: -.2 },
    { t: 12.35, type: 'breath', who: 'FY', gain: .3, pan: -.25 },
    // the voice-notes line: the turn toward Third-year, the gesture with the page, the waveform shimmer
    { t: 13.05, type: 'rustle', dur: .3, gain: .35, pan: -.25 },
    { t: 13.6, type: 'shimmer', dur: 5.4, gain: .18, pan: 0 },
    { t: X.lines.Y03 + (X.M.Y03?.dur || 4.8) * .28, type: 'paperFlutter', gain: .4, pan: -.15 },
    // the page laid down; Third-year's breath before answering
    { t: 19.05, type: 'paperLift', gain: .3, pan: -.15 }, { t: 19.75, type: 'paperPat', gain: .4, pan: -.1 },
    { t: 20.2, type: 'rustle', dur: .4, gain: .22, pan: .3 },
    { t: 20.62, type: 'inhale', who: 'TY', dur: .45, gain: .38, pan: .25 },
    { t: 23.7, type: 'breath', who: 'TY', gain: .22, pan: .25 },
    // "start at the beginning": the page pushed back to the middle; one soft e-piano note under the push-in
    { t: 25.6, type: 'paperSlide', dur: 1.0, gain: .45, pan: 0 }, { t: 26.6, type: 'paperPat', gain: .3, pan: 0 },
    { t: 27.0, type: 'rustle', dur: .3, gain: .22, pan: .25 },
    { t: 28.0, type: 'epiano', note: 64, gain: .22 },
  ];
  for (const [id, t0] of Object.entries(X.lines)) if (X.M[id]) ev.push({ t: t0, type: 'voice', id, who: id[0] === 'Y' ? 'FY' : 'TY', dur: X.M[id].dur });
  return ev.sort((a, b) => a.t - b.t);
}
