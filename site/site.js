// Akash, did we make it? · the screening room.
// The flow: the dark apartment, drawn live → the visitor turns on the lamp → the film (video) takes over at the exact
// frame where its own lamp clicks on → after the film, the room comes back live with the chairs empty and the page left
// on the table: the visitor picks it up and writes on it (nothing is stored or sent).
import { Room, loadX, CAM_ARRIVAL, CAM_EMPTY, toScreen } from './room.js';

const $ = id => document.getElementById(id);
const body = document.body, screenEl = document.querySelector('.screen'), stage = $('stage'), video = $('film');
const cfg = await fetch('film.json').then(r => r.json());
const AVAIL = cfg.available, FULL = cfg.full;
const fmt = s => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
$('lengthNote').textContent = AVAIL < FULL ? `play · ${fmt(AVAIL)} preview of a ${fmt(FULL)} film` : `play · ${fmt(FULL)}`;

// ——— the live room (falls back to the painted still if WebGL2 isn't there) ———
let X = null, room = null;
try { X = await loadX(); room = new Room($('room'), X, 'arrival'); body.classList.add('room-live'); } catch (err) { console.warn('live room unavailable:', err); }
const stills = { arrival: 'media/arrival.jpg', empty: 'media/empty.jpg' };
const showStill = k => { $('still').src = stills[k]; };

// ——— states ———
const STATES = ['is-arrival', 'is-lighting', 'is-playing', 'is-paused', 'is-ended', 'is-writing'];
function state(...on) { body.classList.remove(...STATES); body.classList.add(...on); }

// ——— layout: the 16:9 stage covers the screen, cropping at most a little; phones held upright get it letterboxed ———
function layout() {
  const vw = screenEl.clientWidth, vh = screenEl.clientHeight, portrait = vw / vh < .95;
  let w, h, left, top;
  if (portrait) { w = vw; h = vw * 9 / 16; left = 0; top = Math.max(12, (vh - h) / 2 - 60); }
  else {
    w = Math.max(vw, vh * 16 / 9); h = w * 9 / 16;
    if ((h - vh) / h > .2) { h = vh / .8; w = h * 16 / 9; }        // very wide screens: crop ≤ 20 % top+bottom
    if ((w - vw) / w > .34) { w = vw / .66; h = w * 9 / 16; }      // tall screens: crop ≤ 34 % of the sides
    left = (vw - w) / 2; top = (vh - h) / 2;
  }
  Object.assign(stage.style, { width: w + 'px', height: h + 'px', left: left + 'px', top: top + 'px' });
  const r = document.documentElement.style;
  r.setProperty('--u', (w / 100) + 'px');
  r.setProperty('--vt', (Math.max(0, -top) / h * 100) + '%');
  r.setProperty('--vb', (Math.max(0, top + h - vh) / h * 100) + '%');
  body.classList.toggle('portrait', portrait);
  const [lx, ly] = toScreen(CAM_ARRIVAL, [996, 700]), [px, py] = toScreen(CAM_EMPTY, [960, 782]);
  Object.assign($('lampHot').style, { left: lx * 100 + '%', top: ly * 100 + '%' });
  Object.assign($('pageHot').style, { left: px * 100 + '%', top: py * 100 + '%' });
  buildRoad();
}
addEventListener('resize', layout);

// ——— the road (the scrubber): the elevated road from the film, seen as a line of light. Lit up to the playhead,
// three streetlamps for the chapters; the part of the film not made yet is an unfinished, dashed road ———
const road = $('road'), svg = $('roadSvg'), seek = $('seek');
let R = null;
function buildRoad() {
  const w = road.clientWidth, h = road.clientHeight; if (!w) return;
  const y = h * .72, xA = AVAIL / FULL * w, NS = 'http://www.w3.org/2000/svg';
  const el = (n, a, p = svg) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); p.appendChild(e); return e; };
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.innerHTML = '';
  const defs = el('defs', {}), g = el('radialGradient', { id: 'headGlow' }, defs);
  el('stop', { offset: '0', 'stop-color': '#FFF4DC' }, g); el('stop', { offset: '.35', 'stop-color': '#FFD9A0', 'stop-opacity': '.9' }, g); el('stop', { offset: '1', 'stop-color': '#F2C27C', 'stop-opacity': '0' }, g);
  el('line', { class: 'built', x1: 0, y1: y, x2: xA, y2: y });
  if (xA < w - 2) {
    el('line', { class: 'unbuilt', x1: xA + 3, y1: y, x2: w, y2: y });
    const tx = el('text', { class: 'building', x: Math.min(w - 4, xA + (w - xA) / 2), y: y + 15, 'text-anchor': 'middle' }); tx.textContent = 'still building';
  }
  const played = el('line', { class: 'played', x1: 0, y1: y, x2: 0, y2: y });
  const tails = [0, 1, 2, 3].map(() => el('rect', { class: 'tail', width: 3, height: 2, y: y - 4 }));
  const posts = cfg.chapters.map((c, i) => {
    const x = Math.max(1, c.t / FULL * w), made = c.t < AVAIL;
    el('line', { class: 'post', x1: x, y1: y, x2: x, y2: y - h * .42 });
    el('circle', { class: made ? 'lit' : 'dark', cx: x, cy: y - h * .42 - 2, r: 3 });
    const tx = el('text', { x: x + 7, y: y - h * .42 + 2 }); tx.textContent = c.name + (made ? '' : ' · soon');
    return { tx, t: c.t, next: cfg.chapters[i + 1]?.t ?? FULL };
  });
  const head = el('circle', { class: 'head', cx: 0, cy: y, r: Math.max(9, h * .3) });
  R = { w, y, played, tails, posts, head };
  paintRoad(video.currentTime || 0);
}
function paintRoad(t) {
  if (!R) return;
  const x = t / FULL * R.w;
  R.played.setAttribute('x2', x); R.head.setAttribute('cx', x);
  R.tails.forEach((r, i) => { const u = ((performance.now() / 1000 * .09 + i / 4) % 1); r.setAttribute('x', Math.max(0, x - 8 - u * Math.min(x, 160))); r.setAttribute('opacity', x > 12 ? .9 * (1 - u) : 0); });
  R.posts.forEach(p => p.tx.classList.toggle('on', t >= p.t && t < p.next));
  seek.value = t.toFixed(1); seek.setAttribute('aria-valuetext', `${fmt(t)} of ${fmt(FULL)}`);
  $('time').textContent = `${fmt(t)} / ${fmt(FULL)}`;
}
seek.max = FULL;
seek.addEventListener('input', () => { const v = Math.min(+seek.value, AVAIL - .05); if (body.classList.contains('is-ended')) resumeFrom(v); else video.currentTime = v; paintRoad(v); });

// ——— captions: the film's VTT, drawn by the page (speaker in small caps, low and clear of faces) ———
const subs = $('subs'); let ccOn = true;
const track = video.textTracks[0];
if (track) {
  track.mode = 'hidden';
  track.addEventListener('cuechange', () => {
    const c = track.activeCues?.[0];
    if (!c || !ccOn) { subs.classList.remove('on'); return; }
    const m = c.text.match(/^<v ([^>]+)>([\s\S]*)$/), who = m ? m[1] : '', txt = (m ? m[2] : c.text).replace(/<[^>]+>/g, '');
    subs.innerHTML = ''; if (who) { const s = document.createElement('span'); s.className = 'who' + (/third/i.test(who) ? ' ty' : ''); s.textContent = who; subs.appendChild(s); }
    subs.appendChild(document.createTextNode(txt)); subs.classList.add('on');
  });
}

// ——— play / pause = the lamp ———
async function lampOn() {
  if (!body.classList.contains('is-arrival')) return;
  state('is-arrival', 'is-lighting');
  const note = $('lengthNote'), was = note.textContent; note.textContent = 'the light is warming up…';
  video.addEventListener('playing', () => { note.textContent = was; }, { once: true });
  try { video.currentTime = cfg.start; await video.play(); }
  catch (err) { $('lengthNote').textContent = 'the film could not start here: ' + (err.message || err); state('is-arrival'); }
}
function toggle() {
  if (body.classList.contains('is-arrival')) return lampOn();
  if (body.classList.contains('is-ended') || body.classList.contains('is-writing')) return;
  if (video.paused) video.play(); else video.pause();
}
function resumeFrom(t) {
  $('ending').hidden = true; closeSheet(true);
  room && (room.mode = 'arrival'); video.currentTime = t; video.play();
}
$('lampHot').addEventListener('click', lampOn);
$('cLamp').addEventListener('click', toggle);
stage.addEventListener('click', e => { if (e.target === video || e.target.classList.contains('dim') || e.target === stage) toggle(); });
video.addEventListener('playing', () => { if (document.activeElement === $('lampHot') || document.activeElement?.closest?.('.ending, .sheet')) $('cLamp').focus({ preventScroll: true }); state('is-playing'); body.classList.remove('room-live'); room?.stop(); $('cLamp').setAttribute('aria-label', 'Pause'); poke(); loop(); });
video.addEventListener('pause', () => { if (!video.ended && !body.classList.contains('is-ended')) { state('is-paused'); $('cLamp').setAttribute('aria-label', 'Play'); } });
video.addEventListener('ended', ending);
video.addEventListener('error', () => { $('lengthNote').textContent = 'the film file could not be loaded'; });
function loop() { if (video.paused) return; paintRoad(video.currentTime); requestAnimationFrame(loop); }
video.addEventListener('seeked', () => paintRoad(video.currentTime));

// controls show on movement while playing, hide after a while
let idle = 0;
function poke() { body.classList.add('show-ui'); clearTimeout(idle); idle = setTimeout(() => { if (!video.paused) body.classList.remove('show-ui'); }, 2600); }
addEventListener('pointermove', poke, { passive: true });
$('controls').addEventListener('focusin', () => { body.classList.add('show-ui'); clearTimeout(idle); });

// sound = the voice note; captions = the page
$('cVoice').addEventListener('click', () => { video.muted = !video.muted; $('cVoice').setAttribute('aria-pressed', video.muted); $('cVoice').setAttribute('aria-label', video.muted ? 'Unmute' : 'Mute'); });
$('cPage').addEventListener('click', () => { ccOn = !ccOn; $('cPage').setAttribute('aria-pressed', ccOn); if (!ccOn) subs.classList.remove('on'); });

// ——— after the film: the empty chairs, the question, the page ———
function ending() {
  state('is-ended'); $('ending').hidden = false; subs.classList.remove('on');
  if (room) { room.mode = 'empty'; room.t0 = performance.now(); body.classList.add('room-live'); room.start(); } else showStill('empty');
  paintRoad(AVAIL);
}
const sheet = $('sheet'), ink = $('ink');
function openSheet() {
  body.classList.add('is-writing'); sheet.hidden = false; sheet.classList.remove('away', 'is-kept'); sheet.classList.add('lifting');
  $('kept').hidden = true; ink.readOnly = false;
  setTimeout(() => ink.focus({ preventScroll: true }), 650);
}
function closeSheet(now = false) {
  if (sheet.hidden) return;
  stopSpeech();
  const done = () => { sheet.hidden = true; sheet.classList.remove('away', 'lifting'); body.classList.remove('is-writing'); };
  if (now) return done();
  sheet.classList.remove('lifting'); sheet.classList.add('away'); setTimeout(done, 780);
}
$('pageHot').addEventListener('click', openSheet);
$('done').addEventListener('click', () => { if (!ink.value.trim()) { ink.focus(); return; } stopSpeech(); ink.readOnly = true; sheet.classList.add('is-kept'); $('kept').hidden = false; $('another').focus(); });
$('another').addEventListener('click', () => { ink.value = ''; ink.readOnly = false; sheet.classList.remove('is-kept'); $('kept').hidden = true; ink.focus(); });
const again = () => resumeFrom(cfg.start);
$('again').addEventListener('click', again); $('again2').addEventListener('click', again);

// speaking instead of typing, where the browser offers it (disclosed; typing is the equal alternative)
const SR = window.SpeechRecognition || window.webkitSpeechRecognition; let rec = null;
if (SR) { $('say').hidden = false; $('speechNote').hidden = false; }
function stopSpeech() { if (rec) { try { rec.stop(); } catch { } rec = null; $('say').setAttribute('aria-pressed', 'false'); $('say').textContent = 'say it'; } }
$('say').addEventListener('click', () => {
  if (rec) return stopSpeech();
  rec = new SR(); rec.lang = 'en'; rec.interimResults = true; rec.continuous = false;
  const base = ink.value ? ink.value.replace(/\s*$/, ' ') : '';
  rec.onresult = ev => { let s = ''; for (const r of ev.results) s += r[0].transcript; ink.value = base + s; };
  rec.onend = () => stopSpeech(); rec.onerror = () => stopSpeech();
  $('say').setAttribute('aria-pressed', 'true'); $('say').textContent = 'listening… (stop)';
  rec.start();
});

// ——— keyboard ———
addEventListener('keydown', e => {
  if (e.target === ink) { if (e.key === 'Escape') closeSheet(); return; }
  if (e.target.closest && e.target.closest('.below')) return;
  const k = e.key.toLowerCase();
  if (k === ' ' || k === 'k') { if (e.target.tagName !== 'BUTTON' || e.target === $('cLamp')) { e.preventDefault(); toggle(); } }
  else if (k === 'arrowleft' && e.target !== seek) { video.currentTime = Math.max(cfg.start, video.currentTime - 5); }
  else if (k === 'arrowright' && e.target !== seek) { video.currentTime = Math.min(AVAIL - .05, video.currentTime + 5); }
  else if (k === 'm') $('cVoice').click();
  else if (k === 'c') $('cPage').click();
  else if (k === 'escape') closeSheet();
  poke();
});

// ——— the transcript (the whole script; the preview so far covers the first lines) ———
const D = await fetch('data/dialogue.json').then(r => r.json()).catch(() => null);
if (D) {
  const L = Array.isArray(D) ? D : D.lines, ol = $('lines');
  for (const l of L) {
    const li = document.createElement('li'), w = document.createElement('span'), ty = l.id[0] === 'T';
    w.className = 'who' + (ty ? ' ty' : ''); w.textContent = ty ? 'Third-year' : 'First-year';
    const tc = document.createElement('span'); tc.className = 'tc'; tc.textContent = fmt(l.start_seconds) + (l.start_seconds >= AVAIL ? ' · not in the preview yet' : ''); w.appendChild(tc);
    const p = document.createElement('span'); p.textContent = l.text;
    li.append(w, p); ol.appendChild(li);
  }
  $('tNote').textContent = AVAIL < FULL ? `The film is being made in order. The preview runs to ${fmt(AVAIL)}; these are the words of the whole ${fmt(FULL)}.` : '';
}

// ——— how it was made: the same room, live, one layer at a time (runs only while on screen) ———
let layers = null;
try { if (X) layers = new Room($('layersCv'), X, 'layers'); } catch (err) { console.warn(err); }
const NOTES = {
  final: 'The finished frame: flat cel paint, then the lamplight and the city glow blooming through a soft tape pass.',
  raw: 'Paint only: the flat cel colours and lines as code draws them, before any light or tape.',
  light: 'Light only: everything in the frame that gives off light (lamps, windows, traffic, the moon), the layer that blooms.',
};
document.querySelectorAll('.dial button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.dial button').forEach(x => x.setAttribute('aria-checked', x === b));
  if (layers) { layers.view = b.dataset.view; layers.draw(performance.now()); }
  $('layerNote').textContent = NOTES[b.dataset.view];
}));

// run each live room only while it can be seen
const io = new IntersectionObserver(es => es.forEach(en => {
  if (en.target === screenEl && room) { if (en.isIntersecting && body.classList.contains('room-live')) room.start(); else room.stop(); }
  if (en.target.id === 'layersCv' && layers) { if (en.isIntersecting) layers.start(); else layers.stop(); }
}), { threshold: .05 });
io.observe(screenEl); io.observe($('layersCv'));

layout();
state('is-arrival');
if (room) room.start(); else showStill('arrival');
