import type { OfficialCompetitiveMapTabletopAdapterCatalogueV1 } from
  "./official-competitive-map-tabletop-adapter-v1.mjs";

export type CompetitiveMapArtDispositionV1 = "retain" | "hide";
export type CompetitiveMapRulesDispositionV1 = "auto" | "enabled" | "disabled";
export type CompetitiveMapCompiledRulesModeV1 = "blocking" | "passable_difficult"
  | "standable_high_ground" | "grass_sight" | "cover" | "visual_only";

export interface CompetitiveMapElementSelectionInputV1 {
  elementId: string;
  artDisposition?: CompetitiveMapArtDispositionV1;
  rulesDisposition?: CompetitiveMapRulesDispositionV1;
  rulesMode?: CompetitiveMapCompiledRulesModeV1;
}

export interface OfficialCompetitiveMapTwoLayerCompilationV1 {
  schema: "starcraft_tmg_official_competitive_map_two_layer_compilation_v1";
  version: "1.0.0"; compilationId: string; seedId: string; adapterHash: string;
  engagementScale: "Skirmish" | "Standard" | "Grand Offensive";
  sourceMapDimensions: Readonly<{ widthTiles: number; heightTiles: number }>;
  battlefield: Readonly<{ widthInches: number; heightInches: 36 }>;
  artLayer: Readonly<{ visualPresetId: string; elements: readonly Readonly<Record<string, unknown>>[];
    backgroundRulesAuthority: false; pixelInferenceAllowed: false }>;
  rulesLayer: Readonly<{ terrainPieces: readonly Readonly<Record<string, unknown>>[];
    setupPlanTemplate: Readonly<Record<string, unknown>>; planHash: string;
    targetCounts: Readonly<Record<string, number>>;
    actualCounts: Readonly<Record<string, number>>;
    compensatingTerrainPieceIds: readonly string[];
    exactDeploymentFireLanesPendingRoomBinding: true;
    authoritativeTerrainLayerAfterRoomCertification: true;
    rulesAuthorityBeforeRoomCertification: false }>;
  selectionReceipt: readonly Readonly<Record<string, unknown>>[];
  diagnostics: readonly Readonly<Record<string, unknown>>[];
  warnings: readonly Readonly<Record<string, unknown>>[];
  officialRecipeEligible: boolean; roomCertificationEligible: boolean;
  currentMissionDeploymentGeometryCoverage: string;
  everySourceElementIndependentlyConfigurable: true;
  artAndRulesLayersIndependent: true; deterministicCompilation: true;
  sourceRefreshPerformed: false; rulesTruth: string; trainingTruth: false;
  compilationHash: string;
}

export interface OfficialCompetitiveMapRoomFreezeV1 {
  schema: "starcraft_tmg_official_competitive_map_room_freeze_v1";
  version: "1.0.0"; roomId: string; seedId: string;
  engagementScale: "Skirmish" | "Standard";
  compilationHash: string; adapterHash: string;
  deploymentGeometryBindingHash: string; setupPlan: Readonly<Record<string, unknown>>;
  setupPlanHash: string; balancedTerrainCertificate: Readonly<Record<string, unknown>>;
  balancedTerrainCertificateHash: string; artLayerVisibilityFrozen: true;
  rulesLayerFrozen: true; backgroundRulesAuthority: false;
  authoritativeTerrainLayer: true; mutationAfterRoomCreationAllowed: false;
  sourceRefreshPerformed: false; rulesTruth: string; trainingTruth: false;
  roomFreezeHash: string;
}

export const OFFICIAL_COMPETITIVE_MAP_TWO_LAYER_COMPILATION_V1_SCHEMA:
  "starcraft_tmg_official_competitive_map_two_layer_compilation_v1";
export const OFFICIAL_COMPETITIVE_MAP_ROOM_FREEZE_V1_SCHEMA:
  "starcraft_tmg_official_competitive_map_room_freeze_v1";
export function compileOfficialCompetitiveMapTwoLayerV1(input: {
  adapterCatalogue?: OfficialCompetitiveMapTabletopAdapterCatalogueV1;
  seedId: string; elementSelections?: readonly CompetitiveMapElementSelectionInputV1[];
}): Readonly<OfficialCompetitiveMapTwoLayerCompilationV1>;
export function verifyOfficialCompetitiveMapTwoLayerCompilationV1(
  compilation: unknown,
  adapterCatalogue?: OfficialCompetitiveMapTabletopAdapterCatalogueV1,
): true;
export function certifyAndFreezeOfficialCompetitiveMapForRoomV1(input: {
  adapterCatalogue?: OfficialCompetitiveMapTabletopAdapterCatalogueV1;
  compilation: OfficialCompetitiveMapTwoLayerCompilationV1; roomId: string;
  deploymentGeometryBinding: unknown; deploymentGeometryDataBundle: unknown;
  balancedTerrainRulesDataBundle: unknown;
}): Readonly<OfficialCompetitiveMapRoomFreezeV1>;
export function verifyOfficialCompetitiveMapRoomFreezeV1(
  freeze: unknown, input: { deploymentGeometryBinding: unknown;
    balancedTerrainRulesDataBundle: unknown },
): true;
