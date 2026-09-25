CREATE TABLE "CompanySettings" (
  "id" TEXT NOT NULL DEFAULT 'capricornio',
  "legalName" TEXT NOT NULL DEFAULT 'Capricórnio Têxtil S/A',
  "displayMonths" INTEGER NOT NULL DEFAULT 12,
  "blankMonths" INTEGER NOT NULL DEFAULT 0,
  "showGoal" BOOLEAN NOT NULL DEFAULT true,
  "yellowGood" BOOLEAN NOT NULL DEFAULT false,
  "redGood" BOOLEAN NOT NULL DEFAULT false,
  "chronicRedMonths" INTEGER NOT NULL DEFAULT 3,
  "fixedBaseDate" TEXT,
  "automationDisabled" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "CompanySettings" ("id", "updatedAt") VALUES ('capricornio', CURRENT_TIMESTAMP);
