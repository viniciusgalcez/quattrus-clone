"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, LineChart } from "lucide-react";
import { STATUS_LABEL, type KpiStatus } from "@/lib/kpi";
import { MONTH_LABELS, summarizeRow } from "@/lib/farol";
import type { FarolTreeNode } from "@/lib/farol-tree";
import { ownerInitials, ownerColor } from "@/lib/avatar";
import { KpiChartModal } from "@/components/KpiChartModal";

const nf = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

const DOT_CLASS: Record<KpiStatus, string> = {
  VERDE: "farol-dot farol-dot-verde",
  AMARELO: "farol-dot farol-dot-amarelo",
  VERMELHO: "farol-dot farol-dot-vermelho",
  CRITICO: "farol-dot farol-dot-critico",
  SEM_DADO: "farol-dot farol-dot-neutro",
};

const DOT_GLYPH: Partial<Record<KpiStatus, string>> = {
  AMARELO: "!",
  CRITICO: "!",
};

/**
 * The "Meus itens de controle" grid: one row per indicator, nested under its
 * parent, twelve month dots, and a colored Meta box — with an owner avatar so
 * a manager can tell at a glance whose item they're looking at inside their
 * own rollup.
 */
export function FarolTreeGrid({ rows, year }: { rows: FarolTreeNode[]; year: number }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [chartNode, setChartNode] = useState<FarolTreeNode | null>(null);

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderNode(node: FarolTreeNode, depth: number): React.ReactNode[] {
    const counts = summarizeRow({ kpiId: node.kpiId, name: node.name, metricUnit: node.metricUnit, ownerName: node.ownerName, cells: node.cells });
    const measured = 12 - counts.SEM_DADO;
    const onTarget = counts.VERDE;
    const latest = [...node.cells].reverse().find((c) => c.status !== "SEM_DADO");
    const latestOnTarget = latest?.status === "VERDE";
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsed.has(node.kpiId);

    const row = (
      <tr key={node.kpiId}>
        <th scope="row" className="min-w-[240px]">
          <div className="flex items-center gap-1.5" style={{ paddingLeft: depth * 18 }}>
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggle(node.kpiId)}
                aria-label={isCollapsed ? `Expandir ${node.name}` : `Recolher ${node.name}`}
                className="flex h-4 w-4 shrink-0 items-center justify-center text-[var(--color-ink-400)] hover:text-[var(--color-ink-900)]"
              >
                {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <span className="w-4 shrink-0" />
            )}

            <span
              className="avatar-chip"
              style={{ backgroundColor: ownerColor(node.ownerId) }}
              title={node.ownerName}
              aria-hidden="true"
            >
              {ownerInitials(node.ownerName)}
            </span>

            <div className="min-w-0">
              <Link
                href={`/metas/${node.kpiId}`}
                className="block truncate text-[12.5px] font-medium text-[var(--color-brand-700)] hover:underline"
              >
                {node.name}
              </Link>
              <div className="truncate text-[10.5px] text-[var(--color-ink-400)]">
                {node.metricUnit} · {node.ownerName}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setChartNode(node)}
              aria-label={`Ver gráfico de ${node.name}`}
              title="Ver gráfico"
              className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-400)] hover:bg-[var(--color-brand-50)] hover:text-[var(--color-brand-600)]"
            >
              <LineChart className="h-3.5 w-3.5" />
            </button>
          </div>
        </th>

        {node.cells.map((cell) => {
          const hasData = cell.status !== "SEM_DADO";
          const label = `${node.name}, ${cell.monthLabel} de ${year}: ${STATUS_LABEL[cell.status]}${
            hasData ? `, realizado ${nf.format(cell.actual ?? 0)} de ${nf.format(cell.goal ?? 0)}` : ""
          }`;
          const content = <span className={DOT_CLASS[cell.status]}>{DOT_GLYPH[cell.status] ?? ""}</span>;

          return (
            <td key={cell.period} className="!px-1.5 text-center">
              {cell.measurementId ? (
                <Link
                  href={`/fca/${cell.measurementId}`}
                  aria-label={label}
                  title={label}
                  className="inline-block rounded-full focus-visible:outline-2"
                >
                  {content}
                </Link>
              ) : (
                <span aria-label={label} title={label} className="inline-block">
                  {content}
                </span>
              )}
            </td>
          );
        })}

        <td className="text-center">
          <span className="font-mono-num text-[12px] font-semibold text-[var(--color-ink-900)]">
            {measured > 0 ? `${onTarget}/${measured}` : "—"}
          </span>
          <div className="text-[10.5px] text-[var(--color-ink-400)]">no alvo</div>
        </td>

        <td className="text-center">
          {latest ? (
            <div
              className="font-mono-num inline-flex min-w-[92px] flex-col items-center rounded-lg px-2 py-1 text-[11px] font-bold text-white"
              style={{ backgroundColor: latestOnTarget ? "var(--color-green-600)" : "var(--color-red-600)" }}
              title={`Realizado ${nf.format(latest.actual ?? 0)} / Meta ${nf.format(latest.goal ?? 0)} (${latest.monthLabel})`}
            >
              <span>{nf.format(latest.actual ?? 0)}</span>
              <span className="text-[9.5px] font-medium opacity-80">{nf.format(latest.goal ?? 0)}</span>
            </div>
          ) : (
            <span className="text-[11px] text-[var(--color-ink-400)]">—</span>
          )}
        </td>
      </tr>
    );

    if (isCollapsed || !hasChildren) return [row];
    return [row, ...node.children.flatMap((child) => renderNode(child, depth + 1))];
  }

  return (
    <>
      <div className="table-scroll">
        <table className="table-modern">
          <caption className="sr-only">
            Farol de indicadores de {year}: uma linha por indicador, uma coluna por mês.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="min-w-[240px]">
                Indicador
              </th>
              {MONTH_LABELS.map((label) => (
                <th key={label} scope="col" className="!px-1.5 text-center">
                  {label}
                </th>
              ))}
              <th scope="col" className="text-center">
                Ano
              </th>
              <th scope="col" className="text-center">
                Meta
              </th>
            </tr>
          </thead>
          <tbody>{rows.flatMap((node) => renderNode(node, 0))}</tbody>
        </table>
      </div>

      {chartNode && (
        <KpiChartModal
          name={chartNode.name}
          metricUnit={chartNode.metricUnit}
          data={chartNode.bandData}
          onClose={() => setChartNode(null)}
        />
      )}
    </>
  );
}
