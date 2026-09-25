-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "dueAt" TIMESTAMP(3),
ADD COLUMN     "fromUserId" TEXT,
ADD COLUMN     "originLabel" TEXT,
ADD COLUMN     "relatedKpiId" TEXT;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_relatedKpiId_fkey" FOREIGN KEY ("relatedKpiId") REFERENCES "Kpi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

