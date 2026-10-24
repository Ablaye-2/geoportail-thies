"""Configuration du geoportail de la maille sanitaire de Thies."""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# --- GDAL / GEOS sous Windows --------------------------------------------------------------
# 1) Si le fichier .env definit OSGEO4W_ROOT / GDAL_LIBRARY_PATH / GEOS_LIBRARY_PATH, ces valeurs sont utilisees.
# 2) Sinon, sous Windows, on cherche automatiquement QGIS puis OSGeo4W (GDAL <= 3.10, versions gerees par Django 5.2).
def _detecter_gdal(motifs=None):
    """Retourne (chemin_dll_gdal, dossier_bin) ou (None, None)."""
    import glob
    import re
    motifs = motifs or [r"C:\Program Files\QGIS*\bin\gdal*.dll", r"C:\OSGeo4W*\bin\gdal*.dll"]
    for motif in motifs:                                   # QGIS d'abord, puis OSGeo4W
        trouves = []
        for chemin in glob.glob(motif):
            m = re.search(r"gdal(\d{3})\.dll$", chemin, re.I)
            if m and int(m.group(1)) <= 310 and os.path.exists(os.path.join(os.path.dirname(chemin), "geos_c.dll")):
                trouves.append((int(m.group(1)), chemin))
        if trouves:
            chemin = max(trouves)[1]
            return chemin, os.path.dirname(chemin)
    return None, None


_osgeo = os.getenv("OSGEO4W_ROOT")
if _osgeo:
    os.environ["OSGEO4W_ROOT"] = _osgeo
    os.environ["GDAL_DATA"] = os.path.join(_osgeo, "share", "gdal")
    os.environ["PROJ_LIB"] = os.path.join(_osgeo, "share", "proj")
    os.environ["PATH"] = os.path.join(_osgeo, "bin") + os.pathsep + os.environ["PATH"]
if os.getenv("GDAL_LIBRARY_PATH"):
    GDAL_LIBRARY_PATH = os.getenv("GDAL_LIBRARY_PATH")
if os.getenv("GEOS_LIBRARY_PATH"):
    GEOS_LIBRARY_PATH = os.getenv("GEOS_LIBRARY_PATH")
if os.name == "nt" and not os.getenv("GDAL_LIBRARY_PATH"):
    _dll, _bin = _detecter_gdal()
    if _dll:
        _racine = os.path.dirname(_bin)
        os.environ["PATH"] = _bin + os.pathsep + os.environ["PATH"]
        os.environ.setdefault("GDAL_DATA", os.path.join(_racine, "share", "gdal"))
        os.environ.setdefault("PROJ_LIB", os.path.join(_racine, "share", "proj"))
        if hasattr(os, "add_dll_directory"):
            os.add_dll_directory(_bin)
        GDAL_LIBRARY_PATH = _dll
        GEOS_LIBRARY_PATH = os.path.join(_bin, "geos_c.dll")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-insecure-change-me")
DEBUG = os.getenv("DJANGO_DEBUG", "True").lower() in ("1", "true", "yes")
ALLOWED_HOSTS = [h.strip() for h in os.getenv("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost").split(",") if h.strip()]
# --- Mise en ligne (Render, Railway, VPS...) ---
_hote_render = os.getenv("RENDER_EXTERNAL_HOSTNAME")          # fourni automatiquement par Render
if _hote_render and _hote_render not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(_hote_render)
CSRF_TRUSTED_ORIGINS = [o.strip() for o in os.getenv("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",") if o.strip()]
CSRF_TRUSTED_ORIGINS += ["https://" + h for h in ALLOWED_HOSTS if h not in ("127.0.0.1", "localhost", "*") and not h.startswith(".")]
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")   # HTTPS termine par l'hebergeur
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = os.getenv("DJANGO_SSL_REDIRECT", "True").lower() in ("1", "true", "yes")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.gis",
    "portail",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",          # sert les fichiers statiques en production
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "portail.context.site",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME": os.getenv("DB_NAME", "monsite_db"),
        "USER": os.getenv("DB_USER", "postgres"),
        "PASSWORD": os.getenv("DB_PASSWORD", ""),
        "HOST": os.getenv("DB_HOST", "localhost"),
        "PORT": os.getenv("DB_PORT", "5432"),
    }
}
# En ligne : une seule variable DATABASE_URL (ex. postgresql://user:mdp@hote/base?sslmode=require), donnee par Neon / Render
if os.getenv("DATABASE_URL"):
    import dj_database_url
    DATABASES["default"] = dj_database_url.parse(os.environ["DATABASE_URL"], conn_max_age=600, conn_health_checks=True)
    DATABASES["default"]["ENGINE"] = "django.contrib.gis.db.backends.postgis"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
]

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Dakar"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Les fonds de carte OpenStreetMap exigent l'en-tete Referer (sinon erreur 403 « Access blocked »)
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

# --- Habillage du geoportail (en-tete / pied de page) ---
GEOPORTAIL_INSTITUTION = "Ville de Thiès"   # nom affiche sous le titre et dans le pied de page
GEOPORTAIL_LOGO = ""                         # ex. "portail/img/logo.png" (fichier dans portail/static/) ; vide = croix verte
GEOPORTAIL_CREDITS = ""                      # ex. "Réalisé par ... – Université ..." (facultatif)
GEOPORTAIL_PROFIL = ("Étudiant", "Licence 3 · Géomatique")   # texte du badge « utilisateur » en haut à droite de la carte
# Itineraires par les rues (page Geoportail) : serveur OSRM compatible ; {mode} = foot, car ou bike.
# Par defaut, les serveurs FOSSGIS utilises par openstreetmap.org (Internet requis).
GEOPORTAIL_ROUTAGE_URL = os.getenv("GEOPORTAIL_ROUTAGE_URL", "https://routing.openstreetmap.de/routed-{mode}/route/v1/driving/")
