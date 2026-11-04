// "Did We Make It?" — the film timeline page (Gate D). One render(t) over the film; ?clip=01 renders that 30 s clip
// (DUR = its length, t = seconds from the clip start). Only clip 01 (0–30 s) is built so far.
// Page contract (core/README.md): window.READY after assets load, window.render(t) deterministic, window.DUR,
// window.EV (sound events for the mixer), window.TEXTS(t) (on-screen text for readcheck; none in clip 01).
// ?raw=1 skips the tape pass. Line timing: timeline.json (start) + voices/mouth.json (measured length, mouth shapes).
import { canvas } from './cel.js';
import { makePost } from './post.js';
import { SHOTS01, events01 } from './clip01.js';

const qs = new URLSearchParams(location.search);
const W = 1920, H = 1080;
const cv = document.getElementById('gl'); cv.width = W; cv.height = H;
const [sc, g] = canvas(W, H), [gc, e] = canvas(W, H);
const post = makePost(cv);
for (const w of [400, 500, 600, 700]) await document.fonts.load(`${w} 40px "Barlow SC"`, 'DID WE MAKE IT? ≠ 50');
await document.fonts.ready;

const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`required file missing: ${u} (${r.status})`); return r.json(); };
const TL = await get('timeline.json');
const M = await get('voices/mouth.json');   // tools/lipsync.py, from the voice files
const X = { lines: TL.lines, M };

const clip = qs.get('clip') || '01';
const [C0, C1] = TL.clips[clip] || (() => { throw new Error(`clip ${clip} is not built yet`); })();
const SHOTS = SHOTS01;   // clips 02–06: not built (waiting for review of clip 01)

// same restrained tape as the approved look-dev page (src/main.js): CRT/tape reduced to a hint (PLAN §3)
const TAPE = { bloom: .55, halo: .08, thr: .92, sk: .08, soft: .12, sat: 1.0, lift: .03, contrast: .1, flick: 0, expo: 1.0, fade: .02,
  scan: .06, grille: .02, bleed: 3, rshift: 1, glow: .14, corner: .2, noiseA: .008, power: 1, track: 0,
  tint: [1, .99, .98], shadowTint: [.07, .09, .12] };
const RAW = { bloom: 0, halo: 0, soft: 0, flick: 0, lift: 0, contrast: 0, fade: 0, sat: 1, tint: [1, 1, 1], scan: 0, grille: 0, bleed: 1, rshift: 0, glow: 0, corner: 0, noiseA: 0, power: 1, track: 0, expo: 1 };

export function shotAt(T) { return SHOTS.find(([, a, b]) => T >= a && T < b) || SHOTS[SHOTS.length - 1]; }

function render(t) {
  const T = Math.min(C1 - 1e-6, Math.max(C0, C0 + t));
  for (const x of [g, e]) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; }
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H); e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  const [, , , fn] = shotAt(T);
  const r = fn(g, e, T, X) || {};
  for (const x of [g, e]) x.setTransform(1, 0, 0, 1, 0, 0);
  const tape = qs.get('raw') ? RAW : { ...TAPE, ...(r.post || {}) };
  post.render(sc, gc, Math.floor(T * 24), null, tape);
}
window.render = render;
window.DUR = C1 - C0;
window.EV = events01(X).filter(v => v.t >= C0 && v.t < C1).map(v => ({ ...v, t: +(v.t - C0).toFixed(3) }));
window.TEXTS = () => [];
window.SHOT = t => shotAt(C0 + t)[0];
render(0);
window.READY = true;
