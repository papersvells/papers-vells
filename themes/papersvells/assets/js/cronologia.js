/* ═══════════════════════════════════════════════════════════
   CRONOLOGIA.JS — reveal del timeline amb IntersectionObserver
   ═══════════════════════════════════════════════════════════ */
(() => {
  const elements = document.querySelectorAll(".crono-card, .crono__node, .crono__decada");

  // Sense suport d'IntersectionObserver, mostrem tot directament:
  // mai deixem contingut amagat per una funcionalitat que falla.
  if (!('IntersectionObserver' in window)) {
    elements.forEach(el => el.classList.add("is-visible"));
    return;
  }

  const observador = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observador.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -30px 0px" });

  elements.forEach(el => observador.observe(el));
})();
