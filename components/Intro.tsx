"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { LogoLockup } from "@/components/Logo";

export function Intro() {
  const root = useRef<HTMLDivElement>(null);
  const [alive, setAlive] = useState(true);

  useLayoutEffect(() => {
    const doc = document.documentElement;
    const intro = root.current;
    let cancelled = false;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" && event.key !== "Enter" && event.key !== " ") return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      skip();
    };
    const close = () => {
      if (cancelled) return;
      window.removeEventListener("keydown", onKey);
      doc.classList.remove("intro-on");
      setAlive(false);
    };
    if (!intro) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || /[?&]nointro/.test(location.search)) {
      close();
      return;
    }
    doc.classList.add("intro-on");

    const logo = intro.querySelector<HTMLElement>("#intro-logo");
    const nav = document.getElementById("nav-logo");
    if (!logo || !nav) {
      close();
      return;
    }

    const display = window.innerWidth < 700 ? 2.15 : 3.15;
    gsap.set(logo, { scale: display, opacity: 0, transformOrigin: "50% 50%" });

    const tl = gsap.timeline({ onComplete: finish });
    tl.to(".ssload-bar span", { scaleX: 1, duration: 3.5, ease: "power1.inOut" }, 0)
      .to(logo, { opacity: 1, duration: 0.7, ease: "power2.out" }, 0.12)
      .fromTo(
        ".ssload-sheen",
        { opacity: 1, backgroundPosition: "120% 0" },
        { backgroundPosition: "-30% 0", duration: 1, ease: "power2.inOut" },
        2.85,
      )
      .to(".ssload-sheen", { opacity: 0, duration: 0.2 }, 3.75)
      .fromTo(
        ".ssload-tag",
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.8, ease: "expo.out" },
        2.95,
      )
      .addLabel("exit", 3.75)
      .to([".ssload-tag", ".ssload-bar", ".ssload-skip"], { opacity: 0, y: -8, duration: 0.35, ease: "power2.in" }, "exit")
      .add(flyToNav, "exit+=0.1")
      .to(
        ".ssload-bg",
        {
          yPercent: -100,
          borderBottomLeftRadius: "50% 18%",
          borderBottomRightRadius: "50% 18%",
          duration: 1,
          ease: "power4.inOut",
        },
        "exit+=0.2",
      );

    function flyToNav() {
      if (!logo || !nav) return;
      const from = logo.getBoundingClientRect();
      const to = nav.getBoundingClientRect();
      const layout = logo.offsetWidth || from.width;
      const scale = to.width / layout;
      gsap.to(logo, {
        x: to.left + to.width / 2 - (from.left + from.width / 2),
        y: to.top + to.height / 2 - (from.top + from.height / 2),
        scale,
        duration: 1.05,
        ease: "expo.inOut",
        transformOrigin: "50% 50%",
      });
    }

    function finish() {
      gsap.delayedCall(0.85, close);
    }

    const skip = () => {
      const exitAt = tl.labels.exit ?? 3.75;
      if (tl.time() < exitAt) tl.seek("exit");
    };
    intro.addEventListener("click", skip);
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", skip, { once: true, passive: true });
    window.addEventListener("touchmove", skip, { once: true, passive: true });

    return () => {
      cancelled = true;
      tl.kill();
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!alive) return null;

  return (
    <div className="ssload" id="intro" ref={root}>
      <div className="ssload-bg" />
      <div className="ssload-stage">
        <div className="ssload-lockup" id="intro-logo">
          <LogoLockup />
        </div>
        <div className="ssload-sheen" aria-hidden="true" />
        <p className="ssload-tag">
          <span>Mail,</span> <em>in one house.</em>
        </p>
      </div>
      <div className="ssload-bar" aria-hidden="true">
        <span />
      </div>
      <button className="ssload-skip" type="button">
        Skip
      </button>
    </div>
  );
}
