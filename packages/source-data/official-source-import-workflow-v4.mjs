import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialCommandCenterDataset } from
  "./official-command-center-adapter-v1.mjs";

export const STARCRAFT_TMG_SOURCE_IMPORT_WORKFLOW_V4 =
  "starcraft_tmg_source_import_workflow_v4";

const HASH = /^[a-f0-9]{64}$/u;
const AUTHORITIES = new Set([
  "official_current_product_candidate",
  "official_rule_prose_review_required",
  "community_display_only",
]);
const COMMAND_KINDS = new Set([
  "stage_source_revision",
  "promote_source_revision",
  "rollback_source_revision",
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value || {}).filter(([key]) => !keys.includes(key)));
}

function assertIso(value, code) {
  if (!value || new Date(value).toISOString() !== value) fail(code);
}

function assertHash(value, code) {
  if (!HASH.test(String(value || ""))) fail(code);
}

function assertSealed(value, hashKey, code) {
  if (!value || !HASH.test(String(value[hashKey] || ""))
    || hashStarcraftTmgContract(without(value, [hashKey])) !== value[hashKey]) {
    fail(code);
  }
}

function seal(body, hashKey) {
  return deepFreeze({ ...body, [hashKey]: hashStarcraftTmgContract(body) });
}

function normalizeVersions(input = {}) {
  const result = {
    cardsVersion: String(input.cardsVersion || ""),
    rulesVersion: String(input.rulesVersion || ""),
    unitsVersion: String(input.unitsVersion || ""),
  };
  if (Object.values(result).some((value) => !/^\d+$/u.test(value))) {
    fail("SOURCE_REVISION_VERSION_INVALID");
  }
  return result;
}

function compareVersions(left, right) {
  const fields = ["cardsVersion", "rulesVersion", "unitsVersion"];
  const signs = fields.map((field) => Math.sign(Number(left[field]) - Number(right[field])));
  if (signs.every((sign) => sign === 0)) return "same";
  if (signs.every((sign) => sign >= 0)) return "forward";
  if (signs.every((sign) => sign <= 0)) return "rollback";
  return "conflict";
}

function payloadShape(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return ["array", ...value.map(payloadShape)];
  if (typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, payloadShape(value[key])]));
  }
  return typeof value;
}

function normalizeRecordIndex(recordIndex, recordsByKey = {}) {
  if (!Array.isArray(recordIndex) || recordIndex.length === 0) {
    fail("SOURCE_REVISION_RECORD_INDEX_REQUIRED");
  }
  const seen = new Set();
  const normalized = recordIndex.map((record) => {
    const recordKey = String(record?.recordKey || "");
    if (!recordKey || seen.has(recordKey)) fail("SOURCE_REVISION_RECORD_KEY_INVALID", recordKey);
    seen.add(recordKey);
    if (!AUTHORITIES.has(record.authorityDisposition)) {
      fail("SOURCE_REVISION_AUTHORITY_INVALID", recordKey);
    }
    assertHash(record.sourceRecordHash, "SOURCE_REVISION_SOURCE_RECORD_HASH_INVALID");
    assertHash(record.payloadHash, "SOURCE_REVISION_PAYLOAD_HASH_INVALID");
    const payload = recordsByKey?.[recordKey]?.payload;
    const schemaHash = record.schemaHash || (payload === undefined
      ? null
      : hashStarcraftTmgContract(payloadShape(payload)));
    assertHash(schemaHash, "SOURCE_REVISION_SCHEMA_HASH_INVALID");
    return {
      recordKey,
      collectionId: String(record.collectionId || ""),
      documentId: String(record.documentId || ""),
      recordType: String(record.recordType || ""),
      authorityDisposition: record.authorityDisposition,
      sourceRecordHash: record.sourceRecordHash,
      payloadHash: record.payloadHash,
      schemaHash,
    };
  });
  return normalized.sort((left, right) => left.recordKey.localeCompare(right.recordKey));
}

function normalizeRawCaptures(captures) {
  if (!Array.isArray(captures) || captures.length === 0) {
    fail("SOURCE_REVISION_RAW_CAPTURE_REQUIRED");
  }
  const seen = new Set();
  return captures.map((capture) => {
    const sourceId = String(capture?.sourceId || "");
    if (!sourceId || seen.has(sourceId)) fail("SOURCE_REVISION_RAW_CAPTURE_DUPLICATE", sourceId);
    seen.add(sourceId);
    assertHash(capture.byteHash, "SOURCE_REVISION_RAW_CAPTURE_HASH_INVALID");
    if (!Number.isInteger(capture.byteLength) || capture.byteLength < 0) {
      fail("SOURCE_REVISION_RAW_CAPTURE_LENGTH_INVALID", sourceId);
    }
    return {
      sourceId,
      sourceClass: String(capture.sourceClass || ""),
      byteHash: capture.byteHash,
      byteLength: capture.byteLength,
      immutable: true,
    };
  }).sort((left, right) => left.sourceId.localeCompare(right.sourceId));
}

export function createStarcraftTmgSourceRevisionManifestV4(input = {}) {
  assertIso(input.capturedAt, "SOURCE_REVISION_CAPTURED_AT_INVALID");
  assertHash(input.sourceSnapshotHash, "SOURCE_REVISION_SNAPSHOT_HASH_INVALID");
  assertHash(input.normalizedDatasetHash, "SOURCE_REVISION_DATASET_HASH_INVALID");
  assertHash(input.upstreamVerificationHash, "SOURCE_REVISION_UPSTREAM_VERIFICATION_REQUIRED");
  const recordIndex = normalizeRecordIndex(input.recordIndex, input.recordsByKey);
  const rawCaptures = normalizeRawCaptures(input.rawCaptures);
  const body = {
    schema: "starcraft_tmg_source_revision_manifest_v4",
    gameId: "starcraft-tmg",
    sourceId: "starcraft-tmg.official.command-center",
    captureId: String(input.captureId || ""),
    capturedAt: input.capturedAt,
    sourceSnapshotHash: input.sourceSnapshotHash,
    normalizedDatasetHash: input.normalizedDatasetHash,
    dataVersions: normalizeVersions(input.dataVersions),
    rawCaptures,
    rawCaptureSetHash: hashStarcraftTmgContract(rawCaptures),
    recordIndex,
    recordIndexHash: hashStarcraftTmgContract(recordIndex),
    upstreamVerificationHash: input.upstreamVerificationHash,
    verificationBoundary: "normalized_adapter_verified_before_manifest",
    sourceRefreshPolicy: "explicit_user_command_only",
    repositoryFallbackAllowed: false,
    silentReplacementAllowed: false,
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
  };
  if (!body.captureId) fail("SOURCE_REVISION_CAPTURE_ID_REQUIRED");
  return seal(body, "revisionHash");
}

export function createStarcraftTmgVerifiedSourceRevisionManifestV4(input = {}) {
  verifyOfficialCommandCenterDataset({ snapshot: input.snapshot, dataset: input.dataset });
  return createStarcraftTmgSourceRevisionManifestV4({
    captureId: input.captureId,
    capturedAt: input.snapshot.capturedAt,
    sourceSnapshotHash: input.snapshot.snapshotHash,
    normalizedDatasetHash: input.dataset.datasetHash,
    dataVersions: input.dataset.dataVersions,
    rawCaptures: input.rawCaptures,
    recordIndex: input.dataset.recordIndex,
    recordsByKey: input.dataset.recordsByKey,
    upstreamVerificationHash: input.upstreamVerificationHash,
  });
}

export function verifyStarcraftTmgSourceRevisionManifestV4(revision) {
  assertSealed(revision, "revisionHash", "SOURCE_REVISION_MANIFEST_INVALID");
  if (revision.schema !== "starcraft_tmg_source_revision_manifest_v4"
    || revision.gameId !== "starcraft-tmg"
    || revision.sourceId !== "starcraft-tmg.official.command-center"
    || revision.sourceRefreshPolicy !== "explicit_user_command_only"
    || revision.repositoryFallbackAllowed !== false
    || revision.silentReplacementAllowed !== false
    || revision.rulesEligible !== false
    || revision.productionRoomEligible !== false
    || revision.trainingTruth !== false) {
    fail("SOURCE_REVISION_POLICY_INVALID");
  }
  assertIso(revision.capturedAt, "SOURCE_REVISION_CAPTURED_AT_INVALID");
  assertHash(revision.sourceSnapshotHash, "SOURCE_REVISION_SNAPSHOT_HASH_INVALID");
  assertHash(revision.normalizedDatasetHash, "SOURCE_REVISION_DATASET_HASH_INVALID");
  assertHash(revision.upstreamVerificationHash, "SOURCE_REVISION_UPSTREAM_VERIFICATION_REQUIRED");
  const records = normalizeRecordIndex(revision.recordIndex);
  const captures = normalizeRawCaptures(revision.rawCaptures);
  if (hashStarcraftTmgContract(records) !== revision.recordIndexHash
    || hashStarcraftTmgContract(captures) !== revision.rawCaptureSetHash) {
    fail("SOURCE_REVISION_CONTENT_INDEX_MISMATCH");
  }
  normalizeVersions(revision.dataVersions);
  return revision;
}

export function createStarcraftTmgSourceImportCommandV4(input = {}) {
  if (!COMMAND_KINDS.has(input.kind)) fail("SOURCE_IMPORT_COMMAND_KIND_INVALID");
  if (input.explicitUserCommand !== true || input.trigger !== "human_cli") {
    fail("SOURCE_IMPORT_EXPLICIT_USER_COMMAND_REQUIRED");
  }
  assertIso(input.issuedAt, "SOURCE_IMPORT_COMMAND_TIME_INVALID");
  assertHash(input.expectedPointerHash, "SOURCE_IMPORT_EXPECTED_POINTER_REQUIRED");
  assertHash(input.targetRevisionHash, "SOURCE_IMPORT_TARGET_REVISION_REQUIRED");
  const body = {
    schema: "starcraft_tmg_source_import_command_v4",
    commandId: String(input.commandId || ""),
    kind: input.kind,
    principalId: String(input.principalId || ""),
    issuedAt: input.issuedAt,
    reason: String(input.reason || ""),
    expectedPointerHash: input.expectedPointerHash,
    targetRevisionHash: input.targetRevisionHash,
    explicitUserCommand: true,
    trigger: "human_cli",
    automaticRefreshAllowed: false,
    repositoryFallbackAllowed: false,
  };
  if (!body.commandId || !body.principalId || !body.reason) {
    fail("SOURCE_IMPORT_COMMAND_IDENTITY_REQUIRED");
  }
  return seal(body, "commandHash");
}

function verifyCommand(command, kind, expectedPointerHash, targetRevisionHash) {
  assertSealed(command, "commandHash", "SOURCE_IMPORT_COMMAND_INVALID");
  if (command.kind !== kind
    || command.explicitUserCommand !== true
    || command.trigger !== "human_cli"
    || command.automaticRefreshAllowed !== false
    || command.repositoryFallbackAllowed !== false
    || command.expectedPointerHash !== expectedPointerHash
    || command.targetRevisionHash !== targetRevisionHash) {
    fail("SOURCE_IMPORT_COMMAND_BINDING_MISMATCH");
  }
}

export function classifyStarcraftTmgSourceRevisionDiffV4(currentRevision, candidateRevision) {
  verifyStarcraftTmgSourceRevisionManifestV4(currentRevision);
  verifyStarcraftTmgSourceRevisionManifestV4(candidateRevision);
  const current = new Map(currentRevision.recordIndex.map((record) => [record.recordKey, record]));
  const candidate = new Map(candidateRevision.recordIndex.map((record) => [record.recordKey, record]));
  const keys = [...new Set([...current.keys(), ...candidate.keys()])].sort();
  const changes = [];
  for (const recordKey of keys) {
    const before = current.get(recordKey) || null;
    const after = candidate.get(recordKey) || null;
    if (before && after && hashStarcraftTmgContract(before) === hashStarcraftTmgContract(after)) continue;
    const flags = {
      added: !before && Boolean(after),
      removed: Boolean(before) && !after,
      payloadChanged: Boolean(before && after && before.payloadHash !== after.payloadHash),
      sourceRecordChanged: Boolean(before && after && before.sourceRecordHash !== after.sourceRecordHash),
      schemaChanged: Boolean(before && after && before.schemaHash !== after.schemaHash),
      authorityChanged: Boolean(before && after
        && before.authorityDisposition !== after.authorityDisposition),
    };
    const authority = after?.authorityDisposition || before?.authorityDisposition;
    changes.push({ recordKey, authorityDisposition: authority, ...flags });
  }
  const versionRelation = compareVersions(candidateRevision.dataVersions, currentRevision.dataVersions);
  const changedOfficialProduct = changes.filter((entry) => (
    entry.authorityDisposition === "official_current_product_candidate"
  ));
  const changedRuleProse = changes.filter((entry) => (
    entry.authorityDisposition === "official_rule_prose_review_required"
  ));
  const changedCommunity = changes.filter((entry) => (
    entry.authorityDisposition === "community_display_only"
  ));
  const schemaDrift = changes.filter((entry) => entry.schemaChanged);
  const authorityDrift = changes.filter((entry) => entry.authorityChanged);
  const recordDenominatorDrift = changes.filter((entry) => entry.added || entry.removed);
  let classification = "exact_replay_no_change";
  let disposition = "no_change";
  if (versionRelation === "rollback" || versionRelation === "conflict") {
    classification = "version_conflict_or_rollback";
    disposition = "quarantined";
  } else if (authorityDrift.length > 0) {
    classification = "authority_scope_drift";
    disposition = "quarantined";
  } else if (schemaDrift.length > 0) {
    classification = "schema_drift";
    disposition = "quarantined";
  } else if (changedOfficialProduct.length > 0) {
    classification = "official_product_value_drift";
    disposition = "independent_review_required";
  } else if (changedRuleProse.length > 0) {
    classification = "rule_prose_drift";
    disposition = "independent_review_required";
  } else if (changes.length > 0 && changedCommunity.length === changes.length) {
    classification = versionRelation === "same"
      ? "same_version_display_only_drift"
      : "versioned_display_only_drift";
    disposition = "display_review_required";
  } else if (changes.length > 0) {
    classification = "record_denominator_drift";
    disposition = "quarantined";
  }
  const body = {
    schema: "starcraft_tmg_source_revision_diff_v4",
    fromRevisionHash: currentRevision.revisionHash,
    toRevisionHash: candidateRevision.revisionHash,
    versionRelation,
    classification,
    disposition,
    changes,
    counts: {
      total: changes.length,
      officialProduct: changedOfficialProduct.length,
      ruleProse: changedRuleProse.length,
      communityDisplayOnly: changedCommunity.length,
      schemaDrift: schemaDrift.length,
      authorityDrift: authorityDrift.length,
      recordDenominatorDrift: recordDenominatorDrift.length,
    },
    silentReplacementAllowed: false,
    canAffectRules: false,
    trainingTruth: false,
  };
  return seal(body, "diffHash");
}

function createPointer(revisionHash, generation, previousPointerHash = null) {
  return seal({
    schema: "starcraft_tmg_source_revision_pointer_v4",
    revisionHash,
    generation,
    previousPointerHash,
  }, "pointerHash");
}

function verifyReviewEvidence(diff, evidence) {
  if (diff.disposition === "quarantined") fail("SOURCE_IMPORT_QUARANTINE_NOT_PROMOTABLE");
  if (diff.disposition === "independent_review_required") {
    assertHash(evidence?.scopeReviewHash, "SOURCE_IMPORT_SCOPE_REVIEW_REQUIRED");
    assertHash(evidence?.semanticReviewHash, "SOURCE_IMPORT_SEMANTIC_REVIEW_REQUIRED");
    if (evidence?.rightsReviewStatus !== "independently_reviewed") {
      fail("SOURCE_IMPORT_RIGHTS_REVIEW_REQUIRED");
    }
  }
}

export function createStarcraftTmgExplicitSourceImportWorkflowV4(input = {}) {
  const initialRevision = verifyStarcraftTmgSourceRevisionManifestV4(input.initialRevision);
  let pointer = createPointer(initialRevision.revisionHash, 0);
  const revisions = new Map([[initialRevision.revisionHash, initialRevision]]);
  const reviews = new Map();
  const reviewReceipts = new Map();
  const pointerEvents = [];
  const roomPins = new Map();
  const commandIds = new Set();

  function consumeCommand(command, kind, targetRevisionHash) {
    verifyCommand(command, kind, pointer.pointerHash, targetRevisionHash);
    if (commandIds.has(command.commandId)) fail("SOURCE_IMPORT_COMMAND_REPLAYED");
    commandIds.add(command.commandId);
  }

  return deepFreeze({
    stage({ command, candidateRevision }) {
      verifyStarcraftTmgSourceRevisionManifestV4(candidateRevision);
      consumeCommand(command, "stage_source_revision", candidateRevision.revisionHash);
      if (revisions.has(candidateRevision.revisionHash)) fail("SOURCE_IMPORT_REVISION_ALREADY_KNOWN");
      const current = revisions.get(pointer.revisionHash);
      const diff = classifyStarcraftTmgSourceRevisionDiffV4(current, candidateRevision);
      revisions.set(candidateRevision.revisionHash, candidateRevision);
      const body = {
        schema: "starcraft_tmg_source_import_review_item_v4",
        commandHash: command.commandHash,
        candidateRevisionHash: candidateRevision.revisionHash,
        basedOnPointerHash: pointer.pointerHash,
        diff,
        status: "pending",
        createdAt: command.issuedAt,
        silentReplacementAllowed: false,
      };
      const item = seal(body, "reviewItemHash");
      reviews.set(item.reviewItemHash, item);
      return item;
    },

    review({ reviewItemHash, decision, reviewerPrincipalId, reviewedAt, evidence = {} }) {
      const item = reviews.get(reviewItemHash);
      if (!item || item.status !== "pending") fail("SOURCE_IMPORT_REVIEW_ITEM_NOT_PENDING");
      if (!['approve', 'reject'].includes(decision)) fail("SOURCE_IMPORT_REVIEW_DECISION_INVALID");
      if (!String(reviewerPrincipalId || "")) fail("SOURCE_IMPORT_REVIEWER_REQUIRED");
      assertIso(reviewedAt, "SOURCE_IMPORT_REVIEW_TIME_INVALID");
      if (decision === "approve") verifyReviewEvidence(item.diff, evidence);
      const receipt = seal({
        schema: "starcraft_tmg_source_import_review_receipt_v4",
        reviewItemHash,
        candidateRevisionHash: item.candidateRevisionHash,
        diffHash: item.diff.diffHash,
        decision,
        reviewerPrincipalId,
        reviewedAt,
        evidence: clone(evidence),
        canAffectRules: false,
        trainingTruth: false,
      }, "reviewReceiptHash");
      reviews.set(reviewItemHash, deepFreeze({ ...item, status: decision === "approve" ? "approved" : "rejected" }));
      reviewReceipts.set(receipt.reviewReceiptHash, receipt);
      return receipt;
    },

    promote({ command, reviewReceiptHash }) {
      const receipt = reviewReceipts.get(reviewReceiptHash);
      if (!receipt || receipt.decision !== "approve") fail("SOURCE_IMPORT_APPROVAL_REQUIRED");
      consumeCommand(command, "promote_source_revision", receipt.candidateRevisionHash);
      const item = reviews.get(receipt.reviewItemHash);
      if (item?.basedOnPointerHash !== pointer.pointerHash) fail("SOURCE_IMPORT_REVIEW_POINTER_STALE");
      const previous = pointer;
      pointer = createPointer(receipt.candidateRevisionHash, previous.generation + 1, previous.pointerHash);
      const event = seal({
        schema: "starcraft_tmg_source_pointer_event_v4",
        kind: "promotion",
        commandHash: command.commandHash,
        reviewReceiptHash,
        fromPointerHash: previous.pointerHash,
        toPointer: pointer,
      }, "pointerEventHash");
      pointerEvents.push(event);
      return event;
    },

    rollback({ command }) {
      if (!revisions.has(command?.targetRevisionHash)) fail("SOURCE_IMPORT_ROLLBACK_TARGET_UNKNOWN");
      consumeCommand(command, "rollback_source_revision", command.targetRevisionHash);
      if (command.targetRevisionHash === pointer.revisionHash) fail("SOURCE_IMPORT_ROLLBACK_NOOP");
      const previous = pointer;
      pointer = createPointer(command.targetRevisionHash, previous.generation + 1, previous.pointerHash);
      const event = seal({
        schema: "starcraft_tmg_source_pointer_event_v4",
        kind: "rollback",
        commandHash: command.commandHash,
        reviewReceiptHash: null,
        fromPointerHash: previous.pointerHash,
        toPointer: pointer,
      }, "pointerEventHash");
      pointerEvents.push(event);
      return event;
    },

    pinRoom({ roomId, pinnedAt }) {
      const id = String(roomId || "");
      if (!id || roomPins.has(id)) fail("SOURCE_IMPORT_ROOM_ALREADY_PINNED", id);
      assertIso(pinnedAt, "SOURCE_IMPORT_ROOM_PIN_TIME_INVALID");
      const pin = seal({
        schema: "starcraft_tmg_room_source_pin_v4",
        roomId: id,
        pinnedAt,
        pointerHashAtCreation: pointer.pointerHash,
        revisionHash: pointer.revisionHash,
        sourceSnapshotHash: revisions.get(pointer.revisionHash).sourceSnapshotHash,
        normalizedDatasetHash: revisions.get(pointer.revisionHash).normalizedDatasetHash,
        immutable: true,
      }, "roomPinHash");
      roomPins.set(id, pin);
      return pin;
    },

    resolveRoom(roomId) {
      const pin = roomPins.get(String(roomId || ""));
      if (!pin) fail("SOURCE_IMPORT_ROOM_PIN_NOT_FOUND");
      return deepFreeze({ pin, revision: revisions.get(pin.revisionHash) });
    },

    inspect() {
      return deepFreeze({
        workflow: STARCRAFT_TMG_SOURCE_IMPORT_WORKFLOW_V4,
        currentPointer: pointer,
        revisionCount: revisions.size,
        pendingReviewCount: [...reviews.values()].filter((item) => item.status === "pending").length,
        reviewCount: reviews.size,
        pointerEventCount: pointerEvents.length,
        roomPinCount: roomPins.size,
        sourceRefreshPolicy: "explicit_user_command_only",
        silentReplacementAllowed: false,
        rulesEligible: false,
        trainingTruth: false,
      });
    },

    exportLedger() {
      const body = {
        schema: "starcraft_tmg_source_import_ledger_v4",
        workflow: STARCRAFT_TMG_SOURCE_IMPORT_WORKFLOW_V4,
        initialRevisionHash: initialRevision.revisionHash,
        revisions: [...revisions.values()],
        reviews: [...reviews.values()],
        reviewReceipts: [...reviewReceipts.values()],
        pointerEvents: clone(pointerEvents),
        roomPins: [...roomPins.values()],
        currentPointer: pointer,
        sourceRefreshPolicy: "explicit_user_command_only",
        silentReplacementAllowed: false,
      };
      return seal(body, "ledgerHash");
    },
  });
}

export function replayStarcraftTmgSourceImportLedgerV4(ledger) {
  assertSealed(ledger, "ledgerHash", "SOURCE_IMPORT_LEDGER_INVALID");
  if (ledger.schema !== "starcraft_tmg_source_import_ledger_v4"
    || ledger.workflow !== STARCRAFT_TMG_SOURCE_IMPORT_WORKFLOW_V4
    || ledger.sourceRefreshPolicy !== "explicit_user_command_only"
    || ledger.silentReplacementAllowed !== false) {
    fail("SOURCE_IMPORT_LEDGER_POLICY_INVALID");
  }
  const revisions = new Map();
  for (const revision of ledger.revisions || []) {
    verifyStarcraftTmgSourceRevisionManifestV4(revision);
    if (revisions.has(revision.revisionHash)) fail("SOURCE_IMPORT_LEDGER_DUPLICATE_REVISION");
    revisions.set(revision.revisionHash, revision);
  }
  if (!revisions.has(ledger.initialRevisionHash)) fail("SOURCE_IMPORT_LEDGER_INITIAL_REVISION_MISSING");
  let pointer = createPointer(ledger.initialRevisionHash, 0);
  for (const event of ledger.pointerEvents || []) {
    assertSealed(event, "pointerEventHash", "SOURCE_IMPORT_LEDGER_POINTER_EVENT_INVALID");
    if (event.fromPointerHash !== pointer.pointerHash
      || event.toPointer.previousPointerHash !== pointer.pointerHash
      || event.toPointer.generation !== pointer.generation + 1
      || !revisions.has(event.toPointer.revisionHash)) {
      fail("SOURCE_IMPORT_LEDGER_POINTER_CHAIN_INVALID");
    }
    assertSealed(event.toPointer, "pointerHash", "SOURCE_IMPORT_LEDGER_POINTER_INVALID");
    pointer = event.toPointer;
  }
  if (pointer.pointerHash !== ledger.currentPointer?.pointerHash) {
    fail("SOURCE_IMPORT_LEDGER_CURRENT_POINTER_MISMATCH");
  }
  for (const pin of ledger.roomPins || []) {
    assertSealed(pin, "roomPinHash", "SOURCE_IMPORT_LEDGER_ROOM_PIN_INVALID");
    const revision = revisions.get(pin.revisionHash);
    if (!revision
      || pin.sourceSnapshotHash !== revision.sourceSnapshotHash
      || pin.normalizedDatasetHash !== revision.normalizedDatasetHash) {
      fail("SOURCE_IMPORT_LEDGER_ROOM_PIN_BINDING_INVALID");
    }
  }
  return deepFreeze({
    ok: true,
    ledgerHash: ledger.ledgerHash,
    currentPointerHash: pointer.pointerHash,
    currentRevisionHash: pointer.revisionHash,
    revisionCount: revisions.size,
    pointerEventCount: (ledger.pointerEvents || []).length,
    roomPinCount: (ledger.roomPins || []).length,
    offlineReplay: true,
    rulesEligible: false,
    trainingTruth: false,
  });
}
