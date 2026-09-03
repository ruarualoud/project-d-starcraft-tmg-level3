import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/transition-v1.mjs";
import { STARCRAFT_TMG_TICKET_15_ROLE_CONTEXT_ISOLATION_CONTRACT_V1 } from
  "./ticket-15-role-context-isolation-contract-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const body = {
  schemaVersion: "starcraft_tmg_ticket_15_role_output_preview_contract_v1",
  ticket: 15,
  slice: 148,
  preparedAt: "2026-09-04T03:00:00.000Z",
  predecessorContextContractHash:
    STARCRAFT_TMG_TICKET_15_ROLE_CONTEXT_ISOLATION_CONTRACT_V1
      .contextContractHash,
  modules: [
    "packages/online-agent-session/role-output-runtime-v1.mjs",
    "packages/online-agent-session/role-context-runtime-v1.mjs",
    "packages/authoritative-engine/transition-v1.mjs",
    "packages/room-runtime/in-memory-room-v1.mjs",
  ],
  deepModule: {
    interface: ["metadata", "readContext", "sendTurn"],
    internalSeams: [
      "credential_free_provider_gateway",
      "viewer_scoped_room_tools",
      "rules_owned_preview_port",
    ],
    callersCannotSupplyOutputPolicy: true,
  },
  structuredOutput: {
    schemaVersion: "starcraft_tmg_online_role_output_v1",
    exactTopLevelFields: [
      "schemaVersion",
      "channels",
      "visualCue",
      "evidenceRefIds",
    ],
    exactChannelFields: true,
    modeAndIntentScopedChannels: true,
    credentialAndUnknownFieldPolicy: "reject_without_retention",
    citations: "server_catalogued_current_context_refs_only",
    requiredEvidence: [
      "current_viewer_room_projection",
      "same_game_rule_skill_when_available",
      "current_legal_space_for_opponent_take_turn",
      "current_public_events_for_commentator",
    ],
  },
  roleMatrix: {
    tutor: {
      channels: ["speech", "teaching"],
      decision: false,
      preview: false,
    },
    opponentChat: {
      channels: ["speech"],
      decision: false,
      preview: false,
    },
    opponentTakeTurn: {
      channels: ["decision", "speech"],
      decision: true,
      preview: true,
    },
    commentator: {
      channels: ["speech"],
      decision: false,
      preview: false,
    },
    companion: {
      channels: ["speech", "teaching"],
      decision: false,
      preview: false,
    },
  },
  opponentDecision: {
    candidateSource: "current_enabled_legal_space_only",
    selectedReasonRequired: true,
    scoreOrPositionValueRequired: true,
    riskRequired: true,
    enabledAlternativeComparisonRequiredWhenAvailable: true,
    strategyMemory: "explicit_same_session_advisory_refs_only",
    ruleOrRoomEvidenceBeatsMemory: true,
  },
  preview: {
    expectedBindings: [
      "matchBindingHash",
      "legalSpaceHash",
      "stateRevision",
      "stateHash",
    ],
    expectedBindingCheckOccursBeforeSealAndOpenPreviewPersistence: true,
    output: "hash_sealed_preview_projection",
    requiresExplicitHuman: true,
    modelMayConfirm: false,
    modelMayApply: false,
    authoritativeStateRevisionChange: 0,
  },
  observability: {
    decisionIncludesSelectedAndRejectedReasons: true,
    decisionIncludesPositionValueRiskAndMemoryInfluence: true,
    traceIncludesProviderAndAcceptedOutputHashes: true,
    traceIncludesDecisionAndPreviewReceiptHashes: true,
    rejectedRawOutputRetained: false,
  },
  deferred: {
    authenticatedHttpAndEvents: 149,
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
    skillReadFixtures: true,
    skillGenerated: false,
    skillPromoted: false,
    memoryWrites: 0,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
  },
};

export const STARCRAFT_TMG_TICKET_15_ROLE_OUTPUT_PREVIEW_CONTRACT_V1 = freeze({
  ...body,
  outputPreviewContractHash: hashStarcraftTmgContract(body),
});
