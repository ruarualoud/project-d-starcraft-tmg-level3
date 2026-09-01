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
  OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_NEW_ATOM_IDS,
  OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_PARAMETER_KIND,
  openOfficialUnitCompositionUpgradeRulesPendingV1,
} from "../packages/rule-atoms/official-unit-composition-upgrade-rules-executor-v1.mjs";
import {
  resolveOfficialCompleteArmyCompositionUpgradeAuditV1,
  resolveOfficialUnitCompositionSelectionV1,
  resolveOfficialUnitUpgradeSelectionV1,
} from "../packages/rule-atoms/official-unit-composition-upgrade-rules-kernel-v1.mjs";
import { OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-unit-composition-upgrade-rules-relationship-contract-v1.mjs";
import {
  createOfficialUnitCompositionUpgradeRulesRuleSliceV1,
  verifyOfficialUnitCompositionUpgradeRulesRuleSliceV1,
} from "../packages/rule-atoms/official-unit-composition-upgrade-rules-rule-slice-v1.mjs";
import { createOfficialRemainingRuleAtomRouteV2 } from
  "../packages/rule-atoms/official-remaining-rule-atom-route-v2.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import {
  createOfficialUnitCompositionUpgradeDataBundleV1,
  verifyOfficialUnitCompositionUpgradeDataBundleV1,
} from "../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-army-resource-budget-rules-rule-slice-v1-report.json"), "utf8"));
const routeBaseReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-elevation-effective-size-rules-rule-slice-v1-report.json"), "utf8"));
const acceptance = [];
function accept(name) { acceptance.push(name); }
function rejects(code, operation) {
  assert.throws(operation, (error) => String(error?.message || error).startsWith(code));
}

const slice = createOfficialUnitCompositionUpgradeRulesRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialUnitCompositionUpgradeRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 820,
  newlyExecutableRuleAtoms: 16, reviewRequiredRuleAtoms: 92,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 820,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 73, missingStateContractExecutors: 0 });
accept("01_slice104_promotes_exact_16_route_atoms_to_820_executable");
const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 104);
assert.deepEqual(assignment.atomIds,
  [...OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_NEW_ATOM_IDS]);
assert.deepEqual([assignment.executableAfter, assignment.reviewRequiredAfter], [820, 92]);
accept("02_route_v2_exact_slice104_atom_identity_and_counts_match");
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executorManifest.length, 73);
accept("03_runtime_exposes_unit_composition_upgrade_as_executor_73");

const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const bundle = createOfficialUnitCompositionUpgradeDataBundleV1({
  dataset: fixture.dataset,
});
assert.equal(verifyOfficialUnitCompositionUpgradeDataBundleV1(bundle), true);
accept("04_unit_composition_upgrade_bundle_is_content_hash_verified");
assert.deepEqual(bundle.ruleClauses.map((entry) => entry.atomId).sort(),
  [...OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_NEW_ATOM_IDS]);
accept("05_sixteen_exact_core_clause_boundaries_cover_route_atoms");
assert.deepEqual(bundle.ruleSectionRecords.map((entry) => entry.title),
  ["PART 2: CORE CONCEPTS", "PART 9: PREPARING FOR BATTLE",
    "PART 12: QUICK REFERENCE"]);
accept("06_three_exact_rule_section_records_are_pinned");
assert.equal(bundle.sourcePolicy.refreshDuringDevelopment, false);
assert.equal(bundle.sourcePolicy.repositoryFallbackAllowed, false);
accept("07_source_lock_remains_offline_without_repository_fallback");
assert.deepEqual({ units: bundle.audit.unitReferenceCount,
  compositions: bundle.audit.compositionOptionCount,
  purchasableUpgrades: bundle.audit.purchasableUpgradeCount },
{ units: 22, compositions: 28, purchasableUpgrades: 52 });
accept("08_part12_denominator_is_22_units_28_compositions_52_upgrades");
assert.deepEqual({ specialist: bundle.audit.specialistUpgradeCount,
  unitWide: bundle.audit.unitWideUpgradeCount }, { specialist: 2, unitWide: 50 });
accept("09_specialist_exception_and_unit_wide_default_denominator_is_exact");
assert.deepEqual(bundle.audit.compositionCostConflictRecordKeys,
  ["army_units:corpser__roach_", "army_units:jim_raynor"]);
accept("10_two_current_record_part12_composition_cost_conflicts_are_explicit");
assert.equal(bundle.sourceReconciliation.currentUpgradeDefinitionCount, 171);
assert.equal(bundle.sourceReconciliation.purchasableUpgradeCount, 52);
assert.equal(bundle.sourceReconciliation.allCurrentUpgradeDefinitionsArePurchasable, false);
accept("11_all_171_card_definitions_are_not_misclassified_as_purchasable");

function unit(recordKey) {
  return bundle.unitCompositionProfiles.find((entry) => entry.recordKey === recordKey);
}
function option(recordKey, kind = "small") {
  return unit(recordKey).compositionOptions.find((entry) => entry.compositionKind === kind);
}
function upgrade(recordKey, name) {
  return bundle.purchasableUpgradeProfiles.find((entry) => (
    entry.recordKey === recordKey && entry.upgradeName === name));
}
function compositionInput(recordKey = "army_units:marine", kind = "small",
  unitInstanceId = "marine-1") {
  const source = unit(recordKey); const selected = option(recordKey, kind);
  return { unitInstanceId, recordKey, compositionProfileId: selected.compositionProfileId,
    startingModelIds: Array.from({ length: selected.startingModels },
      (_, index) => `${unitInstanceId}-model-${index + 1}`),
    sourceRecordHash: source.sourceRecordHash, payloadHash: source.payloadHash,
    sourceUnitProfileHash: source.sourceUnitProfileHash,
    unitCompositionReferenceProfileHash: source.profileHash,
    compositionProfileHash: selected.profileHash,
    rulesOwnedCompositionRequested: true, exactlyOneCompositionSelected: true };
}
function upgradeRef(profileValue, upgradeInstanceId, nominatedModelId) {
  return { upgradeInstanceId,
    purchasableUpgradeProfileId: profileValue.purchasableUpgradeProfileId,
    profileHash: profileValue.profileHash,
    sourceDefinitionHash: profileValue.sourceDefinitionHash,
    sourceBudgetProfileHash: profileValue.sourceBudgetProfileHash,
    ...(nominatedModelId ? { nominatedModelId } : {}) };
}
function upgradeInput(selectedUpgrades, unitCompositionInput = compositionInput()) {
  return { procedureKind: "unit_upgrade_selection",
    unitCompositionUpgradeDataBundle: bundle, unitCompositionInput,
    selectedUpgrades, upgradeSelectionSetComplete: true,
    rulesOwnedUpgradeApplicationRequested: true };
}
const marineCompositionInput = compositionInput();
let resolved = resolveOfficialUnitCompositionSelectionV1({
  procedureKind: "unit_composition_selection",
  unitCompositionUpgradeDataBundle: bundle, ...marineCompositionInput,
});
assert.equal(resolved.exactlyOneCompositionSelected, true);
accept("12_marine_exactly_one_listed_small_composition_is_selected");
assert.equal(resolved.startingModelCount, 6);
assert.equal(resolved.startingModelIds.length, 6);
accept("13_rules_derive_exact_six_model_starting_set");
assert.deepEqual({ supply: resolved.startingSupply, slots: resolved.occupiedArmySlots },
  { supply: 1, slots: 1 });
accept("14_starting_supply_equals_occupied_army_slots");
assert.equal(resolved.mineralCost, 160);
assert.equal(resolved.clientSuppliedModelCountSupplySlotsOrCostAccepted, false);
accept("15_current_unit_record_owns_composition_cost_and_client_totals_are_rejected");
resolved = resolveOfficialUnitCompositionSelectionV1({
  procedureKind: "unit_composition_selection",
  unitCompositionUpgradeDataBundle: bundle,
  ...compositionInput("army_units:jim_raynor", "small", "raynor-1"),
});
assert.equal(resolved.mineralCost, 250);
accept("16_jim_raynor_current_official_record_cost_250_is_executable");
assert.equal(resolved.armyReferenceMineralCost, 230);
assert.equal(resolved.mineralCostReconciliation,
  "current_product_record_wins_part_12_value_preserved");
accept("17_jim_raynor_part12_cost_230_remains_explicitly_displayable");

const agg = upgrade("army_units:marine", "AGG-12");
const rocket = upgrade("army_units:marine", "Rocket Launcher");
const shield = upgrade("army_units:marine", "Combat Shield");
const aggRef = upgradeRef(agg, "agg-1", "marine-1-model-1");
const shieldRef = upgradeRef(shield, "shield-1");
resolved = resolveOfficialUnitUpgradeSelectionV1(upgradeInput([aggRef, shieldRef]));
assert.equal(resolved.selectedUpgradeCount, 2);
accept("18_multiple_different_upgrade_entries_may_be_purchased");
assert.equal(resolved.selectedUpgrades.find((entry) => entry.upgradeName === "Combat Shield")
  .appliedModelIds.length, 6);
accept("19_unit_wide_upgrade_applies_to_every_starting_model");
assert.deepEqual(resolved.selectedUpgrades.find((entry) => entry.upgradeName === "AGG-12")
  .appliedModelIds, ["marine-1-model-1"]);
accept("20_specialist_upgrade_applies_to_exactly_one_nominated_model");
assert.equal(resolved.mineralCost, 30);
accept("21_upgrade_cost_uses_selected_small_composition_columns");
assert.equal(resolved.selectedUpgrades.find((entry) => entry.upgradeName === "AGG-12")
  .replacementTargetName, "C-14 Rifle");
accept("22_specialist_weapon_replacement_target_is_source_bound");

const factionBundle = bundle.armyResourceBudgetDataBundle.factionArmyEligibilityDataBundle;
const terran = factionBundle.factionProfiles.find((entry) => (
  entry.factionName === "Terran Armed Forces"));
function factionRef(profileValue = terran) {
  return { cardInstanceId: "faction-player1", recordKey: profileValue.recordKey,
    sourceRecordHash: profileValue.sourceRecordHash,
    payloadHash: profileValue.payloadHash, profileHash: profileValue.profileHash };
}
function completeAuditInput(extra = {}) {
  return { procedureKind: "complete_army_composition_upgrade_audit",
    unitCompositionUpgradeDataBundle: bundle,
    compositionUpgradeUnitSetComplete: true,
    rulesOwnedCompleteArmyAuditRequested: true,
    unitSelections: [{ unitCompositionInput: marineCompositionInput,
      selectedUpgrades: [aggRef, shieldRef], upgradeSelectionSetComplete: true }],
    armyResourceBudgetInput: { sideKey: "player1", scaleId: "Standard",
      mineralBudget: 1000, factionCard: factionRef(), tacticalCardInstances: [],
      armyPurchaseSetComplete: true, rulesOwnedResourceArithmeticRequested: true,
      unspentResourceDisposition: "lost", resourceConversionRequested: false },
    ...extra };
}
const fullAudit = resolveOfficialCompleteArmyCompositionUpgradeAuditV1(
  completeAuditInput());
assert.equal(fullAudit.fullCompositionUpgradeAndFieldingLegalityValidated, true);
accept("23_complete_army_composition_upgrade_fielding_legality_is_executable");
assert.equal(fullAudit.armyResourceBudgetResult.mineralSpent, 190);
accept("24_complete_audit_reuses_slice103_rules_owned_resource_arithmetic");
assert.match(fullAudit.armyResourceBudgetResult.armySlotAuditResultHash,
  /^[a-f0-9]{64}$/u);
accept("25_complete_audit_reuses_slice102_faction_and_slot_legality");
assert.equal(fullAudit.distinctUpgradeEntryAndSpecialistAssignmentValidated, true);
accept("26_complete_audit_certifies_composition_upgrade_and_specialist_invariants");
assert.equal(fullAudit.unitEquipmentAndRosterDisclosureIncluded, false);
assert.equal(fullAudit.unitEquipmentAndRosterDisclosureDeferredToSlice, 105);
accept("27_roster_and_equipment_disclosure_remains_explicitly_slice105");

rejects("UNIT_COMPOSITION_STARTING_MODEL_SET_INVALID", () => (
  resolveOfficialUnitCompositionSelectionV1({
    procedureKind: "unit_composition_selection",
    unitCompositionUpgradeDataBundle: bundle, ...marineCompositionInput,
    startingModelIds: marineCompositionInput.startingModelIds.slice(0, 5),
  })));
accept("28_unlisted_model_count_fails_closed");
rejects("UNIT_COMPOSITION_SOURCE_PROFILE_INVALID", () => (
  resolveOfficialUnitCompositionSelectionV1({
    procedureKind: "unit_composition_selection",
    unitCompositionUpgradeDataBundle: bundle, ...marineCompositionInput,
    compositionProfileHash: "f".repeat(64),
  })));
accept("29_forged_composition_profile_hash_fails_closed");
rejects("UNIT_COMPOSITION_SELECTION_REQUEST_INVALID", () => (
  resolveOfficialUnitCompositionSelectionV1({
    procedureKind: "unit_composition_selection",
    unitCompositionUpgradeDataBundle: bundle, ...marineCompositionInput,
    clientSuppliedMineralCost: 1,
  })));
accept("30_client_supplied_composition_cost_fails_closed");
rejects("PURCHASABLE_UPGRADE_PROFILE_REQUIRED", () => (
  resolveOfficialUnitUpgradeSelectionV1(upgradeInput([{
    ...aggRef, purchasableUpgradeProfileId: "army_units:marine:stimpack" }] ))));
accept("31_non_part12_definition_cannot_be_purchased_as_an_upgrade");
rejects("UNIT_PURCHASABLE_UPGRADE_SOURCE_PROFILE_INVALID", () => (
  resolveOfficialUnitUpgradeSelectionV1(upgradeInput([{
    ...shieldRef, profileHash: "f".repeat(64) }] ))));
accept("32_forged_purchasable_upgrade_profile_hash_fails_closed");
rejects("UNIT_UPGRADE_ENTRY_DUPLICATE", () => (
  resolveOfficialUnitUpgradeSelectionV1(upgradeInput([
    shieldRef, { ...shieldRef, upgradeInstanceId: "shield-2" }] ))));
accept("33_same_upgrade_entry_cannot_be_purchased_twice");
rejects("UNIT_SPECIALIST_MODEL_REQUIRED", () => (
  resolveOfficialUnitUpgradeSelectionV1(upgradeInput([
    upgradeRef(agg, "agg-no-model")]))));
accept("34_specialist_requires_a_nominated_model");
rejects("UNIT_SPECIALIST_MODEL_NOT_IN_UNIT", () => (
  resolveOfficialUnitUpgradeSelectionV1(upgradeInput([
    upgradeRef(agg, "agg-outsider", "outsider")]))));
accept("35_specialist_nominated_model_must_belong_to_unit");
rejects("UNIT_SPECIALIST_MODEL_REUSED", () => (
  resolveOfficialUnitUpgradeSelectionV1(upgradeInput([
    upgradeRef(agg, "agg-same", "marine-1-model-1"),
    upgradeRef(rocket, "rocket-same", "marine-1-model-1")]))));
accept("36_different_specialist_upgrades_require_different_models");
rejects("UNIT_WIDE_UPGRADE_SPECIALIST_NOMINATION_FORBIDDEN", () => (
  resolveOfficialUnitUpgradeSelectionV1(upgradeInput([{
    ...shieldRef, nominatedModelId: "marine-1-model-1" }] ))));
accept("37_unit_wide_upgrade_cannot_be_narrowed_by_client_nomination");
rejects("UNIT_UPGRADE_SELECTION_REQUEST_INVALID", () => (
  resolveOfficialUnitUpgradeSelectionV1({ ...upgradeInput([shieldRef]),
    clientSuppliedApplication: ["marine-1-model-1"] })));
accept("38_client_supplied_upgrade_application_fails_closed");
rejects("COMPLETE_ARMY_COMPOSITION_UPGRADE_AUDIT_REQUEST_INVALID", () => (
  resolveOfficialCompleteArmyCompositionUpgradeAuditV1(completeAuditInput({
    armyResourceBudgetInput: { ...completeAuditInput().armyResourceBudgetInput,
      unitInstances: [] } }))));
accept("39_complete_audit_derives_and_rejects_client_unit_budget_rows");
rejects("COMPLETE_ARMY_UNIT_INSTANCE_DUPLICATE", () => (
  resolveOfficialCompleteArmyCompositionUpgradeAuditV1(completeAuditInput({
    unitSelections: [completeAuditInput().unitSelections[0], {
      ...completeAuditInput().unitSelections[0], selectedUpgrades: [] }] }))));
accept("40_duplicate_unit_instance_in_complete_army_fails_closed");
const protoss = factionBundle.factionProfiles.find((entry) => entry.factionName === "Daelaam");
rejects("FACTION_TAG_MISMATCH", () => (
  resolveOfficialCompleteArmyCompositionUpgradeAuditV1(completeAuditInput({
    armyResourceBudgetInput: { ...completeAuditInput().armyResourceBudgetInput,
      factionCard: factionRef(protoss) } }))));
accept("41_unit_must_be_eligible_for_selected_faction_and_available_slots");
assert.deepEqual(bundle.unitCompositionProfiles.flatMap((entry) => entry.compositionOptions)
  .filter((entry) => entry.mineralCost !== entry.armyReferenceMineralCost)
  .map((entry) => [entry.recordKey, entry.mineralCost, entry.armyReferenceMineralCost]),
[["army_units:corpser__roach_", 240, 250], ["army_units:jim_raynor", 250, 230]]);
accept("42_official_cost_conflict_resolution_is_exact_and_auditable");
assert.equal(bundle.audit.currentProductLinkOnlyReplacementCount, 1);
assert.equal(bundle.purchasableUpgradeProfiles.find((entry) => (
  entry.recordKey === "army_units:marine" && entry.upgradeName === "Bayonet"))
  .replacementReconciliation, "current_product_link_only");
accept("43_cross_source_replacement_disagreement_is_not_silently_erased");

function prepare() {
  const state = fixture.battleState({ activeSideKey: "player1" });
  state.phase = "army_building"; state.rulesProcedureMode = true;
  state.officialUnitCompositionUpgradeDataBundle = bundle;
  state.unitCompositionSelectionsBySide = {};
  state.unitUpgradeSelectionsBySide = {};
  state.armyCompositionUpgradeAuditsBySide = {};
  state.unitCompositionUpgradeRulesHistory = [];
  state.armyResourceBudgetsBySide = {};
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
  return { bindingHash: "slice-104-unit-composition-upgrade-binding",
    dataSnapshotHash: dataHash,
    dependencies: { dataSnapshot: { contentHash: dataHash } } };
}
let state = prepare();
const auditPlan = plan("legal-complete-audit",
  "complete_army_composition_upgrade_audit", completeAuditInput());
const opened = openOfficialUnitCompositionUpgradeRulesPendingV1(state,
  procedure("complete_army_composition_upgrade_audit", auditPlan));
assert.equal(opened.pending.rulesCertificate
  .completeCompositionUpgradeAndFieldingLegalityExecutable, true);
accept("44_executor_opens_hash_bound_complete_fielding_plan_choice");
const binding = bindingFor();
const space = runtime.enumerate(opened.state, { sideKey: "player1",
  includeDisabled: true, matchBinding: binding });
const domain = space.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_PARAMETER_KIND));
assert(domain);
accept("45_runtime_enumerates_v42_unit_composition_upgrade_parameter_domain");
const instantiated = runtime.instantiate(opened.state, domain,
  { choiceId: domain.constraints.choices[0].choiceId }, { matchBinding: binding });
const applied = runtime.apply(opened.state, instantiated.action, { matchBinding: binding });
assert.equal(applied.state.unitCompositionUpgradeRulesHistory.length, 1);
assert.equal(applied.state.pendingAction, null);
accept("46_runtime_applies_confirmed_plan_and_clears_pending");
assert.equal(applied.state.armyCompositionUpgradeAuditsBySide.player1
  .fullCompositionUpgradeAndFieldingLegalityValidated, true);
assert.equal(applied.state.armyResourceBudgetsBySide.player1.mineralSpent, 190);
accept("47_apply_writes_complete_audit_and_superseding_budget_projection");

const graph = audit.graph; const graphAudit = auditRuleRelationshipGraphV1(graph);
assert.equal(graphAudit.valid, true);
assert.deepEqual({ nodes: graph.nodes.length, edges: graph.edges.length },
  { nodes: 11514, edges: 32245 });
accept("48_relationship_graph_is_valid_with_exact_slice104_counts");
const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_RELATIONSHIP_SCOPE_ID));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "executor:authority.army-resource-budget-rules-v1@1.0.0"
    && entry.to === "derived_value:unitCompositionUpgradeV1.slice103ResourceBudget"));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash")));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
accept("49_relationship_graph_blocks_missing_slice103_budget_dependency");
assert.equal(slice.historicalCompatibility.actionSchemaVersion,
  "hybrid_legal_space_v42");
accept("50_action_schema_advances_to_v42_without_mutating_v41");

function engineFor(keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-09-01T10:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-104-unit-composition-upgrade",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 104 composition upgrade rules.";
function envelopeFor(engine, stateInput) {
  return engine.createEnvelope({ roomId: "official-slice-104-composition-upgrade-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-composition-upgrade-no-geometry-v1",
        content: { kind: "geometry-artifact",
          geometryVersion: "composition_upgrade_no_geometry_v1" } },
      rulesDisplay: { artifactId: "official-slice-104-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "official-slice-104-action-schema-v42",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v42" } },
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
      geometryVersion: "composition_upgrade_no_geometry_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v42" } };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}
const keys = generateKeyPairSync("ed25519");
const authority = engineFor(keys, "slice-104-composition-upgrade-short-seal-v1");
state = prepare(); const seed = envelopeFor(authority, state);
const authorityOpened = openOfficialUnitCompositionUpgradeRulesPendingV1(seed.state,
  procedure("complete_army_composition_upgrade_audit", auditPlan));
const initial = authority.createEnvelope({ roomId: seed.roomId,
  matchBinding: seed.matchBinding, state: authorityOpened.state });
registerReplay(authority, initial);
const seat = authority.issueSeatAuthority({ grantId: "slice-104-composition-upgrade-grant",
  roomId: initial.roomId, matchBindingHash: initial.matchBindingHash,
  seatKey: "player1", roleMode: "player", principalType: "human",
  capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
const lease = authority.issueControlLease({ seatAuthority: seat,
  sessionId: "slice-104-composition-upgrade-session", leaseFence: 1,
  issuedAtRoomRevision: initial.stateRevision });
const authoritySpace = authority.legalSpace(initial, { seatAuthority: seat });
const authorityDomain = authoritySpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_PARAMETER_KIND));
const preview = authority.preview({ envelope: initial, seatAuthority: seat,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: { choiceId: authorityDomain.constraints.choices[0].choiceId } } });
const confirmation = authority.confirmPreview({ envelope: initial,
  preview: preview.preview, seatAuthority: seat });
const authoritativeApplied = authority.apply({ envelope: initial,
  expectedStateRevision: initial.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: seat, controlLease: lease,
  idempotencyKey: "slice-104-unit-composition-upgrade" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
accept("51_authority_preview_confirm_apply_commits_complete_army_audit");
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
accept("52_receipt_uses_long_lived_ed25519_signature");
const replay = engineFor(keys, "slice-104-composition-upgrade-rotated-seal-v2");
registerReplay(replay, initial);
assert.equal(replay.replay({ initialEnvelope: initial,
  journal: [authoritativeApplied.receipt] }).ok, true);
accept("53_signed_replay_survives_short_hmac_seal_rotation");
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_composition_upgrade_event" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
accept("54_tampered_signed_receipt_is_rejected");
assert.equal(previousReport.slice.sliceHash,
  "09b9cc5f7afa75e4addf2d498bc42077a490325e0d0f9e187d0a9e1ff357b49e");
assert.equal(slice.unitCompositionUpgradeRulesProgress
  .existingUnitSupplyFactionSlotAndBudgetExecutorsFrozen, true);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
accept("55_slice103_and_older_executors_remain_strictly_frozen_and_displayable");
assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.unitCompositionUpgradeRulesProgress.sourceRefreshPerformed, false);
accept("56_no_skill_dsh_training_promotion_or_source_refresh_runs_in_slice104");

assert.equal(acceptance.length, 56);
const report = {
  schema:
    "starcraft_tmg_official_unit_composition_upgrade_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit,
  unitCompositionUpgradeDataBundle: bundle,
  remainingRouteV2Hash: route.routeHash, slice, sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash, catalogueHash: slice.catalogueHash,
  graph, graphAudit, coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true,
    historicalRulesDisplayRetained: true },
  boundaries: { fieldableUnitReferenceProfileCount: 22,
    listedCompositionOptionCount: 28, purchasableUpgradeProfileCount: 52,
    specialistUpgradeProfileCount: 2, unitWideUpgradeProfileCount: 50,
    compositionCostConflictCount: 2,
    completeCompositionUpgradeAndFieldingLegalityExecutable: true,
    unitEquipmentAndRosterDisclosureDeferredToSlice: 105,
    existingUnitSupplyFactionSlotAndBudgetExecutorsFrozen: true },
  ctx2skill: slice.ctx2skill, harness: slice.harness,
  rulesEligible: false, productionRoomEligible: false,
  rulesTruth: "official_unit_composition_upgrade_rules_state_transition_conformance",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-unit-composition-upgrade-rules-rule-slice-v1-report.json"),
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
