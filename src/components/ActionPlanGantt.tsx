"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { CalendarPlus, CheckCircle2, GripVertical, Trash2 } from "lucide-react";
import {
  createActionPlanStep,
  deleteActionPlanStep,
  updateActionPlanStep,
  updateActionPlanStepDates,
} from "@/lib/actions";
import { asFormAction } from "@/lib/action-result";
import { SubmitButton } from "@/components/SubmitButton";
import {
  datesFromMonthSpan,
  defaultGanttYear,
  GANTT_MONTHS,
  isStepOverdue,
  resizeSpanEnd,
  resizeSpanStart,
  shiftSpan,
  stepMonthSpan,
  type GanttSpan,
} from "@/lib/action-plan-gantt";
import type { ActionPlanStep, User } from "@prisma/client";

type StepRow = ActionPlanStep & { responsible: Pick<User, "name"> | null };

type DragKind = "move" | "resize-start" | "resize-end";

type DragState = {
  stepId: string;
  kind: DragKind;
  originMonth: number;
  originSpan: GanttSpan;
  preview: GanttSpan;
};

function monthFromClientX(gridEl: HTMLElement, clientX: number): number {
  const rect = gridEl.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(0.999, (clientX - rect.left) / rect.width));
  return Math.floor(ratio * 12) + 1;
}

function barClass(status: string, overdue: boolean) {
  if (status === "CONCLUIDO") return "bg-[var(--color-brand-500)]";
  if (overdue) return "bg-[var(--color-red-600)]";
  return "bg-[var(--color-amber-600)]";
}

function localYmd(date: Date | null): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function ActionPlanGantt({
  actionPlanId,
  steps,
  candidates,
  editable = true,
}: {
  actionPlanId: string;
  steps: StepRow[];
  candidates: Array<Pick<User, "id" | "name">>;
  editable?: boolean;
}) {
  const [year, setYear] = useState(() => defaultGanttYear(steps));
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const gridRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const serialized = useMemo(
    () =>
      steps.map((step) => ({
        ...step,
        startDate: step.startDate ? new Date(step.startDate) : null,
        dueDate: step.dueDate ? new Date(step.dueDate) : null,
      })),
    [steps],
  );

  function commitSpan(step: StepRow, span: GanttSpan) {
    const dates = datesFromMonthSpan(year, span);
    startTransition(async () => {
      const result = await updateActionPlanStepDates(step.id, dates.startDate, dates.dueDate);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage(null);
    });
  }

  function onPointerDown(
    event: React.PointerEvent<HTMLElement>,
    step: StepRow,
    kind: DragKind,
    span: GanttSpan,
  ) {
    if (!editable || step.status === "CONCLUIDO") return;
    event.preventDefault();
    event.stopPropagation();
    const grid = gridRefs.current[step.id];
    if (!grid) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    const originMonth = monthFromClientX(grid, event.clientX);
    setDrag({ stepId: step.id, kind, originMonth, originSpan: span, preview: span });
  }

  function onPointerMove(event: React.PointerEvent<HTMLElement>, stepId: string) {
    if (!drag || drag.stepId !== stepId) return;
    const grid = gridRefs.current[stepId];
    if (!grid) return;
    const currentMonth = monthFromClientX(grid, event.clientX);
    const delta = currentMonth - drag.originMonth;
    let preview = drag.originSpan;
    if (drag.kind === "move") preview = shiftSpan(drag.originSpan, delta);
    if (drag.kind === "resize-start") preview = resizeSpanStart(drag.originSpan, drag.originSpan.startMonth + delta);
    if (drag.kind === "resize-end") preview = resizeSpanEnd(drag.originSpan, drag.originSpan.endMonth + delta);
    if (preview.startMonth !== drag.preview.startMonth || preview.endMonth !== drag.preview.endMonth) {
      setDrag({ ...drag, preview });
    }
  }

  function onPointerUp(step: StepRow) {
    if (!drag || drag.stepId !== step.id) return;
    const next = drag.preview;
    const changed =
      next.startMonth !== drag.originSpan.startMonth || next.endMonth !== drag.originSpan.endMonth;
    setDrag(null);
    if (changed) commitSpan(step, next);
  }

  return (
    <section className="card overflow-hidden print:break-inside-avoid">
      <div className="card-header flex flex-wrap items-center justify-between gap-2">
        <div>
          <span>Etapas · Gantt (visão Quattrus)</span>
          <p className="mt-0.5 text-[11px] font-normal text-[var(--color-ink-400)]">
            Arraste a barra para mover o prazo; use as bordas para alongar ou encurtar. O FCA acima continua sendo a causa-raiz.
          </p>
        </div>
        <label className="flex items-center gap-2 text-[11px] font-normal text-[var(--color-ink-500)]">
          Ano
          <select
            className="input-field w-auto py-1 text-[12px]"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            aria-label="Ano do Gantt"
          >
            {[year - 1, year, year + 1].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      {editable && (
        <form
          noValidate
          action={asFormAction(createActionPlanStep)}
          className="grid grid-cols-1 gap-2 border-b border-[var(--color-border)] p-3 sm:grid-cols-6"
        >
          <input type="hidden" name="actionPlanId" value={actionPlanId} />
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="field-label">Etapa</span>
            <input name="name" required maxLength={300} className="input-field" placeholder="Ex.: implantar ação" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="field-label">Responsável</span>
            <select name="responsibleId" className="input-field">
              <option value="">Não definido</option>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="field-label">Início</span>
            <input name="startDate" type="date" className="input-field" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="field-label">Fim</span>
            <input name="dueDate" type="date" className="input-field" />
          </label>
          <div className="flex items-end">
            <SubmitButton className="btn btn-primary w-full">
              <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" /> Adicionar
            </SubmitButton>
          </div>
        </form>
      )}

      {(message || pending) && (
        <p className="border-b border-[var(--color-border)] px-3 py-2 text-[11px] text-[var(--color-ink-500)]" role="status">
          {pending ? "Salvando prazo…" : message}
        </p>
      )}

      {serialized.length === 0 ? (
        <p className="p-4 text-[12px] text-[var(--color-ink-500)]">
          Nenhuma etapa cadastrada. Adicione as ações que compõem este plano.
        </p>
      ) : (
        <div className="table-scroll">
          <table className="table-modern min-w-[1080px]">
            <caption className="sr-only">Etapas e prazos do plano de ação em {year}.</caption>
            <thead>
              <tr>
                <th scope="col" className="w-[220px]">
                  Etapa
                </th>
                <th scope="col" className="w-[140px]">
                  Quem
                </th>
                <th scope="col" colSpan={12} className="text-center">
                  Gantt {year}
                </th>
                <th scope="col" className="text-right">
                  Status
                </th>
                {editable && <th scope="col" />}
              </tr>
              <tr>
                <th scope="col" />
                <th scope="col" />
                {GANTT_MONTHS.map((month) => (
                  <th scope="col" key={month} className="px-0 text-center text-[10px] font-normal">
                    {month}
                  </th>
                ))}
                <th scope="col" />
                {editable && <th scope="col" />}
              </tr>
            </thead>
            <tbody>
              {serialized.map((step) => {
                const baseSpan = stepMonthSpan(step.startDate, step.dueDate, year);
                const span =
                  drag?.stepId === step.id ? drag.preview : baseSpan ?? { startMonth: 1, endMonth: 1 };
                const hasBar = Boolean(baseSpan) || drag?.stepId === step.id;
                const overdue = isStepOverdue(step);
                const update = updateActionPlanStep.bind(null, step.id);
                return (
                  <tr key={step.id} className={overdue ? "bg-[var(--color-red-100)]" : undefined}>
                    <th scope="row" className="align-top font-medium">
                      {step.name}
                      <div className="text-[10px] font-normal text-[var(--color-ink-400)]">
                        {step.startDate?.toLocaleDateString("pt-BR") ?? "Sem início"} ·{" "}
                        {step.dueDate?.toLocaleDateString("pt-BR") ?? "Sem fim"}
                        {overdue && <span className="ml-1 text-[var(--color-red-600)]">Atrasada</span>}
                      </div>
                    </th>
                    <td className="align-top">{step.responsible?.name ?? "—"}</td>
                    <td colSpan={12} className="!p-1 align-middle">
                      <div
                        ref={(el) => {
                          gridRefs.current[step.id] = el;
                        }}
                        className="relative grid h-8 grid-cols-12 gap-px rounded-sm bg-[var(--color-neutral-100)]"
                        onPointerMove={(event) => onPointerMove(event, step.id)}
                        onPointerUp={() => onPointerUp(step)}
                        onPointerCancel={() => setDrag(null)}
                      >
                        {GANTT_MONTHS.map((month) => (
                          <div key={month} className="min-w-0" />
                        ))}
                        {hasBar && (
                          <div
                            className={`absolute top-1 bottom-1 flex items-stretch rounded-sm text-white shadow-sm ${barClass(step.status, overdue)} ${
                              editable && step.status !== "CONCLUIDO" ? "cursor-grab active:cursor-grabbing" : ""
                            }`}
                            style={{
                              left: `calc(${((span.startMonth - 1) / 12) * 100}% + 1px)`,
                              width: `calc(${((span.endMonth - span.startMonth + 1) / 12) * 100}% - 2px)`,
                            }}
                            title={`${step.name}: ${GANTT_MONTHS[span.startMonth - 1]}–${GANTT_MONTHS[span.endMonth - 1]}`}
                            onPointerDown={(event) => baseSpan && onPointerDown(event, step, "move", baseSpan)}
                          >
                            {editable && step.status !== "CONCLUIDO" && (
                              <>
                                <button
                                  type="button"
                                  aria-label={`Ajustar início de ${step.name}`}
                                  className="w-2 shrink-0 cursor-ew-resize rounded-l-sm bg-black/15"
                                  onPointerDown={(event) =>
                                    baseSpan && onPointerDown(event, step, "resize-start", baseSpan)
                                  }
                                />
                                <span className="flex flex-1 items-center justify-center gap-1 overflow-hidden px-1 text-[9px] font-medium">
                                  <GripVertical className="h-3 w-3 opacity-70" aria-hidden="true" />
                                  <span className="truncate print:hidden">
                                    {GANTT_MONTHS[span.startMonth - 1]}–{GANTT_MONTHS[span.endMonth - 1]}
                                  </span>
                                </span>
                                <button
                                  type="button"
                                  aria-label={`Ajustar fim de ${step.name}`}
                                  className="w-2 shrink-0 cursor-ew-resize rounded-r-sm bg-black/15"
                                  onPointerDown={(event) =>
                                    baseSpan && onPointerDown(event, step, "resize-end", baseSpan)
                                  }
                                />
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="align-top text-right">
                      {editable ? (
                        <form noValidate action={asFormAction(async (fd: FormData) => update(fd))}>
                          <select name="status" defaultValue={step.status} className="input-field min-w-[120px] text-[11px]">
                            <option value="ABERTO">Aberta</option>
                            <option value="CONCLUIDO">Concluída</option>
                          </select>
                          <input type="hidden" name="name" value={step.name} />
                          <input type="hidden" name="parentId" value={step.parentId ?? ""} />
                          <input type="hidden" name="responsibleId" value={step.responsibleId ?? ""} />
                          <input type="hidden" name="startDate" value={localYmd(step.startDate)} />
                          <input type="hidden" name="dueDate" value={localYmd(step.dueDate)} />
                          <input type="hidden" name="value" value={step.value ?? ""} />
                          <SubmitButton className="btn mt-1 text-[10px]" pendingText="Salvando…">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Atualizar
                          </SubmitButton>
                        </form>
                      ) : (
                        <span className={step.status === "CONCLUIDO" ? "badge badge-verde" : "badge badge-amarelo"}>
                          {step.status === "CONCLUIDO" ? "Concluída" : "Aberta"}
                        </span>
                      )}
                    </td>
                    {editable && (
                      <td className="align-top text-right">
                        <form noValidate action={asFormAction(deleteActionPlanStep.bind(null, step.id))}>
                          <button
                            type="submit"
                            className="btn btn-ghost px-2 text-[var(--color-red-600)]"
                            aria-label={`Excluir etapa ${step.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
