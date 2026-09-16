export type CompetitiveMapRulesModeV1 = "blocking" | "passable_difficult"
  | "standable_high_ground" | "grass_sight" | "cover" | "visual_only";
export type CompetitiveMapClearanceClassV1 = "small" | "standard"
  | "single_heavy" | "heavy_turn" | "formation_fire_lane";

export interface CompetitiveMapNormalizedPointV1 { x: number; y: number; }
export interface CompetitiveMapTopologyElementV1 {
  elementId: string; sourceGroupId: string; sourceKind: string;
  sourceFeature: string; retainByDefault: true;
  artRetainByDefault: true; userMayToggleArt: true;
  defaultRulesMode: CompetitiveMapRulesModeV1;
  allowedRulesModes: readonly CompetitiveMapRulesModeV1[];
  rulesEnabledByDefault: boolean; userMayDisableRules: true;
  normalizedFootprint: Readonly<{ centreX: number; centreY: number;
    width: number; height: number; rotationDegrees: number }>;
  userMayOmit: true; userMayChangeRulesMode: true;
  rulesAuthorityBeforeCompilation: false; trainingTruth: false;
}
export interface OfficialCompetitiveMapTopologyV1 {
  schema: "starcraft_tmg_official_competitive_map_topology_v1";
  version: "1.0.0"; seedId: string; seedHash: string;
  topologyPresetId: string; gameEra: "brood_war" | "starcraft_2";
  displayName: string; symmetry: string; playerAxis: string;
  normalizedCoordinateSpace: Readonly<{ width: 1000; height: 1000 }>;
  zones: readonly Readonly<{ zoneId: string; role: string;
    centre: CompetitiveMapNormalizedPointV1 }>[];
  lanes: readonly Readonly<{ laneId: string; fromZoneId: string; toZoneId: string;
    routeClass: string; clearanceClass: CompetitiveMapClearanceClassV1;
    centreline: readonly CompetitiveMapNormalizedPointV1[] }>[];
  portals: readonly Readonly<{ portalId: string; laneId: string;
    portalKind: string; initialState: string; linkedElementGroupId: string | null }>[];
  elements: readonly Readonly<CompetitiveMapTopologyElementV1>[];
  sourceElementGroups: readonly Readonly<{ sourceGroupId: string;
    sourceKind: string; sourceFeature: string; elementIds: readonly string[] }>[];
  artCompositionHint: string; runtimePixelInferenceAllowed: false;
  everyElementIndependentlyConfigurable: true;
  topologyRequiresTabletopCompilation: true;
  rulesAuthority: false; trainingTruth: false; topologyHash: string;
}
export interface OfficialCompetitiveMapTopologyCatalogueV1 {
  schema: "starcraft_tmg_official_competitive_map_topology_catalogue_v1";
  version: "1.0.0"; seedCatalogueHash: string;
  topologies: readonly Readonly<OfficialCompetitiveMapTopologyV1>[];
  counts: Readonly<{ total: number; elements: number; lanes: number; portals: number }>;
  normalizedCoordinatesAreRulesAuthority: false;
  runtimePixelInferenceAllowed: false;
  rulesTruth: "reviewed_source_topology_requires_tabletop_compilation";
  trainingTruth: false; catalogueHash: string;
}
export const OFFICIAL_COMPETITIVE_MAP_TOPOLOGY_CATALOGUE_V1_SCHEMA:
  "starcraft_tmg_official_competitive_map_topology_catalogue_v1";
export function createOfficialCompetitiveMapTopologyCatalogueV1(input?: {
  seedCatalogue?: unknown;
}): Readonly<OfficialCompetitiveMapTopologyCatalogueV1>;
export function verifyOfficialCompetitiveMapTopologyCatalogueV1(
  catalogue: unknown, seedCatalogue?: unknown,
): true;
export function getOfficialCompetitiveMapTopologyV1(
  catalogue: OfficialCompetitiveMapTopologyCatalogueV1,
  seedId: unknown,
): Readonly<OfficialCompetitiveMapTopologyV1>;
