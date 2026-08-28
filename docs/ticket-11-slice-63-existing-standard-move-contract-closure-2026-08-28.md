# Ticket 11 Slice 63 — Existing Standard Move Contract Closure

Started: 2026-08-28

Frozen: 2026-08-28

## Outcome

Slice 63 closes the current Standard Move state contract over ten already executable RuleAtoms. It adds no atom and does not promote Charge. The executable denominator remains `421`; only the ten target atom versions, evidence and current executor binding change.

Dependency/impact ordering selected Standard Move before Disengage and Stimpack Move. It owns the base Movement path/placement semantics consumed by those later compositions, and all ten of its current atoms were `partial`. Closing it makes all ten strict without claiming any downstream executor complete.

## Public RED and frozen history

The public RED constructed a real Start-of-Round v2 resolution and Movement Phase Initiative v1 handoff, then changed the recorded Marker holder. Frozen `authority.standard-move-v1@1.0.0` still exposed a legal domain. It also accepted a forged Start Supply hash.

Strict-freeze policy keeps that source byte-exact:

- frozen v1 source SHA-256: `e7c349f74524883e8205502d3afbe586737c0c938ce644fd3113916f86dfe56f`
- current v2 source SHA-256: `ecddd4e4cef74bf35a495cfe1a96ac8b6231126b6bd1b28bf23ee5b60b686155`

Current rooms use `authority.standard-move-v2@2.0.0`. Frozen v1 remains available only through its exact old catalogue/runtime/rules-display binding. v2 invokes its geometry/transition semantics through an explicit, versioned adapter and reports `silentCompatibilityUsed=false`; there is no current-room fallback.

## Current state contract

Before exposing an exact domain, v2 verifies:

1. the exact current Start-of-Round v2 history entry, action, resolution, event and log;
2. the exact Movement Phase Initiative v1 choice, action, event and log;
3. a hash-contiguous `RoundSupplyState` lineage from Start through every supported current Supply mutation;
4. current official gameplay/source/mission bindings and runtime MatchBinding;
5. active seat, phase, pass state, activation state, engagement state and live Unit/model denominator;
6. GAUNTLET board, Marine source identity, 32mm round-base geometry and bounded no-terrain subset;
7. exact path, collision, battlefield, enemy Engagement, placement and Coherency constraints.

Unit scale is explicit state-contract material. The current official Marine record is `Speed 4/7`: multiple live models receive a 4-inch path cap, one live model receives a 7-inch cap. The domain lists every model ID and starting point and fixes `exactRemainingPlacementCount = modelCount - 1`. Move length therefore depends on current Unit size and cannot be supplied by the client.

Apply re-enumerates and exact-matches the complete v2 action, moves all models, removes Stationary, marks Movement activated, preserves Supply, writes the expert-readable event/log, and lets the runtime settle alternating activation. Board, sources, setup, scores, cards and round/initiative history are protected.

## Coverage movement

The fixed denominators remain:

- executable RuleAtoms: `421`
- review-required actionable RuleAtoms: `491`
- display-only RuleAtoms: `114`
- executors: `42`

Coverage moves as follows:

- declared executor contracts: `26 → 27`
- missing executor contracts: `16 → 15`
- strict-complete atoms: `216 → 226`
- partial atoms: `67 → 57`
- no-contract atoms: `138 → 138`
- existing non-strict atoms: `205 → 195`

No non-target atom changed and no new atom entered the executable set.

## Relationship graph and frozen identities

The relationship extension declares reads, writable fields, protected fields, invalidations, source/handoff/Supply/unit-scale/geometry projections, exact domain/action derivation, Judge evidence and v1→v2 version ancestry. Removing the Start handoff edge makes the scope invalid.

Frozen identities:

- slice: `0ec04b98321c58eaac23bca4b2383090d666e450876cc4e8b2d9cd61408bddea`
- previous slice: `95d7d170e04ea331949f75dc50709c3e7e4da42a166f71a6096794299967f378`
- catalogue: `c437d7ef4f9776cbea688f9a082d7d64110d817b763c0092fcdcb25114ed9733`
- runtime: `9df3c61f7b271067ad41b8dabdb228c98341e23fe999c17052eb974d06d61a33`
- relationship graph: `8c9585d590ca7ea2f98b5734604b1a2c725ba6c37a05535a44417dd04141973b`
- graph size: `6,414` nodes / `22,469` edges
- action schema: `hybrid_legal_space_v21`

## Verification

- public v2 contract and frozen-v1 RED: `4/4`
- public relationship contract: `6/6`
- source, Authority, exact move, protected state, role boundary, lineage, signing, replay, tamper and historical isolation: `13/13`
- cumulative runtime: `10/10`
- Ticket 11 aggregate: `9/9`
- evidence denominator: `125` base reports / `1,311` base assertions; including aggregate, `126` reports / `1,320` assertions
- live official Core, Terran P2P, Marine, GAUNTLET image/record and Firestore versions `71/69/48`: passed
- repository fallback: `false`
- Ed25519 accepted receipts replay after HMAC seal rotation; event tampering rejects as `SIGNATURE_INVALID`

Primary report:

`build/ticket-11-rule-atoms-v1/official-existing-standard-move-contract-closure-v1-report.json`

## Boundaries and next dependency

No Skill was generated or promoted, DSH was not run, and no MuZero, self-play, memory or training candidate was written. `rulesEligible`, `productionRoomEligible` and `trainingTruth` remain false.

Slice 64 must be selected from the fifteen remaining executor-contract debts by dependency and graph impact, then pass its own public RED, current state contract, relationship, Judge, Authority, replay, official-source and historical-isolation gates. Disengage is the next Movement-base candidate, but its exact scope and atom movement remain planning-only until the audit freezes them.

Charge and new RuleAtoms remain frozen until all `42/42` executor contracts and all `421/421` existing executable atoms are strict.
