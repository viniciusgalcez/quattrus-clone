import type { Direction } from "@prisma/client";
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
