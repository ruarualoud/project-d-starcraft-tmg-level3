# Ticket 27 / Slice 272 — corrected Plan feedback closure v51

## Completed scoped change

Source-review correction can change a Plan after the model accepted its earlier
Teach result. Acceptance now binds the current Plan, not merely the Teach session.
The journey returns the final reviewed Plan to the existing model feedback loop:
the model can retain it, revise its Plan, or reopen army selection through the
official Builder. Both product admission paths reject an obsolete acceptance.
Previous replies, reviews, acceptance history, limits and costs are retained.

Product files:

- `packages/roster-strategist/iterative-roster-plan-session-v1.mjs`
- `packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs`
- `packages/product-composition/roster-planning-product-module-v1.mjs`

Concrete bug reproduction:
`scripts/verify-ticket-27-slice-272-post-review-feedback-v1.mjs`.
This is routing/admission verification with local doubles, not a certificate of
strategy quality or truth of the paid source review. No live Provider calls or
room mutations were made for these gates.

## Verification receipts (do not rerun passed branches)

Under `build/ticket-23-three-arm-performance-baseline-20261010-v1/query-contract-audit-v30/roster-deliberation-live-v43/`:

- `post-review-feedback-red-v51.private.json`: RED 10582, obsolete acceptance and
  same-Teach/current-Plan conflict reproduced.
- `post-review-feedback-green-v51.private.json`: 12910 was a partial failure.
  Official-Builder army reopening and Plan-only reopening passed; the journey
  observer timed out at two seconds. These passed branches were not repeated.
- `post-review-feedback-journey-supplement-v51.private.json`: only the unfinished
  journey branch, 16760 passed with a bounded observer and minimal public fixture.
- `post-review-admission-red-v51.private.json`: actual product preflight 20803
  reproduced missing rejection of obsolete acceptance.
- `post-review-admission-green-v51.private.json`: only that admission branch,
  24289 passed after the product fix.

Offline Host reloaded after all dispatches were completed: PID27446,
`http://127.0.0.1:64610`, no Room launch. Same workspace and billing.
Logs: `workspace-host-v51.stdout.private.log` / `.stderr.private.log`.

## Actual production remains pending

New detailed B has a legal 2000-point eight-unit army and a corrected Plan draft,
but final paid review still has seven raw High findings. Several conflate
starting/total slots, arithmetic, or conditional predictions; one actual claim
misattributes a caller-projected scoring receipt. Do not silently discard the
review or claim final acceptance. Current Plan hash `ec80f68c…`; previous model
acceptance `35397c80…` is no longer sufficient. No new B/D battle has started.

## A/C independent stop — current authority

At 2026-10-13 06:39:13Z, common monitor v48-acr2 stopped both original runs
following C `LIVE_DECISION_PARAMETERIZED_PROPOSAL_DID_NOT_CONVERGE` at revision94,
player1. Stop closed at 06:39:20Z. A is revision81, C94, both round2 Movement.
Host58186/58187, drivers60464/60465 and monitor60466 are no longer alive; the last
monitor JSON still says running and must not be treated as current authority.
See `all-stop-common-v48-acr2.private.json` and C `failure.json`.

C paid replies actually contain `selection.paymentCardInstanceIds`; the
parameterized submission JSON lacks that duplicate field. Rules reject the
converted proposal three times as missing payment. Investigate/fix the common
conversion seam, replay saved output through Rules, and preserve model intent;
do not manually choose another action or reset retry counters.
C current room estimate ¥78.566023; prior offset ¥246.767013, combined ¥325.333036.
A last room estimate ¥57.074726, combined ¥290.215932.

Next order: repair A/C automatic parameter recovery → B actual source correction
and current-version model feedback → initial-B comparison → B/D admission.
Ticket27 5/6; Ticket23 33/36; four main slices remain (248,272,249,250), valid
completed experiments 0/12. Map scope20 unchanged. No agents, installs, refresh,
deletion, broad tests, commits or pushes.
