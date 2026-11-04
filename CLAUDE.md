# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Film project folder for **"Did We Make It?"**: a 180 s portfolio film for the Wispr Flow hiring challenge, made in code
with Lemo-Opuscar, style `cel-anime-80s`. The workspace-level `../CLAUDE.md` covers the library, the page contract
and the build commands; this file only covers what is specific to this film.

## State (updated 2026-11-04, end of the cloud session): resume here

**Gate B: COMPLETE and LOCKED. Gate C: done for clip 01's six lines only. Gate D: clip 01 (0–30 s) built and rendered
as preview v3, WAITING FOR SKY'S REVIEW. Clips 02–06 and the website (Gate E) have NOT started; don't start them
until Sky approves clip 01.** Everything is on `main` (commit `32a2765`) and on branch `ccr-f0287510-7jx7hj`.
Build in this folder, not inside `animation-engine/`; run `core/` commands from the library root
(`LIB` = `C:/Users/User/lemo-opuscar`) with this folder as the argument.

**Where clip 01 stands (v3, sent to Sky):**
- Watch: `preview/clip01_preview.mp4` (+ `preview/clip01_preview.srt`, `preview/clip01_CONTACT.jpg`, `preview/clip01/`).
- Sky's notes so far, all addressed in v1→v3: paper size must stay constant (one A4 page = 236 × 167 rig units ×
  the shot's figure scale; hands hold it fingers-behind / thumb-in-front); remove the constant noise (no ambience
  bed at all now: every sound is a placed event); First-year must sound EXCITED and fast early on ("did we make
  it?!", rising); smoother and more realistic; hook the viewer. v3 hook: heel taps over black → dark room lit by the
  window → the desk lamp clicks on and flickers up at 0.75 s → lit two-shot with wall shadows, dust, window life.
- Open questions put to Sky (answer before doing any): (1) add neutral "ah"/"ee" mouth drawings to the locked
  `src/sky.js` for more natural lip sync; (2) hair motion (the head has none, so the fan can't lift it);
  (3) a soft music pulse under the opening (the script says no music in scene 1); (4) tighten S1-03's hold and the
  S1-05 insert (changes the approved shot list). Also: subtitles still read "So… did we make it?" (script text);
  the TTS says "?!". Change the script only if Sky asks.
- Known limits: lips don't always close on M/B/P; the Whisper ASR check (`core/tts/asr_check.py`) has NOT been run
  (Hugging Face was blocked in the cloud); TY's pushing hand in S1-04 is still a bit large.

**How clip 01 is built (Gate C/D files, all new, none of the locked modules edited):**
- Page: `index.html` → `src/boot.js` (`?sheet=` → look-dev `src/main.js`, unchanged; otherwise → `src/film.js`).
  `src/film.js` = page contract (`READY`, `render(t)`, `DUR`, `EV`, `TEXTS`), `?clip=01`, tape pass as in main.js.
  `src/clip01.js` = shots S1-01…S1-08 + `events01()` (all sound events), built only from `figure`/`POSES`/
  `handShape`/`limbOutline` (body.js), `roomPlate`/`desk`/`sheet`/`lamp` (plates.js), `PAL.night`. Arms that act on
  props use runtime poses added to `POSES` per frame (data, not a body.js edit). `src/perf.js` = easing, spring,
  blinks, breath, sway, saccades, lip lookup. Motion on ones (24/s), mouths on twos (12/s) — Sky asked for smoother
  than the style's twos/threes.
- Timing: `timeline.json` = clip ranges + where each line STARTS; lengths come from `voices/dur.json`.
  Current starts: Y01 3.18, T01 7.55, Y02 11.2, Y03 13.3, T02 21.2, Y04 25.4 (all fit; `tools/check_timing.py`).
- Voices: `tools/make_lines.py` (casting + per-line performance: Kokoro `am_liam` for both, FY speed 1.0–1.2, TY 0.92;
  punctuation-only `say` variants, checked to keep the words) → `tts/lines.json` → `$LIB/core/tts/tts.py` →
  `voices/<ID>.wav` → `tools/perform.py` (Praat PSOLA melody reshaping of TEMP takes only: Y01 rises at the end) →
  `tools/lipsync.py` (→ `voices/mouth.json`, `voices/dur.json`). `VOICE_REPLACEMENT.md` = how Sky's recordings
  replace the temp files (`--keep-voices` skips TTS + perform).
- Sound: `events.json` (exported by `$LIB/core/render/events.mjs`) → `tools/mix.py` (all synthesised with
  `core/audio/sfx.py`; stems in `out/stems/`; pre-mastered to −14 LUFS) → `$LIB/core/render/mux.sh`.
- Subtitles: `tools/check_timing.py` → `subs/clip01_cues.json` → `$LIB/core/render/srt.py` → `subs/clip01.srt`.
- One command: `sh tools/build_clip.sh 01 [--keep-voices] [--workers 3]` (runs every step above). `out/` is
  git-ignored (render scratch); the reviewed preview is copied to `preview/`.

**Setting up the laptop to rebuild (the cloud had these; check before building):**
- `git pull` in this folder (main). Library: `C:/Users/User/lemo-opuscar` should match
  `github.com/lemomo-ai/lemo-opuscar` at `bebbbe1` or later (the cloud used `bebbbe1`).
- Library venv needs the voice tier: `sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice` (Kokoro model in
  `core/tts/`), plus `pip install praat-parselmouth` into `<LIB>/.venv` (for `tools/perform.py`).
- `mux.sh` needs ffmpeg 7+ (6.x under-reports audio length and mux fails). If the system ffmpeg is older, point
  `FFMPEG_DIR` at a folder with a newer one (`pip install imageio-ffmpeg` gives a recent binary).
- Render speed in the cloud (4 CPUs, no GPU): ~4 min for 720 frames with `--workers 4`; a laptop GPU is faster.
- `tools/build_clip.sh` runs under Git Bash/WSL; it falls back to `<LIB>/.venv/Scripts/python.exe` on Windows.
  Re-running the full build regenerates the TTS takes (identical settings), so the preview should match v3.

**Approved and locked (don't change unless Sky asks):**
- `TREATMENT.md`, `SHOT_LIST.md` (36 shots), `CHARACTER_BIBLE.md`, including the return to the two-shot at 145.5 s
  and the staging readings (41–47 s First-year with the city; 68–72 s he looks up at the off-screen Third-year;
  Scene 4 at the conversation desk).
- Character design: `src/sky.js` (head, faces, expressions, hair) and `src/body.js` (rig, hands). One face for both
  Skys; no glasses, no stubble; rounded nose; refined hands; smooth wavy hair with a soft curtain fringe in
  front/3-4/profile; rear view locked. Hair reference `assets/Screenshot 2026-11-04 075435.png` (shape only).
- Colour models `src/pal.js` (PLAN §6 tokens), painted plates `src/plates.js`, style frames + storyboard
  `src/frames.js`, sheets `src/sheets.js`, restrained tape pass `src/post.js` (`cel.js`/`post.js` adapted from the
  style demo). Font: Barlow Semi Condensed (OFL, `fonts/`). Assets and licences in `CREDITS`.
- Review renders: `review/CONTACT_SHEET.jpg`, `review/STORYBOARD.jpg`, `review/*.jpg`. Re-render with
  `sh tools/look.sh [page]`, then `<LIB>/.venv/Scripts/python.exe tools/board.py`.
- Repository audit: `C:\Users\User\.claude\plans\pasted-content-id-198a-we-are-imperative-taco.md`.

**Next, only when Sky asks:** Sky's review of clip 01 v3 (and answers to the four open questions above). After
approval: clip 02 (30–60 s, Scene 2, memory palette) in a new `src/clip02.js`, then 03–06 in order, each reviewed
before the next. Generate each clip's voices with `tools/make_lines.py --from <a> --to <b>`; watch T07 (13 words in
4 s) for overflow and report it rather than speeding it up. Sky works step by step: do exactly the task asked,
nothing extra.

**Protect the locked outputs:** don't edit `src/sky.js`, `src/body.js`, `src/pal.js`, `src/plates.js`,
`src/frames.js`, `src/main.js`, `fonts/` or `review/` unless Sky asks. Gate C work goes in new files (`tools/`, `tts/`, `voices/`,
`VOICE_REPLACEMENT.md`). For Gate D, build the film page (`film.js`, timeline) *on top of* these modules: import
`head`/`figure`/plates; don't fork or redraw the characters. `../coffee-farm-film/` doesn't exist on this machine:
use the library's `core/README.md` and `TECHNIQUE.md` as the pattern instead.

## Look-dev engine notes (for reuse in Gate D)

- `index.html` + `src/main.js` implement the page contract (`READY`, `render(t)`, `DUR`); `?sheet=<name>` picks a
  page (`fy_turn fy_expr fy_pose ty_turn ty_expr ty_pose compare detail face sf_open sf_end sb1…sb9`), `?raw=1`
  skips the tape pass. Renders go through `<LIB>/core/render/still.mjs` (the folder is served under `/@film/`).
- `figure(g, P, {who:'FY'|'TY', pose, yaw, x, y, s, mirror, expr, look, light, rim, rimBack, layer:'base'|'arms'})`
  (body.js); poses `stand standStraps standPocket walk sitLean sitBack sitForward sitKnees`; head views chosen by
  yaw (front / q / side / back). Expressions in `EXPR` (sky.js). Palettes `PAL.neutral|night|memory|build|noreply|
  morning|backlit` (skin hand-set per set). FY faces screen left→right; TY is drawn mirrored.
- Desk scenes draw `layer:'base'`, then the desk/props, then `layer:'arms'` so forearms rest on top.
- Gotchas already solved: hair lock ribbons and the hair mass wind in opposite directions, so never fill their
  combined Path2D (fill each part separately). Rim light on hair is a silhouette-only mask with the face cut out.
  Characters are stamped out of the emissive canvas (`layer()` in frames.js) so glow never blooms through them.
  Barlow has no `→` glyph. Shell heredocs choke on Windows `\U…` paths inside Python strings: use raw strings or the
  Edit tool.

## Canonical sources (read all three before implementing)

| File | Owns |
|---|---|
| `PLAN.md` | Production rules, character bible, palette tokens, audio plan, website spec, gates A–E, deliverables, §11 safeguards |
| `SCRIPT_TIMELINE.md` | Second-by-second picture/camera/sound per scene; exact dialogue in quotes; the allowed on-screen text |
| `dialogue.json` | 29 lines (`Y01…Y15` First-year, `T01…T14` Third-year): `id`, `start_seconds`/`end_seconds` window, `speaker`, `text`, `delivery`, `audio_file` |

- `dialogue.json` text must match `SCRIPT_TIMELINE.md` character for character, curly quotes and `…`/`—` included.
  If a line doesn't fit its window, stop and report the line and the change you propose. Never paraphrase it.
- `start_seconds`/`end_seconds` are the window a line must fit in, not its spoken length. Take the real length from
  the measured voice duration and don't time-stretch to fill the window.
- On-screen text: the scene tables in SCRIPT_TIMELINE are authoritative for in-world text (counters, product cards,
  tech words, chat question, book spines). The "Subtitle rules" list only limits overlay/caption-style text.
  Subtitles come from `dialogue.json`.

## Decisions taken (2026-11-04, by Sky)

- **End card** `DID WE MAKE IT?` / `NOT YET. STILL BUILDING.` fades up from 176 s over the walk to the door, under
  T14/Y15. The film stays exactly 180 s and no timecodes change.
- **`SHIPPING ≠ SELLING`** starts around 146.5 s (over T11's tail, placed clear of the caption) so it gets its
  reading time before 150 s. It doesn't cross the clip 05/06 seam.
- **Voice overflow:** if a temp line runs past its window (T07, 13 words in 4 s, is the likeliest), stop and report
  the line, its measured length and a proposed fix. Don't speed it up or re-time it without approval.
- **V.O. lines** (no mouth movement): T03, T04, T05, T06, T07, T11. This comes from the script, not from `dialogue.json`.
- **LIB** = `C:/Users/User/lemo-opuscar` (installed, same commit as `animation-engine/`). Read the demo source from
  `animation-engine/styles/cel-anime-80s/demo/` (the installed copy has no `demo/`), only after `TREATMENT.md` exists.
- The full audit is in `C:\Users\User\.claude\plans\pasted-content-id-198a-we-are-imperative-taco.md`.

- **Sky's direction on clip 01 (2026-11-04):** First-year sounds excited and quick early on; the paper never changes
  size; no constant noise under the voices (placed sound events only); smoother motion (ones/twos) and more
  realism; a hook in the opening seconds. Apply the same standards to clips 02–06.

## Gaps to bridge (mismatches with the library)

- **Voice files:** `dialogue.json` puts audio at `audio/<ID>.wav`. The library's TTS and the coffee-farm pattern use
  `tts/lines.json` (`id, who, text, voice, speed[, asr]`) → `voices/<id>.wav` + `voices/dur.json`. Generate
  `tts/lines.json` *from* `dialogue.json`; don't hand-copy it. Keep the IDs and one WAV per line, so Sky's real
  recordings (`VOICE_REPLACEMENT.md`) can be dropped in and only `dur.json`/mix get re-run, with no change to the animation.
- **Frame rate:** PLAN says 24 fps output. The style holds characters on twos (12 fps), performance beats on
  threes (8 fps), and camera/light on ones. Render with `--fps 24`, not the coffee-farm default of 60.
- **Segments:** the film is one `render(t)` over `DUR = 180`, delivered as six 30 s clips
  (`clip_01_000-030` … `clip_06_150-180`) cut from that timeline. Seams at 30/60/…/150 s need continuous geometry,
  eyeline, lighting, ambience and music. Render clip 01 and get it reviewed before moving to the next, in order.
- **Style adaptation:** keep the cel construction and painted backgrounds, but reduce the CRT/tape texture to a hint.
  No neon or chrome titles; this is a grounded coming-of-age short. Use PLAN §6 palette tokens rather than the
  style's demo palette. Open `styles/cel-anime-80s/DEMO.md` only after `TREATMENT.md` and the storyboard exist, and
  take only technique from it.

## Gate order (PLAN §10)

A: inspect the repo and setup → B: `TREATMENT.md`, `CHARACTER_BIBLE.md`, model sheets (front / ¾ / side for both),
two style frames, a 6–9 frame storyboard drawn by the actual code. Stop if either Sky reads as more than ~2 years
older → C: temp voices, per-line files, duration check, subtitles → D: clips 01–06 in order → E: full review and the
website (a screening-room page; spec in PLAN §8).

## Hard constraints

- Two versions of the same young man about two years apart, with the same face geometry. Tell them apart by clothes
  (warm accent for First-year, teal/slate for Third-year), posture and energy. Never age Third-year Sky.
- PLAN §11: no invented success, revenue, customers, funding, hackathon attendance, physical-AI product, names or events.
  Keep the two outreach experiments apart (10 sent → 1 reply; about 50 sent → 0 replies).
- No logos, no real-person likenesses (the notebook-skyline beat shows no Elon Musk imagery), original music only.
  Every asset and its licence go in `CREDITS`.
