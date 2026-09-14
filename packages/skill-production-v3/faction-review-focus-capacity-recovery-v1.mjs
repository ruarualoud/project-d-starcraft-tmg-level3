import { fail, hash, seal, verifySeal, sha256 } from '../skill-production/common.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V5 as contract,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V5 as outputContractRef } from '../../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 } from '../structured-generation/output-contract-registry-v1.mjs';
import { materializeFactionStructuredReviewV1 } from './faction-structured-review-runtime-v1.mjs';

// A Host validation version, not a relabelled Provider contract/capability.
// The paid V5 failure stays a failure. No focus, judgment or source is removed.
export const FACTION_REVIEW_FOCUS_CAPACITY_RECOVERY_BINDING_V1 = seal({
  version: 'faction_review_focus_capacity_recovery_v1', outputContractRef,
  acceptedOverflowPaths: ['$.verdicts[n].focus', '$.verdicts[n].focus[n].quote'],
  maximumFocus: 128, maximumQuote: 16384, exactFieldAndSourceBindingRequired: true,
  allOriginalEvidencePreserved: true, judgmentsChanged: false,
  providerContractChanged: false, originalFailureRelabelled: false,
  semanticAcceptanceInherited: false, trainingTruth: false });

export function materializeReviewFocusCapacityV1({ input, prepared, evidence }) {
  const { attempt, issue, rejected } = evidence;
  [input, issue, rejected, prepared.capsule].forEach(verifySeal);
  const receipt = verifySeal(JSON.parse(attempt.response)).value;
  const usage = verifySeal(JSON.parse(attempt.usage)).value;
  const { receiptHash, ...receiptBody } = receipt;
  const original = validateStarcraftTmgProviderJsonSchemaValueV1(contract.providerSchema, rejected.providerValue);
  const overflowOnly = original.issues.length > 0 && original.issues.every(row =>
    /^\$\.verdicts\[[0-9]+\]\.focus$/u.test(row.path) && row.code === 'array_too_long'
    || /^\$\.verdicts\[[0-9]+\]\.focus\[[0-9]+\]\.quote$/u.test(row.path) && row.code === 'string_too_long');
  if (!overflowOnly) fail('FACTION_REVIEW_FOCUS_CAPACITY_NOT_APPLICABLE');
  if (attempt.state !== 'failed' || attempt.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
    || !Number.isSafeInteger(attempt.settled) || hash(receiptBody) !== receiptHash
    || receipt.status !== 200 || receipt.incompleteReason !== null || !receipt.usageKnown
    || receipt.physicalAttempts !== 1 || receipt.automaticRetries !== 0
    || hash(receipt.usage) !== hash(usage) || hash(receipt.schemaIssues) !== hash(original.issues)
    || hash(rejected.validation) !== hash(original)
    || issue.safeReceiptHash !== receiptHash || rejected.safeReceiptHash !== receiptHash
    || issue.rejectedCandidateRef?.hash !== rejected.hash || issue.invocationHash !== rejected.invocationHash
    || attempt.id !== 'structured-' + rejected.invocationHash.slice(0, 48)
    || hash(receipt.outputContractRef) !== hash(outputContractRef)
    || hash(rejected.outputContractRef) !== hash(outputContractRef)
    || hash(prepared.roleInput.outputContractRef) !== hash(outputContractRef)
    || hash(rejected.roleRef) !== hash(prepared.roleInput.roleRef)
    || hash(rejected.contextManifestRef) !== hash(prepared.roleInput.contextManifestRef)
    || prepared.capsule.hash !== prepared.roleInput.contextManifestRef.hash)
    fail('FACTION_REVIEW_FOCUS_CAPACITY_EVIDENCE_INVALID');
  const schema = structuredClone(contract.providerSchema);
  schema.properties.verdicts.items.properties.focus.maxItems = 128;
  schema.properties.verdicts.items.properties.focus.items.properties.quote.maxLength = 16384;
  if (!validateStarcraftTmgProviderJsonSchemaValueV1(schema, rejected.providerValue).ok)
    fail('FACTION_REVIEW_FOCUS_CAPACITY_HOST_SCHEMA_INVALID');
  // Also enforces the exact finite fields of each target, source scope and
  // verbatim original long-quote binding BEFORE any display-prefix operation.
  const mapped = materializeFactionStructuredReviewV1({ providerOutput: rejected.providerValue,
    ...prepared.mapping, capsule: prepared.capsule, input, reviewReasonMaximum: 16384, reviewSourceMaximum: 128,
    coverageAddressBinding: prepared.coverageAddressBinding });
  return seal({ version: 'faction_review_focus_capacity_materialization_v1',
    bindingHash: FACTION_REVIEW_FOCUS_CAPACITY_RECOVERY_BINDING_V1.hash,
    inputHash: input.hash, fullRoleId: prepared.fullRoleId, roleInputHash: hash(prepared.roleInput),
    originRunId: attempt.run, originAttemptId: attempt.id, originalRequestHash: attempt.request_hash,
    originalIssueHash: issue.hash, rejectedCandidateHash: rejected.hash, originalFailureReceiptHash: receiptHash,
    originalOutputHash: hash(rejected.providerValue), output: mapped.output, hostMappingReceipt: mapped.receipt,
    originalUsage: usage, originalSettledMicros: attempt.settled,
    originalProviderSchemaPassed: false, hostCapacityAndExactEvidenceChecksPassed: true,
    originalFocusCounts: rejected.providerValue.verdicts.map(v => v.focus.length),
    evidenceDropped: false, judgmentsChanged: false, providerCalls: 0,
    semanticAcceptanceInherited: false, trainingTruth: false });
}

export async function recoverReviewFocusCapacityV1({ input, prepared, evidence, dsh }) {
  const materialization = materializeReviewFocusCapacityV1({ input, prepared, evidence });
  const command = { action: 'finish', content: materialization.output };
  const loop = await dsh.run({ task: 'Import unchanged review with exact field-bound Host focus capacity validation',
    callModel: async () => ({ command, receiptHash: materialization.hash,
      usage: { inputUnits: 0, outputUnits: 0, totalUnits: 0, inputCacheHitUnits: 0, inputCacheMissUnits: 0, reasoningOutputUnits: 0 } }),
    toolPort: { execute: () => fail('FACTION_REVIEW_FOCUS_RECOVERY_TOOLS_FORBIDDEN'), trace: () => [], readRefs: () => [] },
    limits: { maxCalls: 1, maxTools: 0, maxOutput: 8192, maxWallMs: 180000 } });
  const value = seal({ roleId: prepared.fullRoleId,
    protocol: FACTION_REVIEW_FOCUS_CAPACITY_RECOVERY_BINDING_V1.version,
    output: materialization.output, outputContractRef, contextManifestRef: prepared.roleInput.contextManifestRef,
    contextCapsuleHash: prepared.capsule.hash, initialContextCapsuleHash: prepared.capsule.hash,
    sourceDelivery: 'proof_carrying_whole_section_review_capsule',
    sharedScenarioSourcesIncluded: prepared.includeSharedScenarioSources === true,
    hostMaterialization: materialization, hostMaterializationReceipt: materialization.hostMappingReceipt,
    loop, structuredDecodePassed: true, originalProviderSchemaPassed: false,
    semanticAcceptance: false, providerCalls: 0, toolTrace: [], toolReadRefs: [], trainingTruth: false });
  verifyReviewFocusCapacityImportedRoleV1({ value, input, prepared, evidence, dshBindingHash: dsh.binding.hash });
  return value;
}

export function verifyReviewFocusCapacityImportedRoleV1({ value, input, prepared, evidence, dshBindingHash }) {
  verifySeal(value); verifySeal(value.loop);
  const materialization = materializeReviewFocusCapacityV1({ input, prepared, evidence });
  const loop = value.loop, command = { action: 'finish', content: materialization.output };
  if (value.protocol !== FACTION_REVIEW_FOCUS_CAPACITY_RECOVERY_BINDING_V1.version
    || value.hostMaterialization?.hash !== materialization.hash || hash(value.output) !== hash(materialization.output)
    || value.roleId !== prepared.fullRoleId || value.providerCalls !== 0 || value.semanticAcceptance !== false
    || value.originalProviderSchemaPassed !== false || value.hostMaterializationReceipt?.hash !== materialization.hostMappingReceipt.hash
    || value.sharedScenarioSourcesIncluded !== (prepared.includeSharedScenarioSources === true)
    || loop.runtimeBinding?.hash !== dshBindingHash || !loop.sandboxReceipt || loop.calls !== 1
    || loop.directNetworkUsed !== false || loop.trainingTruth !== false || loop.transcript.length !== 1
    || loop.toolTrace.length || loop.transcript[0].receiptHash !== materialization.hash
    || loop.transcript[0].commandHash !== sha256(JSON.stringify(command))
    || hash(loop.final) !== hash(materialization.output)) fail('FACTION_REVIEW_FOCUS_CAPACITY_CONSUMER_DRIFT');
  return { providerReceiptHashes: [materialization.originalFailureReceiptHash], importedCanaryHash: null };
}
