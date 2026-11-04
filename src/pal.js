// Colour models (色指定) for "Did We Make It?" — PLAN §6 tokens + one model per lighting set (CHARACTER_BIBLE §10).
// Characters are specified once in neutral light (BASE); each set multiplies lit / shadow / line separately,
// and SKIN is specified by hand in every set (multiplying skin turns faces muddy or pink).
import { hex } from './cel.js';

// PLAN §6 — the only design tokens. Everything below is derived from these or is a neutral cel colour.
export const TOK = {
  ink: '#111820', midnight: '#1D2B3A', slate: '#40576A', ivory: '#F1EBDD',
  amber: '#D3A15F', teal: '#6F9B9A', sage: '#8B9A88', rust: '#A76550',
};

export const BASE = {
  // one person: identical skin / hair / eyes for both Skys (proposed design, to be replaced from Sky's references)
  skin: { f: '#B47B58', s: '#8A5640', h: '#CB9676', l: '#4A2A1E' },
  blush: '#B8644E',
  hair: { f: '#33251F', s: '#1D1511', h: '#6E5444', l: '#26141C' },
  lash: '#1B1319',
  eye: { f: '#5A3626', s: '#33201A', h: '#8C6046', l: '#1A0F0B' },
  white_eye: '#F2ECE2',
  mouth: '#5C2A28',
  // First-year Sky: warm-ivory crew tee, amber lanyard, navy backpack with amber strap, light slate hoodie (memory)
  tee1: { f: '#E7DFCD', s: '#B8AC97', h: '#F6F1E6', l: '#6A5F4C' },
  amber: { f: '#D3A15F', s: '#A6773D', h: '#E8C38C', l: '#5E3F1C' },
  card: { f: '#F1EBDD', s: '#C9BFAA', l: '#6A604F' },
  pack: { f: '#2E3B55', s: '#1E2739', h: '#4A5A78', l: '#0F1522' },
  hoodie: { f: '#8C9CA8', s: '#677884', h: '#AAB8C2', l: '#33414C' },
  // Third-year Sky: dark slate overshirt open over a dark tee, sleeves pushed up, muted-teal stitching / notebook
  over: { f: '#34424F', s: '#222C36', h: '#4F6171', l: '#111921' },
  tee3: { f: '#1F262E', s: '#141A20', h: '#323C47', l: '#0A0E12' },
  teal: { f: '#6F9B9A', s: '#4C7372', h: '#9CC0BE', l: '#22403F' },
  // shared: jeans, sneakers (Third-year's a little more worn)
  jeans: { f: '#4A5B75', s: '#334157', h: '#687C98', l: '#1B2537' },
  jeans3: { f: '#3E4A5C', s: '#2A3444', h: '#5A687C', l: '#151C28' },
  shoe1: { f: '#E9E5DB', s: '#B9B3A5', h: '#FFFFFF', l: '#555046' },
  shoe3: { f: '#C6C0B2', s: '#99927F', h: '#DDD8CC', l: '#4A453B' },
  sole: { f: '#F1EBDD', s: '#BDB5A3', l: '#555046' },
  // props
  wood: { f: '#6B5038', s: '#4A3524', h: '#8C6C4E', l: '#2A1C10' },
  paper: { f: '#F1EBDD', s: '#CFC5B0', h: '#FFFFFF', l: '#7A6E58' },
  metal: { f: '#5A6672', s: '#3A444E', h: '#8A96A2', l: '#161C22' },
  chair: { f: '#3A3F48', s: '#262A31', h: '#565D68', l: '#111418' },
};

const mul = (c, m) => { const v = hex(c); return '#' + v.map((x, i) => Math.max(0, Math.min(255, Math.round(x * m[i]))).toString(16).padStart(2, '0')).join(''); };

// lit (f, h), shade (s), line (l) multipliers per set, plus hand-specified skin and an optional rim colour
export const SETS = {
  neutral: { lit: [1, 1, 1], shade: [1, 1, 1], line: [1, 1, 1],
    skin: null, rim: null },
  // 0–30 s: night room, desk-lamp amber key from screen right; midnight / ink shadows
  night: { lit: [.9, .8, .68], shade: [.46, .5, .66], line: [.72, .72, .9],
    skin: { f: '#A86F4D', s: '#5C4752', h: '#C68B60', l: '#3A2028' }, blush: '#9A5444', rim: '#D3A15F' },
  // 30–60 s: first-year memory, late-afternoon amber; warmest skin
  memory: { lit: [1.06, .96, .82], shade: [.8, .7, .7], line: [.9, .82, .8],
    skin: { f: '#C3855A', s: '#8E5A46', h: '#DEA47A', l: '#4A2A1E' }, blush: '#C0684E', rim: '#E8C38C' },
  // 60–120 s: build nights, monitor teal on the screen side + lamp amber; skin stays natural
  build: { lit: [.8, .82, .84], shade: [.42, .5, .58], line: [.7, .76, .86],
    skin: { f: '#A47558', s: '#5A4C52', h: '#BE8E6C', l: '#3A2228' }, blush: '#985846', rim: '#6F9B9A' },
  // 120–150 s: no replies, cool monitor, low saturation (no red failure light)
  noreply: { lit: [.68, .72, .78], shade: [.4, .44, .52], line: [.62, .66, .78],
    skin: { f: '#8F6E5E', s: '#544A52', h: '#A3806E', l: '#33242A' }, blush: '#80584C', rim: '#8FAAA8' },
  // 150–180 s: morning from window and door, sage + amber, ivory highlights
  morning: { lit: [1.0, .98, .92], shade: [.6, .66, .66], line: [.82, .84, .86],
    skin: { f: '#B98261', s: '#7C5C50', h: '#D8A47E', l: '#45291F' }, blush: '#B46450', rim: '#F1EBDD' },
  // backlit silhouette against the open door, warm rim
  backlit: { lit: [.36, .34, .36], shade: [.24, .24, .28], line: [.32, .3, .38],
    skin: { f: '#4E3832', s: '#36282A', h: '#6A4C40', l: '#1E1416' }, blush: '#4E3832', rim: '#E8C38C' },
};

export function palette(name) {
  const L = SETS[name], out = {};
  for (const [k, v] of Object.entries(BASE)) {
    if (typeof v === 'string') { out[k] = mul(v, L.lit); continue; }
    out[k] = {};
    for (const [kk, c] of Object.entries(v)) out[k][kk] = mul(c, kk === 's' ? L.shade : kk === 'l' ? L.line : L.lit);
  }
  if (L.skin) out.skin = { ...L.skin };
  if (L.blush) out.blush = L.blush;
  out.rim = L.rim; out.name = name;
  return out;
}
export const PAL = Object.fromEntries(Object.keys(SETS).map(k => [k, palette(k)]));
