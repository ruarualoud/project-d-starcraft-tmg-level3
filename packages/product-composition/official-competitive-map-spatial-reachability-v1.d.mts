export interface OfficialCompetitiveMapSpatialReachabilityV1 {
  schema: "starcraft_tmg_official_competitive_map_spatial_reachability_v1";
  version: "1.0.0"; seedId: string;
  auditAuthority: "official_task_geometry" | "map_topology_preview";
  battlefield: Readonly<{ widthInches: number; heightInches: number }>;
  gridStepInches: 0.5; controlDistanceInches: 3;
  baseProfileIds: readonly string[]; blockingTerrainPieceIds: readonly string[];
  sideIds: readonly [string, string]; targetIds: readonly string[];
  baseProfileAudits: readonly Readonly<Record<string, unknown>>[];
  targetReachabilityBySide: readonly Readonly<Record<string, unknown>>[];
  everyEntrySegmentUsable: boolean;
  opposingSidesConnectedForEveryCurrentBase: boolean;
  everyRequiredTargetReachableForEveryCurrentBase: boolean;
  everyRequiredTargetReachableByAtLeastOneCurrentBase: boolean;
  spatialReachabilityCertified: boolean;
  sourcePixelsUsedAsRulesGeometry: false; rulesTruth: string;
  trainingTruth: false; auditHash: string;
}

export const OFFICIAL_COMPETITIVE_MAP_SPATIAL_REACHABILITY_V1_SCHEMA:
  "starcraft_tmg_official_competitive_map_spatial_reachability_v1";
export function auditOfficialCompetitiveMapSpatialReachabilityV1(input: {
  seedId: string;
  auditAuthority: "official_task_geometry" | "map_topology_preview";
  battlefield: Readonly<{ widthInches: number; heightInches: number }>;
  terrainPieces: readonly Readonly<Record<string, unknown>>[];
  baseProfiles: readonly Readonly<Record<string, unknown>>[];
  entryEdgesBySide?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  entryAnchorsBySide?: Readonly<Record<string, Readonly<Record<string, number>>>>;
  missionMarkers?: readonly Readonly<Record<string, unknown>>[];
  areaTargets?: readonly Readonly<Record<string, unknown>>[];
}): Readonly<OfficialCompetitiveMapSpatialReachabilityV1>;
export function verifyOfficialCompetitiveMapSpatialReachabilityV1(
  audit: unknown,
): true;
