# Ticket 25 / Slice 265 — restored TurnPlan authority repair

## Outcome

The Ticket 23 / Slice 248 revision-6 fork restored a valid Room and same-match
plan record, but every player-2 drive stopped before Provider egress with
`Cannot read properties of null (reading 'stateHash')`.

The fork seed stored its current authority on the continuity record. Historical
TurnPlan hydration read only `payload.lastValidatedAuthority`, which that seed
format did not contain, and `observe_state` then dereferenced the resulting
null value.

TurnPlan hydration now falls back to the continuity record's authority. The
observation boundary also treats a genuinely authority-less historical plan as
requiring reassessment instead of throwing. This does not authorize an action:
the current Room, LegalSpace, ActionSpace, Preview, Apply and Replay boundaries
remain unchanged.

## Focused verification

Command:

```text
node scripts/verify-ticket-25-slice-265-restored-plan-authority-v1.mjs
```

Before the repair it failed on the missing restored `stateHash`. After the
repair the same command passed once with revision 6 authority, zero Provider
calls and zero paid cost. No unrelated gate was run.

## Harness loop evidence

- `harnessLoopUsed`: true
- `targetGames`: `starcraft-tmg`
- `promptPackRoutes`: `selfplay_agent_prompt` (not invoked by the focused gate)
- `harnessToolsCalled`: continuity query, TurnPlan hydrate/read/observe
- `uiTraceEvidence`: existing revision-6 connected screenshot remains the
  continuation checkpoint; no new UI claim is made by this repair
- `agentDecisionEvidence`: none generated; failure occurred before Provider
- `memoryTraceEvidence`: restored `turn_plan` authority state revision/hash
- `trainingTraceCandidates`: none
- `rollbackOrDemotionRules`: revert if a restored plan can bind a different
  Room state or bypass current reflection/LegalSpace checks
- `userVisibleChecks`: the formal continuation must next prove one successful
  revision-6 Agent drive and current Apply/Replay parity

## Accounting

Provider calls: 0. Reported tokens: 0. Cost: ¥0. Source data was not refreshed.
The fixed-roster control match still has no Agent-authored pregame `RosterPlan`.
