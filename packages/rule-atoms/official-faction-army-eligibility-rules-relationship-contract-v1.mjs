import {
  OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_ID,
  OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_VERSION,
} from "./official-faction-army-eligibility-rules-executor-v1.mjs";
import { createOfficialRespawnMorphRulesRelationshipExtensionV1 } from
  "./official-respawn-morph-rules-relationship-contract-v1.mjs";

export const OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-102-faction-army-eligibility-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  data: "state_field:officialFactionArmyEligibilityDataBundle",
  mode: "state_field:rulesProcedureMode", round: "state_field:round",
  phase: "state_field:phase", active: "state_field:activeSideKey",
  players: "state_field:players",
  scaleState: "state_field:armyBuildingEngagementScale",
  configuration: "state_field:armyBuildingConfigurationBySide",
  pending: "state_field:pendingAction.factionArmyEligibilityRules",
  history: "state_field:factionArmyEligibilityRulesHistory",
  last: "state_field:lastFactionArmyEligibilityRulesResolution",
  log: "state_field:log",
  choose: "action_variant:factionArmyEligibilityRulesV1.chooseCertifiedPlan",
  scaleAgreement: "derived_value:factionArmyEligibilityV1.engagementScaleAgreement",
  scaleProfile: "derived_value:factionArmyEligibilityV1.engagementScaleProfile",
  factionProfile: "derived_value:factionArmyEligibilityV1.exactFactionCardProfile",
  exactlyOneFaction: "derived_value:factionArmyEligibilityV1.exactlyOneFactionCard",
  raceTags: "derived_value:factionArmyEligibilityV1.raceTagSet",
  subFactionTags: "derived_value:factionArmyEligibilityV1.subFactionTagRegistry",
  unitTags: "derived_value:factionArmyEligibilityV1.unitKeywordFactionTags",
  cardTags: "derived_value:factionArmyEligibilityV1.cardFactionTags",
  eligibility: "derived_value:factionArmyEligibilityV1.allCandidateTagsSubset",
  slotTypes: "derived_value:factionArmyEligibilityV1.armySlotTypeSet",
  initialSlots: "derived_value:factionArmyEligibilityV1.factionInitialSlots",
  tacticalSlots: "derived_value:factionArmyEligibilityV1.tacticalAdditionalSlots",
  unitOccupancy: "derived_value:factionArmyEligibilityV1.startingSupplySlotOccupancy",
  slotCapacity: "derived_value:factionArmyEligibilityV1.armySlotCapacityAudit",
  unusedSlots: "derived_value:factionArmyEligibilityV1.unusedSlotsLost",
  event: "state_event:faction_army_eligibility_rules_resolved",
  cardExecutor: "executor:authority.card-build-payment-rules-v1@1.0.0",
  unitExecutor: "executor:authority.unit-card-supply-rules-v1@1.0.0",
  summonExecutor: "executor:authority.summon-rules-v1@1.0.0",
  sourceTest: "judge_test:faction-army-eligibility-v1-source",
  scaleTest: "judge_test:faction-army-eligibility-v1-scale",
  factionTest: "judge_test:faction-army-eligibility-v1-faction-card",
  tagTest: "judge_test:faction-army-eligibility-v1-tags",
  slotTest: "judge_test:faction-army-eligibility-v1-slots",
  authorityTest: "judge_test:faction-army-eligibility-v1-authority-replay",
  graphTest: "judge_test:faction-army-eligibility-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-102" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialFactionArmyEligibilityRulesRelationshipExtensionV1(
  input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("FACTION_ARMY_ELIGIBILITY_RELEASE_INVALID");
  }
  const previous = createOfficialRespawnMorphRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash });
  const executor = `executor:${OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.data, ID.mode, ID.round, ID.phase,
    ID.active, ID.players, ID.scaleState, ID.configuration, ID.pending, ID.history,
    ID.last, ID.log];
  const writes = [ID.scaleState, ID.configuration, ID.pending, ID.history, ID.last, ID.log];
  const derived = [ID.scaleAgreement, ID.scaleProfile, ID.factionProfile,
    ID.exactlyOneFaction, ID.raceTags, ID.subFactionTags, ID.unitTags, ID.cardTags,
    ID.eligibility, ID.slotTypes, ID.initialSlots, ID.tacticalSlots, ID.unitOccupancy,
    ID.slotCapacity, ID.unusedSlots];
  const consumers = [ID.cardExecutor, ID.unitExecutor, ID.summonExecutor];
  const tests = [ID.sourceTest, ID.scaleTest, ID.factionTest, ID.tagTest, ID.slotTest,
    ID.authorityTest, ID.graphTest];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "faction_army_eligibility:state_contract")),
    edge(executor, "exposes", ID.choose,
      "faction_army_eligibility:certified_plan_choice"),
    edge(ID.players, "derives", ID.scaleAgreement,
      "faction_army_eligibility:complete_player_denominator"),
    edge(ID.data, "derives", ID.scaleProfile,
      "faction_army_eligibility:fixed_scale_table"),
    edge(ID.scaleAgreement, "gates", ID.scaleProfile,
      "faction_army_eligibility:all_players_same_scale"),
    edge(ID.data, "derives", ID.factionProfile,
      "faction_army_eligibility:six_current_faction_cards"),
    edge(ID.cardExecutor, "consumed_by", ID.factionProfile,
      "faction_army_eligibility:frozen_card_profile_dependency"),
    edge(ID.factionProfile, "derives", ID.exactlyOneFaction,
      "faction_army_eligibility:complete_card_instance_set"),
    edge(ID.data, "derives", ID.raceTags,
      "faction_army_eligibility:terran_zerg_protoss"),
    edge(ID.data, "derives", ID.subFactionTags,
      "faction_army_eligibility:current_subfaction_registry"),
    edge(ID.unitExecutor, "consumed_by", ID.unitTags,
      "faction_army_eligibility:frozen_unit_profile_dependency"),
    edge(ID.subFactionTags, "derives", ID.unitTags,
      "faction_army_eligibility:keywords_field_reconciliation"),
    edge(ID.cardExecutor, "consumed_by", ID.cardTags,
      "faction_army_eligibility:frozen_tactical_tag_dependency"),
    ...[ID.factionProfile, ID.unitTags, ID.cardTags].map((source) => edge(source,
      "derives", ID.eligibility, "faction_army_eligibility:all_candidate_tags_subset")),
    edge(ID.data, "derives", ID.slotTypes,
      "faction_army_eligibility:core_elite_support_air_hero"),
    edge(ID.factionProfile, "derives", ID.initialSlots,
      "faction_army_eligibility:faction_card_starting_pool"),
    edge(ID.cardExecutor, "consumed_by", ID.tacticalSlots,
      "faction_army_eligibility:tactical_slot_additions"),
    edge(ID.unitExecutor, "consumed_by", ID.unitOccupancy,
      "faction_army_eligibility:starting_supply_equals_slots"),
    ...[ID.slotTypes, ID.initialSlots, ID.tacticalSlots, ID.unitOccupancy,
      ID.eligibility].map((source) => edge(source, "gates", ID.slotCapacity,
      "faction_army_eligibility:complete_slot_audit")),
    edge(ID.slotCapacity, "derives", ID.unusedSlots,
      "faction_army_eligibility:unused_not_retained_converted_or_exchanged"),
    edge(ID.summonExecutor, "consumed_by", ID.slotCapacity,
      "faction_army_eligibility:frozen_summoned_unit_exclusion"),
    edge(ID.choose, "derives", ID.event,
      "faction_army_eligibility:confirmed_resolution"),
    ...derived.map((source) => edge(source, "derives", ID.event,
      "faction_army_eligibility:procedure_result")),
    ...writes.map((target) => edge(ID.event, "writes", target,
      "faction_army_eligibility:rules_owned_commit")),
    edge(ID.data, "verified_by", ID.sourceTest,
      "faction_army_eligibility:source_judge"),
    edge(ID.scaleProfile, "verified_by", ID.scaleTest,
      "faction_army_eligibility:scale_judge"),
    edge(ID.exactlyOneFaction, "verified_by", ID.factionTest,
      "faction_army_eligibility:faction_judge"),
    edge(ID.eligibility, "verified_by", ID.tagTest,
      "faction_army_eligibility:tag_judge"),
    edge(ID.slotCapacity, "verified_by", ID.slotTest,
      "faction_army_eligibility:slot_judge"),
    edge(executor, "verified_by", ID.authorityTest,
      "faction_army_eligibility:authority"),
    edge(executor, "verified_by", ID.graphTest,
      "faction_army_eligibility:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.choose,
      "faction_army_eligibility:stale")),
  ];
  const additions = [
    node(ID.data, "state_field", "Official faction, scale, eligibility and slot bundle"),
    node(ID.scaleState, "state_field", "Agreed army-building Engagement Scale"),
    node(ID.configuration, "state_field", "Rules-owned army-building configuration by side"),
    node(ID.pending, "state_field", "Faction and army eligibility pending"),
    node(ID.history, "state_field", "Faction and army eligibility history"),
    node(ID.last, "state_field", "Last faction and army eligibility resolution"),
    node(ID.choose, "action_variant", "Choose certified faction and army plan"),
    ...derived.map((id) => node(id, "derived_value", id.replace(/^derived_value:/u, ""))),
    node(ID.event, "state_event", "Faction and army eligibility rules resolved"),
    ...tests.map((id) => node(id, "judge_test", id.replace(/^judge_test:/u, ""))),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return { nodes: [...previous.nodes,
    ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
  edges: [...previous.edges, ...edges],
  executorLineages: [...previous.executorLineages, {
    executorId: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_ID,
    ruleAtomIds: [...OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_ATOM_IDS],
    provenance: "runtime_action_lineage:faction_army_eligibility_rules_v1" }],
  declaredStateContractExecutorIds: [...previous.declaredStateContractExecutorIds,
    OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_ID],
  coverageScopes: [...previous.coverageScopes, {
    scopeId: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_RELATIONSHIP_SCOPE_ID,
    executorId: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_ID,
    requiredNodeIds: [...new Set([executor, ...reads, ...writes, ID.choose,
      ...derived, ...consumers, ID.event, ...tests])], requiredEdges: edges,
    requiredPaths: [
      { from: ID.players, to: ID.scaleProfile,
        relationships: ["derives", "gates"], maxDepth: 3 },
      { from: ID.data, to: ID.eligibility,
        relationships: ["derives"], maxDepth: 5 },
      { from: ID.factionProfile, to: ID.slotCapacity,
        relationships: ["derives", "gates"], maxDepth: 5 },
      { from: ID.unitExecutor, to: ID.slotCapacity,
        relationships: ["consumed_by", "gates"], maxDepth: 4 },
      { from: ID.slotCapacity, to: ID.configuration,
        relationships: ["derives", "writes"], maxDepth: 4 },
    ], forbiddenPaths: [{ from: ID.cardTags, to: ID.factionProfile,
      relationships: ["writes"], maxDepth: 3 }], evidenceTestNodeIds: tests,
  }] };
}
