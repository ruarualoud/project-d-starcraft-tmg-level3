# Ticket 27 / Slices 267–268 — Roster foundation v1

Date: 2026-09-22. Status: in progress.
Slice manifest: `.agent-runtime/slice.json`
(`ticket-27-slices-267-268-roster-foundation`).
Roadmap: `docs/ticket-27-slices-267-272-roster-strategist-roadmap-v1-2026-09-21.md`.

## Frozen sub-slices

Numbering is frozen before implementation; one scoped commit per completed
sub-slice.

| Sub-slice | Deliverable | Write scope |
| --- | --- | --- |
| 267.1 | Versioned, hash-bound `RosterPlan` public contract module: provenance, legal/illegal/unknown roster candidates, comparisons, score route + VP schedule, loss/resource budget, component purposes, deployment/activation/reinforcement concept, opponent archetype hypotheses, counter-responses, invalidation triggers, revision events, probability/spatial/math/simulation receipt references, and the explicit preset-roster `planStatus=no_pregame_plan` factory. No fabricated plan content and no hidden chain-of-thought. | `packages/roster-strategist/roster-plan-contracts-v1.mjs` |
| 268.1 | Read-only Army Builder query port delegating all faction/scale/budget/card/composition/upgrade/Specialist legality to the existing Rules-owned kernels (`official-unit-composition-upgrade-rules-kernel-v1` over the official data bundle, which itself composes the army-resource-budget and faction-army-eligibility kernels). Bounded legal candidate choice enumeration and typed immutable rejection receipts. No rule reimplementation, no silent repair, no fallback, no source refresh. | `packages/roster-strategist/army-builder-query-port-v1.mjs` |
| 268.2 | Focused verifier: contract round-trip/authority-boundary checks (267) and exact parity against the fixed Standard-2000 Terran/Zerg acceptance rosters plus representative wrong-faction, over-budget, bad composition/upgrade and Specialist assignment counterexamples (268). Run at most once after the final relevant code change. | `scripts/verify-ticket-27-slices-267-268-roster-foundation-v1.mjs` |
| Closure | Receipts, denominators, hash records, honest gaps and zero-cost accounting. | this document |

## Authorities read (not modified)

- `packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs`
  (22 unit references, 28 composition options, 52 purchasable upgrades,
  2 Specialist upgrades — both on `army_units:marine`: `AGG-12`,
  `Rocket Launcher`).
- `packages/rule-atoms/official-unit-composition-upgrade-rules-kernel-v1.mjs`
  and `official-unit-composition-upgrade-rules-executor-v1.mjs`.
- `packages/rule-atoms/official-army-resource-budget-rules-kernel-v1.mjs` and
  `packages/rule-atoms/official-faction-army-eligibility-rules-kernel-v1.mjs`.
- `packages/product-composition/official-standard-room-factory-v1.mjs`
  (`OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1`, `buildOfficialRoomArmyAuditV1`).
- `packages/source-data/official-development-tranche-source-lock-v1.mjs`
  (dataset pinned at rules `48` / units `71` / cards `69`).

## Receipts

Pending implementation.
