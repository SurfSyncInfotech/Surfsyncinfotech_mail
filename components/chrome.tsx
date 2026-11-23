import Link from "next/link";
import { Fragment, type ReactNode } from "react";

export const shellClass = "w-full px-[clamp(20px,4.8vw,80px)]";

export const buttonClass = {
  primary:
    "inline-flex h-10 items-center justify-center rounded-lg bg-blue px-4 text-[14px] font-semibold text-white transition-colors hover:bg-blue-hover",
  secondary:
    "btn-secondary inline-flex h-10 items-center justify-center rounded-lg border border-line-strong bg-paper px-4 text-[14px] font-semibold text-ink transition-colors hover:bg-pill",
} as const;

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof buttonClass;
  className?: string;
}) {
  return (
    <Link href={href} className={`${buttonClass[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto ${shellClass} ${className}`}>
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: string }) {
  return (
    <p className="flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-blue">
      <span aria-hidden="true">—</span>
      <span>{children}</span>
    </p>
  );
}

function CrumbDivider() {
  return (
    <li aria-hidden="true" className="flex items-center">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M4.5 2.5 8 6 4.5 9.5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </li>
  );
}

export function Breadcrumb({
  current,
  parents = [],
}: {
  current: string;
  parents?: { href: string; label: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-[13px] text-faint">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/" className="transition-colors hover:text-body">
            Home
          </Link>
        </li>
        {parents.map((parent) => (
          <Fragment key={parent.href}>
            <CrumbDivider />
            <li>
              <Link href={parent.href} className="transition-colors hover:text-body">
                {parent.label}
              </Link>
            </li>
          </Fragment>
        ))}
        <CrumbDivider />
        <li aria-current="page">{current}</li>
      </ol>
    </nav>
  );
}

export function PageIntro({
  crumb,
  parents,
  eyebrow,
  title,
  lead,
  children,
  className = "",
}: {
  crumb?: string;
  parents?: { href: string; label: string }[];
  eyebrow: string;
  title: ReactNode;
  lead: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`pt-14 sm:pt-[72px] ${className}`}>
      {crumb ? <Breadcrumb current={crumb} parents={parents} /> : null}
      <div className={crumb ? "mt-10" : ""}>
        <Eyebrow>{eyebrow}</Eyebrow>
      </div>
      <h1 className="reveal mt-4 text-[2.35rem] font-bold leading-[1.08] tracking-[-0.03em] text-ink sm:text-5xl lg:text-[3.5rem]">
        {title}
      </h1>
      <p className="reveal mt-6 max-w-[62ch] text-[17px] leading-[1.7] text-body [animation-delay:90ms] sm:text-[18px]">
        {lead}
      </p>
      {children ? (
        <div className="reveal mt-8 flex flex-wrap gap-3 [animation-delay:160ms]">
          {children}
        </div>
      ) : null}
    </header>
  );
}
