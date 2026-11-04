// ?sheet=<name> → the approved Gate B look-dev pages (src/main.js, unchanged); otherwise the film timeline (src/film.js).
if (new URLSearchParams(location.search).has('sheet')) await import('./main.js');
else await import('./film.js');
