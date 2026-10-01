# STATUS — Bankable (OpenAI hackathon, Abu Dhabi, 2026-10-02)

## Settled (Yahia's decisions, do not re-litigate)
- Solo build; Yahia directs the bankable-* crew in Claude Code; the PRODUCT runs on OpenAI (lib/openai.ts).
- Persona: Sara Haddad (fictional), sample-docs/ + sample-docs/PERSONA.md (test oracle).
- Three moments, in this order (the story ladder): 1) business bank account (arrive), 2) credit card (settle, build credit), 3) home loan (build a future).
- Rules only from docs/rules-research.md, H/M confidence, every rule with source_url. No haircut %. No bank-partner or traction claims.
- English only.

## Exists (built 2026-10-01 night)
- Starter app (commit 9e4be1d): upload UI, /api/analyze, lib/openai.ts (model gpt-5.6, untested until the key is in), npm run smoke.
- lib/types.ts: IncomeProfile / Rule / Verdict contract.
- .claude/: 18 bankable-* agents, /bk-* commands, CREW.md, chaperone hook (see .claude/chaperone/README.md).
- ~/Projects/oss-library: vetted open-source picks (`~/Projects/oss-library/bin/oss find <tag>`).

## Timeline (Gulf time)
09:15 build starts (/bk-start) · 12:00 lunch · 14:45 FEATURE FREEZE (/bk-freeze) · 15:45 submissions close · 15:55 first-round judging · 17:25 top 6 · 17:40 finals.

## Stage log
(orchestrator appends here)
