"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

export function MobileSidebarToggle({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [openPathname, setOpenPathname] = useState<string | null>(null);
  const isOpen = openPathname === pathname;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const closeSidebar = () => setOpenPathname(null);

  useEffect(() => {
    if (!isOpen) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const firstLink = dialogRef.current?.querySelector<HTMLElement>("a");
    firstLink?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSidebar();
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpenPathname(pathname)}
        className="shell-header-action md:hidden"
        aria-label="Abrir navegação"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            // Portaled to document.body: this markup used to live inside
            // <Header>'s own DOM subtree (Header renders {children}, and
            // MobileSidebarToggle is that child). A fixed, z-50 overlay
            // still escapes Header's layout box visually, but it stayed in
            // Header's stacking context — so Header's own later siblings
            // (the avatar/notification/logout controls) could still paint
            // over it instead of being dimmed underneath, which is what
            // produced the misaligned-looking header row while the drawer
            // was open.
            <div className="fixed inset-0 z-50 flex md:hidden">
              <button
                type="button"
                className="fixed inset-0 bg-black/50"
                onClick={closeSidebar}
                aria-label="Fechar navegação"
              />
              {/* No fixed width/background here — the Sidebar itself already
                  carries its own width and navy background; wrapping it in a
                  differently-colored, differently-sized box was what produced
                  the white gap above the drawer. */}
              <div ref={dialogRef} id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Navegação principal" className="relative z-50 h-full">
                <button
                  type="button"
                  onClick={closeSidebar}
                  className="absolute right-3 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
                  aria-label="Fechar navegação"
                >
                  <X className="h-5 w-5" />
                </button>
                {children}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
