---
description: Quality gate — run QA, the truth audit and the judge panel in parallel, then merge into one ranked fix list.
---

Run the Bankable gate.

1. In ONE message, launch in parallel (all read-only or test-only, no lane conflicts):
   - `bankable-qa` on the demo path against the current URL (localhost or live): timings, oracle regression, screenshots in docs/qa/.
   - `bankable-truth-auditor`: PASS/HOLD with exact lines.
   - `bankable-judge-panel`: scorecard and top 3 fixes by points per minute.
2. Merge the three outputs into ONE ranked fix list, most urgent first:
   - truth BLOCKERs and QA failures on the demo path come before anything else (a lie or a broken demo outweighs any score gain),
   - then judge-panel fixes ordered by points per minute,
   - drop duplicates; for each item give: what, owner agent, minutes.
3. Respect the clock: after 14:45 keep only fixes, copy, rehearsal and deploy items; list the rest as "cut".
4. Write the merged list to docs/STATUS.md under "Gate" with the time.
5. Report to Yahia in 3-6 lines, plain English, verdict first: GO / FIX FIRST, the top 3 items, and which command runs each (`/bk-fix <bug>`).

Rules: read-only gate agents do not edit; no pushing; foreground only.
