import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createTask,
  createEvent,
  createFacilitation,
  markAllNotificationsRead,
  markNotificationRead,
  removeFacilitation,
  saveUserPreferences,
  upsertAnnualMeasurement,
  upsertMeasurement,
} from "./actions";
import { prisma } from "@/lib/prisma";
import { requireUser, assertKpiEditable, assertFcaResolved, assertActionPlanEditable } from "@/lib/authz";
import { getKpiStatus } from "@/lib/kpi";
import { recordAuditLog } from "@/lib/audit";
import { assertPeriodWritable } from "@/lib/period-locks";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    measurement: { upsert: vi.fn(), findUnique: vi.fn() },
    kpiThresholdValidity: { findFirst: vi.fn() },
    actionPlan: { upsert: vi.fn() },
    facilitation: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    userPreference: { upsert: vi.fn() },
    user: { count: vi.fn(), findFirst: vi.fn() },
    calendarEvent: { create: vi.fn() },
    task: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    notification: { updateMany: vi.fn() },
  },
}));

vi.mock("@/lib/notifications", () => ({
  getGoalApproverIds: vi.fn(async () => ["manager-1"]),
  notifyUsers: vi.fn(),
  notifyUser: vi.fn(),
}));

vi.mock("@/lib/kpi-cascading", () => ({
  recalculateParentMeasurement: vi.fn(),
  recalculateDependentMeasurements: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  recordAuditLog: vi.fn(),
}));

vi.mock("@/lib/period-locks", () => ({
  assertPeriodWritable: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({
  requireUser: vi.fn(),
  assertKpiEditable: vi.fn(),
  assertFcaResolved: vi.fn(),
  assertActionPlanEditable: vi.fn(),
  ForbiddenError: class ForbiddenError extends Error {},
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/kpi", () => ({
  currentPeriod: vi.fn(() => "2026-08"),
  getKpiStatus: vi.fn(),
}));

const requireUserMock = vi.mocked(requireUser);
const assertKpiEditableMock = vi.mocked(assertKpiEditable);
const assertFcaResolvedMock = vi.mocked(assertFcaResolved);
const assertActionPlanEditableMock = vi.mocked(assertActionPlanEditable);
const getKpiStatusMock = vi.mocked(getKpiStatus);
const recordAuditLogMock = vi.mocked(recordAuditLog);
const assertPeriodWritableMock = vi.mocked(assertPeriodWritable);
import { recalculateDependentMeasurements, recalculateParentMeasurement } from "@/lib/kpi-cascading";

const measurementUpsert = vi.mocked(prisma.measurement.upsert);
const measurementFindUnique = vi.mocked(prisma.measurement.findUnique);
const thresholdFindFirst = vi.mocked(prisma.kpiThresholdValidity.findFirst);
const actionPlanUpsert = vi.mocked(prisma.actionPlan.upsert);
const facilitationCreate = vi.mocked(prisma.facilitation.create);
const facilitationFindUnique = vi.mocked(prisma.facilitation.findUnique);
const facilitationDelete = vi.mocked(prisma.facilitation.delete);
const userPreferenceUpsert = vi.mocked(prisma.userPreference.upsert);
const userCount = vi.mocked(prisma.user.count);
const userFindFirst = vi.mocked(prisma.user.findFirst);
const calendarEventCreate = vi.mocked(prisma.calendarEvent.create);
const taskCreate = vi.mocked(prisma.task.create);
const notificationUpdateMany = vi.mocked(prisma.notification.updateMany);
const recalculateParentMock = vi.mocked(recalculateParentMeasurement);
const recalculateDependentsMock = vi.mocked(recalculateDependentMeasurements);

/** Prisma/NextAuth return wide types; tests only supply the fields under test. */
const stub = <T,>(value: T) => value as never;

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

describe("upsertMeasurement", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireUserMock.mockResolvedValue(stub({ id: "user-1", role: "COLABORADOR" }));
    assertKpiEditableMock.mockResolvedValue(
      stub({ direction: "MORE", yellowRange: 10, redRange: 20 })
    );
    assertFcaResolvedMock.mockResolvedValue(undefined);
    assertPeriodWritableMock.mockResolvedValue(undefined);
    measurementFindUnique.mockResolvedValue(null);
    measurementUpsert.mockResolvedValue(stub({ id: "meas-1" }));
    recalculateDependentsMock.mockResolvedValue(undefined);
  });

  describe("FCA lock", () => {
    it("checks the lock for the current period before writing", async () => {
      getKpiStatusMock.mockReturnValue("VERDE");
      await upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "100" }));
      expect(assertFcaResolvedMock).toHaveBeenCalledWith("kpi-1", "2026-08");
    });

    it("checks the current cycle lock before writing", async () => {
      getKpiStatusMock.mockReturnValue("VERDE");
      await upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "100" }));
      expect(assertPeriodWritableMock).toHaveBeenCalledWith("2026-08", undefined);
    });

    it("blocks the write when the cycle is closed", async () => {
      assertPeriodWritableMock.mockRejectedValue(new Error("Ciclo fechado."));

      await expect(
        upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "100" }))
      ).rejects.toThrow("Ciclo fechado.");

      expect(measurementUpsert).not.toHaveBeenCalled();
    });

    it("blocks the write when a pending FCA exists on an earlier period", async () => {
      assertFcaResolvedMock.mockRejectedValue(new Error("Existe um FCA pendente em Jun/26."));

      await expect(
        upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "100" }))
      ).rejects.toThrow("Existe um FCA pendente em Jun/26.");

      expect(measurementUpsert).not.toHaveBeenCalled();
    });
  });

  describe("goal approval", () => {
    it("marks a new goal set by a collaborator as pending", async () => {
      getKpiStatusMock.mockReturnValue("VERDE");
      await upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "100" }));
      expect(measurementUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ goalApprovalStatus: "PENDENTE", goalApprovedById: null }),
        })
      );
    });

    it("auto-approves a goal set by a manager", async () => {
      requireUserMock.mockResolvedValue(stub({ id: "boss-1", role: "GESTOR" }));
      getKpiStatusMock.mockReturnValue("VERDE");
      await upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "100" }));
      expect(measurementUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ goalApprovalStatus: "APROVADA", goalApprovedById: "boss-1" }),
        })
      );
    });

    it("keeps an approved goal approved when only actual changes", async () => {
      measurementFindUnique.mockResolvedValue(stub({ goal: 100, goalApprovalStatus: "APROVADA" }));
      getKpiStatusMock.mockReturnValue("VERDE");
      await upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "105" }));
      expect(measurementUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ goalApprovalStatus: "APROVADA" }),
        })
      );
    });

    it("re-pends an approved goal when a collaborator changes its value", async () => {
      measurementFindUnique.mockResolvedValue(stub({ goal: 90, goalApprovalStatus: "APROVADA" }));
      getKpiStatusMock.mockReturnValue("VERDE");
      await upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "100" }));
      expect(measurementUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ goalApprovalStatus: "PENDENTE", goalApprovedById: null }),
        })
      );
    });
  });

  describe("automatic FCA", () => {
    it.each(["AMARELO", "VERMELHO", "CRITICO"] as const)(
      "opens an action plan when the status is %s",
      async (status) => {
        getKpiStatusMock.mockReturnValue(status);

        await upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "50" }));

        expect(actionPlanUpsert).toHaveBeenCalledWith({
          where: { measurementId: "meas-1" },
          update: {},
          create: expect.objectContaining({
            kpiId: "kpi-1",
            measurementId: "meas-1",
            status: "ABERTO",
          }),
        });
      }
    );

    it("does not open an action plan when the status is VERDE", async () => {
      getKpiStatusMock.mockReturnValue("VERDE");
      await upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "120" }));
      expect(actionPlanUpsert).not.toHaveBeenCalled();
    });

    it("does not open an action plan when there is no measurement (SEM_DADO)", async () => {
      getKpiStatusMock.mockReturnValue("SEM_DADO");
      await upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "" }));
      expect(actionPlanUpsert).not.toHaveBeenCalled();
    });
  });

  it("recalculates formula consumers after saving a source measurement", async () => {
    getKpiStatusMock.mockReturnValue("VERDE");
    await upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "100" }));
    expect(recalculateDependentsMock).toHaveBeenCalledWith("kpi-1", "2026-08");
  });

  describe("status calculation and persistence", () => {
    it("derives the status from the KPI's own direction and thresholds", async () => {
      assertKpiEditableMock.mockResolvedValue(
        stub({ direction: "LESS", yellowRange: 5, redRange: 15 })
      );
      getKpiStatusMock.mockReturnValue("VERDE");

      await upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "120" }));

      expect(getKpiStatusMock).toHaveBeenCalledWith(100, 120, "LESS", 5, 15);
    });

    it("persists the computed status and the reporter on both upsert branches", async () => {
      getKpiStatusMock.mockReturnValue("CRITICO");

      await upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "10" }));

      expect(measurementUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { kpiId_period: { kpiId: "kpi-1", period: "2026-08" } },
          update: expect.objectContaining({ trafficLight: "CRITICO", reportedById: "user-1" }),
          create: expect.objectContaining({ trafficLight: "CRITICO", reportedById: "user-1" }),
        })
      );
    });

    it("records an audit trail for the saved measurement", async () => {
      measurementFindUnique.mockResolvedValue(
        stub({ goal: 90, actual: 80, trafficLight: "AMARELO", goalApprovalStatus: "APROVADA" })
      );
      getKpiStatusMock.mockReturnValue("VERDE");

      await upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "105" }));

      expect(recordAuditLogMock).toHaveBeenCalledWith({
        userId: "user-1",
        action: "UPSERT",
        entity: "Measurement",
        entityId: "meas-1",
        details: {
          kpiId: "kpi-1",
          period: "2026-08",
          before: { goal: 90, actual: 80, trafficLight: "AMARELO", goalApprovalStatus: "APROVADA" },
          after: { goal: 100, actual: 105, trafficLight: "VERDE", goalApprovalStatus: "PENDENTE" },
        },
      });
    });

    it("treats an empty actual as null rather than zero", async () => {
      getKpiStatusMock.mockReturnValue("SEM_DADO");
      await upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "" }));
      expect(getKpiStatusMock).toHaveBeenCalledWith(100, null, "MORE", 10, 20);
    });
  });

  describe("guards", () => {
    it("ignores a client-supplied period and always writes the current month", async () => {
      getKpiStatusMock.mockReturnValue("VERDE");

      await upsertMeasurement(
        form({ kpiId: "kpi-1", goal: "100", actual: "90", period: "2020-01" })
      );

      expect(measurementUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { kpiId_period: { kpiId: "kpi-1", period: "2026-08" } },
        })
      );
    });

    it("rejects before touching the database when the caller cannot edit the KPI", async () => {
      assertKpiEditableMock.mockRejectedValue(new Error("forbidden"));

      await expect(
        upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "90" }))
      ).rejects.toThrow();

      expect(measurementUpsert).not.toHaveBeenCalled();
    });

  describe("cascading", () => {
    it("triggers recalculation when kpi has a parentId", async () => {
      assertKpiEditableMock.mockResolvedValue(
        stub({ direction: "MORE", yellowRange: 10, redRange: 20, parentId: "parent-1" })
      );
      getKpiStatusMock.mockReturnValue("VERDE");
      
      await upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "100" }));
      
      expect(recalculateParentMock).toHaveBeenCalledWith("parent-1", "2026-08");
    });
  });

    it("rejects a non-numeric goal", async () => {
      await expect(
        upsertMeasurement(form({ kpiId: "kpi-1", goal: "abc", actual: "90" }))
      ).rejects.toThrow();

      expect(measurementUpsert).not.toHaveBeenCalled();
    });
  });
});

describe("upsertAnnualMeasurement", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireUserMock.mockResolvedValue(stub({ id: "user-1", role: "COLABORADOR", username: "camila.azzi" }));
    assertKpiEditableMock.mockResolvedValue(stub({ ownerId: "user-1", departmentId: "dept-1", parentId: null, direction: "MORE", yellowRange: 10, redRange: 20 }));
    assertFcaResolvedMock.mockResolvedValue(undefined);
    assertPeriodWritableMock.mockResolvedValue(undefined);
    thresholdFindFirst.mockResolvedValue(null);
    measurementFindUnique.mockResolvedValue(null);
    measurementUpsert.mockResolvedValue(stub({ id: "meas-annual-1" }));
    recalculateDependentsMock.mockResolvedValue(undefined);
    getKpiStatusMock.mockReturnValue("VERDE");
  });

  it("blocks a direct annual write to a future month", async () => {
    await expect(upsertAnnualMeasurement(form({ kpiId: "kpi-1", period: "2026-09", goal: "100", actual: "90", forecast: "95", measured: "on", justification: "", benchmark: "", benchmarkValue: "" }))).rejects.toThrow("período futuro");
    expect(measurementUpsert).not.toHaveBeenCalled();
  });

  it("honors period locks and stores the complete annual state", async () => {
    await upsertAnnualMeasurement(form({ kpiId: "kpi-1", period: "2026-08", goal: "100", actual: "90", forecast: "95", measured: "on", justification: "Acompanhamento", benchmark: "Referência", benchmarkValue: "92" }));
    expect(assertPeriodWritableMock).toHaveBeenCalledWith("2026-08", "dept-1");
    expect(measurementUpsert).toHaveBeenCalledWith(expect.objectContaining({ update: expect.objectContaining({ measured: true, forecast: 95, justification: "Acompanhamento", benchmark: "Referência", benchmarkValue: 92 }) }));
  });
});

describe("facilitation management", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("does not let a non-admin grant themselves blanket edit rights", async () => {
    requireUserMock.mockResolvedValue(stub({ id: "user-1", role: "COLABORADOR" }));

    const result = await createFacilitation(
      "user-1",
      null,
      form({ facilitatedId: "victim-user" })
    );

    expect(result?.error).toMatch(/administradores/i);
    expect(facilitationCreate).not.toHaveBeenCalled();
  });

  it("allows admins to create a facilitation link", async () => {
    requireUserMock.mockResolvedValue(stub({ id: "admin-1", role: "ADMIN" }));
    facilitationCreate.mockResolvedValue(stub({ id: "facil-1" }));

    const result = await createFacilitation(
      "facilitator-1",
      null,
      form({ facilitatedId: "facilitated-1" })
    );

    expect(result).toEqual({});
    expect(facilitationCreate).toHaveBeenCalledWith({
      data: { facilitatorId: "facilitator-1", facilitatedId: "facilitated-1" },
    });
    expect(recordAuditLogMock).toHaveBeenCalledWith({
      userId: "admin-1",
      action: "CREATE",
      entity: "Facilitation",
      entityId: "facil-1",
      details: { facilitatorId: "facilitator-1", facilitatedId: "facilitated-1" },
    });
  });

  it("does not let a non-admin remove a facilitation link", async () => {
    requireUserMock.mockResolvedValue(stub({ id: "facilitator-1", role: "COLABORADOR" }));

    await expect(removeFacilitation("facil-1")).rejects.toThrow(/administradores/i);

    expect(facilitationFindUnique).not.toHaveBeenCalled();
    expect(facilitationDelete).not.toHaveBeenCalled();
  });
});

describe("saveUserPreferences", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireUserMock.mockResolvedValue(stub({ id: "user-1", role: "COLABORADOR" }));
  });

  it("persists every preference submitted by the signed-in user", async () => {
    await saveUserPreferences(
      form({
        density: "compact",
        theme: "dark",
        startPage: "/agenda",
        emailNotifications: "on",
        dashboardMonths: "6",
        blankMonths: "3",
        basePeriod: "2026-09",
        showDelegated: "on",
        showTeamReds: "on",
      })
    );

    expect(userPreferenceUpsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: {
        userId: "user-1",
        density: "compact",
        theme: "dark",
        startPage: "/agenda",
        emailNotifications: true,
        dashboardMonths: 6,
        blankMonths: 3,
        basePeriod: "2026-09",
        showDelegated: true,
        showTeamReds: true,
      },
      update: {
        density: "compact",
        theme: "dark",
        startPage: "/agenda",
        emailNotifications: true,
        dashboardMonths: 6,
        blankMonths: 3,
        basePeriod: "2026-09",
        showDelegated: true,
        showTeamReds: true,
      },
    });
  });

  it("uses safe defaults for invalid values and an unchecked notification option", async () => {
    await saveUserPreferences(form({ density: "invalid", theme: "invalid", startPage: "/admin" }));

    expect(userPreferenceUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          density: "comfortable",
          theme: "dark",
          startPage: "/",
          emailNotifications: false,
          dashboardMonths: 12,
          blankMonths: 0,
          basePeriod: null,
          showDelegated: false,
          showTeamReds: false,
        }),
      })
    );
  });
});

describe("createEvent", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireUserMock.mockResolvedValue(stub({ id: "user-1", role: "COLABORADOR" }));
    userCount.mockResolvedValue(2);
    calendarEventCreate.mockResolvedValue(stub({ id: "event-1" }));
  });

  it("creates agenda events with participants and audit trail", async () => {
    const fd = form({
      title: "Reunião de resultado",
      category: "REUNIAO_RESULTADO",
      startAt: "2026-09-08T09:00",
      endAt: "2026-09-08T10:00",
    });
    fd.append("participantIds", "user-2");
    fd.append("participantIds", "user-3");

    await createEvent(null, fd);

    expect(calendarEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Reunião de resultado",
        category: "REUNIAO_RESULTADO",
        createdById: "user-1",
        participants: { create: [{ userId: "user-2" }, { userId: "user-3" }] },
      }),
    });
    expect(recordAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        action: "CREATE",
        entity: "CalendarEvent",
        entityId: "event-1",
        details: expect.objectContaining({ participantCount: 2 }),
      })
    );
  });

  it("rejects unavailable participants before creating the event", async () => {
    userCount.mockResolvedValue(1);
    const fd = form({
      title: "Reunião de resultado",
      category: "REUNIAO_RESULTADO",
      startAt: "2026-09-08T09:00",
      endAt: "2026-09-08T10:00",
    });
    fd.append("participantIds", "user-2");
    fd.append("participantIds", "user-3");

    const result = await createEvent(null, fd);

    expect(result).toEqual({ error: "Um dos participantes não está disponível." });
    expect(calendarEventCreate).not.toHaveBeenCalled();
  });
});

describe("createTask", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireUserMock.mockResolvedValue(stub({ id: "user-1", role: "COLABORADOR" }));
    assertActionPlanEditableMock.mockResolvedValue(stub({ id: "plan-1" }));
    userFindFirst.mockResolvedValue(stub({ id: "user-2" }));
    taskCreate.mockResolvedValue(stub({ id: "task-1" }));
  });

  it("validates linked action plan and active assignee before creating a task", async () => {
    await createTask(
      null,
      form({
        what: "Concluir ação corretiva",
        why: "FCA aberto",
        howWhere: "Na tecelagem",
        actionPlanId: "plan-1",
        assigneeId: "user-2",
        startDate: "2026-09-08",
        dueDate: "2026-09-12",
        value: "120",
      })
    );

    expect(assertActionPlanEditableMock).toHaveBeenCalledWith("plan-1", { id: "user-1", role: "COLABORADOR" });
    expect(userFindFirst).toHaveBeenCalledWith({
      where: { id: "user-2", active: true },
      select: { id: true },
    });
    expect(taskCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        what: "Concluir ação corretiva",
        actionPlanId: "plan-1",
        assigneeId: "user-2",
        createdById: "user-1",
      }),
    });
    expect(recordAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CREATE",
        entity: "Task",
        entityId: "task-1",
      })
    );
  });

  it("rejects an unavailable assignee before writing", async () => {
    userFindFirst.mockResolvedValue(null);

    const result = await createTask(
      null,
      form({
        what: "Concluir ação corretiva",
        assigneeId: "missing-user",
        startDate: "",
        dueDate: "",
        value: "",
      })
    );

    expect(result).toEqual({ error: "Responsável indisponível." });
    expect(taskCreate).not.toHaveBeenCalled();
  });
});

describe("notification actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireUserMock.mockResolvedValue(stub({ id: "user-1", role: "COLABORADOR" }));
  });

  it("marks only the signed-in user's notification as read", async () => {
    notificationUpdateMany.mockResolvedValue(stub({ count: 1 }));

    await markNotificationRead("notification-1");

    expect(notificationUpdateMany).toHaveBeenCalledWith({
      where: { id: "notification-1", recipientId: "user-1", readAt: null },
      data: { readAt: expect.any(Date) },
    });
    expect(recordAuditLogMock).toHaveBeenCalledWith({
      userId: "user-1",
      action: "UPDATE",
      entity: "Notification",
      entityId: "notification-1",
      details: { read: true },
    });
  });

  it("does not audit when a direct notification id does not belong to the user", async () => {
    notificationUpdateMany.mockResolvedValue(stub({ count: 0 }));

    await markNotificationRead("notification-other-user");

    expect(recordAuditLogMock).not.toHaveBeenCalled();
  });

  it("marks all unread notifications only for the signed-in user", async () => {
    notificationUpdateMany.mockResolvedValue(stub({ count: 3 }));

    await markAllNotificationsRead();

    expect(notificationUpdateMany).toHaveBeenCalledWith({
      where: { recipientId: "user-1", readAt: null },
      data: { readAt: expect.any(Date) },
    });
    expect(recordAuditLogMock).toHaveBeenCalledWith({
      userId: "user-1",
      action: "UPDATE",
      entity: "Notification",
      entityId: "user-1",
      details: { readAll: true, count: 3 },
    });
  });
});
