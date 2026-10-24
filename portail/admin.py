from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin

from .models import Commune, EnquetePatient, IndicateurPoste, PosteSante, Quartier, RatioPoste


class LectureSeule(GISModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Commune)
class CommuneAdmin(LectureSeule):
    list_display = ("id", "nom", "population_2023")


@admin.register(PosteSante)
class PosteSanteAdmin(GISModelAdmin):
    """Modifiable (effectifs, lits, position) ; ni ajout ni suppression : la cle `id` n'est pas auto-incrementee."""
    list_display = ("numero", "nom", "nom_usuel", "commune", "population_administrative", "nb_medecins", "nb_infirmiers", "nb_lits")
    list_display_links = ("nom",)
    list_filter = ("commune",)
    search_fields = ("nom", "nom_usuel")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Quartier)
class QuartierAdmin(LectureSeule):
    list_display = ("nom", "commune", "population_2023", "superficie_km2", "densite_hab_km2")
    list_filter = ("commune",)
    search_fields = ("nom",)


@admin.register(RatioPoste)
class RatioPosteAdmin(LectureSeule):
    list_display = ("poste", "population_administrative", "nb_medecins", "nb_infirmiers", "hab_par_infirmier")


@admin.register(EnquetePatient)
class EnquetePatientAdmin(LectureSeule):
    list_display = ("ligne_feuille", "poste", "age", "sexe", "moyen_transport", "distance_km", "duree_trajet_min")
    list_filter = ("poste__commune", "sexe")
    search_fields = ("poste__nom", "quartier_residence_corrige")


@admin.register(IndicateurPoste)
class IndicateurPosteAdmin(LectureSeule):
    list_display = ("numero", "poste", "population_theorique", "taux_couverture", "type_maille", "indice_forme",
                    "indice_decentrement", "discordance_ta", "discordance_ar", "discordance_tr", "classe_kmeans", "classe_ch")
    list_filter = ("type_maille", "classe_kmeans", "classe_ch")
