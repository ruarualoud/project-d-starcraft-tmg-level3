# Ticket 11 Slice 76 — Impact after a successful Charge

## Result

Slice 76 promotes exactly six reviewed Core 11 Impact RuleAtoms. The ledger moves from `445/467/114` to `451/461/114` executable/review-required/display-only, and the executor-contract registry moves from `43/43` to `45/45`. The separate Hidden immunity atom remains review-required for Slice 99.

The executable vertical path is now:

1. an official single-model Goliath declares any positive number of eligible enemy Goliath Units as Charge targets before the hidden D6;
2. a successful exact 80mm/no-terrain Charge moves the model and opens a mandatory Impact pending window without alternating the active side;
3. the controller allocates four Impact dice, all to the only target or in any integer split across multiple declared targets;
4. each target resolves its own 3+ Hit rolls immediately followed by 4+ Armour rolls;
5. Impact has no Surge, each unsaved die causes Damage 1, and only then does Assault alternation settle.

## Official source binding

No source refresh was performed. The slice reuses development-tranche lock `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1`, snapshot `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105`, dataset `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067`, and versions `71/69/48`.

The pinned Command Center Goliath record proves Speed 7, Size 3, Armour 4+, HP 10, and `Devastating Charge: IMPACT (4) 3+`. Terran P2P page 7, content hash `afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c`, cross-checks the missing base field as `Ø80MM`. Core content hash `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54` supplies the Impact procedure. Repository fallback, automatic refresh, and training authority remain false.

## Reachability repair found by the relationship graph

Marine has no official Impact ability, so attaching the six Impact atoms only to Marine Charge v2 would have produced an executable-looking but unreachable rule family. The relationship audit caught that missing consumer before implementation.

`authority.goliath-charge-v1@1.0.0` is therefore added as a bounded current official carrier. It consumes the already executable Charge atom lineage and promotes no additional Charge atom. `authority.impact-v1@1.0.0` owns only the six new Impact atoms plus existing Armour dependencies. The graph now has 8,576 nodes, 27,029 edges, 45 executors, 45 declared state contracts, and zero blocking gaps. Removing the successful-Charge → Impact-trigger edge makes the graph invalid.

## Exact denominator and exclusions

The current executable denominator is intentionally narrow:

- GAUNTLET Standard board, ground level, no terrain/access/tokens/effect markers;
- current official unmodified one-model Goliath Units on exact 80mm round bases;
- attacker and targets begin unhurt; total Impact damage is therefore nonlethal against HP 10;
- declared targets remain fixed from Charge through Impact;
- exact source/profile, geometry, pending, action, allocation, Chance and state hashes must remain current.

Injured targets, casualty allocation, Hidden immunity, other Impact carriers, different bases, terrain, elevation, Flying, statuses, upgrades, reactions and wider geometry fail closed for later slices. No silent compatibility path fills those gaps.

## Freeze, Authority and Harness evidence

Marine Charge v2's executor, slice, Judge and fixture remain byte-exact and displayable. Slice 76 uses the same `hybrid_legal_space_v25` action schema and retains every historical rules-display dependency.

Authority evidence covers declaration → successful Charge → Impact as three Preview/Confirm/Apply receipts. Content hashes and Ed25519 signatures remain valid after HMAC short-seal rotation; a modified Impact event fails signature replay. Standard Chance tickets preallocate four Hit and four Armour D6, while the signed Impact plan fixes the per-target hit/armour offsets.

Gates passed:

- Slice 76 focused Judge: `14/14`;
- current executable runtime: `10/10`;
- Ticket 11 aggregate: `10/10`;
- cumulative evidence: `139` base reports / `1,424` base assertions; with aggregate, `140` reports / `1,434` assertions.

Frozen identities:

- slice `8bf3fbf687742378962d1942eed19cc80cf769c63e6cbe9c14645fc5d52ba812`;
- catalogue `a936ba79c9e3160b31bef967ccf9c9a07e4e222454431b94d63232118fbcb9df`;
- runtime `729f1c8310863f88a5af4a8a1389acbeab1242e2a3bfaddc91350bd355809f27`;
- relationship graph `d360825a4cf01c7ffbcbe3aae83af0a4ec928275db28c1e5a71af7b61e3d543f`.

No Skill was generated or promoted, DSH was not invoked, and no MuZero, self-play, memory or training-truth candidate was produced. Ticket 11 and the overall `10/22` roadmap remain open. Slice 77 is Run action and Assault choice; 35 planned slices remain.
