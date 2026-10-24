# S272 — Immutable laboratory recovery, v308–v309

## Scope and admission

T27 5/6; T23 33/36; remaining S272/S248/S249/S250 = 4.
Six planning groups remain unaccepted (0/6); no new game has started.
This is the common product path, not a replacement experiment-only engine.
The focused recovery passed before all six original production sessions were
resumed together on v309. No session or accounting history was reset.

## Proven defect versus unexplained history

D's same-candidate Teach contains initial-root b3982e… and investigation-root
85ab87…. The old full 85ab87… source is not present in the current saved Teach
snapshot. Its receipts do not establish equivalence to b3982e….

Read-only exclusions performed before v308: reference-runtime warm-up, ordinary
product reconstruction versus the direct factory, JIT-disabled and optimized
factory runs all reproduced b3982e…, not 85ab87…. The production-source probe
used an isolated session copy and stopped before Provider access; it found zero
state-field differences. No source/factory/map-data modification was identified
between the request140 and141 process starts. These exclusions do not prove the
historical drift's cause. Do not repeat them as validation or declare it solved.

The architectural gap is established: the ordinary product reconstructed its
entire laboratory root on every restart, rather than restoring a saved root.
The old snapshot consequently cannot support a direct full-state comparison.

## v308 — Complete frozen source persistence (passed)

`planning-laboratory-source-store-v1.mjs` stores compressed immutable authorities
under the existing workspace data directory. The key includes the frozen source
versions, explicit factory version and all construction inputs (armies, map,
mission/deployment, room/seat configuration and spending policy). It excludes
Plan prose, model calls and review counters.

`roster-planning-product-module-v1.mjs` uses this module for both the reference
army and selected-army laboratory. An atomic non-overwriting publication chooses
one complete source if constructors race. Restarts restore its actual content.
The existing authority verifier checks loaded snapshots; corrupt evidence is
preserved and rejected, never silently reconstructed. No new signature scheme.

Focused command: `node scripts/verify-slice272-pinned-product-source-v308.mjs <base>`.

- Actual D ordinary product restart was RED: `LAB_SOURCE_REBUILT_ON_PRODUCT_RESTART`.
- One GREEN after the change: two distinct frozen sources, one product restart,
  exact source reuse, changed construction scope separated, damaged private-copy
  artifact rejected, original production session unchanged.
- Provider calls0; Native actions0. Old completed gates were not rerun.
- Private copy: `build/ticket-23-three-arm-performance-baseline-20261010-v1/pinned-source-v308-O8jLok`.
- Two compressed artifacts were approximately1.6MiB each. No historical logs deleted.

This prevents reconstruction drift; it does not validate old 85ab87… receipts.

## v309 — Existing mixed-source calculations (passed)

The real D ordinary-resume RED stopped at `ROSTER_TEACH_RETAINED_BRANCH_SOURCE_CHANGED`
while preparing the next correction's capability context, before a Provider call.
The earlier diagnostic also observed the same missing recovery at feedback
reprojection. Catching only one of those call sites would not repair the flow.

The shared Teach entry now reconciles incompatible calculated evidence before
entering either path. Original receipts and model-owned requests are journaled.
Only affected read-only calculations are recomputed against the pinned source;
same-source initial evidence is reused. New results are new receipts, not old
receipts with a rewritten source identity. Pending corrections consume the new
failure context without resetting paid choices, costs or correction limits.

Native actions, random outcomes, lifecycle advances and historical inspection
reads are not automatically replayed: they retain a typed reinvestigation need.
The module does not fabricate an answer, change the army/Plan, or accept strategy.

Focused command: `node scripts/verify-slice272-source-reconciliation-v309.mjs <base>`.
One post-fix execution passed on the actual D copy:

-21 affected calculations received new current-source results. Original results
  remain in the reconciliation journal; no old result was relabeled.
-Same-source initial question evidence remained byte-equivalent, with no requery.
-Army, Plan, prior calls, dispatches/fees, choices and correction limits unchanged.
-Normal product resume reached `teach_framework_query_delta_recovery`, context
  `a4e15cd2b7c6bd0a5460e546cb54464f3063832a47d7d9aaa8342619adb16ac7`.
-Provider calls0; final Plan accepted=false. Reaching the next model decision
  does not prove its future answer or the remaining strategy questions.
-Copy: `build/ticket-23-three-arm-performance-baseline-20261010-v1/source-reconciliation-v309-lU8qqb`.

An observer attempted an unhashed session filename after the gate completed and
got ENOENT. The actual file store uses its own filename mapping; the gate used
that store and passed. No production retry or gate rerun followed this observer error.

## Rollout

All old production runners were absent. A historical ambiguous request already
had a completed retry; the shared dispatch-reconciliation function confirmed no
outstanding requests in any group. Original pause markers were moved to named
`pause-requested.before-v309-*` records (not discarded), then the existing
`--resume-product` entry restarted the same six sessions:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
|85504|85505|85506|85507|85508|85509|

A/B keep generation264; C–F keep matrix/generation274. These are launch PIDs;
verify live handles and bounded progress fields rather than assuming success.
Existing plan revisions and 2000-point candidates are unchanged at launch.
Final admission remains0/6. Watch D's actual source reconciliation and first
paid reply, then the shared citation repair's model use. No further source/code
switch while a request is in flight; no new games.

At10:55 CST, all six PIDs were independently confirmed live. A prepared240,
C prepared138; E completed199 and200 (two new recorded paid calls). D's production
journal had21/21 calculations persisted, with its final completion checkpoint
still pending and no failure. B/F remained computing at their old request
counters, not presumed stopped. No final acceptance was recorded. These are
live observations, not a claim that all six next model responses succeeded.

## Changed product files

- `packages/roster-planning-workspace/planning-laboratory-source-store-v1.mjs`: immutable source storage.
- `packages/product-composition/roster-planning-product-module-v1.mjs`: both laboratory construction paths use it.
- `packages/roster-strategist/roster-teach-source-reconciliation-v1.mjs`: journaled current-source recalculation.
- `packages/roster-strategist/roster-teach-framework-v1.mjs`: reconcile before ordinary recovery or saved synthesis.

Two concrete-bug regression scripts cover the two deliveries above. No unrelated
test/build, source refresh, installation, deletion, subagent, commit or push.

## Harness record

- harnessLoopUsed: true; targetGames: starcraft_tmg.
- promptPackRoutes: existing roster Teach/investigator/query-repair roles.
- harnessToolsCalled: ordinary product resume, existing Rules laboratory queries.
- uiTraceEvidence: none in this scoped recovery check; no UI acceptance claimed.
- agentDecisionEvidence: unchanged saved D army, Plan and model-owned requests.
- memoryTraceEvidence: original receipts plus explicit source-reconciliation journal.
- trainingTraceCandidates: none; trainingTruth remains false.
- rollbackOrDemotionRules: do not resume production if the original session,
  choices/fees or same-source evidence changed, or if an old receipt is relabeled.
- userVisibleChecks: actual source restoration and reaching the normal next
  decision boundary; final Plan correctness remains a separate uncompleted gate.
