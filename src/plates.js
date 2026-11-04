// Painted background plates (STYLE §2): soft airbrushed gradients and painted light, each with a matching emissive
// pair on `e` (only what really emits: lamp, windows, screens, door daylight). Colours from PLAN §6 tokens.
// The conversation room is ONE painted place whose light changes across the film (TREATMENT §1, §8).
import { canvas, rng, rgba, mix, airbrush, vgrad, TAU, poly, path, cel, line } from './cel.js';
import { TOK } from './pal.js';

const { ink, midnight, slate, ivory, amber, teal, sage, rust } = TOK;

// room colour models: one per lighting state
export const ROOM = {
  night: { wallTop: mix(ink, midnight, .55), wall: midnight, wallLow: mix(midnight, ink, .35), floor: [mix(ink, midnight, .3), ink],
    lampOn: 1, lampA: .34, sky: [ink, mix(midnight, slate, .45)], city: mix(slate, midnight, .5), cityLit: .9, door: 0, frame: mix(ink, midnight, .4), wood: '#3E2E24', sun: 0 },
  noreply: { wallTop: mix(ink, slate, .25), wall: mix(midnight, slate, .3), wallLow: mix(midnight, ink, .3), floor: [mix(ink, slate, .2), ink],
    lampOn: .55, lampA: .16, sky: [ink, mix(midnight, slate, .5)], city: mix(slate, midnight, .45), cityLit: .45, door: 0, frame: mix(ink, slate, .25), wood: '#3A3430', sun: 0, screen: 1 },
  morning: { wallTop: mix(midnight, sage, .45), wall: mix(sage, ivory, .2), wallLow: mix(sage, midnight, .35), floor: [mix(sage, midnight, .55), mix(midnight, ink, .3)],
    lampOn: .7, lampA: .14, sky: [mix(sage, ivory, .35), mix(ivory, amber, .45)], city: mix(slate, sage, .45), cityLit: 0, door: 1, frame: mix(midnight, sage, .35), wood: '#5E4634', sun: 1 },
};

// Bengaluru seen through a window or the door: low-rise blocks with water tanks, a few towers in haze, rain-tree canopies
function city(g, e, x0, y0, w, h, M, seed, morning) {
  const R = rng(seed);
  g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip(); e.save(); e.beginPath(); e.rect(x0, y0, w, h); e.clip();
  vgrad(g, x0, y0, w, h, [[0, M.sky[0]], [1, M.sky[1]]]);
  if (morning) { airbrush(g, x0 + w * .7, y0 + h * .85, w * .7, h * .5, amber, .35, .9); airbrush(e, x0 + w * .7, y0 + h * .85, w * .6, h * .4, mix(ivory, amber, .3), .5, .9); }
  else for (let k = 0; k < 14; k++) { g.fillStyle = rgba(ivory, .25 + R() * .3); g.fillRect(x0 + R() * w, y0 + R() * h * .4, 1.5, 1.5); }
  const far = mix(M.city, M.sky[1], .45), near = M.city;
  // far towers (haze)
  for (let x = x0 - 10; x < x0 + w; x += 26 + R() * 50) { const bw = 20 + R() * 34, bh = h * (.25 + R() * .3); g.fillStyle = far; g.fillRect(x, y0 + h - bh, bw, bh);
    if (!morning) for (let yy = y0 + h - bh + 8; yy < y0 + h - 6; yy += 11) for (let xx = x + 4; xx < x + bw - 4; xx += 8) if (R() < .12 * M.cityLit) { const c = R() < .8 ? amber : teal; g.fillStyle = rgba(c, .7); g.fillRect(xx, yy, 3, 4); e.fillStyle = rgba(c, .35); e.fillRect(xx, yy, 3, 4); } }
  // near low-rise blocks with water tanks
  for (let x = x0 - 20; x < x0 + w; x += 40 + R() * 60) { const bw = 50 + R() * 70, bh = h * (.12 + R() * .14), top = y0 + h - bh;
    g.fillStyle = near; g.fillRect(x, top, bw, bh);
    g.fillStyle = mix(near, M.sky[0], .15); g.fillRect(x + bw * .2, top - 12, 16, 12);
    if (!morning) for (let yy = top + 8; yy < y0 + h - 6; yy += 12) for (let xx = x + 5; xx < x + bw - 5; xx += 10) if (R() < .1 * M.cityLit) { g.fillStyle = rgba(amber, .75); g.fillRect(xx, yy, 4, 5); e.fillStyle = rgba(amber, .4); e.fillRect(xx, yy, 4, 5); } }
  // rain-tree canopies (morning: the trees catch the light)
  if (morning) for (let k = 0; k < 6; k++) { const tx = x0 + R() * w, ty = y0 + h + 4, r = 28 + R() * 34; const tc = mix(sage, midnight, .35);
    for (let j = 0; j < 5; j++) airbrush(g, tx + (R() - .5) * r * 1.6, ty - r * .4 + (R() - .5) * r * .4, r * (.6 + R() * .4), r * .45, tc, .95, .25);
    airbrush(g, tx, ty - r * .7, r * .7, r * .2, mix(sage, amber, .4), .6, .5); }
  g.restore(); e.restore();
}

export function roomPlate(g, e, mode, W = 1920, H = 1080) {
  const M = ROOM[mode], R = rng(11);
  const floorY = 900;
  vgrad(g, 0, 0, W, floorY, [[0, M.wallTop], [.55, M.wall], [1, M.wallLow]]);
  // painted wall texture: faint vertical plaster variation
  for (let k = 0; k < 40; k++) airbrush(g, R() * W, R() * floorY, 80 + R() * 160, 120 + R() * 200, R() < .5 ? M.wallTop : M.wallLow, .08, .9);
  // window behind the desk (with a hostel window grill)
  const wx = 760, wy = 160, ww = 420, wh = 400;
  g.fillStyle = M.frame; g.fillRect(wx - 18, wy - 18, ww + 36, wh + 44);
  city(g, e, wx, wy, ww, wh, M, 5, mode === 'morning');
  if (mode === 'morning') { e.fillStyle = rgba(mix(ivory, sage, .2), .14); e.fillRect(wx, wy, ww, wh); }
  g.fillStyle = M.frame; for (let k = 1; k < 6; k++) g.fillRect(wx + k * ww / 6 - 2, wy, 4, wh);
  g.fillRect(wx, wy + wh / 2 - 3, ww, 6); g.fillRect(wx + ww / 2 - 5, wy, 10, wh);
  vgrad(g, wx - 30, wy + wh + 14, ww + 60, 16, [[0, mix(M.frame, ivory, .12)], [1, M.frame]]);
  // window light band on the wall (morning)
  if (M.sun) { g.save(); g.globalAlpha = .12; g.filter = 'blur(10px)'; g.fillStyle = ivory; g.beginPath(); g.moveTo(wx + ww + 40, wy + 40); g.lineTo(wx + ww + 360, wy + 90); g.lineTo(wx + ww + 420, floorY); g.lineTo(wx + ww + 60, floorY); g.closePath(); g.fill(); g.restore(); }
  // door on the back wall, screen left (behind First-year)
  const dx = 90, dy = 190, dw = 300, dh = floorY - dy;
  g.fillStyle = mix(M.frame, ink, .2); g.fillRect(dx - 22, dy - 22, dw + 44, dh + 22);
  if (M.door) {
    // open: corridor + Bengaluru morning beyond
    city(g, e, dx, dy, dw, dh * .72, M, 9, true);
    g.fillStyle = mix(ivory, sage, .25); g.fillRect(dx, dy + dh * .72, dw, dh * .28);
    e.fillStyle = rgba(ivory, .3); e.fillRect(dx, dy, dw, dh * .72);
    g.fillStyle = mix(slate, sage, .4); g.fillRect(dx, dy + dh * .6, dw, 8); for (let k = 0; k < 9; k++) g.fillRect(dx + 8 + k * dw / 9, dy + dh * .6, 5, dh * .14);
    // the door leaf swung into the room
    g.fillStyle = mix(M.wood, midnight, .3); g.beginPath(); g.moveTo(dx + dw, dy); g.lineTo(dx + dw + 120, dy - 20); g.lineTo(dx + dw + 120, floorY + 40); g.lineTo(dx + dw, floorY); g.closePath(); g.fill();
    g.fillStyle = rgba(ink, .25); g.fillRect(dx + dw + 100, dy - 10, 20, dh + 40);
    // daylight spill across the floor
    g.save(); g.globalAlpha = .38; g.fillStyle = ivory; g.beginPath(); g.moveTo(dx, floorY); g.lineTo(dx + dw, floorY); g.lineTo(dx + dw + 520, H); g.lineTo(dx - 120, H); g.closePath(); g.fill(); g.restore();
    e.save(); e.globalAlpha = .08; e.fillStyle = ivory; e.beginPath(); e.moveTo(dx, floorY); e.lineTo(dx + dw, floorY); e.lineTo(dx + dw + 520, H); e.lineTo(dx - 120, H); e.closePath(); e.fill(); e.restore();
  } else {
    vgrad(g, dx, dy, dw, dh, [[0, mix(M.wood, ink, .45)], [1, mix(M.wood, ink, .6)]]);
    g.strokeStyle = rgba(ink, .5); g.lineWidth = 3; g.strokeRect(dx + 30, dy + 40, dw - 60, dh * .38); g.strokeRect(dx + 30, dy + dh * .5, dw - 60, dh * .42);
    g.fillStyle = mix(amber, ink, .45); g.beginPath(); g.arc(dx + dw - 36, dy + dh * .52, 8, 0, TAU); g.fill();
  }
  // shelf with plain book spines (no text)
  const sx = 1420, sy = 400;
  g.fillStyle = mix(M.wood, ink, .3); g.fillRect(sx, sy + 120, 300, 14);
  const BC = [slate, mix(rust, ink, .3), mix(sage, ink, .25), mix(ivory, midnight, .4), mix(teal, ink, .35), mix(amber, ink, .4)];
  for (let x = sx + 10; x < sx + 280;) { const bw = 16 + R() * 14, bh = 80 + R() * 38; g.fillStyle = mix(BC[Math.floor(R() * BC.length)], M.wall, mode === 'morning' ? .25 : .45); g.fillRect(x, sy + 120 - bh, bw, bh); x += bw + 2; }
  // ceiling fan (hostel)
  g.fillStyle = mix(M.frame, ink, .3); g.fillRect(956, 0, 8, 46);
  g.beginPath(); g.ellipse(960, 52, 26, 10, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(840, 56, 120, 9, .04, 0, TAU); g.fill(); g.beginPath(); g.ellipse(1080, 56, 120, 9, -.04, 0, TAU); g.fill();
  // lamp pool on the wall (painted light) + emissive pair
  if (M.lampOn) { airbrush(g, 1180, 560, 620, 420, amber, M.lampA, .95); airbrush(g, 1180, 620, 300, 220, mix(amber, ivory, .3), M.lampA * .8, .9); }
  // corners fall into ink
  airbrush(g, 0, 0, 700, 600, ink, mode === 'morning' ? .35 : .55, .9); airbrush(g, W, 0, 600, 500, ink, .4, .9);
  // floor
  vgrad(g, 0, floorY, W, H - floorY, [[0, M.floor[0]], [1, M.floor[1]]]);
  g.fillStyle = rgba(ink, .5); g.fillRect(0, floorY - 4, W, 8);
  for (let k = 0; k < 7; k++) { g.strokeStyle = rgba(ink, .25); g.lineWidth = 2; g.beginPath(); g.moveTo(960 + (k - 3) * 220, floorY); g.lineTo(960 + (k - 3) * 520, H); g.stroke(); }
  if (M.lampOn) airbrush(g, 1180, 1000, 500, 90, amber, M.lampA * .6, .9);
}

// desk in the wide room shot + the lamp + the sheet; cel props
export function desk(g, e, P, mode, o = {}) {
  const M = ROOM[mode];
  const W = P.wood, st = { f: W.f, s: W.s, h: W.h, l: W.l, lw: 2.4 };
  // legs
  for (const [x, y0] of [[660, 760], [1258, 760], [700, 720], [1222, 720]]) cel(g, poly([[x - 9, y0], [x + 9, y0], [x + 9, 1052], [x - 9, 1052]]), { ...st, f: W.s });
  cel(g, poly([[636, 748], [1284, 748], [1284, 792], [636, 792]]), { ...st, sh: [[[636, 776], [1284, 776], [1284, 792], [636, 792]]] });
  cel(g, poly([[664, 690], [1256, 690], [1284, 748], [636, 748]]), { ...st, f: W.f, h: W.h, hi: [[[1000, 690], [1256, 690], [1270, 720], [1060, 720]]] });
  if (M.lampOn) { g.save(); g.globalAlpha = .35 * M.lampOn; g.fillStyle = amber; g.beginPath(); g.ellipse(1080, 722, 220, 24, 0, 0, TAU); g.fill(); g.restore(); }
}
export function sheet(g, e, P, x = 956, y = 718, glow = .25) {
  cel(g, poly([[x - 58, y - 14], [x + 52, y - 16], [x + 62, y + 14], [x - 64, y + 16]]), { f: P.paper.f, s: P.paper.s, l: P.paper.l, lw: 1.6, sh: [[[x - 64, y + 10], [x + 62, y + 9], [x + 62, y + 14], [x - 64, y + 16]]] });
  e.fillStyle = rgba(ivory, glow); e.beginPath(); e.moveTo(x - 58, y - 14); e.lineTo(x + 52, y - 16); e.lineTo(x + 62, y + 14); e.lineTo(x - 64, y + 16); e.closePath(); e.fill();
}
export function lamp(g, e, P, mode, x = 1150, y = 704) {
  const M = ROOM[mode], m = P.metal, st = { f: m.f, s: m.s, h: m.h, l: m.l, lw: 2.2 };
  cel(g, (() => { const p = new Path2D(); p.ellipse(x, y, 34, 9, 0, 0, TAU); return p; })(), st);
  line(g, [[x, y - 4], [x + 20, y - 110], [x - 14, y - 160]], m.l, 7); line(g, [[x, y - 4], [x + 20, y - 110], [x - 14, y - 160]], m.f, 4);
  cel(g, poly([[x - 64, y - 128], [x - 20, y - 178], [x + 12, y - 158], [x - 6, y - 104]]), { ...st, f: mix(m.f, teal, .25) });
  if (M.lampOn) {
    g.fillStyle = mix(ivory, amber, .3); g.beginPath(); g.ellipse(x - 36, y - 116, 26, 9, -.75, 0, TAU); g.fill();
    airbrush(e, x - 40, y - 108, 90, 60, amber, .9 * M.lampOn, .6); airbrush(e, x - 36, y - 116, 26, 14, ivory, 1 * M.lampOn, .5);
  }
}
export function laptopAway(g, e, P, x = 1110, y = 712) {
  // laptop on Third-year's side, turned slightly away from First-year: lid back toward camera-left, screen light on him
  const m = P.metal, st = { f: m.f, s: m.s, h: m.h, l: m.l, lw: 2.2 };
  cel(g, poly([[x - 70, y], [x + 60, y - 6], [x + 84, y + 14], [x - 60, y + 22]]), { ...st, f: m.s });
  cel(g, poly([[x - 68, y + 2], [x - 40, y - 96], [x + 76, y - 110], [x + 60, y - 4]]), st);
  airbrush(e, x + 110, y - 60, 90, 70, teal, .4, .8);
}
// hostel desk 2024 background (build nights): navy wall, a pinboard of blank index cards, dark window, painted lamp light
export function hostel2024(g, e, W = 1920, H = 1080) {
  vgrad(g, 0, 0, W, H, [[0, mix(ink, midnight, .5)], [1, midnight]]);
  const R = rng(21);
  for (let k = 0; k < 30; k++) airbrush(g, R() * W, R() * H, 100 + R() * 200, 140 + R() * 200, R() < .5 ? ink : mix(midnight, slate, .3), .1, .9);
  // pinboard
  g.fillStyle = mix('#5A4634', midnight, .55); g.fillRect(1180, 160, 560, 380);
  for (let k = 0; k < 14; k++) { const x = 1200 + R() * 500, y = 180 + R() * 320; g.save(); g.translate(x, y); g.rotate((R() - .5) * .2); g.fillStyle = mix(ivory, midnight, .45); g.fillRect(0, 0, 70, 46); g.restore(); }
  // dark window
  g.fillStyle = mix(ink, midnight, .3); g.fillRect(80, 120, 420, 520); g.fillStyle = ink; g.fillRect(100, 140, 380, 480);
  for (let k = 0; k < 10; k++) { g.fillStyle = rgba(amber, .5); g.fillRect(110 + R() * 360, 400 + R() * 200, 3, 4); }
  // lamp light from the right, monitor teal from the lower left
  airbrush(g, 1500, 700, 700, 500, amber, .3, .95);
  airbrush(g, 200, 1000, 700, 400, teal, .3, .95); airbrush(e, 120, 1060, 360, 220, teal, .35, .9);
}
// campus edge, late afternoon (memory): muted-blue sky to warm amber, airbrushed clouds with lit undersides,
// a painted Bengaluru skyline in haze, a concrete parapet and faded campus green
export function campusEdge(g, e, W = 1920, H = 1080) {
  const R = rng(31);
  vgrad(g, 0, 0, W, 760, [[0, mix(slate, '#6E8AA0', .5)], [.55, mix('#9FB0B4', ivory, .3)], [1, mix(amber, ivory, .35)]]);
  for (let k = 0; k < 9; k++) { const cx = R() * W, cy = 120 + R() * 320, rx = 160 + R() * 240;
    airbrush(g, cx, cy, rx, rx * .28, mix(ivory, '#9FB0B4', .4), .75, .5); airbrush(g, cx, cy + rx * .1, rx * .8, rx * .12, mix(amber, ivory, .4), .7, .6); }
  airbrush(g, 1500, 700, 600, 220, mix(ivory, amber, .5), .55, .9); airbrush(e, 1500, 700, 400, 140, mix(ivory, amber, .5), .35, .9);
  // skyline in haze (generic shapes, no brands)
  for (let x = 380; x < W; x += 30 + R() * 50) { const bw = 26 + R() * 50, bh = 80 + R() * 230, base = 760; g.fillStyle = mix(slate, mix(amber, ivory, .4), .45 + R() * .15); g.fillRect(x, base - bh, bw, bh); }
  for (let x = 300; x < W; x += 40 + R() * 70) { const bw = 60 + R() * 90, bh = 40 + R() * 70; g.fillStyle = mix(slate, amber, .25); g.fillRect(x, 760 - bh, bw, bh); g.fillRect(x + 12, 760 - bh - 14, 18, 14); }
  // rain trees, faded campus green
  for (let k = 0; k < 9; k++) { const tx = R() * W, r = 60 + R() * 70; for (let j = 0; j < 6; j++) airbrush(g, tx + (R() - .5) * r * 2, 760 - r * .3 + (R() - .5) * r * .5, r * (.6 + R() * .5), r * .45, mix(sage, '#5E6B4E', .5), .95, .2); }
  // concrete parapet + campus ground
  vgrad(g, 0, 760, W, H - 760, [[0, mix('#9A958A', amber, .25)], [1, mix('#6E6A62', midnight, .2)]]);
  vgrad(g, 0, 820, W, 60, [[0, mix('#B8B2A4', amber, .3)], [1, mix('#8A857A', amber, .15)]]);
  g.fillStyle = rgba(ink, .25); g.fillRect(0, 876, W, 8);
  for (let x = 0; x < W; x += 240) { g.fillStyle = rgba(ink, .12); g.fillRect(x, 820, 4, 60); }
}
