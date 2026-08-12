/* ═══════════════════════════════════════════════════════════
   HEADER-SCROLL.JS — amaga la capçalera en scroll cap avall
   ═══════════════════════════════════════════════════════════
   Només actiu en mòbil i tablet (≤900px). El CSS s'encarrega
   del comportament per mida: aquest JS només afegeix/treu la
   classe .header-hidden segons la direcció del scroll.
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const header = document.querySelector('.site-header');
  if (!header) return;

  // Només actiu en pantalles tàctils (mòbil + tablet)
  const mql = window.matchMedia('(max-width: 900px)');

  let lastY = window.scrollY;
  let ticking = false;

  // LLINDAR mínim per ignorar micro-scrolls (ex: rebot tàctil al final)
  const THRESHOLD = 8;

  // No amaguem mai el header si estem prop de dalt del tot
  const TOP_BUFFER = 80;

  function update() {
    const y = window.scrollY;
    const delta = y - lastY;

    if (Math.abs(delta) > THRESHOLD) {
      if (delta > 0 && y > TOP_BUFFER) {
        // Scroll cap avall i prou lluny de dalt → amagar
        header.classList.add('header-hidden');
      } else if (delta < 0) {
        // Scroll cap amunt → mostrar
        header.classList.remove('header-hidden');
      }
      lastY = y;
    }
    ticking = false;
  }

  function onScroll() {
    if (!mql.matches) return;        // Desactivat en escriptori
    if (ticking) return;             // Ja hi ha una actualització pendent
    ticking = true;
    requestAnimationFrame(update);
  }

  // Quan canviem entre mòbil/tablet i escriptori, netegem la classe
  mql.addEventListener('change', () => {
    if (!mql.matches) header.classList.remove('header-hidden');
  });

  window.addEventListener('scroll', onScroll, { passive: true });

})();