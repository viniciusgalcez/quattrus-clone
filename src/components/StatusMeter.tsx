import { STATUS_LABEL, type KpiStatus } from "@/lib/kpi";

const ORDER: KpiStatus[] = ["AZUL", "VERDE", "AMARELO", "VERMELHO", "CRITICO", "SEM_DADO"];

const SEGMENT_CLASS: Record<KpiStatus, string> = {
  AZUL: "meter-seg meter-seg-azul",
  VERDE: "meter-seg meter-seg-verde",
  AMARELO: "meter-seg meter-seg-amarelo",
  VERMELHO: "meter-seg meter-seg-vermelho",
  CRITICO: "meter-seg meter-seg-critico",
  SEM_DADO: "meter-seg meter-seg-neutro",
};

const DOT_CLASS: Record<KpiStatus, string> = {
  AZUL: "bg-[var(--color-blue-600)]",
  VERDE: "bg-[var(--color-green-600)]",
  AMARELO: "bg-[var(--color-amber-600)]",
  VERMELHO: "bg-[var(--color-red-600)]",
  CRITICO: "bg-[var(--color-critico-600)]",
  SEM_DADO: "bg-[var(--color-neutral-200)]",
};

/**
 * Distribution of the five status tiers across a set of indicators.
 * The bar is a summary; the legend below it carries count + label as text, so
 * the reading never depends on telling amber from red.
 */
export function StatusMeter({ counts }: { counts: Record<KpiStatus, number> }) {
  const total = ORDER.reduce((sum, status) => sum + (counts[status] ?? 0), 0);
  const present = ORDER.filter((status) => (counts[status] ?? 0) > 0);

  if (total === 0) {
    return (
      <p className="text-[12px] text-[var(--color-ink-400)]">
        Nenhum indicador para distribuir neste ciclo.
      </p>
    );
  }

  const summary = present
    .map((status) => `${counts[status]} ${STATUS_LABEL[status]}`)
    .join(", ");

  return (
    <div className="flex flex-col gap-2.5">
      <div className="meter" role="img" aria-label={`Distribuição de ${total} indicadores: ${summary}.`}>
        {present.map((status) => (
          <div
            key={status}
            className={SEGMENT_CLASS[status]}
            style={{ width: `${((counts[status] ?? 0) / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {present.map((status) => (
          <li key={status} className="flex items-center gap-1.5 text-[11.5px] text-[var(--color-ink-500)]">
            <span className={`h-2 w-2 shrink-0 rounded-full ${DOT_CLASS[status]}`} aria-hidden="true" />
            <span className="font-mono-num font-semibold text-[var(--color-ink-900)]">
              {counts[status]}
            </span>
            {STATUS_LABEL[status]}
          </li>
        ))}
      </ul>
    </div>
  );
}
