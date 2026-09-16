import type { CompetitiveMapRulesModeV1 } from
  "./official-competitive-map-topology-catalogue-v1.mjs";

export interface CompetitiveMapTabletopAdapterElementV1 {
  elementId: string; sourceGroupId: string; sourceKind: string; sourceFeature: string;
  artFootprint: Readonly<{ centre: Readonly<{ xInches: number; yInches: number }>;
    widthInches: number; heightInches: number; rotationDegrees: number }>;
  candidateRulesFootprint: Readonly<{ xMin: number; xMax: number;
    yMin: number; yMax: number }>;
  geometryAdaptations: Readonly<{
    rotatedArtFlattenedToConservativeAxisAlignedRulesEnvelope: boolean;
    rulesEnvelopeClippedToBattlefield: boolean }>;
  artRetainByDefault: true; userMayToggleArt: true;
  defaultRulesMode: CompetitiveMapRulesModeV1;
  recommendedRulesMode: CompetitiveMapRulesModeV1;
  allowedRulesModes: readonly CompetitiveMapRulesModeV1[];
  rulesEnabledByDefault: boolean; userMayDisableRules: true;
  clearanceResolution: string; conflictingLaneIds?: readonly string[];
  userMayRestoreHardModeOnlyAfterCompilerClearanceRepair?: true;
  rulesAuthority: false; trainingTruth: false;
}

export interface CompetitiveMapLaneClearanceAuditV1 {
  laneId: string; requiredClearanceInches: number;
  sourceRequiredClearanceInches: number;
  defaultPassageMode: "preserve_source_clearance" | "widen_all_current_bases";
  sourceStraightTransitBaseProfilesCovered: readonly string[];
  sourceStraightTransitBaseProfilesBlocked: readonly string[];
  straightTransitBaseProfilesCovered: readonly string[];
  straightTransitBaseProfilesBlocked: readonly string[];
  broadsideTransitBaseProfilesCovered: readonly string[];
  inPlaceTurnBaseProfilesCovered: readonly string[];
  allCurrentBaseProfilesStraightTransit: boolean;
  allCurrentBaseProfilesInPlaceTurn: boolean;
  passageClass: "universal_current_base_turning"
    | "universal_current_base_straight_transit"
    | "restricted_current_base_profiles";
  hardBlockerIntrusions: readonly string[];
  hardGeometryClearanceCertified: true;
}

export interface OfficialCompetitiveMapTabletopAdapterV1 {
  schema: "starcraft_tmg_official_competitive_map_tabletop_adapter_v1";
  version: "1.2.0"; seedId: string; topologyHash: string;
  sourceMapDimensions: Readonly<{ widthTiles: number; heightTiles: number }>;
  sourceMapAreaTiles: number;
  engagementScale: "Skirmish" | "Standard" | "Grand Offensive";
  scaleAssignmentBasis: string;
  battlefield: Readonly<{ widthInches: number; heightInches: 36 }>;
  currentMissionDeploymentGeometryCoverage: string;
  elements: readonly Readonly<CompetitiveMapTabletopAdapterElementV1>[];
  lanes: readonly Readonly<Record<string, unknown>>[];
  zones: readonly Readonly<Record<string, unknown>>[];
  passageRecommendations: readonly Readonly<Record<string, unknown>>[];
  laneClearanceAudits: readonly Readonly<CompetitiveMapLaneClearanceAuditV1>[];
  fireLaneCandidateIds: readonly string[];
  allLanesHardGeometryClearanceCertified: true;
  hasUniversalCurrentBaseRoute: true;
  artAndRulesLayersRemainIndependent: true;
  hardModeOverrideRequiresRecompilation: true;
  normalizedCoordinatesAreRulesAuthority: false;
  compiledGeometryIsRulesAuthority: false;
  rulesTruth: "tabletop_adaptation_candidate_requires_recipe_compilation";
  trainingTruth: false; adapterHash: string;
}

export interface OfficialCompetitiveMapTabletopAdapterCatalogueV1 {
  schema: "starcraft_tmg_official_competitive_map_tabletop_adapter_catalogue_v1";
  version: "1.2.0"; topologyCatalogueHash: string;
  engagementScaleProfiles: readonly Readonly<Record<string, unknown>>[];
  adapters: readonly Readonly<OfficialCompetitiveMapTabletopAdapterV1>[];
  counts: Readonly<{ total: 20; elements: number; lanes: number;
    passageRecommendations: number; downgradedSourceDefaults: number;
    byEngagementScale: Readonly<{ Skirmish: number; Standard: number;
      "Grand Offensive": number }> }>;
  allMapLanesHardGeometryClearanceCertified: true;
  allMapsHaveUniversalCurrentBaseRoute: true;
  artAndRulesLayersRemainIndependent: true;
  sourceRefreshPerformed: false; rulesTruth: string; trainingTruth: false;
  catalogueHash: string;
}

export const OFFICIAL_COMPETITIVE_MAP_TABLETOP_ADAPTER_V1_SCHEMA:
  "starcraft_tmg_official_competitive_map_tabletop_adapter_catalogue_v1";
export function createOfficialCompetitiveMapTabletopAdapterCatalogueV1(input?: {
  topologyCatalogue?: unknown;
}): Readonly<OfficialCompetitiveMapTabletopAdapterCatalogueV1>;
export function verifyOfficialCompetitiveMapTabletopAdapterCatalogueV1(
  catalogue: unknown, topologyCatalogue?: unknown,
): true;
export function getOfficialCompetitiveMapTabletopAdapterV1(
  catalogue: OfficialCompetitiveMapTabletopAdapterCatalogueV1,
  seedId: unknown,
): Readonly<OfficialCompetitiveMapTabletopAdapterV1>;
