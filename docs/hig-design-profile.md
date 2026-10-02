# Bankable visual profile — formal, quietly surreal

This is the design direction for the Abu Dhabi relocation hub. It translates interaction patterns from the local [HIG sample book](../../hig-sample-book/HUB-DESIGN.md) into a web product. The sample book is a reference for behavior and restraint; Bankable uses its own type, shapes, symbols, and assets.

## The feel

Bankable should resemble a precise relocation desk set inside a slightly dreamlike landscape. The desk is the interface: calm, legible, dependable. The landscape lives at its edges: one soft architectural horizon, impossible but subtle depth, and light that shifts across ivory and deep blue. The surreal layer must never alter a price, status, source, form field, or button.

Use a formal editorial voice: Source Serif for one decisive screen heading and key figures; Inter for controls, labels, evidence, and dense information. Use sentence case. Keep explanations short and factual. The existing ivory, navy, teal, and muted gold palette remains the base. Gold signals attention; red marks a real blocker. Avoid neon, luminous gradients behind text, decorative glass cards, floating objects over controls, and unrelated illustrations.

## Borrowed interaction grammar

| HIG sample book pattern | Bankable use | Reference |
| --- | --- | --- |
| One selected list item opens one detail pane | On desktop, the employee or shortlisted home list selects a single detail view; on mobile, the detail becomes a focused next screen with a clear Back action. | `Sources/HIGSampleBook/Hub/Screens/Apps/ListDetailApp.swift` |
| Onboarding advances one decision at a time | Route first, then at most three required answer groups. Keep one primary action at the end of each step and preserve a way back. | `Sources/HIGSampleBook/Hub/Screens/Apps/OnboardingApp.swift` |
| A blank state names its cause and offers one action | No suitable homes explains which hard constraint removed results and offers a direct way to edit that constraint. Empty timelines point to the first real action. | `Sources/HIGSampleBook/Hub/Screens/Apps/EmptyStateApp.swift` |
| Confirmation is reserved for consequential actions | Show the recipient and selected fields before consent; destructive revoke asks for confirmation. Ordinary external handoffs need clear labels, not confirmation theater. | `Sources/HIGSampleBook/Hub/Screens/Apps/SheetConfirmApp.swift` |
| Quiet control surfaces, content in the foreground | Keep the top navigation compact. Use subtle translucency only for navigation; content panels stay opaque for legibility. | `HUB-DESIGN.md` §0.5; `Sources/HIGSampleBook/Hub/Shared/ControlBar.swift` |
| Selected and focused states are explicit | Selected employee, route, home, and view each have a visible state beyond color. All controls retain a strong keyboard focus ring. | `Sources/HIGSampleBook/Hub/Shared/CompactTile.swift` |

## Screen composition

1. **Welcome:** a small brand/header, a direct heading, three route choices, and one next action. The atmospheric motif may sit behind or beside this choice area; keep the form on a solid surface. The working product starts immediately below, without a marketing detour.
2. **Personal intake:** one question group per step: work, household, income. Optional evidence upload is offered after the user has a useful plan. Explain why an answer matters only at the point of input.
3. **Private hub:** start with one priority action, then a compact budget and a short home shortlist. Housing, workspaces, setup, finance, and timeline share the same card grammar: title, status, source/date, reason, next action. Reveal detail on selection instead of stacking every explanation on the landing view.
4. **Company hub:** a list of five employees opens a permitted progress detail. Aggregate figures and blockers come first. The privacy boundary remains visible in plain words, and employee financial evidence stays out of the HR view.
5. **Action detail:** show what opening an external portal will do, the named source, and the status Bankable can truthfully record. Use “Open listing,” “Open official service,” or “Open booking page” rather than “Contacted,” “Submitted,” or “Booked” until those events have evidence.

## Visual rules for the active UI pass

- Keep one card radius family and one spacing rhythm; favor a few substantial surfaces over nested cards.
- A formal heading can be expressive, but operational text stays level and easy to scan. Avoid all-caps paragraphs and tiny labels.
- Put source and checked date next to each market or official fact. Mark fictional people and synthetic homes at the point they appear.
- Status must combine text with shape or icon. Progress motion is restrained: 150–250 ms, opacity/position only, and disabled under reduced motion.
- Use an original abstract motif, such as layered dunes or an impossible architectural arch, only in the welcome/transition background. Limit it to one motif per screen and let it disappear behind data-dense content.
- An original arch-and-horizon option is available at `public/relocation-horizon.svg`. Treat it as a quiet background or cropped side image beside route selection; keep text and controls on solid surfaces.
- Check 1440 px, 1024 px, and mobile widths, plus keyboard navigation. The first useful action should remain visible without horizontal scrolling.

## Boundaries for implementation

The active UI helper owns `app/**` and `components/**` (excluding API routes and `app/pack/**`) and the existing `docs/design-guideline.md`. This profile is a separate reference so concurrent screen work can incorporate the direction without overlapping edits. Do not copy SwiftUI code, Apple symbols, SF fonts, or Apple assets into the web app; transfer the interaction ideas with web-native controls and Bankable's own visual assets.

## Immediate handoff against the current prototype

- `components/BankableRelocationApp.tsx`: shorten the opening copy and reduce the hero's vertical claim so a route decision and the first useful hub action are visible together at desktop size. The current three routes already provide the right entry structure.
- `components/BankableRelocationApp.tsx`: the employee list plus selected hub already resembles the HIG list/detail pattern. Preserve that relationship when wiring real data, and turn the mobile version into a focused selection/detail sequence.
- `components/BankableRelocationApp.tsx`: replace preview-only primary buttons with a real action or a clearly labeled unavailable state as APIs are integrated. A decorative control that appears actionable breaks the otherwise formal tone.
- `app/globals.css`: keep the warm palette and serif heading, but confine the grid/atmosphere to the welcome edge. Solid, quiet backgrounds should carry figures, homes, statuses, and source dates.
