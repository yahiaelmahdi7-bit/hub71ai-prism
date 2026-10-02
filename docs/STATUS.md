# STATUS — Bankable (OpenAI hackathon, Abu Dhabi, 2026-10-02)

## Product direction update (2026-10-02)
- The current product direction is the Abu Dhabi relocation action hub in [product-brief.md](product-brief.md). This supersedes the earlier banking-only story ladder as the main user experience.
- Banking, credit, and mortgages remain important connected actions. Document extraction is a supporting evidence feature.
- The default `/api/properties` data is a dated, source-linked snapshot; synthetic examples are separated and have no contact links. Live portal pulls are explicit diagnostics only; see [property-data.md](property-data.md). This is not a production-cleared portal integration.

## Settled (Yahia's decisions, do not re-litigate)
- Solo build; Yahia directs the project-scoped `bankable-*` crew in Codex (with `.claude/agents` retained as the detailed role-contract source); the PRODUCT runs on OpenAI (`lib/openai.ts`).
- Persona: Sara Haddad (fictional), sample-docs/ + sample-docs/PERSONA.md (test oracle).
- Three moments, in this order (the story ladder): 1) business bank account (arrive), 2) credit card (settle, build credit), 3) home loan (build a future).
- Rules only from docs/rules-research.md, H/M confidence, every rule with source_url. No haircut %. No bank-partner or traction claims.
- English only.

## Exists (built 2026-10-01 night)
- Starter app (commit 9e4be1d): upload UI, /api/analyze, lib/openai.ts (model gpt-5.6, untested until the key is in), npm run smoke.
- lib/types.ts: IncomeProfile / Rule / Verdict contract.
- `.codex/`: 18 project-scoped `bankable-*` agent adapters plus multi-agent config. `.claude/`: the detailed role contracts, legacy `/bk-*` commands, CREW.md, and chaperone hook (see `.claude/chaperone/README.md`).
- ~/Projects/oss-library: vetted open-source picks (`~/Projects/oss-library/bin/oss find <tag>`).

## Timeline (Gulf time)
09:15 build starts (/bk-start) · 12:00 lunch · 14:45 FEATURE FREEZE (/bk-freeze) · 15:45 submissions close · 15:55 first-round judging · 17:25 top 6 · 17:40 finals.

## Stage log
(orchestrator appends here)

## Relocation infrastructure — 2026-10-02

- User confirmed the theme: practical solutions for individuals and companies moving to, settling in, and building a future in Abu Dhabi. Current infrastructure scope is [infrastructure-plan.md](infrastructure-plan.md), based on the diagram in [app-flow.md](app-flow.md).
- Repository review: the homepage is still the document-upload starter. There is no relocation persistence, invitation flow, consent model, or company action ledger yet. Existing property adapters and calibration are a useful starting point; automated portal extraction is not approved production access.
- Three native helpers dispatched after read-only review: official Abu Dhabi catalog, property data/affordability, and relocation persistence/API/privacy. Lead owns `lib/types.ts`, integration and verification. No overlapping write scopes, commits, pushes, or external invitation messages.
- Shared relocation/reference/property contracts added alongside the existing income-evidence types. Installed Node 24 supports built-in SQLite; local private database files will live under ignored `.bankable/`.
- Baseline typecheck passed; baseline lint has zero errors and two existing sample-document warnings. Delivery verification pending implementation.
- User reassigned helper 3 to UX/UI and helpers 1/2 to data/backend. Helper 2 now owns the relocation domain/API as well as housing; helper 3 owns pages/components/styles, excluding APIs. Current delivery includes the user-facing hub, not only infrastructure.
- Resume hook activated Forge. Grounding context and PRD/test-spec artifacts are in `.rcs/context/` and `.rcs/plans/`; execution follows the existing Next.js relocation product plan.
- The first UI draft is visible on the existing local dev server at port 3000. It still needs API integration and removal of temporary market fixtures; it is not a completed user flow. Root captured `docs/qa/first-ui-1440.png`; the observed visual verdict is 84/revise, with hero hierarchy and real-action wiring pending.
- Eleven initial catalog/property tests passed. Root added HTTP authorization/source-boundary checks; these are pending the in-progress backend replacement (current route builds return 500 during module replacement). No final delivery gate has passed yet.

## Connected flow and empty-state delivery

- The user requires distinct landing/information/onboarding/workspace pages, not one long repeated page. Functional fresh and empty states are acceptance criteria. The fictional five-person demo is opt-in.
- Backend now persists profiles, programs, invitations, scoped sessions, consents and append-only status events in SQLite. New programs begin without employees; private plans begin without timeline progress. Invites are hashed, expiring and single-use. Profile edits retain journey identity and history.
- Catalog: 20 official/provider sources, eight areas, four workspaces, eleven official services and four financial-readiness factors. Property snapshot has ten market records; five support original listing actions. All availability remains unconfirmed. Synthetic homes are non-contactable.
- Fresh verification: 34 Node tests passed; three HTTP tests were skipped by the ordinary unit command and separately passed against the running local app. The live minimal personal/company/invite/privacy smoke passed before expanded profile/blocker coverage. Final responsive browser and build checks remain pending the focused-page revision.
- User-reported Timeline/invite defects are assigned to UX: real Timeline route, plain invite/progress wording, an enabled invite action for an active company, and an explained empty state before program creation.
- HR projections use server-owned next actions; personal free-text notes and income/evidence remain private. Unknown company jurisdiction never defaults to mainland. The local scoped-session implementation still needs production identity and durable hosted storage before public deployment.
- Production boundary tightened: prototype bearer-session issuance, invite acceptance, and session-authenticated relocation routes now fail closed under `NODE_ENV=production`; the public prototype remains local/demo-oriented until managed identity and durable hosted storage exist. `npm run typecheck` passes.
- Property selection now persists on the active personal move, rejects homes outside the current affordable/policy-fitting recommendations, and returns rent-budget, allowance, and rent-to-income context. Initial cash and mortgage approval remain unknown without provider evidence. The latest browser gate passed 26/26, including selecting, reloading, and clearing a home (`docs/qa/relocation-browser-2026-10-02T09-45-49-661Z.md`).
