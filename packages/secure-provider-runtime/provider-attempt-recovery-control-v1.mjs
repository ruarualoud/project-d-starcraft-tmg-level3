import {
  STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION,
  StarcraftTmgProviderAttemptStoreError,
  assertStarcraftTmgProviderAttemptStoreV1,
  cloneProviderAttemptValue,
  deepFreezeProviderAttemptValue,
  hashStarcraftTmgProviderAttemptValueV1,
} from "./provider-attempt-store-contract-v1.mjs";

export const STARCRAFT_TMG_PROVIDER_ATTEMPT_RECOVERY_CONTROL_VERSION =
  "starcraft_tmg_provider_attempt_recovery_control_v1";

const HASH = /^[a-f0-9]{64}$/u;
const RETRY_FIELDS = new Set([
  "budgetId",
  "ambiguousAttemptId",
  "expectedBudgetRevision",
  "idempotencyKeyHash",
  "approvalReceipt",
  "attachmentRequest",
  "egressPolicyHash",
  "promptAssemblyHash",
  "responseContractHash",
  "requestHash",
  "intent",
  "inputUnits",
  "maxOutputUnits",
  "reservedAt",
]);
const ATTACHMENT_REQUEST_FIELDS = new Set([
  "roomId",
  "sessionId",
  "expectedConnectionEpoch",
  "attachmentId",
]);

function fail(code, detail = "") {
  throw new StarcraftTmgProviderAttemptStoreError(code, detail);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function exactFields(value, allowed, code) {
  if (!object(value)) fail(code);
  const extras = Object.keys(value).filter((field) => !allowed.has(field)).sort();
  if (extras.length) fail(code, extras.join(","));
}

function hash(value, field) {
  const result = String(value || "").trim().toLowerCase();
  if (!HASH.test(result)) fail("PROVIDER_ATTEMPT_HASH_INVALID", field);
  return result;
}

function isoInstant(value, field) {
  let result;
  try { result = new Date(value).toISOString(); } catch {
    fail("PROVIDER_ATTEMPT_TIME_INVALID", field);
  }
  if (result !== value) fail("PROVIDER_ATTEMPT_TIME_INVALID", field);
  return result;
}

function freeze(value) {
  return deepFreezeProviderAttemptValue(cloneProviderAttemptValue(value));
}

function seal(body, hashField) {
  const cloned = cloneProviderAttemptValue(body);
  return freeze({
    ...cloned,
    [hashField]: hashStarcraftTmgProviderAttemptValueV1(cloned),
  });
}

function assertDependencies(options) {
  const store = assertStarcraftTmgProviderAttemptStoreV1(options.attemptStore);
  if (typeof options.approvalAuthority?.verifyApproval !== "function") {
    throw new TypeError("Provider recovery control requires approvalAuthority.verifyApproval()");
  }
  if (typeof options.attachmentControl?.readAttachment !== "function") {
    throw new TypeError("Provider recovery control requires attachmentControl.readAttachment()");
  }
  return { store, approvalAuthority: options.approvalAuthority,
    attachmentControl: options.attachmentControl };
}

export function createStarcraftTmgProviderAttemptRecoveryControlV1(options = {}) {
  const { store, approvalAuthority, attachmentControl } = assertDependencies(options);

  async function reserveApprovedRetry(input = {}, context = {}) {
    exactFields(input, RETRY_FIELDS, "PROVIDER_ATTEMPT_APPROVED_RETRY_FIELDS_INVALID");
    exactFields(input.attachmentRequest, ATTACHMENT_REQUEST_FIELDS,
      "PROVIDER_ATTEMPT_REATTACHMENT_REQUEST_FIELDS_INVALID");

    const budget = await store.getBudget(input.budgetId);
    if (!budget) fail("PROVIDER_BUDGET_NOT_FOUND");
    const prior = await store.getAttempt(input.ambiguousAttemptId);
    if (!prior || prior.budgetId !== budget.budgetId || prior.status !== "ambiguous") {
      fail("PROVIDER_ATTEMPT_RETRY_SOURCE_INVALID");
    }
    if (!prior.retryAuthorizationRequired || !prior.credentialReattachRequired) {
      fail("PROVIDER_ATTEMPT_RETRY_RECOVERY_FLAGS_INVALID");
    }
    const idempotencyKeyHash = hash(input.idempotencyKeyHash, "idempotencyKeyHash");
    const reservedAt = isoInstant(input.reservedAt, "reservedAt");
    const approval = approvalAuthority.verifyApproval(input.approvalReceipt, {
      budgetId: budget.budgetId,
      attemptId: prior.attemptId,
      principalScopeHash: budget.principalScopeHash,
      sessionBindingHash: budget.sessionBindingHash,
      reservationIdempotencyKeyHash: idempotencyKeyHash,
    });
    if (input.approvalReceipt.content.issuedAt < prior.settledAt) {
      fail("PROVIDER_RETRY_APPROVAL_PREDATES_AMBIGUITY");
    }
    if (reservedAt < input.approvalReceipt.content.issuedAt
      || reservedAt >= input.approvalReceipt.content.expiresAt
      || reservedAt > approval.observedAt) {
      fail("PROVIDER_RETRY_APPROVAL_NOT_VALID_AT_RESERVATION");
    }
    const exactRetryFields = {
      egressPolicyHash: "egressPolicyHash",
      promptAssemblyHash: "promptAssemblyHash",
      responseContractHash: "responseContractHash",
      requestHash: "requestHash",
      intent: "intent",
      inputUnits: "inputUnits",
      maxOutputUnits: "maxOutputUnits",
    };
    for (const [inputField, attemptField] of Object.entries(exactRetryFields)) {
      if (input[inputField] !== prior[attemptField]) {
        fail("PROVIDER_ATTEMPT_RETRY_REQUEST_DRIFT", inputField);
      }
    }

    const attached = await attachmentControl.readAttachment(
      cloneProviderAttemptValue(input.attachmentRequest), context,
    );
    if (!attached?.ok || !object(attached.attachment)) {
      fail("PROVIDER_ATTEMPT_REATTACHMENT_NOT_AVAILABLE",
        String(attached?.reason || "read_failed"));
    }
    const attachment = attached.attachment;
    if (attachment.state !== "attached") {
      fail("PROVIDER_ATTEMPT_REATTACHMENT_NOT_ATTACHED");
    }
    if (attachment.sessionBindingHash !== budget.sessionBindingHash) {
      fail("PROVIDER_ATTEMPT_REATTACHMENT_SESSION_MISMATCH");
    }
    if (attachment.provider?.profileRef?.hash !== prior.providerProfileHash) {
      fail("PROVIDER_ATTEMPT_REATTACHMENT_PROFILE_MISMATCH");
    }
    if (!attachment.attachedAt || attachment.attachedAt < prior.settledAt
      || reservedAt < attachment.attachedAt
      || attachment.consentReceiptHash === prior.consentReceiptHash) {
      fail("PROVIDER_ATTEMPT_REATTACHMENT_NOT_FRESH");
    }
    const consentReceiptHash = hash(attachment.consentReceiptHash,
      "attachment.consentReceiptHash");
    const reattachmentReceiptHash = hash(attachment.projectionHash,
      "attachment.projectionHash");

    const reservation = await store.reserveAttempt({
      budgetId: budget.budgetId,
      principalScopeHash: budget.principalScopeHash,
      expectedBudgetRevision: input.expectedBudgetRevision,
      idempotencyKeyHash,
      consentReceiptHash,
      providerProfileHash: prior.providerProfileHash,
      egressPolicyHash: input.egressPolicyHash,
      promptAssemblyHash: input.promptAssemblyHash,
      responseContractHash: input.responseContractHash,
      requestHash: input.requestHash,
      intent: input.intent,
      inputUnits: input.inputUnits,
      maxOutputUnits: input.maxOutputUnits,
      reservedAt,
      retryOfAttemptId: prior.attemptId,
      retryApprovalReceiptHash: approval.receiptHash,
      reattachmentReceiptHash,
    });
    if (reservation.egressAuthorized !== false) {
      fail("PROVIDER_ATTEMPT_RETRY_EGRESS_BEFORE_DISPATCH");
    }
    return seal({
      schemaVersion:
        `${STARCRAFT_TMG_PROVIDER_ATTEMPT_RECOVERY_CONTROL_VERSION}.approved-retry`,
      operation: "reserve-approved-retry",
      budgetId: budget.budgetId,
      ambiguousAttemptId: prior.attemptId,
      retryAttemptId: reservation.attempt.attemptId,
      retryApprovalReceiptHash: approval.receiptHash,
      reattachmentReceiptHash,
      reservation,
      egressAuthorized: false,
      automaticallyRetried: false,
      rawProviderMaterialRetained: false,
      trainingTruth: false,
    }, "resultHash");
  }

  function metadata() {
    return freeze({
      schemaVersion: `${STARCRAFT_TMG_PROVIDER_ATTEMPT_RECOVERY_CONTROL_VERSION}.metadata`,
      storeContractVersion: STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION,
      schedulingLineage:
        "mtl_persist_intent_then_approval_reattach_reserve_dispatch_receipt_replay",
      ambiguousRetryApproval: "same_authenticated_user_signed_and_short_sealed",
      reattachmentEvidence: "current_authenticated_attached_projection_hash",
      dispatchOwned: false,
      automaticRetryAllowed: false,
      rawProviderMaterialRetained: false,
      trainingTruth: false,
    });
  }

  return Object.freeze({ metadata, reserveApprovedRetry });
}
