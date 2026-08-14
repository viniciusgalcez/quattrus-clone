import { describe, it, expect } from "vitest";
import { decideMeasurementWrite, decideGoalApproval } from "./measurement";

const base = {
  goal: 100,
  actual: 100 as number | null,
  direction: "MORE" as "MORE" | "LESS" | "EQUAL",
  yellowRange: 10,
  redRange: 20,
  hasExistingActionPlan: false,
};

const decide = (o: Partial<typeof base> = {}) => decideMeasurementWrite({ ...base, ...o });

describe("decideMeasurementWrite", () => {
  it("opens an action plan for every off-target tier", () => {
    expect(decide({ actual: 95 })).toEqual({ trafficLight: "AMARELO", shouldOpenActionPlan: true });
    expect(decide({ actual: 85 })).toEqual({ trafficLight: "VERMELHO", shouldOpenActionPlan: true });
    expect(decide({ actual: 70 })).toEqual({ trafficLight: "CRITICO", shouldOpenActionPlan: true });
  });

  it("does not open a plan when the KPI is on target", () => {
    expect(decide({ actual: 110 })).toEqual({ trafficLight: "VERDE", shouldOpenActionPlan: false });
    expect(decide({ actual: 100 })).toEqual({ trafficLight: "VERDE", shouldOpenActionPlan: false });
  });

  it("does not open a plan when there is no measurement yet", () => {
    expect(decide({ actual: null })).toEqual({
      trafficLight: "SEM_DADO",
      shouldOpenActionPlan: false,
    });
  });

  it("never opens a second plan when one already exists", () => {
    expect(decide({ actual: 70, hasExistingActionPlan: true })).toEqual({
      trafficLight: "CRITICO",
      shouldOpenActionPlan: false,
    });
  });

  it("reports the tier without asking to close an existing plan when it recovers", () => {
    // A goal revision that erased an open FCA would be a laundering mechanism,
    // so recovery never returns a "close it" signal — only the new tier.
    const result = decide({ actual: 120, hasExistingActionPlan: true });
    expect(result.trafficLight).toBe("VERDE");
    expect(result.shouldOpenActionPlan).toBe(false);
  });

  it("uses the KPI's direction", () => {
    expect(decide({ direction: "LESS", actual: 90 }).trafficLight).toBe("VERDE");
    expect(decide({ direction: "LESS", actual: 130 }).trafficLight).toBe("CRITICO");
  });

  it("uses the KPI's own thresholds rather than fixed bands", () => {
    expect(decide({ actual: 85, yellowRange: 20, redRange: 30 }).trafficLight).toBe("AMARELO");
    expect(decide({ actual: 85, yellowRange: 2, redRange: 5 }).trafficLight).toBe("CRITICO");
  });
});

describe("decideGoalApproval", () => {
  it("marks a collaborator's changed goal as pending", () => {
    expect(
      decideGoalApproval({ actorRole: "COLABORADOR", goalChanged: true, previousStatus: "APROVADA" })
    ).toBe("PENDENTE");
  });

  it("auto-approves a goal changed by a manager", () => {
    expect(
      decideGoalApproval({ actorRole: "GESTOR", goalChanged: true, previousStatus: "PENDENTE" })
    ).toBe("APROVADA");
  });

  it("auto-approves a goal changed by an admin", () => {
    expect(
      decideGoalApproval({ actorRole: "ADMIN", goalChanged: true, previousStatus: "PENDENTE" })
    ).toBe("APROVADA");
  });

  it("leaves the status untouched when the goal did not change", () => {
    expect(
      decideGoalApproval({ actorRole: "COLABORADOR", goalChanged: false, previousStatus: "APROVADA" })
    ).toBe("APROVADA");
    expect(
      decideGoalApproval({ actorRole: "COLABORADOR", goalChanged: false, previousStatus: "PENDENTE" })
    ).toBe("PENDENTE");
  });

  it("re-pends an already-approved goal when a collaborator changes its value", () => {
    expect(
      decideGoalApproval({ actorRole: "COLABORADOR", goalChanged: true, previousStatus: "APROVADA" })
    ).toBe("PENDENTE");
  });
});
