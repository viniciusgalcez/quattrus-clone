"use client";

import { useCallback, useRef } from "react";

const SCALE = 100;

/**
 * Draggable stacked-bar editor for the yellow/red deviation thresholds —
 * the "Limite das Cores" control from the original Quattrus modal. Values
 * stay in sync with the plain numeric inputs the form actually submits;
 * this only changes how they're set.
 */
export function KpiThresholdEditor({
  yellowRange,
  redRange,
  onChange,
}: {
  yellowRange: number;
  redRange: number;
  onChange: (values: { yellowRange: number; redRange: number }) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const pctToX = (pct: number) => Math.min(100, Math.max(0, (pct / SCALE) * 100));

  const startDrag = useCallback(
    (which: "yellow" | "red") => (event: React.PointerEvent) => {
      event.preventDefault();
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const move = (moveEvent: PointerEvent) => {
        const ratio = Math.min(1, Math.max(0, (moveEvent.clientX - rect.left) / rect.width));
        const value = Math.round(ratio * SCALE * 10) / 10;
        if (which === "yellow") {
          onChange({ yellowRange: Math.min(value, redRange), redRange });
        } else {
          onChange({ yellowRange, redRange: Math.max(value, yellowRange) });
        }
      };
      const stop = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop);
    },
    [onChange, yellowRange, redRange]
  );

  return (
    <div className="flex flex-col gap-1.5">
      <span className="field-label">Limite das cores (% de desvio da meta)</span>
      <div ref={trackRef} className="relative h-7 w-full overflow-hidden rounded-md border border-[var(--color-border)] select-none">
        <div className="absolute inset-y-0 left-0 bg-emerald-500/80" style={{ width: `${pctToX(yellowRange)}%` }} />
        <div className="absolute inset-y-0 bg-amber-400/80" style={{ left: `${pctToX(yellowRange)}%`, width: `${pctToX(redRange) - pctToX(yellowRange)}%` }} />
        <div className="absolute inset-y-0 bg-red-500/80" style={{ left: `${pctToX(redRange)}%`, right: 0 }} />
        <button
          type="button"
          aria-label="Arrastar limite amarelo"
          onPointerDown={startDrag("yellow")}
          className="absolute top-0 h-full w-2 -translate-x-1/2 cursor-ew-resize bg-[var(--color-ink-900)]"
          style={{ left: `${pctToX(yellowRange)}%` }}
        />
        <button
          type="button"
          aria-label="Arrastar limite vermelho"
          onPointerDown={startDrag("red")}
          className="absolute top-0 h-full w-2 -translate-x-1/2 cursor-ew-resize bg-[var(--color-ink-900)]"
          style={{ left: `${pctToX(redRange)}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[var(--color-ink-500)]">
        <span>0%</span>
        <span>{SCALE}%+ de desvio</span>
      </div>
    </div>
  );
}
