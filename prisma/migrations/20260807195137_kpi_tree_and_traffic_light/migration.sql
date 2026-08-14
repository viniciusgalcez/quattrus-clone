-- CreateEnum
CREATE TYPE "TrafficLight" AS ENUM ('VERDE', 'AMARELO', 'VERMELHO', 'CRITICO', 'SEM_DADO');

-- AlterTable
ALTER TABLE "ActionPlan" ADD COLUMN     "howMuch" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Kpi" ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "Measurement" ADD COLUMN     "reportedById" TEXT,
ADD COLUMN     "trafficLight" "TrafficLight" NOT NULL DEFAULT 'SEM_DADO';

-- CreateIndex
CREATE INDEX "Kpi_parentId_idx" ON "Kpi"("parentId");

-- AddForeignKey
ALTER TABLE "Kpi" ADD CONSTRAINT "Kpi_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Kpi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
