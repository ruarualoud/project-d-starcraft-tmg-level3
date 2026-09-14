import { fail, hash, seal, verifySeal, sha256 } from '../skill-production/common.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 } from '../structured-generation/output-contract-registry-v1.mjs';
import { FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V1 } from './faction-review-coverage-address-v1.mjs';
import { FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V2 } from './faction-review-coverage-address-v2.mjs';
import { FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V3 } from './faction-review-coverage-address-v3.mjs';
import { FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V4 } from './faction-review-coverage-address-v4.mjs';
import { FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V5 } from './faction-review-coverage-address-v5.mjs';

export const FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V1 = seal({
  version: 'faction_review_complete_output_import_v1',
  coverageAddressBindingHash: FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V1.hash,
  scope: 'complete_paid_schema_valid_review_before_host_mapping',
  exactContextAndOutputRequired: true, originalProviderCallsReplayed: 0,
  originalSemanticAcceptanceInherited: false, trainingTruth: false });

export const FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V2 = seal({
  ...Object.fromEntries(Object.entries(FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V1).filter(([k]) => k !== 'hash')),
  version: 'faction_review_complete_output_import_v2',
  coverageAddressBindingHash: FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V2.hash });
export const FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V3 = seal({
  ...Object.fromEntries(Object.entries(FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V1).filter(([k]) => k !== 'hash')),
  version: 'faction_review_complete_output_import_v3',
  coverageAddressBindingHash: FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V3.hash });
export const FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V4 = seal({
  ...Object.fromEntries(Object.entries(FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V1).filter(([k]) => k !== 'hash')),
  version: 'faction_review_complete_output_import_v4',
  coverageAddressBindingHash: FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V4.hash });
export const FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V5 = seal({
  ...Object.fromEntries(Object.entries(FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V1).filter(([k]) => k !== 'hash')),
  version: 'faction_review_complete_output_import_v5',
  coverageAddressBindingHash: FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V5.hash });

export function verifyFactionReviewCompleteOutputImportV1({ evidence, roleInput, fullRoleId, contract,
  binding = FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V1 }) {
  verifySeal(binding);
  if (![FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V1.hash, FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V2.hash,
    FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V3.hash, FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V4.hash,
    FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V5.hash].includes(binding.hash))
    fail('FACTION_REVIEW_COMPLETE_IMPORT_BINDING_INVALID');
  const { attempt, candidate, runtimeReceipt } = evidence;
  [candidate, runtimeReceipt].forEach(verifySeal);
  const response = verifySeal(JSON.parse(attempt.response)).value;
  const usage = verifySeal(JSON.parse(attempt.usage)).value;
  const receipt = response.usageReceipt, { receiptHash, ...body } = receipt;
  if (attempt.state !== 'received' || attempt.code !== null || !Number.isSafeInteger(attempt.settled)
    || hash(body) !== receiptHash || receipt.requestId !== attempt.id
    || receipt.physicalAttempts !== 1 || receipt.automaticRetries !== 0
    || hash(receipt.usage) !== hash(usage) || hash(response.output) !== hash(candidate.providerValue)
    || receipt.responseFingerprint !== hash(candidate.providerValue)
    || candidate.invocationHash.slice(0, 48) !== attempt.id.slice('structured-'.length)
    || candidate.providerReceiptHash !== receiptHash || runtimeReceipt.status !== 'accepted'
    || runtimeReceipt.attemptId !== attempt.id || runtimeReceipt.candidateHash !== candidate.hash
    || runtimeReceipt.invocationHash !== candidate.invocationHash || runtimeReceipt.providerReceiptHash !== receiptHash
    || hash(candidate.roleRef) !== hash(roleInput.roleRef)
    || hash(candidate.contextManifestRef) !== hash(roleInput.contextManifestRef)
    || hash(candidate.outputContractRef) !== hash(roleInput.outputContractRef)
    || hash(receipt.outputContractRef) !== hash(roleInput.outputContractRef)
    || !validateStarcraftTmgProviderJsonSchemaValueV1(contract.providerSchema, candidate.providerValue).ok
    || candidate.runtimeAccepted !== false || candidate.published !== false || candidate.trainingTruth !== false
    || runtimeReceipt.semanticAcceptance !== false) fail('FACTION_REVIEW_COMPLETE_IMPORT_EVIDENCE_INVALID');
  return seal({ version: 'faction_review_complete_output_import_proof_v1',
    bindingHash: binding.hash,
    originRunId: attempt.run, originAttemptId: attempt.id, originalRequestHash: attempt.request_hash,
    fullRoleId, roleInputHash: hash(roleInput), candidateHash: candidate.hash, runtimeReceiptHash: runtimeReceipt.hash,
    providerReceiptHash: receiptHash, originalUsage: usage, originalSettledMicros: attempt.settled,
    providerCalls: 0, semanticAcceptanceInherited: false, trainingTruth: false });
}

export async function runFactionReviewCompleteOutputImportV1({ evidence, roleInput, fullRoleId, contract, dsh, binding }) {
  const proof = verifyFactionReviewCompleteOutputImportV1({ evidence, roleInput, fullRoleId, contract, binding });
  const command = { action: 'finish', content: evidence.candidate.providerValue };
  const loop = await dsh.run({ task: 'Reuse complete original paid review for exact Host address validation',
    callModel: async () => ({ command, receiptHash: evidence.runtimeReceipt.hash,
      usage: { inputUnits: 0, outputUnits: 0, totalUnits: 0, inputCacheHitUnits: 0, inputCacheMissUnits: 0, reasoningOutputUnits: 0 } }),
    toolPort: { execute: () => fail('FACTION_REVIEW_COMPLETE_IMPORT_TOOLS_FORBIDDEN'), trace: () => [], readRefs: () => [] },
    limits: { maxCalls: 1, maxTools: 0, maxOutput: 8192, maxWallMs: 180000 } });
  verifySeal(loop);
  if (loop.runtimeBinding?.hash !== dsh.binding.hash || !loop.sandboxReceipt || loop.calls !== 1
    || loop.transcript.length !== 1 || loop.toolTrace.length || loop.directNetworkUsed !== false
    || loop.transcript[0].receiptHash !== evidence.runtimeReceipt.hash
    || loop.transcript[0].commandHash !== sha256(JSON.stringify(command))
    || hash(loop.final) !== hash(evidence.candidate.providerValue)) fail('FACTION_REVIEW_COMPLETE_IMPORT_DSH_DRIFT');
  return { proof, loop, contextManifestRef: evidence.candidate.contextManifestRef,
    outcome: { status: 'accepted', candidateRef: { id: proof.originAttemptId + '.candidate', hash: evidence.candidate.hash },
      receiptRef: { id: proof.originAttemptId + '.runtime-receipt', hash: evidence.runtimeReceipt.hash },
      usage: { input: 0, output: 0, total: 0, cacheHit: 0, cacheMiss: 0, estimatedCny: 0 } } };
}
