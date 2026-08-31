# Ticket 11B Slice 93 — Unit-card and Supply Rules

## Outcome

Slice 93 promotes the exact 12-atom route-v2 assignment for Unit-card Faction
Tag, Army Slot, Phase Boxes, null Speed, Supply Profile, base, Combat Range and
Upgrade-side fields, plus Current Supply selection and starting-slot rules.

The catalogue moves from `671 executable / 241 review / 114 display-only` to
`683 / 229 / 114`. The runtime declares 62 complete executor state contracts.
Slices 94–111 remain: 18 slices and 229 actionable atoms.

## Official Source Boundary

No source refresh occurred. The slice uses sealed lock
`1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`,
snapshot `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`,
dataset `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`
and versions `71 / 69 / 48`.

`official-unit-card-supply-data-bundle-v1` binds Core Parts 5, 6 and 11,
12 exact clause hashes and all 26 current official Unit records. The compiled
denominator is 7 Protoss, 7 Terran and 12 Zerg Units; 3 have null Speed, 4
have null Combat Range, 18 have split Speed and 6 offer a Large composition.
All 183 Upgrade definitions remain attached to their exact phase boxes.

Base shape and size come from the locked May 2026 Protoss, Terran and Zerg
print-and-play sources because Command Center has no equivalent field. This
preserves Hydralisk's `40×100MM` rectangle and the other 25 round bases.

Hashes:

- data bundle: `8887fb8996e9e88df6399b8a97fd2f5661f16b9e356a386af60170dbff7abd73`
- Unit source index: `5ea85f68399f896f10417379dc60167142e00c6ecc0afba6f24fa72a69222eac`
- Unit profile index: `e076e6ecbc5388342dacb57ce601f9438f3058b6cf081964c5d82e3ccc1a24cf`
- base profile index: `0d80d47442a863054cd818f96e4bc9714a5af9a641c15f4e540a84abfd926288`

## Executable Semantics

- Unit-card layout is Rules-owned. A client cannot replace the Faction Tag,
  Army Slot type, phase boxes, Speed, Supply Profile, base, Combat Range or
  Upgrade-side definition hash.
- Current Supply is selected from exactly one applicable Supply Profile tier
  using the Unit's current model count. The inactive printed `-` tier is never
  treated as a model-count range. A destroyed zero-model Unit resolves to zero
  Supply without fabricating a tier; any other unmapped count fails closed.
- One Current Supply projection declares the four normative consumers:
  Deployment, Mission Marker Control, Tactical Mass and scoring. Existing
  consumer executors remain frozen and require explicit versioned migration;
  this slice does not silently rewrite them.
- An Army Building composition derives its starting Supply from its official
  starting model count and occupies the same number of its Unit's slot type.
  `Other` generated/summoned Units are not misclassified into one of the five
  Army Building slot types. Full army eligibility remains Slice 102.
- A printed null Speed (`-`) forbids Move and every repositioning route,
  including PLACE and involuntary movement. For non-null Speed the primitive
  only certifies that this null-Speed prohibition does not apply; it does not
  bypass operation-specific movement rules.

`authority.unit-card-supply-rules-v1@1.0.0` exposes these procedures through
`createEnvelope → legalSpace → preview → confirm → apply → replay` under action
schema `hybrid_legal_space_v31`.

## Evidence

- focused Slice 93 Judge: `46/46`;
- Slice 92 regression: `42/42`;
- executable runtime gate: `10/10`;
- cross-slice aggregate gate: `10/10`;
- evidence denominator: 157 base reports / 1,955 assertions;
- including aggregate: 158 reports / 1,965 assertions;
- graph: 10,386 nodes / 30,010 edges;
- forged layout/Supply/slots/source, stale model count/data, live zero-model
  state, unavailable composition and all null-Speed reposition routes fail
  closed;
- Ed25519 replay after HMAC rotation and signed-receipt tamper rejection pass;
- no Skill, DSH, MuZero, self-play, memory or training-truth promotion occurred.

Release hashes:

- slice: `26a3b14ee8d24a3c0ec6a85581194f902913ce5c9fecf012fb98b867e42f459a`
- catalogue: `c3a18341468a9ff2936321fb71fac7105eafb8b31d6899af937a937f24f0208f`
- runtime: `80867a2d2074171b014d08f0bad820a3bfd812d268a5588fda253a474f28b51d`
- graph: `8d19eb21e3883f734aa2104c0c28eb763b6b2c57db1348523132b02673fab8cb`
- route v2: `3b0f0b0a75d6a07b807a037941c1246736a69b35b8898ec7309295316bacacc2`

## Next Slice

Slice 94 contains seven exact atoms for round/phase order and alternating Unit
activation: phase order, round limit and summary, alternating phases, one Phase
Action per activation, on-table action choice and general Unit alternation. Its
target is `690 executable / 222 review / 114 display-only`; the source lock
remains unchanged unless the user explicitly requests a refresh.
