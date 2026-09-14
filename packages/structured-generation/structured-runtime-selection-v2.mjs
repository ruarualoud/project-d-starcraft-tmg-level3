import { fail, verifySeal } from '../skill-production/common.mjs';
import { createStarcraftTmgStructuredGenerationRuntimeV1 } from './structured-generation-runtime-v1.mjs';
import { createStarcraftTmgStructuredGenerationRuntimeV2, STRUCTURED_WIRE_RUNTIME_BINDING_V2 } from './structured-generation-runtime-v2.mjs';

// One explicit runtime choice, shared by review/editor/Teach/native callers.
// Absence retains the immutable V1 contract; it is never inferred from the
// provider type or a capability flag. A declared but missing Adapter rejects.
export function createStructuredRuntimeWithWireRecoveryV2(options) {
  const { wireRecovery, ...runtimeOptions } = options;
  if (!wireRecovery) return createStarcraftTmgStructuredGenerationRuntimeV1(runtimeOptions);
  if (verifySeal(wireRecovery.binding).hash !== STRUCTURED_WIRE_RUNTIME_BINDING_V2.hash)
    fail('STRUCTURED_WIRE_SELECTION_BINDING_INVALID');
  const adapter = wireRecovery.adapters.get(options.egressBinding.providerProfileRef.hash);
  if (!adapter) fail('STRUCTURED_WIRE_SELECTION_PROFILE_MISSING');
  return createStarcraftTmgStructuredGenerationRuntimeV2({ ...runtimeOptions,
    providerAdapter: adapter, runId: wireRecovery.runId,
    quarantine: wireRecovery.quarantine, readAttempt: wireRecovery.readAttempt });
}
