"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, assertKpiEditable } from "@/lib/authz";
import { currentPeriod } from "@/lib/kpi";
import { fieldErrorsFrom, type FormActionState } from "@/lib/schemas";
import { z } from "zod";

const duplicateKpiSchema = z.object({
  kpiId: z.string().trim().min(1),
  targetUsername: z.string().trim().optional().default(""),
  copyMeasurements: z.string().optional(),
});

/**
 * Replicates an item's definition (and optionally its measurement history)
 * onto a new Kpi row — the "em vez de criar um item do zero, eu posso
 * replicar" shortcut described for the real Quattrus. Only an admin may
 * retarget the copy at a different owner; everyone else duplicates onto
 * themselves.
 */
export async function duplicateKpi(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const user = await requireUser();

  const parsed = duplicateKpiSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Confira os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const { kpiId, targetUsername, copyMeasurements } = parsed.data;

  const source = await assertKpiEditable(kpiId, user);

  let ownerId = user.id;
  if (targetUsername && targetUsername !== user.username) {
    if (user.role !== "ADMIN") {
      return { error: "Apenas administradores podem duplicar um item para outro usuário." };
    }
    const target = await prisma.user.findUnique({ where: { username: targetUsername }, select: { id: true } });
    if (!target) {
      return {
        error: "Usuário não encontrado.",
        fieldErrors: { targetUsername: "Verifique o nome de usuário." },
      };
    }
    ownerId = target.id;
  }

  const copy = await prisma.kpi.create({
    data: {
      name: `${source.name} (cópia)`,
      description: source.description,
      ownerId,
      departmentId: source.departmentId,
      parentId: source.parentId,
      metricUnit: source.metricUnit,
      direction: source.direction,
      calculationType: source.calculationType,
      weight: source.weight,
      yellowRange: source.yellowRange,
      redRange: source.redRange,
      priority: source.priority,
    },
  });

  if (copyMeasurements) {
    const measurements = await prisma.measurement.findMany({ where: { kpiId } });
    if (measurements.length > 0) {
      await prisma.measurement.createMany({
        data: measurements.map((m) => ({
          kpiId: copy.id,
          period: m.period,
          goal: m.goal,
          actual: m.actual,
          trafficLight: m.trafficLight,
          justification: m.justification,
          reportedById: m.reportedById,
        })),
      });
    }
  } else {
    // A bare definition copy still needs a starting point for the current
    // month, same as creating a brand-new item does.
    await prisma.measurement.create({
      data: { kpiId: copy.id, period: currentPeriod(), goal: 0, actual: null },
    });
  }

  revalidatePath("/metas");
  revalidatePath("/");
  redirect(`/metas/${copy.id}`);
}
