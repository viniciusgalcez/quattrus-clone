"use client";

import { Trash2 } from "lucide-react";
import { deleteDepartment } from "@/lib/actions";

export function DeleteDepartmentButton({
  departmentId,
  peopleCount,
}: {
  departmentId: string;
  peopleCount: number;
}) {
  const blocked = peopleCount > 0;

  return (
    <form noValidate
      action={async () => {
        await deleteDepartment(departmentId);
      }}
    >
      <button
        type="submit"
        disabled={blocked}
        title={
          blocked
            ? `Remova ou realoque as ${peopleCount} pessoa(s) deste departamento antes de excluí-lo.`
            : "Excluir departamento"
        }
        className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-ink-400)] transition-colors hover:bg-[var(--color-red-100)] hover:text-[var(--color-red-600)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--color-ink-400)]"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
