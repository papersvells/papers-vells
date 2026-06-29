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

})();