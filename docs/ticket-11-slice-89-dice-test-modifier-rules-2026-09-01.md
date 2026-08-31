# Ticket 11B Slice 89 — Dice, Test and Modifier Rules

## Outcome

Slice 89 promotes the exact 18-atom route-v2 assignment for rerolls, tests,
generated values, target-number modifiers, Buffs, Debuffs and invalid physical
dice.

The catalogue moves from `627 executable / 285 review / 114 display-only` to
`645 / 267 / 114`. The runtime now declares 58 complete executor state
contracts. Slices 90–111 remain: 22 slices and 267 actionable atoms.

## Official Source Boundary

No source refresh occurred. The slice consumes the sealed development-tranche
lock `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`,
snapshot `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`,
dataset `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`,
and versions `71 / 69 / 48`.

The data bundle binds Core PDF
`27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`
and the exact current official Part 3 and Part 11 prose records. Its bundle hash
is `5355db89e528752c5f184471fc7f3000bc697edd9b2a04648bc2052615d2d972`.
Missing or mismatched identities fail closed; repository fallback and silent
compatibility remain disabled.

## Executable Semantics

- A rules-owned modifier registry applies target-number changes before a roll.
  Positive modifiers and Buffs reduce the target number; negative modifiers
  and Debuffs increase it. The final target number is clamped to `2+..6+`.
- Different named sources are cumulative. Repeated implicit use of one named
  source is rejected unless a future explicit rule owns that stacking carrier.
- `Null` means the tested capability cannot be rolled or gained through a
  modifier.
- Characteristic and Attribute tests are classified separately and resolve as
  base target, modifiers, roll, then threshold. Natural boundaries remain
  visible in the result.
- Rerolls default to one die unless the granting rule specifies more. The
  rerolled result replaces the original even when it is worse.
- Reroll choice is a two-stage Authority procedure. The first confirmed action
  commits the initial chance result and opens a pending choice; a later
  confirmed keep/reroll action owns an independent chance commitment and
  settles the result.
- `D3+1` and comparable fixed additions generate a value. They are neither a
  test nor a target-number modifier.
- Players can record a pregame physical-die agreement; cocked or otherwise
  invalid physical dice are replaced. Digital referee dice cannot be cocked,
  so the runtime does not invent that state.

Client-supplied modifier totals, reroll results, generated values, validity
truth and test outcomes are not authoritative.

## Evidence

- focused Slice 89 Judge: `49/49`;
- executable runtime gate: `10/10`;
- cross-slice aggregate gate: `10/10`;
- evidence denominator: 153 base reports / 1,782 assertions;
- including aggregate: 154 reports / 1,792 assertions;
- graph: 10,052 nodes / 29,464 edges;
- source, modifier registry, pending reroll choice, chance commitment and signed
  receipt tampering are rejected;
- historical rules display and Slice 88 runtime identity are retained;
- no Skill, DSH, MuZero, self-play, memory or training-truth promotion occurred.

Hashes:

- slice: `ea7f1b10b07f8eee0f312e805bfb20bcf34da73e647f57424a3be3a8ff78b632`
- catalogue: `af887ff1952ec3076ef74a087b983ef94c743b119d76d714b255184de3cb1a8f`
- runtime: `81fce5be2083d1c54375f1c358b7c2653b7c62af6226c9dc5808616c8b828df4`
- graph: `9e9b4898c1aaa2fe0cbcefd1c8522b828871ee5d8543962b4217f3e31cbd0dc6`
- route v2: `3b0f0b0a75d6a07b807a037941c1246736a69b35b8898ec7309295316bacacc2`

## Next Slice

Slice 90 contains 13 exact atoms for Keyword and Special Ability primitives,
non-stacking, targeting structure and Repeatable. Its target is
`658 executable / 254 review / 114 display-only`.
