import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "./official-development-tranche-source-lock-v1.mjs";
import {
  getOfficialCurrentProductRecord,
  verifyOfficialCommandCenterDataset,
} from "./official-command-center-adapter-v1.mjs";
import { verifyCommandCenterSnapshot } from
  "../rule-atoms/official-live-source-snapshots-v1.mjs";

export const OFFICIAL_IMPACT_PROFILE_SCHEMA =
  "starcraft_tmg_official_impact_profile_v1";
export const OFFICIAL_GOLIATH_RECORD_KEY = "army_units:goliath";
export const OFFICIAL_CORE_RULES_CONTENT_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";
export const OFFICIAL_TERRAN_P2P_CONTENT_HASH =
  "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c";

const DEVASTATING_CHARGE_TEXT =
  "Immediately after this Unit completes a successful Charge, resolve the IMPACT (4) 3+ effect.";
const EXPECTED_SOURCE_RECORD_HASH =
  "e36b38cc46ff9a2fecce9f1fa7bc087923fca2fc29fad2d9f0eead479a68ab16";
const EXPECTED_PAYLOAD_HASH =
  "168f9cdc1199f698cc74fe882e98b8d17106a14c7c12acc903be19a3b1bf946d";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function body(profile) {
  return without(profile, ["profileHash"]);
}

export function createOfficialImpactProfileV1(input = {}) {
  verifyCommandCenterSnapshot(input.snapshot);
  verifyOfficialCommandCenterDataset({ snapshot: input.snapshot, dataset: input.dataset });
  if (input.snapshot.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || input.dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH) {
    fail("IMPACT_PROFILE_SOURCE_LOCK_MISMATCH");
  }
  const record = getOfficialCurrentProductRecord(input.dataset, OFFICIAL_GOLIATH_RECORD_KEY);
  const payload = record.payload;
  const ability = payload.upgrades?.find((entry) => entry.name === "Devastating Charge");
  if (record.sourceRecordHash !== EXPECTED_SOURCE_RECORD_HASH
    || record.payloadHash !== EXPECTED_PAYLOAD_HASH
    || payload.id !== "goliath"
    || payload.name !== "Goliath"
    || payload.faction !== "Terran"
    || payload.small?.models !== 1
    || payload.small?.supply !== 2
    || payload.stats?.speed !== "7"
    || payload.stats?.size !== "3"
    || payload.stats?.armor !== "4+"
    || payload.stats?.hp !== "10"
    || !String(payload.tags || "").split(",").map((entry) => entry.trim()).includes("Ground")
    || ability?.activation !== "<Passive>"
    || ability?.phase !== "Assault Phase"
    || ability?.description !== DEVASTATING_CHARGE_TEXT) {
    fail("IMPACT_PROFILE_GOLIATH_RECORD_DRIFT");
  }
  const value = {
    schema: OFFICIAL_IMPACT_PROFILE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: input.snapshot.snapshotHash,
    normalizedDatasetHash: input.dataset.datasetHash,
    commandCenterRecordKey: record.recordKey,
    sourceRecordHash: record.sourceRecordHash,
    payloadHash: record.payloadHash,
    unitId: "goliath",
    unitName: "Goliath",
    faction: "Terran",
    modelCount: 1,
    supply: 2,
    speedInches: 7,
    size: 3,
    baseShape: "round",
    baseDiameterMillimetres: 80,
    baseDiameterMilliInches: Math.round((80 / 25.4) * 1000),
    armourThreshold: 4,
    hitPoints: 10,
    abilityName: "Devastating Charge",
    abilityText: DEVASTATING_CHARGE_TEXT,
    impactDice: 4,
    impactHitThreshold: 3,
    impactDamage: 1,
    impactSurge: null,
    coreRulesContentHash: OFFICIAL_CORE_RULES_CONTENT_HASH,
    terranP2pContentHash: OFFICIAL_TERRAN_P2P_CONTENT_HASH,
    terranP2pLocator: { pdfPage: 7, printedBase: "Ø80MM" },
    sourcePolicy: {
      captureMode: "slice_75_single_official_capture_lock",
      refreshDuringDevelopment: false,
      repositoryFallbackAllowed: false,
      p2pRole: "base_size_cross_check_only",
      commandCenterRole: "current_unit_rules_authority",
    },
    rulesTruth: "pinned_current_official_goliath_impact_profile",
    trainingTruth: false,
  };
  return freezeDeep({ ...value, profileHash: hashStarcraftTmgContract(value) });
}

export function verifyOfficialImpactProfileV1(profile) {
  if (!object(profile)
    || profile.schema !== OFFICIAL_IMPACT_PROFILE_SCHEMA
    || profile.profileHash !== hashStarcraftTmgContract(body(profile))
    || profile.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || profile.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || profile.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || profile.commandCenterRecordKey !== OFFICIAL_GOLIATH_RECORD_KEY
    || profile.sourceRecordHash !== EXPECTED_SOURCE_RECORD_HASH
    || profile.payloadHash !== EXPECTED_PAYLOAD_HASH
    || profile.speedInches !== 7
    || profile.baseDiameterMillimetres !== 80
    || profile.baseDiameterMilliInches !== 3150
    || profile.armourThreshold !== 4
    || profile.hitPoints !== 10
    || profile.impactDice !== 4
    || profile.impactHitThreshold !== 3
    || profile.impactDamage !== 1
    || profile.impactSurge !== null
    || profile.abilityText !== DEVASTATING_CHARGE_TEXT
    || profile.coreRulesContentHash !== OFFICIAL_CORE_RULES_CONTENT_HASH
    || profile.terranP2pContentHash !== OFFICIAL_TERRAN_P2P_CONTENT_HASH
    || profile.terranP2pLocator?.pdfPage !== 7
    || profile.terranP2pLocator?.printedBase !== "Ø80MM"
    || profile.sourcePolicy?.refreshDuringDevelopment !== false
    || profile.sourcePolicy?.repositoryFallbackAllowed !== false
    || profile.trainingTruth !== false) {
    fail("IMPACT_PROFILE_INVALID");
  }
  return true;
}

export function verifyOfficialImpactStateBindingV1(state) {
  const audit = state?.officialDevelopmentTrancheSourceLockAudit;
  const bundle = state?.officialGameplayDataBundle;
  const profile = state?.officialImpactProfile;
  verifyOfficialImpactProfileV1(profile);
  if (!object(audit)
    || audit.lockHash !== profile.sourceLockHash
    || audit.snapshotHash !== profile.sourceSnapshotHash
    || audit.normalizedDatasetHash !== profile.normalizedDatasetHash
    || audit.repositoryFallbackAllowed !== false
    || audit.trainingTruth !== false
    || bundle?.sourceSnapshotHash !== profile.sourceSnapshotHash
    || bundle?.normalizedDatasetHash !== profile.normalizedDatasetHash
    || bundle?.combatProfileBundle?.profilesByRecordKey?.[OFFICIAL_GOLIATH_RECORD_KEY]
      ?.sourceRecordHash !== profile.sourceRecordHash
    || bundle?.repositoryFallbackAllowed !== false
    || bundle?.trainingTruth !== false) {
    fail("IMPACT_SOURCE_LOCK_BINDING_INVALID");
  }
  return profile;
}
