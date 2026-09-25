import { prisma } from "@/lib/prisma";

export async function getSubordinateIds(userId: string): Promise<string[]> {
  const result: string[] = [];
  const visited = new Set<string>([userId]);
  let frontier = [userId];

  while (frontier.length) {
    // A user can have several managers now ("Configurar Subordinação"), so a
    // report shows up once per manager relationship — dedupe via `visited`
    // the same way a single-manager tree would have needed to for cycles.
    const reports = await prisma.subordination.findMany({
      where: { managerId: { in: frontier } },
      select: { userId: true },
    });
    const ids: string[] = [];
    for (const { userId: id } of reports) {
      if (visited.has(id)) continue;
      visited.add(id);
      ids.push(id);
    }
    result.push(...ids);
    frontier = ids;
  }

  return result;
}

/** Every manager a user answers to (not just the principal one) — used wherever an approval/notification must reach all of them, not just one. */
export async function getManagerIds(userId: string): Promise<string[]> {
  const rows = await prisma.subordination.findMany({ where: { userId }, select: { managerId: true } });
  return rows.map((row) => row.managerId);
}

/**
 * True if setting `userId`'s manager to `candidateManagerId` would create a
 * management cycle (candidateManagerId is userId itself, or is already one
 * of userId's own subordinates).
 */
export async function wouldCreateCycle(userId: string, candidateManagerId: string): Promise<boolean> {
  if (candidateManagerId === userId) return true;
  const subs = await getSubordinateIds(userId);
  return subs.includes(candidateManagerId);
}

/**
 * Owner ids visible to `user` for bulk export/import: everyone for an admin,
 * self + subordinates for a manager, just self otherwise. Mirrors the scope
 * `canView` grants one KPI at a time, but as a single upfront list so an
 * export query doesn't need one permission check per row.
 */
export async function exportableOwnerIds(user: { id: string; role: string }): Promise<string[]> {
  if (user.role === "ADMIN") {
    const users = await prisma.user.findMany({ select: { id: true } });
    return users.map((u) => u.id);
  }
  const subs = await getSubordinateIds(user.id);
  return [user.id, ...subs];
}

export async function canView(
  viewerId: string,
  viewerRole: string,
  targetId: string
): Promise<boolean> {
  if (viewerId === targetId) return true;
  // An administrator sees the whole organization. Scoping admins to their own
  // subtree meant an admin who manages nobody could not see a single KPI —
  // which broke shared panels and exports for exactly the person expected to
  // audit them. Write access stays separate: `canEdit` in authz.ts is still
  // owner-or-admin, and a closed period blocks admins too.
  if (viewerRole === "ADMIN") return true;
  if (viewerRole !== "GESTOR") return false;
  const subs = await getSubordinateIds(viewerId);
  return subs.includes(targetId);
}
