from django.urls import path
from django.views.generic import RedirectView

from . import views

urlpatterns = [
    path("", views.accueil, name="accueil"),
    path("geoportail/", views.carte, name="geoportail"),
    path("cartotheque/", views.cartotheque, name="cartotheque"),
    path("statistiques/", views.statistiques, name="statistiques"),
    path("donnees/", views.donnees, name="donnees"),
    path("tableau-de-bord/", views.tableau_de_bord, name="dashboard"),
    # anciennes adresses : redirigees vers le geoportail (liens et favoris existants)
    path("carte/", RedirectView.as_view(pattern_name="geoportail", query_string=True), name="carte"),
    path("trouver-un-poste/", RedirectView.as_view(pattern_name="geoportail", query_string=True)),
    # API
    path("api/meta/", views.api_meta, name="api_meta"),
    path("api/postes/", views.api_postes, name="api_postes"),
    path("api/quartiers/", views.api_quartiers, name="api_quartiers"),
    path("api/aires/<str:type_aire>/", views.api_aires, name="api_aires"),
    path("api/thiessen/", views.api_thiessen, name="api_thiessen"),
    path("api/flux/", views.api_flux, name="api_flux"),
    path("api/tampon/", views.api_tampon, name="api_tampon"),
    path("api/couverture/", views.api_couverture, name="api_couverture"),
    path("api/lieux/", views.api_lieux, name="api_lieux"),
    path("api/proche/", views.api_proche, name="api_proche"),
    path("api/stats/", views.api_stats, name="api_stats"),
    path("api/statistiques/", views.api_statistiques, name="api_statistiques"),
    path("api/poste/<int:pk>/", views.api_poste, name="api_poste"),
    path("api/quartier/<int:pk>/", views.api_quartier, name="api_quartier"),
    path("api/recherche/", views.api_recherche, name="api_recherche"),
    path("export/<str:couche>.<str:fmt>", views.export_couche, name="export"),
]
