ALTER TABLE "Measurement"
  ADD COLUMN "measured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "forecast" DOUBLE PRECISION,
  ADD COLUMN "benchmark" TEXT,
  ADD COLUMN "benchmarkValue" DOUBLE PRECISION;

-- Existing records were persisted measurements before the explicit toggle was
-- introduced, so they must retain that operational meaning after migration.
UPDATE "Measurement" SET "measured" = true WHERE "actual" IS NOT NULL;
