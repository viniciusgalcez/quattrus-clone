import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EditarUsuarioForm } from "@/components/EditarUsuarioForm";
import { FacilitacaoForm } from "@/components/FacilitacaoForm";
import { SubordinacaoForm } from "@/components/SubordinacaoForm";

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") notFound();

  const { id } = await params;

  const [user, managers, departments, profiles, facilitating, subordinations] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.accessProfile.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, type: true } }),
    prisma.facilitation.findMany({
      where: { facilitatorId: id },
      include: { facilitated: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.subordination.findMany({
      where: { userId: id },
      include: { manager: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!user) notFound();

  const facilitationCandidates = managers.filter((m) => m.id !== id);

  return (
    <div className="mx-auto flex max-w-[520px] flex-col gap-5">
      <div>
        <h1 className="font-display text-[20px] font-bold text-[var(--color-ink-900)]">
          Editar usuário
        </h1>
        <p className="text-[12.5px] text-[var(--color-ink-500)]">{user.username}</p>
      </div>

      <EditarUsuarioForm user={user} managers={managers} departments={departments} profiles={profiles} />

      <SubordinacaoForm userId={user.id} candidates={facilitationCandidates} subordinations={subordinations} />

      <FacilitacaoForm userId={user.id} candidates={facilitationCandidates} facilitating={facilitating} />
    </div>
  );
}
