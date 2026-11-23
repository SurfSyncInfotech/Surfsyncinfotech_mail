import type { Metadata } from "next";
import { ButtonLink, Container, Eyebrow, shellClass } from "@/components/chrome";
import { HeroTools } from "@/components/HeroTools";
import { MailboxStage } from "@/components/MailboxStage";
import { PhoneWorkflow } from "@/components/PhoneWorkflow";
import { PlanCards } from "@/components/PlanCards";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: { absolute: "SurfSync Mail" },
};

const heroButton = "!h-[51px] !rounded-md !px-6 !text-[15px]";

const tiles = [
  {
    src: "/mail-together.jpg",
    alt: "Two colleagues reading mail on a laptop",
    title: "Your domain",
    body: "Addresses like name@yourcompany. A shared door such as accounts@ sits beside them.",
  },
  {
    src: "/mail-laptop.jpg",
    alt: "A laptop open on a desk",
    title: "One mailbox each",
    body: "Inbox, sent, drafts, and search. Storage is counted on that mailbox, not pooled.",
  },
  {
    src: "/mail-window.jpg",
    alt: "Someone with a laptop by the window",
    title: "Admin in the same place",
    body: "Open a mailbox, set the quota, suspend it when someone leaves.",
  },
  {
    src: "/mail-phone.jpg",
    alt: "Mail open on a phone",
    title: "Phone and browser",
    body: "Webmail, plus IMAP and SMTP, so the same address opens in a mail app.",
  },
  {
    src: "/mail-desk.jpg",
    alt: "A desk ready for the day's mail",
    title: "One desk",
    body: "Open the mailbox, see who wrote, and reply from your own domain.",
  },
  {
    src: "/mail-group.jpg",
    alt: "A team gathered around a laptop",
    title: "The whole team",
    body: "Each person has a mailbox. A shared address can sit beside them.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-paper">
        <HeroTools />
        <div className={`${shellClass} relative z-10 flex min-h-[calc(100dvh-72px)] flex-col items-center justify-center py-24 text-center`}>
          <div className="reveal flex justify-center">
            <Eyebrow>Business email</Eyebrow>
          </div>
          <h1 className="reveal mt-5 max-w-[12em] text-[2.8rem] font-bold leading-[1.02] tracking-[-0.035em] text-ink sm:text-6xl lg:text-[4.4rem]">
            Email on your domain.
          </h1>
          <p className="reveal mt-6 max-w-[42ch] text-[17px] leading-[1.6] text-body [animation-delay:80ms] sm:text-[18px]">
            Mailboxes for the team, webmail, and admin controls. One monthly price.
          </p>
          <div className="reveal mt-8 flex flex-wrap justify-center gap-3 [animation-delay:160ms]">
            <ButtonLink href="/pricing" className={heroButton}>
              See plans
            </ButtonLink>
            <ButtonLink href="/features" variant="secondary" className={heroButton}>
              Features
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="inbox-well px-3 py-6 sm:px-5 lg:px-8 lg:py-10">
        <div className="mx-auto h-[min(720px,80vh)] min-h-[520px] max-w-[1180px]">
          <MailboxStage className="min-h-[520px]" />
        </div>
      </section>

      <Container>
        <Reveal>
          <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
            {tiles.map((tile) => (
              <li key={tile.title} className="overflow-hidden rounded-2xl border border-line bg-paper">
                <img src={tile.src} alt={tile.alt} className="aspect-[16/10] w-full object-cover" />
                <div className="p-5">
                  <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">{tile.title}</h2>
                  <p className="mt-2 text-[14px] leading-relaxed text-body">{tile.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal>
          <section className="mt-20 lg:mt-24">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-[2rem] font-bold tracking-[-0.03em] text-ink sm:text-[2.4rem]">
                  Plans
                </h2>
                <p className="mt-2 max-w-[46ch] text-[16px] leading-relaxed text-body">
                  Same mailbox on every plan. You pick the number of people and the storage.
                </p>
              </div>
            </div>
            <div className="mt-8">
              <PlanCards />
            </div>
          </section>
        </Reveal>
      </Container>

      <section className="mt-20 lg:mt-24">
        <Container>
          <h2 className="text-[2rem] font-bold tracking-[-0.03em] text-ink sm:text-[2.4rem]">
            On a phone
          </h2>
          <p className="mt-2 max-w-[42ch] text-[16px] leading-relaxed text-body">
            A letter arrives, opens, and the reply is sent from your domain.
          </p>
          <PhoneWorkflow />
        </Container>
      </section>

      <section className="mt-20 border-y border-line bg-paper lg:mt-24">
        <Container className="flex flex-col gap-6 py-12 sm:flex-row sm:items-center sm:justify-between md:py-14">
          <h2 className="max-w-[16ch] text-[1.8rem] font-bold tracking-[-0.03em] text-ink sm:text-[2rem]">
            Start with a plan that fits the team.
          </h2>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/pricing">View pricing</ButtonLink>
            <ButtonLink href="/features" variant="secondary">
              See features
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
