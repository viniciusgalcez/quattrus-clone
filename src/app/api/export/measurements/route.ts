import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exportableOwnerIds } from "@/lib/hierarchy";
import { measurementsToCsv } from "@/lib/import-export";
import { currentPeriod } from "@/lib/kpi";
import { isValidPeriod } from "@/lib/period";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Não autenticado.", { status: 401 });

  const { searchParams } = new URL(request.url);
  const requestedPeriod = searchParams.get("period");
  const period =
    requestedPeriod && isValidPeriod(requestedPeriod) ? requestedPeriod : currentPeriod();

  const ownerIds = await exportableOwnerIds(session.user);
  const measurements = await prisma.measurement.findMany({
    where: { period, kpi: { ownerId: { in: ownerIds }, archivedAt: null } },
    orderBy: [{ kpiId: "asc" }],
  });

  const csv = measurementsToCsv(
    measurements.map((m) => ({
      kpiId: m.kpiId,
      period: m.period,
      goal: m.goal,
      actual: m.actual,
      justification: m.justification,
    }))
  );

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="medicoes-${period}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
