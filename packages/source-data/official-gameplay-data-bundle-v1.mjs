import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyCommandCenterSnapshot } from "../rule-atoms/official-live-source-snapshots-v1.mjs";
import {
  createOfficialCombatProfileBundleV1,
  verifyOfficialCombatProfileBundleV1,
} from "./official-combat-profile-bundle-v1.mjs";
import {
  createOfficialAssaultRangedProfileBundleV1,
  verifyOfficialAssaultRangedProfileBundleV1,
} from "./official-assault-ranged-profile-bundle-v1.mjs";
import {
  createOfficialAttackProfileCatalogueV1,
  verifyOfficialAttackProfileCatalogueV1,
} from "./official-attack-profile-catalogue-v1.mjs";
import {
  getOfficialCurrentProductRecord,
  verifyOfficialCommandCenterDataset,
} from "./official-command-center-adapter-v1.mjs";
import {
  createOfficialCleanupCardBundleV1,
  verifyOfficialCleanupCardBundleV1,
} from "./official-cleanup-card-bundle-v1.mjs";
import {
  createOfficialReserveDeployDataBundleV1,
  verifyOfficialReserveDeployDataBundleV1,
} from "./official-reserve-deploy-data-bundle-v1.mjs";

export const OFFICIAL_MISSION_SCORING_PROFILE_SCHEMA =
  "starcraft_tmg_official_mission_scoring_profile_v1";
export const OFFICIAL_GAMEPLAY_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_gameplay_data_bundle_v1";

const HOLD_POSITION_STANDARD_RECORD_KEY = "faction_cards:mission_hold_position";
const HOLD_POSITION_SCORING_TEXT = [
  "Score VPs equal to Enemy Supply destroyed this Round.",
  "",
  "From the Start of the Second Round:",
  "Gain 1 VP for each Controlled Mission Marker that is Neutral or associated with your colour.",
  "Gain 2 VPs for each Controlled Mission Marker associated with the Opponent colour.",
].join("\n");
const HOLD_POSITION_WIN_TEXT =
  "Special Winning Conditions: The game ends immediately if a Player leads by 10+ VPs.";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function exactPositiveInteger(value, expected, code) {
  if (String(value) !== String(expected)) fail(code, String(value));
  return Number(expected);
}

function missionProfileBody(profile) {
  return without(profile, ["missionScoringProfileHash"]);
}

function gameplayBundleBody(bundle) {
  return without(bundle, ["gameplayDataBundleHash"]);
}

function createHoldPositionStandardMissionProfile(record) {
  const payload = record.payload;
  if (record.recordKey !== HOLD_POSITION_STANDARD_RECORD_KEY
    || record.recordType !== "mission"
    || record.authorityDisposition !== "official_current_product_candidate"
    || payload.id !== "mission_hold_position"
    || payload.name !== "Hold Position"
    || payload.format !== "Standard Engagement"
    || payload.type !== "mission"
    || payload.faction !== "the_game"
    || payload.isManual !== true
    || payload.missionParams !== "All Mission Markers are Activated."
    || payload.scoringConditions !== HOLD_POSITION_SCORING_TEXT
    || payload.additionalConditions !== HOLD_POSITION_WIN_TEXT) {
    fail("official_hold_position_standard_contract_drift", record.recordKey);
  }
  const body = {
    schema: OFFICIAL_MISSION_SCORING_PROFILE_SCHEMA,
    recordKey: record.recordKey,
    sourceRecordHash: record.sourceRecordHash,
    payloadHash: record.payloadHash,
    missionId: payload.id,
    missionName: payload.name,
    format: "standard_engagement",
    gameLengthRounds: exactPositiveInteger(
      payload.gameLength,
      5,
      "official_hold_position_game_length_drift",
    ),
    startingSupply: exactPositiveInteger(
      payload.startingSupply,
      6,
      "official_hold_position_starting_supply_drift",
    ),
    extraSupplyPerRound: payload.extraSupply === "2 per round"
      ? 2
      : fail("official_hold_position_extra_supply_drift", payload.extraSupply),
    allMissionMarkersActivated: true,
    destroyedEnemySupplyVpPerSupply: 1,
    markerScoringStartsRound: 2,
    neutralOrOwnAffinityMarkerVp: 1,
    opponentAffinityMarkerVp: 2,
    specialLeadWinThreshold: 10,
    finalTiebreaker: null,
    sourceText: {
      missionParams: payload.missionParams,
      scoringConditions: payload.scoringConditions,
      additionalConditions: payload.additionalConditions,
    },
    sourceTextHash: hashStarcraftTmgContract({
      missionParams: payload.missionParams,
      scoringConditions: payload.scoringConditions,
      additionalConditions: payload.additionalConditions,
    }),
    rulesScope: "hold_position_standard_exact_record_only",
    rulesTruth: "current_official_command_center_mission_profile",
    trainingTruth: false,
  };
  return deepFreeze({
    ...body,
    missionScoringProfileHash: hashStarcraftTmgContract(body),
  });
}

export function verifyOfficialMissionScoringProfileV1(profile) {
  if (!object(profile)
    || profile.schema !== OFFICIAL_MISSION_SCORING_PROFILE_SCHEMA
    || hashStarcraftTmgContract(missionProfileBody(profile))
      !== profile.missionScoringProfileHash
    || profile.recordKey !== HOLD_POSITION_STANDARD_RECORD_KEY
    || profile.missionId !== "mission_hold_position"
    || profile.format !== "standard_engagement"
    || profile.gameLengthRounds !== 5
    || profile.startingSupply !== 6
    || profile.extraSupplyPerRound !== 2
    || profile.markerScoringStartsRound !== 2
    || profile.neutralOrOwnAffinityMarkerVp !== 1
    || profile.opponentAffinityMarkerVp !== 2
    || profile.destroyedEnemySupplyVpPerSupply !== 1
    || profile.specialLeadWinThreshold !== 10
    || profile.finalTiebreaker !== null
    || profile.sourceText?.scoringConditions !== HOLD_POSITION_SCORING_TEXT
    || profile.sourceText?.additionalConditions !== HOLD_POSITION_WIN_TEXT
    || profile.trainingTruth !== false) {
    fail("official_mission_scoring_profile_invalid");
  }
  return true;
}

export function createOfficialGameplayDataBundleV1(input = {}) {
  const snapshot = input.snapshot;
  const dataset = input.dataset;
  verifyCommandCenterSnapshot(snapshot);
  verifyOfficialCommandCenterDataset({ snapshot, dataset });
  const missionRecordKey = String(input.missionRecordKey || "").trim();
  if (missionRecordKey !== HOLD_POSITION_STANDARD_RECORD_KEY) {
    fail("official_gameplay_mission_scope_unsupported", missionRecordKey);
  }
  const combatProfileBundle = createOfficialCombatProfileBundleV1({
    snapshot,
    dataset,
    recordKeys: input.unitRecordKeys,
  });
  const missionScoringProfile = createHoldPositionStandardMissionProfile(
    getOfficialCurrentProductRecord(dataset, missionRecordKey),
  );
  const cleanupCardBundle = input.cleanupCardRecordKeys === undefined
    ? null
    : createOfficialCleanupCardBundleV1({
        snapshot,
        dataset,
        recordKeys: input.cleanupCardRecordKeys,
      });
  const reserveDeployDataBundle = input.reserveDeployData === true
    ? createOfficialReserveDeployDataBundleV1({ snapshot, dataset })
    : null;
  const assaultRangedProfileBundle = input.assaultRangedData === true
    ? createOfficialAssaultRangedProfileBundleV1({
        snapshot,
        dataset,
        recordKeys: input.unitRecordKeys,
      })
    : null;
  const attackProfileCatalogue = input.attackProfileData === true
    ? createOfficialAttackProfileCatalogueV1({ snapshot, dataset })
    : null;
  const baseRulesScope = reserveDeployDataBundle
    ? cleanupCardBundle
      ? "official_current_combat_profiles_hold_position_cleanup_cards_and_reserve_deploy"
      : "official_current_combat_profiles_hold_position_and_reserve_deploy"
    : cleanupCardBundle
      ? "official_current_combat_profiles_hold_position_and_cleanup_cards"
      : "official_current_combat_profiles_plus_hold_position_standard";
  const body = {
    schema: OFFICIAL_GAMEPLAY_DATA_BUNDLE_SCHEMA,
    sourceId: dataset.sourceId,
    sourceSnapshotHash: snapshot.snapshotHash,
    normalizedDatasetHash: dataset.datasetHash,
    dataVersions: { ...dataset.dataVersions },
    combatProfileBundle,
    missionScoringProfile,
    ...(cleanupCardBundle ? { cleanupCardBundle } : {}),
    ...(reserveDeployDataBundle ? { reserveDeployDataBundle } : {}),
    ...(assaultRangedProfileBundle ? { assaultRangedProfileBundle } : {}),
    ...(attackProfileCatalogue ? { attackProfileCatalogue } : {}),
    repositoryFallbackAllowed: false,
    productionRoomBindingEligible: false,
    rulesScope: attackProfileCatalogue
      ? `${baseRulesScope}_and_atomic_attack_profiles`
      : assaultRangedProfileBundle
        ? `${baseRulesScope}_and_assault_ranged_profiles`
        : baseRulesScope,
    rulesTruth: "official_current_command_center_gameplay_data",
    trainingTruth: false,
  };
  return deepFreeze({
    ...body,
    gameplayDataBundleHash: hashStarcraftTmgContract(body),
  });
}

export function verifyOfficialGameplayDataBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_GAMEPLAY_DATA_BUNDLE_SCHEMA
    || hashStarcraftTmgContract(gameplayBundleBody(bundle)) !== bundle.gameplayDataBundleHash
    || bundle.sourceSnapshotHash !== bundle.combatProfileBundle?.sourceSnapshotHash
    || bundle.normalizedDatasetHash !== bundle.combatProfileBundle?.normalizedDatasetHash
    || hashStarcraftTmgContract(bundle.dataVersions)
      !== hashStarcraftTmgContract(bundle.combatProfileBundle?.dataVersions)
    || bundle.repositoryFallbackAllowed !== false
    || bundle.productionRoomBindingEligible !== false
    || bundle.trainingTruth !== false) {
    fail("official_gameplay_data_bundle_invalid");
  }
  verifyOfficialCombatProfileBundleV1(bundle.combatProfileBundle);
  verifyOfficialMissionScoringProfileV1(bundle.missionScoringProfile);
  if (bundle.cleanupCardBundle !== undefined) {
    verifyOfficialCleanupCardBundleV1(bundle.cleanupCardBundle);
    if (bundle.cleanupCardBundle.sourceSnapshotHash !== bundle.sourceSnapshotHash
      || bundle.cleanupCardBundle.normalizedDatasetHash !== bundle.normalizedDatasetHash
      || hashStarcraftTmgContract(bundle.cleanupCardBundle.dataVersions)
        !== hashStarcraftTmgContract(bundle.dataVersions)) {
      fail("official_gameplay_cleanup_card_bundle_mismatch");
    }
  }
  if (bundle.reserveDeployDataBundle !== undefined) {
    verifyOfficialReserveDeployDataBundleV1(bundle.reserveDeployDataBundle);
    if (bundle.reserveDeployDataBundle.sourceSnapshotHash !== bundle.sourceSnapshotHash
      || bundle.reserveDeployDataBundle.normalizedDatasetHash !== bundle.normalizedDatasetHash
      || hashStarcraftTmgContract(bundle.reserveDeployDataBundle.dataVersions)
        !== hashStarcraftTmgContract(bundle.dataVersions)
      || bundle.reserveDeployDataBundle.unitMovementProfile.sourceRecordHash
        !== bundle.combatProfileBundle.profilesByRecordKey?.["army_units:marine"]
          ?.sourceRecordHash) {
      fail("official_gameplay_reserve_deploy_bundle_mismatch");
    }
  }
  if (bundle.assaultRangedProfileBundle !== undefined) {
    verifyOfficialAssaultRangedProfileBundleV1(bundle.assaultRangedProfileBundle);
    if (bundle.assaultRangedProfileBundle.sourceSnapshotHash !== bundle.sourceSnapshotHash
      || bundle.assaultRangedProfileBundle.normalizedDatasetHash !== bundle.normalizedDatasetHash
      || hashStarcraftTmgContract(bundle.assaultRangedProfileBundle.dataVersions)
        !== hashStarcraftTmgContract(bundle.dataVersions)
      || bundle.assaultRangedProfileBundle.profiles.some((profile) => (
        profile.sourceRecordHash
          !== bundle.combatProfileBundle.profilesByRecordKey?.[profile.recordKey]?.sourceRecordHash
      ))) {
      fail("official_gameplay_assault_ranged_bundle_mismatch");
    }
  }
  if (bundle.attackProfileCatalogue !== undefined) {
    verifyOfficialAttackProfileCatalogueV1(bundle.attackProfileCatalogue);
    if (bundle.attackProfileCatalogue.sourceSnapshotHash !== bundle.sourceSnapshotHash
      || bundle.attackProfileCatalogue.normalizedDatasetHash !== bundle.normalizedDatasetHash
      || hashStarcraftTmgContract(bundle.attackProfileCatalogue.dataVersions)
        !== hashStarcraftTmgContract(bundle.dataVersions)) {
      fail("official_gameplay_attack_profile_catalogue_mismatch");
    }
  }
  return true;
}
