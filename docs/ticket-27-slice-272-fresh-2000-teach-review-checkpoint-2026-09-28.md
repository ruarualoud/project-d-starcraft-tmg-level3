# Ticket 27 / Slice 272 — fresh 2000-point Teach checkpoint

Status: not ready for a match. Ticket 27 remains 5/6; Slice 272 is open.

## Frozen outputs

- Iterative session `iterative-standard-2000-fresh-b-v1`: Builder-legal 2000/2000, nine Units, same certified Lost Temple route. Rules-audited cumulative Supply is 6/6, 8/8, 10/10, 12/12, then 12/unlimited; all public Unit references resolve.
- Teach session `agent-selected-teach-standard-2000-fresh-b-v2`: four rounds completed. The first three were replayed from retained paid replies at zero *new* Provider cost on the successful run. The final plan-deepening round produced 44 component purposes in 6,457 output units. Locked Teach plan hash `2e5dc278ee9f2b4121f0a003ecadbbeb3f750b1491c205ccd52eb69806488a22`.
- The zero-Provider identity bridge restored the original Agent-selected candidate `terran-hold-position-2000-v14` and original arrival schedule hash `9f9cce7112e7deddaff21ab3bbabcc3d70343c17152fcc63bac7874919debc01`. Bridged plan hash `05d2c3985f7a04c422ca34e4c80b5e728da1754fb6d8358260b803dfa2bba3e9`. Technical locked-preset identity is not presented as a user-chosen roster.

## Findings blocking promotion

The paid final reviewer returned six findings: two High, two Medium, and two Low. The High findings are:

1. `deploymentConcept.reinforcementPolicyText` assigns rear screening in rounds 1–2 to `u-marine-1`, which first arrives in round 3.
2. `deploymentConcept.deploymentConceptText` leaves the single round-1 small Marine ambiguous between markers 1 and 3 while a round-2 Marauder handoff assumes that Marine already holds marker 3.

An additional manual, source-backed High remains outside that six-finding model review: `scoreRoute.routeText` says “round 1 is purely positional: no VP is available” and advises against round-1 kills. The sealed Hold Position scoring profile starts **marker** VP in round 2 but awards 1 VP per enemy Supply destroyed; the Rules scoring ledger includes destroyed-Supply VP independently of marker VP. A first-round kill can therefore score. The plan also repeats a softened “round 1 purely positional” claim in its public summary. Do not promote either statement as strategy truth.

That was the initial review. The repair contract and Room gate now permit a cited `scoreRoute.routeText` revision while keeping route kind, VP target table, roster, source and arrival schedule fixed. The original paid review remains immutable; a separately hashed review supplement binds the complete frozen mission profile to its public laboratory projection and adds the missed round-1 scoring High. The zero-Provider real-bridge repair regression passed. No plan has been promoted to Room.

## Three-review convergence stop

- Initial source-bound review: 3 High (two deployment, one round-1 scoring). Source-bound hash `c5be5107…f8f4d`; original paid review hash `f70811bd…9408` remains separately retained.
- Revision 2, hash `6964faf0…1cf48`: one paid local text repair changed the score-route/public summary/deployment/reinforcement paragraphs only. It states round-1 enemy Supply kills can score and retains the same 2000-point roster, arrival schedule and VP target rows. New paid review: 2 High in conditional marker-3 and early-Worm assignments; source scoring supplement reports zero remaining contradictions.
- Revision 3, hash `0be201f1…8be51`: one paid local repair changed only those two deployment paragraphs, followed by a paid review in the same product process. The two deployment Highs cleared. One new High remains in the *unchanged* `componentPurposes.u-marauder-1`: it says the round-1 Marine must hold marker 3 until the round-2 Marauder arrives, while the current deployment text binds that Marine to marker 1 and the hinge Goliath to marker 3. It also calls the Marauder one round later than the first marker VP even though both occur in round 2. Current claim-repair paths do not include component purposes.

Three successive source reviews have not converged. Per the owner rule, stop paid repair/review here; do not open a fourth review or hand this plan to a Room. The next scoped engineering deliverable, after direction to resume, is a typed cited repair for a named unit `componentPurposes.*.publicPurposeText`, followed by a provenance-bound revision-chain/Room handoff check. The original, v2 and v3 artifacts and all four paid repair/review replies remain retained. Medium/Low findings are tracked but are not blockers. The full product initialization/bridge before each paid operation took minutes even though the model replies were short; a combined repair+review entry now avoids one repeated initialization, but its fixed startup cost remains a performance item.

## Reliability and cost evidence

Real defects repaired this slice: zero-reply failed Teach resume, V2 Supply schedule rebound to the temporary locked candidate, one missing JSON object closer in a paid Teach answer, extra model field normalization with dropped-value hash, and the CLI's incorrect use of a private output array instead of public `retainedReplyCount`. The latter mistakenly bought two already-retained rounds once; they are counted, not erased. One plan-deepening call reached the 32,768-unit output ceiling; a soft anti-duplication instruction preserved all required component coverage and completed on the next call. None of these fixes changes Rules-owned roster legality or arrival arithmetic.

Teach/review cumulative usage at the 2026-09-27T19:38:37Z reporting reset was eight actual Provider calls, 190,427 input and 70,985 output units, estimated ¥0.480128 off-peak to ¥0.960256 peak. This includes the two redundant calls and one incomplete call; none is erased. Four subsequent paid repair/review calls bring this lane to 12 cumulative calls, 218,362 input and 78,552 output units, estimated ¥0.546510 off-peak to ¥1.093018 peak. The new reporting-window increment is four calls, estimated ¥0.066382–¥0.132762. The Provider invoice remains authoritative. The Teach ledger is `docs/ticket-27-slice-272-teach-cost-window-v1-2026-09-28.json`; iterative roster generation and the two match rooms each have their own independent baseline and ¥100 notification threshold.
