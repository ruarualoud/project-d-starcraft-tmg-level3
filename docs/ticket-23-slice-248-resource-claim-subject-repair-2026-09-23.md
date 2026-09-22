# T23 / S248 — comparison costs belong to their own actions

## Captured failure and boundary

Process76101 confirmed exit1 at r73 after
`LIVE_DECISION_PLANNER_DID_NOT_CONVERGE`. The accepted Marine3 deployment,
Apply/Replay and screenshot remain intact. The next selected action is Stimpack
on Marine3. Its Rules contract says1 CP, and the final paid Planner output says
the same. Nevertheless the resource checker rejects four comparisons that
explicitly describe `finish_activation` at0 CP as claims that Stimpack is free.
Three semantic submissions reached the existing stop limit; no fourth paid
Planner attempt was started.

Snapshot: Round2 Movement,66new+7prefix=r73,191calls,
21,262,784accounted units, estimated¥28.363779. Both seats Flash. All completed
responses are retained in the same run `20260922172710914`; no pending Provider
attempt or Room Apply was found at stop. No credential or hidden reasoning is
included in this evidence.

Ranked diagnosis after the real failure was reproduced:

1. Whole-fragment matching attributes another action's cost to the selection.
   Binding each cost occurrence to its subject should accept the saved response.
2. Negated zero-cost claims can also match the literal zero-cost expression.
   Explicit negation cases must stay accepted without exempting true free claims.
3. Incorrect Rules cost could explain the mismatch, but the captured selected
   resource contract is1 CP and agrees with the final Planner; no Rules fix.

## Focused repair and evidence

The shared Planner/Action resource checker now binds each cost occurrence to
the nearest named action/ability in its sentence, using current candidate
identities and existing action-family names. Explicit "this selected action"
rebinds to the selected candidate. Negated zero-cost statements do not assert
free use. No action name, cost, choice, strategy or Provider model is invented.
The original selected-field default remains for unnamed claims such as
"This action requires no CP", which still contradicts the positive Rules cost.

Rules execution and source-card exhaustion checks are unchanged. This is a
bounded narrative check, not a proof of all natural-language reasoning. Public
strategy and inherited plan mistakes remain review evidence. Action/Planner
local replay versions advance to37/14 so retained completed outputs can be
revalidated by the repaired checker; prior accepted actions are not replayed
as new choices and old failure history is not erased.

Only the new concrete-bug mode was run:

`node scripts/verify-ticket-23-slice-248-selected-action-resource-claims-v1.mjs --comparison-subject-only --run-directory=build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914`

First run reproduced all four false contradictions in the exact final paid
Planner output. **One post-change run passed in2.570s**, including26 directly
related Planner/Action positive and negative cases: alternatives, comparison
lists, negation, explicit selected-action references, Supply versus CP, and
Chinese cost wording. Genuine "Stimpack costs0 CP" remains rejected.
**0 Provider calls /0 Room mutations /¥0.** No old resource mode, identity gate,
full suite or Web build was repeated. The test certifies this check, not the
entire Planner or resumed action; the live continuation must supply that proof.

## Additional actual match evidence

r70 Marine1 finish→r71 Corpser move→r72 Corpser finish→r73 Marine3 deploy all
have accepted actions, Replay and Web screenshots. r71 and r73 images inspected.
Corpser chose the full-intent `requested-right` option. Its separate path and
coherency queries lacked a full proposal and returned typed
`RULES_QUERY_PARAMETERIZED_PROPOSAL_REQUIRED`; exact final instantiation still
ran. Record query-contract usability with the earlier primitive-distance item,
not as an illegal action or a reason to reroll strategy.

The Marine3 deployment uses the already-repaired narrow reserve-coherency path:
4examined candidates→4exact instantiations→4options, no rejected search entries,
9models,3inch coherency, Rules Apply/Replay. This closes a real subsequent
reserve deployment branch; it does not claim the historical Goliath2 choice
was replayed or every reserve family was tested.

![Corpser after r71](../build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914/screenshots/0534-r071-player2-move-complete-board-applied.png)

![Marine3 deployment at r73](../build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914/screenshots/0549-r073-player1-deploy-complete-board-applied.png)

The new Marine3 group is labelled "Marine1" on the board image. Unit identity
in decision/Rules is `player1-marine-3`; record instance-label clarity as a UI
item, not evidence that Rules deployed the wrong unit. No portrait/map restyle
was performed in the match lane.

## Continuation

Live resume52348 restored the original r73 room. The saved Planner output was
revalidated locally (`LOCAL_PLANNER_OUTPUT_REVALIDATION:...v14`), without a new
Planner call. One Flash Action return at23:18:36Z completed processing, then
r74 Marine3 Stimpack and r75 finish_activation both Applied/Replayed and were
captured. The r74 image was inspected. Player1 has no unresolved issue or
pending Apply: the previous High closed after verified execution, not before.

At23:22:54Z the same room is Round2Movement,68new+7prefix=r75,192calls,
21,394,681accounted units, estimated¥28.539689. Recovery added exactly1call,
131,897units and¥0.175910. No paid Planner repetition, cleared usage, changed
selection, rerun of passed tests or Web rebuild. Keep52348 running.

![Marine3 Stimpack, restored paid plan](../build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914/screenshots/0560-r074-player1-use_active_ability-complete-board-applied.png)

Observation stages remain a measured performance item: r74 manifest21.478s,
refresh8.661s,capture31.561s (61.700s); r75 3.734+7.800+36.240=47.774s.
Manifest time can overlap execution, so these sums are not pure read overhead.
Strategy fields, formation capacity and per-action screenshots remain intact.

`harnessLoopUsed:true`; game `starcraft-tmg`; route `selfplay_agent_prompt`;
tools relationship/formation/instantiation, Rules preview/apply/replay; public
plans and memory continuity retained, no hidden chain of thought. All new
experience remains `trainingTruth:false`. T23 still33/36: S248 full match,
S249 review, S250 synthesis remain open.
