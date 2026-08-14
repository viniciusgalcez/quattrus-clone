import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exportableOwnerIds } from "@/lib/hierarchy";
import { kpisToCsv } from "@/lib/import-export";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response("Não autenticado.", { status: 401 });

  const ownerIds = await exportableOwnerIds(session.user);
  const kpis = await prisma.kpi.findMany({
    where: { ownerId: { in: ownerIds }, archivedAt: null },
    include: { owner: { select: { username: true } }, department: { select: { name: true } } },
    orderBy: [{ ownerId: "asc" }, { priority: "asc" }],
  });

  const csv = kpisToCsv(
    kpis.map((k) => ({
      id: k.id,
      name: k.name,
      description: k.description,
      ownerUsername: k.owner.username,
      departmentName: k.department?.name ?? null,
      parentId: k.parentId,
      metricUnit: k.metricUnit,
      direction: k.direction,
      calculationType: k.calculationType,
      weight: k.weight,
      yellowRange: k.yellowRange,
      redRange: k.redRange,
      priority: k.priority,
    }))
  );

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="itens.csv"',
      "Cache-Control": "no-store",
    },
  });
}
