import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/transition-v1.mjs";
import {
  STARCRAFT_TMG_TICKET_15_BATTLE_LAB_TRACE_PROJECTION_CONTRACT_V2,
} from "./ticket-15-battle-lab-trace-projection-contract-v2.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const body = {
  schemaVersion: "starcraft_tmg_ticket_15_browser_aggregate_contract_v1",
  ticket: 15,
  slice: 152,
  preparedAt: "2026-09-04T12:00:00.000Z",
  predecessorTraceProjectionContractHash:
    STARCRAFT_TMG_TICKET_15_BATTLE_LAB_TRACE_PROJECTION_CONTRACT_V2
      .traceProjectionContractHash,
  browserMatrix: {
    engine: "chromium",
    browserRuns: 1,
    roleModes: ["tutor", "opponent", "commentator", "companion"],
    failurePaths: [
      "provider_failed",
      "provider_not_configured",
      "provider_input_budget_exceeded",
    ],
    cancellationPaths: 1,
    backgroundReconnectPaths: 1,
    opponentHumanConfirmationPaths: 1,
    fixedBrowserChecks: 11,
  },
  fixture: {
    authoritativeRoomRuntime: true,
    roomHttpAdapter: true,
    authenticatedAgentHttp: true,
    roleTurnRuntime: true,
    deterministicInjectedGateway: true,
    realExternalProvider: false,
    apiKeyAccepted: false,
  },
  opponentAuthority: {
    candidateSource: "current_enabled_legal_space",
    output: "sealed_preview_only",
    modelMayConfirm: false,
    modelMayApply: false,
    confirmationOwner: "human_browser_action",
    writeFlow: [
      "legal_space",
      "sealed_preview",
      "human_confirm",
      "fenced_apply",
      "signed_receipt",
      "replay",
    ],
  },
  privacyScopes: {
    traceDomExcludes: [
      "conversation_text",
      "raw_prompt",
      "raw_provider_output",
      "provider_usage_receipt",
      "credentials",
      "raw_session_id",
    ],
    agentHttpExcludes: [
      "credentials",
      "raw_prompt",
      "provider_usage_receipt",
    ],
    evidenceArtifactsExclude: [
      "seat_token",
      "agent_auth_cookie",
      "raw_session_id",
      "conversation_text",
    ],
  },
  closure: {
    slices: [144, 145, 146, 147, 148, 149, 150, 151, 152],
    priorSliceReports: 8,
    ticketProgressOnPass: "9/9",
    projectProgressOnPass: "14/22",
    ticket16Handoff: "secure_byok_and_live_provider",
    nativeDeviceEvidence: "deferred_final_device_batch",
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
    productionReady: false,
  },
};

export const STARCRAFT_TMG_TICKET_15_BROWSER_AGGREGATE_CONTRACT_V1 = freeze({
  ...body,
  browserAggregateContractHash: hashStarcraftTmgContract(body),
});
