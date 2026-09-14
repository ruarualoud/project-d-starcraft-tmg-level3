import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { prepareFactionSlotReviewRoleV1 } from './faction-slot-review-runtime-v1.mjs';
import { materializeFactionSlotReviewV1 } from './faction-review-slot-namespace-v1.mjs';
import { FACTION_STRUCTURAL_JSON_SCHEMA_BRIDGE_BINDING_V2 } from './faction-structural-json-schema-bridge-v2.mjs';
import { materializeStructuralJsonRecoveryV1, verifyStructuralJsonRecoveryRecordV1,
  AUTHENTICATED_STRUCTURAL_JSON_RECOVERY_BINDING_V1 as recoveryBinding } from '../structured-generation/authenticated-structural-json-recovery-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V6,
  FACTION_REVIEW_SLOT_NAMESPACE_BINDING_V1 as slotBinding } from '../../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';

export const FACTION_STRUCTURAL_JSON_REVIEW_BINDING_V1 = seal({
  version: 'faction_structural_json_review_v1', recoveryBindingHash: recoveryBinding.hash,
  outputContractRef: STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V6,
  slotBindingHash: slotBinding.hash, currentFailureOrExplicitAncestorOnly: true,
  fullOriginalContextRequired: true, everyCachedReadReauthenticated: true,
  recoveredOutcomeNeverRelabeledOriginalSuccess: true, additionalProviderAttempts: 0,
  semanticAcceptanceInherited: false, runtimeAccepted: false, trainingTruth: false });
const binding = FACTION_STRUCTURAL_JSON_REVIEW_BINDING_V1;
const invalid = code => fail('FACTION_STRUCTURAL_JSON_REVIEW_' + code);

function inspectOrigin({ prepared, origin, authenticated }) {
  const proof = verifySeal(authenticated);
  if (proof.bindingHash !== recoveryBinding.hash || proof.originRunId !== origin.runId
    || proof.originAttemptId !== origin.attemptId || proof.originalWireIssueHash !== origin.issueHash
    || hash(proof.outputContractRef) !== hash(prepared.roleInput.outputContractRef)
    || hash(proof.invocation.roleRef) !== hash(prepared.roleInput.roleRef)
    || hash(proof.invocation.contextManifestRef) !== hash(prepared.roleInput.contextManifestRef)
    || hash(proof.invocation.executionPolicyRef) !== hash(prepared.roleInput.executionPolicyRef)
    || proof.contextManifestRef.hash !== prepared.capsule.hash || proof.semanticAcceptanceInherited !== false
    || proof.runtimeAccepted !== false || proof.trainingTruth !== false) invalid('ORIGIN_DRIFT');
  return materializeFactionSlotReviewV1({ ...prepared.mapping, capsule: prepared.capsule,
    providerOutput: proof.providerValue, reviewReasonMaximum: 16384, reviewSourceMaximum: 128 });
}

// This consumer receives a freshly independently authenticated proof, never
// the embedded proof as its own authority. It redoes all Host target mapping.
export function verifyFactionStructuralReviewRoleV1({ value, prepared, authenticated, dshBindingHash, selectedBinding }) {
  verifySeal(value);
  if (verifySeal(selectedBinding).hash !== binding.hash) invalid('BINDING_DRIFT');
  if (value.protocol !== binding.version || value.structuralJsonReviewBindingHash !== binding.hash
    || hash(value.outputContractRef) !== hash(binding.outputContractRef)
    || value.reviewSlotNamespaceBindingHash !== slotBinding.hash) invalid('PROTOCOL_DRIFT');
  if (value.roleId !== prepared.fullRoleId || value.roleInputHash !== hash(prepared.roleInput)) invalid('ROLE_DRIFT');
  if (value.contextCapsuleHash !== prepared.capsule.hash
    || value.initialContextCapsuleHash !== prepared.capsule.hash || value.sharedScenarioSourcesIncluded !== true
    || value.sourceDelivery !== 'proof_carrying_whole_section_review_capsule') invalid('CONTEXT_DRIFT');
  if (value.structuredCandidateRef !== null || value.structuredDecodePassed !== true
    || value.semanticAcceptance !== false || value.trainingTruth !== false
    || !Array.isArray(value.toolTrace) || !Array.isArray(value.toolReadRefs)
    || value.toolTrace.length || value.toolReadRefs.length) invalid('STATE_DRIFT');
  const record = value.structuralJsonRecoveryRecord;
  verifyStructuralJsonRecoveryRecordV1({ record, authenticated, dshBindingHash });
  if (value.structuredRuntimeReceiptRef?.hash !== record.hash || hash(value.loop) !== hash(record.loop)) invalid('RECORD_DRIFT');
  const materialized = inspectOrigin({ prepared, origin: value.structuralJsonRecoveryOrigin, authenticated });
  if (hash(materialized.output) !== hash(value.output)
    || materialized.receipt.hash !== value.hostMaterializationReceipt.hash
    || hash(materialized.receipt) !== hash(value.hostMaterializationReceipt)) invalid('MAPPING_DRIFT');
  return { providerReceiptHashes: [authenticated.originalProviderReceiptHash], recoveredReceiptHash: record.hash,
    additionalProviderAttempts: 0, semanticAcceptanceInherited: false, trainingTruth: false };
}

// readOrigin() can select only an explicitly bound ancestor or the current
// failed attempt. It must not invoke a Provider. Ordinary and legacy roles
// retain the delegated path. Unsupported grammar propagates the real failure.
export function createFactionStructuralReviewRuntimeV1({ runtime, input, store, dsh, executionPolicy,
  selectedBinding, readOrigin, authenticateOrigin, onProgress, parsedWireSchemaBridgeBinding = null }) {
  if (verifySeal(selectedBinding).hash !== binding.hash || typeof runtime?.role !== 'function'
    || typeof readOrigin !== 'function' || typeof authenticateOrigin !== 'function' || !dsh?.binding) invalid('DEPENDENCIES_INVALID');
  if (parsedWireSchemaBridgeBinding && (verifySeal(parsedWireSchemaBridgeBinding).hash !== FACTION_STRUCTURAL_JSON_SCHEMA_BRIDGE_BINDING_V2.hash
    || runtime.parsedWireSchemaBridgeBindingHash !== parsedWireSchemaBridgeBinding.hash))
    invalid('PARSED_SCHEMA_BINDING_INVALID');
  const stop = () => {
    if (store.globalSummary().attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED')) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  };
  return Object.freeze({ async role(request) {
    stop();
    const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy });
    if (!prepared) return runtime.role(request);
    let origin = await readOrigin(prepared);
    if (!origin) {
      try { return await runtime.role(request); }
      catch (error) {
        stop(); origin = await readOrigin(prepared);
        if (!origin) throw error;
      }
    }
    const authenticate = async () => {
      stop();
      const actual = await authenticateOrigin({ origin, prepared });
      // Semantic/address validation happens before any DSH work or lease write.
      inspectOrigin({ prepared, origin, authenticated: actual.proof });
      return actual;
    };
    let first;
    try { first = await authenticate(); }
    catch (error) {
      if (!parsedWireSchemaBridgeBinding || !['STRUCTURAL_JSON_SYNTAX_UNSUPPORTED', 'STRUCTURAL_JSON_SCHEMA_INVALID',
        'FACTION_STRUCTURAL_JSON_ARCHIVED_PARSED_ROUTE_REQUIRED'].includes(error.code)) throw error;
      // The explicitly bound inner runtime will authenticate the original raw
      // again, recover a still-rejected candidate, and perform bounded schema
      // correction. Never turn a parser exception into a blind Provider retry.
      return runtime.role(request);
    }
    const lease = store.acquire(prepared.fullRoleId, prepared.roleInput);
    try {
      if (lease.cached) {
        const value = verifySeal(lease.artifact);
        if (value.protocol !== binding.version) {
          // A later recovery protocol may already own this exact role/input
          // checkpoint (for example a syntax-parsed schema-valid value). The
          // older structural recovery route must not reinterpret it as its own
          // artifact. Delegate only recognizable native-review envelopes and
          // require the inner runtime to return the exact cached seal.
          const recognizableInnerOwner = value.protocol === undefined
            && value.roleId === prepared.fullRoleId
            && value.initialContextCapsuleHash === prepared.capsule.hash
            && value.reviewSlotNamespaceBindingHash === slotBinding.hash
            && (value.structuredRuntimeReceiptRef || value.parsedReviewValueRef
              || value.completeReviewImportProof || value.parsedWireRecoveries || value.parsedReviewValues);
          if (!recognizableInnerOwner) invalid('CACHED_PROTOCOL_UNCLAIMED');
          const delegated = verifySeal(await runtime.role(request));
          if (delegated.hash !== value.hash) invalid('CACHED_PROTOCOL_OWNER_DRIFT');
          return delegated;
        }
        verifyFactionStructuralReviewRoleV1({ value, prepared, authenticated: first.proof,
          dshBindingHash: dsh.binding.hash, selectedBinding });
        return value;
      }
      const recovered = await materializeStructuralJsonRecoveryV1({ authenticate, store, dsh });
      if (recovered.record.proof.hash !== first.proof.hash) invalid('AUTHENTICATION_DRIFT');
      const materialized = inspectOrigin({ prepared, origin, authenticated: first.proof });
      const value = seal({ protocol: binding.version, structuralJsonReviewBindingHash: binding.hash,
        roleId: prepared.fullRoleId, roleInputHash: hash(prepared.roleInput), output: materialized.output,
        sourceDelivery: 'proof_carrying_whole_section_review_capsule', sharedScenarioSourcesIncluded: true,
        contextCapsuleHash: prepared.capsule.hash, initialContextCapsuleHash: prepared.capsule.hash,
        outputContractRef: prepared.roleInput.outputContractRef, reviewSlotNamespaceBindingHash: slotBinding.hash,
        structuredRuntimeReceiptRef: { hash: recovered.record.hash }, structuredCandidateRef: null,
        structuralJsonRecoveryOrigin: origin, structuralJsonRecoveryRecord: recovered.record,
        hostMaterializationReceipt: materialized.receipt, loop: recovered.record.loop,
        toolReadRefs: [], toolTrace: [], structuredDecodePassed: true, semanticAcceptance: false, trainingTruth: false });
      verifyFactionStructuralReviewRoleV1({ value, prepared, authenticated: first.proof,
        dshBindingHash: dsh.binding.hash, selectedBinding });
      stop(); const saved = store.finish(lease, value);
      onProgress?.({ stage: 'authenticated_structural_json_review_recovered', role: request.roleId,
        originAttemptId: origin.attemptId, providerCalls: 0, syntaxEdits: first.proof.normalization.edits.length,
        judgmentsChanged: false });
      return saved;
    } catch (error) { if (!lease.cached) store.release(lease); throw error; }
  } });
}
