"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import styles from "./home.module.css";

function DoorGroup({ reflection = false }: { reflection?: boolean }) {
  return (
    <div className={reflection ? `${styles.door} ${styles.reflection}` : styles.door} aria-hidden={reflection || undefined}>
      <div className={styles.spill} />
      <div className={styles.opening}>
        <Image
          className={styles.city}
          src="/abu-dhabi-waterfront.jpg"
          alt=""
          width={1200}
          height={800}
          preload={!reflection}
          sizes="(max-width: 760px) 140vw, 45vw"
        />
      </div>
      <div className={styles.leaf}>
        <span className={styles.panel} />
        <span className={styles.panel} />
        <span className={styles.knob} />
      </div>
    </div>
  );
}

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

    let frame = 0;
    let p = 0;
    let mx = 0;
    let my = 0;
    let tx = 0;
    let ty = 0;

    const measure = () => {
      const rect = track.getBoundingClientRect();
      const span = rect.height - window.innerHeight;
      p = span > 0 ? Math.min(1, Math.max(0, -rect.top / span)) : 0;
    };

    const render = () => {
      frame = 0;
      mx += (tx - mx) * 0.08;
      my += (ty - my) * 0.08;
      stage.style.setProperty("--p", p.toFixed(4));
      stage.style.setProperty("--mx", mx.toFixed(4));
      stage.style.setProperty("--my", my.toFixed(4));
      if (Math.abs(tx - mx) > 0.001 || Math.abs(ty - my) > 0.001) schedule();
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

    onScroll();
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
        <div className={styles.doorWrap}>
          <DoorGroup />
          <DoorGroup reflection />
        </div>
        <div className={styles.through} aria-hidden="true">
          <Image src="/abu-dhabi-waterfront.jpg" alt="" width={1200} height={800} sizes="100vw" />
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
          <span>Abu Dhabi</span>
          <strong>One plan for the whole move.</strong>
        </div>

        <div className={styles.hint} aria-hidden="true">
          <span>Scroll to step through</span>
          <i />
        </div>
      </div>
    </section>
  );
}
