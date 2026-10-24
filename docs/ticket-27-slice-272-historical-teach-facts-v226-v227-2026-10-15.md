# T27 / S272 — historical evidence continuity and scoped candidate review

2026-10-15. T27 5/6; T23 33/36; remaining272/248/249/250=4; accepted full games0/12.
All four games stopped. B's completed Kimi candidate is Plan20, not a promoted Plan.

## Actual cause of v225's prior-facts mismatch

No rule or army change caused this mismatch. A newer Teach replaced the active
Teach state. Plan19 still explicitly cited historic receipt
`37240b195db67681df81519506e4c0b9dc2b688556ff09a98b501166ed19ed92`, but the shared
fact collector only searched the active state's evidence/investigation/recovery.
The original receipt and Native children were still saved in Teach history and
the tool log. Current revision and review both omitted that receipt.

Read-only diagnosis restored historical originals through the existing receipt,
Native-child and frozen-source validation. Exactly one facts field was restored:
`citedTeachQueryEvidence`. The resulting complete prior facts digest is exactly
`77a208e74b073657d8567878303fe3f1072c23acdf9055576ae0c81650679a23`, matching the
paid Plan19 review. This is evidence of a lost historical input, not a guess that
two different factual contexts are interchangeable. No new query/model call.

## Source changes

- `roster-teach-history-view-v1.mjs`: read-only Plan consumer view of historical
  receipts still explicitly referenced by the Plan. Keeps the active synthesis,
  agenda and coverage unchanged; does not import old strategic conclusions or
  relabel them as current. No original archive mutation or duplicated current
  receipt. Original body/source/Native checks remain in the authoritative consumer.
- Workspace review, qualification, fact refresh and Plan revision use the same view.
- Shared final-review facts include the retained historical originals. Revision
  deliveryv4 indexes them and exposes the same saved-evidence reader; the actual
  Plan19 revision sees55indexed receipts instead of52, not all unrelated history.
- Incremental review had a second bug: automatically derived affected citation
  paths were rejected unless the caller also supplied an explicit extra-path
  option. Validate caller-supplied paths separately; keep exact automatically
  derived dependencies without requiring that redundant flag. Unknown paths,
  actual altered facts and changed non-prose dependencies still fail validation.

## Focused verification and convergence

`node scripts/verify-slice272-historical-teach-facts-v226.mjs <base> <phase>`

1. Initial RED fixture omitted the existing Builder's required frozen input and
   failed before the target path. No model or product execution; retained as an
   invalid reproduction, not evidence for the product bug. Fixture corrected.
2. RED2: real workspace review input lacked the still-cited historical receipt.
3. First GREEN attempt: receipt reached the consumer, but review expanded to12
   batches. Separate zero-model inspection proved the second cause was
   `additional_claim_identity`, not changed facts; all old facts now matched.
4. After that explicit source fix, one additional GREEN2 under the user's standing
   authorization passed14.2s: actual workspace review3root batches; actual revision
   original-facts digest exactly matches prior review; original history reference
   appears in indexed archive;0Provider/Native/source writes; draft unchanged.

Do not rerun GREEN2, v224 checkpoint GREEN, or older v222 gates. No broad build or
new unrelated tests. This proves consumer wiring/scope, not LLM strategy quality.

## v227 independent real Kimi review — in flight

`run-slice272-B-kimi-review-v227.mjs` uses the original workspace `reviewFinalPlan`
interface, sourcePlan19's actual completed review, and the complete candidatePlan20:
`b36f3441fe13fc0e277c2c951dca0d62dbde5b465c975094841ad08d65732d47`.
It does not regenerate the Plan or write the original workspace. Each target batch
gets the full cross-claim index and shared verified facts. Old unaffected review
findings are retained; new or changed claims are independently reviewed.

Runner36462; first Kimi session`session_cb77882d-5322-4add-8776-5d0defe9d08d`.
First context`65bfa69afb06fd4d37ec1711022be4acab60f9dc01936fd243d80cf57b29e30f`.
First model input397683bytes / ACP prompt399263bytes. Expected3root batches,
max3logical calls,10min each, no blind retry/Native/tools/subagents/room startup.
Original old fees and v224286825tokens preserved; new review usage separately tracked.

Observe original handle, do not restart on observation timeout:

- `<base>/common-v227-B-kimi-review-progress.private.json`
- `<base>/B/kimi-code-candidate-review-v227/turn-01.public-progress.private.json`

Base:`build/ticket-23-three-arm-performance-baseline-20261010-v1`.
If a complete review appears, inspect its findings and source qualification before
any promotion. APlan9 native Omega evidence is still pending. No claim of final
Teach acceptance, stable full games or completed goal has been made.

## Harness evidence

harnessLoopUsed:true; targetGames:[starcraft-tmg]; promptPackRoutes:original offline
revision and independent final-plan-review; harnessToolsCalled:workspace revisePlan,
reviewFinalPlan and retained-evidence projection; uiTraceEvidence:none; public
agentDecisionEvidence:candidate20 and pending review; memoryTraceEvidence:original
history/native receipts unchanged; trainingTraceCandidates:false; trainingTruth:false.
Rollback/demotion: changed original values, unverified source, missing claims or
unresolved High cannot promote a Plan. Skill influence: actual consumer reproduction,
shared harness evidence and separate offline strategic review. No install/delete/commit.
