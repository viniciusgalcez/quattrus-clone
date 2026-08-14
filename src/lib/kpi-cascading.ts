import { prisma } from "@/lib/prisma";
import { getKpiStatus } from "@/lib/kpi";

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
    },
  });

  if (!parent || parent.calculationType === "MANUAL") {
    return;
  }

  const children = parent.children;
  let newGoal: number | null = null;
  let newActual: number | null = null;

  let totalWeight = 0;
  let validActuals = 0;

  if (parent.calculationType === "SUM") {
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
    const trafficLight = getKpiStatus(
      newGoal,
      newActual,
      parent.direction,
      parent.yellowRange,
      parent.redRange
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
