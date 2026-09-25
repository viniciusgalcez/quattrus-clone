"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ClipboardList, Eye, MoreVertical, Paperclip, Pencil } from "lucide-react";

/**
 * Per-row "..." menu on the farol grid, mirroring the original Quattrus row
 * menu (Editar item / Medições / Gráfico do item / Plano de ação / Anexos).
 * "Medições" and "Gráfico do item" already live on /metas/[id] (band chart +
 * full history), so this menu links there instead of duplicating that view.
 *
 * Rendered through a portal into document.body: the grid sits inside
 * `.table-scroll` (overflow-x: auto), which would otherwise clip an
 * absolutely-positioned popover on both axes — CSS forces overflow-y into a
 * scroll container too as soon as overflow-x is non-visible.
 */
export function KpiRowMenu({ kpiId, canEdit }: { kpiId: string; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function place() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    place();

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const itemClass =
    "flex items-center gap-2 px-3 py-1.5 text-[12.5px] text-[var(--color-ink-700)] hover:bg-[var(--color-brand-50)] hover:text-[var(--color-brand-700)]";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Mais ações do item"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-400)] hover:bg-[var(--color-brand-50)] hover:text-[var(--color-brand-600)]"
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>

      {open && position && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label="Ações do item"
              style={{ position: "fixed", top: position.top, right: position.right }}
              className="z-50 w-52 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-1 shadow-lg"
            >
              <Link role="menuitem" href={`/metas/${kpiId}`} className={itemClass} onClick={() => setOpen(false)}>
                <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Ver item / medições
              </Link>
              {canEdit && (
                <Link
                  role="menuitem"
                  href={`/metas/${kpiId}/editar`}
                  className={itemClass}
                  onClick={() => setOpen(false)}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Editar item
                </Link>
              )}
              <Link
                role="menuitem"
                href={`/metas/${kpiId}/planos-de-acao`}
                className={itemClass}
                onClick={() => setOpen(false)}
              >
                <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" /> Plano de ação
              </Link>
              <Link
                role="menuitem"
                href={`/metas/${kpiId}/anexos`}
                className={itemClass}
                onClick={() => setOpen(false)}
              >
                <Paperclip className="h-3.5 w-3.5" aria-hidden="true" /> Anexos
              </Link>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
