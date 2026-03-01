-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "maritalStatus" "MaritalStatus",
ADD COLUMN     "spouse" TEXT,
ADD COLUMN     "spouseEmail" TEXT;
