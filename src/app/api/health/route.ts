import { prisma } from "@/lib/prisma";

// Never prerender or cache: a healthcheck must reflect the live state of the
// process and its database connection on every request.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json(
      { status: "ok" },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[health] database ping failed", error);
    return Response.json(
      { status: "error" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
