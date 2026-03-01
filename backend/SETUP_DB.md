# Configurer PostgreSQL pour le projet

**Configuration utilisée :** base **excursionocp**, utilisateur **postgres**, mot de passe **aya**.

## Fichier `.env`

Le fichier `backend\.env` doit contenir :

```env
DATABASE_URL="postgresql://postgres:aya@localhost:5432/excursionocp"
JWT_SECRET=un_super_secret_jwt_pour_ocp
PORT=4000
```

Vous pouvez copier le contenu depuis `backend\CONFIG_DOT_ENV.txt` vers `backend\.env`.

## Commandes utiles

Depuis le dossier `backend` :

```powershell
npx prisma migrate deploy   # Appliquer les migrations
npm run seed                 # Créer l'admin (admin@ocp.ma / Admin123!)
npm run dev                  # Démarrer le serveur
```
