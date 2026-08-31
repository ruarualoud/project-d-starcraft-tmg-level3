# Ticket 11B Slice 88 — Player/Control Relationship Rules

## Outcome

Slice 88 promotes the exact 15-atom route-v2 assignment for Player, Team, Army,
Unit and Model identity; Active/Controlling Player authority; transferred
control; Friendly/Enemy relationships; Friendly attack restrictions; and
specific-over-general rule precedence.

The catalogue moves from `612 executable / 300 review / 114 display-only` to
`627 / 285 / 114`. The runtime now declares 57 complete executor state
contracts. Slices 89–111 remain: 23 slices and 285 actionable atoms.

## Official Source Boundary

No source refresh occurred. The slice consumes the sealed development-tranche
lock `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`,
snapshot `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`,
dataset `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`,
and versions `71 / 69 / 48`.

The data bundle binds the locked official Core PDF and the exact Part 2 and
Part 11 rule-prose records. Missing or mismatched source identities fail closed;
repository fallback and silent compatibility remain disabled.

## Executable Semantics

- A rules-owned registry separates legal ownership from current control for
  Players, Teams, Armies, Units, Models, Tokens and Cards.
- The Active Player is derived from battle state. The Controlling Player owns
  decisions and dice for a controlled Unit.
- Transferred control preserves the legal owner while treating the current
  controller as the effective owner for rules decisions and dice.
- Friendly/Enemy status is evaluated from the requesting player's team, with
  explicit same-Unit and model-within-Unit handling. It supports more than two
  players and arbitrary team membership.
- Friendly Units may use rules on Friendly targets. Enemy targeting and mission
  uses consume the same relationship result.
- The general attack rule rejects Friendly targets. A content-hashed Unit Card,
  Mission Card or Special Ability claim may override Core only when it is an
  explicit contradictory specific rule.
- Equal-specificity claims that disagree fail closed. The client cannot supply
  relationship truth, controller truth or precedence winners.

The executor provides four read-only certified procedures: role authority,
relationship query, attack-target relationship check and rule-precedence query.
This slice evaluates transferred-control state but does not invent a control-
transfer mutation without a locked official carrier; a future ability slice
must own that trigger and transition.

## Evidence

- focused Slice 88 Judge: `35/35`;
- executable runtime gate: `10/10`;
- cross-slice aggregate gate: `10/10`;
- evidence denominator: 152 base reports / 1,733 assertions;
- including aggregate: 153 reports / 1,743 assertions;
- graph: 9,910 nodes / 29,232 edges;
- Ed25519 replay survives HMAC rotation; source, registry, choice and signed-
  receipt tampering are rejected;
- historical rules display and Slice 87 runtime identity are retained;
- no Skill, DSH, MuZero, self-play, memory or training-truth promotion occurred.

Hashes:

- slice: `4798bbe5980a5fafda9ffad856f53327f77422833ce302d2a5f00667bd169987`
- catalogue: `50135173ca657d69fc62cb779cd1f15275d00b89c883ada59b49cd260b7f4536`
- runtime: `b3e9b3984e81b98da204e8fc75b046c6bd4329c8758a0b4063365213d7cd901f`
- graph: `b74c7a91c59e7007e122fb353d877ec58630ccf6934f55739a48fb65a752f494`
- route v2: `3b0f0b0a75d6a07b807a037941c1246736a69b35b8898ec7309295316bacacc2`

## Next Slice

Slice 89 contains 18 exact atoms for dice, re-rolls, tests, generated values,
modifiers, Buffs and Debuffs. Its target is
`645 executable / 267 review / 114 display-only`.
