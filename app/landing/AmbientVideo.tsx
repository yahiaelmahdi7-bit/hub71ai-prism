"use client";

import { useEffect, useRef } from "react";
import styles from "./landing.module.css";

export function AmbientVideo() {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = video.current;
    if (!element) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => {
      if (visible && !reducedMotion.matches) {
        void element.play().catch(() => {});
      } else {
        element.pause();
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }, { threshold: 0.2 });

    observer.observe(element);
    reducedMotion.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", sync);
      element.pause();
    };
  }, []);

  return (
    <figure className={styles.ambientFilm}>
      <video ref={video} src="/abu-dhabi-mosque-loop.mp4" poster="/abu-dhabi-mosque-poster.jpg" muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} />
      <figcaption>Sheikh Zayed Grand Mosque · Abu Dhabi</figcaption>
    </figure>
  );
}
