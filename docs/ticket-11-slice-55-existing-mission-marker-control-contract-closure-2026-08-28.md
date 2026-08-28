# Ticket 11 Slice 55 — Existing Mission Marker Control Contract Closure

Started: 2026-08-28

Frozen: 2026-08-28

## Outcome

Slice 55 continues the corrected order: finish the existing 421 executable
RuleAtoms before promoting Charge or any new atom. It closes the current
Mission Marker Control family because that family is the direct upstream
dependency of Victory Point scoring. Slice 55 is a historical development
batch ordinal, not RuleAtom number 55.

The public-contract RED test proved that frozen
`authority.mission-marker-control-v2@2.0.0` accepted caller-forged RuleAtom
lineage, caller-forged resolution content, and additional fields. The
Authority integration test then exposed a second boundary mismatch: diagnostic
`details` are not part of the Authority's executable action identity and
therefore cannot be accepted by public Apply.

Strict-freeze policy forbids editing v2 or silently tolerating its old public
behavior. This slice adds
`authority.mission-marker-control-v3@3.0.0`, freezes v2 source SHA-256
`91be66aad9af063282c97f68e13e4391c16b2a603a52ef0bef23018e12616379`,
and reassigns the same 22 existing atoms to v3. It adds no RuleAtom and keeps
the Authority action schema at `hybrid_legal_space_v17`. Historical v2
catalogue/runtime/rules-display dependencies remain exact and replayable.

The frozen denominator remains:

- executable RuleAtoms: `421`
- review-required actionable RuleAtoms: `491`
- display-only RuleAtoms: `114`
- executors: `42`

Strict state-contract coverage changes as follows:

- declared executor contracts: `14 → 15`
- missing executor contracts: `28 → 27`
- strict-complete atoms: `122 → 144`
- partial atoms: `80 → 80`
- no-contract atoms: `219 → 197`

All 22 targeted atoms move from no contract to strict-complete. Therefore 277
of the existing 421 atoms remain non-strict: 80 partial and 197 without a
declared consumer contract. Zero new atoms and zero non-target atom changes
occurred.

## Corrected public contract

`enumerateOfficialMissionMarkerControlActionsV3` derives the one exact current
Cleanup action from the frozen official gameplay bundle, Mission setup, Supply
ledger, model ledger, coherency state, marker and model geometry, lifecycle,
seat, and current control state. Public executable identity excludes UI
diagnostics and strategy-only fields.

`applyOfficialMissionMarkerControlV3` regenerates current LegalSpace and accepts
only an exact executable action from that enumeration. Forged lineage,
resolution, diagnostics, extra fields, stale source/data/Supply/geometry, wrong
seat, and wrong lifecycle fail closed. Only after exact validation does v3
delegate the already frozen v2 transition semantics while recording the v3
executor identity.

The bounded five-marker Judge fixture proves:

- marker 1: player 1 solely contests and retains control
- marker 2: tied Current Supply causes no transfer
- marker 3: higher player-1 Current Supply reclaims control
- marker 4: no eligible contestant preserves sticky player-2 control
- marker 5: player 2 solely contests and takes control

Flying, Burrowed, out-of-coherency, and Reserve Units cannot contest. Current
Supply comes from the exact current official profile and live model count; the
fixture explicitly verifies that a four-model Marine Unit is Supply 1. Affinity
is bound but never grants control by itself.

Apply writes only Mission Marker control, Cleanup progress, and the event log.
Board, terrain, model positions/status/damage/ledgers, scores, card resources,
First Player Marker, and unrelated phase state are protected from undeclared
writes.

## Relationship and replay evidence

The Slice 55 graph appends to Slice 54. It connects official source clauses,
all 22 existing RuleAtoms, the v3 exact action domain, v2→v3 frozen ancestry,
official bundle/setup/Supply/geometry/coherency reads, the exact allowed writes
and invalidations, five-marker Judge tests, and Authority replay. Removing a
required invalidation or Judge path creates a declared gap and blocks release.

The accepted marker transition traverses LegalSpace → Preview → Confirm →
Apply and makes the control result visible to the downstream VP state. Its
content hash and Ed25519 long-term signature replay after the HMAC short-term
seal rotates; receipt tampering is rejected as `SIGNATURE_INVALID`. Slice 54
and every older catalogue/runtime/rules display remain retained. Missing
historical dependencies are quarantined; silent compatibility is forbidden.

Frozen identities:

- slice: `fdb44c36f5c418954b0524a3943cccf09fe3bc44b3e34e0533be9b73235d6662`
- previous slice: `e87649721f78720ced43ea3792dcbcd7514a4fe187c63222ecac1ba1eacca90f`
- catalogue: `d7ebb1f60f861544a31711362077927dde00271faf91e44350b5000ed06ff908`
- runtime: `7ba03eba7f2ea2f357c5264bcc2f261453a0f3b3c0fc9310db3c281a2eac8f55`
- relationship graph: `4a8ea539d8052847ac4e67df681c290c29ed9030444e8cfffb1400a3debc331a`
- graph size: `5,670` nodes / `21,091` edges

## Verification gates

The focused verifier re-read the live official Firestore versions and the
hash-bound documents inherited from the current official-data receipt.
Accepted versions remain units `71`, cards `69`, and rules `48`; repository
fallback is forbidden and unused.

- public v3 enumerate/apply RED→GREEN verifier: pass
- Slice 55 relationship/contract/Judge/Authority/live-source verifier: `12/12`
- cumulative runtime verifier: `10/10`
- Ticket 11 aggregate: `9/9`
- evidence denominator: `117` base reports / `1,203` assertions; including
  aggregate, `118` reports / `1,212` assertions
- complete Ticket 11 foundations: pass with exit `0`
- product `verify:all`: pass with exit `0`

## Remaining order

Twenty-seven of 42 executor contracts remain. This leaves 277 existing atoms
not strict-complete: 80 partial and 197 without a declared contract. Charge and
every new-atom promotion remain paused until the executor denominator is
`42/42` and all 421 atoms are strict-complete.

The next dependency audit target is
`authority.victory-point-scoring-v1`. It is directly downstream of Mission
Marker Control and currently consumes 12 single-consumer no-contract atoms. If
and only if its source, public action, state, graph, Judge, replay, and frozen
version audits all pass, planning-only Slice 56 would become `156 strict / 80
partial / 185 none`, contracts `16/42`, with 26 missing. Those numbers are a
projection, not a completion claim.

This slice generated or promoted no Skill, did not run DSH, and wrote no
memory, self-play, MuZero, or training candidate. `rulesEligible`,
`productionRoomEligible`, and `trainingTruth` remain false. Ticket 11 and the
overall 10/22 platform checkpoint remain open.
