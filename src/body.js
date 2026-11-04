// Sky's body rig — ONE rig for both versions (same height, shoulders, hands, build).
// 3D joints (x: character's left, y: down, z: forward; floor y = 0, height 1386 units = 7 heads), rotated by yaw
// (0 = front, ~0.8 = 3/4, π/2 = profile, ~2.3 = rear 3/4) and projected orthographically. Limbs are single tapered
// cel outlines, drawn far-to-near. The head art (sky.js) is chosen from the yaw.
import { cel, poly, line, mix, TAU, LWK } from './cel.js';
import { head, VIEWS } from './sky.js';

const LW = 1.5, LS = LW * .8;
export const proj = ([x, y, z], th) => [x * Math.cos(th) + z * Math.sin(th), y, z * Math.cos(th) - x * Math.sin(th)];
// smooth tapered outline through joints pts with widths ws, rounded ends
export function limbOutline(pts, ws, capA = .8, capB = .8) {
  const n = pts.length, Lt = [], Rt = [];
  const dir = i => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; };
  for (let i = 0; i < n; i++) { const [ux, uy] = dir(i), w = ws[i] / 2; Lt.push([pts[i][0] - uy * w, pts[i][1] + ux * w]); Rt.push([pts[i][0] + uy * w, pts[i][1] - ux * w]); }
  const [ax, ay] = dir(0), [bx, by] = dir(n - 1);
  const A = [pts[0][0] - ax * ws[0] / 2 * capA, pts[0][1] - ay * ws[0] / 2 * capA], B = [pts[n - 1][0] + bx * ws[n - 1] / 2 * capB, pts[n - 1][1] + by * ws[n - 1] / 2 * capB];
  return [A, ...Lt, B, ...Rt.reverse()];
}
const lerp3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// poses: joints per side (R: character's right, x < 0). lean = forward tilt of the upper body about the hips (rad).
export const POSES = {
  stand: { hip: -720, lean: 0,
    R: { elbow: [-150, -862, -14], wrist: [-158, -642, 8], hand: 'hang', knee: [-66, -380, 6], ankle: [-62, -62, -8] },
    L: { elbow: [150, -862, -14], wrist: [158, -642, 8], hand: 'hang', knee: [66, -380, 6], ankle: [62, -62, -8] } },
  // First-year: both hands on the backpack straps
  standStraps: { hip: -720, lean: 0, pack: true,
    R: { elbow: [-148, -884, -24], wrist: [-90, -1004, 74], hand: 'grip', knee: [-70, -380, 8], ankle: [-74, -62, -4] },
    L: { elbow: [148, -884, -24], wrist: [90, -1004, 74], hand: 'grip', knee: [64, -382, 0], ankle: [56, -62, -14] } },
  // Third-year: one hand in the pocket, the teal notebook in the other
  standPocket: { hip: -720, lean: 0, hipShift: 8,
    R: { elbow: [-154, -862, -6], wrist: [-146, -648, 22], hand: 'book', knee: [-72, -380, 4], ankle: [-78, -62, -6] },
    L: { elbow: [164, -858, -40], wrist: [116, -706, 44], hand: 'pocket', knee: [60, -384, 10], ankle: [50, -62, 6] } },
  walk: { hip: -716, lean: .05,
    R: { elbow: [-132, -862, 56], wrist: [-126, -650, 140], hand: 'hang', knee: [-64, -392, 150], ankle: [-60, -70, 180] },
    L: { elbow: [132, -866, -66], wrist: [130, -652, -146], hand: 'hang', knee: [64, -380, -50], ankle: [60, -110, -240] } },
  // at the desk (seat top 355, desk top 590): First-year on the chair edge, forearms on the desk
  sitLean: { hip: -435, lean: .26, seated: true,
    R: { elbow: [-116, -606, 250], wrist: [-60, -612, 430], hand: 'flat', knee: [-74, -470, 250], ankle: [-74, -60, 210] },
    L: { elbow: [116, -606, 250], wrist: [52, -612, 440], hand: 'flat', knee: [74, -470, 250], ankle: [70, -60, 280] } },
  // Third-year: back in the chair, elbows near the desk, hands loosely together
  sitBack: { hip: -435, lean: -.08, seated: true,
    R: { elbow: [-134, -640, 120], wrist: [-40, -626, 300], hand: 'clasp', knee: [-74, -470, 250], ankle: [-80, -60, 280] },
    L: { elbow: [134, -640, 120], wrist: [24, -630, 310], hand: 'clasp', knee: [74, -470, 250], ankle: [74, -60, 260] } },
  // Third-year at 169 s: leans forward into the lamp for the first time
  sitForward: { hip: -435, lean: .34, seated: true,
    R: { elbow: [-110, -606, 290], wrist: [-40, -612, 460], hand: 'clasp', knee: [-74, -470, 250], ankle: [-74, -60, 230] },
    L: { elbow: [110, -606, 290], wrist: [24, -616, 466], hand: 'clasp', knee: [74, -470, 250], ankle: [70, -60, 250] } },
  // seated, no desk (model sheet): hands on the thighs
  sitKnees: { hip: -435, lean: .06, seated: true,
    R: { elbow: [-140, -600, 60], wrist: [-100, -490, 210], hand: 'rest', knee: [-80, -470, 250], ankle: [-82, -60, 250] },
    L: { elbow: [140, -600, 60], wrist: [100, -490, 216], hand: 'rest', knee: [80, -470, 250], ankle: [82, -60, 270] } },
};

// hands: an adult hand about the length of the face, drawn as a palm, four separate tapered fingers with a soft
// bend and a two-joint thumb (smooth outlines, no mitten). x runs along the forearm from the wrist; the thumb is on -y.
const PALM = [[-6, -20], [22, -24], [48, -25], [60, -20], [64, -4], [62, 14], [52, 22], [24, 23], [-6, 20]];
const FINGERS = [[16, 40, 11], [6, 52, 12], [-5, 56, 12.5], [-15, 50, 12.5]];   // pinky → index: [knuckle y, length, width]
export function handShape(g, P, w, ang, type, st) {
  const t = type === 'rest' ? 'flat' : type === 'book' ? 'grip' : type;
  g.save(); g.translate(w[0], w[1]); g.rotate(ang);
  const S = { f: P.skin.f, s: P.skin.s, l: P.skin.l, lw: LS * 1.5, so: [st.so[0] * .4, st.so[1] * .4], rim: st.rim };
  const fl = mix(P.skin.l, P.skin.f, .35);
  if (t === 'hang' || t === 'flat') {
    const bend = t === 'hang' ? 7 : 2;
    for (const [y, len, wd] of FINGERS) {
      const k0 = [56, y], m = [56 + len * .55, y + bend * .4 + y * .06], tip = [56 + len, y + bend + y * .14];
      cel(g, limbOutline([k0, m, tip], [wd + 1, wd * .9, wd * .78], .3, 1), S);
      line(g, [[m[0] - 2, m[1] - wd * .28], [m[0] + 1, m[1] + wd * .28]], fl, LS * .8);   // middle joint
    }
    cel(g, PALM, S);
    cel(g, limbOutline([[14, -16], [32, -32], [50, -38]], [21, 16, 13], .4, 1), S);   // thumb
    line(g, [[24, -6], [46, -10]], fl, LS * .8);
  } else {
    // curled: knuckle rolls (clasp: fingers folded over the other hand; grip: a loose fist), thumb laid along the top
    const reach = t === 'clasp' ? 80 : 66;
    cel(g, PALM, S);
    for (const [y, , wd] of FINGERS) { cel(g, limbOutline([[46, y * 1.05], [reach - 10, y * 1.05 + 2]], [wd + 3, wd + 3], .3, .95), { ...S, so: null }); line(g, [[reach - 22, y * 1.05 - wd * .3], [reach - 20, y * 1.05 + wd * .35]], fl, LS * .7); }
    cel(g, limbOutline([[12, -18], [36, -28], [58, -26]], [21, 16, 13], .4, 1), S);
  }
  g.restore();
}

// figure(g, P, o): o = { who:'FY'|'TY', pose, yaw, x, y (floor point on screen), s (scale), mirror, expr, look,
// light:[lx,ly] (local, + = toward the facing side), rim, ph, layer:'all'|'base'|'arms', hoodie, headView, headTilt, leanAdd }
export function figure(g, P, o) {
  const who = o.who || 'FY', pose = POSES[o.pose || 'stand'], th = o.yaw ?? 0;
  const s = o.s ?? .6, layer = o.layer || 'all';
  const lx = o.light?.[0] ?? 1, ly = o.light?.[1] ?? -.6;
  const rb = o.rimBack ? -1 : 1, st = { so: [lx * 22, ly * 14], rim: o.rim ? { c: o.rim, d: [-lx * 5 * rb, -ly * 3 * rb] } : null };
  g.save(); g.translate(o.x, o.y); if (o.mirror) g.scale(-1, 1); g.scale(s, s);
  const kk = LWK.k; LWK.k = (o.lwk ?? 1) * 1.15 / s;
  const hipY = pose.hip, lean = (pose.lean || 0) + (o.leanAdd || 0), dy0 = hipY + 720;
  const up = ([x, y, z]) => { const h = hipY - y; return h <= 0 ? [x, y, z] : [x, hipY - h * Math.cos(lean), z + h * Math.sin(lean)]; };
  const hs = pose.hipShift || 0;
  const pr = p => { const q = proj(p, th); return [q[0], q[1]]; };
  const torsoLv = [[-1150, 36, 34, 0], [-1128, 98, 52, 0], [-1100, 146, 62, 0], [-1040, 138, 70, 4], [-970, 128, 74, 8], [-850, 108, 64, 4], [-740, 112, 68, 0], [-660, 116, 72, -4]];
  const lv = torsoLv.map(([y, a, b, c]) => ({ p: pr(up([hs, y + dy0, c])), e: Math.sqrt((a * Math.cos(th)) ** 2 + (b * Math.sin(th)) ** 2) }));
  const J = side => { const sg = side === 'R' ? -1 : 1, Q = pose[side];
    return { sg, sh: up([sg * 118 + hs, -1074 + dy0, 0]), elbow: Q.elbow, wrist: Q.wrist, hand: Q.hand, hip: [sg * 66 + hs, hipY + 10, 0], knee: Q.knee, ankle: Q.ankle }; };
  const R = J('R'), Lf = J('L');
  const dep = p => proj(p, th)[2];
  const near = dep(R.sh) >= dep(Lf.sh) ? R : Lf, far = near === R ? Lf : R;
  const C = who === 'FY'
    ? { top: o.hoodie ? P.hoodie : P.tee1, sleeve: o.hoodie ? 'long' : 'short', legs: P.jeans, shoe: P.shoe1, hem: -726 }
    : { top: P.over, sleeve: 'pushed', legs: P.jeans3, shoe: P.shoe3, hem: -708 };
  const sty = c => ({ f: c.f, s: c.s, h: c.h, l: c.l, lw: LW * 1.6, so: st.so, rim: st.rim });
  const skinSt = { ...sty(P.skin), lw: LS * 1.7 };

  const leg = J0 => {
    const a = pr(J0.hip), b = pr(J0.knee), c = pr(J0.ankle);
    cel(g, limbOutline([a, b, c], [110, 82, 64]), sty(C.legs));
    const m = lerp3(b, c, .12); line(g, [[m[0] - 10, m[1] - 4], [m[0] + 8, m[1] + 2]], C.legs.l, LW);
    const heel = pr([J0.ankle[0], -22, J0.ankle[2] - 30]), toe = pr([J0.ankle[0], -22, J0.ankle[2] + 112]);
    if (Math.abs(toe[0] - heel[0]) < 50) {   // seen from the front: the toe cap
      const cx = (heel[0] + toe[0]) / 2;
      cel(g, [[cx - 40, -30], [cx - 30, -58], [cx + 30, -58], [cx + 40, -30], [cx + 36, -6], [cx - 36, -6]], sty(C.shoe));
      cel(g, poly([[cx - 40, -14], [cx + 40, -14], [cx + 38, 0], [cx - 38, 0]]), sty(P.sole));
    } else {
      const sg = Math.sign(toe[0] - heel[0]);
      cel(g, limbOutline([heel, toe], [56, 44], .9, 1), sty(C.shoe));
      cel(g, poly([[heel[0] - 28 * sg, -8], [toe[0] + 20 * sg, -8], [toe[0] + 18 * sg, 4], [heel[0] - 26 * sg, 4]]), sty(P.sole));
    }
  };
  const arm = (J0, part) => {
    const a = pr(J0.sh), b = pr(J0.elbow), c0 = pr(J0.wrist);
    const c = J0.hand === 'pocket' ? lerp3(b, c0, .78) : c0;
    if (part !== 'fore') {
      if (C.sleeve === 'short') { cel(g, limbOutline([a, b], [68, 58]), skinSt); cel(g, limbOutline([a, lerp3(a, b, .48)], [86, 80], .8, .05), sty(C.top)); }
      else cel(g, limbOutline([a, b], [86, 76]), sty(C.top));
    }
    if (part !== 'upper') {
      cel(g, limbOutline([b, c], [58, 44], .8, .15), skinSt);
      if (C.sleeve === 'long') cel(g, limbOutline([b, lerp3(b, c, .9)], [78, 62], .8, .1), sty(C.top));
      if (C.sleeve === 'pushed') { const m = lerp3(b, c, .3); cel(g, limbOutline([b, m], [80, 74], .8, .1), sty(C.top)); cel(g, limbOutline([lerp3(b, c, .2), m], [78, 76], .2, .2), { ...sty(C.top), f: C.top.h }); }
      const ang = Math.atan2(c[1] - b[1], c[0] - b[0]);
      if (J0.hand === 'pocket') { const pk = pr([J0.sg * 96 + hs, -700 + dy0, 50]); line(g, [[pk[0] - 26, pk[1] - 30], [pk[0] + 4, pk[1] + 26]], C.legs.l, LW * 1.4); }
      else if (J0.hand === 'book') { g.save(); g.translate(c[0], c[1]); g.rotate(ang + .12); cel(g, poly([[6, -34], [176, -40], [182, 34], [10, 40]]), { ...sty(P.teal), lw: LW * 1.6 }); line(g, [[10, -24], [178, -30]], P.teal.l, LW); g.restore(); handShape(g, P, c, ang, 'grip', st); }
      else handShape(g, P, c, ang, J0.hand, st);
    }
  };
  const pack = () => {
    if (!pose.pack || (Math.abs(Math.sin(th)) < .2 && Math.cos(th) > 0)) return;
    if (Math.cos(th) < 0) { const t2 = pr(up([0, -1096 + dy0, -60])), b2 = pr(up([0, -760 + dy0, -110])); cel(g, [[t2[0] - 96, t2[1] + 10], [t2[0] + 90, t2[1]], [b2[0] + 104, b2[1] - 10], [b2[0] + 90, b2[1] + 24], [b2[0] - 100, b2[1] + 26], [b2[0] - 110, b2[1]]], sty(P.pack)); line(g, [[t2[0] - 60, t2[1] + 90], [t2[0] + 60, t2[1] + 84]], P.pack.l, LW); return; }
    const t1 = pr(up([0, -1090 + dy0, -64])), b1 = pr(up([0, -770 + dy0, -96]));
    const dx = -Math.sin(th) * 100;
    cel(g, [[t1[0] + dx - 64, t1[1] + 10], [t1[0] + dx + 36, t1[1] - 6], [b1[0] + dx + 50, b1[1]], [b1[0] + dx - 6, b1[1] + 16], [b1[0] + dx - 78, b1[1] + 6]], sty(P.pack));
    line(g, [[t1[0] + dx - 40, t1[1] + 60], [b1[0] + dx - 40, b1[1] - 30]], P.pack.l, LW);
  };
  const front = (y, x = 0, z = 74) => pr(up([x + hs, y + dy0, z]));
  const torso = () => {
    const pelvis = [lv[5], lv[6], lv[7]];
    cel(g, [...pelvis.map(L => [L.p[0] - L.e, L.p[1]]), ...pelvis.slice().reverse().map(L => [L.p[0] + L.e, L.p[1]])], sty(C.legs));
    const hemP = pr(up([hs, C.hem + dy0, 0]));
    const T = lv.slice(0, 7);
    const lft = T.map((L, i) => [L.p[0] - L.e * 1.03, i === 6 ? hemP[1] : L.p[1]]), rgt = T.map((L, i) => [L.p[0] + L.e * 1.03, i === 6 ? hemP[1] : L.p[1]]);
    lft[0] = [T[0].p[0] - T[0].e, T[0].p[1]]; rgt[0] = [T[0].p[0] + T[0].e, T[0].p[1]];
    cel(g, [...lft, ...rgt.reverse()], { ...sty(C.top), sh: [[[lv[6].p[0] - 200, hemP[1] - 18], [lv[6].p[0] + 200, hemP[1] - 18], [lv[6].p[0] + 200, hemP[1] + 10], [lv[6].p[0] - 200, hemP[1] + 10]]] });
    const cs = Math.cos(th), sn = Math.sin(th);
    if (who === 'TY') {
      if (cs > -.2) {   // open overshirt over the dark tee, teal-stitched pocket
        const bw = 34 * Math.abs(cs) + 5, a = front(-1146), b = front(C.hem + 16);
        if (Math.abs(cs) > .3) cel(g, poly([[a[0] - bw, a[1]], [a[0] + bw, a[1]], [b[0] + bw + 8, b[1]], [b[0] - bw - 8, b[1]]]), { ...sty(P.tee3), so: null });
        line(g, [[a[0] - bw, a[1] + 4], [b[0] - bw - 8, b[1]]], C.top.l, LW * 1.4); line(g, [[a[0] + bw, a[1] + 4], [b[0] + bw + 8, b[1]]], C.top.l, LW * 1.4);
        const pk = front(-990, -70, 66), pw = 30 * Math.max(.45, Math.abs(Math.cos(th - .35)));
        cel(g, poly([[pk[0] - pw, pk[1] - 28], [pk[0] + pw, pk[1] - 28], [pk[0] + pw, pk[1] + 30], [pk[0] - pw, pk[1] + 30]]), { f: C.top.f, s: C.top.s, l: P.teal.s, lw: LW * 1.2 });
        cel(g, poly([[pk[0] - pw - 2, pk[1] - 34], [pk[0] + pw + 2, pk[1] - 34], [pk[0] + pw + 2, pk[1] - 18], [pk[0] - pw - 2, pk[1] - 18]]), { f: C.top.h, l: P.teal.f, lw: LW * 1.2 });
      }
      const w0 = lv[5].p; line(g, [[w0[0] + lv[5].e * .3, w0[1] - 20], [w0[0] + lv[5].e * .7, w0[1] + 6]], C.top.l, LW); line(g, [[w0[0] - lv[5].e * .7, w0[1] + 30], [w0[0] - lv[5].e * .3, w0[1] + 50]], C.top.l, LW);
    } else if (!o.hoodie) {
      if (cs > -.2) {   // amber first-year lanyard, blank card
        const a = front(-1150, 0, 40), card = front(-950), nw = 30 * Math.abs(cs) + 6;
        if (Math.abs(sn) > .92) line(g, [[a[0] + 10, a[1] + 2], [card[0], card[1] - 30]], P.amber.f, 5);
        else { line(g, [[a[0] - nw, a[1] + 2], [card[0] - 4, card[1] - 30]], P.amber.f, 5); line(g, [[a[0] + nw, a[1] + 2], [card[0] + 4, card[1] - 30]], P.amber.f, 5); }
        const cw = 26 * Math.max(.28, Math.abs(cs));
        cel(g, poly([[card[0] - cw, card[1] - 30], [card[0] + cw, card[1] - 30], [card[0] + cw, card[1] + 36], [card[0] - cw, card[1] + 36]]), { f: P.card.f, s: P.card.s, sh: [[[card[0] - cw, card[1] + 22], [card[0] + cw, card[1] + 22], [card[0] + cw, card[1] + 36], [card[0] - cw, card[1] + 36]]], l: P.card.l, lw: LW * 1.2 });
        cel(g, poly([[card[0] - 7, card[1] - 40], [card[0] + 7, card[1] - 40], [card[0] + 7, card[1] - 26], [card[0] - 7, card[1] - 26]]), { f: P.amber.s, l: P.amber.l, lw: LW });
      }
      const w0 = lv[5].p; line(g, [[w0[0] - lv[5].e * .6, w0[1] + 20], [w0[0] - lv[5].e * .2, w0[1] + 40]], C.top.l, LW);
    } else { const a = front(-1140), b = front(C.hem); line(g, [[a[0] + 6, a[1]], [b[0] + 8, b[1]]], C.top.l, LW * 1.2); }
    if (pose.pack) for (const sg of [-1, 1]) {
      if (dep(up([sg * 96, -960 + dy0, 76])) < -40) continue;
      const a = pr(up([sg * 74 + hs, -1146 + dy0, 30])), b = pr(up([sg * 96 + hs, -980 + dy0, 76])), c = pr(up([sg * 108 + hs, -860 + dy0, 60]));
      cel(g, limbOutline([a, b, c], [30, 30, 26]), { f: P.amber.f, s: P.amber.s, l: P.amber.l, lw: LW * 1.3, so: st.so });
    }
  };
  const doHead = () => {
    const nb = lv[0].p, yawA = ((th % TAU) + TAU) % TAU;
    const view = o.headView || (yawA < .3 || yawA > TAU - .3 ? 'front' : yawA < 1.15 ? 'q' : yawA < 1.95 ? 'side' : 'back');
    const V = VIEWS[view];
    const HO = { who, view, expr: o.expr, look: o.look, light: o.light || [1, -.6], rim: o.rim, rimBack: o.rimBack, ph: o.ph, E: o.E, open: o.open, mouth: o.mouth, grow: o.grow };
    const at = () => { g.translate(nb[0], nb[1] + 4); g.rotate(o.headTilt || 0); g.translate(-V.neckX, -148); };
    g.save(); at(); head(g, P, { ...HO, stage: 'back' }); g.restore();
    const cw = lv[0].e + 6;
    if (who === 'FY' && !o.hoodie) cel(g, [[nb[0] - cw, nb[1] - 6], [nb[0], nb[1] + 16], [nb[0] + cw, nb[1] - 6], [nb[0] + cw + 7, nb[1] + 5], [nb[0], nb[1] + 28], [nb[0] - cw - 7, nb[1] + 5]], sty(C.top));
    if (who === 'TY') { const f = Math.sin(th) * 20; cel(g, poly([[nb[0] - cw - 10, nb[1] - 18], [nb[0] - 8 + f, nb[1] + 34], [nb[0] - cw - 16, nb[1] + 26]]), sty(P.over)); cel(g, poly([[nb[0] + cw + 10, nb[1] - 18], [nb[0] + 8 + f, nb[1] + 34], [nb[0] + cw + 16, nb[1] + 26]]), sty(P.over)); }
    if (who === 'FY' && o.hoodie) cel(g, [[nb[0] - cw - 16, nb[1] - 2], [nb[0] - 34, nb[1] - 44], [nb[0] + 34, nb[1] - 44], [nb[0] + cw + 16, nb[1] - 2], [nb[0], nb[1] + 26]], sty(P.hoodie));
    g.save(); at(); head(g, P, { ...HO, stage: 'front' }); g.restore();
  };

  if (layer !== 'arms') {
    arm(far, layer === 'base' ? 'upper' : 'all');
    leg(far);
    if (!pose.seated) leg(near);
    if (Math.cos(th) >= 0) pack();
    torso();
    if (Math.cos(th) < 0) pack();
    if (pose.seated) leg(near);
    doHead();
    arm(near, layer === 'base' ? 'upper' : 'all');
  } else { arm(far, 'fore'); arm(near, 'fore'); }
  LWK.k = kk;
  g.restore();
}
