(() => {
  const $ = (id) => document.getElementById(id);
  const film = $('film'), theatre = $('theatre'), lines = $('lines'), ask = $('ask');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (s) => { s = Math.max(0, s || 0); return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; };

  // Bengaluru time in the nav
  const clock = () => { try { $('clock').textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST'; } catch {} };
  clock(); setInterval(clock, 30000);

  // chapters = metro stations on the scrubber
  const STATIONS = [
    [0, 'The blank page'], [24, 'Three products'], [64, 'Up till three'], [85, 'Money'],
    [103, 'The middle'], [124, "What's next"], [139, 'Say it'],
  ];
  let dur = 152;
  const drawStations = () => {
    $('stations').innerHTML = '';
    STATIONS.forEach(([t, name]) => {
      const s = document.createElement('span');
      s.style.left = (t / dur) * 100 + '%';
      s.innerHTML = '<em></em>'; s.firstChild.textContent = name; s.dataset.t = t;
      s.addEventListener('pointerdown', (e) => { e.stopPropagation(); film.currentTime = t + 0.01; });
      $('stations').appendChild(s);
    });
  };
  drawStations();
  film.addEventListener('loadedmetadata', () => {
    dur = film.duration || dur;
    document.querySelectorAll('#runtime, .rt').forEach((el) => (el.textContent = fmt(dur)));
    $('line').setAttribute('aria-valuemax', Math.round(dur));
    drawStations();
  });

  // ---------- cinema: the film fills the screen, the page scrolls on below it ----------
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const enterFs = () => {
    const el = document.documentElement, fn = el.requestFullscreen || el.webkitRequestFullscreen;
    if (fn) try { const p = fn.call(el); if (p && p.catch) p.catch(() => {}); } catch {}
  };
  const exitFs = () => {
    const fn = document.exitFullscreen || document.webkitExitFullscreen;
    if (fsEl() && fn) try { const p = fn.call(document); if (p && p.catch) p.catch(() => {}); } catch {}
  };
  const cinema = () => document.body.classList.contains('cinema');

  const open = (at) => {
    document.body.classList.add('cinema');
    theatre.hidden = false; theatre.classList.remove('mini');
    window.scrollTo(0, 0);
    enterFs();
    if (typeof at === 'number') film.currentTime = at;
    film.play().catch(() => theatre.classList.add('paused'));
    wake();
  };
  const close = () => {
    film.pause(); exitFs();
    theatre.hidden = true; theatre.classList.remove('mini');
    document.body.classList.remove('cinema');
  };
  $('playBtn').addEventListener('click', () => open());
  $('openFilm').addEventListener('click', () => open());
  $('close').addEventListener('click', close);
  $('fsBtn').addEventListener('click', () => (fsEl() ? exitFs() : enterFs()));
  $('scrollHint').addEventListener('click', () => $('st-page').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }));

  // shrink to a mini player as you scroll down; tap it to go back up
  const onScroll = () => { if (cinema()) theatre.classList.toggle('mini', window.scrollY > innerHeight * 0.45); };
  addEventListener('scroll', onScroll, { passive: true });
  theatre.addEventListener('click', (e) => {
    if (!theatre.classList.contains('mini')) return;
    e.stopPropagation(); window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }, true);

  // controls auto-hide
  let idle;
  const wake = () => { theatre.classList.add('awake'); clearTimeout(idle); idle = setTimeout(() => !film.paused && theatre.classList.remove('awake'), 2400); };
  theatre.addEventListener('pointermove', wake);
  theatre.addEventListener('touchstart', wake, { passive: true });

  const toggle = () => (film.paused ? film.play() : film.pause());
  $('pp').addEventListener('click', toggle);
  film.addEventListener('click', toggle);
  film.addEventListener('play', () => { theatre.classList.remove('paused'); $('pp').setAttribute('aria-label', 'Pause'); wake(); });
  film.addEventListener('pause', () => { theatre.classList.add('paused'); $('pp').setAttribute('aria-label', 'Play'); });
  $('mute').addEventListener('click', () => { film.muted = !film.muted; $('mute').setAttribute('aria-pressed', film.muted); });
  let capsOn = true;
  $('cc').addEventListener('click', () => { capsOn = !capsOn; $('cc').setAttribute('aria-pressed', capsOn); $('cap').classList.toggle('off', !capsOn); });

  // scrubber: drag the train
  const line = $('line');
  const seekTo = (x) => { const r = line.getBoundingClientRect(); film.currentTime = Math.min(1, Math.max(0, (x - r.left) / r.width)) * dur; };
  let drag = false;
  line.addEventListener('pointerdown', (e) => { drag = true; line.setPointerCapture(e.pointerId); seekTo(e.clientX); });
  line.addEventListener('pointermove', (e) => drag && seekTo(e.clientX));
  line.addEventListener('pointerup', () => (drag = false));
  line.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') film.currentTime += 5; else if (e.key === 'ArrowLeft') film.currentTime -= 5; else return;
    e.preventDefault(); e.stopPropagation();
  });

  document.addEventListener('keydown', (e) => {
    if (!cinema() || theatre.classList.contains('mini') || /TEXTAREA|INPUT/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'k') { e.preventDefault(); toggle(); }
    else if (k === 'm') $('mute').click();
    else if (k === 'c') $('cc').click();
    else if (k === 'f') $('fsBtn').click();
    else if (k === 'arrowright') film.currentTime += 5;
    else if (k === 'arrowleft') film.currentTime -= 5;
    else if (k === 'escape' && !fsEl()) close();
    else return;
    wake();
  });

  // ---------- captions + the page that writes itself ----------
  let cues = [];
  const toSec = (t) => { const p = t.split(':').map(parseFloat); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; };
  fetch('film/film.vtt').then((r) => r.text()).then((txt) => {
    txt.replace(/\r/g, '').split('\n\n').forEach((block) => {
      const m = block.match(/([\d:.]+)\s+-->\s+([\d:.]+)[^\n]*\n([\s\S]+)/);
      if (!m) return;
      let body = m[3].trim(), who = '';
      const v = body.match(/^<v ([^>]+)>/);
      if (v) { who = v[1]; body = body.slice(v[0].length); }
      cues.push({ start: toSec(m[1]), end: toSec(m[2]), fy: /first/i.test(who), body: body.replace(/<[^>]+>/g, '').replace(/\n/g, ' ') });
    });
    cues.forEach((c) => {
      const li = document.createElement('li');
      li.className = c.fy ? 'fy' : 'ty'; li.tabIndex = 0;
      li.innerHTML = `<span class="who">${c.fy ? '1ST' : '3RD'}</span><span></span>`;
      li.lastChild.textContent = c.body;
      const go = () => open(c.start + 0.01);
      li.addEventListener('click', go);
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      c.el = li; lines.appendChild(li);
    });
  }).catch(() => { $('paperNote').textContent = 'The page stays blank for now.'; });

  let shown = null;
  film.addEventListener('timeupdate', () => {
    const t = film.currentTime, p = (t / dur) * 100;
    $('done').style.width = p + '%'; $('dot').style.left = p + '%';
    $('time').textContent = fmt(t); line.setAttribute('aria-valuenow', Math.round(t));
    const next = STATIONS.find(([s]) => s > t);
    $('nowAt').textContent = next ? next[1] : 'End of the line';
    document.querySelectorAll('#stations span').forEach((s) => s.classList.toggle('passed', +s.dataset.t <= t));

    const cur = cues.find((c) => t >= c.start && t < c.end + 0.15);
    if (cur !== shown) {
      shown = cur;
      $('cap').innerHTML = cur ? `<b class="${cur.fy ? 'fy' : 'ty'}">${cur.fy ? 'FIRST YEAR' : 'THIRD YEAR'}</b>` : '';
      if (cur) {
        $('cap').appendChild(document.createTextNode(cur.body));
        if (cur.el) lines.scrollTop = Math.max(0, cur.el.offsetTop - lines.offsetTop - 140);
      }
    }
    if (t > 0.2) $('paperNote').textContent = "Then don't write it. Say it.";
    cues.forEach((c) => { if (!c.el) return; c.el.classList.toggle('said', t >= c.start); c.el.classList.toggle('now', c === cur); });
  });

  film.addEventListener('ended', () => {
    close(); ask.hidden = false; ask.classList.add('in');
    setTimeout(() => ask.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }), 300);
  });

  // ---------- after the film: speak or type ----------
  const card = $('card'), cardText = $('cardText'), typebox = $('typebox'), status = $('speakStatus');
  const show = (text) => {
    text = text.trim(); if (!text) return;
    cardText.textContent = '“' + text + '”';
    card.hidden = false; card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
  };
  $('typeBtn').addEventListener('click', () => { typebox.hidden = false; $('typeBtn').setAttribute('aria-pressed', 'true'); $('answer').focus(); });
  $('makeCard').addEventListener('click', () => show($('answer').value));
  $('answer').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); show(e.target.value); } });

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const speakBtn = $('speakBtn');
  if (!SR) speakBtn.hidden = true;
  else {
    let rec = null;
    speakBtn.addEventListener('click', () => {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = 'en-IN'; rec.interimResults = true;
      let final = '';
      rec.onstart = () => { speakBtn.classList.add('listening'); speakBtn.textContent = '■ Stop'; status.textContent = 'Listening… say it.'; };
      rec.onresult = (e) => { let interim = ''; for (const r of e.results) r.isFinal ? (final = r[0].transcript) : (interim = r[0].transcript); status.textContent = interim || final; };
      rec.onerror = (e) => { status.textContent = e.error === 'not-allowed' ? 'Microphone blocked. Try Type instead.' : 'Didn’t catch that. Try again or type it.'; };
      rec.onend = () => { speakBtn.classList.remove('listening'); speakBtn.textContent = '● Speak'; rec = null; if (final) { status.textContent = ''; show(final); } };
      rec.start();
    });
  }
  $('copyBtn').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(cardText.textContent); $('copyBtn').textContent = 'Copied'; } catch { $('copyBtn').textContent = 'Select & copy'; }
    setTimeout(() => ($('copyBtn').textContent = 'Copy'), 1600);
  });

  // ---------- traction dots ----------
  document.querySelectorAll('.dots').forEach((d) => {
    const n = +d.dataset.n, lit = +d.dataset.lit;
    for (let i = 0; i < n; i++) {
      const dot = document.createElement('i');
      if (i < lit) dot.className = 'lit';
      dot.style.transitionDelay = i * 22 + 'ms';
      d.appendChild(dot);
    }
  });

  // ---------- stations: number in order (01, 02, 03…) and zigzag left / right ----------
  const KN = '೦೧೨೩೪೫೬೭೮೯';
  const renumber = () => {
    [...document.querySelectorAll('[data-station]')].filter((el) => !el.hidden).forEach((el, i) => {
      const n = String(i + 1).padStart(2, '0');
      el.querySelector('.num').textContent = n;
      el.querySelector('.knum').textContent = String(i + 1).split('').map((d) => KN[+d]).join('');
      el.classList.toggle('flip', i % 2 === 1);
    });
  };
  renumber();
  film.addEventListener('ended', renumber);

  // ---------- reveal on scroll, count-ups, dots ----------
  const countUp = (el) => {
    const to = +el.dataset.count, t0 = performance.now();
    const step = (now) => { const k = Math.min(1, (now - t0) / 900); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    el.textContent = '0'; requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target; io.unobserve(el);
      el.classList.add('in');
      el.querySelectorAll('[data-count]').forEach(countUp);
      el.querySelectorAll('.dots').forEach((d) => d.classList.add('go'));
    }), { threshold: 0.18 });
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
    document.querySelectorAll('.dots').forEach((d) => d.classList.add('go'));
  }
})();
