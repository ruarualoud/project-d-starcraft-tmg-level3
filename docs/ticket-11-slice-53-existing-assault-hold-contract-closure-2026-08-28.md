# Ticket 11 Slice 53 — Existing Assault Hold Contract Closure

Started: 2026-08-28

Frozen: 2026-08-28

## Outcome

Slice 53 continues the corrected order: finish the existing 421 executable
RuleAtoms before promoting Charge or any new atom. It adds no RuleAtom and
changes no frozen executor, catalogue, runtime, or action schema. It gives the
existing `authority.assault-hold-v2@2.0.0` executor its first complete
relationship/state/Judge contract.

The frozen denominator remains:

- executable RuleAtoms: `421`
- review-required actionable RuleAtoms: `491`
- display-only RuleAtoms: `114`
- executors: `42`

Strict state-contract coverage changes as follows:

- declared executor contracts: `12 → 13`
- missing executor contracts: `30 → 29`
- strict-complete atoms: `92 → 95`
- partial atoms: `103 → 103`
- no-contract atoms: `226 → 223`

The three Assault Hold atoms were single-consumer atoms with no declared state
contract. This slice closes that one consumer for each atom:

- `rule-atom:assault-hold-activation-marker`
- `rule-atom:assault-hold-no-action`
- `rule-atom:assault-phase-hold-action`

The slice number is the historical development-batch ordinal. It is not an
atom number. The RuleAtom denominator therefore remains exactly 421 while
three existing atoms change completion status.

## Closed contract

LegalSpace exposes one exact Assault Hold action for every active-side piece
that is on the battlefield, not destroyed, has live models, has not activated
in Assault, and belongs to a seat that has not Passed. Wrong phase, inactive
seat, passed seat, ineligible piece, or a missing fresh phase-first-actor
choice cannot obtain Hold authority.

If the piece carries a post-Disengage Assault restriction, the v2 executor
validates its schema, declared round, target phase, content hash,
`trainingTruth=false`, tactical-mass value, and the inverse ranged/Charge
prohibition flags. A malformed, tampered, or stale restriction disables Hold
and Apply fails closed. A valid restriction never prohibits Hold: accepted
Hold consumes it, appends a content-bound consumption history entry, and emits
`post_disengage_assault_restriction_consumed`.

Apply also marks only the selected piece's Assault activation. If the opposing
seat remains eligible it receives the next activation. If that seat has
already Passed and this is the acting side's last activation, the composed
runtime completes remaining Assault markers, advances to Combat, gives the
new phase to the First Player Marker holder, and requires a fresh first-actor
choice before exposing Combat actions.

The contract explicitly protects board/terrain, scores, card resources,
piece positions, statuses, damage, and the First Player Marker from Hold or
restriction-consumption writes. The accepted transition may write only its
declared piece activation/restriction history, alternating-seat or phase
handoff, player marker-completion, events, and log state.

## Relationship and replay evidence

The Slice 53 graph appends to Slice 52. It connects piece activation and the
post-Disengage restriction projection to exact action eligibility,
restriction validation, state invalidations, optional consumption, phase
composition, Judge tests, and release ancestry. Removing the Assault Hold
invalidation or Judge provenance invalidates the declared scope and creates
required-edge, required-path, and evidence-test gaps.

An accepted Authority receipt follows LegalSpace → Preview → Confirm → Apply.
Its Ed25519 long-term signature replays after the HMAC short-term seal rotates;
event tampering is rejected as `SIGNATURE_INVALID`. Slice 52 and every older
rules display remain retained, and silent compatibility is forbidden.

Frozen identities:

- slice: `8afa8a3085562d61adda4469ef1e160a363828e6a6f9d9bcb561e4921dc6e404`
- previous slice: `cc1b7bc338f60c59af0c3644f5a2d2dfeea7494c706972871e3d6b15c21d8458`
- catalogue: `cf0c60b4faa04674727273cadc8fa1fbca158cabce3d85825d0417928abb0d7e`
- runtime: `3a9684030e8020bffbcac80c6238804f673c98b695b49286481662fc5e01749a`
- relationship graph: `1cb7fd5e189e751feb0d5a7405244ffdbe5df53a62d717f9266a351d4cfd2a60`
- graph size: `5,281` nodes / `20,617` edges

## Verification gates

The focused verifier reads the live official Firestore versions and all bound
documents inherited from the current official-data receipt. The accepted
versions remain units `71`, cards `69`, and rules `48`; repository fallback is
forbidden and unused.

- Slice 53 focused relationship/contract/Judge/Authority/live-source verifier:
  `9/9`
- cumulative runtime verifier: `10/10`
- Ticket 11 aggregate: `9/9`
- evidence denominator: `115` base reports / `1,179` assertions; including
  aggregate, `116` reports / `1,188` assertions
- complete Ticket 11 foundations: pass with exit `0`
- product `verify:all`: pass with exit `0`

## Remaining order

Twenty-nine of 42 executor contracts remain. This leaves 326 existing atoms
not yet strict-complete: 103 partial and 223 without a declared contract.
Charge and every new-atom promotion remain paused until the existing executor
contract denominator reaches `42/42` and all 421 atoms are strict-complete.

The next dependency-ordered candidate is `authority.combat-pass-v2@2.0.0`.
It consumes 34 existing atoms. The current coverage audit projects four
single-consumer atoms from none to strict, 23 partial atoms to strict, and
seven shared atoms remaining partial. If its actual state/Judge/replay audit
passes without exposing a frozen-executor defect, Slice 54 projects to `122
strict / 80 partial / 219 none`, contracts `14/42`, and 28 missing. This is a
planning projection, not a completed claim; any defect must fail closed.

This slice generated or promoted no Skill, did not run DSH, and wrote no
memory, self-play, MuZero, or training candidate. `rulesEligible`,
`productionRoomEligible`, and `trainingTruth` remain false.
