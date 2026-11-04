// The film's clock, read from timeline.json (written by tools/voices.py from the measured voice files).
// NOTHING in the picture is pinned to absolute seconds: every event is an anchor on a line,
//   at(id, 'start' | 'end' | 'part_N_start' | 'part_N_end', offset_s)   or   frac(id, f)  (f of the line's voiced span).
// The only fixed durations are the preroll, every gap_before_s, every beat_s and the end card (all from dialogue.json).

export function makeTL(TL) {
  const L = TL.lines, order = TL.order;
  const voiced = id => [L[id].parts[0][0], L[id].parts[L[id].parts.length - 1][1]];
  const at = (id, anchor = 'start', off = 0) => {
    const l = L[id]; if (!l) throw new Error(`timeline: no line ${id}`);
    let t;
    if (anchor === 'start') t = voiced(id)[0];
    else if (anchor === 'end') t = voiced(id)[1];
    else { const m = /^part_(\d+)_(start|end)$/.exec(anchor); if (!m) throw new Error(`timeline: bad anchor ${anchor}`); const p = l.parts[+m[1] - 1]; t = m[2] === 'start' ? p[0] : p[1]; }
    return t + off;
  };
  const frac = (id, f) => { const [a, b] = voiced(id); return a + (b - a) * f; };
  const prev = id => order[order.indexOf(id) - 1];
  // the line being spoken at t (voiced span only), or null
  const speaking = t => { for (const id of order) { const [a, b] = voiced(id); if (t >= a && t < b) return id; } return null; };
  // the line that "owns" t: the last line whose cut has happened (for listener/eyeline logic)
  const current = t => { let c = order[0]; for (const id of order) if (t >= L[id].start - .4) c = id; return c; };
  return { TL, L, order, at, frac, voiced, prev, speaking, current, total: TL.total, card: TL.end_card };
}

// ——— the cut list, built from each line's `shot` (and `cut_to`), with the script's held moments ———
// returns [{ shot, t0, t1, line }] covering 0 … total
export function cutList(T) {
  const { at, frac, L, order } = T, out = [];
  const push = (shot, t0, line) => {
    const last = out[out.length - 1];
    if (last && last.shot === shot) return;            // same setup continues: no cut
    if (last) last.t1 = t0;
    out.push({ shot, t0, t1: null, line });
  };
  // cold open: PHONE from frame 1 (no black) through VN01 and its stop click; the lamp click cuts to W
  const LAMP = lampClick(T);
  push('PHONE', 0, 'VN01');
  push('W', LAMP, 'VN01');
  for (const id of order.slice(1)) {
    const l = L[id], gap = l.start - L[T.prev(id)].end;
    const lead = Math.min(.25, gap * .5);
    if (id === 'Y01') { push('FY', at('Y01', 'start', -.1), id); continue; }          // W held 0.6 s after the lamp click
    if (id === 'Y05') {                                                                // FY holds 0.5 s on the dare, then W + title
      push('W', at('Y04', 'end', .5), id); push('FY', at('Y05', 'start', -.05), id); continue;
    }
    if (id === 'Y20') {                                                                // Y19 held 1.5 s, then W: the sheet slides back
      push('W', at('Y19', 'end', 1.5), id); push('FY', at('Y20', 'start', -.1), id); continue;
    }
    if (id === 'T22') {                                                                // PHONE: TY holds record; then PAPER writes the line
      push('PHONE', at('Y20', 'end', .35), id); push('PAPER', frac('T22', .2), id); continue;
    }
    push(l.shot, l.start - lead, id);
    if (l.cut_to) {                                                                   // e.g. T05 → PAPER at part 2 start
      const m = /part (\d+) start/.exec(l.cut_to.at);
      push(l.cut_to.shot, m ? at(id, `part_${m[1]}_start`, -.15) : l.start, id);
    }
    if (id === 'T19') {                                                               // a brief PAPER flash on "Maybe physical AI"
      push('PAPER', frac('T19', .47), id); push('TY', frac('T19', .66), id);
    }
  }
  push('BLACK', T.card[0], null);
  out[out.length - 1].t1 = T.total;
  return out;
}

// the opening's two clicks, anchored to VN01's end (dialogue.json: Y01's gap covers stop click, lamp click +0.4 s, W 0.6 s)
export const stopClick = T => T.at('VN01', 'end', .05);
export const lampClick = T => T.at('VN01', 'end', .45);
