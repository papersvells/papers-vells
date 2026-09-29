/* ═══════════════════════════════════════════════════════════
   FITXA.JS — obertura de la fitxa i còpia de l'enllaç
   ═══════════════════════════════════════════════════════════ */
(() => {
  const media = window.matchMedia("(max-width: 900px)");
  const fitxes = document.querySelectorAll(".fitxa__expandible");

  function actualitza() {
    const shouldOpen = !media.matches;

    fitxes.forEach(fitxa => {
      if (fitxa.open !== shouldOpen) {
        fitxa.open = shouldOpen;
      }
    });
  }

  // Estat inicial
  actualitza();

  // Només quan es canvia entre mòbil i escriptori
  media.addEventListener("change", actualitza);

  // Copiar l'enllaç al porta-retalls
  const copiarBtn = document.querySelector(".fitxa__copiar");
  if (copiarBtn) {
    const url = copiarBtn.dataset.url;

    async function copiarText(text) {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
      }
      // Fallback per a contextos no segurs (HTTP, LAN, navegadors antics)
      const aux = document.createElement("textarea");
      aux.value = text;
      aux.setAttribute("readonly", "");
      aux.style.position = "fixed";
      aux.style.opacity = "0";
      document.body.appendChild(aux);
      aux.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(aux);
      if (!ok) throw new Error("copy fallback failed");
    }

    copiarBtn.addEventListener("click", async () => {
      try {
        await copiarText(url);
        copiarBtn.classList.add("fitxa__copiar--fet");
        copiarBtn.setAttribute("title", "Enllaç copiat");
        setTimeout(() => {
          copiarBtn.classList.remove("fitxa__copiar--fet");
          copiarBtn.setAttribute("title", "Copiar l'enllaç");
        }, 2000);
      } catch (err) {
        copiarBtn.setAttribute("title", "No s'ha pogut copiar");
      }
    });
  }
})();
