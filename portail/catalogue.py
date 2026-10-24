"""Catalogue de la cartotheque et des figures d'analyse (memoire : chapitres 3 et 4).

Chaque carte du memoire peut etre ouverte dans le geoportail avec les couches correspondantes :
le champ `geoportail` contient les parametres d'adresse lus par carte.js
(couches=..., couleur=..., indicateur=...).
"""

THEMES_CARTES = [
    ("localisation", "Localisation"),
    ("aires", "Aires de desserte"),
    ("couverture", "Couverture et accessibilité"),
    ("offre", "Offre de soins"),
]

SOURCE_QGIS = "Traitement QGIS, Ba & Ndao, 2026"

CARTES = [
    {"id": "fig01_localisation", "figure": 1, "theme": "localisation",
     "titre": "Localisation géographique de la ville de Thiès",
     "texte": "Thiès, chef-lieu de région à environ 70 km à l'est de Dakar, et ses trois communes d'arrondissement : Thiès Nord, Thiès Est et Thiès Ouest.",
     "source": "senAdmin ; OpenStreetMap ; " + SOURCE_QGIS, "geoportail": ""},
    {"id": "fig02_reseau_routier", "figure": 2, "theme": "localisation",
     "titre": "Réseau routier et infrastructures structurantes",
     "texte": "Autoroute Dakar–Thiès, chemin de fer Dakar–Mali et voies urbaines : un réseau qui conditionne les temps de trajet vers les postes.",
     "source": "senAdmin ; " + SOURCE_QGIS, "geoportail": "fond=osm"},
    {"id": "fig03_postes_sante", "figure": 3, "theme": "offre",
     "titre": "Localisation des 28 postes de santé enquêtés",
     "texte": "11 postes à Thiès Nord, 9 à Thiès Est et 8 à Thiès Ouest (enquête auprès des infirmiers chefs de poste).",
     "source": "Enquête ICP ; fond OpenStreetMap ; " + SOURCE_QGIS, "geoportail": "couleur=commune"},
    {"id": "fig05_trois_aires", "figure": 5, "theme": "aires",
     "titre": "Les trois aires de desserte : théorique, administrative et réelle",
     "texte": "Polygones de Thiessen (85,5 km²), rattachement administratif des 68 quartiers (28 polygones) et quartiers de provenance des patients (27 polygones).",
     "source": SOURCE_QGIS, "geoportail": "couches=aire_administrative"},
    {"id": "fig06_admin_x_reelle", "figure": 6, "theme": "aires",
     "titre": "Aires administratives × aires réelles",
     "texte": "41,45 km² concordants contre 5,81 km² discordants : 87,7 % de concordance sur la superficie comparable.",
     "source": "Croisements sous QGIS, Ba & Ndao, 2026", "geoportail": "couches=aire_administrative,aire_reelle&quartiers=0"},
    {"id": "fig07_admin_x_theorique", "figure": 7, "theme": "aires",
     "titre": "Aires administratives × aires théoriques",
     "texte": "Concordance de 54,6 % seulement : l'aire administrative s'écarte nettement de l'aire théorique (discordance moyenne de 0,61).",
     "source": "Croisements sous QGIS, Ba & Ndao, 2026", "geoportail": "couches=aire_administrative,thiessen&quartiers=0"},
    {"id": "fig08_theorique_x_reelle", "figure": 8, "theme": "aires",
     "titre": "Aires théoriques × aires réelles",
     "texte": "72,9 % de concordance : l'aire théorique est assez proche de la pratique, mais moins que l'aire administrative.",
     "source": "Croisements sous QGIS, Ba & Ndao, 2026", "geoportail": "couches=thiessen,aire_reelle&quartiers=0"},
    {"id": "fig09_thiessen_communes", "figure": 9, "theme": "couverture",
     "titre": "Postes de santé et aire théorique (polygones de Thiessen), par commune",
     "texte": "Polygone moyen de 4,8 km² à Thiès Nord, 2,7 km² à Thiès Ouest et 1,3 km² à Thiès Est, où les postes sont plus rapprochés.",
     "source": "Enquête ICP ; " + SOURCE_QGIS, "geoportail": "couches=thiessen&couleur=commune&quartiers=0"},
    {"id": "fig10_taux_couverture", "figure": 10, "theme": "couverture",
     "titre": "Taux de couverture théorique par poste (population de l'aire / 7 714)",
     "texte": "14 postes sur 28 sont sous-dotés, dont 9 à plus de deux fois la norme (ZAC 6,8 ; Thiès Nonè 5,9 ; Diakhao 3,9 ; Fahu 3,9).",
     "source": "RGPH-5 ; " + SOURCE_QGIS, "geoportail": "couches=thiessen&couleur=taux&quartiers=0"},
    {"id": "fig11_zones_sous_desservies", "figure": 11, "theme": "couverture",
     "titre": "Zones sous-desservies de la ville de Thiès",
     "texte": "Au nord et à l'ouest, des aires à la fois sous-dotées et éloignées (ZAC, Diakhao, Thiès Nonè, Keur Saib Ndoye) ; à l'est, des aires compactes mais très chargées.",
     "source": SOURCE_QGIS, "geoportail": "couches=thiessen&couleur=taux&indicateur=dist_poste_m"},
    {"id": "fig18_typologie_kmeans", "figure": 18, "theme": "offre",
     "titre": "Typologie de l'offre des postes de santé (K-means)",
     "texte": "Un poste de référence, trois postes à plateau technique intermédiaire, huit postes orientés vers la maternité et seize postes de base.",
     "source": "Traitement R et QGIS, Ba & Ndao, 2026", "geoportail": "couches=thiessen&couleur=kmeans&quartiers=0"},
]

# cartes produites a la demande dans le geoportail (a partir de la base)
CARTES_INTERACTIVES = [
    {"titre": "Flux de patients", "ico": "⇢", "texte": "Quartier de résidence → poste fréquenté (au moins 5 % des patients du poste).",
     "geoportail": "couches=flux&quartiers=0"},
    {"titre": "Densité de population", "ico": "▦", "texte": "Habitants au km² par quartier (recensement 2023), 5 classes.",
     "geoportail": "indicateur=densite"},
    {"titre": "Distance au poste le plus proche", "ico": "↔", "texte": "Distance du centre de chaque quartier au poste le plus proche.",
     "geoportail": "indicateur=dist_poste_m"},
    {"titre": "Classification hiérarchique (CH)", "ico": "✚", "texte": "Les quatre classes de postes de la CH (tableau 13).",
     "geoportail": "couleur=ch&taille=personnel_total"},
    {"titre": "Norme OMS : infirmiers", "ico": "☥", "texte": "Postes qui respectent ou non la norme d'un infirmier pour 5 000 habitants.",
     "geoportail": "couleur=norme_infirmier&taille=hab_par_infirmier"},
    {"titre": "Couverture à 1 km", "ico": "◎", "texte": "Zone tampon de 1 km autour des 28 postes et population couverte.",
     "geoportail": "outil=tampon"},
]

# figures d'analyse (page Statistiques)
FIGURES_ANALYSE = [
    {"groupe": "Méthode", "items": [
        {"id": "fig04_schema_methodologique", "figure": "4", "titre": "Schéma général de la démarche méthodologique"}]},
    {"groupe": "Analyse en composantes principales (ACP)", "items": [
        {"id": "fig12a_acp_eboulis", "figure": "12 (gauche)", "titre": "ACP : éboulis des valeurs propres"},
        {"id": "fig12b_acp_cercle", "figure": "12 (droite)", "titre": "ACP : cercle des corrélations, plan 1-2"},
        {"id": "fig13_acp_individus", "figure": "13", "titre": "Postes de santé sur le plan factoriel 1-2 de l'ACP"}]},
    {"groupe": "Analyse des correspondances multiples (ACM)", "items": [
        {"id": "fig14a_acm_eboulis", "figure": "14 (gauche)", "titre": "ACM : éboulis des valeurs propres"},
        {"id": "fig14b_acm_modalites", "figure": "14 (droite)", "titre": "ACM : nuage des modalités, plan 1-2"},
        {"id": "fig15_acm_individus", "figure": "15", "titre": "Postes de santé sur le plan factoriel 1-2 de l'ACM"}]},
    {"groupe": "K-means", "items": [
        {"id": "fig16a_kmeans_coude", "figure": "16 (gauche)", "titre": "K-means : méthode du coude"},
        {"id": "fig16b_kmeans_silhouette", "figure": "16 (droite)", "titre": "K-means : indice de silhouette"},
        {"id": "fig17_kmeans_classes", "figure": "17", "titre": "K-means : classification des 28 postes"}]},
    {"groupe": "Classifications hiérarchiques", "items": [
        {"id": "fig19_ch_dendrogramme", "figure": "19", "titre": "Dendrogramme de la CH (Ward), quatre classes"},
        {"id": "fig20a_ch_coude", "figure": "20 (gauche)", "titre": "CH : inertie intra-classe"},
        {"id": "fig20b_ch_silhouette", "figure": "20 (droite)", "titre": "CH : indice de silhouette"},
        {"id": "fig21_cah_dendrogramme", "figure": "21", "titre": "Dendrogramme de la CAH sur les six premiers axes"}]},
]

# jeux de donnees (page Donnees) : `id` = nom d'export (/export/<id>.<geojson|csv>)
JEUX_DONNEES = [
    {"id": "postes", "titre": "Postes de santé", "ico": "✚", "geom": "Points", "theme": "offre",
     "texte": "Les 28 postes de santé publics enquêtés : position GPS, commune, personnel, lits, services, ratios OMS, indicateurs du mémoire et résumé de l'enquête patients.",
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
     "texte": "Polygones de Voronoï autour des 28 postes, découpés sur la ville (85,5 km²), avec la population et le taux de couverture du mémoire.",
     "source": "Calcul PostGIS ; tableau 17 du mémoire", "geoportail": "couches=thiessen&couleur=taux&quartiers=0",
     "champs": ["poste", "superficie_ha", "population_theorique", "taux_couverture", "type_maille", "indice_forme", "indice_decentrement"]},
    {"id": "flux", "titre": "Flux de patients", "ico": "⇢", "geom": "Lignes", "theme": "aires",
     "texte": "Lignes quartier de résidence → poste fréquenté, lorsque le quartier fournit au moins 5 % des patients du poste.",
     "source": "Enquête patients (1 920 réponses), 2026", "geoportail": "couches=flux&quartiers=0",
     "champs": ["quartier", "poste", "nb_patients", "pct_flux_poste", "retenu_aire_reelle"]},
    {"id": "indicateurs", "titre": "Indicateurs par poste (tableau 17)", "ico": "▥", "geom": "Points", "theme": "offre",
     "texte": "Superficie, population et taux de couverture de l'aire théorique, indices de forme, de décentrement et de discordance, classes K-means et CH, personnel et normes.",
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
    ("Zone d'étude", "Ville de Thiès (Sénégal) : communes de Thiès Est, Thiès Nord et Thiès Ouest, 68 quartiers, 85,5 km²"),
    ("Système de coordonnées", "Exports en WGS 84 (EPSG:4326) ; calculs de distance et de surface en UTM zone 28 N (EPSG:32628)"),
    ("Postes de santé", "Enquête auprès des infirmiers chefs de poste (KoboToolbox), juillet–août 2026 : 28 postes publics"),
    ("Patients", "Enquête de fréquentation (KoboToolbox), 1 920 réponses, 60 patients par poste (100 pour six postes) ; données individuelles non diffusées"),
    ("Population", "RGPH-5 (ANSD, 2023) : 391 253 habitants par commune ; 388 954 habitants dans la couche des quartiers"),
    ("Normes", "1 poste pour 7 714 habitants (carte sanitaire, 2011) ; 1 médecin / 10 000 hab. et 1 infirmier / 5 000 hab. (OMS, ANSD)"),
    ("Traitements", "QGIS (aires, indices), R — FactoMineR, factoextra (ACP, ACM, K-means, CH), PostgreSQL / PostGIS"),
    ("Fonds de carte", "© Esri ; © contributeurs OpenStreetMap ; itinéraires : moteur OSRM (serveurs FOSSGIS)"),
]

# ------------------------------------------------------------------ page Statistiques : elements de reference du memoire
NORMES_MEMOIRE = [   # tableau 1
    ("Habitants par poste de santé (urbain)", "7 714 (10 000 avant 2011)", "Carte sanitaire, mise à jour 2011"),
    ("Habitants par poste de santé (rural)", "5 000", "Carte sanitaire"),
    ("Rayon d'accessibilité géographique", "5 km ou 1 heure de marche", "Littérature (Afrique subsaharienne, Haïti)"),
    ("Médecin", "1 pour 10 000 habitants", "OMS ; ANSD ; Ministère de la Santé"),
    ("Infirmier", "1 pour 5 000 habitants", "OMS ; ANSD"),
    ("Technicien supérieur", "1 pour 5 000 habitants (hypothèse)", "Alignée sur les infirmiers"),
]
AIRES_MEMOIRE = [   # tableau 3
    ("Théorique", "Polygones de Thiessen autour de chaque poste, découpés selon les limites de la ville", "Coordonnées GPS des 28 postes", "28 (un par poste)"),
    ("Administrative", "Rattachement de chaque quartier à un poste de référence, puis regroupement des quartiers d'un même poste", "Couche des 68 quartiers officiels", "28 (un par poste)"),
    ("Réelle", "Regroupement des quartiers de provenance des patients (plus de 5 % des patients), poste par poste", "Enquête patients (1 920 réponses)", "27 (aucune pour Médina Fall 1)"),
]
INDICES_MEMOIRE = [   # tableau 6 : (indice, theorique, administrative, reelle) moyennes (medianes)
    ("Indice de forme (cercle = 0,785)", "0,38 (0,39)", "0,35 (0,34)", "0,33 (0,33)"),
    ("Indice de décentrement", "0,51 (0,49)", "0,70 (0,68)", "0,64 (0,55)"),
    ("Compacité de Gravelius (cercle = 1)", "—", "1,40 (1,34)", "—"),
    ("Circularité de Miller (cercle = 1)", "—", "0,53 (0,55)", "—"),
    ("Allongement", "—", "1,74 (1,50)", "—"),
    ("Nombre de postes avec une aire", "28", "28", "27"),
]
AXES_ACP = [   # tableau 10
    ("Axe 1", "40,9 %", "Équipements de laboratoire (0,96) ; médecins (0,94) ; équipements dentaires (0,94) ; infirmiers (0,92) ; lits (0,78)", "Médicalisation et équipement lourd : des postes de base au poste le mieux doté"),
    ("Axe 2", "17,2 %", "Appareils de radiographie (0,87) ; équipements de stérilisation (0,85) ; échographes (0,46)", "Plateau technique d'appui : imagerie et stérilisation"),
    ("Axe 3", "12,7 %", "Techniciens supérieurs (+0,69) ; échographes (+0,56) ; sages-femmes (−0,55) ; respirateurs (−0,50)", "Opposition entre techniciens et échographie, et sages-femmes"),
]
AXES_ACM = [   # tableau 11
    ("Axe 1", "47,8 %", "Consultations spécialisées = oui (37,0 %) ; urgences = oui (27,3 %) ; laboratoire = oui (21,3 %)", "Niveau de services : consultations spécialisées, urgences et laboratoire contre leur absence"),
    ("Axe 2", "24,9 %", "Pédiatrie = oui (51,9 %) ; pédiatrie = non (33,6 %)", "Axe de la pédiatrie : présence ou absence"),
    ("Axe 3", "18,8 %", "Laboratoire = oui (53,9 %) ; urgences = oui (25,0 %)", "Laboratoire et urgences"),
]
PROFILS_KMEANS = [   # tableau 12 : moyennes par poste
    {"classe": "K1", "postes": 3, "med": 0, "inf": 1.7, "sf": 3.3, "lits": 11.3, "radio": 1.0, "steril": 2.0, "labo": 0},
    {"classe": "K2", "postes": 8, "med": 0, "inf": 2.3, "sf": 3.5, "lits": 10.9, "radio": 0, "steril": 0, "labo": 0.3},
    {"classe": "K3", "postes": 16, "med": 0, "inf": 1.7, "sf": 1.8, "lits": 9.8, "radio": 0, "steril": 0.6, "labo": 0},
    {"classe": "K4", "postes": 1, "med": 3, "inf": 8.0, "sf": 3.0, "lits": 25.0, "radio": 0, "steril": 1.0, "labo": 10},
]
ZONES_CRITIQUES = [   # section 4.1.7
    ("Nord, nord-ouest et ouest", "ZAC, Diakhao, Keur Saib Ndoye, Thiès Nonè", "Quatre polygones couvrant 59 % de la superficie, postes excentrés (décentrement de 0,74 à 1,21) et la plus grande part des zones à plus de 3 km d'un poste."),
    ("Est dense", "Fahu, Hersent, Sampathe, Silmang, Cité Niakh", "Population par poste de 2,2 à 3,9 fois la norme : des aires compactes, proches d'un poste mais très chargées."),
    ("Médina Fall", "Médina Fall 1 et 2", "Deux postes pour un quartier de 37 280 habitants (4,8 fois la norme) ; le second absorbe en pratique les patients des deux mailles."),
    ("Thiès Nonè", "Thiès Nonè", "La quasi-totalité de la maille administrative (25,8 km²) n'alimente pas le poste : aire réelle réduite au voisinage du poste."),
    ("Thiès Ouest", "Commune de Thiès Ouest", "La maille administrative y reflète le moins la pratique (discordance moyenne administrative / réelle de 0,45 contre 0,26 à Thiès Nord et 0,19 à Thiès Est)."),
]
SITES_PROPOSES = [   # section 4.3.1
    {"nom": "Nord-ouest (polygone de Diakhao)", "lat": 14.830, "lon": -16.985, "dist_km": 5.8},
    {"nom": "Nord (polygone de ZAC)", "lat": 14.844, "lon": -16.967, "dist_km": 4.9},
    {"nom": "Nord-est (polygone de ZAC)", "lat": 14.850, "lon": -16.944, "dist_km": 3.6},
    {"nom": "Ouest (polygone de Thiès Nonè)", "lat": 14.808, "lon": -16.983, "dist_km": 3.6},
]
RECOMMANDATIONS = [   # tableau 16
    ("Planification", "Actualiser la carte sanitaire de Thiès avec les aires réelles et la population par quartier", "Ministère de la Santé, district sanitaire", "Moyen terme"),
    ("Implantation", "Créer des postes dans les secteurs nord-ouest, nord et ouest ; dédoubler les postes les plus chargés à l'est", "Communes d'arrondissement, district", "Moyen terme"),
    ("Ressources humaines", "Redistribuer médecins, infirmiers et sages-femmes selon la population desservie", "Région médicale, district", "Court terme"),
    ("Offre de soins", "Étendre pédiatrie et laboratoire dans les postes de base (classe K3) et les postes sans pédiatrie ni urgences (classe CH3)", "District, communes", "Moyen terme"),
    ("Information", "Doter le district d'un SIG permanent des postes et de leurs aires, mis à jour par les ICP", "District, universités", "Court terme"),
    ("Accessibilité", "Aménager les voies et les transports vers les postes des quartiers périphériques", "Communes, ville", "Moyen terme"),
]
HYPOTHESES = [   # section 4.2.1
    ("H1", "L'aire administrative est plus proche de la fréquentation réelle que de l'aire théorique",
     "Discordance moyenne administrative / réelle de 0,29 (87,7 % de concordance en superficie) contre 0,61 avec l'aire théorique (54,6 %) ; coïncidence exacte pour dix postes seulement."),
    ("H2", "La couverture est inégale : saturation à l'est, éloignement en périphérie",
     "Un poste pour 13 973 habitants (1,8 fois la norme) ; Thiès Est saturée (18 473 hab. par poste, 9 postes sur 9 sous-dotés) ; au nord et à l'ouest, la moitié de la superficie est à plus d'un kilomètre d'un poste."),
    ("H3", "L'offre de soins est concentrée dans quelques postes",
     "Les trois médecins exercent dans un seul poste, seize postes sont des postes de base et le laboratoire n'existe que dans deux postes ; typologie confirmée par le K-means et la CH (6 postes sur 28 classés différemment)."),
]
COMPARAISONS = {   # section 4.2.2
    "hab_par_poste": [("Thiès (2023)", 13973), ("Moyenne nationale (ANSD, 2022)", 11199), ("Ancien seuil (avant 2011)", 10000), ("Norme urbaine (2011)", 7714)],
    "distance_km": [("Moyenne nationale", 6.3), ("Thiès", 1.6), ("Dakar", 1.2)],
}

FIABILITE = [   # page Statistiques : origine de chaque resultat
    ("calcule", "Couverture par commune (tableau 7), postes à créer, comparaison aux normes", "Recalculés à partir de la population RGPH-5 des communes et des 28 postes."),
    ("calcule", "Superficie à proximité d'un poste (tableau 8), distances moyenne / médiane / 90 %", "Recalculées par PostGIS (grilles de 50 et 100 m, distance à vol d'oiseau)."),
    ("calcule", "Concordance en superficie (tableau 5), discordances par poste, taille des polygones, aires réelles et administratives", "Recalculées à partir des 68 quartiers et des trois aires de la base."),
    ("calcule", "Croisements K-means × CH (tableau 14) et charge × typologie", "Comptés à partir des classes enregistrées pour chaque poste."),
    ("memoire", "Population et taux de couverture de l'aire théorique (tableaux 15 et 17)", "La couche officielle des communes utilisée sous QGIS n'est pas dans la base : valeurs du tableau 17 (les superficies et indices recalculés par PostGIS concordent)."),
    ("memoire", "Indices des aires administratives et réelles, Gravelius, Miller, allongement (tableau 6)", "Calculés sous QGIS sur les aires corrigées ; non stockés dans la base."),
    ("memoire", "ACP, ACM, profils K-means, classes CH (tableaux 10 à 13, figures 12 à 21)", "Résultats des traitements sous R (FactoMineR, factoextra) ; les données de départ ne sont pas dans la base."),
    ("memoire", "Zones critiques, sites proposés, recommandations, hypothèses", "Interprétation et propositions des auteurs (chapitre 4)."),
    ("approx", "Aires réelles", "Reconstruites à partir de l'enquête (formes tronquées rattachées, seuil de 5 %, poste dominant) ; deux libellés ambigus (ESCALE pour Goutte de Lait, DVF Bayal pour Randoulène) écartés pour s'aligner sur le mémoire."),
    ("approx", "Population des quartiers", "La couche des quartiers totalise 388 954 habitants : il manque 2 299 habitants à Thiès Ouest par rapport au RGPH-5 (88 859)."),
    ("approx", "Provenance des patients", "129 patients habitent une localité hors des 68 quartiers (Pout, Ngoumsane, Gouye Sombel…) : ils ne sont rattachés à aucune aire réelle ; 38,4 km² de la ville n'ont aucun poste réel."),
    ("approx", "Distances", "À vol d'oiseau, sans le réseau routier ; population supposée uniforme dans chaque quartier ou commune."),
]
