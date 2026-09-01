# Ticket 11B Slice 104 — Unit composition and Upgrade rules

Date: 2026-09-01
Rule vertical: 94/101
Route-v2 assignment: 16 atoms
Source refresh: not performed

## Outcome

Slice 104 promotes the exact unit-composition, starting-model, starting-Supply,
Army-Slot occupancy, Upgrade-purchase, Unit-wide and Specialist group. The
catalogue advances from `804/108/114` to `820/92/114`, uses 73 declared state
contract executors, and advances the current action schema from
`hybrid_legal_space_v41` to `hybrid_legal_space_v42`.

The executable procedures are:

1. `unit_composition_selection`: select exactly one listed Composition Option,
   then derive its exact model count, model identity denominator, starting
   Supply, occupied Army Slots and current Mineral Cost.
2. `unit_upgrade_selection`: select a complete set of distinct Part 12-listed
   Upgrade entries. Unit-wide entries apply to every starting model;
   `SPECIALIST` entries require exactly one nominated starting model, and
   different Specialist entries require different models.
3. `complete_army_composition_upgrade_audit`: derive all Unit and Upgrade
   budget rows, then reuse the frozen Slice 102 Faction/Army-Slot audit and
   Slice 103 resource-budget arithmetic to close full fielding legality.

The client may choose stable instance/model identifiers, but it cannot author
model counts, Supply, occupied slots, Mineral costs or Upgrade application.
Unit equipment/list disclosure is not claimed here and remains Slice 105.

## Fixed official denominator

The unchanged development-tranche capture remains pinned to:

- source lock: `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`
- snapshot: `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`
- normalized dataset: `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`
- versions: Units `71`, Cards `69`, Rules `48`
- Core PDF: `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54`

Part 12.10 is parsed as a strict structured denominator and reconciled against
the current Unit records and the frozen Slice 103 price index. It contains:

- 22 fieldable Unit entries;
- 28 Composition Options;
- 52 actually purchasable Upgrade entries;
- 2 Specialist entries and 50 Unit-wide entries;
- 8 current-product replacement links;
- 1 zero-cost purchasable Upgrade.

The current Unit records contain 171 total Upgrade-side definitions. Those
include base weapons and inherent abilities, so they are not treated as 171
purchasable entries. Only the 52 rows listed under Part 12.10 are purchasable.

## Explicit official-data conflicts

Two same-capture composition prices disagree between Part 12 and the current
Unit records:

| Unit | current Unit record | Part 12 value | executable disposition |
|---|---:|---:|---|
| Corpser (Roach) | 240 | 250 | current record wins; Part 12 value retained |
| Jim Raynor | 250 | 230 | current record wins; Part 12 value retained |

There is also one replacement-link discrepancy: Marine `Bayonet` links to
`Strike` in the current product record while its Part 12 Type cell is `-`.
The link remains source-bound reconciliation metadata. None of these conflicts
is silently erased or used to mutate Slice 103.

## Atom assignment

The exact route atoms are:

- `rule-atom:singleton:core-12-10-composition-option-effects:2ff8639c4d1d`
- `rule-atom:singleton:core-12-10-select-one-composition-option:69ee83be80eb`
- `rule-atom:singleton:core-12-10-upgrade-cost-listing:a43c9551b89c`
- `rule-atom:singleton:core-12-10-upgrade-unit-wide-default:4d82cdad8e53`
- `rule-atom:singleton:core-2-2-composition-card-count:9d8508d77bd4`
- `rule-atom:singleton:core-9-1-6-composition-cost-cross-reference:a2f03ae6d09b`
- `rule-atom:singleton:core-9-1-6-composition-option-cost-model-count:0955034b0cd8`
- `rule-atom:singleton:core-9-1-6-composition-option-selection:5dbd74dac335`
- `rule-atom:singleton:core-9-1-6-composition-options-cross-reference:70ef929290b3`
- `rule-atom:singleton:core-9-1-6-eligible-unit-slot-fill:cc0a84fa8c36`
- `rule-atom:singleton:core-9-1-6-mineral-cost-payment:e6d68b526a77`
- `rule-atom:starting-supply-slot-cost`
- `rule-atom:singleton:core-9-1-6-unlisted-model-count-forbidden:5a9ecd7d1c49`
- `rule-atom:singleton:core-9-1-7-distinct-upgrade-entry-limit:b0770ffd1c23`
- `rule-atom:singleton:core-9-1-7-upgrade-list-source:f78665cffca8`
- `rule-atom:singleton:core-9-1-7-upgrade-purchase-and-cost:d799dafd888c`

Route-v2 hash remains
`3b0f0b0a75d6a07b807a037941c1246736a69b35b8898ec7309295316bacacc2`.

## Frozen identities and evidence

- data bundle: `c7d27c66a0a21940e0d61a54f091ea7be8f23266891cca0da3c1cfeb77234c9c`
- slice: `bece09d6009e4333d09da55d074a902d6947f332d70553162dfe891a79feae2b`
- catalogue: `3f27ca38e77fd53a9ea83e47c5f7075a65c3e980519efff878aa8b653c894f7c`
- runtime: `634bcc281480f6bcb297b940b295e18a3e2324e3a12dc58162455243d548f738`
- relationship graph: `e01a17de3f934efa28ae239aa3b2dbbd7c234b37bf6a6ddab418a552d499c82b`
- graph size: 11,514 nodes / 32,245 edges

Gates:

- Slice 104 focused: `56/56`
- frozen Slice 103 regression: `52/52`
- current executable runtime: `10/10`
- aggregate: `10/10`
- evidence denominator: 168 base reports / 2,485 assertions; including the
  aggregate, 169 reports / 2,495 assertions

Receipts keep content hashes, Ed25519 permanent signatures and HMAC short
seals. Signed replay passes after HMAC rotation and rejects tampering. Slice
103 and every earlier executor/hash/rules display remain frozen and readable.

No Skill was generated or promoted. DSH, MuZero, self-play, memory promotion,
training promotion and source refresh were not run.

## Remaining route

Slices 105–111 contain seven slices and 92 actionable atoms. Slice 105 owns the
next 13 atoms: team rosters, open/closed lists, equipment representation,
disclosure and inspection. Its target is `833/79/114`.
