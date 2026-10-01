---
description: Run one build stage (argument 1-4): launch that stage's owner and QA on the previous stage in parallel; commit and tag on green.
argument-hint: <1|2|3|4>
---

Run Bankable stage $ARGUMENTS.

Stage map:
- 1 = `bankable-extraction-engineer` (docs -> IncomeProfile). Orchestrator first freezes lib/types.ts + lib/openai.ts.
- 2 = `bankable-rules-engineer` (rules.json + pure evaluate). Can start alongside stage 1 once lib/types.ts is committed.
- 3 = `bankable-verdict-designer` (verdict board + evidence drawer), plus `bankable-explainer` in the same message (separate lane: lib/explain).
- 4 = `bankable-proof-pack-builder` (app/pack).

Steps:
1. If the argument is not 1-4, say so and stop. Check the clock: after 14:45 refuse and point to /bk-fix or /bk-freeze.
2. Read docs/STATUS.md. If the previous stage is not green, say so and ask whether to proceed anyway.
3. In ONE message, launch in parallel: the stage owner(s) above (each in its own worktree if two code agents run at once) and `bankable-qa` on the previous stage's deliverable (skip for stage 1). Pass each the Context block, its lane, and the dispatch discipline.
4. When all return, the orchestrator verifies on disk: `npx tsc --noEmit`, the stage tests, `npm run build`, all in the foreground.
5. If green: merge worktrees locally, commit, and tag `stage-$ARGUMENTS`; update docs/STATUS.md. If red: dispatch `bankable-debugger` with the one-line symptom and re-verify; do not tag.
6. Report in 3-6 lines, plain English, verdict first: green/red, what now works on screen, what is next.

Rules: never push or merge to a remote; foreground gates only.
