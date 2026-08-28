# Ticket 11 Slice 51 — Existing Activation Pass Contract Closure

Started: 2026-08-28

Frozen: 2026-08-28

## Outcome

Slice 51 continues the corrected existing-atom closure order. It adds no
RuleAtom and changes no frozen executor, catalogue, runtime, or action schema.
It gives the existing `authority.activation-pass-v1@1.0.0` executor a complete
relationship/state/Judge contract, making ten of the existing 421 executable
atoms strict-complete.

The frozen denominator remains:

- executable RuleAtoms: `421`
- review-required actionable RuleAtoms: `491`
- display-only RuleAtoms: `114`
- executors: `42`

Strict state-contract coverage changes as follows:

- declared executor contracts: `10 → 11`
- missing executor contracts: `32 → 31`
- strict-complete atoms: `79 → 89`
- partial atoms: `106 → 106`
- no-contract atoms: `236 → 226`

The slice number is a historical batch number. It is not a new-atom number:
the executable atom denominator stays at 421 throughout this slice.

## Closed contract

The contract records the executor's reads of phase, active seat, player pass
records, pieces and activation markers, first-passer record, and First Player
Marker. It also records the outer Authority gate requiring a fresh
round-and-phase first-actor choice before Pass appears.

Activation availability only classifies Pass:

- an available activation produces `optional` Pass;
- no available activation produces `mandatory` Pass;
- both classifications expose the same legal Pass action.

Availability is therefore forbidden from becoming a Pass gate. Phase, active
seat, player pass state, piece activation state, first-passer state, marker
holder, and phase-first-actor state all invalidate the previous action plan.

On apply, the first passer is recorded and receives the First Player Marker.
The other side becomes active. A second Pass completes remaining activation
markers, advances Movement to Assault (or Assault to Combat), and hands the
next phase to the Marker holder without overwriting that marker. The next
phase again requires a fresh first-actor choice before Pass is visible.

## Relationship and replay evidence

The Slice 51 graph appends to Slice 50. It contains required read, derivation,
classification, gate, invalidation, write, event, Judge, and release-ancestry
edges. Removing either the activation-pass invalidation provenance or Judge
provenance invalidates the declared scope and creates required edge, path, and
evidence gaps.

Two accepted Pass receipts carry Ed25519 long-term signatures and replay after
the HMAC short-term seal rotates. Event tampering is rejected as
`SIGNATURE_INVALID`. Slice 50 and every older rules display remain available;
silent compatibility is forbidden.

Frozen identities:

- slice: `d6e892447b54b2e95f689ba822ec935faff7bc30c1fb8aa87b6092515839a69c`
- previous slice: `3dd146a3d76b8c73a3c8807e709b1526a28bc74074a117dcc863f36442216bff`
- catalogue: `cf0c60b4faa04674727273cadc8fa1fbca158cabce3d85825d0417928abb0d7e`
- runtime: `3a9684030e8020bffbcac80c6238804f673c98b695b49286481662fc5e01749a`
- relationship graph: `61ee3f801f1a01d121d0a4ff8ede6eb5dff9ece964bf530f46282e1aa219d1b4`
- graph size: `5,236` nodes / `20,496` edges

## Verification gates

The focused verifier reads the live official Firestore versions, Marine, Part
8, and Part 12 documents. The accepted versions remain units `71`, cards `69`,
and rules `48`; repository fallback is forbidden and unused.

- Slice 51 focused contract/Judge/Authority/live-source verifier: `8/8`
- cumulative runtime verifier: `10/10`
- Ticket 11 aggregate: `9/9`
- evidence denominator: `113` base reports / `1,162` assertions; including
  aggregate, `114` reports / `1,171` assertions
- complete Ticket 11 foundations: pass with exit `0`
- product `verify:all`: pass with exit `0`

## Remaining order

Thirty-one of 42 executor contracts remain. Charge and all new-atom promotion
work stay paused until the existing executor contract denominator reaches
`42/42`. The next dependency-ordered target is
`authority.movement-hold-v1@1.0.0`; current impact analysis shows it can make
three currently partial existing atoms strict-complete without adding an atom.
The projected coverage is therefore `92 strict / 103 partial / 226 none`, not
a reduction of the no-contract bucket.

This slice generated or promoted no Skill, did not run DSH, and wrote no
memory, self-play, MuZero, or training candidate. `rulesEligible`,
`productionRoomEligible`, and `trainingTruth` remain false.
