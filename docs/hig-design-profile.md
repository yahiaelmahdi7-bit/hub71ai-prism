# Bankable visual profile

Bankable uses a quiet, Apple-inspired interface for an Abu Dhabi move: direct navigation, large readable type, generous space, and one clear action at a time. A restrained surreal note comes from the waterfront photograph, its dusk reflection, and gentle depth while scrolling. The atmosphere belongs to the landing page; operational screens keep facts and actions on solid, legible surfaces.

## References and assets

- The local HIG sample book (`/Users/y/Projects/hig-sample-book/HUB-DESIGN.md`) informs focused navigation, selected states, list/detail behavior, and concise empty states. Reuse the interaction principles, not Apple assets or SwiftUI code.
- The indexed web library (`/Users/y/Projects/design-harvest/library`) informed the balance of image and content: Sobha Privy Collection for architectural framing and Aspen Search for restrained navigation and section rhythm. No site assets are copied.
- The landing uses the Abu Dhabi waterfront photograph supplied in this conversation, stored at `public/abu-dhabi-waterfront.jpg`. The image is decorative, with text contrast protected by a dark overlay.
- A second user-supplied clip of Sheikh Zayed Grand Mosque appears once in the Explore section. The short, muted local loop is `public/abu-dhabi-mosque-loop.mp4`, with a still poster at `public/abu-dhabi-mosque-poster.jpg`. The UAE flag clip remains unused so the landing keeps one clear visual accent.
- The provider panel follows the composition of the user-supplied service-card screenshot: plain message and action on the left, staggered service tiles on the right, and a clean mobile grid. Its Property Finder, TAMM, ADGM, ADIB, and KEZAD tiles use original text treatments and open Bankable routes, not copied logos or asserted partnerships.

## Screen and motion rules

- The landing names the three journeys immediately: move personally, join a company move, or move a team. Each links to its dedicated route. Navigation also reaches the landing sections and the area, homes, and setup directories.
- Use Inter for interface type. Large headings may be expressive through scale and spacing; forms, statuses, prices, and sources stay plain.
- Preserve the navy, ivory, muted teal, and warm light palette. Use borders and whitespace before adding cards. Keep one primary action per decision area.
- The waterfront shifts slightly while scrolling, capped at 72 px and driven through `requestAnimationFrame`. The mosque video plays only while visible. Disable the shift and keep the video paused when `prefers-reduced-motion` is set. No motion should move a control away from the user or change meaning.
- Show text labels for states; color alone never carries status. Put sources and checked dates beside market or official facts. Mark fictional people and synthetic homes where they appear.
- Test 1440 px and mobile widths, keyboard navigation, working destination routes, and reduced motion. The first useful path must appear without horizontal scrolling.

## HIG patterns for the working screens

| Pattern | Bankable use |
| --- | --- |
| List and detail | Select one employee or home and reveal one focused detail; mobile gets a clear way back. |
| Progressive onboarding | Route first, then small groups of required questions, with a visible back path. |
| Honest empty state | Name the missing input or constraint and offer one next action. |
| Explicit selection | Selected route, home, employee, and view have a visible state beyond color. |
| Consequential confirmation | Confirm recipient and selected fields before consent; ordinary external links have plain labels. |

The working hubs should match the landing's restraint. Keep private evidence out of the HR view, avoid decorative cards around every datum, and label external handoffs according to what Bankable can actually verify.
