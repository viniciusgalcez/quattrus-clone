"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { X } from "lucide-react";
import {
  addTotalizationChild,
  recalculateTotalization,
  removeTotalizationChild,
  updateTotalizationWeights,
} from "@/lib/actions";
import { FormError } from "@/components/FieldError";
import { SubmitButton } from "@/components/SubmitButton";

type ChildRow = {
  id: string;
  name: string;
  sequenceNumber: number;
  ownerName: string;
  weight: number;
  coefficient: number | null;
};

type Candidate = { id: string; name: string; ownerName: string; departmentId: string | null };

type Scope = "diretos" | "pares" | "todos";

/**
 * "Totalização" tab: which items roll up into this one (the parentId tree,
 * shown and edited here) plus each subordinate's coefficient — the two
 * knobs the original Quattrus keeps on this screen instead of the basic
 * registration form.
 */
export function KpiTotalizationPanel({
  parentKpiId,
  formulaKind,
  departmentId,
  totalizationChildren,
  candidates,
}: {
  parentKpiId: string;
  formulaKind: string;
  departmentId: string | null;
  totalizationChildren: ChildRow[];
  candidates: Candidate[];
}) {
  const [scope, setScope] = useState<Scope>("diretos");
  const childIds = useMemo(() => new Set(totalizationChildren.map((c) => c.id)), [totalizationChildren]);
  const scopedCandidates = useMemo(() => {
    const pool = candidates.filter((c) => !childIds.has(c.id));
    if (scope === "diretos") return pool;
    if (scope === "pares") return pool.filter((c) => c.departmentId === departmentId);
    return pool;
  }, [candidates, childIds, scope, departmentId]);

  const [addState, addAction] = useActionState(addTotalizationChild.bind(null, parentKpiId), null);
  const [weightsState, weightsAction] = useActionState(updateTotalizationWeights.bind(null, parentKpiId), null);
  const [, startRemoveTransition] = useTransition();

  const ranked = useMemo(
    () => [...totalizationChildren].sort((a, b) => (b.coefficient ?? 0) - (a.coefficient ?? 0)),
    [totalizationChildren]
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2">
        <p className="text-[12px] text-[var(--color-ink-600)]">
          Função de agregação: <strong>{formulaKindLabel(formulaKind)}</strong> (definida na aba
          “Tipo de item”)
        </p>
        <form
          noValidate
          action={async () => {
            await recalculateTotalization(parentKpiId);
          }}
        >
          <button type="submit" className="btn">
            Calcular agora
          </button>
        </form>
      </div>

      <form noValidate action={weightsAction} className="flex flex-col gap-2">
        <FormError message={weightsState?.error} />
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
          <table className="w-full text-[12px]">
            <thead className="bg-[var(--color-surface-muted)] text-[11px] uppercase tracking-wide text-[var(--color-ink-500)]">
              <tr>
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-left">Item de controle</th>
                <th className="px-3 py-2 text-left">Responsável</th>
                <th className="px-3 py-2 text-left">Coef.</th>
                <th className="px-3 py-2 text-left">Ranking</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {totalizationChildren.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-[var(--color-ink-500)]">
                    Nenhum item subordinado ainda.
                  </td>
                </tr>
              )}
              {totalizationChildren.map((child) => (
                <tr key={child.id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-2 font-mono-num">IC-{String(child.sequenceNumber).padStart(5, "0")}</td>
                  <td className="px-3 py-2">{child.name}</td>
                  <td className="px-3 py-2">{child.ownerName}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.1"
                      name={`coefficient_${child.id}`}
                      defaultValue={child.coefficient ?? ""}
                      className="input-field w-24"
                    />
                  </td>
                  <td className="px-3 py-2 font-mono-num">{ranked.findIndex((r) => r.id === child.id) + 1}º</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      aria-label="Remover"
                      className="text-[var(--color-red-600)] hover:underline"
                      onClick={() => startRemoveTransition(async () => {
                        await removeTotalizationChild(parentKpiId, child.id);
                      })}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalizationChildren.length > 0 && (
          <SubmitButton className="w-full sm:w-auto sm:self-end">Salvar coeficientes</SubmitButton>
        )}
      </form>

      <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-4">
        <h3 className="text-[13px] font-semibold text-[var(--color-ink-800)]">Itens subordinados</h3>
        <div className="flex gap-4 text-[12px]" role="radiogroup" aria-label="Escopo de itens candidatos">
          {(["diretos", "pares", "todos"] as const).map((value) => (
            <label key={value} className="flex items-center gap-1.5">
              <input
                type="radio"
                name="scope"
                checked={scope === value}
                onChange={() => setScope(value)}
              />
              {value === "diretos" ? "Diretos" : value === "pares" ? "Meus Pares" : "Todos"}
            </label>
          ))}
        </div>
        <form noValidate action={addAction} className="flex flex-wrap items-end gap-2">
          <FormError message={addState?.error} />
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="field-label">Item de controle</label>
            <select name="childKpiId" className="input-field" required defaultValue="">
              <option value="" disabled>
                Escolha um item
              </option>
              {scopedCandidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.ownerName}
                </option>
              ))}
            </select>
          </div>
          <SubmitButton className="btn">Adicionar</SubmitButton>
        </form>
      </div>
    </div>
  );
}

function formulaKindLabel(kind: string) {
  switch (kind) {
    case "SUM":
      return "Somatório de períodos";
    case "AVERAGE":
      return "Média de períodos";
    case "WEIGHTED":
      return "Média ponderada";
    case "QUOTIENT":
      return "Quociente";
    case "TOTALIZER":
      return "Totalizador dos subordinados";
    default:
      return "Lançamento manual";
  }
}
