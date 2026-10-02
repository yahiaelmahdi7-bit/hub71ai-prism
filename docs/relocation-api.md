# Bankable relocation API

The prototype backend uses SQLite at `BANKABLE_DB_PATH`, defaulting to `.bankable/relocation.sqlite`. Mutations run under serialized `BEGIN IMMEDIATE` transactions; status events are also copied into an immutable `relocation_event_ledger` table and cannot be rewritten or removed from the current document.

## Capability sessions

Authenticated routes use `Authorization: Bearer <sessionToken>`. Prototype session tokens are stored hashed. The API ignores `x-bankable-actor-*` headers. In production, set `YALA_LIVE_DEMO=true` only for the short-lived hackathon demonstration: this enables bootstrap for the fictional five-person fixture and accepts only its `demoOnly` sessions. It does not enable ordinary profile/program session issuance or invite acceptance. Remove the flag after the demo. Do not enter real personal data: the SQLite store and capability sessions are not production identity or durable hosted persistence.

`POST /api/relocation/bootstrap` is disabled by default in production and returns 403 unless `YALA_LIVE_DEMO=true`. In development, or when that production-only demo switch is enabled, it seeds/reuses the established-company fixture and returns fresh demo capability tokens. Profile/program creation and invite acceptance remain disabled in production until production identity and durable storage are configured:

```json
{
  "programId": "program-falcon-october-2026",
  "hrSessionToken": "...",
  "employees": [{ "personId": "person-sara", "displayName": "Sara Haddad", "sessionToken": "..." }]
}
```

## Endpoint Map

| Route | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/relocation/bootstrap` | `GET` | none | Preview HR-safe demo summary; no employee private hubs or tokens. |
| `/api/relocation/bootstrap` | `POST` | dev; production only with `YALA_LIVE_DEMO=true` | Seed or reuse fictional demo and return demo-only HR/person capability tokens. |
| `/api/relocation` | `GET ?op=me` | person bearer | Return the caller's private hub. |
| `/api/relocation` | `GET ?op=hr&programId=...` | HR bearer | Return HR aggregate projection for that program. |
| `/api/relocation` | `POST operation=create_profile` | none; dev only | Create private profile/case and return a person session. |
| `/api/relocation` | `POST operation=create_program` | none; dev only | Create company program and return an HR session. |
| `/api/relocation/profiles` | `POST` | none; dev only | Same as `create_profile`. |
| `/api/relocation/profiles/me` | `GET` | person bearer | Private person hub. |
| `/api/relocation/profiles/me` | `PATCH` | person bearer | Update the caller's reusable profile fields and recalculate the active case recommendations; keeps profile/case ids and timeline. |
| `/api/relocation/properties/selection` | `POST` | person bearer | Select or clear an affordable, policy-fitting recommended rental with `{ caseId, listingId }`; persists the case selection and returns the updated private hub. Send `listingId: null` to clear. |
| `/api/relocation/programs` | `GET` | HR bearer | Programs owned by the HR session's organization. |
| `/api/relocation/programs` | `POST` | none | Same as `create_program`. |
| `/api/relocation/programs/:programId/hr` | `GET` | HR bearer | HR-safe program view. |
| `/api/relocation/invites` | `POST` | HR bearer | Create a one-time program invite without accessing a private profile; optional `{ employeeLabel, expiresAt }`, returns `{ inviteId, token, expiresAt }`. |
| `/api/relocation/invites/:inviteId/accept` | `POST` | invite token body; dev only | Accept invite once with `{ token, profile }` or `{ token, existingSessionToken }`; creates or attaches the employee's private case and returns a person session. |
| `/api/relocation/actions/opened` | `POST` | person or HR bearer | Record server-known task/recommendation target as `opened`; request body is `{ caseId, targetId }`. |
| `/api/relocation/actions/status` | `POST` | person or HR bearer | Manual progress report for permitted tasks only: `{ caseId, taskId, state, reference?, blocker?, nextAction? }`. Allows `saved`, `resolved` (stored as `saved`), `reported_submitted`, `reported_booked`, `blocked`; rejects `confirmed`. |
| `/api/relocation/consents` | `GET` | person bearer | List caller's consent grants. |
| `/api/relocation/consents` | `POST` | person bearer | Grant recipient-specific fields. |
| `/api/relocation/consents/:consentId` | `DELETE` | person bearer | Revoke caller-owned consent. |
| `/api/properties` | `GET` | none | Dated property snapshot plus synthetic examples. Fresh portal pulling is only `mode=live-diagnostic`. |

## Privacy And Status Rules

- HR views show invite state, shared task milestones, safe blockers, policy fit and aggregate progress only. HR milestone next actions come from server-owned task text, not person-entered free text.
- HR views do not expose private evidence, identity evidence, bank results, personal income, personal annual budget, or private finance task notes.
- Opening WhatsApp, a listing, workspace page, or official portal records `opened`; it is never treated as sent, submitted, booked or confirmed. Recommendation opens are attached to the matching housing/workspace/setup/residence/insurance/finance task by server-side category metadata or catalog lookup, so HR progress uses shared tasks only and never counts private banking/finance opens.
- Manual submitted/booked reports require a user or HR reference and are labeled `user_report` or `hr_report` with server time. HR can update only shared program tasks.
- Client routes cannot create provider-confirmed status. Provider decisions require a future approved integration.
- Private hub budgets expose affordability filters and mark initial cash/payment terms as unknown until a provider confirms deposit, commission, cheque schedule and handover terms.
- A selected rental adds its annual/monthly asking rent, current budget and allowance fit, and rent-to-income share to the private hub. The share is unavailable when stated income is zero; selection never estimates initial cash or mortgage approval.

## Minimal create payloads

A private mover profile requires only the input groups needed to build the first hub: `workType`, household counts (`adults`, `children`) and income range (`minMonthlyAed`, optional `maxMonthlyAed`). `displayName` is optional and defaults to `Private mover`. Household counts must be whole nonnegative numbers with at least one total person, and income max must be greater than or equal to min. `PATCH /profiles/me` accepts the same profile fields partially, validates the merged profile, preserves profile/case ids and timeline, then recalculates recommendations for the active case.

A company program requires `hasUaeEntity`, `officeAreaId`, `teamSize`, `moveDate`, and `annualAllowanceAed`. `organizationName` is optional, and `teamSize` may be `0` for an empty program before invites are accepted. `jurisdiction` is required only when `hasUaeEntity` is `false`; allowed establishment branches are `mainland`, `adgm`, and `kezad`. Office areas must be supported Abu Dhabi area ids, dates must be real `YYYY-MM-DD` dates, and invalid `workType` values are rejected rather than silently treated as employees.

Authenticated reads do not auto-seed demo data. The Falcon demo is added only by explicit `POST /api/relocation/bootstrap`; bootstrap appends to existing local data while preserving previously issued sessions. In the live demo, use fictional fixture data only; demo sessions are rejected if `YALA_LIVE_DEMO` is unset.
