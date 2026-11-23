import type { Metadata } from "next";
import { ButtonLink, Container, PageIntro, shellClass } from "@/components/chrome";
import { MailPhotos } from "@/components/MailPhotos";
import { MailboxStage } from "@/components/MailboxStage";
import { PlanCards } from "@/components/PlanCards";

export const metadata: Metadata = {
  title: "Plans",
};

const questions = [
  ["What is different between plans?", "The monthly price, the number of mailboxes, and the storage on each mailbox."],
  ["Is storage shared?", "No. Each mailbox has its own storage."],
  ["Can I pay here?", "Yes. Choose a plan, enter the company, then pay the monthly price plus GST by card, UPI, or net banking."],
];

export default function PricingPage() {
  return (
    <Container className="pb-16">
      <PageIntro
        crumb="Pricing"
        eyebrow="Plans"
        title="Simple monthly pricing."
        lead="Desk ₹1, Studio ₹49, House ₹99, Hall ₹149 a month. Mail on your domain is on every plan."
      />
      <div className="mt-12">
        <PlanCards />
      </div>
      <MailPhotos className="mt-14" />

      <section className="mt-16 overflow-hidden rounded-3xl border border-line bg-paper lg:mt-20">
        <div className="grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className={`${shellClass} py-8 lg:py-10`}>
            <h2 className="text-[1.6rem] font-bold tracking-[-0.03em] text-ink">What you are buying</h2>
            <ul className="mt-5 space-y-3 text-[15px] text-ink">
              {["Domain email", "Webmail, IMAP, and SMTP", "Spam filtering", "Admin: open, quota, suspend"].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-blue" aria-hidden="true">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <ButtonLink href="/features" variant="secondary">
                Feature list
              </ButtonLink>
            </div>
          </div>
          <div className="border-t border-line p-4 lg:border-t-0 lg:border-l lg:p-6">
            <MailboxStage />
          </div>
        </div>
      </section>

      <section className="mt-16 lg:mt-20">
        <h2 className="text-[1.6rem] font-bold tracking-[-0.03em] text-ink">Questions</h2>
        <div className="mt-4 divide-y divide-line border-y border-line">
          {questions.map(([question, answer]) => (
            <details key={question} className="group py-4">
              <summary className="cursor-pointer list-none text-[16px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {question}
              </summary>
              <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-body">{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </Container>
  );
}
