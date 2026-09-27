"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { LineChart } from "lucide-react";

export type ChartPoint = {
  name: string;
  Previsto: number;
  Realizado: number;
};

// CSS custom properties, not literal hex: globals.css defines light/dark
// values for --chart-* and --color-* tokens, and recharts accepts a var()
// string anywhere it accepts a color. The previous hardcoded hex here were
// light-theme values only, which is why the hover cursor rendered as a
// glaring near-white box on the dark theme.
const SERIES = {
  Previsto: "var(--chart-previsto)",
  Realizado: "var(--chart-realizado)",
  grid: "var(--chart-grid)",
  cursor: "var(--color-surface-muted)",
} as const;

const nf = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const nfCompact = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/**
 * Values lead, series names follow — by the time the reader is hovering they
 * already know which series they want, they want the number. The delta line is
 * the question the chart actually exists to answer.
 */
function ChartTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;

  const previsto = payload.find((p) => p.dataKey === "Previsto")?.value;
  const realizado = payload.find((p) => p.dataKey === "Realizado")?.value;
  const delta =
    typeof previsto === "number" && typeof realizado === "number" ? realizado - previsto : null;

  return (
    <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-[0_4px_12px_-2px_rgba(26,26,43,0.12)]">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
        {label}
      </div>
      <ul className="flex flex-col gap-1">
        {payload.map((entry) => (
          <li key={String(entry.dataKey)} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-[3px] w-3.5 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-mono-num text-[13px] font-semibold text-[var(--color-ink-900)]">
              {typeof entry.value === "number" ? nf.format(entry.value) : "—"}
            </span>
            <span className="text-[11.5px] text-[var(--color-ink-500)]">{entry.name}</span>
          </li>
        ))}
      </ul>
      {delta !== null && (
        <div className="mt-1.5 border-t border-[var(--color-border)] pt-1.5 text-[11.5px] text-[var(--color-ink-500)]">
          Diferença{" "}
          <span className="font-mono-num font-semibold text-[var(--color-ink-900)]">
            {delta > 0 ? "+" : ""}
            {nf.format(delta)}
          </span>
        </div>
      )}
    </div>
  );
}

export function DashboardCharts({ data }: { data: ChartPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="empty-state h-full justify-center">
        <div className="empty-state-icon" aria-hidden="true">
          <LineChart className="h-5 w-5" />
        </div>
        <p className="empty-state-title">Ainda sem histórico</p>
        <p className="empty-state-text">
          O gráfico compara previsto e realizado mês a mês. Assim que a primeira medição
          for lançada em Metas e indicadores, a série aparece aqui.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-chart h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          accessibilityLayer
          barGap={2}
          barCategoryGap="24%"
          margin={{ top: 5, right: 12, left: 0, bottom: 5 }}
        >
          <CartesianGrid vertical={false} stroke={SERIES.grid} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-ink-500)", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={52}
            tick={{ fill: "var(--color-ink-500)", fontSize: 12 }}
            tickFormatter={(value: number) => nfCompact.format(value)}
          />
          <Tooltip cursor={{ fill: SERIES.cursor }} content={ChartTooltip} />
          <Legend
            verticalAlign="top"
            height={28}
            iconType="square"
            iconSize={9}
            wrapperStyle={{ fontSize: "12px", color: "var(--color-ink-500)" }}
          />
          <Bar dataKey="Previsto" fill={SERIES.Previsto} maxBarSize={24} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Realizado" fill={SERIES.Realizado} maxBarSize={24} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Every plotted value stays reachable without reading a single color:
          the table is the chart's text equivalent for screen readers, and the
          fallback whenever the two series can't be told apart. */}
      <table className="sr-only">
        <caption>Previsto e realizado por período</caption>
        <thead>
          <tr>
            <th scope="col">Período</th>
            <th scope="col">Previsto</th>
            <th scope="col">Realizado</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.name}>
              <th scope="row">{point.name}</th>
              <td>{nf.format(point.Previsto)}</td>
              <td>{nf.format(point.Realizado)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
