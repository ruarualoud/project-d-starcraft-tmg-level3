# Ticket 11B Slice 100 — Summon / Summoned Unit rules

Date: 2026-09-01
Rule vertical: 90/101
Route assignment: 13 exact atoms
Result: `760 executable / 152 review-required / 114 display-only`

## Scope closed

This slice promotes the fixed route-v2 Summon/Summoned Unit group without
refreshing official data. The sealed `71/69/48` development-tranche lock remains
the sole current-data input and repository fallback remains disabled.

The source bundle pins all 13 Core 9.1.9 and Part 11 clause, source-text, and
candidate-sequence hashes. It proves the complete current Summoned Unit
denominator is Roachling, Point Defense Drone, and Pylon. All three have Mineral
Cost 0, source type `Other`, no army-building slot, and current Supply 0 for
every applicable printed model-count tier.

Only Corpser (Roach) `Roachling Infestation` currently invokes the generic
`SUMMON (Roachling)` rule with a Parent Unit. Khalai `Pylon Warp-In` and Raynor's
Raiders `Rapid Ingress` are also valid Special-Ability-only ways to field
Summoned Units, but each has its own printed placement and lifecycle text. The
bundle records those as distinct definitions and does not silently apply Parent
contact, Parent-linked activation, one-inch separation, or Zone of Influence
rules from generic `SUMMON` to either card.

## Executable behavior

- Summoned Units are excluded from army lists and Army Slots, do not start in
  Reserves, cannot use regular deployment, and may enter only through a
  Special Ability that explicitly fields them.
- The generic current `SUMMON` transition requires a content-hashed resolved
  `Roachling Infestation` event from the exact current Corpser (Roach) parent.
  No invented carrier or caller-provided ability truth is accepted.
- Current Supply is recalculated from the summoned Unit's official Supply
  Profile and current model count. Existing friendly on-table Supply is also
  recalculated from exact current profiles; the rules derive finite or final-
  round-unlimited capacity and reject an over-cap transition. Roachling's
  current printed value is 0, but it still passes through the same certificate.
- The Leading Model must be in exact base-to-base contact with a nominated
  Parent model. Every remaining model is included in the placement denominator,
  stays on the battlefield without overlap, is connected by valid Coherency
  Links, and is Wholly Within 3 inches of the Leading Model.
- Every summoned base must remain outside every Enemy Unit's Engagement Range
  and wholly outside the opponent's six-inch Zone of Influence. The check uses
  exact official round/rectangular base footprints, battlefield geometry, and
  the sealed deployment color assignment rather than UI booleans.
- Apply writes the rules-derived positions, `isSummoned` identity, Parent link,
  Special Ability event hash, non-Reserve location, exact Current Supply, and an
  Activation Marker for the summoning Phase.
- A Unit cannot activate in the Phase in which it was summoned. In later
  Phases, a hash-bound Parent activation-end event requires it to activate
  immediately before the opponent's next activation. When its Parent is absent
  from the battlefield, it uses the normal activation route.
- Once on the battlefield it is Friendly for rule purposes, remains outside
  the Reserve system, counts its Current Supply toward Total Current Supply,
  and is excluded from Final Score.

## Runtime and relationship closure

`authority.summon-rules-v1@1.0.0` is executor 69. Its six procedures cover
classification, Supply, placement, deployment, activation, and cross-system
relationships through the rules-owned Pending → LegalSpace → confirmation →
Apply contract. Source/data identity, the complete piece/model denominator,
Special Ability and Parent activation events, placement geometry, Supply,
state projection, action lineage, and mutation are content-hash bound.
Authority action schema advances from v37 to v38 only when this executor is
present.

The relationship extension connects all 13 atoms to Unit-card Supply,
Supply-Pool capacity, exact model-base geometry, Mission/deployment colors,
Reserve lifecycle, regular Deploy, alternating activation, and Final Score.
Those existing executors remain frozen; composition is explicit and no old
runtime or historical rules display is rewritten. The audited graph is valid at
11,033 nodes and 31,368 edges with 69/69 declared state contracts.

## Frozen identities

- Slice: `2005882bda4e1b8872bdf1f544b08a75d73c94ec1b0f106d431a5c647e860227`
- Catalogue: `c2c12a4878d15d12c3fc50ffbd30c3761745280eef240a7f6a242db74725c73c`
- Runtime: `b09612c0d0978fee0e28782f0a64af0bc527375714d957f62a80388739aacd63`
- Relationship graph: `65ecafb810cecd133e7be8602615649c2d83a4684dd292503979cdd1899524d9`
- Data bundle: `f41075d8318df9b10249e1fa8912f9d6c0497179f0ce45b0cf54026c2915939b`

## Gates

- Slice 100 focused verifier: `52/52`
- Slice 99 historical regression: `52/52`
- Current executable runtime: `10/10`
- Ticket 11 foundation aggregate: `10/10`
- Evidence denominator: 164 base reports / 2,275 assertions; 165 reports /
  2,285 assertions including the aggregate
- Ed25519 receipt replay after HMAC seal rotation passes; tampering is rejected

No Skill was generated or promoted, DSH was not run, and no MuZero, self-play,
memory, or training truth was produced.

## Next fixed slice

Slice 101 is the exact nine-atom Respawn/Morph placement, Supply, and activation
lifecycle group. Its target is
`769 executable / 143 review-required / 114 display-only`.
