/* Tableau de bord statistique */
(function () {
  "use strict";
  const esc = GP.esc, fmt = GP.fmt;
  const $ = (s) => document.querySelector(s);

  function kpi(valeur, libelle, cls) {
    return '<div class="kpi ' + (cls || "") + '"><b>' + valeur + "</b><span>" + esc(libelle) + "</span></div>";
  }
  const badge = (ok) => '<span class="badge ' + (ok ? "ok" : "ko") + '">' + (ok ? "Respectée" : "Non respectée") + "</span>";

  function tableau(el, colonnes, lignes, triInitial, sensInitial) {
    let tri = triInitial || null, sens = sensInitial || -1;
    function rendre(filtre) {
      let l = lignes.slice();
      if (filtre) { const f = filtre.toLowerCase(); l = l.filter(function (r) { return String(r.nom || r.commune || "").toLowerCase().indexOf(f) >= 0; }); }
      if (tri) l.sort(function (a, b) {
        const x = a[tri], y = b[tri];
        if (x === null || x === undefined) return 1;
        if (y === null || y === undefined) return -1;
        return (typeof x === "string" ? x.localeCompare(y) : x - y) * sens;
      });
      el.innerHTML = "<thead><tr>" + colonnes.map(function (c) {
        return '<th data-k="' + c.k + '" class="' + (c.num ? "num" : "") + '">' + esc(c.t) + (tri === c.k ? (sens > 0 ? " ▲" : " ▼") : "") + "</th>";
      }).join("") + "</tr></thead><tbody>" + l.map(function (r) {
        return "<tr>" + colonnes.map(function (c) {
          const v = c.f ? c.f(r[c.k], r) : (c.num ? fmt(r[c.k], c.d || 0) : esc(r[c.k]));
          return '<td class="' + (c.num ? "num" : "") + '">' + v + "</td>";
        }).join("") + "</tr>";
      }).join("") + "</tbody>";
      Array.prototype.forEach.call(el.querySelectorAll("th"), function (th) {
        th.addEventListener("click", function () {
          const k = th.dataset.k;
          if (tri === k) sens = -sens;
          else {     // texte : A → Z au premier clic ; nombres : du plus grand au plus petit
            tri = k;
            const v = lignes.map(function (r) { return r[k]; }).filter(function (x) { return x !== null && x !== undefined; })[0];
            sens = typeof v === "string" ? 1 : -1;
          }
          rendre(filtreCourant);
        });
      });
    }
    let filtreCourant = "";
    rendre("");
    return function (f) { filtreCourant = f; rendre(f); };
  }


  /* Tableau de bord : suivi operationnel (personnel, normes, services, equipements, patients).
     Les analyses spatiales du memoire sont sur la page Statistiques. */
  (async function () {
    let s;
    try { s = await GP.getJSON("api/stats/"); }
    catch (e) { $("#kpis").innerHTML = '<div class="loading">Erreur de chargement : vérifiez la connexion à la base PostgreSQL.</div>'; return; }

    const k = s.kpi, n = s.normes, e = s.enquete, ind = e.indicateurs;
    $("#kpis").innerHTML =
      kpi(fmt(k.nb_postes), "postes de santé publics") +
      kpi(fmt(k.medecins), "médecins (repère : " + fmt(k.medecins_requis) + " requis)", "bad") +
      kpi(fmt(k.infirmiers), "infirmiers (repère : " + fmt(k.infirmiers_requis) + " requis)", "warn") +
      kpi(fmt(k.sages_femmes), "sages-femmes") + kpi(fmt(k.techniciens_sup), "techniciens supérieurs") + kpi(fmt(k.lits_total), "lits") +
      kpi(fmt(k.hab_par_infirmier), "hab. par infirmier (repère : 5 000)", "warn") +
      kpi(fmt(n.n - n.infirmier_ok) + " / " + n.n, "postes en deçà du repère infirmiers", "warn") +
      kpi(n.medecin_ok + " / " + n.n, "poste doté de médecins", "bad") +
      kpi(fmt(ind.n), "patients enquêtés") +
      kpi(fmt(ind.pct_a_pied, 1) + " %", "des patients viennent à pied") +
      kpi(fmt(ind.distance_mediane_km, 1) + " km", "distance médiane déclarée") +
      kpi(fmt(ind.duree_mediane_min, 0) + " min", "durée médiane du trajet");

    /* ---- personnel et normes */
    const pc = s.par_commune;
    GP.graphique($("#c-personnel"), { type: "bar",
      data: { labels: pc.map(function (c) { return c.commune; }), datasets: [
        { label: "Médecins", data: pc.map(function (c) { return c.medecins; }), backgroundColor: "#14b8a6" },
        { label: "Infirmiers", data: pc.map(function (c) { return c.infirmiers; }), backgroundColor: "#3b82f6" },
        { label: "Sages-femmes", data: pc.map(function (c) { return c.sages_femmes; }), backgroundColor: "#8b5cf6" },
        { label: "Techniciens sup.", data: pc.map(function (c) { return c.techniciens_sup; }), backgroundColor: "#ec4899" }] },
      options: { scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } } });
    GP.graphique($("#c-normes"), { type: "bar",
      data: { labels: ["Médecins (1 / 10 000)", "Infirmiers (1 / 5 000)", "Techniciens (1 / 5 000)"], datasets: [
        { label: "Repère respecté", data: [n.medecin_ok, n.infirmier_ok, n.technicien_ok], backgroundColor: "#22c55e" },
        { label: "Repère non respecté", data: [n.n - n.medecin_ok, n.n - n.infirmier_ok, n.n - n.technicien_ok], backgroundColor: "#ef4444" }] },
      options: { indexAxis: "y", scales: { x: { stacked: true, max: n.n }, y: { stacked: true } } } });
    const ps = s.postes.filter(function (p) { return p.hab_par_infirmier !== null; }).sort(function (a, b) { return b.hab_par_infirmier - a.hab_par_infirmier; });
    GP.graphique($("#c-ratio"), {
      type: "bar",
      data: { labels: ps.map(function (p) { return p.nom.replace(/^PS /, ""); }),
              datasets: [
                { label: "Hab. / infirmier", data: ps.map(function (p) { return p.hab_par_infirmier; }),
                  backgroundColor: ps.map(function (p) { return ({ "Déficit fort": "#991b1b", "Déficit moyen": "#f97316", "Déficit faible": "#fa8072", "Surplus faible": "#86efac", "Surplus moyen": "#22c55e", "Surplus fort": "#166534" })[p.classe_infirmier] || (p.hab_par_infirmier > 5000 ? "#dc2626" : "#16a34a"); }), borderRadius: 3 },
                { type: "line", label: "Repère (5 000)", data: ps.map(function () { return 5000; }), borderColor: GP.couleur("norme"), borderDash: [6, 4], pointRadius: 0, borderWidth: 2 }] },
      options: { scales: { x: { ticks: { maxRotation: 70, minRotation: 45, autoSkip: false } } } },
    });
    tableau($("#t-commune"), [
      { k: "commune", t: "Commune" }, { k: "nb_postes", t: "Postes", num: true }, { k: "medecins", t: "Médecins", num: true },
      { k: "infirmiers", t: "Infirmiers", num: true }, { k: "sages_femmes", t: "Sages-femmes", num: true }, { k: "techniciens_sup", t: "Techn. sup.", num: true },
      { k: "lits", t: "Lits", num: true }, { k: "population", t: "Population desservie", num: true },
      { k: "hab_par_infirmier", t: "Hab./infirmier", num: true }, { k: "patients", t: "Patients enquêtés", num: true },
    ], pc);
    const INF = { "Déficit fort": ["#991b1b", "#fff"], "Déficit moyen": ["#f97316", "#fff"], "Déficit faible": ["#fa8072", "#3b0a0a"],
                  "Surplus faible": ["#86efac", "#052e16"], "Surplus moyen": ["#22c55e", "#052e16"], "Surplus fort": ["#166534", "#fff"] };
    const ordre = s.postes.slice().sort(function (a, b) { return (a.rang_infirmier || 99) - (b.rang_infirmier || 99); });   // rang du tableau 3-6
    const filtrer = tableau($("#t-postes"), [
      { k: "rang_infirmier", t: "Rang", num: true }, { k: "nom", t: "Poste" }, { k: "commune", t: "Commune" }, { k: "population", t: "Population", num: true },
      { k: "nb_infirmiers", t: "Inf. en poste", num: true }, { k: "infirmiers_requis", t: "Inf. requis", num: true },
      { k: "ecart_infirmiers", t: "Écart", num: true, f: function (v) { return v === null || v === undefined ? "–" : "<b>" + (v > 0 ? "+" : "") + fmt(v) + "</b>"; } },
      { k: "classe_infirmier", t: "Classe", f: function (v) { const c = INF[v]; return v ? '<span class="badge" style="background:' + (c ? c[0] : "#64748b") + ";color:" + (c ? c[1] : "#fff") + '">' + esc(v) + "</span>" : "–"; } },
      { k: "hab_par_infirmier", t: "Hab./inf.", num: true, f: function (v) { return v === null || v === undefined ? "aucun" : fmt(v); } },
      { k: "nb_medecins", t: "Méd.", num: true }, { k: "nb_sages_femmes", t: "SF", num: true }, { k: "nb_techniciens_sup", t: "Tech.", num: true },
      { k: "nb_lits", t: "Lits", num: true }, { k: "patients", t: "Patients enq.", num: true },
    ], ordre, "rang_infirmier", 1);
    $("#t-filtre").addEventListener("input", function (ev) { filtrer(ev.target.value); });
    if (k.techniciens_sup !== k.techniciens_sup_ratios)
      $("#note-tech").textContent = "Note : le nombre de techniciens supérieurs diffère entre le fichier d'offre (" + k.techniciens_sup +
        ") et le fichier de ratios (" + k.techniciens_sup_ratios + ") ; les normes affichées proviennent du fichier de ratios.";

    /* ---- services et equipements */
    GP.barres($("#c-services"), s.services, { horizontal: true, couleur: GP.COULEURS[7] });
    GP.barres($("#c-equip"), s.equipements.filter(function (x) { return x.n > 0 && x.label !== "Lits"; }), { horizontal: true, couleur: GP.COULEURS[5] });
    const pl = s.postes.slice().sort(function (a, b) { return (b.nb_lits || 0) - (a.nb_lits || 0); });
    GP.barres($("#c-lits"), pl.map(function (p) { return { label: p.nom.replace(/^PS /, ""), n: p.nb_lits }; }), { couleur: GP.COULEURS[2], titre: "Lits" });

    /* ---- enquete patients */
    GP.barres($("#c-commune"), pc.map(function (c) { return { label: c.commune, n: c.patients }; }));
    GP.anneau($("#c-instruction"), e.instruction);
    GP.barres($("#c-transport"), e.transport, { horizontal: true, couleur: GP.COULEURS[1] });
    const d = e.distances || {};
    GP.anneau($("#c-distance"), [{ label: "Moins d'1 km", n: d.moins_1km }, { label: "1 à 3 km", n: d.de_1_a_3km }, { label: "Plus de 3 km", n: d.plus_3km }]);
    GP.barres($("#c-raisons"), e.raisons, { horizontal: true, couleur: GP.COULEURS[4] });
    GP.barres($("#c-provenance"), e.provenance, { horizontal: true, couleur: GP.COULEURS[6] });

    /* ---- donnees renseignees : effectif sous chaque graphique de l'enquete + tableau de qualite */
    const R = e.renseigne || {}, T = R.total || 0, Q = s.qualite || {};
    const note = function (id, n, txt) {
      const c = $("#" + id); if (!c) return;
      const p = document.createElement("p"); p.className = "hint n-info" + (n < T ? " manque" : "");
      p.textContent = "n = " + fmt(n) + " patient" + (n > 1 ? "s" : "") + (n < T ? " · " + fmt(T - n) + " non renseigné" + (T - n > 1 ? "s" : "") : " · données complètes") + (txt ? " · " + txt : "");
      c.parentNode.appendChild(p);
    };
    note("c-commune", T);
    note("c-instruction", R.instruction); note("c-transport", R.transport); note("c-distance", R.distance);
    note("c-raisons", T, "plusieurs réponses possibles"); note("c-provenance", R.quartier);
    $("#q-total").textContent = fmt(T);
    const lignesQ = [
      { v: "Niveau d'instruction", n: R.instruction, c: "Question non posée dans : " + (Q.instruction_par_poste || []).map(function (x) { return x.nom + " (" + x.manquants + "/" + x.total + ")"; }).join(", ") + "." },
      { v: "Moyen de transport", n: R.transport }, { v: "Distance déclarée", n: R.distance, c: "Valeurs aberrantes (trajet de 400 km) exclues lors du nettoyage." },
      { v: "Durée du trajet", n: R.duree, c: fmt(Q.duree_zero) + " durées égales à 0 et " + fmt(Q.duree_vide) + " vides ou négatives : seules les durées positives sont utilisées." },
      { v: "Quartier de résidence", n: R.quartier, c: fmt(Q.hors_decoupage) + " patients habitent une localité hors des 68 quartiers (Pout, Ngoumsane, Gouye Sombel…) : non rattachés aux aires réelles." },
    ];
    $("#t-qualite").innerHTML = "<thead><tr><th>Variable</th><th class=num>Renseignées</th><th class=num>Manquantes</th><th>Taux</th><th>Remarque</th></tr></thead><tbody>" +
      lignesQ.map(function (l) {
        const pct = T ? 100 * l.n / T : 0, cls = pct >= 99.5 ? "ok" : (pct >= 90 ? "warn" : "ko");
        return "<tr><td><b>" + esc(l.v) + '</b></td><td class="num">' + fmt(l.n) + '</td><td class="num">' + fmt(T - l.n) +
          '</td><td><span class="qbar"><i class="' + cls + '" style="width:' + pct.toFixed(1) + '%"></i></span> ' + fmt(pct, 1) + " %</td><td>" + esc(l.c || "") + "</td></tr>";
      }).join("") + "</tbody>";
    $("#q-notes").innerHTML = '<p class="hint"><b>Postes de santé :</b> ' + (Q.postes_incomplets ? fmt(Q.postes_incomplets) + " poste(s) avec des champs manquants." :
      "personnel, lits, services, équipements et position GPS renseignés pour les 28 postes.") +
      " Non collectés : horaires d'ouverture, fréquentation annuelle, postes privés, cases et centres de santé.</p>";
  })();
})();
