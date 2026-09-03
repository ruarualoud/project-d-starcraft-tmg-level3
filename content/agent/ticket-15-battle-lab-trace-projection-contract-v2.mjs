import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/transition-v1.mjs";
import { STARCRAFT_TMG_TICKET_15_ROLE_AGENT_CLIENT_CONTRACT_V1 } from
  "./ticket-15-role-agent-client-contract-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const body = {
  schemaVersion: "starcraft_tmg_ticket_15_battle_lab_trace_projection_contract_v2",
  ticket: 15,
  slice: 151,
  preparedAt: "2026-09-04T10:00:00.000Z",
  predecessorRoleAgentClientContractHash:
    STARCRAFT_TMG_TICKET_15_ROLE_AGENT_CLIENT_CONTRACT_V1
      .roleAgentClientContractHash,
  deepModule: {
    module: "packages/client-domain/role-agent-trace-projection-v2.mjs",
    interface: ["project", "assert", "create_read_port"],
    source: "same_role_agent_client_projection_used_by_expo_web",
    portInput: ["roomId"],
    maximumTraceEntries: 6,
  },
  observableStates: [
    "session",
    "turn",
    "tools",
    "decision",
    "confirmation",
    "failure",
  ],
  identity: {
    sourceAgentProjectionHash: true,
    hostViewHash: true,
    sessionRefHashOnly: true,
    sessionBindingHash: true,
    roomStateHash: true,
    legalSpaceHashWhenLoaded: true,
    connectionEpoch: true,
    rawSessionId: false,
  },
  privacy: {
    exactOutputSchema: true,
    hashSealedProjection: true,
    cataloguedToolIdsOnly: true,
    failureCodeOnly: true,
    selectedReasonHashOnly: true,
    rawPrompt: false,
    rawProviderOutput: false,
    providerUsageReceipt: false,
    credentials: false,
    conversationTranscriptInTrace: false,
  },
  battleLab: {
    liveProjectionDefault: true,
    historicalV1AdapterCompatibility: true,
    clientDomainInterface: ["bootstrap", "read", "dispatch", "subscribe"],
    controls: [
      "mode",
      "intent",
      "open",
      "send",
      "cancel",
      "reconnect",
      "end",
      "external_human_confirm",
    ],
    intermediateTurnStatesRefreshBeforeDispatchSettlement: true,
    observabilityFailureCannotMaskRoomSuccess: true,
  },
  authority: {
    rulesAuthority: "external_rules_service",
    roomAuthority: "external_room_service",
    modelMayConfirm: false,
    modelMayApply: false,
    traceMayMutateRoom: false,
    trainingTruth: false,
  },
  deferred: {
    realChromiumAggregate: 152,
    secureByokAndLiveProvider: 16,
    nativeDeviceEvidence: "final_device_batch",
    offlineSkillGenerationAndPromotion: [17, 18],
  },
  runTruth: {
    sourceRefreshPerformed: false,
    liveProviderCalled: false,
    apiKeyAccepted: false,
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

export const STARCRAFT_TMG_TICKET_15_BATTLE_LAB_TRACE_PROJECTION_CONTRACT_V2 =
  freeze({
    ...body,
    traceProjectionContractHash: hashStarcraftTmgContract(body),
  });
