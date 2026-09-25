import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { recordAuditLog, recordAuditLogs } from "@/lib/audit";

vi.mock("@/lib/prisma", () => ({
  prisma: { auditLog: { create: vi.fn(), createMany: vi.fn() } },
}));

describe("audit log safety", () => {
  it("redacts secret-shaped fields recursively before persisting details", async () => {
    await recordAuditLog({
      userId: "admin-1",
      action: "UPDATE",
      entity: "User",
      entityId: "user-1",
      details: { password: "never-store", nested: { token: "also-never-store" }, safe: "kept" },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        details: JSON.stringify({ password: "[REDACTED]", nested: { token: "[REDACTED]" }, safe: "kept" }),
      }),
    });
  });

  it("applies the same redaction to bulk audit records", async () => {
    await recordAuditLogs([
      { action: "EXPORT", entity: "Measurement", entityId: "user-1", details: { authorization: "Bearer secret" } },
    ]);

    expect(prisma.auditLog.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ details: JSON.stringify({ authorization: "[REDACTED]" }) })],
    });
  });
});
