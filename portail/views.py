"""Vues du geoportail : 2 pages (carte, tableau de bord) + API JSON / GeoJSON alimentee par PostGIS.

Conventions
-----------
* Les geometries `quartier` sont stockees en UTM 28N (EPSG:32628, metres) ; les points `poste_sante` en WGS84 (4326).
  Les calculs de distance/surface se font en UTM, la sortie GeoJSON est toujours reprojetee en 4326 (Leaflet).
* Aucun '%' litteral dans le SQL : les motifs ILIKE sont passes en parametres.
"""
import csv
import json

from django.core.cache import cache
from django.http import Http404, HttpResponse, HttpResponseBadRequest
from django.shortcuts import redirect, render
from django.views.decorators.http import require_GET

from . import catalogue as CAT
from .catalogue import (API_DOC, CARTES, CARTES_INTERACTIVES, JEUX_DONNEES, METADONNEES,
                        THEMES_CARTES, THEMES_DONNEES)
from .db import collection, ligne, lignes, reponse

# --------------------------------------------------------------------------- constantes SQL
SERVICES = [
    ("svc_consultation", "Consultation"), ("svc_maternite", "Maternité"), ("svc_pediatrie", "Pédiatrie"),
    ("svc_laboratoire", "Laboratoire"), ("svc_pharmacie", "Pharmacie"), ("svc_imagerie", "Imagerie"),
    ("svc_chirurgie", "Chirurgie"), ("svc_radiologie", "Radiologie"), ("svc_urgences", "Urgences"),
    ("svc_soins_dentaires", "Soins dentaires"), ("svc_consultations_specialisees", "Consultations spécialisées"),
]
SVC_ARRAY = "array_remove(ARRAY[" + ", ".join(
    f"CASE WHEN p.{c} THEN '{lib}' END" for c, lib in SERVICES) + "], NULL)"
SVC_COUNT = " + ".join(f"p.{c}::int" for c, _ in SERVICES)

EQUIPEMENTS = [
    ("nb_lits", "Lits"), ("nb_radiographie", "Appareils de radiographie"), ("nb_echographes", "Échographes"),
    ("nb_scanners", "Scanners"), ("nb_equip_laboratoire", "Équipements de laboratoire"),
    ("nb_respirateurs", "Respirateurs"), ("nb_blocs_operatoires", "Blocs opératoires"),
    ("nb_equip_sterilisation", "Équipements de stérilisation"), ("nb_equip_dentaires", "Équipements dentaires"),
]

# moyen de transport saisi librement -> categories (position() : pas de '%' dans la requete)
TRANSPORT = """CASE
  WHEN moyen_transport IS NULL THEN NULL
  WHEN position('pied' in lower(moyen_transport)) > 0 THEN 'À pied'
  WHEN position('moto' in lower(moyen_transport)) > 0 OR position('roues' in lower(moyen_transport)) > 0 THEN 'Moto / 2 roues'
  WHEN position('taxi' in lower(moyen_transport)) > 0 THEN 'Taxi'
  WHEN position('bus' in lower(moyen_transport)) > 0 OR position('car ' in lower(moyen_transport)) > 0 THEN 'Bus / car'
  WHEN position('voiture' in lower(moyen_transport)) > 0 THEN 'Voiture particulière'
  WHEN position('charrette' in lower(moyen_transport)) > 0 THEN 'Charrette'
  ELSE 'Autre' END"""

AIRES = {  # type -> (table, libelle)
    "administrative": ("aire_administrative", "Aire administrative"),
    "reelle": ("aire_reelle", "Aire réelle (quartiers > 5 % des patients, poste dominant)"),
    "theorique": ("aire_theorique", "Aire théorique (Thiessen)"),
}

SRID_UTM = 32628

# Normes et reperes retenus par le memoire (tableau 1)
NORME_POSTE = 10000         # habitants par poste de sante (repere OMS repris par l'ANSD, 2022 ; memoire v3, tableau 1-1)
NORME_MEDECIN = 10000       # 1 medecin pour 10 000 habitants (OMS, ANSD)
NORME_INFIRMIER = 5000      # 1 infirmier pour 5 000 habitants (OMS, ANSD)
NORME_TECHNICIEN = 5000     # hypothese : alignee sur les infirmiers
RAYON_ACCES_KM = 5          # repere de la litterature (5 km ou 1 heure de marche)
NORMES = {"poste": NORME_POSTE, "medecin": NORME_MEDECIN, "infirmier": NORME_INFIRMIER,
          "technicien": NORME_TECHNICIEN, "rayon_km": RAYON_ACCES_KM}

# nom affiche d'un poste : nom usuel du memoire (« PS Thiès Nonè »), a defaut le nom de la base
NOM_P = "COALESCE('PS ' || p.nom_usuel, p.nom)"


def _float(request, nom, defaut=None, mini=None, maxi=None):
    brut = request.GET.get(nom)
    if brut in (None, ""):
        return defaut
    try:
        v = float(brut)
    except ValueError:
        raise ValueError(f"Parametre invalide : {nom}")
    if mini is not None:
        v = max(mini, v)
    if maxi is not None:
        v = min(maxi, v)
    return v


# --------------------------------------------------------------------------- pages
def _stats_accueil():
    """Chiffres cles de la page d'accueil (mis en cache 1 h : le calcul de couverture est le plus lourd)."""
    pop = ligne("SELECT sum(population_2023) AS n FROM quartier")["n"]
    postes = ligne("SELECT count(*) AS n FROM poste_sante WHERE geom IS NOT NULL")["n"]
    quartiers = ligne("SELECT count(*) AS n FROM quartier")["n"]
    patients = ligne("SELECT count(*) AS n FROM enquete_patient")["n"]
    try:
        couverture = _tampon(1000)["pct_couvert"]
    except Exception:
        couverture = None
    return {"population": pop, "postes": postes, "quartiers": quartiers, "patients": patients, "couverture": couverture}


def accueil(request):
    return render(request, "portail/accueil.html", {"page": "accueil", "stats": cache.get_or_set("accueil_stats", _stats_accueil, 3600)})


def carte(request):
    if request.GET.get("donnees") == "1":          # ancien lien « Donnees » : la fenetre est devenue une page
        return redirect("donnees")
    return render(request, "portail/carte.html", {"page": "carte"})


def tableau_de_bord(request):
    return render(request, "portail/dashboard.html", {"page": "dashboard"})


def cartotheque(request):
    return render(request, "portail/cartotheque.html", {"page": "cartotheque", "cartes": CARTES, "themes": THEMES_CARTES,
                                                        "interactives": CARTES_INTERACTIVES})


def donnees(request):
    comptes = {}
    for sql_, cle in (("SELECT count(*) AS n FROM poste_sante WHERE geom IS NOT NULL", "postes"), ("SELECT count(*) AS n FROM quartier", "quartiers"),
                      ("SELECT count(*) AS n FROM commune", "communes"),
                      ("SELECT count(DISTINCT poste_id) AS n FROM aire_administrative", "aires_administratives"),
                      ("SELECT count(DISTINCT poste_id) AS n FROM aire_reelle", "aires_reelles"),
                      ("SELECT count(*) AS n FROM poste_sante WHERE geom IS NOT NULL", "thiessen"),
                      ("SELECT count(*) AS n FROM flux_patient WHERE pct_flux_poste >= 5", "flux"),
                      ("SELECT count(*) AS n FROM indicateur_poste", "indicateurs")):
        try:
            comptes[cle] = ligne(sql_)["n"]
        except Exception:
            comptes[cle] = None
    jeux = [dict(j, n=comptes.get(j["id"])) for j in JEUX_DONNEES]
    return render(request, "portail/donnees.html", {"page": "donnees", "jeux": jeux, "themes": THEMES_DONNEES,
                                                    "api": API_DOC, "meta": METADONNEES})


def statistiques(request):
    return render(request, "portail/statistiques.html", {
        "page": "statistiques", "normes_memoire": CAT.NORMES_MEMOIRE, "aires_memoire": CAT.AIRES_MEMOIRE,
        "indices_memoire": CAT.INDICES_MEMOIRE, "zones": CAT.ZONES_CRITIQUES,
        "hypotheses": CAT.HYPOTHESES, "fiabilite": CAT.FIABILITE})


# --------------------------------------------------------------------------- meta
@require_GET
def api_meta(request):
    ext = ligne("""SELECT ST_XMin(g) AS ouest, ST_YMin(g) AS sud, ST_XMax(g) AS est, ST_YMax(g) AS nord
                   FROM (SELECT ST_Extent(ST_Transform(geom, 4326))::geometry AS g FROM quartier) t""")
    communes = lignes("SELECT id, nom FROM commune ORDER BY nom")
    return reponse({"etendue": ext, "communes": communes, "normes": NORMES,
                    "aires": {k: v[1] for k, v in AIRES.items()}})


# --------------------------------------------------------------------------- couches vectorielles
POSTES_SQL = f"""
SELECT p.id, {NOM_P} AS nom, p.numero, p.nom_usuel, p.nom AS nom_base, c.nom AS commune,
       p.nb_quartiers_administratifs, p.quartiers_administratifs,
       p.population_administrative AS population,
       p.nb_medecins, p.nb_infirmiers, p.nb_sages_femmes, p.nb_techniciens_sup,
       COALESCE(p.nb_medecins,0) + COALESCE(p.nb_infirmiers,0) + COALESCE(p.nb_sages_femmes,0)
         + COALESCE(p.nb_techniciens_sup,0) AS personnel_total,
       p.nb_lits, p.services_essentiels, {SVC_ARRAY} AS services, ({SVC_COUNT}) AS nb_services,
       p.autres_equipements_precision AS autres_equipements, p.altitude_m,
       r.hab_par_infirmier, r.hab_par_medecin,
       r.medecins_manquants, r.infirmiers_manquants, r.techniciens_manquants,
       r.norme_medecin_respectee, r.norme_infirmier_respectee,
       ip.superficie_theo_km2, ip.population_theorique, ip.taux_couverture, ip.type_maille,
       ip.indice_forme, ip.indice_decentrement, ip.discordance_ta, ip.discordance_ar, ip.discordance_tr,
       ip.classe_kmeans, ck.profil AS profil_kmeans, ip.classe_ch, cc.profil AS profil_ch,
       COALESCE(e.n, 0) AS nb_patients, e.dist_med_km, e.duree_moy_min,
       ST_X(p.geom) AS lon, ST_Y(p.geom) AS lat,
       ST_AsGeoJSON(p.geom, 6) AS geometry
FROM poste_sante p
LEFT JOIN commune c ON c.id = p.commune_id
LEFT JOIN ratio_poste r ON r.poste_id = p.id
LEFT JOIN indicateur_poste ip ON ip.poste_id = p.id
LEFT JOIN classe_offre ck ON ck.code = ip.classe_kmeans
LEFT JOIN classe_offre cc ON cc.code = ip.classe_ch
LEFT JOIN (SELECT poste_id, count(*) AS n,
                  round((percentile_cont(0.5) WITHIN GROUP (ORDER BY distance_km))::numeric, 2) AS dist_med_km,
                  round(avg(duree_trajet_min) FILTER (WHERE duree_trajet_min > 0), 1) AS duree_moy_min
           FROM enquete_patient GROUP BY poste_id) e ON e.poste_id = p.id
WHERE {{where}}
ORDER BY p.numero NULLS LAST, p.nom
"""
POSTES_GEO_SQL = POSTES_SQL.replace("{where}", "p.geom IS NOT NULL")

QUARTIERS_SQL = f"""
SELECT q.id, q.nom, c.nom AS commune, q.arrondissement, q.zone_mere,
       q.population_2023 AS population, q.menages, q.hommes, q.femmes, q.concessions,
       q.superficie_km2, q.densite_hab_km2 AS densite,
       COALESCE('PS ' || pa.nom_usuel, pa.nom) AS poste_administratif, COALESCE('PS ' || pt.nom_usuel, pt.nom) AS poste_theorique,
       COALESCE('PS ' || pr.nom_usuel, pr.nom) AS poste_reel,
       j.pct_reel_dominant, ca.critere_geometrique, ca.critere_accessibilite,
       COALESCE(ar.n, 0) AS nb_patients_enquete,
       nd.poste AS poste_plus_proche, round(nd.dist) AS dist_poste_m,
       ST_AsGeoJSON(ST_Transform(q.geom, 4326), 6) AS geometry
FROM quartier q
LEFT JOIN commune c ON c.id = q.commune_id
LEFT JOIN jointure_qgis j ON j.quartier_id = q.id
LEFT JOIN comparaison_aires ca ON ca.quartier_id = q.id
LEFT JOIN poste_sante pa ON pa.id = j.poste_administratif_id
LEFT JOIN poste_sante pt ON pt.id = j.poste_theorique_id
LEFT JOIN poste_sante pr ON pr.id = j.poste_reel_dominant_id
LEFT JOIN (SELECT quartier_id, sum(nb_patients) AS n FROM flux_patient GROUP BY quartier_id) ar ON ar.quartier_id = q.id
LEFT JOIN LATERAL (
    SELECT {NOM_P} AS poste, ST_Distance(ST_Transform(p.geom, {SRID_UTM}), ST_Centroid(q.geom)) AS dist
    FROM poste_sante p WHERE p.geom IS NOT NULL
    ORDER BY ST_Transform(p.geom, {SRID_UTM}) <-> ST_Centroid(q.geom) LIMIT 1) nd ON TRUE
ORDER BY q.nom
"""


@require_GET
def api_postes(request):
    return reponse(collection(POSTES_GEO_SQL))


@require_GET
def api_quartiers(request):
    return reponse(collection(QUARTIERS_SQL))


@require_GET
def api_aires(request, type_aire):
    if type_aire not in AIRES:
        raise Http404("Type d'aire inconnu")
    data = collection(_aires_sql(type_aire))
    data["libelle"] = AIRES[type_aire][1]
    return reponse(data)


def _aires_sql(type_aire):
    table = AIRES[type_aire][0]  # valeur issue d'une liste blanche : pas d'injection possible
    return f"""
    SELECT p.id, {NOM_P} AS poste, p.numero, c.nom AS commune, count(*) AS nb_quartiers,
           sum(q.population_2023) AS population,
           round(ST_Area(ST_Union(q.geom)) / 10000) AS superficie_ha,
           string_agg(q.nom, ', ' ORDER BY q.nom) AS quartiers,
           ST_AsGeoJSON(ST_Transform(ST_Multi(ST_CollectionExtract(ST_Union(q.geom), 3)), 4326), 6) AS geometry
    FROM {table} a
    JOIN quartier q ON q.id = a.quartier_id
    JOIN poste_sante p ON p.id = a.poste_id
    LEFT JOIN commune c ON c.id = p.commune_id
    GROUP BY p.id, p.nom, p.nom_usuel, p.numero, c.nom
    ORDER BY p.numero NULLS LAST, p.nom"""


@require_GET
def api_thiessen(request):
    """Polygones de Voronoi/Thiessen calcules en direct par PostGIS a partir des postes geolocalises,
    decoupes sur l'emprise de la ville ; population estimee par ponderation surfacique des quartiers."""
    return reponse(collection(THIESSEN_SQL))


THIESSEN_SQL = f"""
    WITH pts AS (
        SELECT p.id, {NOM_P} AS nom, p.numero, ST_Transform(p.geom, {SRID_UTM}) AS g FROM poste_sante p WHERE p.geom IS NOT NULL),
    ext AS (SELECT ST_Buffer(ST_ConvexHull(ST_Collect(geom)), 300) AS g, ST_Union(geom) AS ville FROM quartier),
    vor AS (SELECT (ST_Dump(ST_VoronoiPolygons(ST_Collect(pts.g), 0, (SELECT g FROM ext)))).geom AS g FROM pts),
    cel AS (
        SELECT p.id, p.nom, p.numero,
               ST_CollectionExtract(ST_MakeValid(ST_Intersection(v.g, ext.ville)), 3) AS g
        FROM vor v JOIN pts p ON ST_Contains(v.g, p.g) CROSS JOIN ext)
    SELECT cel.id, cel.nom AS poste, cel.numero, round(ST_Area(cel.g) / 10000) AS superficie_ha,
           (SELECT round(sum(q.population_2023 * ST_Area(ST_Intersection(q.geom, cel.g)) / NULLIF(ST_Area(q.geom), 0)))
              FROM quartier q WHERE ST_Intersects(q.geom, cel.g)) AS population_estimee,
           ip.population_theorique, ip.taux_couverture, ip.type_maille, ip.indice_forme, ip.indice_decentrement,
           ST_AsGeoJSON(ST_Transform(ST_Multi(cel.g), 4326), 6) AS geometry
    FROM cel LEFT JOIN indicateur_poste ip ON ip.poste_id = cel.id
    ORDER BY cel.numero NULLS LAST, cel.nom"""


@require_GET
def api_flux(request):
    """Flux de patients quartier de residence -> poste (au moins 5 % des patients du poste) sous forme de lignes.
    `retenu_aire_reelle` : le quartier fait partie de l'aire reelle du poste (poste dominant du quartier)."""
    return reponse(collection(FLUX_SQL))


FLUX_SQL = f"""
    SELECT f.quartier_id || '-' || f.poste_id AS id, q.id AS quartier_id, q.nom AS quartier, p.id AS poste_id, {NOM_P} AS poste,
           f.nb_patients, f.pct_flux_poste, f.retenu_aire_reelle,
           ST_AsGeoJSON(ST_MakeLine(ST_Transform(ST_PointOnSurface(q.geom), 4326), p.geom), 6) AS geometry
    FROM flux_patient f
    JOIN quartier q ON q.id = f.quartier_id
    JOIN poste_sante p ON p.id = f.poste_id
    WHERE p.geom IS NOT NULL AND f.pct_flux_poste >= 5
    ORDER BY f.nb_patients DESC"""

COMMUNES_SQL = f"""
    SELECT c.id, c.nom AS commune, c.population_2023 AS population_rgph5,
           count(DISTINCT q.id) AS nb_quartiers, sum(q.population_2023) AS population_quartiers,
           (SELECT count(*) FROM poste_sante p WHERE p.commune_id = c.id) AS nb_postes,
           round((ST_Area(ST_Union(q.geom)) / 1e6)::numeric, 2) AS superficie_km2,
           ST_AsGeoJSON(ST_Transform(ST_Multi(ST_CollectionExtract(ST_Union(q.geom), 3)), 4326), 6) AS geometry
    FROM commune c JOIN quartier q ON q.commune_id = c.id
    GROUP BY c.id, c.nom, c.population_2023 ORDER BY c.nom"""

INDICATEURS_SQL = f"""
    SELECT p.id, p.numero, p.nom_usuel AS poste, c.nom AS commune, ip.superficie_theo_km2, ip.population_theorique,
           ip.taux_couverture, ip.type_maille, ip.indice_forme, ip.indice_decentrement, ip.discordance_ta,
           ip.discordance_ar, ip.discordance_tr, ip.classe_kmeans, ip.classe_ch,
           p.population_administrative, p.nb_medecins, p.nb_infirmiers, p.nb_sages_femmes, p.nb_techniciens_sup, p.nb_lits,
           r.hab_par_infirmier, r.norme_infirmier_respectee, r.norme_medecin_respectee,
           ST_AsGeoJSON(p.geom, 6) AS geometry
    FROM poste_sante p JOIN indicateur_poste ip ON ip.poste_id = p.id
    LEFT JOIN commune c ON c.id = p.commune_id LEFT JOIN ratio_poste r ON r.poste_id = p.id
    ORDER BY p.numero"""


# --------------------------------------------------------------------------- analyses spatiales
def _tampon(distance, poste_id=None):
    filtre = "AND id = %s" if poste_id else ""
    sql = f"""
    WITH pts AS (SELECT id, ST_Transform(geom, {SRID_UTM}) AS g FROM poste_sante WHERE geom IS NOT NULL {filtre}),
    buf AS (SELECT ST_Union(ST_Buffer(g, %s)) AS g, count(*) AS nb FROM pts)
    SELECT buf.nb AS nb_postes,
           round((ST_Area(buf.g) / 1000000.0)::numeric, 3) AS superficie_km2,
           (SELECT round(sum(q.population_2023 * LEAST(1, ST_Area(ST_Intersection(q.geom, buf.g)) / NULLIF(ST_Area(q.geom), 0))))
              FROM quartier q WHERE ST_Intersects(q.geom, buf.g)) AS population_couverte,
           (SELECT sum(population_2023) FROM quartier) AS population_totale,
           ST_AsGeoJSON(ST_Transform(buf.g, 4326), 6) AS geometry
    FROM buf"""
    # l'ordre des %s suit le texte SQL : filtre (CTE pts) puis distance (CTE buf)
    params = ([poste_id] if poste_id else []) + [distance]
    r = ligne(sql, params)
    if r and r["population_totale"]:
        r["pct_couvert"] = round(100.0 * (r["population_couverte"] or 0) / r["population_totale"], 1)
    return r


@require_GET
def api_tampon(request):
    try:
        distance = _float(request, "distance", 1000, 50, 15000)
        poste_id = request.GET.get("poste")
        poste_id = int(poste_id) if poste_id else None
    except ValueError as e:
        return HttpResponseBadRequest(str(e))
    r = _tampon(distance, poste_id)
    r["distance_m"] = distance
    r["geometry"] = json.loads(r["geometry"]) if r["geometry"] else None
    return reponse(r)


@require_GET
def api_couverture(request):
    """Courbe de couverture : % de population a moins de X metres d'un poste."""
    serie = []
    for d in (250, 500, 750, 1000, 1500, 2000, 3000, 5000):
        r = _tampon(d)
        serie.append({"distance_m": d, "population_couverte": r["population_couverte"],
                      "pct": r.get("pct_couvert"), "superficie_km2": r["superficie_km2"]})
    return reponse({"serie": serie})


@require_GET
def api_proche(request):
    """Postes les plus proches d'un point (lat/lon) + quartier contenant ce point.
    Parametre optionnel `service` (ex. svc_maternite) : ne garde que les postes qui l'offrent."""
    try:
        lat = _float(request, "lat", None, -90, 90)
        lon = _float(request, "lon", None, -180, 180)
        n = int(_float(request, "n", 3, 1, 10))
    except ValueError as e:
        return HttpResponseBadRequest(str(e))
    if lat is None or lon is None:
        return HttpResponseBadRequest("lat et lon sont requis")
    service = request.GET.get("service", "")
    if service and service not in dict(SERVICES):          # liste blanche : pas d'injection possible
        return HttpResponseBadRequest("Service inconnu")
    filtre = f"AND p.{service}" if service else ""
    postes = lignes(f"""
        WITH pt AS (SELECT ST_SetSRID(ST_MakePoint(%s, %s), 4326) AS g)
        SELECT p.id, {NOM_P} AS nom, p.numero, c.nom AS commune, p.nb_lits, p.nb_medecins, p.nb_infirmiers, p.nb_sages_femmes,
               p.population_administrative AS population, {SVC_ARRAY} AS services,
               round(ST_Distance(p.geom::geography, pt.g::geography)) AS distance_m,
               ST_X(p.geom) AS lon, ST_Y(p.geom) AS lat
        FROM poste_sante p LEFT JOIN commune c ON c.id = p.commune_id CROSS JOIN pt
        WHERE p.geom IS NOT NULL {filtre}
        ORDER BY ST_Distance(p.geom::geography, pt.g::geography) LIMIT %s""", [lon, lat, n])
    for p in postes:  # estimation : detour de 30 % par rapport a la ligne droite, marche a ~4,8 km/h
        p["marche_min"] = max(1, round(float(p["distance_m"]) * 1.3 / 80))
    q = ligne(f"""
        SELECT q.id, q.nom, q.population_2023 AS population, c.nom AS commune
        FROM quartier q LEFT JOIN commune c ON c.id = q.commune_id
        WHERE ST_Contains(q.geom, ST_Transform(ST_SetSRID(ST_MakePoint(%s, %s), 4326), {SRID_UTM}))""", [lon, lat])
    return reponse({"point": {"lat": lat, "lon": lon}, "quartier": q, "service": service or None, "postes": postes})


@require_GET
def api_lieux(request):
    """Liste legere des quartiers avec un point interieur (pour le menu « Choisir mon quartier »)."""
    return reponse({"lieux": lignes("""
        SELECT q.id, q.nom, c.nom AS commune,
               ST_Y(ST_Transform(ST_PointOnSurface(q.geom), 4326)) AS lat,
               ST_X(ST_Transform(ST_PointOnSurface(q.geom), 4326)) AS lon
        FROM quartier q LEFT JOIN commune c ON c.id = q.commune_id ORDER BY q.nom""")})


# --------------------------------------------------------------------------- statistiques enquete
def _stats_enquete(where="TRUE", params=None):
    params = params or []
    ind = ligne(f"""
        SELECT count(*) AS n,
               round(avg(duree_trajet_min) FILTER (WHERE duree_trajet_min > 0), 1) AS duree_moyenne_min,
               percentile_cont(0.5) WITHIN GROUP (ORDER BY duree_trajet_min) FILTER (WHERE duree_trajet_min > 0) AS duree_mediane_min,
               round((percentile_cont(0.5) WITHIN GROUP (ORDER BY distance_km))::numeric, 2) AS distance_mediane_km,
               round(avg(distance_km), 2) AS distance_moyenne_km,
               round(100.0 * count(*) FILTER (WHERE distance_km < 1) / NULLIF(count(distance_km), 0), 1) AS pct_moins_1km,
               round(100.0 * count(*) FILTER (WHERE moyen_transport IS NOT NULL AND position('pied' in lower(moyen_transport)) > 0)
                     / NULLIF(count(moyen_transport), 0), 1) AS pct_a_pied
        FROM enquete_patient WHERE {where}""", params)
    transport = lignes(f"""SELECT {TRANSPORT} AS label, count(*) AS n FROM enquete_patient
                           WHERE {where} AND NULLIF(btrim(moyen_transport), '') IS NOT NULL GROUP BY 1 ORDER BY 2 DESC""", params)
    instruction = lignes(f"""SELECT niveau_instruction AS label, count(*) AS n FROM enquete_patient
                             WHERE {where} AND NULLIF(btrim(niveau_instruction), '') IS NOT NULL GROUP BY 1 ORDER BY 2 DESC""", params)
    rz = ligne(f"""SELECT count(*) AS total,
                          count(*) FILTER (WHERE raison_proximite) AS proximite,
                          count(*) FILTER (WHERE raison_reputation) AS reputation,
                          count(*) FILTER (WHERE raison_disponibilite) AS disponibilite,
                          count(*) FILTER (WHERE raison_competence) AS competence,
                          count(*) FILTER (WHERE raison_autres) AS autres
                   FROM enquete_patient WHERE {where}""", params)
    raisons = [{"label": lib, "n": rz[k]} for k, lib in (
        ("proximite", "Proximité"), ("reputation", "Réputation"), ("disponibilite", "Disponibilité du personnel"),
        ("competence", "Compétence / qualité"), ("autres", "Autres"))]
    provenance = lignes(f"""SELECT quartier_residence_corrige AS label, count(*) AS n FROM enquete_patient
                            WHERE {where} AND NULLIF(btrim(quartier_residence_corrige), '') IS NOT NULL
                            GROUP BY 1 ORDER BY 2 DESC LIMIT 10""", params)
    # donnees renseignees / manquantes (affichees sous chaque graphique)
    renseigne = ligne(f"""SELECT count(*) AS total, count(niveau_instruction) AS instruction,
                                 count(moyen_transport) AS transport, count(distance_km) AS distance,
                                 count(*) FILTER (WHERE duree_trajet_min > 0) AS duree, count(quartier_residence_corrige) AS quartier
                          FROM enquete_patient WHERE {where}""", params)
    distances = ligne(f"""SELECT count(*) FILTER (WHERE distance_km < 1) AS moins_1km,
                                 count(*) FILTER (WHERE distance_km >= 1 AND distance_km <= 3) AS de_1_a_3km,
                                 count(*) FILTER (WHERE distance_km > 3) AS plus_3km
                          FROM enquete_patient WHERE {where}""", params)
    return {"indicateurs": ind, "transport": transport, "instruction": instruction,
            "raisons": raisons, "provenance": provenance, "distances": distances, "renseigne": renseigne}


@require_GET
def api_stats(request):
    kpi = ligne("""
        SELECT count(*) FILTER (WHERE population_administrative IS NOT NULL) AS nb_postes,
               count(*) FILTER (WHERE geom IS NOT NULL) AS nb_postes_geolocalises,
               sum(population_administrative) AS population,
               sum(nb_medecins) AS medecins, sum(nb_infirmiers) AS infirmiers,
               sum(nb_sages_femmes) AS sages_femmes, sum(nb_techniciens_sup) AS techniciens_sup
        FROM poste_sante""")
    kpi["techniciens_sup_ratios"] = ligne("SELECT sum(nb_techniciens_sup) AS n FROM ratio_poste")["n"]
    kpi["nb_quartiers"] = ligne("SELECT count(*) AS n FROM quartier")["n"]
    kpi["superficie_km2"] = ligne("SELECT round((sum(ST_Area(geom)) / 1000000.0)::numeric, 1) AS s FROM quartier")["s"]

    equip = ligne("SELECT " + ", ".join(f"coalesce(sum({c}),0) AS {c}" for c, _ in EQUIPEMENTS) + " FROM poste_sante")
    equipements = [{"label": lib, "n": equip[c]} for c, lib in EQUIPEMENTS]

    sv = ligne("SELECT " + ", ".join(f"sum({c}::int) AS {c}" for c, _ in SERVICES) + " FROM poste_sante p")
    services = sorted(({"label": lib, "n": sv[c]} for c, lib in SERVICES), key=lambda x: -x["n"])

    # synthese par commune (tableau 7 du memoire : population RGPH-5 de la commune rapportee aux postes)
    par_commune = lignes(f"""
        SELECT v.commune, v.nb_postes, v.population, c.population_2023 AS population_rgph,
               round(c.population_2023::numeric / NULLIF(v.nb_postes, 0)) AS hab_par_poste,
               round(c.population_2023::numeric / NULLIF(v.nb_postes, 0) / {NORME_POSTE}, 1) AS ratio_norme_poste,
               (SELECT count(*) FROM indicateur_poste ip JOIN poste_sante p ON p.id = ip.poste_id
                 WHERE p.commune_id = c.id AND ip.type_maille <> 'Conforme') AS postes_sous_dotes,
               v.medecins, v.infirmiers, v.techniciens_sup, v.hab_par_medecin, v.hab_par_infirmier,
               (SELECT sum(nb_sages_femmes) FROM poste_sante p WHERE p.commune_id = c.id) AS sages_femmes,
               (SELECT sum(nb_lits) FROM poste_sante p WHERE p.commune_id = c.id) AS lits,
               (SELECT count(*) FROM enquete_patient e JOIN poste_sante p ON p.id = e.poste_id WHERE p.commune_id = c.id) AS patients
        FROM v_ratio_commune v JOIN commune c ON c.nom = v.commune ORDER BY v.commune""")

    postes = lignes(f"""
        SELECT p.id, p.numero, {NOM_P} AS nom, c.nom AS commune, p.population_administrative AS population,
               p.nb_medecins, p.nb_infirmiers, p.nb_sages_femmes, p.nb_techniciens_sup, p.nb_lits,
               r.hab_par_infirmier, r.hab_par_medecin, r.medecins_manquants, r.infirmiers_manquants,
               r.techniciens_manquants, r.norme_medecin_respectee, r.norme_infirmier_respectee,
               r.infirmiers_requis, r.ecart_infirmiers, r.classe_infirmier,
               ip.population_theorique, ip.taux_couverture, ip.type_maille, ip.classe_kmeans, ip.classe_ch,
               ip.indice_forme, ip.indice_decentrement, ip.discordance_ta, ip.discordance_ar, ip.discordance_tr,
               (SELECT count(*) FROM enquete_patient e WHERE e.poste_id = p.id) AS patients
        FROM poste_sante p JOIN commune c ON c.id = p.commune_id LEFT JOIN ratio_poste r ON r.poste_id = p.id
        LEFT JOIN indicateur_poste ip ON ip.poste_id = p.id
        ORDER BY p.numero NULLS LAST, p.nom""")

    normes = ligne("""
        SELECT count(*) AS n,
               count(*) FILTER (WHERE norme_medecin_respectee) AS medecin_ok,
               count(*) FILTER (WHERE norme_infirmier_respectee) AS infirmier_ok,
               count(*) FILTER (WHERE norme_technicien_respectee) AS technicien_ok,
               sum(medecins_manquants) AS medecins_manquants, sum(infirmiers_manquants) AS infirmiers_manquants,
               sum(techniciens_manquants) AS techniciens_manquants
        FROM ratio_poste""")

    # part des postes disposant d'au moins un equipement donne (cartes « Equipements sanitaires »)
    ep = ligne("""
        SELECT count(*) AS n, coalesce(sum(nb_lits), 0) AS lits_total,
               count(*) FILTER (WHERE nb_lits > 0) AS lits,
               count(*) FILTER (WHERE nb_echographes > 0) AS echographes,
               count(*) FILTER (WHERE nb_respirateurs > 0) AS respirateurs,
               count(*) FILTER (WHERE nb_equip_sterilisation > 0) AS sterilisation,
               count(*) FILTER (WHERE nb_equip_laboratoire > 0) AS laboratoire,
               count(*) FILTER (WHERE nb_radiographie > 0) AS radiographie,
               count(*) FILTER (WHERE autres_equipements) AS autres
        FROM poste_sante WHERE population_administrative IS NOT NULL""")
    kpi["lits_total"] = ep["lits_total"]
    kpi["couverture_1km"] = cache.get_or_set("couverture_1km", lambda: _tampon(1000).get("pct_couvert"), 3600)
    kpi["nb_communes"] = ligne("SELECT count(*) AS n FROM commune")["n"]

    # indicateurs du memoire (chapitre 4)
    kpi["population_rgph"] = ligne("SELECT sum(population_2023) AS n FROM commune")["n"]
    kpi["hab_par_poste"] = round(kpi["population_rgph"] / kpi["nb_postes"]) if kpi["population_rgph"] and kpi["nb_postes"] else None
    kpi["norme_poste"] = NORME_POSTE
    pop_adm = kpi["population"] or 0
    kpi["medecins_requis"] = round(pop_adm / NORME_MEDECIN)
    kpi["infirmiers_requis"] = round(pop_adm / NORME_INFIRMIER)
    kpi["hab_par_infirmier"] = round(pop_adm / kpi["infirmiers"]) if kpi["infirmiers"] else None
    mailles = lignes("""SELECT type_maille AS label, count(*) AS n, min(taux_couverture) AS taux_min
                        FROM indicateur_poste GROUP BY 1 ORDER BY min(taux_couverture) DESC""")
    kpi["postes_sous_dotes"] = sum(m["n"] for m in mailles if m["label"] != "Conforme")
    g = ligne("SELECT pct_cumule FROM grille_distance WHERE distance_max_m = 1000")
    kpi["superficie_1km_pct"] = g["pct_cumule"] if g else None
    classes = lignes("""SELECT c.code, c.methode, c.profil, count(ip.poste_id) AS n,
                               string_agg(p.nom_usuel, ', ' ORDER BY p.numero) AS postes
                        FROM classe_offre c
                        LEFT JOIN indicateur_poste ip ON ip.classe_kmeans = c.code OR ip.classe_ch = c.code
                        LEFT JOIN poste_sante p ON p.id = ip.poste_id
                        GROUP BY c.code, c.methode, c.profil ORDER BY c.code""")
    equip_pct = [{"cle": c, "label": lib, "n": ep[c], "pct": round(100.0 * ep[c] / ep["n"]) if ep["n"] else 0}
                 for c, lib in (("echographes", "Échographes"), ("respirateurs", "Respirateurs"),
                                ("sterilisation", "Stérilisateurs"), ("autres", "Autres équipements"),
                                ("lits", "Postes avec lits"), ("laboratoire", "Labo."), ("radiographie", "Radio."))]

    # qualite des donnees (tableau de bord)
    qualite = {
        "instruction_par_poste": lignes("""SELECT p.nom_usuel AS nom, count(*) FILTER (WHERE e.niveau_instruction IS NULL) AS manquants, count(*) AS total
                                           FROM enquete_patient e JOIN poste_sante p ON p.id = e.poste_id GROUP BY p.nom_usuel, p.numero
                                           HAVING count(*) FILTER (WHERE e.niveau_instruction IS NULL) > 0 ORDER BY 2 DESC, p.numero"""),
        "duree_zero": ligne("SELECT count(*) AS n FROM enquete_patient WHERE duree_trajet_min = 0")["n"],
        "duree_vide": ligne("SELECT count(*) AS n FROM enquete_patient WHERE duree_trajet_min IS NULL")["n"],
        "hors_decoupage": ligne("SELECT coalesce(sum(nb_patients), 0) AS n FROM patient_non_rattache")["n"],
        "postes_incomplets": ligne("""SELECT count(*) AS n FROM poste_sante WHERE nb_medecins IS NULL OR nb_infirmiers IS NULL OR nb_sages_femmes IS NULL
                                      OR nb_lits IS NULL OR geom IS NULL OR svc_consultation IS NULL""")["n"],
    }
    return reponse({
        "kpi": kpi, "equip_pct": equip_pct, "qualite": qualite, "equipements": equipements, "services": services, "par_commune": par_commune,
        "postes": postes, "normes": normes, "normes_ref": NORMES, "enquete": _stats_enquete(),
        "mailles": mailles, "classes": classes,
        "concordance": lignes("SELECT * FROM superficie_synthese ORDER BY croisement"),
        "grille_distance": lignes("SELECT * FROM grille_distance ORDER BY ordre"),
    })


# --------------------------------------------------------------------------- fiches detail
@require_GET
def api_poste(request, pk):
    fc = collection(POSTES_SQL.replace("{where}", "p.id = %s"), [pk])
    if not fc["features"]:
        raise Http404("Poste introuvable")
    f = fc["features"][0]
    aires = {}
    for cle, (table, lib) in AIRES.items():
        aires[cle] = [r["nom"] for r in lignes(
            f"SELECT q.nom FROM {table} a JOIN quartier q ON q.id = a.quartier_id WHERE a.poste_id = %s ORDER BY q.nom", [pk])]
    return reponse({"poste": f["properties"], "aires": aires, "normes": NORMES,
                    "enquete": _stats_enquete("poste_id = %s", [pk])})


@require_GET
def api_quartier(request, pk):
    # requete dediee (plus lisible que de manipuler QUARTIERS_SQL)
    q = ligne(f"""
        SELECT q.id, q.nom, c.nom AS commune, q.arrondissement, q.population_2023 AS population,
               q.hommes, q.femmes, q.menages, q.concessions, q.superficie_km2, q.densite_hab_km2 AS densite
        FROM quartier q LEFT JOIN commune c ON c.id = q.commune_id WHERE q.id = %s""", [pk])
    if not q:
        raise Http404("Quartier introuvable")
    q["postes_frequentes"] = lignes(f"""
        SELECT p.id AS poste_id, {NOM_P} AS poste, a.nb_patients, a.pct_flux_poste, a.retenu_aire_reelle
        FROM flux_patient a JOIN poste_sante p ON p.id = a.poste_id
        WHERE a.quartier_id = %s AND a.pct_flux_poste >= 5 ORDER BY a.nb_patients DESC""", [pk])
    q["poste_administratif"] = [r["nom"] for r in lignes(
        f"SELECT {NOM_P} AS nom FROM aire_administrative a JOIN poste_sante p ON p.id = a.poste_id WHERE a.quartier_id = %s", [pk])]
    q["poste_theorique"] = [r["nom"] for r in lignes(
        f"SELECT {NOM_P} AS nom FROM aire_theorique a JOIN poste_sante p ON p.id = a.poste_id WHERE a.quartier_id = %s", [pk])]
    q["poste_reel"] = [r["nom"] for r in lignes(
        f"SELECT {NOM_P} AS nom FROM aire_reelle a JOIN poste_sante p ON p.id = a.poste_id WHERE a.quartier_id = %s", [pk])]
    q["plus_proches"] = lignes(f"""
        SELECT p.id, {NOM_P} AS nom, round(ST_Distance(ST_Transform(p.geom, {SRID_UTM}), ST_Centroid(z.geom))) AS distance_m
        FROM poste_sante p, quartier z WHERE z.id = %s AND p.geom IS NOT NULL
        ORDER BY ST_Transform(p.geom, {SRID_UTM}) <-> ST_Centroid(z.geom) LIMIT 3""", [pk])
    return reponse(q)


# --------------------------------------------------------------------------- recherche & export
@require_GET
def api_recherche(request):
    terme = request.GET.get("q", "").strip()
    if len(terme) < 2:
        return reponse({"resultats": []})
    motif = "%" + terme.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
    res = lignes(f"""
        SELECT 'poste' AS type, p.id, {NOM_P} AS nom, ST_Y(p.geom) AS lat, ST_X(p.geom) AS lon
        FROM poste_sante p WHERE p.geom IS NOT NULL AND (p.nom ILIKE %s OR p.nom_usuel ILIKE %s)
        UNION ALL
        SELECT 'quartier', id, nom, ST_Y(ST_Transform(ST_PointOnSurface(geom), 4326)),
               ST_X(ST_Transform(ST_PointOnSurface(geom), 4326))
        FROM quartier WHERE nom ILIKE %s
        ORDER BY type, nom LIMIT 15""", [motif, motif, motif])
    return reponse({"resultats": res})


def _sources_export():
    return {"postes": POSTES_GEO_SQL, "quartiers": QUARTIERS_SQL, "communes": COMMUNES_SQL,
            "aires_administratives": _aires_sql("administrative"), "aires_reelles": _aires_sql("reelle"),
            "aires_theoriques_quartiers": _aires_sql("theorique"), "thiessen": THIESSEN_SQL,
            "flux": FLUX_SQL, "indicateurs": INDICATEURS_SQL}


def _cellule_csv(v):
    """Excel en francais : virgule decimale ; listes jointes ; booleens en oui / non."""
    import decimal
    if isinstance(v, list):
        return "; ".join(str(x) for x in v)
    if isinstance(v, bool):
        return "oui" if v else "non"
    if isinstance(v, (float, decimal.Decimal)):
        return str(v).replace(".", ",")
    return v


def _wkt(g):
    if not g:
        return ""
    try:
        from django.contrib.gis.geos import GEOSGeometry
        return GEOSGeometry(json.dumps(g)).wkt
    except Exception:          # GEOS indisponible : on garde le GeoJSON en texte
        return json.dumps(g)


@require_GET
def export_couche(request, couche, fmt):
    """Exports des jeux de donnees : .geojson (QGIS), .csv (Excel ; geometrie en WKT, EPSG:4326) ou .json (apercu : 10 lignes)."""
    sources = _sources_export()
    if couche not in sources or fmt not in ("geojson", "csv", "json"):
        raise Http404("Export inconnu")
    fc = collection(sources[couche])
    if fmt == "json":
        lignes_ = [f["properties"] for f in fc["features"]]
        return reponse({"couche": couche, "total": len(lignes_), "lignes": lignes_[:10]})
    if fmt == "geojson":
        fc["name"] = couche + "_thies"
        fc["crs"] = {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}}
        rep = HttpResponse(json.dumps(fc, ensure_ascii=False, default=float), content_type="application/geo+json")
    else:
        rep = HttpResponse(content_type="text/csv; charset=utf-8")
        rep.write("\ufeff")  # BOM : ouverture correcte dans Excel
        props = [dict(f["properties"], geometrie_wkt=_wkt(f["geometry"])) for f in fc["features"]]
        if props:
            w = csv.DictWriter(rep, fieldnames=list(props[0].keys()), delimiter=";")
            w.writeheader()
            for p in props:
                w.writerow({k: _cellule_csv(v) for k, v in p.items()})
    rep["Content-Disposition"] = f'attachment; filename="{couche}_thies.{fmt}"'
    return rep


# --------------------------------------------------------------------------- page Statistiques (tableaux du memoire)
def _calc_distance_grille():
    """Distance a vol d'oiseau de chaque point d'une grille de 100 m au poste le plus proche (section 3.5)."""
    return ligne(f"""
        WITH v AS (SELECT ST_Union(geom) AS g FROM quartier),
        pts AS (SELECT ST_Centroid(s.geom) AS g FROM v, ST_SquareGrid(100, v.g) s WHERE ST_Intersects(ST_Centroid(s.geom), v.g)),
        d AS (SELECT (SELECT min(ST_Distance(pts.g, ST_Transform(p.geom, {SRID_UTM}))) FROM poste_sante p WHERE p.geom IS NOT NULL) AS d FROM pts)
        SELECT round((avg(d) / 1000)::numeric, 1) AS moyenne_km,
               round((percentile_cont(0.5) WITHIN GROUP (ORDER BY d) / 1000)::numeric, 1) AS mediane_km,
               round((percentile_cont(0.9) WITHIN GROUP (ORDER BY d) / 1000)::numeric, 1) AS p90_km,
               round((max(d) / 1000)::numeric, 1) AS max_km FROM d""")


def _distance_grille():
    try:
        return cache.get_or_set("distance_grille", _calc_distance_grille, 3600)
    except Exception:          # PostGIS < 3.1 (ST_SquareGrid absent) : valeurs du memoire
        return {"moyenne_km": 1.6, "mediane_km": 1.1, "p90_km": 3.7, "max_km": None}


def _stat_desc(valeurs):
    v = sorted(float(x) for x in valeurs if x is not None)
    if not v:
        return {"moyenne": None, "mediane": None, "n": 0}
    n = len(v)
    med = v[n // 2] if n % 2 else (v[n // 2 - 1] + v[n // 2]) / 2
    return {"moyenne": round(sum(v) / n, 2), "mediane": round(med, 2), "n": n}


@require_GET
def api_statistiques(request):
    """Tableaux 3-1 a 3-7, 3-11, 3-12 et annexe A-1 du memoire (version 3), recalcules a partir de la base."""
    # tableau 3-1 : personnel et lits par commune
    offre = lignes("""
        SELECT c.nom AS commune, count(*) AS postes, sum(p.nb_medecins) AS medecins, sum(p.nb_infirmiers) AS infirmiers,
               sum(p.nb_sages_femmes) AS sages_femmes, sum(p.nb_techniciens_sup) AS techniciens, sum(p.nb_lits) AS lits
        FROM poste_sante p JOIN commune c ON c.id = p.commune_id GROUP BY c.nom ORDER BY c.nom""")
    tot = {"commune": "Total"}
    for k in ("postes", "medecins", "infirmiers", "sages_femmes", "techniciens", "lits"):
        tot[k] = sum(r[k] or 0 for r in offre)
    offre.append(tot)
    services = sorted(({"label": lib, "n": ligne(f"SELECT count(*) FILTER (WHERE {c}) AS n FROM poste_sante")["n"]} for c, lib in SERVICES),
                      key=lambda x: -x["n"])

    # tableau 3-4 : couverture theorique par commune
    couverture = lignes(f"""
        SELECT c.nom AS commune, count(*) AS postes, round(sum(ip.superficie_theo_km2), 1) AS superficie_km2,
               c.population_2023 AS population, round(c.population_2023::numeric / count(*)) AS hab_par_poste,
               round(c.population_2023::numeric / count(*) / {NORME_POSTE}, 1) AS ratio_norme,
               count(*) FILTER (WHERE ip.type_maille <> 'Conforme') AS sous_dotes,
               round(c.population_2023::numeric / NULLIF(sum(ip.superficie_theo_km2), 0)) AS densite
        FROM poste_sante p JOIN commune c ON c.id = p.commune_id JOIN indicateur_poste ip ON ip.poste_id = p.id
        GROUP BY c.id, c.nom, c.population_2023 ORDER BY c.nom""")
    t = {"commune": "Ville de Thiès", "postes": sum(r["postes"] for r in couverture),
         "superficie_km2": round(sum(float(r["superficie_km2"] or 0) for r in couverture), 1),
         "population": sum(r["population"] or 0 for r in couverture), "sous_dotes": sum(r["sous_dotes"] for r in couverture)}
    t["hab_par_poste"] = round(t["population"] / t["postes"]) if t["postes"] else None
    t["ratio_norme"] = round(t["population"] / t["postes"] / NORME_POSTE, 1) if t["postes"] else None
    t["densite"] = round(t["population"] / t["superficie_km2"]) if t["superficie_km2"] else None
    couverture.append(t)

    # tableau 3-5 : part de la superficie a proximite d'un poste
    grille = lignes("SELECT classe_de_distance, distance_max_m, pct_du_territoire, pct_cumule FROM grille_distance ORDER BY ordre")

    # tableau 3-2 : concordance / discordance en superficie (km2) ; « sans donnee » = reste de la ville
    ville = float(ligne("SELECT sum(ST_Area(geom)) / 1e6 AS s FROM quartier")["s"])
    concordance = []
    for r in lignes("SELECT * FROM superficie_synthese ORDER BY pct_concordance DESC"):
        sup = float(r["superficie_ha"]) / 100
        concordance.append({"croisement": r["croisement"], "concordance_km2": round(float(r["concordance_ha"]) / 100, 2),
                            "discordance_km2": round(float(r["discordance_ha"]) / 100, 2),
                            "sans_donnee_km2": round(max(0.0, ville - sup), 2) if "elle" in r["croisement"] else 0.0,
                            "pct_concordance": round(100 * float(r["pct_concordance"]), 1),
                            "pct_discordance": round(100 * float(r["pct_discordance"]), 1)})

    # annexe A-1 : indicateurs par poste
    postes = lignes(f"""
        SELECT p.id, p.numero, p.nom_usuel AS nom, c.nom AS commune, ip.superficie_theo_km2, ip.population_theorique,
               ip.taux_couverture, ip.type_maille, ip.indice_forme, ip.indice_decentrement,
               ip.discordance_ta, ip.discordance_ar, ip.discordance_tr, ip.classe_kmeans, ip.classe_ch,
               p.population_administrative, p.nb_infirmiers, p.nb_medecins, r.hab_par_infirmier
        FROM poste_sante p JOIN commune c ON c.id = p.commune_id
        JOIN indicateur_poste ip ON ip.poste_id = p.id LEFT JOIN ratio_poste r ON r.poste_id = p.id
        ORDER BY p.numero""")
    indices = {k: _stat_desc([p[k] for p in postes]) for k in
               ("indice_forme", "indice_decentrement", "discordance_ta", "discordance_ar", "discordance_tr")}

    # section 3.4 : typologie des mailles
    mailles = []
    for typ, cond in (("Fortement sous-dotée", "> 2"), ("Sous-dotée", "1 à 2"), ("Conforme", "≤ 1")):
        l = sorted((p for p in postes if p["type_maille"] == typ), key=lambda p: -float(p["taux_couverture"]))
        mailles.append({"type": typ, "taux": cond, "n": len(l), "postes": [p["nom"] for p in l]})

    # tableau 3-7 : postes les plus deficitaires en infirmiers
    deficit = sorted((p for p in postes if p["nb_infirmiers"]), key=lambda p: p["nb_infirmiers"] - p["population_administrative"] / NORME_INFIRMIER)[:5]
    deficit = [{"nom": p["nom"], "population": p["population_administrative"], "infirmiers": p["nb_infirmiers"],
                "requis": round(p["population_administrative"] / NORME_INFIRMIER), "hab_par_infirmier": p["hab_par_infirmier"]}
               for p in deficit]

    # tableaux 3-10 a 3-12 : classes et croisement K-means x CAH
    classes = lignes("""SELECT c.code, c.methode, c.profil, count(ip.poste_id) AS n,
                               string_agg(p.nom_usuel, ', ' ORDER BY p.numero) AS postes
                        FROM classe_offre c
                        LEFT JOIN indicateur_poste ip ON ip.classe_kmeans = c.code OR ip.classe_ch = c.code
                        LEFT JOIN poste_sante p ON p.id = ip.poste_id
                        GROUP BY c.code, c.methode, c.profil ORDER BY c.methode DESC, c.code""")
    croisement = {}
    for p in postes:
        croisement.setdefault(p["classe_kmeans"], {}).setdefault(p["classe_ch"], 0)
        croisement[p["classe_kmeans"]][p["classe_ch"]] += 1

    # enquete patients (section 3.5)
    e = ligne("""
        SELECT count(distance_km) AS n,
               round(100.0 * count(*) FILTER (WHERE distance_km < 1) / count(distance_km), 1) AS moins_1km,
               round(100.0 * count(*) FILTER (WHERE distance_km >= 1 AND distance_km <= 3) / count(distance_km), 1) AS de_1_a_3km,
               round(100.0 * count(*) FILTER (WHERE distance_km > 3) / count(distance_km), 1) AS plus_3km,
               round(100.0 * count(*) FILTER (WHERE distance_km > 5) / count(distance_km), 1) AS plus_5km,
               count(duree_trajet_min) FILTER (WHERE duree_trajet_min > 0) AS n_duree,
               round(100.0 * count(*) FILTER (WHERE duree_trajet_min > 0 AND duree_trajet_min <= 10)
                     / NULLIF(count(*) FILTER (WHERE duree_trajet_min > 0), 0), 1) AS duree_10min
        FROM enquete_patient""")
    enquete = _stats_enquete()
    n = enquete["indicateurs"]["n"] or 1
    nt = sum(x["n"] for x in enquete["transport"]) or 1
    enquete_resume = {
        "distances": e, "indicateurs": enquete["indicateurs"],
        "transport": [{"label": x["label"], "pct": round(100.0 * x["n"] / nt, 1)} for x in enquete["transport"]],
        "raisons": [{"label": x["label"], "pct": round(100.0 * x["n"] / n, 1)} for x in enquete["raisons"]],
    }
    # besoins en postes (section 5.2.1) : population communale / norme, arrondi au poste superieur
    besoins = [{"commune": r["commune"], "postes": r["postes"], "population": r["population"],
                "requis_norme": -(-r["population"] // NORME_POSTE)}
               for r in couverture if r["commune"] != "Ville de Thiès"]
    besoins.append({"commune": "Ville de Thiès", "postes": sum(b["postes"] for b in besoins), "population": sum(b["population"] for b in besoins),
                    "requis_norme": sum(b["requis_norme"] for b in besoins)})
    for b in besoins:
        b["manque_norme"] = b["requis_norme"] - b["postes"]

    # polygones de Thiessen : tailles (section 3.2)
    thiessen = ligne("""SELECT round(avg(superficie_theo_km2), 1) AS moyenne, percentile_cont(0.5) WITHIN GROUP (ORDER BY superficie_theo_km2) AS mediane,
                               min(superficie_theo_km2) AS mini, max(superficie_theo_km2) AS maxi, round(sum(superficie_theo_km2), 1) AS total,
                               count(*) FILTER (WHERE superficie_theo_km2 > 7) AS grands,
                               round(100 * sum(superficie_theo_km2) FILTER (WHERE superficie_theo_km2 > 7) / sum(superficie_theo_km2)) AS pct_grands
                        FROM indicateur_poste""")
    thiessen["par_commune"] = lignes("""SELECT c.nom AS commune, round(avg(ip.superficie_theo_km2), 1) AS moyenne
                                        FROM indicateur_poste ip JOIN poste_sante p ON p.id = ip.poste_id JOIN commune c ON c.id = p.commune_id
                                        GROUP BY c.nom ORDER BY c.nom""")
    # aires reelles comparees aux aires administratives
    ar = lignes("""WITH a AS (SELECT poste_id, ST_Area(ST_Union(q.geom)) / 1e6 AS s FROM aire_administrative x JOIN quartier q ON q.id = x.quartier_id GROUP BY 1),
                        r AS (SELECT poste_id, ST_Area(ST_Union(q.geom)) / 1e6 AS s FROM aire_reelle x JOIN quartier q ON q.id = x.quartier_id GROUP BY 1)
                   SELECT p.nom_usuel AS nom, round(a.s::numeric, 2) AS adm_km2, round(r.s::numeric, 2) AS reel_km2
                   FROM a JOIN poste_sante p ON p.id = a.poste_id LEFT JOIN r USING (poste_id) ORDER BY p.numero""")
    for x in ar:
        x["adm_km2"] = float(x["adm_km2"]); x["reel_km2"] = None if x["reel_km2"] is None else float(x["reel_km2"])
    reel_vs_adm = {"plus_petite": [x["nom"] for x in ar if x["reel_km2"] is not None and x["reel_km2"] < x["adm_km2"] - 0.01],
                   "plus_grande": [x["nom"] for x in ar if x["reel_km2"] is not None and x["reel_km2"] > x["adm_km2"] + 0.01],
                   "identique": [x["nom"] for x in ar if x["reel_km2"] is not None and abs(x["reel_km2"] - x["adm_km2"]) <= 0.01],
                   "sans": [x["nom"] for x in ar if x["reel_km2"] is None],
                   "superficie_reelle_km2": float(ligne("SELECT round((ST_Area(ST_Union(q.geom)) / 1e6)::numeric, 1) AS s FROM aire_reelle a JOIN quartier q ON q.id = a.quartier_id")["s"])}
    # croisement charge demographique x typologie (section 3.8)
    maille_classe = lignes("SELECT type_maille, classe_kmeans, classe_ch, count(*) AS n FROM indicateur_poste GROUP BY 1, 2, 3")

    return reponse({"offre": offre, "services": services, "couverture": couverture, "grille": grille,
                    "besoins": besoins, "thiessen": thiessen, "reel_vs_adm": reel_vs_adm, "maille_classe": maille_classe,
                    "distance_grille": _distance_grille(), "sites": CAT.SITES_PROPOSES, "comparaisons": CAT.COMPARAISONS,
                    "concordance": concordance, "superficie_ville_km2": round(ville, 1), "postes": postes, "indices": indices,
                    "mailles": mailles, "deficit_infirmiers": deficit, "classes": classes, "croisement": croisement,
                    "enquete": enquete_resume, "normes": NORMES})
