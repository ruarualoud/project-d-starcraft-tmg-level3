# Ticket 11 Slice 58 — Existing End-of-Round Effects Contract Closure

Started: 2026-08-28

Frozen: 2026-08-28

## Outcome

Slice 58 continues repairing the existing 421 executable RuleAtoms in direct
dependency order. It closes the End-of-Round Effects executor group immediately
after Slice 57 closed the Hold Position end-game check. Slice 58 is the ordinal
of a historical repair batch; it is not RuleAtom number 58 and it adds no atom.

The RED public-contract test proved that frozen
`authority.end-of-round-effects-v4@4.0.0` accepted caller-forged executable
lineage. Strict-freeze policy keeps v2, v3, and v4 byte-exact and adds
`authority.end-of-round-effects-v5@5.0.0` for current rooms. Current v5
re-enumerates the exact action and rejects altered lineage, extra fields, stale
Cleanup progress, the wrong seat, unknown status schemas, and official-data or
MatchBinding drift before applying any transition.

The current latest-official dataset differs from the frozen v3/v4 dataset.
Consequently v5 owns the current Optical Flare and Stimpack paths; v2 remains
valid for an empty effect queue. Frozen v3/v4 reject current dependencies and
remain available only through their exact historical catalogue, runtime,
replay, and old-rules display. There is no silent compatibility path.

Coverage changes are:

- executable RuleAtoms: `421` unchanged
- declared executor contracts: `17 → 20/42`
- missing executor contracts: `25 → 22`
- strict-complete atoms: `158 → 160`
- partial atoms: `80 → 81`
- no-contract atoms: `183 → 180`

Five existing atoms were rebound to current v5 evidence. Two became strict,
one moved from none to partial, and two stayed partial because Cleanup consumers
remain open. There are zero new atoms and zero non-target changes. This leaves
261 existing atoms non-strict: 81 partial and 180 with no complete consumer
contract. Charge and all new-atom work remain paused until all 42 executor
contracts and all 421 existing atoms are strict.

## Exact lifecycle subset

The dynamic v5 lineage depends on the exact server-observed queue:

- empty queue: the frozen v2 two-atom lineage
- Optical Flare: the frozen v3 three-atom lineage under current v5 authority
- Stimpack: the current five-atom union under v5

End-of-Round Effects records the exact effect history and hands Cleanup progress
to `cleanup_and_refresh`. Optical Flare status/marker state and Stimpack
status/marker/non-lethal damage persist through this step. Their removal belongs
to the separate Cleanup transition, so v5 cannot silently perform Cleanup work.

The exact action binds round, Cleanup prefix, active/First Player seat, current
official source and data identities, queue/status/marker evidence, effect
history, protected state, and MatchBinding. Board geometry, pieces, scores,
resources, source/setup data, status markers, effect markers, and damage cannot
change except for the declared history/progress/log writes.

## Public contract, graph, and replay

The relationship graph appends to Slice 57 and declares separate state contracts
for End-of-Round Effects v2, v3, and v5. It binds reads, writes, invalidations,
protected-state checks, Judge cases, current/historical release lineage, and
negative graph gaps. The current catalogue excludes frozen v4 and exposes v5;
historical v2/v3/v4 nodes and displays remain queryable.

The accepted v5 path traverses LegalSpace → Preview → Confirm → Apply under
`hybrid_legal_space_v18`. Its content hash and Ed25519 signature replay after
HMAC rotation; tampering fails as `SIGNATURE_INVALID`.

Frozen identities:

- slice: `4b23af8627bed2e3b8f3820e84dea2c0ab710d2085e2a16defbe84584a6da014`
- previous slice: `d74733ad2a030e7e2b5ab7aabcd05f9af5a4129102b8cf951640876972835b21`
- catalogue: `47f128f34764e9c6a15193dfe1a99906290ea5073da8033d1a7296e8e8d67dd9`
- runtime: `ec37637bc787d6d5870db5c02fa84f53b077d54f177542bd8282b710f42eb089`
- relationship graph: `52f9ad4f03f3249149693f243a0f1e789864634d030cd3ff432a2ea8fb6baff1`
- graph size: `5,867` nodes / `21,510` edges

Frozen/current executor source SHA-256 values:

- v2: `caa175ef74bbeec6b35d40f3c8d415854b11457b06907e3351179539de8043b4`
- v3: `d62804ddf7c8d3fb4967f0788258f568a53a6921b321e533a95ab7222c1d40e5`
- v4: `76ebc98d1575861414f247208ffc7735a9741bd0425c3fc12807737269a1fd02`
- v5: `635f99841c23eaacc0a5a9cb01f9648f29ca5b5d4943216b5a9c92c953e9faea`

## Official-source evidence

The verifier re-read the live official Core PDF and current Firestore
documents. Repository fallback was forbidden and unused.

- Core PDF: `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`
- accepted versions: units `71`, cards `69`, rules `48`
- versions receipt: `35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733`
- Part 11: `35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c`
- Academy: `0a1a205eabe0a9b2989fd879365096e295c31ef3e0f4983018b4249cd00d1695`
- Terran Armed Forces: `832aabd98a5ebad69458c9fd111f0d1fea469634a16cffdcd6ac3d3e86438daa`

## Reproducible evidence correction

The first full foundation rerun exposed a real verifier defect: a historical
Stimpack report's final state hash changed whenever the test generated a new
Ed25519 key pair, because its multi-stage state intentionally carries the
key-bound MatchBinding lineage. That cryptographic session identity is valid
replay evidence but is not deterministic rules truth.

The Slice 58 historical evidence projection now freezes deterministic semantics
only: source/runtime identities, action-schema version, receipt counts, and the
fact that Ed25519 replay after HMAC rotation passed. Per-run replay state hashes
must still be valid SHA-256 values and must equal the accepted state inside the
historical verifier, but are no longer hard-coded across signing identities.
Regenerating the historical report with another key and rerunning Slice 58 now
passes, without relaxing signature, replay, source, runtime, or display checks.

## Verification gates

- public v5 enumerate/apply verifier: `4/4`
- Slice 58 source/contract/Judge/Authority/replay verifier: `12/12`
- cumulative runtime verifier: `10/10`
- Ticket 11 aggregate: `9/9`
- evidence denominator: `120` base reports / `1,239` assertions; including
  aggregate, `121` reports / `1,248` assertions
- complete Ticket 11 foundation prefix: pass
- rerun from the executable-runtime failure point through aggregate: pass
- historical-key regeneration plus Slice 58 reproducibility regression: pass
- product `verify:all`: pass with exit `0`

## Remaining order

Twenty-two of 42 executor contracts remain and 261 of the 421 existing atoms
remain non-strict. The direct downstream dependency group is Cleanup v2/v3/v4,
which shares the still-partial expiry/removal atoms with End-of-Round Effects.
Its exact atom movement is planning-only until source, state, graph, Judge,
Authority, replay, and historical-display audits pass.

This slice generated or promoted no Skill, did not install or run DSH, and
wrote no memory, self-play, MuZero, or training candidate. `rulesEligible`,
`productionRoomEligible`, and `trainingTruth` remain false. Ticket 11 and the
overall 10/22 platform checkpoint remain open.
