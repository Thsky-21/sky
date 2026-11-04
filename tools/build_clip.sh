#!/bin/sh
# Build one 30 s clip of "Did We Make It?" end to end: dialogue gate → temp voices (+ performance) → lip sync → timing gate + subtitles
# → events → picture (24 fps) → sound mix → mux.
# usage: sh tools/build_clip.sh 01 [--keep-voices] [--workers 3]
#   --keep-voices  don't run TTS (keeps voices/*.wav as they are, e.g. Sky's real recordings)
# LIB = the Lemo-Opuscar library folder (needs .venv with the voice tier and core/tts/kokoro-v1.0.onnx)
set -e
FILM=$(cd "$(dirname "$0")/.." && pwd)
LIB=${LIB:-$(cd "$FILM/../lemomo-ai/lemo-opuscar" 2>/dev/null && pwd || echo C:/Users/User/lemo-opuscar)}
export LIB
PY="$LIB/.venv/bin/python"; [ -x "$PY" ] || PY="$LIB/.venv/Scripts/python.exe"
CLIP=${1:-01}; shift || true
KEEP=0; WK=3
while [ $# -gt 0 ]; do case "$1" in --keep-voices) KEEP=1 ;; --workers) shift; WK=$1 ;; esac; shift; done
cd "$FILM"
"$PY" tools/check_dialogue.py --quiet
if [ $KEEP = 0 ]; then
  RANGE=$("$PY" -c "import json;a,b=json.load(open('timeline.json'))['clips']['$CLIP'];print(a,b)")
  set -- $RANGE
  "$PY" tools/make_lines.py --from "$1" --to "$2"
  "$PY" "$LIB/core/tts/tts.py" tts/lines.json voices
  "$PY" tools/perform.py          # temp voices only: melody reshaping from tts/lines.json (excited, rising Y01)
fi
"$PY" tools/lipsync.py
"$PY" tools/check_timing.py --clip "$CLIP"
"$PY" "$LIB/core/render/srt.py" "subs/clip${CLIP}_cues.json" "subs/clip${CLIP}.srt"
cd "$LIB"
node core/render/events.mjs "$FILM" --q "clip=$CLIP" --out "$FILM/events.json"
node core/render/video.mjs "$FILM" --q "clip=$CLIP" --fps 24 --workers "$WK" --out "$FILM/out/clip${CLIP}_picture.mp4"
cd "$FILM"
"$PY" tools/mix.py --clip "$CLIP"
# mux.sh needs ffmpeg 7+ (6.x under-reports audio length); FFMPEG_DIR = a folder holding a newer ffmpeg, if the system's is 6.x
[ -n "$FFMPEG_DIR" ] && PATH="$FFMPEG_DIR:$PATH"
sh "$LIB/core/render/mux.sh" "out/clip${CLIP}_picture.mp4" "out/clip${CLIP}_mix.wav" "out/clip${CLIP}_preview.mp4" 24 1
echo "→ out/clip${CLIP}_preview.mp4  (subtitles: subs/clip${CLIP}.srt)"
