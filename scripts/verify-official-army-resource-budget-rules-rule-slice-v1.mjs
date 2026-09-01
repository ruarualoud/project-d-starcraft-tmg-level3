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
import {
  createOfficialExecutableRuleRuntimeV1,
} from "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_NEW_ATOM_IDS,
  OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_PARAMETER_KIND,
  openOfficialArmyResourceBudgetRulesPendingV1,
} from "../packages/rule-atoms/official-army-resource-budget-rules-executor-v1.mjs";
import {
  resolveOfficialArmyCardOpenInformationV1,
  resolveOfficialArmyResourceBudgetV1,
  resolveOfficialTeamMineralBudgetV1,
} from "../packages/rule-atoms/official-army-resource-budget-rules-kernel-v1.mjs";
import { OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-army-resource-budget-rules-relationship-contract-v1.mjs";
import {
  createOfficialArmyResourceBudgetRulesRuleSliceV1,
  verifyOfficialArmyResourceBudgetRulesRuleSliceV1,
} from "../packages/rule-atoms/official-army-resource-budget-rules-rule-slice-v1.mjs";
import { createOfficialRemainingRuleAtomRouteV2 } from
  "../packages/rule-atoms/official-remaining-rule-atom-route-v2.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import {
  createOfficialArmyResourceBudgetDataBundleV1,
  verifyOfficialArmyResourceBudgetDataBundleV1,
} from "../packages/source-data/official-army-resource-budget-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-faction-army-eligibility-rules-rule-slice-v1-report.json"), "utf8"));
const routeBaseReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-elevation-effective-size-rules-rule-slice-v1-report.json"), "utf8"));
const acceptance = [];
function accept(...names) { acceptance.push(...names); }
function rejects(code, operation) {
  assert.throws(operation, (error) => String(error?.message || error).startsWith(code));
}

const slice = createOfficialArmyResourceBudgetRulesRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialArmyResourceBudgetRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 804,
  newlyExecutableRuleAtoms: 11, reviewRequiredRuleAtoms: 108,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 804,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 72, missingStateContractExecutors: 0 });
accept("01_slice103_promotes_exact_11_route_atoms_to_804_executable");
const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 103);
assert.deepEqual(assignment.atomIds,
  [...OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_NEW_ATOM_IDS]);
assert.deepEqual([assignment.executableAfter, assignment.reviewRequiredAfter], [804, 108]);
accept("02_route_v2_exact_slice103_atom_identity_and_counts_match");
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executorManifest.length, 72);
accept("03_runtime_exposes_army_resource_budget_as_executor_72");

const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const bundle = createOfficialArmyResourceBudgetDataBundleV1({ dataset: fixture.dataset });
assert.equal(verifyOfficialArmyResourceBudgetDataBundleV1(bundle), true);
accept("04_army_resource_budget_bundle_is_content_hash_verified");
assert.deepEqual(bundle.ruleClauses.map((entry) => entry.atomId).sort(),
  [...OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_NEW_ATOM_IDS]);
accept("05_eleven_exact_core_clause_boundaries_cover_route_atoms");
assert.deepEqual(bundle.ruleSectionRecords.map((entry) => entry.title),
  ["PART 9: PREPARING FOR BATTLE", "PART 12: QUICK REFERENCE"]);
accept("06_two_exact_rule_section_records_are_pinned");
assert.equal(bundle.ruleClauses.every((entry) => (
  entry.sourceTextHashes.every((hash) => /^[a-f0-9]{64}$/u.test(hash))
    && /^[a-f0-9]{64}$/u.test(entry.candidateSequenceHash))), true);
accept("07_each_atom_binds_source_text_and_candidate_sequence_hashes");
assert.equal(bundle.sourcePolicy.refreshDuringDevelopment, false);
assert.equal(bundle.sourcePolicy.repositoryFallbackAllowed, false);
accept("08_source_lock_remains_offline_without_repository_fallback");
assert.deepEqual({ tactical: bundle.audit.tacticalBudgetProfileCount,
  compositions: bundle.audit.unitCompositionBudgetProfileCount,
  upgrades: bundle.audit.upgradeBudgetProfileCount },
{ tactical: 31, compositions: 28, upgrades: 171 });
accept("09_current_price_denominator_is_31_tactical_28_compositions_171_upgrades");
assert.deepEqual({ positive: bundle.audit.positiveUpgradeBudgetProfileCount,
  zero: bundle.audit.zeroUpgradeBudgetProfileCount,
  asymmetric: bundle.audit.asymmetricUpgradeBudgetProfileCount },
{ positive: 51, zero: 120, asymmetric: 14 });
accept("10_upgrade_cost_denominator_preserves_positive_zero_and_asymmetric_rows");
assert.deepEqual({ zero: bundle.audit.zeroCostTacticalCardCount,
  positive: bundle.audit.positiveCostTacticalCardCount }, { zero: 1, positive: 30 });
accept("11_tactical_cost_denominator_preserves_zero_and_positive_rows");
assert.equal(bundle.exactBudgetPolicy.resourceConversionAllowed, false);
accept("12_minerals_and_vespene_are_nonconvertible_by_source_policy");
assert.equal(bundle.exactBudgetPolicy.vespeneLimitRepresentation,
  "exact_rational_no_invented_rounding");
accept("13_vespene_limit_is_explicitly_exact_rational");

function faction(name) {
  return bundle.factionArmyEligibilityDataBundle.factionProfiles.find((entry) => (
    entry.factionName === name));
}
function candidate(recordKey) {
  return bundle.factionArmyEligibilityDataBundle.armyCandidateProfiles.find((entry) => (
    entry.recordKey === recordKey));
}
function tacticalBudget(recordKey) {
  return bundle.tacticalBudgetProfiles.find((entry) => entry.recordKey === recordKey);
}
function unitBudget(recordKey, kind) {
  return bundle.unitCompositionBudgetProfiles.find((entry) => (
    entry.recordKey === recordKey && entry.compositionKind === kind));
}
function upgradeBudget(recordKey, name) {
  return bundle.upgradeBudgetProfiles.find((entry) => (
    entry.recordKey === recordKey && entry.upgradeName === name));
}
function factionRef(profile, cardInstanceId = "faction-player1") {
  return { cardInstanceId, recordKey: profile.recordKey,
    sourceRecordHash: profile.sourceRecordHash, payloadHash: profile.payloadHash,
    profileHash: profile.profileHash };
}
function tacticalRef(recordKey, cardInstanceId) {
  const profile = tacticalBudget(recordKey);
  return { cardInstanceId, recordKey, sourceRecordHash: profile.sourceRecordHash,
    payloadHash: profile.payloadHash, budgetProfileHash: profile.budgetProfileHash };
}
function unitRef(recordKey, kind, unitInstanceId) {
  const profile = unitBudget(recordKey, kind); const armyCandidate = candidate(recordKey);
  return { unitInstanceId, recordKey, compositionKind: kind,
    budgetProfileId: profile.budgetProfileId,
    sourceRecordHash: profile.sourceRecordHash, payloadHash: profile.payloadHash,
    budgetProfileHash: profile.budgetProfileHash,
    candidateProfileHash: armyCandidate.profileHash };
}
function upgradeRef(recordKey, name, unitInstanceId, upgradeInstanceId) {
  const profile = upgradeBudget(recordKey, name);
  return { upgradeInstanceId, unitInstanceId, budgetProfileId: profile.budgetProfileId,
    sourceRecordHash: profile.sourceRecordHash, payloadHash: profile.payloadHash,
    budgetProfileHash: profile.budgetProfileHash };
}
const terran = faction("Terran Armed Forces");
function budgetInput(sideKey = "player1", extra = {}) {
  return { procedureKind: "army_resource_budget", sideKey,
    armyResourceBudgetDataBundle: bundle, scaleId: "Standard", mineralBudget: 1000,
    factionCard: factionRef(terran, `faction-${sideKey}`),
    tacticalCardInstances: [tacticalRef("tactical_cards:academy", `academy-${sideKey}`)],
    unitInstances: [unitRef("army_units:marine", "small", `marine-${sideKey}`),
      unitRef("army_units:medic", "small", `medic-${sideKey}`)],
    upgradeInstances: [upgradeRef("army_units:marine", "Combat Shield",
      `marine-${sideKey}`, `combat-shield-${sideKey}`)],
    armyPurchaseSetComplete: true, rulesOwnedResourceArithmeticRequested: true,
    unspentResourceDisposition: "lost", resourceConversionRequested: false,
    ...extra };
}

let resolved = resolveOfficialArmyResourceBudgetV1(budgetInput());
assert.equal(resolved.unitRows.length, 2);
assert.equal(resolved.upgradeRows.length, 1);
accept("14_budget_uses_complete_selected_unit_and_upgrade_instance_sets");
assert.equal(resolved.tacticalCardRows[0].vespeneGasCost, 35);
assert.deepEqual(resolved.tacticalCardRows[0].armySlotsAdded,
  { Air: 0, Core: 0, Elite: 0, Hero: 0, Support: 2 });
accept("15_tactical_purchase_reuses_frozen_slice92_exact_cost_and_slots");
const expectedMinerals = unitBudget("army_units:marine", "small").mineralCost
  + unitBudget("army_units:medic", "small").mineralCost
  + upgradeBudget("army_units:marine", "Combat Shield")
    .mineralCostByComposition.small;
assert.equal(resolved.mineralSpent, expectedMinerals);
accept("16_unit_composition_and_upgrade_mineral_costs_are_server_owned");
assert.equal(resolved.mineralUnspent, 1000 - expectedMinerals);
assert.equal(resolved.mineralUnspentDisposition, "lost");
assert.equal(resolved.mineralRetained, 0);
accept("17_unspent_minerals_are_lost_and_never_retained");
assert.deepEqual(resolved.vespeneLimit, { numerator: 1000, denominator: 10 });
assert.equal(resolved.vespeneSpent, 35);
accept("18_standard_1000_budget_has_exact_1000_over_10_vespene_cap");
assert.deepEqual(resolved.vespeneUnspent, { numerator: 650, denominator: 10 });
assert.equal(resolved.vespeneRetained, 0);
accept("19_unspent_vespene_is_lost_without_decimal_rounding");
assert.equal(resolved.resourceConversionAllowed, false);
assert.equal(resolved.resourceConversionApplied, false);
accept("20_no_mineral_vespene_conversion_is_executable");
assert.equal(resolved.fullFactionTagSlotAndUniqueLegalityValidated, true);
assert.match(resolved.armySlotAuditResultHash, /^[a-f0-9]{64}$/u);
accept("21_slice102_faction_tag_slot_and_unique_audit_is_reused");
assert.equal(resolved.fullCompositionUpgradeAndFieldingLegalityValidated, false);
assert.equal(resolved.fullCompositionUpgradeAndFieldingLegalityDeferredToSlice, 104);
accept("22_full_fielding_and_upgrade_legality_remains_explicitly_slice104");
rejects("ARMY_RESOURCE_BUDGET_REQUEST_INVALID", () => (
  resolveOfficialArmyResourceBudgetV1(budgetInput("player1", {
    resourceConversionRequested: true }))));
accept("23_resource_conversion_request_fails_closed");
rejects("ARMY_RESOURCE_BUDGET_REQUEST_INVALID", () => (
  resolveOfficialArmyResourceBudgetV1(budgetInput("player1", {
    unspentResourceDisposition: "retained" }))));
accept("24_resource_retention_request_fails_closed");
rejects("ARMY_MINERAL_BUDGET_EXCEEDED", () => (
  resolveOfficialArmyResourceBudgetV1(budgetInput("player1", { mineralBudget: 100 }))));
accept("25_mineral_overspend_fails_closed");
rejects("ARMY_VESPENE_BUDGET_EXCEEDED", () => (
  resolveOfficialArmyResourceBudgetV1(budgetInput("player1", { mineralBudget: 300 }))));
accept("26_vespene_overspend_fails_closed_independently");
rejects("ARMY_MINERAL_BUDGET_EXCEEDS_SCALE", () => (
  resolveOfficialArmyResourceBudgetV1(budgetInput("player1", { scaleId: "Skirmish",
    mineralBudget: 1001 }))));
accept("27_skirmish_mineral_ceiling_is_enforced");
rejects("ARMY_MINERAL_BUDGET_BELOW_SCALE", () => (
  resolveOfficialArmyResourceBudgetV1(budgetInput("player1", {
    scaleId: "Grand Offensive", mineralBudget: 2000 }))));
accept("28_grand_offensive_2001_minimum_is_enforced");
resolved = resolveOfficialArmyResourceBudgetV1(budgetInput("player1", {
  scaleId: "Grand Offensive", mineralBudget: 2001 }));
assert.deepEqual(resolved.vespeneLimit, { numerator: 2001, denominator: 10 });
accept("29_grand_offensive_2001_budget_preserves_200_point_1_exact_limit");
rejects("ARMY_TACTICAL_BUDGET_PROFILE_INVALID", () => (
  resolveOfficialArmyResourceBudgetV1(budgetInput("player1", {
    tacticalCardInstances: [{ ...tacticalRef("tactical_cards:academy", "academy-x"),
      budgetProfileHash: "f".repeat(64) }] }))));
accept("30_forged_tactical_cost_profile_hash_fails_closed");
rejects("ARMY_UNIT_BUDGET_PROFILE_INVALID", () => (
  resolveOfficialArmyResourceBudgetV1(budgetInput("player1", {
    unitInstances: [{ ...unitRef("army_units:marine", "small", "marine-player1"),
      budgetProfileHash: "f".repeat(64) }], upgradeInstances: [] }))));
accept("31_forged_unit_composition_cost_profile_hash_fails_closed");
rejects("ARMY_UPGRADE_BUDGET_PROFILE_INVALID", () => (
  resolveOfficialArmyResourceBudgetV1(budgetInput("player1", {
    upgradeInstances: [{ ...upgradeRef("army_units:marine", "Combat Shield",
      "marine-player1", "shield-x"), budgetProfileHash: "f".repeat(64) }] }))));
accept("32_forged_upgrade_cost_profile_hash_fails_closed");
rejects("ARMY_UPGRADE_UNIT_NOT_SELECTED", () => (
  resolveOfficialArmyResourceBudgetV1(budgetInput("player1", {
    upgradeInstances: [upgradeRef("army_units:marine", "Combat Shield",
      "missing-marine", "shield-x")] }))));
accept("33_upgrade_cost_line_must_belong_to_a_selected_unit");

function teamInput(extra = {}) {
  return { procedureKind: "team_mineral_budget",
    armyResourceBudgetDataBundle: bundle,
    state: { players: { player1: {}, player2: {} } },
    teamSetComplete: true, playerPartitionComplete: true,
    rulesOwnedTeamArithmeticRequested: true,
    teams: [{ teamId: "team-a", agreed: true, agreedMineralBudget: 2000,
      playerArmyBudgets: [
        { playerId: "player1", armyResourceBudgetInput: budgetInput("player1") },
        { playerId: "player2", armyResourceBudgetInput: budgetInput("player2") },
      ] }], ...extra };
}
resolved = resolveOfficialTeamMineralBudgetV1(teamInput());
assert.equal(resolved.teams[0].allocatedMinerals, 2000);
accept("34_team_budget_sums_each_players_rules_owned_allocation");
assert.deepEqual(resolved.playerIds, ["player1", "player2"]);
assert.equal(resolved.playerPartitionComplete, true);
accept("35_team_budget_requires_complete_player_partition");
assert.equal(resolved.teams[0].playerRows.every((entry) => (
  entry.independentlyChoosesArmyFactionAndTacticalCards)), true);
accept("36_each_team_player_independently_builds_army_faction_and_tactical_cards");
assert.equal(resolved.teams[0].unallocatedMineralsLost, 0);
assert.equal(resolved.teams[0].unallocatedMineralsRetained, 0);
accept("37_unallocated_team_minerals_are_lost_not_retained");
rejects("TEAM_MINERAL_BUDGET_EXCEEDED", () => resolveOfficialTeamMineralBudgetV1({
  ...teamInput(), teams: [{ ...teamInput().teams[0], agreedMineralBudget: 1999 }],
}));
accept("38_team_allocation_cannot_exceed_agreed_total");
rejects("TEAM_MINERAL_BUDGET_PLAYER_PARTITION_INVALID", () => (
  resolveOfficialTeamMineralBudgetV1({ ...teamInput(), teams: [{ ...teamInput().teams[0],
    playerArmyBudgets: [teamInput().teams[0].playerArmyBudgets[0]] }] })));
accept("39_missing_team_player_fails_closed");
rejects("TEAM_MINERAL_BUDGET_AGREEMENT_REQUIRED", () => (
  resolveOfficialTeamMineralBudgetV1({ ...teamInput(), teams: [{ ...teamInput().teams[0],
    agreed: false }] })));
rejects("TEAM_MINERAL_BUDGET_SCALE_MISMATCH", () => (
  resolveOfficialTeamMineralBudgetV1({ ...teamInput(), teams: [{ ...teamInput().teams[0],
    playerArmyBudgets: [teamInput().teams[0].playerArmyBudgets[0], {
      playerId: "player2", armyResourceBudgetInput: budgetInput("player2", {
        scaleId: "Skirmish" }) }] }] })));
accept("40_unagreed_or_mixed_scale_team_budget_fails_closed");

resolved = resolveOfficialArmyCardOpenInformationV1({
  procedureKind: "army_card_open_information", armyResourceBudgetDataBundle: bundle,
  armyResourceBudgetInput: budgetInput(), preGameDisclosureRequested: true,
  publicCardSetComplete: true, rulesOwnedPublicProjectionRequested: true,
});
assert.deepEqual(resolved.publicCards.map((entry) => entry.cardKind),
  ["tactical", "faction"]);
accept("41_public_projection_contains_exactly_selected_faction_and_tactical_cards");
assert.equal(resolved.publicCards.every((entry) => entry.faceUp && entry.public), true);
assert.equal(resolved.allFactionAndTacticalCardsFaceUpBeforeGame, true);
accept("42_all_selected_faction_and_tactical_cards_are_face_up_before_game");
assert.equal(resolved.hiddenFactionOrTacticalCardsPermitted, false);
accept("43_hidden_faction_or_tactical_cards_are_not_permitted");
assert.equal(resolved.unitEquipmentAndRosterDisclosureIncluded, false);
assert.equal(resolved.unitEquipmentAndRosterDisclosureDeferredToSlice, 105);
accept("44_unit_equipment_and_roster_disclosure_stays_explicitly_slice105");
rejects("ARMY_CARD_OPEN_INFORMATION_REQUEST_INVALID", () => (
  resolveOfficialArmyCardOpenInformationV1({
    procedureKind: "army_card_open_information", armyResourceBudgetDataBundle: bundle,
    armyResourceBudgetInput: budgetInput(), preGameDisclosureRequested: true,
    publicCardSetComplete: true, rulesOwnedPublicProjectionRequested: true,
    clientSuppliedVisibility: "hidden" })));
accept("45_client_cannot_forge_card_visibility");

function prepare() {
  const state = fixture.battleState({ activeSideKey: "player1" });
  state.phase = "army_building"; state.rulesProcedureMode = true;
  state.officialArmyResourceBudgetDataBundle = bundle;
  state.armyResourceBudgetRulesHistory = [];
  state.armyResourceBudgetsBySide = {};
  state.teamMineralBudgetAgreement = null;
  state.armyCardOpenInformationBySide = {};
  return state;
}
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
  return { bindingHash: "slice-103-army-resource-budget-binding",
    dataSnapshotHash: dataHash,
    dependencies: { dataSnapshot: { contentHash: dataHash } } };
}
let state = prepare();
const budgetPlan = plan("legal-budget-plan", "army_resource_budget", budgetInput());
const opened = openOfficialArmyResourceBudgetRulesPendingV1(state,
  procedure("army_resource_budget", budgetPlan));
const binding = bindingFor();
const space = runtime.enumerate(opened.state, { sideKey: "player1",
  includeDisabled: true, matchBinding: binding });
const domain = space.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_PARAMETER_KIND));
assert(domain);
accept("46_runtime_enumerates_hash_bound_army_budget_parameter_domain");
const instantiated = runtime.instantiate(opened.state, domain,
  { choiceId: domain.constraints.choices[0].choiceId }, { matchBinding: binding });
const applied = runtime.apply(opened.state, instantiated.action, { matchBinding: binding });
assert.equal(applied.state.pendingAction, null);
assert.equal(applied.state.armyResourceBudgetRulesHistory.length, 1);
accept("47_runtime_applies_confirmed_budget_and_clears_pending");
assert.equal(applied.state.armyResourceBudgetsBySide.player1.mineralSpent,
  expectedMinerals);
assert.equal(applied.state.lastArmyResourceBudgetRulesResolution
  .rulesOwnedArmyBuildingMutationApplied, true);
accept("48_apply_writes_rules_owned_budget_state_and_history");

const graph = audit.graph; const graphAudit = auditRuleRelationshipGraphV1(graph);
assert.equal(graphAudit.valid, true);
assert.deepEqual({ nodes: graph.nodes.length, edges: graph.edges.length },
  { nodes: 11387, edges: 32017 });
const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_RELATIONSHIP_SCOPE_ID));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "executor:authority.faction-army-eligibility-rules-v1@1.0.0"
    && entry.to === "derived_value:armyResourceBudgetV1.reusedFactionSlotAudit"));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash")));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
accept("49_relationship_graph_is_valid_and_blocks_missing_slice102_slot_dependency");

function engineFor(keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-09-01T09:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-103-army-resource-budget",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 103 army resource budget rules.";
function envelopeFor(engine, stateInput) {
  return engine.createEnvelope({ roomId: "official-slice-103-army-budget-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-army-budget-no-geometry-v1",
        content: { kind: "geometry-artifact",
          geometryVersion: "army_budget_no_geometry_v1" } },
      rulesDisplay: { artifactId: "official-slice-103-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "official-slice-103-action-schema-v41",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v41" } },
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
      geometryVersion: "army_budget_no_geometry_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v41" } };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}
const keys = generateKeyPairSync("ed25519");
const authority = engineFor(keys, "slice-103-army-budget-short-seal-v1");
state = prepare();
const seed = envelopeFor(authority, state);
const authorityOpened = openOfficialArmyResourceBudgetRulesPendingV1(seed.state,
  procedure("army_resource_budget", budgetPlan));
const initial = authority.createEnvelope({ roomId: seed.roomId,
  matchBinding: seed.matchBinding, state: authorityOpened.state });
registerReplay(authority, initial);
const seat = authority.issueSeatAuthority({ grantId: "slice-103-army-budget-grant",
  roomId: initial.roomId, matchBindingHash: initial.matchBindingHash,
  seatKey: "player1", roleMode: "player", principalType: "human",
  capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
const lease = authority.issueControlLease({ seatAuthority: seat,
  sessionId: "slice-103-army-budget-session", leaseFence: 1,
  issuedAtRoomRevision: initial.stateRevision });
const authoritySpace = authority.legalSpace(initial, { seatAuthority: seat });
const authorityDomain = authoritySpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_PARAMETER_KIND));
const preview = authority.preview({ envelope: initial, seatAuthority: seat,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: { choiceId: authorityDomain.constraints.choices[0].choiceId } } });
const confirmation = authority.confirmPreview({ envelope: initial,
  preview: preview.preview, seatAuthority: seat });
const authoritativeApplied = authority.apply({ envelope: initial,
  expectedStateRevision: initial.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: seat, controlLease: lease,
  idempotencyKey: "slice-103-army-resource-budget" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
const replay = engineFor(keys, "slice-103-army-budget-rotated-seal-v2");
registerReplay(replay, initial);
assert.equal(replay.replay({ initialEnvelope: initial,
  journal: [authoritativeApplied.receipt] }).ok, true);
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_army_budget_event" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
accept("50_authority_ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

assert.equal(previousReport.slice.sliceHash,
  "2bd3c289c86f90e013a0ddf4713eb283e3322654a40f2fda6d6c72165be9ab60");
assert.equal(slice.armyResourceBudgetRulesProgress
  .existingCardUnitFactionAndSlotExecutorsFrozen, true);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
accept("51_slice102_and_older_executors_remain_strictly_frozen_and_displayable");
assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.armyResourceBudgetRulesProgress.sourceRefreshPerformed, false);
accept("52_no_skill_dsh_training_promotion_or_source_refresh_runs_in_slice103");

assert.equal(acceptance.length, 52);
const report = {
  schema: "starcraft_tmg_official_army_resource_budget_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit, armyResourceBudgetDataBundle: bundle,
  remainingRouteV2Hash: route.routeHash, slice, sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash, catalogueHash: slice.catalogueHash,
  graph, graphAudit, coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true,
    historicalRulesDisplayRetained: true },
  boundaries: { tacticalBudgetProfileCount: 31,
    unitCompositionBudgetProfileCount: 28, upgradeBudgetProfileCount: 171,
    exactRationalVespeneLimit: true, resourceConversionAllowed: false,
    completeCompositionUpgradeAndFieldingLegalityDeferredToSlice: 104,
    unitEquipmentAndRosterDisclosureDeferredToSlice: 105,
    existingCardUnitFactionAndSlotExecutorsFrozen: true },
  ctx2skill: slice.ctx2skill, harness: slice.harness,
  rulesEligible: false, productionRoomEligible: false,
  rulesTruth: "official_army_resource_budget_rules_state_transition_conformance",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-army-resource-budget-rules-rule-slice-v1-report.json"),
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
