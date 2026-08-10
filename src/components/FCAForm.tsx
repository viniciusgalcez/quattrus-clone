"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, RotateCcw } from "lucide-react";
import { saveActionPlan, concludeActionPlan, reopenActionPlan } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FieldError, FormError } from "@/components/FieldError";
import type { ActionPlan } from "@prisma/client";

type MeasurementInfo = {
  id: string;
  goal: number;
  actual: number | null;
  metricUnit: string;
};

type ParetoItemInput = {
  id?: string;
  phenomenon: string;
  quantity: number;
};

const WHY_NUMBERS = [1, 2, 3, 4, 5] as const;

/** Live snapshot of what the user has filled in, used only to drive progress UI. */
type Progress = {
  fact: string;
  whys: string[];
  rootCause: string;
  what: string;
  who: string;
  when: string;
};

const SECTIONS = [
  { id: "fca-fato", index: 1, label: "Fato" },
  { id: "fca-causa", index: 2, label: "Causa" },
  { id: "fca-acao", index: 3, label: "Ação" },
] as const;

export function FCAForm({
  measurement,
  plan,
  deviation,
  initialParetoItems = [],
}: {
  measurement: MeasurementInfo;
  plan: ActionPlan | null;
  deviation: number | null;
  initialParetoItems?: ParetoItemInput[];
}) {
  const [state, formAction] = useActionState(saveActionPlan, null);
  const [paretoItems, setParetoItems] = useState<ParetoItemInput[]>(initialParetoItems);

  const planField = (key: string) => String((plan?.[key as keyof ActionPlan] as string) ?? "").trim();

  const [progress, setProgress] = useState<Progress>(() => ({
    fact: planField("fact"),
    whys: WHY_NUMBERS.map((n) => planField(`why${n}`)),
    rootCause: planField("rootCause"),
    what: planField("what"),
    who: planField("who"),
    when: plan?.when ? "preenchido" : "",
  }));

  function handleInput(event: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    setProgress({
      fact: value("fact"),
      whys: WHY_NUMBERS.map((n) => value(`why${n}`)),
      rootCause: value("rootCause"),
      what: value("what"),
      who: value("who"),
      when: value("when"),
    });
  }

  const done: Record<(typeof SECTIONS)[number]["id"], boolean> = {
    "fca-fato": progress.fact !== "",
    "fca-causa": progress.rootCause !== "",
    "fca-acao": progress.what !== "" && progress.who !== "" && progress.when !== "",
  };
  const activeId = SECTIONS.find((section) => !done[section.id])?.id ?? null;

  // The first unanswered "why" is the one we invite the user to write next;
  // everything after it is dimmed but still rendered, so nothing is lost on save.
  const firstEmptyWhy = progress.whys.findIndex((why) => why === "");
  const whysAnswered = progress.whys.filter((why) => why !== "").length;

  const dateValue = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");

  return (
    <>
      {/* Progress rail — turns a long page into three named, checkable steps. */}
      <nav aria-label="Progresso do FCA" className="card flex flex-wrap items-center gap-1 p-1">
        {SECTIONS.map((section) => {
          const isDone = done[section.id];
          const isActive = activeId === section.id;
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              aria-current={isActive ? "step" : undefined}
              className={`step-chip ${isDone ? "step-chip-done" : isActive ? "step-chip-active" : ""}`}
            >
              <span className="step-index" aria-hidden="true">
                {isDone ? <Check className="h-2.5 w-2.5 text-white" /> : <span>{section.index}</span>}
              </span>
              {section.label}
              <span className="sr-only">{isDone ? " — preenchido" : " — pendente"}</span>
            </a>
          );
        })}
        <span className="ml-auto text-[11.5px] text-[var(--color-ink-400)]">
          Fato · 5 Porquês · Causa raiz · 5W2H
        </span>
      </nav>

      <form action={formAction} onInput={handleInput} className="flex flex-col gap-4">
        <input type="hidden" name="measurementId" value={measurement.id} />
        <input type="hidden" name="paretoItemsJson" value={JSON.stringify(paretoItems)} />

        <FormError message={state?.error} />

        {/* ── 0. Pareto ─────────────────────────────────────────────────────── */}
        <section id="fca-pareto" className="card flex scroll-mt-4 flex-col gap-1 p-2">
          <header>
            <div className="flex items-center gap-2">
              <span className="font-mono-num text-[11px] font-bold text-[var(--color-ink-400)]">00</span>
              <h2 className="font-display text-[13.5px] font-semibold text-[var(--color-ink-900)]">
                Estratificação (Pareto)
              </h2>
            </div>
            <p className="section-hint mt-1">
              Fatie o problema. Liste os fenômenos (ex: produtos, máquinas) e as quantidades.
            </p>
          </header>

          <div className="flex flex-col gap-2 border border-[var(--color-border)] rounded-md bg-[var(--color-neutral-100)] p-4">
            <table className="table-modern text-[11px]">
              <thead>
                <tr>
                  <th>Fenômeno</th>
                  <th className="num w-[80px]">Qtd</th>
                  <th className="w-[60px]"></th>
                </tr>
              </thead>
              <tbody>
                {paretoItems.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <input 
                        type="text" 
                        value={item.phenomenon} 
                        onChange={e => {
                          const newItems = [...paretoItems];
                          newItems[idx].phenomenon = e.target.value;
                          setParetoItems(newItems);
                        }}
                        className="input-inline w-full"
                      />
                    </td>
                    <td className="num">
                      <input 
                        type="number" 
                        value={item.quantity} 
                        onChange={e => {
                          const newItems = [...paretoItems];
                          newItems[idx].quantity = Number(e.target.value);
                          setParetoItems(newItems);
                        }}
                        className="input-inline w-full"
                      />
                    </td>
                    <td>
                      <button type="button" onClick={() => setParetoItems(paretoItems.filter((_, i) => i !== idx))} className="text-[var(--color-red-600)] hover:underline">Remover</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button 
              type="button" 
              onClick={() => setParetoItems([...paretoItems, { phenomenon: "", quantity: 0 }])}
              className="text-[11px] font-semibold text-[var(--color-brand-700)] hover:underline self-start mt-1"
            >
              + Adicionar Fenômeno
            </button>
          </div>
        </section>

        {/* ── 1. Fato ─────────────────────────────────────────────────────── */}
        <section id="fca-fato" className="card flex scroll-mt-4 flex-col gap-1 p-2">
          <header>
            <div className="flex items-center gap-2">
              <span className="font-mono-num text-[11px] font-bold text-[var(--color-ink-400)]">01</span>
              <h2 className="font-display text-[13.5px] font-semibold text-[var(--color-ink-900)]">
                Fato — o que aconteceu
              </h2>
            </div>
            <p className="section-hint mt-1">
              Registre o desvio de forma objetiva e mensurável, sem opinião nem culpado.
            </p>
          </header>

          <div className="flex flex-wrap items-end gap-3 bg-[var(--color-brand-50)] rounded-md px-3 py-2 border border-[var(--color-brand-100)]">
            <div>
              <div className="field-label">Meta</div>
              <div className="font-mono-num mt-0 text-[11px] font-semibold text-[var(--color-ink-900)]">
                {measurement.goal}{" "}
                <span className="text-[11px] font-medium text-[var(--color-ink-500)]">
                  {measurement.metricUnit}
                </span>
              </div>
            </div>
            <div>
              <div className="field-label">Realizado</div>
              <div className="font-mono-num mt-0 text-[11px] font-semibold text-[var(--color-ink-900)]">
                {measurement.actual !== null ? measurement.actual : "—"}{" "}
                {measurement.actual !== null && (
                  <span className="text-[11px] font-medium text-[var(--color-ink-500)]">
                    {measurement.metricUnit}
                  </span>
                )}
              </div>
            </div>
            {deviation !== null && (
              <span className="badge badge-vermelho mb-0.5">
                Desvio {deviation.toFixed(1)}%
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="fca-fact" className="field-label">
              Descrição do fato
            </label>
            <textarea
              id="fca-fact"
              name="fact"
              required
              rows={2}
              defaultValue={plan?.fact ?? ""}
              placeholder="Ex.: refugo de tecelagem ficou 3,2 p.p. acima da meta em três semanas seguidas."
              className="input-field"
            />
            <FieldError message={state?.fieldErrors?.fact} />
          </div>
        </section>

        {/* ── 2. Causa ────────────────────────────────────────────────────── */}
        <section id="fca-causa" className="card flex scroll-mt-4 flex-col gap-2 p-2">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono-num text-[11px] font-bold text-[var(--color-ink-400)]">02</span>
              <h2 className="font-display text-[13.5px] font-semibold text-[var(--color-ink-900)]">
                Causa — 5 Porquês
              </h2>
              <span className="font-mono-num ml-auto text-[11px] font-semibold text-[var(--color-ink-400)]">
                {whysAnswered}/5
              </span>
            </div>
            <p className="section-hint mt-1">
              Cada resposta pergunta &ldquo;por quê?&rdquo; sobre a anterior. Pare quando chegar em
              algo que você consegue mudar — nem sempre são cinco níveis.
            </p>
          </header>

          <div className="why-chain">
            {WHY_NUMBERS.map((num, i) => {
              const value = progress.whys[i] ?? "";
              const isFilled = value !== "";
              const isNext = !isFilled && (firstEmptyWhy === i || firstEmptyWhy === -1);
              const isPending = !isFilled && !isNext;
              const previous = i > 0 ? progress.whys[i - 1] : "";

              return (
                <div
                  key={num}
                  className={`why-step ${
                    isFilled ? "why-step-filled" : isNext ? "why-step-next" : "why-step-pending"
                  }`}
                >
                  <div className="why-dot" aria-hidden="true">
                    {isFilled ? <Check className="h-3 w-3" /> : num}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor={`fca-why${num}`}
                      className="text-[12px] font-medium text-[var(--color-ink-700)]"
                    >
                      {num}º Por quê?
                      {i > 0 && previous && (
                        <span className="ml-1.5 font-normal text-[var(--color-ink-400)]">
                          Por que “{previous.length > 60 ? `${previous.slice(0, 60)}…` : previous}”?
                        </span>
                      )}
                    </label>
                    <input
                      id={`fca-why${num}`}
                      type="text"
                      name={`why${num}`}
                      defaultValue={(plan?.[`why${num}` as keyof ActionPlan] as string) ?? ""}
                      placeholder={i === 0 ? "Porque…" : ""}
                      className="input-field"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-1.5 border border-[var(--color-border)] rounded-md bg-[var(--color-neutral-100)] p-3">
            <label htmlFor="fca-root" className="field-label">
              Causa raiz — a conclusão da cadeia
            </label>
            <textarea
              id="fca-root"
              name="rootCause"
              rows={2}
              defaultValue={plan?.rootCause ?? ""}
              placeholder="A última resposta que ainda está sob seu controle."
              className="input-field"
            />
          </div>
        </section>

        {/* ── 3. Ação ─────────────────────────────────────────────────────── */}
        <section id="fca-acao" className="card flex scroll-mt-4 flex-col gap-2 p-2">
          <header>
            <div className="flex items-center gap-2">
              <span className="font-mono-num text-[11px] font-bold text-[var(--color-ink-400)]">03</span>
              <h2 className="font-display text-[13.5px] font-semibold text-[var(--color-ink-900)]">
                Ação — plano 5W2H
              </h2>
            </div>
            <p className="section-hint mt-1">
              O plano ataca a causa raiz, não o sintoma. O que, quem e quando são o mínimo para
              o plano ser cobrável.
            </p>
          </header>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="fca-what" className="field-label">
                O que (What)
              </label>
              <input
                id="fca-what"
                type="text"
                name="what"
                defaultValue={plan?.what ?? ""}
                placeholder="A ação a ser executada"
                className="input-field"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="fca-who" className="field-label">
                Quem (Who)
              </label>
              <input
                id="fca-who"
                type="text"
                name="who"
                defaultValue={plan?.who ?? ""}
                placeholder="Um responsável, não uma área"
                className="input-field"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="fca-where" className="field-label">
                Onde (Where)
              </label>
              <input
                id="fca-where"
                type="text"
                name="where"
                defaultValue={plan?.where ?? ""}
                placeholder="Setor, máquina ou processo"
                className="input-field"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="fca-when" className="field-label">
                Quando (When)
              </label>
              <input
                id="fca-when"
                type="date"
                name="when"
                defaultValue={dateValue(plan?.when)}
                className="input-field"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="fca-howmuch" className="field-label">
                Quanto custa (How much)
              </label>
              <input
                id="fca-howmuch"
                type="number"
                step="0.01"
                name="howMuch"
                placeholder="R$"
                defaultValue={plan?.howMuch ?? ""}
                className="input-field font-mono-num"
              />
              <FieldError message={state?.fieldErrors?.howMuch} />
            </div>
            <div className="col-span-1 flex flex-col gap-1 sm:col-span-2">
              <label htmlFor="fca-why" className="field-label">
                Por que (Why)
              </label>
              <textarea
                id="fca-why"
                name="why"
                rows={2}
                defaultValue={plan?.why ?? ""}
                placeholder="Qual resultado essa ação deve produzir no indicador"
                className="input-field"
              />
            </div>
            <div className="col-span-1 flex flex-col gap-1 sm:col-span-2">
              <label htmlFor="fca-how" className="field-label">
                Como (How)
              </label>
              <textarea
                id="fca-how"
                name="how"
                rows={2}
                defaultValue={plan?.how ?? ""}
                placeholder="Os passos da execução"
                className="input-field"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href="/metas" className="btn">
            Cancelar
          </Link>
          <SubmitButton>Salvar FCA</SubmitButton>
        </div>
      </form>

      {plan && (
        <div className="card flex flex-wrap items-center justify-between gap-1 p-2">
          <p className="text-[12px] text-[var(--color-ink-500)]">
            {plan.status === "ABERTO"
              ? "Este plano está em aberto e conta como FCA pendente no painel."
              : "Este plano está concluído. Reabra se a causa voltar a se repetir."}
          </p>
          {plan.status === "ABERTO" ? (
            <form
              action={async () => {
                await concludeActionPlan(plan.id);
              }}
            >
              <SubmitButton className="btn" pendingText="Concluindo…">
                <CheckCircle2
                  className="h-3.5 w-3.5 text-[var(--color-green-600)]"
                  aria-hidden="true"
                />{" "}
                Marcar como concluído
              </SubmitButton>
            </form>
          ) : (
            <form
              action={async () => {
                await reopenActionPlan(plan.id);
              }}
            >
              <SubmitButton className="btn" pendingText="Reabrindo…">
                <RotateCcw
                  className="h-3.5 w-3.5 text-[var(--color-amber-600)]"
                  aria-hidden="true"
                />{" "}
                Reabrir
              </SubmitButton>
            </form>
          )}
        </div>
      )}
    </>
  );
}
