import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialCompetitiveMapSeedCatalogueV1 } from
  "./official-competitive-map-seed-catalogue-v1.mjs";
import {
  createOfficialCompetitiveMapTabletopAdapterCatalogueV1,
  getOfficialCompetitiveMapTabletopAdapterV1,
  verifyOfficialCompetitiveMapTabletopAdapterCatalogueV1,
} from "./official-competitive-map-tabletop-adapter-v1.mjs";
import {
  compileOfficialCompetitiveMapTwoLayerV1,
  verifyOfficialCompetitiveMapTwoLayerCompilationV1,
} from "./official-competitive-map-two-layer-compiler-v1.mjs";

export const OFFICIAL_STARCRAFT_2_MAP_GALLERY_V1_SCHEMA =
  "starcraft_tmg_official_starcraft_2_map_gallery_v1";

const PUBLIC_MAP_ROOT = "/assets/client/battlefield/maps/starcraft-2";
const STYLE_PROFILE_ID = "starcraft-2-classic-tabletop-matte-v1";

const ART_ROWS = Object.freeze([
  Object.freeze({ seedId: "sc2_metalopolis_v1",
    fileName: "metalopolis-display-v1.png", widthPixels: 1774,
    heightPixels: 887 }),
  Object.freeze({ seedId: "sc2_shakuras_plateau_2_0_v1",
    fileName: "shakuras-plateau-display-v1.png", widthPixels: 1774,
    heightPixels: 887 }),
  Object.freeze({ seedId: "sc2_xelnaga_caverns_v1",
    fileName: "xelnaga-caverns-display-v1.png", widthPixels: 1254,
    heightPixels: 1254 }),
  Object.freeze({ seedId: "sc2_daybreak_v1",
    fileName: "daybreak-display-v1.png", widthPixels: 1536,
    heightPixels: 1024 }),
  Object.freeze({ seedId: "sc2_cloud_kingdom_v1",
    fileName: "cloud-kingdom-display-v1.png", widthPixels: 1536,
    heightPixels: 1024 }),
  Object.freeze({ seedId: "sc2_antiga_shipyard_v1",
    fileName: "antiga-shipyard-display-v1.png", widthPixels: 1536,
    heightPixels: 1024 }),
  Object.freeze({ seedId: "sc2_ohana_v1",
    fileName: "ohana-display-v1.png", widthPixels: 1254,
    heightPixels: 1254 }),
  Object.freeze({ seedId: "sc2_whirlwind_v1",
    fileName: "whirlwind-display-v1.png", widthPixels: 1774,
    heightPixels: 887 }),
  Object.freeze({ seedId: "sc2_frost_le_v1",
    fileName: "frost-display-v1.png", widthPixels: 1774,
    heightPixels: 887 }),
  Object.freeze({ seedId: "sc2_abyssal_reef_le_v1",
    fileName: "abyssal-reef-display-v1.png", widthPixels: 1774,
    heightPixels: 887 }),
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => (
    !keys.includes(key))));
}
function passageSummary(adapter) {
  const universal = adapter.laneClearanceAudits.filter((entry) => (
    entry.hardGeometryClearanceCertified
      && entry.allCurrentBaseProfilesStraightTransit));
  return {
    baseProfilesAudited: adapter.baseProfiles.map((entry) => entry.baseId),
    sourceRestrictedLaneIds: adapter.laneClearanceAudits.filter((entry) => (
      entry.sourceStraightTransitBaseProfilesBlocked.length > 0
    )).map((entry) => entry.laneId),
    defaultRestrictedLaneIds: adapter.laneClearanceAudits.filter((entry) => (
      entry.straightTransitBaseProfilesBlocked.length > 0
    )).map((entry) => entry.laneId),
    defaultWidenedLaneIds: adapter.lanes.filter((entry) => (
      entry.defaultPassageMode === "widen_all_current_bases"
    )).map((entry) => entry.laneId),
    defaultUniversalRouteIds: universal.map((entry) => entry.laneId),
    defaultUniversalTurnRouteIds: adapter.laneClearanceAudits.filter((entry) => (
      entry.hardGeometryClearanceCertified
        && entry.allCurrentBaseProfilesInPlaceTurn
    )).map((entry) => entry.laneId),
    atLeastOneUniversalCurrentBaseRoute: universal.length > 0,
    routePixelsAreRulesAuthority: false,
  };
}
function artAsset(row) {
  return { assetRevision: row.fileName.match(/-v(\d+)\.png$/)?.[1] || "1",
    path: `${PUBLIC_MAP_ROOT}/${row.fileName}`,
    widthPixels: row.widthPixels, heightPixels: row.heightPixels,
    generatedOriginal: true, sourceScreenshotBundled: false,
    displayOnly: true, backgroundRulesAuthority: false, trainingTruth: false };
}
export function resolveOfficialStarcraft2MapGalleryArtAssetV1(seedId) {
  const normalized = String(seedId || "").trim();
  const row = ART_ROWS.find((entry) => entry.seedId === normalized);
  if (!row) fail("STARCRAFT_2_MAP_GALLERY_ART_ASSET_UNKNOWN", normalized);
  return deepFreeze({ seedId: normalized, ...artAsset(row) });
}
function galleryEntry(row, seedById, adapterCatalogue) {
  const seed = seedById.get(row.seedId);
  if (!seed || seed.gameEra !== "starcraft_2") {
    fail("STARCRAFT_2_MAP_GALLERY_SEED_INVALID", row.seedId);
  }
  const adapter = getOfficialCompetitiveMapTabletopAdapterV1(adapterCatalogue,
    row.seedId);
  const compilation = compileOfficialCompetitiveMapTwoLayerV1({
    adapterCatalogue, seedId: row.seedId,
  });
  verifyOfficialCompetitiveMapTwoLayerCompilationV1(compilation,
    adapterCatalogue);
  return {
    schema: "starcraft_tmg_official_starcraft_2_map_gallery_entry_v1",
    version: "1.0.0", seedId: seed.seedId, displayName: seed.displayName,
    sourceVariant: seed.sourceVariant,
    competitiveEvidenceUrl: seed.competitiveEvidenceUrl,
    sourceMapDimensions: structuredClone(seed.sourceMapDimensions),
    topologySignature: structuredClone(seed.topologySignature),
    topologyHash: adapter.topologyHash,
    visualCompositionKey: `${seed.seedId}:individual-topology-v1`,
    styleProfileId: STYLE_PROFILE_ID,
    engagementScale: adapter.engagementScale,
    battlefield: structuredClone(adapter.battlefield),
    defaultArtAsset: artAsset(row), passageAudit: passageSummary(adapter),
    missionGeometryCoverage: adapter.currentMissionDeploymentGeometryCoverage,
    defaultRulesRecipe: { recipeId: compilation.compilationId,
      compilationHash: compilation.compilationHash,
      adapterHash: compilation.adapterHash,
      terrainPieceCount: compilation.rulesLayer.terrainPieces.length,
      selectionReceiptCount: compilation.selectionReceipt.length,
      compensatingTerrainPieceCount:
        compilation.rulesLayer.compensatingTerrainPieceIds.length,
      officialRecipeEligible: compilation.officialRecipeEligible,
      roomCertificationEligible: compilation.roomCertificationEligible },
    sourceImageRedistributed: false, runtimePixelInferenceAllowed: false,
    artAndRulesLayersIndependent: true,
    rulesTruth: "compiled_two_layer_recipe_only", trainingTruth: false,
  };
}

export function createOfficialStarcraft2MapGalleryV1(input = {}) {
  const seedCatalogue = input.seedCatalogue
    || createOfficialCompetitiveMapSeedCatalogueV1();
  const adapterCatalogue = input.adapterCatalogue
    || createOfficialCompetitiveMapTabletopAdapterCatalogueV1();
  verifyOfficialCompetitiveMapTabletopAdapterCatalogueV1(adapterCatalogue);
  const seedById = new Map(seedCatalogue.seeds.map((entry) => (
    [entry.seedId, entry])));
  const entries = ART_ROWS.map((row) => galleryEntry(row, seedById,
    adapterCatalogue));
  const exact = entries.filter((entry) => (
    entry.missionGeometryCoverage === "official_exact"));
  const grand = entries.filter((entry) => (
    entry.engagementScale === "Grand Offensive"));
  const body = { schema: OFFICIAL_STARCRAFT_2_MAP_GALLERY_V1_SCHEMA,
    version: "1.0.0",
    styleProfile: { styleProfileId: STYLE_PROFILE_ID,
      renderingLanguage: "starcraft_2_classic_top_down_2d",
      surfaceTreatment: "matte_printed_tabletop",
      tokenCompatibility: "quiet_microdetail_under_high_resolution_pieces",
      prohibitedTreatments: ["modern_pbr", "cinematic_isometric",
        "anime", "shared_generic_layout_template"] },
    entries,
    counts: { total: entries.length,
      Standard: entries.filter((entry) => entry.engagementScale === "Standard").length,
      Skirmish: entries.filter((entry) => entry.engagementScale === "Skirmish").length,
      GrandOffensive: grand.length, defaultArtAssets: entries.length,
      exactMissionGeometryMaps: exact.length,
      topologyPreviewOnlyMaps: grand.length },
    everyEntryUsesIndividualTopology: new Set(entries.map((entry) => (
      entry.topologyHash))).size === entries.length,
    everyDefaultMapHasUniversalCurrentBaseRoute: entries.every((entry) => (
      entry.passageAudit.atLeastOneUniversalCurrentBaseRoute)),
    everyExactGeometryRecipeRoomCertifiable: exact.every((entry) => (
      entry.defaultRulesRecipe.roomCertificationEligible)),
    grandFormalTaskRoomsBlockedUntilOfficialGeometry: grand.every((entry) => (
      entry.missionGeometryCoverage
        === "scale_exact_task_geometry_not_in_current_cards"
      && entry.defaultRulesRecipe.roomCertificationEligible === false)),
    generatedOriginalArtOnly: true, sourceScreenshotsBundled: false,
    backgroundRulesAuthority: false, runtimePixelInferenceAllowed: false,
    sourceRefreshPerformed: false,
    rulesTruth: "gallery_binds_display_assets_to_compiled_rules_recipes",
    trainingTruth: false };
  const result = deepFreeze({ ...body,
    galleryHash: hashStarcraftTmgContract(body) });
  verifyOfficialStarcraft2MapGalleryV1(result, { adapterCatalogue });
  return result;
}

export function verifyOfficialStarcraft2MapGalleryV1(value, input = {}) {
  const adapterCatalogue = input.adapterCatalogue
    || createOfficialCompetitiveMapTabletopAdapterCatalogueV1();
  verifyOfficialCompetitiveMapTabletopAdapterCatalogueV1(adapterCatalogue);
  if (!value || value.schema !== OFFICIAL_STARCRAFT_2_MAP_GALLERY_V1_SCHEMA
    || value.version !== "1.0.0" || value.entries?.length !== 10
    || value.counts?.total !== 10 || value.counts.Standard !== 3
    || value.counts.Skirmish !== 2 || value.counts.GrandOffensive !== 5
    || value.counts.defaultArtAssets !== 10
    || value.counts.exactMissionGeometryMaps !== 5
    || value.counts.topologyPreviewOnlyMaps !== 5
    || value.everyEntryUsesIndividualTopology !== true
    || value.everyDefaultMapHasUniversalCurrentBaseRoute !== true
    || value.everyExactGeometryRecipeRoomCertifiable !== true
    || value.grandFormalTaskRoomsBlockedUntilOfficialGeometry !== true
    || value.generatedOriginalArtOnly !== true
    || value.sourceScreenshotsBundled !== false
    || value.backgroundRulesAuthority !== false
    || value.runtimePixelInferenceAllowed !== false
    || value.trainingTruth !== false
    || value.galleryHash !== hashStarcraftTmgContract(without(value,
      ["galleryHash"]))) fail("STARCRAFT_2_MAP_GALLERY_INVALID");
  const seedIds = new Set(); const topologyHashes = new Set();
  const assetPaths = new Set();
  for (const entry of value.entries) {
    const adapter = getOfficialCompetitiveMapTabletopAdapterV1(adapterCatalogue,
      entry.seedId);
    const compilation = compileOfficialCompetitiveMapTwoLayerV1({
      adapterCatalogue, seedId: entry.seedId,
    });
    if (seedIds.has(entry.seedId) || topologyHashes.has(entry.topologyHash)
      || assetPaths.has(entry.defaultArtAsset?.path)
      || adapter.topologyHash !== entry.topologyHash
      || adapter.adapterHash !== entry.defaultRulesRecipe?.adapterHash
      || compilation.compilationHash !== entry.defaultRulesRecipe?.compilationHash
      || entry.engagementScale !== adapter.engagementScale
      || entry.missionGeometryCoverage
        !== adapter.currentMissionDeploymentGeometryCoverage
      || entry.defaultArtAsset?.displayOnly !== true
      || entry.defaultArtAsset?.backgroundRulesAuthority !== false
      || entry.passageAudit?.atLeastOneUniversalCurrentBaseRoute !== true
      || entry.passageAudit?.routePixelsAreRulesAuthority !== false
      || entry.artAndRulesLayersIndependent !== true
      || entry.trainingTruth !== false) {
      fail("STARCRAFT_2_MAP_GALLERY_ENTRY_INVALID", entry?.seedId);
    }
    seedIds.add(entry.seedId); topologyHashes.add(entry.topologyHash);
    assetPaths.add(entry.defaultArtAsset.path);
  }
  return true;
}
