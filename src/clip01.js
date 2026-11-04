// Clip 01 · 0:00–0:30 · Scene 1, the blank page · ROOM, night (SHOT_LIST.md S1-01 … S1-08).
// Built ON TOP of the locked Gate B modules: characters only through figure()/handShape()/limbOutline() (body.js →
// sky.js), backgrounds through roomPlate/desk/sheet/lamp (plates.js), colours from PAL.night. Nothing is redrawn.
// The wide two-shot and the TY close-up reuse the approved storyboard compositions (frames.js sf_open / sb2).
import { canvas, poly, cel, line, rgba, mix, airbrush, vgrad, TAU, LWK } from './cel.js';
import { PAL, TOK } from './pal.js';
import { figure, limbOutline, handShape, proj, POSES } from './body.js';
import { chair } from './props.js';
import { roomPlate, desk, sheet, lamp } from './plates.js';
import { seg, ss, eio, eo, lerp, lerpV, key, twos, threes, blink, openOf, breath, lipAt, accent, clamp } from './perf.js';

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

// ——— the performances (one timing table per character, shared by every shot) ———
const FY_IDS = ['Y01', 'Y02', 'Y03', 'Y04'], TY_IDS = ['T01', 'T02'];
// First-year: hopeful A only when he is light (Y02 is puzzled: no wide smile)
const FY_MAP = { C: 'closed', T: 'talk', O: 'oh', A: 'smileopen' }, FY_MAP_FLAT = { C: 'closed', T: 'talk', O: 'oh', A: 'talk' };
const TY_MAP = { C: 'closed', T: 'talk', O: 'oh', A: 'talk' };   // Third-year is restrained: never the open smile here

function fyFace(t, X, base, extra = {}) {
  const lip = lipAt(threes(t), X.lines, X.M, FY_IDS, X.lines.Y02 != null && t >= X.lines.Y02 && t < X.lines.Y02 + 1.2 ? FY_MAP_FLAT : FY_MAP);
  const bf = blink(threes(t), 11, extra.blinks || [], 0, 30, extra.noBlink || []);
  const E = { ...(extra.E || {}) };
  return { expr: base, mouth: lip ? lip.shape : (extra.rest || undefined), open: openOf(base, bf, E), E, acc: accent(t, X.lines, X.M, FY_IDS) };
}
function tyFace(t, X, base, extra = {}) {
  const lip = lipAt(threes(t), X.lines, X.M, TY_IDS, TY_MAP);
  const bf = blink(threes(t), 23, extra.blinks || [], 0, 30, extra.noBlink || []);
  const E = { ...(extra.E || {}) };
  return { expr: base, mouth: lip ? lip.shape : (extra.rest || undefined), open: openOf(base, bf, E), E, acc: accent(t, X.lines, X.M, TY_IDS) };
}

// ——— S1-02 · 0:00.5–0:03 · W two-shot, slow push-in (the approved sf_open composition, animated) ———
function wide(g, e, t, X) {
  const u = seg(t, .5, 3.0);
  cam(g, e, 1 + .08 * eio(u), 960, 600);
  drawPlate(g, e, plate('night'));
  const tc = twos(t);
  // FY shifts on his chair edge at ~1.3 s (the creak), then the inhale before the cut
  const shift = ss(seg(tc, 1.25, 1.7)) - .4 * ss(seg(tc, 1.7, 2.3));
  const inhale = ss(seg(tc, 2.55, 3.0));
  const fyF = fyFace(t, X, 'curious', { blinks: [2.05] });
  const tyF = tyFace(t, X, 'calm', { blinks: [1.1] });
  const FY = { who: 'FY', pose: 'sitLean', yaw: .95, x: 560 + 5 * shift, y: 1052, s: .56, expr: fyF.expr, open: fyF.open, E: fyF.E, mouth: fyF.mouth,
    light: [1, -.35], look: [.5, 0], leanAdd: .03 * shift - .015 * inhale + .006 * breath(t, .1), headTilt: -.02 * shift + .01 * breath(t, .3) };
  const TY = { who: 'TY', pose: 'sitBack', yaw: .95, x: 1372, y: 1052, s: .56, mirror: true, expr: tyF.expr, open: tyF.open, E: tyF.E, mouth: tyF.mouth,
    light: [1, -.35], look: [.4, .1 + .2 * ss(seg(tc, 1.6, 2.1))], leanAdd: .005 * breath(t, .55, 4.2), headTilt: .006 * breath(t, .7, 4.2) };
  layer(g, e, q => { chair(q, P, { yaw: .95, x: 560 + 5 * shift, y: 1052, s: .56 }); chair(q, P, { yaw: .95, x: 1372, y: 1052, s: .56, mirror: true }); figure(q, P, { ...FY, layer: 'base' }); figure(q, P, { ...TY, layer: 'base' }); });
  desk(g, e, P, 'night');
  sheet(g, e, P, 956, 718, .3);
  lamp(g, e, P, 'night', 1150, 704);
  layer(g, e, q => { figure(q, P, { ...FY, layer: 'arms' }); figure(q, P, { ...TY, layer: 'arms' }); });
  return { post: { bloom: .6 } };
}

// ——— the MCU of First-year (S1-03, S1-06): ¾ facing right, TY off-screen right, soft room behind ———
const FY_MCU = { who: 'FY', pose: 'sitLean', yaw: .95, x: 640, y: 2190, s: 1.75, light: [1, -.3], rim: P.rim, lwk: .85 };
function fyMCU(g, e, t, X, f, o = {}) {
  cam(g, e, 1);
  drawPlate(g, e, plate('night', 10));
  airbrush(g, 1500, 640, 640, 460, amber, .16, .9);   // lamp bounce from screen right (off-screen lamp)
  const fig = { ...FY_MCU, ...o.fig, expr: f.expr, open: f.open, E: f.E, mouth: f.mouth };
  layer(g, e, q => figure(q, P, { ...fig, layer: 'base' }));
  if (o.prop) o.prop(g, e, fig);
  if (o.hands) layer(g, e, q => o.hands(q, fig));
  if (o.over) o.over(g, e, fig);
}

// ——— S1-03 · 0:03–0:07 · MCU FY: "So… did we make it?" — leans a little closer, brows up, holds after "make it" ———
function s103(g, e, t, X) {
  const tc = twos(t);
  const closer = ss(seg(tc, 3.05, 3.6)), settle = ss(seg(tc, 5.2, 6.4));
  const f = fyFace(t, X, 'curious', { blinks: [5.35], noBlink: [[3.3, 4.9]], E: { brow: [-3.5 - 2 * closer, -2.5 - 1.5 * closer, 2.4] } });
  fyMCU(g, e, t, X, f, { fig: { leanAdd: .045 * closer - .015 * settle + .007 * breath(t, .2), headTilt: -.03 * closer + .02 * f.acc + .008 * breath(t, .45), y: FY_MCU.y - 6 * closer,
    look: [.55, -.02] } });
  return { post: { bloom: .55 } };
}

// ——— runtime poses: the rig's own pose table (body.js POSES) extended per frame, so arms, hands and props stay
// attached through figure() itself (body.js is not edited; poses are data) ———
function pose(name, base, side) {
  const B = POSES[base];
  POSES[name] = { ...B, R: { ...B.R, ...(side.R || {}) }, L: { ...B.L, ...(side.L || {}) } };
  return name;
}

// ——— S1-04 · 0:07–0:10 · OS behind TY's right shoulder onto FY: TY slides the sheet; FY's hands take it ———
const SL = { t0: 7.25, t1: 8.75, catch: 8.95 };
function s104(g, e, t, X) {
  const tc = twos(t);
  const cu = eio(seg(t, 7.0, 9.2));   // small slide following the sheet (camera on ones)
  // the wall behind FY: the door side of the room, soft
  for (const x of [g, e]) x.setTransform(1.5, 0, 0, 1.5, -30 - 50 * cu, -230);
  drawPlate(g, e, plate('night', 9));
  for (const x of [g, e]) x.setTransform(1, 0, 0, 1, -50 * cu, 0);
  airbrush(g, 1560, 560, 560, 420, amber, .2, .9);   // the lamp behind TY's shoulder
  airbrush(e, 1600, 470, 160, 120, amber, .4, .8);
  const fyF = fyFace(t, X, 'curious', { blinks: [9.55] });
  const tyF = tyFace(t, X, 'calm');
  const reach = ss(seg(tc, 8.25, 8.85)), take = ss(seg(tc, 8.75, SL.catch)), pull = ss(seg(tc, 9.1, 9.8));
  const z = 435 + 120 * reach - 50 * pull;
  const pn = pose('_fy104', 'sitLean', {
    R: { wrist: [-70 + 10 * reach, -614, z], elbow: [-118, -606, 250 + 40 * reach], hand: take > .5 ? 'grip' : 'flat' },
    L: { wrist: [60 - 4 * reach, -614, z + 6], elbow: [116, -606, 256 + 40 * reach], hand: take > .5 ? 'grip' : 'flat' } });
  const FY = { who: 'FY', pose: pn, yaw: .55, x: 600, y: 1392, s: .95, expr: fyF.expr, open: fyF.open, E: fyF.E, mouth: fyF.mouth, light: [-1, -.35],
    look: [.12, lerp(.05, .55, ss(seg(tc, 7.4, 8.2))) * (1 - .6 * pull)], leanAdd: .035 * reach - .02 * pull + .006 * breath(t, .2), headTilt: .02 * reach, lwk: .9 };
  layer(g, e, q => figure(q, P, { ...FY, layer: 'base' }));
  // desk: the near part of the top, seen from TY's side
  cel(g, poly([[0, 800], [1920, 776], [1920, 1080], [0, 1080]]), { f: P.wood.f, s: P.wood.s, h: P.wood.h, l: P.wood.l, lw: 2.6, hi: [[[900, 790], [1600, 780], [1700, 860], [980, 880]]] });
  airbrush(g, 1260, 880, 700, 160, amber, .28, .9);
  // the sheet: from TY's hand (lower right) to the point between FY's reaching hands; then it travels with them
  const wR = joint(FY, POSES[pn].R.wrist), wL = joint(FY, POSES[pn].L.wrist);
  const meet = [(wR[0] + wL[0]) / 2 + 30, (wR[1] + wL[1]) / 2 + 26];
  const u = eio(seg(tc, SL.t0, SL.t1));
  const c = take > 0 ? meet : lerpV([1260, 965], meet, u), k = lerp(1.2, .78, u), rot = lerp(-.1, .02, u);
  const hw = 165 * k, hh = 62 * k;
  const cs = Math.cos(rot), sn = Math.sin(rot), R = (x, y) => [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs];
  paperQuad(g, e, [R(-hw, -hh), R(hw * .96, -hh * 1.06), R(hw, hh), R(-hw * 1.02, hh * 1.04)], .2);
  layer(g, e, q => figure(q, P, { ...FY, layer: 'arms' }));
  // TY's right forearm pushing the sheet from the lower right, released at the end of the slide
  const push = 1 - ss(seg(tc, SL.t1, SL.t1 + .35));
  if (push > .01) layer(g, e, q => {
    const hand = lerpV(R(hw * .9, hh * .3), [R(hw, hh)[0] + 200, R(hw, hh)[1] + 160], 1 - push);
    forearm(q, { s: 1.5, light: [1, -.3], mirror: true, lwk: .9 }, [hand[0] + 420, hand[1] + 330], hand, 'flat', true);
  });
  // TY: shoulder and back of the head at the right edge, out of focus
  layer(g, e, q => figure(q, P, { who: 'TY', pose: 'sitBack', yaw: 2.35, x: 1600, y: 2560, s: 2.0, mirror: true, expr: tyF.expr, open: tyF.open, mouth: 'closed',
    light: [1, -.3], rim: P.rim, rimBack: true, layer: 'base', leanAdd: .006 * breath(t, .5), lwk: .9 }), { blur: 6 });
  return { post: { bloom: .5 } };
}

// ——— S1-05 · 0:10–0:13 · INS the sheet in FY's hands, his eyeline: lifts it, turns it over, checks the back ———
// the hands hold the side edges from behind (fingers hidden), thumbs over the front
function s105(g, e, t, X) {
  cam(g, e, 1);
  const tc = twos(t);
  vgrad(g, 0, 0, W, H, [[0, mix(P.wood.s, ink, .35)], [1, mix(P.wood.f, ink, .15)]]);   // out-of-focus desk wood
  for (let k = 0; k < 16; k++) { g.fillStyle = rgba(ink, .07); g.fillRect(0, k * 72 + 20, W, 4); }
  airbrush(g, 1500, 300, 900, 600, amber, .22, .95);
  airbrush(e, 1600, 260, 300, 220, amber, .16, .9);
  const lift = eo(seg(tc, 10.05, 10.5)), phi = Math.PI * eio(seg(tc, 10.55, 11.25)), look = ss(seg(tc, 11.3, 11.6)) * (1 - ss(seg(tc, 12.3, 12.8)));
  const cy = 560 - 40 * lift, cx = 960, tilt = -.025 + .02 * lift + .04 * look;
  const hw = 460, hh0 = 300 * (1 + .04 * lift), hh = hh0 * Math.abs(Math.cos(phi)), back = phi > Math.PI / 2;
  const top = -hh - 40 * Math.sin(phi);   // the turning edge leans toward him
  const cs = Math.cos(tilt), sn = Math.sin(tilt), R = (x, y) => [cx + x * cs - y * sn, cy + x * sn + y * cs];
  const o = { s: 2.5, light: [1, -.4], lwk: .8 };
  // hold points: the middle of each side edge (the flip axis)
  const hL = R(-hw, 20), hR = R(hw, 20);
  layer(g, e, q => {
    forearm(q, o, [hL[0] - 330, 1260], [hL[0] + 10, hL[1] + 30], 'flat');
    q.save(); q.translate(2 * cx, 0); q.scale(-1, 1); forearm(q, o, [2 * cx - hR[0] - 330, 1260], [2 * cx - hR[0] + 10, hR[1] + 30], 'flat'); q.restore();
  });
  const pts = [R(-hw, top), R(hw, top), R(hw, hh), R(-hw, hh)];
  if (hh > 4) {
    paperQuad(g, e, pts, .05, back);
    g.save(); g.beginPath(); pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p[0], p[1])); g.closePath(); g.clip();
    const bx = lerp(-700, 2400, seg(t, 10.0, 13.0));   // the sliding highlight across the paper (on ones)
    const gr = g.createLinearGradient(bx - 260, 0, bx + 260, 200); gr.addColorStop(0, rgba('#ffffff', 0)); gr.addColorStop(.5, rgba('#ffffff', .24)); gr.addColorStop(1, rgba('#ffffff', 0));
    g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
  } else line(g, [R(-hw, 0), R(hw, 0)], P.paper.l, 3);
  // thumbs over the front of the sheet (on a layer, so the paper's light doesn't bloom through them)
  layer(g, e, q => {
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

// ——— S1-06 · 0:13–0:20 · MCU FY: "You used to send me voice notes—…" — paper → TY, teasing, one gesture with the sheet;
// a faint voice-note waveform flickers above the page, then fades by 19 s ———
function s106(g, e, t, X) {
  const tc = twos(t), tq = threes(t);
  const toTY = ss(seg(tc, 13.15, 13.55));
  const gest = ss(seg(tq, 15.0, 15.5)) * (1 - ss(seg(tq, 16.6, 17.4)));
  const ask = ss(seg(tc, 17.6, 18.0));   // "What happened?": brows up
  const f = fyFace(t, X, 'curious', { blinks: [13.55, 19.2], noBlink: [[14.0, 19.0]],
    E: { lid: .1 - .06 * ask, browN: [-4.5 - 2 * ask, -2 - 2 * ask, 2.4], browF: [-2.5 - 2.5 * ask, -1.5 - 2 * ask, 2] } });
  const wf = seg(t, 13.6, 14.2) * (1 - seg(t, 18.2, 19.0));
  // the near (right) hand holds the sheet up at the desk edge; lifts and turns it once on "ideas, plans"
  const pn = pose('_fy106', 'sitLean', { R: { elbow: [-128, -640, 250], wrist: [-40 - 10 * gest, -735 - 120 * gest + 6 * Math.sin(tq * 9) * gest, 410 + 30 * gest], hand: 'grip' } });
  fyMCU(g, e, t, X, f, {
    fig: { pose: pn, look: [lerp(.2, .55, toTY), lerp(.6, -.02, toTY)], leanAdd: .01 * gest + .007 * breath(t, .3) - .01 * ask, headTilt: lerp(.05, -.01, toTY) + .025 * f.acc - .02 * ask + .008 * breath(t, .6) },
    prop: (g2, e2, fig) => {
      const w = joint(fig, POSES[pn].R.wrist), a = -.12 + .22 * gest;
      const pc = [w[0] + 150, w[1] - 70];
      const cs = Math.cos(a), sn = Math.sin(a), R = (x, y) => [pc[0] + x * cs - y * sn, pc[1] + x * sn + y * cs];
      paperQuad(g2, e2, [R(-160, -110), R(160, -116), R(166, 110), R(-156, 116)], .16);
    },
    hands: (q, fig) => figure(q, P, { ...fig, layer: 'arms' }),
    over: (g2, e2) => {
      // waveform: a held cel of bars with a light band sweeping across it on ones (SHOT_LIST S1-06)
      if (wf <= 0) return;
      const fl = .75 + .25 * Math.sin(t * 37) * Math.sin(t * 11.3);
      const x0 = 1120, y0 = 560, n = 34, sweep = ((t - 13.6) / 1.6) % 1;
      for (let k = 0; k < n; k++) {
        const hgt = 10 + 70 * Math.abs(Math.sin(k * 1.7) * Math.sin(k * .43 + 1.2)), x = x0 + k * 18;
        const band = Math.exp(-Math.pow((k / n - sweep) * 6, 2));
        const a = wf * fl * (.18 + .5 * band);
        g2.fillStyle = rgba(mix(teal, ivory, .45), a); g2.fillRect(x, y0 - hgt / 2, 7, hgt);
        e2.fillStyle = rgba(mix(teal, ivory, .3), a * .9); e2.fillRect(x - 2, y0 - hgt / 2 - 2, 11, hgt + 4);
      }
    } });
  return { post: { bloom: .58 } };
}

// ——— S1-07 · 0:20–0:25 · CU TY (the approved sb2 composition): eyes drop to the page, a breath, then
// "I don't know how to write the ending yet." and a held pause; no gesture; very slow push-in ———
function s107(g, e, t, X) {
  const z = 1 + .035 * eio(seg(t, 20, 25));
  cam(g, e, z, 1130, 470, 1130, 470);
  drawPlate(g, e, plate('night', 10));
  airbrush(g, 560, 700, 700, 500, amber, .18, .9);
  const tc = twos(t);
  const drop = ss(seg(threes(t), 20.25, 20.6));
  const inb = ss(seg(tc, 20.6, 21.05)) * (1 - ss(seg(tc, 21.1, 21.6)));   // the breath before answering
  const f = tyFace(t, X, 'thoughtful', { blinks: [20.3, 24.05], noBlink: [[20.6, 24.0]], E: { lid: lerp(.22, .44, drop), open: lerp(.94, .72, drop) } });
  layer(g, e, q => figure(q, P, { who: 'TY', pose: 'sitBack', yaw: .9, x: 1130, y: 3030, s: 2.45, mirror: true, expr: f.expr, open: f.open, E: f.E, mouth: f.mouth,
    look: [lerp(.4, .15, drop), lerp(0, .7, drop)], light: [1, -.25], lwk: .8,
    headTilt: .04 * drop + .012 * f.acc + .006 * breath(t, .2, 4.4), leanAdd: -.012 * inb + .005 * breath(t, .4, 4.4) }));
  return { post: { bloom: .6 } };
}

// ——— S1-08 · 0:25–0:30 · M FY holding the sheet up, lowering it toward camera as he speaks; then a push into the paper
// until its white fills the frame by 29.5 (a gentle bloom, not a flash): "Then start at the beginning. Start with college." ———
function s108(g, e, t, X) {
  const tc = twos(t);
  const low = eio(seg(tc, 25.3, 27.9));                    // lowers the sheet toward camera as he speaks
  const pin = Math.pow(ss(seg(t, 27.6, 29.5)), 1.6);       // camera push into the paper (on ones)
  const pn = pose('_fy108', 'sitLean', {
    R: { elbow: [-150, -650, 210 + 30 * low], wrist: [-118 - 20 * low, -820 + 80 * low, 370 + 50 * low], hand: 'grip' },
    L: { elbow: [150, -650, 214 + 30 * low], wrist: [118 + 20 * low, -820 + 80 * low, 376 + 50 * low], hand: 'grip' } });
  const f = fyFace(t, X, 'determined', { blinks: [25.15], noBlink: [[25.4, 28.2]], E: { brow: [-3, -2, 2.2], lid: .08 } });
  const fig = { who: 'FY', pose: pn, yaw: .9, x: 650, y: 1520, s: 1.15, light: [1, -.3], rim: P.rim, lwk: .9,
    expr: f.expr, open: f.open, E: f.E, mouth: f.mouth, look: [.5, 0], leanAdd: .04 * low + .006 * breath(t, .1), headTilt: -.01 + .03 * f.acc + .008 * breath(t, .4) };
  // the sheet: its lower corners in his hands; it grows as it comes toward camera
  const wR = joint(fig, POSES[pn].R.wrist), wL = joint(fig, POSES[pn].L.wrist);
  const pk = lerp(1, 1.35, low), sep = Math.hypot(wL[0] - wR[0], wL[1] - wR[1]);
  const ax = (wL[0] - wR[0]) / sep, ay = (wL[1] - wR[1]) / sep, nx = ay, ny = -ax;   // along the bottom edge, and "up" the sheet
  const m = 46 * pk, hgt = 250 * pk;
  const b0 = [wR[0] - ax * m, wR[1] - ay * m - 8], b1 = [wL[0] + ax * m, wL[1] + ay * m - 8];
  const pts = [[b0[0] + nx * hgt, b0[1] + ny * hgt], [b1[0] + nx * hgt, b1[1] + ny * hgt], b1, b0];
  const pc = [(b0[0] + b1[0]) / 2 + nx * hgt / 2, (b0[1] + b1[1]) / 2 + ny * hgt / 2];
  const zs = Math.exp(Math.log(10) * pin);                 // ×1 → ×10 into the sheet's centre
  cam(g, e, zs, pc[0], pc[1], lerp(960, pc[0], 1 - pin), lerp(540, pc[1], 1 - pin));
  drawPlate(g, e, plate('night', 6));
  airbrush(g, 1500, 640, 640, 460, amber, .14, .9);
  layer(g, e, q => figure(q, P, { ...fig, layer: 'base' }));
  cel(g, poly([[0, 850], [1920, 836], [1920, 1080], [0, 1080]]), { f: P.wood.f, s: P.wood.s, h: P.wood.h, l: P.wood.l, lw: 2.6, sh: [[[0, 1010], [1920, 1000], [1920, 1080], [0, 1080]]] });
  airbrush(g, 1300, 880, 700, 120, amber, .26, .9);
  paperQuad(g, e, pts, .18 + .5 * pin);
  layer(g, e, q => figure(q, P, { ...fig, layer: 'arms' }));
  // the white: the paper brightens as it fills the frame
  const wh = ss(seg(t, 28.7, 29.5));
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

// sound and cue events for the mixer (exported by core/render/events.mjs → events.json)
export function events01(X) {
  const ev = [
    { t: 0.0, type: 'amb', what: 'room', fadeIn: 1.2 },
    { t: 1.3, type: 'creak', gain: .5, pan: -.35 },
    { t: 2.62, type: 'inhale', who: 'FY', gain: .35, pan: -.1 },
    { t: SL.t0, type: 'paperSlide', dur: SL.t1 - SL.t0, gain: .55, pan: .2 },
    { t: SL.catch - .05, type: 'paperCatch', gain: .45, pan: -.1 },
    { t: 10.05, type: 'paperLift', gain: .35 },
    { t: 10.55, type: 'paperTurn', dur: .7, gain: .5 },
    { t: 12.55, type: 'breath', who: 'FY', gain: .3 },
    { t: 13.6, type: 'shimmer', dur: 5.4, gain: .22, pan: .25 },
    { t: 20.6, type: 'inhale', who: 'TY', gain: .32, pan: .1 },
    { t: 26.0, type: 'bus', dur: 4.0, gain: .5 },
    { t: 28.0, type: 'epiano', note: 64, gain: .22 },
  ];
  for (const [id, t0] of Object.entries(X.lines)) if (X.M[id]) ev.push({ t: t0, type: 'voice', id, who: id[0] === 'Y' ? 'FY' : 'TY', dur: X.M[id].dur });
  return ev.sort((a, b) => a.t - b.t);
}
