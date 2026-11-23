import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink, Container, PageIntro } from "@/components/chrome";
import { formatInr, formatInrPaise, formatStorage } from "@/lib/format";
import { getPlan, GST_PERCENT, monthlyGstPaise, monthlyTotalPaise, plans, type Plan } from "@/lib/plans";

const story: Record<
  Plan["id"],
  {
    image: string;
    imageAlt: string;
    aside: string;
    asideAlt: string;
    body: string[];
    day: string;
  }
> = {
  desk: {
    image: "/mail-together.jpg",
    imageAlt: "A principal and a colleague reading mail together on a laptop",
    aside: "/mail-laptop.jpg",
    asideAlt: "Hands opening mail on a laptop, with envelopes on the desk",
    day: "Who it fits",
    body: ["Three mailboxes, 10 GB each. Aliases, one shared address, and the same admin tools as the larger plans."],
  },
  studio: {
    image: "/mail-desk.jpg",
    imageAlt: "A working desk with a laptop and a notebook",
    aside: "/mail-phone.jpg",
    asideAlt: "A phone showing a mailbox beside a notebook",
    day: "Who it fits",
    body: ["Ten mailboxes, 25 GB each. Group addresses and a visible quota on every mailbox."],
  },
  house: {
    image: "/mail-group.jpg",
    imageAlt: "A firm gathered around a table",
    aside: "/mail-window.jpg",
    asideAlt: "A quiet room with a window, used as a place to read mail",
    day: "Who it fits",
    body: ["Twenty-five mailboxes, 50 GB each. Admin controls and backups are included."],
  },
  hall: {
    image: "/mail-laptop.jpg",
    imageAlt: "A laptop open on a desk",
    aside: "/mail-together.jpg",
    asideAlt: "Two colleagues reading mail together",
    day: "Who it fits",
    body: ["Fifty mailboxes, 100 GB each. Room for departments, with storage counted on the mailbox."],
  },
};

export function generateStaticParams() {
  return plans.map((plan) => ({ plan: plan.id }));
}

type Props = { params: Promise<{ plan: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { plan: id } = await params;
  const plan = getPlan(id);
  return { title: plan ? plan.name : "Plan" };
}

function PlanFallback() {
  return (
    <Container className="pb-8" aria-hidden="true">
      <div className="pt-14 sm:pt-[72px]">
        <div className="h-4 w-36 rounded bg-line" />
        <div className="mt-10 h-4 w-24 rounded bg-line" />
        <div className="mt-4 h-12 max-w-[28rem] rounded bg-line" />
        <div className="mt-6 h-6 max-w-[36rem] rounded bg-line" />
      </div>
    </Container>
  );
}

export default function PlanPage({ params }: Props) {
  return (
    <Suspense fallback={<PlanFallback />}>
      <PlanBody params={params} />
    </Suspense>
  );
}

async function PlanBody({ params }: Props) {
  const { plan: id } = await params;
  const plan = getPlan(id);
  if (!plan) notFound();

  const copy = story[plan.id];
  const others = plans.filter((item) => item.id !== plan.id);

  return (
    <Container className="pb-8">
      <PageIntro
        crumb={plan.name}
        parents={[{ href: "/pricing", label: "Pricing" }]}
        eyebrow={`${plan.name} plan`}
        title={plan.suits}
        lead={`${formatInr(plan.priceMonthlyInr)} a month, plus GST ${GST_PERCENT}% (${formatInrPaise(monthlyGstPaise(plan))}). You pay ${formatInrPaise(monthlyTotalPaise(plan))} each month. ${plan.mailboxes} mailboxes, each with ${formatStorage(plan.storagePerMailboxGb)} of its own.`}
      >
        <ButtonLink href={`/checkout/${plan.id}`}>
          Continue with {plan.name}
        </ButtonLink>
        <ButtonLink href="/pricing" variant="secondary">
          All plans
        </ButtonLink>
      </PageIntro>

      <div className="mt-12 grid items-stretch gap-5 lg:mt-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <img
          src={copy.image}
          alt={copy.imageAlt}
          className="aspect-[16/10] w-full rounded-2xl object-cover"
        />
        <dl className="flex flex-col justify-center gap-6 rounded-2xl border border-line bg-paper p-6 sm:flex-row sm:gap-8 sm:p-8 lg:flex-col">
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-[0.14em] text-faint">
              Monthly price
            </dt>
            <dd className="mt-2 text-[2rem] font-bold tracking-[-0.03em] text-ink tabular-nums">
              {formatInr(plan.priceMonthlyInr)}
              <span className="ml-2 text-[15px] font-medium text-faint line-through">{formatInr(plan.wasMonthlyInr)}</span>
            </dd>
            <p className="mt-2 text-[14px] leading-relaxed text-body">
              GST {GST_PERCENT}% {formatInrPaise(monthlyGstPaise(plan))}. You pay {formatInrPaise(monthlyTotalPaise(plan))} each month.
            </p>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-[0.14em] text-faint">
              Mailboxes
            </dt>
            <dd className="mt-2 text-[2rem] font-bold tracking-[-0.03em] text-ink tabular-nums">
              {plan.mailboxes}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-[0.14em] text-faint">
              Storage each
            </dt>
            <dd className="mt-2 text-[2rem] font-bold tracking-[-0.03em] text-ink tabular-nums">
              {formatStorage(plan.storagePerMailboxGb)}
            </dd>
          </div>
        </dl>
      </div>

      <section className="mt-16 grid gap-10 lg:mt-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)] lg:gap-16">
        <div>
          <h2 className="text-[2rem] font-bold leading-[1.15] tracking-[-0.03em] text-ink">
            {copy.day}
          </h2>
          <div className="mt-6 space-y-5 text-[17px] leading-[1.75] text-body">
            {copy.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-faint">
            Included
          </h2>
          <ul className="mt-4 border-t border-line">
            {plan.notes.map((note) => (
              <li
                key={note}
                className="border-b border-line py-3.5 text-[16px] leading-relaxed text-ink"
              >
                {note}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[15px] leading-[1.7] text-body">
            Continue to enter the company and the administrator. The charge stays the monthly price plus GST.
          </p>
        </div>
      </section>

      <figure className="mt-16 overflow-hidden rounded-2xl border border-line bg-paper lg:mt-20">
        <img
          src={copy.aside}
          alt={copy.asideAlt}
          className="aspect-[16/7] w-full object-cover"
        />
      </figure>

      <section className="mt-16 lg:mt-20">
        <h2 className="text-[2rem] font-bold leading-[1.15] tracking-[-0.03em] text-ink">
          The other sizes
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {others.map((item) => (
            <li key={item.id} className="rounded-2xl border border-line bg-paper p-6">
              <h3 className="text-[1.2rem] font-semibold tracking-[-0.02em] text-ink">
                {item.name}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-body">{item.suits}</p>
              <p className="mt-4 text-[15px] text-body">
                <span className="text-[1.35rem] font-semibold tabular-nums text-ink">
                  {formatInr(item.priceMonthlyInr)}
                </span>{" "}
                <span className="text-faint">/ month</span>
              </p>
              <p className="mt-2 text-[14px] text-faint">
                {item.mailboxes} mailboxes · {formatStorage(item.storagePerMailboxGb)} each
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-body">
                GST {GST_PERCENT}% {formatInrPaise(monthlyGstPaise(item))}. You pay {formatInrPaise(monthlyTotalPaise(item))} each month.
              </p>
              <div className="mt-5">
                <ButtonLink href={`/pricing/${item.id}`} variant="secondary">
                  View {item.name}
                </ButtonLink>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-8">
          <Link href="/pricing" className="text-link text-[15px] font-semibold">
            Compare all three plans
          </Link>
        </p>
      </section>
    </Container>
  );
}
