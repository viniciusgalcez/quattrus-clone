import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exportableOwnerIds } from "@/lib/hierarchy";
import { currentPeriod, getDeviationPct, getKpiStatus, periodLabel, STATUS_COLOR, STATUS_LABEL } from "@/lib/kpi";
import { renderBarChartRgb, rowsToPdfWithChart } from "@/lib/document-export";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordAuditLog } from "@/lib/audit";
import { hasModuleAccess } from "@/lib/module-access";

export const dynamic = "force-dynamic";

function checked(searchParams: URLSearchParams, submitted: boolean, name: string) {
  return submitted ? searchParams.has(name) : true;
}

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function reportPeriod(searchParams: URLSearchParams) {
  const period = searchParams.get("period")?.trim();
  return period && /^\d{4}-(0[1-9]|1[0-2])$/.test(period) ? period : currentPeriod();
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Não autenticado.", { status: 401 });
  if (!hasModuleAccess(session.user, "imports")) return new Response("Acesso negado.", { status: 403 });
  if (!checkRateLimit("export", session.user.id, { limit: 20, windowMs: 60 * 1000 })) {
    return new Response("Muitas exportações em pouco tempo. Aguarde um minuto e tente novamente.", { status: 429 });
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const submitted = searchParams.get("submitted") === "1";
  const period = reportPeriod(searchParams);
  const description = searchParams.get("description")?.trim().slice(0, 200) || "Reunião de resultados";
  const includeMain = checked(searchParams, submitted, "includeMain");
  const includeAuxiliary = checked(searchParams, submitted, "includeAuxiliary");
  const includeDelegated = checked(searchParams, submitted, "includeDelegated");
  const includeTeamReds = checked(searchParams, submitted, "includeTeamReds");
  const includeCharts = checked(searchParams, submitted, "includeCharts");
  const includeMulticharts = checked(searchParams, submitted, "includeMulticharts");

  const ownerIds = await exportableOwnerIds(session.user);
  const ownerScope = includeDelegated || includeTeamReds ? ownerIds : [session.user.id];
  const leader = await prisma.user.findUnique({
    where: { id: searchParams.get("leaderId") || session.user.id },
    select: { id: true, name: true },
  });
  const participantIds = searchParams.getAll("participantIds").filter((id) => ownerIds.includes(id));
  const participants = participantIds.length
    ? await prisma.user.findMany({ where: { id: { in: participantIds } }, select: { name: true }, orderBy: { name: "asc" } })
    : [];
  const measurements = await prisma.measurement.findMany({
    where: {
      period,
      kpi: {
        ownerId: { in: ownerScope },
        archivedAt: null,
        ...(includeMain && includeAuxiliary ? {} : includeAuxiliary ? { auxiliary: true } : { auxiliary: false }),
      },
    },
    include: {
      kpi: {
        include: {
          owner: { select: { name: true } },
          actionPlans: { where: { status: "ABERTO" }, select: { id: true } },
        },
      },
    },
    orderBy: [{ kpi: { owner: { name: "asc" } } }, { kpi: { priority: "asc" } }, { kpi: { name: "asc" } }],
  });

  const indicatorRows = measurements.map((measurement) => {
    const status = getKpiStatus(
      measurement.goal,
      measurement.actual,
      measurement.kpi.direction,
      measurement.kpi.yellowRange,
      measurement.kpi.redRange
    );
    const deviation = getDeviationPct(measurement.goal, measurement.actual, measurement.kpi.direction);
    return [
      measurement.kpi.name,
      measurement.kpi.owner.name,
      measurement.goal,
      measurement.actual ?? "",
      STATUS_LABEL[status],
      deviation === null ? "" : `${deviation.toFixed(1)}%`,
      measurement.kpi.actionPlans.length,
    ];
  });
  const rows = [
    ["Líder", leader?.name ?? session.user.name ?? session.user.username, "", "", "", "", ""],
    ["Descrição", description, "", "", "", "", ""],
    ["Participantes", participants.map((participant) => participant.name).join(", ") || "Não informado", "", "", "", "", ""],
    [
      "Regras",
      [
        includeMain ? "principais" : null,
        includeAuxiliary ? "auxiliares" : null,
        includeDelegated ? "delegados" : null,
        includeTeamReds ? "vermelhos dos subordinados" : null,
        includeCharts ? "gráficos" : null,
        includeMulticharts ? "multigráficos" : null,
      ].filter(Boolean).join(", ") || "nenhuma regra marcada",
      "",
      "",
      "",
      "",
      "",
    ],
    ...indicatorRows,
  ];

  // Charts stay capped at the first 12 indicators — a 500x130pt image on a
  // single-page report has no room to stay legible with more bars than that,
  // and the full list is still in the table below regardless.
  const chart = includeCharts && measurements.length > 0
    ? {
        width: 500,
        height: 130,
        rgb: renderBarChartRgb(500, 130, measurements.slice(0, 12).map((measurement) => {
          const status = getKpiStatus(measurement.goal, measurement.actual, measurement.kpi.direction, measurement.kpi.yellowRange, measurement.kpi.redRange);
          return { goal: measurement.goal, actual: measurement.actual, color: hexToRgb(STATUS_COLOR[status]) };
        })),
      }
    : undefined;

  const body = rowsToPdfWithChart(
    `Reunião de resultados - ${periodLabel(period)}`,
    ["Indicador", "Responsável", "Meta", "Realizado", "Farol", "Desvio", "FCA aberto"],
    rows,
    chart
  );
  await recordAuditLog({
    userId: session.user.id,
    action: "EXPORT",
    entity: "ResultsMeeting",
    entityId: session.user.id,
    details: {
      format: "pdf",
      period,
      count: indicatorRows.length,
      leaderId: leader?.id ?? session.user.id,
      participantCount: participants.length,
      rules: { includeMain, includeAuxiliary, includeDelegated, includeTeamReds, includeCharts, includeMulticharts },
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reuniao-resultados-${period}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
