# Ticket 11B Slice 92 — Card Build and Ability Payment Rules

## Outcome

Slice 92 promotes the exact seven-atom route-v2 assignment for Faction and
Tactical Card names/layout, Tactical Card Faction Tags and Army slots,
Vespene-Gas purchase, the Unique single-copy limit, and loss of excess
CP/BM/PE generated while paying an ability Cost.

The catalogue moves from `664 executable / 248 review / 114 display-only` to
`671 / 241 / 114`. The runtime declares 61 complete executor state contracts.
Slices 93–111 remain: 19 slices and 241 actionable atoms.

## Official Source Boundary

No source refresh occurred. The slice uses sealed lock
`1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`,
snapshot `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`,
dataset `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`
and versions `71 / 69 / 48`.

`official-card-build-payment-data-bundle-v1` binds Core Parts 5, 9 and 10,
nine exact clause hashes and all 37 current official Faction/Tactical records:
6 Faction, 31 Tactical, 26 Unique and 11 non-Unique. Its profile compiler
resolves Race and Sub-Faction relationships before deriving CP/BM/PE. Thus
Malignant Creep's source value `Kerrigan's Swarm` resolves to the complete
tags `Zerg + Kerrigan's Swarm` and BM, rather than becoming a fourth race.

Card source index hash:
`65159b2777698f81f014d56947484d170710c042da4b224a42e58e1f8cd1009e`.
Card profile index hash:
`5c363f4cc0767ca317c489510623e9b56cb32f3301b005ec294f612f64619f2d`.

## Executable Semantics

- Standard layout is Rules-owned: Card Name, Faction/Tactical type, Unique
  marking, complete Faction Tags, Army slots, exhausted-card resource and
  Special Ability definition hash cannot be replaced by client fields.
- A Tactical Card purchase uses the exact official Vespene Gas cost and adds
  its exact Core/Elite/Support/Air/Hero slots. Full Race/Sub-Faction inclusion
  remains Slice 102; the complete army Vespene budget and open pregame card
  information remain Slice 103.
- A complete army-card instance set rejects more than one copy of any official
  Unique card, for both Faction and Tactical Cards. Non-Unique duplicates are
  allowed. Exactly-one-Faction-Card validation remains Slice 102.
- Ability payment accepts a complete selected set of Ready cards whose
  official resource type matches CP, BM or PE. Their official values must meet
  the full Cost. Generated value above the Cost is lost immediately, the
  retained balance is zero, and it cannot pay another ability. The certificate
  marks selected cards for exhaustion but does not execute the ability effect.

`authority.card-build-payment-rules-v1@1.0.0` exposes these procedures through
`createEnvelope → legalSpace → preview → confirm → apply → replay`. Existing
card and ability executors remain frozen; the new primitive does not silently
change their historical payment behavior.

## Evidence

- focused Slice 92 Judge: `42/42`;
- executable runtime gate: `10/10`;
- cross-slice aggregate gate: `10/10`;
- evidence denominator: 156 base reports / 1,909 assertions;
- including aggregate: 157 reports / 1,919 assertions;
- graph: 10,285 nodes / 29,847 edges;
- forged layout/cost/profile/resource, duplicate Unique, wrong resource type,
  non-Ready card, underpayment, incomplete sets and stale source/data/history
  all fail closed;
- Ed25519 replay after HMAC rotation and signed-receipt tamper rejection pass;
- no Skill, DSH, MuZero, self-play, memory or training-truth promotion occurred.

Hashes:

- slice: `c1bfa98df9199b722b3a279637934e69146654a429fa18b83a3eceab373cc432`
- catalogue: `672759bd456ea330af46131709716b1418d646dd1b9d405a0acce8a7101e4e74`
- runtime: `0d11e5569f1eb6b3e62ac50b1bad9930d30cd7bef8b6db1b4cf39bd2bcf3627d`
- graph: `61c194dce1c9b67e05b67a63722680081f6a434e8fb7ecf0d1e48f859df0007b`
- route v2: `3b0f0b0a75d6a07b807a037941c1246736a69b35b8898ec7309295316bacacc2`

## Next Slice

Slice 93 contains 12 exact atoms for Unit-card Faction Tags and Army-slot
requirements; phase boxes; null Speed; base diameter, Combat Range and Upgrade
side; and Supply Value definitions/projection from current model count. Its
target is `683 executable / 229 review / 114 display-only`; no source refresh
occurs before it.
