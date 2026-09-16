# Ticket 24 / Slice 257 — Web/App map configurator closure v1

Date: 2026-09-16
Status: complete
Provider usage: DeepSeek `0` calls; existing optimized-match ledger remains
`144` calls / `6,191,121` reported units / `¥11.833541`.

## Outcome

The shared Expo Web/App product now has a dedicated `Maps` surface rather than
placing twenty controls over the battle table. It reads one server-owned
catalogue containing ten Brood War and ten StarCraft II entries, supports text
search and era filters, preserves each map's 36×36, 54×36 or 72×36 aspect, and
shows generated-original art beside an independent topology/Rules preview.

Every one of the 166 reviewed source elements exposes separate art visibility,
Rules disposition and compatible Rules-mode controls. Every route exposes its
source-clearance or widened display treatment. A selected classic narrow route
lists the blocked current base profiles and, for Blue Storm, switches to the
separate classic display asset. Passage display never silently changes Rules
geometry; users alter blocking/passability through the per-element Rules mode.

Preview is usable before any room exists through:

- `GET /starcraft-tmg-level3/api/v1/map-configurator`;
- `POST /starcraft-tmg-level3/api/v1/map-configurator/preview`.

The preview response includes the art receipt, exact compiled terrain,
compensating pieces, diagnostics, task-geometry readiness and compilation hash.
It cannot mutate a room.

## Room and Agent binding

The Standard-2000 factory accepts a user selection only as pre-room input. The
server recompiles it, resolves the versioned gallery asset, checks its scale
against the selected official Deployment geometry, certifies terrain and
mission reachability, then freezes the compilation, setup plan, terrain
certificate, art visibility and spatial audit under the actual Room ID.

The room projection exposes a bounded freeze summary. The battle table renders
only the bound map asset and compiled terrain; it no longer offers a local
post-creation map override. The player spatial observation exposes the same
seed, compilation/freeze/audit hashes and immutable-map flag to the game Agent.
Pixels, camera state and CSS coordinates remain absent from Rules observation.

Grand Offensive retains its exact 72×36 preview but cannot create a formal task
room until official Grand task/deployment geometry exists.

## Focused verification

The Expo TypeScript gate converged in three allowed cycles. Cycle one found a
single new static-catalogue delimiter error. Cycle two exposed two pre-existing
Replay-result type gaps in the already-modified battle workspace; because they
blocked the changed Web build, the return value was locally narrowed without
changing Replay behavior. Cycle three passed. No additional typecheck ran.

The one runtime Slice gate then passed without retry:

- catalogue `20 = 10 SC1 + 10 SC2`;
- `15` task-geometry-certified maps and `5` Grand preview-only maps;
- Blue Storm `small_shortcut` classic restriction disclosure and typed warning;
- SC2 Daybreak nine-piece room-ready preview;
- Metalopolis formal-room refusal;
- both HTTP catalogue/preview contracts;
- Lost Temple Standard-2000 nine-piece room freeze;
- room freeze mission reachability certified;
- Viewer projection and player Agent observation share the same frozen seed and
  room-freeze hash;
- room-freeze hash
  `48452230105df6df20bf203ad895a09597b76fa9f91da25fe743b71e2270aab2`.

No Skill, Provider, full-match, source refresh, previous Slice gate or unrelated
test suite ran.

## Harness evolution record

- `harnessLoopUsed`: true
- `targetGames`: `starcraft-tmg`
- `promptPackRoutes`: unchanged; Agent input gains frozen map identity only
- `harnessToolsCalled`: map catalogue, two-layer preview, Standard room freeze,
  Viewer V3 projection and player spatial observation
- `uiTraceEvidence`: shared Web/App Maps surface plus room-bound battle rendering
- `agentDecisionEvidence`: no paid decision in this Slice
- `memoryTraceEvidence`: immutable map/freeze hashes available in each spatial
  observation; no new memory store mutation
- `trainingTraceCandidates`: none
- `rollbackOrDemotionRules`: preview cannot mutate; failed compilation cannot
  create a room; Grand stays preview-only; legacy room path remains available
- `userVisibleChecks`: search/filter, correct aspect, art/topology split,
  element controls, passage disclosure, certification status, frozen-room badge

## Handoff

Ticket 24 is `7/8`. Slice 258 starts a fresh certified-map Standard-2000 H-A
room, performs the low-token browser run, and produces replay/cost/JSON/PDF
evidence with terrain visible.
