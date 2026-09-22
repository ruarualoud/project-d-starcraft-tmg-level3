# Ticket 23 / Slice 248 — formation-search performance repair v1

Date: 2026-09-22. Status: focused gate passed.

## Incident

The formal Standard-2000 A-A branch
`build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922041417301`
replayed to revision 10 and asked Player 1 to deploy a nine-model Marine Unit.
The search generated 3,180 deterministic candidates, lazily instantiated four
and returned four legal options, but the production run spent about 7 minutes
31 seconds between the completed Planner response and the next Provider call.
The delay was local geometry/relationship work, not Provider latency.

## Repair

- Cache the exact nearest-model-pair search for every subject/target Unit pair
  and reuse it for relationship construction instead of recomputing it.
- Prove when both Units are outside every stationary ranged weapon band before
  asking for per-model line of sight. In that case LOS is irrelevant to the
  current stationary-fire result and is recorded as
  `exact_range_proof_los_not_required` rather than guessed.
- Derive a complete-opponent minimum gap only when every active opponent is in
  the graph. This allows the global engagement graph to be skipped only when
  exact base geometry already proves no possible engagement.
- Reuse the complete, untruncated relationship graph to return an exact
  no-current-position-stationary-attack result without repeating full action
  enumeration and probability calculation. Any missing/truncated opponent
  coverage falls back to the former exact path.
- Remove a duplicate projected-state surface normalization clone. Final
  formation legality is still decided by the unchanged Rules instantiation.

No prompt, Skill, strategy weights, Provider budget, candidate objective or
Rules legality contract changed.

## Focused verification

Command, run once after the final relevant change:

```text
node scripts/diagnose-ticket-23-slice-248-swarmling-formation-v1.mjs \
  --run-directory=build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922041417301 \
  --seat=player1 --state-revision=10 --max-ms=120000
```

Result:

- `ok=true`, `durationMs=11437`, threshold `120000`;
- generated `3180`, examined/attempted/exactly-instantiated `4`, returned `4`;
- deterministic generation and lazy exact instantiation remain enabled;
- `strategyObjectiveOrTokenBudgetReducedForPerformance=false`;
- Provider calls `0`, Room mutations `0`, training truth `false`.

Compared with the production observation of about 451 seconds, the focused
search is about 39 times faster. The four option identities were stable across
the two post-repair focused runs. Fixture/Authority replay before
`search_started` is intentionally excluded from the search duration.

## Strategy finding retained for review

Revision 11 itself remains a legal Apply/Replay receipt, but its selected
Marine position is about 25.153 inches from the Swarmling and 6.870 inches from
the nearest marker. The Agent assigned `avoid_threat=5` and
`control_objective=4`; the Host did not inject those weights. This may be an
over-timid tradeoff and is retained as postgame Skill/replanning evidence. It
must not be "fixed" by hard-coding aggression into the prompt or geometry
solver.

## Harness evidence

- `harnessLoopUsed`: yes — observe production delay, preserve r10, isolate the
  local formation search, repair, replay the same authority state and compare.
- `targetGames`: StarCraft TMG Standard-2000 A-A.
- `promptPackRoutes`: unchanged; Planner/Action prompt routes from the formal
  run remain frozen.
- `harnessToolsCalled`: LegalSpace formation search, exact Rules
  instantiation, tactical relationship graph, LOS/range proof and Room replay.
- `uiTraceEvidence`: formal r11 screenshot remains
  `screenshots/0004-r011-player1-deploy-applied.png` in the run directory.
- `agentDecisionEvidence`: r11 public objectives and selection are retained;
  no hidden chain-of-thought was requested or stored.
- `memoryTraceEvidence`: r10 Planner/Action records are read from the durable
  decision store; this repair does not alter memory.
- `trainingTraceCandidates`: performance receipt plus the possible
  over-timidity finding; neither is automatically promoted.
- `rollbackOrDemotionRules`: missing opponent coverage, graph truncation or any
  exact-path failure falls back to the prior Rules enumeration; Critical/High
  legality or replay drift blocks continuation.
- `userVisibleChecks`: exact four-option count, legality, no Room mutation,
  no Provider call, and the existing r11 Web screenshot.
