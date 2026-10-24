# T27 / S272 — query repair continuation and exact paid-review reuse

T27 5/6; T23 33/36. Main remaining slices: 248, 272, 249, 250 (4).
Complete-game acceptance remains 0/12. Original Rooms A133/C156/B9/D9
are unchanged. This is not map, full-game, or strategy acceptance.

## v94: actual changed-claim review

A7 adds a native control receipt to four corrected claims. The old incremental
review treated the changed citation projection as a change to all frozen facts,
silently falling back to a full review. v94 distinguishes citation membership
from unchanged authority, verifies common receipt contents, and includes every
claim affected by the added/removed citations. Actual Rules/schedule changes
still invalidate incremental reuse. Its prior concrete RED/GREEN is retained;
do not rerun `verify-slice272-cited-evidence-incremental-v94.mjs`.

The mistakenly expanded v93 review was cancelled at the existing safe boundary;
paid replies were retained. v93 ended with 4 calls / 644139 units, including
A7 generation. Its queued associated revision did not start because its parent
was cancelled. This is a terminal engineering recovery, not a paused user goal.

Runner75720/host75771 actually reviewed exactly four A7 fields. One paid call:
48426 input (512 cached / 47914 miss), 4874 output, total53300. Frozen historical
off-peak estimate USD0.010113036, not a current price or invoice. A ledger after
this call: 69 calls / 11264271 units. No reset of earlier or unknown charges.

The model returned no new High. Some Medium questions still treat conditional
geometry or a stated unit role as if it required proof of future play. These
are not automatic blockers. However, local aggregation failed with
`ROSTER_FINAL_REVIEW_ADJUDICATION_INVALID`; do not call the failed job accepted.

## v95: correctable query errors must not close after one try

`roster-teach-query-recovery-v1.mjs` marked every executed correction complete,
including a receipt with `status=unknown` and `queryRepair.correctable=true`.
This is a coordinator defect, independent of whether the model's query was good.

Fix: continue with the latest failure within the existing three-attempt bound;
preserve all earlier receipts and choices; invalidate stale synthesis; stop at
success, defer, non-correctable failure, unchanged failed query, or exhaustion.
Historical premature closes can consume only their remaining original attempts.
Neither fees nor counters reset. Existing completion remains reusable.

Concrete regression `verify-slice272-query-recovery-continuation-v95.mjs <base>`
uses B's saved missing-domain request with scripted replies. RED:1 instead of2
correction calls. Sole GREEN: second correction succeeds; persistent failure
stops at3; latest feedback and previous receipts retained; completed/exhausted
resume does not repeat. 0 Provider calls / 0 Room actions. This is not proof that
the real model can now construct the required scene. Do not rerun passed gate.

## v96: preserve the proof when inheriting a review decision

A6 had source-qualified review decisions under policy13. Incremental aggregation
copied some decisions/counterquotes without their source proof. It then applied
the older rule forbidding a self-quote alone. The saved paid A7 output reproduced
the failure at the exact aggregation verifier, without another model call.

`roster-final-plan-review-v1.mjs` now carries available source proof for inherited
decisions even when they also contain counterquotes. A self-quote is accepted
only with the independently validated source proof; the unchanged claim,
catalogue, source judgments and effective-severity checks remain. No finding
is erased or reclassified merely to make aggregation pass.

Concrete regression `verify-slice272-paid-review-aggregation-v96.mjs <base>`:
actual saved A6/A7 and exact saved paid context; RED at aggregation; sole GREEN
reuses one four-claim shard, retains8 verified decisions, effective High0,
and rejects altered inherited proof. 0 Provider calls / 0 Room actions. Do not
rerun passed gate.

## Actual recovery handles

- `common-v96-A-paid-review-aggregation.private.mjs`: actual terminal completion
  21:30:05Z, runner79971/host80003. Production saved-output adapter reused the
  exact four-claim paid shard with **0 new calls / 0 new units**; ledger unchanged.
  Review `9a0a13d8145980f59316a9ca70fca5c45c237e032506ab4815dde3eaaf6668e6`.
  Eight retained rawHigh retain their verified decisions; effective High0.
- `common-v96r2-A-composition-consistency.private.mjs`: runner82055 started
  after the actual terminal result, reusing host80003 to correct14 affected
  composition/attrition paragraphs plus the initial-reserves versus planned
  arrival distinction. Army, upgrades and arrival schedule must remain unchanged.
  Check its matching progress file and actual process; do not duplicate an
  in-flight request or claim this pending revision is accepted.
- B17 remains unchanged. Its completed review is not proof of its four unresolved
  scenario questions. Do not rewrite B's already-correct Marine composition.

## Remaining substantive work, not more blanket review

1. Finish A's actual aggregation and associated fact consistency repair.
2. Repair/execute remaining named terrain, action-domain, casualty/control and
   ability queries. A failed packing is not impossibility. Unknown future enemy
   choices are conditional hypotheses, not engineering failures to eradicate.
3. Current workbench recovery only accepts queries bound to the current Plan.
   A's saved Teach is A6; B's saved Teach is B14, while their plans are A7/B17.
   Do not blindly invoke a fresh Teach cycle or erase history to bypass this.
   A source-bound retained-query continuation is needed before recovering those
   exact old investigations against unchanged army/map facts.
4. Apply accepted plans explicitly and resume original Rooms on common code;
   complete full comparisons, map acceptance and eventual strategy review.

No installs, source refresh, subagents, K3, deletion, commits, game actions or
new screenshots were performed. Focused diagnosis/Teach/harness skills guided
failure preservation and outcome boundaries; trainingTruth remains false.
