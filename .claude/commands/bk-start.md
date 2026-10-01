---
description: 09:15 kickoff — run the morning environment check, then have the orchestrator write today's docs/STATUS.md.
---

Start the Bankable build day.

1. Launch the `bankable-setup` agent (foreground). It returns a pass/fail list for node, deps, `.env.local` key (never printed), model reachability, `npm run smoke`, wifi / hotspot, and Vercel login.
2. If any check is FAIL, stop and report the single most important fix to Yahia in plain English. Do not continue to step 3 until the blockers are cleared or Yahia says go anyway.
3. Launch the `bankable-orchestrator` agent with the setup result. It must:
   - read docs/rules-research.md and sample-docs/PERSONA.md,
   - write docs/STATUS.md: Gulf-time clock (build 09:15-15:45, lunch 12:00, FREEZE 14:45, submissions close 15:45, judging 15:55, top 6 at 17:25, finals 17:40), the four stages with owner agents, what is done/blocked/next, and the demo-path-first scope cut list,
   - write lib/types.ts and lib/openai.ts if they do not exist yet, and commit them.
4. Report to Yahia in 3-6 lines, verdict first: ready to build or not, what stage 1 starts next, what he needs to do (e.g. `vercel login`).

Rules: no pushing; foreground only; never print secrets.
