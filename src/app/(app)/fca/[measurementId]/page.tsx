import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canView } from "@/lib/hierarchy";
import { getDeviationPct } from "@/lib/kpi";
import { FCAForm } from "@/components/FCAForm";
import { ActionPlanGantt } from "@/components/ActionPlanGantt";
import { AttachmentUploader } from "@/components/AttachmentUploader";
import { PrintActionPlanButton } from "@/components/PrintActionPlanButton";

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
    include: { kpi: { include: { owner: true } }, actionPlans: { include: { attachments: true, steps: { include: { responsible: { select: { name: true } } }, orderBy: { sortOrder: "asc" } } } } },
  });

  if (!measurement) notFound();

  const allowed = await canView(session.user.id, session.user.role, measurement.kpi.ownerId);
  if (!allowed) notFound();

  const plan = measurement.actionPlans[0] ?? null;
  const candidates = plan
    ? await prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [];
  const deviation = getDeviationPct(measurement.goal, measurement.actual, measurement.kpi.direction);

  // A manager arrives here from a colaborador's own panel (/?userId=...) —
  // sending them to /metas afterwards silently swaps to the manager's own
  // items instead of back to the panel they were just looking at.
  const isOwnItem = measurement.kpi.ownerId === session.user.id;
  const backHref = isOwnItem ? "/metas" : `/?userId=${measurement.kpi.ownerId}`;
  const backLabel = isOwnItem ? "Metas e indicadores" : `Painel de ${measurement.kpi.owner.name}`;

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link
            href={backHref}
            className="mb-1 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-brand-700)] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
          </Link>
          <h1 className="font-display text-[20px] font-bold text-[var(--color-ink-900)]">
            FCA — {measurement.kpi.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">{plan && <PrintActionPlanButton />}{plan?.status === "CONCLUIDO" && <span className="badge badge-verde"><CheckCircle2 className="h-3 w-3" /> Concluído</span>}</div>
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
      {plan && <ActionPlanGantt actionPlanId={plan.id} steps={plan.steps} candidates={candidates} />}
      {plan && <div className="card p-4"><div className="card-header -mx-4 -mt-4 mb-4">Anexos do plano</div><AttachmentUploader entityType="actionPlan" entityId={plan.id} initial={plan.attachments} /></div>}
    </div>
  );
}
