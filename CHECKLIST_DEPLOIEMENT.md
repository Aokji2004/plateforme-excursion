# Checklist déploiement – Plateforme Excursion OCP

Vérification effectuée ensemble. À valider côté hébergeur et tests manuels avant mise en production.

**Améliorations stabilité / sécurité appliquées :**
- Backend : validation des variables d’environnement au démarrage (obligatoire en prod), en-têtes de sécurité (X-Content-Type-Options, X-Frame-Options, etc.), CORS configurable via `CORS_ORIGIN`, health check `/health` et `/health/db`, gestionnaire d’erreurs global (pas de fuite de stack trace en prod).
- Scripts seed/setAdmin : en production, refus d’utiliser le mot de passe par défaut ; utiliser les variables `SEED_ADMIN_EMAIL` et `SEED_ADMIN_PASSWORD`.
- Frontend : URL API centralisée dans `utils/config.ts` ; en production un avertissement est affiché si `NEXT_PUBLIC_API_BASE_URL` n’est pas défini.

---

## 1. Variables d'environnement

### Backend (dossier `backend`)

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| **DATABASE_URL** | Oui (prod) | URL PostgreSQL de prod, ex. `postgresql://user:password@host:5432/ocp_excursions` |
| **JWT_SECRET** | Oui (prod) | Secret long et aléatoire (min. 32 caractères). Générer avec : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| **PORT** | Non | Port du serveur (défaut 4000) |
| **CORS_ORIGIN** | Non (recommandé en prod) | Origines autorisées, séparées par des virgules (ex. `https://votre-app.vercel.app`) |
| **SEED_ADMIN_EMAIL** / **SEED_ADMIN_PASSWORD** | Pour scripts seed/setAdmin | En prod, définir ces variables avant d’exécuter seed ou setAdmin (le mot de passe par défaut est refusé en prod) |

**Fichier :** créer `.env` en prod à partir de `backend/.env.example`. Ne jamais commiter `.env`.

### Frontend (dossier `frontend`)

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| **NEXT_PUBLIC_API_BASE_URL** | Oui | URL publique de l’API en prod, ex. `https://api-votre-app.render.com` ou `https://votre-backend.herokuapp.com` |

**Fichier :** en prod, souvent `.env.production` ou variables d’environnement de la plateforme (Vercel, Render, etc.).

**Statut :** ✅ Fichiers `.env.example` présents. À configurer sur l’environnement de production.

---

## 2. Base de données

- **Migrations Prisma :** 8 migrations présentes dans `backend/prisma/migrations/`.
- **Commande à exécuter sur la base de prod (après déploiement backend) :**
  ```bash
  cd backend
  npx prisma migrate deploy
  ```
- **Génération du client Prisma** (souvent fait lors du build) :
  ```bash
  npx prisma generate
  ```

**Statut :** ✅ Migrations prêtes. À lancer `prisma migrate deploy` une fois la base de prod créée et `DATABASE_URL` configurée.

---

## 3. Build

| Projet | Commande | Résultat |
|--------|----------|----------|
| **Backend** | `cd backend && npm run build` | ✅ OK (TypeScript compilé) |
| **Frontend** | `cd frontend && npm run build` | ✅ OK (Next.js build réussi) |

**Statut :** ✅ Les deux builds passent sans erreur.

---

## 4. Sécurité

| Point | Statut |
|-------|--------|
| **JWT_SECRET** | Lu depuis `process.env.JWT_SECRET` (auth.ts, middleware/auth.ts). Aucun secret en dur dans le code applicatif. ✅ |
| **Mots de passe** | Toujours hashés (bcrypt) avant stockage. ✅ |
| **Scripts de seed / admin** | Les fichiers `backend/src/seed.ts`, `backend/src/setAdmin.ts` et certains scripts `add*.ts` contiennent des mots de passe par défaut (**popap.2004**, **Password123!**, **test**). À utiliser **uniquement en dev/local**. En prod : ne pas lancer ces scripts tels quels, ou les adapter pour lire un mot de passe depuis une variable d’environnement. ⚠️ |
| **HTTPS** | À configurer sur l’hébergeur (certificat SSL). Le code ne force pas HTTPS ; c’est au reverse proxy / plateforme de le gérer. |

**Statut :** ✅ Pas de clés ou secrets en dur dans l’application principale. ⚠️ Ne pas exécuter seed/setAdmin avec les valeurs par défaut en production.

---

## 5. Tests manuels (à faire par vous)

À valider après déploiement sur un environnement de préprod ou prod :

| Scénario | À vérifier |
|----------|------------|
| **Connexion admin** | Login avec un compte ADMIN → redirection vers tableau de bord admin. |
| **Connexion employé** | Login avec un compte EMPLOYEE → redirection vers dashboard employé. |
| **Inscription** | En tant qu’employé : s’inscrire à une activité ouverte → inscription visible côté admin. |
| **Sélection** | Côté admin : lancer la sélection sur une activité → vérifier sélectionnés / liste d’attente. |
| **Clôture + points** | Clôturer la sélection → vérifier que les points sont crédités aux participants (et dans l’historique des points). |
| **Situation familiale** | Modifier la situation d’un agent (ex. Marié/Divorcé) → Enregistrer → pas d’erreur, données à jour. |
| **Gestion enfants** | Ouvrir « Gérer les enfants » pour un employé marié → ajouter / supprimer un enfant → sauvegarde OK. |

**Statut :** À faire par vous après déploiement.

---

## 6. Résumé

| Étape | Statut |
|-------|--------|
| 1. Variables d’environnement | ✅ Exemples présents ; à configurer en prod |
| 2. Base de données | ✅ Migrations prêtes ; lancer `prisma migrate deploy` en prod |
| 3. Build | ✅ Backend + Frontend OK |
| 4. Sécurité | ✅ Pas de secrets en dur dans l’app ; attention aux scripts seed/admin en prod |
| 5. Tests manuels | ⏳ À faire après déploiement |

Une fois les variables et la base configurées, les builds déployés et les tests manuels validés, la plateforme peut être considérée prête pour la production.
