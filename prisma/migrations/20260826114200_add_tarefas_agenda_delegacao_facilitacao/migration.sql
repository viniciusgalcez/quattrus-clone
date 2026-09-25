-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'ATRASADA');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('REUNIAO_RESULTADO', 'PEMPB', 'REUNIAO_TIME', 'TREINAMENTO', 'FEEDBACK');

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "what" TEXT NOT NULL,
    "why" TEXT,
    "howWhere" TEXT,
    "assigneeId" TEXT,
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "value" DOUBLE PRECISION,
    "status" "TaskStatus" NOT NULL DEFAULT 'ABERTA',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "EventCategory" NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiDelegation" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "delegateId" TEXT NOT NULL,
    "delegatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiDelegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facilitation" (
    "id" TEXT NOT NULL,
    "facilitatorId" TEXT NOT NULL,
    "facilitatedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Facilitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");

-- CreateIndex
CREATE INDEX "Task_createdById_idx" ON "Task"("createdById");

-- CreateIndex
CREATE INDEX "CalendarEvent_startAt_idx" ON "CalendarEvent"("startAt");

-- CreateIndex
CREATE INDEX "CalendarEvent_createdById_idx" ON "CalendarEvent"("createdById");

-- CreateIndex
CREATE INDEX "KpiDelegation_delegateId_idx" ON "KpiDelegation"("delegateId");

-- CreateIndex
CREATE UNIQUE INDEX "KpiDelegation_kpiId_delegateId_key" ON "KpiDelegation"("kpiId", "delegateId");

-- CreateIndex
CREATE INDEX "Facilitation_facilitatedId_idx" ON "Facilitation"("facilitatedId");

-- CreateIndex
CREATE UNIQUE INDEX "Facilitation_facilitatorId_facilitatedId_key" ON "Facilitation"("facilitatorId", "facilitatedId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiDelegation" ADD CONSTRAINT "KpiDelegation_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "Kpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiDelegation" ADD CONSTRAINT "KpiDelegation_delegateId_fkey" FOREIGN KEY ("delegateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiDelegation" ADD CONSTRAINT "KpiDelegation_delegatedById_fkey" FOREIGN KEY ("delegatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facilitation" ADD CONSTRAINT "Facilitation_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facilitation" ADD CONSTRAINT "Facilitation_facilitatedId_fkey" FOREIGN KEY ("facilitatedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

