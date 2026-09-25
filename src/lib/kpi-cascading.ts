import { prisma } from "@/lib/prisma";
import { getKpiStatus, thresholdsForPeriod } from "@/lib/kpi";
import { calculateFormula, roundFormulaValue, type FormulaKind } from "@/lib/kpi-formula";

export async function recalculateParentMeasurement(parentId: string, period: string) {
  const parent = await prisma.kpi.findUnique({
    where: { id: parentId },
    include: {
      children: {
        include: {
          measurements: { where: { period } },
        },
      },
      measurements: { where: { period } },
      formula: {
        include: {
          numeratorKpi: { include: { measurements: { where: { period } } } },
          denominatorKpi: { include: { measurements: true } },
        },
      },
      thresholdValidities: { select: { startPeriod: true, endPeriod: true, yellowRange: true, redRange: true } },
    },
  });

  if (!parent || (parent.calculationType === "MANUAL" && !parent.formula)) {
    return;
  }

  const children = parent.children;
  let newGoal: number | null = null;
  let newActual: number | null = null;

  if (parent.formula) {
    const formulaKind = parent.formula.kind as FormulaKind;
    const numeratorMeasurement = parent.formula.numeratorKpi?.measurements[0];
    const denominatorMeasurements = parent.formula.denominatorKpi?.measurements ?? [];
    const denominatorMeasurement = denominatorMeasurements.find((measurement) => measurement.period === period);
    const average = (values: Array<number | null | undefined>) => {
      const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      return valid.length ? valid.reduce((total, value) => total + value, 0) / valid.length : null;
    };
    const denominatorActual = parent.formula.denominatorAverage
      ? average(denominatorMeasurements.map((measurement) => measurement.actual))
      : denominatorMeasurement?.actual;
    const denominatorGoal = parent.formula.denominatorAverage
      ? average(denominatorMeasurements.map((measurement) => measurement.goal))
      : denominatorMeasurement?.goal;
    const result = calculateFormula(
      formulaKind,
      children.map((child) => ({ value: child.measurements[0]?.actual, weight: child.weight })),
      {
        numerator: numeratorMeasurement?.actual,
        denominator: denominatorActual,
      }
    );
    const goalResult = calculateFormula(
      formulaKind,
      children.map((child) => ({ value: child.measurements[0]?.goal, weight: child.weight })),
      {
        numerator: numeratorMeasurement?.goal,
        denominator: denominatorGoal,
      }
    );
    newGoal = roundFormulaValue(goalResult.value, parent.decimalPlaces);
    newActual = roundFormulaValue(result.value, parent.decimalPlaces);
  }

  let totalWeight = 0;
  let validActuals = 0;

  if (parent.formula) {
    // The explicit formula is authoritative; the legacy calculationType is
    // retained for old indicators that have not been configured yet.
  } else if (parent.calculationType === "SUM") {
    newGoal = 0;
    newActual = 0;
    for (const child of children) {
      const m = child.measurements[0];
      if (m?.goal != null) newGoal += m.goal;
      if (m?.actual != null) {
        newActual += m.actual;
        validActuals++;
      }
    }
    if (validActuals === 0) newActual = null;
  } else if (parent.calculationType === "AVERAGE") {
    let sumGoal = 0;
    let sumActual = 0;
    let countGoal = 0;
    for (const child of children) {
      const m = child.measurements[0];
      if (m?.goal != null) {
        sumGoal += m.goal;
        countGoal++;
      }
      if (m?.actual != null) {
        sumActual += m.actual;
        validActuals++;
      }
    }
    newGoal = countGoal > 0 ? sumGoal / countGoal : null;
    newActual = validActuals > 0 ? sumActual / validActuals : null;
  } else if (parent.calculationType === "WEIGHTED") {
    let sumGoalWeighted = 0;
    let sumActualWeighted = 0;
    for (const child of children) {
      totalWeight += child.weight;
      const m = child.measurements[0];
      if (m?.goal != null) sumGoalWeighted += m.goal * child.weight;
      if (m?.actual != null) {
        sumActualWeighted += m.actual * child.weight;
        validActuals++;
      }
    }
    newGoal = totalWeight > 0 ? sumGoalWeighted / totalWeight : null;
    newActual = validActuals > 0 && totalWeight > 0 ? sumActualWeighted / totalWeight : null;
  }

  // Update or create parent measurement
  if (newGoal !== null) {
    const thresholds = thresholdsForPeriod(period, parent, parent.thresholdValidities);
    const trafficLight = getKpiStatus(
      newGoal,
      newActual,
      parent.direction,
      thresholds.yellowRange,
      thresholds.redRange
    );

    await prisma.measurement.upsert({
      where: { kpiId_period: { kpiId: parent.id, period } },
      update: { goal: newGoal, actual: newActual, trafficLight },
      create: {
        kpiId: parent.id,
        period,
        goal: newGoal,
        actual: newActual,
        trafficLight,
      },
    });

    // Recurse upwards
    if (parent.parentId) {
      await recalculateParentMeasurement(parent.parentId, period);
    }
  }
}

/** Rebuilds formulas that directly consume a KPI after a new measurement. */
export async function recalculateDependentMeasurements(sourceKpiId: string, period: string) {
  const [formulaReferences, dependencyReferences] = await Promise.all([
    prisma.kpiFormula.findMany({
      where: { OR: [{ numeratorKpiId: sourceKpiId }, { denominatorKpiId: sourceKpiId }] },
      select: { kpiId: true },
    }),
    prisma.kpiDependency.findMany({ where: { targetKpiId: sourceKpiId }, select: { sourceKpiId: true } }),
  ]);
  const dependentIds = new Set([
    ...formulaReferences.map((reference) => reference.kpiId),
    ...dependencyReferences.map((reference) => reference.sourceKpiId),
  ]);
  for (const dependentId of dependentIds) {
    if (dependentId !== sourceKpiId) await recalculateParentMeasurement(dependentId, period);
  }
}
