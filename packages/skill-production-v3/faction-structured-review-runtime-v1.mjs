import { hash, seal, verifySeal, fail } from "../skill-production/common.mjs";
import { FACTION_PARSED_REVIEW_VALUE_BINDING_V1, FACTION_PARSED_REVIEW_VALUE_BINDING_V2,
  materializeFactionParsedReviewValueV1, materializeFactionParsedReviewValueV2,
  verifyFactionParsedReviewValueRecordV1, verifyFactionParsedReviewValueRecordV2 }
  from './faction-parsed-review-value-v1.mjs';
import { FACTION_CHECKPOINT_INVENTORY_BINDING_V1 } from './faction-checkpoint-inventory-v1.mjs';
import { FACTION_FIELD_VALUE_BINDING_V1, classifyFactionFieldValueRepairScopeV1 }
  from './faction-field-value-runtime-v1.mjs';
import { FACTION_FIELD_VALUE_SOURCE_HANDOFF_BINDING_V1,
  verifyFactionFieldValueSourceHandoffV1 } from './faction-field-value-source-handoff-v1.mjs';
import { createFactionReviewContextCapsuleV1,
  createFactionReviewOutputCapRecoveryContextCapsuleV1,
  createFactionReviewSchemaRepairContextCapsuleV1,
  createFactionReviewHostContractRepairContextCapsuleV1 } from
  "./faction-review-context-capsule-v1.mjs";
import { createFactionReviewTargetsV1,
  validateTargetedFactionReviewV1 } from "./faction-review-targets-v1.mjs";
import { validateFactionReviewV1 } from "./faction-strategy-workflow-v1.mjs";
import { createStarcraftTmgContextCapsuleRegistryV1,
  contextManifestRefStarcraftTmgV1 } from
  "../structured-generation/context-capsule-v1.mjs";
import { createStarcraftTmgStructuredDshModelBridgeV1 } from
  "../structured-generation/dsh-command-mapper-v1.mjs";
import { classifyStarcraftTmgStructuredFailureV1 } from
  "../structured-generation/failure-classifier-v1.mjs";
import { assertStarcraftTmgProviderCapabilityReceiptV1 } from
  "../structured-generation/provider-capability-receipt-v1.mjs";
import { createStarcraftTmgOutputContractRegistryV1,
  outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 } from
  "../structured-generation/output-contract-registry-v1.mjs";
import { createStructuredRuntimeWithWireRecoveryV2 } from
  "../structured-generation/structured-runtime-selection-v2.mjs";
import { verifyFactionReviewRecoveryBudgetV2 } from './faction-review-recovery-budget-v2.mjs';
import { recoverReviewFocusCapacityV1 } from './faction-review-focus-capacity-recovery-v1.mjs';
import { resolveFactionReviewCoverageAddressesV1 } from './faction-review-coverage-address-v1.mjs';
import { resolveFactionReviewCoverageAddressesV2, FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V2 } from './faction-review-coverage-address-v2.mjs';
import { resolveFactionReviewCoverageAddressesV3, FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V3 } from './faction-review-coverage-address-v3.mjs';
import { resolveFactionReviewCoverageAddressesV4, FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V4 } from './faction-review-coverage-address-v4.mjs';
import { resolveFactionReviewCoverageAddressesV5, FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V5 } from './faction-review-coverage-address-v5.mjs';
import { runFactionReviewCompleteOutputImportV1 } from './faction-review-complete-output-import-v1.mjs';
import { FACTION_REVIEW_DECOMPOSITION_BINDING_V1, prepareFactionReviewDecompositionV1 } from './faction-review-decomposition-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V6,
  FACTION_REVIEW_SLOT_NAMESPACE_BINDING_V1 } from '../../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';
import { createFactionReviewSourceExpansionV1, FACTION_REVIEW_SOURCE_EXPANSION_BINDING_V1 }
  from './faction-review-source-expansion-v1.mjs';
import { FACTION_STRUCTURAL_JSON_SCHEMA_BRIDGE_BINDING_V2,
  prepareFactionStructuralJsonSchemaRepairV2, verifyFactionStructuralJsonSchemaCorrectionV2,
  verifyFactionParsedWireCorrectionRecordV2, factionParsedWirePhaseCapsuleV2 }
  from './faction-structural-json-schema-bridge-v2.mjs';
import { FACTION_AMBIGUOUS_REPLACEMENT_BINDING_V1 }
  from './faction-ambiguous-replacement-v1.mjs';
import { prepareFactionNativeReviewAmbiguousReplacementV1,
  verifyFactionNativeReviewAmbiguousReplacementV1 }
  from './faction-native-review-ambiguous-replacement-v1.mjs';
import { FACTION_REVIEW_SOFT_LIMIT_BINDING_V1,
  materializeFactionReviewSoftLimitV1 }
  from './faction-review-soft-limit-v1.mjs';

export const STARCRAFT_TMG_FACTION_STRUCTURED_REVIEW_RUNTIME_VERSION =
  "starcraft_tmg_faction_structured_review_runtime_v1";

const SOURCE_EPOCH = /\.source-evidence-v1\.[a-f0-9]{20}$/u;
const REVIEW_ROLE = /\.review-target-batch-v1\.(supportive|adversarial)\.([0-3])(?:\.phase-seed-v1\.[a-f0-9]{20})?\.([0-9]+)(?:\.source-evidence-v1\.[a-f0-9]{20})?$/u;
const OUTPUT_CAP_RECOVERY_REASON_TARGET = 600;
const OUTPUT_CAP_RECOVERY_REASON_HARD_MAXIMUM = 800;
const OUTPUT_CAP_RECOVERY_OUTPUT_UNITS_HARD_MAXIMUM = 3_072;

function canonicalRoleId(value) {
  return String(value || "").replace(SOURCE_EPOCH, "");
}

export function deriveFactionLegacyStructuredReviewRoleIdsV1(steps = [], inventoryBinding = null) {
  if (!Array.isArray(steps)) throw new TypeError("Continuation steps are invalid");
  const roles = steps.filter((row) => row?.artifact?.structuredDecodePassed !== true)
    .map((row) => canonicalRoleId(row.id))
    .filter((id) => REVIEW_ROLE.test(id));
  if (new Set(roles).size !== roles.length) {
    if (inventoryBinding && verifySeal(inventoryBinding).hash === FACTION_CHECKPOINT_INVENTORY_BINDING_V1.hash)
      return [...new Set(roles)]; // Routing names only; exact epoch/input/paid artifact remain separate checkpoints.
    fail("FACTION_STRUCTURED_REVIEW_LEGACY_ROLE_DUPLICATE");
  }
  return roles;
}

function exactSlotSet(rows, field, length, code) {
  if (!Array.isArray(rows) || rows.length !== length
    || new Set(rows.map((row) => row?.[field])).size !== length
    || rows.some((row) => !Number.isInteger(row[field])
      || row[field] < 0 || row[field] >= length)) fail(code);
}

function pathTokens(path) {
  if (typeof path !== "string" || !path.startsWith("$.")) {
    fail("FACTION_STRUCTURED_REVIEW_SCHEMA_REPAIR_PATH_INVALID");
  }
  const tokens = [];
  const suffix = path.slice(2);
  const matcher = /(?:^|\.)([A-Za-z][A-Za-z0-9_]*)|\[([0-9]+)\]/gu;
  let consumed = 0;
  for (const match of suffix.matchAll(matcher)) {
    if (match.index !== consumed) {
      fail("FACTION_STRUCTURED_REVIEW_SCHEMA_REPAIR_PATH_INVALID");
    }
    tokens.push(match[1] ?? Number(match[2]));
    consumed = match.index + match[0].length;
  }
  if (!tokens.length || consumed !== suffix.length) {
    fail("FACTION_STRUCTURED_REVIEW_SCHEMA_REPAIR_PATH_INVALID");
  }
  return tokens;
}

function maskRepairIssues(value, issues, side) {
  const result = structuredClone(value);
  for (const issue of issues) {
    const path = issue.path;
    const tokens = pathTokens(path);
    let cursor = result;
    for (const token of tokens.slice(0, -1)) {
      if (!cursor || typeof cursor !== "object"
        || !Object.hasOwn(cursor, token)) {
        fail("FACTION_STRUCTURED_REVIEW_SCHEMA_REPAIR_PATH_INVALID");
      }
      cursor = cursor[token];
    }
    const last = tokens.at(-1);
    if (!cursor || typeof cursor !== "object") {
      fail("FACTION_STRUCTURED_REVIEW_SCHEMA_REPAIR_PATH_INVALID");
    }
    const exists = Object.hasOwn(cursor, last);
    const permittedMissing = side === "before"
      && issue.code === "required_field_missing"
      || side === "after"
        && issue.code === "additional_property_forbidden";
    if (!exists && !permittedMissing) {
      fail("FACTION_STRUCTURED_REVIEW_SCHEMA_REPAIR_PATH_INVALID");
    }
    cursor[last] = { hostMaskedSchemaRepairPath: path };
  }
  return result;
}

function pathValue(value, path) {
  const tokens = pathTokens(path);
  let cursor = value;
  for (const token of tokens) {
    if (!cursor || typeof cursor !== "object"
      || !Object.hasOwn(cursor, token)) return { exists: false };
    cursor = cursor[token];
  }
  return { exists: true, value: cursor };
}

function issueSignature(issues) {
  return issues.map((row) => `${row.path}\u0000${row.code}`).sort();
}

export function verifyOutputCapRecoveryCompactness(value, outputUnits, options = {}) {
  if (options.binding) return verifyFactionReviewRecoveryBudgetV2({ value, outputUnits, ...options });
  if (!Array.isArray(value?.verdicts) || !Array.isArray(value?.coverage)
    || !Number.isSafeInteger(outputUnits) || outputUnits < 1
    || outputUnits > OUTPUT_CAP_RECOVERY_OUTPUT_UNITS_HARD_MAXIMUM
    || value.verdicts.some((row) => !Array.isArray(row?.focus)
      || row.focus.length > 4 || !Array.isArray(row?.sourceSlots)
      || row.sourceSlots.length > 4
      || typeof row?.reason !== "string"
      || row.reason.length > OUTPUT_CAP_RECOVERY_REASON_HARD_MAXIMUM)
    || value.coverage.some((row) => typeof row?.reason !== "string"
      || row.reason.length > OUTPUT_CAP_RECOVERY_REASON_HARD_MAXIMUM)) {
    fail("FACTION_STRUCTURED_REVIEW_OUTPUT_CAP_RECOVERY_NOT_COMPACT");
  }
}

function recoveryRoleIdFromFullRoleId(fullRoleId) {
  return `${canonicalRoleId(String(fullRoleId || "")
    .replace(/^faction\.[a-z0-9_]+\./u, ""))}.output-cap-recovery.1`;
}

export function createFactionStructuredReviewOutputCapSuccessImportV1(
  input = {}) {
  const { parentRunId, fullRoleId, originIssueHash, originAttemptId,
    originRequestHash, candidate, runtimeReceipt, providerResponse,
    usage, usageHash } = input;
  [candidate, runtimeReceipt].forEach(verifySeal);
  const recoveryRoleId = recoveryRoleIdFromFullRoleId(fullRoleId);
  if (!/^faction-v1-[a-f0-9]{20}$/u.test(parentRunId || "")
    || !/^faction\.[a-z0-9_]+\.faction\.[a-z0-9_]+\..+review-target-batch-v1\./u
      .test(fullRoleId || "")
    || !/^[a-f0-9]{64}$/u.test(originIssueHash || "")
    || !/^structured-[a-f0-9]{48}$/u.test(originAttemptId || "")
    || !/^[a-f0-9]{64}$/u.test(originRequestHash || "")
    || candidate.version
      !== "starcraft_tmg_structured_generation_runtime_v1.candidate"
    || candidate.roleRef?.id !== recoveryRoleId
    || candidate.contextManifestRef?.id !== `context.${recoveryRoleId}`
    || candidate.invocationHash.slice(0, 48)
      !== originAttemptId.slice("structured-".length)
    || runtimeReceipt.version
      !== "starcraft_tmg_structured_generation_runtime_v1.receipt"
    || runtimeReceipt.status !== "accepted"
    || runtimeReceipt.attemptId !== originAttemptId
    || runtimeReceipt.invocationHash !== candidate.invocationHash
    || runtimeReceipt.candidateHash !== candidate.hash
    || runtimeReceipt.providerReceiptHash !== candidate.providerReceiptHash
    || runtimeReceipt.providerAttempts !== 1
    || runtimeReceipt.automaticRetries !== 0
    || runtimeReceipt.semanticAcceptance !== false
    || hash(runtimeReceipt.outputContractRef)
      !== hash(candidate.outputContractRef)
    || hash(providerResponse.output) !== hash(candidate.providerValue)
    || hash(providerResponse.localValidationReceipt)
      !== hash(candidate.localValidationReceipt)
    || providerResponse.usageReceipt?.requestId !== originAttemptId
    || providerResponse.usageReceipt?.receiptHash
      !== candidate.providerReceiptHash
    || hash(providerResponse.usageReceipt?.outputContractRef)
      !== hash(candidate.outputContractRef)
    || hash(providerResponse.usageReceipt?.usage) !== hash(usage)
    || hash({ value: usage }) !== usageHash
    || usage.totalUnits !== usage.inputUnits + usage.outputUnits
    || candidate.published !== false || candidate.runtimeAccepted !== false
    || candidate.trainingTruth !== false) {
    fail("FACTION_STRUCTURED_REVIEW_OUTPUT_CAP_SUCCESS_IMPORT_INVALID");
  }
  return seal({
    version: "faction_structured_review_output_cap_success_import_v1",
    parentRunId, fullRoleId, originIssueHash, originAttemptId,
    originInvocationHash: candidate.invocationHash, originRequestHash,
    candidate, runtimeReceipt, originalUsage: usage,
    originalProviderCallSettled: true,
    originalProviderCallsReplayed: 0,
    semanticAcceptanceInherited: false,
    trainingTruth: false,
  });
}

function structuredReviewInvocationIdentity({ roleRef, capsule,
  outputContractRef, executionPolicyRef, capabilityReceipt }) {
  const contextManifestRef = contextManifestRefStarcraftTmgV1(capsule);
  const body = {
    schemaVersion:
      "starcraft_tmg_structured_generation_runtime_v1.invocation",
    roleRef,
    contextManifestRef,
    outputContractRef,
    executionPolicyRef,
    continuationRef: null,
    contextPayloadHash: hash({ instructions: capsule.instructions,
      input: capsule.compiledInput }),
    capabilityReceiptHash: capabilityReceipt.receiptHash,
    trainingTruth: false,
  };
  const invocationHash = hash(body);
  return { invocationHash,
    attemptId: `structured-${invocationHash.slice(0, 48)}` };
}

export function createFactionStructuredReviewOutputCapFailureImportV1(
  input = {}) {
  const { parentRunId, fullRoleId, originAttemptId, originRequestHash,
    originIssue, failureReceipt, usage, usageHash } = input;
  verifySeal(originIssue);
  const { receiptHash, ...receiptBody } = failureReceipt || {};
  if (!/^faction-v1-[a-f0-9]{20}$/u.test(parentRunId || "")
    || !/^faction\.[a-z0-9_]+\.faction\.[a-z0-9_]+\..+review-target-batch-v1\./u
      .test(fullRoleId || "")
    || !/^structured-[a-f0-9]{48}$/u.test(originAttemptId || "")
    || !/^[a-f0-9]{64}$/u.test(originRequestHash || "")
    || originIssue.version
      !== "starcraft_tmg_structured_generation_runtime_v1.issue"
    || originIssue.invocationHash.slice(0, 48)
      !== originAttemptId.slice("structured-".length)
    || originIssue.class !== "output_incomplete"
    || originIssue.code !== "STRUCTURED_PROVIDER_INCOMPLETE"
    || originIssue.safeReceiptHash !== receiptHash
    || originIssue.rejectedCandidateRef !== null
    || hash(receiptBody) !== receiptHash
    || failureReceipt.code !== "STRUCTURED_PROVIDER_INCOMPLETE"
    || failureReceipt.status !== 200
    || failureReceipt.incompleteReason !== "max_output_tokens"
    || failureReceipt.physicalAttempts !== 1
    || failureReceipt.automaticRetries !== 0
    || failureReceipt.requestMayHaveBeenSent !== true
    || failureReceipt.usageKnown !== true
    || !failureReceipt.usage
    || hash(failureReceipt.usage) !== hash(usage)
    || hash({ value: usage }) !== usageHash
    || usage.outputUnits !== 4_096
    || usage.totalUnits !== usage.inputUnits + usage.outputUnits) {
    fail("FACTION_STRUCTURED_REVIEW_OUTPUT_CAP_IMPORT_INVALID");
  }
  return seal({
    version: "faction_structured_review_output_cap_failure_import_v1",
    parentRunId,
    fullRoleId,
    originAttemptId,
    originInvocationHash: originIssue.invocationHash,
    originRequestHash,
    originIssue,
    failureReceipt,
    usage,
    usageHash,
    originalAttemptSettled: true,
    originalAttemptReplayed: false,
    rejectedPartialOutputPersisted: false,
    semanticAcceptanceInherited: false,
    trainingTruth: false,
  });
}

function revalidateImportedRejectedCandidate({ candidate, capsule,
  roleRef, outputContract, outputContractRef }) {
  verifySeal(candidate);
  if (candidate.roleRef?.hash !== roleRef.hash
    || candidate.contextManifestRef?.hash !== capsule.hash
    || candidate.outputContractRef?.hash !== outputContractRef.hash
    || candidate.validation?.valueHash !== hash(candidate.providerValue)
    || candidate.validation?.ok !== false) {
    fail("FACTION_STRUCTURED_REVIEW_SCHEMA_REPAIR_IMPORT_INVALID");
  }
  const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
    outputContract.providerSchema, candidate.providerValue);
  if (validation.ok || hash(issueSignature(validation.issues))
    !== hash(issueSignature(candidate.validation.issues))) {
    fail("FACTION_STRUCTURED_REVIEW_SCHEMA_REPAIR_IMPORT_DRIFT");
  }
  return seal({
    version: "faction_structured_review_revalidated_rejected_candidate_v1",
    invocationHash: candidate.invocationHash,
    roleRef,
    contextManifestRef: contextManifestRefStarcraftTmgV1(capsule),
    outputContractRef,
    providerValue: candidate.providerValue,
    validation,
    originRejectedCandidateRef: { hash: candidate.hash },
    semanticAcceptanceInherited: false,
    published: false,
    runtimeAccepted: false,
    trainingTruth: false,
  });
}

function revalidateImportedOutputCapSuccess({ imported, capsule, roleRef,
  outputContract, outputContractRef, executionPolicyRef,
  capabilityReceipt, recoveryBudgetBinding }) {
  verifySeal(imported);
  const { candidate, runtimeReceipt, originalUsage } = imported;
  [candidate, runtimeReceipt].forEach(verifySeal);
  const identity = structuredReviewInvocationIdentity({ roleRef, capsule,
    outputContractRef, executionPolicyRef, capabilityReceipt });
  const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
    outputContract.providerSchema, candidate.providerValue);
  if (imported.version
      !== "faction_structured_review_output_cap_success_import_v1"
    || imported.originAttemptId !== identity.attemptId
    || imported.originInvocationHash !== identity.invocationHash
    || candidate.invocationHash !== identity.invocationHash
    || candidate.roleRef?.hash !== roleRef.hash
    || candidate.contextManifestRef?.hash !== capsule.hash
    || candidate.outputContractRef?.hash !== outputContractRef.hash
    || runtimeReceipt.invocationHash !== identity.invocationHash
    || runtimeReceipt.attemptId !== identity.attemptId
    || runtimeReceipt.candidateHash !== candidate.hash
    || runtimeReceipt.outputContractRef?.hash !== outputContractRef.hash
    || !validation.ok
    || candidate.localValidationReceipt?.valueHash
      !== hash(candidate.providerValue)
    || candidate.localValidationReceipt?.outputContractRef?.hash
      !== outputContractRef.hash) {
    fail("FACTION_STRUCTURED_REVIEW_OUTPUT_CAP_SUCCESS_IMPORT_DRIFT");
  }
  verifyOutputCapRecoveryCompactness(candidate.providerValue,
    originalUsage.outputUnits, { outputContractRef, binding: recoveryBudgetBinding });
  return { candidate, runtimeReceipt, originalUsage };
}

export function verifyFactionStructuredReviewSchemaRepairScopeV1({
  rejectedCandidate, repairedOutput,
}) {
  verifySeal(rejectedCandidate);
  const issues = rejectedCandidate.validation?.issues;
  const paths = Array.isArray(issues)
    ? [...new Set(issues.map((row) => row.path))] : [];
  if (!paths.length
    || hash(maskRepairIssues(rejectedCandidate.providerValue, issues,
      "before"))
      !== hash(maskRepairIssues(repairedOutput, issues, "after"))
    || paths.every((path) => {
      const before = pathValue(rejectedCandidate.providerValue, path);
      const after = pathValue(repairedOutput, path);
      return before.exists === after.exists
        && (!before.exists || hash(before.value) === hash(after.value));
    })) {
    fail("FACTION_STRUCTURED_REVIEW_SCHEMA_REPAIR_SCOPE_INVALID");
  }
  return seal({
    version: "faction_structured_review_schema_repair_scope_v1",
    rejectedCandidateHash: rejectedCandidate.hash,
    repairedOutputHash: hash(repairedOutput),
    allowedChangedPaths: paths,
    allOtherValuesHashEqual: true,
    semanticReReviewPerformed: false,
    trainingTruth: false,
  });
}

export function materializeFactionStructuredReviewV1({
  providerOutput, capsule, input, section, draft, reviewIndices,
  requiredSourceRefs, targets, reviewReasonMaximum = 1200,
  reviewSourceMaximum = 8,
  reviewNarrativeCharacterMaximum = 240,
  coverageAddressBinding = null,
}) {
  verifySeal(capsule);
  exactSlotSet(providerOutput?.verdicts, "targetSlot",
    targets.targets.length, "FACTION_STRUCTURED_REVIEW_TARGET_SLOT_INVALID");
  exactSlotSet(providerOutput?.coverage, "coverageSlot",
    requiredSourceRefs.length, "FACTION_STRUCTURED_REVIEW_COVERAGE_SLOT_INVALID");
  const task = capsule.localIssue.reviewTask;
  const available = new Map(task.sourceCatalogue
    .filter((row) => row.includedAs !== "not_in_current_faction_scope")
    .map((row) => [row.slot, row.ref]));
  const verdicts = [...providerOutput.verdicts]
    .sort((a, b) => a.targetSlot - b.targetSlot).map((row) => {
      if (!Array.isArray(row.sourceSlots) || !row.sourceSlots.length
        || row.sourceSlots.some((slot) => !available.has(slot))) {
        fail("FACTION_STRUCTURED_REVIEW_SOURCE_SLOT_INVALID");
      }
      const target = targets.targets[row.targetSlot];
      return { targetId: target.targetId, title: target.title,
        focus: row.focus, verdict: row.verdict, reason: row.reason,
        sourceRefs: row.sourceSlots.map((slot) => available.get(slot)) };
    });
  const coverage = [...providerOutput.coverage]
    .sort((a, b) => a.coverageSlot - b.coverageSlot).map((row) => ({
      sourceRef: requiredSourceRefs[row.coverageSlot],
      verdict: row.verdict,
      recommendationIndices: row.recommendationIndices,
      reason: row.reason,
    }));
  const resolvedCoverage = coverageAddressBinding
    ? (coverageAddressBinding.hash === FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V5.hash ? resolveFactionReviewCoverageAddressesV5
      : coverageAddressBinding.hash === FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V4.hash ? resolveFactionReviewCoverageAddressesV4
      : coverageAddressBinding.hash === FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V3.hash ? resolveFactionReviewCoverageAddressesV3
      : coverageAddressBinding.hash === FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V2.hash
        ? resolveFactionReviewCoverageAddressesV2 : resolveFactionReviewCoverageAddressesV1)(
      { coverage, targets, draft, binding: coverageAddressBinding, coverageSourceRefs: requiredSourceRefs }) : null;
  const output = { verdicts, coverage: resolvedCoverage?.coverage || coverage };
  const bound = validateTargetedFactionReviewV1(output, targets,
    { narrativeCharacterMaximum: reviewNarrativeCharacterMaximum });
  validateFactionReviewV1(bound.review, {
    input, section, draft, reviewIndices, requiredSourceRefs,
    reviewReasonMaximum, reviewSourceMaximum,
  });
  return { output, bound, receipt: seal({
    version: "faction_structured_review_host_materialization_v1",
    providerOutputHash: hash(providerOutput),
    targetContractHash: targets.hash,
    contextCapsuleHash: capsule.hash,
    materializedOutputHash: hash(output),
    targetIdsHostMaterialized: true,
    titlesHostMaterialized: true,
    sourceRefsHostMaterializedFromSlots: true,
    judgmentsChanged: false,
    ...(resolvedCoverage?.receipt.repairs.length ? { coverageAddressResolution: resolvedCoverage.receipt } : {}),
    semanticAcceptanceInherited: false,
    trainingTruth: false,
  }) };
}

export function createFactionStructuredReviewRuntimeV1(options = {}) {
  const { input, runtime, store, dsh, providerAdapter, egressBinding,
    capabilityReceipt, outputContract, executionPolicy, priceUsage } = options;
  verifySeal(input);
  assertStarcraftTmgProviderCapabilityReceiptV1(capabilityReceipt);
  if (typeof runtime?.role !== "function" || !store
    || typeof dsh?.run !== "function" || typeof providerAdapter?.complete !== "function"
    || typeof priceUsage !== "function") {
    throw new TypeError("Faction structured review dependencies are invalid");
  }
  const outputContractRef = outputContractRefStarcraftTmgV1(outputContract);
  const nativeSlots = outputContractRef.hash === STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V6.hash;
  if (Boolean(options.fieldValueBinding) !== Boolean(options.completeFieldValues)
    || options.fieldValueBinding && (!nativeSlots || typeof options.completeFieldValues !== 'function'
      || verifySeal(options.fieldValueBinding).hash !== FACTION_FIELD_VALUE_BINDING_V1.hash))
    fail('FACTION_FIELD_VALUE_PRODUCTION_ROUTE_REQUIRED');
  if (nativeSlots !== Boolean(options.reviewSlotNamespaceBinding)
    || nativeSlots && verifySeal(options.reviewSlotNamespaceBinding).hash !== FACTION_REVIEW_SLOT_NAMESPACE_BINDING_V1.hash) {
    fail('FACTION_REVIEW_SLOT_NAMESPACE_RUNTIME_BINDING_REQUIRED');
  }
  // Old recovery policies describe old contracts. They must not relabel a paid
  // V5 result or carry a V5 capacity-retry policy into the native V6 lane.
  if (nativeSlots && (options.allowBoundedOutputCapRecovery || options.reviewDecomposition
    || options.coverageAddressBinding || options.readFocusCapacityFailure
    || ['schemaRepairImports', 'outputCapRecoveryImports', 'outputCapRecoverySuccessImports',
      'focusCapacityImports', 'completeReviewImports'].some(key => options[key]?.length))) {
    fail('FACTION_REVIEW_SLOT_NAMESPACE_LEGACY_RECOVERY_UNSCOPED');
  }
  if (capabilityReceipt.outputContractRef.hash !== outputContractRef.hash) {
    fail("FACTION_STRUCTURED_REVIEW_CAPABILITY_DRIFT");
  }
  if (options.reviewSourceExpansionBinding && (!nativeSlots
    || verifySeal(options.reviewSourceExpansionBinding).hash !== FACTION_REVIEW_SOURCE_EXPANSION_BINDING_V1.hash))
    fail('FACTION_REVIEW_SOURCE_EXPANSION_RUNTIME_BINDING_REQUIRED');
  if (Boolean(options.parsedWireSchemaBridgeBinding) !== Boolean(options.readParsedWireRecovery)
    || options.parsedWireSchemaBridgeBinding && (!nativeSlots
      || verifySeal(options.parsedWireSchemaBridgeBinding).hash !== FACTION_STRUCTURAL_JSON_SCHEMA_BRIDGE_BINDING_V2.hash
      || typeof options.readParsedWireRecovery !== 'function'))
    fail('FACTION_PARSED_WIRE_SCHEMA_RUNTIME_BINDING_REQUIRED');
  if (options.parsedReviewValueBinding && (!options.parsedWireSchemaBridgeBinding
    || verifySeal(options.parsedReviewValueBinding).hash !== FACTION_PARSED_REVIEW_VALUE_BINDING_V1.hash))
    fail('FACTION_PARSED_REVIEW_VALUE_RUNTIME_BINDING_REQUIRED');
  if (options.parsedReviewNarrativeBinding && (!nativeSlots
    || !options.parsedWireSchemaBridgeBinding
    || verifySeal(options.parsedReviewNarrativeBinding).hash !== FACTION_PARSED_REVIEW_VALUE_BINDING_V2.hash))
    fail('FACTION_PARSED_REVIEW_NARRATIVE_RUNTIME_BINDING_REQUIRED');
  if (options.ambiguousReplacementBinding
    && verifySeal(options.ambiguousReplacementBinding).hash
      !== FACTION_AMBIGUOUS_REPLACEMENT_BINDING_V1.hash)
    fail('FACTION_NATIVE_REVIEW_AMBIGUOUS_REPLACEMENT_BINDING_REQUIRED');
  const reviewReasonMaximum = Math.max(
    outputContract.providerSchema.properties.verdicts.items.properties.reason
      .maxLength,
    outputContract.providerSchema.properties.coverage.items.properties.reason
      .maxLength);
  if (![1200, 16_384].includes(reviewReasonMaximum)) {
    fail("FACTION_STRUCTURED_REVIEW_REASON_BOUND_INVALID");
  }
  const schemaRepairImports = new Map();
  for (const candidate of options.schemaRepairImports || []) {
    verifySeal(candidate);
    const key = `${candidate.roleRef?.hash || ""}:${candidate.contextManifestRef?.hash || ""}`;
    if (!candidate.roleRef?.hash || !candidate.contextManifestRef?.hash
      || schemaRepairImports.has(key)) {
      fail("FACTION_STRUCTURED_REVIEW_SCHEMA_REPAIR_IMPORT_INVALID");
    }
    schemaRepairImports.set(key, candidate);
  }
  const outputCapRecoveryImports = new Map();
  for (const imported of options.outputCapRecoveryImports || []) {
    verifySeal(imported);
    if (imported.version
        !== "faction_structured_review_output_cap_failure_import_v1"
      || outputCapRecoveryImports.has(imported.fullRoleId)) {
      fail("FACTION_STRUCTURED_REVIEW_OUTPUT_CAP_IMPORT_INVALID");
    }
    outputCapRecoveryImports.set(imported.fullRoleId, imported);
  }
  const outputCapRecoverySuccessImports = new Map();
  for (const imported of options.outputCapRecoverySuccessImports || []) {
    verifySeal(imported);
    if (imported.version
        !== "faction_structured_review_output_cap_success_import_v1"
      || outputCapRecoverySuccessImports.has(imported.fullRoleId)) {
      fail("FACTION_STRUCTURED_REVIEW_OUTPUT_CAP_SUCCESS_IMPORT_INVALID");
    }
    outputCapRecoverySuccessImports.set(imported.fullRoleId, imported);
  }
  const policy = Object.freeze({ ...executionPolicy });
  const legacyRoles = new Set(options.legacyStructuredReviewRoleIds || []);
  if (legacyRoles.size !== (options.legacyStructuredReviewRoleIds || []).length) {
    fail("FACTION_STRUCTURED_REVIEW_LEGACY_ROLE_DUPLICATE");
  }
  const executionPolicyRef = {
    id: "policy.faction-target-review.production",
    version: "2026.09.06.1",
    hash: hash(policy),
  };
  return Object.freeze({
    ...(options.parsedWireSchemaBridgeBinding ? { parsedWireSchemaBridgeBindingHash: options.parsedWireSchemaBridgeBinding.hash } : {}),
    async role(request) {
      if ((options.reviewDecomposition || options.parsedWireSchemaBridgeBinding)
        && store.globalSummary?.().attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED'))
        fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
      const match = REVIEW_ROLE.exec(request.roleId || "");
      if (!match) return runtime.role(request);
      const fullRoleId = `${request.packet.id}.${request.roleId}`;
      if (legacyRoles.has(canonicalRoleId(fullRoleId))) {
        return runtime.role(request);
      }
      verifySeal(request.packet);
      const { section, draft, reviewIndices, coverageRequiredSourceRefs,
        outputRequestAtEnd } = request.workspace || {};
      const targets = outputRequestAtEnd?.targetContract;
      if (request.workspace?.inputHash !== input.hash || !targets
        || targets.hash !== createFactionReviewTargetsV1({ input, section,
          draft, indices: reviewIndices }).hash) {
        fail("FACTION_STRUCTURED_REVIEW_INPUT_DRIFT");
      }
      const canonical = canonicalRoleId(request.roleId);
      const roleRef = { id: canonical, version: "structured-review-v1",
        hash: hash(`${canonical}.structured-review-v1`) };
      const slotProtocol = nativeSlots ? await import('./faction-review-slot-namespace-v1.mjs') : null;
      const capsule = (slotProtocol?.createFactionSlotReviewContextV1 || createFactionReviewContextCapsuleV1)({
        factionInput: input, section, draft, reviewIndices,
        coverageRequiredSourceRefs, targets, roleRef, outputContractRef,
        route: match[1],
        includeSharedScenarioSources: options.includeSharedScenarioSources === true,
      });
      const contextManifestRef = contextManifestRefStarcraftTmgV1(capsule);
      const importedRejectedCandidate = schemaRepairImports.get(
        `${roleRef.hash}:${contextManifestRef.hash}`) || null;
      const importedOutputCapFailure = outputCapRecoveryImports.get(
        fullRoleId) || null;
      const importedOutputCapSuccess = outputCapRecoverySuccessImports.get(
        fullRoleId) || null;
      if ([importedRejectedCandidate, importedOutputCapFailure,
        importedOutputCapSuccess].filter(Boolean).length > 1) {
        fail("FACTION_STRUCTURED_REVIEW_RECOVERY_IMPORT_CONFLICT");
      }
      if (importedOutputCapFailure) {
        const identity = structuredReviewInvocationIdentity({ roleRef, capsule,
          outputContractRef, executionPolicyRef, capabilityReceipt });
        if (importedOutputCapFailure.originAttemptId !== identity.attemptId
          || importedOutputCapFailure.originInvocationHash
            !== identity.invocationHash
          || importedOutputCapFailure.originIssue.outputContractRef?.hash
            !== outputContractRef.hash
          || importedOutputCapFailure.failureReceipt.outputContractRef?.hash
            !== outputContractRef.hash
          || importedOutputCapFailure.failureReceipt.capabilityReceiptHash
            !== capabilityReceipt.receiptHash) {
          fail("FACTION_STRUCTURED_REVIEW_OUTPUT_CAP_IMPORT_DRIFT");
        }
      }
      const roleInput = {
        version: STARCRAFT_TMG_FACTION_STRUCTURED_REVIEW_RUNTIME_VERSION,
        packetHash: request.packet.hash,
        roleRef,
        contextManifestRef,
        outputContractRef,
        executionPolicyRef,
        semanticAcceptanceInherited: false,
      };
      const lease = store.acquire(fullRoleId, roleInput);
      if (lease.cached) {
        const cached = verifySeal(lease.artifact);
        if (cached.parsedReviewValues) {
          for (const record of cached.parsedReviewValues) {
            const phase = factionParsedWirePhaseCapsuleV2({ input, baseCapsule: capsule, value: cached, record,
              resolveArtifact: options.readReviewArtifact });
            const actual = await options.readParsedWireRecovery({ capsule: phase, roleInput: { ...roleInput,
              roleRef: phase.roleRef, contextManifestRef: contextManifestRefStarcraftTmgV1(phase) } });
            if (!actual) fail('FACTION_PARSED_REVIEW_VALUE_CACHED_ORIGIN_MISSING');
            if (record.version === FACTION_PARSED_REVIEW_VALUE_BINDING_V1.version) {
              if (options.parsedReviewValueBinding?.hash !== FACTION_PARSED_REVIEW_VALUE_BINDING_V1.hash)
                fail('FACTION_PARSED_REVIEW_VALUE_CACHED_BINDING_REQUIRED');
              verifyFactionParsedReviewValueRecordV1({ record, capsule: phase,
                authenticated: actual.proof, dshBindingHash: dsh.binding.hash });
            } else if (record.version === FACTION_PARSED_REVIEW_VALUE_BINDING_V2.version) {
              if (options.parsedReviewNarrativeBinding?.hash !== FACTION_PARSED_REVIEW_VALUE_BINDING_V2.hash
                || cached.parsedReviewNarrativeBindingHash !== FACTION_PARSED_REVIEW_VALUE_BINDING_V2.hash)
                fail('FACTION_PARSED_REVIEW_NARRATIVE_CACHED_BINDING_REQUIRED');
              verifyFactionParsedReviewValueRecordV2({ record, capsule: phase,
                authenticated: actual.proof, dshBindingHash: dsh.binding.hash });
            } else fail('FACTION_PARSED_REVIEW_VALUE_CACHED_BINDING_REQUIRED');
          }
        }
        if (cached.parsedWireRecoveries) {
          if (!options.parsedWireSchemaBridgeBinding || !Array.isArray(cached.parsedWireRecoveries)
            || !cached.parsedWireRecoveries.length || cached.parsedWireRecoveries.length > 2
            || new Set(cached.parsedWireRecoveries.map(r => r.originalContextHash)).size !== cached.parsedWireRecoveries.length)
            fail('FACTION_PARSED_WIRE_SCHEMA_CACHED_BINDING_REQUIRED');
          for (const record of cached.parsedWireRecoveries) {
            const phase = factionParsedWirePhaseCapsuleV2({ input, baseCapsule: capsule, value: cached, record,
              resolveArtifact: options.readReviewArtifact });
            const actual = await options.readParsedWireRecovery({ capsule: phase, roleInput: { ...roleInput,
              roleRef: phase.roleRef, contextManifestRef: contextManifestRefStarcraftTmgV1(phase) } });
            if (!actual) fail('FACTION_PARSED_WIRE_SCHEMA_CACHED_ORIGIN_MISSING');
            verifyFactionParsedWireCorrectionRecordV2({ record, capsule: phase,
              authenticated: actual.proof, dshBindingHash: dsh.binding.hash,
              parsedReviewValue: cached.parsedReviewValues?.find(r => r.hash === record.correctedParsedReviewValueRef?.hash) });
          }
        }
        return cached;
      }
      const focusPrepared = { fullRoleId, roleInput, capsule,
        includeSharedScenarioSources: options.includeSharedScenarioSources === true,
        coverageAddressBinding: options.coverageAddressBinding,
        mapping: { section, draft, reviewIndices, requiredSourceRefs: coverageRequiredSourceRefs, targets } };
      const importedFocusEvidence = (options.focusCapacityImports || []).find(e =>
        hash(e.rejected.roleRef) === hash(roleRef) && hash(e.rejected.contextManifestRef) === hash(contextManifestRef));
      const importedCompleteReview = (options.completeReviewImports || []).find(e =>
        hash(e.candidate.roleRef) === hash(roleRef) && hash(e.candidate.contextManifestRef) === hash(contextManifestRef));
      const candidates = new Map();
      let expansionMapping = null;
      let parsedWireMapping = null;
      const parsedWireRecoveries = [];
      const parsedReviewValues = [];
      const reviewSoftLimitValues = [];
      const storeProxy = {
        ...store,
        finish(candidateLease, value) {
          const saved = store.finish(candidateLease, value);
          if (String(saved?.version || "").endsWith(".candidate")) {
            candidates.set(saved.hash, saved);
          }
          return saved;
        },
      };
      async function runStructured(activeRoleRef, activeCapsule, task) {
        const activeContextRef = contextManifestRefStarcraftTmgV1(
          activeCapsule);
        const recoverParsed = async () => {
          if (!options.parsedWireSchemaBridgeBinding) return null;
          if (store.globalSummary().attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED'))
            fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
          const actual = await options.readParsedWireRecovery({ capsule: activeCapsule,
            roleInput: { ...roleInput, roleRef: activeRoleRef, contextManifestRef: activeContextRef } });
          if (!actual) return null;
          if (actual.proof.validation.ok && options.parsedReviewValueBinding) {
            const record = await materializeFactionParsedReviewValueV1({ capsule: activeCapsule, store, dsh,
              readAuthenticated: () => options.readParsedWireRecovery({ capsule: activeCapsule,
                roleInput: { ...roleInput, roleRef: activeRoleRef, contextManifestRef: activeContextRef } }) });
            parsedReviewValues.push(record);
            options.onProgress?.({ role: activeRoleRef.id, state: 'authenticated_schema_valid_wire_materialized',
              originAttemptId: actual.proof.originAttemptId, newProviderCalls: 0 });
            return { outcome: { status: 'parsed_schema_valid', usage: { input: 0, output: 0, estimatedCny: 0 } },
              parsedReviewValue: record, loop: record.loop, contextManifestRef: activeContextRef };
          }
          if (!actual.proof.validation.ok && options.parsedReviewNarrativeBinding) {
            try {
              const record = await materializeFactionParsedReviewValueV2({ capsule: activeCapsule, store, dsh,
                readAuthenticated: () => options.readParsedWireRecovery({ capsule: activeCapsule,
                  roleInput: { ...roleInput, roleRef: activeRoleRef, contextManifestRef: activeContextRef } }) });
              parsedReviewValues.push(record);
              options.onProgress?.({ role: activeRoleRef.id,
                state: 'authenticated_narrative_capacity_wire_materialized',
                originAttemptId: actual.proof.originAttemptId, newProviderCalls: 0,
                perNarrativeFieldCharacterMaximum: null,
                softAlerts: record.capacityProof.softAlerts });
              return { outcome: { status: 'parsed_schema_valid',
                usage: { input: 0, output: 0, estimatedCny: 0 } },
                parsedReviewValue: record, loop: record.loop, contextManifestRef: activeContextRef };
            } catch (error) {
              if (error.code !== 'FACTION_PARSED_REVIEW_VALUE_NARRATIVE_CAPACITY_NOT_APPLICABLE') throw error;
            }
          }
          const preparation = prepareFactionStructuralJsonSchemaRepairV2({ capsule: activeCapsule, authenticated: actual.proof });
          const id = actual.proof.originAttemptId + '.parsed-schema-candidate-v2';
          const candidateLease = store.acquire(id, { preparationHash: preparation.hash });
          if (candidateLease.cached) {
            if (verifySeal(candidateLease.artifact).hash !== preparation.rejected.hash)
              fail('FACTION_PARSED_WIRE_SCHEMA_CANDIDATE_DRIFT');
          } else store.finish(candidateLease, preparation.rejected);
          options.onProgress?.({ role: activeRoleRef.id, state: 'authenticated_wire_to_schema_candidate',
            originAttemptId: actual.proof.originAttemptId, newProviderCalls: 0,
            schemaIssues: preparation.allowedChangedPaths });
          return { outcome: { status: 'quarantined', issueRef: { class: 'schema_instance',
            hash: actual.proof.originalWireIssueHash, originalClass: 'wire_syntax',
            parsedRecoveryProofHash: actual.proof.hash } }, loop: null,
            contextManifestRef: activeContextRef, importedRejectedCandidate: preparation.rejected,
            parsedRecovery: { proof: actual.proof, preparation } };
        };
        const priorParsed = await recoverParsed();
        if (priorParsed) return priorParsed;
        const activeIdentity = options.reviewSourceExpansionBinding || options.parsedWireSchemaBridgeBinding
          ? structuredReviewInvocationIdentity({ roleRef: activeRoleRef, capsule: activeCapsule,
            outputContractRef, executionPolicyRef, capabilityReceipt }) : null;
        const prior = activeIdentity && options.readPriorReviewAttempt
          ? await options.readPriorReviewAttempt(activeIdentity) : null;
        let importedOutcome = null;
        let nativeReviewAmbiguousReplacement = null;
        let dispatchCapabilityReceipt = capabilityReceipt;
        const recoverSoftLimit = async (evidence, replacement = null) => {
          if (!evidence || !options.reviewSoftLimitBinding
            || options.reviewSoftLimitBinding.hash !== FACTION_REVIEW_SOFT_LIMIT_BINDING_V1.hash)
            return null;
          const mapping = { ...focusPrepared.mapping, input, capsule: activeCapsule,
            sourceContextExpansion: expansionMapping,
            structuralJsonSchemaRepair: activeCapsule.localIssue.structuralJsonRecovery
              ? parsedWireMapping : null,
            nativeReviewAmbiguousReplacement: replacement };
          let nativeFailureProof;
          try {
            nativeFailureProof = slotProtocol.verifyFactionNativeSlotSchemaFailureV1({
              ...mapping, evidence });
          } catch (error) {
            throw error;
          }
          let record;
          try {
            record = await materializeFactionReviewSoftLimitV1({ capsule: activeCapsule,
              evidence, nativeFailureProof, store, dsh });
          } catch (error) {
            if (error.code === 'FACTION_PARSED_REVIEW_VALUE_NARRATIVE_CAPACITY_NOT_APPLICABLE'
              || error.code === 'FACTION_REVIEW_SOFT_LIMIT_NARRATIVE_CAPACITY_NOT_APPLICABLE')
              return null;
            throw error;
          }
          if (!reviewSoftLimitValues.some(row => row.hash === record.hash))
            reviewSoftLimitValues.push(record);
          options.onProgress?.({ role: activeRoleRef.id,
            state: 'review_artificial_limit_soft_accepted',
            originAttemptId: evidence.attempt.id, newProviderCalls: 0,
            softAlerts: record.capacityProof.softAlerts,
            manualStopAvailable: true });
          return { outcome: { status: 'soft_limit_valid', usage: {
            input: 0, output: 0, total: 0, cacheHit: 0, cacheMiss: 0,
            estimatedCny: 0 } }, reviewSoftLimitValue: record,
            loop: record.loop, contextManifestRef: activeContextRef,
            ...(replacement ? { nativeReviewAmbiguousReplacement: replacement } : {}) };
        };
        if (prior) {
          const mapping = { ...focusPrepared.mapping, input, capsule: activeCapsule,
            sourceContextExpansion: expansionMapping,
            structuralJsonSchemaRepair: activeCapsule.localIssue.structuralJsonRecovery ? parsedWireMapping : null };
          const save = (suffix, field, artifact) => {
            verifySeal(artifact);
            const importedLease = store.acquire(activeIdentity.attemptId + suffix, { [field]: artifact.hash });
            if (importedLease.cached) {
              if (verifySeal(importedLease.artifact).hash !== artifact.hash)
                fail('FACTION_REVIEW_SOURCE_EXPANSION_PRIOR_ARTIFACT_DRIFT');
            } else store.finish(importedLease, artifact);
          };
          if (prior.attempt.state === 'failed' && prior.attempt.code === 'STRUCTURED_PROVIDER_SCHEMA_INVALID') {
            const soft = await recoverSoftLimit(prior);
            if (soft) return soft;
            slotProtocol.verifyFactionNativeSlotSchemaFailureV1({ ...mapping, evidence: prior });
            save('.rejected-candidate', 'rejectedCandidateHash', prior.rejected);
            save('.issue', 'issueHash', prior.issue);
            save('.runtime-receipt', 'receiptHash', prior.runtimeReceipt);
            if (prior.runtimeReceipt.issueHash !== prior.issue.hash
              || prior.runtimeReceipt.invocationHash !== activeIdentity.invocationHash
              || prior.runtimeReceipt.status !== 'quarantined')
              fail('FACTION_REVIEW_SOURCE_EXPANSION_PRIOR_FAILURE_DRIFT');
            return { outcome: { status: 'quarantined', candidateRef: null,
              issueRef: { hash: prior.issue.hash, class: prior.issue.class, rejectedCandidateRef: prior.issue.rejectedCandidateRef },
              receiptRef: { hash: prior.runtimeReceipt.hash } }, loop: null, contextManifestRef: activeContextRef };
          }
          if (prior.attempt.state === 'failed'
            && prior.attempt.code === 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND') {
            if (options.ambiguousReplacementBinding?.hash
              !== FACTION_AMBIGUOUS_REPLACEMENT_BINDING_V1.hash)
              fail('FACTION_NATIVE_REVIEW_AMBIGUOUS_REPLACEMENT_REQUIRED');
            const choiceId = prior.attempt.id + '.native-review-ambiguous-replacement.choice';
            const choiceLease = store.acquire(choiceId, {
              originalAttemptHash: hash(prior.attempt),
              authorizationBindingHash: options.ambiguousReplacementBinding.hash,
            });
            try {
              if (choiceLease.cached) {
                nativeReviewAmbiguousReplacement = verifySeal(choiceLease.artifact);
                verifyFactionNativeReviewAmbiguousReplacementV1({
                  record: nativeReviewAmbiguousReplacement,
                  authorizationBinding: options.ambiguousReplacementBinding,
                  capsule: activeCapsule, roleRef: activeRoleRef,
                  outputContractRef, executionPolicyRef,
                  maxOutputUnits: policy.maxOutputUnits,
                  originalEvidence: prior,
                  replacementCapability: nativeReviewAmbiguousReplacement.replacementCapability,
                });
              } else {
                nativeReviewAmbiguousReplacement =
                  prepareFactionNativeReviewAmbiguousReplacementV1({
                    authorizationBinding: options.ambiguousReplacementBinding,
                    capsule: activeCapsule, roleRef: activeRoleRef,
                    outputContractRef, executionPolicyRef,
                    maxOutputUnits: policy.maxOutputUnits,
                    originalEvidence: prior,
                    replacementCapability: capabilityReceipt,
                  });
                nativeReviewAmbiguousReplacement = store.finish(choiceLease,
                  nativeReviewAmbiguousReplacement);
              }
            } catch (error) {
              if (!choiceLease.cached) store.release(choiceLease);
              throw error;
            }
            dispatchCapabilityReceipt =
              nativeReviewAmbiguousReplacement.replacementCapability;
            options.onProgress?.({ role: activeRoleRef.id,
              state: 'native_review_ambiguous_replacement',
              originAttemptId: prior.attempt.id,
              replacementAttemptId:
                nativeReviewAmbiguousReplacement.replacementAttemptId,
              maximumReplacementAttempts: 1, newProviderCalls: 0 });
          }
          if (prior.attempt.state === 'received') {
            slotProtocol.verifyFactionNativeSlotPaidV1({ ...mapping,
              providerOutput: prior.candidate.providerValue, evidence: prior });
            save('.candidate', 'candidateHash', prior.candidate);
            save('.runtime-receipt', 'receiptHash', prior.runtimeReceipt);
            candidates.set(prior.candidate.hash, prior.candidate);
            importedOutcome = { status: 'accepted', candidateRef: { hash: prior.candidate.hash, contractHash: outputContractRef.hash },
              receiptRef: { hash: prior.runtimeReceipt.hash }, issueRef: null,
              usage: { input: 0, output: 0, total: 0, cacheHit: 0, cacheMiss: 0, estimatedCny: 0 } };
            options.onProgress?.({ role: activeRoleRef.id, state: 'prior_paid_review_response_reused',
              originalRunId: prior.attempt.run, originalAttemptId: prior.attempt.id, newProviderCalls: 0 });
          } else if (!nativeReviewAmbiguousReplacement)
            fail('FACTION_REVIEW_SOURCE_EXPANSION_PRIOR_ATTEMPT_ISOLATED');
        }
        const generated = createStructuredRuntimeWithWireRecoveryV2({
          wireRecovery: options.wireRecovery,
          outputContractRegistry: createStarcraftTmgOutputContractRegistryV1({
            entries: [outputContract],
          }),
          contextManifestRegistry: createStarcraftTmgContextCapsuleRegistryV1({
            entries: [activeCapsule],
          }),
          executionPolicyRegistry: { resolve(value) {
            return value.executionPolicyRef?.hash === executionPolicyRef.hash
              && value.roleRef?.hash === activeRoleRef.hash
              && value.outputContractRef?.hash === outputContractRef.hash
              ? { ok: true, executionPolicy: policy } : { ok: false };
          } },
          capabilityReceiptRegistry: { resolve(value) {
            return value.providerProfileRef?.hash
              === egressBinding.providerProfileRef.hash
              && value.outputContractRef?.hash === outputContractRef.hash
              && value.capability === "responses_json_schema"
              ? { ok: true, capabilityReceipt: dispatchCapabilityReceipt } : { ok: false };
          } },
          providerAdapter,
          store: storeProxy,
          egressBinding,
          priceUsage,
          classifyFailure: classifyStarcraftTmgStructuredFailureV1,
          readCandidate: candidateRef => {
            const candidate = candidates.get(candidateRef.hash) || (activeAttemptId
              ? store.artifact(activeAttemptId + '.candidate') : null);
            return candidate?.hash === candidateRef.hash ? candidate : null;
          },
        });
        const invocation = { roleRef: activeRoleRef,
          contextManifestRef: activeContextRef, outputContractRef,
          executionPolicyRef,
          continuationRef: nativeReviewAmbiguousReplacement?.continuationRef || null };
        const activeAttemptId = nativeReviewAmbiguousReplacement?.replacementAttemptId
          || activeIdentity?.attemptId || null;
        let outcome = null;
        const bridge = createStarcraftTmgStructuredDshModelBridgeV1({
          generate: async () => {
            outcome = importedOutcome || await generated.generateStructured(invocation);
            return outcome;
          },
          readCandidate: generated.readCandidate,
          bindInvocation: () => invocation,
        });
        try {
          const loop = await dsh.run({
            task,
            callModel: bridge.callModel,
            toolPort: Object.freeze({ execute: async () =>
              fail("FACTION_STRUCTURED_REVIEW_TOOL_FORBIDDEN"),
            trace: () => [], readRefs: () => [] }),
            limits: { maxCalls: 1, maxTools: 0,
              maxOutput: policy.maxOutputUnits, maxWallMs: 180_000 },
          });
          return { outcome, loop, contextManifestRef: activeContextRef,
            ...(nativeReviewAmbiguousReplacement ? { nativeReviewAmbiguousReplacement } : {}) };
        } catch (error) {
          if (options.parsedWireSchemaBridgeBinding) {
            const parsed = await recoverParsed();
            if (parsed) return parsed;
          }
          const readSoftLimitAttempt = options.readReviewSoftLimitAttempt
            || options.readPriorReviewAttempt;
          if (readSoftLimitAttempt && activeAttemptId
            && ['STRUCTURED_PROVIDER_SCHEMA_INVALID',
              'STRUCTURED_DSH_MODEL_OUTCOME_NOT_ACCEPTED'].includes(error.code)) {
            const rejected = store.artifact(activeAttemptId + '.rejected-candidate');
            if (rejected) {
              verifySeal(rejected);
              const evidence = await readSoftLimitAttempt({
                attemptId: activeAttemptId,
                invocationHash: rejected.invocationHash });
              const soft = await recoverSoftLimit(evidence,
                nativeReviewAmbiguousReplacement);
              if (soft) return soft;
            }
          }
          // A persisted schema failure has already been paid for. The generic
          // reservation layer deliberately returns only its failure code on
          // restart; recover its exact journal evidence, not another send.
          if (!outcome && options.reviewSourceExpansionBinding
            && error.code === 'STRUCTURED_PROVIDER_SCHEMA_INVALID') {
            const identity = activeIdentity;
            const issue = store.artifact(identity.attemptId + '.issue');
            const rejected = store.artifact(identity.attemptId + '.rejected-candidate');
            const receipt = store.artifact(identity.attemptId + '.runtime-receipt');
            if (issue && rejected && receipt) {
              [issue, rejected, receipt].forEach(verifySeal);
              if (issue.class !== 'schema_instance' || issue.invocationHash !== identity.invocationHash
                || rejected.invocationHash !== identity.invocationHash || receipt.invocationHash !== identity.invocationHash
                || issue.rejectedCandidateRef?.hash !== rejected.hash || receipt.issueHash !== issue.hash
                || receipt.status !== 'quarantined' || rejected.contextManifestRef.hash !== activeCapsule.hash)
                fail('FACTION_REVIEW_SOURCE_EXPANSION_CACHED_FAILURE_DRIFT');
              outcome = { status: 'quarantined', issueRef: { hash: issue.hash,
                class: issue.class, rejectedCandidateRef: issue.rejectedCandidateRef },
                receiptRef: { hash: receipt.hash }, candidateRef: null };
            }
          }
          return { outcome, error, loop: null,
            ...(nativeReviewAmbiguousReplacement ? { nativeReviewAmbiguousReplacement } : {}),
            contextManifestRef: activeContextRef };
        }
      }
      async function runImportedOutputCapSuccess(activeRoleRef,
        activeCapsule, imported, task) {
        const revalidated = revalidateImportedOutputCapSuccess({
          imported, capsule: activeCapsule, roleRef: activeRoleRef,
          outputContract, outputContractRef, executionPolicyRef,
          capabilityReceipt, recoveryBudgetBinding: options.recoveryBudgetBinding,
        });
        const loop = await dsh.run({
          task,
          callModel: async () => ({
            command: { action: "finish",
              content: revalidated.candidate.providerValue },
            receiptHash: revalidated.runtimeReceipt.hash,
            usage: { inputUnits: 0, outputUnits: 0, totalUnits: 0,
              inputCacheHitUnits: 0, inputCacheMissUnits: 0,
              reasoningOutputUnits: 0 },
          }),
          toolPort: Object.freeze({ execute: async () =>
            fail("FACTION_STRUCTURED_REVIEW_TOOL_FORBIDDEN"),
          trace: () => [], readRefs: () => [] }),
          limits: { maxCalls: 1, maxTools: 0,
            maxOutput: policy.maxOutputUnits, maxWallMs: 180_000 },
        });
        return {
          outcome: {
            status: "accepted",
            candidateRef: { id: `${imported.originAttemptId}.candidate`,
              hash: revalidated.candidate.hash },
            receiptRef: { id: `${imported.originAttemptId}.runtime-receipt`,
              hash: revalidated.runtimeReceipt.hash },
            usage: { input: 0, output: 0, total: 0, cacheHit: 0,
              cacheMiss: 0, estimatedCny: 0 },
          },
          loop,
          contextManifestRef: contextManifestRefStarcraftTmgV1(activeCapsule),
          importedOriginalUsage: revalidated.originalUsage,
        };
      }
      // Both initial review and fresh source review use this same bounded
      // exact-path repair operation. A source expansion is not schema repair.
      async function repairSchema(rejected, baseCapsule, parsedRecovery = null) {
        if (options.fieldValueBinding && !parsedRecovery && baseCapsule.hash === capsule.hash) {
          const repairScope = classifyFactionFieldValueRepairScopeV1({
            providerOutput: rejected.providerValue,
            targetCount: focusPrepared.mapping.targets.targets.length,
            coverageCount: focusPrepared.mapping.requiredSourceRefs.length,
          });
          let effectiveRepairScope = repairScope;
          if (repairScope.route === 'field_values') {
            try {
              return { completedRole: await options.completeFieldValues({ ...focusPrepared,
                mapping: { ...focusPrepared.mapping, input } }) };
            } catch (error) {
              if (error.code !== 'FACTION_FIELD_VALUE_FULL_OUTPUT_REQUIRED') throw error;
              effectiveRepairScope = verifySeal(error.repairScope);
            }
          }
          const id = baseCapsule.roleRef.id + '.host-contract-repair.1';
          const repairedCapsule = createFactionReviewHostContractRepairContextCapsuleV1({
            capsule: baseCapsule, rejectedCandidate: rejected, repairScope: effectiveRepairScope,
            roleRef: { id, version: 'structured-review-v1', hash: hash(id + '.structured-review-v1') },
          });
          const result = await runStructured(repairedCapsule.roleRef, repairedCapsule,
            `Repair the complete Host coordinate contract for ${baseCapsule.roleRef.id} from the supplied frozen chapter and finish once.`);
          return { result, capsule: repairedCapsule, scope: null, hostContractRepair: effectiveRepairScope };
        }
        const id = baseCapsule.roleRef.id + '.schema-repair.1';
        const repairedCapsule = parsedRecovery?.preparation.context || createFactionReviewSchemaRepairContextCapsuleV1({
          capsule: baseCapsule, rejectedCandidate: rejected,
          roleRef: { id, version: 'structured-review-v1', hash: hash(id + '.structured-review-v1') },
        });
        if (parsedRecovery) parsedWireMapping = { baseCapsule, authenticated: parsedRecovery.proof,
          preparationHash: parsedRecovery.preparation.hash };
        const result = await runStructured(repairedCapsule.roleRef, repairedCapsule,
          `Repair only the exact local schema-instance paths for ${baseCapsule.roleRef.id}. Obey every validationIssues actual/min/max value exactly, preserve every other parsed value, and finish once.`);
        const scope = ['accepted', 'parsed_schema_valid', 'soft_limit_valid'].includes(result.outcome?.status) && result.loop
          ? verifyFactionStructuredReviewSchemaRepairScopeV1({ rejectedCandidate: rejected,
            repairedOutput: result.loop.final }) : null;
        if (parsedRecovery && scope) {
          const correction = verifyFactionStructuralJsonSchemaCorrectionV2({ preparation: parsedRecovery.preparation,
            capsule: baseCapsule, authenticated: parsedRecovery.proof, correctedOutput: result.loop.final });
          const record = seal({ version: 'faction_parsed_wire_correction_record_v2',
            bindingHash: FACTION_STRUCTURAL_JSON_SCHEMA_BRIDGE_BINDING_V2.hash,
            originalContextHash: baseCapsule.hash, authenticatedProof: parsedRecovery.proof,
            preparation: parsedRecovery.preparation, correction,
            ...(result.parsedReviewValue ? { correctedParsedReviewValueRef: { hash: result.parsedReviewValue.hash } }
              : { correctedCandidateRef: result.outcome.candidateRef, correctedRuntimeReceiptRef: result.outcome.receiptRef }),
            loop: result.loop, originalRequestResent: false, nativeSuccessReceiptInvented: false,
            semanticAcceptanceInherited: false, trainingTruth: false });
          verifyFactionParsedWireCorrectionRecordV2({ record, capsule: baseCapsule,
            authenticated: parsedRecovery.proof, dshBindingHash: dsh.binding.hash, parsedReviewValue: result.parsedReviewValue });
          parsedWireRecoveries.push(record);
        }
        return { result, capsule: repairedCapsule, scope };
      }
      function requireAccepted(result, original = result) {
        const parsed = result.outcome?.status === 'parsed_schema_valid' && result.parsedReviewValue
          && parsedReviewValues.some(r => r.hash === result.parsedReviewValue.hash);
        const soft = result.outcome?.status === 'soft_limit_valid' && result.reviewSoftLimitValue
          && reviewSoftLimitValues.some(r => r.hash === result.reviewSoftLimitValue.hash);
        if ((!parsed && !soft && result.outcome?.status !== 'accepted') || !result.loop || result.loop.calls !== 1
          || result.loop.toolTrace.length !== 0)
          throw result.error || original.error || Object.assign(new Error('FACTION_STRUCTURED_REVIEW_OUTCOME_REJECTED'),
            { code: 'FACTION_STRUCTURED_REVIEW_OUTCOME_REJECTED' });
      }
      try {
        const decomposition = options.reviewDecomposition;
        const origin = decomposition?.origins?.filter(e => e.originalContextHash === capsule.hash) || [];
        if (origin.length > 1) fail('FACTION_REVIEW_DECOMPOSITION_ORIGIN_DUPLICATE');
        if (origin.length) {
          if (verifySeal(decomposition.binding).hash !== FACTION_REVIEW_DECOMPOSITION_BINDING_V1.hash)
            fail('FACTION_REVIEW_DECOMPOSITION_BINDING_REQUIRED');
          const args = { input, capsule, evidence: origin[0], originalContract: outputContract, mapping: focusPrepared.mapping };
          const plan = prepareFactionReviewDecompositionV1(args);
          if (decomposition.dry === true) {
            decomposition.onUncached?.({ roleId: fullRoleId, plan });
            fail('FACTION_PREFLIGHT_REVIEW_DECOMPOSITION_REQUIRED');
          }
          const result = verifySeal(await decomposition.runtime.run(args));
          if (result.plan.hash !== plan.hash) fail('FACTION_REVIEW_DECOMPOSITION_PLAN_DRIFT');
          return store.finish(lease, seal({ protocol: FACTION_REVIEW_DECOMPOSITION_BINDING_V1.version,
            roleId: fullRoleId, output: result.output, decomposition: result, wireFailureEvidence: origin[0],
            sourceDelivery: 'proof_carrying_decomposed_whole_section_review',
            initialContextCapsuleHash: capsule.hash, contextCapsuleHash: capsule.hash, outputContractRef,
            sharedScenarioSourcesIncluded: options.includeSharedScenarioSources === true,
            structuredDecodePassed: true, semanticAcceptance: false, trainingTruth: false }));
        }
        if (importedFocusEvidence) {
          const recovered = await recoverReviewFocusCapacityV1({ input, prepared: focusPrepared, evidence: importedFocusEvidence, dsh });
          options.onProgress?.({ stage: 'review_focus_capacity_recovered', role: request.roleId, providerCalls: 0,
            focusCounts: recovered.hostMaterialization.originalFocusCounts, judgmentsChanged: false });
          return store.finish(lease, recovered);
        }
        let fieldSourceHandoff = null;
        if (options.fieldValueSourceHandoff) {
          if (!nativeSlots || options.fieldValueSourceBinding?.hash !== FACTION_FIELD_VALUE_SOURCE_HANDOFF_BINDING_V1.hash
            || typeof options.readFieldValueSourceHandoff !== 'function') fail('FACTION_FIELD_SOURCE_RUNTIME_BINDING_REQUIRED');
          fieldSourceHandoff = verifyFactionFieldValueSourceHandoffV1({ handoff: options.fieldValueSourceHandoff,
            readAuthenticated: () => options.readFieldValueSourceHandoff(focusPrepared) });
          if (fieldSourceHandoff.fullRoleId !== fullRoleId || fieldSourceHandoff.originalContextHash !== capsule.hash
            || fieldSourceHandoff.roleInputHash !== hash(roleInput)) fail('FACTION_FIELD_SOURCE_RUNTIME_CONTEXT_DRIFT');
        }
        const first = fieldSourceHandoff ? { outcome: { status: 'context_required' }, loop: null }
          : importedCompleteReview ? await runFactionReviewCompleteOutputImportV1({
          evidence: importedCompleteReview, roleInput, fullRoleId, contract: outputContract, dsh,
          binding: options.completeReviewImportBinding }) : importedRejectedCandidate ? {
          outcome: {
            status: "quarantined",
            issueRef: { class: "schema_instance",
              importedRejectedCandidateHash: importedRejectedCandidate.hash },
          },
          importedRejectedCandidate: revalidateImportedRejectedCandidate({
            candidate: importedRejectedCandidate, capsule, roleRef,
            outputContract, outputContractRef,
          }),
          loop: null,
        } : importedOutputCapFailure ? {
          outcome: {
            status: "quarantined",
            issueRef: { hash: importedOutputCapFailure.originIssue.hash,
              class: "output_incomplete",
              importedOutputCapFailureHash: importedOutputCapFailure.hash },
            usage: { input: importedOutputCapFailure.usage.inputUnits,
              output: importedOutputCapFailure.usage.outputUnits,
              total: importedOutputCapFailure.usage.totalUnits,
              cacheHit:
                importedOutputCapFailure.usage.inputCacheHitUnits || 0,
              cacheMiss:
                importedOutputCapFailure.usage.inputCacheMissUnits || 0,
              estimatedCny: 0 },
          },
          importedOutputCapFailure,
          loop: null,
        } : importedOutputCapSuccess ? {
          outcome: {
            status: "quarantined",
            issueRef: { hash: importedOutputCapSuccess.originIssueHash,
              class: "output_incomplete",
              importedOutputCapSuccessHash:
                importedOutputCapSuccess.hash },
            usage: { input: 0, output: 0, total: 0, cacheHit: 0,
              cacheMiss: 0, estimatedCny: 0 },
          },
          importedOutputCapSuccess,
          loop: null,
        } : await runStructured(roleRef, capsule,
          `Run structured target review ${canonical} from its complete section proof capsule and finish.`);
        let active = first, activeCapsule = capsule;
        let schemaRepairScope = null;
        let hostContractRepairScope = null;
        let outputCapRecoveryReceipt = null;
        let activeInitialIssueRef = first.outcome?.issueRef;
        let sourceContextExpansion = null;
        if (first.outcome?.status === "quarantined"
          && first.outcome.issueRef?.class === "schema_instance"
          && (first.outcome.issueRef?.rejectedCandidateRef
            || first.importedRejectedCandidate)) {
          const rejected = first.importedRejectedCandidate || store.artifact(
            first.outcome.issueRef.rejectedCandidateRef.id);
          if (!rejected || !first.importedRejectedCandidate
            && rejected.hash
              !== first.outcome.issueRef.rejectedCandidateRef.hash) {
            fail("FACTION_STRUCTURED_REVIEW_REJECTED_CANDIDATE_MISSING");
          }
          if (options.readFocusCapacityFailure) {
            const evidence = options.readFocusCapacityFailure({ roleRef, failureReceiptHash: rejected.safeReceiptHash });
            try {
              const recovered = await recoverReviewFocusCapacityV1({ input, prepared: focusPrepared, evidence, dsh });
              options.onProgress?.({ stage: 'review_focus_capacity_recovered', role: request.roleId, providerCalls: 0,
                focusCounts: recovered.hostMaterialization.originalFocusCounts, judgmentsChanged: false });
              return store.finish(lease, recovered);
            } catch (error) {
              if (error.code !== 'FACTION_REVIEW_FOCUS_CAPACITY_NOT_APPLICABLE') throw error;
            }
          }
          const repaired = await repairSchema(rejected, capsule, first.parsedRecovery);
          if (repaired.completedRole) return store.finish(lease, repaired.completedRole);
          activeCapsule = repaired.capsule; active = repaired.result; schemaRepairScope = repaired.scope;
          hostContractRepairScope = repaired.hostContractRepair || null;
        } else if (options.allowBoundedOutputCapRecovery === true
          && first.outcome?.status === "quarantined"
          && first.outcome.issueRef?.class === "output_incomplete") {
          const recoveryRoleRef = {
            id: `${canonical}.output-cap-recovery.1`,
            version: "structured-review-v1",
            hash: hash(
              `${canonical}.output-cap-recovery.1.structured-review-v1`),
          };
          activeCapsule =
            createFactionReviewOutputCapRecoveryContextCapsuleV1({
              capsule, roleRef: recoveryRoleRef,
              originIssueRef: first.outcome.issueRef,
            });
          const recoveryTask =
            `Repeat the complete semantic review for ${canonical} once within the explicit compact-output limits after the prior max_output_tokens failure.`;
          active = importedOutputCapSuccess
            ? await runImportedOutputCapSuccess(recoveryRoleRef, activeCapsule,
              importedOutputCapSuccess, recoveryTask)
            : await runStructured(recoveryRoleRef, activeCapsule,
              recoveryTask);
          if (active.outcome?.status === "accepted" && active.loop) {
            const compactnessOutputUnits = importedOutputCapSuccess
              ? active.importedOriginalUsage.outputUnits
              : active.outcome.usage.output;
            verifyOutputCapRecoveryCompactness(active.loop.final,
              compactnessOutputUnits, { outputContractRef, binding: options.recoveryBudgetBinding });
            outputCapRecoveryReceipt = seal({
              ...(options.recoveryBudgetBinding ? { recoveryBudgetBindingHash: options.recoveryBudgetBinding.hash } : {}),
              version:
                "faction_structured_review_output_cap_recovery_receipt_v1",
              originIssueHash: first.outcome.issueRef.hash,
              recoveryRoleRef,
              recoveryContextManifestRef:
                contextManifestRefStarcraftTmgV1(activeCapsule),
              reason: "max_output_tokens",
              explicitRecoveryCalls: 1,
              originalAttemptReplayed: false,
              originalProviderCallsReplayed: 0,
              importedFailureHash:
                importedOutputCapFailure?.hash || null,
              importedSuccessHash:
                importedOutputCapSuccess?.hash || null,
              originalRecoveryProviderCallsReplayed:
                importedOutputCapSuccess ? 0 : null,
              requestedMaximumReasonCharacters:
                OUTPUT_CAP_RECOVERY_REASON_TARGET,
              acceptedMaximumReasonCharacters:
                OUTPUT_CAP_RECOVERY_REASON_HARD_MAXIMUM,
              acceptedMaximumOutputUnits:
                OUTPUT_CAP_RECOVERY_OUTPUT_UNITS_HARD_MAXIMUM,
              observedRecoveryOutputUnits: compactnessOutputUnits,
              rejectedPartialOutputUsed: false,
              fullTargetAndCoverageContractRetained: true,
              semanticAcceptanceInherited: false,
              trainingTruth: false,
            });
          }
        }
        async function expandSourceContext(triggerOutput, trigger) {
          if (!options.reviewSourceExpansionBinding) fail('FACTION_FIELD_SOURCE_EXPANSION_BINDING_REQUIRED');
          const triggerParsed = trigger.parsedReviewValueRef
            ? parsedReviewValues.find(record => record.hash === trigger.parsedReviewValueRef.hash) : null;
          const triggerSoft = trigger.reviewSoftLimitValueRef
            ? reviewSoftLimitValues.find(record => record.hash === trigger.reviewSoftLimitValueRef.hash) : null;
          const narrativeCapacityProof = triggerParsed?.version === FACTION_PARSED_REVIEW_VALUE_BINDING_V2.version
            ? triggerParsed.capacityProof : triggerSoft?.capacityProof || null;
          const expanded = createFactionReviewSourceExpansionV1({ input, baseCapsule: capsule,
            triggerOutput, narrativeCapacityProof });
          if (!expanded) fail('FACTION_FIELD_SOURCE_GAP_NOT_PROVED');
          sourceContextExpansion = seal({ bindingHash: FACTION_REVIEW_SOURCE_EXPANSION_BINDING_V1.hash,
            preparationHash: expanded.hash, trigger,
            originalReviewAccepted: false, freshWholeBatchReviewRequired: true, trainingTruth: false });
          expansionMapping = { baseCapsule: capsule, triggerOutput, preparationHash: expanded.hash,
            ...(narrativeCapacityProof ? { narrativeCapacityProof } : {}) };
          options.onProgress?.({ role: request.roleId, state: 'source_context_expansion_required',
            expandedSourceRefs: expanded.expandedSources.map(s => s.ref), originalReviewAccepted: false });
          const fresh = await runStructured(expanded.context.roleRef, expanded.context,
            `Fresh whole-batch source review ${expanded.context.roleRef.id}: read every supplied target and the newly supplied exact frozen bodies. Preserve unresolved objections; finish once.`);
          active = fresh; activeCapsule = expanded.context;
          schemaRepairScope = null; hostContractRepairScope = null;
          activeInitialIssueRef = fresh.outcome?.issueRef;
          if (fresh.outcome?.status === 'quarantined' && fresh.outcome.issueRef?.class === 'schema_instance'
            && (fresh.outcome.issueRef.rejectedCandidateRef || fresh.importedRejectedCandidate)) {
            const ref = fresh.outcome.issueRef.rejectedCandidateRef;
            const rejected = fresh.importedRejectedCandidate || store.artifact(ref.id);
            if (!rejected || ref && rejected.hash !== ref.hash) fail('FACTION_STRUCTURED_REVIEW_REJECTED_CANDIDATE_MISSING');
            const repaired = await repairSchema(rejected, expanded.context, fresh.parsedRecovery);
            active = repaired.result; activeCapsule = repaired.capsule; schemaRepairScope = repaired.scope;
            hostContractRepairScope = repaired.hostContractRepair || null;
          }
          requireAccepted(active, fresh);
        }
        if (fieldSourceHandoff) await expandSourceContext(fieldSourceHandoff.completion.value, {
          fieldValueSourceHandoff: fieldSourceHandoff, contextCapsuleHash: capsule.hash });
        requireAccepted(active, first);
        const materialize = () => (slotProtocol?.materializeFactionSlotReviewV1 || materializeFactionStructuredReviewV1)({
          providerOutput: active.loop.final, capsule: activeCapsule,
          input, section, draft,
          reviewIndices, requiredSourceRefs: coverageRequiredSourceRefs,
          targets, reviewReasonMaximum,
          reviewSourceMaximum: outputContract.providerSchema.properties.verdicts.items.properties.sourceSlots.maxItems,
          coverageAddressBinding: options.coverageAddressBinding,
          sourceContextExpansion: expansionMapping,
          structuralJsonSchemaRepair: activeCapsule.localIssue.structuralJsonRecovery ? parsedWireMapping : null,
          narrativeCapacityRecord: active.parsedReviewValue?.version
            === FACTION_PARSED_REVIEW_VALUE_BINDING_V2.version ? active.parsedReviewValue
            : active.reviewSoftLimitValue || null,
        });
        let materialized;
        try { materialized = materialize(); }
        catch (error) {
          if (sourceContextExpansion || error.code !== 'FACTION_STRUCTURED_REVIEW_SOURCE_SLOT_INVALID'
            || !options.reviewSourceExpansionBinding) throw error;
          await expandSourceContext(active.loop.final, {
              ...(active.parsedReviewValue ? { parsedReviewValueRef: { hash: active.parsedReviewValue.hash } }
                : active.reviewSoftLimitValue ? { reviewSoftLimitValueRef: { hash: active.reviewSoftLimitValue.hash } }
                : { structuredCandidateRef: active.outcome.candidateRef,
                  structuredRuntimeReceiptRef: active.outcome.receiptRef }),
              contextCapsuleHash: activeCapsule.hash, loop: active.loop,
              ...(active.nativeReviewAmbiguousReplacement
                ? { nativeReviewAmbiguousReplacement: active.nativeReviewAmbiguousReplacement } : {}),
              ...(schemaRepairScope ? { schemaRepairScope, initialStructuredIssueRef: activeInitialIssueRef } : {}),
              ...(hostContractRepairScope
                ? { hostContractRepairScope,
                  initialStructuredIssueRef: activeInitialIssueRef }
                : {}),
            });
          // Exactly one expansion. More missing/unknown evidence is a new
          // typed failure, never a loop or implicit permission to use the card.
          materialized = materialize();
        }
        options.onProgress?.({ role: request.roleId,
          state: "structured_target_review_complete",
          inputTokens: active.outcome.usage.input,
          outputTokens: active.outcome.usage.output,
          estimatedCny: active.outcome.usage.estimatedCny,
          contextCapsuleBytes: activeCapsule.compiledInputBytes,
          schemaRepairApplied: Boolean(schemaRepairScope),
          hostContractRepairApplied: Boolean(hostContractRepairScope),
          sourceContextExpansionApplied: Boolean(sourceContextExpansion),
          schemaRepairImported: Boolean(importedRejectedCandidate),
          outputCapRecoveryApplied: Boolean(outputCapRecoveryReceipt),
          outputCapFailureImported: Boolean(importedOutputCapFailure),
          outputCapSuccessImported: Boolean(importedOutputCapSuccess),
          ...((materialized.receipt.coordinateProof
            ?.narrowedCoverageClaims?.length
            || materialized.receipt.coordinateProof
              ?.duplicateTargetRowsNarrowed?.length
            || materialized.receipt.coordinateProof
              ?.repairedCoverageClaims?.length) ? {
              softAlert: materialized.receipt.coordinateProof
                ?.duplicateTargetRowsNarrowed?.length
                ? 'duplicate_target_rows_narrowed'
                : materialized.receipt.coordinateProof
                  ?.repairedCoverageClaims?.length
                  ? 'coverage_slots_readdressed_or_downgraded'
                : 'non_citing_surplus_coverage_slots_dropped',
              softAlerts: [
                ...(materialized.receipt.coordinateProof
                  ?.duplicateTargetRowsNarrowed?.length
                  ? ['duplicate_target_rows_narrowed'] : []),
                ...(materialized.receipt.coordinateProof
                  ?.narrowedCoverageClaims?.length
                  ? ['non_citing_surplus_coverage_slots_dropped'] : []),
                ...(materialized.receipt.coordinateProof
                  ?.repairedCoverageClaims?.length
                  ? ['coverage_slots_readdressed_or_downgraded'] : []),
              ], action: 'continue',
              ...(materialized.receipt.coordinateProof
                ?.duplicateTargetRowsNarrowed?.length ? {
                  duplicateTargetRowsNarrowed: materialized.receipt
                    .coordinateProof.duplicateTargetRowsNarrowed } : {}),
              ...(materialized.receipt.coordinateProof
                ?.narrowedCoverageClaims?.length ? {
                  narrowedCoverageClaims: materialized.receipt
                    .coordinateProof.narrowedCoverageClaims } : {}),
              ...(materialized.receipt.coordinateProof
                ?.repairedCoverageClaims?.length ? {
                  repairedCoverageClaims: materialized.receipt
                    .coordinateProof.repairedCoverageClaims } : {}) }
            : {}) });
        return store.finish(lease, seal({
          output: materialized.output,
          roleId: fullRoleId,
          sourceDelivery: "proof_carrying_whole_section_review_capsule",
          contextCapsuleHash: activeCapsule.hash,
          initialContextCapsuleHash: capsule.hash,
          ...(options.includeSharedScenarioSources ? { sharedScenarioSourcesIncluded: true } : {}),
          outputContractRef,
          ...(active.parsedReviewValue ? { parsedReviewValueRef: { hash: active.parsedReviewValue.hash } }
            : active.reviewSoftLimitValue ? { reviewSoftLimitValueRef: { hash: active.reviewSoftLimitValue.hash } }
            : { structuredRuntimeReceiptRef: active.outcome.receiptRef,
              structuredCandidateRef: active.outcome.candidateRef }),
          hostMaterializationReceipt: materialized.receipt,
          ...(nativeSlots ? { reviewSlotNamespaceBindingHash: FACTION_REVIEW_SLOT_NAMESPACE_BINDING_V1.hash } : {}),
          ...(first.proof ? { completeReviewImportProof: first.proof } : {}),
          ...(schemaRepairScope ? { schemaRepairScope,
            initialStructuredIssueRef: activeInitialIssueRef } : {}),
          ...(hostContractRepairScope ? { hostContractRepairScope,
            initialStructuredIssueRef: activeInitialIssueRef } : {}),
          ...(sourceContextExpansion ? { sourceContextExpansion } : {}),
          ...(parsedWireRecoveries.length ? { parsedWireRecoveries } : {}),
          ...(parsedReviewValues.length ? { parsedReviewValues } : {}),
          ...(parsedReviewValues.some(record => record.version === FACTION_PARSED_REVIEW_VALUE_BINDING_V2.version)
            ? { parsedReviewNarrativeBindingHash: FACTION_PARSED_REVIEW_VALUE_BINDING_V2.hash } : {}),
          ...(reviewSoftLimitValues.length ? { reviewSoftLimitValues,
            reviewSoftLimitBindingHash: FACTION_REVIEW_SOFT_LIMIT_BINDING_V1.hash } : {}),
          ...(active.nativeReviewAmbiguousReplacement
            ? { nativeReviewAmbiguousReplacement: active.nativeReviewAmbiguousReplacement } : {}),
          ...(outputCapRecoveryReceipt ? { outputCapRecoveryReceipt,
            initialStructuredIssueRef: first.outcome.issueRef } : {}),
          ...(importedRejectedCandidate ? {
            schemaRepairImportReceipt: seal({
              version: "faction_structured_review_schema_repair_import_v1",
              originRejectedCandidateHash: importedRejectedCandidate.hash,
              revalidatedRejectedCandidateHash:
                first.importedRejectedCandidate.hash,
              initialProviderCallsReplayed: 0,
              semanticAcceptanceInherited: false,
              trainingTruth: false,
            }),
          } : {}),
          ...(importedOutputCapSuccess ? {
            outputCapSuccessImportReceipt: seal({
              version:
                "faction_structured_review_output_cap_success_import_receipt_v1",
              originImportHash: importedOutputCapSuccess.hash,
              originAttemptId: importedOutputCapSuccess.originAttemptId,
              originalProviderCallsReplayed: 0,
              semanticAcceptanceInherited: false,
              trainingTruth: false,
            }),
          } : {}),
          toolReadRefs: [], toolTrace: [], loop: active.loop,
          structuredDecodePassed: true,
          semanticAcceptance: false,
          trainingTruth: false,
        }));
      } catch (error) {
        store.release(lease);
        throw error;
      }
    },
  });
}
