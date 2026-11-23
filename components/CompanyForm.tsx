"use client";

import Script from "next/script";
import { useState, useRef, type FormEvent } from "react";
import { validateCheckout } from "@/lib/checkout";
import { printReceipt } from "@/lib/receipt";
import type { Plan } from "@/lib/plans";
import type { PaymentMethod } from "@/lib/orders";
import { Breadcrumb, ButtonLink, Eyebrow, buttonClass } from "@/components/chrome";

type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  config: {
    display: {
      blocks: Record<string, { name: string; instruments: { method: PaymentMethod; flows?: Array<"collect" | "qr" | "intent"> }[] }>;
      sequence: string[];
      preferences: { show_default_blocks: boolean };
    };
  };
  handler: (response: RazorpaySuccess) => void;
  modal: { ondismiss: () => void };
  theme: { color: string };
};

type RazorpayCheckout = {
  open: () => void;
  on: (event: "payment.failed", callback: (response: { error?: { description?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout;
  }
}

const payChoices: { method: PaymentMethod; label: string; line: string }[] = [
  { method: "card", label: "Card", line: "Debit or credit card" },
  { method: "upi", label: "UPI", line: "QR code or UPI id" },
  { method: "netbanking", label: "Net banking", line: "Pay from your bank" },
];

export function CompanyForm({
  planId,
  planName,
  featured,
  priceLabel,
  gstLabel,
  totalLabel,
  mailboxes,
  storage,
  onPaid,
}: {
  planId: Plan["id"];
  planName: string;
  featured?: boolean;
  priceLabel: string;
  gstLabel: string;
  totalLabel: string;
  mailboxes: number;
  storage: string;
  onPaid?: () => void;
}) {
  const [companyName, setCompanyName] = useState("");
  const [companyDomain, setCompanyDomain] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState<{ id: string; totalLabel: string } | null>(null);
  const [paid, setPaid] = useState(false);
  const [paidWith, setPaidWith] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [upiOpen, setUpiOpen] = useState(false);
  const [vpa, setVpa] = useState("");
  const paymentFinished = useRef(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const parsed = validateCheckout({
      planId,
      companyName,
      companyDomain,
      adminName,
      adminEmail,
      contactNumber,
    });
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.value),
      });
      const body = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !body.id) {
        setError(body.error ?? "The company details could not be saved.");
        return;
      }
      setSaved({ id: body.id, totalLabel });
    } catch {
      setError("The company details could not be saved.");
    } finally {
      setPending(false);
    }
  }

  function markPaid(method: PaymentMethod) {
    setPaidWith(payChoices.find((choice) => choice.method === method)?.label ?? "Card");
    setPaidAt(new Date().toISOString());
    setPaid(true);
    setError("");
    onPaid?.();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function confirmPayment(checkoutId: string, response: RazorpaySuccess, method: PaymentMethod) {
    setPending(true);
    try {
      const result = await fetch(`/api/checkout/${checkoutId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(response),
      });
      const body = (await result.json()) as { error?: string };
      if (!result.ok) {
        setError(body.error ?? "Payment could not be verified.");
        return;
      }
      markPaid(method);
    } catch {
      setError("Payment could not be verified.");
    } finally {
      setPending(false);
    }
  }

  async function pay(method: PaymentMethod) {
    if (!saved || paid) return;
    setError("");
    setPending(true);
    paymentFinished.current = false;
    try {
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => {
            window.removeEventListener("ss-razorpay-ready", ready);
            reject(new Error("timeout"));
          }, 8000);
          const ready = () => {
            window.clearTimeout(timeout);
            resolve();
          };
          window.addEventListener("ss-razorpay-ready", ready, { once: true });
          if (window.Razorpay) ready();
        });
      }
      const response = await fetch(`/api/checkout/${saved.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
      });
      const body = (await response.json()) as {
        error?: string;
        keyId?: string;
        razorpayOrderId?: string;
        amount?: number;
        currency?: "INR";
        adminName?: string;
        adminEmail?: string;
        contactNumber?: string;
        planName?: string;
      };
      if (!response.ok || !body.keyId || !body.razorpayOrderId || !window.Razorpay) {
        setError(body.error ?? "The payment desk could not open.");
        setPending(false);
        return;
      }
      const checkoutId = saved.id;
      const checkout = new window.Razorpay({
        key: body.keyId,
        amount: body.amount ?? 0,
        currency: "INR",
        name: "SurfSync Mail",
        description: `${body.planName ?? planName} monthly plan`,
        order_id: body.razorpayOrderId,
        prefill: {
          name: body.adminName ?? adminName,
          email: body.adminEmail ?? adminEmail,
          contact: body.contactNumber ?? contactNumber,
        },
        config: {
          display: {
            blocks: {
              chosen: {
                name: payChoices.find((choice) => choice.method === method)?.label ?? "Pay",
                instruments: [method === "upi" ? { method, flows: ["qr"] } : { method }],
              },
            },
            sequence: ["block.chosen"],
            preferences: { show_default_blocks: false },
          },
        },
        theme: { color: "#2563eb" },
        handler: (payment) => {
          paymentFinished.current = true;
          void confirmPayment(checkoutId, payment, method);
        },
        modal: {
          ondismiss: () => {
            if (paymentFinished.current) return;
            setPending(false);
            setError("Payment was closed before it finished. The company details are still saved.");
          },
        },
      });
      checkout.on("payment.failed", (failure) => {
        paymentFinished.current = true;
        setPending(false);
        setError(failure.error?.description ?? "Payment did not go through. You can try again.");
      });
      checkout.open();
    } catch {
      setError("The payment desk could not open.");
      setPending(false);
    }
  }

  async function payWithVpa() {
    if (!saved || paid) return;
    setError("");
    setPending(true);
    const send = async (refresh: boolean) => {
      const response = await fetch(`/api/checkout/${saved.id}/upi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(refresh ? { refresh: true } : { vpa }),
      });
      const body = (await response.json()) as { status?: string; error?: string };
      return { ok: response.ok, body };
    };
    try {
      let result = await send(false);
      if (!result.ok || result.body.status === "failed") {
        setError(result.body.error ?? "The UPI request could not be sent.");
        return;
      }
      if (result.body.status === "paid") {
        markPaid("upi");
        return;
      }
      for (let attempt = 0; attempt < 15; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 3000));
        result = await send(true);
        if (result.body.status === "paid") {
          markPaid("upi");
          return;
        }
        if (!result.ok || result.body.status === "failed") {
          setError(result.body.error ?? "The UPI payment did not go through.");
          return;
        }
      }
      setError("Approve the request in your UPI app, then send it again.");
    } catch {
      setError("The UPI request could not be sent.");
    } finally {
      setPending(false);
    }
  }

  if (saved && paid) {
    return (
      <PaymentReceived
        planId={planId}
        planName={planName}
        companyName={companyName.trim()}
        companyDomain={companyDomain.trim()}
        adminName={adminName.trim()}
        adminEmail={adminEmail.trim()}
        contactNumber={contactNumber.trim()}
        priceLabel={priceLabel}
        gstLabel={gstLabel}
        totalLabel={saved.totalLabel}
        mailboxes={mailboxes}
        storage={storage}
        requestId={saved.id}
        paidWith={paidWith}
        paidAt={paidAt}
      />
    );
  }

  if (saved) {
    return (
      <section className="rounded-2xl border border-line bg-paper p-6 sm:p-8">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-blue">Company details saved</p>
        <h2 className="mt-3 text-[1.6rem] font-bold tracking-[-0.03em] text-ink">Pay {saved.totalLabel} this month.</h2>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-body">
          {`${companyName.trim()} is saved on the ${planName} plan. Choose how you want to pay. Card details and the QR stay inside Razorpay. A UPI id is sent as a payment request.`}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {payChoices.map((choice) => {
              const selected = choice.method === "upi" && upiOpen;
              return (
                <button
                  key={choice.method}
                  type="button"
                  disabled={pending}
                  aria-pressed={selected}
                  onClick={() => {
                    setError("");
                    if (choice.method === "upi") {
                      setUpiOpen(true);
                      return;
                    }
                    setUpiOpen(false);
                    void pay(choice.method);
                  }}
                  className={`flex min-h-[108px] flex-col items-start rounded-xl border px-4 py-3.5 text-left transition disabled:opacity-60 ${
                    selected ? "border-blue bg-[#eef4ff]" : "border-line bg-paper hover:border-blue"
                  }`}
                >
                  <PayGlyph method={choice.method} />
                  <span className="mt-3 text-[15px] font-semibold text-ink">{choice.label}</span>
                  <span className="mt-1 text-[12px] leading-relaxed text-body">{choice.line}</span>
                </button>
              );
            })}
          </div>
        {upiOpen ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-paper p-4">
              <p className="text-[15px] font-semibold text-ink">Scan QR</p>
              <p className="mt-1 text-[13px] leading-relaxed text-body">Opens the code. Scan it with a UPI app on your phone.</p>
              <button
                type="button"
                disabled={pending}
                onClick={() => void pay("upi")}
                className="mt-4 inline-flex h-10 items-center rounded-lg bg-blue px-4 text-[14px] font-semibold text-white hover:bg-blue-hover disabled:opacity-60"
              >
                {pending ? "Please wait" : "Show QR"}
              </button>
            </div>
            <form
              className="rounded-xl border border-line bg-paper p-4"
              onSubmit={(event) => {
                event.preventDefault();
                void payWithVpa();
              }}
            >
              <label htmlFor="upi-id" className="text-[15px] font-semibold text-ink">
                UPI id
              </label>
              <p className="mt-1 text-[13px] leading-relaxed text-body">Type the id from your UPI app. We send a request to it.</p>
              <input
                id="upi-id"
                value={vpa}
                onChange={(event) => setVpa(event.target.value)}
                placeholder="e.g. name@okaxis"
                autoComplete="off"
                spellCheck={false}
                className="mt-3 h-11 w-full rounded-lg border border-line bg-paper px-3 text-[15px] text-ink outline-none placeholder:text-faint focus:border-blue"
              />
              <button
                type="submit"
                disabled={pending || vpa.trim().length < 3}
                className="mt-3 inline-flex h-10 items-center rounded-lg bg-blue px-4 text-[14px] font-semibold text-white hover:bg-blue-hover disabled:opacity-60"
              >
                {pending ? "Please wait" : "Send request"}
              </button>
            </form>
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="mt-5 text-[14px] font-medium text-[#b91c1c]">
            {error}
          </p>
        ) : null}
        <p className="mt-5 text-[14px] text-faint">
          Request <span className="font-semibold text-ink">{saved.id}</span>
        </p>
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="afterInteractive"
          onLoad={() => window.dispatchEvent(new Event("ss-razorpay-ready"))}
        />
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]" noValidate>
      <div className="rounded-2xl border border-line bg-paper p-5 sm:p-7">
        <section>
          <h2 className="text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">Company details</h2>
          <p className="mt-1 text-[14px] leading-relaxed text-body">
            Use the domain you already own. You will need access to its DNS settings to verify mail later.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field
              label="Company name"
              value={companyName}
              onChange={setCompanyName}
              autoComplete="organization"
              placeholder="e.g. Northwind Logistics"
            />
            <Field
              label="Company domain"
              value={companyDomain}
              onChange={setCompanyDomain}
              autoComplete="url"
              placeholder="e.g. northwind.co"
              hint="Domain only. No www and no https."
            />
          </div>
        </section>
        <section className="mt-8 border-t border-line pt-8">
          <h2 className="text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">Administrator account</h2>
          <p className="mt-1 text-[14px] leading-relaxed text-body">
            This person will manage mailboxes, access, and company settings once onboarding completes.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field
              label="Admin full name"
              value={adminName}
              onChange={setAdminName}
              autoComplete="name"
              placeholder="e.g. Ananya Kapoor"
            />
            <Field
              label="Business email"
              value={adminEmail}
              onChange={setAdminEmail}
              type="email"
              autoComplete="email"
              placeholder="e.g. ananya@northwind.co"
              hint="Use the same domain as the company. ananya@gmail.com will not be accepted."
            />
            <Field
              label="Contact number"
              value={contactNumber}
              onChange={setContactNumber}
              type="tel"
              autoComplete="tel"
              placeholder="e.g. 9876543210"
              hint="10-digit Indian mobile number, starting with 6, 7, 8, or 9."
            />
          </div>
        </section>
        {error ? (
          <p role="alert" className="mt-5 text-[14px] font-medium text-[#b91c1c]">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-blue px-5 text-[15px] font-semibold text-white transition-colors hover:bg-blue-hover disabled:opacity-60"
        >
          {pending ? "Saving" : "Save company details"}
        </button>
      </div>

      <aside className="rounded-2xl border border-line bg-paper p-5 sm:p-6 lg:sticky lg:top-24">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">Selected subscription</p>
        <div className="mt-3 flex items-center gap-2">
          <h2 className="text-[1.35rem] font-bold tracking-[-0.03em] text-ink">{planName}</h2>
          {featured ? (
            <span className="rounded-full bg-[#eef4ff] px-2 py-0.5 text-[11px] font-semibold text-blue">Most chosen</span>
          ) : null}
        </div>
        <p className="mt-4 text-[2rem] font-bold leading-none tracking-[-0.04em] text-ink tabular-nums">
          {priceLabel}
          <span className="ml-1 text-[14px] font-medium text-faint">/ month</span>
        </p>
        <p className="mt-2 text-[13px] text-body">GST 18% {gstLabel}</p>
        <p className="mt-1 text-[14px] font-semibold text-ink">You pay {totalLabel} each month</p>
        <dl className="mt-5 space-y-3 border-t border-line pt-4 text-[14px]">
          <div className="flex justify-between gap-3">
            <dt className="text-body">Mailboxes</dt>
            <dd className="font-semibold text-ink">{mailboxes}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-body">Storage</dt>
            <dd className="font-semibold text-ink">{storage} each</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-body">Billing</dt>
            <dd className="font-semibold text-ink">Monthly</dd>
          </div>
        </dl>
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-[13px] font-semibold text-ink">What happens next</p>
          <p className="mt-2 text-[13px] leading-relaxed text-body">These details are saved with the plan. Payment opens after this step.</p>
        </div>
      </aside>
    </form>
  );
}

function PaymentReceived({
  planId,
  planName,
  companyName,
  companyDomain,
  adminName,
  adminEmail,
  contactNumber,
  priceLabel,
  gstLabel,
  totalLabel,
  mailboxes,
  storage,
  requestId,
  paidWith,
  paidAt,
}: {
  planId: string;
  planName: string;
  companyName: string;
  companyDomain: string;
  adminName: string;
  adminEmail: string;
  contactNumber: string;
  priceLabel: string;
  gstLabel: string;
  totalLabel: string;
  mailboxes: number;
  storage: string;
  requestId: string;
  paidWith: string;
  paidAt: string;
}) {
  const [copied, setCopied] = useState(false);
  const [issuedAt] = useState(() => paidAt || new Date().toISOString());

  async function copyRequest() {
    try {
      await navigator.clipboard.writeText(requestId);
      setCopied(true);
    } catch {
      try {
        const area = document.createElement("textarea");
        area.value = requestId;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.append(area);
        area.select();
        setCopied(document.execCommand("copy"));
        area.remove();
      } catch {
        setCopied(false);
      }
    }
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="pt-14 sm:pt-[72px]">
      <Breadcrumb
        current="Payment received"
        parents={[
          { href: "/pricing", label: "Pricing" },
          { href: `/pricing/${planId}`, label: planName },
        ]}
      />
      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.9fr)] lg:gap-12">
        <div>
          <Eyebrow>Payment complete</Eyebrow>
          <h1 className="mt-4 text-[2.35rem] font-bold leading-[1.08] tracking-[-0.03em] text-ink sm:text-5xl">
            Payment received.
          </h1>
          <p className="mt-6 max-w-[42ch] text-[17px] leading-[1.7] text-body sm:text-[18px]">
            {companyName} is paid for the {planName} plan. The charge for this month is {totalLabel}, including GST.
          </p>
          <p className="mt-4 max-w-[42ch] text-[15px] leading-relaxed text-body">
            This request is saved. The mailbox is opened from these company details after they are checked. Sign-in on this site opens later.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                printReceipt({
                  requestId,
                  paidAt: issuedAt,
                  companyName,
                  companyDomain,
                  adminName,
                  adminEmail,
                  contactNumber,
                  planName,
                  mailboxes,
                  storage,
                  priceLabel,
                  gstLabel,
                  totalLabel,
                  paidWith,
                })
              }
              className={buttonClass.primary}
            >
              Download receipt
            </button>
            <ButtonLink href="/pricing" variant="secondary">
              Back to plans
            </ButtonLink>
          </div>
          <p className="mt-3 max-w-[42ch] text-[13px] leading-relaxed text-faint">
            A save window opens. Choose Save as PDF, and turn off headers and footers if the browser offers that.
          </p>
        </div>

        <article className="overflow-hidden rounded-2xl border border-line bg-paper">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-6">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-blue">Paid this month</p>
              <p className="mt-2 text-[2.15rem] font-bold leading-none tracking-[-0.04em] text-ink tabular-nums">{totalLabel}</p>
              <p className="mt-2 text-[13px] text-body">Including GST</p>
            </div>
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-blue text-white" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="11" r="9.25" stroke="currentColor" strokeWidth="1.5" />
                <path d="M6.5 11.2 9.4 14.1 15.5 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
          <dl className="divide-y divide-line px-5 sm:px-6">
            <ReceiptRow label="Company" value={companyName} />
            <ReceiptRow label="Domain" value={companyDomain} />
            <ReceiptRow label="Plan" value={planName} />
            <ReceiptRow label="Mailboxes" value={String(mailboxes)} />
            <ReceiptRow label="Storage" value={`${storage} each`} />
            <ReceiptRow label="Administrator" value={adminName} />
            <ReceiptRow label="Email" value={adminEmail} />
            <ReceiptRow label="Contact" value={contactNumber} />
            <ReceiptRow label="Plan price" value={`${priceLabel} / month`} />
            <ReceiptRow label="GST 18%" value={gstLabel} />
            {paidWith ? <ReceiptRow label="Paid with" value={paidWith} /> : null}
          </dl>
          <div className="flex items-center justify-between gap-3 border-t border-line bg-page px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">Request</p>
              <p className="mt-1 truncate text-[14px] font-semibold text-ink">{requestId}</p>
            </div>
            <button type="button" onClick={() => void copyRequest()} className={`${buttonClass.secondary} shrink-0 px-3`}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3.5">
      <dt className="shrink-0 text-[13px] text-faint">{label}</dt>
      <dd className="min-w-0 text-right text-[14px] font-semibold break-words text-ink">{value}</dd>
    </div>
  );
}

function PayGlyph({ method }: { method: PaymentMethod }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true as const };
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef4ff] text-blue">
      {method === "card" ? (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      ) : null}
      {method === "upi" ? (
        <svg {...common}>
          <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
          <rect x="14" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
          <rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
          <path d="M14 17h6M17 14v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ) : null}
      {method === "netbanking" ? (
        <svg {...common}>
          <path d="M4 10 12 4l8 6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M6 10v8h12v-8" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10 18v-4h4v4" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      ) : null}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <label htmlFor={id} className="block">
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-11 w-full rounded-lg border border-line bg-paper px-3 text-[15px] text-ink outline-none placeholder:text-faint focus:border-blue"
      />
      {hint ? <span className="mt-1.5 block text-[12px] leading-relaxed text-faint">{hint}</span> : null}
    </label>
  );
}
