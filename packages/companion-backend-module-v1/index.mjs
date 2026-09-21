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
  COMPANION_BACKEND_CB4_ERROR_CODES,
  COMPANION_AUDIT_EVENT_KINDS,
  COMPANION_RATIONALE_RECEIPT_KINDS,
  createCompanionAuditLog,
  verifyCompanionAuditExport,
  createCompanionPersistenceGateway,
  createCompanionProviderGateway,
  createCompanionPresentationResolver,
  createCompanionRationaleRecord,
} from "./ports-audit-presentation-v1.mjs";

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

import {
  createCompanionAuditLog,
  createCompanionPersistenceGateway,
  createCompanionProviderGateway,
  createCompanionPresentationResolver,
} from "./ports-audit-presentation-v1.mjs";

export function composeCompanionBackend(dependencies = {}) {
  const injected = assertCompanionBackendDependencies(dependencies);
  const registry = injected.registry || createCompanionPackageRegistry();
  // CB-4: the composed module routes persistence through the audited strict
  // gateway (exact pass-through, so CB-1..CB-3 behavior is preserved) and
  // exposes the provider gateway, audit log and presentation resolver. The
  // raw injected persistence and provider remain available unchanged.
  const auditLog = createCompanionAuditLog({ logId: "companion-backend-compose" });
  const persistenceGateway = createCompanionPersistenceGateway({ persistence: injected.persistence, auditLog });
  const providerGateway = createCompanionProviderGateway({ provider: injected.provider ?? null, auditLog });
  const presentation = createCompanionPresentationResolver({ assetCatalog: injected.assetCatalog ?? null, auditLog });
  const memoryEngine = createCompanionMemoryEngine({ persistence: persistenceGateway });
  const sessionRuntime = createCompanionSessionRuntime({
    persistence: persistenceGateway,
    memoryEngine,
  });
  return Object.freeze({
    schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.module`,
    descriptor: COMPANION_BACKEND_INTEGRATION_DESCRIPTOR,
    registry,
    persistence: injected.persistence,
    provider: injected.provider ?? null,
    auditLog,
    persistenceGateway,
    providerGateway,
    presentation,
    memoryEngine,
    sessionRuntime,
  });
}
