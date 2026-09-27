import { LockKeyhole, Unlock } from "lucide-react";
import { closePeriod, reopenPeriod } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";

type PeriodLock = {
  note: string | null;
  createdAt: Date;
};

export function PeriodLockControls({
  period,
  lock,
}: {
  period: string;
  lock: PeriodLock | null;
}) {
  async function submitClose(formData: FormData) {
    "use server";
    await closePeriod(null, formData);
  }

  if (lock) {
    const reopen = async () => {
      "use server";
      await reopenPeriod(period);
    };

    return (
      <section className="card flex flex-col gap-3 border-[var(--color-amber-300)] bg-[var(--color-amber-50)] p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-amber-700)]" aria-hidden="true" />
          <div>
            <p className="text-[13px] font-semibold text-[var(--color-amber-900)]">Ciclo fechado</p>
            <p className="text-[12px] text-[var(--color-amber-800)]">
              {lock.note || "Os lançamentos deste ciclo estão bloqueados."}
            </p>
          </div>
        </div>
        <form noValidate action={reopen}>
          <SubmitButton className="btn min-h-[44px] w-full justify-center sm:w-auto" pendingText="Reabrindo…">
            <Unlock className="h-3.5 w-3.5" aria-hidden="true" /> Reabrir ciclo
          </SubmitButton>
        </form>
      </section>
    );
  }

  return (
    <section className="card flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div>
        <p className="text-[13px] font-semibold text-[var(--color-ink-900)]">Fechamento do ciclo</p>
        <p className="text-[12px] text-[var(--color-ink-500)]">
          Feche o período depois de revisar os lançamentos. Apenas administradores podem reabrir.
        </p>
      </div>
      <form noValidate action={submitClose} className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
        <input type="hidden" name="period" value={period} />
        <label className="flex flex-col gap-1">
          <span className="field-label">Observação</span>
          <input name="note" maxLength={1000} className="input" placeholder="Opcional" />
        </label>
        <SubmitButton className="btn btn-primary min-h-[44px] w-full justify-center sm:w-auto" pendingText="Fechando…">
          <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" /> Fechar ciclo
        </SubmitButton>
      </form>
    </section>
  );
}
