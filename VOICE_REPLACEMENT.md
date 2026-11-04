# VOICE_REPLACEMENT.md — swapping the temp voices for Sky's recordings

The film never reads a voice from anywhere except `voices/<ID>.wav`, one file per `dialogue.json` line
(`Y01…Y15` First-year, `T01…T14` Third-year). The temp files there now are Kokoro TTS (voice `am_liam`, both Skys;
First-year quicker, 1.0–1.2, Third-year 0.92), with First-year's melody reshaped by `tools/perform.py` (an excited,
rising "did we make it?!"). That reshaping only ever runs on fresh TTS, never on recordings. Replacing a line changes nothing else by hand: the mouth shapes, the sound mix and the
subtitles are all rebuilt from the files.

## Recording
- Read the exact text of the line in `dialogue.json` (no paraphrase; contractions stay). Delivery notes are in its
  `delivery` field and in SCRIPT_TIMELINE.md "Dialogue performance notes".
- One take per file, named by ID: `Y01.wav`, `T02.wav` … mono or stereo WAV, any sample rate (resampled to 48 kHz).
- Trim the silence before and after the words (leave ~0.03 s before, ~0.1 s after). The length of the file is the
  length of the line.
- First-year and Third-year are the same person about two years apart: same voice, First-year a little quicker and
  more eager, Third-year steadier.

## Rebuild (from the film folder, LIB = the Lemo-Opuscar folder)
```sh
cp ~/recordings/Y01.wav voices/Y01.wav          # as many as you have; the rest stay temp
sh tools/build_clip.sh 01 --keep-voices         # lip sync, timing gate, subtitles, picture, mix, mux
```
`--keep-voices` skips TTS so recorded files are never overwritten.

## If a recorded line is longer than its window
`tools/check_timing.py` fails and prints the line, its measured length and its window. Don't speed the take up or
move the line: report it and decide the fix (a tighter take, or an approved window change in `timeline.json`).
