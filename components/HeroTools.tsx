export function HeroTools() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-24 top-[12%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.20),transparent_68%)] blur-2xl" />
      <div className="absolute -right-16 bottom-[8%] h-[440px] w-[440px] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.22),transparent_70%)] blur-2xl" />
      <div className="absolute left-[12%] top-[28%] h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.28),transparent_70%)] blur-xl" />
      <div className="absolute right-[14%] top-[22%] h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.18),transparent_70%)] blur-xl" />

      <svg className="absolute left-0 top-0 h-full w-[30%]" viewBox="0 0 360 800" preserveAspectRatio="none" fill="none">
        <path d="M-20 90C120 40 80 220 180 280C280 340 40 460 150 620C210 710 80 760 40 800" stroke="url(#hero-curve-l)" strokeWidth="26" strokeLinecap="round" />
        <path d="M40 160C150 120 90 300 200 370" stroke="#67e8f9" strokeOpacity="0.45" strokeWidth="10" strokeLinecap="round" />
        <defs>
          <linearGradient id="hero-curve-l" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
            <stop offset="45%" stopColor="#2563eb" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <svg className="absolute right-0 top-0 h-full w-[30%]" viewBox="0 0 360 800" preserveAspectRatio="none" fill="none">
        <path d="M380 70C240 30 300 210 190 280C80 350 320 470 200 630C140 720 280 770 330 810" stroke="url(#hero-curve-r)" strokeWidth="26" strokeLinecap="round" />
        <path d="M320 150C210 120 280 280 160 360" stroke="#38bdf8" strokeOpacity="0.4" strokeWidth="10" strokeLinecap="round" />
        <defs>
          <linearGradient id="hero-curve-r" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="50%" stopColor="#2563eb" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#67e8f9" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-x-0 top-0 flex h-[calc(50%-10.75rem)] items-end justify-between gap-2 overflow-hidden px-[clamp(8px,3vw,28px)] pb-1 min-[1180px]:hidden">
        <img src="/hero-inbox.png" alt="" className="h-full w-[min(46%,220px)] object-contain object-left-bottom" />
        <img src="/hero-security.png" alt="" className="h-full w-[min(46%,220px)] object-contain object-right-bottom" />
      </div>

      <div className="absolute inset-y-0 left-0 hidden w-[calc((100%-52rem)/2)] items-center justify-end pr-1 min-[1180px]:flex">
        <img src="/hero-inbox.png" alt="" className="tool-float max-h-[min(520px,64vh)] w-full max-w-[380px] object-contain" />
      </div>
      <div className="absolute inset-y-0 right-0 hidden w-[calc((100%-52rem)/2)] items-center justify-start pl-1 min-[1180px]:flex">
        <img
          src="/hero-security.png"
          alt=""
          className="tool-float max-h-[min(520px,64vh)] w-full max-w-[360px] object-contain [animation-delay:0.8s]"
        />
      </div>
    </div>
  );
}
