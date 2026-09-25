"use client";

import { CheckCircle2 } from "lucide-react";
import { approveGoal } from "@/lib/goal-approval";
import { SubmitButton } from "@/components/SubmitButton";

export function ApproveGoalButton({ measurementId }: { measurementId: string }) {
  return (
    <form noValidate
      action={async () => {
        await approveGoal(measurementId);
      }}
    >
      <SubmitButton className="btn btn-primary" pendingText="Aprovando…">
        <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
      </SubmitButton>
    </form>
  );
}
