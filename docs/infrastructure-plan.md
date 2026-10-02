# Bankable relocation infrastructure

The goal is a practical Abu Dhabi relocation action hub: help individuals and companies move, settle in, and build a future. This first delivery builds the shared data and server foundation for the system diagram in [app-flow.md](app-flow.md). The first complete data scenario is an already-established UAE employer moving five employees. The existing optional document reader remains an evidence module.

## Ownership and delivery

The lead owns shared contracts, integration, verification, and live status. Three native helpers own disjoint lanes:

1. Official reference data: dated primary sources, real workspace handoffs, distinct mainland/ADGM/KEZAD routes, supported financial-readiness factors.
2. Housing data: normalized source-linked observed listings, dated snapshot fallback, visibly separate synthetic examples, deterministic affordability and allowance filters.
3. Relocation domain: durable local persistence, private reusable profiles, company programs, invitations, scoped consent, append-only action events, private hubs and safe HR summaries.

Each helper reviews its area before editing. Existing uncommitted work is preserved. No new dependencies, remote publishing, or external messages are needed for this delivery.

## Data contracts

`lib/types.ts` keeps the existing `IncomeProfile` contract and adds the relocation model from the diagram: `PersonProfile`, `Organization`, `MoveProgram`, `RelocationCase`, `RelocationTask`, `StatusEvent`, `ConsentGrant`, and `SourceRecord`. `ReferenceCatalog` connects areas, workspaces, official services, and financial factors to their sources. `RentalHome` distinguishes an observed listing from a synthetic example and a fresh pull from a dated snapshot.

Every external fact has a source URL, checked time, confidence, and verification limitation. A source that cannot be read does not become a verified requirement. Actual asking prices are not lease transactions or confirmed availability. Official aggregate rent guides are separate from portal asking rents. Synthetic employees and homes are clearly labeled; synthetic homes have no agent-contact action.

## Product boundaries

Personal onboarding requires work type, household, and income or range. Company onboarding requires entity status, office area, team size, move date, and allowance. Jurisdiction is required only for a company that needs establishment. Employees use the same private journey after accepting an invite.

Filter listings against the lower income-range bound and company allowance before ranking preferences. Any housing-income share and household-to-bedroom defaults are editable planning assumptions, not official rules. Unknown fees and commute times stay unknown; asking rent can supply a useful rent budget while initial-cash estimates require actual payment terms and fee evidence.

HR receives a server-built projection of permitted move progress, dates, policy fit, aggregate budget and blockers. Private income, income documents, identity evidence, and bank results are excluded by default. Sharing a sensitive field requires an unexpired, unrevoked grant to the specific recipient for that field. A progress-sharing choice never implies financial-data consent.

The event ledger stores state, source, time, owner, next action, and blocker. External handoffs produce `opened`; personal reports remain `reported_submitted` or `reported_booked`. Provider confirmations require trusted provider evidence. Ordinary clients cannot forge provider updates or government synchronization.

## Persistence and deployment boundary

Use the installed Node 24 runtime and built-in SQLite for a durable local foundation with migrations, foreign keys and transactions. Private database files and sidecars live under ignored `.bankable/`. Session and invitation capabilities are scoped, expiring, and stored as hashes. The local fictional demo cannot bootstrap in production. Production identity, managed storage, approved provider integrations and operational controls remain later deployment work; this delivery does not establish government affiliation or certification.

## Verification criteria

- Source IDs resolve; dates and URLs are valid; separate company jurisdictions have separate official handoffs.
- Real listing price, period, source link and observation date survive normalization; synthetic homes are never contactable.
- Income and allowance exclusions happen before preference ranking; invalid budgets fail closed; empty results surface an actionable blocker.
- Five fictional employees have private profiles and useful housing/setup/work/finance actions, with realistic variation and honest blockers.
- Server authorization rejects another person's case and another organization's program. Invalid, expired and replayed invites fail.
- HR serialization excludes sensitive data by default; consent applies only to a named recipient and field, expires, and stops sharing when revoked.
- Opened actions cannot become sent, submitted, booked or confirmed merely through a handoff. Event provenance is server-owned and historical events are immutable.
- Persistence survives reopening; input validation, transactional state changes and duplicate operations are covered by meaningful tests.
- Targeted tests, typecheck, lint, production build and an HTTP smoke exercise provide fresh evidence. Existing unrelated warnings are reported separately.

The stop condition for this delivery is a verified data/API foundation and runnable five-person demo scenario, ready for the relocation screens to consume.
