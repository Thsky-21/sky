// Acting: the film's state at time t, computed ONLY from line anchors (src/tl.js) — never from absolute seconds.
// Layer 2 (performance): held poses with short in-betweens (pose weights step on twos), each anchored to a line.
//   FY — sits forward on his elbows (neutral), holds the sheet up one-handed (Y03), eager lean (Y06), celebrates (Y08),
//        looks down at his hands then up (Y15 part 1 / part 2), slides the sheet back (Y20's gap), softens after T17.
//   TY — sits back, one forearm on the table, the other hand in his lap (neutral), eyes down (T02), a dry half-smile
//        (T04, T05 part 1, T10), closes the laptop (T16), leans forward into the lamp from T17 part 1 to the end.
// Mouths on the speaker only, from the audio; closed when on_camera is false. The listener breathes, blinks on threes
// and turns his head a little toward the speaker. FY looks screen right, TY screen left. They never mirror each other.
import { POSES } from './body.js';
import { seg, ss, eio, eo, spring, lerp, lerpV, blink, openOf, breath, sway, sacc, threes, twos, clamp } from './perf.js';
import { pose, zFor, flatPage, heldPage, lerpQ, A4, SETUPS, FYX, TYX, S, YAW, P } from './stage.js';
import { lampClick } from './tl.js';

const FY_MAP = { C: 'closed', T: 'talk', O: 'oh', A: 'smileopen' }, TY_MAP = { C: 'closed', T: 'talk', O: 'oh', A: 'talk' };

// ——— light: dark room lit only by the phone, then the desk lamp clicks on (anchored to VN01's end) ———
export function lampLevel(T, t) {
  const d = t - lampClick(T);
  if (d < 0) return 0;
  if (d < .05) return .7; if (d < .11) return .12; if (d < .19) return .85; if (d < .23) return .45;
  return .85 + .15 * ss(seg(d, .23, .45));
}
export const goldLevel = (T, t) => Math.max(.3 * lampLevel(T, t), ss(seg(t, lampClick(T) + .3, lampClick(T) + 1.65)));

function mouthAt(T, M, t, who) {
  for (const id of T.order) {
    const l = T.L[id], m = M[id];
    if (l.speaker !== who || !m || !l.on_camera) continue;
    if (t >= l.start && t < l.start + m.m.length / m.fps) {
      const k = Math.floor((t - l.start) * m.fps + 1e-6);
      return { id, shape: (who === 'FY' ? FY_MAP : TY_MAP)[m.m[k]] || 'closed' };
    }
  }
  return null;
}
function accentAt(T, M, t, who) {
  const id = T.speaking(t); if (!id || T.L[id].speaker !== who) return 0;
  const m = M[id], c = (t - T.L[id].start) * 24; let s = 0, n = 0;
  for (let k = -4; k <= 4; k++) { const v = m.a[Math.round(c + k)]; if (v != null) { s += v * (5 - Math.abs(k)); n += 5 - Math.abs(k); } }
  return n ? s / n : 0;
}
const talker = (T, t) => T.L[T.speaking(t) || T.current(t)]?.speaker || 'FY';

// a held pose's weight: in-between of `rin` s starting at a, held, out-between of `rout` s ending at b (on twos)
const hold = (t, a, b, rin = .25, rout = .3) => { const q = twos(t); return ss(seg(q, a, a + rin)) * (1 - ss(seg(q, b - rout, b))); };
const mixA = (A, B, u) => ({ elbow: lerpV(A.elbow, B.elbow, u), wrist: lerpV(A.wrist, B.wrist, u), hand: u > .5 ? B.hand : A.hand });

// ——— the page in the room: TY's side → slid across on T01 → FY's side → slid back in Y20's gap ———
const PAGE_TY = [1040, 778], PAGE_FY = [918, 781], PAGE_MID = [1000, 780];
export function pageAt(T, t) {
  const s0 = T.at('T01', 'start', -.3), s1 = T.at('T01', 'end', .2);
  const b0 = T.at('Y19', 'end', 1.6), b1 = T.at('Y20', 'start', -.25);
  if (t < b0) return lerpV(PAGE_TY, PAGE_FY, eio(seg(t, s0, s1)));
  return lerpV(PAGE_FY, PAGE_MID, eio(seg(t, b0, b1)));
}

// ——— FY's arm cels (rig coordinates, sitLean, facing screen right) ———
function fyTable(sxR, sxL) {
  const zR = zFor(FYX, false, -66, sxR), zL = zFor(FYX, false, 54, sxL);
  return { R: { elbow: [-118, -606, zR - 185], wrist: [-66, -612, zR], hand: 'flat' }, L: { elbow: [118, -606, zL - 185], wrist: [54, -612, zL], hand: 'flat' } };
}
const FY_ELBOWS = { R: { elbow: [-126, -612, 286], wrist: [-34, -800, 380], hand: 'clasp' }, L: { elbow: [126, -612, 292], wrist: [22, -806, 386], hand: 'clasp' } };
const FY_CELEB = { R: { elbow: [-176, -820, 190], wrist: [-120, -1010, 300], hand: 'grip' }, L: { elbow: [176, -820, 196], wrist: [120, -1010, 306], hand: 'grip' } };
const FY_HANDS = { R: { elbow: [-120, -606, 230], wrist: [-36, -616, 380], hand: 'clasp' }, L: { elbow: [120, -606, 236], wrist: [20, -620, 390], hand: 'clasp' } };
const fyHold1 = gest => ({ R: { elbow: [-128, -602, 236], wrist: [-70 + 20 * gest, -700 - 80 * gest, 370 + 30 * gest], hand: 'flat' } });

// ——— TY's arm cels (sitBack, mirrored) ———
const TY_BACK = { R: { elbow: [-132, -620, 100], wrist: [-60, -616, 290], hand: 'flat' }, L: { elbow: [140, -600, 60], wrist: [100, -490, 216], hand: 'rest' } };
const TY_FWD = { R: { elbow: [-112, -606, 230], wrist: [-40, -612, 390], hand: 'clasp' }, L: { elbow: [112, -606, 230], wrist: [24, -616, 396], hand: 'clasp' } };
const TY_LID = u => ({ R: { elbow: [-130, -660, 200], wrist: [-70, -680 + 70 * u, 420], hand: 'flat' } });

// the camera follows the head in the close setups (a lean moves it a lot); world-space head estimate
export function headPos(o) {
  const lean = (POSES[o.pose].lean || 0) + (o.leanAdd || 0), h = 690;
  const dz = h * Math.sin(lean), sx = (o.mirror ? -1 : 1) * Math.sin(YAW) * dz * S;
  return [o.x + sx, 1250 - (435 + h * Math.cos(lean)) * S];
}
const HEAD0 = { FY: null, TY: null };

export function state(T, M, t, shot) {
  const lamp = lampLevel(T, t), gold = goldLevel(T, t), who = talker(T, t), total = T.total;
  const A = (id, an = 'start', off = 0) => T.at(id, an, off);

  // ——————————————————— FY ———————————————————
  const pc = pageAt(T, t);
  // weights of the held poses
  const wHold = hold(t, A('Y03', 'start', -.35), A('Y03', 'end', .35), .35, .4);
  const yd = T.voiced('Y03'), gest = ss(seg(t, yd[0] + (yd[1] - yd[0]) * .28, yd[0] + (yd[1] - yd[0]) * .4)) * (1 - ss(seg(t, yd[0] + (yd[1] - yd[0]) * .62, yd[0] + (yd[1] - yd[0]) * .8)));
  const wEager = hold(t, A('Y06', 'start', -.12), A('T04', 'start', .3), .18, .5);
  const wCeleb = hold(t, A('Y08', 'start', -.08), A('Y08', 'end', .45), .16, .35);
  const wDown = hold(t, A('Y15', 'start', -.5), A('Y15', 'part_2_start', -.15), .4, .35);
  const wHands = hold(t, A('Y15', 'start', -.5), A('Y15', 'end', .3), .4, .4);
  const wSlide = hold(t, A('Y19', 'end', 1.45), A('Y20', 'start', .3), .2, .35);
  const wSoft = ss(seg(twos(t), A('T17', 'part_2_start'), A('T17', 'part_2_start', .8)));   // after "No." he settles back
  const wTalk = who === 'FY' && T.speaking(t) ? 1 : 0;

  // arms: elbows (neutral) → table (soft) ; + held poses on top
  const tab = fyTable(...(wSlide > 0 ? [pc[0] - 66, pc[0] - 16] : [790, 845]));
  let R = mixA(FY_ELBOWS.R, tab.R, Math.max(wSoft, wSlide)), L = mixA(FY_ELBOWS.L, tab.L, Math.max(wSoft, wSlide));
  R = mixA(R, FY_HANDS.R, wHands); L = mixA(L, FY_HANDS.L, wHands);
  R = mixA(R, fyHold1(gest).R, wHold);
  R = mixA(R, FY_CELEB.R, wCeleb); L = mixA(L, FY_CELEB.L, wCeleb);
  const fyName = pose('_fy', 'sitLean', { R, L });

  let fyExpr = 'curious', fyE = {}, fyRest = 'closed';
  if (wEager > .3 || wCeleb > .3) { fyExpr = 'excited'; fyE = { open: 1.14 }; fyRest = 'softsmile'; }
  if (wDown > .3) { fyExpr = 'thoughtful'; fyE = { lid: .45, open: .74 }; }
  if (t > A('Y19', 'start', -.2)) { fyExpr = 'empathetic'; fyRest = 'softsmile'; }
  if (t > A('Y13', 'start', -.1) && t < A('Y13', 'end', .6)) fyRest = 'softsmile';
  const fyM = mouthAt(T, M, t, 'FY');
  const fyListen = who === 'TY' ? 1 : 0;
  const fyB = blink(fyListen ? threes(t) : t, 11, [A('Y15', 'part_2_start', -.1)], 0, total, [[A('Y15', 'start'), A('Y15', 'part_1_end')]]);
  const fsc = sacc(t, 3, .035);
  const look = lerpV([.55 + fsc[0], -.02 + fsc[1]], [.2, .72], wDown);
  const FY = {
    who: 'FY', pose: fyName, yaw: YAW + .06 * fyListen, x: FYX, y: 1250, s: S, light: [1, -.35], rim: P.rim, lwk: .95,
    expr: fyExpr, open: openOf(fyExpr, fyB, fyE), E: fyE, mouth: fyM ? fyM.shape : fyRest, look,
    leanAdd: .06 + .006 * breath(t, .1, 3.2) + .02 * fyListen + .08 * spring(wEager) - .05 * wCeleb + .05 * wDown - .08 * wSoft - .04 * wHold,
    headTilt: .01 * sway(t, 1) + .03 * accentAt(T, M, t, 'FY') - .015 * fyListen + .09 * wDown - .03 * wCeleb - .02 * wEager,
  };

  // ——————————————————— TY ———————————————————
  const wSmile = Math.max(hold(t, A('T04', 'start', -.2), A('T04', 'end', .7)), hold(t, A('T05', 'start', -.1), A('T05', 'part_1_end', .3)),
    hold(t, A('T10', 'start', -.1), A('T10', 'end', .4)), hold(t, A('Y19', 'end', .4), A('Y20', 'start', .2), .5, .3));
  const wDrop = hold(t, A('T02', 'start', -.7), A('Y04', 'start', .2), .45, .4);
  const lidU = seg(twos(t), T.frac('T16', .38), T.frac('T16', .6));
  const wLid = hold(t, T.frac('T16', .2), A('T16', 'end', .3), .35, .4);
  const wFwd = ss(seg(twos(t), A('T17', 'part_1_start', -.2), A('T17', 'part_1_start', .9)));   // the first time he leans in; he stays
  let TR = mixA(TY_BACK.R, TY_FWD.R, wFwd), TL_ = mixA(TY_BACK.L, TY_FWD.L, wFwd);
  TR = mixA(TR, TY_LID(eio(lidU)).R, wLid);
  const tyName = pose('_ty', 'sitBack', { R: TR, L: TL_ });
  const tyListen = who === 'FY' ? 1 : 0;
  const tyM = mouthAt(T, M, t, 'TY');
  const tyB = blink(tyListen ? threes(t) : t, 23, [A('T02', 'start', -.75)], 0, total, [[A('T11', 'start'), A('T11', 'end')]]);
  const tsc = sacc(t, 7, .03);
  let tyExpr = 'calm', tyE = {}, tyRest = 'closed';
  if (wSmile > .3) { tyE = { brow: [1.5, -1.5, 1.2], lid: .28 }; tyRest = 'softsmile'; }
  if (wDrop > .3) { tyExpr = 'thoughtful'; tyE = { lid: .4, open: .78 }; }
  if (wFwd > .3) { tyExpr = 'empathetic'; tyE = { lid: .14 }; }
  const tlook = lerpV([.4 + tsc[0], .05 + tsc[1]], [.2, .65], wDrop);
  const TY = {
    who: 'TY', pose: tyName, yaw: YAW + .06 * tyListen, x: TYX, y: 1250, s: S, mirror: true, light: [1, -.35], rim: P.rim, lwk: .95,
    expr: tyExpr, open: openOf(tyExpr, tyB, tyE), E: tyE, mouth: tyM ? tyM.shape : tyRest, look: tlook,
    leanAdd: -.05 + .006 * breath(t, .55, 4.2) + .015 * tyListen + .42 * wFwd + .1 * wLid * (1 - wFwd),
    headTilt: .006 * breath(t, .7, 4.2) + .005 * sway(t, 2) + .014 * accentAt(T, M, t, 'TY') + .015 * tyListen + .05 * wDrop,
  };

  // ——————————————————— the page ———————————————————
  let page = { pts: flatPage(pc, .015), held: false };
  if (wHold > 0) {
    const h1 = heldPage(FY, ['R'], A4[0] * .78, A4[1], -.05 + .1 * gest);
    page = { pts: lerpQ(page.pts, h1.pts, wHold), held: wHold > .5, thumbs: ['R'] };
  }

  // ——————————————————— camera ———————————————————
  const sh = SETUPS[shot.shot] || SETUPS.W;
  const u = seg(t, shot.t0, shot.t1);
  const push = /push/.test(LINE_CAMERA[shot.line] || '');
  const zk = push ? lerp(1, 1.1, eio(u)) : shot.shot === 'W' ? lerp(1, 1.025, u) : lerp(1, 1.015, u);
  let cx = sh[1], cy = sh[2];
  if (shot.shot === 'FY' || shot.shot.startsWith('TY')) {   // follow the head from its neutral place
    const o = shot.shot === 'FY' ? FY : TY, k = shot.shot === 'FY' ? 'FY' : 'TY';
    if (!HEAD0[k]) HEAD0[k] = k === 'FY' ? headPos({ ...FY, pose: 'sitLean', leanAdd: .06 }) : headPos({ ...TY, pose: 'sitBack', leanAdd: -.05 });
    const hp = headPos(o);
    cx += .8 * (hp[0] - HEAD0[k][0]); cy += .8 * (hp[1] - HEAD0[k][1]);
  }
  const camO = { z: sh[0] * zk, cx, cy };

  const phone = { shown: true, x: 1118, y: 790, glow: t < A('VN01', 'end', .05) ? 1 : 0 };
  return { cam: camO, life: t, lamp, gold, FY, TY, page, phone, laptop: 1 - eio(lidU), books: true,
    wave: .8 * hold(t, T.frac('Y03', .05), T.frac('Y03', .93), .4, .25) };
}

export const LINE_CAMERA = {};
