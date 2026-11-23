import type { Metadata } from "next";
import { ButtonLink, Container, Eyebrow } from "@/components/chrome";

export const metadata: Metadata = {
  title: "Not found",
};

export default function NotFound() {
  return (
    <Container className="py-20 sm:py-28">
      <Eyebrow>Missing page</Eyebrow>
      <h1 className="mt-4 max-w-[14ch] text-[2.35rem] font-bold leading-[1.08] tracking-[-0.03em] text-ink sm:text-5xl">
        This page is not published.
      </h1>
      <p className="mt-6 max-w-[52ch] text-[17px] leading-[1.7] text-body">
        The address may be mistyped. Home, Features, and Pricing are the pages on this site.
      </p>
      <div className="mt-8">
        <ButtonLink href="/">Back to home</ButtonLink>
      </div>
    </Container>
  );
}
