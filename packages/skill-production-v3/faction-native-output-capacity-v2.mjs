import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { FACTION_OUTPUT_CAPACITY_POLICY_V2 as policy } from './faction-output-capacity-policy-v2.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V2 as profile } from '../../content/skill-generation/offline-provider-profile-v2.mjs';
import { assertFactionExecutionEgressV1 } from './faction-execution-model-v1.mjs';

// Writing capacity only. Reasoner answer batching and small reviews keep their
// existing contracts. A changed profile must never relabel a paid V1 artifact.
export const FACTION_NATIVE_OUTPUT_CAPACITY_BINDING_V2 = seal({
  version: 'faction_native_output_capacity_v2', capacityPolicyHash: policy.hash,
  profileRef: { id: profile.providerProfileId, version: profile.version, hash: profile.integrity.hash },
  kinds: ['notes', 'outline', 'items'], promptTarget: policy.promptTargets.narrative,
  executionPolicy: { maxOutputUnits: 8192, attemptEstimateMicros: 2000000, attemptTokenReserve: 500000,
    allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false,
    encryptedRawQuarantineAvailable: false },
  completedV1RoleIdsFrozenAtCutover: true, fullWorkspacePreserved: true,
  automaticRetries: 0, partialOutputAcceptance: false, semanticAcceptance: false, trainingTruth: false,
});

export function validateFactionNativeOutputCapacityV2(binding) {
  verifySeal(binding);
  if (binding.hash !== FACTION_NATIVE_OUTPUT_CAPACITY_BINDING_V2.hash)
    fail('FACTION_NATIVE_OUTPUT_CAPACITY_BINDING_INVALID');
  return binding;
}

export function usesFactionNativeOutputCapacityV2({ roleId, kind, binding, frozenRoleIds }) {
  validateFactionNativeOutputCapacityV2(binding);
  if (!Array.isArray(frozenRoleIds) || frozenRoleIds.some(id => typeof id !== 'string')
    || new Set(frozenRoleIds).size !== frozenRoleIds.length) fail('FACTION_NATIVE_OUTPUT_CAPACITY_FREEZE_INVALID');
  return binding.kinds.includes(kind) && !frozenRoleIds.includes(roleId);
}

export function applyFactionNativeOutputCapacityV2(request, binding) {
  validateFactionNativeOutputCapacityV2(binding);
  if (request.maxOutput !== 4096) fail('FACTION_NATIVE_OUTPUT_CAPACITY_REQUEST_INVALID');
  return { ...request, maxOutput: binding.executionPolicy.maxOutputUnits };
}

export function frozenFactionNativeOutputRolesV2(steps) {
  return steps.filter(row => row.artifact?.protocol === 'faction_native_production_v1'
    && FACTION_NATIVE_OUTPUT_CAPACITY_BINDING_V2.kinds.includes(row.artifact.nativeKind)
    && !row.artifact.outputCapacityBindingHash).map(row => row.id).sort();
}

export function assertFactionNativeOutputProfileV2({ binding, egressBinding, executionModelBinding = null }) {
  validateFactionNativeOutputCapacityV2(binding);
  if (executionModelBinding) {
    assertFactionExecutionEgressV1({binding:executionModelBinding,legacyProfileRef:binding.profileRef,egressBinding});
    return;
  }
  if (hash(egressBinding?.providerProfileRef) !== hash(binding.profileRef)
    || egressBinding?.maxOutputUnits !== binding.executionPolicy.maxOutputUnits)
    fail('FACTION_NATIVE_OUTPUT_CAPACITY_PROFILE_MISMATCH');
}
