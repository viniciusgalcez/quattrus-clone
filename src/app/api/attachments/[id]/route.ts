import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canView } from "@/lib/hierarchy";
import { attachmentDownloadDisposition, resolveUploadPath } from "@/lib/upload-storage";
import { attachmentModuleForEntity } from "@/lib/attachment-access";
import { hasModuleAccess } from "@/lib/module-access";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({ where: { id }, include: { kpi: { select: { ownerId: true } }, actionPlan: { include: { kpi: { select: { ownerId: true } } } }, measurement: { include: { kpi: { select: { ownerId: true } } } } } });
  if (!attachment) return NextResponse.json({ error: "Anexo não encontrado." }, { status: 404 });
  const ownerId = attachment.kpi?.ownerId ?? attachment.actionPlan?.kpi.ownerId ?? attachment.measurement?.kpi.ownerId;
  if (!ownerId || !(await canView(session.user.id, session.user.role, ownerId))) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const entityType = attachment.actionPlan ? "actionPlan" : attachment.measurement ? "measurement" : attachment.kpi ? "kpi" : null;
  const requiredModule = attachmentModuleForEntity(entityType);
  if (!requiredModule || !hasModuleAccess(session.user, requiredModule)) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  try {
    const data = await readFile(/* turbopackIgnore: true */ resolveUploadPath(attachment.storageKey));
    return new NextResponse(data, { headers: { "Content-Type": attachment.mimeType, "Content-Length": String(data.byteLength), "Content-Disposition": attachmentDownloadDisposition(attachment.originalName), "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Arquivo indisponível." }, { status: 404 });
  }
}
