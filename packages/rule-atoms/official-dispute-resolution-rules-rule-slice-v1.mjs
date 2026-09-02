import {
  OFFICIAL_DISPUTE_RESOLUTION_RULES_ACTION_TYPE,
  OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_ID,
  OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_VERSION,
  OFFICIAL_DISPUTE_RESOLUTION_RULES_NEW_ATOM_IDS,
  OFFICIAL_DISPUTE_RESOLUTION_RULES_TRANSITION_SCHEMA,
} from "./official-dispute-resolution-rules-executor-v1.mjs";
import { createOfficialDisputeResolutionRulesRelationshipExtensionV1 } from
  "./official-dispute-resolution-rules-relationship-contract-v1.mjs";
import { createOfficialScoringFinalizationRulesRelationshipExtensionV1 } from
  "./official-scoring-finalization-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "DISPUTE_RESOLUTION_RULES",
  schema: "starcraft_tmg_official_dispute_resolution_rules_rule_slice_v1",
  catalogueVersion: "0.111.0-official-dispute-resolution-rules",
  ordinal: 111,
  actionSchemaVersion: "hybrid_legal_space_v49",
  previousActionSchemaVersion: "hybrid_legal_space_v48",
  previous: {
    schema: "starcraft_tmg_official_scoring_finalization_rules_rule_slice_v1",
    sliceHash: "283c21b9aa3f7d9220c89cf62f63a73baec4eaa0d8b9890adcc05f965e6be39a",
    catalogueHash: "7488a01ac487b4544fc7c09080dcf8242b50bf701577154cd5b806a5d52d0777",
    runtimeHash: "d0aebfd5de012a3eb7821a3cb5c698304551c641d38b6ce9ef8a0cbc4481c413",
    graphHash: "07ccc04786a2e0845a8e3147c715cfb44563efb3ab1acdf13e433dadbfaa5753",
    relationship: createOfficialScoringFinalizationRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "f8183a5a689ea5ec72381f52d0bba8f58ae4585db8d53f5b0f6f343aa70bd20d",
    catalogueHash: "5b3bd5d65a6e3478e98536e7fb71133fd0624c99cccbc47c886c96f731c16d46",
    runtimeHash: "6e3527cea5b9a005bb5462eb33bc8f2a7a3a93636778ae9a6daec2d8fab903b9",
    graphHash: "63f37c40a54006ab67096df72b9e2e9f6b6836c38d82aad3ee10d6d41017e44c",
  },
  counts: { previousExecutable: 908, previousReview: 4,
    executable: 912, review: 0, displayOnly: 114, executors: 80 },
  remainingSlices: 0,
  newAtomIds: OFFICIAL_DISPUTE_RESOLUTION_RULES_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_ID,
    version: OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_DISPUTE_RESOLUTION_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_DISPUTE_RESOLUTION_RULES_TRANSITION_SCHEMA },
  actionType: OFFICIAL_DISPUTE_RESOLUTION_RULES_ACTION_TYPE,
  parameterKind: "official_dispute_resolution_procedure_v1",
  relationship: createOfficialDisputeResolutionRulesRelationshipExtensionV1,
  actor: "roll_off_winner_or_post_match_coordinator",
  timing: { phase: "any_or_post_match", window: "unresolved_rules_dispute", priority: 220 },
  preconditions: [{
    predicateId: "dispute_resolution.frozen_source_and_data_lineage",
    inputSchema: "starcraft_tmg_official_dispute_resolution_rules_data_bundle_v1",
    failureCode: "DISPUTE_RESOLUTION_SOURCE_LOCK_BINDING_INVALID",
  }, {
    predicateId: "dispute_resolution.specific_instance_content_hash",
    inputSchema: "starcraft_tmg_official_pending_rules_dispute_v1",
    failureCode: "PENDING_RULES_DISPUTE_HASH_INVALID",
  }, {
    predicateId: "dispute_resolution.manual_adjudication_training_ineligible",
    inputSchema: "starcraft_tmg_official_provisional_ruling_record_v1",
    failureCode: "PROVISIONAL_RULING_DISPUTE_INVALID",
  }],
  chance: { kind: "chance_ticket", ticketSchema: "starcraft_tmg_chance_bundle_v1" },
  rejectionCodes: ["DISPUTE_RESOLUTION_ACTION_INVALID",
    "DISPUTE_RESOLUTION_ACTION_STALE", "DISPUTE_ROLL_OFF_REVEALS_REQUIRED",
    "DISPUTE_ROLL_OFF_REVEAL_INVALID", "PROVISIONAL_RULING_OWNER_INVALID",
    "POST_MATCH_RULING_VERIFICATION_WINDOW_INVALID",
    "DISPUTE_RESOLUTION_DATA_LINEAGE_INVALID"],
  evidenceSlug: "dispute-resolution-rules-v1",
  evidenceFixtures: { positive: "open-rolloff-ruling-continue-and-verify",
    negative: "forged-rolls-wrong-owner-arbitrary-patch-and-pre-match-verification",
    interaction: "slice110-simultaneous-elimination-to-typed-manual-boundary",
    lifecycle: "unresolved-dispute-through-post-match-verification" },
  executableScope:
    "official_unresolved_dispute_rolloff_provisional_ruling_continue_and_post_match_verification",
  progressKey: "disputeResolutionRulesProgress",
  progress: { promotedAtomCount: 4,
    routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 4,
    completeActionableAtomDenominator: 912,
    unresolvedDisputeRollOffExecutable: true,
    twoD6EachAndTieRepeatExecutable: true,
    rollOffWinnerOwnsProvisionalRulingExecutable: true,
    specificInstanceOnlyBoundaryExecutable: true,
    continueAfterProvisionalRulingExecutable: true,
    postMatchVerificationExecutable: true,
    arbitraryWholeStatePatchRejected: true,
    canonicalRulesRemainImmutable: true,
    manualAdjudicationPermanentlyTrainingIneligible: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false },
  contractGroup: "dispute_resolution_rules_v1",
  frozenExecutorIds: ["authority.scoring-finalization-rules-v1"],
  judgeTests: 50,
  agentDecisionEvidence:
    "rules_owned_dispute_rolloff_and_specific_instance_manual_ruling_without_rules_mutation",
  userVisibleChecks: [
    "roll_off_totals_winner_and_specific_instance_ruling_are_explainable",
    "play_continuation_and_post_match_verification_status_are_visible",
    "manual_adjudication_and_training_ineligibility_are_never_hidden",
  ],
  blocks: ["production_room_ui_agent_skill_selfplay_muzero_pending",
    "manual_adjudication_cannot_create_rules_or_training_truth",
    "independent_production_source_signing_and_real_device_evidence_pending"],
});

export function createOfficialDisputeResolutionRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialDisputeResolutionRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
