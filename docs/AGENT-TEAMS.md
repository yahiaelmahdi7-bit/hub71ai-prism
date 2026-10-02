# Bankable Codex agent teams

The 18 existing Bankable roles are available to Codex as project-scoped custom agents in `.codex/agents/`. The original detailed contracts remain in `.claude/agents/`; each Codex adapter reads its matching contract before it acts.

`docs/STATUS.md` and `docs/product-brief.md` are the live product direction. They override older banking-only framing inside a role prompt. The existing extraction, rules, verdict, explanation, and proof-pack roles now serve the financial-evidence module of the wider Abu Dhabi relocation hub.

## Teams

| Team | Codex agents | Use them for |
|---|---|---|
| Lead and discovery | `bankable-orchestrator`, `bankable-scout` | Multi-lane sequencing, status, scope decisions, and fast repo mapping |
| Build | `bankable-extraction-engineer`, `bankable-rules-engineer`, `bankable-explainer`, `bankable-verdict-designer`, `bankable-proof-pack-builder` | Document evidence, deterministic financial rules, explanations, verdict UI, and printable proof packs |
| Quality and truth | `bankable-qa`, `bankable-truth-auditor`, `bankable-fact-checker`, `bankable-judge-panel`, `bankable-debugger` | Test evidence, claim/source audits, UAE fact checks, judge review, and narrow bug fixes |
| Demo and launch | `bankable-setup`, `bankable-demo-director`, `bankable-pitch-writer`, `bankable-qna-coach`, `bankable-deployer` | Environment checks, demo scripts, submission copy, judge Q&A, and deployment |
| Test data | `bankable-persona-forge` | Fictional, watermarked personas and oracle documents |

## Routing

- Use `bankable-orchestrator` for work spanning more than one ownership lane.
- Use a specialist directly for one bounded deliverable in its existing lane.
- For the legacy financial-evidence stages: extraction and rules may run in parallel after the shared contract is stable; verdict design and explanation follow; proof pack follows the verdict contract.
- Gate implementation with `bankable-qa`, `bankable-truth-auditor`, and `bankable-judge-panel`. Use `bankable-debugger` only for a concrete reproduced failure.
- New relocation-hub modules such as area data, property/contact integrations, or workspace discovery do not yet have dedicated Bankable roles. Route them through `bankable-orchestrator` and a suitable built-in Codex specialist until explicit project roles are added.

## Collision and truth rules

- Never run two write agents in the same lane. Parallel work must have non-overlapping ownership; the parent integrates and re-runs verification.
- `lib/types.ts` and `lib/openai.ts` remain orchestrator-owned.
- Every financial rule and public claim needs a source. Never invent prices, bookings, partner access, approvals, users, or traction.
- Treat `sample-docs/PERSONA.md` as fictional test data, not real market evidence.
- Do not expose secrets or real personal documents.

## Verification

List the loaded project roles with:

```sh
rcs agents list --scope project
```

The expected count is 18, with no missing or extra `bankable-*` names compared with `.claude/agents/`.
