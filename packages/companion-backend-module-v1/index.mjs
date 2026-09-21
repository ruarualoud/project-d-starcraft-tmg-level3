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
  createInMemoryPersistenceAdapter,
  createInMemoryProviderAdapter,
} from "./in-memory-adapter-v1.mjs";

import {
  COMPANION_BACKEND_CONTRACT_VERSION,
  COMPANION_BACKEND_INTEGRATION_DESCRIPTOR,
  assertCompanionBackendDependencies,
  createCompanionPackageRegistry,
} from "./contracts-v1.mjs";

export function composeCompanionBackend(dependencies = {}) {
  const injected = assertCompanionBackendDependencies(dependencies);
  const registry = injected.registry || createCompanionPackageRegistry();
  return Object.freeze({
    schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.module`,
    descriptor: COMPANION_BACKEND_INTEGRATION_DESCRIPTOR,
    registry,
    persistence: injected.persistence,
    provider: injected.provider ?? null,
  });
}
