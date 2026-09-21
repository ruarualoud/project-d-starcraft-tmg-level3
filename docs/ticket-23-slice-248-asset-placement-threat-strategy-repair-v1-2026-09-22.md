# Ticket 23 / Slice 248 — asset-placement threat strategy repair

## Concrete failure

The fixed-roster branch `20260921214904680` legally applied Omega Network at
revision 9. The following decision queried the resulting relationships and
proved that the Worm's full base was only about `17.946"` from the Goliath and
inside the printed stationary bands of Autocannon and Scatter Missiles. The
accepted r9 public reason had called the placement “far from the Goliath”. It is
therefore Authority-valid but low-strategy/non-training evidence.

Revision 10 was not applied. Its Planner received the relationship receipt but
repeated the false “zero stationary profile against the Worm” claim over three
correction rounds. The High convergence gate stopped the run at legal r9.

## Repair

The legal asset-placement search now scans a bounded strategic candidate pool
instead of returning the first legal points around the preferred anchor. Omega
Worm candidates include:

- complete-base distance to every active enemy Unit;
- printed stationary and move-then-fire profile counts and keys;
- nearest objective distance;
- explicit precision showing that hypothetical line of sight and future action
  availability remain advisory;
- deterministic facets for low-fire, preferred-anchor, objective and
  risk-ordered alternatives.

The Action stage must compare those option fields. A selected option whose
public reason claims safety/out-of-range while its projection has incoming
stationary profiles is rejected before Apply. Generic relationship corrections
now identify the exact own target, enemy attacker, profile keys and base-edge
distance rather than returning only `stationary`.

A second cost/stability defect was closed at the same boundary. When the
current ActionSpace contains exactly one finite action or one parameterized
domain whose required parameters all have a single Rules-owned value (including
empty-parameter `finish_activation`), the Host binds it deterministically with
zero Provider calls. There is no strategic choice for a model to make.

## Focused evidence

The pre-existing legal-asset placement verifier was extended with the concrete
Omega/Goliath shape. It failed before production changes because the new
contracts/exports did not exist. After the implementation and one stale Creep
fixture correction, its final single run passed:

- legacy Creep options: 4;
- Omega options: 6;
- Omega options with zero projected stationary profiles: 4;
- false safe-reason rejection: passed;
- deterministic empty-parameter finish: passed;
- Provider calls: 0.

No unrelated test or full suite was run. The next live step must fork the safe
r8 authority boundary, regenerate the Omega placement using these threat-aware
options, and then prove the following finish action is deterministic.

## Accounting

The failed r10 planning cycle added 4 calls, 166,414 reported units and
`¥0.250923`; it applied no action. Recent recovery work is now 63 calls,
2,917,761 units and `¥4.016809`. Including the original invalid-suffix source,
the total is 92 calls, 4,264,555 units and `¥5.869530`. No `¥100` notification
boundary was crossed.
