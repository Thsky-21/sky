// "Did We Make It?" — the whole film as one page (script v2). render(t) over 0 … timeline.total.
// Page contract (core/README.md): window.READY, window.render(t) deterministic, window.DUR, window.EV (sound events for
// the mixer), window.TEXTS(t), plus window.CUTS (the cut list) and window.SHOT(t) for the contact sheet.
// Timing: timeline.json (tools/voices.py, from the measured audio) + voices/mouth.json. Nothing here is pinned to
// absolute seconds; every event is a line anchor (src/tl.js). ?raw=1 skips the tape pass.
import { canvas } from './cel.js';
import { makePost } from './post.js';
import { makeTL, cutList, stopClick, lampClick } from './tl.js';
import { state, LINE_CAMERA } from './acting.js';
import { room } from './stage.js';
import { paper, phone, title, endCard } from './inserts.js';

const qs = new URLSearchParams(location.search);
const W = 1920, H = 1080;
const cv = document.getElementById('gl'); cv.width = W; cv.height = H;
const [sc, g] = canvas(W, H), [gc, e] = canvas(W, H);
const post = makePost(cv);
for (const w of [400, 500, 600, 700]) await document.fonts.load(`${w} 40px "Barlow SC"`, 'DID WE MAKE IT? NOT YET.');
await document.fonts.load('600 60px "Hand"', 'Okay. New idea.');
await document.fonts.ready;

const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`required file missing: ${u} (${r.status})`); return r.json(); };
const TLJ = await get('timeline.json');
const M = await get('voices/mouth.json');
const D = await get('dialogue.json');
const T = makeTL(TLJ);
for (const l of D.lines) if (l.camera) LINE_CAMERA[l.id] = l.camera;
const CUTS = cutList(T);

const TAPE = { bloom: .55, halo: .08, thr: .92, sk: .08, soft: .12, sat: 1.0, lift: .03, contrast: .1, flick: 0, expo: 1.0, fade: .02,
  scan: .06, grille: .02, bleed: 3, rshift: 1, glow: .14, corner: .2, noiseA: .008, power: 1, track: 0,
  tint: [1, .99, .98], shadowTint: [.07, .09, .12] };
const RAW = { bloom: 0, halo: 0, soft: 0, flick: 0, lift: 0, contrast: 0, fade: 0, sat: 1, tint: [1, 1, 1], scan: 0, grille: 0, bleed: 1, rshift: 0, glow: 0, corner: 0, noiseA: 0, power: 1, track: 0, expo: 1 };

export const shotAt = t => CUTS.find(c => t >= c.t0 && t < c.t1) || CUTS[CUTS.length - 1];

function render(t) {
  t = Math.min(T.total - 1e-6, Math.max(0, t));
  for (const x of [g, e]) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; }
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H); e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  const shot = shotAt(t);
  let tape = TAPE;
  if (shot.shot === 'BLACK') { endCard(g, e, T, t, D.end_card.text); tape = { ...TAPE, bloom: .2, scan: .03, noiseA: .004 }; }
  else if (shot.shot === 'PAPER' || shot.shot === 'PHONE') {
    // inserts never sit still: a slow push-in with a little drift across the shot (Sky: keep attention)
    const u = Math.min(1, Math.max(0, (t - shot.t0) / Math.max(.5, shot.t1 - shot.t0)));
    const k = 1 + .07 * u * u * (3 - 2 * u), dx = 14 * Math.sin(t * .37 + shot.t0), dy = 9 * Math.sin(t * .29 + shot.t0 * 1.7);
    for (const x of [g, e]) x.setTransform(k, 0, 0, k, W / 2 * (1 - k) + dx, H / 2 * (1 - k) + dy);
    if (shot.shot === 'PAPER') paper(g, e, T, t, shot); else phone(g, e, T, M, t, shot);
  }
  else {
    room(g, e, state(T, M, t, shot));
    if (shot.shot === 'W' && shot.line === 'Y05') title(g, T, t, shot);
  }
  for (const x of [g, e]) x.setTransform(1, 0, 0, 1, 0, 0);
  post.render(sc, gc, Math.floor(t * 24), null, qs.get('raw') ? RAW : tape);
}

// ——— sound events, all anchored to lines (tools/mix_film.py renders them) ———
function events() {
  const ev = [];
  for (const id of T.order) {
    const l = T.L[id];
    ev.push({ t: l.start, type: 'voice', id, who: l.speaker, dur: l.dur, fx: id === 'VN01' ? 'phone' : undefined });
  }
  ev.push({ t: stopClick(T), type: 'stopClick', gain: .6, pan: .05 });
  ev.push({ t: lampClick(T) - .01, type: 'lampClick', gain: .7, pan: .1 });
  // T01: the paper slide; Y02: two flips and a rustle in the gap (the gag)
  ev.push({ t: T.at('T01', 'start', -.25), type: 'paperSlide', dur: T.at('T01', 'end', .1) - T.at('T01', 'start', -.25), gain: .6, pan: .2 });
  const g0 = T.at('T01', 'end', .2), gd = T.at('Y02', 'start', -.05) - g0;
  ev.push({ t: g0, type: 'paperFlip', dur: .45, gain: .55, pan: -.1 });
  ev.push({ t: g0 + gd * .3, type: 'paperFlip', dur: .45, gain: .5, pan: -.1 });
  ev.push({ t: g0 + gd * .6, type: 'rustle', dur: .4, gain: .45, pan: 0 });
  ev.push({ t: T.at('T22', 'start', -.75), type: 'recordBlip', gain: .5, pan: 0 });
  return ev.sort((a, b) => a.t - b.t);
}

window.render = render;
window.DUR = T.total;
window.EV = events();
window.TEXTS = t => { const s = shotAt(t); return s.shot === 'BLACK' ? D.end_card.text : (s.shot === 'W' && s.line === 'Y05' && t - s.t0 < 1.5 ? ['DID WE MAKE IT?'] : []); };
window.CUTS = CUTS;
window.SHOT = t => shotAt(t).shot;
window.TL = TLJ;
render(0);
window.READY = true;
