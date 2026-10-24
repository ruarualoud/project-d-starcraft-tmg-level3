# Ticket 27 / Slice 272 — full-claim review checkpoint

Status: not ready for Room admission. This document preserves a paid review and
its source-based adjudication; it does not replace or delete that review.

## What changed

- The original final-review contract capped findings at six and supplied only
  nine unit purposes from a 44-component plan. Three consecutive paid reviews
  each filled the cap, exposing another old contradiction only after a repair.
- A versioned V2 review now supplies all 44 component purposes (units,
  compositions, upgrades and cards), retains the seven global plan claims,
  and permits 64 cited findings. Old V1 receipts and replay keep their V1
  contract. The runner chooses V1 only to replay a retained V1 reply; fresh
  reviews use V2.
- The saved 2000-point plan's zero-Provider focused gate confirmed 44/44
  purpose claims and seven retained, exact-quoted findings. The directly
  affected V1 map-route-context gate passed once. No full suite was rerun.

## Actual paid result

The second repair of the explicit `component-purpose-20260929` recovery cycle
produced plan v5 `58388c55…2e8e5fbc3`. Roster candidate, Rules-checked
arrival schedule `9f9cce71…91debc01`, target VP schedule and map binding
remain frozen. V2 review `ffff0713…6d5f9ce32` returned 53 exact-quoted
findings: three High, 25 Medium, 25 Low. The 50 Medium/Low findings are
tracked, not integration blockers under the user-specified policy.

The three Highs need adjudication, not another blind text repair:

1. `deploymentConcept.deploymentConceptText`: the reviewer treats the
   round-one marker split as proven placement, but the same source expressly
   says base-access distances are not exact moves or formation proofs and
   makes each arrival-round marker claim conditional on the actual board.
   It is a plan to test, not a claim of certified deployment.
2. `deploymentConcept.reinforcementPolicyText`: the reviewer asks for a
   named replacement if the marker-one Marine dies before round three. The
   source expressly says the post must be covered by an already-arrived unit
   **or conceded for that round**; it does not promise a replacement.
3. `componentPurposes.u-marine-1`: the reviewer says there is no standing
   rear screen in rounds one and two. The component purpose assigns this
   Marine only from round three. The reinforcement policy names a conditional
   earlier Goliath screen when the temple axis is safe, and explicitly says
   no separate early screen is claimed when it is contested. This is not an
   unconditional double assignment.

These are source-supported false-positive candidates, not yet formally
discharged. The paid review is immutable; a typed adjudication record must
carry claim quote, counterquote, provenance and effective severity before
Room admission can use it. A further independent product blocker is
`prepareAgentSelectedTeachPlanForRoom`'s `plan.revisions.length > 3` hard
limit: this v5 plan has four traceable revisions. The review-cycle cap (three
rounds) is not a lifetime cap on plan revisions. No Room admission was tried
or claimed. The recovery cycle has used 2/3 review rounds; do not start an
unbounded fourth.

## Independent costs and match evidence

- C fresh roster generation was reset at `2026-09-28T18:29:29Z` on r21,
  19 paid replies. It has made no subsequent call: C increment is ¥0.
- D Teach/claim-repair/review has made four calls since its independent
  baseline, 250,716 cumulative input and 94,211 output units; incremental
  estimate ¥0.108569–0.217138. This is not added to C.
- B's current versioned Room branch reached revision 6 after five new model
  actions, 30 calls and 4,069,072 units on that branch, own estimate
  ¥5.167183. Every action has Apply/Replay and board screenshots. The last
  action was Marine 1 Run toward marker 3 (`0032-r006-…board-applied.png`).
  The broader B experiment includes older source/sibling costs and is not
  merged with A, C or D. The runner has resumed the same branch for its next
  checkpoint. No complete match or strategy improvement is claimed.

## Harness evidence boundary

`harnessLoopUsed`: yes; `targetGames`: StarCraft TMG only;
`promptPackRoutes`: V1 retained review, V2 full-claim review, existing
opponent-agent room route; `harnessToolsCalled`: Rules-backed roster arrival,
map-route receipt, saved-room LegalSpace/Apply/Replay and board capture;
`uiTraceEvidence`: B branch action screenshots through r6;
`agentDecisionEvidence`: five public B intents and the V2 review findings;
`memoryTraceEvidence`: B same-room plan continuation, not proof of optimality;
`trainingTraceCandidates`: none promoted; `rollbackOrDemotionRules`: preserve
V1 paid replies, keep V2 review advisory and block Room until source
adjudication and revision-chain gate are corrected; `userVisibleChecks`:
44/44 full-claim context, seven-finding local gate, V1 map-route gate,
five B Apply/Replay receipts.
