import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { createStructuredFieldCodecV1 } from '../structured-generation/field-codec-v1.mjs';
import { verifyFactionNativeSlotSchemaFailureV1, materializeFactionSlotReviewV1 } from './faction-review-slot-namespace-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as contract,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V6 as contractRef } from '../../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';

export const FACTION_REVIEW_CONTRACT_PROJECTION_BINDING_V1 = seal({
  version: 'faction_review_contract_projection_v1', outputContractRef: contractRef,
  emptyCollectionAuthority: 'authenticated_host_task_has_zero_coverage_obligations',
  nonNullExtensionPolicy: 'retain_bounded_administrative_ownership_markers_in_sidecar_only',
  fieldNameWhitelist: false, arbitraryProseStillRequiresAdjudication: true,
  noDeclaredValueOverwrite: true, noJudgmentOrSourceInference: true,
  originalFailedAttemptsAndSubsequentCostsPreserved: true,
  providerCalls: 0, semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
});
const binding = FACTION_REVIEW_CONTRACT_PROJECTION_BINDING_V1;
const codec = createStructuredFieldCodecV1(contract);
const invalid = suffix => fail('FACTION_REVIEW_CONTRACT_PROJECTION_' + suffix);

// Classify a tiny administrative language, not arbitrary natural-language
// assertions. Names are irrelevant: changing note/Note/_note cannot bypass or
// break it. Retained markers are NEVER used as evidence of actual ownership.
export function isAdministrativeOwnershipMarkerV1(value) {
  return typeof value === 'string' && value.length <= 40
    && /^(?:host|schema|system)[ _-](?:owned|managed|assigned|mapped)$/iu.test(value);
}

export function projectFactionReviewContractValueV1({ providerValue, requiredSourceRefs }) {
  if (!Array.isArray(requiredSourceRefs) || requiredSourceRefs.some(s => typeof s !== 'string' || !s)) invalid('OBLIGATIONS');
  const original = codec.inspect(providerValue);
  let projected = structuredClone(original.originalValue);
  const sidecar = [], changes = [];
  for (const entry of original.sidecar) {
    if (entry.reason === 'host_control_field') invalid('CONTROL_FIELD');
    const annotation = entry.reason === 'unconsumed_semantic_content' && isAdministrativeOwnershipMarkerV1(entry.value);
    if (entry.reason !== 'unknown_null_extension' && !annotation) invalid('ADJUDICATION_REQUIRED');
    let parent = projected;
    for (const part of entry.parts.slice(0, -1)) parent = parent[part];
    const key = entry.parts.at(-1);
    if (!Object.hasOwn(parent, key) || hash(parent[key]) !== entry.valueHash) invalid('EXTENSION_DRIFT');
    delete parent[key];
    sidecar.push({ ...entry, classification: annotation ? 'administrative_ownership_marker_not_authority' : 'unknown_null_extension',
      retainedVerbatim: true, usedAsEvidence: false });
    changes.push({ pointer: entry.pointer, operation: 'retain_extension_outside_typed_value', valueHash: entry.valueHash });
  }
  let emptyCoverageSupplied = false;
  if (projected && typeof projected === 'object' && !Array.isArray(projected)
    && !Object.hasOwn(projected, 'coverage') && requiredSourceRefs.length === 0) {
    // This is an empty task set, not a positive source-coverage judgment.
    projected.coverage = []; emptyCoverageSupplied = true;
    changes.push({ pointer: '/coverage', operation: 'materialize_empty_host_task_set', obligationSetHash: hash(requiredSourceRefs) });
  }
  if (!emptyCoverageSupplied && !sidecar.some(s => s.classification === 'administrative_ownership_marker_not_authority'))
    invalid('NOT_NEEDED'); // Existing null-only V1 remains frozen and usable.
  if (changes.length > 64) invalid('CHANGE_LIMIT');
  const inspected = codec.inspect(projected);
  if (inspected.status !== 'shape_ready' || inspected.sidecar.length) invalid('REMAINING_VALUE_TASK');
  const completion = codec.complete(inspected);
  return seal({ version: binding.version + '.projection', bindingHash: binding.hash,
    originalValueHash: original.originalValueHash, originalValidation: original.originalValidation,
    projectedValue: completion.value, projectedValueHash: completion.valueHash,
    requiredSourceRefsHash: hash(requiredSourceRefs), requiredSourceCount: requiredSourceRefs.length,
    emptyCoverageSupplied, sidecar, changes, validation: completion.validation,
    declaredExistingValuesChanged: false, annotationUsedAsAuthority: false,
    originalProviderResultReclassified: false, providerCalls: 0,
    semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false });
}

export function materializeFactionReviewContractProjectionV1({ input, prepared, originalEvidence, repairEvidence = null }) {
  if (repairEvidence) invalid('PAID_REPAIR_SCOPE_UNSUPPORTED');
  const options = { ...prepared.mapping, input, capsule: prepared.capsule,
    reviewReasonMaximum: 16384, reviewSourceMaximum: 128 };
  const originalProof = verifyFactionNativeSlotSchemaFailureV1({ ...options, evidence: originalEvidence });
  const projection = projectFactionReviewContractValueV1({ providerValue: originalEvidence.rejected.providerValue,
    requiredSourceRefs: prepared.mapping.requiredSourceRefs });
  const mapped = materializeFactionSlotReviewV1({ ...options, providerOutput: projection.projectedValue });
  const e = originalEvidence;
  return seal({ version: binding.version + '.materialization', bindingHash: binding.hash,
    fullRoleId: prepared.fullRoleId, roleInputHash: hash(prepared.roleInput), inputHash: input.hash,
    initialContextHash: prepared.capsule.hash, originalEvidenceRef: {
      ownerRunId: e.attempt.run, attemptId: e.attempt.id, originalRowHash: hash(e.attempt),
      rejectedCandidateHash: e.rejected.hash, issueHash: e.issue.hash, ownerRecipeHash: e.ownerRecipe.hash,
      capabilityReceiptHash: e.capability.receiptHash }, repairEvidenceRef: null,
    originalProof, projection, output: mapped.output, hostMappingReceipt: mapped.receipt,
    originalUsage: verifySeal(JSON.parse(e.attempt.usage)).value, originalSettledMicros: e.attempt.settled,
    originalProviderSchemaPassed: false, newProviderCalls: 0,
    semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false });
}
