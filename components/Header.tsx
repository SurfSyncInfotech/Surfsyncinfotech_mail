"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buttonClass, shellClass } from "@/components/chrome";

const NAV = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
] as const;

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M2.5 5h13M2.5 9h13M2.5 13h13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M4.5 4.5 13.5 13.5M13.5 4.5 4.5 13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HeaderView({ pathname }: { pathname: string }) {
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenPath(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper">
      <div className={`mx-auto flex h-[72px] items-center ${shellClass}`}>
        <Logo />
        <nav aria-label="Primary" className="ml-8 hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "rounded-full bg-pill px-3.5 py-1.5 text-[14px] font-semibold text-pill-text"
                    : "rounded-full px-3.5 py-1.5 text-[14px] font-medium text-nav transition-colors hover:text-ink"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          <Link
            href="/pricing"
            className="text-[14px] font-medium text-ink transition-colors hover:text-blue"
          >
            Sign in
          </Link>
          <Link href="/pricing" className={buttonClass.primary}>
            Get started
          </Link>
        </div>
        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line-strong text-ink"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpenPath(open ? null : pathname)}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="border-t border-line bg-paper lg:hidden"
        >
          <div className={`mx-auto flex flex-col py-2 ${shellClass}`}>
            {NAV.map((item) => {
              const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpenPath(null)}
                  className={
                    active
                      ? "rounded-lg bg-pill px-3 py-3 text-[15px] font-semibold text-pill-text"
                      : "rounded-lg px-3 py-3 text-[15px] font-medium text-nav"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-2 flex flex-col gap-3 border-t border-line px-3 py-4">
              <Link
                href="/pricing"
 onClick={() => setOpenPath(null)}
                className="text-[15px] font-medium text-ink"
              >
                Sign in
              </Link>
              <Link
                href="/pricing"
 onClick={() => setOpenPath(null)}
                className={`${buttonClass.primary} w-full`}
              >
                Get started
              </Link>
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

export function Header() {
  const pathname = usePathname();
  return <HeaderView pathname={pathname} />;
}

export function HeaderFallback() {
  return <HeaderView pathname="" />;
}
