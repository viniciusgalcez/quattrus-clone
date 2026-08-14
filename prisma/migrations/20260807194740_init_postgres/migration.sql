-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'GESTOR', 'COLABORADOR');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('MORE', 'LESS', 'EQUAL');

-- CreateEnum
CREATE TYPE "ActionPlanStatus" AS ENUM ('ABERTO', 'CONCLUIDO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'COLABORADOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kpi" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "metricUnit" TEXT NOT NULL,
    "direction" "Direction" NOT NULL DEFAULT 'MORE',
    "weight" INTEGER NOT NULL DEFAULT 0,
    "yellowRange" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "redRange" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kpi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Measurement" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "goal" DOUBLE PRECISION NOT NULL,
    "actual" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Measurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionPlan" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "measurementId" TEXT NOT NULL,
    "fact" TEXT NOT NULL,
    "why1" TEXT,
    "why2" TEXT,
    "why3" TEXT,
    "why4" TEXT,
    "why5" TEXT,
    "rootCause" TEXT,
    "what" TEXT,
    "who" TEXT,
    "where" TEXT,
    "when" TIMESTAMP(3),
    "why" TEXT,
    "how" TEXT,
    "status" "ActionPlanStatus" NOT NULL DEFAULT 'ABERTO',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_managerId_idx" ON "User"("managerId");

-- CreateIndex
CREATE INDEX "Kpi_ownerId_idx" ON "Kpi"("ownerId");

-- CreateIndex
CREATE INDEX "Measurement_period_idx" ON "Measurement"("period");

-- CreateIndex
CREATE UNIQUE INDEX "Measurement_kpiId_period_key" ON "Measurement"("kpiId", "period");

-- CreateIndex
CREATE INDEX "ActionPlan_kpiId_idx" ON "ActionPlan"("kpiId");

-- CreateIndex
CREATE INDEX "ActionPlan_createdById_idx" ON "ActionPlan"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "ActionPlan_measurementId_key" ON "ActionPlan"("measurementId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kpi" ADD CONSTRAINT "Kpi_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "Kpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "Kpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_measurementId_fkey" FOREIGN KEY ("measurementId") REFERENCES "Measurement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
