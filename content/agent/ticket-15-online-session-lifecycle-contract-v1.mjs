import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/transition-v1.mjs";
import { STARCRAFT_TMG_TICKET_15_ONLINE_ROLE_AGENT_BOUNDARY_V1 } from
  "./ticket-15-online-role-agent-boundary-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const body = {
  schemaVersion: "starcraft_tmg_ticket_15_online_session_lifecycle_contract_v1",
  ticket: 15,
  slice: 145,
  preparedAt: "2026-09-03T23:00:00.000Z",
  predecessorBoundaryHash:
    STARCRAFT_TMG_TICKET_15_ONLINE_ROLE_AGENT_BOUNDARY_V1.boundaryHash,
  module: "packages/online-agent-session/session-lifecycle-v1.mjs",
  lifecycleOperations: [
    "create_session",
    "read_session",
    "reconnect_session",
    "end_session",
  ],
  identity: {
    sessionIdOwner: "server",
    principalAuthenticationOwner: "external_server_authority_port",
    persistedPrincipalMaterial: ["principal_scope_hash"],
    persistedCredentialMaterial: [],
    clientAuthorityFieldsAccepted: [],
    connectionFencing: "monotonic_connection_epoch",
  },
  isolatedBindings: [
    "room_id",
    "principal_scope_hash",
    "seat_key",
    "principal_role_mode",
    "agent_mode",
    "character_package_hash",
    "character_selection_hash",
    "rules_and_data_room_binding_hash",
  ],
  stalePolicies: {
    connection: "reject_old_epoch",
    principal: "reject_and_require_new_session",
    character: "reject_and_require_new_session",
    roomRules: "reject_and_require_new_session",
    endedSessionReconnect: "reject",
    endReplay: "idempotent_for_same_authenticated_scope",
  },
  viewerProjection: {
    hashSealed: true,
    credentialsIncluded: false,
    authorityTokensIncluded: false,
    providerPayloadIncluded: false,
    durability: "process_memory_hash_sealed_v1",
    trainingTruth: false,
  },
  rolePolicy: {
    modes: ["tutor", "opponent", "commentator", "companion"],
    arbitraryClientModesAccepted: false,
    allowedModesComeFromServerPrincipalBinding: true,
    concurrentSessions: "not_artificially_capped_by_product_contract",
  },
  deferred: {
    providerGatewaySupervisor: 146,
    promptToolMemoryHistory: 147,
    opponentPreview: 148,
    authenticatedHttp: 149,
    webClientMount: 150,
    battleLabTrace: 151,
    browserAggregate: 152,
    secureByokAndLiveProvider: 16,
  },
  runTruth: {
    sourceRefreshPerformed: false,
    providerCalled: false,
    byokCredentialAccepted: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
  },
};

export const STARCRAFT_TMG_TICKET_15_ONLINE_SESSION_LIFECYCLE_CONTRACT_V1 =
  freeze({
    ...body,
    lifecycleContractHash: hashStarcraftTmgContract(body),
  });
