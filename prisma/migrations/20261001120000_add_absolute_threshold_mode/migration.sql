-- AlterEnum
CREATE TYPE "ThresholdMode" AS ENUM ('PERCENT', 'ABSOLUTE');

-- AlterEnum
CREATE TYPE "AmplitudeReference" AS ENUM ('FORECAST', 'MINIMUM', 'FIXED');

-- AlterTable
ALTER TABLE "Kpi" ADD COLUMN     "thresholdMode" "ThresholdMode" NOT NULL DEFAULT 'PERCENT',
ADD COLUMN     "upperLimit" DOUBLE PRECISION,
ADD COLUMN     "lowerLimit" DOUBLE PRECISION,
ADD COLUMN     "clientMetaFrom" DOUBLE PRECISION,
ADD COLUMN     "clientMetaTo" DOUBLE PRECISION,
ADD COLUMN     "amplitudeMonth" "AmplitudeReference" NOT NULL DEFAULT 'FORECAST',
ADD COLUMN     "amplitudeYear" "AmplitudeReference" NOT NULL DEFAULT 'FORECAST';

-- AlterTable
ALTER TABLE "KpiThresholdValidity" ADD COLUMN     "thresholdMode" "ThresholdMode" NOT NULL DEFAULT 'PERCENT',
ADD COLUMN     "upperLimit" DOUBLE PRECISION,
ADD COLUMN     "lowerLimit" DOUBLE PRECISION,
ADD COLUMN     "clientMetaFrom" DOUBLE PRECISION,
ADD COLUMN     "clientMetaTo" DOUBLE PRECISION,
ADD COLUMN     "amplitudeMonth" "AmplitudeReference" NOT NULL DEFAULT 'FORECAST',
ADD COLUMN     "amplitudeYear" "AmplitudeReference" NOT NULL DEFAULT 'FORECAST';
