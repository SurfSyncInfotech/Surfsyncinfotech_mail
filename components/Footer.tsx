import Link from "next/link";
import { Container } from "@/components/chrome";
import { Logo } from "@/components/Logo";

const visit = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
];

const service = [
  { href: "/features#domain", label: "Mail on your domain" },
  { href: "/features#mailbox", label: "Mailboxes" },
  { href: "/features#admin", label: "Admin controls" },
  { href: "/features#storage", label: "Storage limits" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-paper">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
        <div className="max-w-[28ch]">
          <Logo />
          <p className="mt-5 text-[15px] leading-[1.7] text-body">
            Business email on your domain. Mailboxes and admin in one place.
          </p>
        </div>
        <div>
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-faint">
            Visit
          </h2>
          <ul className="mt-4 space-y-2.5">
            {visit.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-[15px] text-nav transition-colors hover:text-blue"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-faint">
            The service
          </h2>
          <ul className="mt-4 space-y-2.5">
            {service.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-[15px] text-nav transition-colors hover:text-blue"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-faint">
            A note
          </h2>
          <p className="mt-4 text-[15px] leading-[1.7] text-body">
            Plans on this site are the published list. Checkout takes the
            monthly price plus GST. Sign-in opens later.
          </p>
        </div>
      </Container>
      <div className="border-t border-line">
        <Container className="py-5">
          <p className="text-[13px] text-faint">© 2026 SurfSync Mail.</p>
        </Container>
      </div>
    </footer>
  );
}
