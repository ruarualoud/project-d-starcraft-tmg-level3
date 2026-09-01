#!/usr/bin/env node

import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_NEW_ATOM_IDS,
  OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_PARAMETER_KIND,
  openOfficialFactionArmyEligibilityRulesPendingV1,
} from "../packages/rule-atoms/official-faction-army-eligibility-rules-executor-v1.mjs";
import {
  resolveOfficialArmySlotAuditV1,
  resolveOfficialEngagementScaleAgreementV1,
  resolveOfficialFactionCardSelectionV1,
  resolveOfficialFactionTagEligibilityV1,
} from "../packages/rule-atoms/official-faction-army-eligibility-rules-kernel-v1.mjs";
import { OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-faction-army-eligibility-rules-relationship-contract-v1.mjs";
import {
  createOfficialFactionArmyEligibilityRulesRuleSliceV1,
  verifyOfficialFactionArmyEligibilityRulesRuleSliceV1,
} from "../packages/rule-atoms/official-faction-army-eligibility-rules-rule-slice-v1.mjs";
import { createOfficialRemainingRuleAtomRouteV2 } from
  "../packages/rule-atoms/official-remaining-rule-atom-route-v2.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import {
  createOfficialFactionArmyEligibilityDataBundleV1,
  getOfficialArmyCandidateProfileV1,
  getOfficialFactionProfileV1,
  verifyOfficialFactionArmyEligibilityDataBundleV1,
} from "../packages/source-data/official-faction-army-eligibility-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-respawn-morph-rules-rule-slice-v1-report.json"), "utf8"));
const routeBaseReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-elevation-effective-size-rules-rule-slice-v1-report.json"), "utf8"));
const acceptance = [];
function accept(...names) { acceptance.push(...names); }
function rejects(code, operation) {
  assert.throws(operation, (error) => String(error?.message || error).startsWith(code));
}

const slice = createOfficialFactionArmyEligibilityRulesRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialFactionArmyEligibilityRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 793,
  newlyExecutableRuleAtoms: 24, reviewRequiredRuleAtoms: 119,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 793,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 71, missingStateContractExecutors: 0 });
accept("01_slice102_promotes_exact_24_route_atoms_to_793_executable");
const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 102);
assert.deepEqual(assignment.atomIds,
  [...OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_NEW_ATOM_IDS]);
assert.deepEqual([assignment.executableAfter, assignment.reviewRequiredAfter], [793, 119]);
accept("02_route_v2_exact_slice102_atom_identity_and_counts_match");
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executorManifest.length, 71);
accept("03_runtime_exposes_faction_army_eligibility_as_executor_71");

const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const bundle = createOfficialFactionArmyEligibilityDataBundleV1({
  dataset: fixture.dataset,
});
assert.equal(verifyOfficialFactionArmyEligibilityDataBundleV1(bundle), true);
accept("04_faction_army_eligibility_bundle_is_content_hash_verified");
assert.deepEqual(bundle.ruleClauses.map((entry) => entry.atomId).sort(),
  [...OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_NEW_ATOM_IDS]);
accept("05_twenty_four_exact_core_clause_boundaries_cover_route_atoms");
assert.deepEqual(bundle.ruleSectionRecords.map((entry) => entry.title), [
  "PART 2: CORE CONCEPTS", "PART 5: CARDS AND CHARACTERISTICS",
  "PART 9: PREPARING FOR BATTLE",
  "PART 11: KEYWORD GLOSSARY AND DEFINITIONS",
]);
accept("06_four_exact_rule_section_records_are_pinned");
assert.equal(bundle.ruleClauses.every((entry) => (
  entry.sourceTextHashes.every((hash) => /^[a-f0-9]{64}$/u.test(hash))
    && /^[a-f0-9]{64}$/u.test(entry.candidateSequenceHash)
)), true);
accept("07_each_atom_binds_source_text_and_candidate_sequence_hashes");
assert.equal(bundle.sourcePolicy.refreshDuringDevelopment, false);
assert.equal(bundle.sourcePolicy.repositoryFallbackAllowed, false);
accept("08_source_lock_remains_offline_without_repository_fallback");

assert.deepEqual({ factionCardCount: bundle.audit.factionCardCount,
  tacticalCandidateCount: bundle.audit.tacticalCandidateCount,
  fieldableUnitCount: bundle.audit.fieldableUnitCount,
  nonArmyBuildingUnitCount: bundle.audit.nonArmyBuildingUnitCount },
{ factionCardCount: 6, tacticalCandidateCount: 31,
  fieldableUnitCount: 22, nonArmyBuildingUnitCount: 4 });
accept("09_current_product_denominator_is_6_factions_31_tactical_22_fieldable_units");
assert.deepEqual(bundle.raceTags, ["Protoss", "Terran", "Zerg"]);
accept("10_race_tag_set_is_exactly_protoss_terran_zerg");
assert.deepEqual(bundle.subFactionTags.map((entry) => entry.tag),
  ["Kerrigan's Swarm", "Khalai", "Raynor's Raiders"]);
accept("11_current_subfaction_registry_has_exactly_three_tags");
assert.equal(bundle.factionProfiles.length, 6);
accept("12_six_current_faction_card_profiles_are_compiled");
assert.equal(bundle.armyCandidateProfiles.length, 53);
accept("13_complete_army_building_candidate_denominator_is_53");
assert.equal(bundle.eligibilityMatrix.length, 318);
assert.deepEqual(bundle.audit.eligibleCountsByFaction, { Daelaam: 15,
  "Kerrigan's Swarm": 21, Khalai: 16, "Raynor's Raiders": 16,
  "Terran Armed Forces": 15, "Zerg Swarm": 19 });
accept("14_complete_six_by_fifty_three_eligibility_matrix_is_pinned");
assert.equal(bundle.sourceReconciliation.oldUnitCardSupplyProjectionRaceOnly, true);
assert.equal(bundle.sourceReconciliation.oldUnitCardSupplyExecutorFrozen, true);
accept("15_slice93_race_only_projection_is_reconciled_without_rewrite");
assert.equal(bundle.sourceReconciliation.unitSubFactionSourceField, "keywords");
accept("16_unit_subfaction_tags_are_read_from_current_keywords_field");
assert.deepEqual(bundle.nonArmyBuildingUnitProfiles.map((entry) => entry.candidateName),
  ["Omega Worm", "Point Defense Drone", "Pylon", "Roachling"]);
accept("17_other_and_summoned_units_are_explicitly_excluded_from_army_building");

assert.deepEqual(bundle.engagementScales.map((entry) => entry.scaleId),
  ["Skirmish", "Standard", "Grand Offensive"]);
accept("18_engagement_scale_table_has_exactly_three_rows");
assert.deepEqual(bundle.engagementScales.map((entry) => entry.mineralLimit), [
  { kind: "maximum", maximumInclusive: 1000 },
  { kind: "maximum", maximumInclusive: 2000 },
  { kind: "minimum_open", minimumInclusive: 2001 },
]);
assert.equal(bundle.engagementScales.every((entry) => (
  entry.vespeneRatio.numerator === 1 && entry.vespeneRatio.denominator === 10)), true);
accept("19_scale_rows_preserve_exact_mineral_boundaries_and_ten_percent_vespene_ratio");
assert.deepEqual(bundle.engagementScales.map((entry) => entry.battlefield), [
  { widthMilliInches: 36000, lengthMilliInches: 36000 },
  { widthMilliInches: 36000, lengthMilliInches: 54000 },
  { widthMilliInches: 36000, lengthMilliInches: 72000 },
]);
accept("20_scale_rows_preserve_exact_battlefield_dimensions");

function prepare() {
  const state = fixture.battleState({ activeSideKey: "player1" });
  state.phase = "army_building"; state.rulesProcedureMode = true;
  state.officialFactionArmyEligibilityDataBundle = bundle;
  state.factionArmyEligibilityRulesHistory = [];
  state.armyBuildingConfigurationBySide = {};
  return state;
}
let state = prepare();
let resolved = resolveOfficialEngagementScaleAgreementV1({
  procedureKind: "engagement_scale_agreement",
  factionArmyEligibilityDataBundle: bundle, state,
  rulesOwnedPlayerDenominatorRequested: true, playerAgreementSetComplete: true,
  playerAgreements: [{ playerId: "player1", scaleId: "Standard", agreed: true },
    { playerId: "player2", scaleId: "Standard", agreed: true }],
});
assert.equal(resolved.scale.scaleId, "Standard");
assert.equal(resolved.completeResourceBudgetDeferredToSlice, 103);
accept("21_all_players_can_agree_one_rules_owned_engagement_scale");
rejects("ENGAGEMENT_SCALE_ALL_PLAYERS_MUST_AGREE", () => (
  resolveOfficialEngagementScaleAgreementV1({
    procedureKind: "engagement_scale_agreement",
    factionArmyEligibilityDataBundle: bundle, state,
    rulesOwnedPlayerDenominatorRequested: true, playerAgreementSetComplete: true,
    playerAgreements: [{ playerId: "player1", scaleId: "Standard", agreed: true },
      { playerId: "player2", scaleId: "Skirmish", agreed: true }],
  })));
accept("22_mixed_scale_agreements_fail_closed");
rejects("ENGAGEMENT_SCALE_AGREEMENT_REQUEST_INVALID", () => (
  resolveOfficialEngagementScaleAgreementV1({
    procedureKind: "engagement_scale_agreement",
    factionArmyEligibilityDataBundle: bundle, state,
    rulesOwnedPlayerDenominatorRequested: true, playerAgreementSetComplete: true,
    playerAgreements: [{ playerId: "player1", scaleId: "Standard", agreed: true },
      { playerId: "player2", scaleId: "Standard", agreed: true }],
    clientSuppliedScaleProfile: { mineralLimit: 999999 },
  })));
accept("23_client_cannot_forge_engagement_scale_profile");

function faction(name) {
  return bundle.factionProfiles.find((entry) => entry.factionName === name);
}
function candidate(name) {
  return bundle.armyCandidateProfiles.find((entry) => entry.candidateName === name);
}
function sourceCard(recordKey) {
  return bundle.cardDataBundle.cardProfiles.find((entry) => entry.recordKey === recordKey);
}
function factionRef(profile, cardInstanceId = "faction-1") {
  return { cardInstanceId, recordKey: profile.recordKey,
    sourceRecordHash: profile.sourceRecordHash, payloadHash: profile.payloadHash,
    profileHash: profile.profileHash };
}
function selectionCard(profile, cardInstanceId) {
  const source = sourceCard(profile.recordKey);
  return { cardInstanceId, recordKey: source.recordKey,
    sourceRecordHash: source.sourceRecordHash, payloadHash: source.payloadHash,
    sourceCardProfileHash: source.profileHash };
}
function candidateRef(profile, candidateInstanceId) {
  return { candidateInstanceId, recordKey: profile.recordKey,
    sourceRecordHash: profile.sourceRecordHash, payloadHash: profile.payloadHash,
    candidateProfileHash: profile.profileHash };
}
function tacticalRef(profile, cardInstanceId) {
  return { cardInstanceId, recordKey: profile.recordKey,
    sourceRecordHash: profile.sourceRecordHash, payloadHash: profile.payloadHash,
    candidateProfileHash: profile.profileHash };
}
function unitRef(profile, unitInstanceId, compositionKind) {
  return { unitInstanceId, recordKey: profile.recordKey,
    sourceRecordHash: profile.sourceRecordHash, payloadHash: profile.payloadHash,
    candidateProfileHash: profile.profileHash, compositionKind };
}

const kerrigan = faction("Kerrigan's Swarm");
const hatchery = candidate("Hatchery");
resolved = resolveOfficialFactionCardSelectionV1({
  procedureKind: "faction_card_selection",
  factionArmyEligibilityDataBundle: bundle, armyCardInstanceSetComplete: true,
  rulesOwnedFactionCardSelectionRequested: true,
  cardInstances: [selectionCard(kerrigan, "faction-1"),
    selectionCard(hatchery, "hatchery-1")],
  selectedFactionCard: factionRef(kerrigan),
});
assert.equal(resolved.exactlyOneFactionCard, true);
accept("24_complete_card_set_enforces_exactly_one_faction_card");
assert.equal(resolved.factionCard.raceTag, "Zerg");
assert.deepEqual(resolved.factionCard.factionTags, ["Zerg", "Kerrigan's Swarm"]);
assert.deepEqual(resolved.factionCard.startingArmySlots,
  { Air: 0, Core: 3, Elite: 2, Hero: 1, Support: 0 });
assert.equal(resolved.factionCard.specialAbilities.count, 3);
accept("25_faction_card_layout_is_rules_owned_name_tags_slots_and_abilities");
rejects("EXACTLY_ONE_FACTION_CARD_REQUIRED", () => (
  resolveOfficialFactionCardSelectionV1({
    procedureKind: "faction_card_selection",
    factionArmyEligibilityDataBundle: bundle, armyCardInstanceSetComplete: true,
    rulesOwnedFactionCardSelectionRequested: true,
    cardInstances: [selectionCard(hatchery, "hatchery-1")],
    selectedFactionCard: factionRef(kerrigan),
  })));
accept("26_zero_faction_cards_fail_closed");
rejects("EXACTLY_ONE_FACTION_CARD_REQUIRED", () => (
  resolveOfficialFactionCardSelectionV1({
    procedureKind: "faction_card_selection",
    factionArmyEligibilityDataBundle: bundle, armyCardInstanceSetComplete: true,
    rulesOwnedFactionCardSelectionRequested: true,
    cardInstances: [selectionCard(kerrigan, "faction-1"),
      selectionCard(faction("Zerg Swarm"), "faction-2")],
    selectedFactionCard: factionRef(kerrigan),
  })));
accept("27_two_faction_cards_fail_closed");
rejects("SELECTED_FACTION_CARD_INVALID", () => (
  resolveOfficialFactionCardSelectionV1({
    procedureKind: "faction_card_selection",
    factionArmyEligibilityDataBundle: bundle, armyCardInstanceSetComplete: true,
    rulesOwnedFactionCardSelectionRequested: true,
    cardInstances: [selectionCard(kerrigan, "faction-1")],
    selectedFactionCard: { ...factionRef(kerrigan), profileHash: "f".repeat(64) },
  })));
accept("28_forged_faction_profile_hash_fails_closed");

const zergling = candidate("Zergling");
const raptor = candidate("Kerrigan Swarm Raptor (Zergling)");
const malignant = candidate("Malignant Creep");
resolved = resolveOfficialFactionTagEligibilityV1({
  procedureKind: "faction_tag_eligibility",
  factionArmyEligibilityDataBundle: bundle, factionCard: factionRef(kerrigan),
  candidateInstanceSetComplete: true, rulesOwnedTagComparisonRequested: true,
  candidateInstances: [candidateRef(zergling, "zergling-1")],
});
assert.equal(resolved.eligibilityRows[0].eligible, true);
accept("29_race_only_candidate_is_eligible_under_matching_subfaction_card");
resolved = resolveOfficialFactionTagEligibilityV1({
  procedureKind: "faction_tag_eligibility",
  factionArmyEligibilityDataBundle: bundle, factionCard: factionRef(kerrigan),
  candidateInstanceSetComplete: true, rulesOwnedTagComparisonRequested: true,
  candidateInstances: [candidateRef(raptor, "raptor-1")],
});
assert.deepEqual(resolved.eligibilityRows[0].candidateFactionTags,
  ["Zerg", "Kerrigan's Swarm"]);
accept("30_matching_subfaction_candidate_is_eligible");
rejects("FACTION_TAG_MISMATCH", () => resolveOfficialFactionTagEligibilityV1({
  procedureKind: "faction_tag_eligibility",
  factionArmyEligibilityDataBundle: bundle,
  factionCard: factionRef(faction("Zerg Swarm")),
  candidateInstanceSetComplete: true, rulesOwnedTagComparisonRequested: true,
  candidateInstances: [candidateRef(raptor, "raptor-1")],
}));
accept("31_generic_race_faction_rejects_subfaction_unit");
rejects("FACTION_TAG_MISMATCH", () => resolveOfficialFactionTagEligibilityV1({
  procedureKind: "faction_tag_eligibility",
  factionArmyEligibilityDataBundle: bundle,
  factionCard: factionRef(faction("Terran Armed Forces")),
  candidateInstanceSetComplete: true, rulesOwnedTagComparisonRequested: true,
  candidateInstances: [candidateRef(zergling, "zergling-1")],
}));
accept("32_cross_race_candidate_fails_closed");
assert.equal(resolved.fewerCandidateTagsPermitted, true);
accept("33_candidate_need_not_match_extra_tags_on_faction_card");
assert.equal(resolved.everyCandidateTagAppearsOnFactionCard, true);
assert.equal(resolved.anyMissingTagDisqualifies, true);
accept("34_every_candidate_tag_must_match_and_one_missing_tag_disqualifies");
assert.deepEqual(raptor.subFactionTags, ["Kerrigan's Swarm"]);
assert.deepEqual(candidate("Raynor's Raider (Marine)").subFactionTags,
  ["Raynor's Raiders"]);
assert.deepEqual(candidate("Praetor Guard (Zealot)").subFactionTags, ["Khalai"]);
accept("35_all_three_fieldable_subfaction_units_use_exact_current_keyword_tags");
assert.deepEqual(malignant.factionTags, ["Zerg", "Kerrigan's Swarm"]);
accept("36_malignant_creep_keeps_exact_zerg_kerrigan_tactical_tags");

assert.deepEqual(bundle.armySlotTypes, ["Air", "Core", "Elite", "Hero", "Support"]);
accept("37_army_slot_type_set_is_exactly_air_core_elite_hero_support");
assert.deepEqual(kerrigan.startingArmySlots,
  { Air: 0, Core: 3, Elite: 2, Hero: 1, Support: 0 });
accept("38_faction_card_provides_exact_initial_slot_pool");
assert.deepEqual(hatchery.tacticalArmySlots,
  { Air: 0, Core: 0, Elite: 0, Hero: 0, Support: 1 });
accept("39_tactical_card_adds_exact_official_slot_profile");
assert.deepEqual(candidate("Hydralisk").compositionSlots.map((entry) => ({
  compositionKind: entry.compositionKind, startingSupply: entry.startingSupply,
  occupiedArmySlots: entry.occupiedArmySlots })), [
  { compositionKind: "small", startingSupply: 2, occupiedArmySlots: 2 },
  { compositionKind: "large", startingSupply: 3, occupiedArmySlots: 3 },
]);
accept("40_unit_starting_supply_equals_designated_slot_occupancy");

function legalSlotInput(extra = {}) {
  return { procedureKind: "army_slot_audit",
    factionArmyEligibilityDataBundle: bundle,
    factionCard: factionRef(kerrigan), armyInstanceSetComplete: true,
    tacticalCardInstances: [tacticalRef(hatchery, "hatchery-1")],
    unitInstances: [unitRef(zergling, "zergling-1", "large"),
      unitRef(candidate("Hydralisk"), "hydra-1", "small"),
      unitRef(candidate("Kerrigan"), "kerrigan-1", "small"),
      unitRef(candidate("Queen"), "queen-1", "small")],
    unusedSlotDisposition: "lost", rulesOwnedSlotTotalsRequested: true, ...extra };
}
resolved = resolveOfficialArmySlotAuditV1(legalSlotInput());
assert.deepEqual(resolved.availableArmySlots,
  { Air: 0, Core: 3, Elite: 2, Hero: 1, Support: 1 });
assert.deepEqual(resolved.usedArmySlots,
  { Air: 0, Core: 2, Elite: 2, Hero: 1, Support: 1 });
accept("41_complete_army_slot_audit_sums_faction_tactical_and_unit_occupancy");
rejects("ARMY_SLOT_CAPACITY_EXCEEDED", () => resolveOfficialArmySlotAuditV1({
  ...legalSlotInput(), tacticalCardInstances: [],
  unitInstances: [unitRef(candidate("Hydralisk"), "hydra-1", "large")],
}));
accept("42_unit_cannot_exceed_available_slots_of_its_designated_type");
assert.deepEqual(resolved.unusedArmySlots,
  { Air: 0, Core: 1, Elite: 0, Hero: 0, Support: 0 });
assert.equal(resolved.unusedArmySlotsDisposition, "lost");
accept("43_unused_slots_are_lost_not_carried_forward");
rejects("ARMY_SLOT_AUDIT_REQUEST_INVALID", () => resolveOfficialArmySlotAuditV1({
  ...legalSlotInput(), retainedUnusedSlots: { Core: 1 },
}));
accept("44_client_cannot_retain_convert_or_exchange_unused_slots");
rejects("ARMY_CANDIDATE_PROFILE_REQUIRED", () => getOfficialArmyCandidateProfileV1(
  bundle, bundle.nonArmyBuildingUnitProfiles.find((entry) => (
    entry.candidateName === "Pylon")).recordKey));
accept("45_summoned_other_unit_cannot_occupy_an_army_building_slot");
const uniqueTacticalSource = bundle.cardDataBundle.cardProfiles.find((entry) => (
  !entry.isFactionCard && entry.isUnique && entry.raceTag === "Zerg"));
const uniqueTactical = getOfficialArmyCandidateProfileV1(bundle,
  uniqueTacticalSource.recordKey);
rejects("UNIQUE_CARD_SINGLE_COPY_LIMIT", () => resolveOfficialArmySlotAuditV1({
  ...legalSlotInput(), unitInstances: [], tacticalCardInstances: [
    tacticalRef(uniqueTactical, "unique-1"), tacticalRef(uniqueTactical, "unique-2")],
}));
accept("46_frozen_slice92_unique_copy_audit_composes_into_slot_audit");
assert.equal(resolved.completeResourceBudgetValidated, false);
assert.equal(resolved.completeResourceBudgetDeferredToSlice, 103);
assert.equal(resolved.completeCompositionCostAndUpgradeValidationDeferredToSlice, 104);
accept("47_resource_budget_and_complete_composition_cost_remain_explicitly_deferred");

function plan(planId, procedureKind, input) {
  return { planId, procedureKind, input,
    rulesOwnedInputsComplete: true, clientSuppliedResult: false };
}
function procedure(procedureKind, candidatePlan) {
  return { procedureKind, sideKey: "player1", candidatePlansComplete: true,
    rulesDenominatorComplete: true, candidatePlans: [candidatePlan] };
}
function bindingFor() {
  const dataHash = hashStarcraftTmgContract(fixture.gameplayDataBundle);
  return { bindingHash: "slice-102-faction-army-eligibility-binding",
    dataSnapshotHash: dataHash,
    dependencies: { dataSnapshot: { contentHash: dataHash } } };
}
state = prepare();
const slotPlan = plan("legal-slot-plan", "army_slot_audit", legalSlotInput());
const opened = openOfficialFactionArmyEligibilityRulesPendingV1(state,
  procedure("army_slot_audit", slotPlan));
const binding = bindingFor();
const space = runtime.enumerate(opened.state, { sideKey: "player1",
  includeDisabled: true, matchBinding: binding });
const domain = space.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_PARAMETER_KIND));
assert(domain);
const instantiated = runtime.instantiate(opened.state, domain,
  { choiceId: domain.constraints.choices[0].choiceId }, { matchBinding: binding });
const applied = runtime.apply(opened.state, instantiated.action, { matchBinding: binding });
assert.equal(applied.state.pendingAction, null);
assert.equal(applied.state.factionArmyEligibilityRulesHistory.length, 1);
accept("48_runtime_exposes_hash_bound_domain_and_applies_confirmed_slot_audit");
assert.deepEqual(applied.state.armyBuildingConfigurationBySide.player1
  .armySlotAudit.unusedArmySlots,
{ Air: 0, Core: 1, Elite: 0, Hero: 0, Support: 0 });
assert.equal(applied.state.lastFactionArmyEligibilityRulesResolution
  .rulesOwnedArmyBuildingMutationApplied, true);
accept("49_apply_writes_only_rules_owned_army_building_configuration_and_history");

const graph = audit.graph; const graphAudit = auditRuleRelationshipGraphV1(graph);
assert.equal(graphAudit.valid, true);
assert.deepEqual({ nodes: graph.nodes.length, edges: graph.edges.length },
  { nodes: 11291, edges: 31836 });
const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_RELATIONSHIP_SCOPE_ID));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "executor:authority.unit-card-supply-rules-v1@1.0.0"
    && entry.to
      === "derived_value:factionArmyEligibilityV1.startingSupplySlotOccupancy"));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash")));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
accept("50_relationship_graph_is_valid_and_blocks_missing_unit_slot_dependency");

function engineFor(keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-09-01T08:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-102-faction-army-eligibility",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 102 faction and army eligibility rules.";
function envelopeFor(engine, stateInput) {
  return engine.createEnvelope({ roomId: "official-slice-102-faction-army-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-faction-army-no-geometry-v1",
        content: { kind: "geometry-artifact",
          geometryVersion: "faction_army_no_geometry_v1" } },
      rulesDisplay: { artifactId: "official-slice-102-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "official-slice-102-action-schema-v40",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v40" } },
    }, state: stateInput });
}
function registerReplay(engine, initial) {
  const entries = { sourceSnapshot: fixture.snapshot,
    dataSnapshot: fixture.gameplayDataBundle,
    rulesArtifact: { kind: "rules-artifact", rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: initial.matchBinding.rulesRuntimeBinding },
    executorArtifact: { kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: initial.matchBinding.rulesRuntimeBinding.runtimeHash,
      catalogueHash: initial.matchBinding.rulesRuntimeBinding.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest },
    geometryArtifact: { kind: "geometry-artifact",
      geometryVersion: "faction_army_no_geometry_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v40" } };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}
const keys = generateKeyPairSync("ed25519");
const authority = engineFor(keys, "slice-102-faction-army-short-seal-v1");
state = prepare();
const seed = envelopeFor(authority, state);
const authorityOpened = openOfficialFactionArmyEligibilityRulesPendingV1(seed.state,
  procedure("army_slot_audit", slotPlan));
const initial = authority.createEnvelope({ roomId: seed.roomId,
  matchBinding: seed.matchBinding, state: authorityOpened.state });
registerReplay(authority, initial);
const seat = authority.issueSeatAuthority({ grantId: "slice-102-faction-army-grant",
  roomId: initial.roomId, matchBindingHash: initial.matchBindingHash,
  seatKey: "player1", roleMode: "player", principalType: "human",
  capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
const lease = authority.issueControlLease({ seatAuthority: seat,
  sessionId: "slice-102-faction-army-session", leaseFence: 1,
  issuedAtRoomRevision: initial.stateRevision });
const authoritySpace = authority.legalSpace(initial, { seatAuthority: seat });
const authorityDomain = authoritySpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_PARAMETER_KIND));
const preview = authority.preview({ envelope: initial, seatAuthority: seat,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: { choiceId: authorityDomain.constraints.choices[0].choiceId } } });
const confirmation = authority.confirmPreview({ envelope: initial,
  preview: preview.preview, seatAuthority: seat });
const authoritativeApplied = authority.apply({ envelope: initial,
  expectedStateRevision: initial.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: seat, controlLease: lease,
  idempotencyKey: "slice-102-faction-army-eligibility" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
const replay = engineFor(keys, "slice-102-faction-army-rotated-seal-v2");
registerReplay(replay, initial);
assert.equal(replay.replay({ initialEnvelope: initial,
  journal: [authoritativeApplied.receipt] }).ok, true);
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_faction_army_event" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
accept("51_authority_ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

assert.equal(previousReport.slice.sliceHash,
  "7813422ee78075f51c21ce70f1611ab09006ac52a21deea6d9157166d71287e0");
assert.equal(slice.factionArmyEligibilityRulesProgress.existingCardUnitAndSummonExecutorsFrozen,
  true);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.factionArmyEligibilityRulesProgress.sourceRefreshPerformed, false);
accept("52_slice101_and_old_executors_stay_frozen_with_no_skill_dsh_or_training_promotion");

assert.equal(acceptance.length, 52);
const report = {
  schema: "starcraft_tmg_official_faction_army_eligibility_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit,
  factionArmyEligibilityDataBundle: bundle,
  remainingRouteV2Hash: route.routeHash, slice, sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash, catalogueHash: slice.catalogueHash,
  graph, graphAudit, coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true,
    historicalRulesDisplayRetained: true },
  boundaries: { factionCardCount: 6, armyBuildingCandidateCount: 53,
    eligibilityMatrixRowCount: 318, nonArmyBuildingUnitCount: 4,
    unitSubFactionSourceField: "keywords", completeResourceBudgetDeferredToSlice: 103,
    existingCardUnitSummonExecutorsFrozen: true },
  ctx2skill: slice.ctx2skill, harness: slice.harness,
  rulesEligible: false, productionRoomEligible: false,
  rulesTruth: "official_faction_army_eligibility_rules_state_transition_conformance",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-faction-army-eligibility-rules-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ schema: report.schema,
  acceptancePassed: report.acceptancePassed, acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash, catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash, graphHash: graph.graphHash,
  graphCounts: { nodes: graph.nodes.length, edges: graph.edges.length },
  counts: audit.counts, dataBundleHash: bundle.bundleHash,
  sourceLockHash: fixture.sourceLockAudit.lockHash,
  sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  trainingTruth: false }, null, 2));
