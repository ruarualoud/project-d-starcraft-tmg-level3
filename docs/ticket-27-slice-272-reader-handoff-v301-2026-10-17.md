# S272 v301 — Complete saved answers must hand off, not repeat the whole task

## Observed defect

Actual A request224 had all eight saved answers, zero correctable citation
errors, and two material unknowns. The latest ten paid reader commands were
all `answer`, each with zero new reads. Every rewrite counted as progress.
The repeated request still began “Answer every question”, while the saved
ledger exposed only indexes and no next-state instruction. This is an
orchestration ambiguity, not evidence that the unknowns were resolved.

Ranked causes checked: repeated whole-task instruction; missing saved-ledger
handoff state; possible model confusion between finishing readonly synthesis
and final Plan admission. The first two are directly visible in the saved
request and product code; the third is a hypothesis, not claimed model intent.

## Narrow change

- The existing readonly workspace now derives its next operation from queued
  reads, missing answers and correctable citation failures.
- A complete reference-valid ledger explicitly requests `finish`; material
  unknowns remain listed. This submits the existing model-owned ledger to the
  downstream workflow, not a valid army/Plan or game admission.
- The repeated provider instruction now describes answer criteria conditionally,
  instead of ordering another full answer batch. Targeted corrections remain
  possible; no answer, roster, conclusion or receipt is written by the host.
- No fixed turn allowance, cost reset, evidence deletion, Rules change or
  automatic completion was added. A real model finish is still required.

## Concrete verification

`node scripts/verify-slice272-reader-handoff-v301.mjs <A generation directory>`

Actual A reproduced RED: complete ledger had no `workflow.nextAction` rather
than `finish`. One corresponding GREEN passed: handoff preserves unresolved
answers, does not change the original session, missing answers and malformed
citations still request repair, and queued reads remain readable. 0 Provider /
0 Native calls in the gate. Old passed gates were not rerun.

This local gate proves routing and preservation, not that the model has
followed the new handoff or that the six planning groups have passed.

## Runtime and remaining work

All six old PIDs exited after safe drain, with dispatched replies settled;
A226 was prepared but not sent. v300 ancestor recovery and v301 handoff loaded
together in the original sessions: A66810/B66811/C66812/D66813/E66814/F66815.
Original drafts and bill ledgers retained. No battles launched. Real finish
consumption, material query gaps and Plan/roster revisions remain to be observed
and repaired as needed.

### First real product outcome

- C request120 used `nextAction=finish`; the model returned finish. Persisted
  Teach/reader phases are completed and request121 is `iterative_roster_decision`.
  The exact unresolved `q-opportunity-cost-controlled-single-variable` remains
  both in the saved synthesis and downstream feedback; `finalAcceptance=false`.
  This is a real stage handoff, not final Plan admission.
- E requests172/173 reduced correctable citation errors18→10→0. Request174
  consequently requested finish, followed by actual request175
  `iterative_roster_decision`. Four material unknowns were carried in the finish
  prompt. These citation corrections came from the model, not manual ledger edits.
- A227 requests finish; B130, D131 and F123 are still in their readonly stages.
  All six are running the same code; no final output or battle admitted yet.
- Current-generation observed paid totals at this checkpoint:883 calls,
  115897445 input units and2971212 output units. Old generations and unknown
  fees remain separately preserved; this is not a verified currency invoice.

Follow-up: unknown-reference feedback still says to retain the same receipt
even when the supplied identity is a directory rather than a receipt. The
general navigation protocol allowed E to recover this time. Track this wording
ambiguity for a targeted source fix if needed; it is not a reason to block a
corrected result or replay already-successful queries.

T27 5/6; T23 33/36; six planning groups final admission0/6; main slices remaining4.

## Harness record

- harnessLoopUsed: true; targetGames: StarCraft TMG.
- promptPackRoutes: teach_framework_synthesis_step.
- harnessToolsCalled: existing readonly document reads and saved-ledger submission.
- uiTraceEvidence: none this patch; ordinary product planning adapters unchanged.
- agentDecisionEvidence: A request224 and ten saved answer commands.
- memoryTraceEvidence: original reader answers/history preserved.
- trainingTraceCandidates: none admitted; unresolved pregame work is not truth.
- rollbackOrDemotionRules: if real finish loses unknowns, prematurely admits a
  Plan, or blocks targeted correction, do not admit output and repair routing.
- userVisibleChecks: waiting for real product continuation, not claimed complete.
