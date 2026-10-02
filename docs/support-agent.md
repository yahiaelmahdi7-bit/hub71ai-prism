# Sage support navigator

Sage is the Yala AD in-app support bubble. The current build uses a local deterministic navigator, not a live HiredHands or government/provider integration.

Sage receives only a short chat message and the current path. It does not receive session tokens, income values, uploaded evidence, identity records, HR invite secrets, bank results or private documents.

Sage can:

- Explain source-backed relocation steps in plain language.
- Link to dated catalog sources beside guidance.
- Navigate users to allowlisted Yala AD routes such as `/start`, `/move#homes`, `/move#setup`, `/move#timeline`, `/company`, `/company/dashboard`, `/join`, `/areas`, `/homes` and `/setup`.
- Help prepare what to do next before the user opens an official or provider service.

Sage cannot:

- Submit government, visa, bank, booking, tenancy or licence actions.
- Claim provider confirmation, approval, delivery or sync status.
- Inspect or share private employee income, bank, identity or evidence data from chat.

The route is `POST /api/support/sage`. It returns `mode: "local_navigator"`, a message, allowlisted navigation actions and optional source records.
