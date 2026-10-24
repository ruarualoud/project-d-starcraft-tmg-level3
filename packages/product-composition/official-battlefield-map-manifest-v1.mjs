import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { OFFICIAL_PREMADE_MAP_SOURCE_FAMILY_V1, OFFICIAL_PREMADE_MAP_VISUAL_PRESET_V1,
  getOfficialPremadeMapRoomSeedV1 } from "./official-premade-map-room-source-v1.mjs";

export const OFFICIAL_BATTLEFIELD_MAP_MANIFEST_V1_SCHEMA =
  "starcraft_tmg_official_battlefield_map_manifest_v1";

export const OFFICIAL_BATTLEFIELD_VISUAL_PRESET_IDS_V1 = Object.freeze([
  "lost_temple_inspired_v1",
  "fighting_spirit_inspired_v1",
]);

export const OFFICIAL_BATTLEFIELD_TERRAIN_PRESET_IDS_V1 = Object.freeze([
  "standard_balanced_nine_v1",
  "lost_temple_balanced_nine_v1",
  "fighting_spirit_balanced_nine_v1",
]);

const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function text(value, code) {
  const result = String(value || "").trim();
  if (!result) fail(code);
  return result;
}

function optionalText(value) {
  const result = String(value || "").trim();
  return result || null;
}

function clone(value) { return structuredClone(value); }

function planHash(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("BATTLEFIELD_MAP_TERRAIN_PLAN_REQUIRED");
  }
  return hashStarcraftTmgContract(value);
}

export function createOfficialBattlefieldMapManifestV1(input = {}) {
  const mapSourceFamily = optionalText(input.mapSourceFamily);
  const officialPremade = mapSourceFamily === OFFICIAL_PREMADE_MAP_SOURCE_FAMILY_V1;
  if (mapSourceFamily && !officialPremade) fail("BATTLEFIELD_MAP_SOURCE_FAMILY_UNSUPPORTED", mapSourceFamily);
  const visualPresetId = text(
    input.visualPresetId || "lost_temple_inspired_v1",
    "BATTLEFIELD_MAP_VISUAL_PRESET_REQUIRED",
  );
  const terrainPresetId = text(
    input.terrainPresetId || "standard_balanced_nine_v1",
    "BATTLEFIELD_MAP_TERRAIN_PRESET_REQUIRED",
  );
  if (!OFFICIAL_BATTLEFIELD_VISUAL_PRESET_IDS_V1.includes(visualPresetId)
    && !(officialPremade && visualPresetId === OFFICIAL_PREMADE_MAP_VISUAL_PRESET_V1)
    && !/^sc[12]_[a-z0-9_]+:generated-original-art-v2$/u.test(visualPresetId)) {
    fail("BATTLEFIELD_MAP_VISUAL_PRESET_UNSUPPORTED", visualPresetId);
  }
  if (!OFFICIAL_BATTLEFIELD_TERRAIN_PRESET_IDS_V1.includes(terrainPresetId)) {
    fail("BATTLEFIELD_MAP_TERRAIN_PRESET_UNSUPPORTED", terrainPresetId);
  }
  const body = {
    schema: OFFICIAL_BATTLEFIELD_MAP_MANIFEST_V1_SCHEMA,
    version: officialPremade ? "1.2.0" : "1.1.0",
    ...(officialPremade ? { mapSourceFamily } : {}),
    mapSeedId: optionalText(input.mapSeedId),
    mapDisplayName: optionalText(input.mapDisplayName),
    mapGameEra: optionalText(input.mapGameEra),
    mapArtAssetPath: optionalText(input.mapArtAssetPath),
    ...(Array.isArray(input.mapArtOverlays) && input.mapArtOverlays.length > 0
      ? { mapArtOverlays: clone(input.mapArtOverlays) } : {}),
    engagementScale: optionalText(input.engagementScale),
    visualPresetId,
    terrainPresetId,
    terrainSeed: text(input.terrainSeed || "standard-2000-acceptance-v1",
      "BATTLEFIELD_MAP_TERRAIN_SEED_REQUIRED"),
    terrainGenerationMode: input.terrainGenerationMode === "seeded_constrained"
      ? "seeded_constrained" : "curated_fixed",
    rulesTerrainPlanHash: planHash(input.terrainPlan),
    rulesTerrainPieceCount: Array.isArray(input.terrainPlan?.terrainPieces)
      ? input.terrainPlan.terrainPieces.length : 0,
    mapCompilationHash: optionalText(input.mapCompilationHash),
    mapRoomFreezeHash: optionalText(input.mapRoomFreezeHash),
    missionSpatialReachabilityAuditHash:
      optionalText(input.missionSpatialReachabilityAuditHash),
    elementSelectionCount: Number.isSafeInteger(input.elementSelectionCount)
      ? input.elementSelectionCount : 0,
    passageSelectionCount: Number.isSafeInteger(input.passageSelectionCount)
      ? input.passageSelectionCount : 0,
    formalTaskRoomEligible: input.formalTaskRoomEligible !== false,
    backgroundVisibleByDefault: input.backgroundVisibleByDefault !== false,
    terrainVisibleByDefault: input.terrainVisibleByDefault !== false,
    backgroundRulesAuthority: false,
    authoritativeTerrainLayer: true,
    pixelInferenceConfersRulesAuthority: false,
    visualSelectionMayMutateRules: false,
    sourceRefreshPerformed: false,
    rulesTruth: "official_room_bound_terrain_manifest_only",
    trainingTruth: false,
  };
  if (body.rulesTerrainPieceCount < 1) {
    fail("BATTLEFIELD_MAP_TERRAIN_PLAN_EMPTY");
  }
  if (body.mapSeedId && (!body.mapDisplayName
    || !body.mapArtAssetPath?.startsWith("/assets/client/battlefield/maps/")
    || ![body.mapCompilationHash, body.mapRoomFreezeHash,
      body.missionSpatialReachabilityAuditHash].every((entry) => (
      HASH_PATTERN.test(String(entry || ""))))
    || body.elementSelectionCount < 1
    || (officialPremade ? body.passageSelectionCount !== 0 : body.passageSelectionCount < 1)
    || body.formalTaskRoomEligible !== true)) {
    fail("BATTLEFIELD_MAP_COMPETITIVE_BINDING_INVALID", body.mapSeedId);
  }
  if (officialPremade && (!getOfficialPremadeMapRoomSeedV1(body.mapSeedId)
    || body.mapGameEra !== "official_tmg" || visualPresetId !== OFFICIAL_PREMADE_MAP_VISUAL_PRESET_V1
    || body.engagementScale !== getOfficialPremadeMapRoomSeedV1(body.mapSeedId).engagementScale)) {
    fail("BATTLEFIELD_MAP_PREMADE_SOURCE_INVALID", body.mapSeedId || "");
  }
  if (body.mapArtOverlays && (!body.mapSeedId
    || body.mapArtOverlays.some((entry) => (
      !String(entry?.overlayId || "").trim()
      || !String(entry?.assetPath || "").startsWith(
        "/assets/client/battlefield/maps/")
      || !HASH_PATTERN.test(String(entry?.sha256 || ""))
      || (entry.flipX !== undefined && typeof entry.flipX !== "boolean")
      || !["xMin", "xMax", "yMin", "yMax"].every((key) => (
        Number.isFinite(entry?.rectangleNormalized?.[key])
          && entry.rectangleNormalized[key] >= 0
          && entry.rectangleNormalized[key] <= 1000))
      || entry.rectangleNormalized.xMin >= entry.rectangleNormalized.xMax
      || entry.rectangleNormalized.yMin >= entry.rectangleNormalized.yMax
    )))) {
    fail("BATTLEFIELD_MAP_ART_OVERLAY_INVALID", body.mapSeedId || "");
  }
  return Object.freeze({ ...body,
    manifestHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialBattlefieldMapManifestV1(value, terrainPlan) {
  if (!value || value.schema !== OFFICIAL_BATTLEFIELD_MAP_MANIFEST_V1_SCHEMA
    || value.backgroundRulesAuthority !== false
    || value.authoritativeTerrainLayer !== true
    || value.pixelInferenceConfersRulesAuthority !== false
    || value.visualSelectionMayMutateRules !== false) {
    fail("BATTLEFIELD_MAP_MANIFEST_INVALID");
  }
  const expected = createOfficialBattlefieldMapManifestV1({
    mapSeedId: value.mapSeedId,
    mapDisplayName: value.mapDisplayName,
    mapGameEra: value.mapGameEra,
    mapSourceFamily: value.mapSourceFamily,
    mapArtAssetPath: value.mapArtAssetPath,
    mapArtOverlays: value.mapArtOverlays,
    engagementScale: value.engagementScale,
    visualPresetId: value.visualPresetId,
    terrainPresetId: value.terrainPresetId,
    terrainSeed: value.terrainSeed,
    terrainGenerationMode: value.terrainGenerationMode,
    terrainPlan,
    mapCompilationHash: value.mapCompilationHash,
    mapRoomFreezeHash: value.mapRoomFreezeHash,
    missionSpatialReachabilityAuditHash:
      value.missionSpatialReachabilityAuditHash,
    elementSelectionCount: value.elementSelectionCount,
    passageSelectionCount: value.passageSelectionCount,
    formalTaskRoomEligible: value.formalTaskRoomEligible,
    backgroundVisibleByDefault: value.backgroundVisibleByDefault,
    terrainVisibleByDefault: value.terrainVisibleByDefault,
  });
  if (!isDeepStrictEqual(clone(value), clone(expected))) {
    fail("BATTLEFIELD_MAP_MANIFEST_DRIFT");
  }
  return true;
}
