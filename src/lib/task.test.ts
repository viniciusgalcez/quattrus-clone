import { describe, expect, it } from "vitest";
import { groupTasksForDisplay, taskDisplayGroup } from "./task";

const now = new Date("2026-09-08T12:00:00");

describe("task display grouping", () => {
  it("prioritizes concluded tasks over overdue dates", () => {
    expect(taskDisplayGroup({ status: "CONCLUIDA", dueDate: new Date("2026-09-01"), actionPlanId: null }, now)).toBe(
      "CONCLUIDAS"
    );
  });

  it("groups open overdue tasks as late", () => {
    expect(taskDisplayGroup({ status: "ABERTA", dueDate: new Date("2026-09-01"), actionPlanId: "plan-1" }, now)).toBe(
      "ATRASADAS"
    );
  });

  it("groups current plan tasks separately from additional tasks", () => {
    expect(taskDisplayGroup({ status: "EM_ANDAMENTO", dueDate: new Date("2026-09-10"), actionPlanId: "plan-1" }, now)).toBe(
      "PLANOS_DE_ACAO"
    );
    expect(taskDisplayGroup({ status: "ABERTA", dueDate: null, actionPlanId: null }, now)).toBe("TAREFAS_ADICIONAIS");
  });

  it("returns all groups with stable keys", () => {
    const grouped = groupTasksForDisplay(
      [
        { status: "ABERTA" as const, dueDate: null, actionPlanId: null, id: "extra" },
        { status: "CONCLUIDA" as const, dueDate: null, actionPlanId: "plan-1", id: "done" },
      ],
      now
    );

    expect(grouped.TAREFAS_ADICIONAIS.map((task) => task.id)).toEqual(["extra"]);
    expect(grouped.CONCLUIDAS.map((task) => task.id)).toEqual(["done"]);
    expect(grouped.ATRASADAS).toEqual([]);
    expect(grouped.PLANOS_DE_ACAO).toEqual([]);
  });
});
