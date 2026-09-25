import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Pencil, UserPlus, UserRoundCog } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NovoUsuarioForm } from "@/components/NovoUsuarioForm";
import { UserActiveToggle } from "@/components/UserActiveToggle";
import { assertPageModule } from "@/lib/module-access";

export default async function UsuariosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  assertPageModule(session.user, "users");
  if (session.user.role !== "ADMIN") notFound();

  const [users, departments, profiles] = await Promise.all([
    prisma.user.findMany({
      include: { manager: true, department: true, accessProfile: true },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.accessProfile.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, type: true } }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="page-title">Administração de usuários</h1>
        <p className="page-subtitle">
          Cadastre colaboradores e defina a hierarquia de gestão.
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="table-scroll"><table className="table-modern">
          <caption className="sr-only">
            Todos os usuários cadastrados, com perfil, departamento, gestor e situação.
          </caption>
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">Usuário</th>
              <th scope="col">Perfil</th>
              <th scope="col">Departamento</th>
              <th scope="col">Gestor</th>
              <th scope="col">Status</th>
              <th scope="col" className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <th scope="row" className="text-[var(--color-ink-900)]">{u.name}</th>
                <td className="font-mono-num text-[var(--color-ink-500)]">{u.username}</td>
                <td>{u.accessProfile?.name ?? u.role}</td>
                <td>{u.department?.name ?? "—"}</td>
                <td>{u.manager?.name ?? "—"}</td>
                <td>
                  <UserActiveToggle userId={u.id} active={u.active} disabled={u.id === session.user.id} />
                </td>
                <td className="text-right">
                  <Link
                    href={`/usuarios/${u.id}/editar`}
                    aria-label={`Editar ${u.name}`}
                    className="inline-flex items-center gap-1 py-1.5 text-[12px] font-semibold text-[var(--color-brand-700)] hover:underline"
                  >
                    <Pencil className="h-3 w-3" aria-hidden="true" /> Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      <div className="card max-w-[520px] p-5">
        <div className="mb-4 flex items-center gap-2 font-display text-[14px] font-bold text-[var(--color-ink-900)]">
          <UserPlus className="h-4 w-4 text-[var(--color-brand-600)]" /> Cadastrar novo usuário
        </div>
        <NovoUsuarioForm managers={users} departments={departments} profiles={profiles} />
      </div>

      <Link href="/perfis" className="inline-flex w-fit items-center gap-2 text-[12px] font-semibold text-[var(--color-brand-700)] hover:underline">
        <UserRoundCog className="h-4 w-4" aria-hidden="true" /> Gerenciar perfis de acesso
      </Link>
    </div>
  );
}
