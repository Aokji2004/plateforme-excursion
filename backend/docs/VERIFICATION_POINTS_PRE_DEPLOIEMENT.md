# Vérification du système de points – Pré-déploiement

**Date :** Mars 2025  
**Objectif :** Vérifier que le barème de points (nature/type d’activité, situation familiale, nombre d’enfants) est correct avant déploiement.

---

## 1. Règles métier (Cahier des charges § 3.7)

| Type d’activité | Formule des points crédités |
|-----------------|-----------------------------|
| **SINGLE** (Célibataire) | Points = **points agent** uniquement |
| **COUPLE** | Points = **points agent** + **(points conjoint si l’employé est marié)** |
| **FAMILY** (Famille) | Points = **points agent** + **(points conjoint si marié)** + **(nombre d’enfants × points par enfant)** |

- La **source des points** est toujours le **type d’activité** (ActivityType) lié à l’excursion.
- La **formule** appliquée (SINGLE / COUPLE / FAMILY) est déterminée par le **bénéficiaire** du type d’activité (ou à défaut par le type d’excursion).
- Seuls les participants **SELECTIONNE** ou **FINAL** reçoivent des points à la clôture.
- **Anti-double crédit** : une activité déjà créditée ne crédite plus.

---

## 2. Implémentation

- **Formule :** `backend/src/services/pointsFormula.ts`  
  - `computePointsToCredit(beneficiary, activityType, user)`  
  - `resolveBeneficiaryForFormula(activityType.beneficiary, excursion.type)`
- **Crédit à la clôture :** `SelectionService.creditPointsForClosedExcursion()` utilise cette formule pour chaque inscription SELECTIONNE/FINAL.
- **Tests unitaires :** `backend/src/services/pointsFormula.test.ts` (27 tests).

---

## 3. Table de vérification – Résultats attendus vs calculés

Barème de test : **4 pts agent**, **2 pts conjoint**, **1 pt/enfant**.

| Scénario | Type | Situation | Enfants | Points attendus | Statut test |
|----------|------|-----------|---------|-----------------|-------------|
| Célibataire | SINGLE | Célibataire | 0 | 4 | ✅ |
| Marié (formule SINGLE) | SINGLE | Marié | 2 | 4 | ✅ |
| COUPLE – Célibataire | COUPLE | Célibataire | 0 | 4 | ✅ |
| COUPLE – Marié | COUPLE | Marié | 0 | 6 | ✅ |
| COUPLE – Divorcé | COUPLE | Divorcé | 0 | 4 | ✅ |
| COUPLE – Veuf | COUPLE | Veuf | 0 | 4 | ✅ |
| FAMILY – Marié 0 enfant | FAMILY | Marié | 0 | 6 | ✅ |
| FAMILY – Marié 1 enfant | FAMILY | Marié | 1 | 7 | ✅ |
| FAMILY – Marié 3 enfants | FAMILY | Marié | 3 | 9 | ✅ |
| FAMILY – Marié 5 enfants | FAMILY | Marié | 5 | 11 | ✅ |
| FAMILY – Célibataire 2 enfants | FAMILY | Célibataire | 2 | 6 | ✅ |
| FAMILY – Divorcé 1 enfant | FAMILY | Divorcé | 1 | 5 | ✅ |

*Les points conjoint ne sont accordés que si le statut est **Marié** (MARRIED). Célibataire, Divorcé et Veuf n’ont pas de points conjoint.*

---

## 4. Lancer les tests

```bash
cd backend
npm run test -- --run src/services/pointsFormula.test.ts
```

**Résultat attendu :** 27 tests passés (dont 15 de conformité formules + résolution beneficiary, et 12 de la table de vérification audit).

---

## 5. Synthèse

| Point de contrôle | Statut |
|-------------------|--------|
| Formules SINGLE / COUPLE / FAMILY conformes au CDC | ✅ |
| Points toujours issus du type d’activité lié à l’excursion | ✅ |
| Bénéficiaire : priorité type d’activité, puis type excursion | ✅ |
| Marié / non marié pris en compte pour conjoint | ✅ |
| Nombre d’enfants pris en compte pour FAMILY | ✅ |
| Pas de double crédit (pointsCreditedAt) | ✅ |
| Seuls SELECTIONNE et FINAL crédités | ✅ |
| Tests unitaires + table de vérification | ✅ 27/27 |

**Conclusion :** Le système de points est vérifié et conforme au cahier des charges. Les tests peuvent être relancés à tout moment avant déploiement pour confirmer l’absence de régression.
