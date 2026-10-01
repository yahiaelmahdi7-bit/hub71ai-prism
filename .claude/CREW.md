# Bankable crew — runbook for Yahia

You direct; the agents type. Every agent answers in 3-6 plain-English lines, verdict first. Gulf time throughout.

## Cases: situation -> command -> who runs

| Situation | Command | Agents |
|---|---|---|
| 09:15, day starts | `/bk-start` | setup, then orchestrator |
| Build the next piece | `/bk-stage 1`..`4` | stage owner + QA on previous stage (parallel) |
| Something is broken | `/bk-fix <what you see>` | debugger |
| "Is it good / honest / working?" | `/bk-gate` | qa + truth-auditor + judge-panel (parallel) |
| Need a fact (bank, visa, rent) | `/bk-ask <question>` | fact-checker |
| 14:45 | `/bk-freeze` | orchestrator |
| Need script, pitch, Q&A | `/bk-pitch` | demo-director + pitch-writer + qna-coach, then truth-auditor |
| Put it live and submit | `/bk-ship` | deployer, qa (live), truth-auditor |
| Where is X in the code? | ask `bankable-scout` | scout |
| Need an edge-case person | ask `bankable-persona-forge` | persona-forge |

Stages: 1 extraction, 2 rules, 3 verdict screen (+ explainer), 4 proof pack.

## Hour by hour (Gulf time)

- 09:15 `/bk-start`. Fix any red check (hotspot, `vercel login`).
- 09:30 `/bk-stage 1` and `/bk-stage 2` together (types frozen first). Persona-forge can make the 2nd persona now.
- 11:00 `/bk-stage 3`. First full run: upload Sara, see verdicts.
- 12:00 Working lunch: `/bk-gate`, read the ranked fix list while eating.
- 12:45 `/bk-stage 4` (proof pack). Fix list items via `/bk-fix`.
- 14:00 Last feature work ends. Run `/bk-gate` again.
- 14:45 `/bk-freeze`. No new features after this, even small.
- 14:50 `/bk-pitch` (script, text, Q&A). Start rehearsing out loud.
- 15:00 `/bk-ship`. Live URL by 15:00 at the latest.
- 15:30 Submit. Closes 15:45. Judging 15:55, top 6 at 17:25, finals 17:40.
- 15:45-17:40 Rehearse twice (once with wifi off), keep the backup video open.

## Six rules that stop the team colliding

1. One lane per agent: extraction `lib/extract`, rules `lib/rules` + `rules/`, UI `app/` + `components/`, pack `app/pack`, explain `lib/explain`, tests `tests/`, docs `docs/`.
2. `lib/types.ts` and `lib/openai.ts` belong to the orchestrator only; frozen after stage 1. Need a change? Ask the orchestrator.
3. Two code agents at once means separate worktrees; the orchestrator merges locally.
4. Agents commit; only YOU push. Nobody merges to a remote or "ships" on their own.
5. Done means the test or build output was shown. "It ran" is not done; the orchestrator re-runs gates itself.
6. After 14:45: fixes, rehearsal, deploy only. Cut scope early: demo path (upload -> verdicts -> drawer -> pack) always wins.

## Truth lines (never cross)

No invented rules or numbers; every verdict links its source; the disclaimer is on screen; no bank partner, licence, users or traction claims; fictional documents only; no haircut percentage; keys never in chat or git.

## Where things land

`docs/STATUS.md` (live board), `docs/qa/` (screenshots + timings), `docs/audit/` (truth reports), `docs/demo/`, `docs/pitch/`, `docs/qna/`, `docs/deploy.md`.
