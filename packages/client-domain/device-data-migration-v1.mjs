import { hashStarcraftTmgClientContract } from "./portable-contract-hash-v1.mjs";
import {
  STARCRAFT_TMG_FROZEN_SOURCE_IDENTITIES_V1,
  assertStarcraftTmgClientSourceLocalizationProjectionV1,
} from "./source-localization-projection-v1.mjs";

export const STARCRAFT_TMG_DEVICE_DATA_MIGRATION_VERSION =
  "starcraft_tmg_device_data_migration_v1";

export const STARCRAFT_TMG_LEGACY_STORAGE_KEYS_V1 = Object.freeze({
  language: "sc_tmg_language",
  unitTranslations: "sc_tmg_unit_translations",
  armyLists: "sc_tmg_army_lists",
  matches: "sc_tmg_matches",
  diceHistory: "sc_tmg_dice_history",
  units: "sc_tmg_units",
  cards: "sc_tmg_cards",
  gameCards: "sc_tmg_game_cards",
  dataVersion: "sc_tmg_data_version",
});

export const STARCRAFT_TMG_DEVICE_STORAGE_KEYS_V1 = Object.freeze({
  preferences: "@project-d/starcraft-tmg/preferences/v1",
  diceHistory: "@project-d/starcraft-tmg/tools/v1/dice-history",
  generationPrefix: "@project-d/starcraft-tmg/compatibility/v1/generations",
  manifest: "@project-d/starcraft-tmg/compatibility/v1/migration-manifest",
});

const GENERATION_RECORD_NAMES = Object.freeze([
  "legacyPreferences",
  "armyDraftQuarantine",
  "history",
  "legacyDiceHistory",
  "quarantine",
]);

export function starcraftTmgDeviceMigrationGenerationKeyV1(scanHash, name) {
  if (!HASH_PATTERN.test(String(scanHash || ""))
    || ![...GENERATION_RECORD_NAMES, "staging"].includes(name)) {
    fail("LEGACY_MIGRATION_GENERATION_KEY_INVALID");
  }
  return `${STARCRAFT_TMG_DEVICE_STORAGE_KEYS_V1.generationPrefix}/${scanHash}/${name}`;
}

const MAX_KEY_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
const MAX_ARRAY_LENGTH = 2000;
const MAX_DEPTH = 12;
const MAX_NODES = 50_000;
const MAX_STRING_LENGTH = 8192;
const MAX_DRAFTS = 256;
const MAX_HISTORY = 512;
const MAX_DICE = 100;
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const SENSITIVE_TEXT = /(?:\?token=|authorization|bearer\s|api[_-]?key|credential|secret|cookie|remoteinviteurl)/iu;
const FACTIONS = new Set(["Terran", "Zerg", "Protoss"]);
const DRAFT_SIZES = new Set(["small", "large"]);
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const ACTIVE_MIGRATION_STORAGES = new WeakSet();

const KEY_POLICIES = Object.freeze([
  ["language", "display_preference", "eligible_after_user_confirmation"],
  ["unitTranslations", "user_local_unreviewed_labels", "quarantine_pending_canonical_id_mapping"],
  ["armyLists", "untrusted_army_drafts", "sanitize_to_quarantine_after_user_confirmation"],
  ["matches", "legacy_match_records", "sanitize_to_read_only_history_after_user_confirmation"],
  ["diceHistory", "local_tool_history", "sanitize_after_user_confirmation"],
  ["units", "legacy_source_payload", "quarantine_never_source_fallback"],
  ["cards", "legacy_source_payload", "quarantine_never_source_fallback"],
  ["gameCards", "legacy_source_payload", "quarantine_never_source_fallback"],
  ["dataVersion", "legacy_source_version_claim", "quarantine_never_source_fallback"],
]);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function exactKeys(value, keys) {
  return object(value)
    && Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000");
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function fail(code, detail = "") {
  const error = new Error(detail ? `${code}:${detail}` : code);
  error.code = code;
  throw error;
}

function utf8Length(value) {
  let bytes = 0;
  for (const character of String(value)) {
    const point = character.codePointAt(0);
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function rawValueHash(raw) {
  return hashStarcraftTmgClientContract({
    schemaVersion: `${STARCRAFT_TMG_DEVICE_DATA_MIGRATION_VERSION}.raw-utf8`,
    raw,
  });
}

function validateJsonShape(value) {
  let nodes = 0;
  function visit(current, depth) {
    nodes += 1;
    if (nodes > MAX_NODES) fail("LEGACY_JSON_NODE_LIMIT");
    if (depth > MAX_DEPTH) fail("LEGACY_JSON_DEPTH_LIMIT");
    if (typeof current === "string" && current.length > MAX_STRING_LENGTH) {
      fail("LEGACY_JSON_STRING_LIMIT");
    }
    if (Array.isArray(current)) {
      if (current.length > MAX_ARRAY_LENGTH) fail("LEGACY_JSON_ARRAY_LIMIT");
      current.forEach((entry) => visit(entry, depth + 1));
      return;
    }
    if (!object(current)) return;
    for (const [key, entry] of Object.entries(current)) {
      if (FORBIDDEN_KEYS.has(key)) fail("LEGACY_JSON_PROTOTYPE_KEY");
      if (key.length > 256) fail("LEGACY_JSON_KEY_LIMIT");
      visit(entry, depth + 1);
    }
  }
  visit(value, 0);
  return value;
}

function parseBounded(raw) {
  const byteLength = utf8Length(raw);
  if (byteLength > MAX_KEY_BYTES) fail("LEGACY_VALUE_TOO_LARGE");
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    fail("LEGACY_JSON_INVALID");
  }
  return validateJsonShape(value);
}

function itemCount(value) {
  if (Array.isArray(value)) return value.length;
  if (object(value)) return Object.keys(value).length;
  return value === null ? 0 : 1;
}

function classifyValue(policyName, raw) {
  const byteLength = utf8Length(raw);
  const sensitive = SENSITIVE_TEXT.test(raw);
  try {
    const value = policyName === "language" && ["zh", "en"].includes(raw)
      ? raw
      : parseBounded(raw);
    const count = itemCount(value);
    if (policyName === "language" && !["zh", "en"].includes(value)) {
      return { parseStatus: "valid_json", itemCount: count, disposition: "quarantined", reason: "unsupported_language" };
    }
    if (policyName === "armyLists" && (!Array.isArray(value) || value.length > MAX_DRAFTS)) {
      return { parseStatus: "valid_json", itemCount: count, disposition: "quarantined", reason: "army_draft_denominator_invalid" };
    }
    if (policyName === "matches" && (!Array.isArray(value) || value.length > MAX_HISTORY)) {
      return { parseStatus: "valid_json", itemCount: count, disposition: "quarantined", reason: "history_denominator_invalid" };
    }
    if (policyName === "diceHistory" && (!Array.isArray(value) || value.length > MAX_DICE)) {
      return { parseStatus: "valid_json", itemCount: count, disposition: "quarantined", reason: "dice_denominator_invalid" };
    }
    if (["units", "cards", "gameCards", "dataVersion"].includes(policyName)) {
      return {
        parseStatus: "valid_json",
        itemCount: count,
        disposition: "quarantined",
        reason: sensitive
          ? "legacy_source_payload_contains_capability_or_sensitive_locator"
          : "legacy_source_payload_never_current_source",
      };
    }
    if (policyName === "unitTranslations") {
      return {
        parseStatus: "valid_json",
        itemCount: count,
        disposition: "quarantined",
        reason: sensitive
          ? "user_label_payload_contains_sensitive_material"
          : "canonical_id_mapping_unavailable",
      };
    }
    if (sensitive && !["matches"].includes(policyName)) {
      return { parseStatus: "valid_json", itemCount: count, disposition: "quarantined", reason: "sensitive_material_detected" };
    }
    return {
      parseStatus: "valid_json",
      itemCount: count,
      disposition: "eligible_after_user_confirmation",
      reason: null,
    };
  } catch (error) {
    return {
      parseStatus: "rejected",
      itemCount: null,
      disposition: "quarantined",
      reason: String(error?.code || "LEGACY_VALUE_INVALID").toLowerCase(),
      byteLength,
    };
  }
}

function assertStorage(storage, methods) {
  for (const method of methods) {
    if (!storage || typeof storage[method] !== "function") {
      throw new TypeError(`device storage ${method} is required`);
    }
  }
}

function receipt(body, hashField) {
  return deepFreeze({ ...body, [hashField]: hashStarcraftTmgClientContract(body) });
}

export async function scanLegacyStarcraftTmgDeviceDataV1(options = {}) {
  const storage = options.storage;
  assertStorage(storage, ["getItem"]);
  const entries = [];
  let totalBytes = 0;
  for (const [policyName, classification, plannedDisposition] of KEY_POLICIES) {
    const sourceKey = STARCRAFT_TMG_LEGACY_STORAGE_KEYS_V1[policyName];
    const raw = await storage.getItem(sourceKey);
    if (raw === null || raw === undefined) {
      entries.push({
        policyName,
        sourceKey,
        classification,
        plannedDisposition,
        present: false,
        rawValueHash: null,
        byteLength: 0,
        parseStatus: "not_present",
        itemCount: 0,
        disposition: "not_present",
        reason: null,
        originalBytesWillBeModified: false,
      });
      continue;
    }
    const byteLength = utf8Length(raw);
    totalBytes += byteLength;
    const overPerKeyLimit = byteLength > MAX_KEY_BYTES;
    const overTotalLimit = totalBytes > MAX_TOTAL_BYTES;
    const classified = overPerKeyLimit
      ? {
        parseStatus: "rejected",
        itemCount: null,
        disposition: "quarantined",
        reason: "legacy_value_too_large",
      }
      : overTotalLimit
      ? {
        parseStatus: "rejected",
        itemCount: null,
        disposition: "quarantined",
        reason: "legacy_total_byte_limit",
      }
      : classifyValue(policyName, raw);
    entries.push({
      policyName,
      sourceKey,
      classification,
      plannedDisposition,
      present: true,
      rawValueHash: overPerKeyLimit || overTotalLimit ? null : rawValueHash(raw),
      byteLength,
      ...classified,
      originalBytesWillBeModified: false,
    });
  }
  const body = {
    schemaVersion: `${STARCRAFT_TMG_DEVICE_DATA_MIGRATION_VERSION}.scan`,
    scannedAt: String(options.scannedAt || new Date().toISOString()),
    sourceKeyPolicy: "fixed_allowlist_only_no_get_all_keys",
    entries,
    presentCount: entries.filter((entry) => entry.present).length,
    eligibleCount: entries.filter(
      (entry) => entry.disposition === "eligible_after_user_confirmation",
    ).length,
    quarantinedCount: entries.filter((entry) => entry.disposition === "quarantined").length,
    totalBytes,
    stage: "classified",
    requiresExplicitUserConfirmation: true,
    originalsPreserved: true,
    networkAllowed: false,
    roomAuthority: false,
    rulesAuthority: false,
    trainingTruth: false,
  };
  return receipt(body, "scanHash");
}

function assertScan(scan) {
  const { scanHash, ...body } = scan || {};
  const entryKeys = [
    "policyName",
    "sourceKey",
    "classification",
    "plannedDisposition",
    "present",
    "rawValueHash",
    "byteLength",
    "parseStatus",
    "itemCount",
    "disposition",
    "reason",
    "originalBytesWillBeModified",
  ];
  const entriesValid = Array.isArray(scan?.entries)
    && scan.entries.length === KEY_POLICIES.length
    && scan.entries.every((entry, index) => {
      const [policyName, classification, plannedDisposition] = KEY_POLICIES[index];
      return exactKeys(entry, entryKeys)
        && entry.policyName === policyName
        && entry.sourceKey === STARCRAFT_TMG_LEGACY_STORAGE_KEYS_V1[policyName]
        && entry.classification === classification
        && entry.plannedDisposition === plannedDisposition
        && typeof entry.present === "boolean"
        && (entry.present
          ? Number.isSafeInteger(entry.byteLength) && entry.byteLength >= 0
            && (HASH_PATTERN.test(String(entry.rawValueHash || ""))
              || (entry.rawValueHash === null
                && entry.disposition === "quarantined"
                && ["legacy_value_too_large", "legacy_total_byte_limit"].includes(entry.reason)
                && (entry.byteLength > MAX_KEY_BYTES || scan.totalBytes > MAX_TOTAL_BYTES)))
          : entry.rawValueHash === null && entry.byteLength === 0)
        && entry.originalBytesWillBeModified === false;
    });
  if (scan?.schemaVersion !== `${STARCRAFT_TMG_DEVICE_DATA_MIGRATION_VERSION}.scan`
    || scan.stage !== "classified"
    || scan.sourceKeyPolicy !== "fixed_allowlist_only_no_get_all_keys"
    || scan.requiresExplicitUserConfirmation !== true
    || scan.originalsPreserved !== true
    || scan.networkAllowed !== false
    || scan.roomAuthority !== false
    || scan.rulesAuthority !== false
    || scan.trainingTruth !== false
    || scanHash !== hashStarcraftTmgClientContract(body)
    || !entriesValid
    || scan.presentCount !== scan.entries.filter((entry) => entry.present).length
    || scan.eligibleCount !== scan.entries.filter(
      (entry) => entry.disposition === "eligible_after_user_confirmation",
    ).length
    || scan.quarantinedCount !== scan.entries.filter(
      (entry) => entry.disposition === "quarantined",
    ).length
    || scan.totalBytes !== scan.entries.reduce((total, entry) => total + entry.byteLength, 0)) {
    fail("LEGACY_MIGRATION_SCAN_INVALID");
  }
  return scan;
}

function boundedString(value, maxLength = 120) {
  return typeof value === "string" && value.length <= maxLength
    ? value.replace(/[\u0000-\u001f\u007f]/gu, "").trim()
    : "";
}

function boundedNumber(value, minimum, maximum, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum
    ? number
    : fallback;
}

function sanitizeArmyDrafts(value, source, scanHash) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_DRAFTS).map((draft, index) => {
    if (!object(draft) || !FACTIONS.has(draft.faction) || !Array.isArray(draft.roster)) {
      return {
        recordHash: hashStarcraftTmgClientContract({ scanHash, index, invalid: true }),
        status: "quarantined_invalid_legacy_draft",
        reason: "draft_shape_or_faction_invalid",
        usableForRoom: false,
      };
    }
    const roster = draft.roster.slice(0, 512).map((unit, unitIndex) => ({
      selectionHash: hashStarcraftTmgClientContract({ scanHash, index, unitIndex }),
      canonicalUnitIdCandidate: boundedString(unit?.unitId, 160) || null,
      size: DRAFT_SIZES.has(unit?.size) ? unit.size : null,
      selectedLegacyUpgradeIndexes: Array.isArray(unit?.activeUpgrades)
        ? [...new Set(unit.activeUpgrades
          .filter((entry) => Number.isSafeInteger(entry) && entry >= 0 && entry <= 255))]
          .slice(0, 64)
        : [],
      legacyDerivedFieldsDiscarded: true,
    }));
    const body = {
      schemaVersion: "starcraft_tmg_quarantined_army_draft_v1",
      migrationScanHash: scanHash,
      localDraftIdHash: hashStarcraftTmgClientContract({
        scanHash,
        index,
        legacyId: boundedString(draft.id, 160),
      }),
      displayLabel: boundedString(draft.name, 120) || `Legacy draft ${index + 1}`,
      faction: draft.faction,
      mineralsLimit: boundedNumber(draft.mineralsLimit, 1, 100_000, 0),
      gasLimit: boundedNumber(draft.gasLimit, 0, 100_000, 0),
      factionCardIdCandidate: boundedString(draft.factionCardId, 160) || null,
      tacticalCardIdCandidates: Array.isArray(draft.tacticalCardIds)
        ? draft.tacticalCardIds.map((id) => boundedString(id, 160)).filter(Boolean).slice(0, 64)
        : [],
      missionIdCandidate: boundedString(draft.missionId, 160) || null,
      deploymentIdCandidate: boundedString(draft.deploymentId, 160) || null,
      roster,
      sourceBinding: {
        sourceSnapshotHash: source.sourceSnapshotHash,
        officialDatasetHash: source.officialDatasetHash,
        sourceBindingHash: source.sourceBindingHash,
      },
      status: "quarantined_pending_official_catalogue_and_room_validation",
      requiresCanonicalIdAndRecordHashResolution: true,
      usableForRoom: false,
      rulesLegalityClaimed: false,
      trainingTruth: false,
    };
    return { ...body, draftHash: hashStarcraftTmgClientContract(body) };
  });
}

function winnerClass(value) {
  const normalized = String(value || "").toLowerCase();
  if (["player1", "player 1", "1", "p1"].includes(normalized)) return "player1";
  if (["player2", "player 2", "2", "p2"].includes(normalized)) return "player2";
  if (["draw", "tie"].includes(normalized)) return "draw";
  return "unknown";
}

function sanitizeHistory(value, scanHash) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_HISTORY).map((match, index) => {
    const rounds = Array.isArray(match?.rounds) ? match.rounds.slice(0, 100) : [];
    const timeline = Array.isArray(match?.timeline) ? match.timeline : [];
    const body = {
      schemaVersion: "starcraft_tmg_read_only_legacy_match_summary_v1",
      migrationScanHash: scanHash,
      recordHash: hashStarcraftTmgClientContract({ scanHash, index, match }),
      occurredAtMs: boundedNumber(match?.date, 0, 4_102_444_800_000, 0),
      roundCount: rounds.length,
      rounds: rounds.map((round, roundIndex) => ({
        roundNumber: boundedNumber(round?.roundNumber, 0, 100, roundIndex + 1),
        player1Damage: boundedNumber(round?.player1Damage, 0, 1_000_000, 0),
        player2Damage: boundedNumber(round?.player2Damage, 0, 1_000_000, 0),
        player1Score: boundedNumber(round?.player1Score, -1_000_000, 1_000_000, 0),
        player2Score: boundedNumber(round?.player2Score, -1_000_000, 1_000_000, 0),
        player1KillCount: Array.isArray(round?.player1Kills) ? round.player1Kills.length : 0,
        player2KillCount: Array.isArray(round?.player2Kills) ? round.player2Kills.length : 0,
      })),
      player1TotalScore: boundedNumber(match?.player1TotalScore, -1_000_000, 1_000_000, 0),
      player2TotalScore: boundedNumber(match?.player2TotalScore, -1_000_000, 1_000_000, 0),
      winnerClass: winnerClass(match?.winner),
      timelineEventCount: Math.min(timeline.length, 100_000),
      excluded: {
        identityAndFreeText: true,
        mutableBattleState: true,
        remoteAuthorityClaims: true,
        capabilityMaterial: true,
      },
      readOnly: true,
      mayRestoreRoom: false,
      mayCreateReplay: false,
      muzeroEligible: false,
      trainingTruth: false,
    };
    return { ...body, summaryHash: hashStarcraftTmgClientContract(body) };
  });
}

function sanitizeDice(value, scanHash) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_DICE).map((roll, index) => {
    const dice = Array.isArray(roll?.dice) ? roll.dice.slice(0, 100) : [];
    const body = {
      schemaVersion: "starcraft_tmg_local_dice_history_entry_v1",
      migrationScanHash: scanHash,
      id: hashStarcraftTmgClientContract({ scanHash, index }),
      dice: dice.map((die) => ({
        value: boundedNumber(die?.value, 1, 1000, 1),
        sides: boundedNumber(die?.sides, 2, 1000, 6),
        timestamp: boundedNumber(die?.timestamp, 0, 4_102_444_800_000, 0),
      })),
      total: boundedNumber(roll?.total, -1_000_000, 1_000_000, 0),
      timestamp: boundedNumber(roll?.timestamp, 0, 4_102_444_800_000, 0),
      freeTextLabelDiscarded: true,
      roomAuthority: false,
      rngAuthority: false,
      trainingTruth: false,
    };
    return { ...body, entryHash: hashStarcraftTmgClientContract(body) };
  });
}

function envelope(schemaVersion, fields) {
  const body = { schemaVersion, ...fields, trainingTruth: false };
  return { ...body, recordHash: hashStarcraftTmgClientContract(body) };
}

function manifestShapeValid(manifest) {
  if (!exactKeys(manifest, [
    "schemaVersion",
    "scanHash",
    "migratedAt",
    "stage",
    "sourceBinding",
    "recordKeys",
    "recordHashes",
    "counts",
    "originalKeysModified",
    "originalBytesPreserved",
    "networkUsed",
    "roomRestoreAttempted",
    "providerCalled",
    "skillGenerated",
    "dshRun",
    "muzeroDataGenerated",
    "selfPlayRun",
    "trainingTruth",
    "manifestHash",
  ])) return false;
  const { manifestHash, ...body } = manifest;
  const expected = STARCRAFT_TMG_FROZEN_SOURCE_IDENTITIES_V1;
  return manifest.schemaVersion === `${STARCRAFT_TMG_DEVICE_DATA_MIGRATION_VERSION}.manifest`
    && HASH_PATTERN.test(String(manifest.scanHash || ""))
    && manifest.stage === "sanitized_imported"
    && exactKeys(manifest.sourceBinding, [
      "sourceLockHash",
      "sourceSnapshotHash",
      "officialDatasetHash",
      "localizationDatasetHash",
      "sourceBindingHash",
      "evidenceCatalogueHash",
    ])
    && manifest.sourceBinding.sourceLockHash === expected.sourceLockHash
    && manifest.sourceBinding.sourceSnapshotHash === expected.sourceSnapshotHash
    && manifest.sourceBinding.officialDatasetHash === expected.officialDatasetHash
    && manifest.sourceBinding.localizationDatasetHash === expected.localizationDatasetHash
    && manifest.sourceBinding.sourceBindingHash === expected.sourceBindingHash
    && manifest.sourceBinding.evidenceCatalogueHash === expected.evidenceCatalogueHash
    && exactKeys(manifest.recordKeys, GENERATION_RECORD_NAMES)
    && exactKeys(manifest.recordHashes, GENERATION_RECORD_NAMES)
    && GENERATION_RECORD_NAMES.every((name) => (
      manifest.recordKeys[name]
        === starcraftTmgDeviceMigrationGenerationKeyV1(manifest.scanHash, name)
      && HASH_PATTERN.test(String(manifest.recordHashes[name] || ""))
    ))
    && exactKeys(manifest.counts, [
      "preferencesImported",
      "legacyUnitLabelMapsQuarantined",
      "armyDraftsQuarantined",
      "historyRecordsImportedReadOnly",
      "diceEntriesImportedLocalOnly",
      "sourcePayloadsQuarantined",
    ])
    && Object.values(manifest.counts).every(
      (value) => Number.isSafeInteger(value) && value >= 0,
    )
    && Array.isArray(manifest.originalKeysModified)
    && manifest.originalKeysModified.length === 0
    && manifest.originalBytesPreserved === true
    && manifest.networkUsed === false
    && manifest.roomRestoreAttempted === false
    && manifest.providerCalled === false
    && manifest.skillGenerated === false
    && manifest.dshRun === false
    && manifest.muzeroDataGenerated === false
    && manifest.selfPlayRun === false
    && manifest.trainingTruth === false
    && manifestHash === hashStarcraftTmgClientContract(body);
}

async function generationRecordsValid(storage, manifest) {
  for (const name of GENERATION_RECORD_NAMES) {
    const raw = await storage.getItem(manifest.recordKeys[name]);
    if (!raw) return false;
    try {
      const record = parseBounded(raw);
      const { recordHash, ...body } = record;
      if (recordHash !== manifest.recordHashes[name]
        || recordHash !== hashStarcraftTmgClientContract(body)) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export async function confirmLegacyStarcraftTmgDeviceDataMigrationV1(options = {}) {
  const storage = options.storage;
  assertStorage(storage, ["getItem", "setItem", "removeItem"]);
  if (ACTIVE_MIGRATION_STORAGES.has(storage)) {
    fail("DEVICE_MIGRATION_ALREADY_RUNNING");
  }
  ACTIVE_MIGRATION_STORAGES.add(storage);
  try {
    const scan = assertScan(options.scan);
    if (options.confirmed !== true) fail("LEGACY_MIGRATION_USER_CONFIRMATION_REQUIRED");
    const sourceProjection = assertStarcraftTmgClientSourceLocalizationProjectionV1(
      options.sourceProjection,
    );
    const rawByPolicy = new Map();
    for (const [policyName] of KEY_POLICIES) {
      const entry = scan.entries.find((candidate) => candidate.policyName === policyName);
      const raw = await storage.getItem(entry.sourceKey);
      if (!entry.present) {
        if (raw !== null && raw !== undefined) {
          fail("LEGACY_SOURCE_CHANGED_RESCAN_REQUIRED", entry.sourceKey);
        }
        continue;
      }
      if (entry.rawValueHash === null) {
        fail("LEGACY_MIGRATION_OVERSIZED_SOURCE_REQUIRES_ISOLATION", entry.sourceKey);
      }
      if (!entry.present || raw === null || raw === undefined
        || rawValueHash(raw) !== entry.rawValueHash) {
        fail("LEGACY_SOURCE_CHANGED_RESCAN_REQUIRED", entry.sourceKey);
      }
      const reclassified = classifyValue(policyName, raw);
      if (["parseStatus", "itemCount", "disposition", "reason"].some(
        (field) => entry[field] !== reclassified[field],
      )) {
        fail("LEGACY_MIGRATION_SCAN_INVALID", entry.sourceKey);
      }
      rawByPolicy.set(entry.policyName, raw);
    }

    const parsedEligible = (name) => {
    const entry = scan.entries.find((candidate) => candidate.policyName === name);
    if (entry?.parseStatus !== "valid_json"
      || entry.disposition !== "eligible_after_user_confirmation") return null;
    const raw = rawByPolicy.get(name);
    if (raw === undefined) return null;
    return name === "language" && ["zh", "en"].includes(raw)
      ? raw
      : parseBounded(raw);
    };
    const language = scan.entries.find((entry) => entry.policyName === "language")
    ?.disposition === "eligible_after_user_confirmation"
    ? parsedEligible("language")
    : null;
  const armyDrafts = sanitizeArmyDrafts(
    parsedEligible("armyLists"),
    sourceProjection.source,
    scan.scanHash,
  );
  const history = sanitizeHistory(parsedEligible("matches"), scan.scanHash);
  const dice = sanitizeDice(parsedEligible("diceHistory"), scan.scanHash);
  const legacyPreferences = envelope("starcraft_tmg_local_preferences_v1", {
    language: ["zh", "en"].includes(language) ? language : "zh",
    unitLabelOverrides: {},
    unitLabelOverrideClassification: "user_local_unreviewed_label",
    legacyUnitLabelsImported: false,
    migrationScanHash: scan.scanHash,
    canAffectRules: false,
  });
  const armyEnvelope = envelope("starcraft_tmg_army_draft_quarantine_v1", {
    migrationScanHash: scan.scanHash,
    sourceBindingHash: sourceProjection.source.sourceBindingHash,
    drafts: armyDrafts,
    activeDraftCount: 0,
    quarantinedDraftCount: armyDrafts.length,
    maySeedRoom: false,
    rulesLegalityClaimed: false,
  });
  const historyEnvelope = envelope("starcraft_tmg_read_only_legacy_history_v1", {
    migrationScanHash: scan.scanHash,
    records: history,
    readOnly: true,
    mayRestoreRoom: false,
    mayCreateReplay: false,
    muzeroEligible: false,
  });
  const diceEnvelope = envelope("starcraft_tmg_local_dice_history_v1", {
    migrationScanHash: scan.scanHash,
    entries: dice,
    rngAuthority: false,
  });
  const quarantineEnvelope = envelope("starcraft_tmg_legacy_quarantine_index_v1", {
    migrationScanHash: scan.scanHash,
    entries: scan.entries.filter((entry) => entry.disposition === "quarantined")
      .map((entry) => ({
        sourceKey: entry.sourceKey,
        classification: entry.classification,
        rawValueHash: entry.rawValueHash,
        byteLength: entry.byteLength,
        itemCount: entry.itemCount,
        reason: entry.reason,
        rawValueCopied: false,
      })),
    rawValuesStored: false,
    sourceFallbackAllowed: false,
  });
  const records = {
    legacyPreferences,
    armyDraftQuarantine: armyEnvelope,
    history: historyEnvelope,
    legacyDiceHistory: diceEnvelope,
    quarantine: quarantineEnvelope,
  };
  const recordKeys = Object.fromEntries(GENERATION_RECORD_NAMES.map((name) => [
    name,
    starcraftTmgDeviceMigrationGenerationKeyV1(scan.scanHash, name),
  ]));
  const staged = envelope("starcraft_tmg_device_migration_staging_v1", {
    scanHash: scan.scanHash,
    stage: "user_confirmed",
    targetRecordKeys: recordKeys,
    targetRecordHashes: Object.fromEntries(
      Object.entries(records).map(([name, record]) => [name, record.recordHash]),
    ),
    originalsPreserved: true,
  });
  const manifestBody = {
    schemaVersion: `${STARCRAFT_TMG_DEVICE_DATA_MIGRATION_VERSION}.manifest`,
    scanHash: scan.scanHash,
    migratedAt: scan.scannedAt,
    stage: "sanitized_imported",
    sourceBinding: {
      sourceLockHash: sourceProjection.source.sourceLockHash,
      sourceSnapshotHash: sourceProjection.source.sourceSnapshotHash,
      officialDatasetHash: sourceProjection.source.officialDatasetHash,
      localizationDatasetHash: sourceProjection.source.localizationDatasetHash,
      sourceBindingHash: sourceProjection.source.sourceBindingHash,
      evidenceCatalogueHash: sourceProjection.source.evidenceCatalogueHash,
    },
    recordKeys,
    recordHashes: Object.fromEntries(
      Object.entries(records).map(([name, record]) => [name, record.recordHash]),
    ),
    counts: {
      preferencesImported: language ? 1 : 0,
      legacyUnitLabelMapsQuarantined: rawByPolicy.has("unitTranslations") ? 1 : 0,
      armyDraftsQuarantined: armyDrafts.length,
      historyRecordsImportedReadOnly: history.length,
      diceEntriesImportedLocalOnly: dice.length,
      sourcePayloadsQuarantined: scan.entries.filter(
        (entry) => entry.classification.startsWith("legacy_source"),
      ).length,
    },
    originalKeysModified: [],
    originalBytesPreserved: true,
    networkUsed: false,
    roomRestoreAttempted: false,
    providerCalled: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
  };
  const manifest = receipt(manifestBody, "manifestHash");

  const existingManifestRaw = await storage.getItem(
    STARCRAFT_TMG_DEVICE_STORAGE_KEYS_V1.manifest,
  );
  if (existingManifestRaw) {
    let existingManifest = null;
    try {
      const parsed = parseBounded(existingManifestRaw);
      if (manifestShapeValid(parsed)) existingManifest = parsed;
    } catch {
      // A corrupt published pointer is never overwritten silently.
    }
    if (!existingManifest) fail("DEVICE_MIGRATION_MANIFEST_CONFLICT");
    if (existingManifest.scanHash === scan.scanHash) {
      if (existingManifest.manifestHash !== manifest.manifestHash
        || !(await generationRecordsValid(storage, existingManifest))) {
        fail("DEVICE_MIGRATION_GENERATION_CONFLICT");
      }
      return deepFreeze(clone(existingManifest));
    }
    fail("DEVICE_MIGRATION_MANIFEST_CONFLICT");
  }

  const stagingKey = starcraftTmgDeviceMigrationGenerationKeyV1(
    scan.scanHash,
    "staging",
  );
  const plannedStaging = JSON.stringify(staged);
  const existingStaging = await storage.getItem(stagingKey);
  if (existingStaging && existingStaging !== plannedStaging) {
    fail("DEVICE_MIGRATION_GENERATION_CONFLICT");
  }
  if (!existingStaging) await storage.setItem(stagingKey, plannedStaging);
  for (const [name, record] of Object.entries(records)) {
    const targetKey = recordKeys[name];
    const planned = JSON.stringify(record);
    const existing = await storage.getItem(targetKey);
    if (existing && existing !== planned) {
      fail("DEVICE_MIGRATION_GENERATION_CONFLICT", name);
    }
    if (!existing) await storage.setItem(targetKey, planned);
  }
  if (!(await generationRecordsValid(storage, manifest))) {
    fail("DEVICE_MIGRATION_GENERATION_VERIFY_FAILED");
  }
  for (const entry of scan.entries) {
    const raw = await storage.getItem(entry.sourceKey);
    const absentStillAbsent = !entry.present && (raw === null || raw === undefined);
    const presentStillExact = entry.present
      && entry.rawValueHash !== null
      && raw !== null
      && raw !== undefined
      && rawValueHash(raw) === entry.rawValueHash;
    if (!absentStillAbsent && !presentStillExact) {
      fail("LEGACY_ORIGINAL_BYTES_CHANGED", entry.sourceKey);
    }
  }
  await storage.removeItem(stagingKey);
  await storage.setItem(
    STARCRAFT_TMG_DEVICE_STORAGE_KEYS_V1.manifest,
    JSON.stringify(manifest),
  );
    return manifest;
  } finally {
    ACTIVE_MIGRATION_STORAGES.delete(storage);
  }
}

export async function loadStarcraftTmgDeviceMigrationManifestV1(options = {}) {
  const storage = options.storage;
  assertStorage(storage, ["getItem"]);
  const raw = await storage.getItem(STARCRAFT_TMG_DEVICE_STORAGE_KEYS_V1.manifest);
  if (!raw) return null;
  try {
    const manifest = parseBounded(raw);
    if (!manifestShapeValid(manifest)
      || !(await generationRecordsValid(storage, manifest))) return null;
    return deepFreeze(clone(manifest));
  } catch {
    return null;
  }
}

function readOnlyHistoryShapeValid(history) {
  if (!exactKeys(history, [
    "schemaVersion",
    "migrationScanHash",
    "records",
    "readOnly",
    "mayRestoreRoom",
    "mayCreateReplay",
    "muzeroEligible",
    "trainingTruth",
    "recordHash",
  ])) return false;
  const { recordHash, ...body } = history;
  const recordKeys = [
    "schemaVersion",
    "migrationScanHash",
    "recordHash",
    "occurredAtMs",
    "roundCount",
    "rounds",
    "player1TotalScore",
    "player2TotalScore",
    "winnerClass",
    "timelineEventCount",
    "excluded",
    "readOnly",
    "mayRestoreRoom",
    "mayCreateReplay",
    "muzeroEligible",
    "trainingTruth",
    "summaryHash",
  ];
  const roundKeys = [
    "roundNumber",
    "player1Damage",
    "player2Damage",
    "player1Score",
    "player2Score",
    "player1KillCount",
    "player2KillCount",
  ];
  return history.schemaVersion === "starcraft_tmg_read_only_legacy_history_v1"
    && HASH_PATTERN.test(String(history.migrationScanHash || ""))
    && history.readOnly === true
    && history.mayRestoreRoom === false
    && history.mayCreateReplay === false
    && history.muzeroEligible === false
    && history.trainingTruth === false
    && recordHash === hashStarcraftTmgClientContract(body)
    && Array.isArray(history.records)
    && history.records.length <= MAX_HISTORY
    && history.records.every((record) => {
      if (!exactKeys(record, recordKeys)) return false;
      const { summaryHash, ...recordBody } = record;
      return record.schemaVersion === "starcraft_tmg_read_only_legacy_match_summary_v1"
        && record.migrationScanHash === history.migrationScanHash
        && HASH_PATTERN.test(String(record.recordHash || ""))
        && Number.isSafeInteger(record.occurredAtMs)
        && Number.isSafeInteger(record.roundCount)
        && Array.isArray(record.rounds)
        && record.roundCount === record.rounds.length
        && record.rounds.length <= 100
        && record.rounds.every((round) => exactKeys(round, roundKeys)
          && Object.values(round).every(Number.isFinite))
        && [
          record.player1TotalScore,
          record.player2TotalScore,
          record.timelineEventCount,
        ].every(Number.isFinite)
        && ["player1", "player2", "draw", "unknown"].includes(record.winnerClass)
        && exactKeys(record.excluded, [
          "identityAndFreeText",
          "mutableBattleState",
          "remoteAuthorityClaims",
          "capabilityMaterial",
        ])
        && Object.values(record.excluded).every((value) => value === true)
        && record.readOnly === true
        && record.mayRestoreRoom === false
        && record.mayCreateReplay === false
        && record.muzeroEligible === false
        && record.trainingTruth === false
        && summaryHash === hashStarcraftTmgClientContract(recordBody);
    });
}

export async function readStarcraftTmgReadOnlyLegacyHistoryV1(options = {}) {
  const storage = options.storage;
  assertStorage(storage, ["getItem"]);
  const manifest = await loadStarcraftTmgDeviceMigrationManifestV1({ storage });
  if (!manifest) return null;
  const raw = await storage.getItem(manifest.recordKeys.history);
  if (!raw) return null;
  try {
    const history = parseBounded(raw);
    if (history.recordHash !== manifest.recordHashes.history
      || !readOnlyHistoryShapeValid(history)) return null;
    return deepFreeze(clone(history));
  } catch {
    return null;
  }
}

function sanitizeUnitLabelOverrides(value) {
  if (!object(value) || Object.keys(value).length > 512) return {};
  const result = {};
  for (const [key, label] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    const safeKey = boundedString(key, 160);
    const safeLabel = boundedString(label, 160);
    if (safeKey && safeLabel) result[safeKey] = safeLabel;
  }
  return result;
}

export async function readStarcraftTmgLocalPreferencesV1(options = {}) {
  const storage = options.storage;
  assertStorage(storage, ["getItem"]);
  const validate = (raw) => {
    if (!raw) return null;
    const record = parseBounded(raw);
    const { recordHash, ...body } = record;
    if (record.schemaVersion !== "starcraft_tmg_local_preferences_v1"
      || !["zh", "en"].includes(record.language)
      || record.unitLabelOverrideClassification !== "user_local_unreviewed_label"
      || record.canAffectRules !== false
      || record.trainingTruth !== false
      || recordHash !== hashStarcraftTmgClientContract(body)) return null;
    return deepFreeze(clone(record));
  };
  const currentRaw = await storage.getItem(
    STARCRAFT_TMG_DEVICE_STORAGE_KEYS_V1.preferences,
  );
  try {
    if (currentRaw) return validate(currentRaw);
    const manifest = await loadStarcraftTmgDeviceMigrationManifestV1({ storage });
    if (!manifest) return null;
    const legacyRaw = await storage.getItem(
      manifest.recordKeys.legacyPreferences,
    );
    return validate(legacyRaw);
  } catch {
    return null;
  }
}

export async function writeStarcraftTmgLocalPreferencesV1(options = {}) {
  const storage = options.storage;
  assertStorage(storage, ["setItem"]);
  const body = {
    schemaVersion: "starcraft_tmg_local_preferences_v1",
    language: ["zh", "en"].includes(options.language) ? options.language : "zh",
    unitLabelOverrides: sanitizeUnitLabelOverrides(options.unitLabelOverrides),
    unitLabelOverrideClassification: "user_local_unreviewed_label",
    legacyUnitLabelsImported: false,
    migrationScanHash: options.migrationScanHash || null,
    canAffectRules: false,
    trainingTruth: false,
  };
  const record = { ...body, recordHash: hashStarcraftTmgClientContract(body) };
  await storage.setItem(
    STARCRAFT_TMG_DEVICE_STORAGE_KEYS_V1.preferences,
    JSON.stringify(record),
  );
  return deepFreeze(record);
}
