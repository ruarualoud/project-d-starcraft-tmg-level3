# T27 / S272 — executable correction and prerequisite tool dialogue

## Scope and admission

StarCraft only; fixed official data/map/source scene. A/B remain stopped until
genuine unresolved-zero Teach plus final Plan acceptance, then NEW Round1.
Neither this local regression gate nor a hypothetical formation query certifies
strategy, arrival, a whole Plan, a complete match, or all twenty maps. C/D have
not been restarted. T27 5/6; T23 33/36; remaining main slices 248/272/249/250;
accepted complete matches 0/12. Full original goal remains active.

Previous goal turn made progress: actual parameter changes replaced a prose-only
correction, and a native overlapping-base failure exposed the missing auxiliary
tool dialogue. This is not an external blocker or reason to restart matches.

## v136–v137 already completed

- Added `roster-teach-query-delta-v1.mjs`: model-owned edits to the failed request,
  native legality still authoritative. Scenario and successful sibling queries
  are retained; no host-selected coordinates or strategy.
- Framework exposes the delta response contract; recovery stores raw edits and
  materialized request identity while retaining old attempts and costs.
- Concrete v135 failure RED62594 -> sole GREEN65809. Provider/Native/Room zero;
  fake adapter verifies transport, not geometric legality. Do not rerun.
- Actual v137 ended 2026-10-14 03:23:56Z: two calls / 602324 units, A cumulative
  102 calls / 18641537 units; Plan9 unchanged. The model really changed the path
  to a one-inch move and removed the leader from the remaining eight placements.
- Native then rejected `MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP`, model1/model4.
  Eight old correction choices remain. No ninth blind retry was made.
- Latest full synthesis reports A Q2/Q3/Q5/Q6/Q7 unresolved (five), B four.
  Counts are synthesis classifications, not proof five new Rules bugs appeared.

## v138 product repair

Actual implementations already expose a formation solver which calls the same
Rules instantiation as execution. The missing piece was the Teach repair role:
every computed query was treated as a replacement answer, and therefore a solver
prerequisite could violate the obligation to answer the original query.

Changed two product files:

1. `packages/roster-strategist/roster-teach-framework-v1.mjs`: both recovery roles
   accept `prerequisite_query`; versioned contracts 1.2.0 / delta 1.1.0.
2. `packages/roster-strategist/roster-teach-query-recovery-v1.mjs`: execute a
   model-selected read-only helper query against the exact failed frozen branch;
   persist its receipt separately, return it to the next decision, then require
   the original predicate to be answered by a subsequent correction.

The helper cannot create a scenario or choose another base. It does not clear
the original failure or prove a strategic claim. Repeated identical reads reuse
their retained receipt. New context reads have their own three-read dialogue
bound, separate from correction attempts; exhaustion leaves the original query
unresolved, never produces a false success. Historical choice costs remain
unchanged. Explicit legacy recovery grants one final correction after this
demonstrated contract fix, once only; no attempt reset or hidden retry cycle.

## Focused verification

Only `scripts/verify-slice272-prerequisite-query-recovery-v138.mjs <base>` ran:

- RED85741: role schema rejects a prerequisite solver query, real failure fixture
  sourced from A v137.
- GREEN87759: exit0, 2209ms. Helper -> returned candidate -> explicit delta ->
  original query; repeated helper deduplicated; old eight choices retained;
  original failure remains during reads; no second legacy grant; wrong branch,
  base override and scenario mutation rejected.
- Zero paid calls, native queries and Room actions in this gate; two fake adapter
  executions. The gate makes no claim that its synthetic coordinate is legal.
- No unrelated tests, full suite, previously green gates, subagents, installs,
  official-data updates, deletion or commit.

## v139 actual continuation — terminal failure, not passed

Runner88729 / offline host88816 were confirmed alive by PID and command after startup.
Only the original A offline workspace is used. Safely replaced idle host68484
after checking terminal v137, current Plan9 and finished provider dispatch.

Evidence root: `build/ticket-23-three-arm-performance-baseline-20261010-v1/`.

- `common-v137-A-query-delta-recovery-progress.private.json` — previous terminal.
- `common-v138-prerequisite-query-red.private.json` / `...-result.private.json`.
- `common-v139-A-query-delta-recovery.private.mjs` / `...-progress.private.json`.
- A workspace unchanged, session `rws-1b0a31ec-fd74-433b-8531-4a2ce7019535`.
- Baseline Plan hash `a7cb5ba1f2ec6c2d17a682acfe5e1ad2e58e23f3018a7c12350fc3b78b37aa1d`.
- Source Teach plan remains its explicit retained source, not silently replaced.

Poll the actual handle and progress. An observation timeout is not a terminal
failure and does not authorize another submission. No Plan apply, game launch,
cost reset or training promotion is part of this run.

Actual terminal 03:42:19Z: one paid call49662units; A cumulative103/18691199.
The model did NOT call the new helper. It repeated the same path edit and asked
to delete placements[0], falsely calling it a duplicate leader. Current input
and failure target both already contain eight placements starting with model2.
Therefore feedback-source drift is NOT established; the paid answer itself is
incorrect. Public text is not hidden reasoning. Semantic validation stopped at
the redundant path edit with `ROSTER_TEACH_QUERY_DELTA_NO_CHANGE`, before storing
a ninth executable choice or running Native. Eight choices/max9 remain, pending
paid reply preserved. No game started and no Plan changed.

## v140–v141: tolerate idempotent sub-edits; reuse the paid reply

The decoder's per-edit no-change restriction is too strict for JSON replacement.
An idempotent sub-edit is allowed if the WHOLE request changes. This does NOT
mean the resulting action is legal: this exact paid patch removes model2 and
leaves only seven remaining models; the Native rule must decide its validity.

- `roster-teach-query-delta-v1.mjs`: whole-semantic-request no-op check replaces
  per-edit check; no invented replacement model/coordinate, original unchanged.
- `roster-teach-framework-v1.mjs`: revalidate a pending paid reply for the exact
  current context under the current validator before requesting another reply;
  retain the old rejection and record zero-call reuse. Still-invalid replies
  remain pending with current concrete feedback.
- Actual v139 fixture RED95816 -> sole GREEN96665,2792ms. Local paid replay,
  whole no-op rejection, wrong deletion explicitly observed. Provider/Native/
  Room zero; no old gate rerun and no claim the seven-model placement is legal.
- `common-v140-idempotent-delta-{red,result}.private.json` stores the evidence.
- Runner99228/host99362 actual alive at03:50Z; v141 original offline workspace,
  baseline103/18691199, additional correction allowance ZERO. Safely replaced
  terminal idlehost88816. Progress `common-v141-A-query-delta-recovery-progress.private.json`.
  Reuse this paid output and let Native reject/accept it; no blind regeneration.
  A subsequent synthesis may still be a paid call and must be counted separately.

Actual auxiliary solver end-to-end use by the model remains UNPROVEN despite
the passed orchestration gate. Do not describe v138 as completed self-repair.

### v141 observed native result, 03:54Z

Actual pending reply is now `resolved_by_current_validator`, with
`revalidation.newModelCalls:0` and `reusedPaidOutput:true`. Native executed the
materialized request and returned `SELECTED_SPATIAL_PLACEMENT_DENOMINATOR_INVALID`:
submittedRemainingPlacementCount7 versus required8. This agrees with inspection
of the paid patch. Nine correction choices/max9 are retained; operation completed
unknown, no tenth blind attempt. Plan9 unchanged and no Room action.

Framework synthesis is currently `sending`, actual runner99228/host99362 retained;
last observed billed total remains103calls/18691199units pending this synthesis.
Do not resend/restart it. Read its final receipt and account any new summary call.

Next repair direction is tool-assisted geometric parameter construction, not
more prose-only blind edits. Existing solver candidates must be actually queried
and consumed; current model-selected helper capability alone has not achieved
that. Preserve its ability to choose/reject candidates; do not inject a strategy
or turn an arbitrary one-inch query into proof of whole-unit arrival routes.

Read-only B inspection additionally confirmed its terrain query contains nested
`queryKind:"scenario"`/argumentsJson instead of a `spec`, and a literal placeholder
domainId. Rewrapping JSON alone cannot make that request executable. No B output,
Plan, query or ledger was changed in this turn. Other B unresolved includes a
conditional future-opponent branch with computed control: distinguish observable
conditional evidence from unknowable future choices when revisiting synthesis;
do not merely delete its unresolved status to satisfy admission.

## Still required

1. Inspect actual solver read/correction outcome; do not equate local gate pass
   with native geometry success. No arbitrary small move may certify three full
   unit arrival paths or deployment history.
2. Resolve A/B remaining engineering evidence, reconcile old six-model Marine
   prose with already-present large9/Supply2 source facts, revise and accept final
   Plans without changing allowed roster authority.
3. Only then fresh A/B matches on the unified product path, subsequent controlled
   experiments, full-match observations and review/evolution acceptance.
4. Keep D's previous worker-result uncertainty separate; no blind paid resend.

## Harness / skill record

`harnessLoopUsed: true`; target StarCraft TMG; prompt routes recovery/delta recovery;
tools prerequisite read and original query; UI trace absent (offline repair);
decision evidence original paid edits and new persisted read dialogue; retained
query history is engineering evidence, `trainingTruth:false`. Roll back/demote
this change if an auxiliary receipt can clear a different failed predicate,
select a mutable/wrong scene, spend/reset old correction history, or mutate Room.
No strategy skill or memory promotion is authorized by this scoped result.
