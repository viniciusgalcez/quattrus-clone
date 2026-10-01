"use client";

import { useRef, useState, useTransition, type DragEvent, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { swapMultiChartSlotsAction } from "@/lib/multigraficos-actions";

type SlotCardProps = {
  tabId: string;
  position: number;
  hasChart: boolean;
  children: ReactNode;
};

/**
 * HTML5 DnD between multigráfico quadrants — no extra dependency. Dragging an
 * empty slot is a no-op; dropping onto another quadrant swaps (or moves).
 */
export function MultiChartSlotCard({ tabId, position, hasChart, children }: SlotCardProps) {
  const [dragging, setDragging] = useState(false);
  const [over, setOver] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);

  function onDragStart(event: DragEvent<HTMLDivElement>) {
    if (!hasChart) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("text/plain", String(position));
    event.dataTransfer.effectAllowed = "move";
    setDragging(true);
  }

  function onDragEnd() {
    setDragging(false);
    setOver(false);
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setOver(true);
  }

  function onDragLeave() {
    setOver(false);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setOver(false);
    const raw = event.dataTransfer.getData("text/plain");
    const fromPosition = Number(raw);
    if (!Number.isInteger(fromPosition) || fromPosition === position) return;
    if (!fromRef.current || !toRef.current || !formRef.current) return;
    fromRef.current.value = String(fromPosition);
    toRef.current.value = String(position);
    startTransition(() => {
      formRef.current?.requestSubmit();
    });
  }

  return (
    <div
      className={`card relative flex h-[360px] min-w-0 flex-col p-4 transition ${
        dragging ? "opacity-60" : ""
      } ${over ? "ring-2 ring-[var(--color-brand-500)]" : ""} ${pending ? "pointer-events-none opacity-70" : ""}`}
      draggable={hasChart}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {hasChart && (
        <div
          className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-400)]"
          title="Arraste para outro quadrante"
        >
          <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
          Arrastar
        </div>
      )}
      <form ref={formRef} action={swapMultiChartSlotsAction} className="hidden" aria-hidden="true">
        <input type="hidden" name="tabId" value={tabId} />
        <input ref={fromRef} type="hidden" name="fromPosition" defaultValue="" />
        <input ref={toRef} type="hidden" name="toPosition" defaultValue="" />
      </form>
      {children}
    </div>
  );
}
