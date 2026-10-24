/* Page d'accueil : animation des chiffres cles (desactivee si l'utilisateur prefere moins d'animations) */
(function () {
  "use strict";
  const reduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const els = Array.prototype.slice.call(document.querySelectorAll("[data-count]"));

  function ecrire(el, v) {
    const dec = Number(el.dataset.dec || 0);
    el.textContent = Number(v).toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + (el.dataset.suffix || "");
  }
  els.forEach(function (el) {
    const cible = parseFloat(el.dataset.count);
    if (isNaN(cible)) return;
    if (reduit) { ecrire(el, cible); return; }
    const t0 = performance.now(), duree = 1400;
    ecrire(el, 0);
    (function pas(t) {
      const k = Math.min(1, (t - t0) / duree), e = 1 - Math.pow(1 - k, 3);   // ralentissement progressif
      ecrire(el, cible * e);
      if (k < 1) requestAnimationFrame(pas); else ecrire(el, cible);
    })(t0);
  });
})();
