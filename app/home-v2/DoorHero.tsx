"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import styles from "./home.module.css";

export function DoorHero() {
  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!track || !stage) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const fine = window.matchMedia("(pointer: fine)").matches;

    // Scroll and pointer set targets; each frame eases the drawn values toward them (time-based, so
    // wheel notches glide instead of stepping). `e` is the tile-opening curve: slow start, fast middle, soft landing.
    let frame = 0;
    let last = 0;
    let target = 0;
    let p = 0;
    let mx = 0;
    let my = 0;
    let tx = 0;
    let ty = 0;

    const measure = () => {
      const rect = track.getBoundingClientRect();
      const span = rect.height - window.innerHeight;
      target = span > 0 ? Math.min(1, Math.max(0, -rect.top / span)) : 0;
    };

    const render = (now: number) => {
      frame = 0;
      const dt = last ? Math.min(64, now - last) : 16.67;
      last = now;
      const k = 1 - Math.pow(0.86, dt / 16.67);
      p += (target - p) * k;
      mx += (tx - mx) * k * 0.6;
      my += (ty - my) * k * 0.6;
      const t = Math.min(1, Math.max(0, (p - 0.06) / 0.76));
      const e = t * t * (3 - 2 * t);
      stage.style.setProperty("--p", p.toFixed(4));
      stage.style.setProperty("--e", e.toFixed(4));
      stage.style.setProperty("--mx", mx.toFixed(4));
      stage.style.setProperty("--my", my.toFixed(4));
      if (Math.abs(target - p) > 0.0004 || Math.abs(tx - mx) > 0.001 || Math.abs(ty - my) > 0.001) schedule();
      else last = 0;
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    const onScroll = () => {
      measure();
      schedule();
    };
    const onPointer = (event: PointerEvent) => {
      tx = (event.clientX / window.innerWidth) * 2 - 1;
      ty = (event.clientY / window.innerHeight) * 2 - 1;
      schedule();
    };

    measure();
    p = target;
    schedule();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    if (fine) window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("pointermove", onPointer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section ref={trackRef} className={styles.track}>
      <div ref={stageRef} className={styles.stage}>
        <div className={styles.sky} />
        <div className={styles.sun} />
        <div className={styles.sea} />
        <div className={styles.dusk} />
        <div className={styles.glow} aria-hidden="true" />
        <div className={styles.windowShadow} aria-hidden="true" />
        <div className={styles.window} aria-hidden="true">
          <Image src="/hero-abu-dhabi-aerial.jpg" alt="" fill preload sizes="100vw" />
        </div>

        <div className={styles.headline}>
          <h1>Arrive in Abu Dhabi knowing what comes next.</h1>
          <p>Homes inside your budget, the setup route that fits, and each step of the move in one plan, with sources next to the facts.</p>
          <div className={styles.actions}>
            <a className="house-pill house-pill--accent" href="/move">Plan my move</a>
            <a className="house-pill" href="/company">Moving a team?</a>
          </div>
        </div>

        <div className={styles.caption} aria-hidden="true">
          <strong>
            <span>Abu Dhabi,</span>
            <span>one plan for</span>
            <span>the whole move</span>
          </strong>
        </div>

        <div className={styles.hint} aria-hidden="true">
          <span>Scroll to step through</span>
          <i />
        </div>

        <a className={styles.credit} href="https://www.relaam.com/neighborhoods" target="_blank" rel="noreferrer">
          Photo: Relaam
        </a>
      </div>
    </section>
  );
}
