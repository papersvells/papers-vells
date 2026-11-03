/* ═══════════════════════════════════════════════════════════
   SUGGERIMENTS.JS — «Potser buscaves» per a la pàgina 404
   ═══════════════════════════════════════════════════════════
   Agafa l'adreça que ha fallat, la compara amb tots els articles,
   autors i publicacions de /cerca/suggeriments.json (uns 35 KB) i
   proposa els més semblants.

   La comparació normalitza accents, majúscules i guions, i després
   calcula la distància de Levenshtein. Així, per exemple,
   /josep-pla/en-comencar-lany-nou-.../ troba l'article real
   /josep-pla/en-comencar-l-any-nou-.../ amb puntuació 1,00.

   No fa redirecció automàtica: només suggereix. Els 301 del servidor
   són per a les URL que coneixem del cert; això és la xarxa de
   seguretat per a qualsevol altra.
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const seccio = document.getElementById('suggeriments');
  if (!seccio) return;

  const llista = document.getElementById('suggeriments-llista');
  const titol = document.getElementById('suggeriments-titol');
  const path = window.location.pathname;

  const LLINDAR = 0.75;
  const MAX = 3;

  // Treu accents, majúscules i qualsevol caràcter no alfanumèric
  // (inclou guions i barres): dos paths amb els mateixos caràcters
  // però amb guions diferents queden idèntics.
  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '');
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Distància de Levenshtein amb dues files (memòria O(n)).
  function distancia(a, b) {
    const m = a.length;
    const n = b.length;
    if (a === b) return 0;
    if (!m) return n;
    if (!n) return m;

    let previ = new Array(n + 1);
    let actual = new Array(n + 1);
    for (let j = 0; j <= n; j++) previ[j] = j;

    for (let i = 1; i <= m; i++) {
      actual[0] = i;
      const ca = a.charCodeAt(i - 1);
      for (let j = 1; j <= n; j++) {
        const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
        actual[j] = Math.min(
          previ[j] + 1,
          actual[j - 1] + 1,
          previ[j - 1] + cost
        );
      }
      const tmp = previ; previ = actual; actual = tmp;
    }
    return previ[n];
  }

  function etiqueta(it) {
    if (it.s === 't') return 'Autor';
    if (it.s === 'p') return 'Publicació';
    return [it.a, it.y].filter(Boolean).join(' · ');
  }

  fetch('/cerca/suggeriments.json')
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (items) {
      const objectiu = norm(path);
      if (!objectiu || !Array.isArray(items) || !items.length) return;

      // Si el primer segment coincideix (l'autor), donem un petit
      // avantatge: redueix molt els falsos positius.
      const segment = path.split('/').filter(Boolean)[0] || '';

      const puntuats = items.map(function (it) {
        const candidat = norm(it.u);
        const llarg = Math.max(candidat.length, objectiu.length) || 1;
        let punt = 1 - distancia(objectiu, candidat) / llarg;
        if (segment && it.u.indexOf('/' + segment + '/') === 0) punt += 0.05;
        return { it: it, punt: Math.min(punt, 1) };
      });

      const millors = puntuats
        .filter(function (x) { return x.punt >= LLINDAR; })
        .sort(function (a, b) { return b.punt - a.punt; })
        .slice(0, MAX);

      if (!millors.length) return;

      titol.textContent = millors[0].punt > 0.999
        ? 'Aquest contingut s\'ha mogut aquí'
        : 'Potser buscaves';

      llista.innerHTML = millors.map(function (x) {
        const meta = etiqueta(x.it);
        return '<li><a href="' + esc(x.it.u) + '">' + esc(x.it.t) + '</a>' +
          (meta ? '<span class="meta">' + esc(meta) + '</span>' : '') +
          '</li>';
      }).join('');

      seccio.hidden = false;
    })
    .catch(function () { /* sense suggeriments: la pàgina 404 ja funciona */ });
})();
