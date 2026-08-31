# Ticket 11 Slices 75–111 — remaining RuleAtom roadmap

## Decision boundary

This roadmap started from the Slice 74 denominator:

- current executable RuleAtoms: `421`;
- current `review_required` RuleAtoms: `491`;
- retained `display_only` RuleAtoms: `114`;
- planned implementation slices: `37`, numbered Slice 75 through Slice 111;
- the original table claimed `491/491` assignments with no duplicates;
- Slice 85 denominator audit disproved that claim: five canonical Flying-cover atoms
  were counted in Slice 85 after already being promoted by Slice 83;
- the ID-level v2 route audit recovered the five omitted atoms, rebalanced ambiguous
  cluster boundaries, and now assigns `334/334` current review-required atoms exactly
  once across Slices 86–111;
- route v2 is frozen as `3b0f0b0a75d6a07b807a037941c1246736a69b35b8898ec7309295316bacacc2`.

The count is a source- and dependency-derived implementation plan, not the earlier rolling-average forecast of roughly 54 slices. A cluster may be subdivided if its Judge surface cannot close safely in one commit, but atoms may not be silently moved, dropped, or promoted. Any subdivision must preserve the same cluster denominator and be reported before implementation continues.

Execution status on 2026-09-01: Slices 75–87 are complete for their exact bounded denominators. The current ledger is `612` executable, `300` review-required, and `114` retained display-only RuleAtoms; `24` planned slices, Slice 88 through Slice 111, remain. The machine-verifiable v2 partition closes at `912/0/114`, with zero missing, duplicate, or unknown atom IDs. Any future regrouping must version this route and preserve the exact denominator rather than editing counts silently.

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
| 83 | **Complete:** Flying movement/combat, flight-stand measurement, and flying coherency | 24 | 549 | 363 |
| 84 | **Complete:** Terrain footprint, blocking/direct/full cover, dead zones, leading-model LoS, visibility | 19 | 568 | 344 |
| 85 | **Complete, corrected:** elevation, terrain stacking, high/mid ground, effective Size; five Flying-cover dependencies reused from Slice 83 without re-promotion | 10 | 578 | 334 |
| 86 | **Complete:** Grass, impassable terrain, Access Point, Ramp, and residual Gap primitives | 13 | 591 | 321 |
| 87 | Model/base geometry, measurement, coherency placement, Within and Wholly Within | 21 | 612 | 300 |
| 88 | Player/Unit ownership, active/controller authority, friendly/enemy/team identity, specific-over-general | 15 | 627 | 285 |
| 89 | Dice, re-rolls, tests, generated values, modifiers, Buff and Debuff arithmetic | 18 | 645 | 267 |
| 90 | Keyword and Special Ability primitives, non-stacking, targeting structure, Repeatable | 13 | 658 | 254 |
| 91 | Passive/Reaction timing, simultaneous priority, and end-of-round effect order | 6 | 664 | 248 |
| 92 | Faction/Tactical card layout, uniqueness, purchase resource, and excess-resource loss | 7 | 671 | 241 |
| 93 | Unit-card fields, phase boxes, Speed-null, base/range/upgrade fields, and Supply Value projection | 12 | 683 | 229 |
| 94 | Round/phase order, alternating Unit activation, one action per activation, on-table Movement choice | 7 | 690 | 222 |
| 95 | Supply pool, round escalation, casualty release, deployment reference, and available-supply verification | 5 | 695 | 217 |
| 96 | Reserve return lifecycle, retained state, target restrictions, final-round Reserve destruction, arrival influence-zone rule | 17 | 712 | 200 |
| 97 | Unit destruction lifecycle, token/effect cleanup, outward effects, and return boundary | 5 | 717 | 195 |
| 98 | Status/Stay-in-Play framework, Shielded dependency, Siege Mode, and On Creep | 12 | 729 | 183 |
| 99 | Hidden and Burrowed complete state/action/targeting lifecycle | 18 | 747 | 165 |
| 100 | Summon lifecycle: army-list exclusions, Supply, placement, activation linkage, score and Reserve distinctions | 13 | 760 | 152 |
| 101 | Respawn and Morph placement/Supply/activation lifecycle | 9 | 769 | 143 |
| 102 | Faction, race/sub-faction tags, faction-card schema, Army Slots, engagement scale, and eligibility | 24 | 793 | 119 |
| 103 | Army resource budgets and Tactical-card purchase/open-information rules | 11 | 804 | 108 |
| 104 | Unit composition options, model counts, starting Supply, upgrades, Specialist default, and costs | 16 | 820 | 92 |
| 105 | Team rosters, open/closed lists, equipment representation, disclosure, and inspection | 13 | 833 | 79 |
| 106 | Mission/deployment-card draft, colour/control choice, elimination/selection, and card contract | 21 | 854 | 58 |
| 107 | Battlefield dimensions, entry edges, mission-marker placement/elevation, influence corners, and two official FAQ constraints | 12 | 866 | 46 |
| 108 | Balanced terrain construction: counts, sizes, lanes, quadrants, centre, scaling, and alternating placement | 17 | 883 | 29 |
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

## Slice 83 Flying rules closure

Slice 83 adds `authority.flying-rules-v1@1.0.0` and promotes the exact 24 Flying atoms. Flight-stand bottoms own measurement, the Leading Model moves horizontally point-to-point through terrain/models/elevation, endpoints retain whole-base/nonoverlap/Enemy-Flying separation rules, Flying coherency links ignore terrain and other Units, and grass is preserved on overflight but removed at the endpoint. Flying cannot charge, be charged, engage, enter Combat/Close Ranks, make or receive Close Combat attacks, or control/contest mission markers. Full Cover is ignored to/from Flying, while direct cover and elevation dead zones that apply to the non-Flying model remain. The sealed current dataset identifies Point Defense Drone as the only Flying Unit but gives it Speed `-`; generic movement evidence is therefore rules-procedure-only and production-quarantined rather than inventing a current carrier. Focused `28/28`, runtime `10/10`, aggregate `10/10`, graph 9,293/28,204 and contracts 52/52 pass. The report is `docs/ticket-11-slice-83-flying-rules-2026-08-31.md`.

## Slice 84 Terrain footprint, cover, and line-of-sight closure

Slice 84 adds `authority.terrain-los-rules-v1@1.0.0` and promotes the exact 19 footprint/opening, movement-blocking, Full/Direct/independent-cover, dead-zone/Close-Quarters, top-surface, and visibility atoms. A sealed data bundle binds all 26 current official Unit profiles and 25 printed Sizes. Setup footprints and the complete opening denominator are content-hashed; movement and sight permissions remain independent. Size 0–1 terrain is passable, Size 2+ blocks round-base transit without an agreed opening, and every endpoint rejects terrain overlap. The top-down line-of-sight kernel accepts a complete rectangular barrier proof or an explicit clear base-point witness, assesses terrain independently, applies Full/Direct Cover and the mutual Size 3+ dead zone, removes Direct/dead-zone blocking in Close Quarters, and excludes a stood-upon horizontal surface. Unsupported diagonal traces, elevation/effective-Size stacking, special terrain kinds, and arbitrary bases fail closed for Slices 85–87. Focused `30/30`, runtime `10/10`, aggregate `10/10`, graph 9,435/28,433 and contracts 53/53 pass. The report is `docs/ticket-11-slice-84-terrain-los-rules-2026-08-31.md`.

## Slice 85 denominator correction and elevation closure

Slice 85's pre-implementation catalogue audit found that its planned `15` counted five canonical Flying-cover atoms already promoted by Slice 83. Re-promoting them or silently selecting unrelated review atoms would corrupt the denominator. The corrected slice therefore promotes the exact ten still-review-required horizontal elevation distance, recursive terrain stacking, model/terrain Effective Size, high/mid-ground, lower-origin, and high-ground Evade atoms. The five Flying atoms remain executable dependencies of the new executor and relationship graph.

`authority.elevation-effective-size-rules-v1@1.0.0` verifies a content-hashed, complete acyclic terrain-support graph, derives terrain Size recursively, adds the direct supporting terrain's Effective Size to a non-Flying model, and derives ground/mid/high bands rather than trusting a client label. Cross-elevation Range, Engagement Range, and ability range use horizontal nearest-base distance with zero vertical contribution. The new LoS path explicitly adapts the frozen Slice 84 geometry result, then recalculates Full/Direct Cover, Dead Zone, lower-origin and Evade with effective Sizes; it also invokes the frozen Slice 83 Flying-cover kernel without mutating or re-promoting it. Point Defense Drone's official null printed Size uses a receipt-visible geometry-only profile substitution because Slice 84 correctly rejects null Size before geometry; the substitute never supplies cover Size or game identity.

Focused `30/30`, runtime `10/10`, aggregate `10/10`, graph 9,526/28,591 and contracts 54/54 pass. Counts advance `568/344/114 → 578/334/114`. The report is `docs/ticket-11-slice-85-elevation-effective-size-rules-2026-09-01.md`.

## Slice 86 special-terrain closure

Slice 86 consumes the exact 13-atom route-v2 assignment and adds `authority.special-terrain-rules-v1@1.0.0`. A content-hashed battlefield agreement declares every terrain piece, adjacent elevation pair and globally unique Access Point. The kernel executes Access Point elevation changes and coherency links, Size 1 Mid Ground Ramps with base/top entry, derived Impassable Terrain, ordinary Size 0–1 transit, Size 2 Grass movement/standard-Cover LoS/permanent removal, and Leading Model Gap checks through the frozen Slice 82 kernel. Frozen Slice 83 distinguishes Flying overflight from Flying endpoints; frozen Slice 84 owns ordinary transit and Cover geometry.

Removed Grass stays in the immutable setup denominator but leaves active battle geometry. Model placement, setup, source and MatchBinding drift fail closed; the Authority path mutates model position/elevation/support and Grass lifecycle only after explicit plan choice. Round bases and axis-aligned rectangles remain the bounded geometry authority until Slice 87. Focused `30/30`, runtime `10/10`, aggregate `10/10`, graph 9,634/28,774 and contracts 55/55 pass. Counts advance `578/334/114 → 591/321/114`; 25 slices and 321 actionable atoms remain. The report is `docs/ticket-11-slice-86-special-terrain-rules-2026-09-01.md`.

## Slice 87 model/base geometry closure

Slice 87 consumes the exact 21-atom route-v2 assignment and adds `authority.model-base-geometry-rules-v1@1.0.0`. The locked P2P denominator binds all 26 current official Units to their base geometry: 25 round bases and Hydralisk's sole rectangular `40×100MM` base. Rules geometry uses the base only, ignores miniature overhang and scenic basing, and uses the bottom of a flight stand.

The kernel measures nearest physical base/token/marker edges in inches, allows unrestricted premeasurement, and distinguishes any-part `Within` from complete-base `Wholly Within`. It validates full multi-model placements, board containment, overlap, Enemy separation and connected Coherency Links, including declared Access Point links. Placement casualty requires a content-bound complete zero-legal-position certificate; out-of-coherency Units lose ordinary mission control/contest capability. Wobbly positions require all-player agreement and a visible marker, and Leading Model nomination expires when repositioning resolves. Focused `34/34`, runtime `10/10`, aggregate `10/10`, graph 9,790/29,031 and contracts 56/56 pass. Counts advance `591/321/114 → 612/300/114`; 24 slices and 300 actionable atoms remain. The report is `docs/ticket-11-slice-87-model-base-geometry-rules-2026-09-01.md`.

## Remaining route v2 ID-level closure

The post-Slice85 audit no longer relies on prose labels plus arithmetic. `packages/rule-atoms/official-remaining-rule-atom-route-v2.mjs` binds the exact Slice85 catalogue hash and emits the resolved atom IDs for every Slice86–111 assignment. Its `334/334` partition has zero missing, duplicate, or unknown IDs and projects exactly `912/0/114` after Slice111.

The five recovered debt atoms are the Core 11 Leading Model Gap rule, Leading Model nomination duration, the Core 11 Size0/1 terrain-pass rule, the Core 8.5.3 Gap-clearance reference, and Ramp movement. Four are now in Slice86 and nomination duration is in Slice87. The wider count changes in the table are explicit semantic-boundary corrections made while constructing the ID-level partition; they do not change the current catalogue or promote any rule. Route verifier `10/10` passes with hash `3b0f0b0a75d6a07b807a037941c1246736a69b35b8898ec7309295316bacacc2`. The audit report is `docs/ticket-11-slices-86-111-route-v2-audit-2026-09-01.md`.

No Skill, DSH, MuZero, self-play, memory, or training-truth promotion is part of these RuleAtom slices.
