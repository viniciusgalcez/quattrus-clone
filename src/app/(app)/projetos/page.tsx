import { redirect, notFound } from "next/navigation";
import { BriefcaseBusiness } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertPageModule } from "@/lib/module-access";
import { updateStrategicProjectStatus } from "@/lib/actions";
import { NovoProjetoEstrategicoForm } from "@/components/NovoProjetoEstrategicoForm";
import { EmptyState } from "@/components/EmptyState";

const labels = { PLANEJADO: "Planejado", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", SUSPENSO: "Suspenso" } as const;

export default async function ProjetosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  assertPageModule(session.user, "tasks");
  if (session.user.role !== "GESTOR" && session.user.role !== "ADMIN") notFound();
  const [projects, departments, kpis] = await Promise.all([prisma.strategicProject.findMany({ include: { owner: { select: { name: true } }, department: { select: { name: true } }, kpi: { select: { name: true } } }, orderBy: [{ status: "asc" }, { dueDate: "asc" }] }), prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }), prisma.kpi.findMany({ where: { archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } })]);
  return <section className="mx-auto max-w-6xl space-y-5"><header><div className="dashboard-kicker">PAA</div><h1 className="page-title mt-1 text-[25px]">Projetos estratégicos</h1><p className="page-subtitle mt-1">Conecte iniciativas, responsáveis, investimentos e indicadores de resultado.</p></header><NovoProjetoEstrategicoForm departments={departments} kpis={kpis} /><div className="card overflow-hidden"><div className="card-header">Portfólio estratégico <span className="font-mono-num text-[var(--color-ink-400)]">{projects.length}</span></div>{projects.length === 0 ? <EmptyState icon={BriefcaseBusiness} title="Nenhum projeto estratégico" description="Cadastre a primeira iniciativa do plano anual." /> : <div className="table-scroll"><table className="table-modern min-w-[760px]"><thead><tr><th>Projeto</th><th>Responsável</th><th>Indicador</th><th>Prazo</th><th>Orçamento</th><th>Status</th></tr></thead><tbody>{projects.map((project) => <tr key={project.id}><th scope="row"><div>{project.name}</div><div className="mt-0.5 text-[11px] font-normal text-[var(--color-ink-400)]">{project.department?.name ?? "Corporativo"}</div></th><td>{project.owner.name}</td><td>{project.kpi?.name ?? "—"}</td><td>{project.dueDate?.toLocaleDateString("pt-BR") ?? "—"}</td><td className="num">{project.budget?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "—"}</td><td><form noValidate action={updateStrategicProjectStatus.bind(null, project.id)}><select name="status" defaultValue={project.status} onChange={(event) => event.currentTarget.form?.requestSubmit()} className="input-field !py-1 !text-[11px]" aria-label={`Status de ${project.name}`}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></form></td></tr>)}</tbody></table></div>}</div></section>;
}
