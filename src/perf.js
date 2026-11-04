// Performance helpers for the film timeline: easing, blinks, breathing, idle life, lip sync.
// Everything is a pure function of t (page contract: render(t) deterministic, no state between frames).
// Timing (Sky, 2026-11-04: "smoother"): bodies, heads, arms and props move on ones (24/s); mouths change on twos
// (12/s, voices/mouth.json); blinks are drawn per frame; the camera and light on ones.
import { hash } from './cel.js';
import { EXPR } from './sky.js';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const ss = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export const eio = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const eo = x => 1 - Math.pow(1 - clamp(x), 3);
// an eager move: fast out, a small overshoot, settles (damped spring on 0..1)
// (0 → ~1.1 at 45 % → 1; continuous at both ends)
export const spring = x => { x = clamp(x); return x >= 1 ? 1 : 1 - Math.exp(-5 * x) * Math.cos(2.2 * Math.PI * x) * (1 - x * x) ; };
export const lerp = (a, b, u) => a + (b - a) * u;
export const lerpV = (a, b, u) => a.map((v, i) => lerp(v, b[i], u));
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

// blink factor (1 open → 0 closed): half (2 frames) → closed (2) → half (2), ~0.25 s. Natural blinks every ~2.8–5 s
// from a seed, plus scripted ones; `avoid` = [[a, b], ...] ranges with no natural blink
const F = 1 / 24;
function blinkAt(t, t0) { const d = t - t0; if (d < 0 || d >= 6 * F) return 1; if (d < 2 * F) return .4; if (d < 4 * F) return 0; return .55; }
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

// breathing: a slow smooth cycle (~3.6 s); returns -1..1
export const breath = (t, ph = 0, period = 3.6) => Math.sin((t / period + ph) * Math.PI * 2);
// idle life: a very small, never-repeating head sway (two slow sines), -1..1
export const sway = (t, seed = 0) => .6 * Math.sin(t * 1.13 + seed * 3.1) + .4 * Math.sin(t * 1.97 + seed * 1.7);
// eye saccades: the gaze jumps by a tiny amount every 0.6–1.4 s (a jump takes 2 frames), [dx, dy]
export function sacc(t, seed = 0, amp = .05) {
  let s = 0, k = 0, cur = [0, 0], prev = [0, 0], t0 = 0;
  while (s <= t && k < 200) { prev = cur; t0 = s; cur = [(hash(seed + k * 3.7) - .5) * 2 * amp, (hash(seed + k * 5.1 + 9) - .5) * amp]; s += .6 + hash(seed * 2 + k) * .8; k++; }
  const u = clamp((t - t0) / (2 * F));
  return lerpV(prev, cur, u);
}

// lip sync from voices/mouth.json: shapes at m.fps (twos), starting at the line's placed time.
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
// smoothed loudness for head accents (on ones), 0..1
export function accent(t, lines, M, ids) {
  for (const id of ids) {
    const t0 = lines[id], m = M[id];
    if (t0 == null || !m || t < t0 || t > t0 + m.dur + .2) continue;
    let s = 0, n = 0; const c = (t - t0) * 24;
    for (let k = -4; k <= 4; k++) { const v = m.a[Math.round(c + k)]; if (v != null) { s += v * (5 - Math.abs(k)); n += 5 - Math.abs(k); } }
    return n ? s / n : 0;
  }
  return 0;
}
