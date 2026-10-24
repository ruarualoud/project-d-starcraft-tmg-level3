# T27 / S272 — ordinary recovery and checkpoint ownership, v291–v292

## Scope and progress

This continues the six **planning** groups under matrix v274, not old battle C/D.
A fixed roster; B fresh Terran versus Kerrigan; C versus Zerg Swarm; D versus
Daelaam; E alternate Daybreak; F reversed factions. All use the same product flow.
Final planning admission remains0/6. T27 5/6; T23 33/36; main remaining slices
272/248/249/250. Complete-battle experiments remain0/12; this is not completion
of map, battle or review acceptance.

Previous goal turn was progress: source-owned charge contracts and discovery
were implemented, tested and loaded. This turn verified all six live PIDs,
followed real outputs and repaired the next actual integration gap.

## v291: ordinary recovery was missing the refreshed feedback

Actual F request83 repaired `q7-charge-threat-u4-leading-model-5-with-path`.
Its prompt lacked `currentParameterContractReview`, the declaration-specific
repair instructions and the new parameter-discovery field. The original Native
error still carried irrelevant null-coordinate/zero-distance path diagnostics.
The model consequently changed the path to `[]`, rather than removing the field,
and retained the wrong target-key names. This is an observable prompt/contract
delivery error, not evidence that charge geometry was impossible.

The source projection itself passed v290, but the recovery consumer invoked it
only for explicitly selected **completed** legacy operations. A fresh ordinary
operation copied an old failure and sent it directly to the model.

The shared recovery loop now refreshes an active unknown before its first repair
choice and after any new failed submission. It matches the exact request hash,
uses the existing source-owned projection, preserves the original receipt in
history and retains all paid choices. It does not reopen completed unrelated
targets, change targets/Plan, refill retries or replay Native actions. Already
pending paid choices are consumed normally, not replaced.

Focused gate `verify-slice272-ordinary-query-feedback-v291.mjs`:

- Real F failure through the ordinary `recoverRosterTeachQueriesV1` entry was RED:
  the captured first repair prompt lacked the new feedback.
- One GREEN after the consumer fix:1 projection,3 checkpoints, unchanged original
  request/receipt,0 extra retries,0 Provider calls and0 Native actions.
- Existing v290 gates were not rerun.

## v292: immutable bytes own the checkpoint

Observed current session files: A111.2MiB, B95.3MiB, C59.7MiB, D43.7MiB,
E37.2MiB, F54MiB. The prior read-only sample located JSON encoding/serialization
and copying in the busy main thread. Source inspection found whole-record deep
copies after fresh JSON decoding, before JSON writing, and in the preset caller.

The minimal real-store regression also exposed the ownership problem behind
those defensive copies: both stores yielded to filesystem work before capturing
the incoming object. Mutating it immediately after `save()` changed the persisted
snapshot. The preset caller had protected itself by first copying the full graph.

Both stores now capture immutable JSON bytes before their first await. The preset
hash, when requested, describes that same snapshot; atomic temp-write/rename and
private modes remain. Freshly parsed objects are already independently owned, so
load/list need no second deep copy. The preset service skips its defensive copy
only when a store explicitly declares `capturesCallTimeSnapshot`; injected/legacy
stores keep the fallback copy. No facts, messages, history, counters or ledger
fields are removed or summarized.

Focused gate `verify-slice272-checkpoint-ownership-v292.mjs`:

- RED:7 full-record clones, both save snapshots followed the later mutation.
- One GREEN:0 redundant clones; exact original history round-trips; mutation of
  load/list results does not affect another read; both saves retain call-time
  content; preset returned hash matches stored content.
- 2,606,852-byte fixture. Observed whole gate2058ms before and1111ms after, under
  concurrent production load. These are diagnostic timings, **not** a controlled
  end-to-end speedup, battle performance acceptance or a40% rollout claim.
- Generated regression artifacts remain in the two `build/checkpoint-ownership-v292-*`
  directories. Nothing was deleted. No Provider or Native calls.
- Changed preset-service syntax and changed-file whitespace checks passed once.

## Real model progress before maintenance drain

A's saved citation errors progressed57→28→9→1; its8 answers were retained.
The remaining metadata-reference errors were not automatically accepted as
Native receipts. Arrays require specific fields; a rules/audit/schedule hash is
not interchangeable with a receipt ID. The model is correcting references itself.

C and F entered the reader after query recovery; all six are now in synthesis.
Latest prepared reader snapshots: A200 (8answers/1error), B110 (9/18), C84 (8/10),
D90 (7/19), E122 (7/26), F86 (0/0 initial reader). Prepared requests do not by
themselves prove dispatch or completion. Reader error counts are not final Plan
acceptance or all-facts-covered metrics.

F84 did receive v290's typed declaration feedback from the execution adapter.
The saved ordinary operation now confirms2 model-owned choices, final status
`advisory`, Native `sourceResultStatus:ok`, no unknown reason. The final request
preserves `u4-model-5`, `player2-goliath-1` and its first model, removes `path`, and
uses exact `targets:[{unitId,modelId}]`. It then entered synthesis. This is actual
automatic query repair, not a source-test-only claim, and does not prove successful
charge resolution or every strategic question resolved. v291 removes the avoidable
first wrong-feedback turn for future ordinary recoveries.

All six old actors reached `paused`, their latest dispatched replies were
completed, and each old PID exited. Historical ambiguous fees are retained and
are not treated as new in-flight requests. Markers were recoverably renamed
`pause-released-common-recovery-checkpoint-v292`.

Same sessions now run common v291/v292: A56409/B56410/C56411/D56412/E56413/F56414.
Logs are `resume-common-recovery-checkpoint-v292-20261017.log` in the original
generation folders. All six reached running without startup failures; this is
not final admission. No room, roster, historical counter or fee reset occurred.

A's prepared request201 confirms8 saved answers,11 completed reader steps and
**zero malformed citations**. It also contains8 references to unknown/error
receipts (reasonCode and mayRepairSameChoice), spanning6 questions. These are not
automatically8 independent bugs: next inspect whether each is an unresolved
original predicate, superseded failure or diagnostic-only observation. They are
not silently promoted to successful Rules evidence. The reader still needs
completion and Plan/Teach admission;0 malformed references is not0 strategy gaps.

Known current-generation accounting at the batch boundary:679 calls,
110034415 input units,2037823 output units. Since v290's recorded boundary this
adds36 known calls,922678 input and121283 output units. Both local regressions
used0 Provider calls. Previous generations and unknown fees remain in their own
ledgers; these are usage totals, not a newly estimated complete invoice.

## Diff and harness boundary

Production changes: `roster-teach-query-recovery-v1.mjs`,
`roster-planning-draft-store-v1.mjs`, `roster-planning-workspace-service-v1.mjs`,
`iterative-roster-file-store-v1.mjs`. Two actual-bug scripts and this report;
navigation/TASKS/memory updated. No prompt strategy, source data, Skill, rule
semantics, battle room, UI, dependency, subagent, commit or push changes.

- harnessLoopUsed: true
- targetGames: StarCraft TMG, frozen source/FAQ/Skills, Standard2000
- promptPackRoutes: roster Teach / query repair / saved evidence reader
- harnessToolsCalled: source-owned retained failure projection; ordinary recovery
- uiTraceEvidence: no new UI acceptance; product paths unchanged
- agentDecisionEvidence: F83 public repair reason versus delivered Native feedback;
  A's real progressively corrected citation ledger
- memoryTraceEvidence: all original inputs, paid replies, receipts, Plan and fees retained
- trainingTraceCandidates: none; trainingTruth=false, canAffectRules=false
- rollbackOrDemotionRules: changed snapshot bytes, cross-request feedback, extra
  retries, implicit action/roster edits or unresolved facts promoted to success
- userVisibleChecks: source feedback reaches the first normal repair choice;
  caller-owned state cannot mutate a save after the call
