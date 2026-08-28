# Ticket 11 Slice 59 — Existing Cleanup/Refresh Contract Closure

Started: 2026-08-28

Frozen: 2026-08-28

## Outcome

Slice 59 continues repairing the existing 421 executable RuleAtoms in direct
dependency order. It closes the Cleanup/Refresh executor group immediately
after Slice 58 closed End-of-Round Effects. Slice 59 is the ordinal of a repair
batch; it is not RuleAtom number 59 and it adds no atom.

The public-contract RED test first failed because no current Cleanup v5 module
existed. The new `authority.cleanup-refresh-v5@5.0.0` re-enumerates the exact
server action and rejects forged lineage, extra diagnostic/detail fields, stale
End-of-Round history, wrong-seat actions, hidden generic markers, unknown
status schemas, and official-data or MatchBinding drift before applying.

Strict-freeze policy keeps Cleanup v1/v2/v3/v4 byte-exact. Current rooms use v5;
historical runtimes, replay, and old-rules display retain their original
executor versions without silent compatibility.

Coverage changes are:

- executable RuleAtoms: `421` unchanged
- declared executor contracts: `20 → 23/42`
- missing executor contracts: `22 → 19`
- strict-complete atoms: `160 → 167`
- partial atoms: `81 → 78`
- no-contract atoms: `180 → 176`

Exactly seven existing Cleanup atoms were rebound. All seven became strict,
with zero new atoms and zero non-target changes. This leaves 254 existing atoms
non-strict: 78 partial and 176 with no complete consumer contract. Charge and
all new-atom work remain paused until all 42 executor contracts and all 421
existing atoms are strict.

## Exact lifecycle subset

Cleanup v5 derives its atom lineage from the exact preceding End-of-Round v5
branch:

- empty queue: four Cleanup atoms owned by frozen v2 semantics
- Optical Flare: five Cleanup atoms owned by frozen v3 semantics
- Stimpack: the seven-atom current v5/v4 union

Apply refreshes the supported Academy and Terran Armed Forces cards, clears
activation flags, both seats' Pass state, reaction/card-use ledgers, typed
Optical Flare and Stimpack statuses, and their exact effect markers. It hands
the First Player Marker holder into `determine_initiative` while preserving
scores, mission state, piece positions, model counts, actor history, and
Stimpack non-lethal damage. Damage removal is not a Cleanup side effect.

The supported generic token/marker denominator is exactly empty. A missing or
hidden generic token/marker source fails closed rather than being inferred
away. Current official Marine, Hold Position, Academy, Terran Armed Forces,
card/resource state, status/marker evidence, round history, board, pieces, and
MatchBinding are all part of executable action identity.

## Public contract, graph, and replay

The relationship graph appends to Slice 58 and declares separate state
contracts for Cleanup v2, v3, and v5. Historical v4 remains a frozen superseded
node. Reads, writes, invalidations, protected fields, Judge cases, current and
historical releases, and negative relationship gaps are all explicit. Every
new slice is therefore appended to the same auditable graph rather than kept in
an isolated checklist.

The current action traverses LegalSpace → Preview → Confirm → Apply under
`hybrid_legal_space_v19`. The Authority response protocol remains
`starcraft_tmg_authority_v2.legal-space`; v19 is the action-schema dependency,
not a replacement response protocol. Its content hash and Ed25519 signature
replay after HMAC rotation; tampering fails as `SIGNATURE_INVALID`.

Frozen identities:

- slice: `23d6385e012107abd6e2ad5b51d05f053d81e5a6833ad4afa09eaee3cc3b5d10`
- previous slice: `4b23af8627bed2e3b8f3820e84dea2c0ab710d2085e2a16defbe84584a6da014`
- catalogue: `edda61ad6599cf032caa13476412c1a63897c63babb66000f028019f31cb75e6`
- runtime: `8698853a5f4804ede9da31b8ee1ebf5e51173c5797b10b6ef730874c524aa79d`
- relationship graph: `eef1c44a2d9074d7efcbafab8ceb0315bdcc140d9a4ba21722e68559160b51db`
- graph size: `5,946` nodes / `21,761` edges

Frozen/current Cleanup executor source SHA-256 values:

- v1: `d5a20f7740a691ffc40ef63b7356166fec4dee229bff6471b47d29e394da0dc8`
- v2: `3fcb6fc1404a94512865df62c75e727cb4246de91f0d1bd4994a5bd1b7de4d28`
- v3: `d62804ddf7c8d3fb4967f0788258f568a53a6921b321e533a95ab7222c1d40e5`
- v4: `76ebc98d1575861414f247208ffc7735a9741bd0425c3fc12807737269a1fd02`
- v5: `244bc7ee615b74c183ba4aea0e6ab60a715573234ea6e0378e4b78a075ca562f`

## Official-source evidence

The verifier re-read the live official Core PDF and current Firestore
documents. Repository fallback was forbidden and unused.

- Core PDF: `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`
- accepted versions: units `71`, cards `69`, rules `48`
- versions receipt: `35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733`
- Part 11: `35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c`
- Academy: `0a1a205eabe0a9b2989fd879365096e295c31ef3e0f4983018b4249cd00d1695`
- Terran Armed Forces: `832aabd98a5ebad69458c9fd111f0d1fea469634a16cffdcd6ac3d3e86438daa`

## Verification gates

The first comprehensive run failed two assertions for useful reasons: one
incorrectly confused the stable Authority response protocol with action-schema
v19, and one supplied altered bytes to the strict historical rules-display
gate. The verifier was corrected without relaxing either contract; the final
run proves the exact v19 dependency and exact old display bytes.

- public v5 enumerate/apply verifier: `12/12`
- Slice 59 source/contract/Judge/Authority/replay verifier: `15/15`
- cumulative runtime verifier: `10/10`
- Ticket 11 aggregate: `9/9`
- evidence denominator: `121` base reports / `1,254` assertions; including
  aggregate, `122` reports / `1,263` assertions
- product `verify:all`: pass with exit `0`

## Remaining order

Nineteen of 42 executor contracts and 254 of the 421 existing atoms remain
non-strict. The next direct dependency is Determine Initiative, followed by
Start of Round. Their atom movement remains planning-only until source, state,
graph, Judge, Authority, replay, and historical-display audits pass.

This slice generated or promoted no Skill, did not install or run DSH, and
wrote no memory, self-play, MuZero, or training candidate. `rulesEligible`,
`productionRoomEligible`, and `trainingTruth` remain false. Ticket 11 and the
overall 10/22 platform checkpoint remain open.
