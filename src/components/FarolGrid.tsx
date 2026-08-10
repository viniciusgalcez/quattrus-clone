import Link from "next/link";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/kpi";
import type { FarolRow } from "@/lib/farol";
import { MONTH_LABELS, summarizeRow } from "@/lib/farol";

const nf = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

/**
 * Gestão à vista: one row per indicator, twelve month columns. Status is never
 * carried by color alone — every cell shows its value, and its accessible name
 * spells the status out, so the grid still reads without color.
 */
export function FarolGrid({ rows, year }: { rows: FarolRow[]; year: number }) {
  return (
    <div className="table-scroll">
      <table className="table-modern">
        <caption className="sr-only">
          Farol de indicadores de {year}: uma linha por indicador, uma coluna por mês.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="min-w-[200px]">
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
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const counts = summarizeRow(row);
            const measured = 12 - counts.SEM_DADO;
            const onTarget = counts.VERDE;

            return (
              <tr key={row.kpiId}>
                <th scope="row" className="min-w-[200px]">
                  <Link
                    href={`/metas/${row.kpiId}`}
                    className="text-[13px] font-medium text-[var(--color-brand-700)] hover:underline"
                  >
                    {row.name}
                  </Link>
                  <div className="text-[11px] text-[var(--color-ink-400)]">
                    {row.metricUnit}
                    {row.ownerName && ` · ${row.ownerName}`}
                  </div>
                </th>

                {row.cells.map((cell) => {
                  const hasData = cell.status !== "SEM_DADO";
                  const label = `${row.name}, ${cell.monthLabel} de ${year}: ${STATUS_LABEL[cell.status]}${
                    hasData ? `, realizado ${nf.format(cell.actual ?? 0)} de ${nf.format(cell.goal ?? 0)}` : ""
                  }`;

                  const content = (
                    <span
                      className="font-mono-num flex h-8 min-w-[46px] items-center justify-center rounded-md border px-1 text-[11px] font-semibold tabular-nums"
                      style={{
                        backgroundColor: hasData ? STATUS_COLOR[cell.status] : "transparent",
                        color: hasData ? "#ffffff" : "var(--color-ink-400)",
                        borderColor: hasData ? "transparent" : "var(--color-border-strong)",
                      }}
                    >
                      {hasData && cell.actual !== null ? nf.format(cell.actual) : "—"}
                    </span>
                  );

                  return (
                    <td key={cell.period} className="!px-1.5">
                      {cell.measurementId ? (
                        <Link
                          href={`/fca/${cell.measurementId}`}
                          aria-label={label}
                          title={label}
                          className="block rounded-md focus-visible:outline-2"
                        >
                          {content}
                        </Link>
                      ) : (
                        <span aria-label={label} title={label} className="block">
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
