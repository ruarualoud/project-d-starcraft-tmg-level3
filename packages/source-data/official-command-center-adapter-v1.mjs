import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyCommandCenterSnapshot } from "../rule-atoms/official-live-source-snapshots-v1.mjs";

const DATASET_SCHEMA = "starcraft_tmg_official_command_center_dataset_v1";
const SOURCE_ID = "starcraft-tmg.official.command-center";
const REQUIRED_COLLECTIONS = Object.freeze([
  "army_units",
  "faction_cards",
  "rules_sections",
  "tactical_cards",
]);

const TOP_LEVEL_SCHEMAS = Object.freeze({
  army_units: Object.freeze({
    required: Object.freeze({
      combatRange: "stringValue",
      faction: "stringValue",
      id: "stringValue",
      keywords: "stringValue",
      large: "mapValue",
      name: "stringValue",
      small: "mapValue",
      squadProfile: "arrayValue",
      stats: "mapValue",
      tags: "stringValue",
      unitType: "stringValue",
      upgrades: "arrayValue",
    }),
    optional: Object.freeze({}),
  }),
  tactical_cards: Object.freeze({
    required: Object.freeze({
      boosts: "arrayValue",
      cost: "integerValue",
      faction: "stringValue",
      factionTags: "arrayValue",
      id: "stringValue",
      isFactionCard: "booleanValue",
      isUnique: "booleanValue",
      name: "stringValue",
      resource: "integerValue",
      slots: "mapValue",
      tags: "stringValue",
      timestamp: "timestampValue",
    }),
    optional: Object.freeze({}),
  }),
  rules_sections: Object.freeze({
    required: Object.freeze({
      items: "arrayValue",
      order: "integerValue",
      title: "stringValue",
    }),
    optional: Object.freeze({}),
  }),
  mission: Object.freeze({
    required: Object.freeze({
      additionalConditions: "stringValue",
      extraSupply: "stringValue",
      faction: "stringValue",
      format: "stringValue",
      gameLength: "stringValue",
      id: "stringValue",
      isManual: "booleanValue",
      missionParams: "stringValue",
      name: "stringValue",
      refId: "stringValue",
      scoringConditions: "stringValue",
      startingSupply: "stringValue",
      timestamp: "timestampValue",
      type: "stringValue",
    }),
    optional: Object.freeze({}),
  }),
  deployment: Object.freeze({
    required: Object.freeze({
      backUrl: "nullValue",
      faction: "stringValue",
      frontUrl: "stringValue",
      gameSize: "stringValue",
      isManual: "booleanValue",
      name: "stringValue",
      timestamp: "timestampValue",
      type: "stringValue",
    }),
    optional: Object.freeze({}),
  }),
  community_mission: Object.freeze({
    required: Object.freeze({
      additionalConditions: "stringValue",
      authorId: "stringValue",
      authorName: "stringValue",
      extraSupply: "stringValue",
      faction: "stringValue",
      format: "stringValue",
      gameLength: "stringValue",
      missionParams: "stringValue",
      name: "stringValue",
      scoringConditions: "stringValue",
      startingSupply: "stringValue",
      status: "stringValue",
      timestamp: "timestampValue",
      type: "stringValue",
      upvotes: "arrayValue",
    }),
    optional: Object.freeze({
      authorEmail: "stringValue",
      isArchonFavorite: "booleanValue",
      isOfTheWeek: "booleanValue",
    }),
  }),
  community_deployment: Object.freeze({
    required: Object.freeze({
      authorId: "stringValue",
      authorName: "stringValue",
      backUrl: "nullValue",
      faction: "stringValue",
      frontUrl: "stringValue",
      gameSize: "stringValue",
      isManual: "booleanValue",
      isOfficial: "booleanValue",
      name: "stringValue",
      status: "stringValue",
      timestamp: "timestampValue",
      type: "stringValue",
      upvotes: "arrayValue",
    }),
    optional: Object.freeze({
      isArchonFavorite: "booleanValue",
      isOfTheWeek: "booleanValue",
    }),
  }),
});

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

function assertSingleFirestoreType(value, path) {
  if (!object(value)) fail("firestore_value_invalid", path);
  const keys = Object.keys(value);
  if (keys.length !== 1) fail("firestore_value_type_ambiguous", path);
  return keys[0];
}

function decodeFirestoreValue(value, path) {
  const type = assertSingleFirestoreType(value, path);
  if (type === "nullValue") return null;
  if (type === "booleanValue") {
    if (typeof value.booleanValue !== "boolean") fail("firestore_boolean_invalid", path);
    return value.booleanValue;
  }
  if (type === "integerValue") {
    if (!/^-?\d+$/u.test(String(value.integerValue))) fail("firestore_integer_invalid", path);
    const integer = BigInt(value.integerValue);
    if (integer > BigInt(Number.MAX_SAFE_INTEGER) || integer < BigInt(Number.MIN_SAFE_INTEGER)) {
      fail("firestore_integer_out_of_safe_range", path);
    }
    return Number(integer);
  }
  if (type === "doubleValue") {
    const number = Number(value.doubleValue);
    if (!Number.isFinite(number)) fail("firestore_double_invalid", path);
    return number;
  }
  if (type === "stringValue") {
    if (typeof value.stringValue !== "string") fail("firestore_string_invalid", path);
    return value.stringValue.normalize("NFC");
  }
  if (type === "timestampValue") {
    try {
      return new Date(value.timestampValue).toISOString();
    } catch {
      fail("firestore_timestamp_invalid", path);
    }
  }
  if (type === "arrayValue") {
    const values = value.arrayValue?.values || [];
    if (!Array.isArray(values)) fail("firestore_array_invalid", path);
    return values.map((entry, index) => decodeFirestoreValue(entry, `${path}[${index}]`));
  }
  if (type === "mapValue") {
    const fields = value.mapValue?.fields || {};
    if (!object(fields)) fail("firestore_map_invalid", path);
    return Object.fromEntries(Object.keys(fields).sort().map((field) => [
      field,
      decodeFirestoreValue(fields[field], `${path}.${field}`),
    ]));
  }
  fail("unsupported_firestore_value_type", `${path}:${type}`);
}

function validateTopLevelSchema(collectionId, rawFields, decodedFields, documentId) {
  let schemaId = collectionId;
  if (collectionId === "faction_cards") schemaId = String(decodedFields.type || "");
  const schema = TOP_LEVEL_SCHEMAS[schemaId];
  if (!schema) fail("command_center_record_schema_unclassified", `${collectionId}:${documentId}`);
  const allowed = { ...schema.required, ...schema.optional };
  for (const [field, expectedType] of Object.entries(schema.required)) {
    if (!Object.hasOwn(rawFields, field)) fail("command_center_required_field_missing", `${collectionId}:${documentId}:${field}`);
    const actualType = assertSingleFirestoreType(rawFields[field], `${collectionId}:${documentId}:${field}`);
    if (actualType !== expectedType) fail("command_center_field_type_drift", `${collectionId}:${documentId}:${field}`);
  }
  for (const field of Object.keys(rawFields)) {
    if (!Object.hasOwn(allowed, field)) fail("command_center_unreviewed_field_drift", `${collectionId}:${documentId}:${field}`);
    const actualType = assertSingleFirestoreType(rawFields[field], `${collectionId}:${documentId}:${field}`);
    if (actualType !== allowed[field]) fail("command_center_field_type_drift", `${collectionId}:${documentId}:${field}`);
  }
}

function datasetBody(dataset) {
  return without(dataset, ["datasetHash", "recordsByKey"]);
}

function sameDataVersions(left, right) {
  return ["cardsVersion", "rulesVersion", "unitsVersion"]
    .every((field) => String(left?.[field]) === String(right?.[field]));
}

export function classifyOfficialCommandCenterRecord(input = {}) {
  const collectionId = String(input.collectionId || "");
  const fields = object(input.fields) ? input.fields : {};
  if (collectionId === "army_units") {
    return deepFreeze({ authorityDisposition: "official_current_product_candidate", recordType: "unit" });
  }
  if (collectionId === "tactical_cards") {
    return deepFreeze({ authorityDisposition: "official_current_product_candidate", recordType: "tactical_card" });
  }
  if (collectionId === "rules_sections") {
    return deepFreeze({ authorityDisposition: "official_rule_prose_review_required", recordType: "rules_section" });
  }
  if (collectionId === "faction_cards") {
    if (fields.type === "mission" && fields.faction === "the_game") {
      return deepFreeze({ authorityDisposition: "official_current_product_candidate", recordType: "mission" });
    }
    if (fields.type === "deployment" && fields.faction === "the_game") {
      return deepFreeze({ authorityDisposition: "official_current_product_candidate", recordType: "deployment" });
    }
    if (fields.type === "community_mission") {
      return deepFreeze({ authorityDisposition: "community_display_only", recordType: "community_mission" });
    }
    if (fields.type === "community_deployment") {
      return deepFreeze({ authorityDisposition: "community_display_only", recordType: "community_deployment" });
    }
  }
  fail("command_center_record_scope_unclassified", collectionId);
}

function normalizeDocument(collectionId, document, snapshotRecord) {
  if (!object(document) || !object(document.fields)) fail("command_center_document_invalid", collectionId);
  const documentId = String(document.name || "").split("/").at(-1);
  if (!documentId) fail("command_center_document_id_required", collectionId);
  if (!snapshotRecord || snapshotRecord.documentId !== documentId) {
    fail("command_center_snapshot_record_missing", `${collectionId}:${documentId}`);
  }
  if (hashStarcraftTmgContract(document.fields) !== snapshotRecord.fieldHash) {
    fail("command_center_record_field_hash_mismatch", `${collectionId}:${documentId}`);
  }
  if (hashStarcraftTmgContract({ documentId, fields: document.fields }) !== snapshotRecord.recordHash) {
    fail("command_center_record_hash_mismatch", `${collectionId}:${documentId}`);
  }
  const payload = Object.fromEntries(Object.keys(document.fields).sort().map((field) => [
    field,
    decodeFirestoreValue(document.fields[field], `${collectionId}:${documentId}.${field}`),
  ]));
  validateTopLevelSchema(collectionId, document.fields, payload, documentId);
  if ((collectionId === "army_units" || collectionId === "tactical_cards" || payload.type === "mission")
    && payload.id !== documentId) {
    fail("command_center_embedded_id_mismatch", `${collectionId}:${documentId}`);
  }
  const classification = classifyOfficialCommandCenterRecord({ collectionId, fields: payload });
  return {
    record: {
      schema: "starcraft_tmg_official_command_center_record_v1",
      recordKey: `${collectionId}:${documentId}`,
      collectionId,
      documentId,
      ...classification,
      sourceRecordHash: snapshotRecord.recordHash,
      payloadHash: hashStarcraftTmgContract(payload),
      payload,
    },
    index: {
      recordKey: `${collectionId}:${documentId}`,
      collectionId,
      documentId,
      ...classification,
      sourceRecordHash: snapshotRecord.recordHash,
      payloadHash: hashStarcraftTmgContract(payload),
    },
  };
}

export function createOfficialCommandCenterDataset(input = {}) {
  const snapshot = input.snapshot;
  verifyCommandCenterSnapshot(snapshot);
  if (snapshot.sourceId !== SOURCE_ID) fail("non_official_current_data_source_forbidden");
  if (!object(input.firestorePayloads)) fail("command_center_firestore_payloads_required");
  const collectionIds = Object.keys(input.firestorePayloads).sort();
  if (collectionIds.length !== REQUIRED_COLLECTIONS.length
    || REQUIRED_COLLECTIONS.some((collectionId) => !collectionIds.includes(collectionId))) {
    fail("command_center_collection_denominator_mismatch");
  }
  const snapshotCollections = new Map(snapshot.firestoreCollections.map((collection) => [
    collection.collectionId,
    collection,
  ]));
  const normalized = [];
  for (const collectionId of collectionIds) {
    const payload = input.firestorePayloads[collectionId];
    const snapshotCollection = snapshotCollections.get(collectionId);
    if (!snapshotCollection) fail("command_center_snapshot_collection_missing", collectionId);
    if (!object(payload) || !Array.isArray(payload.documents) || payload.nextPageToken) {
      fail("command_center_collection_payload_invalid", collectionId);
    }
    if (hashStarcraftTmgContract(payload) !== snapshotCollection.rawResponseHash) {
      fail("command_center_collection_payload_hash_mismatch", collectionId);
    }
    if (payload.documents.length !== snapshotCollection.documentCount) {
      fail("command_center_collection_record_count_mismatch", collectionId);
    }
    const recordById = new Map(snapshotCollection.recordIndex.map((record) => [record.documentId, record]));
    const seen = new Set();
    for (const document of payload.documents) {
      const documentId = String(document?.name || "").split("/").at(-1);
      if (seen.has(documentId)) fail("command_center_duplicate_document", `${collectionId}:${documentId}`);
      seen.add(documentId);
      normalized.push(normalizeDocument(collectionId, document, recordById.get(documentId)));
    }
    if (seen.size !== recordById.size) fail("command_center_snapshot_record_denominator_mismatch", collectionId);
  }
  normalized.sort((left, right) => left.index.recordKey.localeCompare(right.index.recordKey));
  const recordIndex = normalized.map((entry) => entry.index);
  const recordsByKey = Object.fromEntries(normalized.map((entry) => [entry.record.recordKey, entry.record]));
  const body = {
    schema: DATASET_SCHEMA,
    sourceId: SOURCE_ID,
    sourceSnapshotHash: snapshot.snapshotHash,
    sourceCapturedAt: snapshot.capturedAt,
    productVersion: snapshot.productVersion,
    dataVersions: { ...snapshot.dataVersions },
    transformer: {
      id: "project-d.starcraft-tmg.official-command-center-adapter",
      version: "1",
    },
    recordIndex,
    recordIndexHash: hashStarcraftTmgContract(recordIndex),
    reviewStatus: "normalized_pending_independent_certification",
    currentDataPolicy: "newest_certified_official_snapshot_at_room_creation",
    historicalPolicy: "exact_snapshot_hash_only",
    repositoryFallbackAllowed: false,
    productionRoomBindingEligible: false,
    canAffectRules: false,
    trainingTruth: false,
  };
  return deepFreeze({
    ...body,
    datasetHash: hashStarcraftTmgContract(body),
    recordsByKey,
  });
}

export function verifyOfficialCommandCenterDataset(input = {}) {
  const { dataset, snapshot } = input;
  verifyCommandCenterSnapshot(snapshot);
  if (!object(dataset) || dataset.schema !== DATASET_SCHEMA) fail("official_command_center_dataset_schema_invalid");
  if (hashStarcraftTmgContract(datasetBody(dataset)) !== dataset.datasetHash) {
    fail("official_command_center_dataset_hash_mismatch");
  }
  if (dataset.sourceId !== SOURCE_ID
    || dataset.sourceSnapshotHash !== snapshot.snapshotHash
    || dataset.sourceCapturedAt !== snapshot.capturedAt
    || dataset.productVersion !== snapshot.productVersion
    || !sameDataVersions(dataset.dataVersions, snapshot.dataVersions)
    || dataset.transformer?.id !== "project-d.starcraft-tmg.official-command-center-adapter"
    || dataset.transformer?.version !== "1"
    || hashStarcraftTmgContract(dataset.recordIndex) !== dataset.recordIndexHash) {
    fail("official_command_center_dataset_source_mismatch");
  }
  if (dataset.currentDataPolicy !== "newest_certified_official_snapshot_at_room_creation"
    || dataset.historicalPolicy !== "exact_snapshot_hash_only"
    || dataset.repositoryFallbackAllowed !== false
    || dataset.canAffectRules !== false
    || dataset.trainingTruth !== false) {
    fail("official_command_center_dataset_policy_mismatch");
  }
  const sourceRecordHashes = new Map(snapshot.firestoreCollections.flatMap((collection) => (
    collection.recordIndex.map((record) => [
      `${collection.collectionId}:${record.documentId}`,
      record.recordHash,
    ])
  )));
  const counts = {
    records: dataset.recordIndex.length,
    byAuthorityDisposition: {},
    officialProductByType: {},
    unclassified: 0,
  };
  const seen = new Set();
  for (const index of dataset.recordIndex) {
    if (seen.has(index.recordKey)) fail("official_command_center_dataset_duplicate_record", index.recordKey);
    seen.add(index.recordKey);
    const record = dataset.recordsByKey?.[index.recordKey];
    if (!record
      || record.payloadHash !== hashStarcraftTmgContract(record.payload)
      || record.payloadHash !== index.payloadHash
      || record.sourceRecordHash !== index.sourceRecordHash
      || index.sourceRecordHash !== sourceRecordHashes.get(index.recordKey)) {
      fail("official_command_center_dataset_record_integrity_mismatch", index.recordKey);
    }
    counts.byAuthorityDisposition[index.authorityDisposition] = (counts.byAuthorityDisposition[index.authorityDisposition] || 0) + 1;
    if (index.authorityDisposition === "official_current_product_candidate") {
      counts.officialProductByType[index.recordType] = (counts.officialProductByType[index.recordType] || 0) + 1;
    }
    if (![
      "community_display_only",
      "official_current_product_candidate",
      "official_rule_prose_review_required",
    ].includes(index.authorityDisposition)) counts.unclassified += 1;
  }
  counts.byAuthorityDisposition = Object.fromEntries(Object.entries(counts.byAuthorityDisposition).sort(([left], [right]) => left.localeCompare(right)));
  counts.officialProductByType = Object.fromEntries(Object.entries(counts.officialProductByType).sort(([left], [right]) => left.localeCompare(right)));
  if (seen.size !== sourceRecordHashes.size || counts.unclassified !== 0) {
    fail("official_command_center_dataset_record_denominator_mismatch");
  }
  const audit = {
    schema: "starcraft_tmg_official_command_center_dataset_audit_v1",
    datasetHash: dataset.datasetHash,
    sourceSnapshotHash: dataset.sourceSnapshotHash,
    dataVersions: { ...dataset.dataVersions },
    counts,
    productionRoomBindingEligible: false,
    repositoryFallbackAllowed: false,
    canAffectRules: false,
    trainingTruth: false,
  };
  return deepFreeze({ ...audit, auditHash: hashStarcraftTmgContract(audit) });
}

export function getOfficialCurrentProductRecord(dataset, recordKey) {
  if (!object(dataset) || dataset.schema !== DATASET_SCHEMA) fail("official_command_center_dataset_schema_invalid");
  if (hashStarcraftTmgContract(datasetBody(dataset)) !== dataset.datasetHash) {
    fail("official_command_center_dataset_hash_mismatch");
  }
  const record = dataset.recordsByKey?.[String(recordKey || "")];
  const index = dataset.recordIndex?.find((entry) => entry.recordKey === record?.recordKey);
  if (!record
    || !index
    || index.payloadHash !== record.payloadHash
    || index.sourceRecordHash !== record.sourceRecordHash
    || record.authorityDisposition !== "official_current_product_candidate") {
    fail("official_current_product_record_required", String(recordKey || ""));
  }
  if (record.payloadHash !== hashStarcraftTmgContract(record.payload)) {
    fail("official_command_center_dataset_record_integrity_mismatch", record.recordKey);
  }
  return record;
}
