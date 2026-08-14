"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Archive } from "lucide-react";
import { updateKpi, archiveKpi } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FieldError, FormError } from "@/components/FieldError";
import type { Direction } from "@prisma/client";

type Option = { id: string; name: string };

type KpiInfo = {
  id: string;
  name: string;
  description: string | null;
  metricUnit: string;
  direction: Direction;
  weight: number;
  yellowRange: number;
  redRange: number;
  priority: number;
  departmentId: string | null;
  parentId: string | null;
};

export function EditarMetaForm({
  kpi,
  departments,
  parentOptions,
}: {
  kpi: KpiInfo;
  departments: Option[];
  parentOptions: Option[];
}) {
  const updateKpiWithId = updateKpi.bind(null, kpi.id);
  const [state, formAction] = useActionState(updateKpiWithId, null);

  return (
    <div className="flex flex-col gap-4">
    <form action={formAction} className="card flex flex-col gap-4 p-5">
      <FormError message={state?.error} />

      <div className="flex flex-col gap-1.5">
        <label className="field-label">Nome</label>
        <input type="text" name="name" required defaultValue={kpi.name} className="input-field" />
        <FieldError message={state?.fieldErrors?.name} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="field-label">Descrição</label>
        <textarea name="description" rows={3} defaultValue={kpi.description ?? ""} className="input-field" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="field-label">Departamento</label>
          <select name="departmentId" defaultValue={kpi.departmentId ?? ""} className="input-field">
            <option value="">— sem departamento —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="field-label">Contribui para (indicador pai)</label>
          <select name="parentId" defaultValue={kpi.parentId ?? ""} className="input-field">
            <option value="">— indicador raiz —</option>
            {parentOptions
              .filter((p) => p.id !== kpi.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          <FieldError message={state?.fieldErrors?.parentId} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className="field-label">Unidade</label>
          <input type="text" name="metricUnit" required defaultValue={kpi.metricUnit} className="input-field" />
          <FieldError message={state?.fieldErrors?.metricUnit} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="field-label">Peso (%)</label>
          <input type="number" name="weight" defaultValue={kpi.weight} className="input-field font-mono-num" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="field-label">Prioridade</label>
          <input type="number" name="priority" defaultValue={kpi.priority} className="input-field font-mono-num" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="field-label">Bom quando o valor é</label>
        <select name="direction" defaultValue={kpi.direction} className="input-field">
          <option value="MORE">Maior (+)</option>
          <option value="LESS">Menor (-)</option>
          <option value="EQUAL">Igual (=)</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="field-label">Faixa amarela (%)</label>
          <input
            type="number"
            step="0.1"
            name="yellowRange"
            defaultValue={kpi.yellowRange}
            className="input-field font-mono-num"
          />
          <FieldError message={state?.fieldErrors?.yellowRange} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="field-label">Faixa vermelha (%)</label>
          <input
            type="number"
            step="0.1"
            name="redRange"
            defaultValue={kpi.redRange}
            className="input-field font-mono-num"
          />
          <FieldError message={state?.fieldErrors?.redRange} />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-4">
        <Link href={`/metas/${kpi.id}`} className="btn">
          Cancelar
        </Link>
        <SubmitButton>Salvar alterações</SubmitButton>
      </div>
    </form>

    <form
      action={async () => {
        await archiveKpi(kpi.id);
      }}
      className="card flex items-center justify-between p-4"
    >
      <p className="text-[12px] text-[var(--color-ink-500)]">
        Arquivar remove este indicador dos painéis, sem apagar o histórico de medições.
      </p>
      <button type="submit" className="btn text-[var(--color-red-600)]">
        <Archive className="h-3.5 w-3.5" /> Arquivar indicador
      </button>
    </form>
    </div>
  );
}
