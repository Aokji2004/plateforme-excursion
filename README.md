# 🏖️ Plateforme Excursion OCP

Plateforme de gestion des excursions pour les employés de l'Office Chérifien des Phosphates (OCP).

## 📋 Description

Cette application permet de gérer les inscriptions aux excursions organisées par l'OCP. Elle inclut un système de sélection automatique basé sur les points des employés, une gestion des listes d'attente, et des fonctionnalités administratives complètes.

## 🚀 Fonctionnalités

### Pour les Employés
- 📝 Inscription aux excursions disponibles
- 📊 Consultation du tableau de bord personnel
- 💰 Suivi des points et historique
- 📅 Visualisation des excursions auxquelles ils sont inscrits

### Pour les Administrateurs
- 🎯 Création et gestion des excursions
- 👥 Gestion des utilisateurs et des points
- 🎲 Système de sélection automatique basé sur les points
- 📋 Gestion des inscriptions et listes d'attente
- ✅ Confirmation des paiements
- 📊 Statistiques et rapports
- 🔄 Promotion depuis la liste d'attente
- ❌ Refus de participants

## 🛠️ Technologies

### Backend
- **Node.js** avec **Express**
- **TypeScript**
- **Prisma** (ORM)
- **PostgreSQL** (Base de données)
- **JWT** (Authentification)
- **bcryptjs** (Hachage des mots de passe)

### Frontend
- **Next.js 16**
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**

## 📦 Installation

### Prérequis
- Node.js (v18 ou supérieur)
- PostgreSQL
- npm ou yarn

### Configuration Backend

1. Naviguez vers le dossier backend :
```bash
cd backend
```

2. Installez les dépendances :
```bash
npm install
```

3. Configurez la base de données :
   - Créez un fichier `.env` dans le dossier `backend` avec les variables suivantes :
```env
DATABASE_URL="postgresql://user:password@localhost:5432/ocp_excursions?schema=public"
JWT_SECRET="votre_secret_jwt_ici"
PORT=4000
```
   - Vous pouvez copier ces lignes dans un nouveau fichier `.env` et adapter les valeurs.

4. Exécutez les migrations Prisma :
```bash
npx prisma migrate deploy
```

5. Générez le client Prisma :
```bash
npx prisma generate
```

6. Créez l'utilisateur admin initial :
```bash
npm run seed
```

Les identifiants admin par défaut sont :
- Email: `mohamed.msaadi@ocp.ma`
- Mot de passe: `popap.2004`

### Configuration Frontend

1. Naviguez vers le dossier frontend :
```bash
cd frontend
```

2. Installez les dépendances :
```bash
npm install
```

3. Configurez l'URL de l'API (si nécessaire) :
   - Créez un fichier `.env.local` dans le dossier `frontend` avec :
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```
   - Sans cette variable, le frontend utilise par défaut `http://localhost:4000`.

## 📂 Après avoir copié le projet sur un autre PC

Si vous avez copié le dossier du projet depuis un autre ordinateur, faites les étapes suivantes sur le **nouveau PC** :

### 1. Backend

| Étape | Commande / action |
|-------|-------------------|
| Aller dans le backend | `cd backend` |
| Réinstaller les dépendances | `npm install` |
| Créer le fichier `.env` | Créez `backend/.env` avec `DATABASE_URL`, `JWT_SECRET`, `PORT` (voir section Configuration Backend ci-dessus). **Souvent le `.env` n’est pas copié.** |
| Appliquer les migrations (base de données) | `npx prisma migrate deploy` |
| Générer le client Prisma | `npx prisma generate` |
| (Optionnel) Recréer l’admin et les données de test | `npm run seed` |

### 2. Frontend

| Étape | Commande / action |
|-------|-------------------|
| Aller dans le frontend | `cd frontend` |
| Réinstaller les dépendances | `npm install` |
| Fichier d’environnement | Créez `frontend/.env.local` avec `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000` si besoin. |

### 3. Lancer le projet

- **Backend :** `cd backend` puis `npm run dev`
- **Frontend :** `cd frontend` puis `npm run dev`

**À vérifier sur le nouveau PC :** PostgreSQL installé et démarré, base `ocp_excursions` créée (ou créée automatiquement par la première migration si votre `DATABASE_URL` pointe vers une base existante).

---

## 🚀 Démarrage

### Backend
```bash
cd backend
npm run dev
```
Le serveur démarre sur `http://localhost:4000`

### Frontend
```bash
cd frontend
npm run dev
```
L'application démarre sur `http://localhost:3000`

---

## ☁️ Déploiement sur Render

Le projet peut être déployé sur [Render](https://render.com) avec un **Blueprint** (backend + frontend + base PostgreSQL).

### Prérequis

- Un compte [Render](https://render.com)
- Le code poussé sur un dépôt Git (GitHub, GitLab ou Bitbucket)

### Étapes

1. **Connecter le dépôt**
   - Sur [dashboard.render.com](https://dashboard.render.com), cliquez sur **New** → **Blueprint**.
   - Connectez votre dépôt et sélectionnez le repo de la Plateforme Excursion.

2. **Créer le Blueprint**
   - Render détecte le fichier `render.yaml` à la racine du projet.
   - Cliquez sur **Apply** pour créer les services et la base de données.

3. **Variables d'environnement**
   - Lors de la création, Render vous demandera la valeur de **NEXT_PUBLIC_API_BASE_URL** (frontend).
   - Indiquez l’**URL publique du backend** : `https://ocp-excursions-api.onrender.com` (ou l’URL affichée pour le service API après le premier déploiement).
   - **JWT_SECRET** est généré automatiquement par le Blueprint.
   - **DATABASE_URL** est rempli automatiquement via la base PostgreSQL du Blueprint.

4. **Premier déploiement**
   - Le **backend** : install → `prisma generate` → `prisma migrate deploy` → build → start.
   - Le **frontend** : install → build → start (avec `NEXT_PUBLIC_API_BASE_URL` défini).
   - Une fois le backend déployé, notez son URL (ex. `https://ocp-excursions-api.onrender.com`) et, si ce n’est pas déjà fait, définissez **NEXT_PUBLIC_API_BASE_URL** du frontend avec cette URL, puis redéployez le frontend.

5. **Utilisateur admin initial**
   - Une fois le backend déployé, ouvrez le service **ocp-excursions-api** sur Render → onglet **Shell**.
   - Exécutez : `npm run seed:prod` (crée l’admin et les données de test).
   - Identifiants par défaut : `mohamed.msaadi@ocp.ma` / `popap.2004` (à modifier en production).

### Fichier `render.yaml`

À la racine du projet, `render.yaml` définit :

- **Base PostgreSQL** : `ocp-excursions-db` (plan free par défaut).
- **Service API** : `ocp-excursions-api` (dossier `backend`, migrations Prisma en `preDeployCommand`).
- **Service Web** : `ocp-excursions-web` (dossier `frontend`, Next.js).

Les URLs finales seront du type :
- API : `https://ocp-excursions-api.onrender.com`
- Site : `https://ocp-excursions-web.onrender.com`

### Note

Sur le plan **free**, les services s’endorment après inactivité ; le premier chargement peut prendre quelques dizaines de secondes.

---

## 📁 Structure du Projet

```
Plateforme Excursion/
├── backend/
│   ├── src/
│   │   ├── routes/          # Routes API
│   │   ├── services/         # Services métier
│   │   ├── middleware/       # Middleware (auth, etc.)
│   │   ├── config/           # Configuration
│   │   └── index.ts          # Point d'entrée
│   ├── prisma/
│   │   ├── schema.prisma     # Schéma de base de données
│   │   └── migrations/       # Migrations Prisma
│   └── package.json
├── frontend/
│   ├── pages/                # Pages Next.js
│   │   ├── admin/            # Pages admin
│   │   ├── employee/         # Pages employé
│   │   └── login.tsx         # Page de connexion
│   ├── components/           # Composants React
│   ├── public/               # Assets statiques
│   └── package.json
└── README.md
```

## 🔐 Authentification

L'application utilise JWT pour l'authentification. Les tokens sont stockés dans le localStorage du navigateur.

### Rôles
- **ADMIN** : Accès complet à toutes les fonctionnalités
- **EMPLOYEE** : Accès limité aux fonctionnalités employé

## 📊 Modèles de Données Principaux

### User
- Informations utilisateur (email, nom, prénom, matricule)
- Points accumulés
- Rôle (ADMIN/EMPLOYEE)

### Excursion
- Détails de l'excursion (titre, ville, dates, prix)
- Statut (OPEN/FULL/CLOSED)
- Statut de sélection (NOT_STARTED/IN_PROGRESS/COMPLETED/CLOSED)
- Dates d'inscription et de paiement

### ExcursionApplication
- Inscription d'un utilisateur à une excursion
- Statut d'inscription (INSCRIT/SELECTIONNE/ATTENTE/FINAL/REFUSE)
- Score calculé pour la sélection
- Ordre de sélection

### ActivityType
- Types d'activités avec points associés
- Bénéficiaires (FAMILY/SINGLE/COUPLE)

## 🎯 Système de Sélection

Le système de sélection automatique fonctionne comme suit :

1. **Calcul du score** : Basé sur les points de l'utilisateur
2. **Tri** : Les candidats sont triés par score croissant (moins de points = priorité)
3. **Sélection** : Les N premiers candidats sont sélectionnés
4. **Liste d'attente** : Les autres sont placés en liste d'attente

### Lancer une sélection

1. Accédez à `/admin/activities/selection/[id]`
2. Entrez le nombre de places disponibles
3. Cliquez sur "Lancer la sélection"
4. Les participants sont automatiquement sélectionnés et classés

## 📝 Scripts Utiles

### Backend
- `npm run dev` : Démarre le serveur en mode développement
- `npm run build` : Compile TypeScript
- `npm run start` : Démarre le serveur en production
- `npm run seed` : Crée l'utilisateur admin initial

### Frontend
- `npm run dev` : Démarre le serveur de développement
- `npm run build` : Build de production
- `npm run start` : Démarre le serveur de production
- `npm run lint` : Vérifie le code avec ESLint

## 🔧 API Endpoints

### Authentification
- `POST /auth/login` - Connexion
- `POST /auth/register` - Inscription (si activée)

### Excursions
- `GET /excursions` - Liste des excursions
- `GET /excursions/:id` - Détails d'une excursion
- `POST /excursions` - Créer une excursion (admin)
- `PUT /excursions/:id` - Modifier une excursion (admin)

### Applications
- `POST /excursions/:id/apply` - S'inscrire à une excursion
- `GET /admin/applications` - Liste des inscriptions (admin)

### Sélection
- `POST /admin/selection/start` - Lancer une sélection
- `POST /admin/selection/reset` - Réinitialiser une sélection
- `POST /admin/selection/close` - Clôturer une sélection

### Utilisateurs
- `GET /users/me` - Profil utilisateur actuel
- `GET /admin/users` - Liste des utilisateurs (admin)
- `PUT /admin/users/:id/points` - Modifier les points (admin)

### Statistiques
- `GET /admin/stats` - Statistiques générales (admin)

## 🐛 Dépannage

### Problème de connexion à la base de données
- Vérifiez que PostgreSQL est démarré
- Vérifiez la variable `DATABASE_URL` dans `.env`
- Exécutez `npx prisma migrate deploy` pour appliquer les migrations

### Problème d'authentification
- Vérifiez que `JWT_SECRET` est défini dans `.env`
- Vérifiez que le token est bien stocké dans le localStorage

### Problème de sélection
- Vérifiez que les utilisateurs ont des points
- Vérifiez que l'excursion a des inscriptions
- Consultez les logs du serveur pour plus de détails

## 📚 Documentation Additionnelle

- `GUIDE_SELECTION.md` - Guide pour utiliser le système de sélection
- `SOLUTION_COMPLETE.md` - Documentation technique sur la synchronisation des données

## 👥 Contribution

Ce projet est développé pour l'OCP. Pour toute question ou problème, contactez l'équipe de développement.

## 📄 Licence

Propriétaire - OCP

---

**Version**: 1.0.0  
**Dernière mise à jour**: Janvier 2025
