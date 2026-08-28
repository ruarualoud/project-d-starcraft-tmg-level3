# Ticket 11 Slice 54 — Existing Combat Pass Contract Closure

Started: 2026-08-28

Frozen: 2026-08-28

## Outcome

Slice 54 continues the corrected order: finish the existing 421 executable
RuleAtoms before promoting Charge or any new atom. The impact audit selected
the current Combat Pass family, but a public-contract RED test found that
frozen `authority.combat-pass-v2@2.0.0` accepted a caller-forged executor
version, RuleAtom lineage, and extra fields. A second RED test found that Pass
was exposed before the Combat phase's required first-actor choice.

Strict-freeze policy forbids editing v2 or silently accepting its old public
behavior. This slice therefore adds `authority.combat-pass-v3@3.0.0`, freezes
v2 source SHA-256
`8043c50a8a3aae9fc7dd556f14ae6da817690ae2ef5fed1605c20e9c59dd9b32`,
and reassigns the same 34 existing atoms to v3. It adds no RuleAtom and keeps
the Authority action schema at `hybrid_legal_space_v17`. Historical v2
catalogue/runtime/rules-display dependencies remain exact and replayable.

The frozen denominator remains:

- executable RuleAtoms: `421`
- review-required actionable RuleAtoms: `491`
- display-only RuleAtoms: `114`
- executors: `42`

Strict state-contract coverage changes as follows:

- declared executor contracts: `13 → 14`
- missing executor contracts: `29 → 28`
- strict-complete atoms: `95 → 122`
- partial atoms: `103 → 80`
- no-contract atoms: `223 → 219`

Within the 34 version-reassigned atoms, four move from none to strict, 23 move
from partial to strict, and seven shared partial atoms remain partial. Thus 27
existing atoms become strict-complete, 299 remain non-strict, and zero new
atoms are created. Slice 54 is a historical development-batch ordinal, not an
atom number.

## Corrected public contract

`enumerateOfficialCombatPassV3Actions` derives one exact action from current
state. It remains mandatory only when the active, unpassed seat has no
remaining unactivated Engaged Unit under the exact Engagement Graph v2
denominator. It additionally requires a valid `${round}:combat`
`PhaseFirstActorChoice` whose round, phase, First Player Marker holder, and
chosen first actor are current.

`applyOfficialCombatPassV3` accepts only the byte-equivalent executable action
returned by enumeration. A forged executor identity/version, changed or empty
RuleAtom lineage, stale state-derived field, or additional caller field is an
action mismatch and fails closed. The wrapper delegates only the already
frozen v2 transition semantics after exact validation, then records v3 as the
accepted action/executor identity. The first Pass hands control to the other
seat; the second consecutive Pass advances Combat to Cleanup.

The state contract binds phase, active seat, player Pass state, First Player
Marker, fresh phase-first-actor record, pieces and activation markers,
engagement geometry/hash, and pass history. It protects board/terrain, piece
positions/status/damage/model ledgers, scores, card resources, First Player
Marker, and the established phase-first-actor choice from undeclared writes.

## Relationship and replay evidence

The Slice 54 graph appends to Slice 53. It connects official source clauses,
all 34 existing RuleAtoms, the v3 exact action domain, v2→v3 frozen ancestry,
state reads/writes/invalidations, engagement/phase-choice derivation, Judge
tests, and Authority replay. Removing a required engagement, phase-choice,
action-exactness, version, or Judge edge creates a declared edge/path/evidence
gap and blocks release.

Two accepted Pass transitions traverse LegalSpace → Preview → Confirm → Apply
and reach Cleanup. Their content hashes and Ed25519 long-term signatures replay
after the HMAC short-term seal rotates; receipt event tampering is rejected as
`SIGNATURE_INVALID`. Slice 53 and every older catalogue/runtime/rules display
remain retained. Missing historical dependencies are quarantined; silent
compatibility is forbidden.

Frozen identities:

- slice: `e87649721f78720ced43ea3792dcbcd7514a4fe187c63222ecac1ba1eacca90f`
- previous slice: `8afa8a3085562d61adda4469ef1e160a363828e6a6f9d9bcb561e4921dc6e404`
- catalogue: `eea6d9c0395db9e442f9606b3a9c97196aa949b7a0e29c69590c5717b246922d`
- runtime: `1d6b06dd12b6eae1c0471d9a5a38073c316a4835018f0c8fc47112344226e26c`
- relationship graph: `1847bcd8d6446cecdea3c20b2ca07b35383052e288b69037ed7c7c97208dc590`
- graph size: `5,509` nodes / `20,883` edges

## Verification gates

The focused verifier re-reads the live official Firestore versions and the
bound documents inherited from the current official-data receipt. Accepted
versions remain units `71`, cards `69`, and rules `48`; repository fallback is
forbidden and unused.

- public v3 enumerate/apply RED→GREEN verifier: pass
- Slice 54 relationship/contract/Judge/Authority/live-source verifier: `12/12`
- cumulative runtime verifier: `10/10`
- Ticket 11 aggregate: `9/9`
- evidence denominator: `116` base reports / `1,191` assertions; including
  aggregate, `117` reports / `1,200` assertions
- complete Ticket 11 foundations: pass with exit `0`
- product `verify:all`: pass with exit `0`
- syntax and `git diff --check`: pass

## Remaining order

Twenty-eight of 42 executor contracts remain. This leaves 299 existing atoms
not strict-complete: 80 partial and 219 without a declared contract. Charge
and every new-atom promotion remain paused until the executor denominator is
`42/42` and all 421 atoms are strict-complete.

The next dependency group is round/scoring/lifecycle. Its first planned audit
target is `authority.mission-marker-control-v2@2.0.0`, upstream of VP scoring
and the Hold Position end-game/lifecycle chain. Current impact projection says
its 22 single-consumer none atoms would become strict, yielding planning-only
Slice 55 `144 strict / 80 partial / 197 none`, contracts `15/42`, and 27
missing. This is not a completion claim: source, public action, state, graph,
Judge, replay, and frozen-version audits must pass before those numbers move.

This slice generated or promoted no Skill, did not run DSH, and wrote no
memory, self-play, MuZero, or training candidate. `rulesEligible`,
`productionRoomEligible`, and `trainingTruth` remain false. Ticket 11 and the
overall 10/22 platform checkpoint remain open.
