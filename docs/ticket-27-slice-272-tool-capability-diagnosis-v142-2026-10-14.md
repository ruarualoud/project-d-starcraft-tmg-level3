# T27 / S272 — actual tool capability diagnosis, v142

Date: 2026-10-14. This is a scoped diagnosis, not completed Teach repair or
permission to restart games. T27 5/6; T23 33/36; remaining main slices
248/272/249/250 = 4; accepted full matches 0/12. All four games remain stopped.

## Conclusion

The current tools are sufficient for several individual geometric and ranged
combat calculations, but the exposed pregame workflow is NOT yet sufficient
for all the detailed counterfactual questions being asked by Teach. The problem
is a combination of real capability gaps, wrong question-to-tool selection,
ambiguous evidence scope, and ineffective orchestration of otherwise working
tools. More retries of the same parameter patch are not an adequate repair.

The seven currently unresolved A/B questions have now been mapped to concrete
causes below. That is not a full end-to-end certification of every query kind:
only the retained A formation case received a new native execution in this
diagnosis. No model selected the diagnostic candidate and no final Plan changed.

## Actual latest paid run, not the earlier in-progress status

`common-v141-A-query-delta-recovery-progress.private.json` completed at
2026-10-14T03:56:59Z. Reusing the already paid correction cost zero new correction
calls; the subsequent synthesis cost **1 call / 552453 units**. A's cumulative
offline count is now **104 calls / 19243652 units**. This is not an RMB invoice.

Native correctly rejected seven remaining models where eight were required:
`SELECTED_SPATIAL_PLACEMENT_DENOMINATOR_INVALID`. Nine attempts/max9 remain
recorded; no tenth attempt was made. Plan A9 stayed unchanged. Latest synthesis
contains A Q2/Q3/Q6 (3 unresolved); B still has 4. The previous 5-to-3 change in
synthesis is not evidence of two new native tool repairs.

## Native probe: the formation tool really can answer this case

Script: `scripts/inspect-slice272-native-query-capability-v142.mjs`.
Evidence, relative to this worktree:
`build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v142-native-query-capability.private.json`.

The probe uses the same product composition factories, selected roster, frozen
map/data, retained complete model positions, and shared native query service.
It restores the saved hypothetical branch without rerunning successful prior
queries. It does not create a persisted game room.

- Source state: `b063b31d396e813f999b09d90c6eddaeace22b9707dc26dd68a3477efbce629d`.
- Retained branch: `0973bf1719ccec937cb57b7beda8afec8546b8d104b7d478198afa255c760d0f`.
- `space.solve_formation`: **6024 ms, two legal candidate formations**.
- One diagnostic candidate's native canonical parameters were passed to the
  original `coherency_after_candidate_placement` query: **accepted**.
- Original-query native receipt:
  `bbd32a3a7eb8027c839286fa331d75f1c9d967e5034c6d6baefac86c73f28791`.
- Zero Provider calls, zero game actions, unchanged source state.

This proves one supplied native action candidate in this exact hypothetical
scene, not all three units' arrival history, global optimality, model autonomous
recovery, or the whole Q6 strategic answer. The passed probe must not be rerun
without a new relevant change.

## Current unresolved questions and causes

| Item | Evidence / actual cause | Required deliverable |
|---|---|---|
| A Q2: Omega Worm / creep | Original relationship query cannot create a hypothetical asset. Scene construction only places existing source pieces. The failed landing query returned `PREGAME_LAB_PLACEMENT_PIECE_UNKNOWN`. Live `legal_asset_placement_options` exists, but needs an available current action domain; a successful hypothetical asset action is not registered as a subsequent pregame branch. | A typed native hypothetical-action branch, including legal asset creation and follow-up scene queries. Conditional assumptions must not be represented as known future enemy choices. |
| A Q3: activation opportunity cost | A question about displaced fire, movement and reactions was sent to `math:budget_fit`. The selected-roster audit already supplies actual budget; budget arithmetic cannot answer tactical opportunity cost. Synthesis also asks for a Rules-certified marginal strategic value, which Rules do not define. | Model-owned, explicit alternative scenarios; comparable measured consequences and remaining assumptions. Do not invent a universal strategy score or enable fake budget data as the answer. |
| A Q6: placement vs route | Static assessment already reports three coherent Marine formations with native geometry result hashes, but the broad `placementLegalityProven:false` label conflates no arrival/action history with static footprint validity. Recovery tries an unnecessary one-inch move and repeatedly guesses malformed model lists instead of consuming the solver. v142 proves the solver/candidate query works for one case. | Separate static footprint/coherency evidence from route, phase/resource and arrival claims; consume real solver parameters through the recovery workflow and validate each actual requested claim. |
| B opponent branch | A recovered scene contains Kerrigan and two named Raptor units; native marker control gives player2 Supply 3 at marker2 and Supply2 at marker4. Synthesis still calls it unresolved because the opponent's future choice is not live truth. | Verify the intended conditional question and its observation trigger; accept evidence only for the stated hypothetical branch, never certify future opponent behavior or merely delete an unresolved flag. |
| B post-loss capability | Current scenario fails packing. Independently, the exposed pregame branch constructor has no named casualty/outcome branch import; attack probability provides loss distributions but does not make the chosen surviving state available for subsequent spatial/control queries. | Valid geometry plus a named, provenance-bearing native loss-state branch; re-query survivors' control, weapons, movement and formation under that conditional outcome. |
| B terrain / route | Saved request wraps a spatial query as `queryKind:scenario`, lacks the proper scenario spec and contains a literal placeholder domain ID. Rewrapping JSON alone cannot supply a real domain or legal path. | Ordered create-scene → inspect-current-domains → solve/query path workflow, with the resulting domain bound to the same scene. |
| B replacement / robustness | An intended Marine placement overlaps a wall. A fallback is described but its substituted formation has not been computed. Existing VP arithmetic for a lost marker is not proof the alternative placement works. | Compute and assess the specific replacement formation, then its control/fire consequences; retain explicit uncertainty about enemy responses. |

## Capability boundary: shared computation is not a complete workflow

Relevant sources:

- `packages/online-agent-session/scene-query-service-v1.mjs`: live rooms and
  immutable pregame scenes use the same query composition; ownership differs.
- `packages/online-agent-session/spatial-query-contracts-v1.mjs`: typed exact
  base-distance, within/wholly-within, native candidate path/coherency, asset
  placement and marker-control contracts. Ranged probability/exchange are
  bounded estimates, not melee/charge probability or whole-game utility.
- `packages/roster-strategist/pregame-scene-laboratory-v1.mjs`:
  `applyPlacement` only looks up existing `state.pieces`; `runScenarioBranch`
  supports named static placements. Its lifecycle shorthand chooses the first
  enabled action rather than a specified strategic action. This cannot stand
  in for a counterfactual action sequence.
- `packages/roster-strategist/roster-teach-evidence-port-v1.mjs`: correctly
  rejects that unnamed lifecycle shorthand as an opponent forecast, and rejects
  `budget_fit` in favor of actual selected-roster audit. These protections are
  not themselves the missing strategic calculation.

Native static coherency assessment checks board/footprint overlap, blocking
terrain, enemy separation, coherency distances and link connectivity. Its scope
must not be inflated into complete legal arrival, 3D surface validation, action
resources or awarded VP. Conversely, its positive static findings must not be
hidden by a blanket advisory/no-arrival label.

## Why the earlier repairs did not close these items

Transport fixes preserved feedback, restored retained branches, permitted
prerequisite queries and reused paid replies correctly. Their narrow gates
passed, but they did not demonstrate useful tool selection or native answers.
The model did not use the newly offered helper; its final delta deleted model2
while describing it as a duplicate leader. Native was right to reject it.

The recovery design predominantly edits a failed request. Some questions need
a different query decomposition, an actual new branch capability, or a corrected
conditional evidence criterion. Preserving the original strategic question is
necessary; blindly preserving its originally wrong tool call is not sufficient.

## Ordered implementation deliverables (not new tickets)

1. **Explicit evidence scope:** static geometry, executable action, conditional
   outcome and unknown future choice are distinct typed claims, with original
   receipts retained. No broad false success or signature invalidation.
2. **Useful tool orchestration:** create → inspect → solve → consume canonical
   parameters → validate the requested claim. Repair can replan the query steps
   without dropping the question; detect repeated no-evidence-progress attempts.
3. **Missing conditional branch operations:** selected native asset actions and
   named casualty outcomes on immutable clones, followed by the existing shared
   queries. No copied Rules implementation and no mutation of live rooms.
4. **Actual A/B closure:** exercise each outstanding question with the appropriate
   tools, revise/review the final Plans, then start fresh Round1 matches only
   after genuine closure. No paid blind retry or games were started here.

All seven items remain open in their saved Teach outputs. The next production
call should follow the relevant concrete capability/contract repair, not another
unchanged formatting retry. This diagnosis does not promote any strategy skill.
