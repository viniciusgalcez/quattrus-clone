"use client";

import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export function MobileSidebarToggle({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar when navigating
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-400)] hover:bg-[var(--color-neutral-100)]"
      >
        <Menu className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="relative z-50 flex h-full w-[240px] flex-col bg-[var(--color-surface)]">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-400)] hover:bg-[var(--color-neutral-100)]"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex-1 overflow-y-auto mt-14">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
