/* Page Statistiques : tableaux du memoire recalcules depuis /api/statistiques/ (tri, filtre, export CSV) */
(function () {
  "use strict";
  const esc = GP.esc, fmt = GP.fmt;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const MAILLE = { "Fortement sous-dotée": ["ko", "#ef4444"], "Sous-dotée": ["warn", "#f59e0b"], "Conforme ou sur-dotée": ["ok", "#22c55e"] };
  const KC = { K1: "#f97316", K2: "#ec4899", K3: "#38bdf8", K4: "#facc15" };
  const dec = function (d) { return function (v) { return v === null || v === undefined ? "–" : Number(v).toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }); }; };
  const TABLES = {};   // id -> {colonnes, lignes} pour l'export CSV

  /* tableau triable ; colonnes : {k, t, num, f(v, r) -> html, csv(v, r) -> texte} */
  function tableau(id, colonnes, lignes, opt) {
    opt = opt || {};
    const el = $("#" + id); TABLES[id] = { colonnes: colonnes, lignes: lignes };
    let tri = opt.tri || null, sens = opt.sens || 1, filtre = "";
    function rendre() {
      let l = lignes.slice();
      if (filtre) { const f = filtre.toLowerCase(); l = l.filter(function (r) { return colonnes.some(function (c) { return String(r[c.k] === null || r[c.k] === undefined ? "" : r[c.k]).toLowerCase().indexOf(f) >= 0; }); }); }
      if (tri && opt.triable !== false) l.sort(function (a, b) {
        if (a._total) return 1; if (b._total) return -1;
        const x = a[tri], y = b[tri];
        if (x === null || x === undefined) return 1; if (y === null || y === undefined) return -1;
        return (typeof x === "string" && isNaN(Number(x)) ? x.localeCompare(y) : Number(x) - Number(y)) * sens;
      });
      el.innerHTML = "<thead><tr>" + colonnes.map(function (c) {
        return '<th data-k="' + c.k + '" class="' + (c.num ? "num" : "") + '">' + esc(c.t) + (tri === c.k ? (sens > 0 ? " ▲" : " ▼") : "") + "</th>";
      }).join("") + "</tr></thead><tbody>" + l.map(function (r) {
        return '<tr class="' + (r._total ? "total" : "") + '">' + colonnes.map(function (c) {
          const v = r[c.k];
          return '<td class="' + (c.num ? "num" : "") + '">' + (c.f ? c.f(v, r) : (c.num ? fmt(v, c.d || 0) : esc(v === null || v === undefined ? "–" : v))) + "</td>";
        }).join("") + "</tr>";
      }).join("") + "</tbody>";
      if (opt.triable !== false) $$("th", el).forEach(function (th) {
        th.addEventListener("click", function () {
          const k = th.dataset.k;
          if (tri === k) sens = -sens; else { tri = k; const v = lignes.map(function (r) { return r[k]; }).filter(function (x) { return x !== null && x !== undefined; })[0]; sens = typeof v === "string" && isNaN(Number(v)) ? 1 : -1; }
          rendre();
        });
      });
    }
    rendre();
    return function (f) { filtre = f; rendre(); };
  }

  function exporterCSV(id) {
    const t = TABLES[id]; if (!t) return;
    const cell = function (v) { v = v === null || v === undefined ? "" : String(v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const txt = [t.colonnes.map(function (c) { return cell(c.t); }).join(";")].concat(t.lignes.map(function (r) {
      return t.colonnes.map(function (c) { const v = c.csv ? c.csv(r[c.k], r) : r[c.k]; return cell(typeof v === "number" ? String(v).replace(".", ",") : v); }).join(";");
    })).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + txt], { type: "text/csv;charset=utf-8" }));
    a.download = "thies_" + id.replace(/^t-/, "") + ".csv";
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  $$(".csv").forEach(function (b) { b.addEventListener("click", function () { exporterCSV(b.dataset.t); }); });

  const kpi = function (v, l, cls) { return '<div class="kpi ' + (cls || "") + '"><b>' + v + "</b><span>" + esc(l) + "</span></div>"; };
  const badge = function (t) { const m = MAILLE[t]; return t ? '<span class="badge ' + (m ? m[0] : "") + '">' + esc(t) + "</span>" : "–"; };

  (async function () {
    let d;
    try { d = await GP.getJSON("api/statistiques/"); }
    catch (e) { $("#stx-kpis").innerHTML = '<div class="loading">Erreur de chargement : vérifiez la connexion à la base PostgreSQL.</div>'; return; }
    const ville = d.couverture[d.couverture.length - 1];
    const adm = d.concordance.filter(function (c) { return /Administrative × R/.test(c.croisement); })[0] || {};
    const g1 = d.grille.filter(function (g) { return g.distance_max_m === 1000; })[0] || {};

    const g5 = d.grille.filter(function (g) { return g.distance_max_m === 5000; })[0] || {};
    $("#stx-kpis").innerHTML =
      kpi(fmt(ville.population), "habitants (RGPH-5, 2023)") + kpi(fmt(ville.hab_par_poste), "hab. par poste (norme : 7 714)", "bad") +
      kpi(fmt(ville.sous_dotes) + " / " + fmt(ville.postes), "postes sous-dotés (taux > 1)", "bad") +
      kpi(fmt(g1.pct_cumule, 1) + " %", "de la superficie à ≤ 1 km d'un poste", "warn") + kpi(fmt(g5.pct_cumule, 1) + " %", "de la superficie à ≤ 5 km d'un poste") +
      kpi(fmt(adm.pct_concordance, 1) + " %", "concordance aire administrative × réelle") +
      kpi(dec(2)(d.indices.discordance_ta.moyenne), "discordance moyenne théorique / administrative", "warn") +
      kpi(dec(2)(d.indices.indice_forme.moyenne), "indice de forme moyen (cercle = 0,785)");

    /* 2. couverture */
    d.couverture[d.couverture.length - 1]._total = true;
    tableau("t-couv", [{ k: "commune", t: "Commune" }, { k: "postes", t: "Postes", num: true }, { k: "superficie_km2", t: "Superficie des polygones (km²)", num: true, d: 1 },
      { k: "population", t: "Population 2023", num: true }, { k: "hab_par_poste", t: "Hab. / poste", num: true }, { k: "ratio_norme", t: "× norme", num: true, d: 1 },
      { k: "densite", t: "Hab. / km²", num: true },
      { k: "sous_dotes", t: "Postes sous-dotés", num: true, f: function (v, r) { return fmt(v) + " sur " + fmt(r.postes); } }], d.couverture, { triable: false });
    const pt = d.postes.slice().sort(function (a, b) { return b.taux_couverture - a.taux_couverture; });
    GP.graphique($("#c-taux"), { type: "bar",
      data: { labels: pt.map(function (p) { return p.nom; }), datasets: [
        { label: "Taux de couverture", data: pt.map(function (p) { return p.taux_couverture; }), backgroundColor: pt.map(function (p) { return (MAILLE[p.type_maille] || [0, "#64748b"])[1]; }), borderRadius: 3 },
        { type: "line", label: "Norme (1)", data: pt.map(function () { return 1; }), borderColor: GP.couleur("norme"), borderDash: [6, 4], pointRadius: 0, borderWidth: 2 },
        { type: "line", label: "2 × la norme", data: pt.map(function () { return 2; }), borderColor: "rgba(239,68,68,.7)", borderDash: [3, 4], pointRadius: 0, borderWidth: 1.5 }] },
      options: { scales: { x: { ticks: { maxRotation: 70, minRotation: 45, autoSkip: false } }, y: { beginAtZero: true, title: { display: true, text: "population de l'aire / 7 714" } } } } });
    $("#l-mailles").innerHTML = d.mailles.map(function (m) {
      return '<div class="maille"><div class="mh"><span class="badge ' + (MAILLE[m.type] || [""])[0] + '">' + esc(m.type) + "</span><b>" + m.n + " postes</b><small>taux " + esc(m.taux) + "</small></div>" +
        "<p>" + m.postes.map(esc).join(", ") + "</p></div>";
    }).join("");

    /* 3. accessibilite */
    tableau("t-grille", [{ k: "classe_de_distance", t: "Distance au poste" }, { k: "pct_du_territoire", t: "% de la superficie", num: true, d: 1 },
      { k: "pct_cumule", t: "% cumulé", num: true, d: 1 }], d.grille, { triable: false });
    GP.graphique($("#c-grille"), { type: "line",
      data: { labels: d.grille.map(function (g) { return g.distance_max_m ? "≤ " + fmt(g.distance_max_m / 1000, 1) + " km" : "> 5 km"; }),
              datasets: [{ label: "% cumulé de la superficie", data: d.grille.map(function (g) { return g.pct_cumule; }), borderColor: "#14b8a6", backgroundColor: "rgba(20,184,166,.18)", fill: true, tension: 0.3 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, title: { display: true, text: "%" } } } } });
    GP.getJSON("api/couverture/").then(function (c) {
      GP.graphique($("#c-popdist"), { type: "line",
        data: { labels: c.serie.map(function (x) { return x.distance_m >= 1000 ? fmt(x.distance_m / 1000, 1) + " km" : x.distance_m + " m"; }),
                datasets: [{ label: "% de la population", data: c.serie.map(function (x) { return x.pct; }), borderColor: "#38bdf8", backgroundColor: "rgba(56,189,248,.15)", fill: true, tension: 0.3 }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, title: { display: true, text: "% de la population" } } } } });
    }).catch(function (err) { console.error(err); });

    /* 4. aires */
    tableau("t-conc", [{ k: "croisement", t: "Croisement" }, { k: "concordance_km2", t: "Concord. (km²)", num: true, d: 2 }, { k: "discordance_km2", t: "Discord. (km²)", num: true, d: 2 },
      { k: "sans_donnee_km2", t: "Sans donnée (km²)", num: true, d: 2 }, { k: "pct_concordance", t: "% concordant", num: true, d: 1 }, { k: "pct_discordance", t: "% discordant", num: true, d: 1 }], d.concordance, { triable: false });
    GP.graphique($("#c-conc"), { type: "bar",
      data: { labels: d.concordance.map(function (c) { return c.croisement; }), datasets: [
        { label: "Concordance", data: d.concordance.map(function (c) { return c.concordance_km2; }), backgroundColor: "#14b8a6" },
        { label: "Discordance", data: d.concordance.map(function (c) { return c.discordance_km2; }), backgroundColor: "#f59e0b" },
        { label: "Sans donnée", data: d.concordance.map(function (c) { return c.sans_donnee_km2; }), backgroundColor: "rgba(148,163,184,.45)" }] },
      options: { indexAxis: "y", scales: { x: { stacked: true, title: { display: true, text: "km²" } }, y: { stacked: true } } } });
    const LIB = { indice_forme: "Indice de forme (aire théorique)", indice_decentrement: "Indice de décentrement (aire théorique)",
                  discordance_ta: "Discordance théorique / administrative", discordance_ar: "Discordance administrative / réelle", discordance_tr: "Discordance théorique / réelle" };
    tableau("t-indices", [{ k: "lib", t: "Indice" }, { k: "moyenne", t: "Moyenne", num: true, f: dec(2) }, { k: "mediane", t: "Médiane", num: true, f: dec(2) }, { k: "n", t: "Postes", num: true }],
      Object.keys(LIB).map(function (k) { return Object.assign({ lib: LIB[k] }, d.indices[k]); }), { triable: false });
    const pd = d.postes.filter(function (p) { return p.discordance_ar !== null; }).sort(function (a, b) { return b.discordance_ar - a.discordance_ar; });
    GP.graphique($("#c-disc"), { type: "bar",
      data: { labels: pd.map(function (p) { return p.nom; }), datasets: [{ label: "Discordance A–R", data: pd.map(function (p) { return p.discordance_ar; }),
        backgroundColor: pd.map(function (p) { return p.discordance_ar >= 0.5 ? "#ef4444" : (p.discordance_ar > 0 ? "#f59e0b" : "#22c55e"); }), borderRadius: 3 }] },
      options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { maxRotation: 70, minRotation: 45, autoSkip: false } }, y: { min: 0, max: 1 } } } });

    /* 5. typologie */
    tableau("t-classes", [{ k: "code", t: "Classe" }, { k: "methode", t: "Méthode" }, { k: "n", t: "Postes", num: true }, { k: "profil", t: "Profil" },
      { k: "postes", t: "Composition", f: function (v) { return '<span class="compo">' + esc(v || "–") + "</span>"; } }], d.classes, { triable: false });
    const CH = ["CH1", "CH2", "CH3", "CH4"], K = ["K1", "K2", "K3", "K4"];
    $("#t-croise").innerHTML = "<thead><tr><th>K-means \\ CH</th>" + CH.map(function (c) { return '<th class="num">' + c + "</th>"; }).join("") + '<th class="num">Total</th></tr></thead><tbody>' +
      K.map(function (k) { const l = d.croisement[k] || {}; const s = CH.reduce(function (a, c) { return a + (l[c] || 0); }, 0);
        return "<tr><td><b>" + k + "</b></td>" + CH.map(function (c) { return '<td class="num' + (l[c] ? " fort" : "") + '">' + (l[c] || 0) + "</td>"; }).join("") + '<td class="num">' + s + "</td></tr>"; }).join("") +
      '<tr class="total"><td>Total</td>' + CH.map(function (c) { return '<td class="num">' + K.reduce(function (a, k) { return a + ((d.croisement[k] || {})[c] || 0); }, 0) + "</td>"; }).join("") + '<td class="num">' + d.postes.length + "</td></tr></tbody>";
    const kc = d.classes.filter(function (c) { return c.methode === "K-means"; });
    GP.graphique($("#c-classes"), { type: "doughnut",
      data: { labels: kc.map(function (c) { return c.code + " · " + c.profil.split(":")[0].split("(")[0].trim(); }), datasets: [{ data: kc.map(function (c) { return c.n; }), backgroundColor: kc.map(function (c) { return KC[c.code]; }), borderWidth: 2, borderColor: GP.couleur("bord") }] },
      options: { plugins: { legend: { position: "bottom" } }, cutout: "55%" } });

    /* compléments du mémoire */
    const tuile = function (v, l) { return '<div class="st"><b>' + v + "</b><span>" + esc(l) + "</span></div>"; };
    // comparaison aux normes : habitants par poste
    const ch = d.comparaisons.hab_par_poste;
    GP.graphique($("#c-comp-hab"), { type: "bar",
      data: { labels: ch.map(function (x) { return x[0]; }), datasets: [{ label: "Habitants par poste", data: ch.map(function (x) { return x[1]; }),
        backgroundColor: ["#ef4444", "#f59e0b", "#94a3b8", "#22c55e"], borderRadius: 4 }] },
      options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } } });
    d.besoins[d.besoins.length - 1]._total = true;
    tableau("t-besoins", [{ k: "commune", t: "Commune" }, { k: "postes", t: "Postes actuels", num: true }, { k: "population", t: "Population 2023", num: true },
      { k: "requis_norme", t: "Requis (7 714)", num: true }, { k: "manque_norme", t: "À créer", num: true, f: function (v) { return "<b>+" + fmt(v) + "</b>"; } },
      { k: "requis_10000", t: "Requis (10 000)", num: true }, { k: "manque_10000", t: "À créer", num: true, f: function (v) { return "+" + fmt(v); } }], d.besoins, { triable: false });
    // distances
    const dg = d.distance_grille || {};
    $("#l-dist").innerHTML = tuile(fmt(dg.moyenne_km, 1) + " km", "distance moyenne") + tuile(fmt(dg.mediane_km, 1) + " km", "distance médiane") +
      tuile(fmt(dg.p90_km, 1) + " km", "90 % de la superficie en deçà") + tuile(dg.max_km != null ? fmt(dg.max_km, 1) + " km" : "–", "point le plus éloigné");
    const cd = d.comparaisons.distance_km;
    GP.graphique($("#c-comp-dist"), { type: "bar",
      data: { labels: cd.map(function (x) { return x[0]; }), datasets: [{ label: "km", data: cd.map(function (x) { return x[1]; }), backgroundColor: ["#94a3b8", "#14b8a6", "#38bdf8"], borderRadius: 4 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, title: { display: true, text: "km" } } } } });
    // polygones de Thiessen
    const th = d.thiessen;
    $("#l-thiessen").innerHTML = tuile(fmt(th.moyenne, 1) + " km²", "superficie moyenne") + tuile(dec(1)(th.mediane) + " km²", "médiane") +
      tuile(dec(2)(th.mini) + " – " + dec(1)(th.maxi) + " km²", "de Keur Abdoulaye Yakim à ZAC") + tuile(th.grands + " polygones", "de plus de 7 km² : " + fmt(th.pct_grands) + " % de la ville") +
      th.par_commune.map(function (c) { return tuile(dec(1)(c.moyenne) + " km²", "polygone moyen à " + c.commune); }).join("");
    // aire reelle / administrative
    const rv = d.reel_vs_adm;
    $("#l-reel").innerHTML = '<div class="stat-tiles">' + tuile(rv.plus_petite.length, "aires réelles plus petites que l'aire administrative") +
      tuile(rv.plus_grande.length, "plus grandes") + tuile(rv.identique.length, "identiques") + tuile(fmt(rv.superficie_reelle_km2, 1) + " km²", "couverts par les aires réelles (" + fmt(100 * rv.superficie_reelle_km2 / d.superficie_ville_km2) + " % de la ville)") + "</div>" +
      '<p class="hint"><b>Plus grandes :</b> ' + rv.plus_grande.map(esc).join(", ") + (rv.sans.length ? " · <b>sans aire réelle :</b> " + rv.sans.map(esc).join(", ") : "") +
      ". Thiès Nonè : aire administrative de 25,8 km², alors que son aire réelle se limite aux abords du poste.</p>";
    // profils K-means
    tableau("t-profils", [{ k: "classe", t: "Classe" }, { k: "postes", t: "Postes", num: true }, { k: "med", t: "Méd.", num: true, d: 1 }, { k: "inf", t: "Inf.", num: true, f: dec(1) },
      { k: "sf", t: "S.-f.", num: true, f: dec(1) }, { k: "lits", t: "Lits", num: true, f: dec(1) }, { k: "radio", t: "Radio.", num: true, f: dec(1) },
      { k: "steril", t: "Stérilis.", num: true, f: dec(1) }, { k: "labo", t: "Labo.", num: true, f: dec(1) }], d.profils_kmeans, { triable: false });
    // maille x K-means
    const TM = ["Fortement sous-dotée", "Sous-dotée", "Conforme ou sur-dotée"], KK = ["K1", "K2", "K3", "K4"];
    const cnt = function (t, k) { return d.maille_classe.filter(function (x) { return x.type_maille === t && x.classe_kmeans === k; }).reduce(function (a, x) { return a + x.n; }, 0); };
    $("#t-maille-k").innerHTML = "<thead><tr><th>Maille \\ K-means</th>" + KK.map(function (k) { return '<th class="num">' + k + "</th>"; }).join("") + '<th class="num">Total</th></tr></thead><tbody>' +
      TM.map(function (t) { const v = KK.map(function (k) { return cnt(t, k); });
        return "<tr><td>" + badge(t) + "</td>" + v.map(function (x) { return '<td class="num' + (x ? " fort" : "") + '">' + x + "</td>"; }).join("") + '<td class="num">' + v.reduce(function (a, b) { return a + b; }, 0) + "</td></tr>"; }).join("") + "</tbody>";
    // sites proposes
    tableau("t-sites", [{ k: "nom", t: "Secteur" }, { k: "lat", t: "Latitude", num: true, f: dec(3) }, { k: "lon", t: "Longitude", num: true, f: dec(3) },
      { k: "dist_km", t: "Poste le plus proche", num: true, f: function (v) { return dec(1)(v) + " km"; } }], d.sites, { triable: false });
    carteSites(d.sites);

    /* 6. tableau 17 */
    const filtrer = tableau("t-17", [{ k: "numero", t: "N°", num: true }, { k: "nom", t: "Poste" }, { k: "commune", t: "Commune" },
      { k: "superficie_theo_km2", t: "S (km²)", num: true, f: dec(2) }, { k: "population_theorique", t: "Population", num: true },
      { k: "taux_couverture", t: "Taux", num: true, f: dec(2) }, { k: "type_maille", t: "Maille", f: badge },
      { k: "indice_forme", t: "IF", num: true, f: dec(2) }, { k: "indice_decentrement", t: "ID", num: true, f: dec(2) },
      { k: "discordance_ta", t: "T–A", num: true, f: dec(2) }, { k: "discordance_ar", t: "A–R", num: true, f: dec(2) }, { k: "discordance_tr", t: "T–R", num: true, f: dec(2) },
      { k: "classe_kmeans", t: "K" }, { k: "classe_ch", t: "CH" }], d.postes, { tri: "numero", sens: 1 });
    $("#t17-filtre").addEventListener("input", function (ev) { filtrer(ev.target.value); });
  })();

  /* carte des sites proposes : Thiessen colores par type de maille, postes, sites */
  async function carteSites(sites) {
    const el = $("#stx-map"); if (!el || !window.L) return;
    const map = L.map(el, { scrollWheelZoom: false }).setView([14.8, -16.94], 12);
    const fonds = GP.creerFonds(); fonds[GP.fondSauveOu(fonds, "Plan sombre (Esri)")].addTo(map);
    L.control.scale({ imperial: false }).addTo(map);
    const leg = L.control({ position: "bottomleft" });
    leg.onAdd = function () { const div = L.DomUtil.create("div", "stx-leg");
      div.innerHTML = Object.keys(MAILLE).map(function (k) { return '<span><i style="background:' + MAILLE[k][1] + '"></i>' + esc(k) + "</span>"; }).join("") +
        '<span><i class="site"></i>Site proposé</span>'; return div; };
    leg.addTo(map);
    try {
      const [th, po] = await Promise.all([GP.getJSON("api/thiessen/"), GP.getJSON("api/postes/")]);
      const g = L.geoJSON(th, { style: function (f) { const c = (MAILLE[f.properties.type_maille] || [0, "#64748b"])[1]; return { color: "#0b2237", weight: 1, fillColor: c, fillOpacity: 0.45 }; },
        onEachFeature: function (f, l) { l.bindTooltip("<b>" + esc(f.properties.poste) + "</b><br>Taux de couverture : " + dec(2)(f.properties.taux_couverture), { sticky: true }); } }).addTo(map);
      L.geoJSON(po, { pointToLayer: function (f, ll) { return L.circleMarker(ll, { radius: 4, color: "#fff", weight: 1.5, fillColor: "#0f766e", fillOpacity: 1 }); },
        onEachFeature: function (f, l) { l.bindTooltip(esc(f.properties.nom)); } }).addTo(map);
      map.fitBounds(g.getBounds(), { padding: [10, 10] });
    } catch (e) { console.error(e); }
    sites.forEach(function (s, i) {
      L.circle([s.lat, s.lon], { radius: 1000, color: "#facc15", weight: 1.5, dashArray: "5 5", fillOpacity: 0.08 }).addTo(map);
      L.marker([s.lat, s.lon], { icon: L.divIcon({ className: "", html: '<div class="site-pin">' + (i + 1) + "</div>", iconSize: [26, 26], iconAnchor: [13, 13] }) })
        .bindTooltip("<b>" + esc(s.nom) + "</b><br>" + dec(1)(s.dist_km) + " km du poste le plus proche").addTo(map);
    });
  }

  /* figures d'analyse : visionneuse */
  function ouvrir(f) {
    $("#lb-img").src = f.dataset.img; $("#lb-img").alt = f.dataset.titre;
    $("#lb-fig").textContent = "Figure " + f.dataset.figure; $("#lb-titre").textContent = f.dataset.titre;
    $("#lb-dl").href = f.dataset.img; $("#lb-dl").setAttribute("download", "Thies_figure" + f.dataset.figure.replace(/\W+/g, "_") + ".png");
    $("#lightbox").classList.remove("hidden"); document.body.classList.add("lb-open"); $("#lb-close").focus();
  }
  function fermer() { $("#lightbox").classList.add("hidden"); document.body.classList.remove("lb-open"); }
  $$(".stx-fig").forEach(function (f) { $("button", f).addEventListener("click", function () { ouvrir(f); }); });
  $("#lb-close").addEventListener("click", fermer);
  $("#lightbox").addEventListener("click", function (e) { if (e.target.id === "lightbox") fermer(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") fermer(); });
})();
