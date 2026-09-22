import assert from "node:assert/strict";

import {
  createOfficialCompetitiveMapTabletopAdapterCatalogueV1,
  getOfficialCompetitiveMapTabletopAdapterV1,
} from "../packages/product-composition/official-competitive-map-tabletop-adapter-v1.mjs";
import {
  compileOfficialCompetitiveMapTwoLayerV1,
  verifyOfficialCompetitiveMapTwoLayerCompilationV1,
} from "../packages/product-composition/official-competitive-map-two-layer-compiler-v1.mjs";

const catalogue = createOfficialCompetitiveMapTabletopAdapterCatalogueV1();
const compilations = catalogue.adapters.map((adapter) => {
  const compilation = compileOfficialCompetitiveMapTwoLayerV1({
    adapterCatalogue: catalogue,
    seedId: adapter.seedId,
  });
  assert.equal(verifyOfficialCompetitiveMapTwoLayerCompilationV1(
    compilation, catalogue), true);
  return { adapter, compilation };
});

assert.equal(compilations.length, 20,
  "the repair gate covers all twenty classic map recipes");

for (const { adapter, compilation } of compilations) {
  const elementById = new Map(adapter.elements.map((entry) => [
    entry.elementId, entry,
  ]));
  for (const piece of compilation.rulesLayer.terrainPieces) {
    if (piece.sourceType === "neutral_tmg_compensation") {
      assert.equal(piece.rulesFootprintOrigin,
        "balanced_compensation_placement");
      continue;
    }
    const source = elementById.get(piece.sourceElementId);
    assert.ok(source, `source element must survive: ${piece.terrainPieceId}`);
    assert.deepEqual(piece.sourceRulesFootprint,
      source.candidateRulesFootprint,
      `compiled terrain must retain its source rules footprint: ${piece.terrainPieceId}`);
    const translation = piece.geometryAdjustment.translationInches;
    assert.ok(Math.hypot(Number(translation.x || 0),
      Number(translation.y || 0)) <= 4.1,
    `balance repair must remain a bounded local map-geometry adjustment: ${piece.terrainPieceId}`);
    assert.equal(piece.footprint.xMax - piece.footprint.xMin,
      source.candidateRulesFootprint.xMax
        - source.candidateRulesFootprint.xMin,
    `balance repair must preserve source width: ${piece.terrainPieceId}`);
    assert.equal(piece.footprint.yMax - piece.footprint.yMin,
      source.candidateRulesFootprint.yMax
        - source.candidateRulesFootprint.yMin,
    `balance repair must preserve source height: ${piece.terrainPieceId}`);
    assert.equal(piece.rulesFootprintOrigin,
      "map_topology_candidate_rules_footprint");
  }
  assert.equal(compilation.passageModeChangesRulesGeometry, true);
  assert.ok(compilation.rulesLayer.routeGeometryTreatments.every((entry) => (
    entry.rulesAuthorityAfterRoomCertification === true
      && entry.selectedClearanceInches > 0
  )), `route geometry must be rules-bearing for ${adapter.seedId}`);
}

const lostTempleAdapter = getOfficialCompetitiveMapTabletopAdapterV1(
  catalogue, "sc1_lost_temple_v1");
const lostTemple = compilations.find((entry) => (
  entry.adapter.seedId === lostTempleAdapter.seedId)).compilation;
const centralTemple = lostTemple.rulesLayer.terrainPieces.find((entry) => (
  entry.sourceElementId === "sc1_lost_temple_v1:central_temple:1"));
assert.deepEqual(centralTemple.footprint,
  lostTempleAdapter.elements.find((entry) => (
    entry.elementId === centralTemple.sourceElementId)).candidateRulesFootprint,
"Lost Temple central plateau must use the map-specific tabletop footprint");
assert.equal(centralTemple.accessPoints.length, 2,
  "the north and south Lost Temple ramps must both be executable access geometry");
assert.deepEqual(centralTemple.accessPoints.map((entry) => entry.laneId),
  ["temple_axis", "temple_axis"]);

const formationModule = await import(
  "../packages/online-agent-session/legal-formation-search-v1.mjs");
const terrainBlocksPlacement =
  formationModule.terrainBlocksStarcraftTmgFormationPlacementV1;
assert.equal(typeof terrainBlocksPlacement, "function",
  "formation search must expose its terrain prefilter classification contract");
assert.equal(terrainBlocksPlacement({ terrainKind: "grass" }), false,
  "grass is not a placement blocker");
assert.equal(terrainBlocksPlacement({ terrainKind: "ordinary",
  standableHorizontalSurface: true }), false,
"standable high-ground surface is not a placement blocker");
assert.equal(terrainBlocksPlacement({ terrainKind: "ordinary", size: 1 }), false,
  "Size 1 passable cover is not a placement blocker");
assert.equal(terrainBlocksPlacement({ terrainKind: "impassable", size: 2 }), true,
  "impassable terrain blocks placement outside openings");
assert.equal(terrainBlocksPlacement({ terrainKind: "grass",
  blocksPlacement: true }), true,
"an explicit Rules override remains authoritative");
assert.equal(terrainBlocksPlacement({ terrainKind: "impassable",
  blocksPlacement: false }), false,
"an explicit Rules override may make a terrain projection non-blocking");

console.log(JSON.stringify({
  ok: true,
  slice: "ticket-24-slice-254r1",
  mapCount: compilations.length,
  lostTempleTerrainCount: lostTemple.rulesLayer.terrainPieces.length,
  lostTempleAccessPointCount: centralTemple.accessPoints.length,
  passageModeChangesRulesGeometry: lostTemple.passageModeChangesRulesGeometry,
  formationTerrainClassification: "rules_semantic_v1",
}, null, 2));
