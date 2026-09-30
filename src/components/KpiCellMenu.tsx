"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { BarChart3, Pencil, PieChart } from "lucide-react";

/**
 * Per-cell context menu on the farol grid (Quattrus parity):
 * Editar medição · Gráfico de pareto · Gráfico de barras.
 */
export function KpiCellMenu({
  open,
  anchorRect,
  canEdit,
  measurementId,
  onEdit,
  onBars,
  onClose,
}: {
  open: boolean;
  anchorRect: DOMRect | null;
  canEdit: boolean;
  measurementId: string | null;
  onEdit: () => void;
  onBars: () => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [open, onClose]);

  if (!open || !anchorRect || typeof document === "undefined") return null;

  const menuWidth = 208;
  const left = Math.min(
    Math.max(8, anchorRect.left + anchorRect.width / 2 - menuWidth / 2),
    window.innerWidth - menuWidth - 8
  );
  const top = anchorRect.bottom + 4;

  const itemClass =
    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-[var(--color-ink-700)] hover:bg-[var(--color-brand-50)] hover:text-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:opacity-40";

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Ações da medição"
      style={{ position: "fixed", top, left, width: menuWidth }}
      className="z-50 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-1 shadow-lg"
    >
      <button
        type="button"
        role="menuitem"
        disabled={!canEdit}
        className={itemClass}
        onClick={() => {
          onClose();
          onEdit();
        }}
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Editar medição
      </button>
      {measurementId ? (
        <Link
          role="menuitem"
          href={`/fca/${measurementId}`}
          className={itemClass}
          onClick={onClose}
        >
          <PieChart className="h-3.5 w-3.5" aria-hidden="true" /> Gráfico de pareto
        </Link>
      ) : (
        <button type="button" role="menuitem" disabled className={itemClass} title="Disponível após lançar a medição">
          <PieChart className="h-3.5 w-3.5" aria-hidden="true" /> Gráfico de pareto
        </button>
      )}
      <button
        type="button"
        role="menuitem"
        className={itemClass}
        onClick={() => {
          onClose();
          onBars();
        }}
      >
        <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" /> Gráfico de barras
      </button>
    </div>,
    document.body
  );
}
