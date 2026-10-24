# Ticket 23 / Slice 248 and Ticket 27 / Slice 272 — automatic recovery

## A/C: payment transport v52

C stopped at revision94 after three parameter corrections. All three paid Action
replies selected `faction:player1` and `player1-tactical-1`, but the shared
selection-to-parameters conversion read only `parametersJson`. The schema also
advertised no payment cards for non-enumerated parameter domains. Repeated model
generation could not repair an engineering omission.

`packages/online-agent-session/live-flash-decision-port-v1.mjs` now transports the
model-owned selection, retains legacy JSON-only payments, rejects conflicting
explicit payments, and exposes current-domain payment choices in the common
native/JSON terminal schema. Empty unrelated wrappers do not add payment fields
to a nonpayment domain. Rules remain the only instantiation/Apply authority.
Action normalization v65 enables the existing local paid-output revalidation;
no model action/strategy was substituted and failure/cost history was not erased.

Concrete bug script: `scripts/verify-ticket-23-slice-248-C94-payment-transport-v1.mjs`.
Receipts under `roster-deliberation-live-v43`:

- RED41929: actual selected payment was lost.
- 43167: transport/conflict/invalid-payment branches passed; schema observer
  wrongly interpreted an absent maxItems as prohibition, so command was partial.
- Only unfinished schema branch44626 passed after that observer correction.
  Earlier passing branches were not rerun. No real Provider/Room calls in gates.

Same original A/C rooms resumed with common `s248-v52-payment-transport-20261013`:
Hosts46720/46722, monitor47750, `common-v52-acr1-*` operational records.
C actual revision95 applies Jim Raynor's Orders/remove_activation_marker to
Marine1 using the saved two-card choice. Receipt
`2ab975fb0b4898f5f518a1cc566a313f5da44a8518e5c97a3befa1d3bd466231`,
`replayMatchesCurrent=true`; existing six paid decision attempts reused, match
Provider count224 and room estimate¥78.566023 unchanged at this action.
Screenshot `query-v33-clean-C-20261013-v1/screenshots/0624-r095-player1-resolve_battlefield_asset_ability-complete-board-applied.png`.
By07:22Z A86/C100, both round2 Assault, original armies/A Plan retained.

## B: bounded source-review qualification v53

Seven raw High findings remained. Three visibly contradict their own premises
(1+1 arithmetic twice; starting slots versus capacity after purchased cards),
three concern conditional forecasts/wording, and one genuinely misattributes a
caller-projected VP receipt to a specific branch. These are diagnoses, not a
manual decision to clear the gate.

Existing source adjudication also omitted structured hypothesis/counter/trigger
prose from its reference index. RED53054 reproduced rejection of an exact
counterquote in the actual Plan. The index now includes that shared manifest.

The existing automatic repair loop now first runs one bounded model challenger
for the exact current review. It sees all literal claims and verified facts,
and may keep High or track Medium with exact bound counterquotes. Paid findings
remain immutable; Critical is never demoted. Genuine unresolved High then goes
to the existing targeted model repair and changed-claim source review. The same
review cannot repeatedly buy qualification, and uncertain dispatch is not
silently retried. Unchanged, source-qualified findings can be reused during
incremental review only while their claim/counterquote and fact dependencies
remain unchanged. Current-version model acceptance from v51 still follows.

Changed product sources:

- `packages/roster-strategist/roster-final-plan-review-v1.mjs`
- `packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs`
- `packages/roster-planning-workspace/reviewed-plan-auto-repair-v1.mjs`

Concrete script `scripts/verify-ticket-27-slice-272-review-reconciliation-v1.mjs`.
53054 RED; 56748 passed structured binding then exposed missing integer bounds
in the new output contract; only unfinished qualification/routing57861 passed
after fixing those explicit schema bounds. Local doubles prove exact binding,
forged-quote rejection and qualification before correction, NOT factual truth
of the actual review or strategic quality. No paid calls/room writes in gates.

Offline Host27446 closed with every dispatch completed and no active work.
New Host59412 loading the same workspace with v53, no Room launch. Actual B
qualification/repair remains to be observed; no B/D room or final acceptance is
claimed by this scoped verification.

## Actual v53 failure and automatic v54 recovery

The actual B qualification returned in about16seconds: 67,782input plus
2,359output =70,141units. Every Provider dispatch completed. It retained six High
and tracked finding73 Medium, but cited the exact alleged quote as its own
counterevidence. The existing binding validator rejected that candidate; no Plan,
army or room was changed, and no source-correction cycle was consumed.
It also repeated contradictory arithmetic from the previous reviewer. This was
not a network failure. Original paid output remains in the same session.

v54 separates independent literal qualification from the old reviewer's reasons.
The host supplies exact, general per-affinity/per-actor marker sums and Rules
starting-plus-purchased-card slot arithmetic, not tactical scores/preferences.
For this army, Elite capacity6/usage6 and Hero capacity1/usage1 are computed from
the audited cards and unit compositions; player2 own markers2+4 sum to2VP.
Conditional control assumptions remain explicit and do not prove actual scoring.

The consumer now gives typed schema/quote/index feedback to the model, at most
three attempts within one qualification. Only completed results are used;
ambiguous transport is not automatically resent. Invalid candidates and receipts
remain recorded, no High is manually dismissed, and exhausted feedback is saved
with precise failed fields. This is generic field recovery, not a manual edit of
B's paid Plan or a new full army generation.

Concrete regression: `scripts/verify-ticket-27-slice-272-review-binding-recovery-v1.mjs`.
Two initial script invocations failed at import resolution (fixture paths), not
product assertions. The previously loaded v53 module reproduced the actual
paid self-counterquote rejection once. After correcting those script paths,
the sole valid green74340 passed: bounded feedback, exact binding, de-anchored
input, calculated source arithmetic, unchanged raw findings/draft. It used
local outputs, zero real Provider calls, and does not certify model truth.
`review-binding-recovery-green-v54.private.json` is the scoped receipt; passed
older v53 routing and v52 payment gates were not rerun.

Host59412 was closed only after all dispatches completed. OfflineHost74949 is
loading the same workspace/noRoomLaunch. Live A/C remain on their original
Hosts46720/46722; by07:37Z A92/C108 R2Assault. A cumulative estimate¥304.98 has
crossed the¥300 notification threshold; C¥336.20. Costs/counters are not reset.
Actual v54 B production and post-review model reacceptance remain pending.

## Actual v54 semantic mismatch and v55 assessment contract

Actual qualification v54 bound successfully, but its reasons called claims23,
29 and82 correct while returning `keep_high`. Those labels wrongly entered the
existing corrective model lane. The model then changed the correct2VP pair to
1VP; the real source reviewer caught this, and no product/battle admission occurred.
Current paid Plan v4 is `71ce2bf4ac99754db8bd25e6defa4118c14d270a7f87d3b56cd3cb2f000de687`;
source review completed with7rawHigh, and the one supplemental cycle stopped
nonconvergent. All53 dispatches completed; old Plan/replies/costs remain.
This is an observable protocol failure, not a manual strategy mistake to hide.

v55 removes model-owned severity from qualification. It asks for factual support
only: source_supported, source_contradicted, source_attribution_unsubstantiated,
or conditional_or_uncertain. The host maps contradicted/unsubstantiated to High
and supported/conditional to tracked Medium, requiring exact bound context for
the latter. Unsupported asserted receipt attribution is explicitly distinct from
a conditional forecast. There is no particular-finding exception or tactical
preference. A changed qualification policy re-examines all rawHigh once, keeps
old qualifications in lineage, and does not treat the wrong old labels as a
current clean gate. Schema/quote/index feedback remains bounded to3attempts;
raw Critical cannot be demoted. No failed review/cost counter is cleared.

Concrete regression `scripts/verify-ticket-27-slice-272-review-assessment-severity-v1.mjs`:
RED84757 reproduced old completed qualification skipping the new factual contract;
sole GREEN86466 passed factual-field mapping, old qualification supersession,
genuine unsubstantiated attribution staying High, and immutable raw findings.
Local fixtures/zero Provider calls certify consumer wiring only, not strategy or
real source judgments. Older v54/v53/v52 green branches were not rerun.

OfflineHost74949 closed after all dispatches completed. Host87705 v55 is loading
the same workspace without RoomLaunch; the next real correction remains pending.
By07:49Z original A98/C113, round2 Assault, background recovery still active.

## v56: automatic reason/field agreement and normal Generate entry

Actual v55 still supplied one contradictory judgment: finding21 was marked
source_supported, while its publicReason explicitly said the literal aggregate
disagreed with source. v56 adds an independent, bounded consistency role BEFORE
any judgment is consumed. It compares the assessment to that judgment's public
reason, returns typed field conflicts, and sends them back to the original model
for correction. It does not edit the Plan or silently replace judgments. Exact
binding and consistency both must pass, within the same3qualification attempts.
Both roles' paid replies can resume with context-bound retained replay; unknown
dispatch is still not permission for an automatic duplicate send.

Concrete actual-candidate regression93089RED → sole GREEN99282. The local fixture
demonstrates one contradictory candidate, typed feedback, corrected candidate,
and consistent confirmation, with no incorrect judgment consumed. This is
zero-Provider wiring evidence, not a real-model truth certificate. Prior green
branches were not rerun.

The ordinary Web Generate journey previously called direct prose correction
without the shared qualification. A separate RED14280 reproduced that bypass;
only the new journey branch GREEN15893 ran after the fix. The workspace exports
the same qualification port used by repair-reviewed; normal Generate now calls
it before any alleged High becomes corrective instructions. Critical and the
persisted3source-review limit remain. No new HTTP route or tactical preference.

### Network stops and actual state

A/C's v52 original-room run stopped07:55Z after A's provider_response_stream_failed,
not another payment/Rules defect. A100/C114 closed07:56Z. B Planv5 is
`2fc55e06923629e794131729b6f5679563a5814825ea5e2fb7c7e3060efe43ed`.
Its source-review shard4 had ambiguous transport/unknown fee. The original three
completed shard replies were retained; one bounded retry of that exact failed
request resumed the same review and proceeded to shard12. Shard12 then suffered
another ambiguous transport at08:14:57Z. Do not claim a completed review or v56
production qualification. Paid aggregate at that stop:66calls/4,147,368units,
plus unknown-cost attempts; the old ledger has not been reset.

v56 same-room network recovery used Hosts9479/9481, drivers10858/10859,
monitor10860/common-v56-acr1. C applied revision115, then provider_transport_failed
caused common stop08:17Z, closed08:20:11Z. A remains100; C115; both round2Assault.
Room estimates plus preserved offsets were A¥314.52/C¥344.55 at last observation.
HEAD reachability only proves that the endpoint responds, not that long model
streams are stable. Unknown fees/results stay unknown; no Rules/turn/army/Plan
or historical retry counter was cleared.

OfflineHost5221 closed without a new Provider send; Host19153 v56r2 is loading the
same B workspace with the standard-Generate seam fix. B source-review shard12
is the unfinished recovery point. No B/D room, final source approval or current
Plan acceptance. The long goal remains unfinished;0/12 valid complete games.

## Final actual stop: source correctness remains a blocker

The bounded development continuation23462 successfully resumed only the failed
shard12; source review completed and automatically entered the existing repair
API. Actual qualification and its consistency role both returned. The latter
found no assessment/reason conflicts, but qualification still asserted that two
player2 markers worth1VP each sum to1VP instead of2VP. Its structured arithmetic
context actually contained the correct total2. It also treated a conditional
Goliath centre-coverage strategy as established impossible coverage using entry-
edge distances, not the hypothetical centre position. Agreement of two erroneous
fields is not factual truth. Do not certify v56 as reliable source qualification.

Before the final observation, that wrong qualification had already entered the
automatic corrective lane, producing paid Planv6
`4a2f0c16d4e26c9dc295e958ea2e8477d30c9bb5e60da2d65594e08decb47a41`.
Its changed-claim review was in flight. OfflineHost19153 received SIGTERM and
exited0; only the exact owned continuation23462 was also stopped. No B/D room
launched, no Plan accepted, no old paid Plan manually reverted or rewritten.
The last persisted review/dispatch may still say running/sending after shutdown;
it is INTERRUPTED/UNKNOWN, not live or completed. Preserve it for reconciliation.
Paid totals at sealing:71calls,4,082,566input +275,415output =4,357,981units,
plus unknown-cost attempts. Original A/C stay closed at100/115.

The local feedback and standard-entry gates passed; actual semantic reliability
did not converge. Under the user's3-round convergence rule, no additional same-
kind audit/correction was launched. The goal remains unfinished, not complete.

### Next concrete deliverables (no blind retry)

1. A shared typed fact-claim contract for computed scoring/slots and cited
   geometry premises: model names source fact/claim values, host compares to
   Rules/calculator receipts, and a contradictory natural-language audit cannot
   become corrective instructions. Unknown geometry stays an explicit conditional
   hypothesis, not a proof of impossibility.
2. The same deterministic premise binding in normal Generate, source qualification,
   correction and admission; preserve these paid candidates, no manual2VP edits.
3. Resume this exact B from retained source output only after that contract's
   concrete RED/one focused GREEN; verify real correction and current-Plan feedback.
4. Restore original A/C only with their preserved network-attempt ledger and
   original room checkpoints; no new armies/room reset/old-green reruns.

## Changed-file summary for this recovery chain

- Online conversion: exact model payment transport/common schema, saved reply reuse.
- Offline review: complete claim index, de-anchored source arithmetic, factual
  assessment mapping, exact-reference feedback and reason/field agreement.
- Workspace/automatic repair/normal journey: same qualification seam, bounded
  history-preserving correction, retained replies and precise stopped fields.
- Current-Plan Teach/product admission (v51): model reconsiders the final reviewed
  version and may reopen army/Plan through Builder; old acceptance cannot admit it.
- Concrete regression scripts and these task/handoff records. No unrelated gates,
  commits, data refresh, cleanup or new agents.

## Scope / order

User priority: A/C automatic engineering recovery first, then B. A/C runs now
continue in the background; B remains isolated offline. No Rules, scoring,
geometry, roster identity or tactical preference changed by these fixes.
No data refresh, agents/K3, installs, deletions, broad tests, old-green reruns,
commits or pushes. Ticket23 33/36, Ticket27 5/6; four main slices remain
(248,272,249,250), valid completed experiments0/12. Map scope20 unchanged.

## Superseding state: v57/v58 recovery and v59 whole-scheme diagnosis

The earlier final-v56 stop is historical. B Planv6 source review resumed from its
retained paid dispatch and all12shards completed. v57 typed arithmetic/premise
binding and shared network-resume wiring passed focused local gates; v58 added
same-receipt exact alias recovery and actual-VP-literal binding (RED95740,
soleGREEN97927, local doubles only). Three real qualification attempts plus one
authorized post-fix supplement still did not converge: judge source_supported
on wrongpair1 despite actualtotal2. LatestB86calls/5,555,265units+unknowncosts,
Plan4a2f0c...47a41 remains unadmitted. No model request during v59 research.

A/C resumed their originalv56 rooms, then A player2 provider_http_rejected High
at09:50:15Z caused commonstop, closed09:51:23Z. Owned hosts/drivers/monitor exited;
the running monitor snapshot is stale. A sealedr129 R3Movement; C sealedjournal
r144 R2Combat, driveractions143 because page closed during refresh. Do not replay
that accepted action. Costs incl preserved offsets A342.168784/C366.513224.
A R2 authoritative score0/2 is known; full control/path/replanning audit and C R2
score remain pending. D deferred until B. HTTP rejection status/body not yet
diagnosed; do not invent Rules cause or blindly repeat a potentially paid request.

Read [v59 actual evidence, industrial comparison and four deliverables](ticket-27-slice-272-b-recovery-industrial-design-v59-2026-10-13.md).
Recommended protocol/state-machine changes are NOT implemented. No additional
same-kind audit, fresh room/army, manual Plan change, budget/history reset,
agents, install, delete, data refresh, commit or full-suite/passed-gate rerun.
