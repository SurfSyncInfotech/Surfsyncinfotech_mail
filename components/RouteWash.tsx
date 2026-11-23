"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

export function RouteWash() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const wash = pathname !== "/";
    document.body.classList.toggle("page-wash", wash);
    if (!document.querySelector(".ssload")) {
      document.documentElement.classList.remove("intro-on");
    }
    if (!window.location.hash) window.scrollTo(0, 0);
    return () => document.body.classList.remove("page-wash");
  }, [pathname]);

  return null;
}
