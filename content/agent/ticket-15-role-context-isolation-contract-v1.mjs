import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/transition-v1.mjs";
import { STARCRAFT_TMG_TICKET_15_PROVIDER_GATEWAY_SUPERVISOR_CONTRACT_V1 } from
  "./ticket-15-provider-gateway-supervisor-contract-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const body = {
  schemaVersion: "starcraft_tmg_ticket_15_role_context_isolation_contract_v1",
  ticket: 15,
  slice: 147,
  preparedAt: "2026-09-04T01:00:00.000Z",
  predecessorSupervisorContractHash:
    STARCRAFT_TMG_TICKET_15_PROVIDER_GATEWAY_SUPERVISOR_CONTRACT_V1
      .supervisorContractHash,
  modules: [
    "packages/online-agent-session/prompt-artifact-store-v1.mjs",
    "packages/online-agent-session/role-context-contracts-v1.mjs",
    "packages/online-agent-session/role-context-runtime-v1.mjs",
  ],
  promptRouting: {
    tutor: "novice_teacher_prompt",
    opponent: "opponent_prompt",
    commentator: "referee_prompt",
    companion: "sparring_coach_prompt",
    genericPromptAllowed: false,
    promptArtifactTransport: "ephemeral_server_ref_only",
    releaseAfterSupervisedTurn: true,
  },
  contextAuthorityOrder: [
    "viewer_scoped_room_projection",
    "current_legal_space_when_mode_allows",
    "current_rules_service_and_accepted_same_game_rule_skills",
    "same_session_advisory_memory",
    "bounded_conversation_history",
    "character_and_worldbook_roleplay",
  ],
  tools: {
    modelChoosesArbitraryTools: false,
    roomMutationToolsAvailable: false,
    prefetchCallsByCapabilityProfile: true,
    internalContextReads: [
      "read_memory_snapshot",
      "read_character_worldbook",
    ],
    ruleAndRoomEvidenceBeatsMemory: true,
  },
  ruleSkills: {
    gameId: "starcraft-tmg",
    acceptedStatuses: ["replay_passed", "human_reviewed"],
    sameRulesVersionRequired: true,
    sameSourceSnapshotSetRequired: true,
    sourceRefsRequired: true,
    appRuleEndpointsRequired: true,
    traceProjection: "hash_refs_only",
    mayOverrideRules: false,
    generatedDuringLiveTurn: false,
  },
  memory: {
    sameRoomPrincipalSessionModeRequired: true,
    capabilityNamespaceAllowlistRequired: true,
    acceptedStatuses: ["accepted", "curated"],
    advisoryOnly: true,
    opponentDecisionInfluence: "strategy_memory_only",
    liveWrites: 0,
    livePromotion: false,
  },
  history: {
    perSession: true,
    boundedByCountAndBytes: true,
    reconnectRestoresSameSessionHistory: true,
    crossSessionReadAllowed: false,
    trainingTruth: false,
  },
  failurePolicy: {
    noProvider: "fail_before_context_reads_or_prompt_storage",
    staleConnection: "reject",
    crossRoomPrincipalMode: "reject",
    materialOrCharacterSelectionDrift: "reject",
    mixedRulesOrMemorySnapshot: "reject",
    credentialMaterialInUserOrProviderText: "reject_without_retention",
  },
  deferred: {
    roleOutputAndOpponentPreviewValidation: 148,
    authenticatedHttp: 149,
    webClientMount: 150,
    battleLabTrace: 151,
    browserAggregate: 152,
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

export const STARCRAFT_TMG_TICKET_15_ROLE_CONTEXT_ISOLATION_CONTRACT_V1 =
  freeze({
    ...body,
    contextContractHash: hashStarcraftTmgContract(body),
  });
