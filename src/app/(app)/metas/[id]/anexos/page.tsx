import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Paperclip } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertPageModule, hasModuleAccess } from "@/lib/module-access";
import { periodLabel } from "@/lib/kpi";
import { canView } from "@/lib/hierarchy";
import { attachmentModuleForEntity } from "@/lib/attachment-access";
import { EmptyState } from "@/components/EmptyState";

const nf = new Intl.NumberFormat("pt-BR");

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${nf.format(Math.round(bytes / 1024))} KB`;
  return `${nf.format(Math.round(bytes / (1024 * 1024)))} MB`;
}

export default async function KpiAttachmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  assertPageModule(session.user, "measurements");

  const { id } = await params;

  const kpi = await prisma.kpi.findUnique({ where: { id }, select: { id: true, name: true, ownerId: true, archivedAt: true } });
  if (!kpi) notFound();

  const allowed = await canView(session.user.id, session.user.role, kpi.ownerId);
  if (!allowed) notFound();
  if (kpi.archivedAt && session.user.role !== "ADMIN") notFound();

  const attachments = await prisma.attachment.findMany({
    where: {
      OR: [{ kpiId: kpi.id }, { measurement: { kpiId: kpi.id } }, { actionPlan: { kpiId: kpi.id } }],
    },
    include: { uploadedBy: { select: { name: true } }, measurement: { select: { period: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Same rule the download route enforces (attachment-access.ts): a
  // measurement/kpi attachment needs "measurements", an FCA attachment
  // needs "tasks" — filter the list to what this profile can actually open
  // rather than showing a link that 403s.
  const visible = attachments.filter((attachment) => {
    const entityType = attachment.actionPlanId ? "actionPlan" : attachment.measurementId ? "measurement" : "kpi";
    const requiredModule = attachmentModuleForEntity(entityType);
    return requiredModule ? hasModuleAccess(session.user, requiredModule) : false;
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href={`/metas/${kpi.id}`}
          className="mb-1 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-brand-700)] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> {kpi.name}
        </Link>
        <h1 className="page-title">Anexos — {kpi.name}</h1>
        <p className="page-subtitle">Arquivos enviados no item, em suas medições e em planos de ação.</p>
      </div>

      <div className="card overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState
            icon={Paperclip}
            title="Nenhum anexo"
            description="Anexos enviados no item, em uma medição ou em um FCA deste indicador aparecem aqui."
          />
        ) : (
          <div className="table-scroll">
            <table className="table-modern">
              <caption className="sr-only">Anexos de {kpi.name}.</caption>
              <thead>
                <tr>
                  <th scope="col">Arquivo</th>
                  <th scope="col">Origem</th>
                  <th scope="col">Enviado por</th>
                  <th scope="col" className="num">
                    Tamanho
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((attachment) => (
                  <tr key={attachment.id}>
                    <th scope="row">
                      <a
                        href={`/api/attachments/${attachment.id}`}
                        className="text-[var(--color-brand-700)] hover:underline"
                      >
                        {attachment.originalName}
                      </a>
                    </th>
                    <td>
                      {attachment.actionPlanId
                        ? "Plano de ação"
                        : attachment.measurement
                          ? `Medição — ${periodLabel(attachment.measurement.period)}`
                          : "Item"}
                    </td>
                    <td>{attachment.uploadedBy.name}</td>
                    <td className="num">{formatSize(attachment.sizeBytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
