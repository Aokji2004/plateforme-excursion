# Vérification avant déploiement

Ce document résume les contrôles effectués et la checklist à valider avant de déployer sur Render.

## Contrôles déjà effectués

- **Backend** : `npm run build` (TypeScript) → OK  
- **Backend** : tests unitaires (pointsFormula) → 27 tests passés  
- **Frontend** : `npm run build` (Next.js) → OK  
- **Script d’import** : enums Prisma (InscriptionStatus, SelectionStatus, SelectionAction) alignés avec le schéma  
- **Linter** : pas d’erreurs sur les fichiers principaux  

## Checklist avant de déployer

1. **Sauvegarder la base locale**  
   ```bash
   cd backend && npm run export-data
   ```
   Un fichier sera créé dans `backend/data-export/`.

2. **Variables d’environnement sur Render**  
   - Backend : `DATABASE_URL` (auto si base liée), `JWT_SECRET` (généré ou manuel), `CORS_ORIGIN` = URL du frontend  
   - Frontend : `NEXT_PUBLIC_API_BASE_URL` = URL du backend (ex. `https://plateforme-excursion-backend.onrender.com`)  

3. **Après le premier déploiement**  
   - Renseigner `NEXT_PUBLIC_API_BASE_URL` et `CORS_ORIGIN`, puis **redéployer le frontend** (les variables `NEXT_PUBLIC_*` sont prises au build).  
   - Restaurer les données si besoin : `DATABASE_URL=<url Render> npm run import-data` depuis `backend`.  

4. **Connexion**  
   - Tester la page de login avec un compte admin (créé par seed ou import).  

## En cas de problème en production

- **« Impossible de joindre le serveur »** : vérifier que `NEXT_PUBLIC_API_BASE_URL` est bien défini et que le backend est démarré (plan Free : peut mettre quelques secondes au réveil).  
- **Erreur CORS** : vérifier que `CORS_ORIGIN` sur le backend correspond exactement à l’URL du frontend (sans slash final).  
- **Erreur 500 sur le backend** : consulter les logs du service sur le dashboard Render.
