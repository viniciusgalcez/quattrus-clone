"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipContentProps,
  type TooltipValueType,
} from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";
import type { BandPoint } from "@/lib/farol-tree";

const nf = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const nfCompact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

const SERIES = {
  meta: "#6d4fd6",
  realizado: "#172431",
  faixa: "#bfe8d2",
  grid: "#eeeef5",
} as const;

function BandLegend() {
  const items = [
    { label: "Realizado", color: SERIES.realizado, shape: "line" as const },
    { label: "Meta", color: SERIES.meta, shape: "line" as const },
    { label: "Faixa Verde", color: SERIES.faixa, shape: "square" as const },
  ];
  return (
    <ul className="mb-1 flex flex-wrap items-center justify-center gap-4 text-[12px] text-[var(--color-ink-500)]">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={item.shape === "line" ? "h-[3px] w-3.5 rounded-full" : "h-2.5 w-2.5 rounded-sm"}
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function BandTooltip({ active, payload, label }: TooltipContentProps<TooltipValueType, string | number>) {
  if (!active || !payload?.length) return null;
  const meta = payload.find((p) => p.dataKey === "meta")?.value;
  const realizado = payload.find((p) => p.dataKey === "realizado")?.value;

  return (
    <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-[0_4px_12px_-2px_rgba(15,43,51,0.14)]">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
        {label}
      </div>
      <ul className="flex flex-col gap-1">
        {typeof realizado === "number" && (
          <li className="flex items-center gap-2 text-[12.5px]">
            <span className="h-[3px] w-3.5 rounded-full" style={{ backgroundColor: SERIES.realizado }} />
            Realizado <span className="font-mono-num font-semibold">{nf.format(realizado)}</span>
          </li>
        )}
        {typeof meta === "number" && (
          <li className="flex items-center gap-2 text-[12.5px]">
            <span className="h-[3px] w-3.5 rounded-full" style={{ backgroundColor: SERIES.meta }} />
            Meta <span className="font-mono-num font-semibold">{nf.format(meta)}</span>
          </li>
        )}
      </ul>
    </div>
  );
}

/**
 * Realizado vs. Meta with a green tolerance band around the goal — the
 * "Gráficos" panel from the real Quattrus. The band is drawn as a stacked bar
 * (an invisible base up to the band's floor, a visible bar for its height),
 * recharts' standard trick for a floating range bar.
 */
export function KpiBandChart({ data }: { data: BandPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="empty-state h-full justify-center">
        <div className="empty-state-icon" aria-hidden="true">
          <LineChartIcon className="h-5 w-5" />
        </div>
        <p className="empty-state-title">Ainda sem histórico</p>
        <p className="empty-state-text">
          O gráfico compara previsto e realizado mês a mês, com a faixa verde de tolerância ao redor
          da meta. Assim que a primeira medição for lançada, a série aparece aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <BandLegend />
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
            <CartesianGrid vertical={false} stroke={SERIES.grid} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#6b7a8c", fontSize: 12 }} />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={52}
              tick={{ fill: "#6b7a8c", fontSize: 12 }}
              tickFormatter={(value: number) => nfCompact.format(value)}
            />
            <Tooltip content={BandTooltip} />
            <Bar dataKey="faixaBase" stackId="faixa" fill="transparent" isAnimationActive={false} legendType="none" />
            <Bar dataKey="faixaAltura" stackId="faixa" fill={SERIES.faixa} isAnimationActive={false} legendType="none" />
            <Line type="monotone" dataKey="meta" stroke={SERIES.meta} strokeWidth={2} dot={false} legendType="none" />
            <Line
              type="monotone"
              dataKey="realizado"
              stroke={SERIES.realizado}
              strokeWidth={2}
              dot={{ r: 3, fill: SERIES.realizado }}
              legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
