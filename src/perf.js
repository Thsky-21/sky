// Performance helpers for the film timeline: timing on twos / threes, blinks, breathing, lip sync, easing.
// Everything is a pure function of t (page contract: render(t) deterministic, no state between frames).
import { hash } from './cel.js';
import { EXPR } from './sky.js';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const ss = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export const eio = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const eo = x => 1 - Math.pow(1 - clamp(x), 3);
export const lerp = (a, b, u) => a + (b - a) * u;
export const lerpV = (a, b, u) => a.map((v, i) => lerp(v, b[i], u));
// SHOT_LIST: camera and light on ones; characters on twos (12 drawings/s); blinks, lip flaps, gestures on threes (8/s)
export const twos = t => Math.floor(t * 12 + 1e-6) / 12;
export const threes = t => Math.floor(t * 8 + 1e-6) / 8;
// keyed value: keys [[t, v], ...] (v number or array), eased between keys
export function key(t, keys, ease = ss) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) {
    const [a, va] = keys[i - 1], [b, vb] = keys[i], u = ease((t - a) / (b - a));
    return Array.isArray(va) ? lerpV(va, vb, u) : lerp(va, vb, u);
  }
  return keys[keys.length - 1][1];
}

// blink factor (1 open → 0 closed). Natural blinks every ~2.8–5 s from a seed, plus scripted ones; a blink is
// half (2 frames) → closed (3 frames) → half (2 frames) at 24 fps, i.e. ~0.3 s, the closed drawing held (STYLE)
const F = 1 / 24;
function blinkAt(t, t0) { const d = t - t0; if (d < 0 || d >= 7 * F) return 1; if (d < 2 * F) return .45; if (d < 5 * F) return 0; return .5; }
export function blink(t, seed, extra = [], from = 0, to = 30, avoid = []) {
  let b = 1;
  for (const t0 of extra) b = Math.min(b, blinkAt(t, t0));
  let k = 0, s = from + .6 + hash(seed) * 1.5;
  while (s < to && k < 60) {
    if (!avoid.some(([a, z]) => s > a - .3 && s < z)) b = Math.min(b, blinkAt(t, s));
    s += 2.8 + hash(seed * 7.3 + k * 1.7) * 2.2; k++;
  }
  return b;
}
// lid opening for an expression, multiplied by the blink factor
export const openOf = (expr, bf, E = {}) => (E.open ?? EXPR[expr]?.open ?? 1) * bf;

// breathing: a slow cycle (~3.6 s) on twos; returns -1..1
export const breath = (t, ph = 0, period = 3.6) => Math.sin((twos(t) / period + ph) * Math.PI * 2);

// lip sync from voices/mouth.json: shapes on threes, starting at the line's placed time.
// map: C closed, T talk, O oh, A wide → this film's mouth drawings (sky.js)
export const MOUTH_MAP = { C: 'closed', T: 'talk', O: 'oh', A: 'smileopen' };
export function lipAt(t, lines, M, ids, map = MOUTH_MAP) {
  for (const id of ids) {
    const t0 = lines[id], m = M[id];
    if (t0 == null || !m) continue;
    if (t >= t0 && t < t0 + m.m.length / m.fps) {
      const k = Math.floor((t - t0) * m.fps + 1e-6), ai = Math.floor((t - t0) * 24);
      return { id, shape: map[m.m[k]] || 'closed', amp: m.a[Math.min(m.a.length - 1, ai)] || 0, u: (t - t0) / m.dur };
    }
  }
  return null;
}
// smoothed loudness for head accents (on twos), 0..1
export function accent(t, lines, M, ids) {
  const tt = twos(t);
  for (const id of ids) {
    const t0 = lines[id], m = M[id];
    if (t0 == null || !m || tt < t0 || tt > t0 + m.dur) continue;
    let s = 0, n = 0; const c = (tt - t0) * 24;
    for (let k = -3; k <= 3; k++) { const v = m.a[Math.round(c + k)]; if (v != null) { s += v; n++; } }
    return n ? s / n : 0;
  }
  return 0;
}
