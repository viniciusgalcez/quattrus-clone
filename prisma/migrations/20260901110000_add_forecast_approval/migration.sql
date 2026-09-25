CREATE TYPE "ForecastStatus" AS ENUM ('PENDENTE', 'APROVADA', 'REJEITADA');

CREATE TABLE "ForecastRequest" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "proposedGoal" DOUBLE PRECISION,
    "proposedActual" DOUBLE PRECISION,
    "reason" TEXT NOT NULL,
    "status" "ForecastStatus" NOT NULL DEFAULT 'PENDENTE',
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ForecastRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ForecastRequest_kpiId_period_idx" ON "ForecastRequest"("kpiId", "period");
CREATE INDEX "ForecastRequest_status_idx" ON "ForecastRequest"("status");
CREATE INDEX "ForecastRequest_requestedById_idx" ON "ForecastRequest"("requestedById");
CREATE INDEX "ForecastRequest_reviewedById_idx" ON "ForecastRequest"("reviewedById");

ALTER TABLE "ForecastRequest" ADD CONSTRAINT "ForecastRequest_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "Kpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForecastRequest" ADD CONSTRAINT "ForecastRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ForecastRequest" ADD CONSTRAINT "ForecastRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
