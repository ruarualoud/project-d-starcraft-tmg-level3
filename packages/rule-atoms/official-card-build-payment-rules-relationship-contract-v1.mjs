import {
  OFFICIAL_CARD_BUILD_PAYMENT_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_CARD_BUILD_PAYMENT_RULES_EXECUTOR_ID,
  OFFICIAL_CARD_BUILD_PAYMENT_RULES_EXECUTOR_VERSION,
} from "./official-card-build-payment-rules-executor-v1.mjs";
import { createOfficialAbilityTimingPriorityRulesRelationshipExtensionV1 } from
  "./official-ability-timing-priority-rules-relationship-contract-v1.mjs";

export const OFFICIAL_CARD_BUILD_PAYMENT_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-92-card-build-payment-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  cardData: "state_field:officialCardBuildPaymentDataBundle",
  mode: "state_field:rulesProcedureMode", activeSide: "state_field:activeSideKey",
  players: "state_field:players", pending: "state_field:pendingAction.cardBuildPaymentRules",
  history: "state_field:cardBuildPaymentRulesHistory",
  result: "state_field:lastCardBuildPaymentRulesResolution", log: "state_field:log",
  choose: "action_variant:cardBuildPaymentRulesV1.chooseCertifiedPlan",
  profile: "derived_value:cardBuildPaymentV1.exactOfficialCardProfile",
  layout: "derived_value:cardBuildPaymentV1.standardCardLayout",
  purchase: "derived_value:cardBuildPaymentV1.tacticalPurchase",
  uniqueSet: "derived_value:cardBuildPaymentV1.completeArmyCardInstanceSet",
  unique: "derived_value:cardBuildPaymentV1.uniqueSingleCopyAudit",
  paymentSet: "derived_value:cardBuildPaymentV1.completeSelectedPaymentCards",
  payment: "derived_value:cardBuildPaymentV1.abilityResourcePayment",
  event: "state_event:card_build_payment_rules_resolved",
  sourceTest: "judge_test:card-build-payment-v1-source",
  layoutTest: "judge_test:card-build-payment-v1-layout",
  purchaseTest: "judge_test:card-build-payment-v1-purchase",
  uniqueTest: "judge_test:card-build-payment-v1-unique",
  paymentTest: "judge_test:card-build-payment-v1-payment",
  authorityTest: "judge_test:card-build-payment-v1-authority-replay",
  graphTest: "judge_test:card-build-payment-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-92" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_CARD_BUILD_PAYMENT_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialCardBuildPaymentRulesRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("CARD_BUILD_PAYMENT_RELEASE_INVALID");
  }
  const previous = createOfficialAbilityTimingPriorityRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash });
  const executor = `executor:${OFFICIAL_CARD_BUILD_PAYMENT_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_CARD_BUILD_PAYMENT_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.cardData, ID.mode, ID.activeSide,
    ID.players, ID.pending, ID.history, ID.result];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "card_build_payment:state_contract")),
    edge(executor, "exposes", ID.choose, "card_build_payment:certified_choices"),
    edge(ID.cardData, "derives", ID.profile, "card_build_payment:exact_source_profile"),
    edge(ID.profile, "derives", ID.layout, "card_build_payment:standard_layout"),
    edge(ID.profile, "derives", ID.purchase, "card_build_payment:vespene_cost_slots"),
    edge(ID.uniqueSet, "derives", ID.unique, "card_build_payment:complete_copy_counts"),
    edge(ID.profile, "derives", ID.unique, "card_build_payment:official_unique_marking"),
    edge(ID.paymentSet, "derives", ID.payment,
      "card_build_payment:complete_ready_matching_cards"),
    edge(ID.profile, "derives", ID.payment,
      "card_build_payment:official_resource_type_and_value"),
    ...[ID.layout, ID.purchase, ID.unique, ID.payment].map((source) => edge(source,
      "derives", ID.event, "card_build_payment:certified_resolution")),
    edge(ID.choose, "derives", ID.event, "card_build_payment:confirmed_choice"),
    edge(ID.event, "writes", ID.pending, "card_build_payment:clear_pending"),
    edge(ID.event, "writes", ID.history, "card_build_payment:history"),
    edge(ID.event, "writes", ID.result, "card_build_payment:last_resolution"),
    edge(ID.event, "writes", ID.log, "card_build_payment:log"),
    edge(ID.cardData, "verified_by", ID.sourceTest, "card_build_payment:source_judge"),
    edge(ID.layout, "verified_by", ID.layoutTest, "card_build_payment:layout_judge"),
    edge(ID.purchase, "verified_by", ID.purchaseTest, "card_build_payment:purchase_judge"),
    edge(ID.unique, "verified_by", ID.uniqueTest, "card_build_payment:unique_judge"),
    edge(ID.payment, "verified_by", ID.paymentTest, "card_build_payment:payment_judge"),
    edge(executor, "verified_by", ID.authorityTest, "card_build_payment:authority"),
    edge(executor, "verified_by", ID.graphTest, "card_build_payment:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.choose,
      "card_build_payment:stale")),
  ];
  const additions = [
    node(ID.cardData, "state_field", "Official card build and payment source bundle"),
    node(ID.pending, "state_field", "Card build and payment pending"),
    node(ID.history, "state_field", "Card build and payment history"),
    node(ID.result, "state_field", "Last card build and payment resolution"),
    node(ID.choose, "action_variant", "Choose certified card build or payment plan"),
    node(ID.profile, "derived_value", "Exact official card profile"),
    node(ID.layout, "derived_value", "Standard Faction or Tactical card layout"),
    node(ID.purchase, "derived_value", "Vespene Tactical card purchase"),
    node(ID.uniqueSet, "derived_value", "Complete army card instance set"),
    node(ID.unique, "derived_value", "Unique single-copy audit"),
    node(ID.paymentSet, "derived_value", "Complete selected ability payment cards"),
    node(ID.payment, "derived_value", "Ability resource payment and excess loss"),
    node(ID.event, "state_event", "Card build or payment rules resolved"),
    node(ID.sourceTest, "judge_test", "Pinned card source Judge"),
    node(ID.layoutTest, "judge_test", "Card layout Judge"),
    node(ID.purchaseTest, "judge_test", "Tactical purchase Judge"),
    node(ID.uniqueTest, "judge_test", "Unique card Judge"),
    node(ID.paymentTest, "judge_test", "Ability payment Judge"),
    node(ID.authorityTest, "judge_test", "Authority replay Judge"),
    node(ID.graphTest, "judge_test", "Relationship negative-gap Judge"),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return { nodes: [...previous.nodes,
    ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
  edges: [...previous.edges, ...edges],
  executorLineages: [...previous.executorLineages, {
    executorId: OFFICIAL_CARD_BUILD_PAYMENT_RULES_EXECUTOR_ID,
    ruleAtomIds: [...OFFICIAL_CARD_BUILD_PAYMENT_RULES_EXECUTOR_ATOM_IDS],
    provenance: "runtime_action_lineage:card_build_payment_rules_v1" }],
  declaredStateContractExecutorIds: [...previous.declaredStateContractExecutorIds,
    OFFICIAL_CARD_BUILD_PAYMENT_RULES_EXECUTOR_ID],
  coverageScopes: [...previous.coverageScopes, {
    scopeId: OFFICIAL_CARD_BUILD_PAYMENT_RULES_RELATIONSHIP_SCOPE_ID,
    executorId: OFFICIAL_CARD_BUILD_PAYMENT_RULES_EXECUTOR_ID,
    requiredNodeIds: [...new Set([executor, ...reads, ID.log, ID.choose, ID.profile,
      ID.layout, ID.purchase, ID.uniqueSet, ID.unique, ID.paymentSet, ID.payment,
      ID.event, ID.sourceTest, ID.layoutTest, ID.purchaseTest, ID.uniqueTest,
      ID.paymentTest, ID.authorityTest, ID.graphTest])],
    requiredEdges: edges,
    requiredPaths: [
      { from: ID.cardData, to: ID.event, relationships: ["derives"], maxDepth: 6 },
      { from: ID.uniqueSet, to: ID.event, relationships: ["derives"], maxDepth: 4 },
      { from: ID.paymentSet, to: ID.event, relationships: ["derives"], maxDepth: 4 },
    ], forbiddenPaths: [],
    evidenceTestNodeIds: [ID.sourceTest, ID.layoutTest, ID.purchaseTest,
      ID.uniqueTest, ID.paymentTest, ID.authorityTest, ID.graphTest],
  }] };
}
