import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CheckoutView } from "@/components/CheckoutView";
import { Container } from "@/components/chrome";
import { formatInr, formatInrPaise, formatStorage } from "@/lib/format";
import { getPlan, monthlyGstPaise, monthlyTotalPaise, plans } from "@/lib/plans";

export function generateStaticParams() {
  return plans.map((plan) => ({ plan: plan.id }));
}

type Props = { params: Promise<{ plan: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { plan: id } = await params;
  const plan = getPlan(id);
  return { title: plan ? `Company details · ${plan.name}` : "Company details" };
}

function CheckoutFallback() {
  return (
    <Container className="pb-16" aria-hidden="true">
      <div className="pt-14 sm:pt-[72px]">
        <div className="h-4 w-40 rounded bg-line" />
        <div className="mt-8 h-10 max-w-[24rem] rounded bg-line" />
      </div>
    </Container>
  );
}

export default function CheckoutPage({ params }: Props) {
  return (
    <Suspense fallback={<CheckoutFallback />}>
      <CheckoutBody params={params} />
    </Suspense>
  );
}

async function CheckoutBody({ params }: Props) {
  const { plan: id } = await params;
  const plan = getPlan(id);
  if (!plan) notFound();

  return (
    <Container className="pb-16">
      <CheckoutView
        planId={plan.id}
        planName={plan.name}
        featured={plan.featured}
        priceLabel={formatInr(plan.priceMonthlyInr)}
        gstLabel={formatInrPaise(monthlyGstPaise(plan))}
        totalLabel={formatInrPaise(monthlyTotalPaise(plan))}
        mailboxes={plan.mailboxes}
        storage={formatStorage(plan.storagePerMailboxGb)}
      />
    </Container>
  );
}
