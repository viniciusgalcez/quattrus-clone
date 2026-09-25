-- CreateEnum
CREATE TYPE "KpiCategory" AS ENUM ('PMB', 'KPI');

-- AlterTable
ALTER TABLE "Kpi" ADD COLUMN     "auxiliary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bomFor" TEXT,
ADD COLUMN     "category" "KpiCategory" NOT NULL DEFAULT 'KPI',
ADD COLUMN     "chronicRedMonths" INTEGER,
ADD COLUMN     "client" TEXT,
ADD COLUMN     "coefficient" DOUBLE PRECISION,
ADD COLUMN     "decimalPlaces" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "sequenceNumber" SERIAL NOT NULL,
ADD COLUMN     "shared" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Kpi_sequenceNumber_key" ON "Kpi"("sequenceNumber");
