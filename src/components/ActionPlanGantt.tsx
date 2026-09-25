import { CalendarPlus, CheckCircle2, Trash2 } from "lucide-react";
import { createActionPlanStep, deleteActionPlanStep, updateActionPlanStep } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";
import type { ActionPlanStep, User } from "@prisma/client";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function monthPosition(date: Date | null, fallback: number) {
  if (!date) return fallback;
  return Math.max(1, Math.min(12, date.getMonth() + 1));
}

export function ActionPlanGantt({
  actionPlanId,
  steps,
  candidates,
}: {
  actionPlanId: string;
  steps: Array<ActionPlanStep & { responsible: Pick<User, "name"> | null }>;
  candidates: Array<Pick<User, "id" | "name">>;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="card-header">
        <div>
          <span>Etapas do plano</span>
          <p className="mt-0.5 text-[11px] font-normal text-[var(--color-ink-400)]">Organize responsáveis e prazos do plano de ação.</p>
        </div>
        <CalendarPlus className="h-4 w-4 text-[var(--color-ink-400)]" aria-hidden="true" />
      </div>

      <form noValidate action={createActionPlanStep} className="grid grid-cols-1 gap-2 border-b border-[var(--color-border)] p-3 sm:grid-cols-6">
        <input type="hidden" name="actionPlanId" value={actionPlanId} />
        <label className="flex flex-col gap-1 sm:col-span-2"><span className="field-label">Etapa</span><input name="name" required maxLength={300} className="input-field" placeholder="Ex.: implantar ação" /></label>
        <label className="flex flex-col gap-1"><span className="field-label">Responsável</span><select name="responsibleId" className="input-field"><option value="">Não definido</option>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label>
        <label className="flex flex-col gap-1"><span className="field-label">Início</span><input name="startDate" type="date" className="input-field" /></label>
        <label className="flex flex-col gap-1"><span className="field-label">Fim</span><input name="dueDate" type="date" className="input-field" /></label>
        <div className="flex items-end"><SubmitButton className="btn btn-primary w-full"><CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" /> Adicionar</SubmitButton></div>
      </form>

      {steps.length === 0 ? (
        <p className="p-4 text-[12px] text-[var(--color-ink-500)]">Nenhuma etapa cadastrada. Adicione as ações que compõem este plano.</p>
      ) : (
        <div className="table-scroll">
          <table className="table-modern min-w-[980px]">
            <caption className="sr-only">Etapas e prazos do plano de ação.</caption>
            <thead><tr><th scope="col">Etapa</th><th scope="col">Responsável</th>{MONTHS.map((month) => <th scope="col" key={month} className="text-center">{month}</th>)}<th scope="col" className="text-right">Status</th><th scope="col" /></tr></thead>
            <tbody>
              {steps.map((step) => {
                const start = monthPosition(step.startDate, 1);
                const end = monthPosition(step.dueDate, start);
                const update = updateActionPlanStep.bind(null, step.id);
                return <tr key={step.id}>
                  <th scope="row" className="font-medium">{step.name}<div className="text-[10px] font-normal text-[var(--color-ink-400)]">{step.startDate?.toLocaleDateString("pt-BR") ?? "Sem início"} · {step.dueDate?.toLocaleDateString("pt-BR") ?? "Sem fim"}</div></th>
                  <td>{step.responsible?.name ?? "—"}</td>
                  {MONTHS.map((month, index) => { const monthNumber = index + 1; const active = monthNumber >= start && monthNumber <= end; return <td key={month} className="px-1 text-center"><span className={`inline-block h-2.5 w-full rounded-sm ${active ? (step.status === "CONCLUIDO" ? "bg-[var(--color-brand-500)]" : "bg-[var(--color-amber-500)]") : "bg-[var(--color-neutral-100)]"}`} title={active ? `${step.name} — ${month}` : undefined} /></td>; })}
                  <td className="text-right"><form noValidate action={update}><select name="status" defaultValue={step.status} className="input-field min-w-[120px] text-[11px]"><option value="ABERTO">Aberta</option><option value="CONCLUIDO">Concluída</option></select><input type="hidden" name="name" value={step.name} /><input type="hidden" name="parentId" value={step.parentId ?? ""} /><input type="hidden" name="responsibleId" value={step.responsibleId ?? ""} /><input type="hidden" name="startDate" value={step.startDate?.toISOString().slice(0, 10) ?? ""} /><input type="hidden" name="dueDate" value={step.dueDate?.toISOString().slice(0, 10) ?? ""} /><input type="hidden" name="value" value={step.value ?? ""} /><SubmitButton className="btn mt-1 text-[10px]" pendingText="Salvando…"><CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Atualizar</SubmitButton></form></td>
                  <td className="text-right"><form noValidate action={deleteActionPlanStep.bind(null, step.id)}><button type="submit" className="btn btn-ghost px-2 text-[var(--color-red-600)]" aria-label={`Excluir etapa ${step.name}`}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></button></form></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
