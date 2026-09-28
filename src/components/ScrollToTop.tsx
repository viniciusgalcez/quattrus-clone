"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function ScrollToTop() {
  const pathname = usePathname();
  const prev = useRef(pathname);

  useEffect(() => {
    if (pathname === prev.current) return;
    prev.current = pathname;
    const main = document.querySelector("main");
    if (main) main.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
