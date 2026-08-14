"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createKpi } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FieldError, FormError } from "@/components/FieldError";

type Option = { id: string; name: string };

export function NovaMetaForm({
  departments,
  parentOptions,
}: {
  departments: Option[];
  parentOptions: Option[];
}) {
  const [state, formAction] = useActionState(createKpi, null);

  return (
    <form action={formAction} className="card flex flex-col gap-4 p-5">
      <FormError message={state?.error} />

      <div className="flex flex-col gap-1.5">
        <label className="field-label">Nome</label>
        <input type="text" name="name" required className="input-field" />
        <FieldError message={state?.fieldErrors?.name} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="field-label">Descrição</label>
        <textarea name="description" rows={3} className="input-field" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="field-label">Departamento</label>
          <select name="departmentId" className="input-field">
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
          <select name="parentId" className="input-field">
            <option value="">— indicador raiz —</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="field-label">Unidade</label>
          <input
            type="text"
            name="metricUnit"
            placeholder="ex: R$, %, un."
            required
            className="input-field"
          />
          <FieldError message={state?.fieldErrors?.metricUnit} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="field-label">Peso (%)</label>
          <input type="number" name="weight" defaultValue={0} className="input-field font-mono-num" />
          <FieldError message={state?.fieldErrors?.weight} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="field-label">Bom quando o valor é</label>
        <select name="direction" className="input-field">
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
            defaultValue={5}
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
            defaultValue={15}
            className="input-field font-mono-num"
          />
          <FieldError message={state?.fieldErrors?.redRange} />
        </div>
      </div>
      <p className="-mt-2 text-[11px] text-[var(--color-ink-400)]">
        Desvio dentro da faixa amarela = atenção. Além da faixa vermelha = crítico.
      </p>

      <div className="flex flex-col gap-1.5">
        <label className="field-label">Meta do mês</label>
        <input
          type="number"
          step="0.01"
          name="goal"
          defaultValue={0}
          className="input-field font-mono-num max-w-[200px]"
        />
        <FieldError message={state?.fieldErrors?.goal} />
      </div>

      <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-4">
        <Link href="/metas" className="btn">
          Cancelar
        </Link>
        <SubmitButton>Salvar meta</SubmitButton>
      </div>
    </form>
  );
}
