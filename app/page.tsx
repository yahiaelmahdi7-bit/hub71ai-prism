"use client";

import { useRef, useState } from "react";

const ACCEPT = ["application/pdf", "image/png", "image/jpeg"];

function kind(f: File) {
  return f.type === "application/pdf" ? "PDF" : f.type === "image/png" ? "PNG" : "JPG";
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [over, setOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const input = useRef<HTMLInputElement>(null);

  function add(list: FileList | null) {
    if (!list) return;
    const ok = Array.from(list).filter((f) => ACCEPT.includes(f.type));
    const rejected = list.length - ok.length;
    setError(rejected ? `${rejected} file(s) skipped - only PDF, PNG or JPG.` : null);
    setFiles((prev) => [...prev, ...ok.filter((f) => !prev.some((p) => p.name === f.name && p.size === f.size))]);
  }

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body = new FormData();
      files.forEach((f) => body.append("files", f));
      const res = await fetch("/api/analyze", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header className="shell flex items-center justify-between py-6">
        <span className="text-lg font-bold tracking-tight">
          Bankable<span style={{ color: "var(--accent)" }}>.</span>
        </span>
        <span className="eyebrow">Abu Dhabi</span>
      </header>

      <main className="shell pb-24">
        <section className="pt-10 pb-14 md:pt-16">
          <p className="eyebrow mb-4">Settle in. Build here.</p>
          <h1 className="h1">Proof of income for people without a salary slip</h1>
          <p className="lede mt-5">
            Drop in the papers you already have. We read them and show what you can start today, and what is still missing.
          </p>
        </section>

        <div className="grid gap-12 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <section aria-label="Upload documents">
            <h2 className="eyebrow mb-3">1 · Your documents</h2>
            <div
              className="drop"
              data-over={over}
              role="button"
              tabIndex={0}
              onClick={() => input.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
            >
              <p className="font-semibold">Drag files here, or click to choose</p>
              <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>PDF, PNG or JPG. Statements, invoices, contracts, permits.</p>
              <input ref={input} type="file" multiple accept=".pdf,.png,.jpg,.jpeg" hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
            </div>

            {files.length > 0 && (
              <ul className="mt-4" aria-label="Selected files">
                {files.map((f) => (
                  <li key={f.name + f.size} className="chip">
                    <span className="kind">{kind(f)}</span>
                    <span className="truncate">{f.name}</span>
                    <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((x) => x !== f))}>Remove</button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex items-center gap-4">
              <button type="button" className="btn" disabled={!files.length || loading} onClick={run}>
                {loading && <span className="spinner" aria-hidden />}
                {loading ? "Reading..." : "Read my documents"}
              </button>
              {files.length > 0 && !loading && (
                <button type="button" className="text-sm" style={{ color: "var(--ink-2)" }} onClick={() => { setFiles([]); setResult(null); setError(null); }}>
                  Clear all
                </button>
              )}
            </div>

            {error && (
              <p role="alert" className="mt-4 text-sm font-medium" style={{ color: "var(--danger)" }}>{error}</p>
            )}
          </section>

          <section aria-label="Result" aria-live="polite">
            <h2 className="eyebrow mb-3">2 · What we found</h2>
            <div className="panel p-6">
              {loading ? (
                <p style={{ color: "var(--ink-2)" }}>Reading {files.length} document{files.length === 1 ? "" : "s"}. This can take up to a minute.</p>
              ) : result ? (
                <pre className="json">{JSON.stringify(result, null, 2)}</pre>
              ) : (
                <p style={{ color: "var(--ink-2)" }}>
                  Nothing yet. Your income profile and a ready / not-yet list for each life moment will appear here.
                </p>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
