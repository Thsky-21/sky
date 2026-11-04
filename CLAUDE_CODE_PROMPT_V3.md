# Claude Code prompt — DID WE MAKE IT? v3 (animation first, voice later)

**Before you start:**
1. Put `SCRIPT_V2.md` and the latest `dialogue.json` in the project root. Rename the old dialogue file to `dialogue_v1.json` first.
2. Keep `PLAN.md` for the palette and character rules.
3. This replaces `CLAUDE_CODE_PROMPT_V2.md`.

Paste everything below the line.

---

We're short on time. Build the whole film now on **temporary Kokoro voices**, used only for timing. My cloned voice arrives later and must drop in with **one command** that re-times and re-renders everything with no hand-animation.

## What already exists
- Clip 01: the apartment set and both characters. Per `timeline.json`, the set is in `src/apartment.js` and durations in `voices/dur.json`.
- `SCRIPT_V2.md` and `dialogue.json` v2 replace the story.
- `SCRIPT_TIMELINE.md`, `SHOT_LIST.md` and `dialogue_v1.json` are superseded; don't use their lines, timings or locations.
- `PLAN.md` still governs palette, character look and safety rules.

## Rules
1. **Words only from `dialogue.json` v2, exactly.** Skip lines with `"include": false`. Never paraphrase; if a line can't work, stop and tell me.
2. **Reuse what works.** Keep the existing set, characters, renderer and audio pipeline. Inspect first; don't assume file names or commands.
3. **Nothing is pinned to absolute seconds.** The only fixed durations are the pre-roll, every `gap_before_s`, every `beat_s` and the end card. Every animation event is anchored to a line, as `{line_id, anchor: start | end | part_N_start | part_N_end, offset_s}` or as a fraction of the line's length. Examples:
   - A lean starts at T17 `part_1_start`.
   - The T05 cut to PAPER happens at T05 `part_2_start`.
   - The `$5K` cross-out happens at 70% of T14.
   - The T22 handwriting reveal is spread across T22's length.
4. **Timing comes from the audio files.** Line length = the measured duration of its audio. Parts are joined with exactly `beat_s` of silence. Line start = the previous line's end + `gap_before_s`. Regenerate `timeline.json` from this every build.
5. **Mouths come from the audio.** Mouth movement is driven by each line's amplitude envelope, recomputed from whatever audio file is present.
6. **Subtitles and mix come from the same timeline.** They are regenerated every build.
7. **Commit after each layer.** Git commit with the layer number in the message.
8. **One review stop:** after Layer 1, show me the contact sheet and preview, then wait. After that, keep going without stopping.

## Layer 0 — Audit (10 min, no edits)
Report:
- How clip 01 is built.
- How voices are loaded and timed.
- How render and mux work.
- Render time per 30 s at 720p and at 1080p.
- An estimate for each layer.

If the total is over 2.5 hours, say what you'd simplify first.

## Layer 1 — Temporary voices + animatic
**Temporary voices (Kokoro)**
- Generate every line, and every part separately for lines with `parts` (`voices/tmp/<ID>.wav`, `voices/tmp/<ID>_p1.wav` …).
- Use the same male voice for both characters: they're the same person.
  - FY: speed about 1.05, aiming for about 160–170 words per minute.
  - TY: speed about 0.92–0.95, aiming for about 135–145 words per minute.
- VN01: fast, about 180 words per minute.
- Measure the actual words per minute per character and print it.

**Voice resolver.** For each ID or part, use the first file that exists, in this order:
1. `voices/clone/<ID>.wav`, `voices/clone/<ID>_pN.wav`, or the `.m4a` / `.mp3` versions
2. `voices/tmp/...`

Convert to 48 kHz mono, trim silence at both ends to 0.1 s, and loudness-normalise. Log which IDs are clone and which are temporary.

**Timeline.** Build it from the resolver output. Print:
- the total runtime
- Y01's start time (must be before 0:07)

**Camera setups.** All from the one room: W (the existing two-shot), FY MCU, TY MCU and a TY CU variant, PAPER (top-down sheet), PHONE.
- Implement them as camera transforms and **redraw at render resolution. No bitmap upscaling.**

**Shots and cuts**
- Cut on each line's `shot` field, and on `cut_to` where it is given.
- **Opening (no black):** frame 1 is the PHONE shot: a phone face-up on the dark desk, screen glowing with a voice-note waveform, the only light in the room. Then a stop click, a lamp click, and W.
- **Title:** after Y04, during Y05's gap: W with `DID WE MAKE IT?` small in the lower third, fading in and out over 1.5 s.
- **End card:** warm ivory `#F1EBDD` on deep ink `#111820`, text from `dialogue.json`.

**Review.** Render the full 720p preview plus a contact sheet (one frame per line, labelled with the line ID). Stop and show me.

## Layer 2 — Performance
- **Break the mirror symmetry.** FY sits forward on his elbows; TY sits back in his chair. They never hold the same pose.
- **Poses** (held cels with short in-betweens, each anchored per Rule 3):
  - **FY:** lean-in neutral, holding the sheet, flipping it (flip, flip back, hold it up to the lamp in the Y02 gap), eager lean (Y06), celebrate (Y08), looking down at his hands then up (Y15: part 1 down, part 2 up), sliding the sheet back (Y20's gap).
  - **TY:** lean-back neutral, sliding the sheet (T01), eyes down (T02), dry half-smile (T04, T05 part 1, T10), closing the laptop (T16), leaning forward into the lamp (from T17 part 1 to the end, the first time he leans in), holding the phone (T22).
- **Mouths:** on the speaker only; closed when `on_camera` is false.
- **Listener:** blinks on threes, breathes, and turns his head slightly toward the speaker.
- **Eyelines:** FY looks screen right, TY looks screen left.

## Layer 3 — Paper inserts
- **Content:** every `insert` in `dialogue.json`.
- **Style:** pencil on warm ivory, revealed stroke by stroke, slight hand wobble.
- **Colour:** rust `#A76550` only for the X and the crossed-out marks.
- **No real things:** no logos, no real app UIs, no view counts. Book spines show plain titles only.
- **Anchoring:** every reveal anchors to its line's start, part or fraction.
- **T22 payoff:** "Okay. New idea. Hear me out." writes itself onto the blank sheet as one clean handwritten line, spread across T22's length.

## Layer 4 — Light and sound
- **Light**
  - Faces are the brightest thing in character shots.
  - Cut the desk-lamp bloom between the faces.
  - Dim the moon and the ceiling globe.
  - From T17 the lamp warms TY's face; this is the warmest shot in the film.
- **Sound effects**
  - Room tone (fan, distant traffic) under everything.
  - Every `sfx` in `dialogue.json`, anchored to its line.
  - VN01 through a phone-speaker filter (band-pass about 300–3400 Hz plus a little room).
  - Duck the room tone to near-silence after T11 and after T13.
- **Music**
  - None until T17. On T17 `part_1_start` ("No."), one original sparse piano / e-piano motif generated by you. Don't imitate any existing song.
  - Duck it about 10 dB under speech; it resolves on the end card.
- **Mix:** about −14 LUFS integrated, true peak below −1 dBTP.
- **Subtitles:** SRT and VTT from the `dialogue.json` text and the timeline. Two lines maximum, clear of faces.
- **Render:** a full 720p preview with the temporary voices.

## Layer 5 — Website (build it now, with the temporary film)
- **Basics:** one static page, deployed to Vercel. Palette from `PLAN.md`. Mobile-first, keyboard accessible, respects reduced motion.
- **Hero**
  - Eyebrow `A SHORT FILM BY SKY`, title `DID WE MAKE IT?`, subline `My first year asks my third year.` plus the runtime read from the built film.
  - One button, `PLAY FILM`, and the poster still. No autoplay with sound.
- **Player:** native `<video>` with the VTT track: play/pause, mute, captions, scrubber.
- **After the film ends**
  - Prompt: `What would your first-year self ask you today?`
  - **Speak** via the Web Speech API (Chrome/Edge; hide it when unsupported) and **Type** (always available), with equal weight.
  - Show the answer as a card on warm ivory, with a copy button.
  - Store nothing. Show exactly: `Your browser's speech service turns your voice into text. This site stores nothing.`
- **Below the film**
  - `The real numbers`: 3 products · 10 emails → 1 reply · 50 emails → 0 replies · Revenue: zero · Now: exploring physical AI.
  - `How it was made`: a placeholder for 2–3 lines I'll write.
  - LinkedIn and email placeholders.
- **No brands:** no logos; "Wispr Flow" as plain text only.
- **Film path:** the site reads the film, poster and VTT from one folder, so the voice swap needs only a redeploy.

## The voice swap (when my cloned files arrive)
Create **one command** (for example `npm run film`, your choice) and document it in `VOICE_SWAP.md`. When I drop files into `voices/clone/`, that command must:
1. Run the resolver, re-measure, rebuild `timeline.json`, recompute mouths, regenerate subtitles and the mix, and re-render at **1920×1080, 24 fps**.
2. Export:
   - `did-we-make-it.mp4`
   - `did-we-make-it_subs.mp4` (burned-in subtitles)
   - `.srt` and `.vtt`
   - `poster.jpg` (W at the lamp click, or the Y19 close-up)
3. Print a **swap report**:
   - Per line: ID, temporary seconds, clone seconds, difference.
   - Flag any line that changed by more than 1.0 s or 30%.
   - New total runtime, and Y01's start time.
   - Any IDs still on temporary voice.
4. Fail loudly if the runtime exceeds 3:00 or a line is missing.
5. Verify the exported MP4: sample a frame every 2 s, check that no line is missing or doubled, no black gaps, no frozen mouths.

Partial swaps must work. If only some clone files exist, use them and keep temporary voices for the rest.

**Pace matching:** if I give you one or two cloned takes early, measure their words per minute and re-tune the Kokoro speeds to match, so the pacing doesn't shift at the final swap.

## If time runs short, drop in this order
1. Extra poses (keep neutral poses, mouths and blinks).
2. Detailed paper drawings (use clean text cards on paper instead).
3. The burned-in-subtitle export.

**Never drop:** line-anchored timing, the one-command swap, subtitles, the T22 payoff, the end card.
