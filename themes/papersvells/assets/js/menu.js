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
  const globusDescobrir = document.querySelector('.site-nav__globus');
  const contenidorDescobrir = document.querySelector('.site-nav__descrubre');
  if (botoDescobrir && globusDescobrir && contenidorDescobrir) {

    botoDescobrir.addEventListener('click', function (event) {
      event.stopPropagation();
      const isOpen = contenidorDescobrir.classList.toggle('is-open');
      botoDescobrir.setAttribute('aria-expanded', isOpen);
    });

    /* Tanca en clicar fora del desplegable */
    document.addEventListener('click', function (event) {
      if (
        contenidorDescobrir.classList.contains('is-open') &&
        !contenidorDescobrir.contains(event.target)
      ) {
        contenidorDescobrir.classList.remove('is-open');
        botoDescobrir.setAttribute('aria-expanded', 'false');
      }
    });

    /* Tanca amb Esc i torna el focus al botó */
    document.addEventListener('keydown', function (event) {
      if (
        event.key === 'Escape' &&
        contenidorDescobrir.classList.contains('is-open')
      ) {
        contenidorDescobrir.classList.remove('is-open');
        botoDescobrir.setAttribute('aria-expanded', 'false');
        botoDescobrir.focus();
      }
    });
  }

})();