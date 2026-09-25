"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, ForbiddenError } from "@/lib/authz";
import { exportableOwnerIds } from "@/lib/hierarchy";
import { recordAuditLog } from "@/lib/audit";
import { clearMultiChartSlot, setMultiChartSlot } from "@/lib/multigraficos";

function requiredText(formData: FormData, key: string, max = 80): string {
  const value = formData.get(key);
  if (typeof value !== "string") throw new ForbiddenError("Dados inválidos.");
  const text = value.trim();
  if (!text || text.length > max) throw new ForbiddenError("Dados inválidos.");
  return text;
}

function requiredPosition(formData: FormData): number {
  const value = Number(formData.get("position"));
  if (!Number.isInteger(value)) throw new ForbiddenError("Posição inválida.");
  return value;
}

async function assertOwnedTab(tabId: string, userId: string) {
  const tab = await prisma.multiChartTab.findFirst({ where: { id: tabId, userId } });
  if (!tab) throw new ForbiddenError("Aba de multigráficos inválida.");
  return tab;
}

async function assertVisibleKpi(kpiId: string, user: { id: string; role: string }) {
  const ownerIds = await exportableOwnerIds(user);
  const kpi = await prisma.kpi.findFirst({
    where: { id: kpiId, ownerId: { in: ownerIds }, archivedAt: null },
    select: { id: true, name: true },
  });
  if (!kpi) throw new ForbiddenError("Indicador indisponível para o seu perfil.");
  return kpi;
}

export async function createMultiChartTab(formData: FormData) {
  const user = await requireUser("dashboard");
  const name = requiredText(formData, "name", 40);
  const count = await prisma.multiChartTab.count({ where: { userId: user.id } });

  const tab = await prisma.multiChartTab.create({
    data: { userId: user.id, name, sortOrder: count },
  });

  await recordAuditLog({
    userId: user.id,
    action: "CREATE",
    entity: "MultiChartTab",
    entityId: tab.id,
    details: { name },
  });

  revalidatePath("/multigraficos");
  redirect(`/multigraficos?tab=${tab.id}`);
}

export async function saveMultiChartSlot(formData: FormData) {
  const user = await requireUser("dashboard");
  const tabId = requiredText(formData, "tabId", 80);
  const kpiId = requiredText(formData, "kpiId", 80);
  const position = requiredPosition(formData);
  const tab = await assertOwnedTab(tabId, user.id);
  const kpi = await assertVisibleKpi(kpiId, user);
  const slots = setMultiChartSlot(tab.slots, position, kpi.id);

  await prisma.multiChartTab.update({
    where: { id: tab.id },
    data: { slots },
  });

  await recordAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "MultiChartTab",
    entityId: tab.id,
    details: { position, kpiId: kpi.id, kpiName: kpi.name },
  });

  revalidatePath("/multigraficos");
  redirect(`/multigraficos?tab=${tab.id}`);
}

export async function clearMultiChartSlotAction(formData: FormData) {
  const user = await requireUser("dashboard");
  const tabId = requiredText(formData, "tabId", 80);
  const position = requiredPosition(formData);
  const tab = await assertOwnedTab(tabId, user.id);
  const slots = clearMultiChartSlot(tab.slots, position);

  await prisma.multiChartTab.update({
    where: { id: tab.id },
    data: { slots },
  });

  await recordAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "MultiChartTab",
    entityId: tab.id,
    details: { position, cleared: true },
  });

  revalidatePath("/multigraficos");
  redirect(`/multigraficos?tab=${tab.id}`);
}

export async function deleteMultiChartTab(formData: FormData) {
  const user = await requireUser("dashboard");
  const tabId = requiredText(formData, "tabId", 80);
  const tab = await assertOwnedTab(tabId, user.id);

  await prisma.multiChartTab.delete({ where: { id: tab.id } });

  await recordAuditLog({
    userId: user.id,
    action: "DELETE",
    entity: "MultiChartTab",
    entityId: tab.id,
    details: { name: tab.name },
  });

  revalidatePath("/multigraficos");
  redirect("/multigraficos");
}
