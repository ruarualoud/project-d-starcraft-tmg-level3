export type OfficialCompetitiveMapGameEraV1 = "brood_war" | "starcraft_2";

export interface OfficialCompetitiveMapSeedV1 {
  schema: "starcraft_tmg_official_competitive_map_seed_v1";
  version: "1.0.0";
  ordinal: number;
  seedId: string;
  gameEra: OfficialCompetitiveMapGameEraV1;
  displayName: string;
  sourceVariant: string;
  competitiveEvidenceUrl: string;
  topologySignature: readonly string[];
  tabletopAdaptationGoal: string;
  topologyPresetId: string;
  visualPresetId: string;
  researchCapturedAt: "2026-09-16";
  sourceAuthority: "public_competitive_history_research";
  sourceImageBundled: false;
  redistributionPermissionClaimed: false;
  runtimePixelInferenceAllowed: false;
  rulesAuthority: false;
  trainingTruth: false;
  seedHash: string;
}

export interface OfficialCompetitiveMapSeedCatalogueV1 {
  schema: "starcraft_tmg_official_competitive_map_seed_catalogue_v1";
  version: "1.0.0";
  researchCapturedAt: "2026-09-16";
  counts: Readonly<{ total: 20; broodWar: 10; starcraft2: 10 }>;
  seeds: readonly Readonly<OfficialCompetitiveMapSeedV1>[];
  topologyTranscriptionRequiredBeforeVisualPromotion: true;
  genericSharedVisualTemplateAllowed: false;
  runtimePixelInferenceAllowed: false;
  rulesTruth: "research_seed_catalogue_only";
  trainingTruth: false;
  catalogueHash: string;
}

export const OFFICIAL_COMPETITIVE_MAP_SEED_CATALOGUE_V1_SCHEMA:
  "starcraft_tmg_official_competitive_map_seed_catalogue_v1";
export function createOfficialCompetitiveMapSeedCatalogueV1():
  Readonly<OfficialCompetitiveMapSeedCatalogueV1>;
export function verifyOfficialCompetitiveMapSeedCatalogueV1(
  catalogue: unknown,
): true;
export function getOfficialCompetitiveMapSeedV1(
  catalogue: OfficialCompetitiveMapSeedCatalogueV1,
  seedId: unknown,
): Readonly<OfficialCompetitiveMapSeedV1>;

