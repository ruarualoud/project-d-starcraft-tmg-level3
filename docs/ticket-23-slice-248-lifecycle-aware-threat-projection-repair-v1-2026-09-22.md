# Ticket 23 / Slice 248 — Lifecycle-aware threat projection repair

Date: 2026-09-22

## Reproducer

The Standard-2000 A-A recovery branch `20260922003116755` remained at the
safe revision 8 after six paid decision calls. The Action selected a legal
Omega Network placement at `(47250,1600)` and correctly stated that the
Goliath was about 24.234 inches away, had already completed its Movement
activation, and could not close distance during the current round.

The Host rejected that statement as
`ACTION_SELECTION_THREAT_CLAIM_CONTRADICTS_PROJECTION`. The Rules action
catalogue was correct: Movement contains Move/Deploy/Disengage/Hold, while a
Ranged Attack is a separate Assault action and contains no movement. The bug
was in the advisory relationship graph and semantic validator: a geometric
`Speed + weapon range` band was promoted to a current-round legal threat even
after the Movement opportunity was closed.

## Repair

- The relationship graph now publishes independent lifecycle gates for Move,
  Ranged Attack, melee Fight and typed damage abilities.
- Ranged Attack and Fight explicitly do not include movement. A current-round
  move-then-attack projection exists only when both Movement and the weapon's
  own phase remain available and neither the Unit nor side has closed them.
- Existing broad geometric weapon bands remain available for UI overlays and
  future-round planning. New current-round subsets and earliest-horizon fields
  prevent them from becoming current legal actions.
- Formation and asset-placement projections now expose both current-round and
  broader planning counts. Current-position ranged probability projections
  label each estimate `current_round` or `next_round`.
- The semantic claim gate consumes only the current-round subsets. Legacy
  receipts without lifecycle fields preserve their former fail-closed
  behaviour.
- Damage abilities are a separate typed channel. Immediate damage and delayed
  Token/end-of-round damage are supported by the contract, but remain unknown
  until an exact ability effect contract supplies timing, area and target
  information; unknown is never silently converted to safety.

## Focused verification

Only the existing directly affected gate was run, once, after the final code
change:

```text
node scripts/verify-ticket-23-slice-248-formation-threat-claim-scope-v1.mjs
passed: true
```

It proves that a Goliath with Movement already activated has
`canMove=false`, `canRangedAttack=true`, `canMeleeAttack=true`, and
`rangedAttack.includesMovement=false`; its future geometric movement band no
longer contradicts the correct statement that it cannot close this round.
Movement Pass receives the same treatment. The pre-existing false-safety and
High-severity fail-closed checks remain green.

No Provider call, source refresh or Room mutation occurred during the repair.

## Cost and continuation

The failed live reproducer added `6` calls / `277,302` reported usage units /
`¥0.394044`. The recent recovery ledger is therefore `82` calls /
`3,872,403` units / `¥5.361774`; including the original invalid-suffix source
it is `111` calls / `5,219,197` units / `¥7.214495`. No `¥100` notification
threshold was crossed.

The next live step is a fresh one-action fork through authoritative revision 8.
The failed branch is evidence only and is not resumed or promoted to training
truth.

## Harness loop record

- `harnessLoopUsed`: true
- `targetGames`: `starcraft-tmg`
- `promptPackRoutes`: live Planner/Action prompt lifecycle threat instructions
- `harnessToolsCalled`: tactical relationship query, formation/asset projection,
  semantic Action claim gate
- `uiTraceEvidence`: existing r8 browser evidence retained; no UI mutation in
  this repair
- `agentDecisionEvidence`: failed Action correctly distinguished current and
  next-round Goliath reach
- `memoryTraceEvidence`: failed suffix remains non-training diagnostic evidence
- `trainingTraceCandidates`: none from the failed suffix
- `rollbackOrDemotionRules`: resume only from safe r8; Critical/High semantic
  contradiction blocks Apply
- `userVisibleChecks`: current/future threat bands and independent Move/Ranged/
  melee/damage-ability gates
