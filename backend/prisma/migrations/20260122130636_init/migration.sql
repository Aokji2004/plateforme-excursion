-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('EMPLOYEE', 'ADMIN');

-- CreateEnum
CREATE TYPE "ExcursionType" AS ENUM ('FAMILY', 'SINGLE', 'COUPLE');

-- CreateEnum
CREATE TYPE "ExcursionStatus" AS ENUM ('OPEN', 'FULL', 'CLOSED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WAITING_LIST');

-- CreateEnum
CREATE TYPE "InscriptionStatus" AS ENUM ('INSCRIT', 'SELECTIONNE', 'ATTENTE', 'FINAL', 'REFUSE');

-- CreateEnum
CREATE TYPE "SelectionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SelectionAction" AS ENUM ('SELECTION_STARTED', 'PARTICIPANT_SELECTED', 'PARTICIPANT_PROMOTED_FROM_WAITING', 'PARTICIPANT_REFUSED', 'PAYMENT_CONFIRMED', 'SELECTION_CLOSED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "matricule" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Excursion" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "hotelName" TEXT NOT NULL,
    "hotelCategory" TEXT NOT NULL,
    "type" "ExcursionType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "totalSeats" INTEGER NOT NULL,
    "status" "ExcursionStatus" NOT NULL DEFAULT 'OPEN',
    "registrationStartDate" TIMESTAMP(3),
    "registrationEndDate" TIMESTAMP(3),
    "paymentStartDate" TIMESTAMP(3),
    "paymentEndDate" TIMESTAMP(3),
    "waitingListPaymentDate" TIMESTAMP(3),
    "price" DOUBLE PRECISION,
    "childPrice" DOUBLE PRECISION,
    "description" TEXT,
    "imageUrl" TEXT,
    "agentTypes" TEXT,
    "selectionStatus" "SelectionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "paymentDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER NOT NULL,

    CONSTRAINT "Excursion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExcursionDay" (
    "id" SERIAL NOT NULL,
    "excursionId" INTEGER NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "ExcursionDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExcursionApplication" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "excursionId" INTEGER NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "inscriptionStatus" "InscriptionStatus" NOT NULL DEFAULT 'INSCRIT',
    "originalInscriptionStatus" "InscriptionStatus" NOT NULL DEFAULT 'INSCRIT',
    "computedScore" DOUBLE PRECISION,
    "selectionOrder" INTEGER,
    "paymentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "paymentConfirmedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExcursionApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityType" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "beneficiary" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "pointsPerChild" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointRule" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPointHistory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPointHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExcursionStatsSnapshot" (
    "id" SERIAL NOT NULL,
    "excursionId" INTEGER NOT NULL,
    "totalApplications" INTEGER NOT NULL,
    "approvedCount" INTEGER NOT NULL,
    "waitingListCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExcursionStatsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelectionHistory" (
    "id" SERIAL NOT NULL,
    "excursionId" INTEGER NOT NULL,
    "action" "SelectionAction" NOT NULL,
    "applicationId" INTEGER,
    "participantName" TEXT NOT NULL,
    "participantEmail" TEXT NOT NULL,
    "previousStatus" "InscriptionStatus",
    "newStatus" "InscriptionStatus",
    "reason" TEXT,
    "createdByAdminId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SelectionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_matricule_key" ON "User"("matricule");

-- CreateIndex
CREATE UNIQUE INDEX "ExcursionApplication_userId_excursionId_key" ON "ExcursionApplication"("userId", "excursionId");

-- AddForeignKey
ALTER TABLE "Excursion" ADD CONSTRAINT "Excursion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExcursionDay" ADD CONSTRAINT "ExcursionDay_excursionId_fkey" FOREIGN KEY ("excursionId") REFERENCES "Excursion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExcursionApplication" ADD CONSTRAINT "ExcursionApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExcursionApplication" ADD CONSTRAINT "ExcursionApplication_excursionId_fkey" FOREIGN KEY ("excursionId") REFERENCES "Excursion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPointHistory" ADD CONSTRAINT "UserPointHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPointHistory" ADD CONSTRAINT "UserPointHistory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExcursionStatsSnapshot" ADD CONSTRAINT "ExcursionStatsSnapshot_excursionId_fkey" FOREIGN KEY ("excursionId") REFERENCES "Excursion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionHistory" ADD CONSTRAINT "SelectionHistory_excursionId_fkey" FOREIGN KEY ("excursionId") REFERENCES "Excursion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
