"""Variables disponibles dans tous les gabarits (en-tete et pied de page du geoportail)."""
from django.conf import settings
from django.core.cache import cache

from .db import ligne


def _maj():
    try:
        r = ligne("SELECT max(date_soumission)::date AS date, count(*) AS n FROM enquete_patient")
        return {"date": r["date"], "n": r["n"]}
    except Exception:          # base indisponible : on n'empeche pas l'affichage de la page
        return {}


def site(request):
    maj = cache.get("site_maj")
    if maj is None:
        maj = _maj()
        if maj:
            cache.set("site_maj", maj, 3600)
    return {
        "INSTITUTION": getattr(settings, "GEOPORTAIL_INSTITUTION", "Ville de Thiès"),
        "LOGO": getattr(settings, "GEOPORTAIL_LOGO", ""),
        "CREDITS": getattr(settings, "GEOPORTAIL_CREDITS", ""),
        "PROFIL": getattr(settings, "GEOPORTAIL_PROFIL", ("Visiteur", "Géoportail santé")),
        "MAJ": maj,
        # numero de version ajoute aux CSS / JS (?v=) : le navigateur recharge les fichiers a chaque nouvelle version
        "VERSION": getattr(settings, "GEOPORTAIL_VERSION", "1"),
        "ROUTAGE_URL": getattr(settings, "GEOPORTAIL_ROUTAGE_URL", "https://routing.openstreetmap.de/routed-{mode}/route/v1/driving/"),
    }
