# Ticket 23 / Slice 248 alternating-activation repair v1

Date: 2026-09-21
Status: focused repairs passed; fresh Standard-2000 A-A acceptance is durable at revision 34

## Defect

The historical live run at
`build/ticket-23-slice-248-standard-2000-aa-live-v1/20260916223306152`
allowed Player 1 to deploy Goliath and then expose `Armed and Ready` deployment
domains for five other units while Goliath still owned the activation window.
Finishing an activation also ignored the opponent's live reserves when selecting
the next active side. The resulting revision-46 branch is retained as defect and
cost evidence only and is not training truth.

## Repair

- Added one shared phase-activation availability rule. A live, unactivated
  reserve counts during Movement, while passed sides and destroyed units do not.
- Made ability and relocation activation settlement use that shared rule.
- Made activation-pass classification use the same rule.
- Locked reserve/special deployment domains to the unit that owns a
  `before_action` window; an `after_action` window cannot leak another unit's
  deployment action.

Rules and Authority remain the mutation source. No Prompt, Skill, Provider,
memory, UI or source-data contract changed.

## Focused evidence

The bug-specific verifier replays the immutable invalid branch through revision
3, immediately after Goliath deploys. Before the repair it failed with five
cross-unit `Armed and Ready` domains: three Marines, Jim Raynor and Medic.

After the repair, the same verifier passed once:

```text
schema: ticket23_slice248_alternating_activation_repair_v1
replayedRevision: 3
activationWindowPieceId: player1-goliath-1
legalPieceIds: [player1-goliath-1]
nextActiveSideKey: player2
providerCalls: 0
```

Command:

```sh
node scripts/verify-ticket-23-slice-248-alternating-activation-repair-v1.mjs \
  --run-directory=build/ticket-23-slice-248-standard-2000-aa-live-v1/20260916223306152
```

No unrelated passed gate or full suite was rerun.

## Harness evolution disposition

- Base context: historical Standard-2000 revision-3 state and its exact
  Authority receipts.
- Experimental change: shared next-side availability plus activation-window
  lock, with no model or policy change.
- Regression result: historical cross-unit action leak is rejected and the
  opponent reserve side receives the next activation.
- Cost: zero Provider calls; no reported token or currency use.
- Promotion: code repair is eligible for integration, but no replay or Skill is
  promoted. A new room must start at revision 0 for formal A-A acceptance.
- Rollback trigger: any focused canary that exposes a non-window unit or fails
  to hand control to a side with a legal reserve activation.

## Fresh-room canary

The product canary started a new room at revision 0 and passed once with this
exact six-action sequence:

1. start the round;
2. choose Player 1 as first actor;
3. Player 1 deploys Goliath and opens only Goliath's window;
4. Goliath finishes and Authority hands control to Player 2;
5. Player 2 deploys Kerrigan and opens only Kerrigan's window;
6. Kerrigan finishes and Authority hands control back to Player 1.

Evidence:
`build/ticket-23-slice-248-zero-provider-alternation-canary-v1/report.json`.
Provider calls and estimated cost were both zero; source data was not refreshed.

## Phase-completion follow-up

The resumed paid match reached revision 18 and exposed a High implementation
regression before any further Provider call: the shared-availability refactor
had removed two local helpers that `completePhase()` still uses to mark
unactivated on-table units. The immutable failure was
`ReferenceError: activeOnTablePiece is not defined`; after three identical
preview failures the harness correctly blocked instead of retrying forever.

`verify-ticket-23-slice-248-phase-pass-completion-repair-v1.mjs` reproduced the
same error before the repair. The local marking helpers were restored without
changing the shared next-side rule. The same focused verifier then passed once:
Movement advanced to Assault, Player 1 became active, and Provider calls were
zero. The paid room resumed from revision 18. Its zero-call phase pass applied
at revision 19 and the match advanced into Assault without replaying a paid
decision.

## Charge timing and reachability follow-up

The same fresh match then reached revision 31 and exposed a High agent/runtime
interaction defect. At revision 27 the Planner carried stale casualty-role text
into a current Raptor Charge candidate even though an exact relationship receipt
showed the nearest target base edge at 21,164 milli-inches and the current
maximum Charge move was 11,000 milli-inches. Authority legally resolved the
declared Charge as `distance_shortfall`. The next LegalSpace incorrectly still
offered Metabolic Boost after the Charge roll and resolution, so the agent paid
one Ready BM card for charge-roll advantage and then immediately finished the
activation without another roll.

The repair keeps legality and strategy separate:

- the characteristic/status adapter now exposes `charge_roll_advantage` only in
  `before_action`, matching “when determining Charge Distance”; other active
  effects retain their existing before/after timing unless separately scoped;
- the live Planner must obtain exact physical base-edge relationships covering
  every eligible target before recommending Charge;
- a Host semantic guard rejects Charge when every eligible target has a proven
  distance shortfall at the maximum current roll, even if model prose or plan
  memory drifts; the correction remains inside the same decision and may select
  Pass, a useful pre-Charge ability, or another current Unit.

The one focused regression passed once with Provider calls zero. It proves
Metabolic Boost timing `[before_action]` and reproduces the real geometry:
nearest target 21,164, minimum move to engagement 20,164, maximum Charge move
11,000 milli-inches, `certainDistanceShortfall=true`.

Command:

```sh
node scripts/verify-ticket-23-slice-248-charge-timing-and-reachability-repair-v1.mjs
```

The durable match is paused at revision 31. Through that boundary it used about
131 Provider calls and an estimated CNY 9.77; no CNY 100 notification threshold
was crossed. This branch remains acceptance evidence but not training truth
until the repaired continuation reaches a valid terminal state.

## Formation threat-claim convergence follow-up

The repaired Planner resumed the same room and correctly rejected every
certainly unreachable Zerg Charge before selecting a useful Swarmling Run.
Authority reached revision 33 after Player 1's Goliath Run and activation end.
At the pending Player 2 action, the Host exposed four complete formations and
the model selected option `89be9dbd...`.

The first action response incorrectly claimed that all own units would remain
outside current Terran fire bands. Later responses corrected every realized
outcome field and explicitly stated that both Goliaths retained stationary
coverage. The old validator nevertheless rejected six paid responses because:

- it searched the whole intent, including aspirational goals, predictions and
  rejected alternatives rather than only realized-result claims;
- its regular expression treated “not outside the enemy fire envelope” as the
  opposite assertion because it matched the word `outside` without negation;
- an explicit retry reset the per-cycle counter, allowing the same decision to
  exceed the three-round convergence policy.

The repair now checks sentence-level realized claims only: selected reason,
position value, risk, expected outcome/effects/risks, outcome calculations,
formation reason and public speech. It excludes goals, plan continuity,
opponent predictions, fallbacks and rejected alternatives. Explicit denial of
an escape claim is preserved, and an exact move-then-fire band is not confused
with current stationary weapon coverage. Action normalization advanced to v13,
so the durable corrected paid response is eligible for local revalidation.
Semantic correction is capped at three total rounds per choice and cannot be
reopened by restarting or approving another retry.

The bug-specific gate passed once with zero Provider calls and zero cost:

```sh
node scripts/verify-ticket-23-slice-248-formation-threat-claim-scope-v1.mjs
```

It proves that aspirational text alone passes, a false realized no-threat
outcome blocks, and the actual corrected “not outside” plus move-then-fire-band
wording passes. Before this code repair the room's durable Provider ledger was
152 calls, 8,453,858 total units and estimated CNY 11.497316. The pending
action-34 decision accounts for 10 calls; its actual match-ledger increment was
CNY 1.068767. No CNY 100 notification threshold was crossed.

The same durable room then resumed from revision 33. Action normalization v13
locally revalidated the final already-paid corrected response, applied the
18-model Swarmling Run with formation option `89be9dbd...`, and produced
`screenshots/0039-r034-player2-run-applied.png`. Room state advanced to revision
34 with Replay equality. Provider calls remained exactly 152, total units
remained 8,453,858 and estimated cost remained CNY 11.497316; no duplicate
Provider request or charge occurred.

## Selected-action identity follow-up

The same room advanced through round-2 reserve deployment and two distinct
battlefield-asset card actions. Revision 62 used Creep Spread, exhausted
`player2-tactical-2`, and placed a Creep Tumor. Revision 63 legally used Ventral
Sacs, exhausted `player2-tactical-4`, and placed a reserve-deploy beacon. Room
Authority and Replay were correct, but the revision-63 model-authored public
summary still described Creep Spread and a second Creep Tumor. The defect was
therefore evidence semantics, not duplicate Rules execution.

The repair makes the selected identity a Host-owned structure containing the
candidate, action type, piece, ability, effect and source instance. Both Planner
and Action validators now require central plan/action prose to acknowledge the
selected ability and reject positive execution wording for another current
ability. Explicit rejection or comparison of another ability remains legal.
Prompt policy advanced to v12, Planner local normalization to v6 and Action
local normalization to v15.

The concrete Ventral-Sacs/Creep-Spread reproducer failed before implementation
because the identity inspector did not exist, then passed once after the repair:

```sh
node scripts/verify-ticket-23-slice-248-selected-action-identity-v1.mjs
```

It reports three contradictions for the drifted sample, accepts the corrected
Ventral Sacs explanation and accepts an explicit Creep Spread rejection. It
uses zero Provider calls and costs ¥0. The old revision-63 explanation remains
immutable defect evidence and is not training truth; the valid Authority state
continues from revision 63.

## Selected-action resource follow-up

Revision 64 then legally applied Vile's Glial Reconstitution. Authority paid
the exact effective cost of 1 BM and exhausted `faction:player2`, but the old
Planner and Action prose repeatedly called it a zero-Biomass action. The
compact Planning action index had exposed Supply but omitted the existing exact
`resourceCostsByChoice`; Action validation also had no contradiction check for
free/zero-resource claims.

Prompt policy v13, Planner normalization v7 and Action normalization v16 now
carry a Host-owned selected-action resource contract containing every choice's
printed cost, reduction and effective BM/CP/PE cost, plus source-card exhaustion
semantics. Both stages reject a zero/free/unspent statement for a positive
effective resource cost. Supply remains a separate contract, so a correct
zero-Supply statement is accepted.

The r64 reproducer failed before implementation and passed exactly once after
the repair:

```sh
node scripts/verify-ticket-23-slice-248-selected-action-resource-claims-v1.mjs
```

It found four false-free Biomass claims, accepted the corrected 1-BM wording,
accepted zero additional Supply, and used zero Provider calls / ¥0. Revision 64
Authority state remains valid; its drifted old explanation is non-training
defect evidence.

## Cross-family resource-contract follow-up

The same room advanced to revision 66 and legally resolved Roachling
Infestation. Authority spent 2 BM and summoned three Roachlings, but the old
Agent prose claimed that the selected action spent zero Biomass. This exposed a
deeper mismatch than the earlier selected-action validator: unit-lifecycle and
several other paying Adapters computed the exact effective cost only inside
payment enumeration and Apply, so Planner could not see the Rules-owned value.

The repair makes every currently paying action family publish the same
per-choice `printedCost`, `reduction` and `effectiveCost` contract consumed by
Apply. It covers battlefield assets, unit lifecycle, characteristic/status,
Reaction, selected-roster active abilities and Zerg-unique abilities. Planner
and Action validation use one normalized reader; historical flat cost fields
remain input compatibility only and cannot replace the canonical contract.

The focused r66 reproducer first failed on the missing lifecycle LegalSpace
contract, then passed exactly once after implementation:

```sh
node scripts/verify-ticket-23-slice-248-cross-family-resource-contract-v1.mjs
```

It proved the 2 BM printed/effective cost, zero reduction, Planner visibility
and four contradictions in the false-zero explanation. It made zero Provider
calls and cost ¥0. No unrelated gate or full suite was rerun.

## Next gate

Resume the same fresh paid Standard-2000 A-A match from revision 66. Continue
to terminal before rebuilding screenshots, NDJSON, JSON and PDF evidence from
this room. Preserve the historical r63/r64/r66 prose as non-training defect
evidence; never repay those already recorded decisions merely to improve prose.
