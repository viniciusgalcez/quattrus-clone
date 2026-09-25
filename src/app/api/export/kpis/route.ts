import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exportableOwnerIds } from "@/lib/hierarchy";
import { kpisToCsv } from "@/lib/import-export";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordAuditLog } from "@/lib/audit";
import { hasModuleAccess } from "@/lib/module-access";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response("Não autenticado.", { status: 401 });
  if (!hasModuleAccess(session.user, "imports")) return new Response("Acesso negado.", { status: 403 });
  if (!checkRateLimit("export", session.user.id, { limit: 20, windowMs: 60 * 1000 })) {
    return new Response("Muitas exportações em pouco tempo. Aguarde um minuto e tente novamente.", { status: 429 });
  }

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
  await recordAuditLog({
    userId: session.user.id,
    action: "EXPORT",
    entity: "Kpi",
    entityId: session.user.id,
    details: { format: "csv", count: kpis.length },
  });

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="itens.csv"',
      "Cache-Control": "no-store",
    },
  });
}
