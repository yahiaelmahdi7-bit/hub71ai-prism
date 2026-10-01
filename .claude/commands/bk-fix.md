---
description: Fix a bug described in plain words — hands it to the debugger (reproduce, root cause, smallest fix, verify).
argument-hint: <the bug in plain words>
---

Fix this bug: $ARGUMENTS

1. Launch the `bankable-debugger` agent (foreground) with the bug text, the Context block (stack, truth rules, ownership), and the expected behaviour from sample-docs/PERSONA.md or rules/rules.json if relevant.
2. The debugger must reproduce first, find the root cause, make the smallest fix, add a regression test if feasible, and run `npx tsc --noEmit` + `npm run build` in the foreground.
3. After 14:45 only fixes are allowed. If the fix needs a new feature, the debugger reports BLOCKED and proposes a cut; relay that to Yahia.
4. Report to Yahia in 3-6 lines, plain English: CAUSE (one line), FIX (one line), VERIFIED (what was run). If lib/types.ts or lib/openai.ts must change, the orchestrator makes that edit, not the debugger.

Rules: no pushing; foreground only; never print secrets.
