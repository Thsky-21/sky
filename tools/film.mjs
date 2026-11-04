// One command for the whole film. Run from PowerShell (the headless browser can't start inside the Bash sandbox):
//   npm run film               preview: 1280×720, 24 fps → preview/film_preview.mp4 + contact sheet
//   npm run film -- --tmp      also regenerate the temporary Kokoro takes first
//   npm run film:final         final: 1920×1080, 24 fps → export/ (mp4, burned-subs mp4, srt, vtt, poster, swap report, checks)
// Steps: voices (resolver → timeline.json → mouths → subtitles) → events → picture → mix → mux [→ exports + checks].
// LIB (default C:/Users/User/lemo-opuscar) = the Lemo-Opuscar library; FFMPEG_DIR = a folder with ffmpeg 7+ (optional).
import { spawnSync } from 'child_process';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';

const FILM = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = process.env.LIB || 'C:/Users/User/lemo-opuscar';
const args = process.argv.slice(2), has = k => args.includes(k), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const FINAL = has('--final'), WK = opt('--workers', '6');
const PY = [path.join(LIB, '.venv', 'Scripts', 'python.exe'), path.join(LIB, '.venv', 'bin', 'python')].find(fs.existsSync);
const WINGET = 'C:/Users/User/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin';
const FF = process.env.FFMPEG_DIR || (fs.existsSync(WINGET) ? WINGET : '');
const env = { ...process.env, LIB, PATH: (FF ? FF + path.delimiter : '') + process.env.PATH };
const run = (cmd, a, o = {}) => {
  console.log(`\n▶ ${path.basename(cmd)} ${a.map(x => /\s/.test(x) ? `"${x}"` : x).join(' ')}`);
  const r = spawnSync(cmd, a, { stdio: o.capture ? 'pipe' : 'inherit', env, cwd: o.cwd || FILM, encoding: 'utf8' });
  if (r.status !== 0) { if (o.capture) console.error(r.stderr); console.error(`\n✗ FAILED: ${cmd} ${a.join(' ')}`); process.exit(1); }
  return r.stdout;
};
const out = p => path.join(FILM, p);
fs.mkdirSync(out('out'), { recursive: true });
const t0 = Date.now();

// 1. voices → timeline, mouths, subtitles (fails loudly on a missing line or a runtime over 3:00)
run(PY, ['tools/voices.py', ...(has('--tmp') ? ['--tmp'] : []), ...(FINAL ? ['--report'] : [])]);
// 2. sound events, exported from the page (all anchored to lines)
run('node', ['core/render/events.mjs', FILM, '--out', out('events.json')], { cwd: LIB });
// 3. picture
const size = FINAL ? '1920x1080' : '1280x720', pic = out(FINAL ? 'out/film_picture_1080.mp4' : 'out/film_picture.mp4');
run('node', ['core/render/video.mjs', FILM, '--fps', '24', '--workers', WK, '--size', size, '--out', pic], { cwd: LIB });
// 4. mix
run(PY, ['tools/mix_film.py', '--out', out('out/film_mix.wav')]);
// 5. mux (the mix is pre-mastered to −14 LUFS; audio padded/cut to the picture)
const muxed = out(FINAL ? 'out/film_final.mp4' : 'out/film_preview.mp4');
run('ffmpeg', ['-y', '-v', 'error', '-i', pic, '-i', out('out/film_mix.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-af', 'apad', '-shortest', '-movflags', '+faststart', muxed]);

if (!FINAL) {
  fs.mkdirSync(out('preview'), { recursive: true });
  fs.copyFileSync(muxed, out('preview/film_preview.mp4'));
  for (const x of ['srt', 'vtt']) fs.copyFileSync(out(`subs/film.${x}`), out(`preview/film_preview.${x}`));
  run(PY, ['tools/contact.py', '--video', muxed, '--out', out('preview/film_CONTACT.jpg')]);
  console.log(`\n✓ preview/film_preview.mp4 (+ .srt/.vtt) · preview/film_CONTACT.jpg · ${((Date.now() - t0) / 60000).toFixed(1)} min`);
} else {
  const X = p => out(path.join('export', p)); fs.mkdirSync(out('export'), { recursive: true });
  fs.copyFileSync(muxed, X('did-we-make-it.mp4'));
  for (const x of ['srt', 'vtt']) fs.copyFileSync(out(`subs/film.${x}`), X(`did-we-make-it.${x}`));
  // burned-in subtitles (lower area, clear of faces)
  const srtRel = 'subs/film.srt';
  run('ffmpeg', ['-y', '-v', 'error', '-i', X('did-we-make-it.mp4'), '-vf', `subtitles=${srtRel}:force_style='FontName=Barlow Semi Condensed,FontSize=20,PrimaryColour=&H00DDEBF1,OutlineColour=&H80000000,BorderStyle=1,Outline=1.2,Shadow=0,MarginV=28'`, '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'copy', X('did-we-make-it_subs.mp4')]);
  // poster: W at the lamp click (the room fully lit, 1.6 s after the click)
  const TL = JSON.parse(fs.readFileSync(out('timeline.json'), 'utf8'));
  const tPoster = Math.min(TL.lines.Y01.start - .15, TL.lines.VN01.end + 1.0);
  run('ffmpeg', ['-y', '-v', 'error', '-ss', String(tPoster), '-i', X('did-we-make-it.mp4'), '-frames:v', '1', '-q:v', '2', X('poster.jpg')]);
  run(PY, ['tools/verify.py', X('did-we-make-it.mp4')]);
  console.log(`\n✓ export/: did-we-make-it.mp4, did-we-make-it_subs.mp4, .srt, .vtt, poster.jpg · ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}
