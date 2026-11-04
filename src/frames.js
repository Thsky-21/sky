// Style frames + storyboard key frames, drawn with the real rig (sky.js / body.js) over painted plates (plates.js),
// then through the restrained tape pass (main.js). Timecodes and framing from SHOT_LIST.md.
import { canvas, poly, cel, line, rgba, mix, airbrush, vgrad, TAU, LWK } from './cel.js';
import { PAL, TOK } from './pal.js';
import { figure, limbOutline, handShape } from './body.js';
import { chair } from './props.js';
import { roomPlate, desk, sheet, lamp, laptopAway, hostel2024, campusEdge } from './plates.js';

const { ink, midnight, slate, ivory, amber, teal, sage, rust } = TOK;
const FONT = '"Barlow SC", sans-serif';

// draw characters on their own layer, composite onto the picture and stamp their silhouette out of the emissive
// canvas so lamp / window glow never blooms through a character (STYLE §2)
let L1 = null;
function layer(g, e, fn, o = {}) {
  if (!L1) L1 = canvas(g.canvas.width, g.canvas.height);
  const [c, q] = L1; q.setTransform(1, 0, 0, 1, 0, 0); q.clearRect(0, 0, c.width, c.height); q.filter = 'none';
  fn(q);
  g.save(); if (o.blur) g.filter = `blur(${o.blur}px)`; if (o.alpha != null) g.globalAlpha = o.alpha; g.drawImage(c, 0, 0); g.restore();
  e.save(); e.globalCompositeOperation = 'destination-out'; e.drawImage(c, 0, 0); e.restore();
}
function blurred(g, e, fn, px) {
  const [c, q] = canvas(g.canvas.width, g.canvas.height), [c2, q2] = canvas(g.canvas.width, g.canvas.height);
  q2.fillStyle = '#000'; q2.fillRect(0, 0, c2.width, c2.height);
  fn(q, q2);
  g.save(); g.filter = `blur(${px}px)`; g.drawImage(c, 0, 0); g.restore();
  e.save(); e.filter = `blur(${px}px)`; e.globalCompositeOperation = 'lighter'; e.drawImage(c2, 0, 0); e.restore();
}

// ——— the wide two-shot: one composition, repainted per colour model (opening / 145.5 s / ending) ———
function twoShot(g, e, mode, o = {}) {
  const P = PAL[mode === 'noreply' ? 'noreply' : mode === 'morning' ? 'morning' : 'night'];
  roomPlate(g, e, mode);
  const FY = { who: 'FY', pose: 'sitLean', yaw: .95, x: 560, y: 1052, s: .56, expr: o.fyExpr || 'curious', light: [1, -.35], rim: o.rim ? P.rim : null, look: [.5, 0] };
  const TY = { who: 'TY', pose: 'sitBack', yaw: .95, x: 1372, y: 1052, s: .56, mirror: true, expr: o.tyExpr || 'calm', light: [1, -.35], rim: o.rim ? P.rim : null, look: [.4, .1] };
  layer(g, e, q => { chair(q, P, { yaw: .95, x: 560, y: 1052, s: .56 }); chair(q, P, { yaw: .95, x: 1372, y: 1052, s: .56, mirror: true }); figure(q, P, { ...FY, layer: 'base' }); figure(q, P, { ...TY, layer: 'base' }); });
  desk(g, e, P, mode);
  sheet(g, e, P, 956, 718, mode === 'night' ? .3 : .15);
  lamp(g, e, P, mode, 1150, 704);
  if (o.laptop) laptopAway(g, e, P, 1100, 714);
  layer(g, e, q => { figure(q, P, { ...FY, layer: 'arms' }); figure(q, P, { ...TY, layer: 'arms' }); });
}

function endingWide(g, e, card) {
  const P = PAL.morning, B = PAL.backlit;
  roomPlate(g, e, 'morning');
  layer(g, e, q => {
    chair(q, P, { yaw: .7, x: 600, y: 1052, s: .56 }); chair(q, P, { yaw: 1.1, x: 1390, y: 1052, s: .56, mirror: true });
  });
  desk(g, e, P, 'morning'); sheet(g, e, P, 956, 718, .1); lamp(g, e, P, 'morning', 1150, 704);
  layer(g, e, q => {
    // First-year reaches the door first: rear 3/4, backlit against the daylight, warm rim
    figure(q, B, { who: 'FY', pose: 'walk', yaw: 2.35, x: 250, y: 902, s: .44, mirror: true, expr: 'determined', light: [-1, -.4], rim: B.rim, rimBack: true });
    // Third-year follows, profile, morning light on his face from the door
    figure(q, P, { who: 'TY', pose: 'walk', yaw: 1.45, x: 520, y: 1062, s: .56, mirror: true, expr: 'determined', light: [1, -.4], rim: ivory, look: [.4, 0] });
  });
  if (card) endCard(g, card);
  return { post: { bloom: .5, halo: .06, thr: .95 } };
}
function endCard(g, a = 1) {
  g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = `600 56px ${FONT}`; g.fillStyle = ink; if ('letterSpacing' in g) g.letterSpacing = '6px';
  g.fillText('DID WE MAKE IT?', 1560, 214);
  g.font = `500 32px ${FONT}`; g.fillStyle = mix(ink, midnight, .3); if ('letterSpacing' in g) g.letterSpacing = '5px';
  g.fillText('NOT YET. STILL BUILDING.', 1560, 264);
  g.restore();
}

// ——— close-ups ———
function roomSoft(g, e, mode, px = 9) { blurred(g, e, (q, qe) => roomPlate(q, qe, mode), px); }
function cuTY(g, e, mode, expr, o = {}) {
  const P = PAL[mode];
  layer(g, e, q => figure(q, P, { who: 'TY', pose: o.pose || 'sitBack', yaw: o.yaw ?? .9, x: o.x ?? 1130, y: o.y ?? 3010, s: o.s ?? 2.45, mirror: true, expr, look: o.look, light: o.light || [1, -.3], rim: o.rim, rimBack: o.rimBack, lwk: o.lwk ?? .8, headTilt: o.tilt || 0 }));
}

export const FRAMES = {
  // STYLE FRAME 1 / storyboard 1 — S1-02, 0:00.5–0:03, wide two-shot, night room, the blank sheet between them
  sf_open: ({ g, e }) => { twoShot(g, e, 'night', { fyExpr: 'curious', tyExpr: 'calm' }); return { post: { bloom: .6 } }; },
  // STYLE FRAME 2 — S6-07, 2:58–3:00, the opening composition repainted: morning, door open, both leaving
  sf_end: ({ g, e }) => endingWide(g, e, 0),

  sb1: ({ g, e }) => { twoShot(g, e, 'night', { fyExpr: 'curious', tyExpr: 'calm' }); return { post: { bloom: .6 } }; },
  // S1-07, 0:20, CU Third-year, eyes drop to the page, lamp key full on his face
  sb2: ({ g, e }) => {
    roomSoft(g, e, 'night', 10);
    airbrush(g, 560, 700, 700, 500, amber, .18, .9);
    cuTY(g, e, 'night', 'thoughtful', { x: 1130, y: 3030, light: [1, -.25] });
    return { post: { bloom: .6 } };
  },
  // S2-03, 0:41, First-year back 3/4 at the campus edge, the city large beyond, late afternoon
  sb3: ({ g, e }) => {
    campusEdge(g, e);
    layer(g, e, q => figure(q, PAL.memory, { who: 'FY', pose: 'standStraps', yaw: 2.55, x: 700, y: 1500, s: 1.05, expr: 'curious', light: [-1, -.6], rim: PAL.memory.rim, hoodie: true }));
    return { post: { bloom: .5 } };
  },
  // S3-04, 1:22, MCU First-year at the 2024 hostel desk, snaps round from the laptop toward Third-year: brows up, a small smile
  sb4: ({ g, e }) => {
    blurred(g, e, (q, qe) => hostel2024(q, qe), 8);
    layer(g, e, q => figure(q, PAL.build, { who: 'FY', pose: 'sitBack', yaw: .95, x: 820, y: 2620, s: 2.1, expr: 'excited', light: [1, -.4], rim: teal, rimBack: true, lwk: .8, headTilt: -.04 }));
    return { post: { bloom: .55 } };
  },
  // S4-06, 1:53, insert: the three cards on the sheet; the third becomes a codebase inside permission gates; tech words on the desk
  sb5: ({ g, e }) => {
    const P = PAL.build;
    vgrad(g, 0, 0, 1920, 1080, [[0, '#2E2420'], [1, '#1E1814']]);
    for (let k = 0; k < 18; k++) { g.fillStyle = rgba('#000000', .08); g.fillRect(0, k * 64, 1920, 3); }
    airbrush(g, 1300, 300, 900, 600, amber, .22, .95);
    // the sheet
    cel(g, poly([[300, 120], [1560, 96], [1600, 960], [270, 990]]), { f: P.paper.f, s: P.paper.s, l: P.paper.l, lw: 2.4, sh: [[[270, 940], [1600, 920], [1600, 960], [270, 990]]] });
    const card = (x, y, r, txt, hot) => {
      g.save(); g.translate(x, y); g.rotate(r);
      cel(g, poly([[-190, -120], [190, -120], [190, 120], [-190, 120]]), { f: mix(ivory, '#ffffff', .3), s: P.paper.s, l: mix(slate, ink, .3), lw: 2.4, sh: [[[-190, 100], [190, 100], [190, 120], [-190, 120]]] });
      g.fillStyle = ink; g.font = `600 30px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      txt.forEach((t, i) => g.fillText(t, 0, -70 + i * 38));
      if (hot === 'scrape') { line(g, [[-120, 30], [-40, 30], [-40, 80], [-120, 80], [-120, 30]], slate, 2.4); for (let k = 0; k < 4; k++) line(g, [[-20 + k * 30, 20], [60 + k * 30, 90]], mix(slate, ivory, .3), 2); line(g, [[100, 40], [160, 70]], rust, 4); }
      if (hot === 'budget') { for (let k = 0; k < 5; k++) { g.fillStyle = k === 4 ? mix(slate, ivory, .5) : slate; g.fillRect(-120 + k * 50, 90 - (20 + k * 14), 30, 20 + k * 14); } line(g, [[-140, 30], [130, 30]], amber, 3); }
      if (hot === 'gov') {
        g.fillStyle = mix(midnight, ink, .2); g.fillRect(-70, 0, 140, 96);
        for (let k = 0; k < 6; k++) { g.fillStyle = rgba(teal, .9); g.fillRect(-58, 10 + k * 14, 40 + ((k * 37) % 70), 5); }
        for (const [gx, gy] of [[-110, 6], [110, 6], [-110, 70], [110, 70], [0, -30]]) { line(g, [[gx - 14, gy + 24], [gx - 14, gy], [gx, gy - 12], [gx + 14, gy], [gx + 14, gy + 24]], teal, 4); }
      }
      g.restore();
    };
    card(560, 380, -.06, ['CONTENT /', 'AI SCRAPERS'], 'scrape');
    card(1000, 340, .03, ['LLM BUDGETS'], 'budget');
    card(1380, 470, .07, ['AGENT', 'GOVERNANCE'], 'gov');
    airbrush(e, 1380, 540, 200, 120, teal, .35, .7);
    // tech words as small objects on the desk
    const tag = (x, y, r, t) => { g.save(); g.translate(x, y); g.rotate(r); g.font = `600 30px ${FONT}`; const w = g.measureText(t).width + 40;
      cel(g, poly([[-w / 2, -26], [w / 2, -26], [w / 2, 26], [-w / 2, 26]]), { f: mix(slate, midnight, .2), s: mix(slate, ink, .4), l: ink, lw: 2.2, sh: [[[-w / 2, 16], [w / 2, 16], [w / 2, 26], [-w / 2, 26]]] });
      g.fillStyle = ivory; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 0, 0); g.restore(); };
    tag(520, 760, -.05, 'TypeScript'); tag(840, 800, .04, 'Python'); tag(1120, 760, -.03, 'React'); tag(1360, 810, .05, 'Redis');
    // Third-year's hand places the last card: forearm from the lower right, pushed-up slate sleeve, fingers on the corner
    layer(g, e, q => { LWK.k = .9;
      const sh = [2010, 1130], wr = [1640, 700], el = [1830, 920], ang = Math.atan2(wr[1] - el[1], wr[0] - el[0]);
      cel(q, limbOutline([sh, el, wr], [150, 120, 92]), { f: P.skin.f, s: P.skin.s, l: P.skin.l, lw: 2.6, so: [12, -8] });
      cel(q, limbOutline([sh, el, [el[0] - 40, el[1] - 46]], [176, 150, 146], .8, .1), { f: P.over.f, s: P.over.s, h: P.over.h, l: P.over.l, lw: 3, so: [14, -10] });
      cel(q, limbOutline([[el[0] - 16, el[1] - 18], [el[0] - 46, el[1] - 52]], [150, 146], .2, .2), { f: P.over.h, l: P.over.l, lw: 3 });
      q.save(); q.translate(wr[0], wr[1]); q.scale(1.5, 1.5); handShape(q, P, [0, 0], ang, 'flat', { so: [8, -6], rim: null }); q.restore();
      LWK.k = 1; });
    return { post: { bloom: .45 } };
  },
  // S5-02, 2:06, CU Third-year, the inbox behind him, the number 50 building; low saturation
  sb6: ({ g, e }) => {
    roomSoft(g, e, 'noreply', 10);
    // the inbox, ghosted on the wall behind him (blank rows, no names or addresses)
    g.save(); g.globalAlpha = .55;
    cel(g, poly([[180, 170], [880, 150], [890, 700], [190, 720]]), { f: mix(midnight, slate, .5), l: mix(teal, slate, .4), lw: 3 });
    for (let k = 0; k < 9; k++) { g.fillStyle = rgba(mix(teal, ivory, .3), .35); g.fillRect(240, 230 + k * 50, 420 - (k * 53 % 160), 14); g.fillStyle = rgba(teal, .5); g.fillRect(216, 228 + k * 50, 14, 14); }
    g.restore();
    g.save(); g.font = `600 220px ${FONT}`; g.fillStyle = rgba(mix(ivory, teal, .25), .85); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('50', 720, 520); g.restore();
    airbrush(e, 540, 430, 360, 300, teal, .18, .9);
    cuTY(g, e, 'noreply', 'calm', { x: 1220, y: 3000, look: [.5, .05], light: [1, -.3], rim: mix(teal, ivory, .3), rimBack: true });
    return { post: { bloom: .4, sat: .82 } };
  },
  // S5-05, 2:25.5–2:30, wide two-shot, low saturation, the laptop turned away; SHIPPING ≠ SELLING
  sb7: ({ g, e }) => {
    twoShot(g, e, 'noreply', { fyExpr: 'confused', tyExpr: 'defensive', laptop: true });
    g.save(); g.textAlign = 'center'; g.font = `600 58px ${FONT}`; if ('letterSpacing' in g) g.letterSpacing = '8px'; g.fillStyle = ivory; g.fillText('SHIPPING ≠ SELLING', 960, 128); g.restore();
    return { post: { bloom: .45, sat: .8 } };
  },
  // S6-05, 2:49, Third-year leans forward into the lamp for the first time; morning in the window; First-year's shoulder at frame edge
  sb8: ({ g, e }) => {
    roomSoft(g, e, 'morning', 9);
    const P = PAL.morning;
    const TYo = { who: 'TY', pose: 'sitForward', yaw: .9, x: 1240, y: 1640, s: 1.34, mirror: true, expr: 'empathetic', look: [.6, 0], light: [1, -.2], rim: ivory, rimBack: true, lwk: .9 };
    layer(g, e, q => figure(q, P, { ...TYo, layer: 'base' }));
    // desk edge between them, the lamp at the back of the desk in front of him (amber key)
    cel(g, poly([[0, 856], [1920, 840], [1920, 1080], [0, 1080]]), { f: P.wood.f, s: P.wood.s, h: P.wood.h, l: P.wood.l, lw: 3, sh: [[[0, 1000], [1920, 990], [1920, 1080], [0, 1080]]] });
    airbrush(g, 700, 860, 520, 120, amber, .3, .9);
    g.save(); g.translate(560, 872); g.scale(1.9, 1.9); lamp(g, e, P, 'morning', 0, 0); g.restore();
    airbrush(e, 490, 650, 140, 100, amber, .55, .7);
    layer(g, e, q => figure(q, P, { ...TYo, layer: 'arms' }));
    // First-year's shoulder and head, out of focus at the left edge
    layer(g, e, q => figure(q, P, { who: 'FY', pose: 'sitBack', yaw: 2.2, x: 40, y: 3000, s: 2.6, expr: 'neutral', light: [-1, -.3] }), { blur: 7 });
    return { post: { bloom: .65 } };
  },
  sb9: ({ g, e }) => endingWide(g, e, .9),
};
