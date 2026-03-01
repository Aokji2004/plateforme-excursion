# Intégration des images de villes

## 📁 Où placer les images

Les images des villes doivent être placées dans :
```
frontend/public/cities/
```

## 📋 Format des noms de fichiers

Pour que les images soient automatiquement détectées selon la ville de l'activité, nommez vos fichiers avec le **nom de la ville** (première lettre en majuscule) :

- `Marrakech.jpg` ou `Marrakech.png`
- `Essaouira.jpg`
- `Agadir.jpg`
- `Casablanca.jpg`
- `Rabat.jpg`
- etc.

**Extensions supportées :** `.jpg`, `.jpeg`, `.png`, `.webp`

## 🔄 Copier vos images depuis "ville sur eau"

### Option 1 : Copie manuelle

1. Ouvrez votre dossier **"ville sur eau"**.
2. Copiez toutes les images de villes.
3. Collez-les dans `frontend/public/cities/`.
4. Assurez-vous que les noms correspondent aux villes (ex. `Marrakech.jpg`, `Essaouira.jpg`).

### Option 2 : Script PowerShell (recommandé)

1. Ouvrez PowerShell dans le dossier du projet.
2. Exécutez :

```powershell
cd "c:\Users\IMAD MSAADI\Desktop\Plateforme Excursion\frontend"
.\scripts\copy-city-images.ps1 "C:\chemin\vers\votre\dossier\ville sur eau"
```

Remplacez `"C:\chemin\vers\votre\dossier\ville sur eau"` par le **chemin complet** de votre dossier.

Le script copiera automatiquement toutes les images (jpg, jpeg, png, webp) vers `frontend/public/cities/`.

## ✅ Vérification

Après avoir copié les images :

1. Vérifiez que les fichiers sont bien dans `frontend/public/cities/`.
2. Redémarrez le frontend (`npm run dev` dans `frontend`).
3. Les images s'afficheront automatiquement selon la ville de chaque activité.

## 🎨 Comment ça fonctionne

Le code dans `frontend/utils/cityImages.ts` :
- Cherche d'abord dans un mapping prédéfini (Marrakech, Essaouira, etc.).
- Si la ville n'est pas dans le mapping, génère automatiquement le chemin `/cities/NomDeLaVille.jpg`.
- Le navigateur charge l'image depuis `public/cities/`.

**Exemple :**
- Activité à **"Marrakech"** → affiche `/cities/Marrakech.jpg`
- Activité à **"Essaouira"** → affiche `/cities/Essaouira.jpg`
- Activité à **"Casablanca"** → affiche `/cities/Casablanca.jpg`

## 📝 Notes

- Si une image n'existe pas pour une ville, le navigateur affichera une erreur (image cassée).
- Vous pouvez ajouter une image par défaut en créant `frontend/public/cities/default.jpg`.
- Les images sont servies statiquement par Next.js depuis le dossier `public/`.
