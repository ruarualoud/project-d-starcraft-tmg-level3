import type { OfficialCompetitiveMapSeedCatalogueV1 } from
  "./official-competitive-map-seed-catalogue-v1.mjs";
import type { OfficialCompetitiveMapTabletopAdapterCatalogueV1 } from
  "./official-competitive-map-tabletop-adapter-v1.mjs";

export interface OfficialBroodWarMapArtAssetV1 {
  assetRevision: string; path: string; widthPixels: number; heightPixels: number;
  generatedOriginal: true; sourceScreenshotBundled: false; displayOnly: true;
  backgroundRulesAuthority: false; trainingTruth: false;
}

export interface OfficialBroodWarMapGalleryEntryV1 {
  schema: "starcraft_tmg_official_brood_war_map_gallery_entry_v1";
  version: "1.0.0"; seedId: string; displayName: string;
  sourceVariant: string; competitiveEvidenceUrl: string;
  sourceMapDimensions: Readonly<{ widthTiles: number; heightTiles: number }>;
  topologySignature: readonly string[]; topologyHash: string;
  visualCompositionKey: string; styleProfileId: string;
  engagementScale: "Skirmish" | "Standard";
  battlefield: Readonly<{ widthInches: number; heightInches: 36 }>;
  defaultArtAsset: Readonly<OfficialBroodWarMapArtAssetV1>;
  classicArtVariant: Readonly<(OfficialBroodWarMapArtAssetV1 & {
    passageMode: "preserve_source_clearance";
    sourceRestrictedLaneIds: readonly string[]; userFacingRestriction: string;
    selectableOnlyWithRestrictionDisclosure: true;
  })> | null;
  passageAudit: Readonly<{ baseProfilesAudited: readonly string[];
    sourceRestrictedLaneIds: readonly string[];
    defaultRestrictedLaneIds: readonly string[];
    defaultWidenedLaneIds: readonly string[];
    defaultUniversalRouteIds: readonly string[];
    defaultUniversalTurnRouteIds: readonly string[];
    atLeastOneUniversalCurrentBaseRoute: true;
    routePixelsAreRulesAuthority: false }>;
  defaultRulesRecipe: Readonly<{ recipeId: string; compilationHash: string;
    adapterHash: string; terrainPieceCount: number;
    selectionReceiptCount: number; compensatingTerrainPieceCount: number;
    officialRecipeEligible: true; roomCertificationEligible: true }>;
  sourceImageRedistributed: false; runtimePixelInferenceAllowed: false;
  artAndRulesLayersIndependent: true; rulesTruth: string;
  trainingTruth: false;
}

export interface OfficialBroodWarMapGalleryV1 {
  schema: "starcraft_tmg_official_brood_war_map_gallery_v1";
  version: "1.0.0"; styleProfile: Readonly<Record<string, unknown>>;
  entries: readonly Readonly<OfficialBroodWarMapGalleryEntryV1>[];
  counts: Readonly<{ total: 10; Standard: 6; Skirmish: 4;
    defaultArtAssets: 10; classicRestrictedVariants: 1 }>;
  everyEntryUsesIndividualTopology: true;
  everyDefaultMapHasUniversalCurrentBaseRoute: true;
  everyDefaultRecipeRoomCertifiable: true; generatedOriginalArtOnly: true;
  sourceScreenshotsBundled: false; backgroundRulesAuthority: false;
  runtimePixelInferenceAllowed: false; sourceRefreshPerformed: false;
  rulesTruth: string; trainingTruth: false; galleryHash: string;
}

export const OFFICIAL_BROOD_WAR_MAP_GALLERY_V1_SCHEMA:
  "starcraft_tmg_official_brood_war_map_gallery_v1";
export function createOfficialBroodWarMapGalleryV1(input?: {
  seedCatalogue?: OfficialCompetitiveMapSeedCatalogueV1;
  adapterCatalogue?: OfficialCompetitiveMapTabletopAdapterCatalogueV1;
}): Readonly<OfficialBroodWarMapGalleryV1>;
export function verifyOfficialBroodWarMapGalleryV1(value: unknown, input?: {
  seedCatalogue?: OfficialCompetitiveMapSeedCatalogueV1;
  adapterCatalogue?: OfficialCompetitiveMapTabletopAdapterCatalogueV1;
}): true;
