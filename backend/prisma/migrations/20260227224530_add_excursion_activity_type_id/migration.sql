-- AlterTable
ALTER TABLE "Excursion" ADD COLUMN     "activityTypeId" INTEGER;

-- AddForeignKey
ALTER TABLE "Excursion" ADD CONSTRAINT "Excursion_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "ActivityType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
