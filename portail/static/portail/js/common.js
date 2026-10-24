/* Utilitaires partages entre la carte et le tableau de bord */
window.GP = window.GP || {};
(function (GP) {
  GP.url = function (chemin) { return (window.GP_BASE || "/") + chemin; };

  GP.getJSON = async function (chemin) {
    const r = await fetch(GP.url(chemin), { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(chemin + " -> HTTP " + r.status);
    return r.json();
  };

  GP.fmt = function (n, d) {
    if (n === null || n === undefined || n === "" || Number.isNaN(Number(n))) return "—";
    return Number(n).toLocaleString("fr-FR", { maximumFractionDigits: d || 0 });
  };

  GP.esc = function (s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  GP.COULEURS = ["#14b8a6", "#f59e0b", "#6366f1", "#ef4444", "#10b981", "#8b5cf6", "#ec4899", "#0ea5e9", "#84cc16", "#f97316"];
  GP.COMMUNE_COULEUR = { "Thiès Est": "#2563eb", "Thiès Nord": "#16a34a", "Thiès Ouest": "#ea580c" };

  /* couleur qualitative stable pour un identifiant (poste) */
  GP.couleurId = function (id) {
    const h = (Number(id) * 47) % 360;
    return "hsl(" + h + ", 62%, 50%)";
  };

  /* ----- fonds de carte partages entre les pages (choix memorise dans le navigateur) ----- */
  GP.FOND_DEFAUT = "Plan sombre (Esri)";
  GP.creerFonds = function () {
    const esri = "https://server.arcgisonline.com/ArcGIS/rest/services/";
    return {
      "Plan clair (Esri)": L.layerGroup([
        L.tileLayer(esri + "Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, maxNativeZoom: 16, attribution: "Tiles © Esri" }),
        L.tileLayer(esri + "Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, maxNativeZoom: 16 }),
      ]),
      "Plan sombre (Esri)": L.layerGroup([
        L.tileLayer(esri + "Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, maxNativeZoom: 16, attribution: "Tiles © Esri" }),
        L.tileLayer(esri + "Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, maxNativeZoom: 16 }),
      ]),
      "OpenStreetMap": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }),
      "Plan des rues (Esri)": L.tileLayer(esri + "World_Street_Map/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Tiles © Esri" }),
      "Satellite (Esri)": L.tileLayer(esri + "World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Tiles © Esri" }),
      "Topographique": L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", { maxZoom: 17, attribution: "© OpenTopoMap" }),
      "Aucun fond": L.layerGroup(),
    };
  };
  GP.fondSauve = function (fonds) {
    let nom = null;
    try { nom = window.localStorage.getItem("gp_fond"); } catch (e) { /* stockage indisponible */ }
    return nom && fonds[nom] ? nom : GP.FOND_DEFAUT;
  };
  /* fond memorise s'il existe, sinon `defaut` (la page Carte demarre en plan sombre) */
  GP.fondSauveOu = function (fonds, defaut) {
    let nom = null;
    try { nom = window.localStorage.getItem("gp_fond"); } catch (e) { /* stockage indisponible */ }
    return nom && fonds[nom] ? nom : defaut;
  };
  GP.sauverFond = function (nom) {
    try { window.localStorage.setItem("gp_fond", nom); } catch (e) { /* stockage indisponible */ }
  };

  /* ----- surveillance du fond de carte : si les tuiles ne se chargent pas, on bascule sur un autre fond ----- */
  GP.ORDRE_FONDS = ["Plan sombre (Esri)", "Satellite (Esri)", "OpenStreetMap", "Topographique"];
  GP.surveillerTuiles = function (fonds, opt) {
    // opt.appliquer(nom) affiche le fond ; opt.message(texte, type) informe l'utilisateur
    let ok = 0, err = 0, actuel = null, timer = null, essayes = {};
    function attacher(couche) {
      if (!couche || !couche.on || couche._gpSurv) return;
      couche._gpSurv = true;
      couche.on("tileload", function () { ok++; });
      couche.on("tileerror", function () { err++; planifier(); });
    }
    Object.keys(fonds).forEach(function (k) { const f = fonds[k]; if (f.eachLayer) f.eachLayer(attacher); else attacher(f); });
    function planifier() { clearTimeout(timer); timer = setTimeout(verifier, 3500); }
    function verifier() {
      if (ok > 0 || err < 4 || !actuel || actuel === "Aucun fond") return;     // le fond fonctionne (ou pas assez d'erreurs pour conclure)
      const suivant = GP.ORDRE_FONDS.filter(function (n) { return !essayes[n] && fonds[n]; })[0];
      if (suivant) {
        opt.message("Le fond « " + actuel + " » ne répond pas. Passage au fond « " + suivant + " ».", "err");
        opt.appliquer(suivant);
      } else {
        opt.message("Aucun fond de carte n'est accessible : vérifiez votre connexion Internet. Les quartiers et les postes restent affichés.", "err");
      }
    }
    return { demarrer: function (nom) { actuel = nom; essayes[nom] = true; ok = 0; err = 0; clearTimeout(timer); } };
  };

  /* ----- Chart.js ----- */
  if (window.Chart) {
    Chart.defaults.font.family = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
    Chart.defaults.font.size = 12;
    Chart.defaults.plugins.legend.labels.boxWidth = 12;
  }

  /* ----- Mode clair / sombre ----- */
  const PALETTES = {
    dark:  { texte: "#9fb6c9", grille: "rgba(255,255,255,.09)", norme: "#e2e8f0", bord: "#0b2237" },
    light: { texte: "#475569", grille: "rgba(15,23,42,.10)",   norme: "#334155", bord: "#ffffff" }
  };
  GP.theme = function () { return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"; };
  GP.couleur = function (nom) { return PALETTES[GP.theme()][nom]; };
  function themerGraphiques(avant) {
    if (!window.Chart) return;
    const p = PALETTES[GP.theme()], a = avant ? PALETTES[avant] : null;
    Chart.defaults.color = p.texte; Chart.defaults.borderColor = p.grille;
    Object.values(Chart.instances || {}).forEach(function (ch) {
      const o = ch.options || {};
      Object.values(o.scales || {}).forEach(function (sc) {
        if (sc.ticks) sc.ticks.color = p.texte; if (sc.grid) sc.grid.color = p.grille;
        if (sc.title) sc.title.color = p.texte; if (sc.pointLabels) sc.pointLabels.color = p.texte; if (sc.angleLines) sc.angleLines.color = p.grille;
      });
      if (o.plugins && o.plugins.legend && o.plugins.legend.labels) o.plugins.legend.labels.color = p.texte;
      if (o.plugins && o.plugins.title) o.plugins.title.color = p.texte;
      if (a) (ch.data.datasets || []).forEach(function (ds) {      // couleurs fixees en dur (ligne de norme, bord des anneaux)
        if (ds.borderColor === a.norme) ds.borderColor = p.norme;
        else if (ds.borderColor === a.bord) ds.borderColor = p.bord;
      });
      ch.update("none");
    });
  }
  GP.appliquerTheme = function (t, memoriser) {
    const avant = GP.theme();
    document.documentElement.setAttribute("data-theme", t);
    if (memoriser) { try { localStorage.setItem("gp-theme", t); } catch (e) {} }
    const b = document.getElementById("theme-toggle");
    if (b) { const l = t === "light" ? "Passer en mode sombre" : "Passer en mode clair"; b.title = l; b.setAttribute("aria-label", l); b.setAttribute("aria-pressed", t === "light" ? "true" : "false"); }
    themerGraphiques(avant !== t ? avant : null);
    document.dispatchEvent(new CustomEvent("gp:theme", { detail: { theme: t } }));
  };
  GP.appliquerTheme(GP.theme(), false);
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("#theme-toggle")) GP.appliquerTheme(GP.theme() === "light" ? "dark" : "light", true);
  });
  /* un graphique cree apres coup prend les couleurs du theme courant */
  GP._palette = PALETTES;

  GP.graphique = function (canvas, config) {
    if (!canvas || !window.Chart) return null;
    if (canvas._chart) canvas._chart.destroy();
    canvas._chart = new Chart(canvas, config);
    return canvas._chart;
  };

  /* coupe un libelle long en plusieurs lignes (Chart.js accepte un tableau de lignes) */
  GP.couper = function (txt, max) {
    txt = String(txt === null || txt === undefined ? "" : txt);
    if (txt.length <= max) return txt;
    const mots = txt.split(" "), lignes = [""];
    mots.forEach(function (m) {
      const i = lignes.length - 1;
      if ((lignes[i] + " " + m).trim().length > max && lignes[i]) lignes.push(m); else lignes[i] = (lignes[i] + " " + m).trim();
    });
    return lignes;
  };

  /* items = [{label, n}] */
  GP.barres = function (canvas, items, opt) {
    opt = opt || {};
    return GP.graphique(canvas, {
      type: "bar",
      data: {
        labels: items.map(function (i) { return GP.couper(i.label, 20); }),
        datasets: [{ label: opt.titre || "Effectif", data: items.map(function (i) { return i.n; }),
                     backgroundColor: opt.couleur || GP.COULEURS[0], borderRadius: 4 }],
      },
      options: {
        indexAxis: opt.horizontal ? "y" : "x",
        responsive: true,
        aspectRatio: opt.horizontal ? Math.max(0.9, 2.2 - items.length * 0.14) : 2,   // plus de hauteur quand il y a beaucoup de barres
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: !opt.horizontal } }, y: { beginAtZero: true, grid: { display: !!opt.horizontal }, ticks: { autoSkip: false } } },
      },
    });
  };

  GP.anneau = function (canvas, items) {
    return GP.graphique(canvas, {
      type: "doughnut",
      data: {
        labels: items.map(function (i) { return i.label; }),
        datasets: [{ data: items.map(function (i) { return i.n; }), backgroundColor: GP.COULEURS, borderWidth: 2, borderColor: GP.couleur("bord") }],
      },
      options: { responsive: true, plugins: { legend: { position: "bottom" } }, cutout: "58%" },
    });
  };
})(window.GP);

/* menu utilisateur de l'en-tete (commun a toutes les pages) */
(function () {
  const chip = document.getElementById("userchip"), menu = document.getElementById("umenu");
  if (!chip || !menu) return;
  chip.addEventListener("click", function (e) {
    e.stopPropagation();
    chip.setAttribute("aria-expanded", menu.classList.toggle("hidden") ? "false" : "true");
  });
  document.addEventListener("click", function () { menu.classList.add("hidden"); chip.setAttribute("aria-expanded", "false"); });
})();
