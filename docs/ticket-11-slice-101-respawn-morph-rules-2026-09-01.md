# Ticket 11B Slice 101 — Respawn / Morph rules

Date: 2026-09-01
Rule vertical: 91/101
Route assignment: 9 exact atoms
Result: `769 executable / 143 review-required / 114 display-only`

## Scope closed

This slice promotes the exact route-v2 Core Part 11 Respawn/Morph group without
refreshing official data. The fixed `71/69/48` development-tranche lock remains
the only current-product input and repository fallback remains disabled.

The source bundle pins all nine clause, source-text, and candidate-sequence
hashes. Its current carrier scan finds exactly one Respawn carrier: Swarmling
(Zergling) `Zergling Reconstitution`, which resolves `RESPAWN (2)` or
`RESPAWN (3)` while the Unit is `ON CREEP`. The current official product data
contains no Morph carrier. The generic Core Morph contract remains executable,
but current LegalSpace cannot invent a source, Unit name, or printed X value.

## Executable behavior

- Respawn accepts only the content-hashed current `Zergling Reconstitution`
  Special Ability event for the exact Swarmling profile.
- The kernel derives X as two or three from the current rules-derived
  `on_creep` keyword. The client cannot supply X or ON CREEP truth.
- Only destroyed models from the complete Unit model denominator may return,
  up to the derived X. Duplicate, live, foreign, or stale model identities fail
  closed.
- Current Supply is resolved from the exact official profile before and after
  the proposed return. A model that would move the Unit into a higher Supply
  bracket cannot return.
- Every returned model uses the official model/base profile, must fit on the
  battlefield without overlap or blocking terrain, must be in Base-to-Base
  contact with a model that already existed in the Unit, and must remain
  outside every Enemy Unit's Engagement Range.
- A legal apply restores only the selected model identities, positions,
  current-model count, destroyed-model ledger, and unchanged Supply bracket.
  It does not accept a client mutation patch.
- Respawn is model return, not Unit return: it requires at least one existing
  model and cannot revive a fully Destroyed Unit. Morph creates a new Unit and
  likewise is not a destroyed-Unit return exception.
- The zero-current-carrier Morph query exposes the complete Core constraints:
  sufficient Available Supply, new-model Base-to-Base contact with the active
  Unit, removal of printed X source models, a separate new Unit, one-inch Enemy
  separation, and an Activation Marker for the remainder of the Round. It
  exposes no current playable Morph action.

## Slice 97 reconciliation

Slice 97 correctly froze the default rule that a Destroyed Unit cannot return
without a specific exception, but its forward note grouped Respawn/Morph as
possible positive return registrations. Exact Part 11 execution now narrows
that boundary: Respawn returns models to a still-live Unit, while Morph creates
a new Unit. Therefore Slice 101 registers the Respawn model-return atom but
registers zero destroyed-Unit return atoms. The Slice 97 bundle and executor
remain byte-frozen and their historical empty registry remains displayable.

## Runtime and relationship closure

`authority.respawn-morph-rules-v1@1.0.0` is executor 70. The action schema
advances from v38 to v39 only when this executor is present. Pending state,
source/data identity, effect event, complete piece/model denominator, Supply,
ON CREEP keyword, placements, rule result, action lineage, and mutation are all
content-hash bound through Pending → LegalSpace → confirmation → Apply.

The graph connects all nine atoms to frozen Unit-card Supply, exact model-base
geometry, status/ON CREEP, destruction lifecycle, and alternating activation
consumers. No prior executor or rules display is rewritten. The audited graph
is valid at 11,114 nodes and 31,535 edges with 70/70 declared state contracts,
zero missing contracts, and zero blocking gaps.

## Frozen identities

- Slice: `7813422ee78075f51c21ce70f1611ab09006ac52a21deea6d9157166d71287e0`
- Catalogue: `1981fd37077e76e6925bf4237f13f105c17755964a1a87c629d62eba3b2568af`
- Runtime: `d3815aa7cc6296bd306bb9c01ea59ffae91d44222f33121367b4ea7e859857c9`
- Relationship graph: `00089711d18266c78b0185b03d137e39dc9d9955c21bf8354348b7799e528764`
- Data bundle: `62b08e278727288a90f9837f9670d86b5e1e4e6b06d225e9e4133bccee79ae47`

## Gates

- Slice 101 focused verifier: `50/50`
- Slice 100 historical regression: `52/52`
- Current executable runtime: `10/10`
- Ticket 11 foundation aggregate: `10/10`
- Evidence denominator: 165 base reports / 2,325 assertions; 166 reports /
  2,335 assertions including the aggregate
- Ed25519 receipt replay after HMAC seal rotation passes; tampering is rejected

No Skill was generated or promoted, DSH was not run, and no MuZero, self-play,
memory, or training truth was produced.

## Next fixed slice

Slice 102 is the exact 24-atom faction/race/sub-faction tags, faction-card
schema, Army Slots, engagement scale, and eligibility group. Its target is
`793 executable / 119 review-required / 114 display-only`.
