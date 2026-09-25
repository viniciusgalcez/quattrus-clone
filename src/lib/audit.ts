import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "ARCHIVE"
  | "RESTORE"
  | "STATUS_CHANGE"
  | "UPSERT"
  | "PURGE_ARCHIVED";

export type AuditLogEntry = {
  userId?: string | null;
  action: AuditAction | string;
  entity: string;
  entityId: string;
  details?: unknown;
};

const SENSITIVE_DETAIL_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "secret",
  "authorization",
  "cookie",
]);

function redactDetails(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactDetails);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      SENSITIVE_DETAIL_KEYS.has(key.toLowerCase()) ? "[REDACTED]" : redactDetails(nestedValue),
    ])
  );
}

function stringifyDetails(details: unknown): string {
  return JSON.stringify(redactDetails(details ?? {}));
}

export async function recordAuditLog(entry: AuditLogEntry) {
  await prisma.auditLog.create({
    data: {
      userId: entry.userId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      details: stringifyDetails(entry.details),
    },
  });
}

export async function recordAuditLogs(entries: AuditLogEntry[]) {
  if (entries.length === 0) return;

  await prisma.auditLog.createMany({
    data: entries.map((entry) => ({
      userId: entry.userId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      details: stringifyDetails(entry.details),
    })),
  });
}
