# Ticket 11 Slice 48 — Marine multi-enemy casualty resolution

Date: 2026-08-26  
Status: frozen exact subset; Ticket 11 remains open

## Outcome

Slice 48 closes one relationship-graph-selected composition gap left by Slice 47: the target Marine Unit may now be engaged by exactly two specific enemy Marine Units while one of them makes an ordinary Strike or Bayonet Close Combat Attack. The Rules-owned casualty domain preserves each enemy Unit's engagement independently, rederives the complete three-Unit Engagement Graph after settlement, activates only the selected attacker, and leaves the co-engager unactivated.

The new deep Rules modules are:

- `official-marine-multi-enemy-close-combat-denominator-v3`
- `authority.marine-multi-enemy-casualty-close-combat-v4@4.0.0`

This is a zero-atom composition Slice. It does not change the frozen disposition or content of any of the 1,026 RuleAtoms. It adds a new executor, state contract, relationship extension, Authority action schema and Judge/replay evidence over the existing 421 executable atoms.

## Exact supported subset

The frozen denominator accepts exactly three current-official Marine Units:

1. one selected attacking Unit;
2. one same-side co-engaging Unit; and
3. one defending target Unit engaged by both exact enemy Unit identities.

The selected attacker may use its ordinary Unit-wide Strike or Bayonet replacement. Fighting and Supporting ranks are derived only from that selected Unit's models; the co-engager's model ledger cannot contribute attack dice. The co-engager must remain an unmodified Strike Unit. Stimpack Precision in this multi-enemy shape remains an explicit fail-closed gap rather than being silently projected through the two-Unit executor.

For the frozen Judge fixture, two selected-attacker models are Fighting models, while the co-engager independently engages the target's middle model. A two-hit, two-failed-save attack opens exactly two legal one-model casualty choices. Removing the middle target model is forbidden because it would break the only engagement with the co-engager while valid alternatives remain.

Any change to the selected attacker ledger, co-engager ledger, target ledger, Unit identities, model geometry, loadout, status, marker, ability history or Engagement Graph invalidates the plan or pending casualty domain.

## Relationship graph

Slice 48 explicitly appends source, state, derived value, parameter-domain, executor lineage, Judge test and release-ancestry relationships. The new paths cover:

`Part 12 casualty preservation -> exact enemy Unit set -> three-Unit plan -> selected attack pool -> casualty domain -> pending choice -> post-casualty three-Unit graph -> Authority replay test`.

It also freezes invalidation paths from model geometry and the co-engager ledger into the plan and pending domain. The negative gate uses two independent breakages: removal of a required source constraint creates a required-edge gap, and removal of the preservation Judge link breaks the required source-to-test path. Either makes the Slice invalid.

Current graph:

- nodes: 5,172
- edges: 20,239
- executors: 41
- executors with declared unified state contracts: 8
- remaining state-contract debt: 33
- blocking relationship gaps: 0

The graph remains derived audit evidence, not a second Rules authority. Future Slices must add an explicit relationship extension and freeze a new graph hash; merely adding an executor file does not put a Slice into the graph. Historical graphs are immutable.

## Authority, integrity and replay

Only Slice 48 uses `hybrid_legal_space_v16`. Both attacker-seat orientations pass through the Authority Interface:

`List Legal Actions -> Preview -> explicit human Confirmation -> Apply -> signed receipt -> Replay`.

The attack receipt carries the exact selected attacker, co-engager, target, plan, Chance commitment and executor lineage. The defender owns the casualty choice. Two independent two-receipt journals—one with player 1 attacking and one with player 2 attacking—replay to the exact final `StateEnvelope` after the short-term HMAC secret is rotated. Accepted receipts remain Ed25519-signed, and event tampering fails with `SIGNATURE_INVALID`.

Slice 47 and every earlier source, catalogue, runtime, action schema, graph and historical rules display remain exact frozen dependencies. No compatibility fallback is used.

## Frozen identities

- Slice: `69452cbf2adbf5c067f6996c09f748ac739bd0c606a0226c01b1184e13ed4211`
- Catalogue: `98312255b197471e93b8b9b0a141b694743bcbef880830b7bdb4bf60736a0cf3`
- Runtime: `dfa25995e03e98ddd5b1fab855dcc9744312b2599ca3452e4364ab2db34d79d6`
- Relationship graph: `575e804e7172e1bad1bab42b3058484b46e22952486c4409ef9acb1219691f6b`
- Multi-enemy denominator: `6b7dda03f67666c7cb6d4192782e12a8d4a831351c362f1eacc3f1860fcf53d1`
- Shared casualty kernel: `35e839791309c84bcc23073aa933be1660d1dea62d65ac7aaba0d1a645d07643`

The live official binding was revalidated directly against Command Center as `units 71 / cards 69 / rules 48`, including Marine and Rules Parts 8 and 12. Repository fallback is false.

## Verification and remaining work

- focused Slice 48 acceptance: 13/13
- cumulative executable runtime: 10/10
- complete historical runtime chain: pass
- foundation base evidence: 110 reports / 1,132 assertions
- aggregate evidence: 111 reports / 1,141 assertions
- application-level `verify:all`: pass

RuleAtom disposition remains 421/912 actionable executable (46.2%), 491 actionable atoms remaining, plus 114 display-only atoms. Slice 48 is the forty-eighth frozen Slice; the rolling atom-throughput forecast is about 56 additional planning Slices.

Thirty-three executors still lack a unified state contract. Stimpack in a multi-enemy engagement, more than two enemy Units, non-Marine profiles, terrain/elevation/Flying, simultaneous effects and full interaction/LegalSpace closure remain outside this exact subset. `rulesEligible=false`, `productionRoomEligible=false`, and `trainingTruth=false` remain mandatory.

No Skill was generated or promoted for this Slice, DSH was not run, and no memory, self-play, MuZero or training candidate was written.
