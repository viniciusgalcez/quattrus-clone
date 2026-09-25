import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarRange } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentPeriod, getKpiStatus, periodLabel, STATUS_BADGE_CLASS, STATUS_COLOR, STATUS_LABEL } from "@/lib/kpi";
import { EmptyState } from "@/components/EmptyState";
import { AnnualMeasurementEditor } from "@/components/AnnualMeasurementEditor";
import { assertPageModule } from "@/lib/module-access";

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

function periodFor(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export default async function AnnualMeasurementsPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  assertPageModule(session.user, "measurements");

  const params = await searchParams;
  const currentYear = Number(currentPeriod().slice(0, 4));
  const requestedYear = Number(params.ano);
  const year = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100
    ? requestedYear
    : currentYear;
  const startPeriod = `${year}-01`;
  const endPeriod = `${year}-12`;

  const facilitated = await prisma.facilitation.findMany({
    where: { facilitatorId: session.user.id },
    select: { facilitatedId: true },
  });
  const ownerIds = [session.user.id, ...facilitated.map((item) => item.facilitatedId)];

  const kpis = await prisma.kpi.findMany({
    where: {
      archivedAt: null,
      OR: [
        { ownerId: session.user.id },
        { delegations: { some: { delegateId: session.user.id } } },
        ...(ownerIds.length > 1 ? [{ ownerId: { in: ownerIds.slice(1) } }] : []),
      ],
    },
    include: { measurements: { where: { period: { gte: startPeriod, lte: endPeriod } } } },
    orderBy: { priority: "asc" },
  });

  const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const previousYear = year - 1;
  const nextYear = year + 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/metas" className="mb-1 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-brand-700)] hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Lançamento mensal
          </Link>
          <h1 className="page-title">Medições anuais</h1>
          <p className="page-subtitle">Acompanhe o realizado, previsto e farol dos seus indicadores ao longo de {year}.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/medicoes?ano=${previousYear}`} className="btn" aria-label={`Ver medições de ${previousYear}`}>‹ {previousYear}</Link>
          <span className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-900)]">
            <CalendarRange className="h-4 w-4" aria-hidden="true" /> {year}
          </span>
          <Link href={`/medicoes?ano=${nextYear}`} className="btn" aria-label={`Ver medições de ${nextYear}`}>{nextYear} ›</Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        {kpis.length === 0 ? (
          <EmptyState icon={CalendarRange} title="Nenhum indicador encontrado" description="Cadastre um indicador ou peça uma delegação para acompanhar medições anuais." actions={[{ href: "/metas/novo", label: "Cadastrar indicador" }]} />
        ) : (
          <div className="table-scroll">
            <table className="table-modern min-w-[1050px]">
              <caption className="sr-only">Medições anuais dos indicadores em {year}.</caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 z-10 bg-[var(--color-surface)]">Indicador</th>
                  {monthLabels.map((label) => <th scope="col" key={label} className="text-center">{label}</th>)}
                  <th scope="col" className="text-right">Último valor</th>
                </tr>
              </thead>
              <tbody>
                {kpis.map((kpi) => {
                  const measurements = new Map(kpi.measurements.map((measurement) => [measurement.period, measurement]));
                  const latest = [...kpi.measurements].sort((a, b) => b.period.localeCompare(a.period))[0];
                  const latestStatus = latest ? getKpiStatus(latest.goal, latest.actual, kpi.direction, kpi.yellowRange, kpi.redRange) : "SEM_DADO";
                  return (
                    <tr key={kpi.id}>
                      <th scope="row" className="sticky left-0 z-10 bg-[var(--color-surface)]">
                        <Link href={`/metas/${kpi.id}`} className="text-[13px] font-medium text-[var(--color-brand-700)] hover:underline">{kpi.name}</Link>
                        <div className="text-[11px] text-[var(--color-ink-400)]">{kpi.metricUnit}</div>
                      </th>
                      {MONTHS.map((month) => {
                        const measurement = measurements.get(periodFor(year, month));
                        const status = measurement ? getKpiStatus(measurement.goal, measurement.actual, kpi.direction, kpi.yellowRange, kpi.redRange) : "SEM_DADO";
                        return (
                          <td key={month} className="text-center" title={measurement ? `${periodLabel(measurement.period)}: ${measurement.actual ?? "sem realizado"} / ${measurement.goal}` : `${monthLabels[month - 1]}: sem dado`}>
                            <div className="flex items-center justify-center gap-1"><span className="inline-block h-3 w-3 rounded-full border border-[var(--color-border)]" style={{ backgroundColor: measurement ? STATUS_COLOR[status] : "transparent", borderColor: measurement ? STATUS_COLOR[status] : undefined }} aria-label={STATUS_LABEL[status]} /><AnnualMeasurementEditor kpiId={kpi.id} kpiName={kpi.name} period={periodFor(year, month)} measurement={measurement ?? null} disabled={periodFor(year, month) > currentPeriod()} /></div>
                          </td>
                        );
                      })}
                      <td className="num text-right">
                        {latest?.actual !== null && latest?.actual !== undefined ? `${latest.actual} / ${latest.goal}` : "—"}
                        <div className="mt-0.5"><span className={STATUS_BADGE_CLASS[latestStatus]}>{STATUS_LABEL[latestStatus]}</span></div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
