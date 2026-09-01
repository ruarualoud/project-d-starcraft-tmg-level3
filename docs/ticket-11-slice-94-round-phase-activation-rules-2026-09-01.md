# Ticket 11B Slice 94 — Round, Phase, and Activation Rules

## Outcome

Slice 94 promotes the exact seven-atom route-v2 assignment for the five-round
limit, strict four-phase sequence, alternating activation, one Unit and one
Phase Action per activation, and the Movement Phase battlefield action choice.

The catalogue moves from `683 executable / 229 review / 114 display-only` to
`690 / 222 / 114`. The runtime declares 63 complete executor state contracts.
Slices 95–111 remain: 17 slices and 222 actionable atoms.

## Promoted Atoms

- `rule-atom:general-unit-activation-alternation`
- `rule-atom:one-phase-action-per-activation`
- `rule-atom:singleton:core-12-2-round-phase-summary:b8f6169b9144`
- `rule-atom:singleton:core-8-1-phase-order:e3324f3a077a`
- `rule-atom:singleton:core-8-1-round-limit:f50686cb73d6`
- `rule-atom:singleton:core-8-2-alternating-activation-phases:113115ac121a`
- `rule-atom:singleton:core-8-4-1-on-table-action-choice:8246f987c914`

## Official Source Boundary

No source refresh occurred. The slice uses sealed lock
`1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`,
snapshot `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`,
dataset `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`
and versions `71 / 69 / 48`.

`official-round-phase-activation-data-bundle-v1` binds the frozen current
official Core Part 8 and Part 12 records and seven exact clause hashes. Its
bundle hash is
`5ec715fb439c68753715506e4c499896fab20f0d8f2020c076beb2670d0160e5`.
Repository fallback and data refresh are both forbidden.

## Executable Semantics

- A game has at most five rounds. Each round follows Movement, Assault,
  Combat, then Cleanup & Refresh; round six and client-replaced sequences fail
  closed.
- Movement, Assault and Combat use alternating Unit activation. A completed
  activation binds exactly one eligible Unit and exactly one fully resolved
  Phase Action before the turn can pass to the opponent.
- If the opponent has no remaining activation, the same side may continue; if
  neither side has one, the phase completes. Cleanup is not represented as an
  alternating Unit-activation phase.
- A Unit on the battlefield in Movement receives the official action classes
  Move, Hold Position and Disengage; a reserve Unit receives Deploy. The phase
  menu describes classes only. Existing atomic executors remain the sole
  authority for concrete action legality and transition semantics.
- Assault exposes Ranged Attack, Charge, Run and Hold Position classes;
  Combat exposes Close Combat Attack. This primitive does not claim that the
  remaining 222 atoms or the complete current LegalSpace are executable.

`authority.round-phase-activation-rules-v1@1.0.0` exposes Rules-owned sequence,
phase-menu and turn-order certificates through
`createEnvelope → legalSpace → preview → confirm → apply → replay` under action
schema `hybrid_legal_space_v32`. Slice 93 remains frozen on v31.

## Relationship Graph

The new scope connects official source clauses to maximum-round, phase-order,
phase-menu and activation-turn nodes, then connects the resulting action
classes to the frozen Deploy, Move, Disengage, Hold, Ranged Attack, Charge/Run
family, Combat Pass and initiative consumers. Missing action-to-turn evidence
fails the declared scope. The graph remains audit evidence, not an alternate
rules authority.

## Evidence

- focused Slice 94 Judge: `39/39`;
- Slice 93 frozen regression: `46/46`;
- executable runtime gate: `10/10`;
- cross-slice aggregate gate: `10/10`;
- evidence denominator: 158 base reports / 1,994 assertions;
- including aggregate: 159 reports / 2,004 assertions;
- graph: 10,448 nodes / 30,143 edges;
- Ed25519 replay after HMAC rotation and signed-receipt tamper rejection pass;
- no Skill, DSH, MuZero, self-play, memory or training-truth promotion occurred.

Release hashes:

- slice: `03ccbd8f17669859a0dc3692699c79965a9c692e3d91f6481e2fad4d68186128`
- catalogue: `131c638a31bd8b04e878e1dc0a128e8bda60fcf88071eb615fcd7a331be1b4a1`
- runtime: `f1f9d2e237917d97415cd7222697d736ef55c1abcacdcc540384f5f03706ebe0`
- graph: `9db8a8981c39068ec581fc8e996f731d6b5812a5e7896bd3745071b62793523d`
- route v2: `3b0f0b0a75d6a07b807a037941c1246736a69b35b8898ec7309295316bacacc2`

## Next Slice

Slice 95 contains five exact atoms for Supply Pool capacity, round-one Supply,
casualty Supply release, Deployment Card cross-reference and available-Supply
verification:

- `rule-atom:singleton:core-8-3-1-round-one-supply:f897849a6c55`
- `rule-atom:singleton:core-8-3-2-casualties-free-supply:57d92ec7fddd`
- `rule-atom:singleton:core-8-3-3-deployment-card-cross-reference:f06e7aa2baa1`
- `rule-atom:singleton:core-8-4-available-supply-verification:d2772be00ae6`
- `rule-atom:supply-pool-capacity-definition`

Its target is `695 executable / 217 review / 114 display-only`; the source lock
remains unchanged unless the user explicitly requests a refresh.
