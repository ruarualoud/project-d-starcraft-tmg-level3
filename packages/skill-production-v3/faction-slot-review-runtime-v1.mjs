import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { contextManifestRefStarcraftTmgV1 } from '../structured-generation/context-capsule-v1.mjs';
import { createFactionReviewContextCapsuleV1 } from './faction-review-context-capsule-v1.mjs';
import { createFactionSlotReviewContextV1, recoverFactionExplicitSlotReviewV1 } from './faction-review-slot-namespace-v1.mjs';
import { STARCRAFT_TMG_FACTION_STRUCTURED_REVIEW_RUNTIME_VERSION } from './faction-structured-review-runtime-v1.mjs';
import { runFactionReviewCompleteOutputImportV1,
  FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V4 } from './faction-review-complete-output-import-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V5,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V5 } from '../../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V6,
  FACTION_REVIEW_SLOT_NAMESPACE_BINDING_V1 as binding } from '../../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';

const canonical = id => id.replace(/\.source-evidence-v1\.[a-f0-9]{20}$/u, '');
const rolePattern = /\.review-target-batch-v1\.(supportive|adversarial)\.([0-3])(?:\.phase-seed-v1\.[a-f0-9]{20})?\.([0-9]+)(?:\.source-evidence-v1\.[a-f0-9]{20})?$/u;

export function prepareFactionSlotReviewRoleV1({ input, request, executionPolicy, legacy = false }) {
  const match = rolePattern.exec(request.roleId || '');
  if (!match) return null;
  verifySeal(input); verifySeal(request.packet);
  const w = request.workspace;
  if (w?.inputHash !== input.hash) fail('FACTION_REVIEW_SLOT_NAMESPACE_INPUT_DRIFT');
  const roleId = canonical(request.roleId);
  const roleRef = { id: roleId, version: 'structured-review-v1', hash: hash(roleId + '.structured-review-v1') };
  const outputContractRef = legacy ? STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V5
    : STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V6;
  const capsule = (legacy ? createFactionReviewContextCapsuleV1 : createFactionSlotReviewContextV1)({
    factionInput: input, section: w.section, draft: w.draft, reviewIndices: w.reviewIndices,
    coverageRequiredSourceRefs: w.coverageRequiredSourceRefs, targets: w.outputRequestAtEnd.targetContract,
    roleRef, outputContractRef, route: match[1], includeSharedScenarioSources: true });
  return { fullRoleId: request.packet.id + '.' + request.roleId, capsule,
    roleInput: { version: STARCRAFT_TMG_FACTION_STRUCTURED_REVIEW_RUNTIME_VERSION,
      packetHash: request.packet.hash, roleRef, contextManifestRef: contextManifestRefStarcraftTmgV1(capsule),
      outputContractRef, executionPolicyRef: { id: 'policy.faction-target-review.production',
        version: '2026.09.06.1', hash: hash(executionPolicy) }, semanticAcceptanceInherited: false },
    mapping: { input, section: w.section, draft: w.draft, reviewIndices: w.reviewIndices,
      requiredSourceRefs: w.coverageRequiredSourceRefs, targets: w.outputRequestAtEnd.targetContract } };
}

// Immutable routing is supplied by the verified continuation manifest. An old
// lease keeps its original input/contract. Only genuinely new roles use V6.
// Evidence is re-read per uncached recovery; no in-memory candidate is treated
// as proof of a paid owner. This wrapper has no Provider/credential port.
export function createFactionSlotReviewRuntimeV1({ input, legacyRuntime, nativeRuntime = null,
  legacyRoleIds, recoveryOrigins = [], readRecoveryEvidence, store, dsh = null,
  executionPolicy, reviewSlotNamespaceBinding, onUncached, onProgress }) {
  if (verifySeal(reviewSlotNamespaceBinding).hash !== binding.hash || !Array.isArray(legacyRoleIds))
    fail('FACTION_REVIEW_SLOT_NAMESPACE_RUNTIME_BINDING_REQUIRED');
  const old = new Set(legacyRoleIds.map(canonical));
  if (old.size !== legacyRoleIds.length || recoveryOrigins.some((o, i) =>
    !o.roleRefHash || !o.contextHash || !o.ownerRunId || !o.attemptId
    || recoveryOrigins.slice(0, i).some(p => p.roleRefHash === o.roleRefHash)))
    fail('FACTION_REVIEW_SLOT_NAMESPACE_ROUTE_DUPLICATE');
  return Object.freeze({ async role(request) {
    if (!rolePattern.test(request.roleId || '')) return legacyRuntime.role(request);
    if (store.globalSummary?.().attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED'))
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    const roleRefHash = hash(canonical(request.roleId) + '.structured-review-v1');
    const origin = recoveryOrigins.find(row => row.roleRefHash === roleRefHash);
    if (!origin && old.has(canonical(request.packet.id + '.' + request.roleId))) return legacyRuntime.role(request);
    if (!origin && nativeRuntime) return nativeRuntime.role(request);
    const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy, legacy: Boolean(origin) });
    if (origin && origin.contextHash !== prepared.capsule.hash)
      fail('FACTION_REVIEW_SLOT_NAMESPACE_RECOVERY_CONTEXT_DRIFT');
    const lease = store.acquire(prepared.fullRoleId, prepared.roleInput);
    if (lease.cached) return verifySeal(lease.artifact);
    try {
      if (!origin) {
        onUncached?.({ roleId: prepared.fullRoleId, ...prepared });
        fail('FACTION_PREFLIGHT_FIRST_SLOT_REVIEW_UNCACHED_ROLE');
      }
      if (!readRecoveryEvidence) fail('FACTION_REVIEW_SLOT_NAMESPACE_EVIDENCE_READER_REQUIRED');
      const evidence = await readRecoveryEvidence(origin);
      if (evidence.attempt.run !== origin.ownerRunId || evidence.attempt.id !== origin.attemptId)
        fail('FACTION_REVIEW_SLOT_NAMESPACE_PAID_OWNER_DRIFT');
      const recovered = recoverFactionExplicitSlotReviewV1({ ...prepared.mapping, capsule: prepared.capsule,
        evidence, providerOutput: evidence.candidate.providerValue,
        reviewReasonMaximum: STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V5.providerSchema.properties.verdicts.items.properties.reason.maxLength });
      if (!dsh) {
        onUncached?.({ roleId: prepared.fullRoleId, ...prepared, recovered: recovered.receipt });
        fail('FACTION_PREFLIGHT_SLOT_REVIEW_RECOVERY_REQUIRED');
      }
      const imported = await runFactionReviewCompleteOutputImportV1({ evidence,
        roleInput: prepared.roleInput, fullRoleId: prepared.fullRoleId,
        contract: STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V5, dsh,
        binding: FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V4 });
      const value = store.finish(lease, seal({ roleId: prepared.fullRoleId, output: recovered.output,
        sourceDelivery: 'proof_carrying_whole_section_review_capsule',
        contextCapsuleHash: prepared.capsule.hash, initialContextCapsuleHash: prepared.capsule.hash,
        sharedScenarioSourcesIncluded: true, outputContractRef: prepared.roleInput.outputContractRef,
        structuredRuntimeReceiptRef: imported.outcome.receiptRef, structuredCandidateRef: imported.outcome.candidateRef,
        hostMaterializationReceipt: recovered.receipt, completeReviewImportProof: imported.proof,
        reviewSlotNamespaceBindingHash: binding.hash, slotRecoveryOrigin: origin,
        toolReadRefs: [], toolTrace: [], loop: imported.loop, structuredDecodePassed: true,
        semanticAcceptance: false, trainingTruth: false }));
      onProgress?.({ stage: 'review_slot_namespace_paid_output_recovered', role: request.roleId,
        providerCalls: 0, originalAttemptId: origin.attemptId, judgmentsChanged: false });
      return value;
    } catch (error) { store.release(lease); throw error; }
  } });
}
