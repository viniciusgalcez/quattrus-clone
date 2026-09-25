"use client";

import { useState } from "react";
import type { TaskStatus } from "@prisma/client";
import { updateTaskStatus, deleteTask } from "@/lib/actions";
import { TASK_STATUS_LABEL, TASK_STATUS_ORDER } from "@/lib/task";
import { SubmitButton } from "@/components/SubmitButton";

export function TaskStatusSelect({ taskId, status }: { taskId: string; status: TaskStatus }) {
  return (
    <form noValidate
      action={async (formData) => {
        await updateTaskStatus(taskId, formData);
      }}
    >
      <select
        name="status"
        defaultValue={status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="input-field !py-1 !text-[12px]"
        aria-label="Status da tarefa"
      >
        {TASK_STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {TASK_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
    </form>
  );
}

export function DeleteTaskButton({ taskId, taskName }: { taskId: string; taskName: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        className="text-[12px] font-medium text-[var(--color-red-600)] hover:underline"
        onClick={() => setConfirming(true)}
      >
        Excluir
      </button>
    );
  }

  return (
    <form
      noValidate
      className="flex items-center gap-2 rounded-[8px] border border-[var(--color-red-100)] bg-[var(--color-surface-muted)] px-2 py-1"
      action={async () => {
        await deleteTask(taskId);
      }}
    >
      <span className="max-w-[150px] truncate text-[11px] text-[var(--color-ink-500)]">Excluir {taskName}?</span>
      <button type="button" className="btn btn-ghost px-2 text-[11px]" onClick={() => setConfirming(false)}>
        Cancelar
      </button>
      <SubmitButton className="btn px-2 text-[11px] text-[var(--color-red-600)]" pendingText="Excluindo...">
        Confirmar
      </SubmitButton>
    </form>
  );
}
