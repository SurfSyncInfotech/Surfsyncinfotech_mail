import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Header, HeaderFallback } from "@/components/Header";
import { Intro } from "@/components/Intro";
import { RouteWash } from "@/components/RouteWash";

const introCover = `html.intro-on body{overflow:hidden}html.intro-on .ssload{display:grid!important;position:fixed;inset:0;z-index:100;place-items:center}html.intro-on body>*:not(.ssload){visibility:hidden}`;

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-jakarta",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: {
    default: "SurfSync Mail",
    template: "%s · SurfSync Mail",
  },
  description:
    "Business email hosting on your own domain, with a mailbox for each person and admin controls in the same house.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${jakarta.className} h-full intro-on`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: introCover }} />
      </head>
      <body className="flex min-h-full flex-col bg-page text-body antialiased">
        <Script id="theme-boot" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem("ss-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark");}catch(e){}})();`}
        </Script>
        <RouteWash />
        <Intro />
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-paper focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink"
        >
          Skip to content
        </a>
        <Suspense fallback={<HeaderFallback />}>
          <Header />
        </Suspense>
        <main id="content" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
