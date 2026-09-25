import { randomUUID } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/authz";
import { canView } from "@/lib/hierarchy";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordAuditLog } from "@/lib/audit";
import { resolveUploadPath, resolveUploadRoot } from "@/lib/upload-storage";

const MAX_AVATAR_BYTES = 1024 * 1024;
const ALLOWED_AVATAR_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId") || session.user.id;
  if (!(await canView(session.user.id, session.user.role, userId))) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarStorageKey: true, avatarMimeType: true, avatarUpdatedAt: true },
  });
  if (!user?.avatarStorageKey || !user.avatarMimeType) {
    return NextResponse.json({ error: "Avatar não encontrado." }, { status: 404 });
  }

  try {
    const data = await readFile(/* turbopackIgnore: true */ resolveUploadPath(user.avatarStorageKey));
    return new NextResponse(data, {
      headers: {
        "Content-Type": user.avatarMimeType,
        "Content-Length": String(data.byteLength),
        "Cache-Control": "private, max-age=300",
        ETag: user.avatarUpdatedAt?.getTime().toString() ?? user.avatarStorageKey,
      },
    });
  } catch {
    return NextResponse.json({ error: "Avatar indisponível." }, { status: 404 });
  }
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!checkRateLimit("avatar-upload", user.id, { limit: 8, windowMs: 60 * 1000 })) {
    return NextResponse.json({ error: "Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente." }, { status: 429 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Selecione uma imagem." }, { status: 400 });
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json({ error: "A foto deve ter no máximo 1 MB." }, { status: 413 });
  }
  const extension = ALLOWED_AVATAR_TYPES[file.type];
  if (!extension) {
    return NextResponse.json({ error: "Use PNG, JPG ou WEBP." }, { status: 415 });
  }

  const storageKey = `${randomUUID()}${extension}`;
  await mkdir(resolveUploadRoot(), { recursive: true });
  await writeFile(/* turbopackIgnore: true */ resolveUploadPath(storageKey), Buffer.from(await file.arrayBuffer()), { flag: "wx" });
  await prisma.user.update({
    where: { id: user.id },
    data: { avatarStorageKey: storageKey, avatarMimeType: file.type, avatarUpdatedAt: new Date() },
  });
  await recordAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "UserAvatar",
    entityId: user.id,
    details: { mimeType: file.type, sizeBytes: file.size },
  });

  return NextResponse.json({ ok: true });
}
