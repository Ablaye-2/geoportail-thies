/* Page Donnees : filtres, apercu des 10 premieres lignes, copie des adresses d'API et de la citation */
(function () {
  "use strict";
  const esc = GP.esc;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  let t = null;
  function toast(m) { const e = $("#dnx-toast"); e.textContent = m; e.classList.remove("hidden"); clearTimeout(t); t = setTimeout(function () { e.classList.add("hidden"); }, 2200); }
  async function copier(txt) {
    try { await navigator.clipboard.writeText(txt); toast("Copié dans le presse-papiers"); }
    catch (e) {               // navigateur sans acces au presse-papiers : selection manuelle
      const ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast("Copié dans le presse-papiers"); } catch (x) { toast("Copie impossible : sélectionnez le texte"); }
      ta.remove();
    }
  }

  $$(".ctq-f").forEach(function (b) {
    b.addEventListener("click", function () {
      $$(".ctq-f").forEach(function (x) { x.classList.toggle("on", x === b); });
      $$(".dnx-card").forEach(function (c) { c.classList.toggle("hidden", !!b.dataset.theme && c.dataset.theme !== b.dataset.theme); });
    });
  });

  const val = function (v) {
    if (v === null || v === undefined || v === "") return '<span class="vide">–</span>';
    if (Array.isArray(v)) return esc(v.join(", "));
    if (typeof v === "boolean") return v ? "oui" : "non";
    if (typeof v === "number") return v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
    const s = String(v); return esc(s.length > 60 ? s.slice(0, 57) + "…" : s);
  };
  $$(".dnx-card").forEach(function (c) {
    const b = $('[data-act="apercu"]', c), box = $(".dnx-apercu", c);
    b.addEventListener("click", async function () {
      const ouvert = box.classList.toggle("hidden") === false;
      b.setAttribute("aria-expanded", ouvert ? "true" : "false");
      b.textContent = ouvert ? "✕ Fermer" : "👁 Aperçu";
      if (!ouvert || box.dataset.ok) return;
      box.innerHTML = '<p class="hint">Chargement…</p>';
      try {
        const d = await GP.getJSON("export/" + c.dataset.id + ".json");
        const cols = d.lignes.length ? Object.keys(d.lignes[0]).filter(function (k) { return k !== "id"; }) : [];
        box.innerHTML = '<p class="hint">' + d.lignes.length + " premières lignes sur " + d.total + " · " + cols.length + " champs</p>" +
          '<div class="scroll"><table><thead><tr>' + cols.map(function (k) { return "<th>" + esc(k) + "</th>"; }).join("") + "</tr></thead><tbody>" +
          d.lignes.map(function (r) { return "<tr>" + cols.map(function (k) { return "<td>" + val(r[k]) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
        box.dataset.ok = "1";
      } catch (e) { box.innerHTML = '<p class="hint">Aperçu indisponible (vérifiez la connexion à la base).</p>'; }
    });
  });

  $$(".dnx-copy").forEach(function (b) { b.addEventListener("click", function () { copier(window.location.origin + b.dataset.copie); }); });
  $("#dnx-date").textContent = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  $("#dnx-copier-cite").addEventListener("click", function () { copier($("#dnx-citation").textContent.replace(/\s+/g, " ").trim() + " " + window.location.origin + "/"); });
})();
