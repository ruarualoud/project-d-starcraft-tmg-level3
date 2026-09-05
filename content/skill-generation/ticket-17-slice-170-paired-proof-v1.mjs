import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function envelope(body, field) {
  return freeze({ ...body, [field]: hashStarcraftTmgContract(body) });
}

const promptPackBody = {
  schemaVersion: "starcraft_tmg_ctx2skill_paired_prompt_pack_v1",
  id: "starcraft-tmg.ctx2skill.how-to-play-builder.paired-proof.v2",
  version: "2.0.0",
  gameId: "starcraft-tmg",
  language: "English",
  route: "rule_skill_builder",
  roleSequence: [
    "planner",
    "tutor",
    "student",
    "challenger",
    "reasoner",
    "proposer",
    "generator",
  ],
  method: [
    "Use only the staged current-official complete hierarchical RuleAtom index and supplied prior receipts.",
    "Return the exact JSON envelope and exact role keys declared for this role.",
    "Use stable identifiers exactly as supplied; do not add fields or markdown.",
    "Keep factual and legality statements tied to the complete staged index; retrieve exact current RuleAtoms by evidence identifier before making detailed rule claims.",
    "Treat strategy and uncertainty as advisory; never claim Rules authority.",
    "Only Generator may return candidateDraft in its declared role payload; no model role may invoke candidate emission, tools, publication, promotion, or hidden reasoning.",
  ],
  modelOutputEnvelope: {
    schemaVersion: "starcraft_tmg_offline_skill_role_output_v1",
    onlyChannel: "skill_generation_role_output",
    channelValue: "the exact role payload declared by roleOutputContract",
  },
  rulesAuthority: "authoritative_rules_service_only",
  candidateAuthority: "candidate_unreviewed_only",
  rawReasoningRequested: false,
  sourceRefreshPerformed: false,
  productionReady: false,
  trainingTruth: false,
};

export const STARCRAFT_TMG_CTX2SKILL_PAIRED_PROMPT_PACK_V1 = envelope(
  promptPackBody,
  "promptPackHash",
);

const metricRows = [
  {
    metricId: "contract_closure",
    weight: 10,
    description: "The candidate passed the exact role graph and candidate contract.",
  },
  {
    metricId: "complete_index_binding",
    weight: 15,
    description: "Every selected claim cites the complete current hierarchical rule index and current Rules receipt.",
  },
  {
    metricId: "single_skill_identity",
    weight: 10,
    description: "The artifact is the one production-catalogue How-to-Play Skill, not one Skill per atom.",
  },
  {
    metricId: "phase_and_chapter_routing",
    weight: 15,
    description: "The procedure selects the current phase/topic chapter before resolving a rule question.",
  },
  {
    metricId: "exact_atom_retrieval",
    weight: 15,
    description: "The procedure retrieves the full current RuleAtom by evidence ID and verifies its hashes before use.",
  },
  {
    metricId: "authoritative_legality_and_transition",
    weight: 15,
    description: "LegalSpace and state transitions remain owned by the current Rules/Referee service.",
  },
  {
    metricId: "preview_confirm_apply_replay",
    weight: 10,
    description: "The operational flow preserves LegalSpace, Preview, human confirmation, Apply, Receipt and Replay.",
  },
  {
    metricId: "negative_and_replay_coverage",
    weight: 10,
    description: "The artifact includes an illegal pattern/counterexample and pass/reject judge tests.",
  },
];

const evaluationBody = {
  schemaVersion: "starcraft_tmg_ticket_17_blind_skill_evaluation_v1",
  evaluatorId: "starcraft-tmg.slice170.complete-how-to-play-blind-evaluator.v2",
  evaluatorVersion: "2.0.0",
  targetTaskId: "how_to_play:production:complete-rules",
  metrics: metricRows,
  maximumScore: metricRows.reduce((sum, row) => sum + row.weight, 0),
  diagnosticReferenceFloor: 70,
  scoreUse: "diagnostic_only_before_base_skill_catalogue",
  qualityScoreIsSliceClosureGate: false,
  qualityScoreIsPromotionGate: false,
  baseSkillCatalogueComplete: false,
  labels: ["candidate-a", "candidate-b"],
  evaluatorInputExcludes: [
    "executionArm",
    "DSH Session metadata",
    "runtime identity",
    "usage and cost",
  ],
  tiePolicy: "report_tie_without_tiebreak",
  promotionAuthority: false,
  humanReviewRequired: true,
  trainingTruth: false,
};

export const STARCRAFT_TMG_SLICE_170_BLIND_EVALUATION_V1 = envelope(
  evaluationBody,
  "evaluationContractHash",
);

const proofBody = {
  schemaVersion: "starcraft_tmg_ticket_17_slice_170_paired_proof_v1",
  ticket: 17,
  slice: 170,
  preparedAt: "2026-09-04T20:00:00.000Z",
  target: {
    taskId: "how_to_play:production:complete-rules",
    taskHash:
      "0952654e95105ae8f93e822a42674e510e45dc8ea28fe2450b83d87fa0ae3598",
    stagedInputHash:
      "f82df99098ab2739f026e8736b62b2a3c6374c2d2727562c9a0c7c16582510cd",
    productionSkillId: "skill.starcraft-tmg.how-to-play",
    productionCatalogueHash:
      "f71864cf7b27536290f323420f3812608724e3831ef942feb2ea58d90cbb18ba",
    productionCatalogueSkillCount: 53,
    evidenceId: "rule-index:starcraft-tmg.current-complete",
    evidenceContentHash:
      "a0c28e214c43559d53ad6d6d52e6d7b4555284bf832912a38b96a68b17ea9256",
    evidenceLocatorHash:
      "b87e9301614aabd0c6d4330a9ef93c08914270e0a2f9353d03252050e6488ae4",
    currentRulesReceiptHash:
      "f069451ab987d7951231a336d2b2318b74dc19a8fc6998860f14bcd584d06c13",
    ruleAtomCounts: {
      total: 1163,
      executable: 1049,
      displayOnly: 114,
      chapters: 10,
    },
  },
  arms: ["dsh", "direct_provider_control"],
  common: {
    providerProfileId: "starcraft-tmg.offline-skill.deepseek-v4-flash.v1",
    model: "deepseek-v4-flash",
    temperature: 0,
    topP: 1,
    providerAttemptsPerArm: 7,
    maximumPhysicalProviderAttempts: 14,
    automaticRetries: 0,
    promptPackHash:
      STARCRAFT_TMG_CTX2SKILL_PAIRED_PROMPT_PACK_V1.promptPackHash,
    evaluationContractHash:
      STARCRAFT_TMG_SLICE_170_BLIND_EVALUATION_V1.evaluationContractHash,
    maxInputTokensPerArm: 7_000_000,
    maxOutputTokensPerArm: 7_168,
    maxEstimatedUsdPerArm: 4,
    conservativeMaximumPairCostUsd: "6.178923520",
    conservativeMaximumPairCostCny: "49.431389",
    appRuleEndpoints: [
      "POST /starcraft-tmg-level3/api/v1/rooms/:roomId/legal-space",
      "POST /starcraft-tmg-level3/api/v1/rooms/:roomId/preview",
      "POST /starcraft-tmg-level3/api/v1/rooms/:roomId/apply",
      "GET /starcraft-tmg-level3/api/v1/rooms/:roomId/replay",
    ],
  },
  assignment: {
    method: "sha256_commitment_before_local_ingress",
    labels: ["candidate-a", "candidate-b"],
    revealAfterEvaluation: true,
  },
  liveAuthority: {
    notBeforeInstant: "2026-09-04T10:00:00.000Z",
    notBeforeDisplay: "2026-09-04 18:00:00 CST",
    priceWindowIntent: "deepseek_weekday_off_peak_after_18_cst",
    requiredFlags: [
      "--authorize-live-how-to-play-skill-pair-once",
      "--ack-prior-faq-attempt-may-have-been-billed",
      "--attest-credential-not-from-chat",
      "--ack-maximum-14-provider-attempts",
    ],
    ingress: "anonymous_stdin_binary_pipe_only",
    environmentCredentialAllowed: false,
    argumentCredentialAllowed: false,
    successfulReceiptPreventsRerun: true,
    claimedAttemptPreventsAutomaticRerun: true,
  },
  outputs: {
    candidates: 2,
    status: "candidate_unreviewed",
    humanReviewed: false,
    canAffectStrategy: false,
    canAffectRules: false,
    promotionEligible: false,
    mayPublishSkill: false,
    memoryWrite: false,
    selfPlayWrite: false,
    muzeroWrite: false,
    trainingTruth: false,
  },
  closureSemantics: {
    purpose: "one_formal_production_catalogue_how_to_play_skill_pair",
    technicalClosureRequiresTwoStructurallyValidCandidates: true,
    technicalClosureRequiresDiagnosticReferenceFloor: false,
    baseSkillCatalogueComplete: false,
    catalogueCoverageClaimAllowed: false,
    targetIsFormalCatalogueMember: true,
    productionCatalogueSkillCount: 53,
  },
  sourceRefreshPerformed: false,
  largeScaleProductionAuthorized: false,
  trainingTruth: false,
};

export const STARCRAFT_TMG_TICKET_17_SLICE_170_PAIRED_PROOF_V1 = envelope(
  proofBody,
  "contractHash",
);
