"use client";

import { useState } from "react";

const groups = [
  {
    id: "mailbox",
    label: "The mailbox",
    cards: [
      {
        title: "Inbox",
        body: "Read, reply, file, and search the day’s letters from one mailbox on the firm’s domain.",
        mark: "In",
      },
      {
        title: "Addresses",
        body: "A personal address, a shared door such as accounts@, and aliases that deliver into a mailbox that already exists.",
        mark: "@",
      },
      {
        title: "Storage",
        body: "Each mailbox shows the storage the plan allows, so a full box is visible before mail stops arriving.",
        mark: "Gb",
      },
      {
        title: "Away from the desk",
        body: "The same mailbox opens in the browser, and in a standard mail app over IMAP and SMTP.",
        mark: "Go",
      },
    ],
  },
  {
    id: "desk",
    label: "The admin desk",
    cards: [
      {
        title: "Open a mailbox",
        body: "When someone joins, the office manager opens a mailbox and hands them an address on the firm’s domain.",
        mark: "New",
      },
      {
        title: "Set the quota",
        body: "Storage is stated per mailbox. The desk can read use against that limit without a second product.",
        mark: "Set",
      },
      {
        title: "Suspend and restore",
        body: "When a person leaves, the mailbox can be closed, and opened again if they return.",
        mark: "Off",
      },
      {
        title: "Reset access",
        body: "A forgotten way in is reset from the same desk that holds the mail.",
        mark: "Key",
      },
    ],
  },
] as const;

export function IncludedPanel() {
  const [active, setActive] = useState<(typeof groups)[number]["id"]>("mailbox");
  const group = groups.find((item) => item.id === active) ?? groups[0];

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="What is included">
        {groups.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(item.id)}
              className={
                selected
                  ? "rounded-full bg-ink px-4 py-2 text-[14px] font-semibold text-white"
                  : "rounded-full bg-[#E7EAF1] px-4 py-2 text-[14px] font-semibold text-ink transition-colors hover:bg-[#DCE1EA]"
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {group.cards.map((card) => (
          <li
            key={card.title}
            className="rounded-2xl border border-line bg-paper p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8EEF9] text-[12px] font-bold tracking-[-0.03em] text-blue">
              {card.mark}
            </span>
            <h3 className="mt-5 text-[18px] font-semibold tracking-[-0.02em] text-ink">
              {card.title}
            </h3>
            <p className="mt-2 text-[15px] leading-[1.65] text-body">{card.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
