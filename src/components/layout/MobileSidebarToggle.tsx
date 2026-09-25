"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function MobileSidebarToggle({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [openPathname, setOpenPathname] = useState<string | null>(null);
  const isOpen = openPathname === pathname;

  const closeSidebar = () => setOpenPathname(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSidebar();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setOpenPathname(pathname)}
        className="flex h-10 w-10 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white md:hidden"
        aria-label="Abrir navegação"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {isOpen && (
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
          <div id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Navegação principal" className="relative z-50 h-full">
            <button
              onClick={closeSidebar}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
              aria-label="Fechar navegação"
            >
              <X className="h-5 w-5" />
            </button>
            {children}
          </div>
        </div>
      )}
    </>
  );
}
