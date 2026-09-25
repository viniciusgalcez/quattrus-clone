import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canView } from "@/lib/hierarchy";
import { readFile } from "node:fs/promises";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/hierarchy", () => ({ canView: vi.fn() }));
vi.mock("node:fs/promises", () => ({ readFile: vi.fn() }));
vi.mock("@/lib/upload-storage", () => ({
  attachmentDownloadDisposition: vi.fn((name: string) => `attachment; filename="${name}"`),
  resolveUploadPath: vi.fn((key: string) => `uploads/${key}`),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    attachment: { findUnique: vi.fn() },
  },
}));

const authMock = vi.mocked(auth);
const canViewMock = vi.mocked(canView);
const attachmentFindUnique = vi.mocked(prisma.attachment.findUnique);
const readFileMock = vi.mocked(readFile);

const stub = <T,>(value: T) => value as never;

describe("GET /api/attachments/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authMock.mockResolvedValue(
      stub({ user: { id: "user-1", role: "COLABORADOR", permissions: ["dashboard"] } })
    );
    canViewMock.mockResolvedValue(true);
    attachmentFindUnique.mockResolvedValue(
      stub({
        id: "att-1",
        storageKey: "123e4567-e89b-12d3-a456-426614174000.pdf",
        originalName: "plano.pdf",
        mimeType: "application/pdf",
        kpi: { ownerId: "owner-1" },
        actionPlan: null,
        measurement: null,
      })
    );
  });

  it("requires the matching profile module before reading the file", async () => {
    const response = await GET(new Request("http://localhost/api/attachments/att-1"), {
      params: Promise.resolve({ id: "att-1" }),
    });

    expect(response.status).toBe(403);
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it("serves a visible KPI attachment when the measurements module is allowed", async () => {
    authMock.mockResolvedValue(
      stub({ user: { id: "user-1", role: "COLABORADOR", permissions: ["measurements"] } })
    );
    readFileMock.mockResolvedValue(Buffer.from("pdf"));

    const response = await GET(new Request("http://localhost/api/attachments/att-1"), {
      params: Promise.resolve({ id: "att-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(readFileMock).toHaveBeenCalledWith("uploads/123e4567-e89b-12d3-a456-426614174000.pdf");
  });
});
