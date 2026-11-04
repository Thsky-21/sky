// Sky — ONE head function and ONE body rig shared by First-year (who:'FY') and Third-year (who:'TY').
// Same face geometry, eyes, nose, mouth, ears, skin, hairline, height and build for both (CHARACTER_BIBLE §3).
// Only these differ: clothes, accent colour, hair length (o.grow), default lids/brows, posture.
// Construction follows STYLE §2 (80s cel): sphere + jaw head, almond eyes at the vertical middle, thick upper lid line,
// long thin brows, nose = shadow plane + one stroke, hair as locks with sharp tips over a dark under-layer + angel ring.
// Head local units: cranium centre (0,0), radius 80; top -80, eyes +24, nose base +58, mouth +80, chin +118.
// Unmirrored drawings face screen RIGHT. Draw with g.scale(-1,1) to face left (figure() does it with o.mirror).
import { cel, path, poly, ribbon, line, TAU, rgba, mix, LWK } from './cel.js';

const LW = 1.5, LS = LW * .8, LH = LW * 1.05;

// ——— expressions (identical construction on both faces) ———
// open: lid opening, lid: upper lid lowered, brow: [inner dy, outer dy, arch] (+ = down), browN / browF override the
// near / far brow, mouth: shape, look: [x toward facing side, y down], shoulders: + = dropped
export const EXPR = {
  neutral: { open: 1, lid: .1, brow: [0, 0, 1.5], mouth: 'closed' },
  // First-year
  curious: { open: 1.06, lid: 0, brow: [-3.5, -2.5, 2.4], mouth: 'closed', look: [.3, 0] },
  excited: { open: 1.12, lid: -.06, brow: [-6.5, -5, 3.2], mouth: 'smileopen', look: [.3, -.05], shoulders: -6 },
  confused: { open: .94, lid: .16, browN: [-6, -1, 2.2], browF: [1.5, .5, 1], mouth: 'side', look: [.2, .05] },
  disappointed: { open: .8, lid: .4, brow: [-5, 3.5, .8], mouth: 'down', look: [.05, .6], shoulders: 8 },
  // Third-year
  calm: { open: .94, lid: .22, brow: [.5, 0, 1.2], mouth: 'closed', look: [.2, 0] },
  defensive: { open: .9, lid: .22, brow: [3.5, -.5, .4], mouth: 'pressed', look: [-.55, .05], shoulders: -2 },
  thoughtful: { open: .7, lid: .44, brow: [-2, .8, 1], mouth: 'pressed', look: [.15, .7] },
  empathetic: { open: 1, lid: .1, brow: [-3.8, 1.2, 1.6], mouth: 'softsmile', look: [.3, 0] },
  // shared extras
  talk: { open: 1, lid: .12, brow: [-1, -.5, 1.6], mouth: 'talk', look: [.3, 0] },
  determined: { open: .96, lid: .2, brow: [1.5, -.5, 1], mouth: 'closed', look: [.3, 0] },
  blink: { open: 0, lid: 0, brow: [0, 0, 1.5], mouth: 'closed' },
};
// the default face of each version (bible §3: First-year lids slightly more open, brows slightly raised)
const BIAS = { FY: { open: .04, browDy: -1.2 }, TY: { open: 0, browDy: 0 } };

// ——— eyes ———
function eye(g, P, cx, cy, w, h, dir, fs, E) {
  const open = Math.max(0, E.open ?? 1), lid = E.lid || 0, W2 = w / 2, lash = P.lash;
  const X = u => cx + dir * u * W2;              // u: -1 inner corner → +1 outer corner
  const inY = cy + h * .14, outY = cy + h * .0 - (E.smileEyes ? h * .05 : 0);
  const topY = cy - h * .5 * open + lid * h * .34;
  const botY = cy + h * .42 * Math.min(1, open + .3) - (E.smileEyes ? h * .2 : 0);
  if (open > .08) {
    const WP = path([[X(-1), inY, 1], [X(-.45), topY + h * .1], [X(.25), topY], [X(1), outY, 1], [X(.5), botY], [X(-.4), botY - h * .03]], true);
    g.save(); g.clip(WP);
    g.fillStyle = P.white_eye; g.fill(WP);
    g.fillStyle = mix(P.white_eye, P.skin.s, .55); g.fillRect(cx - w, topY - 6, w * 2, h * .26 + 6);   // lid cast shadow
    const iw = w * .26 * (fs < 1 ? .9 : 1), ih = h * .52;
    const ix = cx + (E.look?.[0] || 0) * w * .2, iy = cy + h * .1 + (E.look?.[1] || 0) * h * .16;
    const IR = new Path2D(); IR.ellipse(ix, iy, iw, ih, 0, 0, TAU);
    g.fillStyle = P.eye.f; g.fill(IR);
    g.save(); g.clip(IR);
    g.fillStyle = P.eye.s; g.fillRect(ix - iw, iy - ih, iw * 2, ih * .95);
    g.fillStyle = mix(P.eye.s, lash, .5); g.fillRect(ix - iw, iy - ih, iw * 2, ih * .4);
    g.fillStyle = mix(P.eye.l, lash, .3); g.beginPath(); g.ellipse(ix, iy, iw * .44, ih * .48, 0, 0, TAU); g.fill();
    g.fillStyle = P.eye.h; g.beginPath(); g.ellipse(ix, iy + ih * .92, iw * 1.02, ih * .5, 0, 0, TAU); g.fill();
    g.restore();
    g.strokeStyle = mix(P.eye.l, lash, .5); g.lineWidth = LW * .7 * LWK.k; g.stroke(IR);
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(ix - iw * .32, iy - ih * .3, iw * .34, ih * .22, -.5, 0, TAU); g.fill();
    g.globalAlpha = .85; g.beginPath(); g.arc(ix + iw * .36, iy + ih * .36, iw * .15, 0, TAU); g.fill(); g.globalAlpha = 1;
    g.restore();
    line(g, [[X(.95), outY + h * .14], [X(.5), botY + 1], [X(-.3), botY + .6]], mix(P.skin.l, P.skin.f, .35), LS * .8);
    // thick upper lid line, a short flick at the outer corner (a young man's eye: no separate lashes)
    const t = h * .22;
    cel(g, [[X(-1.04), inY + 1, 1], [X(-.45), topY + h * .1 - t * .55], [X(.25), topY - t * .7], [X(.96), outY - t * .6], [X(1.1), outY - t * .95, 1],
      [X(1.02), outY + t * .5], [X(.25), topY + t * .45], [X(-.45), topY + h * .1 + t * .35], [X(-.98), inY + t * .5, 1]], { f: lash });
    line(g, [[X(-.3), topY - h * .26], [X(.4), topY - h * .3], [X(.95), outY - h * .3]], mix(P.skin.l, P.skin.f, .35), LS * .8);   // lid crease
  } else {
    cel(g, [[X(-1), inY, 1], [X(0), cy + h * .26], [X(1.04), outY + h * .1], [X(1.14), outY - h * .08, 1], [X(1), outY + h * .24], [X(0), cy + h * .26 + h * .18], [X(-.98), inY + h * .1, 1]], { f: lash });
  }
}
function eyeSide(g, P, cx, cy, w, h, E) {
  const open = Math.max(0, E.open ?? 1), lid = E.lid || 0, lash = P.lash;
  const topY = cy - h * .5 * open + lid * h * .34, front = cx + w * .5, back = cx - w * .5;
  const botY = cy + h * .42;
  if (open > .08) {
    const WP = path([[back, cy - h * .06, 1], [cx - w * .1, topY], [front, cy + h * .1, 1], [cx, botY]], true);
    g.save(); g.clip(WP); g.fillStyle = P.white_eye; g.fill(WP);
    const ix = cx + w * .2 + (E.look?.[0] || 0) * w * .1, iy = cy + h * .12 + (E.look?.[1] || 0) * h * .14, iw = w * .22, ih = h * .48;
    g.fillStyle = P.eye.f; g.beginPath(); g.ellipse(ix, iy, iw, ih, 0, 0, TAU); g.fill();
    g.fillStyle = P.eye.s; g.fillRect(ix - iw, iy - ih, iw * 2, ih * .95);
    g.fillStyle = P.eye.h; g.beginPath(); g.ellipse(ix, iy + ih * .92, iw, ih * .48, 0, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ix - iw * .1, iy - ih * .3, iw * .38, ih * .2, 0, 0, TAU); g.fill();
    g.restore();
    const t = h * .18;
    cel(g, [[back - w * .25, cy - h * .2 - t * .6, 1], [cx - w * .1, topY - t * .6], [front + w * .06, cy + h * .06, 1], [cx - w * .1, topY + t * .5], [back, cy - h * .0, 1]], { f: lash });
    line(g, [[cx - w * .15, botY], [front - w * .1, cy + h * .3]], mix(P.skin.l, P.skin.f, .35), LS * .75);
    line(g, [[back + w * .05, topY - h * .16], [cx + w * .2, topY - h * .24]], mix(P.skin.l, P.skin.f, .35), LS * .75);
  } else cel(g, [[back - w * .2, cy, 1], [cx, cy + h * .26], [front, cy + h * .14, 1], [cx, cy + h * .36], [back, cy + h * .1, 1]], { f: lash });
}
// a young man's brow: long, a little heavier at the inner end, tapering to the outer end
function brow(g, P, ix, iy, ox, oy, B) {
  const a = [ix, iy + B[0]], c = [ox, oy + B[1]], m = [a[0] + (c[0] - a[0]) * .6, a[1] + (c[1] - a[1]) * .6 - B[2] - 1.2];
  cel(g, [[a[0], a[1] - 2.6, 1], [m[0], m[1] - 2.2], [c[0], c[1] + .2, 1], [m[0], m[1] + 1.2], [a[0], a[1] + 2.2, 1]], { f: P.lash });
}
// ——— mouth ———
function mouth(g, P, cx, cy, w, type, fs = 1) {
  const L = cx - w / 2, R = cx + w / 2 * fs, lc = P.skin.l;
  const lower = (y, ww) => { g.fillStyle = rgba(P.skin.s, .5); g.beginPath(); g.ellipse(cx - ww * .05, y + .5, ww * .9, 2.2, 0, 0, TAU); g.fill(); };
  const ln = pts => line(g, pts, lc, LS * 1.05);
  switch (type) {
    case 'closed': ln([[L, cy + .8], [cx - w * .14, cy - .2], [cx, cy + .4], [cx + w * .12, cy - .1], [R, cy + 1]]); g.fillStyle = rgba(P.skin.s, .55); g.beginPath(); g.ellipse(cx - w * .02, cy + 7.5, w * .2, 2.4, 0, 0, TAU); g.fill(); break;
    case 'pressed': ln([[L + 3, cy], [cx, cy - .2], [R - 2, cy + .2]]); line(g, [[L + 3, cy - 1.6], [L + 3.4, cy + 1.6]], mix(lc, P.skin.f, .45), LS * .6); lower(cy + 6, w * .18); break;
    case 'down': ln([[L, cy + 3], [cx - w * .16, cy - .2], [cx + w * .1, cy - .2], [R, cy + 3]]); lower(cy + 7, w * .2); break;
    case 'side': ln([[L, cy - .4], [cx - w * .05, cy + .2], [R, cy + 3]]); lower(cy + 7, w * .2); break;
    case 'softsmile': ln([[L - 1, cy - 1.8], [cx - w * .12, cy + 1.2], [cx + w * .1, cy + 1.2], [R + 1, cy - 2]]); lower(cy + 7.5, w * .2); break;
    default: {
      let pts, teeth = 0, bot;
      if (type === 'smileopen') { pts = [[L - 1, cy - 2.4, 1], [cx, cy - 1.4], [R + 1, cy - 2.4, 1], [cx + w * .16, cy + 5.5], [cx, cy + 7.5], [cx - w * .2, cy + 5.5]]; teeth = 1; bot = cy + 7.5; }
      else if (type === 'oh') { pts = [[cx - w * .18, cy + 2], [cx, cy - 2.5], [cx + w * .16, cy + 2], [cx + w * .12, cy + 9], [cx - w * .12, cy + 9]]; bot = cy + 9; }
      else { pts = [[L + 3, cy, 1], [cx, cy - .8], [R - 3, cy, 1], [cx + w * .08, cy + 5.5], [cx - w * .1, cy + 5.5]]; bot = cy + 5.5; }
      const MP = path(pts, true);
      g.save(); g.clip(MP); g.fillStyle = P.mouth; g.fill(MP);
      g.fillStyle = mix(P.mouth, '#c06060', .45); g.beginPath(); g.ellipse(cx, bot + 1, w * .24, 4, 0, 0, TAU); g.fill();
      if (teeth) { g.fillStyle = mix('#f4efe6', P.skin.s, .15); g.fillRect(cx - w, cy - 8, w * 2, 9); }
      g.restore();
      g.strokeStyle = lc; g.lineWidth = LS * 1.05 * LWK.k; g.lineJoin = 'round'; g.stroke(MP);
      lower(bot + 4.5, w * .16);
    }
  }
}
function sideMouth(g, P, type) {
  const lc = P.skin.l;
  if (type === 'smileopen' || type === 'talk' || type === 'oh') { const MP = path([[70, 74, 1], [77, 73.5], [75.5, type === 'smileopen' ? 80 : 79], [71, 78]], true); g.fillStyle = P.mouth; g.fill(MP); g.strokeStyle = lc; g.lineWidth = LS * LWK.k; g.stroke(MP); }
  else if (type === 'softsmile') line(g, [[68, 73.5], [72, 76], [76.5, 75]], lc, LS * 1.05);
  else if (type === 'down') line(g, [[69, 77], [73, 75], [76.5, 75.5]], lc, LS * 1.05);
  else { line(g, [[69, 75.5], [74.5, 75]], lc, LS * 1.05); g.fillStyle = rgba(P.skin.s, .5); g.beginPath(); g.ellipse(73, 82, 3, 1.8, 0, 0, TAU); g.fill(); }
}

// hair lock: two root points → sharp tip; bend curves it
function lock(x0, y0, x1, y1, tx, ty, bend = 0) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = tx - mx, dy = ty - my, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  return [[x0, y0], [x0 + dx * .55 + nx * bend, y0 + dy * .55 + ny * bend], [tx, ty, 1], [x1 + dx * .5 + nx * bend * .7, y1 + dy * .5 + ny * bend * .7], [x1, y1]];
}
// angel ring: one continuous highlight band following the cranium (smooth top edge, zigzag lower edge)
function halo(g, P, cx, cy, rx, ry, a0, a1, th, teeth) {
  const up = [], dn = [];
  for (let i = 0; i <= teeth * 2; i++) {
    const u = i / (teeth * 2), a = a0 + (a1 - a0) * u, env = Math.sin(u * Math.PI) * .7 + .3;
    up.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    const d = th * env * (i % 2 ? 1.8 : .5);
    dn.push([cx + Math.cos(a) * (rx - d * .15), cy + Math.sin(a) * ry + d]);
  }
  g.fillStyle = mix(P.hair.h, P.hair.f, .3);
  g.beginPath(); up.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p[0], p[1])); for (let i = dn.length - 1; i >= 0; i--) g.lineTo(dn[i][0], dn[i][1]); g.closePath(); g.fill();
}

// ——— face geometry per view (shared by both Skys) ———
const VIEWS = {
  front: {
    face: [[-64, -40], [-66, 0], [-64, 30], [-61, 52], [-55, 72], [-43, 91], [-26, 106], [-11, 115], [0, 118], [11, 115], [26, 106], [43, 91], [55, 72], [61, 52], [64, 30], [66, 0], [64, -40], [36, -66], [-36, -66]],
    neck: [[-36, 84], [36, 84], [41, 156], [-41, 156]],
    chinShadow: [[-46, 80], [46, 80], [44, 92], [26, 108], [0, 120], [-26, 108], [-44, 92]],
    farShade: [[96, 22], [96, 130], [28, 110], [44, 92], [55, 74], [60, 56], [56, 44], [64, 30], [67, 22]],
    ears: [[[-63, 12], [-71, 8], [-76, 17], [-74, 34], [-68, 48], [-62, 48]], [[63, 12], [71, 8], [76, 17], [74, 34], [68, 48], [62, 48]]],
    earIn: [[[-65, 19], [-71, 17], [-71, 32], [-66, 41]], [[65, 19], [71, 17], [71, 32], [66, 41]]],
    eyes: [{ x: -32, y: 25, w: 35, h: 24, dir: -1, fs: 1 }, { x: 32, y: 25, w: 35, h: 24, dir: 1, fs: 1 }],
    brows: [[-12, 1, -52, 0], [12, 1, 52, 0]],
    nose: P => g => { g.fillStyle = mix(P.skin.f, P.skin.s, .6); g.beginPath(); g.moveTo(3, 30); g.quadraticCurveTo(11, 46, 8, 54); g.quadraticCurveTo(5, 58.5, 1, 57); g.quadraticCurveTo(6, 49, 3, 30); g.fill(); g.strokeStyle = P.skin.l; g.lineWidth = LS * LWK.k; g.lineCap = 'round'; g.beginPath(); g.moveTo(-6, 56); g.quadraticCurveTo(0, 60.5, 6, 56.5); g.stroke(); },
    mouth: { x: 0, y: 82, w: 31, fs: 1 },
    cheek: [[[-52, 58], [-46, 70]], [[52, 58], [46, 70]]],
    blush: [[-40, 54, 13, 3.5], [40, 54, 13, 3.5]],
    neckX: 0,
  },
  q: {
    face: [[-64, -44], [-68, -4], [-67, 30], [-63, 54], [-55, 78], [-38, 98], [-14, 113], [8, 118], [26, 111], [40, 97], [48, 82], [54, 68], [55, 60], [59, 57], [61, 52], [60, 46], [57, 36], [56, 24], [55, 16], [57, 6], [56, -40], [18, -66], [-36, -66]],
    neck: [[-42, 70], [16, 92], [20, 156], [-48, 156]],
    chinShadow: [[-50, 68], [24, 68], [24, 100], [12, 118], [-6, 117], [-30, 104], [-50, 84]],
    farShade: [[96, 26], [96, 130], [22, 114], [38, 100], [47, 84], [51, 70], [54, 56], [57, 44], [59, 30]],
    ears: [[[-60, 12], [-70, 7], [-77, 16], [-75, 34], [-67, 49], [-59, 48]]],
    earIn: [[[-62, 19], [-70, 16], [-71, 32], [-65, 42]]],
    eyes: [{ x: -16, y: 25, w: 37, h: 25, dir: -1, fs: 1 }, { x: 37, y: 23, w: 22, h: 23, dir: 1, fs: .6 }],
    brows: [[2, 1, -40, 2], [28, 0, 52, 1]],
    nose: P => g => { g.fillStyle = mix(P.skin.f, P.skin.s, .55); g.beginPath(); g.moveTo(54, 40); g.quadraticCurveTo(61, 50, 57, 56); g.quadraticCurveTo(53, 57.5, 52, 53); g.quadraticCurveTo(56, 48, 54, 40); g.fill(); g.strokeStyle = P.skin.l; g.lineWidth = LS * LWK.k; g.lineCap = 'round'; g.beginPath(); g.moveTo(45, 58); g.quadraticCurveTo(51, 61.5, 56, 57.5); g.stroke(); },
    mouth: { x: 27, y: 83, w: 28, fs: .7 },
    cheek: [[[44, 62], [48, 72]]],
    blush: [[-24, 54, 14, 3.5]],
    neckX: -14,
  },
  side: {
    face: [[50, -60], [64, -40], [70, -16], [71, -2], [67, 12], [72, 28], [79, 40], [83, 48], [83, 53], [79, 57], [74, 60], [76, 65], [77, 70], [74, 75], [76, 79], [73, 84], [70, 89], [73, 98], [72, 110], [62, 116], [32, 111], [4, 92], [-12, 72], [-30, 54], [-60, 42], [-66, 10], [-30, -10], [10, -50]],
    neck: [[-44, 42], [30, 108], [32, 156], [-48, 156]],
    adam: [[30, 120], [35, 128], [31, 136]],
    chinShadow: [[-40, 60], [50, 60], [62, 118], [32, 113], [4, 94], [-12, 74]],
    farShade: [[-80, 8], [-40, 0], [-30, 46], [-12, 74], [-60, 90]],
    ears: [[[-6, 12], [-18, 6], [-32, 14], [-34, 36], [-26, 56], [-10, 58]]],
    earIn: [[[-10, 20], [-24, 16], [-26, 36], [-16, 48]]],
    eyes: [{ x: 58, y: 25, w: 22, h: 22, side: true }],
    brows: [[52, 1, 72, 0]],
    nose: P => g => { g.fillStyle = mix(P.skin.f, P.skin.s, .5); g.beginPath(); g.moveTo(73, 36); g.quadraticCurveTo(81, 47, 79, 54); g.quadraticCurveTo(75, 56, 74, 51); g.quadraticCurveTo(76, 45, 73, 36); g.fill(); g.strokeStyle = P.skin.l; g.lineWidth = LS * LWK.k; g.lineCap = 'round'; g.beginPath(); g.moveTo(73, 56); g.quadraticCurveTo(77, 53.5, 80, 56); g.stroke(); },
    mouth: null,
    blush: [[54, 56, 9, 3]],
    neckX: -8,
  },
  back: {   // rear 3/4 (turned away, facing up-screen-right): hair mass, the facing ear, a sliver of cheek
    face: [[34, -10], [54, -2], [61, 30], [57, 60], [46, 86], [32, 100], [18, 96], [24, 60], [28, 20]],
    neck: [[-38, 66], [30, 70], [36, 152], [-42, 152]],
    chinShadow: [[-42, 58], [32, 60], [26, 78], [-6, 86], [-38, 78]],
    farShade: [],
    ears: [[[30, 12], [42, 6], [52, 14], [52, 36], [44, 54], [32, 52]]],
    earIn: [[[34, 18], [44, 16], [46, 34], [38, 46]]],
    skull: [[-28, 62], [-60, 40], [-72, -20], [-54, -84], [0, -98], [48, -76], [54, 0], [22, 62]],
    eyes: [], brows: [], nose: () => () => {}, mouth: null, blush: [], neckX: -4,
  },
};

// ——— hair: short, WAVY and smooth (Sky's reference, assets/): volume on top, soft waves falling over the forehead,
// tapered sides with the ears half showing, a short tapered nape ———
// 80s cel construction: a darker hair MASS with a smooth edge, then a few long, broad LOCKS that flow from the crown in
// gentle S-waves (flat fill, hard shadow crescent, thin line), the gaps between them reading as the dark under-layer,
// and one continuous angel-ring sheen band. lock = [[x, y] spine points (root → tip), width]
// `more` = Third-year only: a few weeks longer (tips extended) plus two loose waves over the brow; same hairline.
const HAIR = {
  front: {
    tip: 1.8,
    halo: [0, -32, 70, 70, Math.PI * 1.12, Math.PI * 1.88, 5, 9],
    mass: [[-68, -10], [-74, -40], [-70, -82], [-42, -110], [-4, -120], [34, -114], [62, -92], [74, -56], [70, -10], [64, -30], [40, -50], [0, -60], [-40, -50], [-64, -30]],
    // curtain fringe: a soft centre part, waves sweeping out to both sides of the forehead with smooth pointed tips
    L: [[[[-46, -104], [-66, -88], [-74, -62], [-70, -38], [-67, -16]], 26], [[[44, -104], [64, -88], [72, -62], [70, -38], [67, -16]], 26],
      [[[-6, -118], [-36, -110], [-58, -88], [-66, -62], [-64, -40]], 32], [[[6, -118], [36, -110], [58, -88], [66, -62], [64, -40]], 32],
      [[[-10, -104], [-26, -90], [-44, -70], [-58, -50], [-70, -32]], 24], [[[10, -104], [26, -90], [44, -70], [58, -50], [70, -32]], 24],
      [[[-5, -100], [-16, -82], [-30, -62], [-44, -44], [-58, -26]], 26], [[[5, -100], [16, -82], [30, -62], [44, -44], [58, -26]], 26],
      [[[-4, -92], [-12, -74], [-20, -54], [-30, -36], [-42, -20]], 20], [[[4, -92], [12, -74], [20, -54], [30, -36], [42, -20]], 20]],
    more: [[[[-6, -72], [-12, -44], [-10, -18]], 10], [[[8, -68], [14, -40], [12, -16]], 10]],
  },
  q: {
    tip: 1.8,
    halo: [-10, -32, 70, 70, Math.PI * 1.12, Math.PI * 1.84, 5, 9],
    mass: [[-72, 10], [-90, -34], [-80, -84], [-46, -112], [-4, -122], [34, -112], [58, -88], [64, -52], [58, -14], [46, -38], [12, -58], [-28, -52], [-56, -30], [-62, 0]],
    // curtain fringe: the part sits a little toward the face side; the near curtain is the wider one
    L: [[[[-40, -110], [-74, -96], [-94, -66], [-96, -34], [-90, -4], [-84, 16]], 34], [[[-60, -90], [-84, -60], [-88, -30], [-80, -6]], 26],
      [[[-58, -60], [-66, -36], [-62, -12], [-60, 6]], 18],
      [[[0, -120], [-34, -112], [-62, -88], [-72, -60], [-68, -34]], 32], [[[12, -118], [36, -108], [54, -86], [60, -60], [60, -38]], 28],
      [[[-2, -106], [-22, -94], [-44, -74], [-60, -52], [-66, -30]], 26], [[[16, -104], [34, -90], [50, -70], [60, -48]], 18],
      [[[4, -100], [-8, -82], [-24, -62], [-40, -44], [-56, -26]], 26], [[[10, -100], [24, -82], [38, -62], [50, -44], [60, -30]], 22],
      [[[6, -92], [0, -72], [-8, -52], [-18, -34], [-30, -18]], 20], [[[12, -92], [20, -72], [28, -52], [36, -36], [44, -22]], 16]],
    more: [[[[8, -70], [4, -42], [6, -16]], 10], [[[14, -66], [22, -40], [22, -18]], 9]],
  },
  side: {
    tip: 1.8,
    halo: [-20, -30, 78, 74, Math.PI * 1.15, Math.PI * 1.75, 5, 8],
    mass: [[54, -62], [48, -100], [10, -122], [-40, -116], [-78, -92], [-98, -50], [-98, -8], [-88, 24], [-76, 42], [-60, 36], [-50, 16], [-36, 6], [-14, 4], [0, -26], [24, -52]],
    // the curtain falls forward and down the side of the forehead, tips pointed and soft
    L: [[[[-20, -112], [-64, -100], [-90, -72], [-100, -36], [-96, 0], [-84, 28], [-72, 44]], 32], [[[-40, -96], [-78, -66], [-90, -30], [-82, 4], [-66, 24]], 30],
      [[[-10, -112], [-36, -80], [-50, -46], [-46, -14], [-38, 4]], 28], [[[0, -90], [-6, -60], [0, -30], [2, -6]], 22],
      [[[-12, -118], [20, -124], [46, -110], [62, -86], [70, -62], [72, -44]], 28],
      [[[0, -104], [22, -86], [36, -62], [42, -40], [40, -22]], 22], [[[10, -112], [36, -100], [54, -80], [62, -58], [62, -36]], 26],
      [[[24, -108], [48, -94], [64, -74], [72, -54], [75, -32]], 18]],
    more: [[[[60, -60], [74, -36], [76, -12]], 10]],
  },
  back: {   // rear 3/4, turned away toward upper right; the nape tapers into the neck
    halo: [-6, -24, 72, 70, Math.PI * 1.15, Math.PI * 1.8, 5, 8],
    mass: [[-76, 14], [-86, -34], [-68, -86], [-20, -112], [30, -108], [64, -80], [72, -38], [60, 0], [46, 6], [34, 32], [18, 54], [-14, 64], [-46, 56], [-66, 38]],
    L: [[[[-60, -70], [-80, -40], [-80, -6], [-66, 30], [-50, 52]], 24], [[[-10, -110], [-50, -96], [-76, -66], [-84, -30], [-78, 6]], 34],
      [[[14, -104], [46, -82], [62, -50], [64, -16], [54, 8]], 28], [[[6, -106], [24, -74], [30, -40], [28, -6], [20, 26], [10, 50]], 32],
      [[[-6, -108], [-30, -80], [-46, -46], [-50, -12], [-44, 24], [-36, 50]], 34], [[[0, -106], [-6, -70], [-10, -36], [-6, 0], [-10, 34], [-16, 60]], 34]],
    more: [[[[-30, 40], [-34, 66]], 12]],
  },
};
// polygon with a gently wavy edge: one outward bump per edge
function wavy(pts, a = 3) {
  let A = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; A += p[0] * q[1] - q[0] * p[1]; }
  const sg = A > 0 ? -1 : 1, out = [];
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1;
    out.push(p); out.push([(p[0] + q[0]) / 2 + sg * dy / L * a, (p[1] + q[1]) / 2 - sg * dx / L * a]); }
  return out;
}
// Catmull-Rom resample of a spine so the ribbon's edges stay smooth
function dense(P0, n = 18) {
  const out = [], m = P0.length - 1;
  for (let i = 0; i < n; i++) { const t = i / (n - 1) * m, k = Math.min(m - 1, Math.floor(t)), u = t - k;
    const p0 = P0[Math.max(0, k - 1)], p1 = P0[k], p2 = P0[k + 1], p3 = P0[Math.min(m, k + 2)];
    out.push([0, 1].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u * u + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u * u * u))); }
  return out;
}
const lockShape = ([pts, w], tip = 2.2) => ribbon(dense(pts), u => w * Math.min(1, .25 + u * 3.5) * (.85 + .15 * Math.sin(Math.PI * u * .9)) * (1 - Math.pow(u, tip)) + (tip < 2 ? .6 : 1));
// Third-year's waves are a few weeks longer: extend each tip along its last direction
const grown = ([pts, w]) => { const a = pts[pts.length - 2], b = pts[pts.length - 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [[...pts.slice(0, -1), [b[0] + (b[0] - a[0]) / d * 8, b[1] + (b[1] - a[1]) / d * 8]], w]; };
const hairMask = {};
function hairMass(g, P, H, Ls, lx, ly, rimC, rimBack, under, face) {
  const M = wavy(H.mass, 3);
  if (under) { cel(g, M, { f: mix(P.hair.s, '#000000', .2), l: P.hair.l, lw: LH }); return; }
  cel(g, M, { f: P.hair.s, s: mix(P.hair.s, '#000000', .25), so: [lx * 8, ly * 8], l: P.hair.l, lw: LH * 1.1 });
  const sep = mix(P.hair.l, P.hair.s, .3), rimD = rimBack ? [lx * 3, ly * 3] : [-lx * 3, -ly * 3];
  const U = new Path2D(), parts = [path(M)]; U.addPath(parts[0]);
  Ls.forEach(L => {
    const w = L[1], sh = lockShape(L, H.tip), sp = path(sh); U.addPath(sp); parts.push(sp);
    cel(g, sh, { f: P.hair.f, s: P.hair.s, so: [lx * w * .28, ly * w * .28], l: sep, lw: LH * .7 });
  });
  // angel ring: one continuous sheen band round the crown, smooth on top, zigzag below (STYLE §2)
  if (H.halo) { g.save(); g.clip(U); halo(g, P, ...H.halo); g.restore(); }
  // rim light only on the outer silhouette of the hair (per-lock rims made it stripy): mask − shifted mask, tinted
  if (rimC) {
    const cv = g.canvas, m = hairMask.c && hairMask.c.width === cv.width && hairMask.c.height === cv.height ? hairMask : (hairMask.c = document.createElement('canvas'), hairMask.c.width = cv.width, hairMask.c.height = cv.height, hairMask.q = hairMask.c.getContext('2d'), hairMask);
    const q = m.q, T = g.getTransform();
    q.setTransform(1, 0, 0, 1, 0, 0); q.globalCompositeOperation = 'source-over'; q.clearRect(0, 0, cv.width, cv.height);
    q.setTransform(T); q.fillStyle = rimC; for (const pp of parts) q.fill(pp);
    q.globalCompositeOperation = 'destination-out'; q.translate(rimD[0] * 1.5, rimD[1] * 1.5); for (const pp of parts) q.fill(pp); q.setTransform(T); if (face) q.fill(face);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(m.c, 0, 0); g.restore();
  }
}

export function head(g, P, o = {}) {
  const view = o.view || 'q', V = VIEWS[view], Hh = HAIR[view], stage = o.stage || 'all';
  const bias = BIAS[o.who || 'FY'];
  const E = { ...EXPR[o.expr || 'neutral'], ...(o.E || {}) };
  if (o.look) E.look = o.look;
  if (o.open != null) E.open = o.open;
  if (o.mouth) E.mouth = o.mouth;
  E.open = (E.open ?? 1) + (E.open > 0.08 ? bias.open : 0);
  const grow = o.grow ?? (o.who === 'TY' ? 1 : 0);
  const lx = o.light?.[0] ?? 1, ly = o.light?.[1] ?? -.6;
  const SO = k => [lx * k, ly * k];
  const rimC = o.rim || null, rb = o.rimBack ? -1 : 1, rim = k => rimC ? { c: rimC, d: [-lx * k * rb, -ly * k * .6 * rb] } : null;
  const Ls = grow > .5 ? [...Hh.L.map(grown), ...Hh.more] : Hh.L;
  if (stage === 'all' || stage === 'back') {
    hairMass(g, P, Hh, Ls, lx, ly, null, false, true);
    cel(g, poly(V.neck), { f: P.skin.f, s: P.skin.s, l: P.skin.l, lw: LS, sh: [V.chinShadow], so: SO(10), rim: rim(2.5) });
    if (V.adam) line(g, V.adam, mix(P.skin.l, P.skin.f, .4), LS * .8);
  }
  if (stage === 'back') return;
  if (V.skull) cel(g, V.skull, { f: P.skin.f, s: P.skin.s, so: SO(8), l: P.skin.l, lw: LS });
  // face: flat fill, far-side shade, chin cast shadow, the curls' shadow on the forehead
  cel(g, V.face, { f: P.skin.f, s: P.skin.s, l: P.skin.l, lw: LS, h: P.skin.h, sh: view === 'back' ? [V.face] : [V.farShade], so: o.light ? SO(10) : null, rim: rim(2.5),
    clipFn: gg => {
      gg.fillStyle = mix(P.skin.f, P.skin.s, .7);
      gg.save(); gg.translate(2, 7); gg.fill(path(wavy(Hh.mass))); for (const L of Ls) gg.fill(path(lockShape(L, Hh.tip))); gg.restore();
    } });
  // ears (half showing under the tapered sides)
  V.ears.forEach((E2, i) => { cel(g, E2, { f: P.skin.f, s: P.skin.s, so: SO(5), l: P.skin.l, lw: LS, rim: rim(2) }); line(g, V.earIn[i], mix(P.skin.l, P.skin.f, .3), LS * .8); });
  for (const [x, y, rx, ry] of V.blush) { g.fillStyle = rgba(P.blush, o.blush ?? .06); g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); }
  V.nose(P)(g);
  if (V.mouth) mouth(g, P, V.mouth.x, V.mouth.y, V.mouth.w, E.mouth, V.mouth.fs);
  else if (view === 'side') sideMouth(g, P, E.mouth);
  for (const ey of V.eyes) { if (ey.side) eyeSide(g, P, ey.x, ey.y, ey.w, ey.h, E); else eye(g, P, ey.x, ey.y, ey.w, ey.h, ey.dir, ey.fs, E); }
  hairMass(g, P, Hh, Ls, lx, ly, rimC, o.rimBack, false, path(V.face));
  // brows drawn over the fringe (see-through convention: the emotion stays readable)
  V.brows.forEach((b, i) => { const B = (i === 0 ? E.browN : E.browF) || E.brow || [0, 0, 1.5]; brow(g, P, b[0], b[1] + bias.browDy, b[2], b[3] + bias.browDy, B); });
}

export { VIEWS };
