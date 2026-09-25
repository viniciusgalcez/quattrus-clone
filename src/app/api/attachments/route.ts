import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, assertActionPlanEditable, assertKpiEditable, assertMeasurementEditable } from "@/lib/authz";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordAuditLog } from "@/lib/audit";
import { resolveUploadPath, resolveUploadRoot } from "@/lib/upload-storage";
import { attachmentModuleForEntity } from "@/lib/attachment-access";
import { hasModuleAccess } from "@/lib/module-access";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

function cleanName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160) || "anexo";
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!checkRateLimit("attachment-upload", user.id, { limit: 10, windowMs: 60 * 1000 })) {
      return NextResponse.json({ error: "Muitos anexos enviados em pouco tempo. Aguarde um minuto e tente novamente." }, { status: 429 });
    }
    const form = await request.formData();
    const file = form.get("file");
    const entityType = form.get("entityType");
    const entityId = form.get("entityId");
    if (!(file instanceof File) || typeof entityType !== "string" || typeof entityId !== "string") return NextResponse.json({ error: "Arquivo e destino são obrigatórios." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ error: "O arquivo deve ter entre 1 byte e 10 MB." }, { status: 413 });
    const ext = ALLOWED[file.type];
    if (!ext) return NextResponse.json({ error: "Tipo de arquivo não permitido." }, { status: 415 });

    const requiredModule = attachmentModuleForEntity(entityType);
    if (!requiredModule || !hasModuleAccess(user, requiredModule)) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const relation = entityType === "actionPlan" ? { actionPlanId: entityId } : entityType === "kpi" ? { kpiId: entityId } : entityType === "measurement" ? { measurementId: entityId } : null;
    if (!relation) return NextResponse.json({ error: "Destino inválido." }, { status: 400 });
    if (entityType === "actionPlan") await assertActionPlanEditable(entityId, user);
    if (entityType === "kpi") await assertKpiEditable(entityId, user);
    if (entityType === "measurement") await assertMeasurementEditable(entityId, user);

    const storageKey = `${randomUUID()}${ext}`;
    await mkdir(resolveUploadRoot(), { recursive: true });
    await writeFile(/* turbopackIgnore: true */ resolveUploadPath(storageKey), Buffer.from(await file.arrayBuffer()), { flag: "wx" });
    const attachment = await prisma.attachment.create({ data: { ...relation, originalName: cleanName(file.name), storageKey, mimeType: file.type, sizeBytes: file.size, uploadedById: user.id } });
    await recordAuditLog({
      userId: user.id,
      action: "CREATE",
      entity: "Attachment",
      entityId: attachment.id,
      details: { entityType, entityId, mimeType: file.type, sizeBytes: file.size },
    });
    return NextResponse.json({ id: attachment.id, name: attachment.originalName });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível anexar o arquivo." }, { status: 400 });
  }
}
