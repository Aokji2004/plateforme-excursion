# Déployer la Plateforme Excursion OCP sur Render

Ce guide décrit comment déployer le projet (backend API + frontend Next.js + base PostgreSQL) sur [Render](https://render.com) pour le partager en ligne.

## Prérequis

- Un compte [Render](https://render.com) (gratuit)
- Le projet poussé sur **GitHub** ou **GitLab** (Render déploie à partir du dépôt Git)

---

## Sauvegarder la base de données avant déploiement

Pour ne pas perdre vos données (utilisateurs, activités, inscriptions, etc.), exportez la base **avant** de déployer sur Render.

### 1. Export (en local, avec votre base actuelle)

Depuis la racine du projet :

```bash
cd backend
npm run export-data
```

Un fichier JSON est créé dans `backend/data-export/export-AAAA-MM-JJTHH-MM-SS.json`. Ce dossier est dans `.gitignore` (ne pas committer les exports).

### 2. Après déploiement sur Render : restaurer la sauvegarde

Une fois la base PostgreSQL Render créée (vide) et le schéma appliqué par le déploiement du backend :

1. Récupérez l’**Internal Database URL** de la base Render (onglet **Info** de `plateforme-excursion-db`).
2. En local, dans `backend`, appliquez les migrations sur la base Render (une seule fois) :
   ```bash
   cd backend
   set DATABASE_URL=postgresql://...   # coller l’Internal Database URL
   npx prisma migrate deploy
   ```
3. Lancez l’import (la base Render doit être **vide**) :
   - **Windows (cmd)** : `set DATABASE_URL=postgresql://...` puis `npm run import-data`
   - **Windows (PowerShell)** : `$env:DATABASE_URL="postgresql://..."` puis `npm run import-data`
   - **Linux / Mac** : `export DATABASE_URL="postgresql://..."` puis `npm run import-data`
   Pour cibler un fichier précis : `npm run import-data -- data-export/export-2025-03-06T12-00-00.json`

Les utilisateurs, activités, inscriptions, types d’activité, etc. sont recréés dans la base Render. Vous pouvez ensuite vous connecter avec un compte admin existant (celui de l’export).

---

## Option A : Déploiement avec le Blueprint (recommandé)

Le fichier `render.yaml` à la racine du projet définit toute l’infrastructure (base de données + 2 services web).

### 1. Connecter le dépôt Git à Render

1. Allez sur [dashboard.render.com](https://dashboard.render.com).
2. **New +** → **Blueprint**.
3. Connectez votre compte GitHub/GitLab si ce n’est pas déjà fait.
4. Sélectionnez le dépôt **Plateforme Excursion** et la branche à déployer (ex. `main`).
5. Render détecte `render.yaml`. Cliquez sur **Apply**.

### 2. Création des ressources

Render crée :

- **1 base PostgreSQL** : `plateforme-excursion-db`
- **1 service web Backend** : `plateforme-excursion-backend` (API Express)
- **1 service web Frontend** : `plateforme-excursion-frontend` (Next.js)

Lors de la première création, deux variables sont en **sync: false** : vous devez les renseigner à la main.

### 3. Renseigner les variables d’environnement

**Backend**

1. Ouvrez le service **plateforme-excursion-backend** → **Environment**.
2. **CORS_ORIGIN** : ajoutez l’URL du frontend une fois qu’elle est connue, par ex.  
   `https://plateforme-excursion-frontend.onrender.com`  
   (sans slash final).  
   Si vous avez un nom de domaine personnalisé pour le frontend, mettez cette URL.

**Frontend**

1. Ouvrez le service **plateforme-excursion-frontend** → **Environment**.
2. **NEXT_PUBLIC_API_BASE_URL** : mettez l’URL publique du backend, par ex.  
   `https://plateforme-excursion-backend.onrender.com`  
   (sans slash final).
3. **NEXT_PUBLIC_APP_URL** (recommandé) : mettez l’URL publique du frontend, par ex.  
   `https://plateforme-excursion-frontend.onrender.com`  
   pour que les **liens de candidature** et **codes QR** des activités pointent vers le bon domaine après déploiement.

**Ordre conseillé**

1. Laisser le **backend** et le **frontend** se déployer une première fois (le frontend aura une URL vide pour l’API tant que vous n’avez pas renseigné `NEXT_PUBLIC_API_BASE_URL`).
2. Noter l’URL du backend (ex. `https://plateforme-excursion-backend.onrender.com`).
3. Dans le **frontend**, ajouter la variable **NEXT_PUBLIC_API_BASE_URL** = URL du backend.
4. Dans le **backend**, ajouter **CORS_ORIGIN** = URL du frontend (ex. `https://plateforme-excursion-frontend.onrender.com`).
5. Déclencher un **redeploy** du frontend (et du backend si besoin) pour que les nouvelles variables soient prises en compte.

### 4. Données sur Render : import ou seed

**Si vous avez fait un export** (voir section « Sauvegarder la base de données avant déploiement ») : suivez les étapes de **restauration** ci-dessus pour importer votre sauvegarde dans la base Render. Vous retrouverez vos utilisateurs et activités.

**Si la base Render est vide** et que vous n’avez pas d’export, créez un premier admin avec le seed :

1. En local, dans le dossier `backend`, créez un fichier `.env` temporaire avec uniquement :
   - `DATABASE_URL` = l’URL de connexion PostgreSQL fournie par Render (onglet **Info** de la base `plateforme-excursion-db`, **Internal Database URL**).
   - `JWT_SECRET` = la même valeur que celle générée par Render pour le backend (visible dans **Environment** du service backend).
2. Exécutez :
   ```bash
   cd backend
   npx prisma migrate deploy   # si pas déjà fait
   npm run build
   SEED_ADMIN_EMAIL=votre-email@exemple.com SEED_ADMIN_PASSWORD=UnMotDePasseFort node dist/src/seed.js
   ```
3. Supprimez le `.env` local contenant la prod pour ne pas l’utiliser par erreur.

---

## Option B : Déploiement manuel (sans Blueprint)

Si vous ne souhaitez pas utiliser `render.yaml` :

### 1. Créer la base PostgreSQL

1. **New +** → **PostgreSQL**.
2. Nom : `plateforme-excursion-db`, région : **Frankfurt** (ou proche de vous), plan **Free**.
3. Créer. Noter l’**Internal Database URL** (pour le backend).

### 2. Créer le service Backend

1. **New +** → **Web Service**.
2. Connecter le dépôt, branche `main`.
3. **Root Directory** : `backend`.
4. **Runtime** : Node.
5. **Build Command** :  
   `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
6. **Start Command** : `npm run start`
7. **Variables d’environnement** :
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = (coller l’Internal Database URL de la base)
   - `JWT_SECRET` = une chaîne d’au moins 32 caractères (ex. générée avec `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `CORS_ORIGIN` = URL du frontend (ex. `https://plateforme-excursion-frontend.onrender.com`)
8. Créer le service. Noter l’URL du backend (ex. `https://xxx.onrender.com`).

### 3. Créer le service Frontend

1. **New +** → **Web Service**.
2. Même dépôt, branche `main`.
3. **Root Directory** : `frontend`.
4. **Runtime** : Node.
5. **Build Command** : `npm install && npm run build`
6. **Start Command** : `npm run start`
7. **Variables d’environnement** :
   - `NEXT_PUBLIC_API_BASE_URL` = URL du backend (ex. `https://plateforme-excursion-backend.onrender.com`)
8. Créer le service.

---

## Résumé des variables

| Où        | Variable                    | Description |
|-----------|-----------------------------|-------------|
| Backend   | `DATABASE_URL`              | URL PostgreSQL (fournie par Render si base liée) |
| Backend   | `JWT_SECRET`                | Secret JWT (min. 32 caractères), peut être généré par Render |
| Backend   | `CORS_ORIGIN`               | URL du frontend (ex. https://votre-frontend.onrender.com) |
| Frontend  | `NEXT_PUBLIC_API_BASE_URL`  | URL du backend (ex. https://votre-backend.onrender.com) |
| Frontend  | `NEXT_PUBLIC_APP_URL`       | URL du frontend (recommandé : liens candidature et QR corrects en prod) |

---

## Après le déploiement

- **Frontend** : ouvrir l’URL du service frontend (ex. `https://plateforme-excursion-frontend.onrender.com`).
- **Connexion** : utiliser l’email et le mot de passe du compte créé via le seed (ou votre première inscription admin).
- **Plan Free** : les services gratuits peuvent s’endormir après inactivité ; le premier chargement peut prendre quelques secondes.

Pour partager le projet, il suffit de communiquer l’URL du **frontend** ; les utilisateurs n’ont pas besoin d’accéder au backend directement.
