// Acting: the film's state at time t, computed ONLY from line anchors (src/tl.js) — never from absolute seconds.
// Layer 1 (animatic): FY leans in on his forearms (sitLean), TY sits back (sitBack); mouths on the speaker only, from
// the audio (voices/mouth.json); blinks; the listener breathes, blinks on threes and turns his head a little toward the
// speaker; FY looks screen right, TY screen left. Layer 2 adds the held poses.
import { POSES } from './body.js';
import { seg, ss, eio, eo, spring, lerp, lerpV, key, blink, openOf, breath, sway, sacc, threes } from './perf.js';
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

// mouth drawing for a speaker at t: only on lines where the speaker is on camera (dialogue.json on_camera)
function mouthAt(T, M, t, who) {
  for (const id of T.order) {
    const l = T.L[id], m = M[id];
    if (l.speaker !== who || !m || !l.on_camera) continue;
    if (t >= l.start && t < l.start + m.m.length / m.fps) {
      const k = Math.floor((t - l.start) * m.fps + 1e-6);
      return { id, shape: (who === 'FY' ? FY_MAP : TY_MAP)[m.m[k]] || 'closed', amp: m.a[Math.min(m.a.length - 1, Math.floor((t - l.start) * 24))] || 0 };
    }
  }
  return null;
}
// loudness for small head accents while speaking
function accentAt(T, M, t, who) {
  const id = T.speaking(t); if (!id || T.L[id].speaker !== who) return 0;
  const m = M[id], c = (t - T.L[id].start) * 24; let s = 0, n = 0;
  for (let k = -4; k <= 4; k++) { const v = m.a[Math.round(c + k)]; if (v != null) { s += v * (5 - Math.abs(k)); n += 5 - Math.abs(k); } }
  return n ? s / n : 0;
}
// who is talking (or last talked) at t: drives the listener's head turn
function talker(T, t) {
  const id = T.speaking(t) || T.current(t);
  return T.L[id]?.speaker || 'FY';
}

// ——— the page's journey (room view), anchored: TY's side → slid across on T01 → FY's side → slid back after Y19 ———
const PAGE_TY = [1040, 778], PAGE_FY = [918, 781], PAGE_MID = [1000, 780];
export function pageAt(T, t) {
  const s0 = T.at('T01', 'start', -.3), s1 = T.at('T01', 'end', .2);
  const b0 = T.at('Y19', 'end', 1.6), b1 = T.at('Y20', 'start', -.25);
  if (t < s0) return PAGE_TY;
  if (t < b0) return lerpV(PAGE_TY, PAGE_FY, eio(seg(t, s0, s1)));
  return lerpV(PAGE_FY, PAGE_MID, eio(seg(t, b0, b1)));
}

function fyArmsTable(sxR, sxL) {
  const zR = zFor(FYX, false, -66, sxR), zL = zFor(FYX, false, 54, sxL);
  return { R: { elbow: [-118, -606, zR - 185], wrist: [-66, -612, zR], hand: 'flat' }, L: { elbow: [118, -606, zL - 185], wrist: [54, -612, zL], hand: 'flat' } };
}

export function state(T, M, t, shot) {
  const lamp = lampLevel(T, t), gold = goldLevel(T, t);
  const who = talker(T, t);
  const total = T.total;

  // ——— FY ———
  const pc = pageAt(T, t);
  const onFY = t > T.at('T01', 'end', .2) ? 1 : 0;
  const slideBack = seg(t, T.at('Y19', 'end', 1.6), T.at('Y20', 'start', -.25));
  const REST = [790, 845], ON = [pc[0] - 66, pc[0] - 16];
  let tab = REST;
  if (onFY && slideBack <= 0) tab = lerpV(REST, ON, ss(seg(t, T.at('T01', 'end', .1), T.at('T01', 'end', .7))));
  else if (slideBack > 0 && slideBack < 1) tab = ON;
  else if (slideBack >= 1) tab = lerpV(ON, REST, ss(seg(t, T.at('Y20', 'start', -.25), T.at('Y20', 'start', .4))));
  const fyArms = fyArmsTable(tab[0], tab[1]);
  const fyName = pose('_fy', 'sitLean', { R: fyArms.R, L: fyArms.L });
  const fyListen = who === 'TY' ? 1 : 0;
  const fyM = mouthAt(T, M, t, 'FY');
  const fyBlinkT = fyListen ? threes(t) : t;
  const fyB = blink(fyBlinkT, 11, [], 0, total);
  const fsc = sacc(t, 3, .035);
  const fyExpr = 'curious';
  const FY = {
    who: 'FY', pose: fyName, yaw: YAW + .06 * fyListen, x: FYX, y: 1250, s: S, light: [1, -.35], rim: P.rim, lwk: .95,
    expr: fyExpr, open: openOf(fyExpr, fyB, {}), E: {}, mouth: fyM ? fyM.shape : 'closed',
    look: [.55 + fsc[0], -.02 + fsc[1]],
    leanAdd: .03 + .006 * breath(t, .1, 3.2) + .02 * fyListen,
    headTilt: .01 * sway(t, 1) + .03 * accentAt(T, M, t, 'FY') - .015 * fyListen,
  };

  // ——— TY ———
  const zRest = 290;
  const tyName = pose('_ty', 'sitBack', {
    R: { elbow: [-132, -620, zRest - 190], wrist: [-60, -616, zRest], hand: 'flat' },
    L: { elbow: [134, -626, 100], wrist: [40, -616, 268], hand: 'flat' } });
  const tyListen = who === 'FY' ? 1 : 0;
  const tyM = mouthAt(T, M, t, 'TY');
  const tyB = blink(tyListen ? threes(t) : t, 23, [], 0, total);
  const tsc = sacc(t, 7, .03);
  const TY = {
    who: 'TY', pose: tyName, yaw: YAW + .06 * tyListen, x: TYX, y: 1250, s: S, mirror: true, light: [1, -.35], rim: P.rim, lwk: .95,
    expr: 'calm', open: openOf('calm', tyB, {}), E: {}, mouth: tyM ? tyM.shape : 'closed',
    look: [.4 + tsc[0], .05 + tsc[1]],
    leanAdd: .006 * breath(t, .55, 4.2) + .015 * tyListen,
    headTilt: .006 * breath(t, .7, 4.2) + .005 * sway(t, 2) + .014 * accentAt(T, M, t, 'TY') + .015 * tyListen,
  };

  // ——— the page in the room ———
  const page = { pts: flatPage(pc, .015), held: false };

  // ——— the camera: the setup for the shot + a slow push where the script asks for one ———
  const sh = SETUPS[shot.shot] || SETUPS.W;
  const u = seg(t, shot.t0, shot.t1);
  const pushLine = shot.line && T.L[shot.line] && /push/.test(LINE_CAMERA[shot.line] || '');
  const zk = pushLine ? lerp(1, 1.1, eio(u)) : shot.shot === 'W' ? lerp(1, 1.025, u) : lerp(1, 1.015, u);
  const camO = { z: sh[0] * zk, cx: sh[1], cy: sh[2] };

  // the phone lying on the table: lit while VN01 plays (the only light), dark afterwards
  const phone = { shown: true, x: 1118, y: 790, glow: t < T.at('VN01', 'end', .05) ? 1 : 0 };

  return { cam: camO, life: t, lamp, gold, FY, TY, page, phone, laptop: null, books: false, wave: 0 };
}

// camera notes from dialogue.json ("slow push-in" on T02 and T17), filled by film.js
export const LINE_CAMERA = {};
