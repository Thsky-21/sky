// "Did We Make It?" — Gate B look development page (model sheets, style frames, storyboard key frames).
// Not the film timeline: ?sheet=<name> picks one page, render(t) ignores t. ?raw=1 skips the tape pass.
// Page contract (core/README.md): window.READY, window.render(t), window.DUR.
import { canvas } from './cel.js';
import { makePost } from './post.js';
import { SHEETS, SIZE } from './sheets.js';

const qs = new URLSearchParams(location.search);
const name = qs.get('sheet') || 'fy_turn';
const [Wd, Hd] = SIZE[name] || [1920, 1080];
const cv = document.getElementById('gl'); cv.width = Wd; cv.height = Hd;
const [sc, g] = canvas(Wd, Hd), [gc, e] = canvas(Wd, Hd), [ovc, ov] = canvas(Wd, Hd);
const post = makePost(cv);
for (const w of [400, 500, 600, 700]) await document.fonts.load(`${w} 40px "Barlow SC"`, 'DID WE MAKE IT? ≠ 50');
await document.fonts.ready;

// restrained tape (PLAN §3: CRT/tape reduced to a hint) — the style's restrained set A, turned well down
const TAPE = { bloom: .55, halo: .08, thr: .92, sk: .08, soft: .12, sat: 1.0, lift: .03, contrast: .1, flick: 0, expo: 1.0, fade: .02,
  scan: .06, grille: .02, bleed: 3, rshift: 1, glow: .14, corner: .2, noiseA: .008, power: 1, track: 0,
  tint: [1, .99, .98], shadowTint: [.07, .09, .12] };
const RAW = { bloom: 0, halo: 0, soft: 0, flick: 0, lift: 0, contrast: 0, fade: 0, sat: 1, tint: [1, 1, 1], scan: 0, grille: 0, bleed: 1, rshift: 0, glow: 0, corner: 0, noiseA: 0, power: 1, track: 0, expo: 1 };

function render(t) {
  for (const x of [g, e]) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; }
  g.fillStyle = '#000'; g.fillRect(0, 0, Wd, Hd); e.fillStyle = '#000'; e.fillRect(0, 0, Wd, Hd); ov.clearRect(0, 0, Wd, Hd);
  const S = SHEETS[name];
  const r = S ? (S({ g, e, ov, W: Wd, H: Hd, t }) || {}) : {};
  const tape = (qs.get('raw') || r.raw) ? RAW : { ...TAPE, ...(r.post || {}) };
  post.render(sc, gc, 0, ovc, tape);
}
window.render = render; window.DUR = 1;
render(0);
window.READY = true;
