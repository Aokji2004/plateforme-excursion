# Application prête à exécuter – Plateforme Excursion OCP

Ce document atteste que la **Plateforme Excursion OCP** est une **application prête à être exécutée** (POC opérationnelle), en local ou en déploiement (Render).

---

## 1. Positionnement

| Élément | Description |
|--------|-------------|
| **Type** | Application web (POC / MVP) prête à l’exécution |
| **Périmètre** | Gestion des excursions OCP : activités, inscriptions, sélection par points, situation familiale, enfants, historique |
| **Utilisateurs** | Admin (gestion complète), Employés (inscription et consultation) |
| **État** | Fonctionnelle, testée, déployable |

---

## 2. Ce qui est en place (prêt à exécuter)

### Fonctionnel
- Authentification (login, JWT, rôles Admin / Employé)
- Tableau de bord admin (statistiques, graphiques, agents & familles, activités récentes)
- Gestion des activités (CRUD, types d’activité, sélection)
- Inscriptions (employé + admin), sélection automatique par points
- Clôture de sélection et attribution des points (formules SINGLE / COUPLE / FAMILY)
- Gestion des utilisateurs, points, situation familiale (marié/veuf/conjoint, célibataire/divorcé)
- Gestion des enfants (employés mariés, popup « Gérer les enfants »)
- Historique des inscriptions (export CSV, Excel, PDF)
- Barre latérale admin (icônes, profil, menu repliable, thème OCP)

### Technique
- Backend : Node.js, Express, TypeScript, Prisma, PostgreSQL
- Frontend : Next.js, React, Tailwind CSS
- Sécurité : validation des variables d’environnement (prod), en-têtes de sécurité, CORS configurable, pas de double crédit des points
- Scripts seed/setAdmin sécurisés (variables d’environnement en production)

### Qualité et déploiement
- Build backend et frontend OK
- Tests unitaires du barème de points (27 tests)
- Documentation : README, cahier des charges, checklist déploiement, guide Render étape par étape
- Blueprint Render : `render.yaml` pour déploiement en un clic

---

## 3. Comment exécuter l’application

### A. En local (développement)

| Étape | Commande / action |
|-------|-------------------|
| 1. Base de données | PostgreSQL installé et démarré, base créée (ex. `ocp_excursions`) |
| 2. Backend | `cd backend` → créer `.env` (DATABASE_URL, JWT_SECRET, PORT) → `npm install` → `npx prisma migrate deploy` → `npx prisma generate` → `npm run dev` |
| 3. Frontend | `cd frontend` → `.env.local` avec `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000` (optionnel) → `npm install` → `npm run dev` |
| 4. Admin initial | Dans un terminal backend : `npm run seed` (ou définir SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD pour la prod) |
| 5. Accès | Frontend : http://localhost:3000 — Connexion avec l’email/mot de passe du seed |

### B. En production (Render)

| Étape | Référence |
|-------|-----------|
| 1. Déployer | Suivre **GUIDE_DEPLOIEMENT_RENDER_ETAPE_PAR_ETAPE.md** (Blueprint → Apply → configurer URLs et CORS → seed) |
| 2. URLs | Frontend : https://ocp-excursions-web.onrender.com — API : https://ocp-excursions-api.onrender.com (exemples) |
| 3. Connexion | Même principe qu’en local avec les identifiants définis via SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD |

---

## 4. Checklist « Prête à exécuter »

| Critère | Statut |
|---------|--------|
| Code build sans erreur (backend + frontend) | Oui |
| Variables d’environnement documentées et validées en prod | Oui |
| Base de données (migrations Prisma) prêtes | Oui |
| Sécurité (JWT, CORS, en-têtes, pas de secrets en dur) | Oui |
| Gestion des erreurs (pas de crash sur « Failed to fetch ») | Oui |
| Barème de points testé et documenté | Oui |
| Déploiement Render documenté étape par étape | Oui |
| Utilisateur admin créable (seed) | Oui |

---

## 5. Synthèse

La Plateforme Excursion OCP est **une application prête à être exécutée** :

- **En local** : après configuration de la base et des `.env`, les commandes `npm run dev` (backend + frontend) et `npm run seed` permettent de lancer et d’utiliser l’application.
- **En production** : le Blueprint Render (`render.yaml`) et le guide étape par étape permettent de la déployer et de la considérer comme une application déployée et exécutable.

Ce document peut être utilisé pour valider que le projet est considéré comme **POC / application prête à exécuter** (démonstration, livrable, ou base pour la suite).
