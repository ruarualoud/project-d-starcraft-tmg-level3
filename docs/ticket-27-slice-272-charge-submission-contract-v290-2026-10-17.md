# T27 / S272 — shared charge submission contract v290

## Outcome and boundary

The actual F Teach failure is reproduced and the targeted gate now passes.
This is a submission/repair-contract fix, not a change to charge rules, movement,
target selection, roster, Plan, source data or strategy. Six planning groups are
still 0/6 at final admission; no battle has started.

T27 remains 5/6; T23 remains 33/36; remaining main slices: 272,248,249,250.

## Actual failure

F session `iterative-web-414929bf-60eb-4fed-b7a4-55053eebded5`, retained branch
`q7-build-assault-branch-u4-goliath`, submitted a charge declaration with
`targets:[{targetUnitId,targetModelId}]`. The executor accepts `{unitId,modelId}`.
The retained domain named the outer `targets` array but omitted its nested shape.
The shared parameter inspector therefore reported valid before Native rejected
`SELECTED_MELEE_CHARGE_TARGET_INVALID`. Further submissions changed leaders and
added a path, which this declaration does not accept. Generic zero-distance/path
repair feedback blurred declaration and movement resolution.

Ranked causes: missing nested contract (confirmed by actual RED); stale branch or
target identity (not needed to explain this failure); unreachable geometry (not
established by a declaration parse failure).

## Implementation

1. Extract the existing declaration parser unchanged into a source-owned charge
   contract. The Native executor and submission inspector reuse that owner.
2. Publish exact nested keys, current eligible unit/model pairs and one-model-per-
   target-unit restriction. Reject extra path fields and duplicate units before
   instantiation. Never choose a leader, rename the model's fields or select a target.
3. Use declaration-specific repair guidance in the shared live/Teach spatial
   adapter, without fabricated distance/path diagnostics.
4. Reproject saved matching failed requests using the same current contract. The
   original source receipt, request, domain ID and unknown outcome remain intact.
   This is read-only input diagnosis, not an action replay or retroactive success.
5. First discovery also publishes the live compiler's contracts beside sealed
   action domains. Empty source action spaces keep their old representation;
   actual A's saved source has zero domains, so the added field does not replace
   its in-progress evidence archive. No global strategy instruction is changed.

## Single focused validation

`node scripts/verify-slice272-charge-declaration-contract-v290.mjs <base>`

- RED: actual wrong nested keys were reported valid.
- After the source fix, one GREEN: four field issues; the same leader/target IDs in
  the executor's proper shape pass submission checking; extra path, duplicate unit
  and invalid model pairing are rejected.
- Saved failure gains actionable current-contract feedback, no misleading movement
  distance; reprojection is idempotent. Original request/domain/source receipt are
  unchanged. Zero Provider calls and zero Native actions.
- This does not prove reachability, legal charge resolution, tactical merit or
  full six-group completion. No previously passed gate or full suite rerun.

The separate concrete discovery gap was reproduced through the real laboratory
and snapshot-service discovery path, with F's actual rejected domain supplied at
the enumeration boundary. `verify-slice272-charge-discovery-v290.mjs` was RED
because no submission contract was discoverable, then one GREEN after wiring
the existing live compiler. No action/audit/probability execution was allowed by
the fixture. This validates discovery wiring, not game-world legality. The
already-passed submission gate was not rerun. Changed-file whitespace check passed.

## Live continuation

All v289 actors drained, reached `paused` with the latest dispatched request
completed, and exited. Historical A/B ambiguous fees remain; they are not new
in-flight requests. A195 was prepared before pause but has no new matching
dispatch; do not count it as a paid reply. Known current-generation calls at the
boundary: A182/B106/C78/D83/E113/F81. No fee/history reset.

Six original sessions now use common v290: A30709/B30710/C30711/D30712/E30713/F30714,
logs `resume-charge-contract-v290-20261017.log` in each original generation folder.
Pause markers were recoverably renamed `pause-released-charge-contract-v290`.
Launch is not acceptance. Actual A v289 replies reduced malformed citations
from57 to28; its8 saved answers are still under repair, with no unresolved factual
receipt classification in that particular feedback. This is not final Plan quality.

Subsequent real observation: C79 and D84 completed; E115 is sending a reader
request, F82 received its correction reply. F82 concerns the earlier post-loss
marker query, NOT the charge declaration, so it is not evidence that the model
has already repaired charge. A196's actual prepared prompt retains8 answers,
6 completed reader steps and the same28 citation issues; its paid ledger was not
reset by the additive discovery change. B remains live at107 while restoring.

Known current-generation usage at the safe boundary (not the whole project's
invoice):643 calls,109111737 input units,1916540 output units. Prior-generation
costs and unknown fees remain in their ledgers. No new cost ceiling or reset.

Changed production files: the new
`official-selected-roster-charge-parameter-contract-v1.mjs`, Native
`official-selected-roster-melee-action-runtime-v1.mjs`, shared
`action-parameter-contract-v1.mjs`, `room-backed-spatial-rules-query-adapter-v1.mjs`,
`pregame-scene-laboratory-v1.mjs`, and `roster-teach-evidence-port-v1.mjs`.
Two concrete regression scripts, this report and navigation/memory/task entries
complete this change. No unrelated runtime/Skill/UI changes or commit/push.

Do not restart actors solely because a status reader times out. One observer
timed out while loading six large histories; another emitted too much diagnostic
output. Both were read-only observer failures, not production crashes. Subsequent
field-limited observation succeeded; do not repeat bulk state dumps.

A three-second read-only A profile showed JSON serialization, UTF-8 encoding and
memory copies in the sampled main thread; it does not establish a whole-run
percentage. Snapshot overhead remains a separate measured performance item,
not permission to delete history or skip evidence.

## Harness record

- harnessLoopUsed: true
- targetGames: StarCraft TMG, frozen source/FAQ/Skill set, Standard2000
- promptPackRoutes: roster Teach / independent fact investigator / current-domain query
- harnessToolsCalled: existing parameter inspector and retained-evidence repair projection
- uiTraceEvidence: no new UI acceptance; same shared adapter as live queries
- agentDecisionEvidence: actual F rejected declaration and its successive repair requests
- memoryTraceEvidence: original requests, unknown receipts, paid answers and ledgers retained
- trainingTraceCandidates: none; canAffectRules=false, trainingTruth=false
- rollbackOrDemotionRules: changed domain/target/source identity, guessed correction,
  action replay or unknown promoted to success invalidates this repair
- userVisibleChecks: model receives actual field errors and correct submission
  instructions; real model-owned repair and final admission remain to observe
