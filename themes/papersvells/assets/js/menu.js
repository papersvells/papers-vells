/* ═══════════════════════════════════════════════════════════
   MENU.JS — menú hamburguesa per a mòbil
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const toggle = document.querySelector('.nav-toggle');
  const nav    = document.querySelector('.site-nav');
  if (!toggle || !nav) return;

  function setMenuObert(obert) {
    nav.classList.toggle('is-open', obert);
    toggle.setAttribute('aria-expanded', String(obert));
    toggle.setAttribute('aria-label', obert ? 'Tancar menú' : 'Obrir menú');
  }

  toggle.addEventListener('click', function () {
    setMenuObert(!nav.classList.contains('is-open'));
  });

  /* Tanca el menú en clicar un enllaç */
  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      setMenuObert(false);
    });
  });

  /* ── Desplegable "Descobrir" (només escriptori) ──────────── */
  const botoDescobrir  = document.querySelector('.site-nav__boto');
  const contenidorDescobrir = document.querySelector('.site-nav__descrubre');
  function setDescobert(obert) {
    contenidorDescobrir.classList.toggle('is-open', obert);
    botoDescobrir.setAttribute('aria-expanded', String(obert));
  }

  if (botoDescobrir && contenidorDescobrir) {
    /* Clic (també Enter/Space amb teclat) */
    botoDescobrir.addEventListener('click', function (event) {
      event.stopPropagation();
      setDescobert(!contenidorDescobrir.classList.contains('is-open'));
    });

    /* Hover (navegadors de punter; el pont CSS evita el parpelleig).
       No s'activa en tàctil: el toc dispararia mouseenter i mouria el
       submenú sota el dit, fent que calgués un segon toc. */
    if (window.matchMedia('(hover: hover)').matches) {
      contenidorDescobrir.addEventListener('mouseenter', function () {
        setDescobert(true);
      });
      contenidorDescobrir.addEventListener('mouseleave', function () {
        setDescobert(false);
      });
    }

    /* Tanca en clicar fora del desplegable */
    document.addEventListener('click', function (event) {
      if (
        contenidorDescobrir.classList.contains('is-open') &&
        !contenidorDescobrir.contains(event.target)
      ) {
        setDescobert(false);
      }
    });
  }

  /* Tanca amb Esc i torna el focus al botó d'obertura.
     El menú mòbil té prioritat: allà el botó Descobrir està ocult. */
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;

    const menuObert = nav.classList.contains('is-open');
    const descobrirObert = botoDescobrir && contenidorDescobrir &&
      contenidorDescobrir.classList.contains('is-open');

    if (descobrirObert) setDescobert(false);

    if (menuObert) {
      setMenuObert(false);
      toggle.focus();
    } else if (descobrirObert) {
      botoDescobrir.focus();
    }
  });

})();
