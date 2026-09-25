import { redirect } from "next/navigation";
import Link from "next/link";
import { ListChecks } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  TASK_GROUP_LABEL,
  TASK_STATUS_BADGE_CLASS,
  TASK_STATUS_LABEL,
  effectiveTaskStatus,
  groupTasksForDisplay,
  type TaskDisplayGroup,
} from "@/lib/task";
import { NovaTarefaForm } from "@/components/NovaTarefaForm";
import { TaskStatusSelect, DeleteTaskButton } from "@/components/TaskStatusSelect";
import { EmptyState } from "@/components/EmptyState";
import { assertPageModule } from "@/lib/module-access";
import { exportableOwnerIds } from "@/lib/hierarchy";

const df = new Intl.DateTimeFormat("pt-BR");
const TASK_GROUP_ORDER: TaskDisplayGroup[] = ["ATRASADAS", "PLANOS_DE_ACAO", "TAREFAS_ADICIONAIS", "CONCLUIDAS"];

export default async function TarefasPage({ searchParams }: { searchParams: Promise<{ status?: string; responsavel?: string; origem?: string; q?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  assertPageModule(session.user, "tasks");
  const user = session.user;
  const filters = await searchParams;
  const selectedStatus = ["ABERTA", "EM_ANDAMENTO", "CONCLUIDA", "ATRASADA"].includes(filters.status ?? "") ? filters.status : "";
  const selectedAssignee = filters.responsavel ?? "";
  const selectedOrigin = filters.origem === "plano" || filters.origem === "avulsa" ? filters.origem : "";
  const query = typeof filters.q === "string" ? filters.q.trim().slice(0, 80) : "";
  const accessWhere = user.role === "ADMIN" ? {} : { OR: [{ createdById: user.id }, { assigneeId: user.id }] };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const statusWhere: Prisma.TaskWhereInput =
    selectedStatus === "ATRASADA"
      ? { OR: [{ status: "ATRASADA" }, { status: { not: "CONCLUIDA" }, dueDate: { lt: today } }] }
      : selectedStatus
        ? {
            status: selectedStatus as "ABERTA" | "EM_ANDAMENTO" | "CONCLUIDA",
            ...(selectedStatus !== "CONCLUIDA" ? { OR: [{ dueDate: null }, { dueDate: { gte: today } }] } : {}),
          }
        : {};
  const filterWhere: Prisma.TaskWhereInput = {
    ...statusWhere,
    ...(selectedAssignee ? { assigneeId: selectedAssignee } : {}),
    ...(selectedOrigin === "plano" ? { actionPlanId: { not: null } } : {}),
    ...(selectedOrigin === "avulsa" ? { actionPlanId: null } : {}),
    ...(query
      ? {
          OR: [
            { what: { contains: query, mode: "insensitive" } },
            { why: { contains: query, mode: "insensitive" } },
            { howWhere: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const ownerIds = user.role === "ADMIN" ? [] : await exportableOwnerIds(user);
  const actionPlanWhere: Prisma.ActionPlanWhereInput =
    user.role === "ADMIN" ? { status: "ABERTO" } : { status: "ABERTO", kpi: { ownerId: { in: ownerIds } } };

  const [tasks, users, actionPlans] = await Promise.all([
    prisma.task.findMany({
      where: { AND: [accessWhere, filterWhere] },
      include: {
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
        actionPlan: { include: { measurement: { select: { id: true, period: true } }, kpi: { select: { name: true } } } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.actionPlan.findMany({
      where: actionPlanWhere,
      include: { kpi: { select: { name: true } }, measurement: { select: { period: true } } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);
  const groupedTasks = groupTasksForDisplay(tasks);

  return (
    <div className="flex flex-col gap-4 p-2">
      <div>
        <h1 className="page-title">Tarefas</h1>
        <p className="page-subtitle">
          Formato 5W2H — o quê, por quê, como/onde, quem, quando e status de cada tarefa avulsa.
        </p>
      </div>

      <NovaTarefaForm
        users={users}
        actionPlans={actionPlans.map((plan) => ({
          id: plan.id,
          label: `${plan.kpi.name} · ${plan.measurement.period}`,
        }))}
      />

      <form noValidate className="card grid gap-3 p-4 md:grid-cols-[1.4fr_180px_220px_170px_auto]" method="get">
        <label className="flex flex-col gap-1.5"><span className="field-label">Busca</span><input name="q" defaultValue={query} maxLength={80} className="input-field" placeholder="O quê, por quê ou como" /></label>
        <label className="flex flex-col gap-1.5"><span className="field-label">Situação</span><select name="status" defaultValue={selectedStatus} className="input-field"><option value="">Todas</option>{Object.entries(TASK_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="flex flex-col gap-1.5"><span className="field-label">Responsável</span><select name="responsavel" defaultValue={selectedAssignee} className="input-field"><option value="">Todos</option>{users.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label>
        <label className="flex flex-col gap-1.5"><span className="field-label">Origem</span><select name="origem" defaultValue={selectedOrigin} className="input-field"><option value="">Todas</option><option value="plano">Plano de ação</option><option value="avulsa">Tarefa adicional</option></select></label>
        <div className="flex items-end gap-2"><button type="submit" className="btn btn-primary w-full md:w-auto">Filtrar</button>{(query || selectedStatus || selectedAssignee || selectedOrigin) && <Link href="/tarefas" className="btn w-full md:w-auto">Limpar</Link>}</div>
      </form>

      <div className="card overflow-hidden">
        <div className="card-header">
          <span>Tarefas cadastradas · {tasks.length}</span>
        </div>
        <div className="table-scroll">
          <table className="table-modern">
            <thead>
              <tr>
                <th scope="col">O quê</th>
                <th scope="col">Por quê</th>
                <th scope="col">Como/Onde</th>
                <th scope="col">Quem</th>
                <th scope="col">Origem</th>
                <th scope="col">Data final</th>
                <th scope="col" className="num">
                  Valor
                </th>
                <th scope="col">Status</th>
                <th scope="col" className="text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={9} className="!p-0">
                    <EmptyState
                      icon={ListChecks}
                      title={query || selectedStatus || selectedAssignee || selectedOrigin ? "Nenhuma tarefa encontrada" : "Nenhuma tarefa cadastrada"}
                      description={query || selectedStatus || selectedAssignee || selectedOrigin ? "Revise os filtros para ampliar a busca." : "Cadastre a primeira tarefa acima. Diferente do FCA, a tarefa não precisa estar ligada a um indicador."}
                    />
                  </td>
                </tr>
              )}
              {TASK_GROUP_ORDER.flatMap((group) => {
                const groupTasks = groupedTasks[group];
                if (groupTasks.length === 0) return [];
                return [
                  <tr key={group} className="bg-[var(--color-surface-muted)]">
                    <th colSpan={9} scope="colgroup" className="!py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                      {TASK_GROUP_LABEL[group]} · {groupTasks.length}
                    </th>
                  </tr>,
                  ...groupTasks.map((task) => {
                    const status = effectiveTaskStatus(task.status, task.dueDate);
                    return (
                      <tr key={task.id}>
                        <th scope="row">
                          <div className="max-w-[260px] truncate text-[13px] font-medium text-[var(--color-ink-900)]">{task.what}</div>
                        </th>
                        <td className="max-w-[220px] truncate text-[12.5px] text-[var(--color-ink-500)]">{task.why || "—"}</td>
                        <td className="max-w-[220px] truncate text-[12.5px] text-[var(--color-ink-500)]">{task.howWhere || "—"}</td>
                        <td className="text-[12.5px]">{task.assignee?.name ?? "—"}</td>
                        <td className="text-[12.5px]">
                          {task.actionPlan ? (
                            <Link href={`/fca/${task.actionPlan.measurement.id}`} className="text-[var(--color-brand-700)] hover:underline">
                              FCA · {task.actionPlan.kpi.name}
                            </Link>
                          ) : (
                            "Adicional"
                          )}
                        </td>
                        <td className="text-[12.5px]">{task.dueDate ? df.format(task.dueDate) : "—"}</td>
                        <td className="num">{task.value ?? "—"}</td>
                        <td>
                          <span className={TASK_STATUS_BADGE_CLASS[status]}>{TASK_STATUS_LABEL[status]}</span>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-3">
                            <TaskStatusSelect taskId={task.id} status={task.status} />
                            <DeleteTaskButton taskId={task.id} taskName={task.what} />
                          </div>
                        </td>
                      </tr>
                    );
                  }),
                ];
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
