# Ticket 11B Slice 90 — Keyword and Special Ability Primitives

## Outcome

Slice 90 promotes the exact 13-atom route-v2 assignment for Keyword format,
stable meaning, non-stacking, numeric-highest behavior, Special Ability
definition/category/target structure, same-name non-stacking and Repeatable.

The catalogue moves from `645 executable / 267 review / 114 display-only` to
`658 / 254 / 114`. The runtime now declares 59 complete executor state
contracts. Slices 91–111 remain: 21 slices and 254 actionable atoms.

## Official Source Boundary

No source refresh occurred. The slice consumes the sealed development-tranche
lock `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`,
snapshot `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`,
dataset `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`,
and versions `71 / 69 / 48`.

The data bundle binds Core PDF
`27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`
and the exact current official Part 2, Part 10 and Part 11 records. It compiles
76 glossary definitions and 201 Special Ability instances: 132 Unit, 55
Tactical Card and 14 Faction Card abilities. The index contains 139 unique
names, 30 duplicate-name groups, two cross-category name conflicts and nine
groups with different definitions. Its bundle hash is
`56eab090bb733a07d22ea950f2ef215f8279889e1c414c7b7ffc5407c4814216`.

## Executable Semantics

- Keyword uses must reference the official registry and use canonical bold
  capitals. Clients cannot replace a Keyword's meaning.
- Identical Keywords do not stack. A numeric Keyword group selects only the
  highest value; it does not add the values together.
- Every indexed Special Ability is classified from its official source marker
  as Active, Passive or Reaction. Detailed timing/priority remains Slice 91.
- A targeted ability delegates target range and line of sight to the existing
  target/LoS primitives. An untargeted ability is LoS-exempt unless a specific
  rule says otherwise. Placing a Token or Marker is not targeting a Unit and
  does not itself require LoS.
- Simultaneous identical-definition abilities with the same name apply once.
  If the same name maps to different official definitions, the kernel fails
  closed instead of silently selecting an effect.
- Repeatable is derived from the frozen official ability text, not a client
  flag. The current index has one such ability, Jim Raynor's `Orders`.
  Repeatable bypasses the ordinary once-per-round frequency limit and permits
  multiple uses in one Activation, but every use must still pay its Cost and
  satisfy its trigger.

The executor exposes only complete rules-owned candidate plans through
`createEnvelope → legalSpace → preview → confirm → apply → replay` and writes a
bounded resolution, history entry and event. It does not execute an individual
card's downstream effect.

## Evidence

- focused Slice 90 Judge: `45/45`;
- executable runtime gate: `10/10`;
- cross-slice aggregate gate: `10/10`;
- evidence denominator: 154 base reports / 1,827 assertions;
- including aggregate: 155 reports / 1,837 assertions;
- graph: 10,158 nodes / 29,632 edges;
- source, meaning, category, targeting, Repeatable, pending state, data binding
  and signed receipt tampering fail closed;
- historical rules display and Slice 89 runtime identity are retained;
- no Skill, DSH, MuZero, self-play, memory or training-truth promotion occurred.

Hashes:

- slice: `5fcfee2fde6d7105d740e5e74ab30349c33e6289cd67d20b5bdcc51a5bcbe28c`
- catalogue: `943326ae944165e7c210271e65ddb560f456eb491b45c7533b71047c8752f3ab`
- runtime: `a4fa8535bdc155f645cc1fe1fecf645794c493f7a566500a9543726473067916`
- graph: `5af8ec1d93af676de95ca0182db62c313fc1acc4f4aacc325288aae22f3b8c59`
- route v2: `3b0f0b0a75d6a07b807a037941c1246736a69b35b8898ec7309295316bacacc2`

## Next Slice

Slice 91 contains the next exact 6 atoms for Passive/Reaction timing,
simultaneous-effect priority and end-of-round ordering. Its target is
`664 executable / 248 review / 114 display-only`.
