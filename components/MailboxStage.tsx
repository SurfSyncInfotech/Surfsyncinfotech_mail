"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  {
    from: "Reception",
    address: "reception@thefirm",
    subject: "Visitor at four",
    preview: "The front desk has a guest for the principal this afternoon.",
    time: "09:14",
    body: "A guest is expected at four. The name is with the desk, and the principal’s mailbox has the note so the afternoon is not a surprise.",
  },
  {
    from: "Accounts",
    address: "accounts@thefirm",
    subject: "March statement",
    preview: "The statement is filed and ready for the partners to read.",
    time: "08:41",
    body: "The March statement is in the thread. It sits on the firm’s domain, with the attachments counted against this mailbox, not against a shared pile.",
  },
  {
    from: "Principal",
    address: "principal@thefirm",
    subject: "Draft for the partners",
    preview: "A short note, still a draft.",
    time: "Yesterday",
    body: "The draft stays in this mailbox until it is ready. When it goes, it goes from the firm’s own address, with the signature the desk set.",
  },
  {
    from: "Studio",
    address: "studio@thefirm",
    subject: "Boards on Friday",
    preview: "The room is held and the boards are already in the thread.",
    time: "Mon",
    body: "Friday’s review is on the calendar of the people in the group. The boards travelled with the message and sit inside this mailbox’s storage.",
  },
] as const;

const FOLDERS = [
  { name: "Inbox", count: "12", active: true },
  { name: "Sent", count: "", active: false },
  { name: "Drafts", count: "1", active: false },
  { name: "Archive", count: "", active: false },
];

export function MailboxStage({ className = "" }: { className?: string }) {
  const [active, setActive] = useState(0);
  const [motion, setMotion] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setMotion(!media.matches);
    apply();
    media.addEventListener("change", apply);
    if (media.matches) return () => media.removeEventListener("change", apply);
    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % MESSAGES.length);
    }, 3400);
    return () => {
      window.clearInterval(id);
      media.removeEventListener("change", apply);
    };
  }, []);

  const message = MESSAGES[active];

  return (
    <div
      className={`product-screen flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)] ${className}`}
      role="img"
      aria-label="Animated SurfSync mailbox, with the inbox, a message list, and an open letter"
    >
      <div aria-hidden="true" className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-3 border-b border-line px-4">
          <span className="text-[13px] font-semibold tracking-[-0.02em] text-ink">
            Inbox
          </span>
          <span className="rounded-full bg-pill px-2 py-0.5 text-[11px] font-semibold text-pill-text">
            12 new
          </span>
          <span className="ml-auto hidden h-8 w-40 items-center rounded-lg border border-line bg-[#F7F8FC] px-3 text-[12px] text-faint md:flex">
            Search mail
          </span>
        </div>
        <article
          key={`mobile-${message.subject}`}
          className={`px-4 py-4 md:hidden ${motion ? "pane-in" : ""}`}
        >
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-blue">
            {message.address}
          </p>
          <h2 className="mt-2 text-[20px] font-semibold leading-snug tracking-[-0.02em] text-ink">
            {message.subject}
          </h2>
          <p className="mt-1 text-[12px] text-faint">
            {message.from} · {message.time}
          </p>
          <p className="mt-4 text-[14px] leading-[1.7] text-body">{message.body}</p>
          <div className="mt-4 flex gap-1.5">
            {MESSAGES.map((item, index) => (
              <span
                key={item.subject}
                className={
                  index === active
                    ? "h-1.5 w-6 rounded-full bg-blue"
                    : "h-1.5 w-1.5 rounded-full bg-[#D5DDEA]"
                }
              />
            ))}
          </div>
        </article>
        <div className="hidden min-h-0 flex-1 grid-cols-[148px_minmax(0,0.92fr)_minmax(0,1.2fr)] md:grid">
          <aside className="flex flex-col border-r border-line bg-[#F6F8FC] py-3">
            {FOLDERS.map((folder) => (
              <div
                key={folder.name}
                className={
                  folder.active
                    ? "mx-2 flex items-center justify-between rounded-lg bg-white px-2.5 py-2 text-[13px] font-semibold text-ink shadow-[0_1px_0_rgba(15,23,42,0.04)]"
                    : "mx-2 flex items-center justify-between rounded-lg px-2.5 py-2 text-[13px] text-body"
                }
              >
                <span>{folder.name}</span>
                {folder.count ? (
                  <span className="text-[11px] font-semibold tabular-nums text-blue">
                    {folder.count}
                  </span>
                ) : null}
              </div>
            ))}
            <div className="mt-auto px-3 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                Storage
              </p>
              <p className="mt-1 text-[12px] font-semibold tabular-nums text-ink">
                18 of 25 GB
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E2E8F4]">
                <div className="h-full w-[72%] rounded-full bg-blue" />
              </div>
            </div>
          </aside>
          <ul className="min-h-0 overflow-hidden border-r border-line">
            {MESSAGES.map((item, index) => {
              const selected = index === active;
              return (
                <li
                  key={item.subject}
                  className={
                    selected
                      ? `border-b border-line bg-[#EEF3FF] px-3 py-3 ${motion ? "row-in" : ""}`
                      : "border-b border-line px-3 py-3"
                  }
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className={
                        selected
                          ? "truncate text-[13px] font-semibold text-ink"
                          : "truncate text-[13px] font-medium text-ink"
                      }
                    >
                      {item.from}
                    </p>
                    <p className="shrink-0 text-[11px] tabular-nums text-faint">
                      {item.time}
                    </p>
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-ink">{item.subject}</p>
                  <p className="mt-0.5 truncate text-[12px] text-body">{item.preview}</p>
                </li>
              );
            })}
          </ul>
          <article key={message.subject} className={`min-h-0 px-4 py-4 sm:px-5 ${motion ? "pane-in" : ""}`}>
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-blue">
              {message.address}
            </p>
            <h2 className="mt-2 text-[18px] font-semibold leading-snug tracking-[-0.02em] text-ink sm:text-[20px]">
              {message.subject}
            </h2>
            <p className="mt-1 text-[12px] text-faint">{message.time} · Inbox</p>
            <p className="mt-4 text-[14px] leading-[1.7] text-body">{message.body}</p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-line bg-[#F7F8FC] px-3 py-2 text-[12px] font-medium text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-blue" />
              Open on the firm’s domain
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
