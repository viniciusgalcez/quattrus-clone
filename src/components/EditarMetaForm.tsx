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
  sequenceNumber: number;
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
  category: "PMB" | "KPI";
  client: string | null;
  bomFor: string | null;
  chronicRedMonths: number | null;
  decimalPlaces: number;
  coefficient: number | null;
  auxiliary: boolean;
  shared: boolean;
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
    <form noValidate action={formAction} className="card flex flex-col gap-4 p-5">
      <FormError message={state?.error} />

      <div className="flex flex-col gap-1.5">
        <label className="field-label">Código</label>
        <input
          type="text"
          readOnly
          disabled
          value={`IC-${String(kpi.sequenceNumber).padStart(5, "0")}`}
          className="input-field font-mono-num opacity-70"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="field-label">Nome</label>
        <input type="text" name="name" required defaultValue={kpi.name} className="input-field" />
        <FieldError message={state?.fieldErrors?.name} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="field-label">Descrição</label>
        <textarea name="description" rows={3} defaultValue={kpi.description ?? ""} className="input-field resize-none" />
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className="field-label">Categoria</label>
          <select name="category" defaultValue={kpi.category} className="input-field">
            <option value="KPI">KPI</option>
            <option value="PMB">PMB</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="field-label">Cliente</label>
          <input type="text" name="client" defaultValue={kpi.client ?? ""} className="input-field" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="field-label">Bom para</label>
          <input type="text" name="bomFor" defaultValue={kpi.bomFor ?? ""} className="input-field" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className="field-label">Vermelho crônico (meses)</label>
          <input
            type="number"
            name="chronicRedMonths"
            min={1}
            max={24}
            defaultValue={kpi.chronicRedMonths ?? ""}
            placeholder="—"
            className="input-field font-mono-num"
          />
          <FieldError message={state?.fieldErrors?.chronicRedMonths} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="field-label">Casas decimais</label>
          <input
            type="number"
            name="decimalPlaces"
            min={0}
            max={6}
            defaultValue={kpi.decimalPlaces}
            className="input-field font-mono-num"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="field-label">Coeficiente</label>
          <input
            type="number"
            step="0.01"
            name="coefficient"
            defaultValue={kpi.coefficient ?? ""}
            placeholder="—"
            className="input-field font-mono-num"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-[12.5px] text-[var(--color-ink-700)]">
          <input type="checkbox" name="auxiliary" defaultChecked={kpi.auxiliary} />
          Item auxiliar (não conta na % de cumprimento principal)
        </label>
        <label className="flex items-center gap-2 text-[12.5px] text-[var(--color-ink-700)]">
          <input type="checkbox" name="shared" defaultChecked={kpi.shared} />
          Compartilhar este item para todos os usuários
        </label>
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

      <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:justify-end">
        <Link href={`/metas/${kpi.id}`} className="btn w-full sm:w-auto">
          Cancelar
        </Link>
        <SubmitButton className="w-full sm:w-auto">Salvar alterações</SubmitButton>
      </div>
    </form>

    <form noValidate
      action={async () => {
        await archiveKpi(kpi.id);
      }}
      className="card flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-[12px] text-[var(--color-ink-500)]">
        Arquivar remove este indicador dos painéis, sem apagar o histórico de medições.
      </p>
      <button type="submit" className="btn w-full text-[var(--color-red-600)] sm:w-auto">
        <Archive className="h-3.5 w-3.5" /> Arquivar indicador
      </button>
    </form>
    </div>
  );
}
