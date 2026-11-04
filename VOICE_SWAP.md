# Voice swap: one command

When the cloned takes arrive, put them in `voices/clone/` and run **one command** from PowerShell in this folder:

```
npm run film:final
```

## File names
- One file per line: `voices/clone/<ID>.wav` (for example `Y01.wav`, `T22.wav`).
- Lines with a beat (`parts` in `dialogue.json`) get one file per part: `<ID>_p1.wav`, `<ID>_p2.wav` …
  (Y01, T06, T11, T12, Y15, T17, Y20). The build joins the parts with exactly the line's `beat_s` of silence.
- Script v2.1 added four short lines that need takes too: `Y07B`, `T05B`, `Y10B`, `T10B` (see `dialogue.json`).
- `.wav`, `.m4a` and `.mp3` all work. Any sample rate or channel count is fine: everything is converted to 48 kHz mono,
  trimmed to 0.1 s of silence at each end and loudness-normalised.
- Partial swaps work: any ID without a clone file keeps its temporary Kokoro take (`voices/tmp/`).

## What the command does
1. Resolver (`tools/voices.py`): picks `voices/clone/…` first, then `voices/tmp/…`; logs which IDs are clone and which
   are temporary; re-measures every line; rebuilds `timeline.json` (start = previous end + `gap_before_s`); recomputes
   mouths (`voices/mouth.json`) from the new audio; regenerates subtitles (`subs/film.srt`, `subs/film.vtt`).
2. Re-exports the sound events from the page (every event is anchored to a line, so they move with the new timing),
   re-renders the picture at **1920×1080, 24 fps**, re-mixes (−14 LUFS, true peak below −1 dBTP) and muxes.
3. Exports to `export/`: `did-we-make-it.mp4`, `did-we-make-it_subs.mp4` (burned-in subtitles), `.srt`, `.vtt`,
   `poster.jpg` (W at the lamp click).
4. Prints the **swap report**: per line, temporary vs clone seconds and the difference; flags any line that changed by
   more than 1.0 s or 30 %; the new runtime and Y01's start time; IDs still on temporary voice.
5. Fails loudly if the runtime is over 3:00 or a line is missing, and verifies the export (`tools/verify.py`: a frame
   every 2 s, no black gaps, every line present once, no frozen mouths).

## Other commands
- `npm run film` — 720p preview + contact sheet (`preview/`).
- `npm run film:tmp` — regenerate the temporary Kokoro takes, then the preview.

## Pace matching
If one or two cloned takes arrive early, drop them in `voices/clone/` and run `npm run film`: the build prints words
per minute per character. Then set `SPEED` in `tools/voices.py` so the temporary takes match, and run `npm run film:tmp`.
