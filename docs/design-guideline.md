# Bankable Relocation Design Guideline

Bankable is now a connected multipage relocation product, not a single long dashboard. The landing page introduces the three journeys, `/start` chooses the journey, and active work happens on focused screens for private movers and HR.

## Route Structure

- `/` and `/landing`: concise landing and navigation to the product routes.
- `/start`: route choice only: My move, Join my company’s move, Move my team, plus an explicit fictional demo option.
- `/move`: private onboarding when no profile exists; compact private overview when a profile is restored.
- `/move/profile`: edit the existing private plan without creating a duplicate or losing timeline history.
- `/move/homes`, `/move/setup`, `/move/workspaces`, `/move/finance`, `/move/timeline`: focused private tabs for inventory, official services, providers, readiness/evidence and status events.
- `/join`: invite acceptance. Users with a saved private session can use their existing profile; otherwise they create a private profile.
- `/company`: company program intake only.
- `/company/dashboard`: HR-only aggregate dashboard, zero-employee empty state and invite link creation.
- `/areas` and `/areas/[areaId]`: catalog-derived planning inputs with source links and 404 for unknown areas.
- `/setup` and `/setup/[jurisdiction]`: source-linked mainland, ADGM and KEZAD handoffs kept separate.

## Visual System

- Palette: warm ivory background, deep navy text, restrained teal actions, muted gold attention states and clear red blockers.
- Typography: Source Serif headings for institutional character; Inter for dense operational content.
- Layout: focused task pages use compact headers, a shared top navigation and small section tabs. Active dashboards avoid the oversized marketing hero.
- Components: homes, timeline events, HR rows, invite panels and official setup cards carry source/date/status labels near the action.

## Product Rules Reflected In UI

- Demo data is opt-in and labeled fictional.
- External actions record `opened` only. User-reported submitted/booked/blocked statuses are labeled as reports, never provider confirmations.
- Private profiles restore from the browser session and can be edited through `/move/profile`; edits preserve the journey and history.
- Solo movers never see a fake unlimited allowance cap. Their rent budget is described as a private planning cap from income share.
- Zero income or allowance values are accepted when explicitly entered, producing honest no-match or blocker states instead of substituted defaults.
- HR sees aggregate progress, deadlines, policy fit and shared blockers only. Private income documents, bank results and identity evidence remain hidden unless consent is granted.
- Area and setup pages derive public claims from `data/abu-dhabi/catalog.json` and show clickable source URLs.

## Accessibility

- Primary controls are native links, buttons, inputs or selects.
- Focus states are visible with high-contrast outlines.
- Color is paired with text status labels.
- Focused pages keep body text at readable sizes and collapse without horizontal scrolling.
