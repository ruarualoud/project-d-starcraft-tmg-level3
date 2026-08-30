import { createHash } from "node:crypto";

import {
  canonicalStarcraftTmgJson,
  hashStarcraftTmgContract,
} from "../authoritative-engine/referee-crypto-v1.mjs";
import {
  createCommandCenterSnapshot,
  verifyCommandCenterSnapshot,
} from "../rule-atoms/official-live-source-snapshots-v1.mjs";
import {
  createOfficialCommandCenterDataset,
  verifyOfficialCommandCenterDataset,
} from "./official-command-center-adapter-v1.mjs";

export const OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_SCHEMA =
  "starcraft_tmg_official_development_tranche_source_lock_v1";
export const OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH =
  "1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1";
export const OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH =
  "8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105";
export const OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH =
  "b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067";

const FIRESTORE_COLLECTION_IDS = Object.freeze([
  "army_units",
  "faction_cards",
  "rules_sections",
  "tactical_cards",
]);
const FIRESTORE_SOURCE_IDS = Object.freeze([
  ...FIRESTORE_COLLECTION_IDS,
  "system_metadata_versions",
].sort());
const BINARY_SOURCE_IDS = Object.freeze([
  "core_rulebook",
  "protoss_p2p",
  "terran_p2p",
  "zerg_p2p",
].sort());
const STATIC_ASSET_SOURCE_IDS = Object.freeze({
  command_center_script: "script.js",
  command_center_firebase_init: "modules/firebase-init.js",
  command_center_factions: "modules/factions.js",
  command_center_rules: "modules/rules.js",
  command_center_army_builder: "modules/army_builder.js",
  command_center_rules_checker: "modules/rules_checker.js",
  command_center_mission_cards: "modules/mission_cards.js",
  command_center_deployment_maps: "modules/deployment_maps.js",
});
const TEXT_SOURCE_IDS = Object.freeze([
  "command_center_shell",
  ...Object.keys(STATIC_ASSET_SOURCE_IDS),
  "gameplay_faq",
  "rules_news",
].sort());
const EXPECTED_DATA_VERSIONS = Object.freeze({
  unitsVersion: "71",
  cardsVersion: "69",
  rulesVersion: "48",
});
const EXPECTED_COUNTS = Object.freeze({
  army_units: 26,
  faction_cards: 193,
  rules_sections: 15,
  tactical_cards: 37,
});
const DISPLAY_ONLY_ADDITIONS = Object.freeze([
  Object.freeze({
    recordKey: "faction_cards:jvkHAaXJGa91Sbt751F1",
    recordType: "community_mission",
    name: "Ghosts In the Fog",
  }),
  Object.freeze({
    recordKey: "faction_cards:m2Ra5mNs2NCeBpQSgIlu",
    recordType: "community_mission",
    name: "Khaydarin Crystal",
  }),
]);
const PRIOR_LOCK_RECORD_INDEX_HASH =
  "7f2e83c9240bd76024a0b4811be77b67134dd7ec5e2501b5fc11aed776deaf17";
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

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

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function bytes(value, code) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === "string") return Buffer.from(value, "utf8");
  fail(code);
}

function assertExactKeys(value, expected, code) {
  const observed = Object.keys(value || {}).sort();
  if (hashStarcraftTmgContract(observed) !== hashStarcraftTmgContract(expected)) {
    fail(code, observed.join(","));
  }
}

function assertLockRecord(record, sourceId, sourceBytes, sourceClass) {
  if (!object(record)
    || record.sourceId !== sourceId
    || !String(record.requestedUrl || "").startsWith("https://")
    || !String(record.finalUrl || "").startsWith("https://")
    || !String(record.cachePath || "").startsWith(
      "build/source-intake/official-rules/development-tranches/official-development-tranche-s75-111-v1/",
    )
    || !HASH_PATTERN.test(String(record.byteHash || ""))) {
    fail("OFFICIAL_TRANCHE_SOURCE_RECORD_INVALID", sourceId);
  }
  const content = bytes(sourceBytes, "OFFICIAL_TRANCHE_SOURCE_BYTES_REQUIRED");
  if (sourceClass !== "firestore" && sha256(content) !== record.byteHash) {
    fail("OFFICIAL_TRANCHE_SOURCE_BYTE_HASH_MISMATCH", sourceId);
  }
  return content;
}

function lockBody(lock) {
  return without(lock, ["lockHash"]);
}

export function verifyOfficialDevelopmentTrancheSourceLockV1(input = {}) {
  const lock = input.lock;
  if (!object(lock)
    || lock.schema !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_SCHEMA
    || lock.gameId !== "starcraft-tmg"
    || lock.trancheId !== "ticket-11-slices-75-111"
    || lock.captureId !== "official-development-tranche-s75-111-v1"
    || lock.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || hashStarcraftTmgContract(lockBody(lock)) !== lock.lockHash
    || new Date(lock.capturedAt).toISOString() !== lock.capturedAt
    || lock.rulesEligible !== false
    || lock.productionRoomEligible !== false
    || lock.trainingTruth !== false) {
    fail("OFFICIAL_TRANCHE_SOURCE_LOCK_INVALID");
  }
  if (hashStarcraftTmgContract(lock.dataVersions)
    !== hashStarcraftTmgContract(EXPECTED_DATA_VERSIONS)) {
    fail("OFFICIAL_TRANCHE_DATA_VERSION_MISMATCH");
  }
  const requiredPolicy = {
    automaticRefreshAllowed: false,
    networkVerificationDuringSliceDevelopmentAllowed: false,
    explicitUserCommandRequiredForNewCapture: true,
    repositoryFallbackAllowed: false,
    silentSourceReplacementAllowed: false,
    priorLockMutationAllowed: false,
    roomBindingsRemainSnapshotPinned: true,
  };
  if (hashStarcraftTmgContract(lock.policy) !== hashStarcraftTmgContract(requiredPolicy)) {
    fail("OFFICIAL_TRANCHE_SOURCE_POLICY_MISMATCH");
  }
  assertExactKeys(lock.firestore, FIRESTORE_SOURCE_IDS, "OFFICIAL_TRANCHE_FIRESTORE_DENOMINATOR_MISMATCH");
  assertExactKeys(lock.binaries, BINARY_SOURCE_IDS, "OFFICIAL_TRANCHE_BINARY_DENOMINATOR_MISMATCH");
  assertExactKeys(lock.texts, TEXT_SOURCE_IDS, "OFFICIAL_TRANCHE_TEXT_DENOMINATOR_MISMATCH");
  if (!object(input.sourceBytes)) fail("OFFICIAL_TRANCHE_SOURCE_BYTES_REQUIRED");

  const firestorePayloads = {};
  for (const sourceId of FIRESTORE_SOURCE_IDS) {
    const content = assertLockRecord(
      lock.firestore[sourceId],
      sourceId,
      input.sourceBytes[sourceId],
      "firestore",
    );
    let payload;
    try {
      payload = JSON.parse(content.toString("utf8"));
    } catch {
      fail("OFFICIAL_TRANCHE_FIRESTORE_JSON_INVALID", sourceId);
    }
    const canonicalHash = sha256(`${canonicalStarcraftTmgJson(payload)}\n`);
    if (canonicalHash !== lock.firestore[sourceId].canonicalHash) {
      fail("OFFICIAL_TRANCHE_FIRESTORE_CANONICAL_HASH_MISMATCH", sourceId);
    }
    if (FIRESTORE_COLLECTION_IDS.includes(sourceId)) {
      if (!Array.isArray(payload.documents)
        || payload.documents.length !== EXPECTED_COUNTS[sourceId]
        || lock.firestore[sourceId].documentCount !== EXPECTED_COUNTS[sourceId]
        || payload.nextPageToken) {
        fail("OFFICIAL_TRANCHE_FIRESTORE_COLLECTION_INVALID", sourceId);
      }
      firestorePayloads[sourceId] = payload;
    }
  }
  for (const sourceId of BINARY_SOURCE_IDS) {
    assertLockRecord(lock.binaries[sourceId], sourceId, input.sourceBytes[sourceId], "binary");
  }
  for (const sourceId of TEXT_SOURCE_IDS) {
    assertLockRecord(lock.texts[sourceId], sourceId, input.sourceBytes[sourceId], "text");
  }

  const snapshot = createCommandCenterSnapshot({
    capturedAt: lock.capturedAt,
    sourceUrl: lock.texts.command_center_shell.finalUrl,
    projectId: "starcrafttmgbeta",
    databaseId: "starcrafttmgbeta",
    shellHtml: bytes(input.sourceBytes.command_center_shell).toString("utf8"),
    firebaseInitJs: bytes(input.sourceBytes.command_center_firebase_init),
    staticAssets: Object.entries(STATIC_ASSET_SOURCE_IDS).map(([sourceId, assetId]) => ({
      assetId,
      content: bytes(input.sourceBytes[sourceId]),
    })),
    firestorePayloads,
    versionsPayload: JSON.parse(bytes(
      input.sourceBytes.system_metadata_versions,
    ).toString("utf8")),
  });
  const dataset = createOfficialCommandCenterDataset({ snapshot, firestorePayloads });
  verifyCommandCenterSnapshot(snapshot);
  verifyOfficialCommandCenterDataset({ snapshot, dataset });
  if (snapshot.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH) {
    fail("OFFICIAL_TRANCHE_NORMALIZED_ARTIFACT_MISMATCH");
  }

  const additions = new Set(DISPLAY_ONLY_ADDITIONS.map((entry) => entry.recordKey));
  const priorIndex = dataset.recordIndex.filter((entry) => !additions.has(entry.recordKey));
  if (priorIndex.length !== 269
    || hashStarcraftTmgContract(priorIndex) !== PRIOR_LOCK_RECORD_INDEX_HASH) {
    fail("OFFICIAL_TRANCHE_UNEXPECTED_SAME_VERSION_DRIFT");
  }
  for (const expected of DISPLAY_ONLY_ADDITIONS) {
    const index = dataset.recordIndex.find((entry) => entry.recordKey === expected.recordKey);
    const record = dataset.recordsByKey[expected.recordKey];
    if (index?.authorityDisposition !== "community_display_only"
      || index.recordType !== expected.recordType
      || record?.payload?.name !== expected.name) {
      fail("OFFICIAL_TRANCHE_DISPLAY_ONLY_ADDITION_INVALID", expected.recordKey);
    }
  }
  const officialProductCount = dataset.recordIndex.filter((entry) => (
    entry.authorityDisposition === "official_current_product_candidate"
  )).length;
  const ruleProseCount = dataset.recordIndex.filter((entry) => (
    entry.authorityDisposition === "official_rule_prose_review_required"
  )).length;
  if (officialProductCount !== 83 || ruleProseCount !== 15) {
    fail("OFFICIAL_TRANCHE_AUTHORITY_DENOMINATOR_MISMATCH");
  }

  const receiptBody = {
    schema: "starcraft_tmg_official_development_tranche_source_lock_audit_v1",
    trancheId: lock.trancheId,
    lockHash: lock.lockHash,
    snapshotHash: snapshot.snapshotHash,
    normalizedDatasetHash: dataset.datasetHash,
    dataVersions: { ...snapshot.dataVersions },
    recordCounts: {
      total: dataset.recordIndex.length,
      officialProduct: officialProductCount,
      officialRuleProseReviewRequired: ruleProseCount,
      communityDisplayOnly: dataset.recordIndex.length - officialProductCount - ruleProseCount,
    },
    sameVersionDrift: {
      classification: "display_only_additions",
      addedRecordKeys: DISPLAY_ONLY_ADDITIONS.map((entry) => entry.recordKey),
      officialProductChanged: false,
      officialRuleProseChanged: false,
      canAffectRules: false,
    },
    sourceRefreshPolicy: "explicit_user_command_only",
    repositoryFallbackAllowed: false,
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
  };
  return deepFreeze({
    lock,
    snapshot,
    dataset,
    audit: {
      ...receiptBody,
      auditHash: hashStarcraftTmgContract(receiptBody),
    },
  });
}
