"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import styles from "./live-pieces.module.css";

// Steps through `count` stages while the tile is on screen. Until then, and for
// reduced-motion visitors, it rests on a finished state so nothing reads as half-done.
function useLiveStep(count: number, ms: number, rest = count - 1, delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(rest);
  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: number | undefined;
    let wait: number | undefined;
    const stop = () => { window.clearTimeout(wait); window.clearInterval(timer); wait = timer = undefined; };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return stop();
      if (timer !== undefined || wait !== undefined) return;
      // Staggered starts keep the four tiles from ticking in lockstep.
      wait = window.setTimeout(() => {
        setStep(0);
        timer = window.setInterval(() => setStep((current) => (current + 1) % count), ms);
      }, delay);
    }, { threshold: 0.35 });
    observer.observe(node);
    return () => { observer.disconnect(); stop(); };
  }, [count, ms, delay]);
  return { ref, step };
}

// Shared "live" signature: pulsing dot, the current step, and a hairline that fills until the next one.
function Status({ step, ms, warn, children }: { step: number; ms: number; warn?: boolean; children: ReactNode }) {
  return (
    <div className={styles.status} data-warn={warn || undefined}>
      <span className={styles.pulse} />
      <span key={step} className={styles.statusText}>{children}</span>
      <span key={`bar-${step}`} className={styles.bar} style={{ "--ms": `${ms}ms` } as CSSProperties} />
    </div>
  );
}

export function AreasLive({ areas }: { areas: { id: string; name: string; note: string }[] }) {
  const ms = 2200;
  const { ref, step } = useLiveStep(areas.length + 1, ms);
  const done = step === areas.length;
  return (
    <div ref={ref} className={styles.live}>
      <div className={styles.chips}>
        {areas.map((area, index) => (
          <span key={area.id} className={styles.chip} data-state={done ? "done" : index === step ? "active" : index < step ? "done" : "idle"} style={{ "--i": index } as CSSProperties}>
            <b />{area.name}<em>{area.note}</em>
          </span>
        ))}
      </div>
      <Status step={step} ms={ms}>{done ? `${areas.length} areas compared` : `Comparing ${areas[step].name}`}</Status>
    </div>
  );
}

export function SetupLive({ setups }: { setups: { id: string; label: string; authority: string }[] }) {
  const ms = 2400;
  const { ref, step } = useLiveStep(setups.length, ms, 0, 600);
  return (
    <div ref={ref} className={styles.live}>
      <div className={styles.center}>
        <div className={styles.segmented} style={{ "--n": setups.length, "--at": step } as CSSProperties}>
          <i className={styles.thumb} />
          {setups.map((setup, index) => <span key={setup.id} data-on={index === step}>{setup.label}</span>)}
        </div>
      </div>
      <Status step={step} ms={ms}>{`${setups[step].label} · ${setups[step].authority}`}</Status>
    </div>
  );
}

// Illustrative fills only (no prices): two homes fit, the third runs past the allowance cap.
const budgetSteps = [{ fill: 38, over: false }, { fill: 64, over: false }, { fill: 94, over: true }];

export function BudgetLive() {
  const ms = 2000;
  const { ref, step } = useLiveStep(budgetSteps.length, ms, 1, 1100);
  const current = budgetSteps[step];
  return (
    <div ref={ref} className={styles.live}>
      <div className={styles.center}>
        <div className={styles.budget} data-over={current.over}>
          <div className={styles.track}><span style={{ width: `${current.fill}%` }} /><i /></div>
          <div className={styles.labels}><span>Fits your budget</span><span className={styles.cap}>Allowance cap</span></div>
        </div>
      </div>
      <Status step={step} ms={ms} warn={current.over}>{current.over ? `Home ${step + 1} is over the cap` : `Home ${step + 1} fits your budget`}</Status>
    </div>
  );
}

export function StepsLive({ steps }: { steps: string[] }) {
  const ms = 2000;
  const { ref, step } = useLiveStep(steps.length, ms, steps.length - 1, 1500);
  const last = steps.length - 1;
  return (
    <div ref={ref} className={`${styles.live} ${styles.split}`}>
      <ol className={styles.timeline} style={{ "--at": step, "--n": steps.length } as CSSProperties}>
        {steps.map((label, index) => <li key={label} data-state={index < step ? "done" : index === step ? "active" : "idle"}><i />{label}</li>)}
      </ol>
      <div className={styles.log}>
        <div className={styles.logHead}><b /><b /><b /><span>move-plan</span></div>
        {steps.slice(0, step + 1).map((label, index) => (
          <code key={label} data-active={index === step}>{`› ${label.toLowerCase().replaceAll(" ", ".")}`}<span>{index < step ? "done" : index === last ? "ready" : "…"}</span></code>
        ))}
      </div>
      <Status step={step} ms={ms}>{step === last ? `${steps[step]} ready` : steps[step]}</Status>
    </div>
  );
}
