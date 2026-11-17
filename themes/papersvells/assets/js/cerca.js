/* ═══════════════════════════════════════════════════════════
   CERCA.JS — cerca client-side per a Papers Vells
   ═══════════════════════════════════════════════════════════
   Llegeix /cerca/index.json un sol cop, filtra localment.
   Cerca en títol, autors, publicació i text complet.
   Sense llibreries externes, sense backend.
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── Referències al DOM ──────────────────────────────────
  const input   = document.getElementById('cerca-input');
  const estat   = document.getElementById('cerca-estat');
  const seccio  = document.getElementById('cerca-seccio-articles');
  const llista  = document.getElementById('cerca-llista-articles');

  let index = null;

  // ─── Càrrega inicial des de l'URL ────────────────────────
  // El SearchAction de Google (i els deep-links) arriben amb
  // ?q=... — preomplim l'input i engeguem la cerca en lloc
  // de mostrar la pàgina amb la caixa buida.
  const qParam = (new URLSearchParams(window.location.search).get('q') || '').trim();
  if (qParam) {
    input.value = qParam;
  }

  // ─── Decodificació d'entitats HTML ──────────────────────
  // Hugo exporta el text amb entitats: &rsquo; &hellip; etc.
  // Les decodifiquem perquè la cerca trobi "l'elogi" dins "l&rsquo;elogi".
  const _ta = document.createElement('textarea');
  function decodeEntities(s) {
    _ta.innerHTML = s || '';
    return _ta.value;
  }

  // ─── Normalització ───────────────────────────────────────
  // Treu accents: "pla" troba "Pla", "cafe" troba "cafè".
  // Unifica apòstrofs i espais sense alterar els textos mostrats.
  function norm(s) {
    return decodeEntities(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u2018\u2019\u02bc]/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ─── Carrega de l'índex ──────────────────────────────────
  // A la pàgina 404 no es demana l'índex complet (2,2 MB) fins que
  // l'usuari comença a escriure: allà ja hi ha les suggerències, que
  // només pesen 35 KB. A /cerca/ es carrega de seguida.
  let carregant = null;

  function carregaIndex() {
    if (index) return Promise.resolve();
    if (carregant) return carregant;

    estat.textContent = 'Carregant índex…';
    carregant = fetch('/cerca/index.json')
      .then(r => r.json())
      .then(data => {
        index = data.articles.map(x => ({
          ...x,
          _s: norm(x.t + ' ' + x.a.join(' ') + ' ' + x.p.join(' ') + ' ' + (x.x || ''))
        }));
        estat.textContent = '';
        if (qParam || input.value.trim()) cerca();
      })
      .catch(() => {
        estat.textContent = 'No s\'ha pogut carregar l\'índex. Recarrega la pàgina.';
        carregant = null;
      });

    return carregant;
  }

  if (document.documentElement.dataset.cercaDiferida === 'si') {
    // 404: només quan l'usuari escriu (no al focus, que hi ha autofocus)
    input.addEventListener('input', carregaIndex, { once: true });
  } else {
    carregaIndex();
  }

  // ─── Debounce ────────────────────────────────────────────
  let timer;
  function debounce(fn) {
    clearTimeout(timer);
    timer = setTimeout(fn, 80);
  }

  // ─── Filtra i renderitza ─────────────────────────────────
  function cerca() {
    if (!index) return;

    const q = norm(input.value.trim());

    if (q.length < 2) {
      seccio.hidden = true;
      estat.textContent = '';
      return;
    }

    const resultats = index.filter(x => x._s.includes(q)).slice(0, 100);

    if (resultats.length === 0) {
      seccio.hidden = true;
      estat.textContent = `Cap resultat per "${input.value}".`;
      return;
    }

    estat.textContent = resultats.length === 1
      ? '1 article.'
      : `${resultats.length} articles${resultats.length === 100 ? ' (mostrant els primers 100)' : ''}.`;

    // ─── Escapem HTML per seguretat ──────────────────────
    function esc(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    seccio.hidden = false;
    llista.innerHTML = resultats.map(x => `
      <li>
        <a href="${esc(x.u)}">${esc(x.t)}</a>
        <span class="meta">
          ${x.a.length ? esc(x.a.join(', ')) : ''}
          ${x.a.length && x.p.length ? ' · ' : ''}
          ${x.p.length ? esc(x.p.join(', ')) : ''}
          ${(x.a.length || x.p.length) && x.d ? ' · ' : ''}
          ${esc(x.d)}
        </span>
      </li>
    `).join('');
  }

  // ─── Esdeveniments ───────────────────────────────────────
  input.addEventListener('input', () => debounce(cerca));

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      input.value = '';
      cerca();
    }
  });

})();
