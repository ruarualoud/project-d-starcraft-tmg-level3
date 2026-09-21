# Ticket 23 / Slice 248 — cross-phase activation prediction repair

## Concrete failure

Fixed-roster branch `20260921224418000` safely replayed through revision 8 and
used the threat-aware asset-placement contract at revision 9. It selected an
Omega Worm at `(47250,1600)` milli-inches under the
`lowest_projected_incoming_fire` facet:

- `34.000"` full-base distance from the Goliath;
- zero current stationary printed-range profiles;
- zero projected move-then-fire profiles;
- `11.650"` centre distance to `mission-marker-2`;
- Rules Apply and Replay parity passed.

The position and its comparison against riskier objective-near alternatives
are valid. The final opponent hypothesis is not: it used raw action class
`hold` and said that the Goliath's completed Movement activation prevented that
Unit from taking Run, Charge, Ranged Attack or Fight actions for the rest of the
round. StarCraft TMG activation is phase-scoped. A Movement activation does not
consume the Unit's later Assault or Combat activation.

Therefore revision 9 remains Authority-valid position evidence but its plan and
opponent-model prose are excluded from strategy memory and training.

## Repair

- Predicted action classes are canonicalized before lifecycle inspection and
  before persistence (`hold` becomes `hold_position`; other unambiguous aliases
  share the same typed vocabulary).
- The lifecycle validator rejects a public prediction that cites completed
  Movement activation as the reason a Unit cannot act in Assault or Combat.
- The prompt now states that `activatedPhases` is independent per phase and
  checks the predicted action against its own phase only.

The existing asset-placement focused verifier contains the exact Goliath shape.
It failed before the production repair with
`CROSS_PHASE_ACTIVATION_LOCKOUT_NOT_REJECTED`; after the change it was run once
and passed with `crossPhasePredictionRejected=true`, zero Provider calls and
zero paid tokens. No unrelated gate or full suite was run.

## Continuation rule

Do not resume `20260921224418000`. Fork the same safe revision-8 boundary and
regenerate revision 9. Accept the next branch only if both the chosen Omega
position and the persisted opponent prediction are strategy-valid. The
subsequent singleton `finish_activation` remains a deterministic Host action
and must not incur a Provider call.

## Accounting

The superseded revision-9 generation used 7 calls, 360,536 reported units and
`¥0.502328`. Recent recovery work is now 70 calls, 3,278,297 units and
`¥4.519137`; including the original invalid-suffix source, 99 calls, 4,625,091
units and `¥6.371858`. No `¥100` notification boundary was crossed.
