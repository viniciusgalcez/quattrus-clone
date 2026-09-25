import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMultiChartTab } from "@/lib/multigraficos-actions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { recordAuditLog } from "@/lib/audit";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    multiChartTab: { count: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/authz", () => ({
  requireUser: vi.fn(),
  ForbiddenError: class ForbiddenError extends Error {},
}));

vi.mock("@/lib/audit", () => ({ recordAuditLog: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
}));

const requireUserMock = vi.mocked(requireUser);
const tabCount = vi.mocked(prisma.multiChartTab.count);
const tabCreate = vi.mocked(prisma.multiChartTab.create);
const recordAuditLogMock = vi.mocked(recordAuditLog);

const stub = <T,>(value: T) => value as never;

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.append(key, value);
  return fd;
}

describe("multigraficos actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireUserMock.mockResolvedValue(stub({ id: "user-1", role: "COLABORADOR" }));
    tabCount.mockResolvedValue(2);
    tabCreate.mockResolvedValue(stub({ id: "tab-1", name: "Qualidade" }));
  });

  it("uses the dashboard module guard before creating a personal chart tab", async () => {
    await expect(createMultiChartTab(form({ name: "Qualidade" }))).rejects.toThrow(
      "redirect:/multigraficos?tab=tab-1"
    );

    expect(requireUserMock).toHaveBeenCalledWith("dashboard");
    expect(tabCreate).toHaveBeenCalledWith({
      data: { userId: "user-1", name: "Qualidade", sortOrder: 2 },
    });
    expect(recordAuditLogMock).toHaveBeenCalledWith({
      userId: "user-1",
      action: "CREATE",
      entity: "MultiChartTab",
      entityId: "tab-1",
      details: { name: "Qualidade" },
    });
  });
});
