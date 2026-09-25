import path from "node:path";

const STORAGE_KEY_RE = /^[a-f0-9-]{36}\.(pdf|png|jpe?g|webp|xlsx|docx)$/i;

function uploadRoot() {
  const configured = process.env.UPLOAD_DIR;
  return path.resolve(configured && path.isAbsolute(configured) ? configured : path.join(process.cwd(), "uploads"));
}

export function resolveUploadPath(storageKey: string) {
  if (!STORAGE_KEY_RE.test(storageKey)) {
    throw new Error("Nome de arquivo armazenado inválido.");
  }
  const root = uploadRoot();
  const filePath = path.resolve(root, storageKey);
  if (!filePath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Caminho de anexo inválido.");
  }
  return filePath;
}

export function resolveUploadRoot() {
  return uploadRoot();
}

export function attachmentDownloadDisposition(originalName: string) {
  const fallback = originalName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160) || "anexo";
  return `attachment; filename="${fallback}"`;
}
