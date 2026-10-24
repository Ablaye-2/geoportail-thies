-- =====================================================================
-- CORRECTIF : alignement de la base sur le memoire (chapitres 3 et 4)
-- A executer APRES base_maille_sanitaire_thies.sql (deja integre a la fin de ce script).
-- Le correctif peut etre rejoue sans risque (il remplace les donnees qu'il gere).
--  * 28 postes publics enquetes (suppression de PS ALAFIA THIES, absent du memoire)
--  * aire administrative : les 68 quartiers rattaches a un poste (28 polygones)
--  * aire reelle : quartiers fournissant plus de 5 % des patients d'un poste, attribues au poste
--    dominant (27 polygones, aucun pour Medina Fall 1) ; flux complets dans flux_patient
--  * aire theorique par quartier : cellule de Thiessen de plus grand recouvrement
--  * indicateurs par poste (tableau 17), classes K-means / CH, type de maille (tableau 15)
--  * grille de distance au poste le plus proche (tableau 8) ; populations RGPH-5 des communes
--  * techniciens superieurs (Darou Salam 8, Silmang 1) repris dans ratio_poste
--  * nettoyage de l'enquete : chaines vides -> NULL, durees negatives -> NULL
-- =====================================================================
BEGIN;

-- ---------------------------------------------------------------- 1. communes : population RGPH-5
ALTER TABLE commune ADD COLUMN IF NOT EXISTS population_2023 integer;
UPDATE commune SET population_2023 = v.p FROM (VALUES (1, 166256), (2, 136138), (3, 88859)) v(id, p) WHERE commune.id = v.id;

-- ---------------------------------------------------------------- 2. postes : numero et nom usuel (memoire)
ALTER TABLE poste_sante ADD COLUMN IF NOT EXISTS numero smallint;
ALTER TABLE poste_sante ADD COLUMN IF NOT EXISTS nom_usuel varchar(60);
UPDATE poste_sante SET numero = v.n, nom_usuel = v.nom FROM (VALUES
  (1, 'Cité Lamy'),
  (2, 'Cité Niakh'),
  (3, 'Darou Salam'),
  (4, 'Diakhao'),
  (5, 'El Hadji Mounirou Ndiéguène'),
  (6, 'Fahu'),
  (7, 'Goutte de Lait'),
  (8, 'Grand Standing'),
  (9, 'Grand Thiès'),
  (10, 'Hersent'),
  (11, 'Kawsara'),
  (12, 'Keur Abdoulaye Yakim'),
  (13, 'Keur Issa'),
  (14, 'Keur Saib Ndoye'),
  (15, 'Mbour 1'),
  (16, 'Mbour 2'),
  (17, 'Mbour 3'),
  (18, 'Médina Fall 1'),
  (19, 'Médina Fall 2'),
  (20, 'Nguinth'),
  (21, 'Parcelles Assainies'),
  (22, 'Petit Thialy'),
  (23, 'Randoulène'),
  (24, 'Sampathe'),
  (25, 'Silmang'),
  (26, 'Takhikao'),
  (27, 'Thiès Nonè'),
  (28, 'ZAC')
) v(n, nom) WHERE poste_sante.id = v.n;

-- ---------------------------------------------------------------- 3. suppression de PS ALAFIA THIES (hors des 28 postes enquetes)
DELETE FROM sensibilite_seuil   WHERE poste_id NOT IN (SELECT id FROM poste_sante WHERE id <= 28);
DELETE FROM qualite_appariement WHERE poste_id NOT IN (SELECT id FROM poste_sante WHERE id <= 28);
DELETE FROM qualite_gps         WHERE poste_id = 29 OR (poste_id = 22 AND probleme = 'MANQUANT');
DELETE FROM superficie_poste    WHERE poste_id = 29;
DELETE FROM ratio_population_poste WHERE poste_id = 29;
DELETE FROM aire_reelle         WHERE poste_id = 29;
DELETE FROM aire_administrative WHERE poste_id = 29;
DELETE FROM aire_theorique      WHERE poste_id = 29;
UPDATE jointure_qgis SET poste_reel_dominant_id = NULL WHERE poste_reel_dominant_id = 29;
UPDATE jointure_qgis SET poste_administratif_id = NULL WHERE poste_administratif_id = 29;
UPDATE jointure_qgis SET poste_theorique_id = NULL WHERE poste_theorique_id = 29;
UPDATE comparaison_aires SET poste_administratif_id = NULL WHERE poste_administratif_id = 29;
UPDATE comparaison_aires SET poste_theorique_id = NULL WHERE poste_theorique_id = 29;
DELETE FROM modification_enquete WHERE ancien_poste_id = 29 OR nouveau_poste_id = 29;
DELETE FROM enquete_patient WHERE poste_id = 29;
DELETE FROM ratio_poste WHERE poste_id = 29;
DELETE FROM poste_sante WHERE id = 29;

-- ---------------------------------------------------------------- 4. aire administrative (68 quartiers -> 28 postes)
DELETE FROM aire_administrative;
INSERT INTO aire_administrative (poste_id, quartier_id, score_correspondance) VALUES
  (1, 4, 100.0),
  (1, 8, 100.0),
  (1, 17, 100.0),
  (2, 1, 100.0),
  (2, 3, 100.0),
  (2, 6, 100.0),
  (2, 19, 100.0),
  (2, 20, 100.0),
  (2, 21, 100.0),
  (2, 22, 100.0),
  (3, 11, 100.0),
  (3, 12, 100.0),
  (4, 13, 100.0),
  (4, 14, 100.0),
  (5, 36, 100.0),
  (6, 26, 100.0),
  (6, 27, 100.0),
  (7, 2, 100.0),
  (7, 5, 100.0),
  (7, 18, 100.0),
  (7, 24, 100.0),
  (7, 25, 100.0),
  (7, 31, 100.0),
  (8, 28, 100.0),
  (8, 32, 100.0),
  (8, 55, 100.0),
  (8, 56, 100.0),
  (8, 68, 100.0),
  (9, 54, 100.0),
  (9, 66, 100.0),
  (10, 29, 100.0),
  (10, 30, 100.0),
  (11, 33, 100.0),
  (12, 40, 100.0),
  (12, 41, 100.0),
  (13, 7, 100.0),
  (13, 35, 100.0),
  (14, 37, 100.0),
  (14, 38, 100.0),
  (14, 39, 100.0),
  (15, 42, 100.0),
  (15, 59, 100.0),
  (16, 43, 100.0),
  (16, 60, 100.0),
  (17, 10, 100.0),
  (17, 44, 100.0),
  (17, 45, 100.0),
  (18, 46, 100.0),
  (19, 47, 100.0),
  (20, 48, 100.0),
  (21, 49, 100.0),
  (21, 50, 100.0),
  (21, 51, 100.0),
  (22, 62, 100.0),
  (22, 65, 100.0),
  (23, 53, 100.0),
  (24, 15, 100.0),
  (24, 57, 100.0),
  (25, 9, 100.0),
  (25, 58, 100.0),
  (26, 34, 100.0),
  (26, 61, 100.0),
  (27, 23, 100.0),
  (27, 64, 100.0),
  (28, 16, 100.0),
  (28, 52, 100.0),
  (28, 63, 100.0),
  (28, 67, 100.0);

-- ---------------------------------------------------------------- 5. flux de patients et aire reelle
DROP TABLE IF EXISTS flux_patient CASCADE;
CREATE TABLE flux_patient (
  poste_id             smallint NOT NULL REFERENCES poste_sante(id),
  quartier_id          integer  NOT NULL REFERENCES quartier(id),
  nb_patients          smallint,
  pct_flux_poste       numeric(5,1),
  total_patients_poste smallint,
  retenu_aire_reelle   boolean,      -- quartier > 5 % des patients du poste ET poste dominant du quartier
  PRIMARY KEY (poste_id, quartier_id)
);
COMMENT ON TABLE flux_patient IS 'Patients enquetes par quartier officiel de residence et par poste (formes tronquees rattachees a tous les quartiers candidats). Ajustements alignes sur le memoire : ESCALE (Goutte de Lait) et DVF (BAYAL) (Randoulene) non retenus.';
INSERT INTO flux_patient (poste_id, quartier_id, nb_patients, pct_flux_poste, total_patients_poste, retenu_aire_reelle) VALUES
  (1, 4, 33, 55.0, 60, TRUE),
  (1, 7, 1, 1.7, 60, FALSE),
  (1, 8, 2, 3.3, 60, FALSE),
  (1, 9, 2, 3.3, 60, FALSE),
  (1, 13, 1, 1.7, 60, FALSE),
  (1, 27, 1, 1.7, 60, FALSE),
  (1, 43, 1, 1.7, 60, FALSE),
  (1, 49, 2, 3.3, 60, FALSE),
  (1, 50, 4, 6.7, 60, FALSE),
  (1, 51, 2, 3.3, 60, FALSE),
  (1, 54, 4, 6.7, 60, FALSE),
  (1, 58, 4, 6.7, 60, FALSE),
  (2, 3, 3, 5.0, 60, FALSE),
  (2, 4, 1, 1.7, 60, FALSE),
  (2, 6, 1, 1.7, 60, FALSE),
  (2, 8, 9, 15.0, 60, FALSE),
  (2, 9, 9, 15.0, 60, FALSE),
  (2, 19, 3, 5.0, 60, FALSE),
  (2, 20, 2, 3.3, 60, FALSE),
  (2, 21, 15, 25.0, 60, TRUE),
  (2, 22, 2, 3.3, 60, FALSE),
  (2, 41, 22, 36.7, 60, TRUE),
  (2, 57, 2, 3.3, 60, FALSE),
  (3, 11, 58, 96.7, 60, TRUE),
  (3, 12, 58, 96.7, 60, TRUE),
  (3, 29, 1, 1.7, 60, FALSE),
  (3, 30, 1, 1.7, 60, FALSE),
  (4, 13, 64, 64.0, 100, TRUE),
  (4, 42, 1, 1.0, 100, FALSE),
  (4, 48, 1, 1.0, 100, FALSE),
  (4, 62, 30, 30.0, 100, FALSE),
  (4, 64, 1, 1.0, 100, FALSE),
  (4, 65, 2, 2.0, 100, FALSE),
  (5, 3, 3, 5.0, 60, FALSE),
  (5, 20, 3, 5.0, 60, FALSE),
  (5, 24, 1, 1.7, 60, FALSE),
  (5, 25, 1, 1.7, 60, FALSE),
  (5, 29, 1, 1.7, 60, FALSE),
  (5, 30, 1, 1.7, 60, FALSE),
  (5, 33, 4, 6.7, 60, FALSE),
  (5, 34, 1, 1.7, 60, FALSE),
  (5, 36, 15, 25.0, 60, TRUE),
  (5, 39, 1, 1.7, 60, FALSE),
  (5, 43, 1, 1.7, 60, FALSE),
  (5, 46, 8, 13.3, 60, FALSE),
  (5, 48, 2, 3.3, 60, FALSE),
  (5, 61, 6, 10.0, 60, FALSE),
  (5, 67, 4, 6.7, 60, FALSE),
  (6, 26, 35, 58.3, 60, TRUE),
  (6, 27, 35, 58.3, 60, TRUE),
  (6, 43, 24, 40.0, 60, FALSE),
  (6, 49, 1, 1.7, 60, FALSE),
  (6, 50, 1, 1.7, 60, FALSE),
  (6, 51, 1, 1.7, 60, FALSE),
  (7, 2, 6, 10.0, 60, TRUE),
  (7, 5, 3, 5.0, 60, FALSE),
  (7, 13, 1, 1.7, 60, FALSE),
  (7, 18, 14, 23.3, 60, TRUE),
  (7, 24, 4, 6.7, 60, FALSE),
  (7, 25, 4, 6.7, 60, FALSE),
  (7, 26, 1, 1.7, 60, FALSE),
  (7, 27, 1, 1.7, 60, FALSE),
  (7, 31, 13, 21.7, 60, TRUE),
  (7, 39, 1, 1.7, 60, FALSE),
  (7, 41, 2, 3.3, 60, FALSE),
  (7, 42, 3, 5.0, 60, FALSE),
  (7, 45, 1, 1.7, 60, FALSE),
  (7, 46, 2, 3.3, 60, FALSE),
  (7, 53, 3, 5.0, 60, FALSE),
  (7, 59, 2, 3.3, 60, FALSE),
  (7, 62, 2, 3.3, 60, FALSE),
  (8, 28, 54, 90.0, 60, TRUE),
  (8, 44, 1, 1.7, 60, FALSE),
  (8, 64, 2, 3.3, 60, FALSE),
  (9, 4, 4, 6.7, 60, FALSE),
  (9, 8, 2, 3.3, 60, FALSE),
  (9, 9, 2, 3.3, 60, FALSE),
  (9, 15, 1, 1.7, 60, FALSE),
  (9, 26, 2, 3.3, 60, FALSE),
  (9, 27, 2, 3.3, 60, FALSE),
  (9, 28, 1, 1.7, 60, FALSE),
  (9, 41, 1, 1.7, 60, FALSE),
  (9, 42, 7, 11.7, 60, FALSE),
  (9, 43, 1, 1.7, 60, FALSE),
  (9, 50, 1, 1.7, 60, FALSE),
  (9, 54, 25, 41.7, 60, TRUE),
  (9, 59, 3, 5.0, 60, FALSE),
  (10, 11, 1, 1.7, 60, FALSE),
  (10, 12, 1, 1.7, 60, FALSE),
  (10, 21, 1, 1.7, 60, FALSE),
  (10, 29, 34, 56.7, 60, TRUE),
  (10, 30, 34, 56.7, 60, TRUE),
  (10, 57, 1, 1.7, 60, FALSE),
  (10, 58, 5, 8.3, 60, FALSE),
  (11, 33, 40, 66.7, 60, TRUE),
  (11, 34, 1, 1.7, 60, FALSE),
  (11, 46, 7, 11.7, 60, FALSE),
  (11, 48, 1, 1.7, 60, FALSE),
  (11, 52, 7, 11.7, 60, FALSE),
  (11, 61, 4, 6.7, 60, FALSE),
  (12, 8, 1, 1.7, 60, FALSE),
  (12, 9, 1, 1.7, 60, FALSE),
  (12, 19, 1, 1.7, 60, FALSE),
  (12, 29, 1, 1.7, 60, FALSE),
  (12, 30, 1, 1.7, 60, FALSE),
  (12, 40, 47, 78.3, 60, TRUE),
  (12, 41, 8, 13.3, 60, FALSE),
  (12, 58, 1, 1.7, 60, FALSE),
  (13, 1, 2, 3.3, 60, FALSE),
  (13, 3, 13, 21.7, 60, TRUE),
  (13, 7, 7, 11.7, 60, TRUE),
  (13, 35, 35, 58.3, 60, TRUE),
  (13, 46, 1, 1.7, 60, FALSE),
  (13, 48, 1, 1.7, 60, FALSE),
  (14, 15, 1, 1.7, 60, FALSE),
  (14, 16, 2, 3.3, 60, FALSE),
  (14, 26, 1, 1.7, 60, FALSE),
  (14, 27, 1, 1.7, 60, FALSE),
  (14, 33, 4, 6.7, 60, FALSE),
  (14, 38, 7, 11.7, 60, TRUE),
  (14, 39, 15, 25.0, 60, TRUE),
  (14, 46, 10, 16.7, 60, FALSE),
  (14, 48, 2, 3.3, 60, FALSE),
  (14, 52, 3, 5.0, 60, FALSE),
  (14, 58, 13, 21.7, 60, FALSE),
  (15, 3, 1, 1.0, 100, FALSE),
  (15, 4, 1, 1.0, 100, FALSE),
  (15, 8, 3, 3.0, 100, FALSE),
  (15, 9, 3, 3.0, 100, FALSE),
  (15, 10, 1, 1.0, 100, FALSE),
  (15, 13, 1, 1.0, 100, FALSE),
  (15, 26, 3, 3.0, 100, FALSE),
  (15, 27, 3, 3.0, 100, FALSE),
  (15, 28, 10, 10.0, 100, FALSE),
  (15, 42, 41, 41.0, 100, TRUE),
  (15, 43, 8, 8.0, 100, FALSE),
  (15, 44, 4, 4.0, 100, FALSE),
  (15, 45, 5, 5.0, 100, FALSE),
  (15, 46, 5, 5.0, 100, FALSE),
  (15, 48, 1, 1.0, 100, FALSE),
  (15, 54, 1, 1.0, 100, FALSE),
  (15, 56, 1, 1.0, 100, FALSE),
  (15, 58, 1, 1.0, 100, FALSE),
  (15, 59, 4, 4.0, 100, FALSE),
  (15, 61, 1, 1.0, 100, FALSE),
  (15, 62, 3, 3.0, 100, FALSE),
  (15, 67, 2, 2.0, 100, FALSE),
  (16, 26, 11, 18.3, 60, FALSE),
  (16, 27, 11, 18.3, 60, FALSE),
  (16, 29, 1, 1.7, 60, FALSE),
  (16, 30, 1, 1.7, 60, FALSE),
  (16, 42, 8, 13.3, 60, FALSE),
  (16, 43, 37, 61.7, 60, TRUE),
  (16, 49, 3, 5.0, 60, FALSE),
  (16, 50, 3, 5.0, 60, FALSE),
  (16, 51, 3, 5.0, 60, FALSE),
  (17, 10, 10, 10.0, 100, TRUE),
  (17, 26, 1, 1.0, 100, FALSE),
  (17, 27, 1, 1.0, 100, FALSE),
  (17, 28, 12, 12.0, 100, FALSE),
  (17, 42, 3, 3.0, 100, FALSE),
  (17, 43, 3, 3.0, 100, FALSE),
  (17, 44, 52, 52.0, 100, TRUE),
  (17, 45, 14, 14.0, 100, TRUE),
  (17, 49, 2, 2.0, 100, FALSE),
  (17, 50, 2, 2.0, 100, FALSE),
  (17, 51, 2, 2.0, 100, FALSE),
  (17, 56, 2, 2.0, 100, FALSE),
  (17, 59, 1, 1.0, 100, FALSE),
  (18, 7, 5, 8.3, 60, FALSE),
  (18, 21, 1, 1.7, 60, FALSE),
  (18, 34, 3, 5.0, 60, FALSE),
  (18, 35, 1, 1.7, 60, FALSE),
  (18, 46, 47, 78.3, 60, FALSE),
  (19, 33, 6, 6.0, 100, FALSE),
  (19, 35, 2, 2.0, 100, FALSE),
  (19, 39, 3, 3.0, 100, FALSE),
  (19, 43, 1, 1.0, 100, FALSE),
  (19, 46, 86, 86.0, 100, TRUE),
  (19, 48, 1, 1.0, 100, FALSE),
  (20, 7, 2, 3.3, 60, FALSE),
  (20, 35, 1, 1.7, 60, FALSE),
  (20, 48, 50, 83.3, 60, TRUE),
  (20, 52, 2, 3.3, 60, FALSE),
  (20, 61, 5, 8.3, 60, FALSE),
  (21, 4, 21, 35.0, 60, FALSE),
  (21, 35, 2, 3.3, 60, FALSE),
  (21, 42, 1, 1.7, 60, FALSE),
  (21, 43, 2, 3.3, 60, FALSE),
  (21, 49, 15, 25.0, 60, TRUE),
  (21, 50, 17, 28.3, 60, TRUE),
  (21, 51, 14, 23.3, 60, TRUE),
  (22, 48, 2, 3.3, 60, FALSE),
  (22, 62, 56, 93.3, 60, TRUE),
  (22, 65, 1, 1.7, 60, FALSE),
  (23, 1, 5, 8.3, 60, TRUE),
  (23, 2, 1, 1.7, 60, FALSE),
  (23, 3, 1, 1.7, 60, FALSE),
  (23, 8, 2, 3.3, 60, FALSE),
  (23, 9, 2, 3.3, 60, FALSE),
  (23, 11, 1, 1.7, 60, FALSE),
  (23, 12, 1, 1.7, 60, FALSE),
  (23, 19, 3, 5.0, 60, FALSE),
  (23, 20, 4, 6.7, 60, FALSE),
  (23, 21, 1, 1.7, 60, FALSE),
  (23, 29, 1, 1.7, 60, FALSE),
  (23, 30, 1, 1.7, 60, FALSE),
  (23, 31, 1, 1.7, 60, FALSE),
  (23, 35, 2, 3.3, 60, FALSE),
  (23, 36, 1, 1.7, 60, FALSE),
  (23, 41, 4, 6.7, 60, FALSE),
  (23, 42, 1, 1.7, 60, FALSE),
  (23, 44, 1, 1.7, 60, FALSE),
  (23, 46, 2, 3.3, 60, FALSE),
  (23, 49, 1, 1.7, 60, FALSE),
  (23, 50, 1, 1.7, 60, FALSE),
  (23, 51, 1, 1.7, 60, FALSE),
  (23, 52, 1, 1.7, 60, FALSE),
  (23, 53, 12, 20.0, 60, TRUE),
  (23, 54, 10, 16.7, 60, FALSE),
  (23, 58, 1, 1.7, 60, FALSE),
  (23, 59, 1, 1.7, 60, FALSE),
  (23, 64, 2, 3.3, 60, FALSE),
  (23, 67, 1, 1.7, 60, FALSE),
  (24, 8, 5, 5.0, 100, FALSE),
  (24, 9, 5, 5.0, 100, FALSE),
  (24, 10, 1, 1.0, 100, FALSE),
  (24, 11, 2, 2.0, 100, FALSE),
  (24, 12, 2, 2.0, 100, FALSE),
  (24, 15, 21, 21.0, 100, TRUE),
  (24, 29, 13, 13.0, 100, FALSE),
  (24, 30, 13, 13.0, 100, FALSE),
  (24, 35, 1, 1.0, 100, FALSE),
  (24, 41, 3, 3.0, 100, FALSE),
  (24, 42, 3, 3.0, 100, FALSE),
  (24, 46, 1, 1.0, 100, FALSE),
  (24, 49, 1, 1.0, 100, FALSE),
  (24, 50, 1, 1.0, 100, FALSE),
  (24, 51, 1, 1.0, 100, FALSE),
  (24, 57, 26, 26.0, 100, TRUE),
  (24, 58, 6, 6.0, 100, FALSE),
  (25, 4, 1, 1.0, 100, FALSE),
  (25, 8, 18, 18.0, 100, TRUE),
  (25, 9, 18, 18.0, 100, TRUE),
  (25, 11, 9, 9.0, 100, FALSE),
  (25, 12, 9, 9.0, 100, FALSE),
  (25, 49, 2, 2.0, 100, FALSE),
  (25, 50, 2, 2.0, 100, FALSE),
  (25, 51, 2, 2.0, 100, FALSE),
  (25, 58, 62, 62.0, 100, TRUE),
  (26, 34, 13, 21.7, 60, TRUE),
  (26, 36, 3, 5.0, 60, FALSE),
  (26, 44, 1, 1.7, 60, FALSE),
  (26, 48, 1, 1.7, 60, FALSE),
  (26, 61, 42, 70.0, 60, TRUE),
  (27, 28, 4, 6.7, 60, FALSE),
  (27, 56, 4, 6.7, 60, TRUE),
  (27, 64, 40, 66.7, 60, TRUE),
  (28, 52, 8, 13.3, 60, TRUE),
  (28, 63, 15, 25.0, 60, TRUE),
  (28, 65, 10, 16.7, 60, TRUE),
  (28, 67, 27, 45.0, 60, TRUE);

DELETE FROM aire_reelle;
INSERT INTO aire_reelle (poste_id, quartier_id, nb_patients, pct_flux_poste, total_patients_poste)
SELECT poste_id, quartier_id, nb_patients, pct_flux_poste, total_patients_poste FROM flux_patient WHERE retenu_aire_reelle;

DELETE FROM sensibilite_seuil;
INSERT INTO sensibilite_seuil (poste_id, quartier_id, retenu_5pct, retenu_10pct, robustesse)
SELECT poste_id, quartier_id, pct_flux_poste > 5, pct_flux_poste > 10,
       CASE WHEN pct_flux_poste > 10 THEN 'STABLE' ELSE 'sensible au seuil' END
FROM flux_patient WHERE pct_flux_poste > 5;

DELETE FROM patient_non_rattache;
INSERT INTO patient_non_rattache (lieu_cite_par_patient, nb_patients) VALUES
  ('NGOUMSANE', 16),
  ('GOUY SOMBEL', 11),
  ('KEUR DABO', 10),
  ('KEUR BARA', 9),
  ('DARAL PEULH', 6),
  ('KEUR MOR NDIAYE', 6),
  ('THIANABA', 6),
  ('POUT', 5),
  ('KEUR SANGONE', 4),
  ('KEUR THIEME SOIRE', 4),
  ('DALAL KHEL', 3),
  ('MBOMBE', 3),
  ('NDOUFFOUCK', 3),
  ('PEKOU SERERE', 3),
  ('TOUBA PEKOU', 3),
  ('DAKHAR MBAYE', 2),
  ('DIOBASS', 2),
  ('GOUYE SOMBENE', 2),
  ('GUEYENE', 2),
  ('KEUR SA DARO', 2),
  ('MBOMBOYE', 2),
  ('NGOUNDIANE', 2),
  ('PALAL', 2),
  ('SERASSE', 2),
  ('TATENE', 2),
  ('BABAG SERRERE', 1),
  ('COLOBANE TANGORE', 1),
  ('GAYENNE', 1),
  ('HANERE', 1),
  ('KEUR MATORE', 1),
  ('KEUR MODOU MBAYE', 1),
  ('LALANE', 1),
  ('LAZARE', 1),
  ('LAZER', 1),
  ('LOYENE', 1),
  ('MORONLAN', 1),
  ('NDOYENE', 1),
  ('PELEW', 1),
  ('PIRE', 1),
  ('SANGUE', 1),
  ('TAIBA', 1),
  ('TIVAOUNE', 1);

DELETE FROM qualite_appariement;
INSERT INTO qualite_appariement (poste_id, total_patients_reel, pct_patients_non_rattaches) VALUES
  (1, 60, 15.0),
  (2, 60, 0.0),
  (3, 60, 1.7),
  (4, 100, 1.0),
  (5, 60, 16.7),
  (6, 60, 0.0),
  (7, 60, 3.3),
  (8, 60, 5.0),
  (9, 60, 20.0),
  (10, 60, 30.0),
  (11, 60, 0.0),
  (12, 60, 1.7),
  (13, 60, 1.7),
  (14, 60, 3.3),
  (15, 100, 3.0),
  (16, 60, 0.0),
  (17, 100, 0.0),
  (18, 60, 5.0),
  (19, 100, 1.0),
  (20, 60, 0.0),
  (21, 60, 26.7),
  (22, 60, 1.7),
  (23, 60, 13.3),
  (24, 100, 17.0),
  (25, 100, 8.0),
  (26, 60, 0.0),
  (27, 60, 20.0),
  (28, 60, 0.0);

-- ---------------------------------------------------------------- 6. aire theorique par quartier (cellule de Thiessen majoritaire)
DELETE FROM aire_theorique;
INSERT INTO aire_theorique (poste_id, quartier_id, commune_id, population_2023) VALUES
  (1, 4, 1, 14977),
  (1, 8, 1, 9260),
  (1, 66, 3, 812),
  (2, 3, 1, 1331),
  (2, 6, 1, 970),
  (2, 21, 1, 5689),
  (2, 22, 1, 947),
  (2, 41, 1, 4119),
  (3, 9, 1, 10804),
  (4, 13, 2, 11501),
  (4, 14, 2, 10970),
  (4, 23, 2, 1873),
  (5, 19, 1, 3023),
  (5, 24, 2, 668),
  (5, 25, 3, 627),
  (5, 36, 2, 5477),
  (6, 27, 1, 13983),
  (6, 49, 1, 4611),
  (7, 2, 3, 1499),
  (7, 5, 3, 2897),
  (7, 18, 3, 4084),
  (7, 31, 3, 1636),
  (8, 28, 3, 6511),
  (9, 54, 3, 12158),
  (10, 12, 1, 9385),
  (10, 29, 1, 11759),
  (10, 30, 1, 3283),
  (11, 33, 2, 11439),
  (12, 40, 1, 10383),
  (13, 7, 1, 4978),
  (13, 35, 2, 3259),
  (14, 16, 2, 929),
  (14, 37, 2, 177),
  (14, 38, 2, 802),
  (14, 39, 2, 3051),
  (15, 32, 3, 1039),
  (15, 59, 3, 8781),
  (16, 26, 1, 1354),
  (16, 42, 3, 12941),
  (16, 43, 3, 3056),
  (17, 10, 3, 1243),
  (17, 44, 3, 6114),
  (17, 45, 3, 6256),
  (17, 60, 3, 1739),
  (18, 46, 2, 37280),
  (19, 47, 2, 6803),
  (20, 48, 2, 11675),
  (21, 17, 1, 2224),
  (21, 50, 1, 3723),
  (21, 51, 1, 1078),
  (22, 62, 2, 11493),
  (23, 1, 1, 1248),
  (23, 20, 1, 974),
  (23, 53, 3, 5785),
  (24, 15, 1, 12076),
  (24, 57, 1, 8666),
  (25, 11, 1, 14245),
  (25, 58, 1, 11166),
  (26, 34, 2, 2096),
  (26, 61, 2, 8938),
  (27, 55, 3, 3711),
  (27, 56, 3, 1674),
  (27, 64, 3, 1730),
  (27, 68, 3, 2267),
  (28, 52, 2, 1338),
  (28, 63, 2, 2659),
  (28, 65, 2, 2404),
  (28, 67, 2, 1306);

-- ---------------------------------------------------------------- 7. jointure et comparaison des aires par quartier
UPDATE jointure_qgis j SET poste_administratif_id = a.poste_id FROM aire_administrative a WHERE a.quartier_id = j.quartier_id;
UPDATE jointure_qgis j SET poste_theorique_id = t.poste_id FROM aire_theorique t WHERE t.quartier_id = j.quartier_id;
UPDATE jointure_qgis j SET poste_reel_dominant_id = r.poste_id, pct_reel_dominant = r.pct_flux_poste FROM aire_reelle r WHERE r.quartier_id = j.quartier_id;
UPDATE jointure_qgis j SET poste_reel_dominant_id = NULL, pct_reel_dominant = NULL WHERE NOT EXISTS (SELECT 1 FROM aire_reelle r WHERE r.quartier_id = j.quartier_id);
UPDATE comparaison_aires c SET
  poste_administratif_id = j.poste_administratif_id,
  poste_theorique_id     = j.poste_theorique_id,
  postes_reels = COALESCE((SELECT string_agg(p.nom, ', ' ORDER BY f.nb_patients DESC) FROM flux_patient f JOIN poste_sante p ON p.id = f.poste_id
                           WHERE f.quartier_id = c.quartier_id AND f.pct_flux_poste > 5), ''),
  critere_geometrique   = CASE WHEN j.poste_administratif_id IS NULL OR j.poste_theorique_id IS NULL THEN 'n.d.'
                               WHEN j.poste_administratif_id = j.poste_theorique_id THEN 'CONCORDANT' ELSE 'DISCORDANT' END,
  critere_accessibilite = CASE WHEN j.poste_administratif_id IS NULL OR j.poste_reel_dominant_id IS NULL THEN 'n.d.'
                               WHEN j.poste_administratif_id = j.poste_reel_dominant_id THEN 'CONCORDANT' ELSE 'DISCORDANT' END
FROM jointure_qgis j WHERE j.quartier_id = c.quartier_id;

-- ---------------------------------------------------------------- 8. indicateurs par poste (tableaux 13, 15 et 17 du memoire)
DROP TABLE IF EXISTS indicateur_poste CASCADE;
CREATE TABLE indicateur_poste (
  poste_id              smallint PRIMARY KEY REFERENCES poste_sante(id),
  numero                smallint,
  superficie_theo_km2   numeric(6,2),   -- polygone de Thiessen decoupe sur la ville
  population_theorique  integer,        -- population communale 2023 repartie au prorata des superficies
  taux_couverture       numeric(5,2),   -- population_theorique / 7 714
  type_maille           varchar(30),    -- tableau 15
  indice_forme          numeric(4,2),   -- IF = S / D2 (cercle = 0,785)
  indice_decentrement   numeric(4,2),   -- ID = d / sqrt(S/pi)
  discordance_ta        numeric(4,2),   -- theorique / administrative
  discordance_ar        numeric(4,2),   -- administrative / reelle (NULL : pas d'aire reelle)
  discordance_tr        numeric(4,2),   -- theorique / reelle
  classe_kmeans         varchar(3),
  classe_ch             varchar(3)
);
COMMENT ON TABLE indicateur_poste IS 'Tableau 17 du memoire (calculs QGIS et R, 2026) ; classes CH : tableau 13 ; type de maille : tableau 15.';
INSERT INTO indicateur_poste VALUES
  (1, 1, 0.94, 13217, 1.71, 'Sous-dotée', 0.34, 0.27, 0.63, 0.43, 0.62, 'K3', 'CH1'),
  (2, 2, 1.21, 17114, 2.22, 'Fortement sous-dotée', 0.6, 0.53, 0.63, 0.85, 0.68, 'K1', 'CH2'),
  (3, 3, 0.79, 11160, 1.45, 'Sous-dotée', 0.33, 0.34, 0.85, 0.0, 0.85, 'K3', 'CH3'),
  (4, 4, 11.58, 30031, 3.89, 'Fortement sous-dotée', 0.27, 1.21, 0.88, 0.34, 0.91, 'K2', 'CH3'),
  (5, 5, 1.11, 2870, 0.37, 'Conforme ou sur-dotée', 0.44, 0.16, 0.85, 0.0, 0.85, 'K4', 'CH4'),
  (6, 6, 2.11, 29770, 3.86, 'Fortement sous-dotée', 0.45, 0.65, 0.46, 0.0, 0.46, 'K3', 'CH1'),
  (7, 7, 1.71, 7129, 0.92, 'Conforme ou sur-dotée', 0.51, 0.4, 0.53, 0.52, 0.48, 'K3', 'CH1'),
  (8, 8, 1.17, 4858, 0.63, 'Conforme ou sur-dotée', 0.34, 0.53, 0.76, 0.77, 0.57, 'K2', 'CH3'),
  (9, 9, 0.84, 3485, 0.45, 'Conforme ou sur-dotée', 0.28, 0.16, 0.54, 0.07, 0.52, 'K3', 'CH3'),
  (10, 10, 1.64, 23067, 2.99, 'Fortement sous-dotée', 0.17, 0.84, 0.61, 0.0, 0.61, 'K3', 'CH3'),
  (11, 11, 1.78, 4602, 0.6, 'Conforme ou sur-dotée', 0.5, 0.39, 0.57, 0.0, 0.57, 'K3', 'CH3'),
  (12, 12, 0.64, 8980, 1.16, 'Sous-dotée', 0.45, 0.47, 0.49, 0.29, 0.52, 'K1', 'CH2'),
  (13, 13, 2.9, 7509, 0.97, 'Conforme ou sur-dotée', 0.5, 0.3, 0.49, 0.23, 0.57, 'K3', 'CH1'),
  (14, 14, 7.68, 19914, 2.58, 'Fortement sous-dotée', 0.47, 0.83, 0.54, 0.22, 0.64, 'K3', 'CH3'),
  (15, 15, 1.85, 7694, 1.0, 'Conforme ou sur-dotée', 0.47, 0.5, 0.73, 0.51, 0.87, 'K3', 'CH1'),
  (16, 16, 1.3, 5433, 0.7, 'Conforme ou sur-dotée', 0.23, 0.36, 0.74, 0.57, 0.78, 'K3', 'CH3'),
  (17, 17, 2.9, 12083, 1.57, 'Sous-dotée', 0.47, 0.65, 0.32, 0.0, 0.32, 'K3', 'CH1'),
  (18, 18, 1.08, 2797, 0.36, 'Conforme ou sur-dotée', 0.41, 0.22, 0.54, NULL, NULL, 'K2', 'CH3'),
  (19, 19, 1.91, 4947, 0.64, 'Conforme ou sur-dotée', 0.38, 0.5, 0.53, 1.0, 0.88, 'K2', 'CH3'),
  (20, 20, 0.93, 2410, 0.31, 'Conforme ou sur-dotée', 0.42, 0.39, 0.43, 0.0, 0.43, 'K2', 'CH3'),
  (21, 21, 1.04, 14605, 1.89, 'Sous-dotée', 0.34, 0.41, 0.66, 0.0, 0.66, 'K3', 'CH1'),
  (22, 22, 2.25, 5825, 0.76, 'Conforme ou sur-dotée', 0.28, 0.77, 0.54, 0.62, 0.53, 'K3', 'CH1'),
  (23, 23, 0.74, 3074, 0.4, 'Conforme ou sur-dotée', 0.41, 0.21, 0.66, 0.16, 0.59, 'K2', 'CH3'),
  (24, 24, 1.6, 22536, 2.92, 'Fortement sous-dotée', 0.34, 0.53, 0.56, 0.0, 0.56, 'K1', 'CH2'),
  (25, 25, 1.83, 25807, 3.35, 'Fortement sous-dotée', 0.3, 0.66, 0.54, 0.12, 0.58, 'K3', 'CH1'),
  (26, 26, 1.0, 2592, 0.34, 'Conforme ou sur-dotée', 0.46, 0.31, 0.64, 0.0, 0.64, 'K2', 'CH3'),
  (27, 27, 10.82, 45104, 5.85, 'Fortement sous-dotée', 0.23, 1.08, 0.7, 0.98, 0.96, 'K2', 'CH3'),
  (28, 28, 20.31, 52640, 6.82, 'Fortement sous-dotée', 0.36, 0.74, 0.53, 0.25, 0.43, 'K3', 'CH1');

DROP TABLE IF EXISTS classe_offre CASCADE;
CREATE TABLE classe_offre (
  code     varchar(3) PRIMARY KEY,
  methode  varchar(10),
  nb_postes smallint,
  profil   text
);
INSERT INTO classe_offre VALUES
  ('K1', 'K-means', 3,  'Plateau technique intermédiaire (radiographie, stérilisation)'),
  ('K2', 'K-means', 8,  'Orientation maternité : ni stérilisation ni pédiatrie'),
  ('K3', 'K-means', 16, 'Postes de base : pas de radiographie, presque jamais de laboratoire'),
  ('K4', 'K-means', 1,  'Poste de référence : 3 médecins, laboratoire, urgences, consultations spécialisées'),
  ('CH1', 'CH', 10, 'Pédiatrie et urgences plus fréquentes, moins de sages-femmes'),
  ('CH2', 'CH', 3,  'Radiographie et stérilisation très au-dessus de la moyenne'),
  ('CH3', 'CH', 14, 'Ni pédiatrie ni urgences, stérilisation faible'),
  ('CH4', 'CH', 1,  'Poste de référence (El Hadji Mounirou Ndiéguène)');

-- ---------------------------------------------------------------- 9. grille de distance au poste le plus proche (tableau 8)
DELETE FROM grille_distance;
ALTER TABLE grille_distance ALTER COLUMN classe_de_distance TYPE varchar(20);
ALTER TABLE grille_distance ADD COLUMN IF NOT EXISTS ordre smallint;
ALTER TABLE grille_distance ADD COLUMN IF NOT EXISTS distance_max_m integer;
ALTER TABLE grille_distance ADD COLUMN IF NOT EXISTS pct_cumule numeric(5,1);
COMMENT ON TABLE grille_distance IS 'Grille reguliere de 50 m sur les 68 quartiers ; distance a vol d oiseau au poste le plus proche (ponderee par la superficie).';
INSERT INTO grille_distance (classe_de_distance, nb_points_grille, pct_du_territoire, ordre, distance_max_m, pct_cumule) VALUES
  ('≤ 0,5 km', 7468, 21.8, 1, 500, 21.8),
  ('0,5–1 km', 8783, 25.7, 2, 1000, 47.5),
  ('1–2 km', 7148, 20.9, 3, 2000, 68.5),
  ('2–3 km', 5035, 14.7, 4, 3000, 83.2),
  ('3–5 km', 4924, 14.4, 5, 5000, 97.6),
  ('> 5 km', 824, 2.4, 6, NULL, 100.0);

-- ---------------------------------------------------------------- 10. ratios : techniciens superieurs repris du fichier d'offre
UPDATE ratio_poste r SET
  nb_medecins = p.nb_medecins, nb_infirmiers = p.nb_infirmiers, nb_techniciens_sup = p.nb_techniciens_sup,
  population_administrative = p.population_administrative, nb_quartiers_administratifs = p.nb_quartiers_administratifs
FROM poste_sante p WHERE p.id = r.poste_id;
UPDATE ratio_poste SET
  hab_par_medecin        = round(population_administrative::numeric / NULLIF(nb_medecins, 0), 1),
  hab_par_infirmier      = round(population_administrative::numeric / NULLIF(nb_infirmiers, 0), 1),
  hab_par_technicien_sup = round(population_administrative::numeric / NULLIF(nb_techniciens_sup, 0), 1),
  norme_medecin_respectee    = population_administrative <= 10000 * nb_medecins,
  norme_infirmier_respectee  = population_administrative <= 5000 * nb_infirmiers,
  norme_technicien_respectee = population_administrative <= 5000 * nb_techniciens_sup,
  medecins_manquants    = GREATEST(0, ceil(population_administrative / 10000.0) - nb_medecins),
  infirmiers_manquants  = GREATEST(0, ceil(population_administrative / 5000.0) - nb_infirmiers),
  techniciens_manquants = GREATEST(0, ceil(population_administrative / 5000.0) - nb_techniciens_sup);

-- ---------------------------------------------------------------- 11. nettoyage de l'enquete
UPDATE enquete_patient SET niveau_instruction = NULL WHERE btrim(niveau_instruction) = '';
UPDATE enquete_patient SET moyen_transport = NULL WHERE btrim(moyen_transport) = '';
UPDATE enquete_patient SET quartier_residence_corrige = NULL WHERE btrim(quartier_residence_corrige) = '';
UPDATE enquete_patient SET duree_trajet_min = NULL WHERE duree_trajet_min < 0;

COMMIT;
