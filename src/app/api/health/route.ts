import { prisma } from "@/lib/prisma";

// Never prerender or cache: a healthcheck must reflect the live state of the
// process and its database connection on every request.
export const dynamic = "force-dynamic";

let connectionModeLogged = false;

function logConnectionModeOnce() {
  if (connectionModeLogged) return;
  connectionModeLogged = true;

  try {
    const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
    const pooled = databaseUrl.hostname.endsWith(".pooler.supabase.com");
    console.info(`[health] database connection mode=${pooled ? "pooler" : "direct"} port=${databaseUrl.port || "5432"}`);
  } catch {
    console.warn("[health] DATABASE_URL format could not be inspected");
  }
}

export async function GET() {
  logConnectionModeOnce();
  const startedAt = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const databaseDurationMs = performance.now() - startedAt;
    return Response.json(
      { status: "ok" },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "Server-Timing": `database;dur=${databaseDurationMs.toFixed(1)}`,
        },
      },
    );
  } catch (error) {
    console.error("[health] database ping failed", error);
    return Response.json(
      { status: "error" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
