# Sauvegarde et récupération des données

## Résultat de la recherche dans le projet

**Aucun fichier de sauvegarde de la base de données n’a été trouvé** dans le dossier du projet :

- Pas de fichier `.sql` contenant des données (INSERT…)
- Pas de fichier `.backup` ou `.dump` (export PostgreSQL)
- Les seuls `.sql` présents sont :
  - `scripts/init-db.sql` (configuration)
  - `prisma/migrations/*.sql` (schéma des tables uniquement, pas les données)

Donc **les données (utilisateurs, excursions, etc.) ne sont pas stockées dans des fichiers** du projet. Elles ne peuvent exister que dans une base PostgreSQL (sur ce PC ou sur l’autre).

---

## Où peuvent être vos anciennes données ?

1. **Sur l’ancien PC**  
   Dans la base PostgreSQL de l’autre machine (il faut faire un export depuis là-bas).

2. **Sur ce PC, dans une autre base**  
   Par exemple une base avec un nom différent (ex. `ocp_excursions` au lieu de `excursionocp`). À vérifier dans pgAdmin.

3. **Fichier de sauvegarde ailleurs**  
   Un export fait à la main (pg_dump, pgAdmin Backup) et enregistré sur le Bureau, dans Documents, sur une clé USB, etc.

---

## Récupérer les données depuis l’ancien PC

Sur l’**ancien ordinateur** (avec PostgreSQL et la base qui contenait vos données) :

1. Ouvrir **pgAdmin** (ou une invite de commandes avec `pg_dump`).
2. Faire un **export (backup)** de la base concernée :
   - pgAdmin : clic droit sur la base → **Backup…** → choisir un nom de fichier (ex. `ocp_backup.backup` ou `ocp_backup.sql`).
   - Ligne de commande :  
     `pg_dump -U postgres -d NOM_DE_LA_BASE -F c -f ocp_backup.backup`
3. Copier le fichier généré sur **ce PC** (USB, réseau, etc.).
4. Sur **ce PC**, dans pgAdmin : clic droit sur **Databases** → **Restore** → choisir le fichier de backup.
5. Mettre à jour `backend\.env` :  
   `DATABASE_URL="postgresql://postgres:aya@localhost:5432/NOM_DE_LA_BASE_RESTAUREE"`  
   puis redémarrer le backend.

---

## Recréer des données de démo (sans ancienne sauvegarde)

Si vous n’avez pas de backup et voulez au moins des **excursions et types d’activités de test** dans la base actuelle (`excursionocp`) :

```powershell
cd "c:\Users\IMAD MSAADI\Desktop\Plateforme Excursion\backend"
npx ts-node-dev --transpile-only src/addActivities.ts
```

Cela ajoute des excursions de démo (Marrakech, Essaouira, Agadir, etc.) sans supprimer l’admin ni les données déjà présentes.
