"use client";

import { useState } from "react";
import { CompanyForm } from "@/components/CompanyForm";
import { PageIntro } from "@/components/chrome";
import type { Plan } from "@/lib/plans";

export function CheckoutView({
  planId,
  planName,
  featured,
  priceLabel,
  gstLabel,
  totalLabel,
  mailboxes,
  storage,
}: {
  planId: Plan["id"];
  planName: string;
  featured?: boolean;
  priceLabel: string;
  gstLabel: string;
  totalLabel: string;
  mailboxes: number;
  storage: string;
}) {
  const [paid, setPaid] = useState(false);

  return (
    <>
      {paid ? null : (
        <PageIntro
          crumb="Company details"
          parents={[
            { href: "/pricing", label: "Pricing" },
            { href: `/pricing/${planId}`, label: planName },
          ]}
          eyebrow={planName}
          title="Tell us about the company."
          lead="The plan stays on the monthly price you already chose. Payment is the step after these details."
        />
      )}
      <div className={paid ? "" : "mt-10"}>
        <CompanyForm
          planId={planId}
          planName={planName}
          featured={featured}
          priceLabel={priceLabel}
          gstLabel={gstLabel}
          totalLabel={totalLabel}
          mailboxes={mailboxes}
          storage={storage}
          onPaid={() => setPaid(true)}
        />
      </div>
    </>
  );
}
