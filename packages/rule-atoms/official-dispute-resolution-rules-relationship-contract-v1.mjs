import {
  OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_ID,
  OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_VERSION,
} from "./official-dispute-resolution-rules-executor-v1.mjs";
import { createOfficialScoringFinalizationRulesRelationshipExtensionV1 } from
  "./official-scoring-finalization-rules-relationship-contract-v1.mjs";

export const OFFICIAL_DISPUTE_RESOLUTION_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-111-dispute-resolution-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  scoringData: "state_field:officialScoringFinalizationRulesDataBundle",
  data: "state_field:officialDisputeResolutionRulesDataBundle",
  players: "state_field:players",
  pieces: "state_field:pieces",
  scores: "state_field:scores",
  progress: "state_field:scoringCleanupProgress",
  firstPlayer: "state_field:firstPlayerSideKey",
  pendingDispute: "state_field:pendingRulesDispute",
  pendingRuling: "state_field:pendingProvisionalRuling",
  rollOffHistory: "state_field:rulesDisputeRollOffHistory",
  rulings: "state_field:provisionalRulings",
  verifications: "state_field:rulingVerifications",
  result: "state_field:lastDisputeResolutionRulesResolution",
  history: "state_field:disputeResolutionRulesHistory",
  terminal: "state_field:gameOver",
  winner: "state_field:winner",
  log: "state_field:log",
  training: "state_field:eligibleForTraining",
  action: "action_variant:disputeResolutionV1.resolveProcedure",
  dispute: "derived_value:disputeResolutionV1.specificInstance",
  rollOff: "derived_value:disputeResolutionV1.twoD6EachRollOff",
  rulingOwner: "derived_value:disputeResolutionV1.rollOffWinner",
  provisionalRuling: "derived_value:disputeResolutionV1.specificInstanceRuling",
  continuation: "derived_value:disputeResolutionV1.continueAfterRuling",
  verification: "derived_value:disputeResolutionV1.postMatchVerification",
  manualBoundary: "semantic_boundary:disputeResolutionV1.manualTrainingIneligible",
  canonicalRules: "semantic_authority:canonicalRulesImmutable",
  event: "state_event:dispute_resolution_rules_resolved",
  sourceTest: "judge_test:dispute-resolution-v1-source-route",
  rollOffTest: "judge_test:dispute-resolution-v1-rolloff",
  rulingTest: "judge_test:dispute-resolution-v1-ruling-owner",
  continueTest: "judge_test:dispute-resolution-v1-continue",
  verificationTest: "judge_test:dispute-resolution-v1-post-match-verification",
  authorityTest: "judge_test:dispute-resolution-v1-authority-replay",
  graphTest: "judge_test:dispute-resolution-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-111" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_DISPUTE_RESOLUTION_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialDisputeResolutionRulesRelationshipExtensionV1(
  input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("DISPUTE_RESOLUTION_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialScoringFinalizationRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash });
  const executor = `executor:${OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.scoringData, ID.data, ID.players,
    ID.pieces, ID.scores, ID.progress, ID.firstPlayer, ID.pendingDispute,
    ID.pendingRuling, ID.rollOffHistory, ID.rulings, ID.terminal];
  const writes = [ID.scores, ID.progress, ID.pendingDispute, ID.pendingRuling,
    ID.rollOffHistory, ID.rulings, ID.verifications, ID.result, ID.history,
    ID.terminal, ID.winner, ID.log, ID.training];
  const tests = [ID.sourceTest, ID.rollOffTest, ID.rulingTest, ID.continueTest,
    ID.verificationTest, ID.authorityTest, ID.graphTest];
  const derived = [ID.dispute, ID.rollOff, ID.rulingOwner, ID.provisionalRuling,
    ID.continuation, ID.verification, ID.manualBoundary];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "dispute_resolution:state_contract")),
    edge(executor, "exposes", ID.action,
      "dispute_resolution:finite_rules_owned_procedures"),
    edge(ID.pieces, "derives", ID.dispute,
      "dispute_resolution:simultaneous_elimination_instance"),
    edge(ID.progress, "derives", ID.dispute,
      "dispute_resolution:exact_current_window"),
    edge(ID.data, "derives", ID.rollOff,
      "dispute_resolution:two_d6_each_tie_repeat"),
    edge(ID.action, "derives", ID.rollOff,
      "dispute_resolution:authority_chance_reveal"),
    edge(ID.rollOff, "derives", ID.rulingOwner,
      "dispute_resolution:higher_total_winner"),
    edge(ID.rulingOwner, "derives", ID.provisionalRuling,
      "dispute_resolution:winner_chooses_specific_instance_option"),
    edge(ID.provisionalRuling, "derives", ID.continuation,
      "dispute_resolution:continue_play_flow"),
    edge(ID.provisionalRuling, "derives", ID.verification,
      "dispute_resolution:post_match_required"),
    edge(ID.provisionalRuling, "derives", ID.manualBoundary,
      "dispute_resolution:manual_adjudication_training_ineligible"),
    edge(ID.manualBoundary, "invalidates", ID.training,
      "dispute_resolution:no_training_truth"),
    ...derived.map((source) => edge(source, "derives", ID.event,
      "dispute_resolution:apply")),
    edge(ID.action, "derives", ID.event,
      "dispute_resolution:authority_apply"),
    ...writes.map((target) => edge(ID.event, "writes", target,
      "dispute_resolution:state_mutation")),
    edge(ID.data, "verified_by", ID.sourceTest,
      "dispute_resolution:source_judge"),
    edge(ID.rollOff, "verified_by", ID.rollOffTest,
      "dispute_resolution:rolloff_judge"),
    edge(ID.rulingOwner, "verified_by", ID.rulingTest,
      "dispute_resolution:ruling_owner_judge"),
    edge(ID.continuation, "verified_by", ID.continueTest,
      "dispute_resolution:continue_judge"),
    edge(ID.verification, "verified_by", ID.verificationTest,
      "dispute_resolution:verification_judge"),
    edge(executor, "verified_by", ID.authorityTest,
      "dispute_resolution:authority_judge"),
    edge(executor, "verified_by", ID.graphTest,
      "dispute_resolution:graph_judge"),
    ...reads.map((source) => edge(source, "invalidates", ID.action,
      "dispute_resolution:stale")),
  ];
  const additions = [
    node(ID.data, "state_field", "Official dispute-resolution data bundle"),
    node(ID.pendingDispute, "state_field", "Pending content-hashed rules dispute"),
    node(ID.pendingRuling, "state_field", "Pending roll-off-winner ruling"),
    node(ID.rollOffHistory, "state_field", "Rules-dispute Roll-Off history"),
    node(ID.rulings, "state_field", "Specific-instance provisional rulings"),
    node(ID.verifications, "state_field", "Post-match ruling verifications"),
    node(ID.result, "state_field", "Last dispute-resolution result"),
    node(ID.history, "state_field", "Dispute-resolution history"),
    node(ID.training, "state_field", "Room training eligibility"),
    node(ID.action, "action_variant", "Resolve rules-dispute procedure"),
    node(ID.dispute, "derived_value", "Specific unresolved dispute instance"),
    node(ID.rollOff, "derived_value", "Two-D6-each dispute Roll-Off"),
    node(ID.rulingOwner, "derived_value", "Roll-Off winner ruling owner"),
    node(ID.provisionalRuling, "derived_value", "Specific-instance provisional ruling"),
    node(ID.continuation, "derived_value", "Continue after provisional ruling"),
    node(ID.verification, "derived_value", "Post-match ruling verification"),
    node(ID.manualBoundary, "semantic_projection", "Training-ineligible manual boundary"),
    node(ID.canonicalRules, "semantic_projection", "Canonical rules remain immutable"),
    node(ID.event, "state_event", "Dispute-resolution rules resolved"),
    node(ID.sourceTest, "judge_test", "Dispute source/route Judge"),
    node(ID.rollOffTest, "judge_test", "Dispute Roll-Off Judge"),
    node(ID.rulingTest, "judge_test", "Provisional ruling owner Judge"),
    node(ID.continueTest, "judge_test", "Continue-playing Judge"),
    node(ID.verificationTest, "judge_test", "Post-match verification Judge"),
    node(ID.authorityTest, "judge_test", "Dispute Authority replay Judge"),
    node(ID.graphTest, "judge_test", "Dispute relationship negative-gap Judge"),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return { nodes: [...previous.nodes, ...additions.filter((entry) => (
    !previousIds.has(entry.nodeId)))], edges: [...previous.edges, ...edges],
  executorLineages: [...previous.executorLineages, {
    executorId: OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_ID,
    ruleAtomIds: [...OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_ATOM_IDS],
    provenance: "runtime_action_lineage:dispute_resolution_rules_v1" }],
  declaredStateContractExecutorIds: [...previous.declaredStateContractExecutorIds,
    OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_ID],
  coverageScopes: [...previous.coverageScopes, {
    scopeId: OFFICIAL_DISPUTE_RESOLUTION_RULES_RELATIONSHIP_SCOPE_ID,
    executorId: OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_ID,
    requiredNodeIds: [...new Set([executor, ...reads, ...writes, ID.action,
      ...derived, ID.event, ...tests])], requiredEdges: edges,
    requiredPaths: [
      { from: ID.data, to: ID.event, relationships: ["derives"], maxDepth: 7 },
      { from: ID.pieces, to: ID.event, relationships: ["derives"], maxDepth: 7 },
      { from: ID.rollOff, to: ID.event, relationships: ["derives"], maxDepth: 5 },
      { from: ID.provisionalRuling, to: ID.verification,
        relationships: ["derives"], maxDepth: 2 },
    ], forbiddenPaths: [
      { from: ID.provisionalRuling, to: ID.canonicalRules,
        relationships: ["derives", "writes"], maxDepth: 4 },
      { from: ID.manualBoundary, to: ID.gameplay,
        relationships: ["derives", "writes"], maxDepth: 4 },
    ], evidenceTestNodeIds: tests,
  }] };
}
