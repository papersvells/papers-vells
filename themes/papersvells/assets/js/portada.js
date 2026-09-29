/* ═══════════════════════════════════════════════════════════
   PORTADA.JS — reveal de les targetes amb IntersectionObserver
   ═══════════════════════════════════════════════════════════ */
(() => {
  const targetes = document.querySelectorAll('.card-hidden');

  // Sense suport d'IntersectionObserver, mostrem tot directament:
  // mai deixem contingut amagat per una funcionalitat que falla.
  if (!('IntersectionObserver' in window)) {
    targetes.forEach(card => card.classList.remove('card-hidden'));
    return;
  }

  const observador = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove('card-hidden');
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  targetes.forEach(card => observador.observe(card));
})();
