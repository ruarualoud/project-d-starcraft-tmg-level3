# Ticket 23 / Slice 248 — selection-threat consistency repair

## Defect evidence

The optimized Standard-2000 A-A run
`build/ticket-23-slice-248-standard-2000-aa-live-v1/20260921173620519`
has one valid prefix through revision 6. Revision 7 is preserved only as defect
evidence and is not eligible for training.

The revision-7 relationship receipt exposed two incoming Goliath
move-then-fire profiles for the Swarmling: Autocannon and Scatter Missiles.
The same decision's rejected Lie in Wait comparison instead claimed `0`
in-band move-then-fire profiles and used that false premise to say Burrowed had
no protection value. Other fields in the same decision correctly described the
two profiles as live threats, so the public decision record contradicted itself.

## Root cause

The semantic threat gate checked only realized selected-action prose and only
stationary-fire coverage. It did not inspect the candidate comparisons and
rejected-alternative reasons that directly influence selection, and it did not
bind those fields to the relationship graph's incoming
`threats.toFrom.moveThenAttackProfileKeys`.

## Repair

- Planner candidate comparisons and Action rejected-alternative reasons now
  share the current relationship-fact check.
- Incoming stationary fire remains distinct from incoming move-then-fire.
- A non-empty incoming move-then-fire profile set rejects claims of zero
  profiles, out-of-band status, or safety outside all enemy fire bands.
- Unknown legal path or post-move line of sight remains uncertainty; it cannot
  be converted into zero risk.
- Prompt, Planner replay and Action replay versions advance together so an old
  paid candidate is never silently admitted under the stronger contract.

## Focused verification

The existing focused command was extended with the exact defect shape:

`node scripts/verify-ticket-23-slice-248-formation-threat-claim-scope-v1.mjs`

Before the repair it failed on the live-threat alternative assertion. After the
code change, the same command passed once and identified both influencing
fields:

- `candidateComparisons[0].evaluation`
- `rejectedAlternatives[0].reason`

No unrelated gate was run. Provider calls and paid cost for the repair were
zero.

## Harness loop evidence

- `harnessLoopUsed`: true
- `targetGames`: `starcraft-tmg`
- `promptPackRoutes`: `selfplay_agent_prompt`
- `harnessToolsCalled`: current `space.inspect_relationships` receipt plus
  Planner/Action semantic validation
- `uiTraceEvidence`: the revision-7 screenshot and action remain immutable
  defect evidence; they are not promoted
- `agentDecisionEvidence`: conflicting move-then-fire claims are rejected in
  both Planner comparison and Action alternative lanes
- `memoryTraceEvidence`: the invalid revision-7 decision is excluded by
  branching from revision 6
- `trainingTraceCandidates`: none from revision 7
- `rollbackOrDemotionRules`: demote this contract only if it rejects a claim
  that explicitly preserves unresolved move/path/LOS uncertainty without
  asserting zero or safety
- `userVisibleChecks`: the replacement match branch must show a threat-consistent
  public comparison before Apply

## Continuation

The next formal run branches from revision 6 of the preserved source run.
Revision 7 is not resumed. The branch must re-plan the Zerg choice under the
new semantic contract, then continue the high-strategy match.
