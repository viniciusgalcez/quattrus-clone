-- AlterEnum
-- The dev database already carries this value from prior tooling that shared
-- the same Postgres instance; IF NOT EXISTS makes this migration replayable
-- on a database that doesn't have it yet (e.g. a fresh environment).
ALTER TYPE "TrafficLight" ADD VALUE IF NOT EXISTS 'AZUL';
