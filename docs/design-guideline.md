# Bankable Relocation Design Guideline

Bankable should feel like a calm Abu Dhabi relocation desk: official enough for HR and useful enough for an employee trying to act today. The first screen is a working product surface, not a document checker or marketing page.

## Visual System

- Palette: warm ivory background, deep navy text, restrained teal actions, muted gold attention states and clear red blockers.
- Typography: Source Serif headings give institutional character; Inter supports dense operational data.
- Layout: a short route/intake header leads into a two-column operations hub. At 1024px and mobile widths, the rail and hub collapse into a single-column workflow.
- Components: panels are purposeful work surfaces. Homes, employees, metrics, setup routes and timeline entries use compact cards with source/date/status labels.

## Product Rules Reflected In UI

- Three routes are visible: My move, Join my company's move, Move my team.
- Company setup asks mainland, ADGM or KEZAD only when the company says the UAE entity is not ready.
- The five-person company scenario is labeled fictional and loads private employee journeys only through local bearer-session bootstrap.
- Public preview shows HR-safe employee labels and aggregate progress, not private personal hubs.
- Homes come from the relocation API. Contact buttons appear only when a listing is non-synthetic, contactable and source-linked.
- Opening external listings or official services records `opened` only; submission, booking, contact and approval remain provider- or user-reported.
- HR view states its privacy boundary and excludes personal financial or identity evidence without recipient-specific consent.
- Mainland, ADGM and KEZAD routes remain distinct.
- Finance shows readiness factors only and no approval probability. Initial cash is shown as unknown until verified lease/payment terms exist.

## Accessibility

- All primary controls are native buttons, links, inputs or selects.
- Focus states are visible with high contrast outlines.
- Color is paired with text status labels.
- Body text is sized for readability and collapses without horizontal scrolling at mobile widths.
