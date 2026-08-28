# Ticket 11 Slice 52 — Existing Movement Hold Contract Closure

Started: 2026-08-28

Frozen: 2026-08-28

## Outcome

Slice 52 continues the corrected order: finish the existing 421 executable
RuleAtoms before promoting Charge or any new atom. It adds no RuleAtom and
changes no frozen executor, catalogue, runtime, or action schema. It gives the
existing `authority.movement-hold-v1@1.0.0` executor its last missing
relationship/state/Judge contract.

The three Movement Hold atoms were partial before this slice, not uncovered.
Each had eight executor consumers and seven declared contracts; closing the
eighth consumer makes all three strict-complete.

The frozen denominator remains:

- executable RuleAtoms: `421`
- review-required actionable RuleAtoms: `491`
- display-only RuleAtoms: `114`
- executors: `42`

Strict state-contract coverage changes as follows:

- declared executor contracts: `11 → 12`
- missing executor contracts: `31 → 30`
- strict-complete atoms: `89 → 92`
- partial atoms: `106 → 103`
- no-contract atoms: `226 → 226`

The slice number is the historical development-batch ordinal. It is not an
atom number. Slice 52 changes the completion status of existing atoms while
the executable denominator remains exactly 421.

## Closed contract

The contract covers these existing atoms:

- `rule-atom:movement-hold-activation-state`
- `rule-atom:movement-hold-no-action`
- `rule-atom:movement-phase-hold-action`

LegalSpace exposes one exact Hold action for every active-side piece that is
on the battlefield, not destroyed, has live models, and has not activated in
Movement. An inactive seat, passed seat, ineligible piece, wrong phase, or
missing fresh phase-first-actor choice cannot obtain Hold authority.

Apply marks only the selected piece's Movement activation. If the opposing
seat still has an available activation it receives the turn. If the opponent
has already Passed and this is the acting side's last activation, the runtime
completes remaining Movement markers, advances to Assault, gives the new phase
to the First Player Marker holder, and requires a fresh first-actor choice.

The contract explicitly protects board/terrain, scores, card resources,
piece positions, statuses, damage, and the First Player Marker from Hold
writes. The accepted Hold may write only its declared activation, handoff,
phase-composition, player marker-completion, event, and log state.

## Relationship and replay evidence

The Slice 52 graph appends to Slice 51. It connects piece state to the exact
eligible Hold set, action/event writes, alternating-seat availability,
phase-completion composition, Judge tests, and release ancestry. Removing the
Movement Hold invalidation or Judge provenance invalidates the declared scope
and creates required-edge, required-path, and evidence-test gaps.

An accepted Hold receipt carries its Ed25519 long-term signature and replays
after the HMAC short-term seal rotates. Event tampering is rejected as
`SIGNATURE_INVALID`. Slice 51 and every older rules display remain retained;
silent compatibility is forbidden.

Frozen identities:

- slice: `cc1b7bc338f60c59af0c3644f5a2d2dfeea7494c706972871e3d6b15c21d8458`
- previous slice: `d6e892447b54b2e95f689ba822ec935faff7bc30c1fb8aa87b6092515839a69c`
- catalogue: `cf0c60b4faa04674727273cadc8fa1fbca158cabce3d85825d0417928abb0d7e`
- runtime: `3a9684030e8020bffbcac80c6238804f673c98b695b49286481662fc5e01749a`
- relationship graph: `2fd3a26d859cbb8c0d9eeea7cc78b57a6e5677f838eaeb069376e0f617b1e9aa`
- graph size: `5,258` nodes / `20,552` edges

## Verification gates

The focused verifier reads the live official Firestore versions, Marine, Part
8, and Part 12 documents. The accepted versions remain units `71`, cards `69`,
and rules `48`; repository fallback is forbidden and unused.

- Slice 52 focused contract/Judge/Authority/live-source verifier: `8/8`
- cumulative runtime verifier: `10/10`
- Ticket 11 aggregate: `9/9`
- evidence denominator: `114` base reports / `1,170` assertions; including
  aggregate, `115` reports / `1,179` assertions
- complete Ticket 11 foundations: pass with exit `0`
- product `verify:all`: pass with exit `0`

## Remaining order

Thirty of 42 executor contracts remain. This also leaves 329 existing atoms
not yet strict-complete: 103 partial and 226 without a declared contract.
Charge and every new-atom promotion remain paused until the existing executor
contract denominator reaches `42/42` and all 421 atoms are strict-complete.

The next dependency-ordered target is `authority.assault-hold-v2@2.0.0`.
Impact audit shows its three atoms currently have no declared contract and are
single-consumer atoms. If its actual state/Judge/replay audit passes without a
frozen-executor defect, Slice 53 projects to `95 strict / 103 partial / 223
none`, contracts `13/42`, and 29 missing. This is a projection, not a completed
claim; any executor defect must fail closed instead of being hidden in a
relationship declaration.

This slice generated or promoted no Skill, did not run DSH, and wrote no
memory, self-play, MuZero, or training candidate. `rulesEligible`,
`productionRoomEligible`, and `trainingTruth` remain false.
