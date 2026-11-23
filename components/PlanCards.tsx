import Link from "next/link";
import { formatInr, formatInrPaise } from "@/lib/format";
import { GST_PERCENT, monthlyGstPaise, monthlyTotalPaise, plans } from "@/lib/plans";

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-[#16a34a]">
      <path d="M4.2 9.2 7.4 12.4 13.8 5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlanCards() {
  return (
    <ul className="grid items-stretch gap-4 pt-4 md:grid-cols-2 xl:grid-cols-4">
      {plans.map((plan) => {
        const featured = plan.featured === true;
        return (
          <li
            key={plan.id}
            className={`relative flex h-full flex-col rounded-2xl bg-paper px-5 pb-6 pt-6 sm:px-6 ${
              featured ? "border-2 border-blue shadow-[0_12px_40px_rgba(37,99,235,0.12)]" : "border border-line"
            }`}
          >
            {featured ? (
              <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
                Best value
              </span>
            ) : null}
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[1.25rem] font-bold tracking-[-0.03em] text-ink">{plan.name}</h3>
              <span className="shrink-0 text-[13px] font-semibold text-[#f97316]">{plan.offPercent}% off</span>
            </div>
            <p className="mt-1 min-h-[2.5em] text-[13px] leading-snug text-body">{plan.suits}</p>
            <p className="mt-4 text-[15px] text-faint line-through tabular-nums">{formatInr(plan.wasMonthlyInr)}</p>
            <p className="mt-1 flex items-end gap-1">
              <span className="text-[2.6rem] font-bold leading-none tracking-[-0.045em] text-ink tabular-nums">
                {formatInr(plan.priceMonthlyInr)}
              </span>
              <span className="mb-1 text-[14px] text-faint">/mo</span>
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-body">
              GST {GST_PERCENT}% {formatInrPaise(monthlyGstPaise(plan))}. You pay {formatInrPaise(monthlyTotalPaise(plan))} each month.
            </p>
            <Link
              href={`/pricing/${plan.id}`}
              className={
                featured
                  ? "mt-5 inline-flex h-12 w-full items-center justify-center rounded-lg bg-blue text-[15px] font-semibold text-white transition-colors hover:bg-blue-hover"
                  : "mt-5 inline-flex h-12 w-full items-center justify-center rounded-lg border border-blue bg-paper text-[15px] font-semibold text-blue transition-colors hover:bg-pill"
              }
            >
              Choose {plan.name}
            </Link>
            <ul className="mt-6 space-y-3">
              {plan.notes.map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-[14px] leading-snug text-ink">
                  <Check />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <Link href="/features" className="mt-auto pt-5 text-[14px] font-semibold text-blue hover:underline">
              See all features
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
