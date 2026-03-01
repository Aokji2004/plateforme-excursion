# Test de conformité – Plan d'accréditation des points aux agents

## 1. Formules de calcul (barème)

Les formules sont implémentées dans `src/services/pointsFormula.ts` et **testées unitairement** dans `src/services/pointsFormula.test.ts`.

| Type activité | Formule | Exemple (4 pt agent, 2 pt conjoint, 1 pt/enfant) |
|---------------|---------|--------------------------------------------------|
| **SINGLE**    | `pts` (agent uniquement) | 4 |
| **COUPLE**    | `pts + (marié ? ptsConjoint : 0)` | Marié : 6 ; non marié : 4 |
| **FAMILY**    | `pts + (marié ? ptsConjoint : 0) + nb_enfants × ptsPerChild` | Marié + 3 enfants : 4+2+3 = **9** |

- **Source des points** : toujours le **type d'activité** (ActivityType) lié à l'excursion (`excursion.activityTypeId` → `activityType.points`, `pointsConjoint`, `pointsPerChild`). Une seule source, pas de mélange entre types.
- **Source du beneficiary (quelle formule appliquer)** : priorité au `beneficiary` du **type d'activité** (FAMILY / SINGLE / COUPLE). S'il est invalide ou vide, fallback sur le `type` de l'excursion (ExcursionType). Sinon défaut SINGLE. Ainsi les points du barème (ce type d'activité) sont toujours associés à la formule correspondante.
- **Valeurs manquantes** : `pointsConjoint` et `pointsPerChild` sont traités comme 0 si non renseignés.

## 2. Flux d'accréditation

1. **Déclencheur** : clôture de la sélection par l’admin (`POST /admin/selection/close` avec `excursionId`).
2. **Service** : `SelectionService.closeSelection(excursionId, adminId)`.
3. **Crédit** : si `!excursion.pointsCreditedAt && excursion.activityType && adminId`, appel à `creditPointsForClosedExcursion(excursionId, adminId)`.

### Qui reçoit des points ?

- Uniquement les inscriptions dont le statut est **SELECTIONNE** ou **FINAL** (liste finale + sélectionnés).
- Les inscriptions INSCRIT, ATTENTE ou REFUSE ne reçoivent pas de points.

### Anti-double crédit

- Si `excursion.pointsCreditedAt` est déjà renseigné, `creditPointsForClosedExcursion` retourne immédiatement `{ credited: 0, skipped: 0 }` sans modifier les points.
- Après un crédit réussi, `pointsCreditedAt` est mis à jour sur l’excursion.

### Enregistrement

- Pour chaque participant éligible (delta > 0) :
  - `User.points` est incrémenté de `delta`.
  - Une entrée `UserPointHistory` est créée avec `userId`, `delta`, `reason` (ex. "Points activité clôturée: {titre} ({type})"), `createdById` = admin.

## 3. Dépendance type d'activité (points associés sans erreur)

- **Liaison** : chaque excursion a un `activityTypeId` optionnel → un seul ActivityType (title, beneficiary, points, pointsPerChild, pointsConjoint). C'est **la** source des points pour le crédit à la clôture.
- **Formule appliquée** : `resolveBeneficiaryForFormula(activityType.beneficiary, excursion.type)` garantit que l'on utilise d'abord le beneficiary du type d'activité (FAMILY / SINGLE / COUPLE). Ex. type « Excursion FAMILY » avec beneficiary FAMILY → formule FAMILY avec les points de ce type (4+2+3×1 = 9 pour marié + 3 enfants). Type « Dîner Single » avec beneficiary SINGLE → formule SINGLE, 5 pts uniquement.
- **Tests** : les tests « Conformité : points du type d'activité + formule selon beneficiary » vérifient que pour un type FAMILY (4+2+1×3) on obtient 9, pour SINGLE (5) on obtient 5, pour COUPLE (4+2) on obtient 6, sans mélange ni mauvaise formule.

## 4. Vérifications effectuées

| Point de conformité | Statut |
|--------------------|--------|
| Formules SINGLE / COUPLE / FAMILY conformes au barème | OK (tests unitaires) |
| Points toujours pris du type d'activité lié à l'excursion | OK |
| Formule (beneficiary) privilégie le type d'activité, puis l'excursion | OK (resolveBeneficiaryForFormula + tests) |
| Marié / non marié pris en compte pour COUPLE et FAMILY | OK |
| Nombre d’enfants pris en compte pour FAMILY | OK |
| Pas de crédit si activité sans type d’activité | OK (creditPointsForClosedExcursion) |
| Pas de double crédit (pointsCreditedAt) | OK |
| Seuls SELECTIONNE et FINAL crédités | OK |
| adminId passé à la clôture (createdById dans l’historique) | OK (adminSelection close) |

## 5. Lancer les tests (15 tests)

```bash
cd backend
npm run test
```

Les tests couvrent les cas : SINGLE, COUPLE (marié / non marié), FAMILY (marié + 3 enfants = 9, marié sans enfant, non marié avec enfants, null/undefined).

## 5. Points d’attention en production

- S’assurer que chaque **activité** a un **type d’activité** (ActivityType) renseigné avec `points`, et si besoin `pointsConjoint` / `pointsPerChild`, et `beneficiary` (FAMILY, SINGLE, COUPLE).
- Les **enfants** sont comptés via la relation User → Child ; la situation familiale (maritalStatus, enfants) doit être à jour pour un calcul correct.
