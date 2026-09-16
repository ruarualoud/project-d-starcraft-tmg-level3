import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialCompetitiveMapSeedCatalogueV1,
} from "./official-competitive-map-seed-catalogue-v1.mjs";
import {
  createOfficialCompetitiveMapTabletopAdapterCatalogueV1,
  getOfficialCompetitiveMapTabletopAdapterV1,
  verifyOfficialCompetitiveMapTabletopAdapterCatalogueV1,
} from "./official-competitive-map-tabletop-adapter-v1.mjs";
import {
  compileOfficialCompetitiveMapTwoLayerV1,
  verifyOfficialCompetitiveMapTwoLayerCompilationV1,
} from "./official-competitive-map-two-layer-compiler-v1.mjs";

export const OFFICIAL_BROOD_WAR_MAP_GALLERY_V1_SCHEMA =
  "starcraft_tmg_official_brood_war_map_gallery_v1";

const PUBLIC_MAP_ROOT = "/assets/client/battlefield/maps/brood-war";
const STYLE_PROFILE_ID = "brood-war-remastered-tabletop-matte-v1";

const ART_ROWS = Object.freeze([
  Object.freeze({ seedId: "sc1_lost_temple_v1",
    fileName: "lost-temple-display-v2.png", widthPixels: 1536,
    heightPixels: 1024 }),
  Object.freeze({ seedId: "sc1_fighting_spirit_1_4_v1",
    fileName: "fighting-spirit-display-v2.png", widthPixels: 1536,
    heightPixels: 1024 }),
  Object.freeze({ seedId: "sc1_circuit_breakers_v1",
    fileName: "circuit-breakers-display-v2.png", widthPixels: 1536,
    heightPixels: 1024 }),
  Object.freeze({ seedId: "sc1_python_1_3_v1",
    fileName: "python-display-v2.png", widthPixels: 1536,
    heightPixels: 1024 }),
  Object.freeze({ seedId: "sc1_blue_storm_1_2_v1",
    fileName: "blue-storm-display-v3.png", widthPixels: 1254,
    heightPixels: 1254,
    classicVariant: Object.freeze({
      fileName: "blue-storm-display-classic-v2.png",
      widthPixels: 1254, heightPixels: 1254,
      passageMode: "preserve_source_clearance",
      userFacingRestriction:
        "Classic shortcut is 1.5in and supports round_32mm only; use the separate universal route for larger bases.",
    }) }),
  Object.freeze({ seedId: "sc1_tau_cross_1_1_v1",
    fileName: "tau-cross-display-v2.png", widthPixels: 1536,
    heightPixels: 1024 }),
  Object.freeze({ seedId: "sc1_destination_1_1_v1",
    fileName: "destination-display-v2.png", widthPixels: 1254,
    heightPixels: 1254 }),
  Object.freeze({ seedId: "sc1_heartbreak_ridge_2_2_v1",
    fileName: "heartbreak-ridge-display-v2.png", widthPixels: 1254,
    heightPixels: 1254 }),
  Object.freeze({ seedId: "sc1_andromeda_1_2_v1",
    fileName: "andromeda-display-v2.png", widthPixels: 1536,
    heightPixels: 1024 }),
  Object.freeze({ seedId: "sc1_match_point_1_4_v1",
    fileName: "match-point-display-v2.png", widthPixels: 1254,
    heightPixels: 1254 }),
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
  const sourceRestricted = adapter.laneClearanceAudits.filter((entry) => (
    entry.sourceStraightTransitBaseProfilesBlocked.length > 0));
  const defaultRestricted = adapter.laneClearanceAudits.filter((entry) => (
    entry.straightTransitBaseProfilesBlocked.length > 0));
  const defaultUniversal = adapter.laneClearanceAudits.filter((entry) => (
    entry.hardGeometryClearanceCertified
      && entry.allCurrentBaseProfilesStraightTransit));
  const defaultTurnCapable = adapter.laneClearanceAudits.filter((entry) => (
    entry.hardGeometryClearanceCertified
      && entry.allCurrentBaseProfilesInPlaceTurn));
  return {
    baseProfilesAudited: adapter.baseProfiles.map((entry) => entry.baseId),
    sourceRestrictedLaneIds: sourceRestricted.map((entry) => entry.laneId),
    defaultRestrictedLaneIds: defaultRestricted.map((entry) => entry.laneId),
    defaultWidenedLaneIds: adapter.lanes.filter((entry) => (
      entry.defaultPassageMode === "widen_all_current_bases"
    )).map((entry) => entry.laneId),
    defaultUniversalRouteIds: defaultUniversal.map((entry) => entry.laneId),
    defaultUniversalTurnRouteIds: defaultTurnCapable.map((entry) => entry.laneId),
    atLeastOneUniversalCurrentBaseRoute: defaultUniversal.length > 0,
    routePixelsAreRulesAuthority: false,
  };
}

function artAsset(row) {
  return {
    assetRevision: row.fileName.match(/-v(\d+)\.png$/)?.[1] || "1",
    path: `${PUBLIC_MAP_ROOT}/${row.fileName}`,
    widthPixels: row.widthPixels,
    heightPixels: row.heightPixels,
    generatedOriginal: true,
    sourceScreenshotBundled: false,
    displayOnly: true,
    backgroundRulesAuthority: false,
    trainingTruth: false,
  };
}

function galleryEntry(row, seedById, adapterCatalogue) {
  const seed = seedById.get(row.seedId);
  if (!seed || seed.gameEra !== "brood_war") {
    fail("BROOD_WAR_MAP_GALLERY_SEED_INVALID", row.seedId);
  }
  const adapter = getOfficialCompetitiveMapTabletopAdapterV1(adapterCatalogue,
    row.seedId);
  const compilation = compileOfficialCompetitiveMapTwoLayerV1({
    adapterCatalogue, seedId: row.seedId,
  });
  verifyOfficialCompetitiveMapTwoLayerCompilationV1(compilation,
    adapterCatalogue);
  const passage = passageSummary(adapter);
  const classicVariant = row.classicVariant ? {
    ...artAsset(row.classicVariant),
    passageMode: row.classicVariant.passageMode,
    sourceRestrictedLaneIds: passage.sourceRestrictedLaneIds,
    userFacingRestriction: row.classicVariant.userFacingRestriction,
    selectableOnlyWithRestrictionDisclosure: true,
  } : null;
  return {
    schema: "starcraft_tmg_official_brood_war_map_gallery_entry_v1",
    version: "1.0.0",
    seedId: seed.seedId,
    displayName: seed.displayName,
    sourceVariant: seed.sourceVariant,
    competitiveEvidenceUrl: seed.competitiveEvidenceUrl,
    sourceMapDimensions: structuredClone(seed.sourceMapDimensions),
    topologySignature: structuredClone(seed.topologySignature),
    topologyHash: adapter.topologyHash,
    visualCompositionKey: `${seed.seedId}:individual-topology-v1`,
    styleProfileId: STYLE_PROFILE_ID,
    engagementScale: adapter.engagementScale,
    battlefield: structuredClone(adapter.battlefield),
    defaultArtAsset: artAsset(row),
    classicArtVariant: classicVariant,
    passageAudit: passage,
    defaultRulesRecipe: {
      recipeId: compilation.compilationId,
      compilationHash: compilation.compilationHash,
      adapterHash: compilation.adapterHash,
      terrainPieceCount: compilation.rulesLayer.terrainPieces.length,
      selectionReceiptCount: compilation.selectionReceipt.length,
      compensatingTerrainPieceCount:
        compilation.rulesLayer.compensatingTerrainPieceIds.length,
      officialRecipeEligible: compilation.officialRecipeEligible,
      roomCertificationEligible: compilation.roomCertificationEligible,
    },
    sourceImageRedistributed: false,
    runtimePixelInferenceAllowed: false,
    artAndRulesLayersIndependent: true,
    rulesTruth: "compiled_two_layer_recipe_only",
    trainingTruth: false,
  };
}

export function createOfficialBroodWarMapGalleryV1(input = {}) {
  const seedCatalogue = input.seedCatalogue
    || createOfficialCompetitiveMapSeedCatalogueV1();
  const adapterCatalogue = input.adapterCatalogue
    || createOfficialCompetitiveMapTabletopAdapterCatalogueV1();
  verifyOfficialCompetitiveMapTabletopAdapterCatalogueV1(adapterCatalogue);
  const seedById = new Map(seedCatalogue.seeds.map((entry) => (
    [entry.seedId, entry])));
  const entries = ART_ROWS.map((row) => galleryEntry(row, seedById,
    adapterCatalogue));
  const body = {
    schema: OFFICIAL_BROOD_WAR_MAP_GALLERY_V1_SCHEMA,
    version: "1.0.0",
    styleProfile: {
      styleProfileId: STYLE_PROFILE_ID,
      renderingLanguage: "brood_war_remastered_top_down_2d",
      surfaceTreatment: "matte_printed_tabletop",
      tokenCompatibility: "quiet_microdetail_under_high_resolution_pieces",
      prohibitedTreatments: ["modern_pbr", "cinematic_isometric",
        "anime", "shared_generic_layout_template"],
    },
    entries,
    counts: {
      total: entries.length,
      Standard: entries.filter((entry) => (
        entry.engagementScale === "Standard")).length,
      Skirmish: entries.filter((entry) => (
        entry.engagementScale === "Skirmish")).length,
      defaultArtAssets: entries.length,
      classicRestrictedVariants: entries.filter((entry) => (
        entry.classicArtVariant)).length,
    },
    everyEntryUsesIndividualTopology: new Set(entries.map((entry) => (
      entry.topologyHash))).size === entries.length,
    everyDefaultMapHasUniversalCurrentBaseRoute: entries.every((entry) => (
      entry.passageAudit.atLeastOneUniversalCurrentBaseRoute)),
    everyDefaultRecipeRoomCertifiable: entries.every((entry) => (
      entry.defaultRulesRecipe.roomCertificationEligible)),
    generatedOriginalArtOnly: true,
    sourceScreenshotsBundled: false,
    backgroundRulesAuthority: false,
    runtimePixelInferenceAllowed: false,
    sourceRefreshPerformed: false,
    rulesTruth: "gallery_binds_display_assets_to_compiled_rules_recipes",
    trainingTruth: false,
  };
  const result = deepFreeze({ ...body,
    galleryHash: hashStarcraftTmgContract(body) });
  verifyOfficialBroodWarMapGalleryV1(result, { seedCatalogue,
    adapterCatalogue });
  return result;
}

export function verifyOfficialBroodWarMapGalleryV1(value, input = {}) {
  const adapterCatalogue = input.adapterCatalogue
    || createOfficialCompetitiveMapTabletopAdapterCatalogueV1();
  verifyOfficialCompetitiveMapTabletopAdapterCatalogueV1(adapterCatalogue);
  if (!value || value.schema !== OFFICIAL_BROOD_WAR_MAP_GALLERY_V1_SCHEMA
    || value.version !== "1.0.0" || value.entries?.length !== 10
    || value.counts?.total !== 10 || value.counts.Standard !== 6
    || value.counts.Skirmish !== 4 || value.counts.defaultArtAssets !== 10
    || value.counts.classicRestrictedVariants !== 1
    || value.everyEntryUsesIndividualTopology !== true
    || value.everyDefaultMapHasUniversalCurrentBaseRoute !== true
    || value.everyDefaultRecipeRoomCertifiable !== true
    || value.generatedOriginalArtOnly !== true
    || value.sourceScreenshotsBundled !== false
    || value.backgroundRulesAuthority !== false
    || value.runtimePixelInferenceAllowed !== false
    || value.trainingTruth !== false
    || value.galleryHash !== hashStarcraftTmgContract(without(value,
      ["galleryHash"]))) {
    fail("BROOD_WAR_MAP_GALLERY_INVALID");
  }
  const seedIds = new Set();
  const topologyHashes = new Set();
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
      || compilation.compilationHash
        !== entry.defaultRulesRecipe?.compilationHash
      || entry.engagementScale !== adapter.engagementScale
      || entry.battlefield.widthInches !== adapter.battlefield.widthInches
      || entry.battlefield.heightInches !== adapter.battlefield.heightInches
      || entry.defaultArtAsset?.displayOnly !== true
      || entry.defaultArtAsset?.backgroundRulesAuthority !== false
      || entry.passageAudit?.atLeastOneUniversalCurrentBaseRoute !== true
      || entry.passageAudit?.routePixelsAreRulesAuthority !== false
      || entry.artAndRulesLayersIndependent !== true
      || entry.trainingTruth !== false) {
      fail("BROOD_WAR_MAP_GALLERY_ENTRY_INVALID", entry?.seedId);
    }
    seedIds.add(entry.seedId);
    topologyHashes.add(entry.topologyHash);
    assetPaths.add(entry.defaultArtAsset.path);
  }
  const blueStorm = value.entries.find((entry) => (
    entry.seedId === "sc1_blue_storm_1_2_v1"));
  if (!blueStorm?.classicArtVariant
    || blueStorm.classicArtVariant.passageMode
      !== "preserve_source_clearance"
    || !blueStorm.classicArtVariant.sourceRestrictedLaneIds.length
    || !blueStorm.passageAudit.defaultWidenedLaneIds.length
    || blueStorm.passageAudit.defaultRestrictedLaneIds.length !== 0) {
    fail("BROOD_WAR_MAP_GALLERY_BLUE_STORM_PASSAGE_INVALID");
  }
  return true;
}

