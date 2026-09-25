CREATE TYPE "KpiFormulaType" AS ENUM ('MANUAL', 'SUM', 'AVERAGE', 'WEIGHTED', 'QUOTIENT', 'TOTALIZER');

CREATE TABLE "KpiValidity" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "startPeriod" TEXT NOT NULL,
    "endPeriod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KpiValidity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KpiMeasurementPeriod" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "startPeriod" TEXT NOT NULL,
    "endPeriod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KpiMeasurementPeriod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KpiThresholdValidity" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "startPeriod" TEXT NOT NULL,
    "endPeriod" TEXT,
    "yellowRange" DOUBLE PRECISION NOT NULL,
    "redRange" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KpiThresholdValidity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KpiFormula" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "kind" "KpiFormulaType" NOT NULL,
    "numeratorKpiId" TEXT,
    "denominatorKpiId" TEXT,
    "denominatorAverage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KpiFormula_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KpiDependency" (
    "id" TEXT NOT NULL,
    "sourceKpiId" TEXT NOT NULL,
    "targetKpiId" TEXT NOT NULL,
    "dependencyType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KpiDependency_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KpiLinkedItem" (
    "id" TEXT NOT NULL,
    "sourceKpiId" TEXT NOT NULL,
    "targetKpiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KpiLinkedItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActionPlanStep" (
    "id" TEXT NOT NULL,
    "actionPlanId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "responsibleId" TEXT,
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "value" DOUBLE PRECISION,
    "status" "ActionPlanStatus" NOT NULL DEFAULT 'ABERTO',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ActionPlanStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT,
    "actionPlanId" TEXT,
    "measurementId" TEXT,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KpiFormula_kpiId_key" ON "KpiFormula"("kpiId");
CREATE UNIQUE INDEX "KpiDependency_sourceKpiId_targetKpiId_dependencyType_key" ON "KpiDependency"("sourceKpiId", "targetKpiId", "dependencyType");
CREATE UNIQUE INDEX "KpiLinkedItem_sourceKpiId_targetKpiId_key" ON "KpiLinkedItem"("sourceKpiId", "targetKpiId");
CREATE UNIQUE INDEX "Attachment_storageKey_key" ON "Attachment"("storageKey");
CREATE INDEX "KpiValidity_kpiId_startPeriod_idx" ON "KpiValidity"("kpiId", "startPeriod");
CREATE INDEX "KpiMeasurementPeriod_kpiId_startPeriod_idx" ON "KpiMeasurementPeriod"("kpiId", "startPeriod");
CREATE INDEX "KpiThresholdValidity_kpiId_startPeriod_idx" ON "KpiThresholdValidity"("kpiId", "startPeriod");
CREATE INDEX "KpiDependency_targetKpiId_idx" ON "KpiDependency"("targetKpiId");
CREATE INDEX "KpiLinkedItem_targetKpiId_idx" ON "KpiLinkedItem"("targetKpiId");
CREATE INDEX "ActionPlanStep_actionPlanId_sortOrder_idx" ON "ActionPlanStep"("actionPlanId", "sortOrder");
CREATE INDEX "ActionPlanStep_responsibleId_idx" ON "ActionPlanStep"("responsibleId");
CREATE INDEX "Attachment_kpiId_idx" ON "Attachment"("kpiId");
CREATE INDEX "Attachment_actionPlanId_idx" ON "Attachment"("actionPlanId");
CREATE INDEX "Attachment_measurementId_idx" ON "Attachment"("measurementId");
CREATE INDEX "Attachment_uploadedById_idx" ON "Attachment"("uploadedById");

ALTER TABLE "KpiValidity" ADD CONSTRAINT "KpiValidity_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "Kpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KpiMeasurementPeriod" ADD CONSTRAINT "KpiMeasurementPeriod_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "Kpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KpiThresholdValidity" ADD CONSTRAINT "KpiThresholdValidity_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "Kpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KpiFormula" ADD CONSTRAINT "KpiFormula_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "Kpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KpiFormula" ADD CONSTRAINT "KpiFormula_numeratorKpiId_fkey" FOREIGN KEY ("numeratorKpiId") REFERENCES "Kpi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KpiFormula" ADD CONSTRAINT "KpiFormula_denominatorKpiId_fkey" FOREIGN KEY ("denominatorKpiId") REFERENCES "Kpi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KpiDependency" ADD CONSTRAINT "KpiDependency_sourceKpiId_fkey" FOREIGN KEY ("sourceKpiId") REFERENCES "Kpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KpiDependency" ADD CONSTRAINT "KpiDependency_targetKpiId_fkey" FOREIGN KEY ("targetKpiId") REFERENCES "Kpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KpiLinkedItem" ADD CONSTRAINT "KpiLinkedItem_sourceKpiId_fkey" FOREIGN KEY ("sourceKpiId") REFERENCES "Kpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KpiLinkedItem" ADD CONSTRAINT "KpiLinkedItem_targetKpiId_fkey" FOREIGN KEY ("targetKpiId") REFERENCES "Kpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActionPlanStep" ADD CONSTRAINT "ActionPlanStep_actionPlanId_fkey" FOREIGN KEY ("actionPlanId") REFERENCES "ActionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActionPlanStep" ADD CONSTRAINT "ActionPlanStep_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ActionPlanStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActionPlanStep" ADD CONSTRAINT "ActionPlanStep_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "Kpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_actionPlanId_fkey" FOREIGN KEY ("actionPlanId") REFERENCES "ActionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_measurementId_fkey" FOREIGN KEY ("measurementId") REFERENCES "Measurement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
