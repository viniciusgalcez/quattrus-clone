"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { approveGoalWithValue } from "@/lib/goal-approval";

export function InlineGoalApproveCell({
  measurementId,
  goal,
  metricUnit,
}: {
  measurementId: string;
  goal: number;
  metricUnit: string;
}) {
  const [value, setValue] = useState(String(goal));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function approve() {
    startTransition(async () => {
      const result = await approveGoalWithValue(measurementId, value);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <label className="sr-only" htmlFor={`goal-${measurementId}`}>
          Meta proposta
        </label>
        <input
          id={`goal-${measurementId}`}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              approve();
            }
          }}
          disabled={pending}
          className="input-field w-[96px] text-right font-mono-num text-[12px]"
          title="Edite a meta e confirme para aprovar (como no Quattrus)"
        />
        <span className="text-[11px] text-[var(--color-ink-400)]">{metricUnit}</span>
        <button
          type="button"
          disabled={pending}
          onClick={approve}
          className="btn btn-primary px-2 py-1 text-[11px] disabled:opacity-60"
          title="Aprovar meta"
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          {pending ? "…" : "OK"}
        </button>
      </div>
      {error && (
        <p className="max-w-[220px] text-right text-[10px] text-[var(--color-red-600)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
