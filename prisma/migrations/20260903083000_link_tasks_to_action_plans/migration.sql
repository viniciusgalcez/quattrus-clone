ALTER TABLE "Task" ADD COLUMN "actionPlanId" TEXT;

CREATE INDEX "Task_actionPlanId_idx" ON "Task"("actionPlanId");

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_actionPlanId_fkey"
  FOREIGN KEY ("actionPlanId")
  REFERENCES "ActionPlan"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
