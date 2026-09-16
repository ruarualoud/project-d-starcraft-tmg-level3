# Ticket 24 — Competitive-map gallery and authoritative terrain

Date: 2026-09-16

## Outcome

The battle table provides a twenty-map competitive gallery: ten Brood War seeds and ten
StarCraft II seeds. Each selection preserves a map-specific generated-original art layer
and independently compiles a configurable authoritative TMG terrain layer. A background
never changes rules. Only the room-bound terrain manifest affects bases, movement, line of
sight, engagement, elevation, objectives, and replay.

## Deep module and seam

The room owns one small `battlefieldMapManifest` interface:

- `visualPresetId`: display-only map identity;
- `topologyPresetId`: cited connectivity/elevation identity;
- `terrainRecipeId` and `terrainSeed`: user-selected compilation input;
- `rulesTerrainPlanHash`: exact compiled layout binding;
- `backgroundRulesAuthority=false` and `authoritativeTerrainLayer=true`;
- default layer visibility for presentation only.

The product-composition implementation validates and seals this manifest. The client media
catalogue maps visual preset IDs to bundled assets. The topology compiler independently
maps a cited seed plus an element recipe to a certified setup plan. Removing the visual
Adapter never changes room legality or replay.

## Slices

### Slice 251 — Twenty competitive seeds and research provenance

- Select ten Brood War and ten StarCraft II tournament/ladder classics.
- Cite competitive use and record a distinct topology signature for every seed.
- Record reference layout provenance; do not promote generic generated prototypes.

Acceptance: all twenty entries have a source, topology signature, and tabletop adaptation
target.

### Slice 252 — Topology and element IR

- Represent zones, lanes, portals, blockers, sight control, elevation, and symmetry.
- Give every source element provenance and an independent retain/rules-mode setting.
- Keep visual motifs separate from Rules elements.

Acceptance: every seed serializes to a versioned topology record without reading pixels at
runtime.

### Slice 253 — Tabletop scaling and base-clearance adapter

- Assign source-size/topology matches across Skirmish 36×36, Standard 54×36, and
  Grand Offensive 72×36 with at least five maps in every size.
- Audit 32/40/50/80 mm round and 40×100 mm rectangular bases.
- Enforce straight heavy transit, turning pockets, formation lanes, mission clearance, and
  official terrain guidance.

Acceptance: every size has at least five map-specific candidates; every candidate has at
least one certified heavy-base route and two certified fire lanes. Grand Offensive's
current mission/deployment-card geometry gap remains explicit.

### Slice 254 — Two-layer compiler and per-element selection (complete)

- Compile user-selected classic motifs into a certified TMG plan.
- Allow impassable elements to be blocking, passable/difficult, or visual-only.
- Permit every source element to be retained or omitted; add explicit compensating TMG
  terrain when official minimums require it.
- Freeze the recipe, compiled plan, and hashes at room creation.

Acceptance: identical seed and recipe compile identically; invalid official recipes are
explained and never mislabeled.

Closure: twenty deterministic default compilations, 166 element receipts, explicit neutral
compensation, task-bound fire-lane derivation, existing Rules certification and immutable
room freeze are implemented. Skirmish/Standard are eligible; Grand Offensive remains an
honest preview until current task geometry exists. See
`ticket-24-slice-254-two-layer-map-compiler-v1-2026-09-16.md`.

### Slice 255 — Brood War gallery (10) (complete)

- Generate ten map-specific art layers only after topology review.
- Build ten default certified terrain recipes.

Closure: all ten cited seeds now have generated-original, individually
recognizable display assets in a restrained high-resolution
Brood War/Remastered 2D matte-tabletop style plus ten room-certifiable default
Rules recipes. The gallery contains six Standard 54×36 and four Skirmish 36×36
entries. Blue Storm carries both a classic `1.5in`/32mm-only shortcut asset and
the default `5in` all-current-base tabletop adaptation. Every default map has a
geometry-audited universal route; pixels never supply route authority. The
versioned gallery contract uses build-time asset existence/dimension/duplicate
checks without adding a fragile runtime media-signature gate. See
`ticket-24-slice-255-brood-war-gallery-worklog-v1-2026-09-16.md`.

Acceptance: no two entries share a generic layout template; each art/Rules pair traces to
its cited seed.

### Slice 256 — StarCraft II gallery (10)

- Generate ten map-specific art layers only after topology review.
- Build ten default certified terrain recipes.

Acceptance: the same provenance and certification gates as Slice 255.

### Slice 257 — Web/app gallery and map configurator

- Add searchable SC1/SC2 gallery, topology preview, per-element controls, passage-mode
  controls, certification status, and visual/Rules layer toggles.
- Show selected preset, recipe, seed, piece count, and compensating elements in the room
  contract.
- Agent spatial observation reads only compiled authoritative geometry.

Acceptance: browser selection/preview is usable without starting a room; room creation
freezes the visible recipe.

### Slice 258 — Browser and low-token Standard-2000 evidence

- Start a fresh Standard-2000 H-A room with the optimized Planner/Action pipeline and a
  fixed certified map manifest.
- Capture each authoritative action, selected map/preset/seed, terrain legend, Rules
  receipts, replay, model usage, and cost.
- Produce machine-readable report plus illustrated PDF evidence.

Acceptance: terminal match, zero Critical/High findings, every action replay-verified,
terrain visible in evidence, and cost compared with the completed CNY 63.543093 baseline.

## Media and rights

Bundled backgrounds are generated original assets conditioned on reviewed map-specific
topology, not direct copies or one shared template. Names describe layout inspiration and do
not claim to be original Blizzard screenshots. Research references are provenance inputs
rather than redistributable product assets. A future user-owned-media Adapter may load an
original game screenshot locally, but that file remains display-only.

## Non-goals

- No computer-vision inference becomes Rules truth.
- No background pixel changes a position or LegalSpace.
- No map or recipe change occurs after room creation for formal evidence.
- No new official gameplay-data refresh is performed.
