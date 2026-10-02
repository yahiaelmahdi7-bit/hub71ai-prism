"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import styles from "./reading-carousel.module.css";

export type ReadingSlide = { title: string; body: ReactNode };

/** One text panel in focus at a time: named steps, arrows, swipe/scroll-snap, arrow keys. */
export function ReadingCarousel({ label, slides }: { label: string; slides: ReadingSlide[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const root = track.current;
    if (!root) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
    }, { root, threshold: 0.6 });
    Array.from(root.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [slides.length]);

  function go(index: number) {
    const next = Math.max(0, Math.min(slides.length - 1, index));
    const root = track.current;
    const slide = root?.children[next] as HTMLElement | undefined;
    // The track is position:relative, so offsetLeft is measured from the track itself.
    if (root && slide) root.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
    setActive(next);
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") { event.preventDefault(); go(active + 1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); go(active - 1); }
  }

  return <section className={styles.wrap} aria-roledescription="carousel" aria-label={label}>
    <div className={styles.bar}>
      <div className={styles.steps}>{slides.map((slide, index) => <button type="button" key={slide.title} className={styles.step} aria-current={index === active ? "true" : undefined} onClick={() => go(index)}><span>{index + 1}</span>{slide.title}</button>)}</div>
      <div className={styles.arrows}>
        <button type="button" aria-label="Previous panel" disabled={active === 0} onClick={() => go(active - 1)}>‹</button>
        <button type="button" aria-label="Next panel" disabled={active === slides.length - 1} onClick={() => go(active + 1)}>›</button>
      </div>
    </div>
    <div ref={track} className={styles.track} tabIndex={0} onKeyDown={onKey}>
      {slides.map((slide, index) => <article key={slide.title} data-index={index} data-active={index === active} className={styles.slide} aria-roledescription="slide" aria-label={`${index + 1} of ${slides.length}: ${slide.title}`}>
        <h2>{slide.title}</h2>
        {slide.body}
      </article>)}
    </div>
  </section>;
}
