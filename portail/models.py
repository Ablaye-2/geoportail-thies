"""Modeles NON GERES (managed = False) : ils decrivent les tables deja creees
par le script `base_maille_sanitaire_thies.sql`. Django ne les cree ni ne les modifie.
"""
from django.contrib.gis.db import models


class Commune(models.Model):
    id = models.SmallIntegerField(primary_key=True)
    nom = models.CharField(max_length=30, unique=True)
    population_2023 = models.IntegerField("population 2023 (RGPH-5)", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "commune"
        ordering = ["nom"]

    def __str__(self):
        return self.nom


class PosteSante(models.Model):
    id = models.SmallIntegerField(primary_key=True)
    nom = models.CharField(max_length=60, unique=True)
    numero = models.SmallIntegerField("n° (cartes du mémoire)", null=True, blank=True)
    nom_usuel = models.CharField(max_length=60, null=True, blank=True)
    commune = models.ForeignKey(Commune, models.DO_NOTHING, db_column="commune_id", null=True, blank=True)
    nb_quartiers_administratifs = models.SmallIntegerField(null=True, blank=True)
    quartiers_administratifs = models.TextField(null=True, blank=True)
    population_administrative = models.IntegerField(null=True, blank=True)
    nb_medecins = models.SmallIntegerField(null=True, blank=True)
    nb_infirmiers = models.SmallIntegerField(null=True, blank=True)
    nb_sages_femmes = models.SmallIntegerField(null=True, blank=True)
    nb_techniciens_sup = models.SmallIntegerField(null=True, blank=True)
    services_essentiels = models.TextField(null=True, blank=True)
    nb_lits = models.SmallIntegerField(null=True, blank=True)
    autres_equipements_precision = models.TextField(null=True, blank=True)
    altitude_m = models.FloatField(null=True, blank=True)
    precision_gps_m = models.FloatField(null=True, blank=True)
    geom = models.PointField(srid=4326, null=True, blank=True)
    remarque = models.TextField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = "poste_sante"
        ordering = ["numero", "nom"]
        verbose_name = "poste de santé"
        verbose_name_plural = "postes de santé"

    def __str__(self):
        return self.nom


class Quartier(models.Model):
    id = models.IntegerField(primary_key=True)
    nom = models.CharField(max_length=80, unique=True)
    nom_ville = models.CharField(max_length=120, null=True, blank=True)
    code_quartier = models.CharField(max_length=13, null=True, blank=True)
    arrondissement = models.CharField(max_length=30, null=True, blank=True)
    commune = models.ForeignKey(Commune, models.DO_NOTHING, db_column="commune_id", null=True, blank=True)
    zone_mere = models.CharField(max_length=120, null=True, blank=True)
    concessions = models.IntegerField(null=True, blank=True)
    menages = models.IntegerField(null=True, blank=True)
    hommes = models.IntegerField(null=True, blank=True)
    femmes = models.IntegerField(null=True, blank=True)
    population_2023 = models.IntegerField(null=True, blank=True)
    superficie_km2 = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True)
    densite_hab_km2 = models.DecimalField(max_digits=12, decimal_places=1, null=True, blank=True)
    geom = models.MultiPolygonField(srid=32628, null=True, blank=True)

    class Meta:
        managed = False
        db_table = "quartier"
        ordering = ["nom"]

    def __str__(self):
        return self.nom


class RatioPoste(models.Model):
    poste = models.OneToOneField(PosteSante, models.DO_NOTHING, db_column="poste_id", primary_key=True)
    population_administrative = models.IntegerField(null=True)
    nb_medecins = models.SmallIntegerField(null=True)
    nb_techniciens_sup = models.SmallIntegerField(null=True)
    nb_infirmiers = models.SmallIntegerField(null=True)
    hab_par_medecin = models.DecimalField(max_digits=10, decimal_places=1, null=True)
    hab_par_infirmier = models.DecimalField(max_digits=10, decimal_places=1, null=True)
    medecins_manquants = models.SmallIntegerField(null=True)
    infirmiers_manquants = models.SmallIntegerField(null=True)

    class Meta:
        managed = False
        db_table = "ratio_poste"


class EnquetePatient(models.Model):
    id = models.IntegerField(primary_key=True)
    ligne_feuille = models.IntegerField(unique=True)
    enqueteur = models.CharField(max_length=60, null=True)
    poste = models.ForeignKey(PosteSante, models.DO_NOTHING, db_column="poste_id")
    commune = models.ForeignKey(Commune, models.DO_NOTHING, db_column="commune_id", null=True)
    age = models.SmallIntegerField(null=True)
    sexe = models.CharField(max_length=10, null=True)
    niveau_instruction = models.CharField(max_length=20, null=True)
    quartier_residence_corrige = models.CharField(max_length=120, null=True)
    moyen_transport = models.CharField(max_length=40, null=True)
    duree_trajet_min = models.SmallIntegerField(null=True)
    distance_km = models.DecimalField(max_digits=6, decimal_places=2, null=True)
    date_soumission = models.DateTimeField(null=True)

    class Meta:
        managed = False
        db_table = "enquete_patient"
        ordering = ["ligne_feuille"]


class IndicateurPoste(models.Model):
    """Indicateurs par poste du memoire (tableaux 13, 15 et 17)."""
    poste = models.OneToOneField(PosteSante, models.DO_NOTHING, db_column="poste_id", primary_key=True)
    numero = models.SmallIntegerField(null=True)
    superficie_theo_km2 = models.DecimalField("superficie aire théorique (km²)", max_digits=6, decimal_places=2, null=True)
    population_theorique = models.IntegerField("population de l'aire théorique", null=True)
    taux_couverture = models.DecimalField("taux de couverture (pop. / 7 714)", max_digits=5, decimal_places=2, null=True)
    type_maille = models.CharField(max_length=30, null=True)
    indice_forme = models.DecimalField(max_digits=4, decimal_places=2, null=True)
    indice_decentrement = models.DecimalField(max_digits=4, decimal_places=2, null=True)
    discordance_ta = models.DecimalField("discordance théorique/administrative", max_digits=4, decimal_places=2, null=True)
    discordance_ar = models.DecimalField("discordance administrative/réelle", max_digits=4, decimal_places=2, null=True)
    discordance_tr = models.DecimalField("discordance théorique/réelle", max_digits=4, decimal_places=2, null=True)
    classe_kmeans = models.CharField(max_length=3, null=True)
    classe_ch = models.CharField(max_length=3, null=True)

    class Meta:
        managed = False
        db_table = "indicateur_poste"
        ordering = ["numero"]
        verbose_name = "indicateur par poste (mémoire)"
        verbose_name_plural = "indicateurs par poste (mémoire)"
