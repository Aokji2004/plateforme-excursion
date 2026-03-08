# Déploiement sur Render – Étape par étape

Suivez les étapes dans l’ordre. À la fin, votre plateforme sera en ligne.

---

## Avant de commencer

- [ ] Vous avez un compte sur [Render](https://render.com) (inscription gratuite).
- [ ] Votre projet est poussé sur **GitHub** (ou GitLab / Bitbucket).
- [ ] *(Optionnel)* Vous avez exporté vos données en local : `cd backend` puis `npm run export-data` (voir DEPLOIEMENT_RENDER.md pour restaurer après).

---

## PARTIE 1 : Créer les services sur Render

### Étape 1 – Ouvrir Render et lancer un Blueprint

1. Ouvrez **https://dashboard.render.com** dans votre navigateur.
2. Connectez-vous à votre compte Render.
3. En haut à droite, cliquez sur **« New + »**.
4. Dans le menu, choisissez **« Blueprint »**.
5. Si Render demande de connecter un dépôt :
   - Choisissez **GitHub** (ou GitLab / Bitbucket).
   - Autorisez Render si demandé.
   - Sélectionnez votre **organisation** ou **compte**.
   - Sélectionnez le dépôt du projet (ex. **Plateforme Excursion** ou le nom de votre repo).
6. Cliquez sur **« Connect »** (ou « Connect repository »).

### Étape 2 – Appliquer le Blueprint

1. Render affiche le fichier **`render.yaml`** et la liste des services à créer :
   - **plateforme-excursion-db** (base PostgreSQL)
   - **plateforme-excursion-backend** (API)
   - **plateforme-excursion-frontend** (site web)
2. Vous pouvez voir des champs pour des variables d’environnement. **Pour l’instant, laissez vides** les valeurs à saisir (CORS_ORIGIN, NEXT_PUBLIC_API_BASE_URL).
3. Cliquez sur le bouton bleu **« Apply »** en bas.
4. Attendez la création des 3 ressources (1 base + 2 services web).

### Étape 3 – Attendre le premier déploiement

1. Vous êtes redirigé vers le **Blueprint** (tableau de bord du groupe).
2. Les deux services web se **déploient** (build puis démarrage). Attendez **2 à 5 minutes**.
3. Le service **plateforme-excursion-backend** doit passer à **« Live »** (badge vert).
4. Le service **plateforme-excursion-frontend** peut afficher une erreur ou « Build failed » tant que **NEXT_PUBLIC_API_BASE_URL** n’est pas défini : **c’est normal**, on le corrige à l’étape suivante.

---

## PARTIE 2 : Récupérer les URLs

### Étape 4 – Noter l’URL du backend (API)

1. Dans la page du Blueprint, cliquez sur **« plateforme-excursion-backend »**.
2. En haut, vous voyez une URL du type : **https://plateforme-excursion-backend.onrender.com**
3. **Copiez cette URL** et gardez-la (bloc-notes). On l’appellera **URL_API**.  
   → Pas d’espace, **pas de slash à la fin**.

### Étape 5 – Noter l’URL du frontend

1. Retournez sur la page du **Blueprint**.
2. Cliquez sur **« plateforme-excursion-frontend »**.
3. En haut, notez l’URL du type : **https://plateforme-excursion-frontend.onrender.com**
4. **Copiez cette URL**. On l’appellera **URL_FRONTEND**.  
   → Pas de slash à la fin.

---

## PARTIE 3 : Configurer le frontend

### Étape 6 – Donner l’URL de l’API au frontend

1. Sur la page du Blueprint, cliquez sur **« plateforme-excursion-frontend »**.
2. Menu de gauche → **« Environment »**.
3. Trouvez **NEXT_PUBLIC_API_BASE_URL**. Si elle n’existe pas, cliquez sur **« Add Environment Variable »**.
   - **Key** : `NEXT_PUBLIC_API_BASE_URL`
   - **Value** : collez **URL_API** (ex. `https://plateforme-excursion-backend.onrender.com`).
4. Ajoutez aussi **NEXT_PUBLIC_APP_URL** (pour que les liens de candidature et QR soient corrects) :
   - **Key** : `NEXT_PUBLIC_APP_URL`
   - **Value** : collez **URL_FRONTEND** (ex. `https://plateforme-excursion-frontend.onrender.com`).
5. Cliquez sur **« Save Changes »**.
6. Render **redéploie** le frontend. Attendez que le statut repasse à **« Live »** (2 à 5 min).

---

## PARTIE 4 : Configurer le backend (CORS)

### Étape 7 – Autoriser le frontend dans CORS

1. Retournez sur le Blueprint et cliquez sur **« plateforme-excursion-backend »**.
2. Menu de gauche → **« Environment »**.
3. Ajoutez (ou modifiez) la variable :
   - **Key** : `CORS_ORIGIN`
   - **Value** : collez **URL_FRONTEND** (ex. `https://plateforme-excursion-frontend.onrender.com`), sans slash à la fin.
4. Cliquez sur **« Save Changes »**.
5. Attendez le redéploiement du backend (statut **« Live »**).

---

## PARTIE 5 : Créer le compte admin

### Étape 8 – Définir l’email et le mot de passe admin

1. Toujours sur **« plateforme-excursion-backend »**, allez dans **« Environment »**.
2. Ajoutez deux variables :
   - **Key** : `SEED_ADMIN_EMAIL`  
     **Value** : l’email avec lequel vous voulez vous connecter (ex. `admin@votredomaine.ma`).
   - **Key** : `SEED_ADMIN_PASSWORD`  
     **Value** : un **mot de passe fort** (au moins 8 caractères, à garder secret).
3. Cliquez sur **« Save Changes »**.

### Étape 9 – Lancer le script de création de l’admin

1. Sur la page du service **« plateforme-excursion-backend »**, menu de gauche → **« Shell »** (ou **« Console »**).
2. Un terminal s’ouvre dans le répertoire du backend.
3. Tapez :
   ```bash
   npm run seed:prod
   ```
4. Appuyez sur **Entrée**.
5. Vous devez voir un message du type : **« Utilisateur admin créé »** ou **« Utilisateur admin déjà existant »**.
6. Si une erreur indique que le mot de passe par défaut est interdit en production : vérifiez que **SEED_ADMIN_EMAIL** et **SEED_ADMIN_PASSWORD** sont bien définis dans Environment, sauvegardez, puis réessayez.

---

## PARTIE 6 : (Optionnel) Importer vos données

Si vous avez exporté vos données en local avant le déploiement (voir DEPLOIEMENT_RENDER.md), vous pouvez les importer dans la base Render pour retrouver utilisateurs, activités, inscriptions, etc. Suivez la section « Après déploiement sur Render : restaurer la sauvegarde » dans **DEPLOIEMENT_RENDER.md**.

Si la base est vide et que vous n’avez pas d’export, le **seed** (étape 9) suffit pour avoir un premier admin.

---

## PARTIE 7 : Tester la plateforme

### Étape 10 – Se connecter

1. Ouvrez un nouvel onglet et allez sur **URL_FRONTEND** (ex. `https://plateforme-excursion-frontend.onrender.com`).
2. La page de **connexion** s’affiche.
3. Entrez :
   - **Email** : la valeur de `SEED_ADMIN_EMAIL`.
   - **Mot de passe** : la valeur de `SEED_ADMIN_PASSWORD`.
4. Cliquez sur **« Se connecter »**.
5. Vous devez être redirigé vers le **tableau de bord admin**.

Si la page reste blanche ou affiche une erreur réseau, attendez **30 secondes à 1 minute** (service gratuit peut être en train de se réveiller) et réessayez.

---

## Récapitulatif des URLs

| Rôle        | URL (exemple) |
|------------|----------------|
| **Site (frontend)** | https://plateforme-excursion-frontend.onrender.com |
| **API (backend)**   | https://plateforme-excursion-backend.onrender.com |

Les noms exacts dépendent de votre compte Render.

---

## En cas de problème

| Problème | Action |
|----------|--------|
| « Failed to fetch » ou pas de données | Vérifiez **NEXT_PUBLIC_API_BASE_URL** (frontend) = URL de l’API, puis redéployez le frontend. |
| Erreur CORS dans la console du navigateur | Vérifiez **CORS_ORIGIN** (backend) = URL du frontend, puis redéployez l’API. |
| Page blanche ou 503 | Attendez 1–2 min (réveil du service gratuit). Consultez l’onglet **Logs** du service concerné. |
| Seed refusé (« mot de passe par défaut ») | Ajoutez **SEED_ADMIN_EMAIL** et **SEED_ADMIN_PASSWORD** dans Environment de l’API, sauvegardez, puis relancez `npm run seed:prod` dans le Shell. |

---

Vous avez terminé : la plateforme est déployée sur Render et vous pouvez vous connecter en admin.
