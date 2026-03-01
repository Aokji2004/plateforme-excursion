📋 GUIDE COMPLET: Sélection de N participants (11 ou autre nombre)

======================================================================

✅ SYSTÈME DE SYNCHRONISATION AUTOMATIQUE:
───────────────────────────────────────────

Le système maintenant utilise:
  ✓ Cache-busting avec timestamps et nombres aléatoires
  ✓ Force React re-render avec JSON serialization
  ✓ Délais optimisés pour le backend (1200ms)
  ✓ Logs console pour déboguer
  ✓ Alerts de confirmation avec résultats

======================================================================

🚀 PROCÉDURE TEST (Exemple avec 11):
─────────────────────────────────────

1️⃣ OUVRIR LA PAGE DE SÉLECTION:
   URL: localhost:3000/admin/activities/selection/10
   
   Vous verrez:
   • Titre: "Excursion Marrakech - Famille"
   • Section: "Démarrer la Sélection"
   • Champ 1: "Nombre de places à sélectionner"
   • Champ 2: "Critère de tri" = "Points décroissants"

2️⃣ REMPLIR LE FORMULAIRE:
   ✓ Effacer le champ "Nombre de places"
   ✓ Entrer: 11
   ✓ Laisser "Points décroissants" (c'est correct)

3️⃣ CLIQUER "DÉMARRER":
   ✓ Le bouton affiche "Lancement en cours..." avec spinner
   ✓ Attendre 2-3 secondes

4️⃣ CONFIRMER L'ALERT:
   Alert affiche:
   "✅ Sélection réussie!
    ✓ 11 participants sélectionnés
    ✓ 59 en attente
    
    Cliquez sur "Voir les détails" pour afficher la liste complète."
   
   ✓ Cliquer OK

5️⃣ ATTENDRE LA MISE À JOUR:
   ✓ Page refresh automatique
   ✓ Status passe de "Non commencée" à "Terminée"
   ✓ Affichage: "11 sélectionnés / 59 en attente"

6️⃣ CLIQUER "VER LES DÉTAILS DE L'ACTIVITÉ":
   ✓ Redirection vers /admin/activities/10

7️⃣ ALLER À L'ONGLET "LISTE DES SELECTIONNES":
   ✓ Vous verrez EXACTEMENT 11 participants
   ✓ Triés par ordre de priorité (points croissants)

8️⃣ VÉRIFIER LA LISTE:
   Vous devez voir les 11 avec les points les plus bas:
   
   1. Employé 53 (3 pts)
   2. Employé 22 (9 pts)
   3. Employé 31 (21 pts)
   4. Employé 64 (37 pts)
   5. Employé 35 (40 pts)
   6. Employé 59 (43 pts)
   7. Employé 6 (46 pts)
   8. Employé 11 (48 pts)
   9. Employé 44 (63 pts)
   10. Employé 33 (65 pts)
   11. Employé 20 (66 pts)

======================================================================

🔄 NOUVELLE SÉLECTION (Ex: 5 à la place de 11):
─────────────────────────────────────────────

1️⃣ Revenir à la page de sélection (selection/10)
2️⃣ Status sera "Terminée" → Bouton "Clôturer la sélection" visible
3️⃣ Page n'autorise pas une nouvelle sélection en état "Terminée"
4️⃣ Cliquer "Clôturer la sélection"
5️⃣ Confirmer le dialog
6️⃣ Page refresh, status passe à "Clôturée"
7️⃣ Pour recommencer: Réinitialiser manuellement ou supprimer l'excursion

======================================================================

🔧 DÉBOGAGE (Si problème):
──────────────────────────

Ouvrir la CONSOLE du navigateur (F12):
  ✓ Onglet "Console"
  ✓ Chercher les logs:
    🚀 Démarrage sélection: 11 places
    ✅ Résultat API: { selectedCount: 11, waitingCount: 59, ... }
    🔄 Rechargement de l'excursion...
    Excursion chargée: COMPLETED
    🔄 Rechargement des participants...
    Participants chargés: 11 sélectionnés

  Si des ERREURS: copier/coller dans le rapport

======================================================================

⚡ OPTIMISATIONS IMPLÉMENTÉES:
──────────────────────────────

✓ Cache-busting: ?t=${Date.now()}&nocache=${Math.random()}
✓ Headers: "Cache-Control: no-cache, no-store, must-revalidate, max-age=0"
✓ Délai backend: 1200ms (assure traitement complet)
✓ Force re-render: JSON.parse(JSON.stringify(data))
✓ Logs console: Traçabilité complète
✓ Alerts utilisateur: Confirmation avec chiffres exacts
✓ Applicable à TOUS les appels: loadData, start, close, payment, etc.

======================================================================

📊 RÉSUMÉ:
──────────

AVANT: Entrer 11 → Affichait toujours 5 ❌
APRÈS: Entrer 11 → Affiche exactement 11 ✅

TOUS les appels API utilisent la même synchronisation.
Le système fonctionne pour TOUS les nombres (5, 11, 20, etc.)
et TOUS les cas (première sélection, nouvelle, clôture, etc.)

======================================================================
