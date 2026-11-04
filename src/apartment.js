// THE set for the whole film (Sky, 2026-11-04): one high-rise apartment at night, washed in golden lamp light, a
// floor-to-ceiling window onto the city with an elevated road far below, its traffic streaming in both directions.
// Painted plates (STYLE §2): airbrushed gradients and painted light, each with an emissive pair on `e` (only what
// really emits: lamps, cove light, city lights, traffic). Static parts are painted once at 2× and cached; the living
// parts (traffic, beacons, windows going on/off, an aircraft) are drawn per frame by windowLife().
import { canvas, rng, rgba, mix, airbrush, vgrad, TAU, poly, path, cel, line, hash } from './cel.js';
import { TOK } from './pal.js';

const { ink, midnight, slate, ivory, amber, teal, sage, rust } = TOK;
export const W = 1920, H = 1080;

// ——— the room's geometry (world px at camera zoom 1) ———
export const WIN = { x0: 300, x1: 1620, y0: 46, y1: 884 };   // the glass wall
export const HORIZON = 500;                                  // eye level of the seated pair
export const MULL = [630, 960, 1290];                        // mullions
export const FLOOR = 884;                                    // where the back wall meets the floor
export const PENDANT = [960, 196];                           // the globe pendant over the table
export const FLAMP = [150, 392];                             // the floor lamp's drum shade (screen left)
export const TABLE = { far: [660, 1260, 742], near: [616, 1304, 814], apron: 846 };
export const DLAMP = [1010, 744];                            // the brass desk lamp's base on the table
export const BULB = [964, 638];                              // its bulb

// colour models
const C = {
  skyTop: '#0B1024', skyMid: '#1A2142', skyLow: '#3A2C4A', glow: '#B4704C',
  far: '#1D2440', near: '#121729', ground: '#0C0F1E',
  wall: '#6E4C34', wallLit: '#C99560', wallDark: '#2E2018', ceil: '#24180F',
  floor: '#4A3020', floorLit: '#8C5A34', frame: '#17110C',
  gold: '#F2C27C', warm: '#FFD9A0', sodium: '#F0A050', head: '#FFF2D8', tail: '#FF4A3A',
  leaf: '#2E3A26', leafLit: '#6E7A3C', pot: '#C9B79C',
};

// ——— the city through the glass (static part) ———
function city(g, e) {
  const { x0, x1, y0, y1 } = WIN, w = x1 - x0, R = rng(7);
  g.save(); g.beginPath(); g.rect(x0, y0, w, y1 - y0); g.clip(); e.save(); e.beginPath(); e.rect(x0, y0, w, y1 - y0); e.clip();
  vgrad(g, x0, y0, w, HORIZON - y0, [[0, C.skyTop], [.55, C.skyMid], [.9, C.skyLow], [1, mix(C.skyLow, C.glow, .45)]]);
  airbrush(g, 960, HORIZON, 900, 120, C.glow, .35, .95);   // the city's own glow on the haze
  for (let k = 0; k < 40; k++) { g.fillStyle = rgba(ivory, .2 + R() * .45); const r = R() < .15 ? 1.6 : 1; g.fillRect(x0 + R() * w, y0 + R() * (HORIZON - y0) * .55, r, r); }
  // the moon, high in the right pane, soft in the haze
  airbrush(g, 1460, 150, 120, 120, mix(ivory, C.skyMid, .4), .25, .9); airbrush(e, 1460, 150, 80, 80, ivory, .18, .9);
  g.fillStyle = mix(ivory, amber, .12); g.beginPath(); g.arc(1460, 150, 22, 0, TAU); g.fill();
  g.fillStyle = rgba(mix(ivory, slate, .3), .5); g.beginPath(); g.arc(1453, 145, 6, 0, TAU); g.arc(1468, 158, 4, 0, TAU); g.fill();
  e.fillStyle = rgba(ivory, .5); e.beginPath(); e.arc(1460, 150, 24, 0, TAU); e.fill();
  // far towers above the horizon (the other side of the city), lit windows
  const lit = (x, y, ww, hh, p, a) => { for (let yy = y + 6; yy < y + hh - 4; yy += 9) for (let xx = x + 3; xx < x + ww - 3; xx += 7) if (R() < p) {
    const c = R() < .82 ? C.warm : mix(teal, ivory, .4); g.fillStyle = rgba(c, a); g.fillRect(xx, yy, 3, 4); e.fillStyle = rgba(c, a * .45); e.fillRect(xx - 1, yy - 1, 5, 6); } };
  for (let x = x0 - 20; x < x1; x += 20 + R() * 46) {
    const bw = 22 + R() * 46, bh = 40 + R() * 170 * (R() < .25 ? 1.6 : 1), top = HORIZON - bh;
    g.fillStyle = mix(C.far, C.skyLow, .25 + R() * .2); g.fillRect(x, top, bw, bh + 4);
    if (R() < .3) { g.fillRect(x + bw * .4, top - 18, 3, 18); }
    lit(x, top, bw, bh, .16, .7);
  }
  // looking down: the city floor below the horizon, darker toward us
  vgrad(g, x0, HORIZON, w, y1 - HORIZON, [[0, mix(C.near, C.skyLow, .35)], [.3, C.near], [1, C.ground]]);
  // street grid receding to the vanishing point: rows of sodium lamps
  for (let r = 0; r < 9; r++) {
    const v = Math.pow((r + 1) / 9, 1.8), y = HORIZON + 6 + v * 340, sp = 6 + v * 30;
    for (let x = x0 + (r % 2) * sp / 2; x < x1; x += sp) if (R() < .7) {
      const a = .4 + .5 * v; g.fillStyle = rgba(C.sodium, a); g.fillRect(x, y, 1.5 + v * 2, 1.5 + v * 1.5); e.fillStyle = rgba(C.sodium, a * .5); e.fillRect(x - 1, y - 1, 3 + v * 3, 3 + v * 3);
    }
  }
  // mid-distance blocks seen from above: rooftops (lighter tops), lit windows on their faces
  for (let k = 0; k < 46; k++) {
    const v = R(), y = HORIZON + 14 + v * v * 300, s = .4 + v * 1.4, bw = (30 + R() * 70) * s, bh = (20 + R() * 60) * s, x = x0 - 40 + R() * (w + 80);
    if (y > 620 && y < 700) continue;   // keep the road clear
    g.fillStyle = mix(C.near, C.far, .4); g.fillRect(x, y, bw, bh);
    g.fillStyle = mix(C.far, C.skyLow, .35); g.fillRect(x, y, bw, 3 + 4 * s);
    lit(x, y + 4 * s, bw, bh, .12, .65);
  }
  // the elevated road: a long gentle curve across the whole view, deck, rail, sodium masts
  const road = x => 650 + 18 * Math.sin((x - 300) / 700) - (x - 960) * .012;
  g.fillStyle = mix(C.ground, C.near, .5); g.beginPath(); for (let x = x0; x <= x1; x += 20) g.lineTo(x, road(x) + 26); for (let x = x1; x >= x0; x -= 20) g.lineTo(x, road(x) + 52); g.fill();   // the deck's shadowed side
  g.fillStyle = mix(C.near, C.far, .6); g.beginPath(); for (let x = x0; x <= x1; x += 20) g.lineTo(x, road(x) - 6); for (let x = x1; x >= x0; x -= 20) g.lineTo(x, road(x) + 26); g.fill();
  for (let x = x0 + 10; x < x1; x += 120) { g.fillStyle = mix(C.ground, C.near, .3); g.fillRect(x, road(x) + 50, 10, 120); }   // piers
  line(g, Array.from({ length: 68 }, (_, i) => [x0 + i * 20, road(x0 + i * 20) - 6]), rgba(ivory, .14), 1.2);
  line(g, Array.from({ length: 68 }, (_, i) => [x0 + i * 20, road(x0 + i * 20) + 26]), rgba(ivory, .1), 1.2);
  for (let x = x0 + 30; x < x1; x += 90) { const y = road(x) - 6; g.fillStyle = mix(C.ground, slate, .3); g.fillRect(x, y - 30, 2, 30);
    airbrush(g, x + 1, y - 30, 30, 20, C.sodium, .22, .8); airbrush(e, x + 1, y - 30, 12, 9, C.sodium, .6, .7); g.fillStyle = C.sodium; g.fillRect(x - 2, y - 32, 6, 3); }
  // a second road below, diagonal, coming toward us at the lower right
  g.fillStyle = mix(C.ground, C.near, .6); g.beginPath(); g.moveTo(1000, 730); g.lineTo(1080, 730); g.lineTo(x1 + 40, y1); g.lineTo(1340, y1); g.closePath(); g.fill();
  g.restore(); e.restore();
}
export const ROAD = x => 650 + 18 * Math.sin((x - 300) / 700) - (x - 960) * .012;

// ——— the golden room around the glass ———
function room(g, e) {
  const R = rng(19), { x0, x1, y0, y1 } = WIN;
  // back wall (left and right of the glass) + ceiling
  vgrad(g, 0, 0, W, FLOOR, [[0, C.ceil], [.06, mix(C.wall, C.ceil, .5)], [.45, C.wall], [1, mix(C.wall, C.wallDark, .45)]]);
  for (let k = 0; k < 30; k++) airbrush(g, R() * W, R() * FLOOR, 60 + R() * 120, 90 + R() * 160, R() < .5 ? C.wallLit : C.wallDark, .06, .9);
  // walnut slat panel on the left wall, behind the floor lamp
  for (let x = 12; x < x0 - 30; x += 22) { vgrad(g, x, 60, 16, FLOOR - 60, [[0, mix('#3E2618', C.ceil, .3)], [.5, '#5A3820'], [1, '#2E1C12']]); }
  // the floor lamp's light on the slats and the wall: a big warm pool
  airbrush(g, FLAMP[0], FLAMP[1], 360, 460, C.gold, .5, .95);
  airbrush(g, FLAMP[0], FLAMP[1] - 40, 160, 220, C.warm, .45, .9);
  // a framed abstract print on the right wall (no text): warm arcs on cream
  const fx = 1690, fy = 210, fw = 170, fh = 220;
  g.fillStyle = '#1C120A'; g.fillRect(fx - 8, fy - 8, fw + 16, fh + 16);
  g.fillStyle = mix(ivory, amber, .25); g.fillRect(fx, fy, fw, fh);
  g.fillStyle = mix(rust, amber, .35); g.beginPath(); g.arc(fx + fw * .45, fy + fh * .62, 52, Math.PI, 0); g.fill();
  g.fillStyle = mix(slate, midnight, .2); g.beginPath(); g.arc(fx + fw * .62, fy + fh * .62, 34, Math.PI, 0); g.fill();
  g.fillStyle = mix(amber, ivory, .1); g.beginPath(); g.arc(fx + fw * .3, fy + fh * .3, 16, 0, TAU); g.fill();
  g.fillStyle = mix(rust, ink, .3); g.fillRect(fx + 20, fy + fh * .62, fw - 40, 3);
  airbrush(g, fx + fw / 2, fy - 20, 160, 80, C.gold, .25, .9);   // picture light wash
  // window frame: deep reveal, slim mullions
  g.fillStyle = C.frame; g.fillRect(x0 - 16, y0 - 10, x1 - x0 + 32, y1 - y0 + 10);
  city(g, e);
  // glass: a faint cool sheen + the room's golden reflections ghosted in it
  g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
  for (const [a, b] of [[420, 620], [1100, 1240]]) { const gr = g.createLinearGradient(a, 0, b, 600); gr.addColorStop(0, rgba(ivory, 0)); gr.addColorStop(.5, rgba(ivory, .035)); gr.addColorStop(1, rgba(ivory, 0)); g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0); }
  airbrush(g, PENDANT[0] + 40, PENDANT[1] + 30, 70, 60, C.gold, .2, .9);   // the pendant's reflection
  airbrush(g, 420, 420, 90, 140, C.gold, .08, .9);                         // the floor lamp's, ghosted at the left edge
  g.restore();
  // mullions and the sill line
  for (const m of MULL) { g.fillStyle = C.frame; g.fillRect(m - 7, y0, 14, y1 - y0); g.fillStyle = rgba(C.gold, .18); g.fillRect(m - 7, y0, 3, y1 - y0); }
  g.fillStyle = C.frame; g.fillRect(x0 - 16, y1 - 22, x1 - x0 + 32, 22);
  // sheer curtains gathered at both ends of the glass, glowing gold where the lamps catch them
  for (const [cx, dir] of [[x0 + 50, 1], [x1 - 50, -1]]) {
    for (let k = 0; k < 9; k++) {
      const x = cx - dir * 50 + dir * k * 13 + (R() - .5) * 4, ww = 12 + R() * 8;
      const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, rgba(mix(ivory, amber, .5), .5)); gr.addColorStop(.5, rgba(mix(ivory, amber, .35), .32)); gr.addColorStop(1, rgba(mix(amber, rust, .3), .45));
      g.fillStyle = gr; g.beginPath(); g.moveTo(x, y0); g.bezierCurveTo(x + 6, y0 + 300, x - 6, y0 + 560, x + dir * 4, y1); g.lineTo(x + dir * 4 + ww, y1); g.bezierCurveTo(x + ww - 6, y0 + 560, x + ww + 6, y0 + 300, x + ww, y0); g.closePath(); g.fill();
    }
    airbrush(g, cx, 520, 70, 380, C.gold, .14, .9);
  }
  // curtain track + ceiling with a warm cove light running along the glass
  g.fillStyle = mix(C.ceil, ink, .3); g.fillRect(0, 0, W, y0 - 10);
  g.fillStyle = C.frame; g.fillRect(x0 - 30, y0 - 12, x1 - x0 + 60, 6);
  vgrad(g, 0, y0 - 16, W, 10, [[0, rgba(C.warm, 0)], [1, rgba(C.warm, .5)]]);
  airbrush(e, 960, y0 - 12, 1100, 18, C.gold, .4, .9);
  // floor: warm wood planks receding, the lamps' light pooled on it, the glass's cool reflection
  vgrad(g, 0, FLOOR, W, H - FLOOR, [[0, C.floor], [1, mix(C.floor, '#1A0F08', .5)]]);
  for (let k = -8; k <= 8; k++) { g.strokeStyle = rgba('#1A0F08', .28); g.lineWidth = 1.5; g.beginPath(); g.moveTo(960 + k * 110, FLOOR); g.lineTo(960 + k * 420, H + 200); g.stroke(); }
  airbrush(g, 960, FLOOR + 40, 760, 70, mix(C.skyMid, slate, .3), .4, .9);
  airbrush(g, FLAMP[0] + 60, FLOOR + 80, 300, 90, C.gold, .4, .9);
  airbrush(g, 960, FLOOR + 120, 520, 120, C.floorLit, .45, .9);
  g.fillStyle = rgba('#120A05', .5); g.fillRect(0, FLOOR - 3, W, 6);
  // the floor lamp (screen left): three slim walnut legs, a linen drum shade glowing
  const [lx, ly] = FLAMP;
  for (const [dx, a] of [[-46, .9], [40, .9], [0, .6]]) line(g, [[lx + dx * .2, ly + 70], [lx + dx, FLOOR + 30 + (dx === 0 ? -20 : 0)]], mix('#4A2E1A', ink, 1 - a), 6);
  line(g, [[lx, ly + 50], [lx, ly + 76]], '#2A1A10', 5);
  const shade = poly([[lx - 74, ly - 58], [lx + 74, ly - 58], [lx + 84, ly + 56], [lx - 84, ly + 56]]);
  g.fillStyle = mix(C.warm, ivory, .2); g.fill(shade);
  airbrush(g, lx, ly, 90, 60, '#FFF6E4', .55, .8);
  g.strokeStyle = rgba(mix(amber, rust, .4), .6); g.lineWidth = 2; g.stroke(shade);
  airbrush(e, lx, ly, 120, 90, C.gold, .9, .8); airbrush(e, lx, ly + 60, 70, 20, C.warm, .8, .7); airbrush(e, lx, ly - 60, 70, 18, C.warm, .6, .7);
  // a tall plant in a pale ceramic pot (screen right), its leaves edged by the lamplight
  const px = 1780, py = FLOOR + 20;
  cel(g, poly([[px - 70, py - 120], [px + 70, py - 120], [px + 56, py + 10], [px - 56, py + 10]]), { f: C.pot, s: mix(C.pot, '#5A4030', .5), l: '#3A2A1C', lw: 2, so: [-14, 0] });
  // long arching blades (a bird-of-paradise): each a curved stem, then a pointed leaf with a lit half and a midrib
  for (let k = 0; k < 11; k++) {
    const a = -Math.PI / 2 + (k / 10 - .5) * 1.9 + (R() - .5) * .25, len = 180 + R() * 220, sx = px + (R() - .5) * 40, sy = py - 120;
    const bend = (a + Math.PI / 2) * .35, ex = sx + Math.cos(a) * len, ey = sy + Math.sin(a) * len;
    line(g, [[sx, sy], [(sx + ex) / 2, (sy + ey) / 2 - 10], [ex, ey]], '#26301A', 3.5);
    const L = 150 + R() * 90, wd = 30 + R() * 14, ang = a + bend;
    g.save(); g.translate(ex, ey); g.rotate(ang);
    const leaf = new Path2D(); leaf.moveTo(0, 0); leaf.bezierCurveTo(L * .3, -wd, L * .75, -wd * .9, L, 0); leaf.bezierCurveTo(L * .75, wd * .8, L * .3, wd * .9, 0, 0);
    g.fillStyle = mix(C.leaf, '#1A2014', .3); g.fill(leaf);
    g.save(); g.clip(leaf); g.fillStyle = rgba(mix(C.leafLit, '#F2C27C', .25), .75); g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(L * .3, -wd, L * .75, -wd * .9, L, 0); g.closePath(); g.fill(); g.restore();
    g.strokeStyle = rgba('#141A0C', .75); g.lineWidth = 1.4; g.stroke(leaf);
    g.strokeStyle = rgba(mix(C.leafLit, ivory, .3), .5); g.lineWidth = 1.2; g.beginPath(); g.moveTo(4, 0); g.quadraticCurveTo(L * .5, -3, L - 6, 0); g.stroke();
    g.restore();
  }
  airbrush(g, px - 120, 600, 160, 320, C.gold, .12, .9);
  // the globe pendant over the table: a thin cord from the ceiling, an opal globe, its warm light on everything
  line(g, [[PENDANT[0], 0], [PENDANT[0], PENDANT[1] - 52]], '#0E0906', 2.5);
  g.fillStyle = '#2A1C10'; g.fillRect(PENDANT[0] - 9, PENDANT[1] - 58, 18, 12);
  airbrush(g, PENDANT[0], PENDANT[1] + 120, 600, 380, C.gold, .32, .95);
  airbrush(g, PENDANT[0], PENDANT[1], 160, 160, C.warm, .4, .85);
  g.fillStyle = mix('#FFF4DC', C.warm, .3); g.beginPath(); g.arc(PENDANT[0], PENDANT[1], 46, 0, TAU); g.fill();
  airbrush(g, PENDANT[0] - 10, PENDANT[1] - 10, 30, 30, '#FFFFFF', .6, .8);
  airbrush(e, PENDANT[0], PENDANT[1], 110, 100, C.gold, .45, .85); airbrush(e, PENDANT[0], PENDANT[1], 44, 44, '#FFF4DC', .6, .6);
  // corners fall away, the room's gold gathers in the middle
  airbrush(g, 0, H, 500, 300, '#0A0604', .5, .9); airbrush(g, W, H, 500, 300, '#0A0604', .5, .9);
  airbrush(g, W, 0, 400, 300, '#0A0604', .4, .9);
}

// the room with the lights still off: the same place lit only by the city through the glass
function roomDark(g, e) {
  const [cg, qg] = canvas(W, H), [ce, qe] = canvas(W, H);
  qe.fillStyle = '#000'; qe.fillRect(0, 0, W, H);
  city(qg, qe);
  const { x0, x1, y0, y1 } = WIN;
  // the interior: very dark midnight, the glass wall glowing faintly blue, a cool sheen across the floor
  vgrad(g, 0, 0, W, H, [[0, mix(ink, '#05070C', .5)], [.8, mix(ink, midnight, .25)], [1, '#06080E']]);
  g.drawImage(cg, 0, 0); e.drawImage(ce, 0, 0);
  for (const m of MULL) { g.fillStyle = '#05060A'; g.fillRect(m - 7, y0, 14, y1 - y0); }
  g.fillStyle = '#05060A'; g.fillRect(x0 - 16, y1 - 22, x1 - x0 + 32, 22); g.fillRect(0, 0, W, y0 - 10);
  for (const [cx] of [[x0 + 50], [x1 - 50]]) { g.fillStyle = rgba(mix(slate, ivory, .3), .14); g.fillRect(cx - 50, y0, 110, y1 - y0); }
  airbrush(g, 960, FLOOR + 80, 820, 120, mix(slate, teal, .3), .3, .9);
  // the floor lamp and the pendant as dark shapes
  line(g, [[PENDANT[0], 0], [PENDANT[0], PENDANT[1] - 52]], '#05060A', 2.5);
  g.fillStyle = rgba(mix(slate, ink, .5), .9); g.beginPath(); g.arc(PENDANT[0], PENDANT[1], 46, 0, TAU); g.fill();
  g.fillStyle = mix(ink, slate, .2); g.beginPath(); g.moveTo(FLAMP[0] - 74, FLAMP[1] - 58); g.lineTo(FLAMP[0] + 74, FLAMP[1] - 58); g.lineTo(FLAMP[0] + 84, FLAMP[1] + 56); g.lineTo(FLAMP[0] - 84, FLAMP[1] + 56); g.closePath(); g.fill();
}

// cached paintings: { g, e } canvases at k× (2× = 3840×2160 by default), drawn at world size under the camera.
// The film's close-ups zoom up to ~3×, so it asks for the golden plate at 3× (no bitmap upscaling in a CU).
const CACHE = {};
export function apartmentPlate(mode, k = 2) {
  const id = mode + k;
  if (CACHE[id]) return CACHE[id];
  const [cg, qg] = canvas(W * k, H * k), [ce, qe] = canvas(W * k, H * k);
  qe.fillStyle = '#000'; qe.fillRect(0, 0, W * k, H * k);
  qg.scale(k, k); qe.scale(k, k);
  if (mode === 'dark') roomDark(qg, qe); else room(qg, qe);
  return (CACHE[id] = { g: cg, e: ce });
}

// ——— the city alive (per frame, under the plate camera): traffic on the elevated road and the street below,
// tower beacons blinking, a few windows going on and off, an aircraft crossing ———
export function windowLife(g, e, t, k = 1) {
  const { x0, x1, y0, y1 } = WIN;
  for (const x of [g, e]) { x.save(); x.beginPath(); x.rect(x0, y0, x1 - x0, y1 - y0); x.clip(); }
  // the elevated road: near lane flows left (headlights toward the left: we see warm-white heads), far lane flows right (red tails)
  for (let i = 0; i < 26; i++) {
    const sp = 70 + hash(i * 3.3) * 50, ph = hash(i * 7.1) * 1600;
    const far = i % 2 === 0, x = far ? x0 - 60 + ((ph + t * sp) % (x1 - x0 + 120)) : x1 + 60 - ((ph + t * sp) % (x1 - x0 + 120));
    const y = ROAD(x) + (far ? 2 : 14), col = far ? C.tail : C.head, a = (far ? .85 : .95) * k;
    const len = far ? 10 : 12;
    g.fillStyle = rgba(col, a); g.fillRect(x, y, 3, 2); g.fillRect(x + 6, y, 3, 2);
    const gr = g.createLinearGradient(x + (far ? -len * 3 : len * 3), 0, x + 4, 0); gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(1, rgba(col, .35 * a));
    g.fillStyle = gr; g.fillRect(Math.min(x, x + (far ? -len * 3 : len * 3)), y - 1, len * 3 + 6, 4);
    e.fillStyle = rgba(col, .7 * a); e.fillRect(x - 3, y - 3, 15, 8);
    if (!far) { airbrush(g, x - 14, y + 1, 26, 5, C.head, .18 * k, .8); }
  }
  // the street below, diagonal toward us at the lower right: cars growing as they come closer
  for (let i = 0; i < 9; i++) {
    const u = ((t * (.045 + hash(i * 2.9) * .03) + hash(i * 5.7)) % 1), up = i % 3 === 0;
    const v = up ? 1 - u : u, x = 1040 + v * v * 520 + (up ? 30 : -10) * v, y = 732 + v * v * 160;
    const s = .6 + v * 2.2, col = up ? C.tail : C.head;
    g.fillStyle = rgba(col, .9 * k); g.fillRect(x, y, 2.5 * s, 1.8 * s); g.fillRect(x + 5 * s, y, 2.5 * s, 1.8 * s);
    e.fillStyle = rgba(col, .6 * k); e.fillRect(x - 2 * s, y - 2 * s, 11 * s, 6 * s);
  }
  // tower beacons, slow red blinks, out of step
  for (let i = 0; i < 6; i++) {
    const x = x0 + 80 + hash(i * 9.9) * (x1 - x0 - 160), y = HORIZON - 120 - hash(i * 4.4) * 170, on = ((t + hash(i) * 2) % 2) < .35;
    if (on) { g.fillStyle = rgba(C.tail, .9); g.fillRect(x, y, 3, 3); e.fillStyle = rgba(C.tail, .8); e.fillRect(x - 2, y - 2, 7, 7); airbrush(g, x + 1, y + 1, 8, 8, C.tail, .3, .8); }
  }
  // a few windows switching on and off
  for (let i = 0; i < 14; i++) {
    const x = x0 + hash(i * 5.3) * (x1 - x0), y = HORIZON - 30 - hash(i * 9.1) * 130, per = 4 + hash(i * 2.2) * 7;
    if (((t + hash(i) * per) % per) < per * .6) { g.fillStyle = rgba(C.warm, .8); g.fillRect(x, y, 3, 4); e.fillStyle = rgba(C.warm, .45); e.fillRect(x - 1, y - 1, 5, 6); }
  }
  // an aircraft, very far, crossing right to left with a strobe
  const ax = x1 + 40 - (t * 11) % (x1 - x0 + 200), ay = 120 + Math.sin(t * .1) * 4;
  g.fillStyle = rgba(ivory, .5); g.fillRect(ax, ay, 2, 2);
  if ((t % 1.3) < .1) { g.fillStyle = rgba(ivory, .95); g.fillRect(ax + 3, ay - 1, 3, 3); e.fillStyle = rgba(ivory, .8); e.fillRect(ax + 1, ay - 3, 7, 7); }
  for (const x of [g, e]) x.restore();
}

// ——— props on the table (drawn into the picture between the characters' base and arms layers) ———
// a walnut table, a soft gold pool under the lamp, a plain mug (no logo)
export function table(g, e, P, lit = 1) {
  const Wd = P.wood, st = { f: Wd.f, s: Wd.s, h: Wd.h, l: Wd.l, lw: 2.4 };
  const { far, near, apron } = TABLE;
  for (const [x, top] of [[near[0] + 30, apron], [near[1] - 30, apron]]) cel(g, poly([[x - 12, top], [x + 12, top], [x + 10, H + 200], [x - 10, H + 200]]), { ...st, f: Wd.s, sh: [[[x, top], [x + 12, top], [x + 10, H + 200], [x, H + 200]]] });
  cel(g, poly([[near[0], near[2]], [near[1], near[2]], [near[1] - 4, apron], [near[0] + 4, apron]]), { ...st, f: mix(Wd.f, Wd.s, .45), sh: [[[near[0], apron - 10], [near[1], apron - 10], [near[1], apron], [near[0], apron]]] });
  cel(g, poly([[far[0], far[2]], [far[1], far[2]], [near[1], near[2]], [near[0], near[2]]]), { ...st,
    hi: [[[860, far[2] + 4], [1120, far[2] + 4], [1150, near[2] - 8], [840, near[2] - 8]]] });
  // the top's sheen + the pendant's and the desk lamp's light pooled on it
  g.save(); g.beginPath(); g.moveTo(far[0], far[2]); g.lineTo(far[1], far[2]); g.lineTo(near[1], near[2]); g.lineTo(near[0], near[2]); g.closePath(); g.clip();
  airbrush(g, 960, 776, 400, 46, '#F2C27C', .3 * lit, .9);
  airbrush(g, 1080, 770, 170, 30, '#FFD9A0', .35 * lit, .85);
  for (let k = 0; k < 7; k++) { g.strokeStyle = rgba(Wd.l, .12); g.lineWidth = 1.2; g.beginPath(); g.moveTo(far[0] + 20, far[2] + 8 + k * 9); g.lineTo(far[1] - 20, far[2] + 9 + k * 9.5); g.stroke(); }
  g.restore();
}
// the brass desk lamp on the far edge of the table, its head turned down toward the middle; `on` 0..1
export function deskLamp(g, e, on = 1) {
  const [x, y] = DLAMP, brass = { f: '#B8894A', s: '#6E4E26', h: '#E8C38C', l: '#3A2410' };
  const st = { ...brass, lw: 2 };
  cel(g, (() => { const p = new Path2D(); p.ellipse(x, y, 30, 8, 0, 0, TAU); return p; })(), { ...st, so: [-6, 2] });
  line(g, [[x, y - 4], [x + 14, y - 80], [x - 10, y - 126]], brass.l, 7); line(g, [[x, y - 4], [x + 14, y - 80], [x - 10, y - 126]], brass.f, 4);
  // the shade: a brass cone opening down-left
  cel(g, poly([[x - 70, y - 92], [x - 22, y - 142], [x + 6, y - 122], [x - 30, y - 74]]), { ...st, f: mix(brass.f, '#2A1A0C', .25), hi: [[[x - 22, y - 142], [x + 6, y - 122], [x - 2, y - 116], [x - 26, y - 134]]] });
  if (on > 0) {
    g.fillStyle = rgba(mix('#FFF4DC', '#F2C27C', .3), on); g.beginPath(); g.ellipse(BULB[0], BULB[1] + 8, 26, 8, -.78, 0, TAU); g.fill();
    airbrush(e, BULB[0] - 6, BULB[1] + 14, 100, 70, '#F2C27C', .9 * on, .6); airbrush(e, BULB[0], BULB[1] + 8, 28, 16, '#FFF4DC', on, .5);
    airbrush(g, BULB[0] - 40, BULB[1] + 80, 160, 110, '#F2C27C', .16 * on, .9);   // the cone of light in the air (dusty)
  }
}
