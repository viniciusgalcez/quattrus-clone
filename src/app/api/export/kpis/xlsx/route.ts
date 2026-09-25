import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exportableOwnerIds } from "@/lib/hierarchy";
import { rowsToXlsx } from "@/lib/document-export";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordAuditLog } from "@/lib/audit";
import { hasModuleAccess } from "@/lib/module-access";
export const dynamic = "force-dynamic";
export async function GET() { const session = await auth(); if (!session?.user) return new Response("Não autenticado.", { status: 401 }); if (!hasModuleAccess(session.user, "imports")) return new Response("Acesso negado.", { status: 403 }); if (!checkRateLimit("export", session.user.id, { limit: 20, windowMs: 60 * 1000 })) return new Response("Muitas exportações em pouco tempo. Aguarde um minuto e tente novamente.", { status: 429 }); const kpis = await prisma.kpi.findMany({ where: { ownerId: { in: await exportableOwnerIds(session.user) }, archivedAt: null }, include: { owner: { select: { username: true } }, department: { select: { name: true } } }, orderBy: { name: "asc" } }); const body = rowsToXlsx(["ID", "Nome", "Dono", "Departamento", "Unidade", "Direção", "Cálculo", "Peso"], kpis.map((k) => [k.id, k.name, k.owner.username, k.department?.name ?? "", k.metricUnit, k.direction, k.calculationType, k.weight])); await recordAuditLog({ userId: session.user.id, action: "EXPORT", entity: "Kpi", entityId: session.user.id, details: { format: "xlsx", count: kpis.length } }); return new Response(body, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="itens.xlsx"', "Cache-Control": "no-store" } }); }
