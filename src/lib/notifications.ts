import { prisma } from "@/lib/prisma";
import { getManagerIds } from "@/lib/hierarchy";

export type NotificationGroup = "PENDENCIAS" | "ATUALIZACOES";

export const NOTIFICATION_GROUP_LABEL: Record<NotificationGroup, string> = {
  PENDENCIAS: "Ações pendentes",
  ATUALIZACOES: "Atualizações",
};

const PENDING_NOTIFICATION_TYPES = new Set(["GOAL_PENDING", "FORECAST_PENDING"]);

export type GroupableNotification = {
  type: string;
};

export function notificationGroup(item: GroupableNotification): NotificationGroup {
  return PENDING_NOTIFICATION_TYPES.has(item.type) ? "PENDENCIAS" : "ATUALIZACOES";
}

export function groupNotificationsForDisplay<T extends GroupableNotification>(items: T[]) {
  const groups: Record<NotificationGroup, T[]> = {
    PENDENCIAS: [],
    ATUALIZACOES: [],
  };
  for (const item of items) groups[notificationGroup(item)].push(item);
  return groups;
}

export async function notifyUser(input: {
  recipientId: string;
  type: string;
  title: string;
  body: string;
  href?: string;
  relatedKpiId?: string;
  fromUserId?: string;
  originLabel?: string;
  dueAt?: Date;
}) {
  const preference = await prisma.userPreference.findUnique({
    where: { userId: input.recipientId },
    select: { emailNotifications: true },
  });
  if (preference?.emailNotifications === false) return null;
  return prisma.notification.create({ data: input });
}

export async function notifyUsers(recipientIds: string[], input: Omit<Parameters<typeof notifyUser>[0], "recipientId">) {
  const ids = [...new Set(recipientIds)].filter(Boolean);
  if (!ids.length) return;
  const disabled = await prisma.userPreference.findMany({
    where: { userId: { in: ids }, emailNotifications: false },
    select: { userId: true },
  });
  const disabledIds = new Set(disabled.map((preference) => preference.userId));
  const optedInIds = ids.filter((recipientId) => !disabledIds.has(recipientId));
  if (!optedInIds.length) return;
  await prisma.notification.createMany({ data: optedInIds.map((recipientId) => ({ ...input, recipientId })) });
}

export async function getGoalApproverIds(ownerId: string): Promise<string[]> {
  const [managerIds, admins] = await Promise.all([
    getManagerIds(ownerId),
    prisma.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } }),
  ]);
  return [...new Set([...managerIds, ...admins.map((admin) => admin.id)])].filter(
    (id) => id !== ownerId,
  );
}
