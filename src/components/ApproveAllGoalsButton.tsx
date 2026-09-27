"use client";

import { useState, useTransition } from "react";
import { CheckCheck } from "lucide-react";
import { approveAllPendingGoals } from "@/lib/goal-approval";
import { useRouter } from "next/navigation";

export function ApproveAllGoalsButton({ count }: { count: number }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  if (!count) return null;
  return <div className="flex items-center gap-2"><button type="button" disabled={pending} onClick={() => startTransition(async () => { const result = await approveAllPendingGoals(); if (result.ok) { setMessage("Metas aprovadas com sucesso."); router.refresh(); } else { setMessage(result.error); } })} className="btn btn-primary disabled:opacity-60"><CheckCheck className="h-3.5 w-3.5" /> {pending ? "Aprovando..." : "Aprovar todas"}</button>{message && <span className="text-[11px] text-[var(--color-ink-500)]">{message}</span>}</div>;
}
