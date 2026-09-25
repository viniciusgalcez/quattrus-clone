-- CreateTable
CREATE TABLE "Subordination" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subordination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subordination_managerId_idx" ON "Subordination"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subordination_userId_managerId_key" ON "Subordination"("userId", "managerId");

-- AddForeignKey
ALTER TABLE "Subordination" ADD CONSTRAINT "Subordination_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subordination" ADD CONSTRAINT "Subordination_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: one Subordination row per existing single-manager relationship,
-- flagged principal so every pre-existing manager keeps being read as the
-- primary one. User.managerId itself is left untouched (still the synced
-- cache of the principal manager).
INSERT INTO "Subordination" (id, "userId", "managerId", principal, "createdAt")
SELECT gen_random_uuid()::text, id, "managerId", true, now()
FROM "User"
WHERE "managerId" IS NOT NULL;

