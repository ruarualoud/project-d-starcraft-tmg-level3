export {
  COMPANION_BACKEND_CONTRACT_VERSION,
  COMPANION_BACKEND_ERROR_CODES,
  COMPANION_PRESENTATION_STATES,
  COMPANION_SUPPORTED_SEATS,
  CompanionBackendError,
  assertNoCredentials,
  assertNoHiddenChainOfThought,
  assertCompanionBackendContract,
  exportCompanionBackendContract,
  importCompanionBackendContract,
  createCompanionPackage,
  createCompanionPackageRegistry,
  COMPANION_PERSISTENCE_PORT_V1,
  assertCompanionPersistencePort,
  COMPANION_PROVIDER_PORT_V1,
  assertCompanionProviderPort,
  createCompanionProviderRequest,
  createCompanionProviderResponse,
  COMPANION_BACKEND_INTEGRATION_DESCRIPTOR,
  assertCompanionBackendDependencies,
} from "./contracts-v1.mjs";

export {
  COMPANION_BACKEND_CB2_ERROR_CODES,
  COMPANION_MEMORY_LAYERS,
  COMPANION_CONTEXT_ASSEMBLY_ORDER,
  COMPANION_WORLDBOOK_TRIGGER_KINDS,
  COMPANION_RELATIONSHIP_EVENT_TYPES,
  COMPANION_CONTEXT_BUDGET_POLICY,
  estimateWorldbookTokens,
  normalizeCompanionScope,
  createWorldbookEntry,
  matchWorldbookEntry,
  selectWorldbookEntries,
  createCompanionMemoryEngine,
} from "./worldbook-memory-engine-v1.mjs";

export {
  COMPANION_BACKEND_CB3_ERROR_CODES,
  COMPANION_SESSION_PARTICIPANT_KINDS,
  COMPANION_BRANCH_KINDS,
  COMPANION_RESOURCE_VISIBILITIES,
  COMPANION_SEAT_READ_POLICY,
  createCompanionSessionRuntime,
} from "./session-runtime-v1.mjs";

export {
  createInMemoryPersistenceAdapter,
  createInMemoryProviderAdapter,
} from "./in-memory-adapter-v1.mjs";

import {
  COMPANION_BACKEND_CONTRACT_VERSION,
  COMPANION_BACKEND_INTEGRATION_DESCRIPTOR,
  assertCompanionBackendDependencies,
  createCompanionPackageRegistry,
} from "./contracts-v1.mjs";

import { createCompanionMemoryEngine } from "./worldbook-memory-engine-v1.mjs";
import { createCompanionSessionRuntime } from "./session-runtime-v1.mjs";

export function composeCompanionBackend(dependencies = {}) {
  const injected = assertCompanionBackendDependencies(dependencies);
  const registry = injected.registry || createCompanionPackageRegistry();
  const memoryEngine = createCompanionMemoryEngine({ persistence: injected.persistence });
  const sessionRuntime = createCompanionSessionRuntime({
    persistence: injected.persistence,
    memoryEngine,
  });
  return Object.freeze({
    schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.module`,
    descriptor: COMPANION_BACKEND_INTEGRATION_DESCRIPTOR,
    registry,
    persistence: injected.persistence,
    provider: injected.provider ?? null,
    memoryEngine,
    sessionRuntime,
  });
}
