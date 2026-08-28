# Official Reserve Deploy source review — 2026-08-25

## Decision

Slice 18 executes only the exact Standard `GAUNTLET` + `Marine` Reserve Deploy subset. It uses the current official Command Center for product identity, deployment image, Marine Speed and Supply; the latest official Terran P2P (May 2026 v1.0, page 1) supplies the 32mm Marine base field that Command Center does not expose. Repository data is not a fallback.

## Frozen source identities

- Core Rules English: SHA-256 `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`; reviewed sections 2.3, 4.1–4.4, 5.1, 5.6, 8.3–8.5.5, 11 and 12.3.
- Current Command Center snapshot: versions `units=71`, `cards=69`, `rules=48`; snapshot `c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61`; normalized dataset `38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63`.
- GAUNTLET deployment record: `faction_cards:2NdngLtIeZAprsWr25hM`; source-record hash `c6fd3d817a42fb58bdce7d23c3595061f159c3287febbe2221fcd884b6550aa0`; current front-image SHA-256 `1ac74d299c875267d62da7f42bae736a24767425f2ca71726be23d83b3d20fcb`.
- Marine record: `army_units:marine`; source-record hash `682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215`; official Speed `4/7`.
- Terran P2P English, May 2026 v1.0: SHA-256 `afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c`; Marine page 1; base `32mm`.

The verifier downloads the current Command Center GAUNTLET image and checks its bytes against the reviewed image hash. A finite three-attempt network retry is operational only: failure to obtain or match the current official bytes still fails closed.

## Executable interpretation

- Standard battlefield: 54×36 inches.
- Red Entry Edge: north full edge; Blue Entry Edge: south full edge.
- Opponent Zone of Influence: six inches inward from the opponent's Entry Edge.
- A Reserve Unit may deploy during Movement only when its Current Supply does not exceed Available Supply.
- The nominated Leading Model starts touching the assigned Entry Edge outside the battlefield, enters first, and follows a standard-move path no longer than the applicable Speed.
- Remaining models are placed in order, wholly on the battlefield and in direct unblocked coherency with the Leading Model for this bounded no-terrain subset.
- Bases may not overlap; final models may not be within enemy engagement range or the opponent Zone of Influence.
- Apply moves the Unit from Reserve to battlefield, removes Stationary, marks Movement activated, recomputes the round Supply ledger, and settles alternating activation.

## Deliberate exclusions

The slice rejects terrain, Access Points, tokens/effect markers, non-round or non-32mm bases, units other than the current Marine, deployments other than the current GAUNTLET, selected upgrades, special deployment abilities, obstacle-dependent coherency chains and Round 1 setup. Those cases remain `review_required`; this source review grants no production, Skill, DSH, MuZero, memory or training authority.

