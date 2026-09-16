export interface OfficialCompetitiveMapMissionCompatibilityMatrixV1 {
  schema: "starcraft_tmg_official_competitive_map_mission_compatibility_matrix_v1";
  version: "1.0.0"; adapterCatalogueHash: string;
  deploymentGeometryDataBundleHash: string;
  missionDeploymentDraftDataBundleHash: string;
  topologyAudits: readonly Readonly<Record<string, unknown>>[];
  taskGeometryAudits: readonly Readonly<Record<string, unknown>>[];
  combinationRows: readonly Readonly<Record<string, unknown>>[];
  mapReadiness: readonly Readonly<Record<string, unknown>>[];
  counts: Readonly<{ maps: 20; topologyAudits: 20; officialExactMaps: 15;
    grandPreviewOnlyMaps: 5; taskGeometryAudits: 75;
    officialMapMissionDeploymentCombinations: 375;
    reachableOfficialCombinations: number }>;
  allTwentyMapTopologiesReachable: boolean;
  allCurrentOfficialCombinationsReachable: boolean;
  grandFormalTaskRoomsBlockedUntilOfficialGeometry: true;
  sourcePixelsUsedAsRulesGeometry: false; sourceRefreshPerformed: false;
  rulesTruth: string; trainingTruth: false; matrixHash: string;
}

export const OFFICIAL_COMPETITIVE_MAP_MISSION_COMPATIBILITY_MATRIX_V1_SCHEMA:
  "starcraft_tmg_official_competitive_map_mission_compatibility_matrix_v1";
export function createOfficialCompetitiveMapMissionCompatibilityMatrixV1(input: {
  adapterCatalogue?: unknown; deploymentGeometryDataBundle: unknown;
  missionDeploymentDraftDataBundle: unknown;
}): Readonly<OfficialCompetitiveMapMissionCompatibilityMatrixV1>;
export function verifyOfficialCompetitiveMapMissionCompatibilityMatrixV1(
  matrix: unknown,
): true;
export function assertOfficialCompetitiveMapMissionCompatibilityReadyV1(
  matrix: unknown,
): true;
