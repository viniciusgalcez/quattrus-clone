"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { KpiBandChart } from "@/components/KpiBandChart";
import type { BandPoint } from "@/lib/farol-tree";

export function KpiChartModal({
  name,
  metricUnit,
  data,
  onClose,
}: {
  name: string;
  metricUnit: string;
  data: BandPoint[];
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Gráfico de ${name}`}
      onClick={onClose}
    >
      <div
        className="card flex max-h-[85vh] w-full max-w-[820px] flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-header">
          <div>
            <div className="font-semibold text-[13.5px]">{name}</div>
            <div className="text-[11px] font-normal text-[var(--color-ink-500)]">{metricUnit}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar gráfico"
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-ink-500)] hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-ink-900)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-[360px] p-4">
          <KpiBandChart data={data} />
        </div>
      </div>
    </div>
  );
}
