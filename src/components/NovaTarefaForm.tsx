"use client";

import { useActionState } from "react";
import { createTask } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FieldError, FormError } from "@/components/FieldError";

type Option = { id: string; name: string };
type ActionPlanOption = { id: string; label: string };

export function NovaTarefaForm({ users, actionPlans = [] }: { users: Option[]; actionPlans?: ActionPlanOption[] }) {
  const [state, formAction] = useActionState(createTask, null);

  return (
    <form noValidate action={formAction} className="card flex flex-col gap-4 p-5">
      <FormError message={state?.error} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-what" className="field-label">O quê</label>
        <input id="task-what" type="text" name="what" required className="input-field" placeholder="O que precisa ser feito" />
        <FieldError message={state?.fieldErrors?.what} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-why" className="field-label">Por quê</label>
        <textarea id="task-why" name="why" rows={2} className="input-field resize-none" placeholder="Motivo / objetivo" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-how-where" className="field-label">Como / Onde</label>
        <input id="task-how-where" type="text" name="howWhere" className="input-field" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-action-plan" className="field-label">Plano de ação vinculado</label>
        <select id="task-action-plan" name="actionPlanId" className="input-field">
          <option value="">— tarefa avulsa —</option>
          {actionPlans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-assignee" className="field-label">Quem</label>
          <select id="task-assignee" name="assigneeId" className="input-field">
            <option value="">— sem responsável —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-value" className="field-label">Valor</label>
          <input id="task-value" type="number" step="0.01" name="value" className="input-field font-mono-num" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-start-date" className="field-label">Data início</label>
          <input id="task-start-date" type="date" name="startDate" className="input-field" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-due-date" className="field-label">Data final</label>
          <input id="task-due-date" type="date" name="dueDate" className="input-field" />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-4">
        <SubmitButton>Cadastrar tarefa</SubmitButton>
      </div>
    </form>
  );
}
