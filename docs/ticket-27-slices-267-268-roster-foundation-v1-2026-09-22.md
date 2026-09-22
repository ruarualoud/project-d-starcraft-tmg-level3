# Ticket 27 / Slices 267–268 — Roster foundation v1

Date: 2026-09-22. Status: complete, `2/2` sub-slices (267.1, 268.1) plus the
268.2 verifier and closure receipts.
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

Focused verifier `node scripts/verify-ticket-27-slices-267-268-roster-foundation-v1.mjs`
passed after the final relevant code change (one verifier-counter repair round on
the report denominator keys; no product-code repair). Report schema
`ticket27_slices_267_268_roster_foundation_report_v1`, `ok: true`.

### Denominators

- Slice 267 contract/authority-boundary checks: **32/32**.
- Slice 268 port/parity/counterexample checks: **56/56**.
- Fixed-roster exact parity: **2/2 sides** (Terran `player1`, Zerg `player2`),
  port verdict audit deep-equal to `buildOfficialRoomArmyAuditV1` and
  `resultHash`-identical; each side spends exactly 2000 minerals, vespene ≤ 200.
- Illegal/invalid counterexamples: **11/11** typed immutable receipts with exact
  Rules error codes — wrong faction (`FACTION_TAG_MISMATCH`), over-budget
  (`ARMY_MINERAL_BUDGET_EXCEEDED`), budget over scale
  (`ARMY_MINERAL_BUDGET_EXCEEDS_SCALE`), foreign composition profile
  (`UNIT_COMPOSITION_SOURCE_PROFILE_INVALID`), unlisted model count
  (`UNIT_COMPOSITION_STARTING_MODEL_SET_INVALID`), unknown upgrade profile
  (`PURCHASABLE_UPGRADE_PROFILE_REQUIRED`), cross-unit upgrade
  (`UNIT_PURCHASABLE_UPGRADE_SOURCE_PROFILE_INVALID`), Specialist nomination
  missing (`UNIT_SPECIALIST_MODEL_REQUIRED`), Specialist foreign model
  (`UNIT_SPECIALIST_MODEL_NOT_IN_UNIT`), Specialist model reused
  (`UNIT_SPECIALIST_MODEL_REUSED`), and one typed port addressing rejection
  (`ARMY_BUILDER_CANDIDATE_UNIT_UNKNOWN`, status `invalid_candidate`).
- Enumeration: Terran Armed Forces 10 tactical + 5 units / 7 composition options
  / 16 purchasable upgrades (2 Specialist on Marine); Kerrigan's Swarm
  11 tactical + 10 units / 13 composition options / 25 purchasable upgrades;
  totals match the official eligibility matrix exactly; bounded, never truncated.

### Hash receipts

- Official unit composition/upgrade data bundle:
  `c7d27c66a0a21940e0d61a54f091ea7be8f23266891cca0da3c1cfeb77234c9c`
  (unchanged after all port operations; source refresh `false`).
- Port descriptor: `b3708fc29a4e7cccc18107105fe9d091054b3b1d1b926c825179b73008d56227`.
- Parity audit result hashes — player1
  `e5d862803472fda09a08351f08048f1d5837ef046bd72c60fb4071bea5a39c04`,
  player2 `7126d488cec148e321074d3ea0843036abc15082bf691a32dbab24ba1cbb9450`.
- Parity verdict hashes — player1
  `4df39e5cd46c22b6d35744eb91f2a41b250bb62bcf6dc70e9648b20eeec3a879`,
  player2 `cb64c7beca9a4894e40b8f3c929f583185a162b32ec5e52095445d466e5cf9c2`.
- Preset `no_pregame_plan` plan hashes — player1
  `e2c98c21b7037e7e2c2d62af0cf6b34f8e57a0b00e055ed3b44fdeb6366356af`,
  player2 `1d7762821561d7999710da3157739a6e1c0d4d406bd64febd18b58ebe78748f0`.
- Example versioned plan v1→v2 revision chain:
  `7d0e3c2016c517faceba942afa896c710cdd5e7ded7c8c65848ea970538177c7` →
  `3c8f950168854a337489b7c0c0a0345ae8c091ba4f6d6774f39047d83a480601`
  (revision event hash-binds the previous plan hash).
- Per-counterexample rejection receipt hashes are printed by the verifier report.

### Accounting

Provider calls: **0**. Paid cost: **¥0**. No network, no credentials, no Room
mutation, no Skill generation/promotion, no source-data updates. The local run
read the official source-lock bytes through the existing read-only fixture.

## Remaining honest gaps (nonblocking)

- The query port is pregame list-legality only; unit equipment and roster
  disclosure remain deferred to slice 105 inside the Rules kernels, and the port
  surfaces that deferral rather than closing it.
- Enumeration reports Rules-derived candidate choices and costs; it does not
  rank, recommend or simulate — that is Slice 269/270 scope.
- `unknown_rules_outcome` classification is exercised through the exported
  classifier with an unrecognized future code; no current official kernel code
  is unknown, so no live unknown receipt exists.
- The contracts module validates structure, hashes and cross-references of a
  `RosterPlan`; it cannot judge the strategic quality of public prose fields.
