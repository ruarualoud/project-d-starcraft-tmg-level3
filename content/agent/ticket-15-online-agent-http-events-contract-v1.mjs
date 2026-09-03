import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/transition-v1.mjs";
import { STARCRAFT_TMG_TICKET_15_ROLE_OUTPUT_PREVIEW_CONTRACT_V1 } from
  "./ticket-15-role-output-preview-contract-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const body = {
  schemaVersion: "starcraft_tmg_ticket_15_online_agent_http_events_contract_v1",
  ticket: 15,
  slice: 149,
  preparedAt: "2026-09-04T05:00:00.000Z",
  predecessorOutputPreviewContractHash:
    STARCRAFT_TMG_TICKET_15_ROLE_OUTPUT_PREVIEW_CONTRACT_V1
      .outputPreviewContractHash,
  modules: [
    "packages/online-agent-session/http-events-v1.mjs",
    "packages/online-agent-session/session-lifecycle-v1.mjs",
    "packages/online-agent-session/provider-gateway-supervisor-v1.mjs",
    "packages/online-agent-session/role-output-runtime-v1.mjs",
  ],
  deepModule: {
    interface: ["handle", "metadata"],
    apiPrefix: "/starcraft-tmg-level3/agent/api/v2",
    internalSeams: [
      "external_principal_authenticator",
      "online_session_lifecycle",
      "role_turn_runtime",
      "provider_supervisor_cancel",
      "bounded_hash_chained_event_projection",
    ],
    legacyCharacterHttpReused: false,
  },
  endpoints: [
    "GET /starcraft-tmg-level3/agent/api/v2/health",
    "GET /starcraft-tmg-level3/agent/api/v2/metadata",
    "POST /starcraft-tmg-level3/agent/api/v2/sessions",
    "GET /starcraft-tmg-level3/agent/api/v2/sessions/:sessionId",
    "POST /starcraft-tmg-level3/agent/api/v2/sessions/:sessionId/turns",
    "POST /starcraft-tmg-level3/agent/api/v2/sessions/:sessionId/cancel",
    "POST /starcraft-tmg-level3/agent/api/v2/sessions/:sessionId/reconnect",
    "DELETE /starcraft-tmg-level3/agent/api/v2/sessions/:sessionId",
    "GET /starcraft-tmg-level3/agent/api/v2/sessions/:sessionId/events",
  ],
  requestBoundary: {
    maximumBodyBytes: 65_536,
    exactFields: true,
    bodyForbiddenMethods: ["GET", "DELETE"],
    connectionEpochRequiredOperations: ["turn", "cancel", "reconnect", "end"],
    clientMaySupplyPrincipalRef: false,
    clientMaySupplySeatAuthority: false,
    clientMaySupplyProviderMaterial: false,
  },
  authentication: {
    source: "external_principal_authenticator",
    lifecycleReceives: "server_only_principal_session_ref",
    idempotencyScope: "authentication_scope_hash",
    rawHeaderPersistedOrProjected: false,
    crossPrincipalSessionAccess: "deny",
  },
  mutationIdempotency: {
    requiredOperations: ["create", "turn", "cancel", "reconnect", "end"],
    concurrentSameKeySamePayload: "one_operation_shared_result",
    sameKeyChangedPayload: "conflict",
    storedReplayIsExactPublicResult: true,
    capacityPolicy: "fail_closed_without_eviction",
  },
  events: {
    source: "server_projected_terminal_session_operations",
    ordering: "per_session_monotonic_sequence",
    integrity: "previous_event_hash_and_event_hash",
    paging: "cursor_and_bounded_limit",
    capacityPolicy: "fail_closed_without_silent_eviction",
    durability: "process_memory_bounded_v1",
    eligibleForTraining: false,
    reviewStatusRequired: true,
  },
  lifecycle: {
    createReadReconnectEnd: true,
    cancelCurrentProviderTurn: true,
    endCancelsInFlightProviderTurn: true,
    reconnectRequiresCurrentEpoch: true,
    endedSessionRejectsNewTurns: true,
  },
  publicProjection: {
    rawPrompt: false,
    rawProviderOutput: false,
    providerReceipt: false,
    providerMaterial: false,
    principalSessionRef: false,
    normalizedRoleOutput: true,
    decisionAndPreviewReceiptHashes: true,
  },
  deferred: {
    webAdjutantControls: 150,
    battleLabTraceProjection: 151,
    chromiumAggregate: 152,
    secureByokAndLiveProvider: 16,
    offlineSkillGenerationAndPromotion: [17, 18],
  },
  runTruth: {
    sourceRefreshPerformed: false,
    liveProviderCalled: false,
    injectedGatewayUsed: true,
    nativeDeviceEvidence: "deferred_by_user",
    skillGenerated: false,
    skillPromoted: false,
    memoryWrites: 0,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
  },
};

export const STARCRAFT_TMG_TICKET_15_ONLINE_AGENT_HTTP_EVENTS_CONTRACT_V1 =
  freeze({
    ...body,
    httpEventsContractHash: hashStarcraftTmgContract(body),
  });
