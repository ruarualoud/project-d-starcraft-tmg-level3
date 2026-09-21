# Ticket 23 / Slice 248 — terminal-tool JSON convergence blocker

## Outcome

The third and final live convergence attempt stopped without applying revision
9. The recovery branch
`build/ticket-23-slice-248-standard-2000-aa-live-v1/20260921211447031`
replayed the eight accepted transitions to the last valid Authority state, then
the player-2 Action stage produced three consecutive terminal
`submit_decision` calls whose arguments were not valid JSON. The Host rejected
all three as
`SEMANTIC_CORRECTION_REQUIRED:TERMINAL_TOOL_SUBMISSION_INVALID:arguments_invalid_json`
and raised the integration-blocking High finding
`LIVE_DECISION_TERMINAL_TOOL_INVALID`.

The Room remains safely at state revision 8. No proposed revision-9 action was
Previewed or Applied, and none of this attempt is eligible for training.

## Evidence and diagnosis boundary

- Planner rounds 1–3 completed their spatial/Skill queries and submitted a
  valid planning record.
- Action rounds 4–5 completed their queries.
- Action rounds 6–8 each submitted malformed JSON tool arguments.
- The three Action outputs used 2,989, 2,774 and 2,331 output units against an
  8,192-unit allowance, so the evidence does not support output truncation.
- The safe decision journal records the tool name, typed failure reason and an
  empty normalized argument object. It intentionally does not retain the raw
  malformed argument string, so this run cannot prove the exact syntax defect.

This is a structured-output transport/protocol failure, not another
opponent-prediction lifecycle contradiction. Strict tool schemas prevented an
invalid action from entering Authority, but they did not make the Provider's
tool argument bytes valid JSON.

## Convergence decision

No fourth paid retry is allowed in this repair cycle. The prior two live
lifecycle attempts and this terminal-format attempt exhaust the user-mandated
three-round convergence budget. A future, explicitly scoped reliability slice
may add bounded local JSON repair or a redacted syntax-forensics envelope, but
must first reproduce this exact failure and must not weaken Rules, semantic or
Authority validation.

## Accounting

This attempt used `8` Provider calls, `396,500` input units and `13,430` output
units (`409,930` total), estimated at `¥0.540267`. Recent recovery work now
totals `53` calls, `2,446,071` units and `¥3.348352`; including the original
invalid-suffix source, the lineage totals `82` calls, `3,792,865` units and
`¥5.201073`. No `¥100` notification threshold was crossed.

## Harness round summary

- `harnessLoopUsed`: true
- `targetGames`: `starcraft-tmg`
- `promptPackRoutes`: `selfplay_agent_prompt` for player 2
- `harnessToolsCalled`: spatial queries, Skill reads and terminal
  `submit_planning` / `submit_decision`
- `uiTraceEvidence`: initial r8 browser screenshot plus blocking failure
  screenshot in the run directory
- `agentDecisionEvidence`: valid Planner record; no accepted Action record
- `memoryTraceEvidence`: restored same-match plan at r8; malformed Action
  attempts excluded from memory/training
- `trainingTraceCandidates`: none
- `rollbackOrDemotionRules`: retain r8, reject all r9 candidates, do not retry
  a fourth time in this cycle
- `userVisibleChecks`: Authority revision remains 8 and the run reports one
  High blocking finding rather than a false success
