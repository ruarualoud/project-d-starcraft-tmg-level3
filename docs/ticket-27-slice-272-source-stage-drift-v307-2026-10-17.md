# S272 v307 — Same-Teach source drift, diagnosis still open

## Safe recovery point

All v306 PIDs have exited. A/B/C/E/F paused normally; D stopped at
ROSTER_TEACH_RETAINED_BRANCH_SOURCE_CHANGED. All six pause-requested markers
exist. Do not resume until this source inconsistency has a proven repair.
Do not clear history, fees or counters, and do not bypass source validation.

| Group | Last request counter | Draft revision | Minerals |
|---|---:|---:|---:|
| A |239|Plan11|fixed roster|
| B |143|11|2000|
| C |137|9|2000|
| D |145|7|2000|
| E |198|36|2000|
| F |144|17|2000|

Counters include prepared requests; use dispatch records to identify paid calls.
All sent calls were settled at this stop. T27 5/6, T23 33/36; four main slices
remain. Final Plan admission0/6; no games started.

## Exact failure

D current snapshot candidate
`16a43e919b93c2b92f57023a5cd21ec63911bcb317f7f508f8baf232a090bdda`
contains two Native roots, despite the same full army and frozen context:

- Initial question receipts and actual request140 context:
  `b3982e7d6826b34c6caf514e4fe3631a10a268fe6ebb43c9eac8426eddf3dc88`.
- Investigation receipts and actual request141 context:
  `85ab874d52237a759dcc71d2428f10a8745a18ef4062329b4cf71e93ec50bcd5`.

The saved branch `q2-rebuild-combined-scene-canonical-v13` has the latter root.
The resumed laboratory has the former. Only sourceStateHash differs in the
reported restore binding; runtime, Builder and spec checks did not report a
mismatch. The current snapshot has no prior same-candidate scene dependencies;
both roots occur within this one snapshot, not merely in an older partial army.
Four earlier snapshots belong to a different1150-point candidate/root and were
correctly excluded from the dependency list.

Request140/141 available unit IDs match (19 units, both sides). Their public
query-context comparison found identity fields and lossless-reference wrappers;
that does NOT prove their full authoritative source states are equivalent.
Do not rewrite hashes or promote one scene's result to the other.

The uncaught stop is during saved Native failure reprojection:
`roster-teach-query-recovery-v1.mjs:refreshCurrentInputFeedback` calls
`evidencePort.reprojectSavedNativeQueryFailure`, which attempts exact branch
restoration. Source mismatch escapes this metadata-refresh boundary and stops
Teach instead of becoming a recoverable source problem. This is a second
reliability seam to address together with the root source discrepancy.

## Diagnostics completed — not a root-cause fix

`scripts/diagnose-slice272-source-determinism-v307.mjs` uses D's actual saved
candidate/frozen setup/map and source lock. No Provider or Native game actions.

1. First observation exceeded stdout capacity due unnecessary per-field hash
   output. It was an observer failure, not a Rules verdict. Output was narrowed.
2. Factory-only initialization twice: both exactly b3982e…, no changed state
   fields.53.016s and31.159s under concurrent load.
3. A distinct hypothesis placed actual V1/V6 runtime composition between the
   two initializations: both again b3982e…, no changed state fields.17.984s and
   17.660s. This excludes that simple warm-up path, not all stage-specific paths.

Do not rerun these completed checks without a new discriminating cause.
Next: trace the exact initialization inputs/code path that produced request141
and its Native85ab87… receipts; obtain the differing full-state fields or prove
the input difference. Then repair the source and the recovery error boundary,
one focused actual-failure gate, and same-session/same-version six-group resume.

## Other concrete progress

v306 citation-only write isolation passed its one focused RED→GREEN using F's
real35 overwritten answers; its final live model use is not yet certified.
A actually repaired missing route sideId through model delta recovery and got
advisory evidence. E completed one synthesis in3steps with0citation errors and
then revised Plan to36. F reached its current query-delta recovery. These do
not resolve all arrival, post-loss control, ability payment or strategy issues.

Current root cause remains unproven. This document is an honest stop/recovery
record, not an assertion that the generation chain is now stable.
