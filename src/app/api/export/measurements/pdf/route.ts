import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exportableOwnerIds } from "@/lib/hierarchy";
import { currentPeriod } from "@/lib/kpi";
import { rowsToPdf } from "@/lib/document-export";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordAuditLog } from "@/lib/audit";
import { hasModuleAccess } from "@/lib/module-access";
export const dynamic = "force-dynamic";
export async function GET() { const session = await auth(); if (!session?.user) return new Response("Não autenticado.", { status: 401 }); if (!hasModuleAccess(session.user, "imports")) return new Response("Acesso negado.", { status: 403 }); if (!checkRateLimit("export", session.user.id, { limit: 20, windowMs: 60 * 1000 })) return new Response("Muitas exportações em pouco tempo. Aguarde um minuto e tente novamente.", { status: 429 }); const period = currentPeriod(); const rows = await prisma.measurement.findMany({ where: { period, kpi: { ownerId: { in: await exportableOwnerIds(session.user) }, archivedAt: null } }, include: { kpi: { select: { name: true, owner: { select: { name: true } } } } }, orderBy: { kpi: { name: "asc" } } }); const body = rowsToPdf(`Medições - ${period}`, ["Indicador", "Responsável", "Meta", "Realizado"], rows.map((m) => [m.kpi.name, m.kpi.owner.name, m.goal, m.actual ?? ""])); await recordAuditLog({ userId: session.user.id, action: "EXPORT", entity: "Measurement", entityId: session.user.id, details: { format: "pdf", period, count: rows.length } }); return new Response(body, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="medicoes-${period}.pdf"`, "Cache-Control": "no-store" } }); }
