/* Cartotheque : filtres par theme, recherche, visionneuse (clavier : ← → Echap) */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const cartes = $$(".ctq-card");
  let theme = "", courant = -1;

  function norm(t) { return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function filtrer() {
    const q = norm($("#ctq-search").value.trim());
    let n = 0;
    cartes.forEach(function (c) {
      const ok = (!theme || c.dataset.theme === theme) &&
        (!q || norm(c.dataset.titre + " " + c.dataset.texte + " figure " + c.dataset.figure).indexOf(q) >= 0);
      c.classList.toggle("hidden", !ok); if (ok) n++;
    });
    $("#ctq-vide").classList.toggle("hidden", n > 0);
  }
  $$(".ctq-f").forEach(function (b) {
    b.addEventListener("click", function () {
      theme = b.dataset.theme; $$(".ctq-f").forEach(function (x) { x.classList.toggle("on", x === b); }); filtrer();
    });
  });
  $("#ctq-search").addEventListener("input", filtrer);

  /* ---------------- visionneuse */
  const visibles = function () { return cartes.filter(function (c) { return !c.classList.contains("hidden"); }); };
  function ouvrir(c) {
    const l = visibles(); courant = l.indexOf(c); if (courant < 0) return;
    const d = c.dataset;
    $("#lb-img").src = d.img; $("#lb-img").alt = d.titre;
    $("#lb-fig").textContent = "Figure " + d.figure; $("#lb-titre").textContent = d.titre;
    $("#lb-texte").textContent = d.texte; $("#lb-source").textContent = "Source : " + d.source;
    $("#lb-dl").href = d.img; $("#lb-dl").setAttribute("download", "Thies_figure" + d.figure + ".png");
    $("#lb-geo").href = d.geo;
    $("#lightbox").classList.remove("hidden"); document.body.classList.add("lb-open");
    $("#lb-close").focus();
  }
  function fermer() { $("#lightbox").classList.add("hidden"); document.body.classList.remove("lb-open"); }
  function decaler(k) { const l = visibles(); if (!l.length) return; ouvrir(l[(courant + k + l.length) % l.length]); }

  cartes.forEach(function (c) {
    $(".ctq-thumb", c).addEventListener("click", function () { ouvrir(c); });
    $('[data-act="voir"]', c).addEventListener("click", function () { ouvrir(c); });
  });
  $("#lb-close").addEventListener("click", fermer);
  $("#lb-prev").addEventListener("click", function () { decaler(-1); });
  $("#lb-next").addEventListener("click", function () { decaler(1); });
  $("#lightbox").addEventListener("click", function (e) { if (e.target.id === "lightbox") fermer(); });
  document.addEventListener("keydown", function (e) {
    if ($("#lightbox").classList.contains("hidden")) return;
    if (e.key === "Escape") fermer(); else if (e.key === "ArrowLeft") decaler(-1); else if (e.key === "ArrowRight") decaler(1);
  });
  // lien direct vers une carte : /cartotheque/#figure-3-7
  function depuisAdresse() {
    const m = /^#figure-([0-9A-Za-z-]+)$/.exec(window.location.hash);
    if (m) { const c = cartes.filter(function (x) { return x.dataset.figure === m[1]; })[0]; if (c) ouvrir(c); }
  }
  window.addEventListener("hashchange", depuisAdresse);
  depuisAdresse();
})();
