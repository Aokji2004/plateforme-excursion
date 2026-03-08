-- AlterTable User: add profileIncomplete (manquant en prod)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profileIncomplete" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable Excursion: colonnes inscription / formulaire public
ALTER TABLE "Excursion" ADD COLUMN IF NOT EXISTS "inscriptionToken" TEXT;
ALTER TABLE "Excursion" ADD COLUMN IF NOT EXISTS "inscriptionLinkValidFrom" TIMESTAMP(3);
ALTER TABLE "Excursion" ADD COLUMN IF NOT EXISTS "inscriptionLinkValidUntil" TIMESTAMP(3);
ALTER TABLE "Excursion" ADD COLUMN IF NOT EXISTS "externalFormUrl" TEXT;
ALTER TABLE "Excursion" ADD COLUMN IF NOT EXISTS "inscriptionFormTitle" TEXT;
ALTER TABLE "Excursion" ADD COLUMN IF NOT EXISTS "inscriptionFormDescription" TEXT;

-- Index unique pour inscriptionToken (si pas déjà créé)
CREATE UNIQUE INDEX IF NOT EXISTS "Excursion_inscriptionToken_key" ON "Excursion"("inscriptionToken");

-- AlterTable ExcursionApplication: champs candidature publique
ALTER TABLE "ExcursionApplication" ADD COLUMN IF NOT EXISTS "inscriptionFirstName" TEXT;
ALTER TABLE "ExcursionApplication" ADD COLUMN IF NOT EXISTS "inscriptionLastName" TEXT;
ALTER TABLE "ExcursionApplication" ADD COLUMN IF NOT EXISTS "inscriptionAddress" TEXT;
ALTER TABLE "ExcursionApplication" ADD COLUMN IF NOT EXISTS "inscriptionPhone" TEXT;
