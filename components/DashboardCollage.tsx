import { LogoMark } from "@/components/Logo";

const nav = [
  {
    label: "Overview",
    items: [
      ["Dashboard", true, "admin"],
      ["Companies", false, ""],
      ["Subscriptions", false, ""],
    ],
  },
  { label: "Catalogue", items: [["Plans", false, ""]] },
  {
    label: "Resources",
    items: [
      ["Domains", false, "domain"],
      ["Mailboxes", false, "mailbox"],
      ["Storage and usage", false, "storage"],
    ],
  },
  { label: "Finance", items: [["Billing and payments", false, ""]] },
  {
    label: "System",
    items: [
      ["Reports", false, ""],
      ["Audit logs", false, ""],
    ],
  },
] as const;

export function DashboardCollage() {
  return (
    <div className="product-screen relative mx-auto max-w-[1180px]">
      <div className="overflow-hidden rounded-[28px] border border-[#e6ebf2] bg-[#f4f7fb] shadow-[0_28px_80px_rgba(15,23,42,0.1)]">
        <div className="grid min-h-[640px] md:grid-cols-[228px_minmax(0,1fr)]">
          <aside className="hidden border-r border-[#e8edf5] bg-white px-4 py-5 md:block">
            <div className="flex items-center gap-2 px-1">
              <LogoMark size={32} />
              <span className="text-[15px] font-bold tracking-[-0.03em] text-[#0f172a]">SurfSyncMail</span>
            </div>
            <p className="mt-4 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">Super admin</p>
            {nav.map((group) => (
              <div key={group.label} className="mt-4">
                <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">{group.label}</p>
                <ul className="mt-1.5 space-y-0.5">
                  {group.items.map(([label, active, anchor]) => (
                    <li
                      key={label}
                      id={anchor || undefined}
                      className={
                        active
                          ? "flex items-center gap-2 rounded-lg bg-[#eef4ff] px-2.5 py-2 text-[13px] font-semibold text-[#1d4ed8]"
                          : "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-[#475569]"
                      }
                    >
                      <NavIcon name={label} />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </aside>

          <div className="min-w-0 px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">Super admin</p>
                <h2 className="text-[1.35rem] font-bold tracking-[-0.03em] text-[#0f172a]">Dashboard</h2>
                <p className="text-[13px] text-[#64748b]">Sample data for the frontend preview.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="relative grid h-9 w-9 place-items-center rounded-full border border-[#e6ebf2] bg-white text-[#475569]">
                  <Bell />
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#2563eb] px-1 text-[9px] font-bold text-white">
                    2
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff6df] px-3 py-1.5 text-[11px] font-semibold tracking-[0.04em] text-[#b45309]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
                  Preview · sample data
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#e6ebf2] bg-white py-1 pl-1 pr-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#eef4ff] text-[10px] font-bold text-[#1d4ed8]">PS</span>
                  <span className="leading-tight">
                    <span className="block text-[12px] font-semibold text-[#0f172a]">Priya Sharma</span>
                    <span className="block text-[10px] text-[#94a3b8]">Super admin</span>
                  </span>
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-lg border border-[#e6ebf2] bg-white px-3 py-2 text-[13px] font-semibold text-[#0f172a]">
                <ReportIcon /> Open reports
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563eb] px-3 py-2 text-[13px] font-semibold text-white">
                + Create company
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Stat label="Total companies" value="3" note="Sample records in this preview" tone="blue" icon="building" />
              <Stat label="Active companies" value="2" note="Mail flow enabled" tone="green" icon="check" />
              <Stat label="Suspended companies" value="1" note="Blocked after payment failures" tone="red" icon="alert" />
              <Stat label="Total mailboxes" value="74" note="Across all plans" tone="blue" icon="mail" />
              <Stat label="Storage used" value="2.84 TB" note="55.1% of 5.15 TB provisioned" tone="amber" icon="disk" />
              <Stat label="Monthly revenue" value="₹11,799" note="Recurring value of 2 active subscriptions" tone="blue" icon="card" />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Alert icon="globe" label="Domains awaiting verification" value="0" note="None pending" />
              <Alert icon="card" label="Failed payments to review" value="1" note="Kestrel & Co" hot />
              <Alert icon="mail" label="Mailboxes above 85% storage" value="0" note="All within quota" />
              <Alert icon="alert" label="Suspended companies" value="1" note="Mail flow is paused for the firm" hot />
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <section className="rounded-2xl border border-[#e6ebf2] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[14px] font-semibold text-[#0f172a]">Subscriptions over time</h3>
                    <p className="mt-0.5 text-[12px] text-[#94a3b8]">Active and suspended companies, December 2025 to now</p>
                  </div>
                  <p className="flex gap-3 text-[11px] text-[#64748b]">
                    <span className="inline-flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-[#2563eb]" /> Active</span>
                    <span className="inline-flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-[#fb923c]" /> Suspended</span>
                  </p>
                </div>
                <svg viewBox="0 0 320 110" className="mt-3 h-[110px] w-full" aria-hidden="true">
                  <path d="M0 78 C 40 70, 60 40, 100 48 S 160 86, 200 52 260 28, 320 36 V 110 H 0 Z" fill="#2563eb" opacity="0.12" />
                  <path d="M0 78 C 40 70, 60 40, 100 48 S 160 86, 200 52 260 28, 320 36" fill="none" stroke="#2563eb" strokeWidth="2.4" />
                  <path d="M0 96 C 50 92, 90 88, 140 90 S 220 84, 320 80" fill="none" stroke="#fb923c" strokeWidth="2.2" />
                </svg>
              </section>
              <section className="rounded-2xl border border-[#e6ebf2] bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-[14px] font-semibold text-[#0f172a]">Monthly revenue</h3>
                    <p className="mt-0.5 text-[12px] text-[#94a3b8]">Recurring subscription value, sample figures</p>
                  </div>
                  <span className="text-[12px] font-semibold text-[#2563eb]">Reports</span>
                </div>
                <svg viewBox="0 0 320 110" className="mt-3 h-[110px] w-full" aria-hidden="true">
                  {[40, 62, 48, 78, 70, 96].map((height, index) => (
                    <rect key={height} x={18 + index * 50} y={110 - height} width="26" height={height} rx="6" fill={index === 5 ? "#2563eb" : "#bfdbfe"} />
                  ))}
                </svg>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  tone,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  tone: "blue" | "green" | "red" | "amber";
  icon: "building" | "check" | "alert" | "mail" | "disk" | "card";
}) {
  const valueColor = tone === "green" ? "text-[#16a34a]" : tone === "red" ? "text-[#dc2626]" : tone === "amber" ? "text-[#d97706]" : "text-[#0f172a]";
  return (
    <article className="rounded-2xl border border-[#e6ebf2] bg-white px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">{label}</p>
        <NavIcon name={icon} />
      </div>
      <p className={`mt-2 text-[1.7rem] font-bold tracking-[-0.04em] ${valueColor}`}>{value}</p>
      <p className="mt-1 text-[12px] text-[#94a3b8]">{note}</p>
    </article>
  );
}

function Alert({
  icon,
  label,
  value,
  note,
  hot = false,
}: {
  icon: string;
  label: string;
  value: string;
  note: string;
  hot?: boolean;
}) {
  return (
    <article className="flex items-start justify-between gap-3 rounded-2xl border border-[#e6ebf2] bg-white px-3.5 py-3">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[12px] font-medium text-[#475569]">
          <NavIcon name={icon} />
          <span className="truncate">{label}</span>
        </p>
        <p className={`mt-1 text-[1.35rem] font-bold tracking-[-0.03em] ${hot ? "text-[#dc2626]" : "text-[#0f172a]"}`}>{value}</p>
        <p className="truncate text-[12px] text-[#94a3b8]">{note}</p>
      </div>
      <span className="text-[#94a3b8]" aria-hidden="true">→</span>
    </article>
  );
}

function Bell() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2.2a3.2 3.2 0 0 0-3.2 3.2v1.7c0 .5-.2 1-.5 1.4L3.2 10h9.6l-1.1-1.5c-.3-.4-.5-.9-.5-1.4V5.4A3.2 3.2 0 0 0 8 2.2Z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.6 11.2a1.4 1.4 0 0 0 2.8 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.5 8.5V6.5M7 8.5V4.5M9.5 8.5V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function NavIcon({ name }: { name: string }) {
  const common = { width: 14, height: 14, viewBox: "0 0 14 14", fill: "none", "aria-hidden": true } as const;
  if (name === "check") {
    return (
      <svg {...common}>
        <circle cx="7" cy="7" r="5.2" stroke="#16a34a" strokeWidth="1.3" />
        <path d="M4.6 7.1 6.2 8.7 9.4 5.4" stroke="#16a34a" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "alert" || name === "Suspended companies") {
    return (
      <svg {...common}>
        <path d="M7 2.2 12.2 11.5H1.8L7 2.2Z" stroke="#dc2626" strokeWidth="1.2" />
        <path d="M7 6v2.4" stroke="#dc2626" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "mail" || name === "Mailboxes") {
    return (
      <svg {...common}>
        <rect x="1.8" y="3.2" width="10.4" height="7.6" rx="1.4" stroke="#64748b" strokeWidth="1.2" />
        <path d="M2.2 4.2 7 7.6l4.8-3.4" stroke="#64748b" strokeWidth="1.2" />
      </svg>
    );
  }
  if (name === "disk" || name === "Storage and usage") {
    return (
      <svg {...common}>
        <ellipse cx="7" cy="4" rx="4.2" ry="1.6" stroke="#d97706" strokeWidth="1.2" />
        <path d="M2.8 4v6c0 .9 1.9 1.6 4.2 1.6s4.2-.7 4.2-1.6V4" stroke="#d97706" strokeWidth="1.2" />
      </svg>
    );
  }
  if (name === "card" || name === "Billing and payments") {
    return (
      <svg {...common}>
        <rect x="1.6" y="3" width="10.8" height="8" rx="1.4" stroke="#2563eb" strokeWidth="1.2" />
        <path d="M1.6 5.6h10.8" stroke="#2563eb" strokeWidth="1.2" />
      </svg>
    );
  }
  if (name === "globe" || name === "Domains") {
    return (
      <svg {...common}>
        <circle cx="7" cy="7" r="5" stroke="#64748b" strokeWidth="1.2" />
        <path d="M2 7h10M7 2c1.6 1.6 1.6 8.4 0 10M7 2c-1.6 1.6-1.6 8.4 0 10" stroke="#64748b" strokeWidth="1.2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="2" y="2" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="8" y="2" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="2" y="8" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="8" y="8" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
