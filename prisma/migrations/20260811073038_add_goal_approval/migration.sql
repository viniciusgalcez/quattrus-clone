-- CreateEnum
CREATE TYPE "GoalApprovalStatus" AS ENUM ('APROVADA', 'PENDENTE');

-- AlterTable
ALTER TABLE "Measurement" ADD COLUMN     "goalApprovalStatus" "GoalApprovalStatus" NOT NULL DEFAULT 'APROVADA',
ADD COLUMN     "goalApprovedById" TEXT,
ADD COLUMN     "goalApprovedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Measurement_goalApprovalStatus_idx" ON "Measurement"("goalApprovalStatus");

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_goalApprovedById_fkey" FOREIGN KEY ("goalApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
