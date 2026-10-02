<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Bankable Codex agents

- Project-scoped Codex roles live in `.codex/agents/*.toml`. Their detailed role contracts remain in `.claude/agents/*.md`; each Codex adapter must read its matching contract completely before acting.
- Use `bankable-orchestrator` for staged or multi-lane work. For a bounded task, delegate directly to the matching `bankable-*` specialist listed in `docs/AGENT-TEAMS.md`.
- Source-of-truth docs: `docs/STATUS.md` for live state, `docs/product-brief.md` for the current product direction when present, `docs/rules-research.md` for researched rules, and `sample-docs/PERSONA.md` for the Sara demo oracle. These live docs override stale product framing embedded in an older role contract.
- References to `/bk-*`, Claude `Agent`/`Task` tools, `sonnet`, or `haiku` in the original contracts are legacy context. In Codex, dispatch custom agents by their `bankable-*` names and let them inherit the active session model unless their TOML explicitly says otherwise.
- The original prompts' atomic-commit language does not authorize a Codex subagent to commit or push. Commit only when the user or parent task explicitly delegates that action; never push unless explicitly requested.
- Keep ownership strict: extraction owns `lib/extract/**`; rules owns `lib/rules/**` and `rules/**`; verdict design owns `app/**` and `components/**` except `app/pack/**`; proof pack owns `app/pack/**`; explain owns `lib/explain/**`; QA owns `tests/**` and `docs/qa/**`. `lib/types.ts` and `lib/openai.ts` stay orchestrator-owned.
- Run independent agents in parallel only when their write scopes do not overlap. The parent agent integrates results and re-runs verification before calling a stage complete.
- For Stage 3, use `bankable-verdict-designer` to implement, then `bankable-qa`, `bankable-truth-auditor`, and `bankable-judge-panel` as the verification gate.
