"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { restoreKpi, purgeArchivedKpiNow } from "@/lib/actions";

export function ArchivedKpiRowActions({ kpiId }: { kpiId: string }) {
  return (
    <div className="flex items-center justify-end gap-3">
      <form noValidate
        action={async () => {
          await restoreKpi(kpiId);
        }}
      >
        <button
          type="submit"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-brand-700)] hover:underline"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Restaurar
        </button>
      </form>
      <form noValidate
        action={async () => {
          await purgeArchivedKpiNow(kpiId);
        }}
      >
        <button
          type="submit"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-red-600)] hover:underline"
        >
          <Trash2 className="h-3.5 w-3.5" /> Excluir agora
        </button>
      </form>
    </div>
  );
}
