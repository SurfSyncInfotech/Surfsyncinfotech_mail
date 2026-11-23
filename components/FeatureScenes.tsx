"use client";

import { useEffect, useState, type ReactNode } from "react";

const SCENES = ["domain", "mailbox", "groups", "storage", "admin", "apps"] as const;

function Stage({ children }: { children: ReactNode }) {
  return (
    <div className="product-screen relative h-[210px] overflow-hidden rounded-xl border border-[#e6ebf2] bg-[#f5f7fb] p-3">
      {children}
    </div>
  );
}

function DomainScene({ phase }: { phase: number }) {
  return (
    <Stage>
      <div className="rounded-lg bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">New message</p>
        <p className={`mt-2 text-[13px] ${phase > 0 ? "text-ink" : "text-faint"}`}>
          To{" "}
          <span className={phase > 1 ? "rounded bg-[#e8eef9] px-1 font-semibold text-blue" : ""}>
            priya@yourcompany.com
          </span>
        </p>
        <p className={`mt-2 text-[15px] font-semibold text-ink ${phase > 0 ? "pane-in" : "opacity-0"}`}>
          Visitor at four
        </p>
        <p className={`mt-1 text-[12px] text-body ${phase > 1 ? "pane-in" : "opacity-0"}`}>
          Arrived on your domain.
        </p>
      </div>
    </Stage>
  );
}

function MailboxScene({ phase }: { phase: number }) {
  const rows = ["Reception · Visitor at four", "Accounts · March statement", "Studio · Boards on Friday"];
  return (
    <Stage>
      <div className="h-full overflow-hidden rounded-lg bg-white">
        {phase < 2
          ? rows.map((row, index) => (
              <div
                key={row}
                className={`border-b border-[#eef2f7] px-3 py-2.5 text-[13px] ${
                  phase === 1 && index === 0 ? "bg-[#eef3ff] font-semibold text-ink" : "text-body"
                }`}
              >
                {row}
              </div>
            ))
          : (
            <div key="open" className="pane-in px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue">reception@yourcompany.com</p>
              <p className="mt-2 text-[16px] font-semibold text-ink">Visitor at four</p>
              <p className="mt-2 text-[13px] leading-relaxed text-body">A guest is expected at four. Reply stays in this mailbox.</p>
              <p className="mt-3 inline-flex rounded-md bg-blue px-2.5 py-1 text-[12px] font-semibold text-white">Reply</p>
            </div>
          )}
      </div>
    </Stage>
  );
}

function GroupsScene({ phase }: { phase: number }) {
  const people = ["Priya", "Arun", "Accounts"];
  return (
    <Stage>
      <div className="flex h-full flex-col items-center justify-center">
        <p className="rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-ink shadow-sm">accounts@yourcompany.com</p>
        <span className={`my-2 text-blue ${phase > 0 ? "opacity-100" : "opacity-0"}`}>↓</span>
        <ul className="flex gap-2">
          {people.map((name, index) => (
            <li
              key={name}
              className={`rounded-lg bg-white px-3 py-2 text-[12px] font-semibold text-ink shadow-sm ${
                phase > index ? "pane-in" : "opacity-0"
              }`}
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
    </Stage>
  );
}

function StorageScene({ phase }: { phase: number }) {
  const used = [4, 11, 18][phase] ?? 4;
  return (
    <Stage>
      <div className="flex h-full flex-col justify-center rounded-lg bg-white px-4">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">priya@yourcompany.com</p>
        <p className="mt-2 text-[22px] font-bold tabular-nums text-ink">
          {used} <span className="text-[14px] font-medium text-faint">of 25 GB</span>
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e6ebf2]">
          <div className="h-full rounded-full bg-blue transition-all duration-700" style={{ width: `${(used / 25) * 100}%` }} />
        </div>
      </div>
    </Stage>
  );
}

function AdminScene({ phase }: { phase: number }) {
  const paused = phase === 2;
  return (
    <Stage>
      <div className="rounded-lg bg-white">
        {[
          ["priya@yourcompany.com", "Active"],
          ["studio@yourcompany.com", paused ? "Paused" : "Active"],
        ].map(([address, status]) => (
          <div key={address} className="flex items-center justify-between border-b border-[#eef2f7] px-3 py-3 text-[13px] last:border-b-0">
            <span className="truncate text-ink">{address}</span>
            <span className={status === "Active" ? "font-semibold text-[#16a34a]" : "pane-in font-semibold text-[#c2410c]"}>
              {status}
            </span>
          </div>
        ))}
        <p className={`px-3 py-2 text-[12px] text-body ${paused ? "pane-in" : "opacity-0"}`}>Mailbox paused from the admin desk.</p>
      </div>
    </Stage>
  );
}

function AppsScene({ phase }: { phase: number }) {
  return (
    <Stage>
      <div className="mx-auto flex h-full w-[150px] flex-col overflow-hidden rounded-[18px] border border-[#1a1024] bg-white">
        <div className="bg-[#0b1220] py-1 text-center text-[10px] font-semibold text-white">9:41</div>
        {phase < 2 ? (
          <div className="px-2 py-2">
            <p className="text-[11px] font-semibold text-ink">Reply</p>
            <p className={`mt-1 text-[11px] text-body ${phase > 0 ? "pane-in" : ""}`}>We’ll be ready at four.</p>
          </div>
        ) : (
          <div className="pane-in flex flex-1 flex-col items-center justify-center px-2 text-center">
            <p className="text-[18px] text-[#16a34a]">✓</p>
            <p className="mt-1 text-[12px] font-semibold text-ink">Sent</p>
            <p className="text-[10px] text-faint">from your domain</p>
          </div>
        )}
      </div>
    </Stage>
  );
}

const COPY = {
  domain: ["Domain mail", "A new letter arrives for priya@yourcompany.com."],
  mailbox: ["Mailbox", "The inbox opens that letter so you can reply."],
  groups: ["Groups", "accounts@ delivers the same letter to Priya, Arun, and Accounts."],
  storage: ["Storage", "This mailbox fills its own 25 GB, separate from the others."],
  admin: ["Admin", "The desk pauses studio@ when that person leaves."],
  apps: ["On the go", "The reply sends from the phone, still on your domain."],
} as const;

export function FeatureScenes() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    const id = window.setInterval(() => setPhase((current) => (current + 1) % 3), 1600);
    return () => window.clearInterval(id);
  }, []);

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {SCENES.map((id) => (
        <li id={id} key={id} className="scroll-mt-24">
          <div className="rounded-2xl border border-line bg-paper p-3">
            {id === "domain" ? <DomainScene phase={phase} /> : null}
            {id === "mailbox" ? <MailboxScene phase={phase} /> : null}
            {id === "groups" ? <GroupsScene phase={phase} /> : null}
            {id === "storage" ? <StorageScene phase={phase} /> : null}
            {id === "admin" ? <AdminScene phase={phase} /> : null}
            {id === "apps" ? <AppsScene phase={phase} /> : null}
            <h2 className="px-2 pb-2 pt-3 text-[17px] font-semibold tracking-[-0.02em] text-ink">{COPY[id][0]}</h2>
          </div>
          <p className="px-2 pt-3 text-[15px] leading-relaxed text-body">{COPY[id][1]}</p>
        </li>
      ))}
    </ul>
  );
}
