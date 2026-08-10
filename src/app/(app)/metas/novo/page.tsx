import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubordinateIds } from "@/lib/hierarchy";
import { NovaMetaForm } from "@/components/NovaMetaForm";

export default async function NovaMetaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Only KPIs the user can actually see may be offered as a parent — an
  // unscoped list leaks the name and id of every indicator in the company.
  const visibleOwnerIds = [session.user.id, ...(await getSubordinateIds(session.user.id))];

  const [departments, parentOptions] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.kpi.findMany({
      where: { archivedAt: null, ownerId: { in: visibleOwnerIds } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-5">
      <div>
        <h1 className="font-display text-[20px] font-bold text-[var(--color-ink-900)]">
          Cadastrar meta
        </h1>
        <p className="text-[12.5px] text-[var(--color-ink-500)]">
          Defina o indicador, a faixa de tolerância e a meta do mês corrente.
        </p>
      </div>

      <NovaMetaForm departments={departments} parentOptions={parentOptions} />
    </div>
  );
}
