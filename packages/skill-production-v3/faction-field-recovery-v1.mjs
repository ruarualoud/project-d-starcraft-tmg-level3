import { hash, seal, verifySeal, sha256, fail } from '../skill-production/common.mjs';
import { createStructuredFieldCodecV1, STRUCTURED_FIELD_CODEC_BINDING_V1,
  STRUCTURED_FIELD_CODEC_BINDING_V2, STRUCTURED_FIELD_CODEC_BINDING_V3 } from '../structured-generation/field-codec-v1.mjs';
import { createFactionReviewSchemaRepairContextCapsuleV1 } from './faction-review-context-capsule-v1.mjs';
import { verifyFactionStructuredReviewSchemaRepairScopeV1 } from './faction-structured-review-runtime-v1.mjs';
import { verifyFactionNativeSlotSchemaFailureV1, materializeFactionSlotReviewV1 } from './faction-review-slot-namespace-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as contract,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V6 as contractRef,
  FACTION_REVIEW_SLOT_NAMESPACE_BINDING_V1 as slotBinding } from '../../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';

export const FACTION_FIELD_RECOVERY_BINDING_V1 = seal({
  version: 'faction_field_recovery_v1', fieldCodecBindingHash: STRUCTURED_FIELD_CODEC_BINDING_V1.hash,
  outputContractRef: contractRef, source: 'actual_paid_schema_failure_with_optional_paid_bounded_repair',
  originalFailedAttemptsPreserved: true, sourceReviewRequired: true,
  providerCalls: 0, semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
});
export const FACTION_FIELD_RECOVERY_BINDING_V2 = seal({
  version: 'faction_field_recovery_v2', fieldCodecBindingHash: STRUCTURED_FIELD_CODEC_BINDING_V2.hash,
  outputContractRef: contractRef, source: 'actual_paid_schema_failure_with_versioned_representation_empty_sidecar_or_optional_paid_bounded_repair',
  originalFailedAttemptsPreserved: true, sourceReviewRequired: true,
  exactEmptyStringHasNoSemanticContent: true,
  providerCalls: 0, semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
});
export const FACTION_FIELD_RECOVERY_BINDING_V3 = seal({
  version: 'faction_field_recovery_v3', fieldCodecBindingHash: STRUCTURED_FIELD_CODEC_BINDING_V3.hash,
  outputContractRef: contractRef, source: 'actual_paid_schema_failure_with_audited_unknown_field_projection_or_optional_paid_bounded_repair',
  originalFailedAttemptsPreserved: true, sourceReviewRequired: true,
  unknownModelFieldsCannotSupplyRequiredContent: true,
  providerCalls: 0, semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
});
const codecs = new Map([
  [FACTION_FIELD_RECOVERY_BINDING_V1.hash,
    createStructuredFieldCodecV1(contract)],
  [FACTION_FIELD_RECOVERY_BINDING_V2.hash,
    createStructuredFieldCodecV1(contract,
      { binding: STRUCTURED_FIELD_CODEC_BINDING_V2 })],
  [FACTION_FIELD_RECOVERY_BINDING_V3.hash,
    createStructuredFieldCodecV1(contract,
      { binding: STRUCTURED_FIELD_CODEC_BINDING_V3 })],
]);
const evidenceRef = evidence => ({ ownerRunId: evidence.attempt.run, attemptId: evidence.attempt.id,
  originalRowHash: hash(evidence.attempt), rejectedCandidateHash: evidence.rejected.hash,
  issueHash: evidence.issue.hash, ownerRecipeHash: evidence.ownerRecipe.hash,
  capabilityReceiptHash: evidence.capability.receiptHash });

// Evidence checker only. The caller must re-read the actual paid owners from
// the verified ancestor chain; an embedded proof cannot authenticate itself.
export function materializeFactionFieldRecoveryV1({ input, prepared,
  originalEvidence, repairEvidence = null,
  recoveryBinding = FACTION_FIELD_RECOVERY_BINDING_V3 }) {
  verifySeal(recoveryBinding);
  const codec = codecs.get(recoveryBinding.hash);
  if (!codec) fail('FACTION_FIELD_RECOVERY_BINDING_UNSUPPORTED');
  const mapping = { ...prepared.mapping, input, capsule: prepared.capsule,
    reviewReasonMaximum: 16384, reviewSourceMaximum: 128 };
  if (prepared.roleInput.outputContractRef.hash !== contractRef.hash || prepared.mapping.input.hash !== input.hash)
    fail('FACTION_FIELD_RECOVERY_INPUT_DRIFT');
  const originalProof = verifyFactionNativeSlotSchemaFailureV1({ ...mapping, evidence: originalEvidence });
  let selected = originalEvidence, scope = null, repairProof = null, repairContextHash = null;
  if (repairEvidence) {
    const expectedId = prepared.capsule.roleRef.id + '.schema-repair.1';
    const roleRef = { id: expectedId, version: 'structured-review-v1', hash: hash(expectedId + '.structured-review-v1') };
    const capsule = createFactionReviewSchemaRepairContextCapsuleV1({ capsule: prepared.capsule,
      rejectedCandidate: originalEvidence.rejected, roleRef });
    repairProof = verifyFactionNativeSlotSchemaFailureV1({ ...mapping, capsule, evidence: repairEvidence });
    repairContextHash = capsule.hash;
    selected = repairEvidence;
  }
  const inspection = codec.inspect(selected.rejected.providerValue);
  if (inspection.status !== 'shape_ready') fail(inspection.status === 'needs_values'
    ? 'FACTION_FIELD_RECOVERY_SOURCE_COMPLETION_REQUIRED' : 'FACTION_FIELD_RECOVERY_ADJUDICATION_REQUIRED');
  if (!inspection.sidecar.length) fail('FACTION_FIELD_RECOVERY_NOT_NEEDED');
  const completion = codec.complete(inspection);
  codec.verify({ originalValue: selected.rejected.providerValue, completion });
  if (repairEvidence) scope = verifyFactionStructuredReviewSchemaRepairScopeV1({
    rejectedCandidate: originalEvidence.rejected, repairedOutput: completion.value });
  const mapped = materializeFactionSlotReviewV1({ ...mapping, providerOutput: completion.value });
  return seal({ version: recoveryBinding.version.replace('_recovery_', '_materialization_'),
    bindingHash: recoveryBinding.hash,
    fullRoleId: prepared.fullRoleId, roleInputHash: hash(prepared.roleInput), inputHash: input.hash,
    initialContextHash: prepared.capsule.hash, repairContextHash,
    originalEvidenceRef: evidenceRef(originalEvidence), repairEvidenceRef: repairEvidence ? evidenceRef(repairEvidence) : null,
    originalProof, repairProof, originalRepairScope: scope, completion,
    output: mapped.output, hostMappingReceipt: mapped.receipt,
    originalUsage: [originalEvidence, ...(repairEvidence ? [repairEvidence] : [])].map(e => ({
      ownerRunId: e.attempt.run, attemptId: e.attempt.id,
      usage: verifySeal(JSON.parse(e.attempt.usage)).value, settledMicros: e.attempt.settled })),
    existingPaidSemanticCompletionUsed: Boolean(repairEvidence),
    originalProviderSchemaPassed: false, newProviderCalls: 0,
    semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false });
}

export function verifyFactionFieldRecoveredRoleV1({ value, input, prepared, originalEvidence, repairEvidence = null, dshBindingHash }) {
  verifySeal(value); verifySeal(value.loop);
  // `protocol` is the stable persisted envelope. The sealed binding selects
  // the codec policy, so adding a codec version does not fan out into every
  // replay consumer that understands this envelope.
  const recoveryBinding = value.fieldRecoveryBindingHash === FACTION_FIELD_RECOVERY_BINDING_V1.hash
    ? FACTION_FIELD_RECOVERY_BINDING_V1
    : value.fieldRecoveryBindingHash === FACTION_FIELD_RECOVERY_BINDING_V2.hash
      ? FACTION_FIELD_RECOVERY_BINDING_V2
      : value.fieldRecoveryBindingHash === FACTION_FIELD_RECOVERY_BINDING_V3.hash
        ? FACTION_FIELD_RECOVERY_BINDING_V3 : null;
  const protocols = recoveryBinding === FACTION_FIELD_RECOVERY_BINDING_V2
    ? [FACTION_FIELD_RECOVERY_BINDING_V1.version, FACTION_FIELD_RECOVERY_BINDING_V2.version]
    : [FACTION_FIELD_RECOVERY_BINDING_V1.version];
  if (!protocols.includes(value.protocol))
    fail('FACTION_FIELD_RECOVERY_CONSUMER_DRIFT');
  if (!recoveryBinding) fail('FACTION_FIELD_RECOVERY_CONSUMER_DRIFT');
  const materialized = materializeFactionFieldRecoveryV1({ input, prepared,
    originalEvidence, repairEvidence, recoveryBinding });
  const command = { action: 'finish', content: materialized.output }, loop = value.loop;
  if (value.roleId !== prepared.fullRoleId || hash(value.materialization) !== hash(materialized)
    || hash(value.output) !== hash(materialized.output) || hash(value.outputContractRef) !== hash(contractRef)
    || value.initialContextCapsuleHash !== prepared.capsule.hash || value.contextCapsuleHash !== prepared.capsule.hash
    || value.fieldRecoveryBindingHash !== recoveryBinding.hash
    || value.reviewSlotNamespaceBindingHash !== slotBinding.hash
    || value.sourceDelivery !== 'proof_carrying_whole_section_review_capsule'
    || value.sharedScenarioSourcesIncluded !== (prepared.capsule.immutableBase.sharedScenarioSourcesIncluded === true)
    || value.structuredDecodePassed !== true || value.originalProviderSchemaPassed !== false
    || value.providerCalls !== 0 || value.semanticAcceptance !== false || value.runtimeAccepted !== false || value.trainingTruth !== false
    || loop.runtimeBinding?.hash !== dshBindingHash || !loop.sandboxReceipt || loop.calls !== 1
    || loop.directNetworkUsed !== false || loop.trainingTruth !== false || loop.transcript.length !== 1
    || loop.toolTrace.length !== 0 || loop.transcript[0].receiptHash !== materialized.hash
    || loop.transcript[0].commandHash !== sha256(JSON.stringify(command)) || hash(loop.final) !== hash(value.output))
    fail('FACTION_FIELD_RECOVERY_CONSUMER_DRIFT');
  return { providerReceiptHashes: [materialized.originalProof.providerReceiptHash,
    ...(materialized.repairProof ? [materialized.repairProof.providerReceiptHash] : [])],
    importedCanaryHash: null, semanticAcceptance: false };
}

export function createFactionFieldRecoveryRuntimeV1({ input, store, dsh, readEvidence }) {
  verifySeal(input);
  if (!dsh || typeof readEvidence !== 'function') fail('FACTION_FIELD_RECOVERY_DEPENDENCY_REQUIRED');
  const payment = () => {
    if (store.globalSummary().attempts.some(row => row.code === 'PROVIDER_PAYMENT_REQUIRED'))
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  };
  return Object.freeze({ async run(prepared) {
    payment();
    const evidence = await readEvidence(prepared);
    const materialization = materializeFactionFieldRecoveryV1({ input, prepared, ...evidence });
    const lease = store.acquire(prepared.fullRoleId + '.field-codec-v1', {
      bindingHash: FACTION_FIELD_RECOVERY_BINDING_V3.hash, roleInputHash: hash(prepared.roleInput),
      materializationHash: materialization.hash });
    if (lease.cached) {
      const value = verifySeal(lease.artifact);
      verifyFactionFieldRecoveredRoleV1({ value, input, prepared, ...evidence, dshBindingHash: dsh.binding.hash });
      return value;
    }
    try {
      payment();
      const loop = await dsh.run({ task: 'Import authenticated paid review through the generic field codec; retain every source judgment and extension sidecar.',
        callModel: async () => ({ command: { action: 'finish', content: materialization.output }, receiptHash: materialization.hash,
          usage: { inputUnits: 0, outputUnits: 0, totalUnits: 0, inputCacheHitUnits: 0, inputCacheMissUnits: 0, reasoningOutputUnits: 0 } }),
        toolPort: { execute: () => fail('FACTION_FIELD_RECOVERY_TOOLS_FORBIDDEN'), trace: () => [], readRefs: () => [] },
        limits: { maxCalls: 1, maxTools: 0, maxOutput: 8192, maxWallMs: 180000 } });
      payment();
      // Re-read paid provenance before persistence, including after a slow DSH job.
      const fresh = await readEvidence(prepared);
      const value = seal({ roleId: prepared.fullRoleId, protocol: FACTION_FIELD_RECOVERY_BINDING_V1.version,
        fieldRecoveryBindingHash: FACTION_FIELD_RECOVERY_BINDING_V3.hash,
        reviewSlotNamespaceBindingHash: slotBinding.hash,
        outputContractRef: contractRef, output: materialization.output, materialization, loop,
        contextCapsuleHash: prepared.capsule.hash, initialContextCapsuleHash: prepared.capsule.hash,
        sourceDelivery: 'proof_carrying_whole_section_review_capsule',
        sharedScenarioSourcesIncluded: prepared.capsule.immutableBase.sharedScenarioSourcesIncluded === true,
        structuredDecodePassed: true, originalProviderSchemaPassed: false, providerCalls: 0,
        semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false });
      verifyFactionFieldRecoveredRoleV1({ value, input, prepared, ...fresh, dshBindingHash: dsh.binding.hash });
      return store.finish(lease, value);
    } catch (error) { store.release(lease); throw error; }
  } });
}
