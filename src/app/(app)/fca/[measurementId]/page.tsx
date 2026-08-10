import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canView } from "@/lib/hierarchy";
import { getDeviationPct } from "@/lib/kpi";
import { FCAForm } from "@/components/FCAForm";

export default async function FCAPage({
  params,
}: {
  params: Promise<{ measurementId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { measurementId } = await params;

  const measurement = await prisma.measurement.findUnique({
    where: { id: measurementId },
    include: { kpi: { include: { owner: true } }, actionPlans: true },
  });

  if (!measurement) notFound();

  const allowed = await canView(session.user.id, session.user.role, measurement.kpi.ownerId);
  if (!allowed) notFound();

  const plan = measurement.actionPlans[0] ?? null;
  const deviation = getDeviationPct(measurement.goal, measurement.actual, measurement.kpi.direction);

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/metas"
            className="mb-1 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-brand-700)] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Metas e indicadores
          </Link>
          <h1 className="font-display text-[20px] font-bold text-[var(--color-ink-900)]">
            FCA — {measurement.kpi.name}
          </h1>
        </div>
        {plan?.status === "CONCLUIDO" && (
          <span className="badge badge-verde">
            <CheckCircle2 className="h-3 w-3" /> Concluído
          </span>
        )}
      </div>

      <FCAForm
        measurement={{
          id: measurement.id,
          goal: measurement.goal,
          actual: measurement.actual,
          metricUnit: measurement.kpi.metricUnit,
        }}
        plan={plan}
        deviation={deviation}
      />
    </div>
  );
}
