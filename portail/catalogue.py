"""Catalogue de la cartotheque et des figures d'analyse (memoire : chapitres 3 et 4).

Chaque carte du memoire peut etre ouverte dans le geoportail avec les couches correspondantes :
le champ `geoportail` contient les parametres d'adresse lus par carte.js
(couches=..., couleur=..., indicateur=...).
"""

THEMES_CARTES = [
    ("localisation", "Territoire et population"),
    ("aires", "Aires de desserte"),
    ("couverture", "Couverture et accessibilité"),
    ("offre", "Offre de soins"),
]

SOURCE_QGIS = "Traitement QGIS, Ba & Ndao, 2026"

# cartes du memoire (version 3) : `figure` = numero de la figure dans le memoire
CARTES = [
    {"id": "fig2-1_localisation", "figure": "2-1", "theme": "localisation",
     "titre": "Localisation géographique de la ville de Thiès",
     "texte": "Chef-lieu de région à environ 70 km de Dakar, la ville (85,6 km²) se divise en trois communes d'arrondissement : Thiès Nord au nord, Thiès Ouest et Thiès Est au sud.",
     "source": "senAdmin ; " + SOURCE_QGIS, "geoportail": "fond=osm"},
    {"id": "fig2-2_decoupage_administratif", "figure": "2-2", "theme": "localisation",
     "titre": "Découpage administratif : communes d'arrondissement et quartiers",
     "texte": "68 quartiers officiels : Thiès Nord (21 quartiers, 136 138 hab.), Thiès Est (26 quartiers, 166 256 hab.) et Thiès Ouest (21 quartiers, 86 560 hab.).",
     "source": "ANSD, RGPH-5, 2023 ; " + SOURCE_QGIS, "geoportail": "couleur=commune"},
    {"id": "fig2-3_population_quartiers", "figure": "2-3", "theme": "localisation",
     "titre": "Répartition de la population par quartier en 2023",
     "texte": "Densité (couleur) et population (cercles) : plus de 18 800 hab./km² à l'est et au sud-est, moins de 5 300 dans les vastes quartiers du nord et de l'ouest.",
     "source": "ANSD, RGPH-5, 2023 ; traitement Ba & Ndao, 2026", "geoportail": "indicateur=densite"},
    {"id": "fig2-4_reseau_routier", "figure": "2-4", "theme": "localisation",
     "titre": "Réseau routier et infrastructures structurantes",
     "texte": "Un réseau dense au centre et au sud, autour du marché central et de la gare ; le nord, très vaste, n'est parcouru que par quelques axes.",
     "source": "senAdmin ; " + SOURCE_QGIS, "geoportail": "fond=osm"},
    {"id": "fig3-1_postes_sante", "figure": "3-1", "theme": "offre",
     "titre": "Localisation des 28 postes de santé enquêtés",
     "texte": "11 postes à Thiès Nord, 9 à Thiès Est et 8 à Thiès Ouest : nombreux et rapprochés au centre et au sud, isolés en périphérie nord (ZAC, Keur Saib Ndoye, Diakhao).",
     "source": "Enquête ICP ; fond OpenStreetMap ; Ba & Ndao, 2026", "geoportail": "couleur=commune&fond=osm"},
    {"id": "fig3-2_trois_aires", "figure": "3-2", "theme": "aires",
     "titre": "Les trois aires de desserte : théorique, administrative et réelle",
     "texte": "Polygones de Thiessen (85,5 km²), rattachement administratif des 68 quartiers (28 aires) et quartiers de provenance des patients (27 aires ; 38,4 km² sans poste réel).",
     "source": SOURCE_QGIS, "geoportail": "couches=aire_administrative"},
    {"id": "fig3-3_admin_x_reelle", "figure": "3-3", "theme": "aires",
     "titre": "Aires administratives × aires réelles",
     "texte": "41,45 km² concordants contre 5,81 km² discordants : 87,7 % de concordance sur la superficie comparable.",
     "source": "Croisements sous QGIS, Ba & Ndao, 2026", "geoportail": "couches=aire_administrative,aire_reelle&quartiers=0"},
    {"id": "fig3-4_admin_x_theorique", "figure": "3-4", "theme": "aires",
     "titre": "Aires administratives × aires théoriques",
     "texte": "54,6 % de concordance seulement : l'aire administrative s'écarte nettement de l'aire théorique (discordance moyenne de 0,61).",
     "source": "Croisements sous QGIS, Ba & Ndao, 2026", "geoportail": "couches=aire_administrative,thiessen&quartiers=0"},
    {"id": "fig3-5_theorique_x_reelle", "figure": "3-5", "theme": "aires",
     "titre": "Aires théoriques × aires réelles",
     "texte": "72,9 % de concordance : la discordance se concentre au centre et au sud-est, là où les postes sont les plus rapprochés.",
     "source": "Croisements sous QGIS, Ba & Ndao, 2026", "geoportail": "couches=thiessen,aire_reelle&quartiers=0"},
    {"id": "fig3-6_thiessen_communes", "figure": "3-6", "theme": "couverture",
     "titre": "Postes de santé et aire théorique (polygones de Thiessen), par commune",
     "texte": "Polygone moyen de 4,8 km² à Thiès Nord, 2,7 km² à Thiès Ouest et 1,3 km² à Thiès Est, où les postes sont plus rapprochés.",
     "source": "Enquête ICP ; " + SOURCE_QGIS, "geoportail": "couches=thiessen&couleur=commune&quartiers=0"},
    {"id": "fig3-7_taux_couverture", "figure": "3-7", "theme": "couverture",
     "titre": "Couverture démographique : taux de couverture théorique par poste (population de l'aire / 10 000)",
     "texte": "7 postes conformes, 17 sous-dotés et 4 fortement sous-dotés (plus de 2 fois le repère : Hersent, Cité Lamy, Darou Salam, Diakhao).",
     "source": "RGPH-5, 2023 ; traitement R", "geoportail": "couches=thiessen&couleur=taux&quartiers=0"},
    {"id": "fig3-8_zones_sous_desservies", "figure": "3-8", "theme": "couverture",
     "titre": "Zones sous-desservies de la ville de Thiès",
     "texte": "Aires fortement sous-dotées (au cœur du bâti, à l'est) et zones à plus d'un kilomètre d'un poste (nord et ouest, peu peuplés) : seul Diakhao cumule les deux.",
     "source": SOURCE_QGIS, "geoportail": "couches=thiessen&couleur=taux&indicateur=dist_poste_m"},
    {"id": "fig3-9_infirmiers", "figure": "3-9", "theme": "offre",
     "titre": "Déficit et surplus en infirmiers des postes de santé (1 infirmier pour 5 000 habitants)",
     "texte": "18 postes en déficit, dont 7 en déficit fort (Médina Fall 1 : −5, Cité Lamy : −4, Darou Salam : −3) ; les surplus se concentrent au nord (El Hadji Mounirou Ndiéguène : +7).",
     "source": "Enquête ICP, 2026 ; ANSD, 2023 ; " + SOURCE_QGIS, "geoportail": "couleur=norme_infirmier&taille=hab_par_infirmier"},
    {"id": "fig3-18_typologie_cah", "figure": "3-18", "theme": "offre",
     "titre": "Typologie des postes de santé (CAH, quatre classes) selon le découpage administratif",
     "texte": "CAH1 : pédiatrie et urgences (10 postes) ; CAH2 : plateau technique (3) ; CAH3 : ni pédiatrie ni urgences (14) ; CAH4 : poste de référence (1).",
     "source": "Enquête ICP, 2026 ; traitement R et QGIS", "geoportail": "couches=aire_administrative&couleur=ch&quartiers=0"},
]

# cartes produites a la demande dans le geoportail (a partir de la base)
CARTES_INTERACTIVES = [
    {"titre": "Flux de patients", "ico": "⇢", "texte": "Quartier de résidence → poste fréquenté (au moins 5 % des patients du poste).",
     "geoportail": "couches=flux&quartiers=0"},
    {"titre": "Densité de population", "ico": "▦", "texte": "Habitants au km² par quartier (recensement 2023), 5 classes.",
     "geoportail": "indicateur=densite"},
    {"titre": "Distance au poste le plus proche", "ico": "↔", "texte": "Distance du centre de chaque quartier au poste le plus proche.",
     "geoportail": "indicateur=dist_poste_m"},
    {"titre": "Typologie de l'offre (K-means)", "ico": "✚", "texte": "Les trois classes du K-means : postes de base, plateau technique, poste de référence.",
     "geoportail": "couleur=kmeans&taille=personnel_total"},
    {"titre": "Repère infirmiers", "ico": "☥", "texte": "Postes qui respectent ou non le repère d'un infirmier pour 5 000 habitants.",
     "geoportail": "couleur=norme_infirmier&taille=hab_par_infirmier"},
    {"titre": "Couverture à 1 km", "ico": "◎", "texte": "Zone tampon de 1 km autour des 28 postes et population couverte.",
     "geoportail": "outil=tampon"},
]

# jeux de donnees (page Donnees) : `id` = nom d'export (/export/<id>.<geojson|csv>)
JEUX_DONNEES = [
    {"id": "postes", "titre": "Postes de santé", "ico": "✚", "geom": "Points", "theme": "offre",
     "texte": "Les 28 postes de santé publics enquêtés : position GPS, commune, personnel, lits, services, ratios de personnel, indicateurs du mémoire et résumé de l'enquête patients.",
     "source": "Enquête ICP (KoboToolbox), 2026", "geoportail": "",
     "champs": ["numero", "nom", "commune", "population", "nb_medecins", "nb_infirmiers", "nb_sages_femmes", "nb_lits", "services", "taux_couverture", "classe_kmeans"]},
    {"id": "quartiers", "titre": "Quartiers", "ico": "▦", "geom": "Polygones", "theme": "territoire",
     "texte": "Les 68 quartiers officiels : population 2023, ménages, superficie, densité, postes de rattachement (administratif, théorique, réel) et distance au poste le plus proche.",
     "source": "Services de l'urbanisme ; RGPH-5 (ANSD, 2023)", "geoportail": "indicateur=densite",
     "champs": ["nom", "commune", "population", "menages", "superficie_km2", "densite", "poste_administratif", "poste_reel", "dist_poste_m"]},
    {"id": "communes", "titre": "Communes d'arrondissement", "ico": "◎", "geom": "Polygones", "theme": "territoire",
     "texte": "Thiès Est, Thiès Nord et Thiès Ouest : population RGPH-5, nombre de quartiers et de postes, superficie.",
     "source": "RGPH-5 (ANSD, 2023)", "geoportail": "",
     "champs": ["commune", "population_rgph5", "nb_quartiers", "nb_postes", "superficie_km2"]},
    {"id": "aires_administratives", "titre": "Aires administratives", "ico": "◧", "geom": "Polygones", "theme": "aires",
     "texte": "Rattachement des 68 quartiers à un poste de référence, regroupés par poste : 28 polygones.",
     "source": "Traitement QGIS, Ba & Ndao, 2026", "geoportail": "couches=aire_administrative&quartiers=0",
     "champs": ["poste", "commune", "nb_quartiers", "population", "superficie_ha", "quartiers"]},
    {"id": "aires_reelles", "titre": "Aires réelles", "ico": "◉", "geom": "Polygones", "theme": "aires",
     "texte": "Quartiers fournissant plus de 5 % des patients d'un poste, attribués au poste dominant : 27 polygones (aucun pour Médina Fall 1).",
     "source": "Enquête patients (1 920 réponses), 2026", "geoportail": "couches=aire_reelle&quartiers=0",
     "champs": ["poste", "commune", "nb_quartiers", "population", "superficie_ha", "quartiers"]},
    {"id": "thiessen", "titre": "Aires théoriques (polygones de Thiessen)", "ico": "⬡", "geom": "Polygones", "theme": "aires",
     "texte": "Polygones de Voronoï autour des 28 postes, découpés sur la ville (85,5 km²), avec la population et le taux de couverture du mémoire (population / 10 000).",
     "source": "Calcul PostGIS ; annexe A-1 du mémoire", "geoportail": "couches=thiessen&couleur=taux&quartiers=0",
     "champs": ["poste", "superficie_ha", "population_theorique", "taux_couverture", "type_maille", "indice_forme", "indice_decentrement"]},
    {"id": "flux", "titre": "Flux de patients", "ico": "⇢", "geom": "Lignes", "theme": "aires",
     "texte": "Lignes quartier de résidence → poste fréquenté, lorsque le quartier fournit au moins 5 % des patients du poste.",
     "source": "Enquête patients (1 920 réponses), 2026", "geoportail": "couches=flux&quartiers=0",
     "champs": ["quartier", "poste", "nb_patients", "pct_flux_poste", "retenu_aire_reelle"]},
    {"id": "indicateurs", "titre": "Indicateurs par poste (annexe A-1)", "ico": "▥", "geom": "Points", "theme": "offre",
     "texte": "Superficie, population et taux de couverture de l'aire théorique, indices de forme, de décentrement et de discordance, classes K-means et CAH, personnel et repères.",
     "source": "Calculs QGIS et R, Ba & Ndao, 2026", "geoportail": "couleur=taux",
     "champs": ["numero", "poste", "taux_couverture", "type_maille", "indice_forme", "discordance_ar", "classe_kmeans", "classe_ch"]},
]

THEMES_DONNEES = [("offre", "Offre de soins"), ("territoire", "Territoire et population"), ("aires", "Aires de desserte")]

API_DOC = [
    ("api/postes/", "Postes de santé (GeoJSON)"), ("api/quartiers/", "Quartiers (GeoJSON)"),
    ("api/aires/administrative/", "Aires administratives (GeoJSON)"), ("api/aires/reelle/", "Aires réelles (GeoJSON)"),
    ("api/thiessen/", "Polygones de Thiessen calculés par PostGIS (GeoJSON)"), ("api/flux/", "Flux de patients (GeoJSON)"),
    ("api/stats/", "Indicateurs du tableau de bord (JSON)"), ("api/statistiques/", "Tableaux du mémoire (JSON)"),
    ("api/proche/?lat=14.79&lon=-16.93&n=3", "Postes les plus proches d'un point (JSON)"),
    ("api/tampon/?distance=1000", "Zone tampon et population couverte (JSON)"), ("api/recherche/?q=mbour", "Recherche de postes et de quartiers (JSON)"),
]

METADONNEES = [
    ("Zone d'étude", "Ville de Thiès (Sénégal) : communes de Thiès Est, Thiès Nord et Thiès Ouest, 68 quartiers, 85,6 km²"),
    ("Système de coordonnées", "Exports en WGS 84 (EPSG:4326) ; calculs de distance et de surface en UTM zone 28 N (EPSG:32628)"),
    ("Postes de santé", "Enquête auprès des infirmiers chefs de poste (KoboToolbox), juillet–août 2026 : 28 postes publics"),
    ("Patients", "Enquête de fréquentation (KoboToolbox), 1 920 réponses, 60 patients par poste (100 dans six postes) ; données individuelles non diffusées"),
    ("Population", "RGPH-5 (ANSD, 2023) : 388 954 habitants (Thiès Est 166 256, Thiès Nord 136 138, Thiès Ouest 86 560)"),
    ("Repères", "1 poste pour 10 000 habitants ; 1 médecin / 10 000 hab. et 1 infirmier / 5 000 hab. (OMS, repris par l'ANSD, 2022)"),
    ("Traitements", "QGIS (aires, indices), R — FactoMineR, factoextra (typologie), PostgreSQL / PostGIS"),
    ("Fonds de carte", "© Esri ; © contributeurs OpenStreetMap ; itinéraires : moteur OSRM (serveurs FOSSGIS)"),
]

# ------------------------------------------------------------------ page Statistiques : elements de reference du memoire (version 3)
NORMES_MEMOIRE = [   # tableau 1-1
    ("Habitants par poste de santé", "10 000 (repère OMS) ; situation nationale : 11 199", "OMS, repris par l'ANSD (2022)"),
    ("Accessibilité géographique", "Accès aux soins à moins de 30 min du lieu de résidence (environ 1,5 km à pied)", "Dia (2016) ; AllAfrica (2026)"),
    ("Médecin", "1 pour 10 000 habitants", "OMS, repris par l'ANSD (2022)"),
    ("Infirmier", "1 pour 5 000 habitants", "OMS, repris par l'ANSD (2022)"),
    ("Technicien supérieur", "1 pour 5 000 habitants (hypothèse)", "Alignée sur les infirmiers"),
]
AIRES_MEMOIRE = [   # tableau 2-1
    ("Théorique", "Polygones de Thiessen autour de chaque poste, découpés selon les limites de la ville", "Coordonnées GPS des 28 postes", "28 (un par poste)"),
    ("Administrative", "Rattachement de chaque quartier à un poste de référence, puis regroupement des quartiers d'un même poste", "Couche des 68 quartiers officiels", "28 (un par poste)"),
    ("Réelle", "Regroupement des quartiers de provenance des patients (au moins 5 % des patients), poste par poste", "Enquête patients (1 920 réponses)", "27 (28 sauf Médina Fall 1)"),
]
INDICES_MEMOIRE = [   # tableau 3-3 : (indice, theorique, administrative, reelle) moyennes (medianes)
    ("Indice de forme (cercle = 0,785)", "0,38 (0,39)", "0,35 (0,34)", "0,33 (0,33)"),
    ("Indice de décentrement", "0,51 (0,49)", "0,70 (0,68)", "0,64 (0,55)"),
    ("Compacité de Gravelius (cercle = 1)", "—", "1,40 (1,34)", "—"),
    ("Circularité de Miller (cercle = 1)", "—", "0,53 (0,55)", "—"),
    ("Allongement", "—", "1,74 (1,50)", "—"),
    ("Nombre de postes avec une aire", "28", "28", "27"),
]
ZONES_CRITIQUES = [   # section 3.8
    ("Est dense", "Hersent, Cité Lamy, Darou Salam, Silmang, Sampathe, Cité Niakh", "La population de l'aire théorique atteint 1,6 à 2,5 fois le repère de 10 000 habitants : des aires compactes, proches d'un poste mais très chargées."),
    ("Centre-nord", "Médina Fall 1, Kawsara, Takhikao", "Des aires compactes regroupant des quartiers denses (1,6 à 1,9 fois le repère) ; Médina Fall 1 et 2 se partagent un quartier de 37 280 habitants, le second absorbant en pratique les patients des deux mailles."),
    ("Périphérie nord et ouest", "ZAC, Diakhao, Keur Saib Ndoye, Thiès Nonè", "Quatre polygones couvrant 59 % de la superficie, des postes excentrés (décentrement de 0,74 à 1,21) : l'enjeu est l'éloignement plus que la charge, sauf à Diakhao (2,0 fois le repère)."),
    ("Thiès Nonè", "Thiès Nonè", "La quasi-totalité de la maille administrative (25,8 km²) n'alimente pas le poste : l'aire réelle se réduit à 0,4 km² autour du poste."),
    ("Thiès Ouest", "Commune de Thiès Ouest", "La maille administrative y reflète le moins la pratique (discordance moyenne administrative / réelle de 0,45, contre 0,26 à Thiès Nord et 0,19 à Thiès Est)."),
]
SITES_PROPOSES = [   # section 5.2.1 : points les plus eloignes d'un poste
    {"nom": "Nord-ouest (polygone de Diakhao, prioritaire)", "lat": 14.830, "lon": -16.985, "dist_km": 5.8},
    {"nom": "Nord (polygone de ZAC)", "lat": 14.844, "lon": -16.967, "dist_km": 4.9},
    {"nom": "Nord-est (polygone de ZAC)", "lat": 14.850, "lon": -16.944, "dist_km": 3.6},
    {"nom": "Ouest (polygone de Thiès Nonè)", "lat": 14.808, "lon": -16.983, "dist_km": 3.6},
]
HYPOTHESES = [   # section 5.1.1
    ("H1", "L'aire administrative est plus proche de l'aire réelle que de l'aire théorique",
     "Discordance moyenne administrative / réelle de 0,29 (87,7 % de concordance en superficie) contre 0,61 avec l'aire théorique (54,6 %) ; coïncidence exacte pour dix postes seulement, forte discordance pour huit."),
    ("H2", "La couverture est inégale : saturation à l'est, éloignement en périphérie",
     "Un poste pour 13 891 habitants (1,4 fois le repère de 10 000) ; Thiès Est saturée (18 473 hab. par poste, 9 postes sur 9 sous-dotés) ; au nord et à l'ouest, la moitié de la superficie est à plus d'un kilomètre d'un poste."),
    ("H3", "L'offre de soins est hétérogène et concentrée dans quelques postes",
     "Les trois médecins exercent dans un seul poste, vingt et un postes sont des postes de base et le laboratoire n'existe que dans deux postes ; typologie cohérente entre le K-means et la CAH."),
]
COMPARAISONS = {   # section 5.1.2
    "hab_par_poste": [("Thiès (2023)", 13891), ("Région de Thiès (2021)", 11800), ("Moyenne nationale (ANSD, 2022)", 11199), ("Repère (OMS, ANSD)", 10000)],
    "distance_km": [("Région de Thiès, RMAT (2013)", 3.3), ("Thiès : distance moyenne", 1.6), ("Objectif 30 min de marche", 1.5)],
}

FIABILITE = [   # page Statistiques : origine de chaque resultat
    ("calcule", "Couverture par commune (tableau 3-4), postes à créer, comparaison aux repères", "Recalculés à partir de la population RGPH-5 des communes et des 28 postes."),
    ("calcule", "Superficie à proximité d'un poste (tableau 3-5), distances moyenne / médiane / 90 %", "Recalculées par PostGIS (grilles de 50 et 100 m, distance à vol d'oiseau)."),
    ("calcule", "Concordance en superficie (tableau 3-2), discordances par poste, taille des polygones, aires réelles et administratives", "Recalculées à partir des 68 quartiers et des trois aires de la base."),
    ("calcule", "Dotation en infirmiers (tableaux 3-6 et 3-7)", "Population administrative des postes / 5 000, arrondie, comparée aux infirmiers déclarés."),
    ("memoire", "Population et taux de couverture de l'aire théorique (annexe A-1)", "Population des quartiers répartie entre les polygones de Thiessen au prorata des superficies (QGIS) : valeurs de l'annexe A-1 (les superficies et indices recalculés par PostGIS concordent)."),
    ("memoire", "Indices des aires administratives et réelles, Gravelius, Miller, allongement (tableau 3-3)", "Calculés sous QGIS sur les aires corrigées ; non stockés dans la base."),
    ("memoire", "Classes du K-means et de la CAH (tableaux 3-10 à 3-12)", "Résultats des traitements sous R (FactoMineR, factoextra), enregistrés pour chaque poste."),
    ("memoire", "Zones critiques, sites proposés, hypothèses", "Interprétation des auteurs (sections 3.8, 5.1 et 5.2.1)."),
    ("approx", "Aires réelles", "Reconstruites à partir de l'enquête (formes tronquées rattachées, seuil de 5 %, poste dominant) ; deux libellés ambigus (ESCALE pour Goutte de Lait, DVF Bayal pour Randoulène) écartés pour s'aligner sur le mémoire."),
    ("approx", "Population de l'aire théorique", "La somme des 28 aires (390 218 habitants) diffère de 0,3 % de celle des quartiers (388 954), écart lié aux imprécisions des limites des deux couches."),
    ("approx", "Provenance des patients", "129 patients habitent une localité hors des 68 quartiers (Pout, Ngoumsane, Gouye Sombel…) : ils ne sont rattachés à aucune aire réelle ; 38,4 km² de la ville n'ont aucun poste réel."),
    ("approx", "Distances", "À vol d'oiseau, sans le réseau routier ; population supposée uniforme dans chaque quartier."),
]
