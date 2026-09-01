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
import { projectStarcraftTmgStateForViewerV2 } from
  "../packages/room-runtime/in-memory-room-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { resolveOfficialTeamMineralBudgetV1 } from
  "../packages/rule-atoms/official-army-resource-budget-rules-kernel-v1.mjs";
import {
  OFFICIAL_ROSTER_DISCLOSURE_RULES_NEW_ATOM_IDS,
  OFFICIAL_ROSTER_DISCLOSURE_RULES_PARAMETER_KIND,
  openOfficialRosterDisclosureRulesPendingV1,
} from "../packages/rule-atoms/official-roster-disclosure-rules-executor-v1.mjs";
import {
  assertOfficialEquipmentRelevantActionReminderV1,
  deriveOfficialUnitExpectedEquipmentV1,
  resolveOfficialClosedListAgreementSubmissionV1,
  resolveOfficialEquipmentRelevantActionReminderV1,
  resolveOfficialOnTableUnitInspectionV1,
  resolveOfficialRosterRegistryAuditV1,
  resolveOfficialRosterVisibilityV1,
  resolveOfficialUnitEquipmentDeploymentDisclosureV1,
} from "../packages/rule-atoms/official-roster-disclosure-rules-kernel-v1.mjs";
import { OFFICIAL_ROSTER_DISCLOSURE_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-roster-disclosure-rules-relationship-contract-v1.mjs";
import {
  createOfficialRosterDisclosureRulesRuleSliceV1,
  verifyOfficialRosterDisclosureRulesRuleSliceV1,
} from "../packages/rule-atoms/official-roster-disclosure-rules-rule-slice-v1.mjs";
import { createOfficialRemainingRuleAtomRouteV2 } from
  "../packages/rule-atoms/official-remaining-rule-atom-route-v2.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { resolveOfficialCompleteArmyCompositionUpgradeAuditV1 } from
  "../packages/rule-atoms/official-unit-composition-upgrade-rules-kernel-v1.mjs";
import {
  createOfficialRosterDisclosureDataBundleV1,
  verifyOfficialRosterDisclosureDataBundleV1,
} from "../packages/source-data/official-roster-disclosure-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-unit-composition-upgrade-rules-rule-slice-v1-report.json"), "utf8"));
const routeBaseReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-elevation-effective-size-rules-rule-slice-v1-report.json"), "utf8"));
const acceptance = [];
function accept(name) { acceptance.push(name); }
function rejects(code, operation) {
  assert.throws(operation, (error) => String(error?.message || error).startsWith(code));
}

const slice = createOfficialRosterDisclosureRulesRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialRosterDisclosureRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 833,
  newlyExecutableRuleAtoms: 13, reviewRequiredRuleAtoms: 79,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 833,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 74, missingStateContractExecutors: 0 });
accept("01_slice105_promotes_exact_13_route_atoms_to_833_executable");
const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 105);
assert.deepEqual(assignment.atomIds,
  [...OFFICIAL_ROSTER_DISCLOSURE_RULES_NEW_ATOM_IDS]);
assert.deepEqual([assignment.executableAfter, assignment.reviewRequiredAfter], [833, 79]);
accept("02_route_v2_exact_slice105_atom_identity_and_counts_match");
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executorManifest.length, 74);
accept("03_runtime_exposes_roster_disclosure_as_executor_74");

const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const bundle = createOfficialRosterDisclosureDataBundleV1({ dataset: fixture.dataset });
assert.equal(verifyOfficialRosterDisclosureDataBundleV1(bundle), true);
accept("04_roster_disclosure_bundle_is_content_hash_verified");
assert.equal(bundle.bundleHash,
  "dd59c745ba08ff1bff9fb45eb7d237588a1dd8ccd553512a9d0a55acf1301fbd");
accept("05_roster_disclosure_data_bundle_identity_is_frozen");
assert.deepEqual(bundle.ruleClauses.map((entry) => entry.atomId).sort(),
  [...OFFICIAL_ROSTER_DISCLOSURE_RULES_NEW_ATOM_IDS]);
accept("06_thirteen_exact_part9_clause_boundaries_cover_route_atoms");
assert.deepEqual(bundle.ruleSections.map((entry) => entry.title),
  ["9.1.8 Team Games", "9.1.10 Army Roster Visibility",
    "9.1.11 Representation and Disclosure"]);
accept("07_three_exact_part9_sections_are_pinned");
assert.deepEqual(bundle.audit, { ruleClauseCount: 13, part9SectionCount: 3,
  unitCardInspectionProfileCount: 22, defaultEquipmentProfileCount: 41,
  purchasableUpgradeProfileCount: 52 });
accept("08_unit_card_and_equipment_denominator_is_exact");
assert.equal(bundle.sourcePolicy.refreshDuringDevelopment, false);
assert.equal(bundle.sourcePolicy.repositoryFallbackAllowed, false);
accept("09_source_lock_remains_offline_without_repository_fallback");

const unitBundle = bundle.unitCompositionUpgradeDataBundle;
const factionBundle = unitBundle.armyResourceBudgetDataBundle
  .factionArmyEligibilityDataBundle;
const terran = factionBundle.factionProfiles.find((entry) => (
  entry.factionName === "Terran Armed Forces"));
function unit(recordKey = "army_units:marine") {
  return unitBundle.unitCompositionProfiles.find((entry) => entry.recordKey === recordKey);
}
function option(recordKey = "army_units:marine", kind = "small") {
  return unit(recordKey).compositionOptions.find((entry) => (
    entry.compositionKind === kind));
}
function upgrade(recordKey, name) {
  return unitBundle.purchasableUpgradeProfiles.find((entry) => (
    entry.recordKey === recordKey && entry.upgradeName === name));
}
function compositionInput(playerId) {
  const recordKey = "army_units:marine";
  const source = unit(recordKey); const selected = option(recordKey);
  const unitInstanceId = `marine-${playerId}`;
  return { unitInstanceId, recordKey,
    compositionProfileId: selected.compositionProfileId,
    startingModelIds: Array.from({ length: selected.startingModels },
      (_, index) => `${unitInstanceId}-model-${index + 1}`),
    sourceRecordHash: source.sourceRecordHash, payloadHash: source.payloadHash,
    sourceUnitProfileHash: source.sourceUnitProfileHash,
    unitCompositionReferenceProfileHash: source.profileHash,
    compositionProfileHash: selected.profileHash,
    rulesOwnedCompositionRequested: true, exactlyOneCompositionSelected: true };
}
function upgradeRef(profile, playerId, suffix, nominatedModelId = null) {
  return { upgradeInstanceId: `${suffix}-${playerId}`,
    purchasableUpgradeProfileId: profile.purchasableUpgradeProfileId,
    profileHash: profile.profileHash,
    sourceDefinitionHash: profile.sourceDefinitionHash,
    sourceBudgetProfileHash: profile.sourceBudgetProfileHash,
    ...(nominatedModelId ? { nominatedModelId } : {}) };
}
function factionRef(playerId) {
  return { cardInstanceId: `faction-${playerId}`, recordKey: terran.recordKey,
    sourceRecordHash: terran.sourceRecordHash, payloadHash: terran.payloadHash,
    profileHash: terran.profileHash };
}
const agg = upgrade("army_units:marine", "AGG-12");
const shield = upgrade("army_units:marine", "Combat Shield");
function completeAudit(playerId) {
  const composition = compositionInput(playerId);
  return resolveOfficialCompleteArmyCompositionUpgradeAuditV1({
    procedureKind: "complete_army_composition_upgrade_audit",
    unitCompositionUpgradeDataBundle: unitBundle,
    compositionUpgradeUnitSetComplete: true,
    rulesOwnedCompleteArmyAuditRequested: true,
    unitSelections: [{ unitCompositionInput: composition,
      selectedUpgrades: [
        upgradeRef(agg, playerId, "agg", composition.startingModelIds[0]),
        upgradeRef(shield, playerId, "shield"),
      ], upgradeSelectionSetComplete: true }],
    armyResourceBudgetInput: { sideKey: playerId, scaleId: "Standard",
      mineralBudget: 1000, factionCard: factionRef(playerId),
      tacticalCardInstances: [], armyPurchaseSetComplete: true,
      rulesOwnedResourceArithmeticRequested: true,
      unspentResourceDisposition: "lost", resourceConversionRequested: false },
  });
}
const playerIds = ["player1", "player2", "player3", "player4"];
const players = Object.fromEntries(playerIds.map((playerId) => [playerId, {
  sideKey: playerId, label: playerId,
}]));
const auditsBySide = Object.fromEntries(playerIds.map((playerId) => (
  [playerId, completeAudit(playerId)]
)));
assert.equal(Object.values(auditsBySide).every((entry) => (
  entry.fullCompositionUpgradeAndFieldingLegalityValidated)), true);
accept("10_four_player_complete_slice104_rosters_are_source_bound");

function teamBudgetInput(playerId) {
  const auditValue = auditsBySide[playerId];
  const budget = auditValue.armyResourceBudgetResult;
  return { sideKey: playerId, scaleId: "Standard", mineralBudget: 1000,
    factionCard: factionRef(playerId), tacticalCardInstances: [],
    unitInstances: budget.unitRows.map((entry) => ({
      unitInstanceId: entry.unitInstanceId, recordKey: entry.recordKey,
      compositionKind: entry.compositionKind,
      budgetProfileId: entry.budgetProfileId,
      sourceRecordHash: entry.sourceRecordHash, payloadHash: entry.payloadHash,
      budgetProfileHash: entry.budgetProfileHash,
      candidateProfileHash: entry.candidateProfileHash,
    })), upgradeInstances: budget.upgradeRows.map((entry) => ({
      upgradeInstanceId: entry.upgradeInstanceId,
      unitInstanceId: entry.unitInstanceId,
      budgetProfileId: entry.budgetProfileId,
      sourceRecordHash: entry.sourceRecordHash, payloadHash: entry.payloadHash,
      budgetProfileHash: entry.budgetProfileHash,
    })), armyPurchaseSetComplete: true,
    rulesOwnedResourceArithmeticRequested: true,
    unspentResourceDisposition: "lost", resourceConversionRequested: false };
}
const teamBudget = resolveOfficialTeamMineralBudgetV1({
  procedureKind: "team_mineral_budget",
  armyResourceBudgetDataBundle: unitBundle.armyResourceBudgetDataBundle,
  state: { players }, teamSetComplete: true, playerPartitionComplete: true,
  rulesOwnedTeamArithmeticRequested: true,
  teams: [{ teamId: "team-a", agreedMineralBudget: 2000, agreed: true,
    playerArmyBudgets: ["player1", "player2"].map((playerId) => ({
      playerId, armyResourceBudgetInput: teamBudgetInput(playerId) })) },
  { teamId: "team-b", agreedMineralBudget: 2000, agreed: true,
    playerArmyBudgets: ["player3", "player4"].map((playerId) => ({
      playerId, armyResourceBudgetInput: teamBudgetInput(playerId) })) }],
});
assert.equal(teamBudget.eachPlayerBuildsOwnArmyFactionAndTacticalCards, true);
accept("11_slice103_team_budget_partition_is_reused");
const registry = resolveOfficialRosterRegistryAuditV1({
  procedureKind: "roster_registry_audit", rosterDisclosureDataBundle: bundle,
  state: { players }, teamGame: true, teamMineralBudgetResult: teamBudget,
  armyCompositionUpgradeAuditsBySide: auditsBySide, rosterSetComplete: true,
  rulesOwnedRosterProjectionRequested: true,
});
assert.equal(registry.everyPlayerBuildsOwnArmyIndependently, true);
accept("12_each_team_player_has_an_independent_authoritative_roster");
assert.equal(registry.sameOrDifferentTeamRacesPermitted, true);
accept("13_teammates_may_choose_the_same_or_different_race");
assert.deepEqual(registry.teams.map((entry) => entry.playerIds),
  [["player1", "player2"], ["player3", "player4"]]);
accept("14_team_membership_and_roster_hash_partition_is_exact");
const driftBudgetBody = { ...auditsBySide.player1.armyResourceBudgetResult,
  mineralBudget: 999 };
delete driftBudgetBody.resultHash;
const driftBudget = { ...driftBudgetBody,
  resultHash: hashStarcraftTmgContract(driftBudgetBody) };
const driftAuditBody = { ...auditsBySide.player1,
  armyResourceBudgetResult: driftBudget };
delete driftAuditBody.resultHash;
const driftAudit = { ...driftAuditBody,
  resultHash: hashStarcraftTmgContract(driftAuditBody) };
rejects("ROSTER_REGISTRY_TEAM_ALLOCATION_DRIFT", () => (
  resolveOfficialRosterRegistryAuditV1({
    procedureKind: "roster_registry_audit", rosterDisclosureDataBundle: bundle,
    state: { players }, teamGame: true, teamMineralBudgetResult: teamBudget,
    armyCompositionUpgradeAuditsBySide: { ...auditsBySide,
      player1: driftAudit }, rosterSetComplete: true,
    rulesOwnedRosterProjectionRequested: true,
  })));
accept("15_team_allocation_drift_fails_closed");

const agreements = playerIds.map((playerId) => (
  resolveOfficialClosedListAgreementSubmissionV1({
    procedureKind: "closed_list_agreement_submission",
    rosterDisclosureDataBundle: bundle, rosterRegistryResult: registry,
    playerId, closedListsAgreed: true, personalDecisionConfirmed: true,
    rulesOwnedAgreementIdentityRequested: true,
  })
));
assert.equal(agreements.every((entry) => entry.onePlayerMayNotSubmitForAnother), true);
accept("16_each_player_submits_only_their_own_closed_list_decision");
rejects("CLOSED_LIST_AGREEMENT_SUBMISSION_INVALID", () => (
  resolveOfficialClosedListAgreementSubmissionV1({
    procedureKind: "closed_list_agreement_submission",
    rosterDisclosureDataBundle: bundle, rosterRegistryResult: registry,
    playerId: "outsider", closedListsAgreed: true, personalDecisionConfirmed: true,
    rulesOwnedAgreementIdentityRequested: true,
  })));
accept("17_outsider_or_proxy_closed_list_agreement_fails_closed");
const closed = resolveOfficialRosterVisibilityV1({
  procedureKind: "roster_visibility_resolution",
  rosterDisclosureDataBundle: bundle, rosterRegistryResult: registry,
  playerClosedListAgreements: agreements, playerAgreementSetComplete: true,
  rulesOwnedVisibilityRequested: true,
});
assert.equal(closed.rosterVisibility, "closed");
accept("18_unanimous_player_agreement_selects_closed_lists");
assert.equal(closed.undeployedOpponentRosterEntriesHidden, true);
accept("19_closed_lists_hide_undeployed_opponent_roster_entries");
assert.equal(Object.values(closed.publicDisclosureBySide).every((entry) => (
  entry.units.length === 0 && entry.publicCards.every((card) => card.faceUp))), true);
accept("20_closed_lists_keep_faction_and_tactical_cards_face_up");
const open = resolveOfficialRosterVisibilityV1({
  procedureKind: "roster_visibility_resolution",
  rosterDisclosureDataBundle: bundle, rosterRegistryResult: registry,
  playerClosedListAgreements: agreements.map((entry, index) => ({
    playerId: entry.playerId, closedListsAgreed: index !== 0 })),
  playerAgreementSetComplete: true, rulesOwnedVisibilityRequested: true,
});
assert.equal(open.rosterVisibility, "open");
accept("21_one_player_decline_restores_core_default_open_lists");
assert.equal(Object.values(open.publicDisclosureBySide).every((entry) => (
  entry.unitEntriesComplete && entry.units.length === 1)), true);
accept("22_open_lists_disclose_full_units_upgrades_and_weapon_swaps_before_game");
const tournament = resolveOfficialRosterVisibilityV1({
  procedureKind: "roster_visibility_resolution",
  rosterDisclosureDataBundle: bundle, rosterRegistryResult: registry,
  tournamentOverride: { applicable: true,
    authorityKind: "tournament_organiser_rules_pack",
    artifactId: "tournament-pack-2026", contentHash: "a".repeat(64),
    verificationReceiptHash: "b".repeat(64), organizerKeyId: "organizer-key",
    signatureVerified: true, rosterVisibility: "closed" },
  playerAgreementSetComplete: true, rulesOwnedVisibilityRequested: true,
});
assert.equal(tournament.authorityKind, "tournament_organiser_rules_pack");
accept("23_verified_tournament_rules_pack_overrides_core_default");
rejects("ROSTER_VISIBILITY_TOURNAMENT_OVERRIDE_INVALID", () => (
  resolveOfficialRosterVisibilityV1({
    procedureKind: "roster_visibility_resolution",
    rosterDisclosureDataBundle: bundle, rosterRegistryResult: registry,
    tournamentOverride: { applicable: true,
      authorityKind: "tournament_organiser_rules_pack",
      artifactId: "bad", contentHash: "a".repeat(64),
      verificationReceiptHash: "b".repeat(64), organizerKeyId: "key",
      signatureVerified: false, rosterVisibility: "closed" },
    playerAgreementSetComplete: true, rulesOwnedVisibilityRequested: true,
  })));
accept("24_unsigned_tournament_override_fails_closed");

const expectedEquipment = deriveOfficialUnitExpectedEquipmentV1({
  rosterDisclosureDataBundle: bundle, rosterRegistryResult: registry,
  playerId: "player1", unitInstanceId: "marine-player1",
});
assert(expectedEquipment.equipmentCount > 0);
accept("25_expected_equipment_is_rules_derived_per_model");
const firstModel = "marine-player1-model-1";
assert(expectedEquipment.equipmentRows.some((entry) => (
  entry.modelId === firstModel && entry.equipmentName === "AGG-12")));
assert.equal(expectedEquipment.equipmentRows.some((entry) => (
  entry.modelId === firstModel && /^C-14 rifle$/iu.test(entry.equipmentName))), false);
accept("26_specialist_weapon_swap_replaces_default_weapon_on_nominated_model");
assert(expectedEquipment.equipmentRows.some((entry) => (
  entry.modelId === "marine-player1-model-2"
    && /^C-14 rifle$/iu.test(entry.equipmentName))));
accept("27_non_nominated_models_keep_default_weapon");
const unrepresentedKey = expectedEquipment.equipmentRows.find((entry) => (
  entry.equipmentName === "AGG-12")).equipmentKey;
const representedKeys = expectedEquipment.equipmentRows.map((entry) => entry.equipmentKey)
  .filter((key) => key !== unrepresentedKey);
const disclosure = resolveOfficialUnitEquipmentDeploymentDisclosureV1({
  procedureKind: "unit_equipment_deployment_disclosure",
  rosterDisclosureDataBundle: bundle, rosterRegistryResult: registry,
  rosterVisibilityResult: closed, playerId: "player1",
  unitInstanceId: "marine-player1", deployedToBattlefield: true,
  representationSetComplete: true, deploymentDisclosureSetComplete: true,
  rulesOwnedExpectedLoadoutRequested: true,
  representedEquipmentKeys: representedKeys,
  declaredUnrepresentedEquipmentKeys: [unrepresentedKey],
});
assert.equal(disclosure.deploymentPermitted, true);
accept("28_all_unrepresented_equipment_is_declared_at_deployment");
assert.equal(disclosure.publicUnitRoster.selectedUpgrades.length, 2);
accept("29_deployed_unit_discloses_upgrades_and_weapon_swaps");
assert.equal(disclosure.fullAndAccurateOnTableEquipmentKnowledgeEstablished, true);
accept("30_compliant_deployment_establishes_full_equipment_knowledge");
const nondisclosure = resolveOfficialUnitEquipmentDeploymentDisclosureV1({
  procedureKind: "unit_equipment_deployment_disclosure",
  rosterDisclosureDataBundle: bundle, rosterRegistryResult: registry,
  rosterVisibilityResult: closed, playerId: "player1",
  unitInstanceId: "marine-player1", deployedToBattlefield: true,
  representationSetComplete: true, deploymentDisclosureSetComplete: true,
  rulesOwnedExpectedLoadoutRequested: true,
  representedEquipmentKeys: representedKeys,
  declaredUnrepresentedEquipmentKeys: [],
});
assert.equal(nondisclosure.deploymentPermitted, false);
assert.equal(nondisclosure.conductClassification, "unsportsmanlike_conduct");
accept("31_missing_deployment_disclosure_blocks_deployment_and_records_conduct");
rejects("EQUIPMENT_DISCLOSURE_UNKNOWN_EQUIPMENT_KEY", () => (
  resolveOfficialUnitEquipmentDeploymentDisclosureV1({
    procedureKind: "unit_equipment_deployment_disclosure",
    rosterDisclosureDataBundle: bundle, rosterRegistryResult: registry,
    rosterVisibilityResult: closed, playerId: "player1",
    unitInstanceId: "marine-player1", deployedToBattlefield: true,
    representationSetComplete: true, deploymentDisclosureSetComplete: true,
    rulesOwnedExpectedLoadoutRequested: true,
    representedEquipmentKeys: [...representedKeys, "forged-equipment"],
    declaredUnrepresentedEquipmentKeys: [unrepresentedKey],
  })));
accept("32_forged_equipment_identity_fails_closed");

const referencedAction = { actionType: "shoot", sideKey: "player1",
  phase: "assault", pieceId: "marine-player1", targetId: "enemy-unit",
  executorId: "authority.test-shoot-v1", executorVersion: "1.0.0" };
const reminder = resolveOfficialEquipmentRelevantActionReminderV1({
  procedureKind: "equipment_relevant_action_reminder",
  rosterDisclosureDataBundle: bundle, equipmentDisclosureResult: disclosure,
  referencedAction, actionInformationCouldBeRelevant: true,
  reminderSetComplete: true, rulesOwnedReminderRequirementRequested: true,
  remindedEquipmentKeys: [unrepresentedKey],
});
assert.equal(reminder.referencedActionPermitted, true);
accept("33_unrepresented_equipment_is_repeated_before_relevant_action");
assert.match(reminder.actionContractHash, /^[a-f0-9]{64}$/u);
accept("34_reminder_permit_is_bound_to_exact_action_contract_hash");
const missingReminder = resolveOfficialEquipmentRelevantActionReminderV1({
  procedureKind: "equipment_relevant_action_reminder",
  rosterDisclosureDataBundle: bundle, equipmentDisclosureResult: disclosure,
  referencedAction, actionInformationCouldBeRelevant: true,
  reminderSetComplete: true, rulesOwnedReminderRequirementRequested: true,
  remindedEquipmentKeys: [],
});
assert.equal(missingReminder.referencedActionPermitted, false);
assert.equal(missingReminder.conductClassification, "unsportsmanlike_conduct");
accept("35_missing_relevant_action_reminder_blocks_action_and_records_conduct");
rejects("EQUIPMENT_RELEVANT_ACTION_REMINDER_REQUIRED", () => (
  assertOfficialEquipmentRelevantActionReminderV1({
    equipmentDisclosureByUnit: { "marine-player1": disclosure },
    equipmentReminderPermitsByActionHash: {},
  }, referencedAction)));
accept("36_runtime_gate_rejects_unit_action_without_reminder_permit");
assert.equal(assertOfficialEquipmentRelevantActionReminderV1({
  equipmentDisclosureByUnit: { "marine-player1": disclosure },
  equipmentReminderPermitsByActionHash: {
    [reminder.actionContractHash]: reminder,
  },
}, referencedAction), true);
accept("37_runtime_gate_accepts_exact_reminded_action");
rejects("EQUIPMENT_RELEVANT_ACTION_REMINDER_REQUIRED", () => (
  assertOfficialEquipmentRelevantActionReminderV1({
    equipmentDisclosureByUnit: { "marine-player1": disclosure },
    equipmentReminderPermitsByActionHash: {
      [reminder.actionContractHash]: reminder,
    },
  }, { ...referencedAction, targetId: "different-target" })));
accept("38_reminder_permit_cannot_be_reused_for_tampered_action");

const inspection = resolveOfficialOnTableUnitInspectionV1({
  procedureKind: "on_table_unit_inspection", rosterDisclosureDataBundle: bundle,
  rosterRegistryResult: registry, rosterVisibilityResult: closed,
  equipmentDisclosureResult: disclosure, inspectorPlayerId: "player3",
  inspectionRequested: true, rulesOwnedInspectionProjectionRequested: true,
});
assert.equal(inspection.opponentInspectionRightExercised, true);
accept("39_opponent_may_inspect_any_unit_on_the_table");
assert.equal(inspection.unitCard.name, "Marine");
accept("40_inspection_returns_complete_current_official_unit_card");
assert.equal(inspection.selectedUnitRoster.selectedUpgrades.length, 2);
accept("41_inspection_returns_selected_loadout_and_weapon_swaps");
assert(Array.isArray(inspection.associatedTacticalCards));
accept("42_inspection_returns_associated_face_up_tactical_cards");
rejects("ON_TABLE_UNIT_INSPECTION_REQUEST_INVALID", () => (
  resolveOfficialOnTableUnitInspectionV1({
    procedureKind: "on_table_unit_inspection", rosterDisclosureDataBundle: bundle,
    rosterRegistryResult: registry, rosterVisibilityResult: closed,
    equipmentDisclosureResult: nondisclosure, inspectorPlayerId: "player3",
    inspectionRequested: true, rulesOwnedInspectionProjectionRequested: true,
  })));
accept("43_blocked_undeployed_unit_cannot_be_inspected_as_on_table");

const privacyState = {
  players, cardResources: Object.fromEntries(playerIds.map((id) => [id, [id]])),
  rosterRegistryResolution: { teamMembershipByPlayer:
    registry.teamMembershipByPlayer }, rosterVisibilityResolution: closed,
  authoritativeRosterRegistry: registry,
  authoritativeArmyRostersBySide: registry.rostersByPlayer,
  publicRosterDisclosureBySide: closed.publicDisclosureBySide,
  armyCompositionUpgradeAuditsBySide: auditsBySide,
  unitCompositionSelectionsBySide: Object.fromEntries(playerIds.map((id) => (
    [id, { secretUnit: id }]))),
  unitUpgradeSelectionsBySide: Object.fromEntries(playerIds.map((id) => (
    [id, { secretUpgrade: id }]))),
  pendingAction: { schema:
    "starcraft_tmg_official_roster_disclosure_rules_pending_v1",
  choices: [{ choiceId: "secret-choice", result: registry }] }, log: [],
};
const player1Projection = projectStarcraftTmgStateForViewerV2(
  privacyState, "player1");
assert.deepEqual(Object.keys(player1Projection.ownTeamArmyRostersBySide).sort(),
  ["player1", "player2"]);
accept("44_closed_list_viewer_sees_only_own_team_authoritative_rosters");
assert.deepEqual(Object.keys(player1Projection.armyCompositionUpgradeAuditsBySide).sort(),
  ["player1", "player2"]);
accept("45_closed_list_viewer_cannot_read_opponent_slice104_audits");
assert.equal("authoritativeRosterRegistry" in player1Projection, false);
assert.equal("authoritativeArmyRostersBySide" in player1Projection, false);
accept("46_private_authoritative_registry_is_removed_from_room_projection");
assert.equal("result" in player1Projection.pendingAction.choices[0], false);
accept("47_pending_candidate_result_cannot_leak_closed_roster");
assert.equal(player1Projection.publicRosterDisclosureBySide.player3.units.length, 0);
accept("48_closed_opponent_public_projection_contains_no_undeployed_unit");
const spectatorProjection = projectStarcraftTmgStateForViewerV2(privacyState, null);
assert.deepEqual(spectatorProjection.ownTeamArmyRostersBySide, {});
accept("49_spectator_receives_no_private_roster");
const openProjection = projectStarcraftTmgStateForViewerV2({
  ...privacyState, rosterVisibilityResolution: open,
  publicRosterDisclosureBySide: open.publicDisclosureBySide,
}, "player1");
assert.deepEqual(Object.keys(openProjection.armyCompositionUpgradeAuditsBySide).sort(),
  playerIds);
accept("50_open_list_viewer_receives_full_pre_game_roster_information");

function prepare() {
  const state = fixture.battleState({ activeSideKey: "player1" });
  state.phase = "army_building"; state.rulesProcedureMode = true;
  state.teamGame = false;
  state.officialRosterDisclosureDataBundle = bundle;
  state.armyCompositionUpgradeAuditsBySide = {
    player1: auditsBySide.player1, player2: auditsBySide.player2,
  };
  state.rosterDisclosureRulesHistory = [];
  state.publicRosterDisclosureBySide = {};
  state.equipmentDisclosureByUnit = {};
  return state;
}
function plan(planId, procedureKind, input) {
  return { planId, procedureKind, input,
    rulesOwnedInputsComplete: true, clientSuppliedResult: false };
}
function procedure(sideKey, procedureKind, candidatePlan) {
  return { procedureKind, sideKey, candidatePlansComplete: true,
    rulesDenominatorComplete: true, candidatePlans: [candidatePlan] };
}
function bindingFor() {
  const dataHash = hashStarcraftTmgContract(fixture.gameplayDataBundle);
  return { bindingHash: "slice-105-roster-disclosure-binding",
    dataSnapshotHash: dataHash,
    dependencies: { dataSnapshot: { contentHash: dataHash } } };
}
function applyProcedure(state, sideKey, procedureKind, input) {
  const opened = openOfficialRosterDisclosureRulesPendingV1(state,
    procedure(sideKey, procedureKind,
      plan(`${procedureKind}-${sideKey}`, procedureKind, input)));
  const binding = bindingFor();
  const space = runtime.enumerate(opened.state, { sideKey,
    includeDisabled: true, matchBinding: binding });
  const domain = space.parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_ROSTER_DISCLOSURE_RULES_PARAMETER_KIND));
  assert(domain);
  const instantiated = runtime.instantiate(opened.state, domain,
    { choiceId: domain.constraints.choices[0].choiceId }, { matchBinding: binding });
  return runtime.apply(opened.state, instantiated.action, { matchBinding: binding });
}
let state = prepare();
let applied = applyProcedure(state, "player1", "roster_registry_audit", {
  rosterSetComplete: true, rulesOwnedRosterProjectionRequested: true,
});
state = applied.state;
assert.equal(state.rosterRegistryResolution.rosterSetComplete, true);
accept("51_runtime_applies_private_registry_and_public_summary_without_leak");
applied = applyProcedure(state, "player1", "closed_list_agreement_submission", {
  closedListsAgreed: true, personalDecisionConfirmed: true,
  rulesOwnedAgreementIdentityRequested: true,
});
state = applied.state;
applied = applyProcedure(state, "player2", "closed_list_agreement_submission", {
  closedListsAgreed: true, personalDecisionConfirmed: true,
  rulesOwnedAgreementIdentityRequested: true,
});
state = applied.state;
assert.deepEqual(Object.keys(state.rosterVisibilityAgreementsByPlayer).sort(),
  ["player1", "player2"]);
accept("52_runtime_records_two_independent_closed_list_agreements");
applied = applyProcedure(state, "player1", "roster_visibility_resolution", {
  rulesOwnedVisibilityRequested: true,
});
state = applied.state;
assert.equal(state.rosterVisibilityResolution.rosterVisibility, "closed");
accept("53_runtime_commits_unanimous_closed_list_visibility");
const runtimeExpected = deriveOfficialUnitExpectedEquipmentV1({
  rosterDisclosureDataBundle: bundle,
  rosterRegistryResult: state.authoritativeRosterRegistry,
  playerId: "player1", unitInstanceId: "marine-player1",
});
const runtimeMissing = runtimeExpected.equipmentRows.find((entry) => (
  entry.equipmentName === "AGG-12")).equipmentKey;
applied = applyProcedure(state, "player1", "unit_equipment_deployment_disclosure", {
  unitInstanceId: "marine-player1", deployedToBattlefield: true,
  representationSetComplete: true, deploymentDisclosureSetComplete: true,
  rulesOwnedExpectedLoadoutRequested: true,
  representedEquipmentKeys: runtimeExpected.equipmentRows.map((entry) => (
    entry.equipmentKey)).filter((key) => key !== runtimeMissing),
  declaredUnrepresentedEquipmentKeys: [runtimeMissing],
});
state = applied.state;
assert.equal(state.publicRosterDisclosureBySide.player1.units.length, 1);
accept("54_runtime_deployment_updates_closed_list_public_projection");
const runtimeReferencedAction = { ...referencedAction,
  pieceId: "marine-player1", sideKey: "player1" };
applied = applyProcedure(state, "player1", "equipment_relevant_action_reminder", {
  unitInstanceId: "marine-player1", referencedAction: runtimeReferencedAction,
  actionInformationCouldBeRelevant: true, reminderSetComplete: true,
  rulesOwnedReminderRequirementRequested: true,
  remindedEquipmentKeys: [runtimeMissing],
});
state = applied.state;
assert.equal(Object.keys(state.equipmentReminderPermitsByActionHash).length, 1);
accept("55_runtime_commits_exact_action_reminder_permit");
applied = applyProcedure(state, "player2", "on_table_unit_inspection", {
  unitInstanceId: "marine-player1", inspectionRequested: true,
  rulesOwnedInspectionProjectionRequested: true,
});
state = applied.state;
assert.equal(state.onTableUnitInspectionsBySide.player2.unitCard.name, "Marine");
accept("56_runtime_opponent_inspection_returns_official_card");

const graph = audit.graph; const graphAudit = auditRuleRelationshipGraphV1(graph);
assert.equal(graphAudit.valid, true);
assert.deepEqual({ nodes: graph.nodes.length, edges: graph.edges.length },
  { nodes: 11635, edges: 32472 });
accept("57_relationship_graph_is_valid_with_exact_slice105_counts");
const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_ROSTER_DISCLOSURE_RULES_RELATIONSHIP_SCOPE_ID));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "derived_value:rosterDisclosureV1.closedUndeployedSecrecy"
    && entry.to === "semantic_projection:room.rosterDisclosureViewerNoLeakV2"));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash")));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
accept("58_missing_closed_list_no_leak_edge_blocks_freeze");
assert.equal(slice.historicalCompatibility.previousRuntimeHash,
  "634bcc281480f6bcb297b940b295e18a3e2324e3a12dc58162455243d548f738");
assert.equal(slice.historicalCompatibility.actionSchemaVersion,
  "hybrid_legal_space_v43");
accept("59_action_schema_advances_to_v43_without_mutating_v42");

function engineFor(keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-09-01T12:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-105-roster-disclosure",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 105 roster disclosure rules.";
function envelopeFor(engine, stateInput) {
  return engine.createEnvelope({ roomId: "official-slice-105-roster-disclosure-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-roster-disclosure-no-geometry-v1",
        content: { kind: "geometry-artifact",
          geometryVersion: "roster_disclosure_no_geometry_v1" } },
      rulesDisplay: { artifactId: "official-slice-105-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "official-slice-105-action-schema-v43",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v43" } },
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
      geometryVersion: "roster_disclosure_no_geometry_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v43" } };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}
const keys = generateKeyPairSync("ed25519");
const authority = engineFor(keys, "slice-105-roster-disclosure-short-seal-v1");
const initialState = prepare();
const openedForAuthority = openOfficialRosterDisclosureRulesPendingV1(initialState,
  procedure("player1", "roster_registry_audit", plan("authority-registry",
    "roster_registry_audit", { rosterSetComplete: true,
      rulesOwnedRosterProjectionRequested: true })));
const seed = envelopeFor(authority, openedForAuthority.state);
registerReplay(authority, seed);
const grant = authority.issueSeatAuthority({ grantId: "slice105-player1",
  roomId: seed.roomId, matchBindingHash: seed.matchBindingHash,
  seatKey: "player1", roleMode: "player", principalType: "human",
  capabilities: ["read_room", "read_legal_space", "preview", "confirm", "apply"] });
const lease = authority.issueControlLease({ seatAuthority: grant,
  sessionId: "slice-105-roster-disclosure-session", leaseFence: 1,
  issuedAtRoomRevision: seed.stateRevision });
const legal = authority.legalSpace(seed, { seatAuthority: grant });
const domain = legal.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_ROSTER_DISCLOSURE_RULES_PARAMETER_KIND));
const preview = authority.preview({ envelope: seed, seatAuthority: grant,
  proposal: { kind: "parameterized", domainId: domain.domainId,
    parameters: { choiceId: domain.constraints.choices[0].choiceId } } });
const confirmation = authority.confirmPreview({ envelope: seed,
  preview: preview.preview, seatAuthority: grant });
const committed = authority.apply({ envelope: seed,
  expectedStateRevision: seed.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: grant,
  controlLease: lease, idempotencyKey: "slice-105-roster-disclosure" });
assert.equal(committed.ok, true, JSON.stringify(committed));
assert.equal(committed.receipt.refereeSignature.signatureAlgorithm, "ed25519");
accept("60_apply_receipt_has_long_lived_ed25519_signature");
assert.equal(preview.preview.previewSeal.sealAlgorithm, "hmac-sha256");
accept("61_apply_receipt_has_short_lived_hmac_seal");
const rotated = engineFor(keys, "slice-105-roster-disclosure-short-seal-v2");
registerReplay(rotated, seed);
const replayed = rotated.replay({ initialEnvelope: seed,
  journal: [committed.receipt] });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
accept("62_ed25519_receipt_replays_after_hmac_rotation");
const tampered = structuredClone(committed.receipt);
tampered.events.push({ type: "forged_roster_disclosure_event" });
assert.equal(rotated.replay({ initialEnvelope: seed,
  journal: [tampered] }).reason, "SIGNATURE_INVALID");
accept("63_tampered_long_lived_receipt_fails_replay");
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.equal(slice.harness.trainingTraceCandidates.length, 0);
assert.equal(slice.rosterDisclosureRulesProgress.sourceRefreshPerformed, false);
accept("64_no_skill_dsh_training_promotion_or_source_refresh_runs_in_slice105");

const report = { schema:
  "starcraft_tmg_official_roster_disclosure_rules_rule_slice_verification_v1",
generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
acceptanceTotal: acceptance.length, acceptance, failures: [],
sourceLockAudit: fixture.sourceLockAudit,
remainingRouteV2Hash: route.routeHash,
slice, audit, sliceAudit: audit, catalogueHash: slice.catalogueHash,
runtimeHash: runtime.descriptor.runtimeHash,
graphHash: audit.graph.graphHash, graph: audit.graph,
graphAudit: audit.graphAudit, coverage: audit.stateContractCoverage,
rosterDisclosureDataBundleHash: bundle.bundleHash,
sourceLockHash: bundle.sourceLockHash,
sourceSnapshotHash: bundle.sourceSnapshotHash,
normalizedDatasetHash: bundle.normalizedDatasetHash,
dataAudit: bundle.audit,
authorityFixture: { actionSchemaVersion: "hybrid_legal_space_v43",
  receiptCount: 1, ed25519ReplayAfterHmacRotation: true,
  tamperRejected: true },
rulesTruth: "official_roster_visibility_equipment_disclosure_state_transition_conformance",
trainingTruth: false };
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-roster-disclosure-rules-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, sliceHash: slice.sliceHash,
  catalogueHash: slice.catalogueHash, runtimeHash: runtime.descriptor.runtimeHash,
  graphHash: audit.graph.graphHash,
  rosterDisclosureDataBundleHash: bundle.bundleHash,
  graphNodes: audit.graph.nodes.length, graphEdges: audit.graph.edges.length,
  executableRuleAtoms: audit.counts.executableRuleAtoms,
  reviewRequiredRuleAtoms: audit.counts.reviewRequiredRuleAtoms,
  displayOnlyRuleAtoms: audit.counts.displayOnlyRuleAtoms,
  executorCount: runtime.descriptor.executorManifest.length,
  sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  skillsGenerated: 0, dshRuns: 0, trainingCandidates: 0 }, null, 2));
