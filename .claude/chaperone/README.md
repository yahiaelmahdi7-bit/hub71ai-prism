# Chaperone — stops two agents editing the same lines

What it does: before any agent edits or writes a file, Chaperone checks whether another
agent is already working on those lines (in any git worktree of the repo).
- Same lines: the edit is blocked and the agent is told who has it, and to work elsewhere.
- Nearby lines: Jev (the small AI judge) decides if the edits would clash. Worst case it warns the agent.
- Jev down or slow: the edit goes through. Only the exact-overlap block is guaranteed.
- A claim lasts 8 minutes after that agent's last edit, or until the agent finishes.
- `lib/types.ts` and `lib/openai.ts` can only be edited by `bankable-orchestrator`.

See what's going on: `.claude/chaperone/bin/chaperone status` (who holds what), `... log 20` (decisions).
Free a stuck claim: `... release <agent>`.
Turn it off: `.claude/chaperone/bin/chaperone off` (or start with `CHAPERONE_OFF=1`). Turn on: `... on`.
Install: copy `.claude/` into the project, merge `settings.json` hooks if one exists, `chmod +x` the hook and CLI.
Everything it records is in `.claude/chaperone/log.jsonl`. Calibration details: `CALIBRATION.md`.
