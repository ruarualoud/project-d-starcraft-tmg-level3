# Ticket 24 / Slice 251 — competitive map seed study

Date: 2026-09-16

## Decision

The first gallery uses twenty real competitive-map layouts as research seeds: ten from
StarCraft: Brood War and ten from StarCraft II. A seed is not a bitmap template. It is
a cited layout whose connectivity, elevation, attack lanes, blockers, and sight-control
ideas are transcribed into a topology record before any new art is produced.

The shipped result has two independent layers:

1. a generated-original visual layer which preserves the identity and overall composition
   of the seed map; and
2. an authoritative TMG terrain layer compiled for a 54×36 inch Standard battlefield.

Pixels never confer Rules authority. The user may keep, remove, or reinterpret every
transcribed source element while selecting a map. That selection is compiled and certified
before room creation, then frozen for the match and replay.

## Selection criteria

- documented tournament or long-lived competitive use;
- a topology that adds a distinct tabletop problem rather than only a different tileset;
- enough public layout evidence to transcribe lanes and terrain without guessing from a
  generated image;
- useful coverage of open centres, ridges, bridges, back doors, multiple routes, sight
  blockers, high ground, islands, and destructible blockers.

Brood War map design is intentionally treated as gameplay data: competitive history shows
that map structure materially changes balance and play style. The map list and tournament
evidence are cross-checked against the [Brood War tournament-map index](https://liquipedia.net/starcraft/Maps/Tournament_Maps)
and the [Brood War map overview](https://liquipedia.net/starcraft/Maps). StarCraft II's
canonical feature vocabulary includes chokes, towers, destructible rocks, sight blockers,
and inhibitor-like zones; see the [StarCraft II map overview](https://liquipedia.net/starcraft2/Maps).

## Brood War seeds (10)

| Seed | Competitive evidence | Topology signature to transcribe | Tabletop adaptation target |
|---|---|---|---|
| Lost Temple | Blizzard map, competition span 1999–2004, described as the game's most famous map ([source](https://liquipedia.net/starcraft/Lost_Temple)) | Four outer starts, cliffed naturals, central circulation, island/resource pockets, pronounced positional asymmetry | Preserve central high-ground pressure and two flank choices; mirror the playable pair so historical spawn imbalance becomes an optional scenario toggle rather than a default defect |
| Fighting Spirit 1.4 | Proleague/ASL staple and the most frequently played Afreeca/SOSPA-era map ([source](https://liquipedia.net/starcraft/Fighting_Spirit)) | Four-corner macro layout, exposed naturals, defendable narrow-ramp third gas, risky central resource zone | Four corner motifs become quadrant terrain; centre remains contestable; narrow third routes are widened to the current TMG clearance class |
| Circuit Breakers | Proleague map with long tournament use and documented statistical balance ([source](https://liquipedia.net/starcraft/Circuit_Breakers)) | Open macro centre, paired bridges from naturals, important high ground before thirds, many harassment angles | Paired bridge lanes become two legal fire/movement lanes; high-ground pieces remain mutually reachable through explicit access points |
| Python 1.3 | Major 2007–08 competitive map that superseded Lost Temple in popular play ([source](https://liquipedia.net/starcraft/Python)) | Wide open centre, broad third entrances, cliff pressure, two blocked corner islands | Preserve open-centre flanking; island blockers may compile as impassable, difficult/passable, or visual-only elements |
| Blue Storm 1.2 | Used in Starleague, MSL, and Proleague; 2007 KeSPA best-map award ([source](https://liquipedia.net/starcraft/Blue_Storm)) | Two-player split by a ravine, short small-unit route plus longer main route, central high basilica, natural-side gap | Model the defining dual-route choice; the short route gets a configurable passage class instead of silently excluding large bases |
| Tau Cross 1.1 | SKY Proleague/OSL/WCG use; long-lived macro map ([source](https://liquipedia.net/starcraft/Tau_Cross)) | Three-start radial plan, open/buildable centre, small natural choke, no main-to-natural ramp, long rush paths | Reduce to a fair opposing two-seat projection while preserving open centre versus narrow defensive mouth |
| Destination 1.1 | MSL/Proleague map and 2008–09 best-map award ([source](https://liquipedia.net/starcraft/Destination)) | Two bridges into each natural, mineral back door, three central bridges, cliff behind natural, distant third | Compile back door and bridge blockers as toggles; always retain at least one certified heavy-base route per quadrant |
| Heartbreak Ridge 2.2 | Proleague, MSL, OSL, and WCG use across 2009–10 ([source](https://liquipedia.net/starcraft/Heartbreak_Ridge)) | Parallel central ridges, blocked rear routes, repeated defensive fallback lines, high ground behind naturals | Preserve staggered ridge fighting and optional opened back routes; collapse seven digital blockers into a small number of legible TMG pieces |
| Andromeda 1.2 | 399 official games and one of the longest-running maps of its period ([source](https://liquipedia.net/starcraft/Andromeda)) | Open macro centre, protected inner expansion path, island expansions, neutral-building drop cliffs | Preserve protected side pockets and open centre; island identity can remain art-only unless an impassable element is explicitly retained |
| Match Point 1.4 | Proleague/MSL/OSL/WCG and later ASL use; 2,265 recorded games in the cited statistics ([source](https://liquipedia.net/starcraft/Match_Point)) | Two raised plateaus, many seep/flank routes, exposed naturals, cliff-edge harassment, short direct distance but long pushing routes | Preserve route multiplicity and paired plateaus; merge minor digital paths into a few tabletop-readable lanes with different passage classes |

## StarCraft II seeds (10)

| Seed | Competitive evidence | Topology signature to transcribe | Tabletop adaptation target |
|---|---|---|---|
| Metalopolis | Beta-era ladder map retained by major tournaments and later returned in the Dream Pool ([source](https://liquipedia.net/starcraft2/Metalopolis)) | Four starts, central crossroads and watch platforms, contested high-yield zones, smoke sight blockers | Preserve crossed central lanes, two sight-control pockets, and risky centre terrain; close-spawn imbalance is not enabled by default |
| Shakuras Plateau 2.0 | 2010–13 ladder/tournament map revised to address close-spawn problems ([source](https://liquipedia.net/starcraft2/Shakuras_Plateau)) | Long shared central corridor, rock-blocked rear routes, watch towers, ledges beside the corridor | Preserve corridor control plus optional opened side routes; cliffs become standable high terrain only where an access point is legal |
| Xel'Naga Caverns | Season-one ladder and S-tier tournament map ([source](https://liquipedia.net/starcraft2/Xel%27Naga_Caverns)) | Exposed natural with back door, rocks to another expansion, two central sight towers, split chokes and high-ground harassment | Preserve three-route pressure and sight-control pair; blockers are configurable and the back door receives explicit width/turning clearance |
| Daybreak | GSL map-poll winner, GSL/WCS/ladder use ([source](https://liquipedia.net/starcraft2/Daybreak)) | Two-player diagonal, twin centre towers, central and ramp rocks, easy third but run-by-prone fourth | Preserve rock-defined positional stages by compiling each rock group as an independently selectable element |
| Cloud Kingdom | TLMC winner, tournament staple, first foreign map in a Korean Starleague ([source](https://liquipedia.net/starcraft2/Cloud_Kingdom)) | Area-control map with tiny direct chokes, longer superior-position routes, wide engagement zones, rocks narrowing ramps | Preserve direct-versus-long-route trade-off; early narrow ramps can be widened or represented by cover instead of impassability |
| Antiga Shipyard | Blizzard ladder and GSL map used from 2011–13 ([source](https://liquipedia.net/starcraft2/Antiga_Shipyard)) | Safe high third versus exposed reward zone, close naturals, multiple attack routes around thirds, open central battles | Preserve the safe-versus-risky side choice using asymmetric terrain roles while keeping player geometry mirrored |
| Ohana | TLMC runner-up, GSL/ladder/tournament staple ([source](https://liquipedia.net/starcraft2/Ohana)) | Compact two-player map, direct engagements, central paired vision control, limited counterattack space | Produce the gallery's most constrained/direct topology, but maintain the official 6-inch fire lanes and heavy-base escape path |
| Whirlwind | GSTL/GSL-era map with 3,718 games in cited statistics ([source](https://liquipedia.net/starcraft2/Whirlwind)) | Large four-start macro layout, single central vision node, entrance depots, optional rocks at second expansions | Preserve a broad macro/open layout; central sight terrain is optional and entry blockers compile independently |
| Frost LE | TLMC2 winner and premier-tournament map ([source](https://liquipedia.net/starcraft2/Frost)) | Four starts with comparable rush distances, two viable third choices, paired central watch towers, harassment dead space | Preserve choose-a-flank/choose-a-third identity using paired lateral routes and two centre sight-control elements |
| Abyssal Reef LE | 2017–18 ladder and GSL/IEM use, later returned to ladder ([source](https://liquipedia.net/starcraft2/Abyssal_Reef_LE)) | Two-player reef layout, rocks help secure territory but expose flanks, broad central engagements | Preserve rock-controlled flank timing and reef shelf high ground; water gaps remain visual unless explicitly retained as blocking terrain |

## Topology intermediate representation

Every seed is transcribed before visual generation into a graph plus spatial motifs:

- `zones`: deployment ends, central contest zone, flank pockets, high-ground surfaces;
- `lanes`: endpoints, minimum clear width, directness, fire-lane role, and whether a
  large base can turn within it;
- `portals`: ramps, bridges, gaps, back doors, and access points joining zones;
- `elements`: grass/sight blocker, ordinary cover, elevated standable terrain,
  impassable blocker, passable difficult terrain, and purely visual motif;
- `connectivityState`: always open, optional open, optional blocked, or visual-only;
- `symmetry`: mirror/rotation relationship used for fairness, independent of source art;
- `provenance`: source map, source feature, transcription note, and confidence.

The topology graph, not the bitmap, drives the TMG layout compiler.

## Current physical-clearance contract

The captured May 2026 product set contains 32, 40, 50, and 80 mm round bases plus one
40×100 mm rectangular base. The official terrain kernel already derives its manoeuvre-lane
witness from the current maximum base depth (100 mm, about 3.94 inches) and separately
requires two 6-inch fire lanes.

The map adapter adds three practical classes without changing unit bases:

- `single_heavy_transit`: at least 4 inches of straight clear width;
- `heavy_turn_or_two_way_transit`: at least 5 inches at the turning pocket;
- `formation_and_fire_lane`: at least 6 inches.

A source choke narrower than the requested class is never copied literally. The selector
must choose one of: widen it, downgrade it to passable/difficult terrain, make it visual-only,
or accept a custom uncertified scenario. Formal Standard-2000 evidence uses only certified
layouts.

## Per-element selection and compilation

At map selection, every source-derived element exposes:

- `retain`: include or omit this motif from Rules geometry;
- `rulesMode`: blocking, passable difficult/cover, standable high ground, or visual-only;
- `passageClass`: small, standard, single-heavy, heavy-turn, or formation/fire-lane;
- `symmetryMode`: paired, mirrored, or intentionally asymmetric scenario;
- `lockedByMission`: whether the selected mission requires the element or its clearance.

Turning off a classic element does not permit an invalid official setup. The compiler may
add clearly labelled neutral TMG terrain to satisfy the official Standard guidance (8–12
pieces, size/category ranges, quadrant distribution, centre terrain, access points, and fire
lanes). The preview shows both the source-fidelity score and every compensating element.
The user can still save an uncertified custom scenario, but it cannot masquerade as a
formal Standard match.

## Two-layer generation pipeline

1. Acquire and cite an overhead competitive reference.
2. Human-review the topology transcription and element inventory.
3. Compile a legal 54×36 terrain candidate from selected elements.
4. Run authoritative terrain certification and base-clearance/connectivity audits.
5. Generate or paint the visual layer from the seed's actual composition and theme, using
   the approved topology sketch as conditioning; never reuse one generic four-corner prompt.
6. Render the authoritative vector/terrain overlay above the art.
7. Bind visual asset version, topology version, user selection, compiled plan hash, and room
   replay version at room creation.

## Slice 251 exit gate

- twenty cited seeds are fixed;
- each has a distinct topology signature and a stated tabletop adaptation target;
- the physical-clearance and per-element-selection contracts are explicit;
- no generated prototype is promoted merely because it looks like a StarCraft map.

