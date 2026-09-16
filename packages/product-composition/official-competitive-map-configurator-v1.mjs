import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialBroodWarMapGalleryV1 } from
  "./official-brood-war-map-gallery-v1.mjs";
import { createOfficialStarcraft2MapGalleryV1 } from
  "./official-starcraft-2-map-gallery-v1.mjs";
import {
  createOfficialCompetitiveMapTabletopAdapterCatalogueV1,
  getOfficialCompetitiveMapTabletopAdapterV1,
} from "./official-competitive-map-tabletop-adapter-v1.mjs";
import { compileOfficialCompetitiveMapTwoLayerV1 } from
  "./official-competitive-map-two-layer-compiler-v1.mjs";

export const OFFICIAL_COMPETITIVE_MAP_CONFIGURATOR_V1_SCHEMA =
  "starcraft_tmg_official_competitive_map_configurator_v1";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
function clone(value) { return structuredClone(value); }
function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function elementProjection(entry) {
  return {
    elementId: entry.elementId,
    sourceGroupId: entry.sourceGroupId,
    sourceKind: entry.sourceKind,
    sourceFeature: entry.sourceFeature,
    artFootprint: clone(entry.artFootprint),
    artRetainByDefault: entry.artRetainByDefault,
    defaultRulesMode: entry.defaultRulesMode,
    recommendedRulesMode: entry.recommendedRulesMode,
    allowedRulesModes: clone(entry.allowedRulesModes),
    rulesEnabledByDefault: entry.rulesEnabledByDefault,
    userMayDisableRules: entry.userMayDisableRules,
    clearanceResolution: entry.clearanceResolution,
    conflictingLaneIds: clone(entry.conflictingLaneIds || []),
  };
}
function laneProjection(entry, audit) {
  return {
    laneId: entry.laneId,
    routeClass: entry.routeClass,
    centreline: clone(entry.centreline),
    defaultPassageMode: entry.defaultPassageMode,
    availablePassageModes: clone(entry.availablePassageModes),
    sourceClearanceInches: entry.sourceRequiredClearanceInches,
    defaultClearanceInches: entry.requiredClearanceInches,
    sourceBlockedBaseProfiles: clone(
      audit?.sourceStraightTransitBaseProfilesBlocked || []),
    defaultBlockedBaseProfiles: clone(
      audit?.straightTransitBaseProfilesBlocked || []),
    classicRestrictionRetainedAsOption:
      entry.classicRestrictionRetainedAsOption === true,
    displayLayerControlOnly: true,
    rulesGeometryEffect: false,
  };
}
function mapProjection(entry, gameEra, adapter) {
  const auditByLane = new Map(adapter.laneClearanceAudits.map((row) => (
    [row.laneId, row])));
  return {
    seedId: entry.seedId,
    displayName: entry.displayName,
    gameEra,
    sourceVariant: entry.sourceVariant,
    engagementScale: entry.engagementScale,
    battlefield: clone(entry.battlefield),
    sourceMapDimensions: clone(entry.sourceMapDimensions),
    topologySignature: clone(entry.topologySignature),
    topologyHash: entry.topologyHash,
    artAsset: clone(entry.defaultArtAsset),
    classicArtVariant: clone(entry.classicArtVariant || null),
    elements: adapter.elements.map(elementProjection),
    passages: adapter.lanes.map((lane) => laneProjection(lane,
      auditByLane.get(lane.laneId))),
    zones: clone(adapter.zones),
    baseProfilesAudited: clone(adapter.baseProfiles.map((row) => row.baseId)),
    missionGeometryCoverage: adapter.currentMissionDeploymentGeometryCoverage,
    formalTaskRoomEligible: entry.defaultRulesRecipe.roomCertificationEligible,
    taskGeometryStatus: entry.defaultRulesRecipe.roomCertificationEligible
      ? "all_current_combinations_reachable"
      : "official_geometry_unavailable_preview_only",
    defaultRecipe: clone(entry.defaultRulesRecipe),
    backgroundRulesAuthority: false,
    runtimePixelInferenceAllowed: false,
  };
}
function catalogueBody(adapterCatalogue, broodWar, starcraft2) {
  const galleryRows = [
    ...broodWar.entries.map((entry) => ({ entry, gameEra: "brood_war" })),
    ...starcraft2.entries.map((entry) => ({ entry, gameEra: "starcraft_2" })),
  ];
  const maps = galleryRows.map(({ entry, gameEra }) => mapProjection(entry,
    gameEra, getOfficialCompetitiveMapTabletopAdapterV1(adapterCatalogue,
      entry.seedId)));
  return {
    schema: OFFICIAL_COMPETITIVE_MAP_CONFIGURATOR_V1_SCHEMA,
    version: "1.0.0",
    maps,
    counts: {
      total: maps.length,
      broodWar: maps.filter((entry) => entry.gameEra === "brood_war").length,
      starcraft2: maps.filter((entry) => entry.gameEra === "starcraft_2").length,
      roomReady: maps.filter((entry) => entry.formalTaskRoomEligible).length,
      previewOnly: maps.filter((entry) => !entry.formalTaskRoomEligible).length,
    },
    controls: {
      artDisposition: ["retain", "hide"],
      rulesDisposition: ["auto", "enabled", "disabled"],
      passageMode: ["preserve_source_clearance", "widen_all_current_bases"],
      artAndRulesIndependent: true,
      passageModeIsDisplayDisclosureOnly: true,
    },
    roomFreezePolicy: {
      selectionMutableBeforeRoomCreation: true,
      selectionMutableAfterRoomCreation: false,
      failedCompilationMayMutateRoom: false,
      grandFormalTaskRoomsBlockedUntilOfficialGeometry: true,
    },
    sourcePixelsUsedAsRulesGeometry: false,
    trainingTruth: false,
  };
}
function previewProjection(compilation, catalogueMap) {
  return {
    schema: "starcraft_tmg_official_competitive_map_preview_v1",
    version: "1.0.0",
    seedId: compilation.seedId,
    displayName: catalogueMap.displayName,
    gameEra: catalogueMap.gameEra,
    engagementScale: compilation.engagementScale,
    battlefield: clone(compilation.battlefield),
    artAsset: clone(catalogueMap.artAsset),
    artLayer: clone(compilation.artLayer),
    rulesTerrain: clone(compilation.rulesLayer.terrainPieces),
    selectionReceipt: clone(compilation.selectionReceipt),
    passageSelectionReceipt: clone(compilation.passageSelectionReceipt),
    targetCounts: clone(compilation.rulesLayer.targetCounts),
    actualCounts: clone(compilation.rulesLayer.actualCounts),
    compensatingTerrainPieceIds: clone(
      compilation.rulesLayer.compensatingTerrainPieceIds),
    warnings: clone(compilation.warnings),
    diagnostics: clone(compilation.diagnostics),
    officialRecipeEligible: compilation.officialRecipeEligible,
    roomCertificationEligible: compilation.roomCertificationEligible,
    taskGeometryStatus: catalogueMap.taskGeometryStatus,
    compilationHash: compilation.compilationHash,
    backgroundRulesAuthority: false,
    previewMayMutateRoom: false,
    trainingTruth: false,
  };
}

export function createOfficialCompetitiveMapConfiguratorV1(input = {}) {
  const adapterCatalogue = input.adapterCatalogue
    || createOfficialCompetitiveMapTabletopAdapterCatalogueV1();
  const broodWar = input.broodWarGallery
    || createOfficialBroodWarMapGalleryV1({ adapterCatalogue });
  const starcraft2 = input.starcraft2Gallery
    || createOfficialStarcraft2MapGalleryV1({ adapterCatalogue });
  const body = catalogueBody(adapterCatalogue, broodWar, starcraft2);
  const catalogue = deepFreeze({ ...body,
    catalogueHash: hashStarcraftTmgContract(body) });
  const bySeedId = new Map(catalogue.maps.map((entry) => (
    [entry.seedId, entry])));
  return Object.freeze({
    readCatalogue() { return catalogue; },
    preview(raw = {}) {
      const seedId = String(raw.seedId || "").trim();
      const catalogueMap = bySeedId.get(seedId);
      if (!catalogueMap) fail("COMPETITIVE_MAP_CONFIGURATOR_SEED_UNKNOWN", seedId);
      const elementSelections = raw.elementSelections || [];
      const passageSelections = raw.passageSelections || [];
      if (!Array.isArray(elementSelections) || !Array.isArray(passageSelections)
        || elementSelections.length > catalogueMap.elements.length
        || passageSelections.length > catalogueMap.passages.length) {
        fail("COMPETITIVE_MAP_CONFIGURATOR_SELECTIONS_INVALID", seedId);
      }
      const compilation = compileOfficialCompetitiveMapTwoLayerV1({
        adapterCatalogue, seedId, elementSelections, passageSelections,
      });
      return deepFreeze(previewProjection(compilation, catalogueMap));
    },
  });
}
