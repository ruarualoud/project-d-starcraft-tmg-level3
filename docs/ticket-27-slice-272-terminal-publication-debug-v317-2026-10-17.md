# T27 / S272 — terminal publication debug v317

Status: eight scoped publication/recovery cases passed. This is NOT final Plan,
Teach-strategy, map, match or product acceptance. Six production arms remain
paused and unchanged. T27 5/6; T23 33/36; remaining S272/S248/S249/S250 = 4.
Final accepted Plans 0/6; full experiments 0/12. v314–v317 total: 42 scoped cases.

## Actual defects and changes

All four completion paths could expose a new result before its final file save:
initial Plan generation, final source review, Teach completion, review qualification.
The live consumer could see success while restart still loaded an older record.
Teach additionally let an EIO from its detached finally block become an unhandled
rejection. Qualification propagated EIO after already exposing the new review.

`commitWorkspaceTransition` now provides the shared save-before-publication
boundary. Only known transient errors on an atomic store retry the same complete
candidate once. No model request or Rules action is repeated by this retry.
Persistent failure keeps the old published result and records the storage failure;
failure-state persistence is itself guarded, without claiming a failed save worked.

- Initial generation commits a private candidate rather than editing the live Plan.
- Final source review commits its result and completed status together.
- Teach commits completed status only after the full synthesis checkpoint exists.
  Persistent failure records a pending completion for the exact Plan/context.
  Ordinary resume commits it without re-investigating or repurchasing answers;
  explicit new inquiry operations do not use that shortcut.
- Qualification commits the new review, its history and job status together.
  A completed per-item checkpoint with a storage failure is not an ambiguous
  Provider request. Recovery revalidates that checkpoint through the existing
  qualifier rather than demanding a nonexistent dispatch recovery.

No prompt, strategy ranking, official rule, army selection, source lock or cost
counter was changed for these fixes. Invalid review evidence remains unresolved
High; successful publication does not make it acceptable for match admission.

## Controlled evidence

Paths below are relative to
`build/ticket-23-three-arm-performance-baseline-20261010-v1/`.
Each directory contains `report.json` and its isolated atomic store.

| Product path | Transient save failure | Persistent failure + ordinary restart |
|---|---|---|
| Initial Plan generation | `publication-v317-yBu4SO` | `publication-v317-FQ1PyA` |
| Final source review | `publication-v317-cwMh08` | `publication-v317-59Q1vL` |
| Teach completion | `teach-publication-v317-ayruQW` | `teach-publication-v317-Ywwept` |
| Review qualification | `review-publication-v317-4Nm5Tv` | `review-publication-v317-8KfzfR` |

Before-fix evidence: initial `publication-v317-OXjLkk`, source review
`publication-v317-SgZ4sI`, Teach `teach-publication-v317-RxhBf2`, qualification
`review-publication-v317-fMrsiN`. Each observes the real save seam and public
consumer; failed publication previously changed the visible result too early.

The tests use actual frozen A Plan/source and the real workspace/atomic store.
Initial generation replays a recorded strategist result. Source review uses
13 scripted shards. Teach uses the real synthesis reader with eight explicitly
unresolved scripted answers and an answer/finish sequence. Qualification uses
deliberately invalid citations: the High findings must NOT be downgraded.
Thus these are controlled transport/persistence tests, not model strategy proofs.
All runs used zero real Provider calls and zero Native/Room actions. Restart
cases made zero additional model-seam calls and retained the full public result.
Every completed case checks that the original production A file was unchanged.

## Fixture and diagnostic failures, separate from product bugs

- `teach-publication-v317-NhvYZx`: earlier process exited without final report;
  no pass is inferred from its running-state file.
- `teach-publication-v317-DBy8z0`: old paid reader needed a new current-context
  model operation, so it was unsuitable for a zero-new-call completion fixture.
- `teach-publication-v317-55n5K1`: fixture expected monolithic synthesis but the
  actual runtime selected its reader; `b14jM0` then exposed the fixture's one-call
  limit versus the answer/finish pair. Three unsuccessful attempts were reported;
  the standing authorized pinpoint fix allowed the valid `RxhBf2` reproduction.
- Qualification fixture initially compared a direct parent review against a
  different nested source identity, then queried a nonexistent public job field.
  Both were fixture defects; corrected public-review observation produced the
  actual `fMrsiN` failure. No acceptance rule was weakened.
- The diagnostic REPL exhausted its heap while retaining/reloading large history
  objects. Subsequent metadata inspection uses a short-lived process and returns
  bounded summaries. This was diagnostic-tool failure, not production corruption.
- No passed test was rerun. No full suite, network call, source refresh, room
  creation, dependency install, commit or push occurred.

## Remaining deliveries — not replaced by these tests

1. Finish controlled investigation → synthesis → Plan revision → final-review
   input/output/persistence/consumer checks, including partial-query recovery and
   stale/incorrect evidence routing. Deliver source-bound breakpoint receipts.
2. Trace actual strategic edits versus administrative changes, then complete
   fresh legal 2000-point roster + map-bound Plan acceptance for A–F. Deliver
   readable army/Plan and before/after public-rationale comparison; do not count
   only revisionReason/mapEvidenceHash changes as strategy improvement.
3. Only then produce the final flow visualization/report and resume same-product
   match comparisons under the accepted map. Twenty-map objective remains open;
   latest priority is official layouts plus one SC1/one SC2 map before expanding
   the other eighteen. No map or match gate is certified by this document.

## Harness record

- harnessLoopUsed: true; targetGames: starcraft_tmg.
- promptPackRoutes: existing Teach, revision and source-review roles unchanged.
- harnessToolsCalled: Workspace planning/review/Teach/qualification APIs and atomic draft store.
- userVisibleChecks: result remains old/running until durable publication; restart reads the same result.
- agentDecisionEvidence: scripted public answers only; strategy improvement unproved.
- memoryTraceEvidence: retained public replies and per-item/synthesis checkpoints.
- uiTraceEvidence: no browser run or screenshot claimed.
- trainingTraceCandidates: none; all diagnostic output remains trainingTruth:false.
- rollbackOrDemotionRules: block publication on persistence failure; retain High on invalid evidence;
  changed Plan/context cannot reuse the pending Teach-completion shortcut.
