import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarRange, Lock } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentPeriod, getKpiStatusFromThresholds, thresholdsForPeriod } from "@/lib/kpi";
import { EmptyState } from "@/components/EmptyState";
import { AnnualMeasurementGrid } from "@/components/AnnualMeasurementGrid";
import { MedicoesKpiSelector } from "@/components/MedicoesKpiSelector";
import { assertPageModule } from "@/lib/module-access";
import { findPeriodLock } from "@/lib/period-locks";

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

function periodFor(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export default async function AnnualMeasurementsPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; kpi?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  assertPageModule(session.user, "measurements");

  const params = await searchParams;
  const nowPeriod = currentPeriod();
  const currentYear = Number(nowPeriod.slice(0, 4));
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
    include: {
      measurements: { where: { period: { gte: startPeriod, lte: endPeriod } } },
      thresholdValidities: {
        select: {
          startPeriod: true,
          endPeriod: true,
          yellowRange: true,
          redRange: true,
          thresholdMode: true,
          lowerLimit: true,
          upperLimit: true,
        },
      },
    },
    orderBy: [{ priority: "asc" }, { name: "asc" }],
  });

  const selectedKpi = kpis.find((kpi) => kpi.id === params.kpi) ?? kpis[0] ?? null;
  const previousYear = year - 1;
  const nextYear = year + 1;
  const yearHref = (y: number, kpiId?: string | null) =>
    `/medicoes?ano=${y}${kpiId ? `&kpi=${kpiId}` : ""}`;

  const locks = selectedKpi
    ? await Promise.all(MONTHS.map(async (month) => {
        const period = periodFor(year, month);
        const lock = await findPeriodLock(period, selectedKpi.departmentId);
        return [period, Boolean(lock)] as const;
      }))
    : [];
  const lockMap = new Map(locks);
  const closedCount = [...lockMap.values()].filter(Boolean).length;

  const rows = selectedKpi
    ? MONTHS.map((month) => {
        const period = periodFor(year, month);
        const measurement = selectedKpi.measurements.find((item) => item.period === period) ?? null;
        const thresholds = thresholdsForPeriod(period, selectedKpi, selectedKpi.thresholdValidities);
        const status = measurement
          ? getKpiStatusFromThresholds(measurement.goal, measurement.actual, selectedKpi.direction, thresholds)
          : "SEM_DADO";
        return {
          period,
          month,
          locked: lockMap.get(period) ?? false,
          future: period > nowPeriod,
          status,
          measurement: measurement
            ? {
                goal: measurement.goal,
                actual: measurement.actual,
                measured: measurement.measured,
                forecast: measurement.forecast,
                justification: measurement.justification,
                benchmark: measurement.benchmark,
                benchmarkValue: measurement.benchmarkValue,
              }
            : null,
        };
      })
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/metas" className="mb-1 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-brand-700)] hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Lançamento mensal
          </Link>
          <h1 className="page-title">Medições anuais</h1>
          <p className="page-subtitle">Grade colunar por item e ano — realizado, previsto, meta e farol.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={yearHref(previousYear, selectedKpi?.id)} className="btn" aria-label={`Ver medições de ${previousYear}`}>‹ {previousYear}</Link>
          <span className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px] font-semibold text-[var(--color-ink-900)]">
            <CalendarRange className="h-4 w-4" aria-hidden="true" /> {year}
          </span>
          <Link href={yearHref(nextYear, selectedKpi?.id)} className="btn" aria-label={`Ver medições de ${nextYear}`}>{nextYear} ›</Link>
        </div>
      </div>

      {kpis.length === 0 ? (
        <div className="card overflow-hidden">
          <EmptyState icon={CalendarRange} title="Nenhum indicador encontrado" description="Cadastre um indicador ou peça uma delegação para acompanhar medições anuais." actions={[{ href: "/metas/novo", label: "Cadastrar indicador" }]} />
        </div>
      ) : (
        <>
          <div className="card flex flex-wrap items-end gap-3 p-4">
            <MedicoesKpiSelector
              year={year}
              selectedKpiId={selectedKpi!.id}
              options={kpis.map((kpi) => ({ id: kpi.id, label: `${kpi.name} (${kpi.metricUnit})` }))}
            />
            {selectedKpi && (
              <p className="pb-2 text-[12px] text-[var(--color-ink-500)]">
                {selectedKpi.name} · IC-{String(selectedKpi.sequenceNumber).padStart(5, "0")}
              </p>
            )}
          </div>

          {closedCount > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-[var(--color-amber-600)]/30 bg-[var(--color-amber-100)] px-4 py-3 text-[13px] text-[var(--color-amber-600)]" role="status">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold text-[var(--color-ink-900)]">{closedCount} {closedCount === 1 ? "mês fechado" : "meses fechados"} neste ano</p>
                <p className="mt-0.5 text-[12px] text-[var(--color-ink-600)]">Meses com period lock não aceitam salvamento (bloqueio também no servidor).</p>
              </div>
            </div>
          )}

          {selectedKpi && (
            <div className="card overflow-hidden">
              <AnnualMeasurementGrid kpiId={selectedKpi.id} kpiName={selectedKpi.name} rows={rows} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
