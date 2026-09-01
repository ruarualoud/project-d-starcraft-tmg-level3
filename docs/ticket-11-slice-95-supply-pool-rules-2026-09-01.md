# Ticket 11B Slice 95 — Supply Pool Rules

## Outcome

Slice 95 promotes the exact five-atom route-v2 assignment for Supply Pool
capacity, Round 1 Supply, casualty Supply release, the Deployment Card
cross-reference and Movement-start Available Supply verification.

The catalogue moves from `690 executable / 222 review / 114 display-only` to
`695 / 217 / 114`. The runtime declares 64 complete executor state contracts.
Slices 96–111 remain: 16 slices and 217 actionable atoms.

## Promoted Atoms

- `rule-atom:singleton:core-8-3-1-round-one-supply:f897849a6c55`
- `rule-atom:singleton:core-8-3-2-casualties-free-supply:57d92ec7fddd`
- `rule-atom:singleton:core-8-3-3-deployment-card-cross-reference:f06e7aa2baa1`
- `rule-atom:singleton:core-8-4-available-supply-verification:d2772be00ae6`
- `rule-atom:supply-pool-capacity-definition`

## Official Source Boundary

No source refresh occurred. The slice uses sealed lock
`1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`,
snapshot `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`,
dataset `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`
and versions `71 / 69 / 48`.

`official-supply-pool-data-bundle-v1` binds five exact current Core Part 8
clause hashes, Hold Position mission record
`faction_cards:mission_hold_position`, and GAUNTLET deployment record
`faction_cards:2NdngLtIeZAprsWr25hM`. Hold Position starts at Supply 6;
GAUNTLET's influence-zone depth is six inches. The bundle hash is
`e9f2a25ff034f398cc3c59a4357cc51f47ada04dd5f29cbdb95d18b801ca2a2a`.
Repository fallback and data refresh are both forbidden.

## Executable Semantics

- In Round 1, both players' Supply Pool capacity equals the Mission Card's
  starting Supply. Client-supplied capacity and later-round values fail this
  bounded primitive closed.
- Available Supply is recalculated as capacity minus the current Supply of
  friendly Units on the battlefield. Reserve Units are reported but do not
  consume the on-table pool.
- Every Unit's current Supply is recalculated from the frozen official Unit
  profile and current model count; client-provided Supply values and incomplete
  Unit denominators are rejected.
- A casualty releases exactly the current-Supply tier delta. Losses within one
  Supply tier release zero; destruction releases the destroyed Unit's full
  current Supply. Unrelated Unit drift invalidates the certificate.
- The Deployment Card reference resolves GAUNTLET's official zone depth, entry
  edges and geometry hash. Concrete arrival legality remains owned by the
  frozen Reserve Deploy executor.
- Existing executable Available-Supply formula and reserve-fielding eligibility
  atoms are explicit dependencies. Existing Start-of-Round, Reserve Deploy,
  Disengage and Unit-card Supply executors are frozen consumers, not silently
  rewritten implementations.
- The slice does not claim a complete later-round Supply lifecycle. Existing
  later-round escalation, final-round unlimited Supply and on-table cap atoms
  remain separately versioned.

`authority.supply-pool-rules-v1@1.0.0` exposes Rules-owned capacity,
availability, casualty-release and deployment-reference certificates through
`createEnvelope → legalSpace → preview → confirm → apply → replay` under action
schema `hybrid_legal_space_v33`. Slice 94 remains frozen on v32.

## Relationship Graph

The new scope connects the official Part 8, Mission and Deployment sources to
Round 1 capacity, exact current Unit Supply, on-table usage, Available Supply,
casualty release, reserve fielding eligibility and Deployment Card geometry.
It then records the frozen Start-of-Round, Reserve Deploy, Disengage and
Unit-card Supply consumers. Removing the capacity-to-Available-Supply edge
fails the declared scope. The graph remains audit evidence, not another Rules
authority.

## Evidence

- focused Slice 95 Judge: `42/42`;
- Slice 94 frozen regression: `39/39`;
- executable runtime gate: `10/10`;
- cross-slice aggregate gate: `10/10`;
- evidence denominator: 159 base reports / 2,036 assertions;
- including aggregate: 160 reports / 2,046 assertions;
- graph: 10,500 nodes / 30,252 edges;
- Ed25519 replay after HMAC rotation and signed-receipt tamper rejection pass;
- no Skill, DSH, MuZero, self-play, memory or training-truth promotion occurred.

Release hashes:

- slice: `0ffaf84c0ace83427c45949c029fb20c3432f220adbefdf94bd9be056edd89ed`
- catalogue: `d17e6d39f9c3c7f10afef4185abdccb586e1a7af2657833c492c8f060562e67f`
- runtime: `d6e9fafe69135694c925ac726ff2d7a1dd8523964a7d96a04cb34aa146745ed4`
- graph: `cf8d9aaf3778ca1033f164053b846be372c82bf68d8e81e283a86e1da749f0c6`
- route v2: `3b0f0b0a75d6a07b807a037941c1246736a69b35b8898ec7309295316bacacc2`

## Next Slice

Slice 96 contains 17 exact atoms for reserve definition/initial state,
retained loadout/equipment/damage/activation/timed effects, Supply release,
targeting restrictions, return and redeployment, post-arrival influence zone,
and final-round reserve destruction. Its target is
`712 executable / 200 review / 114 display-only`; the source lock remains
unchanged unless the user explicitly requests a refresh.
