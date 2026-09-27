/* ═══════════════════════════════════════════════════════════
   MENU.JS — menú hamburguesa per a mòbil
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const toggle = document.querySelector('.nav-toggle');
  const nav    = document.querySelector('.site-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', function () {
    const isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', isOpen);
    toggle.setAttribute('aria-label', isOpen ? 'Tancar menú' : 'Obrir menú');
  });

  /* Tanca el menú en clicar un enllaç */
  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Obrir menú');
    });
  });

  /* ── Desplegable "Descobrir" (només escriptori) ──────────── */
  const botoDescobrir  = document.querySelector('.site-nav__boto');
  const contenidorDescobrir = document.querySelector('.site-nav__descrubre');
  if (botoDescobrir && contenidorDescobrir) {

    function setDescobert(obert) {
      contenidorDescobrir.classList.toggle('is-open', obert);
      botoDescobrir.setAttribute('aria-expanded', String(obert));
    }

    /* Clic (també Enter/Space amb teclat) */
    botoDescobrir.addEventListener('click', function (event) {
      event.stopPropagation();
      setDescobert(!contenidorDescobrir.classList.contains('is-open'));
    });

    /* Hover (navegadors de punter; el pont CSS evita el parpelleig) */
    contenidorDescobrir.addEventListener('mouseenter', function () {
      setDescobert(true);
    });
    contenidorDescobrir.addEventListener('mouseleave', function () {
      setDescobert(false);
    });

    /* Tanca en clicar fora del desplegable */
    document.addEventListener('click', function (event) {
      if (
        contenidorDescobrir.classList.contains('is-open') &&
        !contenidorDescobrir.contains(event.target)
      ) {
        setDescobert(false);
      }
    });

    /* Tanca amb Esc i torna el focus al botó */
    document.addEventListener('keydown', function (event) {
      if (
        event.key === 'Escape' &&
        contenidorDescobrir.classList.contains('is-open')
      ) {
        setDescobert(false);
        botoDescobrir.focus();
      }
    });
  }

})();