---
description: Ask a factual question about banking/renting/visa requirements — answered from the research first, then primary sources, with URL and confidence.
argument-hint: <factual question in plain words>
---

Answer this factual question: $ARGUMENTS

1. Launch the `bankable-fact-checker` agent (foreground) with the question and the truth rules (never guess; cite or say NOT FOUND).
2. It checks docs/rules-research.md and rules/rules.json first, then primary sources (the bank, regulator or government page), and returns ANSWER / SOURCE URL / CONFIDENCE / CHANGES RULES?.
3. If it says a rule would change, do NOT edit rules.json here; tell Yahia, and if he agrees, run `/bk-stage 2`-style work through `bankable-rules-engineer` (before 14:45 only).
4. Report in 3-6 lines, plain English, verdict first, with the URL.

Rules: read-only; no guessing; no pushing.
