# Ticket 27 / Slice 272 — map-aware roster planning contract (2026-09-24)

## Current gap (observed in code)

`roster-planning-product-module-v1.mjs` creates one fixed Standard source Room
without `mapConfiguration`, then hashes that Room's nine balanced terrain
pieces and access points as `mapTopologyHash`. The hash proves fixture identity;
it is **not evidence that the Agent read a selected competitive map**.
`pregame-scene-laboratory-v1.mjs::querySpatial` builds tactical relationships
between units in a state; it does not answer deployment-to-marker paths,
base/Size-specific gap clearance, or mission access on an empty pregame board.
The current Foundation prompt receives the hash and mission scoring authority,
not the actual map graph. A textual route in the generated plan is therefore
an unproven hypothesis. Do not promote it as map-grounded strategy.

## Ownership boundary

- Ticket 24/K3 owns art segmentation, semantic terrain binding, official-layout
  conversion, base-aware topology/fairness certification, and user-visible
  route overlays. Its revised acceptance contract is
  `ticket-24-slice-254r8-topology-fairness-revision-v1-2026-09-24.md` in its
  isolated worktree.
- Ticket 27/Codex owns the **Rules-sourced read-only Map Evidence Port** and
  its integration with Foundation, Teach, roster selection, final RosterPlan,
  review, and Room handoff. It must not regenerate terrain or infer collision
  from a decorative PNG. Ticket 23/Codex owns live TurnPlan/Agent continuity.

## Map Evidence Port v1

The port receives only a frozen, Rules-certified map/mission/deployment
configuration, side, and a query. Its descriptor binds
`mapSeedId + mapVariantId + mapCompilationHash + rulesGeometryHash +
missionRecordKey + deploymentRecordKey + officialSourceSnapshotHash` to the
same selected Room. The board renderer, Rules movement/LoS query, roster
planner and Bot must all report these same values. A mismatch returns typed
`unknown/map_variant_mismatch`; it never falls back to the nine-piece fixture.

Read-only queries, each with a public evidence receipt and precise limits:

1. `summarize_map`: physical table size, entry/deploy zones, scoring zones,
   elevation/access, terrain class/cover/LoS and route topology **as Rules sees
   it**, with provenance and uncertainty; no art-pixel inference at runtime.
2. `route_to_objective`: seat + mission marker + actual movement profile
   (Size gap rule, base footprint/rotation, ground/flying, access ability).
   Return legal/unknown/impossible, shortest *and alternative* paths, narrow
   clearances, placement/ending-fit, earliest plausible arrival, and blocking
   witness. Do not make every model fit every path.
3. `compare_objective_access`: same marker and both seats, score timing,
   alternate route count, chokepoints, cover/fire-lane exposure and player-swap
   delta. Advisory fairness metrics do not override mission legality.
4. `evaluate_roster_route`: selected candidate unit IDs, route roles, round of
   entry and task marker. Rules checks each unit's actual base/Size, movement
   and abilities; it returns a viable unit/route witness or an explicit gap.
   A plan that assumes an absent or not-yet-deployed unit fails review.

Foundation receives a compact, source-backed map summary **before** choosing
units; Teach may request detailed routes to challenge the small win plan.
After choosing models/upgrades/cards, the planner queries the actual movement
profiles and revises its score route. Final review checks every claimed
deployment/objective route against receipts; uncertain access stays `unknown`,
not false confidence. A locked preset follows the same map checks without
altering the list. Changing map, mission, deployment or rule geometry marks
the map-dependent plan stale and requires explicit replanning.

## Acceptance sequence

1. In the current fixed Standard fixture, reproduce that the map hash exists
   but a deployment-to-objective query has no authoritative result. This is a
   concrete red case, not a broad new test suite.
2. Implement the map port against one frozen Rules state and prove read-only
   behaviour, correct base-edge clearance and typed unknown for missing
   semantic binding. Keep the current fixture as a clearly labelled abstract
   map, never imply it is Lost Temple.
3. After Ticket 24's three-map pilot is certified, use *the same* selected map
   variant in rendered Web board, Rules route/LoS, and Agent query. Capture one
   legal and one illegal path for each relevant movement profile and one
   mission-scoring comparison between seats; inspect screenshots.
4. Repeat a real Standard-2000 Agent-generated roster and a locked preset plan
   on the selected map; assess route feasibility and whether the model changes
   composition/arrival/plan for map reasons. Hold opponent/mission/map fixed
   for the later no-plan/preset/Agent A/B. Also test another scale only when
   that scale has an authoritative deployment/mission/map binding.

No Skill promotion or strategy-quality claim follows from a hash alone. Do
not spend on a fresh final-plan repair while its map-specific route claims
would still be uncheckable; retain the saved paid plan and resume from it after
the Map Evidence Port is available.

## 2026-09-24 implementation checkpoint

`pregame-map-evidence-port-v1.mjs` now reads the frozen Rules state and verifies
the certified map freeze against the board manifest, deployment geometry and
balanced-terrain certificate. It returns typed `unknown` for the old abstract
nine-terrain fixture or a mismatched variant; a certified map yields a compact
terrain/marker/access summary and base-profile/side/target reachability
receipts from the existing half-inch Rules geometry audit. Route length is an
approximate grid witness, not an exact move, deployment, line-of-sight or
multi-route proof. Alternative routes and score timing remain explicitly
unknown. The product module can now select a map configuration and passes its
summary receipt into the first Foundation prompt and Teach source context;
both from-scratch and preset-plan paths use that shared runtime.

One direct focused gate passed abstract `unknown` and certified Lost Temple
map summary, reachable base/side/marker witness and two-side advisory
comparison. One product composition gate passed with the selected Lost Temple
and identical descriptor/receipt room-freeze hash. Both used 0 Provider calls.
This establishes the evidence seam, **not** final map-art quality, actual
model-specific movement, a finished 2000-point roster, or a plan-quality
claim. Remaining: bind selected candidate units to actual base/speed/entry
routes after composition, review route claims, run fresh full-budget and
locked-preset live plans on K3's certified pilot map, and compare in play.
