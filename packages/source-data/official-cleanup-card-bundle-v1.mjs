import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyCommandCenterSnapshot } from "../rule-atoms/official-live-source-snapshots-v1.mjs";
import {
  getOfficialCurrentProductRecord,
  verifyOfficialCommandCenterDataset,
} from "./official-command-center-adapter-v1.mjs";

export const OFFICIAL_CLEANUP_CARD_PROFILE_SCHEMA =
  "starcraft_tmg_official_cleanup_card_profile_v1";
export const OFFICIAL_CLEANUP_CARD_BUNDLE_SCHEMA =
  "starcraft_tmg_official_cleanup_card_bundle_v1";

const ACADEMY_RECORD_KEY = "tactical_cards:academy";
const ACADEMY_SOURCE_RECORD_HASH =
  "fa44c19baa21f3c6c9d983a11b61cd9e8e7ed5904e74fea2cbca7931109fc939";
const ACADEMY_PAYLOAD_HASH =
  "3bbb8f03e371a6d0052df5191ea877ef2e2e5fd3da4037fb99aafa8b9e0b6fa7";
const ACADEMY_ABILITY = Object.freeze({
  name: "Advanced Training",
  description:
    "Advanced Training <Reaction> <Any Phase>: Once per Round, when a Friendly Support Unit activates a Special Ability that costs CP, resolve that ability with its CP cost reduced by 1 (to a minimum of 0). Do not Exhaust this card.",
});
const TERRAN_ARMED_FORCES_RECORD_KEY = "tactical_cards:terran_armed_forces";
const TERRAN_ARMED_FORCES_SOURCE_RECORD_HASH =
  "44aa8b4d52a065dbbc5e93a9bfc203957647393efe4c123e1a0b2b909dbf63c5";
const TERRAN_ARMED_FORCES_PAYLOAD_HASH =
  "91ff4f8d459869ecadc9c3271ad651ba81ae324ca1d71184ac3d64c37caf20d7";
const TERRAN_ARMED_FORCES_ABILITIES = Object.freeze([
  Object.freeze({
    name: "Tactical Retreat",
    description:
      "Tactical Retreat <Active> <Movement Phase>: The active Unit ignores the Disengage penalty for the remainder of the Round.",
  }),
  Object.freeze({
    name: "Terran Tenacity",
    description:
      "Terran Tenacity <Active> <Movement Phase>: Once per Game. Immediately claim the First Player Marker. No other player may claim the First Player Marker for the remainder of this Phase.",
  }),
]);
const SUPPORTED_RECORD_KEYS = Object.freeze([
  ACADEMY_RECORD_KEY,
  TERRAN_ARMED_FORCES_RECORD_KEY,
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function exactRecord(record, expected) {
  const payload = record?.payload;
  if (!object(record)
    || !object(payload)
    || record.recordKey !== expected.recordKey
    || record.collectionId !== "tactical_cards"
    || record.recordType !== "tactical_card"
    || record.authorityDisposition !== "official_current_product_candidate"
    || record.sourceRecordHash !== expected.sourceRecordHash
    || record.payloadHash !== expected.payloadHash
    || payload.id !== expected.cardId
    || payload.name !== expected.cardName
    || payload.faction !== "Terran"
    || payload.isFactionCard !== expected.isFactionCard
    || payload.isUnique !== true
    || payload.resource !== 1
    || !isDeepStrictEqual(payload.boosts, expected.abilities)) {
    fail("official_cleanup_card_contract_drift", String(record?.recordKey || expected.recordKey));
  }
  const body = {
    schema: OFFICIAL_CLEANUP_CARD_PROFILE_SCHEMA,
    recordKey: record.recordKey,
    sourceRecordHash: record.sourceRecordHash,
    payloadHash: record.payloadHash,
    cardId: payload.id,
    cardName: payload.name,
    faction: payload.faction,
    cardKind: payload.isFactionCard ? "faction" : "tactical",
    isFactionCard: payload.isFactionCard,
    resource: payload.resource,
    abilityNames: payload.boosts.map((ability) => ability.name),
    abilitySourceTextHash: hashStarcraftTmgContract(payload.boosts),
    endOfRoundEffects: [],
    cleanupRefreshEligible: true,
    rulesScope: "exact_current_card_identity_and_no_end_of_round_trigger_only",
    rulesTruth: "current_official_command_center_card_profile",
    trainingTruth: false,
  };
  return deepFreeze({
    ...body,
    cleanupCardProfileHash: hashStarcraftTmgContract(body),
  });
}

function createProfile(record) {
  if (record.recordKey === ACADEMY_RECORD_KEY) {
    return exactRecord(record, {
      recordKey: ACADEMY_RECORD_KEY,
      sourceRecordHash: ACADEMY_SOURCE_RECORD_HASH,
      payloadHash: ACADEMY_PAYLOAD_HASH,
      cardId: "academy",
      cardName: "Academy",
      isFactionCard: false,
      abilities: [ACADEMY_ABILITY],
    });
  }
  if (record.recordKey === TERRAN_ARMED_FORCES_RECORD_KEY) {
    return exactRecord(record, {
      recordKey: TERRAN_ARMED_FORCES_RECORD_KEY,
      sourceRecordHash: TERRAN_ARMED_FORCES_SOURCE_RECORD_HASH,
      payloadHash: TERRAN_ARMED_FORCES_PAYLOAD_HASH,
      cardId: "terran_armed_forces",
      cardName: "Terran Armed Forces",
      isFactionCard: true,
      abilities: TERRAN_ARMED_FORCES_ABILITIES,
    });
  }
  fail("official_cleanup_card_scope_unsupported", record.recordKey);
}

function profileBody(profile) {
  return without(profile, ["cleanupCardProfileHash"]);
}

function bundleBody(bundle) {
  return without(bundle, ["cleanupCardBundleHash"]);
}

export function createOfficialCleanupCardBundleV1(input = {}) {
  verifyCommandCenterSnapshot(input.snapshot);
  verifyOfficialCommandCenterDataset({ snapshot: input.snapshot, dataset: input.dataset });
  const recordKeys = [...new Set((input.recordKeys || []).map((value) => String(value || "").trim()))]
    .sort((left, right) => left.localeCompare(right));
  if (!isDeepStrictEqual(recordKeys, [...SUPPORTED_RECORD_KEYS])) {
    fail("official_cleanup_card_denominator_invalid");
  }
  const profiles = recordKeys.map((recordKey) => createProfile(
    getOfficialCurrentProductRecord(input.dataset, recordKey),
  ));
  const body = {
    schema: OFFICIAL_CLEANUP_CARD_BUNDLE_SCHEMA,
    sourceId: input.dataset.sourceId,
    sourceSnapshotHash: input.snapshot.snapshotHash,
    normalizedDatasetHash: input.dataset.datasetHash,
    dataVersions: { ...input.dataset.dataVersions },
    profiles,
    profileHashesByRecordKey: Object.fromEntries(profiles.map((profile) => [
      profile.recordKey,
      profile.cleanupCardProfileHash,
    ])),
    denominatorComplete: true,
    repositoryFallbackAllowed: false,
    productionRoomBindingEligible: false,
    rulesScope: "academy_and_terran_armed_forces_exact_current_records_only",
    rulesTruth: "official_current_command_center_cleanup_card_bundle",
    trainingTruth: false,
  };
  return deepFreeze({
    ...body,
    cleanupCardBundleHash: hashStarcraftTmgContract(body),
  });
}

export function verifyOfficialCleanupCardBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_CLEANUP_CARD_BUNDLE_SCHEMA
    || hashStarcraftTmgContract(bundleBody(bundle)) !== bundle.cleanupCardBundleHash
    || bundle.denominatorComplete !== true
    || bundle.repositoryFallbackAllowed !== false
    || bundle.productionRoomBindingEligible !== false
    || bundle.trainingTruth !== false
    || !Array.isArray(bundle.profiles)
    || bundle.profiles.length !== SUPPORTED_RECORD_KEYS.length) {
    fail("official_cleanup_card_bundle_invalid");
  }
  const observedKeys = [];
  for (const profile of bundle.profiles) {
    if (!object(profile)
      || profile.schema !== OFFICIAL_CLEANUP_CARD_PROFILE_SCHEMA
      || hashStarcraftTmgContract(profileBody(profile)) !== profile.cleanupCardProfileHash
      || profile.trainingTruth !== false
      || profile.cleanupRefreshEligible !== true
      || !Array.isArray(profile.endOfRoundEffects)
      || profile.endOfRoundEffects.length !== 0
      || bundle.profileHashesByRecordKey?.[profile.recordKey]
        !== profile.cleanupCardProfileHash) {
      fail("official_cleanup_card_profile_invalid", String(profile?.recordKey || ""));
    }
    observedKeys.push(profile.recordKey);
  }
  if (!isDeepStrictEqual(observedKeys, [...SUPPORTED_RECORD_KEYS])) {
    fail("official_cleanup_card_denominator_invalid");
  }
  const academy = bundle.profiles[0];
  const armedForces = bundle.profiles[1];
  if (academy.sourceRecordHash !== ACADEMY_SOURCE_RECORD_HASH
    || academy.payloadHash !== ACADEMY_PAYLOAD_HASH
    || academy.cardKind !== "tactical"
    || academy.isFactionCard !== false
    || !isDeepStrictEqual(academy.abilityNames, [ACADEMY_ABILITY.name])
    || armedForces.sourceRecordHash !== TERRAN_ARMED_FORCES_SOURCE_RECORD_HASH
    || armedForces.payloadHash !== TERRAN_ARMED_FORCES_PAYLOAD_HASH
    || armedForces.cardKind !== "faction"
    || armedForces.isFactionCard !== true
    || !isDeepStrictEqual(
      armedForces.abilityNames,
      TERRAN_ARMED_FORCES_ABILITIES.map((ability) => ability.name),
    )) {
    fail("official_cleanup_card_profile_invalid");
  }
  return true;
}

export const OFFICIAL_CLEANUP_CARD_RECORD_KEYS = SUPPORTED_RECORD_KEYS;
