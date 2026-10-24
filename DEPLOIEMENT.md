# Mettre le géoportail en ligne (gratuit) : Neon + Render

Architecture :
- **Neon** (neon.tech) héberge la base PostgreSQL + PostGIS. Offre gratuite, sans date d'expiration.
- **Render** (render.com) héberge le site Django, construit à partir du `Dockerfile`. Offre gratuite ; le site
  « s'endort » après 15 min sans visite et met environ 1 minute à se réveiller à la visite suivante.
- **GitHub** sert à transmettre le code à Render.

## 1. Créer la base en ligne (Neon)
1. Créez un compte sur https://neon.tech, puis un projet (région : Europe, par ex. Frankfurt).
2. Dans le tableau de bord, bouton **Connect** : copiez la *connection string*, de la forme
   `postgresql://neondb_owner:MOTDEPASSE@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`
3. Sur votre ordinateur (PowerShell), envoyez les données dans cette base :
   ```powershell
   cd C:\Users\HP\Downloads\geoportail_thies_v11\geoportail_thies
   & "C:\Program Files\PostgreSQL\15\bin\psql.exe" "COLLEZ_ICI_LA_CONNECTION_STRING" -f sql\base_maille_sanitaire_thies.sql
   ```
   La fin doit afficher `COMMIT`. (Le script active PostGIS lui-même.)

## 2. Mettre le code sur GitHub
1. Créez un compte sur https://github.com, puis un dépôt **New repository** nommé `geoportail-thies`.
2. Installez **GitHub Desktop** (https://desktop.github.com), *File › Add local repository*, choisissez le dossier
   `geoportail_thies`, puis **Publish repository**. Le fichier `.env` (mot de passe) n'est PAS envoyé : il est exclu par `.gitignore`.

## 3. Créer le site (Render)
1. Créez un compte sur https://render.com avec « Sign in with GitHub ».
2. **New › Blueprint**, choisissez le dépôt `geoportail-thies` : Render lit `render.yaml`.
3. Render demande deux valeurs :
   - `DATABASE_URL` : la connection string Neon de l'étape 1 ;
   - `DJANGO_SUPERUSER_PASSWORD` : le mot de passe du compte `admin` de la page Administration.
4. **Apply**. La première construction prend 5 à 10 minutes. Le site est ensuite à l'adresse
   `https://geoportail-thies.onrender.com` (affichée en haut de la page du service).

## Mettre à jour le site
Modifiez les fichiers, puis dans GitHub Desktop : **Commit** puis **Push origin**. Render reconstruit tout seul.
Si les données changent, relancez la commande `psql ... -f` de l'étape 1.

## Variables d'environnement (référence)
| Variable | Rôle |
|---|---|
| `DATABASE_URL` | adresse complète de la base PostGIS |
| `DJANGO_SECRET_KEY` | clé secrète (générée par Render) |
| `DJANGO_DEBUG` | `False` en ligne |
| `DJANGO_ALLOWED_HOSTS` | noms de domaine autorisés (`.onrender.com`, ou votre domaine) |
| `DJANGO_SUPERUSER_USERNAME` / `_PASSWORD` / `_EMAIL` | compte administrateur créé au premier démarrage |

## Autre hébergeur (VPS, Railway, Fly.io)
L'image Docker fonctionne partout : `docker build -t geoportail .` puis
`docker run -p 8000:8000 -e DATABASE_URL=... -e DJANGO_DEBUG=False -e DJANGO_SECRET_KEY=... -e DJANGO_ALLOWED_HOSTS=mondomaine.sn geoportail`.
