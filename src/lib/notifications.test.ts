import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: { create: vi.fn(), createMany: vi.fn() },
    userPreference: { findUnique: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  groupNotificationsForDisplay,
  notificationGroup,
  notifyUser,
  notifyUsers,
} from "./notifications";

const notificationCreate = vi.mocked(prisma.notification.create);
const notificationCreateMany = vi.mocked(prisma.notification.createMany);
const preferenceFindUnique = vi.mocked(prisma.userPreference.findUnique);
const preferenceFindMany = vi.mocked(prisma.userPreference.findMany);

describe("notification preferences", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("does not create a notification for a user who opted out", async () => {
    preferenceFindUnique.mockResolvedValue({ emailNotifications: false } as never);

    await notifyUser({ recipientId: "user-1", type: "APPROVAL", title: "Meta pendente", body: "Revise a meta." });

    expect(notificationCreate).not.toHaveBeenCalled();
  });

  it("sends bulk notifications only to recipients who have not opted out", async () => {
    preferenceFindMany.mockResolvedValue([{ userId: "user-2" }] as never);

    await notifyUsers(["user-1", "user-2", "user-1"], {
      type: "APPROVAL",
      title: "Meta pendente",
      body: "Revise a meta.",
    });

    expect(notificationCreateMany).toHaveBeenCalledWith({
      data: [{ recipientId: "user-1", type: "APPROVAL", title: "Meta pendente", body: "Revise a meta." }],
    });
  });
});

describe("notification display groups", () => {
  it("classifies approvals as pending work", () => {
    expect(notificationGroup({ type: "GOAL_PENDING" })).toBe("PENDENCIAS");
    expect(notificationGroup({ type: "FORECAST_PENDING" })).toBe("PENDENCIAS");
  });

  it("classifies informational messages as updates", () => {
    expect(notificationGroup({ type: "INFO" })).toBe("ATUALIZACOES");
  });

  it("keeps grouped notifications in their original order", () => {
    const items = [
      { id: "1", type: "INFO" },
      { id: "2", type: "GOAL_PENDING" },
      { id: "3", type: "FORECAST_PENDING" },
      { id: "4", type: "COMMENT" },
    ];

    expect(groupNotificationsForDisplay(items)).toEqual({
      PENDENCIAS: [items[1], items[2]],
      ATUALIZACOES: [items[0], items[3]],
    });
  });
});
