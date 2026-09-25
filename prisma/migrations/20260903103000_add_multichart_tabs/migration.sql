CREATE TABLE "MultiChartTab" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slots" JSONB NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MultiChartTab_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MultiChartTab_userId_sortOrder_idx" ON "MultiChartTab"("userId", "sortOrder");

ALTER TABLE "MultiChartTab"
ADD CONSTRAINT "MultiChartTab_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
