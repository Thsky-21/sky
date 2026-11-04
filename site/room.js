// The live room: the film's own apartment drawn in the browser by the film's own code (src/clip01.js roomShot →
// apartment.js, body.js, sky.js), through the same tape pass (src/post.js). Used before the film (the dark room, the
// two Skys as silhouettes, the city moving below), after it (the empty chairs, the page left on the table) and in the
// "how it was made" section (the layers). The 3-minute film itself plays as video: same pixels, any device.
import { canvas } from './src/cel.js';
import { makePost } from './src/post.js';
import { roomShot, camAt } from './src/clip01.js';

const W = 1920, H = 1080;
// the film's tape settings (src/film.js TAPE): CRT/tape reduced to a hint
export const TAPE = { bloom: .55, halo: .08, thr: .92, sk: .08, soft: .12, sat: 1.0, lift: .03, contrast: .1, flick: 0, expo: 1.0, fade: .02,
  scan: .06, grille: .02, bleed: 3, rshift: 1, glow: .14, corner: .2, noiseA: .008, power: 1, track: 0,
  tint: [1, .99, .98], shadowTint: [.07, .09, .12] };
const RAW = { bloom: 0, halo: 0, soft: 0, flick: 0, lift: 0, contrast: 0, fade: 0, sat: 1, tint: [1, 1, 1], scan: 0, grille: 0, bleed: 1, rshift: 0, glow: 0, corner: 0, noiseA: 0, power: 1, track: 0, expo: 1 };

// framings (world → screen), shared with the page so hotspots sit exactly on the lamp / the page
export const CAM_ARRIVAL = camAt(0.74);                 // the film's frame at the instant the lamp clicks on
export const CAM_EMPTY = { z: 1.12, cx: 960, cy: 600 };
export const CAM_LAYERS = { z: 1.15, cx: 960, cy: 600 };
export const toScreen = (c, [x, y]) => [(960 + (x - c.cx) * c.z) / W, (540 + (y - c.cy) * c.z) / H];

export async function loadX(base = 'data/') {
  const get = async u => { const r = await fetch(base + u); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); };
  const [TL, M] = await Promise.all([get('timeline.json'), get('mouth.json')]);
  return { lines: TL.lines, M };
}

export class Room {
  // mode: 'arrival' | 'empty' | 'layers'; view (layers only): 'final' | 'raw' | 'light'
  constructor(cv, X, mode = 'arrival') {
    this.cv = cv; cv.width = W; cv.height = H;
    [this.sc, this.g] = canvas(W, H); [this.gc, this.e] = canvas(W, H); [this.bk, this.bq] = canvas(W, H);
    this.bq.fillStyle = '#000'; this.bq.fillRect(0, 0, W, H);
    this.post = makePost(cv); this.X = X; this.mode = mode; this.view = 'final';
    this.t0 = performance.now(); this.on = false; this.last = 0;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', m => { this.reduced = m.matches; this.draw(performance.now()); });
  }
  draw(now) {
    const life = this.reduced ? 14 : (now - this.t0) / 1000, { g, e } = this;
    for (const x of [g, e]) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; }
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H); e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
    let r;
    if (this.mode === 'arrival') r = roomShot(g, e, 0.7, this.X, { life, cam: CAM_ARRIVAL, still: this.reduced });
    else if (this.mode === 'empty') r = roomShot(g, e, 29.5, this.X, { life, cam: CAM_EMPTY, empty: true, gold: 1, lamp: 1, still: this.reduced });
    else r = roomShot(g, e, 5.4, this.X, { life, cam: CAM_LAYERS, gold: 1, lamp: 1, still: this.reduced });
    for (const x of [g, e]) x.setTransform(1, 0, 0, 1, 0, 0);
    const fr = Math.floor(life * 24);
    if (this.mode === 'layers' && this.view === 'raw') this.post.render(this.sc, this.gc, fr, null, RAW);
    else if (this.mode === 'layers' && this.view === 'light') this.post.render(this.bk, this.gc, fr, null, { ...TAPE, bloom: 1.1, glow: .3 });
    else this.post.render(this.sc, this.gc, fr, null, { ...TAPE, ...(r?.post || {}) });
  }
  // a 24 fps loop that only runs while wanted (visible, not under the video); reduced motion: one still frame
  start() {
    if (this.on) return; this.on = true;
    const tick = now => {
      if (!this.on) return;
      if (now - this.last >= 1000 / 24 - 2) { this.last = now; this.draw(now); }
      if (this.reduced) { this.on = false; return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  stop() { this.on = false; }
}
