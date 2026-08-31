# Ticket 11B — Slices 86–111 exact route v2 audit

## Outcome

The remaining RuleAtom route is now an executable, content-hashed planning contract rather than a prose-only count table.

- Base Slice85 catalogue: `216398a685146230140a56481dd031dff9f7c9f3f3a650b94165701a9e966e1f`.
- Current denominator: `578` executable, `334` review-required, `114` display-only.
- Remaining assignments: `334/334` review-required atoms across contiguous Slices86–111.
- Partition errors: zero missing, zero duplicate, zero unknown IDs.
- Projected endpoint: `912` executable, zero review-required, `114` retained display-only.
- Route hash: `3b0f0b0a75d6a07b807a037941c1246736a69b35b8898ec7309295316bacacc2`.

## Why v2 was required

The old roadmap stored a cluster title and atom count for each slice but no exact ID manifest. Slice85 then proved that five Flying-cover atoms had been counted in both Slice83 and Slice85. Once those duplicates were removed, the prose table closed only `329/334` current review atoms and could not identify omissions mechanically.

The v2 route resolves the exact current review set in a deterministic source/order projection bound to the Slice85 catalogue hash, emits the exact atom IDs for each slice, and hashes the full resolved partition. A catalogue change, missing ID, duplicate assignment, reordered responsibility, or count drift invalidates the contract.

## Recovered five-atom debt

The full source/title/dependency audit recovered these review-required atoms that were not represented by the old exact counts:

1. `rule-atom:singleton:core-11-leading-model-gap-clearance:16a27136f699`
2. `rule-atom:singleton:core-11-leading-model-nomination-duration:79d886f8c086`
3. `rule-atom:singleton:core-11-size-zero-one-terrain-pass:9899398e5428`
4. `rule-atom:singleton:core-8-5-3-gap-clearance-reference:dcfe3acc7ac7`
5. `rule-atom:singleton:core-8-5-3-ramp-movement:058a7cee7079`

The four terrain/Gap atoms join Slice86. Leading Model nomination duration joins Slice87 with general model/base geometry. Constructing the exact partition also moved a small number of already-planned atoms between later semantic clusters; all changed counts are visible in the roadmap and route contract.

## Corrected remaining counts

| Slices | Atom counts |
| --- | --- |
| 86–91 | `13, 21, 15, 18, 13, 6` |
| 92–97 | `7, 12, 7, 5, 17, 5` |
| 98–103 | `12, 18, 13, 9, 24, 11` |
| 104–109 | `16, 13, 21, 12, 17, 11` |
| 110–111 | `14, 4` |

Slice86 therefore owns exactly 13 current review atoms and projects the ledger from `578/334/114` to `591/321/114`.

## Verification and authority boundary

`node scripts/verify-official-remaining-rule-atom-route-v2.mjs` passes `10/10`. It verifies the frozen catalogue/source identity, all 26 contiguous slices, exact `334/334` coverage, the recovered debt IDs, Slice86's 13-atom denominator, final `912/0`, content tamper rejection, catalogue-drift rejection, and frozen Slice85 hashes.

This artifact plans future executable work only. It does not change RuleAtom dispositions, register an executor, grant Rules truth, refresh official data, generate a Skill, run DSH, or create MuZero/self-play/memory/training truth. Every slice must still close its own LegalSpace, Apply, Judge, state contract, Authority replay, relationship graph, and regression gates.
