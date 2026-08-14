import type { Direction, GoalApprovalStatus } from "@prisma/client";
import { getKpiStatus, type KpiStatus } from "@/lib/kpi";

/**
 * The pure half of writing a measurement: given the numbers and the KPI's
 * thresholds, decide the traffic light and whether an action plan (FCA) has to
 * be opened. Extracted from `upsertMeasurement` so every write path — manual
 * entry, farol cell, spreadsheet import, goal approval — makes the same call,
 * and so the rules are unit-testable without a database.
 */
export function decideMeasurementWrite(args: {
  goal: number;
  actual: number | null;
  direction: Direction;
  yellowRange: number;
  redRange: number;
  hasExistingActionPlan: boolean;
}): { trafficLight: KpiStatus; shouldOpenActionPlan: boolean } {
  const { goal, actual, direction, yellowRange, redRange, hasExistingActionPlan } = args;

  const trafficLight = getKpiStatus(goal, actual, direction, yellowRange, redRange);

  // Every off-target tier opens a plan, CRITICO included — leaving the worst
  // tier out meant a mildly-off KPI got an FCA while a catastrophic one did not.
  const offTarget =
    trafficLight === "AMARELO" || trafficLight === "VERMELHO" || trafficLight === "CRITICO";

  return {
    trafficLight,
    shouldOpenActionPlan: offTarget && !hasExistingActionPlan,
  };
}

/**
 * A goal set by a COLABORADOR is only official once a manager or admin signs
 * off on it — the "aprovação de meta" flow described for the real Quattrus.
 * A GESTOR or ADMIN setting the goal (their own or a report's) is trusted
 * outright. Touching only `actual` never re-triggers approval: only a goal
 * that actually changed value can move an already-approved goal back to
 * PENDENTE, so filling in the month's result doesn't silently unapprove it.
 */
export function decideGoalApproval(args: {
  actorRole: "ADMIN" | "GESTOR" | "COLABORADOR";
  goalChanged: boolean;
  previousStatus: GoalApprovalStatus;
}): GoalApprovalStatus {
  if (!args.goalChanged) return args.previousStatus;
  return args.actorRole === "COLABORADOR" ? "PENDENTE" : "APROVADA";
}
