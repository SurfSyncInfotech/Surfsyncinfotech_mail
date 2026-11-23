import Link from "next/link";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className="logo-mark shrink-0"
    >
      <rect width="28" height="28" rx="7" fill="#0B1220" />
      <path
        d="M4.5 9.9c2.2-2.9 4.1-2.9 6.3 0s4.1 2.9 6.3 0 4.1-2.9 6.3 0"
        stroke="#7EB6FF"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M4.5 18.1c2.2-2.9 4.1-2.9 6.3 0s4.1 2.9 6.3 0 4.1-2.9 6.3 0"
        stroke="#FFFFFF"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LogoLockup() {
  return (
    <>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-[16px] font-bold tracking-[-0.02em] text-ink">
          SurfSyncMail
        </span>
        <span className="mt-[5px] text-[9px] font-medium uppercase tracking-[0.16em] text-faint">
          Business email hosting
        </span>
      </span>
    </>
  );
}

export function Logo() {
  return (
    <Link id="nav-logo" href="/" className="flex shrink-0 items-center gap-2.5 rounded-md">
      <LogoLockup />
    </Link>
  );
}
