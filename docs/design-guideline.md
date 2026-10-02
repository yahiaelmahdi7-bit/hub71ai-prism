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

## Image-led area and housing pass

Area directory cards now lead with a real Abu Dhabi reference image and concise practical planning copy. The UI avoids internal audit wording on cards; source titles, checked dates, verification limits and credits live in secondary source sections. When `data/abu-dhabi/area-guides.json` is supplied by the data/image lane, the frontend expects either an array or `{ "areas": [...] }` with this shape:

```json
{
  "id": "al-maryah-island",
  "image": { "src": "/areas/al-maryah.jpg", "alt": "...", "credit": "...", "url": "...", "checkedAt": "2026-10-02" },
  "highlights": ["Source-backed planning fact"],
  "practicalActions": ["Action the mover can take"],
  "bestFor": ["Planning fit label"],
  "caveats": ["Limit that prevents overclaiming"]
}
```

Until licensed area-specific images arrive, area guides use existing Abu Dhabi reference photography and label it as a reference image, not a listing or area-specific proof. Home cards render `RentalHome.imageUrl` when the backend provides an original listing image; if unavailable, the card shows a clear no-photo state and never substitutes an area or generated image as a listing photo.

Fictional demo state is visible on every private or HR route derived from a synthetic profile/program. Public setup pages explain routes only; tracking starts inside the private move journey so an opened handoff has an owner, source and next action.

## Single personal workspace update

Personal discovery now lives in one filtered workspace at `/move`. The workspace uses in-page controls rather than route tabs: `Areas`, `Homes`, `Workspaces`, `Budget`, `Setup`, `Roadmap`, and `Edit inputs`. Legacy `/move/homes`, `/move/setup`, `/move/workspaces`, `/move/finance`, and `/move/timeline` redirect to matching `/move#...` anchors so old links remain valid while the active private profile stays in one loaded workspace.

The timeline is an original responsive winding-road SVG/CSS component with five milestones: homes, workspace, setup, residence and finance. Each milestone links to its actionable workspace section and the adjacent evidence panel shows source, time, owner, next action and blocker when present.

The visible product name is `Yala AD`; internal filenames, imports and local session keys retain their existing names for compatibility.
