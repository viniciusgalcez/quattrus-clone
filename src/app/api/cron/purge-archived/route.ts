import { purgeExpiredArchivedKpis } from "@/lib/archive";

// Never cache: this must run for real on every hit, not serve a stale response.
export const dynamic = "force-dynamic";

/**
 * Unattended version of the sweep that also runs when an admin opens
 * /metas/arquivados — for a real schedule (host cron, systemd timer, etc.)
 * hitting this endpoint instead of relying on someone opening that screen.
 * No human actor, so the AuditLog snapshot records `userId: null`.
 *
 * Guarded by CRON_SECRET so this destructive endpoint can't be triggered by
 * anyone who just finds the URL. Set it in the environment and call with:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://.../api/cron/purge-archived
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/purge-archived] CRON_SECRET is not set — refusing to run.");
    return Response.json({ error: "not configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const purged = await purgeExpiredArchivedKpis();
    return Response.json({ purged }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[cron/purge-archived] failed", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
