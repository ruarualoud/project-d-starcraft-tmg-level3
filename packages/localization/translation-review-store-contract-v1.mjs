import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { reviewStarcraftTmgTranslationCandidate } from
  "./translation-sidecar-v1.mjs";

export const STARCRAFT_TMG_TRANSLATION_REVIEW_STORE_VERSION =
  "starcraft_tmg_translation_review_store_v1";

export const STARCRAFT_TMG_TRANSLATION_REVIEW_STORE_METHODS = Object.freeze([
  "initialize",
  "putCandidate",
  "getCandidate",
  "listQueue",
  "reviewCandidate",
  "readAudit",
  "health",
]);

const HASH = /^[a-f0-9]{64}$/u;

function fail(code, detail = "") {
  const error = new Error(detail ? `${code}:${detail}` : code);
  error.code = code;
  throw error;
}

export function cloneTranslationReviewValue(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value || {}).filter(([key]) => !keys.includes(key)));
}

function assertIso(value, code) {
  if (!value || new Date(value).toISOString() !== value) fail(code);
}

function assertNoCredentialMaterial(value) {
  const serialized = JSON.stringify(value || {}).toLowerCase();
  if (/api[_-]?key|authorization|bearer|secretref|secretvalue|access[_-]?token|cookie/u.test(serialized)) {
    fail("TRANSLATION_REVIEW_CANDIDATE_CREDENTIAL_MATERIAL_FORBIDDEN");
  }
}

export function assertStarcraftTmgPersistentTranslationCandidate(candidate) {
  if (!candidate || candidate.status !== "machine_draft"
    || candidate.displayOnly !== true
    || candidate.mayAffectRules !== false
    || candidate.eligibleForTraining !== false
    || candidate.trainingTruth !== false
    || !HASH.test(String(candidate.candidateHash || ""))
    || hashStarcraftTmgContract(without(candidate, ["candidateHash"])) !== candidate.candidateHash) {
    fail("TRANSLATION_REVIEW_CANDIDATE_INVALID");
  }
  const receipt = candidate.providerReceipt;
  if (!receipt || !HASH.test(String(receipt.receiptHash || ""))
    || hashStarcraftTmgContract(without(receipt, ["receiptHash"])) !== receipt.receiptHash
    || receipt.displayOnly !== true
    || receipt.mayAffectRules !== false
    || receipt.trainingTruth !== false
    || receipt.intentHash !== candidate.intentHash
    || receipt.datasetHash !== candidate.datasetRef?.datasetHash
    || receipt.glossaryHash !== candidate.glossaryRef?.hash) {
    fail("TRANSLATION_REVIEW_PROVIDER_RECEIPT_INVALID");
  }
  assertNoCredentialMaterial(candidate);
  return candidate;
}

export function prepareStarcraftTmgCandidateStoreWrite(input = {}) {
  const candidate = assertStarcraftTmgPersistentTranslationCandidate(input.candidate);
  const idempotencyKey = String(input.idempotencyKey || "").trim();
  const actorId = String(input.actorId || "").trim();
  assertIso(input.createdAt, "TRANSLATION_REVIEW_CREATED_AT_INVALID");
  if (!idempotencyKey || !actorId) fail("TRANSLATION_REVIEW_WRITE_IDENTITY_REQUIRED");
  return {
    candidate: cloneTranslationReviewValue(candidate),
    candidateHash: candidate.candidateHash,
    idempotencyKeyHash: hashStarcraftTmgContract({ idempotencyKey }),
    datasetHash: candidate.datasetRef.datasetHash,
    targetLocale: candidate.targetLocale,
    createdAt: input.createdAt,
    actorId,
  };
}

export function prepareStarcraftTmgCandidateReview(input = {}) {
  const candidate = assertStarcraftTmgPersistentTranslationCandidate(input.candidate);
  const expectedRevision = Number(input.expectedRevision);
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    fail("TRANSLATION_REVIEW_EXPECTED_REVISION_INVALID");
  }
  assertIso(input.reviewedAt, "TRANSLATION_REVIEW_REVIEWED_AT_INVALID");
  const entry = reviewStarcraftTmgTranslationCandidate({
    candidate,
    decision: input.decision,
    correctedText: input.correctedText,
    reviewerId: input.reviewerId,
    reviewedAt: input.reviewedAt,
    notes: input.notes,
  });
  const status = entry.status === "rejected"
    ? "rejected"
    : entry.review.decision === "approve_with_correction" ? "corrected" : "approved";
  return {
    candidate,
    expectedRevision,
    entry: cloneTranslationReviewValue(entry),
    status,
    reviewerId: entry.review.reviewerId,
    reviewedAt: entry.review.reviewedAt,
  };
}

export function createStarcraftTmgTranslationReviewAuditEvent(input = {}) {
  const sequence = Number(input.sequence);
  if (!Number.isSafeInteger(sequence) || sequence < 1) fail("TRANSLATION_REVIEW_AUDIT_SEQUENCE_INVALID");
  if (sequence > 1 && !HASH.test(String(input.previousEventHash || ""))) {
    fail("TRANSLATION_REVIEW_AUDIT_PREVIOUS_HASH_INVALID");
  }
  assertIso(input.occurredAt, "TRANSLATION_REVIEW_AUDIT_TIME_INVALID");
  const body = {
    schema: "starcraft_tmg_translation_review_audit_event_v1",
    sequence,
    previousEventHash: input.previousEventHash || null,
    eventType: String(input.eventType || ""),
    candidateHash: String(input.candidateHash || ""),
    actorId: String(input.actorId || ""),
    occurredAt: input.occurredAt,
    payloadHash: String(input.payloadHash || ""),
    displayOnly: true,
    mayAffectRules: false,
    trainingTruth: false,
  };
  if (!body.eventType || !body.actorId || !HASH.test(body.candidateHash)
    || !HASH.test(body.payloadHash)) {
    fail("TRANSLATION_REVIEW_AUDIT_EVENT_INVALID");
  }
  return Object.freeze({ ...body, eventHash: hashStarcraftTmgContract(body) });
}

export function verifyStarcraftTmgTranslationReviewAuditChain(events = []) {
  let previous = null;
  for (const [index, event] of events.entries()) {
    if (event.sequence !== index + 1
      || event.previousEventHash !== previous
      || event.eventHash !== hashStarcraftTmgContract(without(event, ["eventHash"]))) {
      fail("TRANSLATION_REVIEW_AUDIT_CHAIN_INVALID", String(index + 1));
    }
    previous = event.eventHash;
  }
  return Object.freeze({
    ok: true,
    eventCount: events.length,
    lastEventHash: previous,
    replayHash: hashStarcraftTmgContract(events),
    trainingTruth: false,
  });
}

export function assertStarcraftTmgTranslationReviewStore(store) {
  for (const method of STARCRAFT_TMG_TRANSLATION_REVIEW_STORE_METHODS) {
    if (typeof store?.[method] !== "function") fail("TRANSLATION_REVIEW_STORE_METHOD_MISSING", method);
  }
  return store;
}
