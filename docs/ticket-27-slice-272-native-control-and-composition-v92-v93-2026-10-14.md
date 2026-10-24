# T27 / S272 — execute the saved native control query; expose actual composition

T27 5/6; T23 33/36; remaining main slices 248/272/249/250 = 4; complete games 0/12. Original Rooms A133/C156/B9/D9 remain stopped. No Plan application, game action, data refresh, new agent, install, deletion or commit in this continuation.

## Actual query defect and recovery

The paid A v91 model finally supplied four named hypothetical placements plus a native `mission_marker_control` follow-up. The legacy dispatcher silently skipped that follow-up because it lacked the redundant outer `kind: spatial`. Valid geometry did not answer the control question.

v92 uses the existing shared native spatial-query registry to bind an omitted dispatch kind only when the exact query name is registered. Arguments/positions are unchanged, the binding is recorded, and unknown kinds produce actionable feedback rather than disappearing. Concrete regression `verify-slice272-native-followup-dispatch-v92.mjs`: recorded RED47996, sole GREEN48643; no Provider/Room action. Do not rerun. This isolated dispatch test did not prove the paid multi-unit scene.

The recovery service can now re-execute an exact saved paid request after a tool-descriptor change when its former result was unknown or omitted declared follow-ups. It retains the old result, attempt history, same request hash and execution-refresh receipt, and invalidates the stale synthesis in the same checkpoint. It does not regenerate the query, reset costs, or refresh already complete successes.

Actual workspace runner56005 / host56037, `common-v92-A-saved-query-execution-progress.private.json`, re-executed the saved A request with zero query-generation calls. Four terrain-preserving unit formations passed their geometry/coherency checks. The native control receipt is `0d963da69b5820c2769dba0820335e81ef432c49efe6671cac5c0e1b6ee1e830`, on hypothetical state `393c27c0bc7e3198dde07a74714f15d7e36cd7d7c15f451dcfcafc036e2cd2e9`:

| Marker | Player1 / player2 eligible Supply | Conditional next controller |
| --- | --- | --- |
| 1 | 0 / 0 | None; no contestant and no prior controller |
| 3 | 2 / 0 | player1 |
| 5 | 4 / 0 | player1 |

This is exact control **for this hypothetical geometry if positions/statuses/Supply remain unchanged until cleanup**, not actual score. The scenario has no deployed enemy and does not establish casualties, legal arrival/history, a Round-1 Goliath deployment, or impossibility of another three-marker formation. It preserves the map and all competing units; absent enemies remain absent, not defeated.

Actual21:03:11Z: v92 completed. The paid synthesis changed Q5 from unresolved to revise, explicitly reading the native3/5-versus1 result and retaining its geometry/arrival limits. It now marks Q2/Q3/Q6/Q7 unresolved; the unchanged count of4 does **not** mean the recovered query failed. Q7 separately concerns unresolved ability/timing assumptions and a ranged-probability query that cannot answer Crushing Grip. Do not rerun the completed synthesis.

## Actual shared-fact defect and v93 fix

Direct A audit: each selected large Marine unit has 9 starting models, Supply 2, occupies 2 Core slots. The existing Plan and Teach called it 6 models. The shared reviewer/Teach selected-roster rows only carried instance, record and arrival round; the per-selected-unit model quantity was absent, although the generic `selectionUnitRules` already delivered both small6 and large9 and the hypothetical scene correctly contained nine models. Thus this is both a model composition-binding error and an insufficiently explicit selected-fact projection, not a claim that the correct generic data was never delivered. This is not a Rules/data update.

`roster-final-plan-review-v1.mjs` now projects `arithmetic.rosterComposition` from the matching selected Rules audit, including per-unit composition, starting model count, Supply and occupied slots. It checks the selected unit/composition binding and retains unknown for absent/mismatched audit. `roster-review-premises-v1.mjs` adds those quantities and literal evidence to the common catalogue used by current Teach, targeted revision and review. It does not alter the historical sourceFacts digest, grant new validity to old claims, recompute Rules, or describe current survivors.

Concrete `verify-slice272-composition-fact-projection-v93.mjs <experiment-base>` used the actual saved A draft. RED observed undefined versus expected9. After the two-file fix, the sole GREEN passed actual9/Supply2/slots2, shared numeric/text evidence, unknown missing/mismatched audit and unchanged inputs; 0 Provider/0 Room actions. No prior gate or full suite rerun.

## Plans and actual calls

- A6 still contains contradictory old scoring in `componentPurposes.player1-faction`, while its main route correctly prices own1/3/5 versus enemy2/4 at3:2. Its Marine1 purpose also says6. These are retained output defects, not evidence to demote the correct Rules facts.
- A revision runner60017, `common-v93-A-factual-plan-revision-progress.private.json`, observed the actual v92 terminal completion and replaced idle host56037 with61966 at21:03:26Z. It loads v93 in the same workspace, revises four affected prose fields with the new Teach/control evidence, preserves army/schedule, and reviews changed claims once. It does not launch Rooms. Verify actual PID/state before continuing.
- Actual A7 produced1call/459877units: its faction-purpose scoring is corrected; Marine1 explicitly uses the new selected9/Supply2/slots2 fact; fallback and summary incorporate the native conditional3/5 control result. Four requested fields were replaced, army/schedule unchanged. Changed-claim review is in flight, not yet acceptance. A scoped scan of the same count defect found14 additional dependent hypotheses/component texts still saying6/six, including erroneous every-model-equals-Supply/VP wording; B17 correctly distinguishes small6 and selected large9 and does not need this repair. A runner66799 (`common-v93r2-A-composition-consistency-progress.private.json`) waits on the specific live60017 review, then reuses host61966 for those14fields plus the summary's source-Reserves/planned-arrival distinction. No host/Room reinitialization, no repeated query/Teach. This is closure of the same known error, not a new successful Slice.
- B17 completed the two-field repair and changed-claim review, 2 calls/175110 units. No rawHigh remains in that completed review; Medium gaps (which point to concede, alternative purchase conditions) are recorded, not automatic blockers. This is not full scenario or strategy acceptance. Army and arrival schedule match B12 exactly. Old B host46340 is idle and must load the common current code before new game/query work.
- A v91 completed2calls/618281units; its ledger baseline for v92 was63calls/10066025units. v92 execution used0query-generation calls, followed by1 synthesis call:490391 input (464000 cache hit,26391 miss),10416 output,total500807units,95377ms Provider latency. Frozen Sep14 off-peak estimate USD0.01160025, not current pricing or an invoice; no CNY100 notification increment crossed. A ledger is64calls/10566832units before v93. v93 is additional. Preserve all old/unknown charges; no fee reset or cap introduced.

## Next required deliverables

1. Read A's completed native-query synthesis, retaining its exact scene limits.
2. Verify A's factual revision actually removes contradictory scoring and wrong Marine count; no wholesale repeat audit.
3. Separate genuine missing scenario/action-domain engineering from future opponent uncertainty; address the former, retain conditional plans for the latter. Do not gate on Medium strategy preferences.
4. Apply accepted plans explicitly, resume original four Rooms on one code version, then finish the full map/list-plan/game/review objective. No current result completes S272 or proves improved play.

Harness loop used: frozen StarCraft source and actual workspace trace; native read-only scene/query + shared facts; public model reasoning only; no hidden chain-of-thought or strategy promotion. All new evidence remains trainingTruth=false. No new UI/game screenshot is claimed because no live action was executed.
