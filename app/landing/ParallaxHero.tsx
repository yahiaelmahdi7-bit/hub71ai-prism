"use client";

import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./landing.module.css";

export function ParallaxHero({ children }: { children: ReactNode }) {
  const hero = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = hero.current;
    if (!element) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const update = () => {
      frame = 0;
      const offset = reducedMotion.matches ? 0 : Math.max(-72, Math.min(72, -element.getBoundingClientRect().top * 0.12));
      element.style.setProperty("--parallax-y", `${offset}px`);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reducedMotion.addEventListener("change", schedule);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reducedMotion.removeEventListener("change", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className={styles.hero} aria-labelledby="hero-title" ref={hero}>
      <div className={styles.heroMedia} aria-hidden="true">
        <Image src="/abu-dhabi-waterfront.jpg" alt="" fill priority sizes="100vw" />
      </div>
      <div className={styles.heroShade} aria-hidden="true" />
      {children}
    </section>
  );
}
