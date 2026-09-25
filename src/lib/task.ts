import type { TaskStatus } from "@prisma/client";

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  ABERTA: "Aberta",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  ATRASADA: "Atrasada",
};

export const TASK_STATUS_BADGE_CLASS: Record<TaskStatus, string> = {
  ABERTA: "badge badge-neutro",
  EM_ANDAMENTO: "badge badge-amarelo",
  CONCLUIDA: "badge badge-verde",
  ATRASADA: "badge badge-vermelho",
};

export const TASK_STATUS_ORDER: TaskStatus[] = ["ABERTA", "EM_ANDAMENTO", "CONCLUIDA", "ATRASADA"];

/** A task past its due date and not yet concluded reads as ATRASADA regardless of its stored status. */
export function effectiveTaskStatus(status: TaskStatus, dueDate: Date | null): TaskStatus {
  if (status === "CONCLUIDA") return status;
  if (dueDate && dueDate.getTime() < Date.now()) return "ATRASADA";
  return status;
}

export type TaskDisplayGroup = "ATRASADAS" | "PLANOS_DE_ACAO" | "TAREFAS_ADICIONAIS" | "CONCLUIDAS";

export const TASK_GROUP_LABEL: Record<TaskDisplayGroup, string> = {
  ATRASADAS: "Atrasadas",
  PLANOS_DE_ACAO: "Planos de ação",
  TAREFAS_ADICIONAIS: "Tarefas adicionais",
  CONCLUIDAS: "Concluídas",
};

export type GroupableTask = {
  status: TaskStatus;
  dueDate: Date | null;
  actionPlanId: string | null;
};

export function taskDisplayGroup(task: GroupableTask, now = new Date()): TaskDisplayGroup {
  if (task.status === "CONCLUIDA") return "CONCLUIDAS";
  if (task.dueDate && task.dueDate.getTime() < now.getTime()) return "ATRASADAS";
  if (task.actionPlanId) return "PLANOS_DE_ACAO";
  return "TAREFAS_ADICIONAIS";
}

export function groupTasksForDisplay<T extends GroupableTask>(tasks: T[], now = new Date()) {
  const groups: Record<TaskDisplayGroup, T[]> = {
    ATRASADAS: [],
    PLANOS_DE_ACAO: [],
    TAREFAS_ADICIONAIS: [],
    CONCLUIDAS: [],
  };

  for (const task of tasks) groups[taskDisplayGroup(task, now)].push(task);
  return groups;
}
