import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyCommandCenterSnapshot } from "../rule-atoms/official-live-source-snapshots-v1.mjs";
import { verifyOfficialCommandCenterDataset } from "./official-command-center-adapter-v1.mjs";

export const OFFICIAL_FIRESTORE_DELTA_SCHEMA = "starcraft_tmg_official_command_center_firestore_delta_v1";
export const OFFICIAL_FIRESTORE_DELTA_RECEIPT_SCHEMA = "starcraft_tmg_official_command_center_firestore_delta_receipt_v1";
export const OFFICIAL_SAME_VERSION_DRIFT_RECEIPT_SCHEMA = "starcraft_tmg_official_same_version_display_only_drift_receipt_v1";

const SOURCE_ID = "starcraft-tmg.official.command-center";
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const VERSION_FIELDS = Object.freeze(["cardsVersion", "rulesVersion", "unitsVersion"]);

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

function assertHash(value, code) {
  if (!HASH_PATTERN.test(String(value || ""))) fail(code);
  return value;
}

function isoInstant(value, code) {
  try {
    const normalized = new Date(value).toISOString();
    if (normalized !== value) fail(code);
    return normalized;
  } catch {
    fail(code);
  }
}

function firestoreInstant(value, code) {
  const normalized = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/u.test(normalized)
    || !Number.isFinite(Date.parse(normalized))) fail(code);
  return normalized;
}

function documentId(document) {
  return String(document?.name || "").split("/").at(-1);
}

function recordHash(document) {
  const id = documentId(document);
  return hashStarcraftTmgContract({ documentId: id, fields: document.fields });
}

function semanticContentHash(payload) {
  return hashStarcraftTmgContract(payload.documents.map((document) => ({
    documentId: documentId(document),
    recordHash: recordHash(document),
  })).sort((left, right) => left.documentId.localeCompare(right.documentId)));
}

function assertPayload(payload, code) {
  if (!object(payload) || !Array.isArray(payload.documents) || payload.nextPageToken) fail(code);
  const ids = payload.documents.map(documentId);
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) fail(`${code}_document_index_invalid`);
  return payload;
}

function verifyDelta(delta) {
  if (!object(delta) || delta.schema !== OFFICIAL_FIRESTORE_DELTA_SCHEMA) {
    fail("official_firestore_delta_schema_invalid");
  }
  if (hashStarcraftTmgContract(without(delta, ["deltaHash"])) !== delta.deltaHash) {
    fail("official_firestore_delta_hash_mismatch");
  }
  if (delta.sourceId !== SOURCE_ID
    || delta.collectionId !== "faction_cards"
    || delta.authorityScope !== "community_display_only"
    || delta.officialProductChanges !== 0
    || delta.ruleProseChanges !== 0
    || delta.repositoryFallbackAllowed !== false
    || delta.canAffectRules !== false
    || delta.trainingTruth !== false) {
    fail("official_firestore_delta_scope_invalid");
  }
  isoInstant(delta.capturedAt, "official_firestore_delta_capture_time_invalid");
  for (const field of [
    "baseRawResponseHash",
    "resultRawResponseHash",
    "baseSemanticContentHash",
    "resultSemanticContentHash",
  ]) assertHash(delta[field], `official_firestore_delta_${field}_invalid`);
  if (!Array.isArray(delta.changes) || delta.changes.length === 0) {
    fail("official_firestore_delta_change_required");
  }
  return delta;
}

function verifyFirestoreDeltaReceipt(receipt) {
  if (!object(receipt) || receipt.schema !== OFFICIAL_FIRESTORE_DELTA_RECEIPT_SCHEMA) {
    fail("official_firestore_delta_receipt_schema_invalid");
  }
  if (hashStarcraftTmgContract(without(receipt, ["receiptHash"])) !== receipt.receiptHash) {
    fail("official_firestore_delta_receipt_hash_mismatch");
  }
  if (receipt.sourceId !== SOURCE_ID
    || receipt.collectionId !== "faction_cards"
    || receipt.authorityScope !== "community_display_only"
    || receipt.officialProductChangeCount !== 0
    || receipt.ruleProseChangeCount !== 0
    || receipt.canAffectRules !== false
    || receipt.trainingTruth !== false) {
    fail("official_firestore_delta_receipt_scope_invalid");
  }
  return receipt;
}

export function applyOfficialCommandCenterFirestoreDelta(input = {}) {
  const basePayload = assertPayload(input.basePayload, "official_firestore_delta_base_payload_invalid");
  const delta = verifyDelta(input.delta);
  if (basePayload.documents.length !== delta.baseDocumentCount
    || hashStarcraftTmgContract(basePayload) !== delta.baseRawResponseHash
    || semanticContentHash(basePayload) !== delta.baseSemanticContentHash) {
    fail("official_firestore_delta_base_mismatch");
  }

  const result = structuredClone(basePayload);
  const byId = new Map(result.documents.map((document) => [documentId(document), document]));
  const seen = new Set();
  const changedRecords = [];
  for (const change of delta.changes) {
    const id = String(change?.documentId || "");
    if (!id || seen.has(id)) fail("official_firestore_delta_change_duplicate", id);
    seen.add(id);
    const document = byId.get(id);
    if (!document || !object(document.fields)) fail("official_firestore_delta_document_missing", id);
    const recordType = document.fields.type?.stringValue;
    if (recordType !== change.recordType || !["community_mission", "community_deployment"].includes(recordType)) {
      fail("official_firestore_delta_non_community_record_forbidden", id);
    }
    if (document.updateTime !== change.oldUpdateTime
      || hashStarcraftTmgContract(document.fields) !== change.oldFieldHash
      || recordHash(document) !== change.oldRecordHash) {
      fail("official_firestore_delta_old_record_mismatch", id);
    }
    if (!Array.isArray(change.operations) || change.operations.length === 0) {
      fail("official_firestore_delta_operation_required", id);
    }
    const changedFields = new Set();
    for (const operation of change.operations) {
      if (operation?.operation !== "append_unique_string_array" || operation.field !== "upvotes") {
        fail("official_firestore_delta_operation_forbidden", id);
      }
      const values = document.fields.upvotes?.arrayValue?.values || [];
      if (!Array.isArray(values)
        || values.length !== operation.oldLength
        || operation.newLength !== operation.oldLength + 1
        || typeof operation.value !== "string"
        || !operation.value
        || values.some((entry) => entry?.stringValue === operation.value)) {
        fail("official_firestore_delta_append_precondition_failed", id);
      }
      document.fields.upvotes = {
        arrayValue: {
          values: [...values, { stringValue: operation.value }],
        },
      };
      if (document.fields.upvotes.arrayValue.values.length !== operation.newLength) {
        fail("official_firestore_delta_append_length_mismatch", id);
      }
      changedFields.add(operation.field);
    }
    firestoreInstant(change.oldUpdateTime, "official_firestore_delta_update_time_invalid");
    document.updateTime = firestoreInstant(change.newUpdateTime, "official_firestore_delta_update_time_invalid");
    if (Date.parse(change.newUpdateTime) <= Date.parse(change.oldUpdateTime)) {
      fail("official_firestore_delta_update_time_not_advanced", id);
    }
    const newFieldHash = hashStarcraftTmgContract(document.fields);
    const newRecordHash = recordHash(document);
    if (newFieldHash !== change.newFieldHash || newRecordHash !== change.newRecordHash) {
      fail("official_firestore_delta_new_record_mismatch", id);
    }
    changedRecords.push({
      documentId: id,
      authorityDisposition: "community_display_only",
      recordType,
      changedFields: [...changedFields].sort(),
      oldUpdateTime: change.oldUpdateTime,
      newUpdateTime: change.newUpdateTime,
      oldFieldHash: change.oldFieldHash,
      newFieldHash,
      oldRecordHash: change.oldRecordHash,
      newRecordHash,
    });
  }
  changedRecords.sort((left, right) => left.documentId.localeCompare(right.documentId));
  if (result.documents.length !== delta.resultDocumentCount
    || hashStarcraftTmgContract(result) !== delta.resultRawResponseHash
    || semanticContentHash(result) !== delta.resultSemanticContentHash) {
    fail("official_firestore_delta_result_mismatch");
  }
  const body = {
    schema: OFFICIAL_FIRESTORE_DELTA_RECEIPT_SCHEMA,
    sourceId: SOURCE_ID,
    sourceUrl: delta.sourceUrl,
    capturedAt: delta.capturedAt,
    collectionId: delta.collectionId,
    authorityScope: "community_display_only",
    deltaHash: delta.deltaHash,
    baseRawResponseHash: delta.baseRawResponseHash,
    resultRawResponseHash: delta.resultRawResponseHash,
    baseSemanticContentHash: delta.baseSemanticContentHash,
    resultSemanticContentHash: delta.resultSemanticContentHash,
    documentCount: result.documents.length,
    changedRecordCount: changedRecords.length,
    changedRecords,
    officialProductChangeCount: 0,
    ruleProseChangeCount: 0,
    canAffectRules: false,
    trainingTruth: false,
  };
  return deepFreeze({
    firestorePayload: result,
    receipt: { ...body, receiptHash: hashStarcraftTmgContract(body) },
  });
}

function sameVersions(left, right) {
  return VERSION_FIELDS.every((field) => String(left?.[field]) === String(right?.[field]));
}

function snapshotStableProjection(snapshot) {
  return without(snapshot, ["capturedAt", "firestoreCollections", "snapshotHash"]);
}

function collectionMap(snapshot) {
  return new Map(snapshot.firestoreCollections.map((collection) => [collection.collectionId, collection]));
}

function datasetIndexMap(dataset) {
  return new Map(dataset.recordIndex.map((entry) => [entry.recordKey, entry]));
}

function changedPayloadFields(left, right) {
  return [...new Set([...Object.keys(left || {}), ...Object.keys(right || {})])]
    .filter((field) => hashStarcraftTmgContract({
      present: Object.hasOwn(left || {}, field),
      value: left?.[field] ?? null,
    }) !== hashStarcraftTmgContract({
      present: Object.hasOwn(right || {}, field),
      value: right?.[field] ?? null,
    }))
    .sort();
}

function computeSameVersionDisplayOnlyDrift(input = {}) {
  const {
    baseSnapshot,
    resultSnapshot,
    baseDataset,
    resultDataset,
  } = input;
  verifyCommandCenterSnapshot(baseSnapshot);
  verifyCommandCenterSnapshot(resultSnapshot);
  verifyOfficialCommandCenterDataset({ snapshot: baseSnapshot, dataset: baseDataset });
  verifyOfficialCommandCenterDataset({ snapshot: resultSnapshot, dataset: resultDataset });
  if (baseSnapshot.sourceId !== SOURCE_ID || resultSnapshot.sourceId !== SOURCE_ID) {
    fail("official_same_version_source_mismatch");
  }
  if (!sameVersions(baseSnapshot.dataVersions, resultSnapshot.dataVersions)) {
    fail("official_same_version_versions_mismatch");
  }
  const baseCapturedAt = isoInstant(baseSnapshot.capturedAt, "official_same_version_capture_time_invalid");
  const resultCapturedAt = isoInstant(resultSnapshot.capturedAt, "official_same_version_capture_time_invalid");
  if (Date.parse(resultCapturedAt) <= Date.parse(baseCapturedAt)) {
    fail("official_same_version_capture_time_not_advanced");
  }
  if (hashStarcraftTmgContract(snapshotStableProjection(baseSnapshot))
    !== hashStarcraftTmgContract(snapshotStableProjection(resultSnapshot))) {
    fail("official_same_version_snapshot_metadata_drift_forbidden");
  }

  const deltaReceipt = verifyFirestoreDeltaReceipt(
    input.firestoreDeltaReceipt || input.receipt?.firestoreDeltaReceipt,
  );
  const baseCollections = collectionMap(baseSnapshot);
  const resultCollections = collectionMap(resultSnapshot);
  for (const collectionId of ["army_units", "rules_sections", "tactical_cards"]) {
    if (hashStarcraftTmgContract(baseCollections.get(collectionId))
      !== hashStarcraftTmgContract(resultCollections.get(collectionId))) {
      fail("official_same_version_non_display_drift_forbidden", collectionId);
    }
  }
  const baseFaction = baseCollections.get("faction_cards");
  const resultFaction = resultCollections.get("faction_cards");
  if (!baseFaction || !resultFaction
    || baseFaction.documentCount !== resultFaction.documentCount
    || baseFaction.rawResponseHash !== deltaReceipt.baseRawResponseHash
    || resultFaction.rawResponseHash !== deltaReceipt.resultRawResponseHash
    || baseFaction.semanticContentHash !== deltaReceipt.baseSemanticContentHash
    || resultFaction.semanticContentHash !== deltaReceipt.resultSemanticContentHash) {
    fail("official_same_version_delta_snapshot_mismatch");
  }

  const baseIndex = datasetIndexMap(baseDataset);
  const resultIndex = datasetIndexMap(resultDataset);
  if (baseIndex.size !== resultIndex.size) fail("official_same_version_record_denominator_mismatch");
  const changedRecords = [];
  for (const [recordKey, before] of baseIndex) {
    const after = resultIndex.get(recordKey);
    if (!after) fail("official_same_version_record_denominator_mismatch", recordKey);
    if (hashStarcraftTmgContract(before) === hashStarcraftTmgContract(after)) continue;
    const beforeRecord = baseDataset.recordsByKey[recordKey];
    const afterRecord = resultDataset.recordsByKey[recordKey];
    const fields = changedPayloadFields(beforeRecord?.payload, afterRecord?.payload);
    if (before.authorityDisposition !== "community_display_only"
      || after.authorityDisposition !== "community_display_only"
      || before.recordType !== after.recordType
      || before.collectionId !== "faction_cards"
      || after.collectionId !== "faction_cards"
      || fields.length !== 1
      || fields[0] !== "upvotes") {
      fail("official_same_version_non_display_drift_forbidden", recordKey);
    }
    changedRecords.push({
      recordKey,
      documentId: before.documentId,
      authorityDisposition: "community_display_only",
      recordType: before.recordType,
      changedFields: fields,
      oldSourceRecordHash: before.sourceRecordHash,
      newSourceRecordHash: after.sourceRecordHash,
      oldPayloadHash: before.payloadHash,
      newPayloadHash: after.payloadHash,
    });
  }
  changedRecords.sort((left, right) => left.recordKey.localeCompare(right.recordKey));
  const deltaIds = deltaReceipt.changedRecords.map((entry) => entry.documentId)
    .sort((left, right) => left.localeCompare(right));
  if (changedRecords.length === 0
    || hashStarcraftTmgContract(changedRecords.map((entry) => entry.documentId)) !== hashStarcraftTmgContract(deltaIds)) {
    fail("official_same_version_delta_record_set_mismatch");
  }
  const deltaById = new Map(deltaReceipt.changedRecords.map((entry) => [entry.documentId, entry]));
  for (const change of changedRecords) {
    const deltaChange = deltaById.get(change.documentId);
    if (!deltaChange
      || deltaChange.oldRecordHash !== change.oldSourceRecordHash
      || deltaChange.newRecordHash !== change.newSourceRecordHash
      || hashStarcraftTmgContract(deltaChange.changedFields) !== hashStarcraftTmgContract(change.changedFields)) {
      fail("official_same_version_delta_record_binding_mismatch", change.documentId);
    }
  }

  const officialProductBefore = baseDataset.recordIndex.filter((entry) => (
    entry.authorityDisposition === "official_current_product_candidate"
  ));
  const officialProductAfter = resultDataset.recordIndex.filter((entry) => (
    entry.authorityDisposition === "official_current_product_candidate"
  ));
  const ruleProseBefore = baseDataset.recordIndex.filter((entry) => (
    entry.authorityDisposition === "official_rule_prose_review_required"
  ));
  const ruleProseAfter = resultDataset.recordIndex.filter((entry) => (
    entry.authorityDisposition === "official_rule_prose_review_required"
  ));
  const officialProductIndexHash = hashStarcraftTmgContract(officialProductBefore);
  const ruleProseIndexHash = hashStarcraftTmgContract(ruleProseBefore);
  if (officialProductIndexHash !== hashStarcraftTmgContract(officialProductAfter)
    || ruleProseIndexHash !== hashStarcraftTmgContract(ruleProseAfter)) {
    fail("official_same_version_non_display_drift_forbidden");
  }
  return {
    baseSnapshot,
    resultSnapshot,
    baseDataset,
    resultDataset,
    deltaReceipt,
    changedRecords,
    officialProductIndexHash,
    ruleProseIndexHash,
  };
}

export function createOfficialSameVersionDisplayOnlyDriftReceipt(input = {}) {
  const computed = computeSameVersionDisplayOnlyDrift(input);
  const body = {
    schema: OFFICIAL_SAME_VERSION_DRIFT_RECEIPT_SCHEMA,
    sourceId: SOURCE_ID,
    baseSnapshotHash: computed.baseSnapshot.snapshotHash,
    resultSnapshotHash: computed.resultSnapshot.snapshotHash,
    baseDatasetHash: computed.baseDataset.datasetHash,
    resultDatasetHash: computed.resultDataset.datasetHash,
    dataVersions: Object.fromEntries(VERSION_FIELDS.map((field) => [
      field,
      String(computed.baseSnapshot.dataVersions[field]),
    ])),
    baseCapturedAt: computed.baseSnapshot.capturedAt,
    resultCapturedAt: computed.resultSnapshot.capturedAt,
    firestoreDeltaReceiptHash: computed.deltaReceipt.receiptHash,
    firestoreDeltaReceipt: computed.deltaReceipt,
    changedRecords: computed.changedRecords,
    communityDisplayOnlyChangeCount: computed.changedRecords.length,
    officialProductChangeCount: 0,
    ruleProseChangeCount: 0,
    officialProductIndexHash: computed.officialProductIndexHash,
    ruleProseIndexHash: computed.ruleProseIndexHash,
    selectionPolicy: "newer_capture_only_after_verified_display_only_drift",
    repositoryFallbackAllowed: false,
    canAffectRules: false,
    trainingTruth: false,
  };
  return deepFreeze({ ...body, receiptHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialSameVersionDisplayOnlyDriftReceipt(input = {}) {
  const receipt = input.receipt;
  if (!object(receipt) || receipt.schema !== OFFICIAL_SAME_VERSION_DRIFT_RECEIPT_SCHEMA) {
    fail("official_same_version_drift_receipt_schema_invalid");
  }
  if (hashStarcraftTmgContract(without(receipt, ["receiptHash"])) !== receipt.receiptHash) {
    fail("official_same_version_drift_receipt_hash_mismatch");
  }
  const expected = createOfficialSameVersionDisplayOnlyDriftReceipt(input);
  if (receipt.receiptHash !== expected.receiptHash) {
    fail("official_same_version_drift_receipt_binding_mismatch");
  }
  return true;
}
