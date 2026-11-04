(() => {
  const $ = (id) => document.getElementById(id);
  const film = $('film'), lines = $('lines'), ask = $('ask');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // lamp glow follows the pointer
  if (!reduce) addEventListener('pointermove', (e) => {
    document.documentElement.style.setProperty('--mx', e.clientX + 'px');
    document.documentElement.style.setProperty('--my', e.clientY + 'px');
  }, { passive: true });

  // runtime read from the film itself
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  film.addEventListener('loadedmetadata', () => { $('runtime').textContent = '· ' + fmt(film.duration); });

  $('playBtn').addEventListener('click', () => {
    film.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    film.play().catch(() => {});
  });
  film.addEventListener('play', () => document.body.classList.add('playing'));
  film.addEventListener('pause', () => document.body.classList.remove('playing'));
  film.addEventListener('ended', () => {
    document.body.classList.remove('playing');
    ask.hidden = false;
    ask.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });

  // the page writes itself from the captions
  let cues = [];
  const toSec = (t) => { const p = t.split(':').map(parseFloat); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; };
  fetch('film/film.vtt').then((r) => r.text()).then((txt) => {
    txt.replace(/\r/g, '').split('\n\n').forEach((block) => {
      const m = block.match(/([\d:.]+)\s+-->\s+([\d:.]+)[^\n]*\n([\s\S]+)/);
      if (!m) return;
      let body = m[3].trim(), who = '';
      const v = body.match(/^<v ([^>]+)>/);
      if (v) { who = v[1]; body = body.slice(v[0].length); }
      body = body.replace(/<[^>]+>/g, '').replace(/\n/g, ' ');
      cues.push({ start: toSec(m[1]), end: toSec(m[2]), who, body });
    });
    cues.forEach((c, i) => {
      const li = document.createElement('li');
      const fy = /first/i.test(c.who);
      li.className = fy ? 'fy' : 'ty';
      li.tabIndex = 0;
      li.innerHTML = `<span class="who">${fy ? '1ST' : c.who ? '3RD' : ''}</span><span></span>`;
      li.lastChild.textContent = c.body;
      const go = () => { film.currentTime = c.start + 0.01; film.play().catch(() => {}); film.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); };
      li.addEventListener('click', go);
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      c.el = li; lines.appendChild(li);
    });
  }).catch(() => { $('paperNote').textContent = 'The page stays blank for now.'; });

  let started = false;
  film.addEventListener('timeupdate', () => {
    const t = film.currentTime;
    if (!started && t > 0) { started = true; $('paperNote').textContent = "Then don't write it. Say it."; }
    cues.forEach((c) => {
      c.el.classList.toggle('said', t >= c.start);
      c.el.classList.toggle('now', t >= c.start && t < c.end + 0.3);
    });
  });

  // after the film: speak or type
  const card = $('card'), cardText = $('cardText'), typebox = $('typebox'), status = $('speakStatus');
  const show = (text) => {
    text = text.trim(); if (!text) return;
    cardText.textContent = '“' + text.replace(/^“|”$/g, '') + '”';
    card.hidden = false; card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
  };
  $('typeBtn').addEventListener('click', () => {
    typebox.hidden = false; $('typeBtn').setAttribute('aria-pressed', 'true'); $('answer').focus();
  });
  $('makeCard').addEventListener('click', () => show($('answer').value));
  $('answer').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); show(e.target.value); } });

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const speakBtn = $('speakBtn');
  if (!SR) speakBtn.hidden = true;
  else {
    let rec = null;
    speakBtn.addEventListener('click', () => {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = 'en-US'; rec.interimResults = true;
      let final = '';
      rec.onstart = () => { speakBtn.classList.add('listening'); speakBtn.textContent = '■ Stop'; status.textContent = 'Listening… say it.'; };
      rec.onresult = (e) => {
        let interim = '';
        for (const r of e.results) (r.isFinal ? (final = r[0].transcript) : (interim = r[0].transcript));
        status.textContent = interim || final;
      };
      rec.onerror = (e) => { status.textContent = e.error === 'not-allowed' ? 'Microphone blocked. Try Type instead.' : 'Didn’t catch that. Try again or type it.'; };
      rec.onend = () => {
        speakBtn.classList.remove('listening'); speakBtn.textContent = '● Speak'; rec = null;
        if (final) { status.textContent = ''; show(final); }
      };
      rec.start();
    });
  }

  $('copyBtn').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(cardText.textContent); $('copyBtn').textContent = 'Copied'; }
    catch { $('copyBtn').textContent = 'Select & copy'; }
    setTimeout(() => ($('copyBtn').textContent = 'Copy'), 1600);
  });

  // count up the real numbers when they scroll in
  if (!reduce && 'IntersectionObserver' in window) {
    const els = document.querySelectorAll('[data-count]');
    const io = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (!en.isIntersecting) return; io.unobserve(en.target);
      const el = en.target, to = +el.dataset.count, t0 = performance.now();
      const step = (now) => { const k = Math.min(1, (now - t0) / 900); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
      el.textContent = '0'; requestAnimationFrame(step);
    }), { threshold: .6 });
    els.forEach((el) => io.observe(el));
  }
})();
