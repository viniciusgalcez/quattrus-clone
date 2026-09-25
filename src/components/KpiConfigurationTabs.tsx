"use client";

import { useActionState, useState } from "react";
import { Check, Link2, Network, Settings2 } from "lucide-react";
import { saveKpiConfiguration, updateKpiSharing } from "@/lib/actions";
import { FieldError, FormError } from "@/components/FieldError";
import { SubmitButton } from "@/components/SubmitButton";
import { KpiThresholdEditor } from "@/components/KpiThresholdEditor";
import { KpiTotalizationPanel } from "@/components/KpiTotalizationPanel";

type Option = { id: string; name: string; ownerName: string; departmentId: string | null };
type Window = { startPeriod: string; endPeriod: string | null };
type Threshold = Window & { yellowRange: number; redRange: number };
type TotalizationChild = {
  id: string;
  name: string;
  sequenceNumber: number;
  ownerName: string;
  weight: number;
  coefficient: number | null;
};

type Configuration = {
  formula: { kind: "MANUAL" | "SUM" | "AVERAGE" | "WEIGHTED" | "QUOTIENT" | "TOTALIZER"; numeratorKpiId: string | null; denominatorKpiId: string | null; denominatorAverage: boolean } | null;
  validities: Window[];
  measurementPeriods: Window[];
  thresholdValidities: Threshold[];
  linkedFrom: { targetKpiId: string }[];
  dependenciesFrom: { targetKpiId: string; dependencyType: string }[];
  dependenciesTo: { sourceKpiId: string; dependencyType: string }[];
  formulaNumerators: { kpiId: string; kind: string }[];
  formulaDenominators: { kpiId: string; kind: string }[];
  shared: boolean;
  departmentId: string | null;
  totalizationChildren: TotalizationChild[];
};

const tabs = [
  ["tipo", "Tipo de item"],
  ["totalizacao", "Totalização"],
  ["vinculacao", "Vinculação"],
  ["compartilhamento", "Compartilhamento"],
  ["periodo", "Período"],
  ["dependencias", "Dependências"],
] as const;
type Tab = (typeof tabs)[number][0];

function formatPeriod(start: string, end: string | null) {
  return end ? `${start} a ${end}` : `${start} em diante`;
}

export function KpiConfigurationTabs({
  kpiId,
  yellowRange,
  redRange,
  configuration,
  options,
}: {
  kpiId: string;
  yellowRange: number;
  redRange: number;
  configuration: Configuration;
  options: Option[];
}) {
  const [tab, setTab] = useState<Tab>("tipo");
  const save = saveKpiConfiguration.bind(null, kpiId);
  const [state, formAction] = useActionState(save, null);
  const [sharingState, sharingAction] = useActionState(updateKpiSharing.bind(null, kpiId), null);
  const formula = configuration.formula;
  const threshold = configuration.thresholdValidities[0];
  const [yellowValue, setYellowValue] = useState(threshold?.yellowRange ?? yellowRange);
  const [redValue, setRedValue] = useState(threshold?.redRange ?? redRange);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-start gap-3 border-b border-[var(--color-border)] p-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--color-brand-100)] text-[var(--color-brand-700)]">
          <Settings2 className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--color-ink-900)]">Configuração do Item de Controle</h2>
          <p className="mt-0.5 text-[12px] text-[var(--color-ink-500)]">Fórmulas, vínculos e vigências são registrados sem apagar os ciclos anteriores.</p>
        </div>
      </div>

      <div className="flex overflow-x-auto border-b border-[var(--color-border)] px-3" role="tablist" aria-label="Configuração do item">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`shrink-0 border-b-2 px-3 py-3 text-[12px] font-medium transition-colors ${tab === id ? "border-[var(--color-brand-600)] text-[var(--color-brand-700)]" : "border-transparent text-[var(--color-ink-500)] hover:text-[var(--color-ink-800)]"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="p-5">
        <form noValidate action={formAction} className={tab === "totalizacao" || tab === "compartilhamento" ? "hidden" : "contents"}>
          <FormError message={state?.error} />
          <section className={tab === "tipo" ? "flex flex-col gap-4" : "hidden"}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5"><span className="field-label">Método de cálculo</span>
                <select name="formulaKind" defaultValue={formula?.kind ?? "MANUAL"} className="input-field">
                  <option value="MANUAL">Lançamento manual</option><option value="SUM">Somatório de períodos</option><option value="AVERAGE">Média de períodos</option><option value="WEIGHTED">Média ponderada</option><option value="QUOTIENT">Quociente</option><option value="TOTALIZER">Totalizador dos subordinados</option>
                </select>
              </label>
              <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-[12px] text-[var(--color-ink-600)]">Quocientes usam valores medidos dos itens selecionados. A divisão por zero resulta em “sem dado”.</div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5"><span className="field-label">Numerador</span><select name="numeratorKpiId" defaultValue={formula?.numeratorKpiId ?? ""} className="input-field"><option value="">Selecione um item</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.ownerName}</option>)}</select></label>
              <label className="flex flex-col gap-1.5"><span className="field-label">Denominador</span><select name="denominatorKpiId" defaultValue={formula?.denominatorKpiId ?? ""} className="input-field"><option value="">Selecione um item</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.ownerName}</option>)}</select></label>
            </div>
            <label className="flex items-center gap-2 text-[12px] text-[var(--color-ink-700)]"><input name="denominatorAverage" type="checkbox" defaultChecked={formula?.denominatorAverage ?? false} /> Usar média do denominador</label>
            <FieldError message={state?.fieldErrors?.numeratorKpiId} />
            <div className="grid gap-4 border-t border-[var(--color-border)] pt-4 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5"><span className="field-label">Vigência das faixas a partir de</span><input name="thresholdStart" type="month" defaultValue={threshold?.startPeriod ?? new Date().toISOString().slice(0, 7)} className="input-field" /></label>
              <label className="flex flex-col gap-1.5"><span className="field-label">Até</span><input name="thresholdEnd" type="month" defaultValue={threshold?.endPeriod ?? ""} className="input-field" /></label>
              <div className="grid grid-cols-2 gap-3"><label className="flex flex-col gap-1.5"><span className="field-label">Amarela (%)</span><input name="yellowRange" type="number" step="0.1" value={yellowValue} onChange={(e) => setYellowValue(Number(e.target.value))} className="input-field" /></label><label className="flex flex-col gap-1.5"><span className="field-label">Vermelha (%)</span><input name="redRange" type="number" step="0.1" value={redValue} onChange={(e) => setRedValue(Number(e.target.value))} className="input-field" /></label></div>
            </div>
            <KpiThresholdEditor
              yellowRange={yellowValue}
              redRange={redValue}
              onChange={({ yellowRange: y, redRange: r }) => {
                setYellowValue(y);
                setRedValue(r);
              }}
            />
            <FieldError message={state?.fieldErrors?.redRange} />
          </section>

          <section className={tab === "vinculacao" ? "flex flex-col gap-3" : "hidden"}><div className="flex items-center gap-2 text-[13px] font-medium text-[var(--color-ink-800)]"><Link2 className="h-4 w-4 text-[var(--color-brand-700)]" /> Itens vinculados para comparações e gráficos</div><select name="linkedKpiIds" multiple defaultValue={configuration.linkedFrom.map((item) => item.targetKpiId)} size={Math.min(Math.max(options.length, 3), 7)} className="input-field min-h-28">{options.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.ownerName}</option>)}</select><p className="text-[11px] text-[var(--color-ink-500)]">Use Ctrl ou Cmd para selecionar mais de um item.</p></section>

          <section className={tab === "periodo" ? "grid gap-5 sm:grid-cols-2" : "hidden"}><div className="flex flex-col gap-3"><h3 className="text-[13px] font-semibold text-[var(--color-ink-800)]">Vigência do item</h3><div className="grid grid-cols-2 gap-3"><label className="flex flex-col gap-1.5"><span className="field-label">De</span><input type="month" name="itemValidityStart" className="input-field" /></label><label className="flex flex-col gap-1.5"><span className="field-label">Até</span><input type="month" name="itemValidityEnd" className="input-field" /></label></div>{configuration.validities.map((item) => <p key={`${item.startPeriod}-${item.endPeriod}`} className="text-[12px] text-[var(--color-ink-500)]">{formatPeriod(item.startPeriod, item.endPeriod)}</p>)}</div><div className="flex flex-col gap-3"><h3 className="text-[13px] font-semibold text-[var(--color-ink-800)]">Vigência das medições</h3><div className="grid grid-cols-2 gap-3"><label className="flex flex-col gap-1.5"><span className="field-label">De</span><input type="month" name="measurementValidityStart" className="input-field" /></label><label className="flex flex-col gap-1.5"><span className="field-label">Até</span><input type="month" name="measurementValidityEnd" className="input-field" /></label></div>{configuration.measurementPeriods.map((item) => <p key={`${item.startPeriod}-${item.endPeriod}`} className="text-[12px] text-[var(--color-ink-500)]">{formatPeriod(item.startPeriod, item.endPeriod)}</p>)}</div></section>

          <section className={tab === "dependencias" ? "flex flex-col gap-3" : "hidden"}><div className="flex items-center gap-2 text-[13px] font-medium text-[var(--color-ink-800)]"><Network className="h-4 w-4 text-[var(--color-brand-700)]" /> Itens usados neste cálculo</div><select name="dependencyKpiIds" multiple defaultValue={configuration.dependenciesFrom.map((item) => item.targetKpiId)} size={Math.min(Math.max(options.length, 3), 7)} className="input-field min-h-28">{options.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.ownerName}</option>)}</select><div className="border-t border-[var(--color-border)] pt-3"><p className="text-[12px] font-medium text-[var(--color-ink-700)]">Este item é usado por</p>{[...configuration.dependenciesTo.map((item) => `Dependência de cálculo (${item.dependencyType})`), ...configuration.formulaNumerators.map((item) => `Numerador em ${item.kind}`), ...configuration.formulaDenominators.map((item) => `Denominador em ${item.kind}`)].map((item, index) => <p key={`${item}-${index}`} className="mt-1 text-[12px] text-[var(--color-ink-500)]">{item}</p>)}{configuration.dependenciesTo.length + configuration.formulaNumerators.length + configuration.formulaDenominators.length === 0 && <p className="mt-1 text-[12px] text-[var(--color-ink-500)]">Nenhum item depende dele atualmente.</p>}</div></section>

          <div className="mt-5 flex justify-end border-t border-[var(--color-border)] pt-4"><SubmitButton className="w-full sm:w-auto"><Check className="h-3.5 w-3.5" /> Salvar configuração</SubmitButton></div>
        </form>

        <div className={tab === "totalizacao" ? "block" : "hidden"}>
          <KpiTotalizationPanel
            parentKpiId={kpiId}
            formulaKind={formula?.kind ?? "MANUAL"}
            departmentId={configuration.departmentId}
            totalizationChildren={configuration.totalizationChildren}
            candidates={options}
          />
        </div>

        <div className={tab === "compartilhamento" ? "flex flex-col gap-3" : "hidden"}>
          <form noValidate action={sharingAction} className="flex flex-col gap-3">
            <FormError message={sharingState?.error} />
            <label className="flex items-center gap-2 text-[13px] text-[var(--color-ink-800)]">
              <input type="radio" name="shared" value="true" defaultChecked={configuration.shared} /> Compartilhar este item para todos os usuários
            </label>
            <label className="flex items-center gap-2 text-[13px] text-[var(--color-ink-800)]">
              <input type="radio" name="shared" value="false" defaultChecked={!configuration.shared} /> Não compartilhar este item
            </label>
            <p className="text-[11px] text-[var(--color-ink-500)]">Itens compartilhados podem ser usados por qualquer pessoa em vínculos, dependências e totalizações.</p>
            <SubmitButton className="w-full sm:w-auto">Salvar compartilhamento</SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
