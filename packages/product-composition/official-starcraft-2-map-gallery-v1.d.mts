import type { OfficialCompetitiveMapSeedCatalogueV1 } from
  "./official-competitive-map-seed-catalogue-v1.mjs";
import type { OfficialCompetitiveMapTabletopAdapterCatalogueV1 } from
  "./official-competitive-map-tabletop-adapter-v1.mjs";

export interface OfficialStarcraft2MapGalleryEntryV1 {
  schema: "starcraft_tmg_official_starcraft_2_map_gallery_entry_v1";
  version: "1.0.0"; seedId: string; displayName: string;
  sourceVariant: string; competitiveEvidenceUrl: string;
  sourceMapDimensions: Readonly<{ widthTiles: number; heightTiles: number }>;
  topologySignature: readonly string[]; topologyHash: string;
  visualCompositionKey: string; styleProfileId: string;
  engagementScale: "Skirmish" | "Standard" | "Grand Offensive";
  battlefield: Readonly<{ widthInches: number; heightInches: 36 }>;
  defaultArtAsset: Readonly<{ assetRevision: string; path: string;
    widthPixels: number; heightPixels: number; generatedOriginal: true;
    sourceScreenshotBundled: false; displayOnly: true;
    backgroundRulesAuthority: false; trainingTruth: false }>;
  passageAudit: Readonly<Record<string, unknown>>;
  missionGeometryCoverage: string;
  defaultRulesRecipe: Readonly<{ recipeId: string; compilationHash: string;
    adapterHash: string; terrainPieceCount: number;
    selectionReceiptCount: number; compensatingTerrainPieceCount: number;
    officialRecipeEligible: true; roomCertificationEligible: boolean }>;
  sourceImageRedistributed: false; runtimePixelInferenceAllowed: false;
  artAndRulesLayersIndependent: true; rulesTruth: string; trainingTruth: false;
}
export interface OfficialStarcraft2MapGalleryV1 {
  schema: "starcraft_tmg_official_starcraft_2_map_gallery_v1";
  version: "1.0.0"; styleProfile: Readonly<Record<string, unknown>>;
  entries: readonly Readonly<OfficialStarcraft2MapGalleryEntryV1>[];
  counts: Readonly<{ total: 10; Standard: 3; Skirmish: 2;
    GrandOffensive: 5; defaultArtAssets: 10;
    exactMissionGeometryMaps: 5; topologyPreviewOnlyMaps: 5 }>;
  everyEntryUsesIndividualTopology: true;
  everyDefaultMapHasUniversalCurrentBaseRoute: true;
  everyExactGeometryRecipeRoomCertifiable: true;
  grandFormalTaskRoomsBlockedUntilOfficialGeometry: true;
  generatedOriginalArtOnly: true; sourceScreenshotsBundled: false;
  backgroundRulesAuthority: false; runtimePixelInferenceAllowed: false;
  sourceRefreshPerformed: false; rulesTruth: string; trainingTruth: false;
  galleryHash: string;
}
export const OFFICIAL_STARCRAFT_2_MAP_GALLERY_V1_SCHEMA:
  "starcraft_tmg_official_starcraft_2_map_gallery_v1";
export function createOfficialStarcraft2MapGalleryV1(input?: {
  seedCatalogue?: OfficialCompetitiveMapSeedCatalogueV1;
  adapterCatalogue?: OfficialCompetitiveMapTabletopAdapterCatalogueV1;
}): Readonly<OfficialStarcraft2MapGalleryV1>;
export function verifyOfficialStarcraft2MapGalleryV1(value: unknown, input?: {
  seedCatalogue?: OfficialCompetitiveMapSeedCatalogueV1;
  adapterCatalogue?: OfficialCompetitiveMapTabletopAdapterCatalogueV1;
}): true;
