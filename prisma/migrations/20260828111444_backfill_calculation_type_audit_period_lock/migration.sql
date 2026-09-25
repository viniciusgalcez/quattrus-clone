-- CreateEnum
CREATE TYPE "KpiCalculationType" AS ENUM ('MANUAL', 'SUM', 'AVERAGE', 'WEIGHTED');

-- AlterTable
ALTER TABLE "Kpi" ADD COLUMN     "calculationType" "KpiCalculationType" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "Measurement" ADD COLUMN     "justification" TEXT;

-- CreateTable
CREATE TABLE "PeriodLock" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "departmentId" TEXT,
    "closedById" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeriodLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodLockEvent" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "departmentId" TEXT,
    "closed" BOOLEAN NOT NULL,
    "actorId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeriodLockEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParetoItem" (
    "id" TEXT NOT NULL,
    "actionPlanId" TEXT NOT NULL,
    "phenomenon" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParetoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PeriodLock_period_idx" ON "PeriodLock"("period");

-- CreateIndex
CREATE INDEX "PeriodLock_departmentId_idx" ON "PeriodLock"("departmentId");

-- CreateIndex
CREATE INDEX "PeriodLock_closedById_idx" ON "PeriodLock"("closedById");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodLock_period_departmentId_key" ON "PeriodLock"("period", "departmentId");

-- CreateIndex
CREATE INDEX "PeriodLockEvent_period_idx" ON "PeriodLockEvent"("period");

-- CreateIndex
CREATE INDEX "PeriodLockEvent_departmentId_idx" ON "PeriodLockEvent"("departmentId");

-- CreateIndex
CREATE INDEX "PeriodLockEvent_actorId_idx" ON "PeriodLockEvent"("actorId");

-- CreateIndex
CREATE INDEX "ParetoItem_actionPlanId_idx" ON "ParetoItem"("actionPlanId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "PeriodLock" ADD CONSTRAINT "PeriodLock_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodLock" ADD CONSTRAINT "PeriodLock_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodLockEvent" ADD CONSTRAINT "PeriodLockEvent_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodLockEvent" ADD CONSTRAINT "PeriodLockEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParetoItem" ADD CONSTRAINT "ParetoItem_actionPlanId_fkey" FOREIGN KEY ("actionPlanId") REFERENCES "ActionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

