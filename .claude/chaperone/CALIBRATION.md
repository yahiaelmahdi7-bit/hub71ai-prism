# Chaperone calibration (Jev grey-zone judge)

**Verdict:** Jev separates "edit would clash with the neighbouring claim" from "compatible" cleanly.
Final config: `t_warn=0.25`, `t_deny=0.5`, combine = max of the two noul probabilities, `jev_may_deny=true`.
UNSEEN (n=35): WARN precision 1.00 / recall 1.00; DENY precision 1.00 / recall 0.93 (14 of 15 real conflicts). Precision >= 0.9, so Jev is allowed to deny. Deterministic overlap DENY never depends on Jev.

## Cases
`tests/calibration_cases.py` writes `calibration_cases.jsonl`: 70 labelled (claim_a, edit_b) pairs of Next.js/TS hackathon code,
30 conflict / 40 compatible. Conflict = B renames/removes/retypes something A's region uses, or rewrites the same
JSX branch / CSS token / import list entry. Compatible = unrelated functions 10-15 lines apart, different JSX branches, additive
imports, different CSS tokens, comments, etc. Labels were written by the author (Claude), not by an independent reviewer.

## Method
- `calibrate.py collect`: one live Jev request per case, the same two noul questions the hook sends (`uses`: does B change a name/prop/type/signature used in A's region; `breaks`: would B likely conflict with or break A's change). Raw scores: `tests/raw.jsonl`.
- `calibrate.py fit`: seeded (seed 7), stratified 50/50 split: FIT 35 / UNSEEN 35. Thresholds are chosen on FIT only; UNSEEN is only scored.
- Cross-check: `jev-kit calibrate` (UNSEEN-gated) on the same scores: rc=0, UNSEEN precision 0.941 (act at 0.14).

## Scores (all 70)
| | conflict (30) | compatible (40) |
|---|---|---|
| `uses` | 0.05-0.98, median ~0.93 | 0.02-0.05 |
| `breaks` | 0.10-0.88, median ~0.72 | 0.04-0.13 |

The classes are far apart; Jev's noul scale is low for "no" (compatible never exceeded 0.13).

## Thresholds
- Raw FIT fit (lowest threshold with FIT precision 1.0): t_warn 0.08 / t_deny 0.13 (UNSEEN deny precision 1.00, recall 1.00). That sits on the razor edge of the gap (one compatible case scores 0.13), so it would be fragile on real code.
- **Chosen (hand-hardened to mid-gap): 0.25 / 0.5.** This was picked after seeing the score gap on all 70 cases, so its numbers are *indicative*, not a clean blind test:

| split | threshold | precision | recall | flagged |
|---|---|---|---|---|
| FIT | warn 0.25 | 1.00 | 0.93 | 14 |
| FIT | deny 0.50 | 1.00 | 0.80 | 12 |
| UNSEEN | warn 0.25 | 1.00 | 1.00 | 15 |
| UNSEEN | deny 0.50 | 1.00 | 0.93 | 14 |

Trade-off: higher thresholds mean fewer false alarms but some real conflicts only get a warning (or nothing if p < 0.25). Misses are acceptable here because the deterministic overlap rule and lanes remain the hard guarantees.

## Honesty notes
- n=35 UNSEEN, 15 positives: one case moves recall by ~7 points. Treat numbers as "clearly works", not "98.3%".
- Cases are synthetic and author-labelled; real agent edits are messier. Re-run `collect` + `fit` after hackathon day with real log.jsonl pairs.
- If unseen deny precision ever drops below 0.9 on a refit, `fit` sets `jev_may_deny=false` (Jev can only warn).
- `tests/kit_thresholds.json` and `jev-calibration-decisions.jsonl` are the jev-kit calibrate artefacts.
