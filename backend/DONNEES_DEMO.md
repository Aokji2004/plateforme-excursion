# Données de démonstration (enregistrées dans PostgreSQL)

Les données ci-dessous ont été ajoutées dans la base **excursionocp** et sont **déjà enregistrées** dans PostgreSQL (visibles dans pgAdmin).

---

## Compte administrateur

| Champ      | Valeur        |
|-----------|----------------|
| Email     | `mohamed.msaadi@ocp.ma` |
| Mot de passe | `popap.2004` |

---

## Excursions créées (3)

1. **Excursion Marrakech** – Famille, 4 jours, 50 places  
2. **Escapade à Essaouira** – Couple, 4 jours, 30 places  
3. **Excursion à Agadir** – Single, 6 jours, 40 places  

---

## Utilisateurs employés (60)

- **60 employés** avec noms et emails variés (ex. walid.ighcheni@gmail.com, aziz.qadi1@ocp.ma, etc.)
- **Mot de passe commun pour tous :** `Password123!`
- Chaque employé est **inscrit** à l’excursion « Escapade à Essaouira ».

Pour vous connecter en tant qu’employé, utilisez n’importe quel email créé (voir les logs du script ou les tables `User` / `ExcursionApplication` dans pgAdmin) avec le mot de passe **`Password123!`**.

---

## Où voir les données dans pgAdmin

1. Connectez-vous à PostgreSQL (utilisateur `postgres`, mot de passe `aya`).
2. Ouvrez la base **excursionocp**.
3. Schemas → **public** → **Tables** :
   - **User** : admin + 60 employés
   - **Excursion** : 3 excursions
   - **ExcursionApplication** : 60 inscriptions
   - **ExcursionDay** : jours pour chaque excursion

Les données restent en base tant que vous ne supprimez pas les tables ou ne restaurez pas une autre sauvegarde.
