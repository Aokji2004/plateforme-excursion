-- À exécuter dans pgAdmin (Ouvrir Query Tool sur la base "postgres") si la connexion avec mot de passe 0000 échoue.
-- 1. Définir le mot de passe de l'utilisateur postgres à 0000
ALTER USER postgres WITH PASSWORD '0000';

-- 2. Créer la base : dans l'arbre à gauche, clic droit sur "Databases" -> Create -> Database, nom : ocp_excursions
