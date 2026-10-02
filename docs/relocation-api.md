# Bankable relocation API

The prototype backend uses SQLite at `BANKABLE_DB_PATH`, defaulting to `.bankable/relocation.sqlite`. Mutations run under `BEGIN IMMEDIATE`; status events are also copied into an immutable `relocation_event_ledger` table.

## Capability sessions

Authenticated routes use `Authorization: Bearer <sessionToken>`. Dev demo tokens are returned only by local bootstrap and are stored hashed. The API ignores `x-bankable-actor-*` headers.

`POST /api/relocation/bootstrap` is disabled when `NODE_ENV=production`. In development it seeds the established-company demo if missing and returns fresh capability tokens:

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
| `/api/relocation/bootstrap` | `POST` | dev only | Seed or reuse demo and return HR/person capability tokens. |
| `/api/relocation` | `GET ?op=me` | person bearer | Return the caller's private hub. |
| `/api/relocation` | `GET ?op=hr&programId=...` | HR bearer | Return HR aggregate projection for that program. |
| `/api/relocation` | `POST operation=create_profile` | none | Create private profile/case and return a person session. |
| `/api/relocation` | `POST operation=create_program` | none | Create company program and return an HR session. |
| `/api/relocation/profiles` | `POST` | none | Same as `create_profile`. |
| `/api/relocation/profiles/me` | `GET` | person bearer | Private person hub. |
| `/api/relocation/programs` | `GET` | HR bearer | Programs owned by the HR session's organization. |
| `/api/relocation/programs` | `POST` | none | Same as `create_program`. |
| `/api/relocation/programs/:programId/hr` | `GET` | HR bearer | HR-safe program view. |
| `/api/relocation/invites` | `POST` | HR bearer | Create a one-time program invite without accessing a private profile; optional `{ employeeLabel, expiresAt }`, returns `{ inviteId, token, expiresAt }`. |
| `/api/relocation/invites/:inviteId/accept` | `POST` | invite token body | Accept invite once with `{ token, profile }` or `{ token, existingSessionToken }`; creates or attaches the employee's private case and returns a person session. |
| `/api/relocation/actions/opened` | `POST` | person or HR bearer | Record server-known task/recommendation target as `opened`; request body is `{ caseId, targetId }`. |
| `/api/relocation/actions/status` | `POST` | person or HR bearer | Manual progress report for permitted tasks only: `{ caseId, taskId, state, reference?, blocker?, nextAction? }`. Allows `saved`, `reported_submitted`, `reported_booked`, `blocked`; rejects `confirmed`. |
| `/api/relocation/consents` | `GET` | person bearer | List caller's consent grants. |
| `/api/relocation/consents` | `POST` | person bearer | Grant recipient-specific fields. |
| `/api/relocation/consents/:consentId` | `DELETE` | person bearer | Revoke caller-owned consent. |
| `/api/properties` | `GET` | none | Dated property snapshot plus synthetic examples. Fresh portal pulling is only `mode=live-diagnostic`. |

## Privacy And Status Rules

- HR views show invite state, shared task milestones, safe blockers, policy fit and aggregate progress only.
- HR views do not expose private evidence, identity evidence, bank results, personal income, personal annual budget, or private finance task notes.
- Opening WhatsApp, a listing, workspace page, or official portal records `opened`; it is never treated as sent, submitted, booked or confirmed.
- Manual submitted/booked reports require a user or HR reference and are labeled `user_report` or `hr_report` with server time. HR can update only shared program tasks.
- Client routes cannot create provider-confirmed status. Provider decisions require a future approved integration.
- Private hub budgets expose affordability filters and mark initial cash/payment terms as unknown until a provider confirms deposit, commission, cheque schedule and handover terms.

## Minimal create payloads

A private mover profile requires only the input groups needed to build the first hub: `workType`, household counts (`adults`, `children`) and income range (`minMonthlyAed`, optional `maxMonthlyAed`). `displayName` is optional and defaults to `Private mover`. Household counts must be whole nonnegative numbers with at least one total person, and income max must be greater than or equal to min.

A company program requires `hasUaeEntity`, `officeAreaId`, `teamSize`, `moveDate`, and `annualAllowanceAed`. `organizationName` is optional. `jurisdiction` is required only when `hasUaeEntity` is `false`; allowed establishment branches are `mainland`, `adgm`, and `kezad`.
