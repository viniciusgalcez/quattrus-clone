import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EditarUsuarioForm } from "@/components/EditarUsuarioForm";

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") notFound();

  const { id } = await params;

  const [user, managers, departments] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!user) notFound();

  return (
    <div className="mx-auto flex max-w-[520px] flex-col gap-5">
      <div>
        <h1 className="font-display text-[20px] font-bold text-[var(--color-ink-900)]">
          Editar usuário
        </h1>
        <p className="text-[12.5px] text-[var(--color-ink-500)]">{user.username}</p>
      </div>

      <EditarUsuarioForm user={user} managers={managers} departments={departments} />
    </div>
  );
}
