"""Assemble the website (site/ + the film's code + media) into site/dist/, ready to serve or deploy.

usage: <LIB>/.venv/Scripts/python.exe tools/build_site.py
  needs: preview/clipNN_preview.mp4 for every built clip (in timeline.json "clips"), subs/clipNN_cues.json,
         a recent ffmpeg (FFMPEG env var, or the WinGet Gyan build, or ffmpeg on PATH; must not be the 2013 build)
  makes: site/dist/{index.html, site.css, site.js, room.js, film.json, src/, fonts/, data/, media/}
The film plays as one web-encoded MP4 (the clips joined in order); the live room runs the film's own src/ modules.
"""
import glob, json, os, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE, DIST = os.path.join(ROOT, 'site'), os.path.join(ROOT, 'site', 'dist')
WINGET = os.path.expandvars(r'%LOCALAPPDATA%\Microsoft\WinGet\Packages')


def ffmpeg():
    if os.environ.get('FFMPEG'): return os.environ['FFMPEG']
    hits = sorted(glob.glob(os.path.join(WINGET, 'Gyan.FFmpeg*', '*', 'bin', 'ffmpeg.exe')))
    return hits[-1] if hits else 'ffmpeg'


def run(*a):
    print('$', ' '.join(str(x) for x in a[:6]), '…')
    subprocess.run([str(x) for x in a], check=True)


def vtt_time(s):
    h, s = divmod(s, 3600); m, s = divmod(s, 60)
    return f'{int(h):02d}:{int(m):02d}:{s:06.3f}'


def main():
    FF = ffmpeg()
    TL = json.load(open(os.path.join(ROOT, 'timeline.json'), encoding='utf-8'))
    clips = sorted(TL['clips'].items())
    built = [(k, ab) for k, ab in clips if os.path.exists(os.path.join(ROOT, 'preview', f'clip{k}_preview.mp4'))]
    if not built: sys.exit('no preview/clipNN_preview.mp4 found')
    avail = built[-1][1][1]
    if os.path.isdir(DIST): shutil.rmtree(DIST)
    for d in ['src', 'fonts', 'data', 'media']: os.makedirs(os.path.join(DIST, d))
    for f in ['index.html', 'site.css', 'site.js', 'room.js']: shutil.copy(os.path.join(SITE, f), DIST)
    for f in glob.glob(os.path.join(ROOT, 'src', '*.js')): shutil.copy(f, os.path.join(DIST, 'src'))
    for f in glob.glob(os.path.join(ROOT, 'fonts', '*')): shutil.copy(f, os.path.join(DIST, 'fonts'))
    shutil.copy(os.path.join(ROOT, 'timeline.json'), os.path.join(DIST, 'data'))
    shutil.copy(os.path.join(ROOT, 'voices', 'mouth.json'), os.path.join(DIST, 'data'))
    shutil.copy(os.path.join(ROOT, 'dialogue.json'), os.path.join(DIST, 'data'))
    json.dump({'full': TL.get('film_seconds', 180), 'available': avail, 'start': 0.74,
               'chapters': [{'t': 0, 'name': 'The question'}, {'t': 60, 'name': 'The attempts'}, {'t': 150, 'name': 'The lesson'}]},
              open(os.path.join(DIST, 'film.json'), 'w'), indent=1)

    # the film: built clips joined in order, web-encoded (H.264, fast start, AAC)
    media = os.path.join(DIST, 'media')
    lst = os.path.join(media, 'list.txt')
    with open(lst, 'w') as f:
        for k, _ in built: f.write(f"file '{os.path.join(ROOT, 'preview', f'clip{k}_preview.mp4').replace(os.sep, '/')}'\n")
    film = os.path.join(media, 'film.mp4')
    run(FF, '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c:v', 'libx264', '-preset', 'slow', '-crf', '25',
        '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '160k', film)
    os.remove(lst)
    for name, t in [('arrival', 0.74), ('poster', 5.4), ('empty', avail - 0.1)]:
        run(FF, '-y', '-loglevel', 'error', '-ss', t, '-i', film, '-frames:v', 1, '-q:v', 3, os.path.join(media, name + '.jpg'))

    # captions with the speaker as a WebVTT voice tag
    starts = {round(v, 2): k for k, v in TL['lines'].items()}
    out = ['WEBVTT', '']
    for k, (a, b) in built:
        for c in json.load(open(os.path.join(ROOT, 'subs', f'clip{k}_cues.json'), encoding='utf-8')):
            lid = starts.get(round(c['t0'] + a if c['t0'] < a else c['t0'], 2), '')
            who = 'First-year' if lid.startswith('Y') else 'Third-year' if lid.startswith('T') else ''
            t0 = c['t0'] if c['t0'] >= a else c['t0'] + a
            t1 = c['t1'] if c['t1'] >= a else c['t1'] + a
            out += [f'{vtt_time(t0)} --> {vtt_time(t1)} line:84%', (f'<v {who}>' if who else '') + c['text'].replace('\n', ' '), '']
    open(os.path.join(media, 'film.vtt'), 'w', encoding='utf-8').write('\n'.join(out))
    mb = os.path.getsize(film) / 1e6
    print(f'site/dist ready: film {avail:.0f} s of {TL.get("film_seconds", 180)} s, {mb:.1f} MB')


if __name__ == '__main__':
    main()
