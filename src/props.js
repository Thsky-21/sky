// Cel props in the same projection as the body rig (floor y = 0, z forward, yaw th): chair.
import { cel, poly, line, mix } from './cel.js';
import { proj } from './body.js';

const LW = 1.5;
// chair: seat top at y -355, seat z -60..+200, back rest behind (z -70)
export function chair(g, P, o) {
  const th = o.yaw ?? 0, s = o.s ?? .6, C = P.chair;
  g.save(); g.translate(o.x, o.y); if (o.mirror) g.scale(-1, 1); g.scale(s, s);
  const pr = p => { const q = proj(p, th); return [q[0], q[1]]; };
  const st = { f: C.f, s: C.s, h: C.h, l: C.l, lw: LW * 2.2 };
  const leg = (x, z) => cel(g, poly([pr([x - 10, -340, z]), pr([x + 10, -340, z]), pr([x + 10, 0, z]), pr([x - 10, 0, z])]), st);
  // back legs + back rest
  leg(-118, -66); leg(118, -66);
  const bk = [pr([-120, -800, -78]), pr([120, -800, -78]), pr([120, -560, -70]), pr([-120, -560, -70])];
  cel(g, poly(bk), { ...st, f: mix(C.f, C.h, .2) });
  leg(-118, -66 + 0); leg(-118, 196); leg(118, 196);
  const seat = [pr([-124, -360, -64]), pr([124, -360, -64]), pr([124, -360, 204]), pr([-124, -360, 204])];
  cel(g, poly(seat), { ...st, f: C.h });
  const front = [pr([-124, -360, 204]), pr([124, -360, 204]), pr([124, -330, 204]), pr([-124, -330, 204])];
  cel(g, poly(front), st);
  g.restore();
}
