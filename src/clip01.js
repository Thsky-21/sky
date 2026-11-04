// Clip 01 · 0:00–0:30 · Scene 1, the blank page · ROOM, night (SHOT_LIST.md S1-01 … S1-08).
// Built ON TOP of the locked Gate B modules: characters only through figure()/handShape()/limbOutline() (body.js →
// sky.js), backgrounds through roomPlate/desk/sheet/lamp (plates.js), colours from PAL.night. Nothing is redrawn.
// The wide two-shot and the TY close-up reuse the approved storyboard compositions (frames.js sf_open / sb2).
import { canvas, poly, cel, line, rgba, mix, airbrush, vgrad, TAU, LWK } from './cel.js';
import { PAL, TOK } from './pal.js';
import { figure, limbOutline, handShape, proj, POSES } from './body.js';
import { chair } from './props.js';
import { roomPlate, desk, sheet, lamp } from './plates.js';
import { seg, ss, eio, eo, spring, lerp, lerpV, blink, openOf, breath, sway, sacc, lipAt, accent } from './perf.js';

const { ink, midnight, slate, ivory, amber, teal } = TOK;
const P = PAL.night;
const W = 1920, H = 1080;

// ——— layers and caches ———
// characters go on their own layer (world coordinates), then through the camera onto the picture; their silhouette is
// stamped out of the emissive canvas so lamp / window glow never blooms through them (same as frames.js layer())
let L1 = null, L2 = null;
function layer(g, e, fn, o = {}) {
  if (!L1) L1 = canvas(W, H);
  const [c, q] = L1; q.setTransform(1, 0, 0, 1, 0, 0); q.clearRect(0, 0, W, H); q.filter = 'none'; q.globalAlpha = 1;
  fn(q);
  if (o.blur) {   // blur on a second layer (ctx.filter on drawImage of a large canvas is slow in software GL)
    if (!L2) L2 = canvas(W, H);
    const [c2, q2] = L2; q2.setTransform(1, 0, 0, 1, 0, 0); q2.clearRect(0, 0, W, H); q2.filter = `blur(${o.blur}px)`; q2.drawImage(c, 0, 0); q2.filter = 'none';
    g.drawImage(c2, 0, 0); stamp(e, c2); return;
  }
  g.drawImage(c, 0, 0);
  stamp(e, c);
}
// cut a silhouette out of the emissive canvas, then put opaque black back underneath: a transparent hole would turn any
// faint glow drawn over it later into full brightness when the canvas is uploaded to the post pass
function stamp(e, c) {
  e.save(); e.globalCompositeOperation = 'destination-out'; e.drawImage(c, 0, 0);
  e.setTransform(1, 0, 0, 1, 0, 0); e.globalCompositeOperation = 'destination-over'; e.fillStyle = '#000'; e.fillRect(0, 0, W, H); e.restore();
}
// the room plate is static per light state: paint it once (sharp, and blurred for the close-ups), then reuse
const PLATES = {};
function plate(mode, blur = 0) {
  const k = mode + ':' + blur;
  if (PLATES[k]) return PLATES[k];
  const [cg, qg] = canvas(W, H), [ce, qe] = canvas(W, H);
  qe.fillStyle = '#000'; qe.fillRect(0, 0, W, H);
  if (!blur) roomPlate(qg, qe, mode);
  else {
    const S = plate(mode, 0);
    qg.filter = `blur(${blur}px)`; qg.drawImage(S.g, 0, 0); qg.filter = 'none';
    qe.filter = `blur(${blur}px)`; qe.drawImage(S.e, 0, 0); qe.filter = 'none';
  }
  return (PLATES[k] = { g: cg, e: ce });
}
const drawPlate = (g, e, pl) => { g.drawImage(pl.g, 0, 0); e.save(); e.globalCompositeOperation = 'lighter'; e.drawImage(pl.e, 0, 0); e.restore(); };
// camera on ones: zoom s about world point (cx, cy), placed at screen (sx, sy)
function cam(g, e, s = 1, cx = 960, cy = 540, sx = 960, sy = 540) {
  for (const x of [g, e]) x.setTransform(s, 0, 0, s, sx - cx * s, sy - cy * s);
}
// screen position of a raw rig joint (arms/legs are not affected by lean in body.js)
function joint(o, p) { const q = proj(p, o.yaw ?? 0); return [o.x + (o.mirror ? -1 : 1) * o.s * q[0], o.y + o.s * p[1]]; }
// a forearm + hand drawn with the rig's own parts (limbOutline + handShape), for hands that act on props
function forearm(g, o, el, wr, type, sleeve = null, k = 1) {
  const s = o.s, st = { so: [(o.light?.[0] ?? 1) * 22, (o.light?.[1] ?? -.6) * 14], rim: null };
  const kk = LWK.k; LWK.k = 1.15 * (o.lwk ?? 1);
  const ang = Math.atan2(wr[1] - el[1], wr[0] - el[0]);
  cel(g, limbOutline([el, wr], [58 * s * k, 44 * s * k], .8, .15), { f: P.skin.f, s: P.skin.s, l: P.skin.l, lw: 1.5 * .8 * 1.7, so: [st.so[0] * s * .35, st.so[1] * s * .35] });
  if (sleeve) {   // Third-year's pushed-up overshirt sleeve over the elbow end
    const m = [el[0] + (wr[0] - el[0]) * .3, el[1] + (wr[1] - el[1]) * .3];
    cel(g, limbOutline([el, m], [80 * s * k, 74 * s * k], .8, .1), { f: P.over.f, s: P.over.s, l: P.over.l, lw: 2.4, so: [st.so[0] * s * .35, st.so[1] * s * .35] });
  }
  g.save(); g.translate(wr[0], wr[1]); g.scale(s * k, s * k); LWK.k = 1.15 * (o.lwk ?? 1) / (s * k);
  if (o.mirror) { g.scale(-1, 1); handShape(g, P, [0, 0], Math.PI - ang, type, st); } else handShape(g, P, [0, 0], ang, type, st);
  g.restore(); LWK.k = kk;
}
// paper as a cel quad + its emissive pair (the paper "glows ivory" under the lamp)
function paperQuad(g, e, pts, glow = .25, back = false) {
  const f = back ? mix(P.paper.f, P.paper.s, .25) : P.paper.f;
  cel(g, poly(pts), { f, s: P.paper.s, l: P.paper.l, lw: 1.8 });
  e.fillStyle = rgba(ivory, glow); e.beginPath(); pts.forEach((p, i) => e[i ? 'lineTo' : 'moveTo'](p[0], p[1])); e.closePath(); e.fill();
}
// ——— the sheet: ONE A4 page, the same physical size in every shot ———
// rig units: 1386 = Sky's height (~175 cm), so A4 (297 × 210 mm) = 236 × 167 units; on screen × the shot's figure scale
const A4 = [236, 167];
const PAPER_GLOW = .06;  // the lamp makes the page glow a little; the same in every shot so it never seems to swell

// runtime poses: the rig's own pose table (body.js POSES) extended per frame, so arms and hands stay attached through
// figure() itself (body.js is not edited; poses are data)
function pose(name, base, side, extra = {}) {
  const B = POSES[base];
  POSES[name] = { ...B, ...extra, R: { ...B.R, ...(side.R || {}) }, L: { ...B.L, ...(side.L || {}) } };
  return name;
}
// a rig hand's frame on screen: wrist position + forearm angle (as figure() draws it)
function handFrame(o, side) {
  const Q = POSES[o.pose][side], th = o.yaw ?? 0, b = proj(Q.elbow, th), c = proj(Q.wrist, th), sg = o.mirror ? -1 : 1;
  const ang = Math.atan2(c[1] - b[1], c[0] - b[0]);
  return { w: [o.x + sg * o.s * c[0], o.y + o.s * c[1]], ang: o.mirror ? Math.PI - ang : ang, dir: [sg * Math.cos(ang), Math.sin(ang)], local: { c, ang } };
}
// the thumb of a rig hand, drawn again IN FRONT of a held page (the rest of the hand stays behind it): the same
// thumb outline as handShape('flat'), in the same transform
function thumb(q, o, side) {
  const { c, ang } = handFrame(o, side).local, s = o.s;
  const lx = o.light?.[0] ?? 1, ly = o.light?.[1] ?? -.6;
  const kk = LWK.k; LWK.k = (o.lwk ?? 1) * 1.15 / s;
  q.save(); q.translate(o.x, o.y); if (o.mirror) q.scale(-1, 1); q.scale(s, s); q.translate(c[0], c[1]); q.rotate(ang);
  cel(q, limbOutline([[14, -16], [32, -32], [50, -38]], [21, 16, 13], .4, 1), { f: P.skin.f, s: P.skin.s, l: P.skin.l, lw: 1.8, so: [lx * 22 * .4, ly * 14 * .4] });
  line(q, [[44, -40], [48, -34]], mix(P.skin.l, P.skin.f, .35), 1.2);
  q.restore(); LWK.k = kk;
}
// a page held upright in two hands (or one): its lower corners in the hands, face-on, fixed A4 size
function heldPage(o, sides, w, h, tilt = 0) {
  const F = sides.map(sd => handFrame(o, sd)), s = o.s;
  const grip = F.map(f => [f.w[0] + f.dir[0] * 58 * s, f.w[1] + f.dir[1] * 58 * s]);
  let bx, by;
  if (grip.length === 2) { bx = (grip[0][0] + grip[1][0]) / 2; by = (grip[0][1] + grip[1][1]) / 2 + 14 * s; }
  else { bx = grip[0][0] + w * .36; by = grip[0][1] + 18 * s; }
  const cs = Math.cos(tilt), sn = Math.sin(tilt), R = (x, y) => [bx + x * cs - y * sn, by + x * sn + y * cs];
  return { pts: [R(-w / 2, -h), R(w / 2, -h), R(w / 2, 0), R(-w / 2, 0)], c: R(0, -h / 2) };
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
  const E = { ...(extra.E || {}) };
  const sc = sacc(t, fy ? 3 : 7, extra.sacc ?? .045);
  const look = extra.look ? [extra.look[0] + sc[0], extra.look[1] + sc[1]] : undefined;
  return { expr: base, mouth: lip ? lip.shape : (extra.rest || undefined), open: openOf(base, bf, E), E, look, acc: accent(t, X.lines, X.M, ids), talking: !!lip };
}
const apply = (o, f) => ({ ...o, expr: f.expr, open: f.open, E: f.E, mouth: f.mouth, ...(f.look ? { look: f.look } : {}) });

// First-year's heel jiggle in the wide shot (impatient, excited): taps at 2.6 Hz while `on`
const JIG = { f: 2.6, on: [[.55, 1.22], [1.85, 2.55]] };
const jigAmt = t => JIG.on.reduce((m, [a, b]) => Math.max(m, ss(seg(t, a, a + .12)) * (1 - ss(seg(t, b - .12, b)))), 0);
export const jigTaps = () => { const out = []; for (const [a, b] of JIG.on) for (let k = 0; ; k++) { const tk = (k + .5) / JIG.f + Math.floor(a * JIG.f) / JIG.f; if (tk >= b) break; if (tk > a + .1) out.push(+tk.toFixed(3)); } return out; };

// ——— S1-02 · 0:00.5–0:03 · W two-shot, slow push-in (the approved sf_open composition, animated) ———
// First-year sits forward on his chair edge, excited: heel jiggling, a shift on the chair (creak), a quick inhale before
// the cut; Third-year sits back, calm, breathing
function wide(g, e, t, X) {
  cam(g, e, 1 + .08 * eio(seg(t, .5, 3.0)), 960, 600);
  drawPlate(g, e, plate('night'));
  const shift = spring(seg(t, 1.25, 1.75)) - .45 * ss(seg(t, 1.8, 2.4));
  const inhale = ss(seg(t, 2.6, 2.95));
  const jig = jigAmt(t) * Math.pow(Math.max(0, Math.sin(2 * Math.PI * JIG.f * t)), 1.4);
  const pn = pose('_fy102', 'sitLean', { L: { ankle: [70, -60 - 26 * jig, 280], knee: [74, -470 - 12 * jig, 250] } });
  const fyF = face(t, X, 'FY', 'curious', { blinks: [2.1], look: [.5, 0], E: { brow: [-4.5, -3, 2.6], open: 1.1 } });
  const tyF = face(t, X, 'TY', 'calm', { blinks: [1.15], look: [.4, .1 + .15 * ss(seg(t, 1.6, 2.1))] });
  const FY = apply({ who: 'FY', pose: pn, yaw: .95, x: 560 + 6 * shift, y: 1052, s: .56, light: [1, -.35],
    leanAdd: .03 + .03 * shift - .025 * inhale + .006 * breath(t, .1, 3) + .004 * jig, headTilt: -.02 * shift + .01 * sway(t, 1) + .015 * inhale }, fyF);
  const TY = apply({ who: 'TY', pose: 'sitBack', yaw: .95, x: 1372, y: 1052, s: .56, mirror: true, light: [1, -.35],
    leanAdd: .006 * breath(t, .55, 4.2), headTilt: .006 * breath(t, .7, 4.2) + .005 * sway(t, 2) }, tyF);
  layer(g, e, q => { chair(q, P, { yaw: .95, x: 560 + 6 * shift, y: 1052, s: .56 }); chair(q, P, { yaw: .95, x: 1372, y: 1052, s: .56, mirror: true }); figure(q, P, { ...FY, layer: 'base' }); figure(q, P, { ...TY, layer: 'base' }); });
  desk(g, e, P, 'night');
  sheet(g, e, P, 956, 718, PAPER_GLOW);
  lamp(g, e, P, 'night', 1150, 704);
  layer(g, e, q => { figure(q, P, { ...FY, layer: 'arms' }); figure(q, P, { ...TY, layer: 'arms' }); });
  return { post: { bloom: .6 } };
}

// ——— the MCU of First-year (S1-03, S1-06): ¾ facing right, TY off-screen right, soft room behind ———
const FY_MCU = { who: 'FY', pose: 'sitLean', yaw: .95, x: 640, y: 2190, s: 1.75, light: [1, -.3], rim: P.rim, lwk: .85 };
function roomMCU(g, e) {
  cam(g, e, 1);
  drawPlate(g, e, plate('night', 10));
  airbrush(g, 1500, 640, 640, 460, amber, .16, .9);   // lamp bounce from screen right (off-screen lamp)
}

// ——— S1-03 · 0:03–0:07 · MCU FY: "So… did we make it?!" — springs in closer on the cut, eyes wide, brows up, a bounce
// on "make it", then holds, eager, waiting for the answer ———
function s103(g, e, t, X) {
  roomMCU(g, e);
  const lean = spring(seg(t, 3.0, 3.45));                   // the lean-in carries on from the inhale before the cut
  const t0 = X.lines.Y01, d = X.M.Y01?.dur || 1.2;
  const bounce = Math.sin(Math.PI * seg(t, t0 + d * .55, t0 + d * .95));
  const wait = ss(seg(t, t0 + d + .3, t0 + d + 1.0));        // the eager hold: a smile, a tiny head tilt
  const impatient = spring(seg(t, 6.25, 6.6));             // he edges in again as Third-year's hand starts to move
  const f = face(t, X, 'FY', 'excited', { blinks: [5.55, 5.85], noBlink: [[3.0, 5.4]], rest: wait > .3 ? 'softsmile' : 'closed',
    look: [.55, -.03], E: { brow: [-5.5 - 1.5 * lean, -4 - 1 * lean, 3], open: 1.1 + .04 * lean } });
  const fig = apply({ ...FY_MCU, leanAdd: .055 * lean + .02 * impatient + .03 * bounce * .4 + .006 * breath(t, .2, 2.8),
    headTilt: -.035 * lean + .03 * f.acc - .025 * bounce + .03 * wait + .008 * sway(t, 4), y: FY_MCU.y - 8 * lean }, f);
  layer(g, e, q => figure(q, P, fig));
  return { post: { bloom: .55 } };
}

// ——— S1-04 · 0:07–0:10 · OS behind TY's right shoulder onto FY: TY slides the sheet across; FY's hands come down on it ———
const SL = { t0: 7.2, t1: 8.55, land: 8.75 };
function s104(g, e, t, X) {
  const cu = eio(seg(t, 7.0, 9.4));   // a small slide following the sheet (camera on ones)
  for (const x of [g, e]) x.setTransform(1.5, 0, 0, 1.5, -30 - 50 * cu, -230);
  drawPlate(g, e, plate('night', 9));
  for (const x of [g, e]) x.setTransform(1, 0, 0, 1, -50 * cu, 0);
  airbrush(g, 1560, 560, 560, 420, amber, .2, .9);
  airbrush(e, 1600, 470, 160, 120, amber, .4, .8);
  const reach = spring(seg(t, 8.15, 8.7)), pull = eio(seg(t, 9.05, 9.8));
  const fyF = face(t, X, 'FY', 'curious', { blinks: [9.55], look: [.12, lerp(.05, .6, ss(seg(t, 7.25, 7.8))) * (1 - .5 * pull)], E: { brow: [-4.5, -3, 2.6] } });
  const tyF = face(t, X, 'TY', 'calm');
  const z = 435 + 115 * reach - 55 * pull;
  const pn = pose('_fy104', 'sitLean', {
    R: { wrist: [-74 + 14 * reach, -616, z], elbow: [-118, -606, 250 + 40 * reach - 20 * pull], hand: 'flat' },
    L: { wrist: [62 - 6 * reach, -616, z + 6], elbow: [116, -606, 256 + 40 * reach - 20 * pull], hand: 'flat' } });
  const FY = apply({ who: 'FY', pose: pn, yaw: .55, x: 600, y: 1392, s: .95, light: [-1, -.35], lwk: .9,
    leanAdd: .04 * reach - .02 * pull + .006 * breath(t, .2, 3), headTilt: .025 * reach + .008 * sway(t, 5) }, fyF);
  layer(g, e, q => figure(q, P, { ...FY, layer: 'base' }));
  cel(g, poly([[0, 800], [1920, 776], [1920, 1080], [0, 1080]]), { f: P.wood.f, s: P.wood.s, h: P.wood.h, l: P.wood.l, lw: 2.6, hi: [[[900, 790], [1600, 780], [1700, 860], [980, 880]]] });
  airbrush(g, 1260, 880, 700, 160, amber, .28, .9);
  // the page lies flat at FY's distance: A4 × his scale, foreshortened by the eye-level view; it slides from the middle of
  // the desk into his hands, then travels with them
  const wR = joint(FY, POSES[pn].R.wrist), wL = joint(FY, POSES[pn].L.wrist);
  const hands = [(wR[0] + wL[0]) / 2 + 34, (wR[1] + wL[1]) / 2 + 22];
  const u = eio(seg(t, SL.t0, SL.t1));
  const restAt = [hands[0] + 6, 852];
  const c = t < SL.land ? lerpV([1180, 900], restAt, u) : lerpV(restAt, hands, ss(seg(t, SL.land, SL.land + .12)));
  const hw = A4[0] * FY.s / 2, hh = A4[1] * FY.s * .19, rot = lerp(-.06, .015, u);
  const cs = Math.cos(rot), sn = Math.sin(rot), R = (x, y) => [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs];
  const pts = [R(-hw * .97, -hh), R(hw * .97, -hh), R(hw, hh), R(-hw, hh)];
  paperQuad(g, e, pts, PAPER_GLOW);
  layer(g, e, q => figure(q, P, { ...FY, layer: 'arms' }));
  // Third-year's right forearm comes in from the lower right, fingertips on the page's near edge; released after the slide
  const rel = ss(seg(t, SL.t1, SL.t1 + .4));
  if (rel < .99) layer(g, e, q => {
    const tip = R(hw * .55, hh * .2);
    const hand = lerpV([tip[0] + 36, tip[1] + 28], [tip[0] + 220, tip[1] + 180], rel);
    forearm(q, { s: 1.15, light: [1, -.3], mirror: true, lwk: .9 }, [hand[0] + 360, hand[1] + 300], hand, 'flat', true);
  });
  layer(g, e, q => figure(q, P, { who: 'TY', pose: 'sitBack', yaw: 2.35, x: 1600, y: 2560, s: 2.0, mirror: true, expr: tyF.expr, open: tyF.open, mouth: 'closed',
    light: [1, -.3], rim: P.rim, rimBack: true, layer: 'base', leanAdd: .006 * breath(t, .5, 4.2) - .02 * (1 - rel) * ss(seg(t, 7.0, 7.4)), lwk: .9 }), { blur: 6 });
  return { post: { bloom: .5 } };
}

// ——— S1-05 · 0:10–0:13 · INS the page in FY's hands, his eyeline: lifts it, flips it over, checks the back ———
// the hands hold the side edges from behind (fingers hidden), thumbs on the front; the page is A4 at the hands' scale
function s105(g, e, t, X) {
  cam(g, e, 1);
  vgrad(g, 0, 0, W, H, [[0, mix(P.wood.s, ink, .35)], [1, mix(P.wood.f, ink, .15)]]);   // out-of-focus desk wood
  for (let k = 0; k < 16; k++) { g.fillStyle = rgba(ink, .07); g.fillRect(0, k * 72 + 20, W, 4); }
  airbrush(g, 1500, 300, 900, 600, amber, .22, .95);
  airbrush(e, 1600, 260, 300, 220, amber, .16, .9);
  const S = 3.0;
  const lift = eo(seg(t, 10.0, 10.4)), phi = Math.PI * eio(seg(t, 10.5, 10.95)), look = ss(seg(t, 11.0, 11.3)) * (1 - ss(seg(t, 12.2, 12.7)));
  const cy = 580 - 40 * lift + 4 * Math.sin(t * 2.3), cx = 960 + 6 * Math.sin(t * 1.7), tilt = -.025 + .02 * lift + .04 * look + .006 * Math.sin(t * 1.9);
  const hw = A4[0] * S / 2, hh0 = A4[1] * S / 2, hh = hh0 * Math.abs(Math.cos(phi)), back = phi > Math.PI / 2;
  const top = -hh - 30 * Math.sin(phi);   // the turning edge leans toward him
  const cs = Math.cos(tilt), sn = Math.sin(tilt), R = (x, y) => [cx + x * cs - y * sn, cy + x * sn + y * cs];
  const o = { s: S * .85, light: [1, -.4], lwk: .8 };
  const hL = R(-hw, 10), hR = R(hw, 10);   // hold points: the middle of each side edge (the flip axis)
  layer(g, e, q => {
    forearm(q, o, [hL[0] - 300, 1270], [hL[0] + 6, hL[1] + 40], 'flat');
    q.save(); q.translate(2 * cx, 0); q.scale(-1, 1); forearm(q, o, [2 * cx - hR[0] - 300, 1270], [2 * cx - hR[0] + 6, hR[1] + 40], 'flat'); q.restore();
  });
  const pts = [R(-hw, top), R(hw, top), R(hw, hh), R(-hw, hh)];
  if (hh > 3) {
    paperQuad(g, e, pts, PAPER_GLOW * .5, back);
    g.save(); g.beginPath(); pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p[0], p[1])); g.closePath(); g.clip();
    const bx = lerp(-700, 2400, seg(t, 10.0, 13.0));   // the lamp's highlight sliding across the paper (on ones)
    const gr = g.createLinearGradient(bx - 260, 0, bx + 260, 200); gr.addColorStop(0, rgba('#ffffff', 0)); gr.addColorStop(.5, rgba('#ffffff', .2)); gr.addColorStop(1, rgba('#ffffff', 0));
    g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
  } else line(g, [R(-hw, 0), R(hw, 0)], P.paper.l, 3);
  layer(g, e, q => {   // thumbs over the front of the sheet
    const kk = LWK.k; LWK.k = .9;
    for (const [h, sd] of [[hL, 1], [hR, -1]]) {
      const a = [h[0] - sd * 6, h[1] + 34], b = [h[0] + sd * 40, h[1] - 6], c2 = [h[0] + sd * 58, h[1] - 30];
      cel(q, limbOutline([a, b, c2], [52, 42, 34], .4, 1), { f: P.skin.f, s: P.skin.s, l: P.skin.l, lw: 2.2, so: [sd * 6, -5] });
      line(q, [[b[0] - sd * 4, b[1] - 12], [b[0] + sd * 6, b[1] + 8]], mix(P.skin.l, P.skin.f, .35), 1.6);
    }
    LWK.k = kk;
  });
  return { post: { bloom: .45 } };
}

// ——— S1-06 · 0:13–0:20 · MCU FY: "You used to send me voice notes—…" — paper → TY, quick and teasing, one gesture
// with the page; a faint voice-note waveform flickers above it, then fades by 19 s ———
function s106(g, e, t, X) {
  roomMCU(g, e);
  const t0 = X.lines.Y03, d = X.M.Y03?.dur || 4.8;
  const toTY = spring(seg(t, 13.05, 13.4));
  const gest = ss(seg(t, t0 + d * .28, t0 + d * .4)) * (1 - ss(seg(t, t0 + d * .62, t0 + d * .8)));
  const ask = ss(seg(t, t0 + d * .78, t0 + d * .86));       // "What happened?": brows up, head tips
  const after = ss(seg(t, t0 + d + .2, t0 + d + .8));
  const f = face(t, X, 'FY', 'curious', { blinks: [13.45, 19.3], noBlink: [[13.6, 19.1]], rest: after > .2 ? 'softsmile' : 'closed',
    look: [lerp(.2, .55, toTY), lerp(.6, -.02, toTY)],
    E: { lid: .06 - .06 * ask, browN: [-5 - 2 * ask, -2.5 - 2 * ask, 2.6], browF: [-3 - 2.5 * ask, -2 - 2 * ask, 2.2] } });
  // the near (right) hand holds the page low at the front; lifts and turns it once on "ideas, plans"
  const pn = pose('_fy106', 'sitLean', { R: { elbow: [-128, -602, 236], wrist: [-70 + 20 * gest, -690 - 90 * gest + 5 * Math.sin(t * 11) * gest, 370 + 30 * gest], hand: 'flat' } });
  const fig = apply({ ...FY_MCU, pose: pn, leanAdd: .015 * gest + .007 * breath(t, .3, 2.9) - .012 * ask, headTilt: lerp(.05, -.01, toTY) + .03 * f.acc - .03 * ask + .008 * sway(t, 6) }, f);
  layer(g, e, q => figure(q, P, { ...fig, layer: 'base' }));
  layer(g, e, q => figure(q, P, { ...fig, layer: 'arms' }));
  const pg = heldPage(fig, ['R'], A4[0] * fig.s * .78, A4[1] * fig.s, -.05 + .1 * gest);   // landscape, turned a little toward TY
  paperQuad(g, e, pg.pts, PAPER_GLOW);
  layer(g, e, q => thumb(q, fig, 'R'));
  // waveform: a held cel of bars with a light band sweeping across it on ones (SHOT_LIST S1-06)
  const wf = seg(t, 13.6, 14.2) * (1 - seg(t, 18.2, 19.0));
  if (wf > 0) {
    const fl = .8 + .2 * Math.sin(t * 37) * Math.sin(t * 11.3);
    const x0 = 1120, y0 = 520, n = 34, sweep = ((t - 13.6) / 1.6) % 1;
    for (let k = 0; k < n; k++) {
      const hgt = 10 + 70 * Math.abs(Math.sin(k * 1.7) * Math.sin(k * .43 + 1.2)), x = x0 + k * 18;
      const band = Math.exp(-Math.pow((k / n - sweep) * 6, 2)), a = wf * fl * (.18 + .5 * band);
      g.fillStyle = rgba(mix(teal, ivory, .45), a); g.fillRect(x, y0 - hgt / 2, 7, hgt);
      e.fillStyle = rgba(mix(teal, ivory, .3), a * .9); e.fillRect(x - 2, y0 - hgt / 2 - 2, 11, hgt + 4);
    }
  }
  return { post: { bloom: .58 } };
}

// ——— S1-07 · 0:20–0:25 · CU TY (the approved sb2 composition): eyes drop to the page, a breath, then
// "I don't know how to write the ending yet." and a held pause; no gesture; very slow push-in ———
function s107(g, e, t, X) {
  const z = 1 + .035 * eio(seg(t, 20, 25));
  cam(g, e, z, 1130, 470, 1130, 470);
  drawPlate(g, e, plate('night', 10));
  airbrush(g, 560, 700, 700, 500, amber, .18, .9);
  const drop = ss(seg(t, 20.2, 20.65));
  const inb = ss(seg(t, 20.6, 21.05)) * (1 - ss(seg(t, 21.1, 21.7)));   // the breath before answering
  const f = face(t, X, 'TY', 'thoughtful', { blinks: [20.25, 24.1], noBlink: [[20.5, 24.0]], sacc: .03,
    look: [lerp(.4, .15, drop), lerp(0, .7, drop)], E: { lid: lerp(.22, .42, drop), open: lerp(.94, .74, drop) } });
  layer(g, e, q => figure(q, P, apply({ who: 'TY', pose: 'sitBack', yaw: .9, x: 1130, y: 3030, s: 2.45, mirror: true, light: [1, -.25], lwk: .8,
    headTilt: .04 * drop + .014 * f.acc + .006 * breath(t, .2, 4.4) + .004 * sway(t, 8), leanAdd: -.012 * inb + .005 * breath(t, .4, 4.4) }, f)));
  return { post: { bloom: .6 } };
}

// ——— S1-08 · 0:25–0:30 · M FY lowers the page from in front of his face to rest on the desk edge as he speaks; then the
// camera pushes into the page until its white fills the frame by 29.5 (a gentle bloom, not a flash). The page keeps its
// size; only the camera moves. "Then start at the beginning. Start with college." ———
function s108(g, e, t, X) {
  const low = eio(seg(t, 25.15, 26.25));
  const pin = Math.pow(ss(seg(t, 27.7, 29.5)), 1.5);
  const pn = pose('_fy108', 'sitLean', {
    R: { elbow: [-140, -600, 230], wrist: [-100, lerp(-800, -652, low), 318], hand: 'flat' },
    L: { elbow: [140, -600, 236], wrist: [100, lerp(-800, -652, low), 324], hand: 'flat' } });
  const f = face(t, X, 'FY', 'determined', { blinks: [26.4], noBlink: [[25.0, 26.2], [26.7, 30]], rest: 'softsmile', look: [.5, 0],
    E: { brow: [-3.5, -2.2, 2.4], lid: .06 } });
  const fig = apply({ who: 'FY', pose: pn, yaw: .9, x: 650, y: 1520, s: 1.15, light: [1, -.3], rim: P.rim, lwk: .9,
    leanAdd: .03 * low + .006 * breath(t, .1, 3.2), headTilt: -.01 + .03 * f.acc + .008 * sway(t, 9) - .02 * (1 - low) }, f);
  const pg = heldPage(fig, ['R', 'L'], A4[1] * fig.s, A4[0] * fig.s, .0);   // portrait, face-on to camera
  const pc = heldPage({ ...fig, pose: pose('_fy108end', 'sitLean', { R: { ...POSES[pn].R, wrist: [-100, -652, 318] }, L: { ...POSES[pn].L, wrist: [100, -652, 324] } }) }, ['R', 'L'], A4[1] * fig.s, A4[0] * fig.s).c;
  const zs = Math.exp(Math.log(12) * pin);
  cam(g, e, zs, pc[0], pc[1], lerp(960, pc[0], 1 - pin), lerp(540, pc[1], 1 - pin));
  drawPlate(g, e, plate('night', 6));
  airbrush(g, 1500, 640, 640, 460, amber, .14, .9);
  layer(g, e, q => figure(q, P, { ...fig, layer: 'base' }));
  cel(g, poly([[0, 850], [1920, 836], [1920, 1080], [0, 1080]]), { f: P.wood.f, s: P.wood.s, h: P.wood.h, l: P.wood.l, lw: 2.6, sh: [[[0, 1010], [1920, 1000], [1920, 1080], [0, 1080]]] });
  airbrush(g, 1300, 880, 700, 120, amber, .26, .9);
  layer(g, e, q => figure(q, P, { ...fig, layer: 'arms' }));
  paperQuad(g, e, pg.pts, PAPER_GLOW + .5 * pin);
  layer(g, e, q => { thumb(q, fig, 'R'); thumb(q, fig, 'L'); });
  const wh = ss(seg(t, 28.8, 29.5));   // the white: the paper brightens as it fills the frame
  for (const x of [g, e]) x.setTransform(1, 0, 0, 1, 0, 0);
  if (wh > 0) { g.fillStyle = rgba(mix(P.paper.f, '#fffaf0', .5), wh); g.fillRect(0, 0, W, H); e.fillStyle = rgba(ivory, .3 * wh); e.fillRect(0, 0, W, H); }
  return { post: { bloom: .5 + .3 * wh, thr: .92 - .08 * wh } };
}

// ——— the clip ———
export const SHOTS01 = [
  ['S1-01', 0.0, 0.5, () => ({})],   // black
  ['S1-02', 0.5, 3.0, wide],
  ['S1-03', 3.0, 7.0, s103],
  ['S1-04', 7.0, 10.0, s104],
  ['S1-05', 10.0, 13.0, s105],
  ['S1-06', 13.0, 20.0, s106],
  ['S1-07', 20.0, 25.0, s107],
  ['S1-08', 25.0, 30.0, s108],
];

// sound events for the mixer (exported by core/render/events.mjs → events.json). No constant beds: every sound is a
// placed event, so nothing hisses under the voices (Sky, 2026-11-04)
export function events01(X) {
  const ev = [
    // distant Bengaluru night, as separate events: vehicles passing far off, two far horns
    { t: 0.15, type: 'passby', dur: 4.2, gain: .55, pan: -.4, f: 46 },
    { t: 9.4, type: 'passby', dur: 3.6, gain: .35, pan: .5, f: 52 },
    { t: 16.2, type: 'passby', dur: 4.0, gain: .3, pan: -.5, f: 44 },
    { t: 5.7, type: 'horn', gain: .22, pan: .6, f: 410 },
    { t: 23.9, type: 'horn', gain: .2, pan: -.6, f: 440 },
    // First-year in the wide: heel taps, the chair, a quick excited breath
    ...jigTaps().map(t => ({ t, type: 'tap', gain: .5, pan: -.3 })),
    { t: 1.28, type: 'creak', gain: .55, pan: -.35 }, { t: 1.3, type: 'rustle', dur: .35, gain: .4, pan: -.35 },
    { t: 2.62, type: 'inhale', who: 'FY', dur: .32, gain: .45, pan: -.1 },
    { t: 3.0, type: 'rustle', dur: .3, gain: .5, pan: -.1 }, { t: 3.02, type: 'creak', gain: .3, pan: -.1 },
    { t: 6.25, type: 'rustle', dur: .25, gain: .35, pan: -.1 },
    // the sheet across the desk
    { t: 7.05, type: 'rustle', dur: .3, gain: .35, pan: .4 },
    { t: SL.t0, type: 'paperTap', gain: .45, pan: .25 },
    { t: SL.t0 + .05, type: 'paperSlide', dur: SL.t1 - SL.t0, gain: .6, pan: .15 },
    { t: 8.15, type: 'rustle', dur: .3, gain: .35, pan: -.15 },
    { t: SL.land - .03, type: 'paperPat', gain: .5, pan: -.1 },
    { t: 9.1, type: 'paperSlide', dur: .55, gain: .3, pan: -.1 },
    // the insert: lift, flip, a puzzled breath
    { t: 10.0, type: 'paperLift', gain: .4 },
    { t: 10.48, type: 'paperFlip', dur: .5, gain: .55 },
    { t: 12.35, type: 'breath', who: 'FY', gain: .3 },
    // S1-06: shift toward TY, the gesture with the page, the waveform shimmer
    { t: 13.05, type: 'rustle', dur: .3, gain: .35, pan: -.1 },
    { t: 13.6, type: 'shimmer', dur: 5.4, gain: .2, pan: .25 },
    { t: X.lines.Y03 + (X.M.Y03?.dur || 4.8) * .28, type: 'paperFlutter', gain: .4, pan: .1 },
    // S1-07: Third-year's breath before answering
    { t: 20.2, type: 'rustle', dur: .4, gain: .25, pan: .1 },
    { t: 20.62, type: 'inhale', who: 'TY', dur: .45, gain: .38, pan: .1 },
    { t: 23.7, type: 'breath', who: 'TY', gain: .22, pan: .1 },
    // S1-08: the page lowered onto the desk edge; the bus comes in under the line (J-cut); one soft e-piano note
    { t: 25.15, type: 'paperLift', gain: .35, pan: -.05 }, { t: 26.2, type: 'paperPat', gain: .3, pan: -.05 },
    { t: 26.0, type: 'bus', dur: 4.0, gain: .5 },
    { t: 28.0, type: 'epiano', note: 64, gain: .22 },
  ];
  for (const [id, t0] of Object.entries(X.lines)) if (X.M[id]) ev.push({ t: t0, type: 'voice', id, who: id[0] === 'Y' ? 'FY' : 'TY', dur: X.M[id].dur });
  return ev.sort((a, b) => a.t - b.t);
}
