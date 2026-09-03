import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/transition-v1.mjs";
import { STARCRAFT_TMG_TICKET_15_ONLINE_SESSION_LIFECYCLE_CONTRACT_V1 } from
  "./ticket-15-online-session-lifecycle-contract-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const body = {
  schemaVersion: "starcraft_tmg_ticket_15_provider_gateway_supervisor_contract_v1",
  ticket: 15,
  slice: 146,
  preparedAt: "2026-09-04T00:00:00.000Z",
  predecessorLifecycleContractHash:
    STARCRAFT_TMG_TICKET_15_ONLINE_SESSION_LIFECYCLE_CONTRACT_V1
      .lifecycleContractHash,
  module:
    "packages/online-agent-session/provider-gateway-supervisor-v1.mjs",
  providerGatewayPort: {
    inputs: [
      "schema_version",
      "opaque_provider_profile_ref",
      "prompt_assembly_ref",
      "bounded_request",
      "response_contract_ref",
      "budget_reservation",
      "abort_signal",
    ],
    credentialInputs: [],
    directProviderTransportAccepted: false,
    configuredEvidenceThisSlice: "injected_deterministic_gateway_only",
    noProviderState: "provider_not_configured",
    liveProviderClaimAllowed: false,
  },
  supervision: {
    concurrentTurnsPerSession: 1,
    turnStates: [
      "waiting_provider",
      "completed",
      "cancelled",
      "timed_out",
      "failed",
    ],
    automaticRetryAllowed: false,
    timeoutOwner: "server_budget_policy",
    cancellationSignal: "AbortSignal",
    connectionFenceCheckedBeforeOutputAcceptance: true,
    lateCompletionPolicy: "hash_and_quarantine_without_state_reentry",
  },
  budget: {
    unit: "provider_units",
    dimensions: [
      "session_total",
      "session_turn_count",
      "turn_input",
      "turn_max_output",
    ],
    reservationBeforeDispatch: true,
    successfulSettlement: "verified_actual_usage",
    unknownFailureSettlement: "consume_full_reservation",
    cancellationSettlement: "consume_full_reservation_when_usage_unknown",
    timeoutSettlement: "consume_full_reservation_when_usage_unknown",
    perSessionIsolation: true,
  },
  observability: {
    viewerStateHashSealed: true,
    turnProjectionHashSealed: true,
    completionReceiptHashSealed: true,
    rawPromptVisible: false,
    rawPrincipalReferenceVisible: false,
    rawProviderFailureVisible: false,
    providerOutputVisibleOnlyOnAcceptedCurrentCompletion: true,
    trainingTruth: false,
  },
  deferred: {
    promptToolMemoryHistoryBinding: 147,
    roleOutputAndOpponentPreviewValidation: 148,
    authenticatedHttp: 149,
    webClientMount: 150,
    battleLabTrace: 151,
    browserAggregate: 152,
    secureByokAndLiveProvider: 16,
  },
  runTruth: {
    sourceRefreshPerformed: false,
    liveProviderCalled: false,
    injectedGatewayUsed: true,
    byokCredentialAccepted: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
  },
};

export const STARCRAFT_TMG_TICKET_15_PROVIDER_GATEWAY_SUPERVISOR_CONTRACT_V1 =
  freeze({
    ...body,
    supervisorContractHash: hashStarcraftTmgContract(body),
  });
