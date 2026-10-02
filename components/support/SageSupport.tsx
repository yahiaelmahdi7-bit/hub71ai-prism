"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { SageReply } from "@/lib/support/sage";
import styles from "./sage.module.css";

type ChatMessage =
  | { role: "sage"; text: string; reply?: SageReply }
  | { role: "user"; text: string };

const starter: SageReply = {
  mode: "local_navigator",
  assistant: "Sage",
  message: "Hi, I'm Sage. I can guide your Abu Dhabi move, explain source-backed setup steps and take you to the right Yala AD page. I don't submit forms or read private documents from chat.",
  actions: [
    { kind: "navigate", label: "Start a move", href: "/start", note: "Choose the right journey." },
    { kind: "navigate", label: "Compare areas", href: "/areas", note: "Review source-backed area guides." },
  ],
  sources: [],
};

const prompts = ["Help me choose an area", "Set up a company move", "Find homes in budget", "Show my roadmap"];
const PEEK_KEY = "sage-peeked";

function SageOrb({ size = "md", open = false }: { size?: "sm" | "md"; open?: boolean }) {
  return (
    <span className={styles.orb} data-size={size} data-open={open} aria-hidden="true">
      <svg className={styles.glyph} viewBox="0 0 24 24">
        <path className={styles.spark} d="M11 4.5c.5 3.6 2 5.1 5.6 5.6-3.6.5-5.1 2-5.6 5.6-.5-3.6-2-5.1-5.6-5.6 3.6-.5 5.1-2 5.6-5.6z" />
        <path className={styles.sparkSmall} d="M17 14.5c.25 1.6.9 2.25 2.5 2.5-1.6.25-2.25.9-2.5 2.5-.25-1.6-.9-2.25-2.5-2.5 1.6-.25 2.25-.9 2.5-2.5z" />
      </svg>
      <svg className={styles.chevron} viewBox="0 0 24 24">
        <path d="M7 10l5 5 5-5" />
      </svg>
    </span>
  );
}

export function SageSupport() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [peek, setPeek] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "sage", text: starter.message, reply: starter }]);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  // Show the full "Sage Assistant" pill once per visit so touch users learn what the bubble is.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(PEEK_KEY)) return;
    } catch {
      return;
    }
    const show = window.setTimeout(() => {
      try { sessionStorage.setItem(PEEK_KEY, "1"); } catch {}
      setPeek(true);
    }, 1400);
    const hide = window.setTimeout(() => setPeek(false), 4600);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setPeek(false);
    const focus = window.setTimeout(() => inputRef.current?.focus(), 180);
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      launcherRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focus);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function ask(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    setMessages((current) => [...current, { role: "user", text: message }]);
    try {
      const response = await fetch("/api/support/sage", {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({ message, path: window.location.pathname + window.location.hash }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Sage is unavailable.");
      const reply = payload as SageReply;
      setMessages((current) => [...current, { role: "sage", text: reply.message, reply }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "sage", text: error instanceof Error ? error.message : "Sage could not answer right now." }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(input);
  }

  function navigate(href: string) {
    if (!href.startsWith("/")) return;
    router.push(href);
    setOpen(false);
  }

  const fresh = !messages.some((message) => message.role === "user");

  return (
    <aside className={styles.root} aria-label="Yala AD support">
      <div className={styles.panel} id="sage-panel" role="dialog" aria-label="Sage assistant" data-open={open} inert={!open}>
        <header className={styles.head}>
          <SageOrb size="sm" />
          <div className={styles.headText}>
            <strong>Sage</strong>
            <span>Your Abu Dhabi move guide</span>
          </div>
          <button type="button" className={styles.close} aria-label="Close Sage" onClick={() => setOpen(false)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" /></svg>
          </button>
        </header>

        <div className={styles.thread} ref={threadRef} aria-live="polite">
          {messages.map((message, index) => {
            const firstInGroup = index === 0 || messages[index - 1].role !== message.role;
            return (
              <div className={styles.row} data-role={message.role} data-first={firstInGroup} key={`${message.role}-${index}`}>
                {message.role === "sage" ? (firstInGroup ? <SageOrb size="sm" /> : <span className={styles.avatarGap} />) : null}
                <div className={styles.stack}>
                  <p className={styles.bubble}>{message.text}</p>
                  {message.role === "sage" && message.reply?.actions.length ? (
                    <div className={styles.actions}>
                      {message.reply.actions.map((action) => (
                        <button type="button" key={action.href + action.label} onClick={() => navigate(action.href)}>
                          <span>{action.label}</span>
                          <small>{action.note}</small>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {message.role === "sage" && message.reply?.sources.length ? (
                    <div className={styles.sources}>
                      {message.reply.sources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.publisher}</a>)}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
          {busy ? (
            <div className={styles.row} data-role="sage" data-first="false">
              <span className={styles.avatarGap} />
              <p className={`${styles.bubble} ${styles.typing}`} aria-label="Sage is typing"><i /><i /><i /></p>
            </div>
          ) : null}
        </div>

        {fresh ? (
          <div className={styles.prompts} aria-label="Suggested questions">
            {prompts.map((prompt) => <button type="button" key={prompt} onClick={() => void ask(prompt)} disabled={busy}>{prompt}</button>)}
          </div>
        ) : null}

        <form className={styles.form} onSubmit={submit}>
          <input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} maxLength={1000} placeholder="Message Sage" aria-label="Message Sage" />
          <button type="submit" aria-label="Send" disabled={busy || !input.trim()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
          </button>
        </form>
      </div>

      <button
        ref={launcherRef}
        className={styles.launcher}
        type="button"
        data-open={open}
        data-peek={peek}
        aria-expanded={open}
        aria-controls="sage-panel"
        aria-label={open ? "Close Sage assistant" : "Open Sage assistant"}
        onClick={() => setOpen((value) => !value)}
      >
        <SageOrb open={open} />
        <span className={styles.label}>Sage Assistant</span>
      </button>
    </aside>
  );
}
