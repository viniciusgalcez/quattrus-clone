import { prisma } from "@/lib/prisma";

export async function getSubordinateIds(userId: string): Promise<string[]> {
  const result: string[] = [];
  const visited = new Set<string>([userId]);
  let frontier = [userId];

  while (frontier.length) {
    const reports = await prisma.user.findMany({
      where: { managerId: { in: frontier } },
      select: { id: true },
    });
    // A management cycle (A manages B, B manages A) would otherwise make this
    // loop forever — skip anyone already seen. Marking each id as visited as
    // we go (rather than after the whole batch) also keeps the result unique
    // if the same person ever comes back twice within one level.
    const ids: string[] = [];
    for (const { id } of reports) {
      if (visited.has(id)) continue;
      visited.add(id);
      ids.push(id);
    }
    result.push(...ids);
    frontier = ids;
  }

  return result;
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
