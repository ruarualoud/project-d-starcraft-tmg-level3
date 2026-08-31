# Ticket 11 Slices 75–111 — remaining RuleAtom roadmap

## Decision boundary

This roadmap partitions the current Slice 74 denominator exactly:

- current executable RuleAtoms: `421`;
- current `review_required` RuleAtoms: `491`;
- retained `display_only` RuleAtoms: `114`;
- planned implementation slices: `37`, numbered Slice 75 through Slice 111;
- assigned review-required atoms: `491/491`, with no duplicate assignment;
- projected Ticket 11 atom closure after Slice 111: `912/912` actionable atoms executable and `0` review-required atoms.

The count is a source- and dependency-derived implementation plan, not the earlier rolling-average forecast of roughly 54 slices. A cluster may be subdivided if its Judge surface cannot close safely in one commit, but atoms may not be silently moved, dropped, or promoted. Any subdivision must preserve the same cluster denominator and be reported before implementation continues.

Execution status on 2026-08-31: Slices 75–82 are complete for their declared bounded denominators. The current ledger is `525` executable, `387` review-required, and `114` retained display-only RuleAtoms; `29` planned slices, Slice 83 through Slice 111, remain.

Every slice must land its current executor implementation, public LegalSpace/Apply contract, state read/write/invalidation contract, relationship-graph edges, source-drift gate, Authority Preview→Confirm→Apply evidence, Ed25519 replay after HMAC rotation, historical-display preservation, and focused regression gate together. A slice cannot promote atoms while leaving a new executor contract partial.

## Frozen historical code does not mean discarded code

`authority.marine-charge-v1` is retained byte-exact because its source and runtime hashes are referenced by historical development evidence. Changing it in place would make old hashes and replay provenance unverifiable. It is not a current-room compatibility fallback and it is not treated as completed Rules truth.

The reason for a v2 is primarily implementation lineage, not a proven official rule change:

- v1 is anchored to the old Slice 49 catalogue and old local-data fixture assembly;
- its declaration stage opens a valid pending action and its pure geometry code already covers canonical paths, collision, contact, placement priority, undeclared engagement, and coherency;
- it can instantiate `resolve_charge`, but its public Apply function accepts only the initial `charge` action;
- success/failure settlement, current data/MatchBinding identity, current relationship state contract, and two-stage Authority replay are incomplete.

Slice 75 will preserve v1 as historical evidence and migrate the reviewed pure geometry and test cases into a current v2 implementation. It will rewrite only the stale/incomplete seams: latest-data binding, pending identity/invalidation, `resolve_charge` Apply dispatch, success/failure settlement, runtime registration, relationship contract, and current Authority/replay evidence. There is no plan to delete all old Charge code.

## One-time source capture policy

The one explicit online official-source capture was completed before Slice 75 implementation. The sealed development-tranche lock is `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`, its source snapshot is `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`, its normalized dataset is `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`, and its official versions are `71/69/48` (`units/cards/rules`). Two same-version additions are isolated as community display-only records; official product and official rule-prose denominators did not change.

After that capture:

- ordinary slice development and verification must be offline against the sealed source lock;
- no automatic polling, opportunistic refresh, repository fallback, or silent source replacement is allowed;
- network refresh occurs only after an explicit user command;
- a manual refresh creates a new versioned source lock and an explicit impact/migration review; it never rewrites the old lock;
- missing or hash-mismatched sealed inputs fail closed;
- room MatchBindings remain pinned to the exact snapshot with which they were created.

The lock is now the sole development source for Slices 75–111 until the user explicitly orders a refresh. No ordinary verifier performs a network read.

## Exact slice route

| Slice | Rule cluster | Atoms promoted | Executable after | Review-required after |
| ---: | --- | ---: | ---: | ---: |
| 75 | **Complete:** Marine Charge v2: Core 8.7.7 plus the seven Charge steps in Quick Reference 12.4 | 24 | 445 | 467 |
| 76 | **Complete:** Impact after a successful Charge: allocation, per-target rolls, armour transfer, no-Surge Damage 1 | 6 | 451 | 461 |
| 77 | **Complete:** Run action and Assault choice: Run procedure/restrictions, Quick Reference Run, unengaged permission | 6 | 457 | 455 |
| 78 | **Complete:** Blast/Flamer template procedure and Spillover batches; current official carrier/physical geometry asset quarantined | 23 | 480 | 432 |
| 79 | **Complete:** attack-pool edges: reduced dice, mixed modifiers/range batches, Hits X, three-pool/bypass/Surge mismatch, Concentrated Fire, Tough, visible-casualty caps | 13 | 493 | 419 |
| 80 | **Complete:** Close Combat lifecycle: marker removal, Evade, freed-unit state/Reaction exception, Surge target, multiple enemies, engagement range | 8 | 501 | 411 |
| 81 | **Complete:** Direct movement and Displacement | 9 | 510 | 402 |
| 82 | **Complete:** Gap clearance and Place geometry | 15 | 525 | 387 |
| 83 | Flying movement/combat, flight-stand measurement, and flying coherency | 24 | 549 | 363 |
| 84 | Terrain footprint, blocking/direct/full cover, dead zones, leading-model LoS, visibility | 19 | 568 | 344 |
| 85 | Elevation, terrain stacking, high/mid ground, effective Size, and flying cover | 15 | 583 | 329 |
| 86 | Grass, impassable terrain, and Access Point primitives | 9 | 592 | 320 |
| 87 | Model/base geometry, measurement, coherency placement, Within and Wholly Within | 21 | 613 | 299 |
| 88 | Player/Unit ownership, active/controller authority, friendly/enemy/team identity, specific-over-general | 17 | 630 | 282 |
| 89 | Dice, re-rolls, tests, generated values, modifiers, Buff and Debuff arithmetic | 18 | 648 | 264 |
| 90 | Keyword and Special Ability primitives, non-stacking, targeting structure, Repeatable | 13 | 661 | 251 |
| 91 | Passive/Reaction timing, simultaneous priority, and end-of-round effect order | 6 | 667 | 245 |
| 92 | Faction/Tactical card layout, uniqueness, purchase resource, and excess-resource loss | 7 | 674 | 238 |
| 93 | Unit-card fields, phase boxes, Speed-null, base/range/upgrade fields, and Supply Value projection | 11 | 685 | 227 |
| 94 | Round/phase order, alternating Unit activation, one action per activation, on-table Movement choice | 7 | 692 | 220 |
| 95 | Supply pool, round escalation, casualty release, deployment reference, and available-supply verification | 6 | 698 | 214 |
| 96 | Reserve return lifecycle, retained state, target restrictions, final-round Reserve destruction, arrival influence-zone rule | 16 | 714 | 198 |
| 97 | Unit destruction lifecycle, token/effect cleanup, outward effects, and return boundary | 5 | 719 | 193 |
| 98 | Status/Stay-in-Play framework, Shielded dependency, Siege Mode, and On Creep | 12 | 731 | 181 |
| 99 | Hidden and Burrowed complete state/action/targeting lifecycle | 17 | 748 | 164 |
| 100 | Summon lifecycle: army-list exclusions, Supply, placement, activation linkage, score and Reserve distinctions | 13 | 761 | 151 |
| 101 | Respawn and Morph placement/Supply/activation lifecycle | 9 | 770 | 142 |
| 102 | Faction, race/sub-faction tags, faction-card schema, Army Slots, engagement scale, and eligibility | 23 | 793 | 119 |
| 103 | Army resource budgets and Tactical-card purchase/open-information rules | 11 | 804 | 108 |
| 104 | Unit composition options, model counts, starting Supply, upgrades, Specialist default, and costs | 15 | 819 | 93 |
| 105 | Team rosters, open/closed lists, equipment representation, disclosure, and inspection | 14 | 833 | 79 |
| 106 | Mission/deployment-card draft, colour/control choice, elimination/selection, and card contract | 21 | 854 | 58 |
| 107 | Battlefield dimensions, entry edges, mission-marker placement/elevation, influence corners, and two official FAQ constraints | 14 | 868 | 44 |
| 108 | Balanced terrain construction: counts, sizes, lanes, quadrants, centre, scaling, and alternating placement | 15 | 883 | 29 |
| 109 | Battlefield Tokens and Markers: expiry, movement, activation/mode/faction/first-player marker primitives | 11 | 894 | 18 |
| 110 | First-player assignment, mission control totals, army elimination, final scoring, tiebreak and draw | 14 | 908 | 4 |
| 111 | Unresolved rules dispute protocol and post-match verification | 4 | 912 | 0 |

## Slice 75 correction after full-denominator research

The initial Charge estimate counted only the 17 atoms in Core 8.7.7. Full catalogue/relationship review found seven separate `review_required` Charge atoms in Quick Reference 12.4. Leaving those behind would make the action executable while its canonical quick-reference procedure remained unresolved. Slice 75 therefore owns `24`, not `17`, atoms. The eighth 12.4 atom is the Run summary and belongs to Slice 77.

Slice 75 completion target is therefore:

- current `421/491/114` becomes `445/467/114`;
- arbitrary declared target count remains unbounded by UI slots;
- Charge distance uses the current sealed Unit model denominator and its split Speed plus the hidden D6;
- declaration and resolution both have complete Preview→Confirm→Apply and replay evidence;
- success and failure both settle the Assault activation correctly;
- the Charge executor and every relationship/state contract introduced by the slice close in the same commit.

Slice 75 closes those claims only for its declared GAUNTLET Standard / round 32mm Ground Marine / no-terrain denominator. Rules-owned failure certificates currently prove straight-line distance shortfall and mutually incompatible declared-target spread; unsupported obstacle, terrain, base, elevation, Flying, placement-priority, and general continuous-geometry cases remain fail-closed for the later geometry slices rather than accepting a client-authored failure. The slice report is `docs/ticket-11-slice-75-marine-charge-v2-2026-08-30.md`.

## Slice 76 reachability closure

The relationship graph proved that Marine Charge cannot reach Impact because Marine has no official Impact ability. Slice 76 therefore adds current official Goliath as the first bounded carrier without re-promoting any Charge atom. The source-locked profile binds Speed 7, Ø80mm, Armour 4+, HP 10 and Devastating Charge `IMPACT (4) 3+`. A successful Goliath Charge opens mandatory Impact; single-target allocation is forced to all four dice, multiple targets accept any exact integer split summing to four, and each target resolves Hit then Armour separately with no Surge and Damage 1. Injured/casualty states, Hidden immunity, other carriers and wider geometry remain fail-closed. The report is `docs/ticket-11-slice-76-impact-after-charge-2026-08-30.md`.

## Slice 77 Run closure

Slice 77 adds `authority.assault-run-v1@1.0.0` and promotes the exact six Core 8.6.1/8.7.1/11 plus Quick Reference 12.4 atoms. The current executor requires a Movement-side marker, forbids an existing Assault-side marker and engagement, then explicitly adapts the current Assault state into the byte-frozen Standard Move v1 kernel. Single-model Marine Run uses Speed 7; every supported multi-model count uses Speed 4, independent of UI slots. Apply restores current state, preserves Movement activation, writes Assault activation and settles alternation. Source, marker, actor-position, geometry and action drift fail closed. Focused `13/13`, current runtime `10/10` and aggregate `10/10` pass; the graph has 8,627 nodes / 27,165 edges and 46/46 declared executor state contracts. The report is `docs/ticket-11-slice-77-assault-run-2026-08-30.md`.

## Slice 78 Template/Spillover closure

Slice 78 adds `authority.template-weapon-v1@1.0.0` and promotes the exact 23 Core 8.7.6, Core 11 Spillover and Quick Reference atoms. Rules own BT/FT placement from a content-hashed local template polygon, round-base coverage, elevation/Flying/target-tag and Size 2+ terrain filtering, main-pool Rate modifiers, affected-model Surge Result and Friendly/Enemy per-Unit Spillover batches without Rate modifiers or Surge. The sealed latest official data has no current BT/FT carrier and no physical template geometry asset, so production carrier enumeration is explicitly quarantined instead of using a legacy or invented profile. Focused `16/16`, runtime `10/10`, aggregate `10/10`, graph 8,783/27,405 and contracts 47/47 pass. The report is `docs/ticket-11-slice-78-template-weapon-spillover-2026-08-30.md`.

## Slice 79 attack-pool correction and closure

Three Long Range atoms originally counted as new were already executable in Ranged Attack v2. Slice 79 therefore retains them only as dependencies and replaces them with three previously unassigned atoms from the same attack procedure: three-pool overview, Armour-roll bypass and Surge mismatch. `authority.attack-pool-edge-v1@1.0.0` promotes 13 distinct current review atoms and executes controller-owned reduced-die selection, mixed modifier/range groups, Hits X, Surge match/mismatch, Tough and Visible/Concentrated Fire caps. Focused `18/18`, runtime `10/10`, aggregate `10/10`, graph 8,878/27,552 and contracts 48/48 pass. The report is `docs/ticket-11-slice-79-attack-pool-edges-2026-08-30.md`.

## Slice 80 Close Combat lifecycle closure

Slice 80 adds `authority.close-combat-lifecycle-v1@1.0.0` and promotes the exact eight remaining lifecycle atoms. The parameter domain exposes every Enemy Unit that the acting Unit may legally attack, deriving Fighting and Supporting Ranks separately for each target; Melee `E` binds to the one-inch Engagement Range. Apply resolves target-tag Surge and only explicitly granted Close Combat Evade, removes the Combat Activation Marker, recomputes engagement after casualties, and distinguishes an unactivated freed Unit's effective Pass from its retained Reaction/specific-trigger exception. Rules-relevant geometry drift invalidates the action, while Authority-added display defaults do not. Focused `20/20`, runtime `10/10`, aggregate `10/10`, graph 8,944/27,655 and contracts 49/49 pass. The report is `docs/ticket-11-slice-80-close-combat-lifecycle-2026-08-30.md`.

## Slice 81 Direct movement and Displacement closure

Slice 81 adds `authority.direct-movement-displacement-v1@1.0.0` and promotes the exact nine Core 4.5 / Core 11 atoms. It resolves the Rules-owned leading/reference model, direct vector, shortest certified bypass, non-strict Towards/Away endpoint, battlefield-edge stop, arbitrary remaining-model plan, and DISPLACEMENT contact-before-nearest result. Focused `20/20`, runtime `10/10`, aggregate `10/10`, graph 9,017/27,770 and contracts 50/50 pass. The report is `docs/ticket-11-slice-81-direct-movement-displacement-2026-08-31.md`.

## Slice 82 Gap clearance and Place geometry closure

Slice 82 adds `authority.gap-place-geometry-v1@1.0.0` plus a reusable pure geometry kernel and promotes the exact nine Core 4.6 Gap atoms and six Core 11 `PLACE (X)` atoms. Gap width is derived from physical model/terrain boundary points crossed by the actual path; Size 0–2 uses the one-inch threshold, Size 3+ uses three inches, terrain openings require the setup agreement, and Flying ignores transit clearance but never endpoint fit. Place nominates the Leading Model, enforces its distance, resets every remaining model with a valid coherency link, ignores transit path/Gap/elevation requirements, enforces legal enemy-separated endpoints, and applies the Assault engagement exception. Focused `25/25`, runtime `10/10`, aggregate `10/10`, graph 9,125/27,939 and contracts 51/51 pass. General terrain/elevation, arbitrary model/base shapes, and general Unit-card geometry bindings remain production-quarantined for Slices 84, 85, 87 and 93. The report is `docs/ticket-11-slice-82-gap-place-geometry-2026-08-31.md`.

No Skill, DSH, MuZero, self-play, memory, or training-truth promotion is part of these RuleAtom slices.
