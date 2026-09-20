# Ticket 23 / Slice 248 alternating-activation repair v1

Date: 2026-09-21
Status: focused repairs passed; fresh Standard-2000 A-A acceptance is durable at revision 31

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

## Next gate

Resume the same fresh paid Standard-2000 A-A match from revision 31, prove the
next off-band Unit does not repeat the failed-Charge/resource-waste pattern, and
continue to terminal before rebuilding screenshots, NDJSON, JSON and PDF
evidence from this room only.
