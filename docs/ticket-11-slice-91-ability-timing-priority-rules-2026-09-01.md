# Ticket 11B Slice 91 — Ability Timing and Priority Rules

## Outcome

Slice 91 promotes the exact six-atom route-v2 assignment for the Active,
Passive and Reaction comparison table; own and cross-player simultaneous
Passive order; simultaneous Reaction priority; Reaction default duration; and
End of Round effect order.

The catalogue moves from `658 executable / 254 review / 114 display-only` to
`664 / 248 / 114`. The runtime now declares 60 complete executor state
contracts. Slices 92–111 remain: 20 slices and 248 actionable atoms.

## Official Source Boundary

No source refresh occurred. The slice consumes the sealed development-tranche
lock `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`,
snapshot `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`,
dataset `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`,
and versions `71 / 69 / 48`.

The timing bundle binds Core PDF
`27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`,
the exact current official Part 2, Part 8 and Part 10 records, seven exact
clause hashes, the ten-row ability comparison table and Slice 90's official
ability index containing 24 Reaction instances. Its bundle hash is
`5dfb619c9267bf24da857069c0f7fc85b0e85bb06650aa417214638dedc24d2a`.

## Executable Semantics

- The comparison result is Rules-owned and covers use window, activation,
  player choice, frequency, one-Reaction-per-player-per-Activation, interrupt,
  Reserves, duration, simultaneous order and Cost for all three categories.
- For simultaneous Passive effects controlled by one player, that player
  supplies an exact permutation of the complete owned set. Across players,
  every Active Player Passive resolves before the opponent's group.
- When both players react to the same trigger, the Active Player's Reaction
  resolves first and the opponent's second. The certificate requires the
  existing one-Reaction-per-player-per-Activation rule.
- A modifier or ongoing effect created by a Reaction and proven to have no
  specific duration remains effective through all End of Round effects and is
  removed in Cleanup & Refresh. Explicit durations fail closed into the
  individual effect executor. Immediate or permanent rules changes are not
  reinterpreted as duration effects.
- At End of Round, the First Player resolves all their effects first; each
  player chooses the exact order of their own complete effect set. Every entry
  after the first requires the previous effect's full-resolution receipt.

`authority.ability-timing-priority-rules-v1@1.0.0` emits order and duration
certificates through `createEnvelope → legalSpace → preview → confirm → apply →
replay`. It deliberately does not execute arbitrary card effects. Existing End
of Round v1–v5 and Cleanup executors remain byte-frozen and their historical
rules displays remain available.

## Evidence

- focused Slice 91 Judge: `40/40`;
- executable runtime gate: `10/10`;
- cross-slice aggregate gate: `10/10`;
- evidence denominator: 155 base reports / 1,867 assertions;
- including aggregate: 156 reports / 1,877 assertions;
- graph: 10,220 nodes / 29,740 edges;
- incomplete simultaneous sets, forged category/source identity, incomplete
  controller permutations, client expiry and stale source/data/history all fail
  closed;
- Ed25519 replay after HMAC rotation and signed-receipt tamper rejection pass;
- no Skill, DSH, MuZero, self-play, memory or training-truth promotion occurred.

Hashes:

- slice: `57476aacab986ace2b95d8feb2f02444a6578f79222202bac93b9ba2c0aed82c`
- catalogue: `68c339dac82aed07f09c2e376c0efeb14cd8ae91de064b5c66ab99a7f5f86cf7`
- runtime: `1e3b6ff84b0fbe51f6826b3aceb09028459e969a7d03b3c2bd676e8bba8ee21b`
- graph: `6ff76daed0899d49402d5faf20266467bd3f7d68ddb953a61087fb85586937b4`
- route v2: `3b0f0b0a75d6a07b807a037941c1246736a69b35b8898ec7309295316bacacc2`

## Next Slice

Slice 92 contains seven exact atoms for Faction/Tactical Card name/layout,
Faction Tags, Army slots, purchase, the Unique single-copy limit and loss of
excess resources after purchase. Its target is
`671 executable / 241 review / 114 display-only`.
