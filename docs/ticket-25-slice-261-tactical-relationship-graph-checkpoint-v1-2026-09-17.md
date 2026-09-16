# Ticket 25 / Slice 261 — tactical relationship graph checkpoint

Date: 2026-09-17

Status: implemented 6/6. Slice 262 is next.

## Product contract

`space.inspect_relationships` is the read-only tactical relationship MCP. The
Agent provides an intent plus scoped subject/target IDs. The Host reads one
revision-bound Room state and returns a bounded graph instead of requiring the
model to infer geometry from UI pixels or a monolithic prompt.

Supported intents are overview, engage, avoid threat, control objective,
surround, screen, preserve lane, focus fire, fire-zone exchange and retreat.
The result contains:

- Unit, objective and authoritative terrain nodes;
- nearest physical-base edges, contact pairs and contact bearing;
- exact current engagement model pairs;
- model-pair LoS, cover/elevation evidence and blocking terrain receipts;
- exact current weapon-range/target-tag bands, separately labelled advisory
  move-then-fire and unrolled Charge bands;
- bidirectional fire-zone classification and one-to-many/many-to-one indices;
- objective distance/elevation evidence and current control identity;
- exact current board, terrain and other-model clearance, with future lane and
  escape interpretation kept advisory;
- field-level exact/advisory/unknown precision and source hashes;
- a coordinate-space overlay receipt for Web/App rendering.

The query result is top-level `advisory_estimate` because it deliberately mixes
exact current geometry with hypothetical future actions. Exact subfields keep
their Rules-kernel receipts. The query cannot mutate, confirm or apply a Room
action and is never training truth.

## Formation integration

For each complete option that already passes Rules instantiation,
`space.solve_formation` projects the candidate positions and builds a
hypothetical relationship graph. The option exposes current-to-projected
distance, engagement, visible-model, fire-zone, objective and clearance
deltas. Hypothetical graph hashes are explicitly not current Room facts; Rules
instantiation remains final legality authority.

The Planner prompt policy is versioned as
`starcraft_tmg_planner_action_spatial_relationship_intent_v4`. It instructs the
Agent to query scoped relationships when position materially changes candidate
value and to respect field-level precision.

## Focused evidence and convergence

Round 1 built a real revision-85 graph for Hydralisk versus Marine plus mission
marker 5. It returned both scoped relationships, exact base distances and
clearance with zero Provider calls. The LoS subgraph correctly disclosed
unknown because the ordinary terrain kernel delegates Grass.

Diagnosis showed all 18 model pairs returned
`TERRAIN_LOS_DEFERRED_TERRAIN_KIND`. The graph now calls the existing official
special-terrain Grass LoS adapter, not a new approximation.

Round 2 did not reach product code because the one-off verifier misspelled its
local `side` variable as `sideKey`.

Round 3 successfully built the updated graph, then stopped before formation
search because the live revision exposed no current Move/Run/Disengage domain.
Per the three-round convergence rule, this verifier is not run again. The
remaining proof was therefore taken from the next naturally available live
formation action after a process reload, not from a fourth verifier cycle.

## Live closure evidence

The resumed Standard-2000 Web match produced the natural proof at action 126,
Room revision 125 to 126:

- Agent selected Swarmling Move candidate
  `sc-domain-3280c1fa88bfc58f957ab1cb8f8b27b7a724c8b4415fc759fb39d2485675bc7b`;
- it supplied four weighted objectives: control marker 5, advance toward marker
  5, compact, and avoid Marine-3/Goliath-2;
- `space.solve_formation` returned and the Agent selected complete 18-model
  option `94690502544a51019b483d62b184ad1bbed2bea11c2bb004a9593da3835a1ba6`
  under exact receipt
  `1e17ff208a9e243f59067823d3d75c40dff6deb5d25e071c38c7a2aaca27756d`;
- the Agent retained the Host canonical identity assignment and emitted a
  public reason for all 18 positions; Rules re-instantiated and applied the
  complete layout;
- the option's hypothetical relationship graph changed from
  `aee9b931ffbc841f49eab96bd04f41fba3a8349e9631826e41b30fe297fef17e`
  to
  `281eefb6a12edef7fea017aac96b9585a1c6d2d72c7569f22fc039e6fcd49f0a`;
  the projected nearest-base distance was 740 milli-inch to marker 5, 8,264
  to Marine-3 and 11,457 to Goliath-2. The exact deltas included -2,912 to
  marker 3, -300 to Marine-3 and -3,074 to Goliath-2;
- Apply advanced the authoritative Room to revision 126 and Replay matched the
  current state. Screenshot
  `0157-r126-player2-sc-domain-3280c1fa88bfc58f957ab1cb8f8b27b7a724c8b4415fc759fb39d2485675bc7b-applied.png`
  observed revision 126;
- the v4 decision record reports
  `no_observed_negative_strategy_effect`. It compared Pass and competing Units,
  retained an opponent response/counter-response plan, used exact relationship
  evidence, and did not reduce the strategy or query budget.

The historical action-126 solver metric also exposed a real Medium defect:
the relationship graph resolved official mission-marker coordinates stored as
`xInches/yInches`, while the formation target index accepted only milli-inch or
generic `x/y` coordinates. Consequently the immutable old action receipt shows
`resolvedTargetCount: 0` for marker 5 even though its separate exact graph
contains the marker edge. The production seam now normalizes all three
coordinate forms and constructs the official 32mm round marker footprint before
objective scoring. The focused external-interface regression first reproduced
`0 != 1`, then passed with one resolved target and an exact 2,740 milli-inch
nearest-physical-edge distance; it made zero Provider calls. The historical
receipt was not rewritten and the paid match was not rerun.

No source refresh, Provider call, training promotion, whole-repository gate or
historical Slice replay was performed for the defect repair. The live action
itself used six Provider calls and 759,972 reported units; the current durable
match ledger is 404 calls, 22,282,926 units and CNY 34.758890, below the first
CNY 100 notification threshold.

## Harness round

- `harnessLoopUsed`: true
- `targetGames`: `starcraft-tmg`
- `promptPackRoutes`: `opponent_prompt`
- `harnessToolsCalled`: `space.inspect_relationships`,
  `space.solve_formation`, `instantiate_parameterized_action`
- `uiTraceEvidence`: authoritative action 126 plus revision-126 screenshot
- `agentDecisionEvidence`: weighted intent, option comparison, 18-slot public
  assignment reasons, relationship graph hashes/deltas and Replay match
- `memoryTraceEvidence`: plan, purpose, alternatives, opponent responses,
  counter-responses and revise conditions persisted with the action
- `trainingTraceCandidates`: none; hypothetical options and this acceptance
  evidence remain `trainingTruth: false`
- `rollbackOrDemotionRules`: demote v4 if a later trace loses plan continuity,
  Skill grounding, alternative comparison, position reasons, exact-evidence
  labels or requires repeated coordinate repair; invalidate a cached option on
  any Room revision/hash or Rules-binding change
- `userVisibleChecks`: complete formation applied, revision advanced, Replay
  matched and screenshot captured
