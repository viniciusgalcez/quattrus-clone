import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertPageModule } from "@/lib/module-access";
import { getSubordinateIds } from "@/lib/hierarchy";
import { EditarMetaForm } from "@/components/EditarMetaForm";
import { KpiConfigurationTabs } from "@/components/KpiConfigurationTabs";

export default async function EditarMetaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  assertPageModule(session.user, "measurements");

  const { id } = await params;

  // Scoped to the user's own hierarchy — an unscoped list leaks the name and
  // id of every indicator in the company into the parent dropdown.
  const visibleOwnerIds = session.user.role === "ADMIN"
    ? undefined
    : [session.user.id, ...(await getSubordinateIds(session.user.id))];

  const [kpi, departments, parentOptions] = await Promise.all([
    prisma.kpi.findUnique({
      where: { id },
      include: {
        formula: true,
        validities: { orderBy: { startPeriod: "desc" } },
        measurementPeriods: { orderBy: { startPeriod: "desc" } },
        thresholdValidities: { orderBy: { startPeriod: "desc" } },
        linkedFrom: { select: { targetKpiId: true } },
        dependenciesFrom: { select: { targetKpiId: true, dependencyType: true } },
        dependenciesTo: { select: { sourceKpiId: true, dependencyType: true } },
        formulaNumerators: { select: { kpiId: true, kind: true } },
        formulaDenominators: { select: { kpiId: true, kind: true } },
        children: {
          where: { archivedAt: null },
          orderBy: { name: "asc" },
          select: { id: true, name: true, sequenceNumber: true, weight: true, coefficient: true, owner: { select: { name: true } } },
        },
      },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.kpi.findMany({
      where: { archivedAt: null, ...(visibleOwnerIds ? { OR: [{ ownerId: { in: visibleOwnerIds } }, { shared: true }] } : {}) },
      orderBy: { name: "asc" },
      select: { id: true, name: true, departmentId: true, owner: { select: { name: true } } },
    }),
  ]);
  if (!kpi) notFound();

  const canEdit = session.user.id === kpi.ownerId || session.user.role === "ADMIN";
  if (!canEdit) notFound();

  // Archived indicators are admin-only, everywhere — including a direct
  // link to edit one the viewer used to own.
  if (kpi.archivedAt && session.user.role !== "ADMIN") notFound();

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-5">
      <div>
        <Link
          href={`/metas/${kpi.id}`}
          className="mb-1 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-brand-700)] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {kpi.name}
        </Link>
        <h1 className="font-display text-[20px] font-bold text-[var(--color-ink-900)]">
          Editar indicador
        </h1>
      </div>

      <EditarMetaForm kpi={kpi} departments={departments} parentOptions={parentOptions} />
      <KpiConfigurationTabs
        kpiId={kpi.id}
        yellowRange={kpi.yellowRange}
        redRange={kpi.redRange}
        configuration={{
          formula: kpi.formula,
          validities: kpi.validities,
          measurementPeriods: kpi.measurementPeriods,
          thresholdValidities: kpi.thresholdValidities,
          linkedFrom: kpi.linkedFrom,
          dependenciesFrom: kpi.dependenciesFrom,
          dependenciesTo: kpi.dependenciesTo,
          formulaNumerators: kpi.formulaNumerators,
          formulaDenominators: kpi.formulaDenominators,
          shared: kpi.shared,
          departmentId: kpi.departmentId,
          totalizationChildren: kpi.children.map((child) => ({
            id: child.id,
            name: child.name,
            sequenceNumber: child.sequenceNumber,
            ownerName: child.owner.name ?? "Sem responsável",
            weight: child.weight,
            coefficient: child.coefficient,
          })),
        }}
        options={parentOptions.filter((item) => item.id !== kpi.id).map((item) => ({ id: item.id, name: item.name, ownerName: item.owner.name ?? "Sem responsável", departmentId: item.departmentId }))}
      />
    </div>
  );
}
