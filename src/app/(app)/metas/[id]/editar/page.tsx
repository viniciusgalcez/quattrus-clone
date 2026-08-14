import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubordinateIds } from "@/lib/hierarchy";
import { EditarMetaForm } from "@/components/EditarMetaForm";

export default async function EditarMetaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  // Scoped to the user's own hierarchy — an unscoped list leaks the name and
  // id of every indicator in the company into the parent dropdown.
  const visibleOwnerIds = [session.user.id, ...(await getSubordinateIds(session.user.id))];

  const [kpi, departments, parentOptions] = await Promise.all([
    prisma.kpi.findUnique({ where: { id } }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.kpi.findMany({
      where: { archivedAt: null, ownerId: { in: visibleOwnerIds } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!kpi) notFound();

  const canEdit = session.user.id === kpi.ownerId || session.user.role === "ADMIN";
  if (!canEdit) notFound();

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-5">
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
    </div>
  );
}
