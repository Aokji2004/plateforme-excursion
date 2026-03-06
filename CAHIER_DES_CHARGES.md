# Cahier des charges – Plateforme Excursion OCP

**Document de spécification fonctionnelle et technique**  
**Version :** 1.0  
**Date :** Février 2025  
**Maître d’ouvrage :** Office Chérifien des Phosphates (OCP)

---

## 1. Contexte et objectifs

### 1.1 Contexte

L’OCP organise des excursions et activités (famille, couple, célibataires) au bénéfice de ses employés. La gestion des inscriptions, du nombre limité de places et de l’équité d’accès (priorisation par points) était auparavant réalisée de manière dispersée. La **Plateforme Excursion OCP** centralise cette gestion dans une application web unique, sécurisée et traçable.

### 1.2 Objectifs

- **Centraliser** la gestion des activités (excursions, dîners, escapades, etc.) et des inscriptions.
- **Automatiser** la sélection des participants selon un barème de points (priorité aux agents ayant le moins de points).
- **Traçabiliser** les inscriptions, les statuts (sélectionné, liste d’attente, refusé, final), les paiements et l’historique des points.
- **Offrir** aux employés un espace de consultation et d’inscription, et aux administrateurs un tableau de bord complet pour piloter les activités et les utilisateurs.

### 1.3 Périmètre

- **Utilisateurs finaux :** employés OCP (inscription, consultation) et administrateurs (gestion complète).
- **Fonctionnel :** activités/excursions, types d’activité, inscriptions, sélection automatique, points, situation familiale et enfants, historique, export.
- **Technique :** application web (frontend + API), base de données PostgreSQL, déploiement possible sur Render (ou équivalent).

---

## 2. Acteurs et rôles

| Rôle        | Description                                                                 | Droits principaux                                                                 |
|------------|-----------------------------------------------------------------------------|-----------------------------------------------------------------------------------|
| **Employé** | Utilisateur authentifié (employé OCP)                                       | Voir les activités ouvertes, s’inscrire, consulter ses inscriptions et ses points. |
| **Admin**   | Administrateur de la plateforme                                             | Toutes les actions employé + gestion des activités, utilisateurs, inscriptions, sélection, types d’activité, enfants, situation familiale, historique, statistiques. |

L’authentification est basée sur **email + mot de passe** ; un **JWT** est émis après connexion et utilisé pour les appels API. Les rôles sont stockés en base (`User.role` : `EMPLOYEE` ou `ADMIN`).

---

## 3. Description fonctionnelle détaillée

### 3.1 Authentification et accès

- **Connexion** : page dédiée (`/login`) ; formulaire email / mot de passe ; en cas de succès, stockage du token JWT et des informations utilisateur (dont le rôle) en local.
- **Redirection selon le rôle** : un **admin** est redirigé vers le tableau de bord admin (`/admin/dashboard`), un **employé** vers le tableau de bord employé (`/employee/dashboard`).
- **Protection des routes** : les pages admin vérifient la présence du token et le rôle `ADMIN` ; sinon redirection vers la page de connexion ou vers le dashboard employé.
- **Déconnexion** : suppression du token et des données utilisateur en local, redirection vers `/login`.

### 3.2 Tableau de bord administrateur (Dashboard)

Le dashboard admin est le point d’entrée principal pour le pilotage de la plateforme. Il fournit une vue synthétique et des entrées vers les écrans de détail.

**Contenu principal :**

- **Indicateurs globaux (KPI)**  
  - Nombre total d’activités, d’activités ouvertes, complètes, clôturées.  
  - Répartition par type : Famille, Couple, Célibataire.  
  - Nombre total d’inscriptions, d’inscriptions approuvées, en attente, en liste d’attente.  
  - Nombre total d’utilisateurs ; optionnellement utilisateurs avec situation familiale renseignée, nombre d’employés mariés, total d’enfants déclarés.

- **Graphiques**  
  - Répartition des activités par type (ex. diagramme en barres ou camembert).  
  - Évolution ou répartition des inscriptions (selon implémentation : par statut, par activité, etc.).  
  - Autres indicateurs utiles au pilotage (ex. activités récemment clôturées avec nombre d’inscriptions).

- **Activités récemment clôturées**  
  - Liste (tableau ou cartes) des dernières activités clôturées : titre, ville, type, dates, nombre de places, nombre d’inscriptions, lien vers la fiche activité.

- **Navigation**  
  - Menu latéral (ou équivalent) donnant accès à : Dashboard, Utilisateurs, Activités, Inscriptions, Types d’activités, Enfants, Situation familiale, Historique.

L’objectif est de permettre une **présentation professionnelle du pilotage** : vue d’ensemble en un coup d’œil, puis drill-down vers chaque domaine (activités, inscriptions, utilisateurs, etc.).

### 3.3 Gestion des activités (excursions)

- **Liste des activités**  
  - Tableau listant les activités avec : titre, ville, type (FAMILY / SINGLE / COUPLE), dates de début/fin, statut (OPEN, FULL, CLOSED), nombre de places, nombre d’inscriptions, statut de sélection.  
  - Actions : créer une activité, accéder à la fiche détail, lancer la sélection (lien vers l’écran de sélection).

- **Création / édition d’une activité**  
  - Champs principaux : titre, ville, hôtel (nom, catégorie), type d’excursion (FAMILY / SINGLE / COUPLE), dates de début et de fin, durée en jours, nombre de places.  
  - Dates d’ouverture/fermeture des inscriptions, dates de paiement, date limite de paiement, éventuellement date pour liste d’attente.  
  - Prix (adulte, enfant si applicable), description, URL d’image, types d’agents éligibles (si utilisé).  
  - **Lien vers un type d’activité** : chaque excursion peut être rattachée à un **type d’activité** (ex. « Excursion Famille », « Dîner Célibataire ») qui porte le barème de points (voir section 3.7).  
  - Statut de l’activité (ouverte, complète, clôturée) et statut de sélection (non démarrée, en cours, terminée, clôturée).

- **Fiche détail d’une activité**  
  - Synthèse des informations ci-dessus.  
  - **Onglets** (ou sections) :  
    - Liste des **inscrits** (tous les candidats).  
    - **Sélectionnés** (liste des participants retenus, ordre de mérite).  
    - **Liste d’attente**.  
    - **Liste finale** (après confirmation des paiements / validation).  
    - **Refusés**.  
  - Actions possibles (selon écrans) : confirmer paiement, promouvoir depuis la liste d’attente, refuser un participant, clôturer la sélection.

### 3.4 Gestion des inscriptions

- **Vue centralisée des inscriptions (admin)**  
  - Tableau listant les inscriptions avec : activité, employé (nom, prénom, matricule), date d’inscription, statut (liste finale / attente : INSCRIT, SELECTIONNE, ATTENTE, FINAL, REFUSE), paiement confirmé, date de confirmation du paiement.  
  - Filtres : par activité, par statut ; recherche globale (nom, prénom, matricule).  
  - Possibilité d’**ajouter manuellement une inscription** (associer un employé à une activité) pour les cas exceptionnels.

- **Côté employé**  
  - Consultation des activités **ouvertes** à l’inscription.  
  - **Inscription** à une activité (bouton « S’inscrire ») si les dates d’inscription sont ouvertes et que l’employé n’est pas déjà inscrit.  
  - Consultation de **mes inscriptions** : activités concernées, statut (en attente, sélectionné, liste d’attente, refusé, etc.), paiement confirmé ou non.

### 3.5 Processus de sélection automatique

La sélection détermine qui est **sélectionné** (places offertes) et qui est **en liste d’attente**, selon les points des candidats.

- **Principe**  
  - Chaque candidat à une activité se voit attribuer un **score** (ex. points accumulés de l’employé ; plus le score est bas, plus la priorité est haute).  
  - Les candidats sont **triés par score croissant** (priorité à ceux qui ont le moins de points).  
  - L’administrateur fixe le **nombre de places** à pourvoir pour l’activité.  
  - Les **N premiers** du classement sont marqués **sélectionnés** ; les suivants sont placés en **liste d’attente**.

- **Déroulement côté admin**  
  1. Depuis la liste des activités ou la fiche activité, accès à l’écran **« Sélection »** pour cette activité (`/admin/activities/selection/[id]`).  
  2. Saisie du **nombre de places** à attribuer (éventuellement pré-rempli par le nombre de places de l’activité).  
  3. Clic sur **« Lancer la sélection »** : le système calcule les scores, trie, affecte les statuts (SELECTIONNE / ATTENTE).  
  4. Affichage du résultat (X sélectionnés, Y en attente) et redirection ou lien vers la fiche activité pour consulter les listes (sélectionnés, attente).

- **Actions complémentaires**  
  - **Promouvoir** un ou plusieurs candidats depuis la liste d’attente (changement de statut vers sélectionné/final selon règles métier).  
  - **Refuser** un participant (statut REFUSE).  
  - **Confirmer le paiement** pour un inscrit (marquage « paiement confirmé » + date).  
  - **Clôturer la sélection** : verrouillage des statuts et possibilité de **créditer les points** aux participants retenus (voir section 3.7).  
  - **Réinitialiser la sélection** : remise des statuts à l’état « inscrit » pour refaire une sélection (si les règles métier le permettent).

### 3.6 Gestion des utilisateurs et des points

- **Liste des utilisateurs (admin)**  
  - Tableau : identité, email, matricule, rôle, **points accumulés**.  
  - Recherche / filtres.  
  - **Modification manuelle des points** d’un utilisateur (ex. correction ou attribution exceptionnelle).

- **Profil et points côté employé**  
  - Consultation du **solde de points** et de l’**historique des mouvements** (origine : activité clôturée, modification admin, etc.) avec date et libellé.

### 3.7 Types d’activité et barème de points (accréditation)

- **Types d’activité**  
  - Création et gestion de **types d’activité** (ex. « Excursion Famille », « Dîner Célibataire », « Escapade Couple »).  
  - Chaque type définit :  
    - **Bénéficiaire** : FAMILY, SINGLE ou COUPLE (pour le calcul des points accordés).  
    - **Points** : barème (points agent, points conjoint, points par enfant).  
  - Champs typiques : points de base (agent), points conjoint, points par enfant.

- **Formules d’attribution des points (à la clôture)**  
  - **SINGLE** : points = points agent.  
  - **COUPLE** : points = points agent + (points conjoint si l’employé est marié).  
  - **FAMILY** : points = points agent + (points conjoint si marié) + (nombre d’enfants × points par enfant).  
  - La **source des points** est toujours le **type d’activité** lié à l’excursion. La **formule** appliquée (SINGLE/COUPLE/FAMILY) est déterminée par le champ « bénéficiaire » du type d’activité (ou à défaut par le type d’excursion).  
  - Seuls les participants dont le statut est **SELECTIONNE** ou **FINAL** reçoivent des points à la clôture.  
  - **Anti-double crédit** : une activité déjà créditée (champ dédié en base) ne crédite plus les points.  
  - Chaque crédit est enregistré dans un **historique des points** (utilisateur, delta, raison, admin ayant clôturé).

Cette partie permet de **présenter le dashboard** comme conforme à un barème officiel et traçable (document de conformité disponible dans le projet : `backend/docs/CONFORMITE_ACCREDITATION_POINTS.md`).

### 3.8 Enfants et situation familiale

- **Situation familiale (admin)**  
  - Écran dédié pour gérer la situation familiale des employés : état civil (célibataire, marié, divorcé, veuf), conjoint (nom, email).  
  - Ces informations alimentent le calcul des points (COUPLE / FAMILY) et l’éligibilité aux activités « couple » ou « famille ».

- **Gestion des enfants (admin)**  
  - Liste des employés **mariés** avec le **nombre d’enfants** déclarés.  
  - Pour chaque employé : **ajout / suppression d’enfants** (nom, prénom, date de naissance, genre).  
  - Le nombre d’enfants est utilisé dans la formule FAMILY pour l’attribution des points à la clôture.

### 3.9 Historique et traçabilité

- **Historique des inscriptions**  
  - Tableau listant **toutes les inscriptions** (tous statuts confondus) avec : ID, matricule, nom, prénom, CIN (si disponible), nom/type d’activité, dates de l’activité, date d’inscription, **statut** (liste finale / attente), **paiement confirmé**, **date de confirmation du paiement**, **participation effective** (est parti à l’excursion), **points accumulés** (ou points crédités pour cette inscription).  
  - **Recherche** (nom, prénom, matricule, activité).  
  - **Export** : copie dans le presse-papier, export CSV, Excel, PDF, impression, avec possibilité de choisir les colonnes visibles.  
  - **Pagination** (10, 25, 50, 100 lignes par page).

Cet écran permet de **présenter le dashboard** comme outil de **reporting et d’audit** (qui s’est inscrit, qui a payé, qui est parti, combien de points ont été crédités).

### 3.10 Expérience employé (résumé)

- **Tableau de bord employé**  
  - Activités **ouvertes** à l’inscription avec possibilité de s’inscrire.  
  - **Mes inscriptions** : liste des activités auxquelles l’employé est inscrit, avec statut et paiement.  
  - **Mes points** : solde actuel et historique des mouvements (date, raison, points).  
  - Navigation par onglets ou sections (Activités / Mes inscriptions / Historique points).

---

## 4. Modèle de données (résumé)

- **User** : identité, email, mot de passe (hashé), matricule, rôle, points, situation familiale (maritalStatus, spouse, spouseEmail), enfants (relation Child).  
- **Child** : prénom, nom, date de naissance, genre, parent (User).  
- **Excursion** : titre, ville, hôtel, type (FAMILY/SINGLE/COUPLE), dates, places, statut, dates inscription/paiement, prix, description, image, type d’activité (ActivityType), statut de sélection, nombre de places pour la sélection, date de clôture des points (pointsCreditedAt).  
- **ExcursionApplication** : user, excursion, statut (PENDING/APPROVED/REJECTED/WAITING_LIST), statut d’inscription (INSCRIT/SELECTIONNE/ATTENTE/FINAL/REFUSE), score calculé, ordre de sélection, paiement confirmé, date de confirmation.  
- **ActivityType** : titre, bénéficiaire (FAMILY/SINGLE/COUPLE), points, pointsConjoint, pointsPerChild.  
- **UserPointHistory** : user, delta, raison, admin créateur, date.  
- **SelectionHistory** : excursion, action (démarrage sélection, sélectionné, promu, refusé, paiement confirmé, clôture, etc.), participant, ancien/nouveau statut, raison, admin.  
- **ExcursionStatsSnapshot** (optionnel) : instantané du nombre d’inscriptions, sélectionnés, liste d’attente par excursion.

Les énumérations (UserRole, ExcursionType, ExcursionStatus, ApplicationStatus, InscriptionStatus, SelectionStatus, SelectionAction, MaritalStatus, Gender) structurent les statuts et types dans toute l’application.

---

## 5. Stack technique

- **Backend** : Node.js, Express, TypeScript, Prisma (ORM), PostgreSQL, JWT (authentification), bcryptjs (mots de passe).  
- **Frontend** : Next.js 16, React 19, TypeScript, Tailwind CSS 4.  
- **API** : REST (JSON) ; CORS activé ; routes protégées par middleware JWT pour les espaces admin et utilisateur.  
- **Base de données** : PostgreSQL ; migrations Prisma pour le schéma.  
- **Déploiement** : fichier `render.yaml` pour déploiement sur Render (base PostgreSQL, service API, service Web frontend) ; variables d’environnement (DATABASE_URL, JWT_SECRET, NEXT_PUBLIC_API_BASE_URL).

---

## 6. Sécurité et conformité

- Mots de passe **hachés** (bcrypt).  
- **JWT** avec secret côté serveur ; expiration et vérification du rôle sur les routes sensibles.  
- Pas de stockage de données sensibles (ex. CIN) en clair sans nécessité ; les exports (historique) sont réservés aux admins.  
- **Traçabilité** : historique des points (créateur admin), historique des actions de sélection (promotion, refus, clôture).  
- Conformité du **barème de points** documentée et testée unitairement (`pointsFormula.ts`, `CONFORMITE_ACCREDITATION_POINTS.md`).

---

## 7. Livrables et livraison

- **Code source** : dépôt Git (backend + frontend), avec README, `.env.example`, et documentation (dont ce cahier des charges).  
- **Base de données** : schéma Prisma et migrations ; script de seed pour un compte admin et des données de démonstration.  
- **Déploiement** : configuration Render (ou équivalent) documentée dans le README ; instructions pour variables d’environnement et exécution du seed en production.  
- **Documentation** : README (installation, démarrage, déploiement), cahier des charges (ce document), guide de sélection, document de conformité des points.

---

## 8. Présentation du dashboard (synthèse pour livrable / démo)

Pour **bien présenter le dashboard** en réunion ou dans un livrable :

1. **Vue d’ensemble** : ouvrir le **Dashboard admin** et montrer les KPI (activités, inscriptions, utilisateurs, répartition par type) et les graphiques.  
2. **Pilotage des activités** : liste des activités, fiche détail, onglets sélectionnés / attente / finale / refusés.  
3. **Processus de sélection** : écran de sélection (nombre de places, lancer), résultat, puis fiche activité pour voir les listes.  
4. **Traçabilité** : onglet **Historique** avec recherche et export (CSV/Excel/PDF) pour démontrer le reporting et l’audit.  
5. **Règles métier** : types d’activité, formules de points (SINGLE/COUPLE/FAMILY), situation familiale et enfants, et référence au document de conformité des points.  
6. **Côté employé** : connexion en tant qu’employé, inscription à une activité, consultation des inscriptions et des points.

Ce cahier des charges sert de **référence fonctionnelle et technique** pour la recette, la formation et la maintenance de la Plateforme Excursion OCP.
