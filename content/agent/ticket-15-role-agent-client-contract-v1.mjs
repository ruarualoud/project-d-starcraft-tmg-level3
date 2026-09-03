import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/transition-v1.mjs";
import { STARCRAFT_TMG_TICKET_15_ONLINE_AGENT_HTTP_EVENTS_CONTRACT_V1 } from
  "./ticket-15-online-agent-http-events-contract-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const body = {
  schemaVersion: "starcraft_tmg_ticket_15_role_agent_client_contract_v1",
  ticket: 15,
  slice: 150,
  preparedAt: "2026-09-04T08:00:00.000Z",
  predecessorHttpEventsContractHash:
    STARCRAFT_TMG_TICKET_15_ONLINE_AGENT_HTTP_EVENTS_CONTRACT_V1
      .httpEventsContractHash,
  modules: [
    "packages/client-domain/role-agent-session-client-v1.mjs",
    "packages/client-domain/online-agent-transport-adapters-v1.mjs",
    "packages/client-domain/client-domain-v1.mjs",
    "apps/starcraft-tmg-expo/lib/level3/client-domain-mount-runtime.mjs",
    "apps/starcraft-tmg-expo/components/character/tactical-adjutant-panel.tsx",
  ],
  clientDomain: {
    extension: "role_agent_session_v1",
    optIn: true,
    exactInterface: ["bootstrap", "read", "dispatch", "subscribe"],
    roomQueueSeparateFromAgentQueue: true,
    cancelBypassesLongAgentQueue: true,
    persistedAgentSessionState: false,
  },
  webControls: {
    modes: ["tutor", "opponent", "commentator", "companion"],
    features: [
      "mode_selection",
      "provider_and_connection_status",
      "budget",
      "chronological_chat",
      "loading",
      "cancel",
      "explicit_reconnect",
      "end_session",
      "opponent_decision_risk_and_alternatives",
      "human_preview_confirmation",
      "safe_harness_trace",
    ],
    offlineAndBackground: "read_only_without_agent_network_mutation",
  },
  transport: {
    apiPrefix: "/starcraft-tmg-level3/agent/api/v2",
    browserAuthentication: "same_origin_cookie_credentials_include",
    authorizationHeaderConstructed: false,
    providerCredentialAccepted: false,
    responseBounded: true,
    httpsRequiredExceptLoopback: true,
  },
  authority: {
    clientRulesAuthority: false,
    clientRoomAuthority: false,
    agentMayConfirm: false,
    agentMayApply: false,
    confirmationOwner: "human_outside_agent_runtime",
    flow: [
      "Agent_sealed_Preview_projection",
      "explicit_human_intent",
      "existing_Client_Domain_Confirm",
      "control_lease",
      "fenced_Apply",
      "signed_Receipt",
      "authoritative_refresh",
    ],
  },
  privacy: {
    publicSessionId: false,
    rawPrompt: false,
    rawProviderOutput: false,
    providerUsageReceipt: false,
    traceUsesSafeHashesAndCataloguedRefs: true,
  },
  deferred: {
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

export const STARCRAFT_TMG_TICKET_15_ROLE_AGENT_CLIENT_CONTRACT_V1 = freeze({
  ...body,
  roleAgentClientContractHash: hashStarcraftTmgContract(body),
});
