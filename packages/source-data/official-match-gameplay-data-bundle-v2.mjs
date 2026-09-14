import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyCommandCenterSnapshot } from
  "../rule-atoms/official-live-source-snapshots-v1.mjs";
import {
  createOfficialCombatProfileBundleV1,
  verifyOfficialCombatProfileBundleV1,
} from "./official-combat-profile-bundle-v1.mjs";
import {
  createOfficialMissionEffectCatalogueV1,
  getOfficialMissionEffectIrV1,
  verifyOfficialMissionEffectCatalogueV1,
} from "./official-mission-effect-ir-v1.mjs";
import { verifyOfficialCommandCenterDataset } from
  "./official-command-center-adapter-v1.mjs";
import { verifyOfficialMissionDeploymentDraftDataBundleV1 } from
  "./official-mission-deployment-draft-data-bundle-v1.mjs";

export const OFFICIAL_MATCH_GAMEPLAY_DATA_BUNDLE_V2_SCHEMA =
  "starcraft_tmg_official_match_gameplay_data_bundle_v2";
export const OFFICIAL_MATCH_MISSION_SCORING_PROFILE_V2_SCHEMA =
  "starcraft_tmg_official_match_mission_scoring_profile_v2";

const HASH = /^[a-f0-9]{64}$/u;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function firstEffect(mission, kind) {
  return [...mission.scoring.commonRules, ...mission.scoring.objectiveRules]
    .find((entry) => entry.kind === kind) || null;
}

function missionScoringProfile(mission) {
  const common = firstEffect(mission, "destroyed_enemy_supply_vp");
  const body = {
    schema: OFFICIAL_MATCH_MISSION_SCORING_PROFILE_V2_SCHEMA,
    semanticVersion: "2.0.0",
    recordKey: mission.missionRef.recordKey,
    sourceRecordHash: mission.missionRef.sourceRecordHash,
    payloadHash: mission.missionRef.payloadHash,
    missionEffectIrHash: mission.missionEffectIrHash,
    missionId: mission.missionRef.missionId,
    missionName: mission.missionRef.missionName,
    missionFamily: mission.missionRef.family,
    engagementScale: mission.missionRef.engagementScale,
    format: mission.missionRef.engagementScale.toLowerCase(),
    gameLengthRounds: mission.pacing.gameLengthRounds,
    startingSupply: mission.pacing.startingSupply,
    extraSupplyPerRound: mission.pacing.supplyEscalationPerRound,
    destroyedEnemySupplyVpPerSupply: common?.vpPerDestroyedEnemySupply,
    specialLeadWinThreshold: mission.terminal.immediateLeadThresholdVp,
    finalTiebreaker: mission.terminal.finalTiebreaker,
    scoringRules: clone(mission.scoring),
    sourceText: clone(mission.source.sourceText),
    rulesTruth: "official_current_mission_effect_ir_projection",
    trainingTruth: false,
  };
  return freezeDeep({ ...body,
    missionScoringProfileHash: hashStarcraftTmgContract(body) });
}

export function createOfficialMatchGameplayDataBundleV2(input = {}) {
  const { snapshot, dataset } = input;
  verifyCommandCenterSnapshot(snapshot);
  verifyOfficialCommandCenterDataset({ snapshot, dataset });
  const draftBundle = input.missionDeploymentDraftDataBundle;
  verifyOfficialMissionDeploymentDraftDataBundleV1(draftBundle);
  const missionEffectCatalogue = createOfficialMissionEffectCatalogueV1({
    missionDeploymentDraftDataBundle: draftBundle,
  });
  const missionEffect = getOfficialMissionEffectIrV1(
    missionEffectCatalogue, String(input.missionRecordKey || "").trim());
  const combatProfileBundle = createOfficialCombatProfileBundleV1({
    snapshot, dataset, recordKeys: input.unitRecordKeys,
  });
  const body = {
    schema: OFFICIAL_MATCH_GAMEPLAY_DATA_BUNDLE_V2_SCHEMA,
    semanticVersion: "2.0.0",
    sourceId: dataset.sourceId,
    sourceSnapshotHash: snapshot.snapshotHash,
    normalizedDatasetHash: dataset.datasetHash,
    dataVersions: clone(dataset.dataVersions),
    combatProfileBundle,
    missionEffectCatalogue,
    selectedMissionEffect: missionEffect,
    missionScoringProfile: missionScoringProfile(missionEffect),
    sourceRefreshPerformed: false,
    repositoryFallbackAllowed: false,
    productionRoomBindingEligible: false,
    compatibility: {
      legacyStandardGameplayBundleRequired: false,
      semanticVersionIsCompatibilityAuthority: true,
      contentHashesAreIdentityAndDriftDiagnostics: true,
    },
    rulesScope: "selected_current_official_mission_and_fielded_combat_profiles",
    rulesTruth: "official_current_match_gameplay_data_v2",
    trainingTruth: false,
  };
  const bundle = freezeDeep({ ...body,
    gameplayDataBundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialMatchGameplayDataBundleV2(bundle);
  return bundle;
}

export function verifyOfficialMatchGameplayDataBundleV2(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_MATCH_GAMEPLAY_DATA_BUNDLE_V2_SCHEMA
    || bundle.semanticVersion !== "2.0.0"
    || bundle.gameplayDataBundleHash !== hashStarcraftTmgContract(
      without(bundle, ["gameplayDataBundleHash"]))
    || bundle.sourceSnapshotHash !== bundle.combatProfileBundle?.sourceSnapshotHash
    || bundle.normalizedDatasetHash !== bundle.combatProfileBundle?.normalizedDatasetHash
    || bundle.missionEffectCatalogue?.catalogueHash === undefined
    || bundle.selectedMissionEffect?.missionEffectIrHash
      !== bundle.missionScoringProfile?.missionEffectIrHash
    || bundle.selectedMissionEffect?.missionRef?.recordKey
      !== bundle.missionScoringProfile?.recordKey
    || bundle.missionScoringProfile?.missionScoringProfileHash
      !== hashStarcraftTmgContract(without(bundle.missionScoringProfile,
        ["missionScoringProfileHash"]))
    || bundle.missionScoringProfile?.destroyedEnemySupplyVpPerSupply !== 1
    || bundle.sourceRefreshPerformed !== false
    || bundle.repositoryFallbackAllowed !== false
    || bundle.productionRoomBindingEligible !== false
    || bundle.compatibility?.semanticVersionIsCompatibilityAuthority !== true
    || bundle.compatibility?.contentHashesAreIdentityAndDriftDiagnostics !== true
    || bundle.trainingTruth !== false
    || !HASH.test(String(bundle.gameplayDataBundleHash || ""))) {
    fail("OFFICIAL_MATCH_GAMEPLAY_DATA_BUNDLE_V2_INVALID");
  }
  verifyOfficialCombatProfileBundleV1(bundle.combatProfileBundle);
  verifyOfficialMissionEffectCatalogueV1(bundle.missionEffectCatalogue);
  return true;
}
