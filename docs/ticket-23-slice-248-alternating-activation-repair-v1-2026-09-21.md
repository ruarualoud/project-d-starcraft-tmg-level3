# Ticket 23 / Slice 248 alternating-activation repair v1

Date: 2026-09-21
Status: focused repair passed; fresh Standard-2000 A-A acceptance not yet run

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

## Next gate

Run a zero-Provider product canary from revision 0 across both sides' first
deployments. If it passes, start the fresh paid Standard-2000 A-A match and
rebuild screenshots, NDJSON, JSON and PDF evidence from that new room only.
