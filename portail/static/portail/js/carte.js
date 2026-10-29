/* Geoportail de la maille sanitaire de Thies : carte interactive */
(function () {
  "use strict";
  const esc = GP.esc, fmt = GP.fmt;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  

  /* ------------------------------------------------------------------ etat */
  const S = {
    meta: null, postes: null, quartiers: null,
    layers: {}, loaded: {}, on: { quartiers: true, postes: true },
    commune: "", tool: null, qLayers: {}, pLayers: {}, sel: null, qclass: null, pclass: null,
    mesure: null, outils: null, fond: null,
  };

  /* ------------------------------------------------------------------ carte */
  const map = L.map("map", { zoomControl: false, zoomSnap: 0.25 }).setView([14.79, -16.93], 13);
  L.control.scale({ imperial: false, position: "topleft" }).addTo(map);

  const PANES = { quartiers: 400, aire_reelle: 404, aire_administrative: 406, aire_theorique: 408, thiessen: 412,
                  tampon: 416, flux: 430, postes: 450, outils: 460 };
  Object.keys(PANES).forEach(function (n) { map.createPane(n).style.zIndex = PANES[n]; });
  S.outils = L.layerGroup().addTo(map);

  const FONDS = GP.creerFonds();
  (function initFonds() {
    const boutons = $$(".seg-b");
    function maj(k) { boutons.forEach(function (b) { b.classList.toggle("on", b.dataset.fond === k); }); }
    const surv = GP.surveillerTuiles(FONDS, { appliquer: function (k) { set(k); }, message: function (m, t) { toast(m, t); } });
    function set(k) { if (S.fond) map.removeLayer(S.fond); S.fond = FONDS[k]; S.fond.addTo(map); maj(k); surv.demarrer(k); }
    boutons.forEach(function (b) { b.addEventListener("click", function () { set(b.dataset.fond); GP.sauverFond(b.dataset.fond); }); });
    set(GP.fondSauveOu(FONDS, "Plan sombre (Esri)"));     // la page Carte demarre en plan sombre
  })();

  document.addEventListener("fullscreenchange", function () { setTimeout(function () { map.invalidateSize(); }, 150); });

  const Coords = L.Control.extend({
    options: { position: "topleft" },
    onAdd: function () { this._d = L.DomUtil.create("div", "coords"); this._d.textContent = ""; return this._d; },
  });
  const coords = new Coords().addTo(map);
  map.on("mousemove", function (e) { coords._d.textContent = e.latlng.lat.toFixed(5) + ", " + e.latlng.lng.toFixed(5); });

  function zoomVille() {
    if (S.meta && S.meta.etendue) {
      const e = S.meta.etendue;
      map.fitBounds([[e.sud, e.ouest], [e.nord, e.est]], { padding: [20, 20] });
    }
  }

  /* ------------------------------------------------------------------ indicateurs & palettes */
  const RAMPES = {
    bleus: ["#eff6ff", "#bfdbfe", "#60a5fa", "#2563eb", "#1e3a8a"],
    violets: ["#f5f3ff", "#ddd6fe", "#a78bfa", "#7c3aed", "#4c1d95"],
    rouges: ["#fff7ed", "#fed7aa", "#fb923c", "#ea580c", "#9a3412"],
    verts: ["#f0fdf4", "#bbf7d0", "#4ade80", "#16a34a", "#14532d"],
    jaunes: ["#fefce8", "#fde68a", "#fbbf24", "#d97706", "#78350f"],
  };
  const IND_Q = {
    population: { label: "Population 2023 (hab.)", prop: "population", ramp: "bleus" },
    densite: { label: "Densité (hab./km²)", prop: "densite", ramp: "violets" },
    dist_poste_m: { label: "Distance au poste le plus proche (m)", prop: "dist_poste_m", ramp: "rouges" },
    nb_patients_enquete: { label: "Patients enquêtés résidant dans le quartier", prop: "nb_patients_enquete", ramp: "verts" },
    menages: { label: "Ménages", prop: "menages", ramp: "jaunes" },
    superficie_km2: { label: "Superficie (km²)", prop: "superficie_km2", ramp: "violets" },
  };
  const TAILLES = {
    uniforme: { label: "Uniforme" },
    population: { label: "Population administrative", prop: "population" },
    population_theorique: { label: "Population de l'aire théorique", prop: "population_theorique" },
    personnel_total: { label: "Personnel de santé", prop: "personnel_total" },
    nb_lits: { label: "Nombre de lits", prop: "nb_lits" },
    nb_patients: { label: "Patients enquêtés", prop: "nb_patients" },
    hab_par_infirmier: { label: "Habitants par infirmier", prop: "hab_par_infirmier" },
  };
  const COULEURS_P = {
    commune: "Commune", taux: "Taux de couverture (repère 10 000 hab.)", kmeans: "Typologie de l'offre (K-means)",
    ch: "Classification hiérarchique (CAH)", norme_infirmier: "Repère : 1 infirmier / 5 000 hab.", norme_medecin: "Repère : 1 médecin / 10 000 hab.",
    nb_services: "Nombre de services offerts", infirmiers: "Déficit / surplus en infirmiers (tableau 3-6)",
  };
  /* typologie du memoire v3 (figure 3-7, tableaux 3-10 et 3-11) */
  const MAILLE = [
    { cle: "Fortement sous-dotée", txt: "Fortement sous-dotée (taux > 2)", c: "#dc2626" },
    { cle: "Sous-dotée", txt: "Sous-dotée (1 < taux ≤ 2)", c: "#f59e0b" },
    { cle: "Conforme", txt: "Conforme (taux ≤ 1)", c: "#16a34a" },
  ];
  const KMEANS = { K1: ["Postes de base", "#38bdf8"], K2: ["Plateau technique et pédiatrie", "#f97316"], K3: ["Poste de référence", "#facc15"] };
  const CHC = { CAH1: ["Pédiatrie et urgences", "#22c55e"], CAH2: ["Plateau technique", "#f97316"],
                CAH3: ["Ni pédiatrie ni urgences", "#a78bfa"], CAH4: ["Poste de référence", "#facc15"] };
  /* tableau 3-6 du memoire : classes de deficit et de surplus en infirmiers (1 infirmier pour 5 000 habitants) */
  const INF = { "Déficit fort": ["#991b1b", "rangs 1 à 7"], "Déficit moyen": ["#f97316", "rangs 8 à 13"], "Déficit faible": ["#fa8072", "rangs 14 à 18"],
                "Surplus faible": ["#86efac", "rangs 19 à 22"], "Surplus moyen": ["#22c55e", "rangs 23 à 26"], "Surplus fort": ["#166534", "rangs 27 et 28"] };
  /* modes de couleur qui s'appliquent aussi aux mailles (aires de desserte) */
  const COULEUR_MAILLE = ["taux", "kmeans", "ch", "infirmiers", "norme_infirmier", "norme_medecin"];
  const couleurMaille = function (t) { const m = MAILLE.filter(function (x) { return x.cle === t; })[0]; return m ? m.c : "#64748b"; };
  const nomCourt = function (p) { return p.nom_usuel || String(p.nom || "").replace(/^PS /, ""); };
  let indQ = "population", tailleP = "uniforme", couleurP = "commune";

  function classesQuantiles(valeurs, k, rampe) {
    const v = valeurs.filter(function (x) { return x !== null && x !== undefined && !isNaN(x); }).sort(function (a, b) { return a - b; });
    if (!v.length) return { breaks: [], colors: [RAMPES[rampe][2]], min: 0, max: 0 };
    const br = [];
    for (let i = 1; i < k; i++) br.push(v[Math.floor(i * v.length / k)]);
    const breaks = br.filter(function (x, i) { return br.indexOf(x) === i && x > v[0]; });
    const n = breaks.length + 1, colors = [];
    for (let i = 0; i < n; i++) colors.push(RAMPES[rampe][n === 1 ? 2 : Math.round(i * 4 / (n - 1))]);
    return { breaks: breaks, colors: colors, min: v[0], max: v[v.length - 1] };
  }
  function indiceClasse(val, breaks) { let i = 0; while (i < breaks.length && val >= breaks[i]) i++; return i; }

  /* ------------------------------------------------------------------ couches : quartiers */
  function recalcClassesQ() {
    const ind = IND_Q[indQ];
    S.qclass = classesQuantiles(S.quartiers.features.map(function (f) { return f.properties[ind.prop]; }), 5, ind.ramp);
  }
  function styleQ(f) {
    const v = f.properties[IND_Q[indQ].prop];
    const c = (v === null || v === undefined) ? "#cbd5e1" : S.qclass.colors[indiceClasse(v, S.qclass.breaks)];
    return { pane: "quartiers", fillColor: c, fillOpacity: 0.8, color: "#e2e8f0", weight: 0.8, opacity: 0.55 };
  }
  function buildQuartiers() {
    if (S.layers.quartiers) map.removeLayer(S.layers.quartiers);
    S.qLayers = {};
    const feats = S.quartiers.features.filter(function (f) { return !S.commune || f.properties.commune === S.commune; });
    S.layers.quartiers = L.geoJSON({ type: "FeatureCollection", features: feats }, {
      pane: "quartiers", style: styleQ,
      onEachFeature: function (f, l) {
        S.qLayers[f.properties.id] = l;
        l.bindTooltip(function () {
          const p = f.properties, ind = IND_Q[indQ];
          return "<b>" + esc(p.nom) + "</b><br>" + esc(ind.label) + " : <b>" + fmt(p[ind.prop], 1) + "</b><br><small>" + esc(p.commune) + "</small>";
        }, { sticky: true });
        l.on("click", function () { if (!S.tool) selectQuartier(f.properties.id); });
      },
    });
    if (S.on.quartiers) S.layers.quartiers.addTo(map);
  }

  /* ------------------------------------------------------------------ couches : postes */
  function recalcClassesP() {
    const feats = S.postes.features;
    S.pclass = {
      services: classesQuantiles(feats.map(function (f) { return f.properties.nb_services; }), 4, "bleus"),
      taille: null,
    };
    if (tailleP !== "uniforme") {
      const vals = feats.map(function (f) { return f.properties[TAILLES[tailleP].prop]; }).filter(function (x) { return x !== null && x !== undefined; });
      S.pclass.taille = { min: Math.min.apply(null, vals), max: Math.max.apply(null, vals) };
    }
  }
  function couleurPoste(p) {
    if (couleurP === "commune") return GP.COMMUNE_COULEUR[p.commune] || "#64748b";
    if (couleurP === "taux") return couleurMaille(p.type_maille);
    if (couleurP === "kmeans") return (KMEANS[p.classe_kmeans] || [0, "#64748b"])[1];
    if (couleurP === "ch") return (CHC[p.classe_ch] || [0, "#64748b"])[1];
    if (couleurP === "infirmiers") return (INF[p.classe_infirmier] || ["#64748b"])[0];
    if (couleurP === "norme_infirmier") return p.norme_infirmier_respectee ? "#16a34a" : "#dc2626";
    if (couleurP === "norme_medecin") return p.norme_medecin_respectee ? "#16a34a" : "#dc2626";
    const c = S.pclass.services;
    return c.colors[indiceClasse(p.nb_services, c.breaks)];
  }
  function rayonPoste(p) {
    if (tailleP === "uniforme") return 8;
    const v = p[TAILLES[tailleP].prop], t = S.pclass.taille;
    if (v === null || v === undefined || !t || t.max === t.min) return 5;
    return 6 + 14 * Math.sqrt((v - t.min) / (t.max - t.min));
  }
  /* icone « poste de sante » : epingle de la couleur choisie avec une croix blanche ; taille selon l'indicateur choisi */
  function iconePoste(p) {
    const t = Math.round(2 * rayonPoste(p) + 12);           // 28 px en taille uniforme
    return L.divIcon({
      className: "pin-sante-wrap",
      html: '<div class="pin-sante" style="--c:' + couleurPoste(p) + ";--t:" + t + 'px"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5h4v5h5v4h-5v5h-4v-5H5v-4h5z"/></svg></div>',
      iconSize: [t, t], iconAnchor: [t / 2, t], tooltipAnchor: [t / 2, -t * 0.62], popupAnchor: [0, -t],
    });
  }
  GP.iconeLegende = function (c) { return '<span class="pin-sante pin-leg" style="--c:' + c + ';--t:16px"><svg viewBox="0 0 24 24"><path d="M10 5h4v5h5v4h-5v5h-4v-5H5v-4h5z"/></svg></span>'; };

  function buildPostes() {
    if (S.layers.postes) map.removeLayer(S.layers.postes);
    S.pLayers = {};
    const labels = $("#postes-labels").checked;
    const feats = S.postes.features.filter(function (f) { return !S.commune || f.properties.commune === S.commune; });
    S.layers.postes = L.geoJSON({ type: "FeatureCollection", features: feats }, {
      pointToLayer: function (f, ll) {
        const m = L.marker(ll, { pane: "postes", icon: iconePoste(f.properties), title: f.properties.nom, keyboard: false, riseOnHover: true });
        m._couleur = couleurPoste(f.properties);
        return m;
      },
      onEachFeature: function (f, l) {
        S.pLayers[f.properties.id] = l;
        const nom = esc(f.properties.nom);
        const infos = function () {
          const p = f.properties;
          return "<b>" + nom + "</b><br>" + fmt(p.population) + " hab. · " + fmt(p.personnel_total) + " agents · " + fmt(p.nb_lits) + " lits" +
            (p.taux_couverture != null ? "<br>Taux de couverture : <b>" + fmt(p.taux_couverture, 2) + "</b> (" + esc(p.type_maille) + ")" : "");
        };
        if (labels) {
          // etiquette permanente : numero (cartes du memoire) + nom usuel ; les infos restent au survol (title)
          l.bindTooltip(etiquettePoste(f.properties), { permanent: true, direction: "right", offset: [3, 0], className: "poste-label", interactive: false });
          // infos au survol (popup ouverte/fermee a la main : aucun effet sur le clic qui ouvre la fiche)
          const pop = L.popup({ closeButton: false, autoPan: false, autoClose: true, closeOnClick: false, className: "poste-pop", offset: [0, -Math.round(2 * rayonPoste(f.properties) + 14)] });
          l.on("mouseover", function () { if (!S.tool) pop.setLatLng(l.getLatLng()).setContent(infos()).openOn(map); });
          l.on("mouseout click", function () { map.closePopup(pop); });
        } else l.bindTooltip(infos, { direction: "top" });
        // un marqueur ne transmet pas le clic a la carte : avec un outil actif, on le transmet a la main
        l.on("click", function () { if (!S.tool) selectPoste(f.properties.id); else map.fire("click", { latlng: l.getLatLng() }); });
      },
    });
    if (S.on.postes) S.layers.postes.addTo(map);
    requestAnimationFrame(majEtiquettes);
  }
  function etiquettePoste(p) {
    return '<span class="pl-n">' + esc(p.numero != null ? p.numero : "") + '</span><span class="pl-t">' + esc(nomCourt(p)) + "</span>";
  }
  /* etiquettes des postes : numero + nom ; si deux etiquettes se chevauchent, la moins prioritaire
     (population la plus faible) ne garde que son numero. Recalcule a chaque zoom / deplacement. */
  function majEtiquettes() {
    if (!S.layers.postes || !map.hasLayer(S.layers.postes)) return;
    const items = [];
    S.layers.postes.eachLayer(function (l) {
      const t = l.getTooltip && l.getTooltip(), el = t && t.getElement && t.getElement();
      if (el && t.options.permanent) { el.classList.remove("pl-compact"); items.push({ el: el, w: l.feature.properties.population || 0 }); }
    });
    items.sort(function (a, b) { return b.w - a.w; });
    const pris = [];
    const chevauche = function (r) { return pris.some(function (q) { return r.left < q.right + 2 && r.right > q.left - 2 && r.top < q.bottom + 1 && r.bottom > q.top - 1; }); };
    items.forEach(function (it) {
      const r = it.el.getBoundingClientRect();
      if (chevauche(r)) { it.el.classList.add("pl-compact"); pris.push(it.el.getBoundingClientRect()); }
      else pris.push(r);
    });
  }
  map.on("zoomend moveend", function () { requestAnimationFrame(majEtiquettes); });

  /* ------------------------------------------------------------------ couches distantes (aires, thiessen, flux) */
  const DEFS = [
    { id: "quartiers", label: "Quartiers (thématique)", sw: "#60a5fa", on: true },
    { id: "postes", label: "Postes de santé", sw: "#0f766e", on: true },
    { id: "aire_administrative", label: "Aire administrative", url: "api/aires/administrative/", sw: "#8b5cf6" },
    { id: "aire_reelle", label: "Aire réelle (flux ≥ 5 %)", url: "api/aires/reelle/", sw: "#f59e0b" },
    { id: "aire_theorique", label: "Aire théorique (par quartier)", url: "api/aires/theorique/", sw: "#10b981" },
    { id: "thiessen", label: "Thiessen (calculé PostGIS)", url: "api/thiessen/", sw: "#ef4444" },
    { id: "flux", label: "Flux de patients", url: "api/flux/", sw: "#7c3aed" },
    { id: "tampon", label: "Zone tampon", sw: "#0ea5e9" },
  ];
  const LIB_AIRE = { aire_administrative: "Aire administrative", aire_reelle: "Aire réelle", aire_theorique: "Aire théorique" };

  /* une maille prend la couleur de son poste (classe) quand le mode de couleur des postes s'y prete, sinon une couleur par poste */
  function posteParId(pid) { return S.postes ? (S.postes.features.filter(function (x) { return x.properties.id === pid; })[0] || {}).properties : null; }
  function styleAire(id, f) {
    const p = COULEUR_MAILLE.indexOf(couleurP) >= 0 ? posteParId(f.properties.id) : null;
    if (id === "thiessen") return p ? { pane: id, color: "#ffffff", weight: 1, fillColor: couleurPoste(p), fillOpacity: 0.62 }
                                    : { pane: id, color: "#b91c1c", weight: 1.6, dashArray: "5 4", fillColor: GP.couleurId(f.properties.id), fillOpacity: 0.18 };
    if (p) return { pane: id, color: "#ffffff", weight: 1.2, fillColor: couleurPoste(p), fillOpacity: 0.62 };
    const c = GP.couleurId(f.properties.id); return { pane: id, color: c, weight: 2, fillColor: c, fillOpacity: 0.35 };
  }
  function restylerAires() {
    ["aire_administrative", "aire_reelle", "aire_theorique", "thiessen"].forEach(function (k) {
      if (S.layers[k]) S.layers[k].setStyle(function (f) { return styleAire(k, f); }); });
  }
  function buildDistante(id, data) {
    if (S.layers[id]) map.removeLayer(S.layers[id]);
    let opts;
    if (id === "flux") {
      opts = {
        pane: "flux",
        style: function (f) { return { pane: "flux", color: "#c084fc", opacity: f.properties.retenu_aire_reelle ? 0.8 : 0.5, weight: Math.max(1.2, f.properties.nb_patients / 3), dashArray: f.properties.retenu_aire_reelle ? null : "4 4" }; },
        onEachFeature: function (f, l) {
          const p = f.properties;
          l.bindTooltip("<b>" + esc(p.quartier) + "</b> → " + esc(p.poste) + "<br>" + p.nb_patients + " patients (" + fmt(p.pct_flux_poste, 1) + " % des patients du poste)" +
            "<br><small>" + (p.retenu_aire_reelle ? "Quartier retenu dans l'aire réelle du poste" : "Quartier rattaché à l'aire réelle d'un autre poste (poste dominant)") + "</small>", { sticky: true });
        },
      };
    } else if (id === "thiessen") {
      opts = {
        pane: "thiessen",
        style: function (f) { return styleAire("thiessen", f); },
        onEachFeature: function (f, l) {
          const p = f.properties;
          l.bindTooltip("<b>Thiessen · " + esc(p.poste) + "</b><br>" + fmt(p.superficie_ha / 100, 2) + " km²" +
            (p.population_theorique != null ? " · " + fmt(p.population_theorique) + " hab. (mémoire)<br>Taux de couverture : <b>" + fmt(p.taux_couverture, 2) + "</b> — " + esc(p.type_maille)
              : " · ≈ " + fmt(p.population_estimee) + " hab."), { sticky: true });
          l.on("click", function () { if (!S.tool) selectPoste(p.id); });
        },
      };
    } else {
      opts = {
        pane: id,
        style: function (f) { return styleAire(id, f); },
        onEachFeature: function (f, l) {
          const p = f.properties;
          l.bindTooltip("<b>" + esc(LIB_AIRE[id]) + " · " + esc(p.poste) + "</b><br>" + p.nb_quartiers + " quartier(s) · " + fmt(p.population) + " hab.", { sticky: true });
          l.on("click", function () { if (!S.tool) selectPoste(p.id); });
        },
      };
    }
    S.layers[id] = L.geoJSON(data, opts);
  }

  async function basculerCouche(id, on) {
    S.on[id] = on;
    const row = $('.layer[data-id="' + id + '"]');
    if (row) row.classList.toggle("on", on);
    if (id === "quartiers" || id === "postes") {
      const l = S.layers[id];
      if (l) { on ? l.addTo(map) : map.removeLayer(l); }
      if (id === "postes" && on) requestAnimationFrame(majEtiquettes);
    } else if (id === "tampon") {
      if (S.layers.tampon) { on ? S.layers.tampon.addTo(map) : map.removeLayer(S.layers.tampon); }
    } else {
      const def = DEFS.filter(function (d) { return d.id === id; })[0];
      if (on && !S.loaded[id]) {
        if (row) row.classList.add("loading");
        try { buildDistante(id, await GP.getJSON(def.url)); S.loaded[id] = true; }
        catch (e) { console.error(e); alert("Chargement impossible : " + def.label); S.on[id] = false; const cb = $("#chk-" + id); if (cb) cb.checked = false; }
        if (row) row.classList.remove("loading");
      }
      const l = S.layers[id];
      if (l) { on && S.on[id] ? l.addTo(map) : map.removeLayer(l); }
    }
    renderLegend();
  }

  function initListeCouches() {
    $$("#catalogue .layer").forEach(function (row) {
      const id = row.dataset.id;
      $("input[type=checkbox]", row).addEventListener("change", function (e) { basculerCouche(id, e.target.checked); });
      const opac = $(".opac-range", row);
      if (opac) opac.addEventListener("input", function (e) { map.getPane(id).style.opacity = e.target.value; });
      const k = $(".kebab", row), opts = $(".lopts", row);
      k.addEventListener("click", function () { const ouvert = opts.classList.toggle("hidden") === false; k.setAttribute("aria-expanded", ouvert ? "true" : "false"); });
    });
  }

  /* ------------------------------------------------------------------ legende */
  function renderLegend() {
    let h = "";
    if (S.on.quartiers && S.qclass) {
      const ind = IND_Q[indQ], b = S.qclass.breaks, c = S.qclass.colors;
      h += "<h4>" + esc(ind.label) + "</h4>";
      c.forEach(function (col, i) {
        const lo = i === 0 ? S.qclass.min : b[i - 1], hi = i === b.length ? S.qclass.max : b[i];
        const txt = b.length === 0 ? fmt(lo, 1) : (i === 0 ? "< " + fmt(b[0], 1) : (i === b.length ? "≥ " + fmt(b[i - 1], 1) : fmt(lo, 1) + " – " + fmt(hi, 1)));
        h += '<div class="it"><span class="sw" style="background:' + col + '"></span>' + txt + "</div>";
      });
    }
    if (S.on.postes) {
      if (h) h += '<div class="sep"></div>';
      h += "<h4>Postes de santé — " + esc(COULEURS_P[couleurP]) + "</h4>";
      const ic = GP.iconeLegende;
      if (couleurP === "commune") Object.keys(GP.COMMUNE_COULEUR).forEach(function (k) { h += '<div class="it">' + ic(GP.COMMUNE_COULEUR[k]) + esc(k) + "</div>"; });
      else if (couleurP === "taux") MAILLE.forEach(function (m) { h += '<div class="it">' + ic(m.c) + esc(m.txt) + "</div>"; });
      else if (couleurP === "infirmiers") Object.keys(INF).forEach(function (k) { h += '<div class="it">' + ic(INF[k][0]) + esc(k) + ' <small style="color:#9fb6c9">(' + INF[k][1] + ")</small></div>"; });
      else if (couleurP === "kmeans" || couleurP === "ch") { const T = couleurP === "kmeans" ? KMEANS : CHC; Object.keys(T).forEach(function (k) { h += '<div class="it">' + ic(T[k][1]) + k + " · " + esc(T[k][0]) + "</div>"; }); }
      else if (couleurP === "nb_services") S.pclass.services.colors.forEach(function (col, i) {
        const b = S.pclass.services.breaks;
        const txt = b.length === 0 ? "—" : (i === 0 ? "< " + b[0] : (i === b.length ? "≥ " + b[i - 1] : b[i - 1] + " – " + b[i]));
        h += '<div class="it">' + GP.iconeLegende(col) + txt + " services</div>";
      });
      else h += '<div class="it">' + GP.iconeLegende("#16a34a") + 'Norme respectée</div><div class="it">' + GP.iconeLegende("#dc2626") + "Norme non respectée</div>";
      if (tailleP !== "uniforme") h += '<div class="it" style="color:#9fb6c9">Taille : ' + esc(TAILLES[tailleP].label) + "</div>";
      if ($("#postes-labels").checked) h += '<div class="it" style="color:#9fb6c9">Étiquette : n° des cartes du mémoire + nom</div>';
    }
    const aires = ["aire_administrative", "aire_reelle", "aire_theorique", "thiessen"].filter(function (k) { return S.on[k]; });
    if (aires.length) { if (h) h += '<div class="sep"></div>'; h += "<h4>Aires de desserte</h4><div style=\"color:#9fb6c9\">" + (COULEUR_MAILLE.indexOf(couleurP) >= 0 ? "Chaque maille prend la couleur de son poste : " + esc(COULEURS_P[couleurP]) + "." : "Une couleur par poste de santé (cliquer pour la fiche).") + "</div>"; }
    if (S.on.flux) { if (h) h += '<div class="sep"></div>'; h += '<h4>Flux de patients (≥ 5 % des patients du poste)</h4><div class="it"><span class="sw" style="background:#c084fc"></span>Épaisseur = nb de patients</div><div class="it" style="color:#9fb6c9">Tirets : quartier rattaché à un autre poste dominant</div>'; }
    $("#legend-box").innerHTML = h || '<span class="hint">Aucune couche affichée.</span>';
  }

  /* ------------------------------------------------------------------ panneau detail */
  function ouvrirDetail(html) {
    $("#detail-body").innerHTML = html;
    $("#apercu").classList.add("hidden");
    $("#detail").classList.remove("hidden");
    $("#rcol").scrollTop = 0;
    document.body.classList.add("right-open");
    if (document.body.classList.contains("hide-right")) { document.body.classList.remove("hide-right", "map-maxi"); if (window.gpMajTog) window.gpMajTog(); }
  }
  function fermerDetail() {
    $("#detail").classList.add("hidden");
    $("#apercu").classList.remove("hidden");
    document.body.classList.remove("right-open");
    deselectionner();
  }
  function deselectionner() {
    if (S.sel) {
      if (S.sel.kind === "q" && S.layers.quartiers && S.sel.layer) S.layers.quartiers.resetStyle(S.sel.layer);
      if (S.sel.kind === "p" && S.sel.layer) { const el = S.sel.layer.getElement && S.sel.layer.getElement(); if (el) el.classList.remove("sel"); S.sel.layer.setZIndexOffset(0); }
      S.sel = null;
    }
  }

  const badge = function (ok, t) { return '<span class="badge ' + (ok ? "ok" : "ko") + '">' + esc(t) + "</span>"; };
  const hab = function (v) { return v === null || v === undefined ? "aucun" : fmt(v); };

  async function selectPoste(id) {
    deselectionner();
    const layer = S.pLayers[id];
    if (layer) { const el = layer.getElement && layer.getElement(); if (el) el.classList.add("sel"); layer.setZIndexOffset(1000); S.sel = { kind: "p", layer: layer }; }
    ouvrirDetail('<div class="d-sec">Chargement…</div>');
    let d;
    try { d = await GP.getJSON("api/poste/" + id + "/"); } catch (e) { ouvrirDetail('<div class="d-sec">Fiche indisponible.</div>'); return; }
    const p = d.poste, e = d.enquete, n = e.indicateurs.n;
    let h = '<div class="d-head"><h2>' + (p.numero != null ? '<span class="d-num">' + p.numero + "</span> " : "") + esc(p.nom) + '</h2><div class="sub">' + esc(p.commune) + " · " + fmt(p.nb_quartiers_administratifs) + " quartier(s) administratif(s)</div></div>";
    h += '<div class="d-sec"><div class="kv">' +
      '<div class="box"><b>' + fmt(p.population) + "</b><span>habitants (aire administrative)</span></div>" +
      '<div class="box"><b>' + fmt(p.personnel_total) + "</b><span>agents de santé</span></div>" +
      '<div class="box"><b>' + fmt(p.nb_lits) + "</b><span>lits</span></div>" +
      '<div class="box"><b>' + fmt(p.nb_services) + "/11</b><span>services offerts</span></div></div></div>";
    h += '<div class="d-sec"><h4>Personnel et repères (OMS, ANSD)</h4><table><tr><th></th><th class="num">Eff.</th><th class="num">Hab./agent</th><th>Norme</th><th class="num">Manque</th></tr>' +
      "<tr><td>Médecins</td><td class=num>" + fmt(p.nb_medecins) + "</td><td class=num>" + hab(p.hab_par_medecin) + "</td><td>" + badge(p.norme_medecin_respectee, p.norme_medecin_respectee ? "OK" : "Non") + "</td><td class=num>" + fmt(p.medecins_manquants) + "</td></tr>" +
      "<tr><td>Infirmiers</td><td class=num>" + fmt(p.nb_infirmiers) + "</td><td class=num>" + hab(p.hab_par_infirmier) + "</td><td>" + badge(p.norme_infirmier_respectee, p.norme_infirmier_respectee ? "OK" : "Non") + "</td><td class=num>" + fmt(p.infirmiers_manquants) + "</td></tr>" +
      "<tr><td>Sages-femmes</td><td class=num>" + fmt(p.nb_sages_femmes) + "</td><td class=num>—</td><td>—</td><td class=num>—</td></tr>" +
      "<tr><td>Techniciens sup.</td><td class=num>" + fmt(p.nb_techniciens_sup) + "</td><td class=num>" + (p.nb_techniciens_sup ? fmt(p.population / p.nb_techniciens_sup) : "aucun") + "</td><td>" +
        badge(p.techniciens_manquants === 0, p.techniciens_manquants === 0 ? "OK" : "Non") + "</td><td class=num>" + fmt(p.techniciens_manquants) + "</td></tr></table>" +
      (p.classe_infirmier ? '<p class="hint"><span class="badge" style="background:' + (INF[p.classe_infirmier] || ["#64748b"])[0] + ';color:#fff">' + esc(p.classe_infirmier) + "</span> · rang " + p.rang_infirmier + " sur 28 · " +
        fmt(p.infirmiers_requis) + " infirmier(s) requis, écart " + (p.ecart_infirmiers > 0 ? "+" : "") + fmt(p.ecart_infirmiers) + " (tableau 3-6)</p>" : "") +
      '<p class="hint">Repères : 1 médecin / 10 000 hab., 1 infirmier / 5 000 hab., 1 technicien supérieur / 5 000 hab. (hypothèse du mémoire). Population administrative.</p></div>';
    if (p.taux_couverture != null) {
      const ix = function (v) { return v === null || v === undefined ? "—" : Number(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
      h += '<div class="d-sec"><h4>Couverture et forme des mailles <small>(mémoire, annexe A-1)</small></h4>' +
        '<div class="kv"><div class="box"><b>' + fmt(p.population_theorique) + "</b><span>hab. dans l'aire théorique</span></div>" +
        '<div class="box"><b style="color:' + couleurMaille(p.type_maille) + '">' + fmt(p.taux_couverture, 2) + "</b><span>taux de couverture (repère 10 000)</span></div></div>" +
        '<p class="hint"><span class="badge" style="background:' + couleurMaille(p.type_maille) + ';color:#fff">' + esc(p.type_maille) + "</span> · aire théorique de " + fmt(p.superficie_theo_km2, 2) + " km²</p>" +
        "<table><tr><th>Indice</th><th class=num>Valeur</th></tr>" +
        "<tr><td>Forme IF (cercle = 0,785)</td><td class=num>" + ix(p.indice_forme) + "</td></tr>" +
        "<tr><td>Décentrement ID</td><td class=num>" + ix(p.indice_decentrement) + "</td></tr>" +
        "<tr><td>Discordance théorique / administrative</td><td class=num>" + ix(p.discordance_ta) + "</td></tr>" +
        "<tr><td>Discordance administrative / réelle</td><td class=num>" + ix(p.discordance_ar) + "</td></tr>" +
        "<tr><td>Discordance théorique / réelle</td><td class=num>" + ix(p.discordance_tr) + "</td></tr></table>" +
        '<p class="hint">Discordance : 0 = aires identiques, 1 = aucun recouvrement.</p>' +
        "<h4 style=\"margin-top:12px\">Typologie de l'offre</h4><p class=hint><b>" + esc(p.classe_kmeans || "—") + " (K-means) :</b> " + esc(p.profil_kmeans || "—") +
        "<br><b>" + esc(p.classe_ch || "—") + " (CAH) :</b> " + esc(p.profil_ch || "—") + "</p></div>";
    }
    h += '<div class="d-sec"><h4>Services disponibles</h4><div class="chips">' +
      ((p.services || []).length ? p.services.map(function (s) { return '<span class="chip">' + esc(s) + "</span>"; }).join("") : '<span class="chip muted">Aucun service renseigné</span>') +
      "</div>" + (p.autres_equipements ? '<p class="hint">Autres équipements : ' + esc(p.autres_equipements) + "</p>" : "") + "</div>";
    h += '<div class="d-sec"><h4>Aires de desserte</h4>';
    [["administrative", "Administrative"], ["reelle", "Réelle (> 5 % des patients, poste dominant)"], ["theorique", "Théorique (Thiessen, par quartier)"]].forEach(function (a) {
      const l = d.aires[a[0]] || [];
      h += "<p class=hint><b>" + a[1] + " (" + l.length + ") :</b> " + (l.length ? l.map(esc).join(", ") : (a[0] === "reelle" ? "aucun quartier n'atteint le seuil" : "—")) + "</p>";
    });
    h += "</div>";
    h += '<div class="d-sec"><h4>Enquête auprès des patients (n = ' + n + ")</h4>";
    if (n) {
      h += '<div class="kv"><div class="box"><b>' + fmt(e.indicateurs.duree_mediane_min, 0) + "</b><span>trajet médian (min)</span></div>" +
        '<div class="box"><b>' + fmt(e.indicateurs.distance_mediane_km, 2) + "</b><span>distance médiane (km)</span></div>" +
        '<div class="box"><b>' + fmt(e.indicateurs.pct_a_pied, 0) + " %</b><span>viennent à pied</span></div></div>" +
        '<h4 style="margin-top:14px">Moyen de transport</h4><canvas id="ch-transport"></canvas>' +
        '<h4 style="margin-top:14px">Raisons du choix</h4><canvas id="ch-raisons"></canvas>' +
        '<h4 style="margin-top:14px">Quartiers de résidence des patients</h4><canvas id="ch-prov"></canvas>';
    } else h += '<p class="hint">Aucun patient enquêté pour ce poste.</p>';
    h += "</div>";
    h += '<div class="d-sec"><button class="btn block" id="d-iti">🧭 Itinéraire jusqu\'à ce poste (rues OpenStreetMap)</button>' +
      '<button class="btn block ghost" id="d-tampon">⭕ Zone tampon de 1 km autour de ce poste</button></div>';
    ouvrirDetail(h);
    if (n) {
      GP.barres($("#ch-transport"), e.transport, { horizontal: true });
      GP.barres($("#ch-raisons"), e.raisons, { horizontal: true, couleur: GP.COULEURS[1] });
      GP.barres($("#ch-prov"), e.provenance, { horizontal: true, couleur: GP.COULEURS[2] });
    }
    $("#d-iti").addEventListener("click", function () { itineraireVers(id); });
    $("#d-tampon").addEventListener("click", function () {
      $("#tampon-poste").value = String(id); $("#tampon-dist").value = 1000; $("#tampon-val").textContent = "1000 m";
      ouvrirAnalyse(); calculerTampon();
    });
  }

  async function selectQuartier(id) {
    deselectionner();
    const layer = S.qLayers[id];
    if (layer) { layer.setStyle({ color: "#22d3ee", weight: 3 }); layer.bringToFront(); S.sel = { kind: "q", layer: layer }; }
    ouvrirDetail('<div class="d-sec">Chargement…</div>');
    let q;
    try { q = await GP.getJSON("api/quartier/" + id + "/"); } catch (e) { ouvrirDetail('<div class="d-sec">Fiche indisponible.</div>'); return; }
    const pf = q.postes_frequentes || [];
    let h = '<div class="d-head"><h2>' + esc(q.nom) + '</h2><div class="sub">' + esc(q.commune) + " · arrondissement " + esc(q.arrondissement) + "</div></div>";
    h += '<div class="d-sec"><div class="kv">' +
      '<div class="box"><b>' + fmt(q.population) + "</b><span>habitants (2023)</span></div>" +
      '<div class="box"><b>' + fmt(q.menages) + "</b><span>ménages</span></div>" +
      '<div class="box"><b>' + fmt(q.densite) + "</b><span>hab./km²</span></div>" +
      '<div class="box"><b>' + fmt(q.superficie_km2, 2) + "</b><span>km²</span></div></div>" +
      '<p class="hint">Hommes : ' + fmt(q.hommes) + " · Femmes : " + fmt(q.femmes) + "</p></div>";
    h += '<div class="d-sec"><h4>Rattachement aux postes</h4><p class="hint"><b>Administratif :</b> ' + (q.poste_administratif.length ? q.poste_administratif.map(esc).join(", ") : "non rattaché") +
      "<br><b>Théorique (Thiessen) :</b> " + (q.poste_theorique.length ? q.poste_theorique.map(esc).join(", ") : "—") +
      "<br><b>Réel (poste dominant) :</b> " + ((q.poste_reel || []).length ? q.poste_reel.map(esc).join(", ") : "aucun poste ne reçoit plus de 5 % de ses patients de ce quartier") + "</p></div>";
    h += '<div class="d-sec"><h4>Postes les plus proches <small>(à vol d\'oiseau)</small></h4><table>' +
      q.plus_proches.map(function (p) { return '<tr class="clickable" data-id="' + p.id + '"><td>' + esc(p.nom) + '</td><td class="num">' + fmt(p.distance_m) + " m</td></tr>"; }).join("") + "</table></div>";
    h += '<div class="d-sec"><h4>Postes réellement fréquentés (enquête)</h4>' +
      (pf.length ? "<table><tr><th>Poste</th><th class=num>Patients</th><th class=num>% des patients du poste</th></tr>" +
        pf.map(function (p) { return '<tr class="clickable" data-id="' + p.poste_id + '"><td>' + esc(p.poste) + (p.retenu_aire_reelle ? " ✓" : "") + "</td><td class=num>" + p.nb_patients + "</td><td class=num>" + fmt(p.pct_flux_poste, 1) + "</td></tr>"; }).join("") + "</table>" +
        '<p class="hint">✓ : poste dominant, le quartier appartient à son aire réelle.</p>'
        : '<p class="hint">Aucun flux significatif identifié pour ce quartier.</p>') + "</div>";
    ouvrirDetail(h);
    $$("#detail-body tr.clickable").forEach(function (tr) { tr.addEventListener("click", function () { allerPoste(Number(tr.dataset.id)); }); });
  }

  /* ------------------------------------------------------------------ outils */
  function ouvrirAnalyse() { $("#drawer-analyse").classList.remove("hidden"); }
  function setTool(nom) {
    S.tool = (S.tool === nom) ? null : nom;
    $("#tool-proche").classList.toggle("active", S.tool === "proche");
    $("#tool-proche").textContent = S.tool === "proche" ? "👆 Cliquez sur la carte…" : "👆 Cliquer sur la carte";
    $("#tool-mesure").classList.toggle("active", S.tool === "mesure");
    $("#tb-mesure").classList.toggle("on", S.tool === "mesure");
    $("#tool-mesure").textContent = S.tool === "mesure" ? "Mesure en cours…" : "Mesurer";
    $("#iti-carte").classList.toggle("active", S.tool === "iti");
    $("#iti-carte").textContent = S.tool === "iti" ? "👆 Cliquez sur la carte…" : "👆 Choisir sur la carte";
    $("#map").classList.toggle("tool-active", !!S.tool);
    if (S.tool === "mesure") map.doubleClickZoom.disable(); else map.doubleClickZoom.enable();
    if (S.tool === "mesure" && S.mesure && S.mesure.fini) effacerMesure();   // nouvelle mesure apres un double-clic
    if (S.tool === "mesure" && !S.mesure) S.mesure = { pts: [], ligne: null, pts_layers: [] };
  }

  /* ---- localiser le poste le plus proche PAR LES RUES (OSRM « table » sur les 28 postes) ---- */
  let procheJeton = 0;
  async function plusProche(ll) {
    S.dernierProche = ll;
    const jeton = ++procheJeton, mode = ITI.mode, out = $("#out-proche");
    S.outils.clearLayers(); S.routeProche = null;
    L.circleMarker(ll, { pane: "outils", radius: 8, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }).bindTooltip("Point de départ").addTo(S.outils);
    out.innerHTML = '<p class="thint">' + MODES[mode].ico + " Calcul des distances par les rues vers les " + S.postes.features.length + " postes…</p>";
    let q = null;
    try { q = (await GP.getJSON("api/proche/?lat=" + ll.lat + "&lon=" + ll.lng + "&n=1")).quartier; } catch (e) { /* le quartier est facultatif */ }
    const cl = await classerParRoute(ll, mode);
    if (jeton !== procheJeton) return;                         // un autre clic a eu lieu entre-temps
    const enTete = q ? "<p><b>Quartier :</b> " + esc(q.nom) + " (" + esc(q.commune) + ") — " + fmt(q.population) + " hab.</p>" : '<p class="hint">Point hors des quartiers recensés.</p>';
    if (!cl) {                                                 // service injoignable : repli a vol d'oiseau, clairement signale
      const vol = postesParVol(ll).slice(0, 3);
      vol.forEach(function (x, i) { L.polyline([ll, x.ll], { pane: "outils", color: i ? "#94a3b8" : "#f59e0b", weight: i ? 2 : 3, dashArray: "6 5" }).addTo(S.outils); });
      out.innerHTML = enTete + '<p class="iti-err">Le service d\'itinéraire OpenStreetMap ne répond pas (connexion Internet nécessaire) : distances <b>à vol d\'oiseau</b> en attendant.</p>' +
        "<table>" + vol.map(function (x) { return '<tr class="clickable" data-id="' + x.p.id + '"><td>' + esc(x.p.nom) + '</td><td class="num">' + distTxt(x.vol) + "</td></tr>"; }).join("") + "</table>" +
        '<a class="tbtn block iti-osm" target="_blank" rel="noopener" href="' + lienOSM(ll, vol[0].ll, mode) + '">Ouvrir sur openstreetmap.org ↗</a>';
      $$("#out-proche tr.clickable").forEach(function (tr) { tr.addEventListener("click", function () { selectPoste(Number(tr.dataset.id)); }); });
      return;
    }
    const top = cl.slice(0, 5);
    out.innerHTML = enTete +
      '<div class="proche-best"><span class="iti-mode">' + MODES[mode].ico + '</span><div><small>Poste le plus proche par les rues</small><b>' + esc(top[0].p.nom) + "</b>" +
      '<span class="pb-l"><span class="big">' + distTxt(top[0].distance) + "</span> · <b>" + dureeTxt(top[0].duree) + "</b> " + MODES[mode].lib.toLowerCase() + "</span></div></div>" +
      '<table class="proche-tab"><tr><th>#</th><th>Poste</th><th class="num">Par les rues</th><th class="num">Durée</th><th></th></tr>' +
      top.map(function (x, i) {
        return '<tr class="clickable' + (i ? "" : " on") + '" data-i="' + i + '"><td>' + (i + 1) + "</td><td>" + esc(x.p.nom) +
          '<small class="vol">vol d\'oiseau : ' + distTxt(x.vol) + '</small></td><td class="num"><b>' + distTxt(x.distance) + '</b></td><td class="num">' + dureeTxt(x.duree) +
          '</td><td><button class="iti-go" type="button" data-id="' + x.p.id + '" title="Consignes pas à pas" aria-label="Itinéraire détaillé vers ' + esc(x.p.nom) + '">🧭</button></td></tr>';
      }).join("") + "</table>" +
      '<p class="thint">Cliquez une ligne pour voir son trajet · 🧭 : consignes pas à pas. Réseau © contributeurs OpenStreetMap (OSRM).</p>';
    async function tracer(i) {
      $$("#out-proche .proche-tab tr.clickable").forEach(function (tr) { tr.classList.toggle("on", Number(tr.dataset.i) === i); });
      if (S.routeProche) S.outils.removeLayer(S.routeProche);
      const grp = S.routeProche = L.layerGroup().addTo(S.outils);
      const x = top[i]; let r = null;
      try { r = await demanderRoute(ll, x.ll, mode); } catch (e) { /* trace indisponible */ }
      if (jeton !== procheJeton) return;
      if (!r) { L.polyline([ll, x.ll], { pane: "outils", color: "#f59e0b", weight: 3, dashArray: "6 5" }).addTo(grp); return; }
      const fond = L.geoJSON(r.geometry, { pane: "outils", style: { color: "#0b2237", weight: 9, opacity: 0.85, lineCap: "round" } }).addTo(grp);
      L.geoJSON(r.geometry, { pane: "outils", style: { color: "#f59e0b", weight: 5, opacity: 1, lineCap: "round" } }).addTo(grp)
        .bindTooltip(distTxt(r.distance) + " · " + dureeTxt(r.duration), { sticky: true });
      map.fitBounds(fond.getBounds(), margesCarte());
      if (S.pLayers[x.p.id]) { deselectionner(); const el = S.pLayers[x.p.id].getElement(); if (el) el.classList.add("sel"); S.sel = { kind: "p", layer: S.pLayers[x.p.id] }; }
    }
    $$("#out-proche .proche-tab tr.clickable").forEach(function (tr) { tr.addEventListener("click", function () { tracer(Number(tr.dataset.i)); }); });
    $$("#out-proche .iti-go").forEach(function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); if (S.tool === "proche") setTool("proche"); S.outils.clearLayers(); itineraireVers(Number(b.dataset.id), ll); });
    });
    tracer(0);
    const blk = $(".proche-best", out); if (blk && blk.scrollIntoView) blk.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function proche_maPosition() {
    if (!navigator.geolocation) { toast("Votre appareil ne permet pas la localisation : cliquez sur la carte.", "err"); if (S.tool !== "proche") setTool("proche"); return; }
    $("#out-proche").innerHTML = '<p class="thint">Localisation en cours… autorisez-la si le navigateur le demande.</p>';
    navigator.geolocation.getCurrentPosition(function (pos) { plusProche(L.latLng(pos.coords.latitude, pos.coords.longitude)); },
      function (err) {
        toast(err.code === 1 ? "Localisation refusée : cliquez sur la carte pour choisir le point." : "Position introuvable : cliquez sur la carte.", "err");
        if (S.tool !== "proche") setTool("proche");
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  }

  function ajouterMesure(ll) {
    const m = S.mesure; m.pts.push(ll);
    m.pts_layers.push(L.circleMarker(ll, { pane: "outils", radius: 4, color: "#fff", weight: 1.5, fillColor: "#0ea5e9", fillOpacity: 1 }).addTo(S.outils));
    if (m.ligne) m.ligne.setLatLngs(m.pts);
    else m.ligne = L.polyline(m.pts, { pane: "outils", color: "#0ea5e9", weight: 3 }).addTo(S.outils);
    afficherMesure();
  }
  function afficherMesure() {
    const m = S.mesure; if (!m) return;
    let tot = 0; for (let i = 1; i < m.pts.length; i++) tot += map.distance(m.pts[i - 1], m.pts[i]);
    const txt = tot >= 1000 ? fmt(tot / 1000, 2) + " km" : fmt(tot) + " m";
    $("#out-mesure").innerHTML = '<span class="big">' + txt + "</span><br><small>" + m.pts.length + " point(s)</small>";
    $("#tb-mesure-val").textContent = "· " + txt;
  }
  function effacerMesure() {
    if (S.mesure) { if (S.mesure.ligne) S.outils.removeLayer(S.mesure.ligne); S.mesure.pts_layers.forEach(function (l) { S.outils.removeLayer(l); }); }
    S.mesure = S.tool === "mesure" ? { pts: [], ligne: null, pts_layers: [] } : null;
    $("#out-mesure").innerHTML = "";
    $("#tb-mesure-val").textContent = "";
  }

  async function calculerTampon() {
    const dist = $("#tampon-dist").value, poste = $("#tampon-poste").value;
    $("#out-tampon").textContent = "Calcul PostGIS en cours…";
    let d;
    try { d = await GP.getJSON("api/tampon/?distance=" + dist + (poste ? "&poste=" + poste : "")); } catch (e) { $("#out-tampon").textContent = "Erreur de calcul."; return; }
    if (S.layers.tampon) map.removeLayer(S.layers.tampon);
    S.layers.tampon = L.geoJSON({ type: "Feature", geometry: d.geometry, properties: {} }, {
      pane: "tampon", style: { pane: "tampon", color: "#0284c7", weight: 2, fillColor: "#38bdf8", fillOpacity: 0.3 },
    });
    const cb = $("#chk-tampon"); cb.checked = true; S.on.tampon = true; $('.layer[data-id="tampon"]').classList.add("on");
    S.layers.tampon.addTo(map);
    map.fitBounds(S.layers.tampon.getBounds(), { padding: [30, 30], maxZoom: 15 });
    $("#out-tampon").innerHTML = '<span class="big">' + fmt(d.pct_couvert, 1) + " %</span> de la population<br>" +
      fmt(d.population_couverte) + " hab. sur " + fmt(d.population_totale) + "<br><small>" + d.nb_postes + " poste(s) · rayon " + fmt(d.distance_m) + " m · " + fmt(d.superficie_km2, 2) + " km²</small>";
    renderLegend();
  }
  function effacerTampon() {
    if (S.layers.tampon) { map.removeLayer(S.layers.tampon); S.layers.tampon = null; }
    $("#chk-tampon").checked = false; S.on.tampon = false; $('.layer[data-id="tampon"]').classList.remove("on");
    $("#out-tampon").innerHTML = "";
  }

  async function courbeCouverture() {
    const cv = $("#ch-couverture"); cv.classList.remove("hidden");
    const d = await GP.getJSON("api/couverture/");
    GP.graphique(cv, {
      type: "line",
      data: { labels: d.serie.map(function (s) { return s.distance_m + " m"; }),
              datasets: [{ label: "% population couverte", data: d.serie.map(function (s) { return s.pct; }), borderColor: "#0f766e", backgroundColor: "rgba(15,118,110,.15)", fill: true, tension: 0.3 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, title: { display: true, text: "% population" } } } },
    });
  }

  function majEloignes() {
    const seuil = Number($("#seuil-dist").value);
    $("#seuil-val").textContent = seuil + " m";
    const l = S.quartiers.features.map(function (f) { return f.properties; })
      .filter(function (p) { return p.dist_poste_m !== null && p.dist_poste_m > seuil; })
      .sort(function (a, b) { return b.dist_poste_m - a.dist_poste_m; });
    const pop = l.reduce(function (s, p) { return s + (p.population || 0); }, 0);
    const tot = S.quartiers.features.reduce(function (s, f) { return s + (f.properties.population || 0); }, 0);
    $("#out-eloignes").innerHTML = '<span class="big">' + l.length + "</span> quartier(s) · " + fmt(pop) + " hab. (" + fmt(100 * pop / tot, 1) + " %)" +
      (l.length ? "<table><tr><th>Quartier</th><th class=num>Dist.</th><th class=num>Pop.</th></tr>" +
        l.slice(0, 12).map(function (p) { return '<tr class="clickable" data-id="' + p.id + '"><td>' + esc(p.nom) + '</td><td class="num">' + fmt(p.dist_poste_m) + ' m</td><td class="num">' + fmt(p.population) + "</td></tr>"; }).join("") + "</table>" : "");
    $$("#out-eloignes tr.clickable").forEach(function (tr) { tr.addEventListener("click", function () { allerQuartier(Number(tr.dataset.id)); }); });
  }

  function allerPoste(id) {
    const f = S.postes.features.filter(function (x) { return x.properties.id === id; })[0];
    if (!f) return;
    if (S.commune && f.properties.commune !== S.commune) { $("#filtre-commune").value = ""; S.commune = ""; buildQuartiers(); buildPostes(); buildLabelsCommunes(); }
    if (!S.on.postes) { $("#chk-postes").checked = true; basculerCouche("postes", true); }
    map.flyTo([f.properties.lat, f.properties.lon], Math.max(map.getZoom(), 15), { duration: 0.6 });
    selectPoste(id);
  }

  function allerQuartier(id) {
    const f = S.quartiers.features.filter(function (x) { return x.properties.id === id; })[0];
    if (!f) return;
    if (S.commune && f.properties.commune !== S.commune) { $("#filtre-commune").value = ""; S.commune = ""; buildQuartiers(); buildPostes(); buildLabelsCommunes(); }
    if (!S.on.quartiers) { $("#chk-quartiers").checked = true; basculerCouche("quartiers", true); }
    map.fitBounds(L.geoJSON(f).getBounds(), { padding: [60, 60], maxZoom: 16 });
    selectQuartier(id);
  }


  /* ------------------------------------------------------------------ itineraire par les rues (OpenStreetMap / OSRM) */
  // serveurs OSRM de la FOSSGIS, ceux du site openstreetmap.org (pieton, voiture, velo) ; adresse reglable dans settings.py
  const ROUTAGE = window.GP_ROUTAGE || "https://routing.openstreetmap.de/routed-{mode}/route/v1/driving/";
  const MODES = { foot: { lib: "À pied", ico: "🚶", osm: "fossgis_osrm_foot" }, car: { lib: "En voiture", ico: "🚗", osm: "fossgis_osrm_car" },
                  bike: { lib: "À vélo", ico: "🚲", osm: "fossgis_osrm_bike" } };
  const ITI = { mode: "foot", depart: null, couche: null, dernier: null };

  /* marges de cadrage : laisse la place au tiroir « Analyse » lorsqu'il recouvre la gauche de la carte */
  function margesCarte() {
    const dr = $("#drawer-analyse"), mp = $("#map").getBoundingClientRect();
    if (dr && !dr.classList.contains("hidden") && window.innerWidth > 900) {
      const r = dr.getBoundingClientRect();
      return { paddingTopLeft: [Math.max(60, r.right - mp.left + 30), 60], paddingBottomRight: [60, 60], maxZoom: 17 };
    }
    return { padding: [60, 60], maxZoom: 17 };
  }
  function urlRoute(a, b, mode) {
    return ROUTAGE.replace("{mode}", mode) + a.lng.toFixed(6) + "," + a.lat.toFixed(6) + ";" + b.lng.toFixed(6) + "," + b.lat.toFixed(6) +
      "?overview=full&geometries=geojson&steps=true&alternatives=false";
  }
  function lienOSM(a, b, mode) {
    return "https://www.openstreetmap.org/directions?engine=" + MODES[mode].osm + "&route=" +
      a.lat.toFixed(5) + "%2C" + a.lng.toFixed(5) + "%3B" + b.lat.toFixed(5) + "%2C" + b.lng.toFixed(5);
  }
  async function demanderRoute(a, b, mode) {
    const ctl = window.AbortController ? new AbortController() : null;
    const t = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
    try {
      const r = await fetch(urlRoute(a, b, mode), ctl ? { signal: ctl.signal } : {});
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      if (d.code !== "Ok" || !d.routes || !d.routes.length) throw new Error(d.message || d.code || "aucun itinéraire");
      return d.routes[0];
    } finally { clearTimeout(t); }
  }

  /* postes tries a vol d'oiseau (pre-selection et repli) */
  function postesParVol(a) {
    return S.postes.features.map(function (f) { return f.properties; }).filter(function (p) { return p.lat != null && p.lon != null; })
      .map(function (p) { const ll = L.latLng(p.lat, p.lon); return { p: p, ll: ll, vol: map.distance(a, ll) }; })
      .sort(function (x, y) { return x.vol - y.vol; });
  }
  /* distance et duree PAR LES RUES depuis a vers tous les postes : un seul appel OSRM « table » ;
     a defaut, itineraires vers les 6 postes les plus proches a vol d'oiseau. Renvoie null si le service est injoignable. */
  async function classerParRoute(a, mode) {
    const ps = postesParVol(a);
    if (!ps.length) return null;
    const ctl = window.AbortController ? new AbortController() : null;
    const t = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
    let res = null;
    try {
      const url = ROUTAGE.replace("{mode}", mode).replace("/route/", "/table/") +
        [a].concat(ps.map(function (x) { return x.ll; })).map(function (ll) { return ll.lng.toFixed(6) + "," + ll.lat.toFixed(6); }).join(";") +
        "?sources=0&annotations=duration,distance";
      const r = await fetch(url, ctl ? { signal: ctl.signal } : {});
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      if (d.code !== "Ok" || !d.distances || !d.durations) throw new Error(d.code);
      res = ps.map(function (x, i) { return Object.assign({}, x, { distance: d.distances[0][i + 1], duree: d.durations[0][i + 1] }); })
        .filter(function (x) { return x.distance != null && x.duree != null; });
    } catch (e) {
      res = (await Promise.all(ps.slice(0, 6).map(function (x) {
        return demanderRoute(a, x.ll, mode).then(function (r) { return Object.assign({}, x, { distance: r.distance, duree: r.duration }); }, function () { return null; });
      }))).filter(Boolean);
    } finally { clearTimeout(t); }
    if (!res || !res.length) return null;
    return res.sort(function (x, y) { return x.distance - y.distance; });
  }

  /* consignes OSRM -> francais */
  const DIR = { "uturn": "Faites demi-tour", "sharp right": "Tournez franchement à droite", "right": "Tournez à droite",
                "slight right": "Serrez à droite", "straight": "Continuez tout droit", "slight left": "Serrez à gauche",
                "left": "Tournez à gauche", "sharp left": "Tournez franchement à gauche" };
  function consigne(st, dernier) {
    const m = st.maneuver || {}, nom = st.name || st.ref || "", sur = nom ? " sur " + nom : "";
    switch (m.type) {
      case "depart": return "Partez" + (nom ? " par " + nom : "");
      case "arrive": return dernier ? "Vous êtes arrivé au poste de santé" : "Arrivée à l'étape";
      case "roundabout": case "rotary": case "roundabout turn": case "exit roundabout": case "exit rotary":
        return "Au rond-point, prenez la " + (m.exit ? m.exit + (m.exit === 1 ? "re" : "e") + " sortie" : "sortie") + (nom ? " vers " + nom : "");
      case "merge": return "Rejoignez " + (nom || "la voie");
      case "new name": case "continue": case "notification":
        return m.modifier && m.modifier !== "straight" ? (DIR[m.modifier] || "Continuez") + sur : "Continuez" + sur;
      default: return (DIR[m.modifier] || "Continuez") + sur;    // turn, end of road, fork, on/off ramp, use lane
    }
  }
  const distTxt = function (m) { return m >= 1000 ? fmt(m / 1000, 1) + " km" : fmt(Math.max(5, Math.round(m / 5) * 5)) + " m"; };
  const dureeTxt = function (sec) { const mn = Math.max(1, Math.round(sec / 60)); return mn >= 60 ? Math.floor(mn / 60) + " h " + String(mn % 60).padStart(2, "0") : mn + " min"; };

  function effacerItineraire() {
    if (ITI.couche) { map.removeLayer(ITI.couche); ITI.couche = null; }
    ITI.dernier = null;
    $("#out-iti").innerHTML = "";
  }

  async function calculerItineraire(depart) {
    ITI.depart = depart || ITI.depart;
    if (!ITI.depart) { $("#out-iti").innerHTML = '<p class="thint">Indiquez d\'abord votre point de départ.</p>'; return; }
    const a = ITI.depart, choix = $("#iti-poste").value, mode = ITI.mode, out = $("#out-iti");
    out.innerHTML = '<p class="thint">Calcul de l\'itinéraire par les rues…</p>';
    // destination : un poste choisi, ou le plus proche PAR LES RUES parmi les 28 postes
    let candidats;
    if (choix) candidats = S.postes.features.filter(function (f) { return String(f.properties.id) === choix; }).map(function (f) { return f.properties; });
    else {
      const cl = await classerParRoute(a, mode);
      candidats = cl ? cl.slice(0, 1).map(function (x) { return x.p; }) : postesParVol(a).slice(0, 1).map(function (x) { return x.p; });
    }
    if (!candidats || !candidats.length) { out.innerHTML = '<p class="thint">Aucun poste trouvé.</p>'; return; }
    const res = await Promise.all(candidats.map(function (p) {
      return demanderRoute(a, L.latLng(p.lat, p.lon), mode).then(function (r) { return { p: p, r: r }; }, function (e) { return { p: p, err: e }; });
    }));
    const ok = res.filter(function (x) { return x.r; }).sort(function (x, y) { return x.r.duration - y.r.duration; });
    if (ITI.couche) map.removeLayer(ITI.couche);
    ITI.couche = L.layerGroup().addTo(map);
    const depMk = L.circleMarker(a, { pane: "outils", radius: 8, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }).bindTooltip("Départ").addTo(ITI.couche);
    if (!ok.length) {                                          // service injoignable : ligne droite + lien OpenStreetMap
      const p = candidats[0], b = L.latLng(p.lat, p.lon);
      L.polyline([a, b], { pane: "outils", color: "#f59e0b", weight: 3, dashArray: "8 7" }).addTo(ITI.couche);
      map.fitBounds(L.latLngBounds([a, b]), margesCarte());
      out.innerHTML = '<p class="iti-err">Le service d\'itinéraire OpenStreetMap ne répond pas (connexion Internet nécessaire). Ligne droite affichée jusqu\'à <b>' +
        esc(p.nom) + "</b> : " + distTxt(map.distance(a, b)) + " à vol d'oiseau.</p>" +
        '<a class="tbtn block iti-osm" target="_blank" rel="noopener" href="' + lienOSM(a, b, mode) + '">Ouvrir l\'itinéraire sur openstreetmap.org ↗</a>';
      return;
    }
    const best = ok[0], p = best.p, r = best.r, b = L.latLng(p.lat, p.lon);
    ITI.dernier = { p: p, r: r, a: a, b: b };
    const ligne = L.geoJSON(r.geometry, { pane: "outils", style: { color: "#0b2237", weight: 9, opacity: 0.85, lineCap: "round" } }).addTo(ITI.couche);
    L.geoJSON(r.geometry, { pane: "outils", style: { color: "#22d3ee", weight: 5, opacity: 1, lineCap: "round" } }).addTo(ITI.couche);
    depMk.bringToFront();
    map.fitBounds(ligne.getBounds(), margesCarte());
    if (S.pLayers[p.id]) { deselectionner(); const el = S.pLayers[p.id].getElement(); if (el) el.classList.add("sel"); S.sel = { kind: "p", layer: S.pLayers[p.id] }; }
    const steps = [];
    (r.legs || []).forEach(function (leg, li) { (leg.steps || []).forEach(function (st, i) { steps.push({ st: st, dernier: li === r.legs.length - 1 && i === leg.steps.length - 1 }); }); });
    out.innerHTML =
      '<div class="iti-sum"><span class="iti-mode">' + MODES[mode].ico + '</span><div><b>' + esc(p.nom) + "</b><br>" +
      '<span class="big">' + distTxt(r.distance) + "</span> · <b>" + dureeTxt(r.duration) + "</b> " + MODES[mode].lib.toLowerCase() + "</div></div>" +
      (!choix ? '<p class="thint">Poste le plus proche par les rues (comparé aux ' + S.postes.features.length + " postes).</p>" : "") +
      '<ol class="iti-steps">' + steps.map(function (x, i) {
        const loc = x.st.maneuver && x.st.maneuver.location;
        return '<li data-i="' + i + '"' + (loc ? ' data-lat="' + loc[1] + '" data-lon="' + loc[0] + '"' : "") + "><span>" + esc(consigne(x.st, x.dernier)) + "</span>" +
          (x.st.distance > 0 ? "<small>" + distTxt(x.st.distance) + "</small>" : "") + "</li>";
      }).join("") + "</ol>" +
      '<div class="trow"><a class="tbtn ghost iti-osm" target="_blank" rel="noopener" href="' + lienOSM(a, b, mode) + '">openstreetmap.org ↗</a>' +
      '<button class="tbtn ghost" type="button" id="iti-fiche">Fiche du poste</button></div>' +
      '<p class="thint">Itinéraire calculé sur le réseau OpenStreetMap (© contributeurs OSM, moteur OSRM). Durée indicative.</p>';
    $$("#out-iti .iti-steps li[data-lat]").forEach(function (li) {
      li.addEventListener("click", function () { map.flyTo([Number(li.dataset.lat), Number(li.dataset.lon)], Math.max(map.getZoom(), 17), { duration: 0.5 }); });
    });
    $("#iti-fiche").addEventListener("click", function () { selectPoste(p.id); });
  }

  function departMaPosition() {
    if (!navigator.geolocation) { toast("Votre appareil ne permet pas la localisation : cliquez sur la carte pour choisir le départ.", "err"); departSurCarte(); return; }
    $("#out-iti").innerHTML = '<p class="thint">Localisation en cours… autorisez-la si le navigateur le demande.</p>';
    navigator.geolocation.getCurrentPosition(function (pos) {
      calculerItineraire(L.latLng(pos.coords.latitude, pos.coords.longitude));
    }, function (err) {
      toast(err.code === 1 ? "Localisation refusée : cliquez sur la carte pour choisir le départ." : "Position introuvable : cliquez sur la carte pour choisir le départ.", "err");
      departSurCarte();
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  }
  function departSurCarte() {
    if (S.tool !== "iti") setTool("iti");
    $("#out-iti").innerHTML = '<p class="thint">👆 Cliquez sur la carte à l\'endroit du départ.</p>';
  }
  /* ouvre l'outil depuis une fiche ou un tableau : destination = poste donne */
  function itineraireVers(posteId, depart) {
    $("#drawer-analyse").classList.remove("hidden");
    $("#iti-poste").value = posteId ? String(posteId) : "";
    $("#tool-iti-card").scrollIntoView({ block: "nearest" });
    if (depart) calculerItineraire(depart); else departMaPosition();
  }

  function initItineraire() {
    S.postes.features.map(function (f) { return f.properties; }).sort(function (a, b) { return (a.numero || 0) - (b.numero || 0); })
      .forEach(function (p) { $("#iti-poste").add(new Option((p.numero != null ? p.numero + " · " : "") + p.nom, p.id)); });
    $$("#proche-modes .seg-m").forEach(function (b) {
      b.addEventListener("click", function () {
        ITI.mode = b.dataset.mode;
        $$("#proche-modes .seg-m, #iti-modes .seg-m").forEach(function (x) { const on = x.dataset.mode === ITI.mode; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on ? "true" : "false"); });
        if (S.dernierProche) plusProche(S.dernierProche);
      });
    });
    $("#proche-gps").addEventListener("click", function () { if (S.tool === "proche") setTool("proche"); proche_maPosition(); });
    $$("#iti-modes .seg-m").forEach(function (b) {
      b.addEventListener("click", function () {
        ITI.mode = b.dataset.mode;
        $$("#iti-modes .seg-m, #proche-modes .seg-m").forEach(function (x) { const on = x.dataset.mode === b.dataset.mode; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on ? "true" : "false"); });
        if (ITI.depart && ITI.couche) calculerItineraire();
      });
    });
    $("#iti-gps").addEventListener("click", departMaPosition);
    $("#iti-carte").addEventListener("click", function () { if (S.tool === "iti") setTool("iti"); else departSurCarte(); });
    $("#iti-clear").addEventListener("click", function () { effacerItineraire(); ITI.depart = null; if (S.tool === "iti") setTool("iti"); });
    $("#iti-poste").addEventListener("change", function () { if (ITI.depart && ITI.couche) calculerItineraire(); });
    $("#mt-iti").addEventListener("click", function () { $("#drawer-analyse").classList.remove("hidden"); $("#tool-iti-card").scrollIntoView({ block: "nearest" }); });
  }

  /* ------------------------------------------------------------------ barre d'outils (zoom, mesure, localisation, impression) */
  let toastTimer = null;
  function toast(msg, type) {
    const el = $("#toast"); el.textContent = msg; el.className = "toast " + (type || "");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.add("hidden"); }, 5000);
  }

  function localiserMoi() {
    if (!navigator.geolocation) { toast("Votre appareil ne permet pas la localisation.", "err"); return; }
    const b = $("#tb-locate"); b.disabled = true; toast("Localisation en cours… autorisez-la si le navigateur le demande.");
    navigator.geolocation.getCurrentPosition(function (pos) {
      b.disabled = false;
      const ll = L.latLng(pos.coords.latitude, pos.coords.longitude);
      if (S.moi) S.outils.removeLayer(S.moi);
      S.moi = L.layerGroup([
        L.circle(ll, { pane: "outils", radius: Math.max(pos.coords.accuracy || 0, 10), color: "#2563eb", weight: 1, fillOpacity: 0.1 }),
        L.circleMarker(ll, { pane: "outils", radius: 8, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }).bindTooltip("Vous êtes ici"),
      ]).addTo(S.outils);
      map.flyTo(ll, 16, { duration: 0.8 });
      toast("Position trouvée (précision ± " + fmt(pos.coords.accuracy) + " m).", "ok");
    }, function (err) {
      b.disabled = false;
      toast(err.code === 1 ? "Localisation refusée : autorisez-la dans votre navigateur." : "Position introuvable. Réessayez.", "err");
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  function initBarreOutils() {
    $("#tb-zoomin").addEventListener("click", function () { map.zoomIn(); });
    $("#tb-zoomout").addEventListener("click", function () { map.zoomOut(); });
    $("#tb-home").addEventListener("click", zoomVille);
    $("#tb-mesure").addEventListener("click", function () { if (S.tool === "proche") setTool("proche"); setTool("mesure"); });
    $("#tb-locate").addEventListener("click", localiserMoi);
    $("#tb-print").addEventListener("click", function () { window.print(); });
    $("#tb-full").addEventListener("click", function () {
      const app = $("#app");
      if (document.fullscreenElement) document.exitFullscreen();
      else if (app.requestFullscreen) app.requestFullscreen();
    });
  }

  /* ------------------------------------------------------------------ etiquettes des communes */
  function buildLabelsCommunes() {
    if (S.labelsCommunes) S.labelsCommunes.clearLayers(); else S.labelsCommunes = L.layerGroup();
    const g = {};
    S.quartiers.features.forEach(function (f) {
      const p = f.properties; if (!p.commune || (S.commune && p.commune !== S.commune)) return;
      const c = L.geoJSON(f).getBounds().getCenter(), w = p.population || 1;
      const o = g[p.commune] || (g[p.commune] = { x: 0, y: 0, w: 0 });
      o.x += c.lng * w; o.y += c.lat * w; o.w += w;
    });
    Object.keys(g).forEach(function (nom) {
      const o = g[nom];
      L.marker([o.y / o.w, o.x / o.w], { interactive: false, keyboard: false,
        icon: L.divIcon({ className: "", html: '<span class="map-label">' + esc(nom) + "</span>", iconSize: [0, 0] }) }).addTo(S.labelsCommunes);
    });
    majLabels();
  }
  function majLabels() {
    if (!S.labelsCommunes) return;
    if (map.getZoom() <= 14) S.labelsCommunes.addTo(map); else map.removeLayer(S.labelsCommunes);
  }
  map.on("zoomend", majLabels);

  /* ------------------------------------------------------------------ filtres : commune / poste (destination) / quartier (origine) */
  async function chargerFlux() {
    if (!S.fluxData) S.fluxData = await GP.getJSON("api/flux/");
    return S.fluxData;
  }
  function trouver(fc, id) { return fc.features.filter(function (f) { return String(f.properties.id) === String(id); })[0]; }

  async function appliquerFiltres() {
    S.commune = $("#filtre-commune").value;
    buildQuartiers(); buildPostes(); buildLabelsCommunes();
    S.filtreFlux.clearLayers();
    const pid = $("#flt-poste").value, qid = $("#flt-quartier").value, res = $("#flt-result");
    if (!pid && !qid) {
      res.textContent = S.commune ? "Commune affichée : " + S.commune + "." : "";
      const b = S.layers.quartiers.getBounds(); if (b.isValid()) map.fitBounds(b, { padding: [20, 20] });
      return;
    }
    res.textContent = "Calcul en cours…";
    let fc; try { fc = await chargerFlux(); } catch (e) { res.textContent = "Impossible de charger les flux de patients."; return; }
    const poste = pid ? trouver(S.postes, pid).properties : null, quartier = qid ? trouver(S.quartiers, qid).properties : null;
    const sel = fc.features.filter(function (f) { return (!poste || f.properties.poste_id === poste.id) && (!quartier || f.properties.quartier_id === quartier.id); });
    if (!sel.length) {
      res.innerHTML = poste && quartier ? "Aucun flux significatif (≥ 5 % des patients du poste) entre <b>" + esc(quartier.nom) + "</b> et <b>" + esc(poste.nom) + "</b>."
        : poste ? "Aucun quartier n'envoie ≥ 5 % de ses patients vers <b>" + esc(poste.nom) + "</b>." : "Aucun poste n'est fréquenté à ≥ 5 % depuis <b>" + esc(quartier.nom) + "</b>.";
      if (poste && !quartier) selectPoste(poste.id); else if (quartier && !poste) selectQuartier(quartier.id);
      return;
    }
    const total = sel.reduce(function (s, f) { return s + (f.properties.nb_patients || 0); }, 0);
    const couche = L.geoJSON({ type: "FeatureCollection", features: sel }, {
      style: function (f) { return { pane: "flux", color: "#22d3ee", weight: Math.max(2, f.properties.nb_patients / 2.5), opacity: 0.85 }; },
      onEachFeature: function (f, l) { l.bindTooltip("<b>" + esc(f.properties.quartier) + "</b> → " + esc(f.properties.poste) + "<br>" + f.properties.nb_patients + " patients (" + fmt(f.properties.pct_flux_poste, 1) + " %)", { sticky: true }); },
    }).addTo(S.filtreFlux);
    map.fitBounds(couche.getBounds(), { padding: [50, 50], maxZoom: 15 });
    if (poste && !quartier) {
      res.innerHTML = "<b>" + sel.length + "</b> quartier(s) envoient ≥ 5 % de leurs patients vers <b>" + esc(poste.nom) + "</b> (" + total + " patients enquêtés).";
      selectPoste(poste.id);
    } else if (quartier && !poste) {
      res.innerHTML = "Les habitants de <b>" + esc(quartier.nom) + "</b> fréquentent <b>" + sel.length + "</b> poste(s) : " + sel.map(function (f) { return esc(f.properties.poste); }).join(", ") + ".";
      selectQuartier(quartier.id);
    } else res.innerHTML = "<b>" + total + "</b> patient(s) de <b>" + esc(quartier.nom) + "</b> fréquentent <b>" + esc(poste.nom) + "</b> (" + fmt(sel[0].properties.pct_flux_poste, 1) + " % du flux du poste).";
  }

  function reinitialiserFiltres() {
    $("#filtre-commune").value = ""; $("#flt-poste").value = ""; $("#flt-quartier").value = "";
    S.commune = ""; S.filtreFlux.clearLayers(); $("#flt-result").textContent = "";
    buildQuartiers(); buildPostes(); buildLabelsCommunes(); fermerDetail(); zoomVille();
  }

  /* ------------------------------------------------------------------ cartes d'indicateurs (colonne droite, bas de la carte) */
  const set = function (sel, v) { const e = $(sel); if (e) e.textContent = v; };
  const COULEURS_COMMUNES = ["#3b82f6", "#10b981", "#f97316", "#a78bfa", "#94a3b8"];

  async function chargerStats() {
    let s;
    try { s = await GP.getJSON("api/stats/"); } catch (e) { console.error(e); return; }
    const k = s.kpi, n = k.nb_postes || 1;
    ["t-postes", "kb-postes", "is-postes", "dc-postes"].forEach(function (id) { set("#" + id, fmt(k.nb_postes)); });
    ["t-communes", "kb-communes", "is-communes"].forEach(function (id) { set("#" + id, fmt(k.nb_communes)); });
    ["t-quartiers", "kb-quartiers"].forEach(function (id) { set("#" + id, fmt(k.nb_quartiers)); });
    ["t-pop", "kb-pop", "is-pop"].forEach(function (id) { set("#" + id, fmt(k.population)); });
    set("#kb-postes-sub", "+ " + fmt(k.lits_total) + " lits au total");
    set("#kb-communes-sub", k.nb_postes_geolocalises + " / " + k.nb_postes + " postes géolocalisés");
    set("#kb-quartiers-sub", k.couverture_1km != null ? fmt(k.couverture_1km, 1) + " % de la population à < 1 km d'un poste" : "");

    // repartition des postes par commune
    const pc = s.par_commune.slice().sort(function (a, b) { return b.nb_postes - a.nb_postes; });
    GP.graphique($("#c-communes"), { type: "doughnut",
      data: { labels: pc.map(function (c) { return c.commune; }), datasets: [{ data: pc.map(function (c) { return c.nb_postes; }), backgroundColor: COULEURS_COMMUNES, borderWidth: 2, borderColor: GP.couleur("bord") }] },
      options: { cutout: "70%", responsive: false, plugins: { legend: { display: false } } } });
    $("#list-communes").innerHTML = pc.map(function (c, i) {
      return '<li><span class="dot" style="background:' + COULEURS_COMMUNES[i % 5] + '"></span><span class="nm">' + esc(c.commune) + '</span><span class="vl">' + c.nb_postes + " <small>(" + fmt(100 * c.nb_postes / n, 1) + " %)</small></span></li>";
    }).join("");

    // personnel moyen par poste
    const moy = [["Médecins", k.medecins / n, "#14b8a6"], ["Infirmiers", k.infirmiers / n, "#3b82f6"], ["Sages-femmes", k.sages_femmes / n, "#8b5cf6"], ["Techn. sup.", k.techniciens_sup / n, "#ec4899"]];
    const max = Math.max.apply(null, moy.map(function (m) { return m[1]; })) || 1;
    $("#bars-personnel").innerHTML = moy.map(function (m) {
      return '<div class="vbar"><span class="val">' + fmt(m[1], 1) + '</span><div class="col" style="--c:' + m[2] + ";height:" + Math.max(5, Math.round(100 * m[1] / max)) + 'px"></div><span class="nm">' + m[0] + "</span></div>";
    }).join("");

    // services disponibles
    const total = S.postes.features.length, riches = S.postes.features.filter(function (f) { return f.properties.nb_services >= 4; }).length;
    const part = total ? Math.round(100 * riches / total) : 0;
    GP.graphique($("#c-services"), { type: "doughnut",
      data: { datasets: [{ data: [part, 100 - part], backgroundColor: ["#14b8a6", "rgba(255,255,255,.1)"], borderWidth: 0 }] },
      options: { cutout: "74%", responsive: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } } });
    set("#ds-pct", part + " %");
    $("#list-services").innerHTML = s.services.slice(0, 6).map(function (x) {
      const p = Math.round(100 * x.n / n);
      return '<li><span class="nm" title="' + esc(x.label) + '">' + esc(x.label) + '</span><span class="track"><span class="fill' + (p < 35 ? " low" : "") + '" style="width:' + p + '%"></span></span><span class="pc">' + p + " %</span></li>";
    }).join("");

    // equipements
    const ICO = { echographes: ["🩺", "#38bdf8"], respirateurs: ["🫁", "#a78bfa"], sterilisation: ["♨️", "#34d399"], autres: ["⚙️", "#fbbf24"] };
    $("#equip-tiles").innerHTML = s.equip_pct.filter(function (e) { return ICO[e.cle]; }).map(function (e) {
      return '<div class="eq" style="--c:' + ICO[e.cle][1] + '" title="' + e.n + " poste(s) sur " + n + '"><div class="ei">' + ICO[e.cle][0] + '</div><div class="nm">' + esc(e.label) + "</div><b>" + e.pct + " %</b></div>";
    }).join("");
  }

  /* ------------------------------------------------------------------ interface : tiroir, menus, fenetre, filtres */
  function initInterface() {
    S.filtreFlux = L.layerGroup().addTo(map);
    const basculer = function (el) { return el.classList.toggle("hidden") === false; };
    $("#mt-analyse").addEventListener("click", function () { basculer($("#drawer-analyse")); });
    $("#drawer-close").addEventListener("click", function () { $("#drawer-analyse").classList.add("hidden"); });
    $("#mt-legende").addEventListener("click", function () { basculer($("#map-legend")); });
    $("#legend-close").addEventListener("click", function () { $("#map-legend").classList.add("hidden"); });
    $("#mt-download").addEventListener("click", function (e) { e.stopPropagation(); $("#mt-download").setAttribute("aria-expanded", basculer($("#pop-download")) ? "true" : "false"); });
    document.addEventListener("click", function () { $("#pop-download").classList.add("hidden"); });
    // les donnees et exports ont leur propre page (/donnees/)
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") $("#drawer-analyse").classList.add("hidden"); });
    if (window.innerWidth < 900) $("#map-legend").classList.add("hidden");   // telephone : legende masquee au depart
    const ap = $("#tb-aperu"); if (ap) ap.addEventListener("click", function () { document.body.classList.toggle("right-open"); });

    S.postes.features.map(function (f) { return f.properties; }).sort(function (a, b) { return a.nom.localeCompare(b.nom); })
      .forEach(function (p) { $("#flt-poste").add(new Option(p.nom, p.id)); });
    S.quartiers.features.map(function (f) { return f.properties; }).sort(function (a, b) { return a.nom.localeCompare(b.nom); })
      .forEach(function (q) { $("#flt-quartier").add(new Option(q.nom, q.id)); });
    $("#btn-appliquer").addEventListener("click", appliquerFiltres);
    $("#btn-reset").addEventListener("click", reinitialiserFiltres);
    if (window.ResizeObserver) new ResizeObserver(function () { map.invalidateSize(); }).observe($("#map"));
  }

  /* ------------------------------------------------------------------ recherche */
  (function initRecherche() {
    const inp = $("#search"), ul = $("#search-results");
    let t = null;
    inp.addEventListener("input", function () {
      clearTimeout(t);
      const q = inp.value.trim();
      if (q.length < 2) { ul.classList.add("hidden"); return; }
      t = setTimeout(async function () {
        let d; try { d = await GP.getJSON("api/recherche/?q=" + encodeURIComponent(q)); } catch (e) { return; }
        ul.innerHTML = d.resultats.length ? d.resultats.map(function (r) {
          return '<li data-type="' + r.type + '" data-id="' + r.id + '" data-lat="' + r.lat + '" data-lon="' + r.lon + '"><span>' + esc(r.nom) + '</span><span class="tag">' + (r.type === "poste" ? "poste" : "quartier") + "</span></li>";
        }).join("") : "<li>Aucun résultat</li>";
        ul.classList.remove("hidden");
      }, 220);
    });
    ul.addEventListener("click", function (e) {
      const li = e.target.closest("li[data-id]"); if (!li) return;
      ul.classList.add("hidden"); inp.value = li.firstChild.textContent;
      const id = Number(li.dataset.id);
      if (li.dataset.type === "poste") {
        if (!S.on.postes) { $("#chk-postes").checked = true; basculerCouche("postes", true); }
        map.flyTo([Number(li.dataset.lat), Number(li.dataset.lon)], 16, { duration: 0.8 });
        selectPoste(id);
      } else allerQuartier(id);
    });
    document.addEventListener("click", function (e) { if (!e.target.closest(".search")) ul.classList.add("hidden"); });
  })();

  /* ------------------------------------------------------------------ initialisation de l'interface */
  function remplir(sel, obj, def) { Object.keys(obj).forEach(function (k) { sel.add(new Option(typeof obj[k] === "string" ? obj[k] : obj[k].label, k)); }); sel.value = def; }

  function initUI() {
    $("#postes-labels").checked = true;          // postes de sante etiquetes par defaut
    initInterface();
    initBarreOutils();
    initListeCouches();
    remplir($("#ind-quartier"), IND_Q, indQ);
    remplir($("#postes-taille"), TAILLES, tailleP);
    remplir($("#postes-couleur"), COULEURS_P, couleurP);
    S.meta.communes.forEach(function (c) { $("#filtre-commune").add(new Option(c.nom, c.nom)); });
    S.postes.features.map(function (f) { return f.properties; }).sort(function (a, b) { return a.nom.localeCompare(b.nom); })
      .forEach(function (p) { $("#tampon-poste").add(new Option(p.nom, p.id)); });

    $("#ind-quartier").addEventListener("change", function (e) { indQ = e.target.value; recalcClassesQ(); S.layers.quartiers.setStyle(styleQ); renderLegend(); });
    $("#postes-taille").addEventListener("change", function (e) { tailleP = e.target.value; recalcClassesP(); buildPostes(); renderLegend(); });
    $("#postes-couleur").addEventListener("change", function (e) { couleurP = e.target.value; buildPostes(); restylerAires(); renderLegend(); });
    $("#postes-labels").addEventListener("change", function () { buildPostes(); renderLegend(); });
    $("#filtre-commune").addEventListener("change", function (e) {
      S.commune = e.target.value; buildQuartiers(); buildPostes(); buildLabelsCommunes();
      const b = S.layers.quartiers.getBounds(); if (b.isValid()) map.fitBounds(b, { padding: [20, 20] });
    });

    $("#btn-panel").addEventListener("click", function () { document.body.classList.toggle("panel-open"); });
    /* agrandir la carte : panneaux lateraux masquables, choix memorise */
    const B = document.body;
    function majTog() {
      const l = B.classList.contains("hide-left"), r = B.classList.contains("hide-right"), m = l && r;
      B.classList.toggle("map-maxi", m && B.classList.contains("map-maxi"));
      const tl = $("#tog-left"), tr = $("#tog-right"), tm = $("#tog-max");
      tl.textContent = l ? "›" : "‹"; tl.title = l ? "Afficher le panneau de gauche" : "Masquer le panneau de gauche"; tl.setAttribute("aria-label", tl.title); tl.setAttribute("aria-pressed", l ? "true" : "false");
      tr.textContent = r ? "‹" : "›"; tr.title = r ? "Afficher le panneau de droite" : "Masquer le panneau de droite"; tr.setAttribute("aria-label", tr.title); tr.setAttribute("aria-pressed", r ? "true" : "false");
      const maxi = B.classList.contains("map-maxi");
      $(".ico", tm).textContent = maxi ? "⤡" : "⤢"; $(".txt", tm).textContent = maxi ? "Réduire la carte" : "Agrandir la carte"; tm.setAttribute("aria-pressed", maxi ? "true" : "false");
      try { localStorage.setItem("gp-carte-vue", JSON.stringify({ l: l, r: r, m: maxi })); } catch (e) {}
      setTimeout(function () { map.invalidateSize(); requestAnimationFrame(majEtiquettes); }, 60);
    }
    $("#tog-left").addEventListener("click", function () { B.classList.toggle("hide-left"); B.classList.remove("map-maxi"); majTog(); });
    $("#tog-right").addEventListener("click", function () { B.classList.toggle("hide-right"); B.classList.remove("map-maxi"); majTog(); });
    $("#tog-max").addEventListener("click", function () {
      const on = !B.classList.contains("map-maxi");
      B.classList.toggle("map-maxi", on); B.classList.toggle("hide-left", on); B.classList.toggle("hide-right", on); majTog();
    });
    try { const v = JSON.parse(localStorage.getItem("gp-carte-vue") || "{}");
      B.classList.toggle("hide-left", !!v.l); B.classList.toggle("hide-right", !!v.r); B.classList.toggle("map-maxi", !!v.m); } catch (e) {}
    window.gpMajTog = majTog;
    majTog();
    $("#detail-close").addEventListener("click", fermerDetail);

    $("#tool-proche").addEventListener("click", function () { if (S.tool === "mesure") effacerMesure(); setTool("proche"); });
    initItineraire();
    $("#tool-mesure").addEventListener("click", function () { setTool("mesure"); });
    $("#mesure-clear").addEventListener("click", function () { effacerMesure(); });
    $("#tampon-dist").addEventListener("input", function (e) { $("#tampon-val").textContent = e.target.value + " m"; });
    $("#tampon-go").addEventListener("click", calculerTampon);
    $("#tampon-clear").addEventListener("click", effacerTampon);
    $("#btn-couverture").addEventListener("click", courbeCouverture);
    $("#seuil-dist").addEventListener("input", majEloignes);

    map.on("click", function (e) {
      if (S.tool === "proche") plusProche(e.latlng);
      else if (S.tool === "mesure") ajouterMesure(e.latlng);
      else if (S.tool === "iti") { setTool("iti"); calculerItineraire(e.latlng); }
    });
    map.on("dblclick", function () {
      if (S.tool === "mesure" && S.mesure && S.mesure.pts.length > 1) {
        // le double-clic a deja ajoute deux fois le dernier point : on retire le doublon puis on termine
        S.mesure.pts.pop(); S.outils.removeLayer(S.mesure.pts_layers.pop()); S.mesure.ligne.setLatLngs(S.mesure.pts); afficherMesure();
        const m = S.mesure; m.fini = true; S.mesure = null; setTool("mesure"); S.mesure = m;
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && S.tool) setTool(S.tool);
    });
  }

  /* ------------------------------------------------------------------ preselection par l'adresse (liens de la cartotheque)
     ?couches=aire_administrative,thiessen&couleur=taux&taille=population&indicateur=densite&quartiers=0&fond=osm&outil=tampon|itineraire&poste=5 */
  async function appliquerParametres() {
    const q = new URLSearchParams(window.location.search);
    const choisir = function (sel, v) { const el = $(sel); if (v && Array.from(el.options).some(function (o) { return o.value === v; })) { el.value = v; el.dispatchEvent(new Event("change")); return true; } return false; };
    if (q.get("fond") === "osm" && FONDS.OpenStreetMap) { if (S.fond) map.removeLayer(S.fond); S.fond = FONDS.OpenStreetMap; S.fond.addTo(map); $$(".seg-b").forEach(function (b) { b.classList.remove("on"); }); }
    choisir("#ind-quartier", q.get("indicateur"));
    choisir("#postes-couleur", q.get("couleur"));
    choisir("#postes-taille", q.get("taille"));
    if (q.get("quartiers") === "0") { $("#chk-quartiers").checked = false; basculerCouche("quartiers", false); }
    const couches = (q.get("couches") || "").split(",").filter(function (c) { return DEFS.some(function (d) { return d.id === c && d.url; }); });
    for (const c of couches) { const cb = $("#chk-" + c); if (cb) { cb.checked = true; await basculerCouche(c, true); } }
    if (q.get("outil") === "tampon") { ouvrirAnalyse(); calculerTampon(); }
    if (q.get("outil") === "itineraire") itineraireVers(q.get("poste") || "");
    else if (q.get("poste") && S.pLayers[q.get("poste")]) allerPoste(Number(q.get("poste")));
  }

  /* ------------------------------------------------------------------ demarrage */
  (async function demarrer() {
    try {
      const r = await Promise.all([GP.getJSON("api/meta/"), GP.getJSON("api/postes/"), GP.getJSON("api/quartiers/")]);
      S.meta = r[0]; S.postes = r[1]; S.quartiers = r[2];
      initUI();
      recalcClassesQ(); recalcClassesP();
      buildQuartiers(); buildPostes(); buildLabelsCommunes();
      zoomVille(); renderLegend(); majEloignes(); chargerStats();
      $("#loader").classList.add("hidden");
      appliquerParametres().catch(function (e) { console.error(e); });
    } catch (e) {
      console.error(e);
      $("#loader").textContent = "Erreur de chargement des données : vérifiez la connexion à la base PostgreSQL.";
    }
  })();

  window.GPmap = { map: map, S: S, ITI: ITI };   // utile pour la console / les tests
})();
