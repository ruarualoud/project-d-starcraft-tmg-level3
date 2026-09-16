# Ticket 25 / Slice 261 — tactical relationship graph checkpoint

Date: 2026-09-17

Status: implementation 5/6; one live formation-delta proof remains. This is
not a Slice closure claim.

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
value and to respect field-level precision. A live strategy-regression canary
is still required before this prompt policy is accepted as non-regressive.

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
unproven item is tracked as Medium: obtain the formation-delta and v4 prompt
canary from the next naturally available live formation action after a process
reload. It does not justify claiming Slice 261 complete.

No source refresh, Provider call, training promotion, whole-repository gate or
historical Slice replay was performed.

