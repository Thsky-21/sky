#!/bin/sh
# Render Gate B look-development pages with the library's still renderer.
# usage: sh tools/look.sh [sheet ...]   (run from anywhere; default: every page)
# output: review/<sheet>.jpg
LIB=${LIB:-C:/Users/User/lemo-opuscar}
FILM=$(cd "$(dirname "$0")/.." && pwd)
ALL="fy_turn fy_expr fy_pose ty_turn ty_expr ty_pose compare detail face sf_open sf_end sb1 sb2 sb3 sb4 sb5 sb6 sb7 sb8 sb9"
[ $# -eq 0 ] && set -- $ALL
cd "$LIB" || exit 1
for s in "$@"; do
  node core/render/still.mjs "$FILM" 0 --q "sheet=$s" --prefix "$s" --out "$FILM/review/.tmp" >/dev/null || { echo "FAILED: $s"; exit 1; }
  mv -f "$FILM/review/.tmp/${s}0.jpg" "$FILM/review/$s.jpg" && echo "review/$s.jpg"
done
rmdir "$FILM/review/.tmp" 2>/dev/null
exit 0
