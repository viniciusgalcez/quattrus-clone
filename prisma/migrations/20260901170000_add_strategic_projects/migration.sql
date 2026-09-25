CREATE TYPE "StrategicProjectStatus" AS ENUM ('PLANEJADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'SUSPENSO');

CREATE TABLE "StrategicProject" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "ownerId" TEXT NOT NULL,
  "departmentId" TEXT,
  "kpiId" TEXT,
  "startDate" TIMESTAMP(3),
  "dueDate" TIMESTAMP(3),
  "budget" DOUBLE PRECISION,
  "status" "StrategicProjectStatus" NOT NULL DEFAULT 'PLANEJADO',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StrategicProject_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "StrategicProject" ADD CONSTRAINT "StrategicProject_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StrategicProject" ADD CONSTRAINT "StrategicProject_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StrategicProject" ADD CONSTRAINT "StrategicProject_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "Kpi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "StrategicProject_ownerId_idx" ON "StrategicProject"("ownerId");
CREATE INDEX "StrategicProject_departmentId_idx" ON "StrategicProject"("departmentId");
CREATE INDEX "StrategicProject_kpiId_idx" ON "StrategicProject"("kpiId");
CREATE INDEX "StrategicProject_status_idx" ON "StrategicProject"("status");
