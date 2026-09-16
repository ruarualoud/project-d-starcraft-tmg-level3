# Ticket 24 / Slice 253 — Tabletop map adapter v1

Date: 2026-09-16
Status: candidate geometry; Slice 254 compiles authoritative room recipes
Provider usage: none

## Purpose

The adapter assigns each of the 20 map-specific topology records to its default
official engagement-scale battlefield—Skirmish `36 × 36`, Standard `54 × 36`,
or Grand Offensive `72 × 36`—while preserving two independent layers. Rotated
source art keeps its composition. Rules geometry receives a
conservative axis-aligned candidate envelope because the current terrain Rules
kernel does not accept arbitrary rotated rectangles.

The default catalogue distribution is `6 / 9 / 5`, so every size has at least
five maps. The assignment follows cited source-map tile dimensions, with spawn,
route and macro density as documented tie-breakers. Grand Offensive has an
official army-scale table size, but the current mission/deployment-card geometry
bundle covers only Skirmish and Standard; Grand maps therefore expose that task
configuration gap instead of pretending to have an official current card.

## Complete-base clearance contract

The current product base denominator is frozen into every adapter receipt:

- round `32`, `40`, `50`, and `80mm`;
- rectangular `40 × 100mm`.

Lane classes require `1.5`, `2.25`, `4`, `5`, and `6` inches respectively for
small, standard, single-heavy, heavy-turn, and formation/fire-lane movement.
The latter three cover the 100mm long base, its turn envelope, and formation
space instead of validating only a model centre.

Each map promotes at least two topology routes to six-inch fire-lane
candidates. A hard source feature that intrudes a route is handled explicitly:

- if its source group has a portal/ramp on that route, the receipt demands an
  opening for same-elevation blockers or an access point for high ground, at
  least as wide as the lane;
- otherwise its recommended Rules mode becomes passable/difficult, cover, or
  visual-only while its art remains visible;
- a user may restore the hard mode only if Slice 254 can widen, move or reshape
  the compiled Rules footprint and then re-prove clearance.

No source feature is silently deleted, and no generated pixel is measured.

## Authority boundary

The output remains `rulesTruth=tabletop_adaptation_candidate_requires_recipe_compilation`.
It records exact candidate footprints, clearance conflicts and proposed access
points, but it is not yet Room authority. Slice 254 must apply user choices,
restore the official balanced-terrain count/distribution constraints, compile
the final art/rules receipts and freeze them at Room creation.

## Focused gate

The slice gate checks module syntax and only these adapter invariants: 20/20
topology binding, per-scale bounds and at least five maps per size, all 166
element identities retained, two or more
fire-lane candidates per map, no unresolved complete-base lane intrusion, unique
adapter hashes and diff cleanliness. It does not run a match or unrelated
suites.
