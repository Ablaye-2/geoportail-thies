# Géoportail de la maille sanitaire de Thiès

Application web **Django + GeoDjango + PostGIS + Leaflet + Chart.js**, branchée sur la base `monsite_db`
(créée avec `sql/base_maille_sanitaire_thies.sql`).

## Pages du site

En-tête : **Accueil · Cartothèque · Statistiques · Tableau de bord · Données**, et à droite le bouton **Géoportail** (icône carte),
qui ouvre directement le géoportail sans passer par le menu. Les anciennes adresses `/carte/` et `/trouver-un-poste/` redirigent vers `/geoportail/`, et `/geoportail/?donnees=1` vers `/donnees/`.

**Accueil** (`/`) : présentation, chiffres clés lus dans la base, accès au géoportail, explication des trois aires de desserte.

**Géoportail** (`/geoportail/`) : carte interactive à trois colonnes (couches et filtres, carte, aperçu ou fiche).
- **Postes de santé représentés par une icône** (épingle avec croix), de la couleur et de la taille choisies, **étiquetés** avec le numéro des cartes du mémoire et leur nom
- Couches : quartiers thématiques, aires administrative (28), réelle (27), théorique, Thiessen calculé par PostGIS, flux de patients, zone tampon
- Couleur des postes : commune, taux de couverture (norme 7 714), K-means, CH, normes OMS, nombre de services ; taille : population, personnel, lits…
- Fiches détaillées (poste, quartier), recherche avec ou sans accents, filtres commune / poste / quartier, exports CSV et GeoJSON
- Outils (bouton « Analyse ») : **itinéraire par les rues**, poste le plus proche, mesure, zone tampon et population couverte, courbe de couverture, quartiers éloignés
- **Itinéraire jusqu'à un poste** (bouton « Itinéraire », ou depuis la fiche d'un poste) : départ par GPS ou par un clic sur la carte, destination choisie
  ou « le poste le plus proche par la route », à pied, en voiture ou à vélo. Le trajet suit les rues d'OpenStreetMap (moteur OSRM des serveurs FOSSGIS,
  ceux du site openstreetmap.org), avec la distance, la durée et les consignes pas à pas en français ; lien pour l'ouvrir sur openstreetmap.org.
  **Internet est nécessaire** ; sans connexion, une ligne droite est affichée. Le serveur se change avec `GEOPORTAIL_ROUTAGE_URL` (fichier `.env` ou `settings.py`).
  Le GPS du navigateur ne fonctionne qu'à l'adresse `127.0.0.1` / `localhost` ou en HTTPS.
- Préréglages par l'adresse, utilisés par la cartothèque : `?couches=aire_administrative,thiessen&couleur=taux&taille=population&indicateur=densite&quartiers=0&fond=osm&outil=tampon|itineraire&poste=5`

**Cartothèque** (`/cartotheque/`) : les 11 cartes du mémoire (localisation, aires de desserte, couverture, offre de soins), filtrables par thème et par mot-clé,
visionneuse plein écran (flèches ← →, Échap), téléchargement en PNG et bouton « Géoportail » qui ouvre la carte équivalente avec les bonnes couches.
Six cartes interactives supplémentaires (flux, densité, distance, CH, norme infirmiers, couverture à 1 km). Lien direct : `/cartotheque/#figure-10`.
Les images sont dans `portail/static/portail/img/cartotheque/` ; la liste se modifie dans `portail/catalogue.py`.

**Statistiques** (`/statistiques/`) : uniquement les **analyses spatiales du mémoire**, en 10 sections recalculées à partir de la base
(graphiques et export CSV) : normes et méthode (tableaux 1 et 3) ; couverture par commune (7), taux par poste, typologie des mailles (15),
comparaison aux normes nationales et postes à créer pour atteindre la norme ; accessibilité (tableau 8, distance moyenne / médiane / 90 % calculée
sur une grille de 100 m, population selon la distance) ; aires de desserte (tableau 5, indices, tableau 6, taille des polygones de Thiessen,
aires réelles et administratives) ; typologie (tableaux 10 à 14, charge démographique × classe) ; zones critiques et carte des sites proposés ;
recommandations (tableau 16) ; validation des hypothèses ; indicateurs par poste (17) ; figures des analyses multivariées.
Une dernière section « Sources et fiabilité » indique pour chaque résultat s'il est recalculé depuis la base, repris du mémoire ou approximatif. Les textes et tableaux de référence se modifient dans `portail/catalogue.py`.

**Données** (`/donnees/`) : catalogue des 8 jeux de données (postes, quartiers, communes, aires administratives, réelles et théoriques,
flux de patients, indicateurs par poste). Pour chacun : description, nombre d'éléments, principaux champs, source, **aperçu** des 10 premières lignes,
téléchargement **GeoJSON** (QGIS) ou **CSV** (Excel : point-virgule, virgule décimale, géométrie en WKT) et lien vers la carte.
Liste des adresses d'API (bouton « Copier »), sources et métadonnées (système de coordonnées, enquêtes, normes), citation à copier.
Exports : `/export/<jeu>.geojson`, `/export/<jeu>.csv`, aperçu `/export/<jeu>.json`. Les données individuelles de l'enquête patients ne sont pas diffusées.

**Tableau de bord** (`/tableau-de-bord/`) : uniquement le **suivi opérationnel**, sans reprise de la page Statistiques :
personnel et normes de l'OMS (par commune et par poste, habitants par infirmier, postes conformes), services et équipements, lits par poste,
et enquête auprès des patients (commune, sexe, âge, instruction, transport, distance déclarée, raisons du choix, quartiers de provenance).
Sous chaque graphique de l'enquête : nombre de réponses renseignées ; section « Qualité des données » (variables manquantes et postes concernés).
Les tranches d'âge, saisies selon deux nomenclatures ([20-29] et [21-30]), sont harmonisées : l'âge est ainsi connu pour les 1 920 patients.

**Administration** (`/admin/`) : consultation des tables ; effectifs, lits et position des postes modifiables.

**API JSON/GeoJSON** : `/api/postes/`, `/api/quartiers/`, `/api/aires/<administrative|reelle|theorique>/`, `/api/thiessen/`, `/api/flux/`,
`/api/tampon/?distance=1000&poste=1`, `/api/couverture/`, `/api/proche/?lat=..&lon=..&service=svc_maternite`, `/api/stats/`, `/api/statistiques/`,
`/api/poste/<id>/`, `/api/quartier/<id>/`, `/api/recherche/?q=`.

Thème : toutes les pages partagent `portail/static/portail/css/theme.css` ; le géoportail ajoute `carte.css`.
Le texte du badge utilisateur se règle avec `GEOPORTAIL_PROFIL` dans `config/settings.py`.

## Corrections alignées sur le mémoire (octobre 2026)

La base et l'application reprennent désormais les résultats des chapitres 3 et 4 du mémoire.

**Si la base `monsite_db` est déjà importée** : exécutez uniquement `sql/correctif_memoire.sql` dans pgAdmin (Query Tool), puis relancez `python manage.py runserver`.
Le correctif peut être rejoué sans risque. Une nouvelle installation n'a qu'à exécuter `sql/base_maille_sanitaire_thies.sql`, qui contient déjà le correctif à la fin.

Ce que fait le correctif :
- **28 postes publics** enquêtés : suppression de PS Alafia Thiès (absent du mémoire) ; numéro des cartes (tableau 17) et nom usuel (« PS Thiès Nonè ») ajoutés à chaque poste
- **Aire administrative** : les 68 quartiers rattachés à un poste (28 polygones) ; la table n'en contenait que 45
- **Aire réelle** : quartiers fournissant plus de 5 % des patients d'un poste, attribués au poste dominant : 27 polygones (aucun pour Médina Fall 1), 47,5 km² ; les indices de discordance administrative/réelle obtenus sont ceux du tableau 17 pour les 28 postes. Tous les flux sont conservés dans la nouvelle table `flux_patient`
- **Indicateurs par poste** (`indicateur_poste`) : population et taux de couverture de l'aire théorique (norme 7 714 hab.), type de maille (tableau 15), indices de forme, de décentrement et de discordance, classes K-means et CH (`classe_offre`)
- **Grille de distance** (tableau 8) : grille de 50 m, 21,8 % / 47,5 % / 68,5 % / 83,2 % / 97,6 % de la superficie à moins de 0,5 / 1 / 2 / 3 / 5 km d'un poste
- **Communes** : population RGPH-5 (Thiès Est 166 256, Thiès Nord 136 138, Thiès Ouest 88 859)
- **Ratios** : techniciens supérieurs repris du fichier d'offre (11, dont 8 à Darou Salam) ; **enquête** : réponses vides et durées négatives mises à NULL

Ce qui change dans l'application (sans modifier les gabarits HTML) :
- **Postes de santé étiquetés** sur le géoportail : numéro des cartes du mémoire + nom. Quand deux étiquettes se chevauchent, la moins prioritaire n'affiche que son numéro (le nom apparaît en zoomant). Option « Étiquettes des postes » dans le menu ⋮ de la couche
- Couleur des postes : taux de couverture (norme 7 714), typologie K-means, classification hiérarchique ; taille : population de l'aire théorique
- Fiche d'un poste : couverture, indices et typologie du mémoire ; fiche d'un quartier : poste réel dominant, lignes cliquables
- Tableau de bord : 1 poste pour 13 973 hab., 14 postes sous-dotés, 47,5 % de la superficie à ≤ 1 km, médecins et infirmiers requis, synthèse par commune du tableau 7, colonnes taux / maille / K-means / CH
- Recherche avec ou sans accents ; corrections : filtre commune (étiquettes), fin de mesure au double-clic, tri des colonnes texte, libellés longs des graphiques

## Installation (Windows)

1. **Base de données** : exécutez `sql/base_maille_sanitaire_thies.sql` dans pgAdmin sur `monsite_db` (déjà fait si vous l'avez importé).
2. **GDAL/GEOS** : installez [OSGeo4W](https://trac.osgeo.org/osgeo4w/) (option « Express », paquet *gdal*). Notez le nom exact de la DLL dans `C:\OSGeo4W\bin` (ex. `gdal310.dll`).
3. Dans le dossier du projet :
   ```bat
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   copy .env.example .env
   ```
4. Éditez `.env` : mot de passe PostgreSQL et, sous Windows, les 3 lignes `OSGEO4W_ROOT`, `GDAL_LIBRARY_PATH`, `GEOS_LIBRARY_PATH` (décommentées).
5. Initialisez Django puis lancez :
   ```bat
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py runserver
   ```
6. Ouvrez http://127.0.0.1:8000

`migrate` ne crée que les tables propres à Django (utilisateurs, sessions) dans `monsite_db` ; vos tables de données ne sont pas touchées
(les modèles sont déclarés `managed = False`).

## Structure

```
config/            réglages Django (settings.py lit le fichier .env)
portail/models.py  modèles GeoDjango non gérés (tables existantes)
portail/views.py   pages + API spatiale (requêtes PostGIS)
portail/static/    css, js (carte, tableau de bord), Leaflet et Chart.js embarqués (aucun CDN)
portail/templates/ pages HTML
sql/               script de création de la base
```

## Remarques

- Les fonds de carte nécessitent Internet ; le reste fonctionne hors ligne.
- Mise en production : `DJANGO_DEBUG=False`, une vraie `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, puis `python manage.py collectstatic` et Gunicorn + Nginx (ou WhiteNoise).
- Les techniciens supérieurs sont harmonisés par le correctif (11) ; si une différence réapparaît entre `poste_sante` et `ratio_poste`, le tableau de bord l'indique en note.

## Mode clair / sombre (v9)
Bouton ☀️/🌙 dans l'en-tête de toutes les pages. Le choix est mémorisé dans le navigateur ;
à la première visite, le site suit le réglage clair/sombre de l'ordinateur.
Fichiers : `static/portail/css/theme-clair.css`, script en tête de `base.html`, `GP.appliquerTheme` dans `common.js`
(les graphiques Chart.js changent de couleurs sans recharger la page).

## Localiser le poste le plus proche par les rues (v10)
Géoportail › Outils d'analyse › « 📍 Localiser le poste le plus proche » : depuis votre position (GPS) ou un clic sur la carte,
la distance **par les rues** (réseau OpenStreetMap, moteur OSRM « table ») est calculée vers les 28 postes en un seul appel ;
les 5 plus proches sont classés (distance par les rues, durée, rappel de la distance à vol d'oiseau) et le trajet du premier
est tracé sur la carte. Cliquez une ligne pour tracer un autre poste, 🧭 pour les consignes pas à pas. À pied, en voiture ou à vélo.
Nécessite Internet ; sans connexion, un repli à vol d'oiseau est affiché et signalé.

## Mise en ligne (v11)
Voir **DEPLOIEMENT.md** : base PostGIS chez Neon, site chez Render (Docker, gratuit).
