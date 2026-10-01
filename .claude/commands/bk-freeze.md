---
description: 14:45 feature freeze — from now only fixes, rehearsal and deploy; the orchestrator lists what is cut.
---

Declare the Bankable feature freeze.

1. Launch the `bankable-orchestrator` agent (foreground). It must:
   - run `git status`; commit any finished, passing work; stash nothing silently, and flag any uncommitted half-done change for Yahia to decide on,
   - run `npm run build` and the tests; if red, dispatch `bankable-debugger` first,
   - tag the commit `freeze-1445`,
   - write to docs/STATUS.md: FREEZE time, what is in the demo, and a CUT list (every feature or idea not finished, with one line why),
   - state the allowed work: bug fixes, copy and wording, rehearsal, deploy; and the forbidden work: new features, new rules, new pages, dependency upgrades.
2. Tell every later dispatch (/bk-stage refuses; /bk-fix allowed) that the freeze is in force.
3. Report to Yahia in 3-6 lines, plain English, verdict first: frozen at commit X, what the demo contains, what is cut, and the next three commands: `/bk-gate`, `/bk-pitch`, `/bk-ship`.

Rules: no pushing; foreground only; no new features after this point, even small ones.
