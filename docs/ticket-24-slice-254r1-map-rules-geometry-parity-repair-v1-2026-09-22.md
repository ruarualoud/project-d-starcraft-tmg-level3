# Ticket 24 / Slice 254-R1 — map Rules-geometry parity repair

Date: 2026-09-22

Status: backend repair complete; focused compiler gate and one real Lost Temple
Standard-2000 room certification passed. User-visible boundary rendering is a
separate K3 follow-up and is not claimed complete here.

## Concrete defect

Ticket 24 had already shipped 20 map-specific topology records, 166 selectable
source elements, 66 lanes and 25 opening/access recommendations. The Slice 254
compiler nevertheless discarded each selected element's
`candidateRulesFootprint` and reassigned every piece to a small generic slot.
Passage selection was labelled display-only. The formation solver then treated
every terrain row without `blocksPlacement: false` as blocking, including grass,
Size-1 cover and a standable high-ground surface.

The result was a valid-looking background with a generic nine-piece Rules layer.
It did not preserve the curated Lost Temple topology and could reject legal
formation space for non-blocking terrain.

## Repair

- Source-derived pieces now begin at the adapter's exact map-specific Rules
  footprint. When two source shapes overlap or violate the official three-inch
  major-structure separation, the compiler performs a deterministic minimum
  local translation and records the original footprint plus the adjustment.
  Across the current 20-map default catalogue, the largest adjustment is
  `3.889"`; source width and height are preserved.
- Only neutral balance compensation uses generic free-space placement. Its
  provenance is explicit as `balanced_compensation_placement`.
- `blocking` now compiles to official `impassable` terrain instead of an
  ordinary terrain label with contradictory prose.
- Topology passage recommendations now materialize Rules geometry. High-ground
  lanes produce boundary-derived access points and blocking lanes produce typed
  openings. Passage clearance selection changes this geometry and is preserved
  in `rulesLayer.routeGeometryTreatments`.
- Lost Temple's central plateau is now the map-specific
  `22.14–31.86 × 15.84–20.16"` footprint and has separate north/south
  `temple_axis` ramp access geometry.
- Formation prefilter classification is semantic: explicit overrides win;
  otherwise only impassable terrain blocks placement. Grass, ordinary Size-1
  cover and standable high ground pass through to exact Rules validation.
- The old fixed four-quadrant manoeuvre witnesses conflicted with restored
  geometry. They are now deterministically solved from actual compiled free
  space. The repair keeps real terrain and moves the witness, rather than
  shrinking the map back to generic tokens.

Generated pixels remain display-only. Rules authority comes from the reviewed
map topology IR compiled and certified into room geometry; runtime image
inference remains forbidden.

## Focused evidence

Concrete fail-first:

```text
compiled terrain must retain its source rules footprint:
sc1_lost_temple_v1:central_temple:1
actual: undefined
```

Final focused command (last relevant code change, run once):

```text
node scripts/verify-ticket-24-slice-254r1-map-rules-geometry-parity-v1.mjs
```

Result:

```json
{
  "ok": true,
  "mapCount": 20,
  "lostTempleTerrainCount": 9,
  "lostTempleAccessPointCount": 2,
  "passageModeChangesRulesGeometry": true,
  "formationTerrainClassification": "rules_semantic_v1"
}
```

The first formal Standard-2000 factory attempt then exposed the stale generic
quadrant witness with
`BALANCED_TERRAIN_QUADRANT_MANOEUVRE_LANE_BLOCKED:south_west`. After replacing
that witness with the terrain-aware solver, the same formal Lost Temple room
factory completed and `verifyOfficialStandardRoomInitialStateAuthorityV1`
returned `true` with nine certified terrain pieces.

No Provider call, Skill generation, source refresh, Room mutation or API cost
was used by this repair.

## User-visible follow-up

K3 will render all 20 maps from the same authoritative projected geometry:
semi-transparent filled footprint, high-ground treatment, impassable boundary,
grass treatment, openings and ramp/access markers. Hover/selection must disclose
terrain kind, height and passability. Web/App scaling must preserve the physical
inch ratio. K3 must provide map-gallery and live-battle screenshots; the UI may
not draw an approximate boundary from the background image.

## Harness loop record

- `harnessLoopUsed`: true
- `targetGames`: `starcraft-tmg`
- `promptPackRoutes`: none; no model decision was requested
- `harnessToolsCalled`: map topology adapter, two-layer compiler, formation
  terrain classifier, Standard-2000 room factory and room verifier
- `uiTraceEvidence`: pending Slice 254-R2 K3 boundary-rendering acceptance
- `agentDecisionEvidence`: none; this is a pre-match geometry repair
- `memoryTraceEvidence`: none
- `trainingTraceCandidates`: none; all repair evidence remains non-training
- `rollbackOrDemotionRules`: reject compiler v1.3 if any source element loses
  its origin footprint, any adjustment exceeds the bounded gate, passage
  selection ceases to alter geometry, or a formal room fails certification
- `userVisibleChecks`: 20 compilations, Lost Temple two ramps, nine terrain
  pieces and one formal Standard-2000 room certification
