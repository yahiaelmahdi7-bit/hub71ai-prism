---
description: Ship — deploy to Vercel, QA the live URL, then walk the submission checklist before 15:45.
---

Ship Bankable.

1. Confirm the freeze tag exists (`freeze-1445`) or that Yahia accepts shipping the current commit. Check the clock: aim for a live URL by 15:00; submissions close 15:45.
2. Launch `bankable-deployer` (foreground): build, env via `vercel env add` (key never shown), `vercel --prod`, 200 check, disclaimer-in-HTML check, localhost fallback written to docs/deploy.md.
3. Then launch `bankable-qa` on the LIVE URL (full demo path, timings, oracle check, screenshots in docs/qa/). Any failure goes to `bankable-debugger`; redeploy and re-QA.
4. Run `bankable-truth-auditor` once on the final commit (PASS required to submit).
5. Walk this submission checklist and mark each item done only after verifying it this session:
   - live URL works from a phone on hotspot,
   - repo state committed and tagged `final` (Yahia pushes; never the agents),
   - submission text from docs/pitch/submission.md pasted in,
   - demo video or screenshots attached if the form asks,
   - disclaimer visible, no secrets in the repo, sample docs fictional,
   - backup assets ready: local build running, pre-recorded video, cached result.
6. Report to Yahia in 3-6 lines, plain English, verdict first: SHIPPED / NOT YET, the live URL, remaining checklist items, minutes to the 15:45 deadline.

Rules: no pushing by agents; foreground only; never print secrets.
