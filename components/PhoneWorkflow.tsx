"use client";

import { useEffect, useState, type ReactNode } from "react";

const LETTERS = [
  {
    initial: "R",
    from: "Reception",
    address: "reception@thefirm",
    subject: "Visitor at four",
    preview: "A guest is expected this afternoon.",
    time: "09:14",
    body: "A guest is expected at four. The name is with the desk, so the afternoon is not a surprise.",
    reply: "We’ll be ready at four. The note stays in this mailbox.",
  },
  {
    initial: "A",
    from: "Accounts",
    address: "accounts@thefirm",
    subject: "March statement",
    preview: "Filed and ready for the partners.",
    time: "08:41",
    body: "The March statement is in the thread. It sits on the firm’s domain, counted on this mailbox.",
    reply: "Received. I’ll read it before the partners’ meeting.",
  },
  {
    initial: "S",
    from: "Studio",
    address: "studio@thefirm",
    subject: "Boards on Friday",
    preview: "The room is held. Boards are in the thread.",
    time: "Mon",
    body: "Friday’s review is with the group. The boards travelled with the message.",
    reply: "Friday is held. I’ll bring the boards from this mailbox.",
  },
  {
    initial: "P",
    from: "Principal",
    address: "principal@thefirm",
    subject: "Draft for the partners",
    preview: "Still a draft.",
    time: "Yesterday",
    body: "The draft stays here until it is ready, then leaves from the firm’s own address.",
    reply: "Hold the draft. I’ll send it from principal@thefirm.",
  },
] as const;

function useMailStep() {
  const [step, setStep] = useState(0);
  const [motion, setMotion] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setMotion(!media.matches);
    apply();
    media.addEventListener("change", apply);
    if (media.matches) return () => media.removeEventListener("change", apply);
    const id = window.setInterval(() => {
      setStep((current) => (current + 1) % LETTERS.length);
    }, 2800);
    return () => {
      window.clearInterval(id);
      media.removeEventListener("change", apply);
    };
  }, []);

  return { step, motion, letter: LETTERS[step] };
}

function StatusBar() {
  return (
    <div className="relative flex items-center justify-between px-5 pt-3 pb-1 text-[11px] font-semibold text-ink">
      <span>9:41</span>
      <span className="absolute left-1/2 top-2 h-[18px] w-[72px] -translate-x-1/2 rounded-full bg-[#0B1220]" />
      <span className="flex items-center gap-1" aria-hidden="true">
        <span className="flex items-end gap-[2px]">
          <span className="h-[4px] w-[3px] rounded-[1px] bg-ink" />
          <span className="h-[6px] w-[3px] rounded-[1px] bg-ink" />
          <span className="h-[8px] w-[3px] rounded-[1px] bg-ink" />
          <span className="h-[10px] w-[3px] rounded-[1px] bg-ink" />
        </span>
        <span className="ml-1 h-[9px] w-[16px] rounded-[2px] border border-ink p-[1px]">
          <span className="block h-full w-[70%] rounded-[1px] bg-ink" />
        </span>
      </span>
    </div>
  );
}

function PhoneFrame({
  raised,
  children,
}: {
  raised?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`w-full max-w-[320px] lg:max-w-[280px] ${raised ? "lg:-mt-10" : "lg:mt-8"}`}>
      <div className="rounded-[2.4rem] bg-[#1a1024] p-[9px] shadow-[0_30px_70px_rgba(15,23,42,0.18)]">
        <div className="product-screen flex h-[520px] flex-col overflow-hidden rounded-[1.9rem] bg-white">
          <StatusBar />
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          <div className="flex justify-center pb-2 pt-1">
            <span className="h-[4px] w-[96px] rounded-full bg-[#1a1024]/80" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PhoneWorkflow() {
  const { step, motion, letter } = useMailStep();

  return (
    <ul className="mt-10 flex flex-col items-center gap-12 lg:flex-row lg:items-start lg:justify-center lg:gap-5">
      <li className="flex w-full max-w-[320px] flex-col items-center lg:max-w-[280px]">
        <PhoneFrame>
          <div className="flex items-center justify-between px-4 pb-2 pt-3">
            <p className="text-[18px] font-bold tracking-[-0.03em] text-ink">Inbox</p>
            <span className="rounded-full bg-pill px-2 py-0.5 text-[11px] font-semibold text-pill-text">
              {LETTERS.length} new
            </span>
          </div>
          <div className="mx-4 mb-2 flex h-8 items-center rounded-lg bg-[#F4F6FB] px-3 text-[12px] text-faint">
            Search mail
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {LETTERS.map((item, index) => {
              const active = index === step;
              return (
                <div
                  key={item.subject}
                  className={`flex gap-2.5 border-b border-line px-4 py-2.5 ${
                    active ? "bg-[#F4F7FD]" : ""
                  } ${active && motion ? "pane-in" : ""}`}
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pill text-[12px] font-semibold text-pill-text">
                    {item.initial}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-[13px] ${active ? "font-semibold text-ink" : "text-ink"}`}>
                        {item.from}
                      </span>
                      <span className="shrink-0 text-[10px] text-faint">{item.time}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] font-medium text-ink">{item.subject}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-faint">{item.preview}</span>
                  </span>
                  {active ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue" /> : null}
                </div>
              );
            })}
          </div>
        </PhoneFrame>
        <p className="mt-5 text-center text-[13px] font-semibold tracking-[-0.02em] text-ink">It arrives</p>
      </li>

      <li className="flex w-full max-w-[320px] flex-col items-center lg:max-w-[280px]">
        <PhoneFrame raised>
          <div className="flex items-center gap-2 px-4 pb-1 pt-3 text-[13px] font-semibold text-blue">
            <span aria-hidden="true">‹</span> Inbox
          </div>
          <div key={letter.subject} className={`px-4 ${motion ? "pane-in" : ""}`}>
            <h3 className="text-[20px] font-bold leading-tight tracking-[-0.03em] text-ink">
              {letter.subject}
            </h3>
            <div className="mt-3 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pill text-[13px] font-semibold text-pill-text">
                {letter.initial}
              </span>
              <span>
                <span className="block text-[13px] font-semibold text-ink">{letter.from}</span>
                <span className="block text-[11px] text-faint">
                  {letter.address} · {letter.time}
                </span>
              </span>
            </div>
            <p className="mt-4 text-[13px] leading-[1.6] text-body">{letter.body}</p>
          </div>
          <div className="mt-auto grid grid-cols-2 gap-2 px-4 pb-2">
            <span className="flex h-9 items-center justify-center rounded-lg bg-blue text-[13px] font-semibold text-white">
              Reply
            </span>
            <span className="flex h-9 items-center justify-center rounded-lg border border-line text-[13px] font-semibold text-ink">
              Archive
            </span>
          </div>
        </PhoneFrame>
        <p className="mt-5 text-center text-[13px] font-semibold tracking-[-0.02em] text-ink">You open it</p>
      </li>

      <li className="flex w-full max-w-[320px] flex-col items-center lg:max-w-[280px]">
        <PhoneFrame>
          <div key={`sent-${letter.subject}`} className={`flex flex-1 flex-col px-4 pb-2 pt-4 ${motion ? "pane-in" : ""}`}>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-pill text-[18px] font-bold text-blue">
              ✓
            </span>
            <h3 className="mt-3 text-[20px] font-bold tracking-[-0.03em] text-ink">Sent</h3>
            <p className="mt-1 text-[12px] text-faint">From principal@thefirm</p>
            <div className="mt-4 space-y-2 rounded-xl border border-line p-3">
              <p className="text-[11px] text-faint">
                To <span className="font-semibold text-ink">{letter.address}</span>
              </p>
              <p className="text-[13px] font-semibold text-ink">Re: {letter.subject}</p>
              <p className="text-[12px] leading-[1.55] text-body">{letter.reply}</p>
            </div>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue">
              Filed in Sent
            </p>
          </div>
        </PhoneFrame>
        <p className="mt-5 text-center text-[13px] font-semibold tracking-[-0.02em] text-ink">You answer</p>
      </li>
    </ul>
  );
}

export function LaptopMailbox() {
  const { step, motion, letter } = useMailStep();

  return (
    <div
      className="relative aspect-[16/9] overflow-hidden bg-[#e7edf6]"
      role="img"
      aria-label="A laptop showing the SurfSync mailbox, with the inbox and the open letter"
    >
      <div className="absolute inset-x-[8%] top-[7%] bottom-[16%]">
        <div className="flex h-full flex-col rounded-t-xl bg-[#0B1220] p-[7px] pb-0 shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
          <div className="product-screen flex min-h-0 flex-1 overflow-hidden rounded-t-md bg-white">
            <div className="hidden w-[42%] border-r border-line sm:block">
              <p className="border-b border-line px-3 py-2 text-[12px] font-semibold text-ink">Inbox</p>
              {LETTERS.map((item, index) => (
                <div
                  key={item.subject}
                  className={`border-b border-line px-3 py-1.5 ${index === step ? "bg-[#F4F7FD]" : ""}`}
                >
                  <p className="truncate text-[11px] font-semibold text-ink">{item.from}</p>
                  <p className="truncate text-[10px] text-faint">{item.subject}</p>
                </div>
              ))}
            </div>
            <div key={letter.subject} className={`min-w-0 flex-1 px-3 py-2 ${motion ? "pane-in" : ""}`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue">{letter.address}</p>
              <p className="mt-1 truncate text-[14px] font-bold tracking-[-0.02em] text-ink">{letter.subject}</p>
              <p className="mt-1 text-[10px] text-faint">
                {letter.from} · {letter.time}
              </p>
              <p className="mt-2 line-clamp-3 text-[11px] leading-[1.5] text-body">{letter.body}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-[4%] bottom-[7%] h-[8%] rounded-b-xl bg-[#c5cedc]" />
      <div className="absolute bottom-[4%] left-1/2 h-[3.5%] w-[18%] -translate-x-1/2 rounded-b-md bg-[#b7c0d0]" />
    </div>
  );
}
