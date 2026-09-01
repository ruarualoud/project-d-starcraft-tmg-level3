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
import {
  OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_NEW_ATOM_IDS,
  OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_PARAMETER_KIND,
} from "../packages/rule-atoms/official-mission-deployment-draft-rules-executor-v1.mjs";
import {
  applyOfficialMissionDeploymentDraftChoiceV1,
  createOfficialMissionDeploymentDraftStateV1,
  enumerateOfficialMissionDeploymentDraftChoicesV1,
  verifyOfficialMissionDeploymentDraftStateV1,
} from "../packages/rule-atoms/official-mission-deployment-draft-rules-kernel-v1.mjs";
import { OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-mission-deployment-draft-rules-relationship-contract-v1.mjs";
import {
  createOfficialMissionDeploymentDraftRulesRuleSliceV1,
  verifyOfficialMissionDeploymentDraftRulesRuleSliceV1,
} from "../packages/rule-atoms/official-mission-deployment-draft-rules-rule-slice-v1.mjs";
import { createOfficialRemainingRuleAtomRouteV2 } from
  "../packages/rule-atoms/official-remaining-rule-atom-route-v2.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import {
  createOfficialMissionDeploymentDraftDataBundleV1,
  verifyOfficialMissionDeploymentDraftDataBundleV1,
} from "../packages/source-data/official-mission-deployment-draft-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-roster-disclosure-rules-rule-slice-v1-report.json"), "utf8"));
const routeBaseReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-elevation-effective-size-rules-rule-slice-v1-report.json"), "utf8"));
const acceptance = [];
function accept(description) {
  acceptance.push(`${String(acceptance.length + 1).padStart(2, "0")}_${description}`);
}
function rejects(code, operation) {
  assert.throws(operation, (error) => String(error?.message || error).startsWith(code));
}
function reveals(outcomes) {
  return outcomes.map((outcome, counter) => ({ counter, faces: 6, outcome }));
}

const slice = createOfficialMissionDeploymentDraftRulesRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialMissionDeploymentDraftRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 854,
  newlyExecutableRuleAtoms: 21, reviewRequiredRuleAtoms: 58,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 854,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 75, missingStateContractExecutors: 0 });
accept("slice106_promotes_21_atoms_to_854_executable");
const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 106);
assert.deepEqual(assignment.atomIds, [...OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_NEW_ATOM_IDS]);
assert.deepEqual([assignment.executableAfter, assignment.reviewRequiredAfter], [854, 58]);
accept("route_v2_slice106_atom_identity_and_counts_match");
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executorManifest.length, 75);
assert(runtime.descriptor.executorManifest.some((entry) => (
  entry.executorId === "authority.mission-deployment-draft-rules-v1")));
accept("runtime_exposes_mission_deployment_draft_as_executor_75");
assert.deepEqual({ slice: slice.sliceHash, catalogue: slice.catalogueHash,
  runtime: runtime.descriptor.runtimeHash, graph: audit.graph.graphHash }, {
  slice: "760a20172d419c4eb6fa1be22cce144df01e82245ef908aaceef23992167525e",
  catalogue: "1fb1753f9d8e09faeaa769774906777df16a7a0c90320f383784efc4ff4c2f8b",
  runtime: "d6beaea09a6426c523ae9d35ac1c83824fce26288f9ea257b32d92a1d1fcf23b",
  graph: "b854b730a40034775de5ae21192c40a632dcdc4c68a53b6f0b858178af6a98d1",
});
accept("slice_catalogue_runtime_and_graph_hashes_are_frozen");
assert.deepEqual({ nodes: audit.graph.nodes.length, edges: audit.graph.edges.length },
  { nodes: 11796, edges: 32744 });
accept("relationship_graph_denominator_is_exact");

const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const bundle = createOfficialMissionDeploymentDraftDataBundleV1({
  dataset: fixture.dataset,
});
assert.equal(verifyOfficialMissionDeploymentDraftDataBundleV1(bundle), true);
accept("mission_deployment_data_bundle_is_content_hash_verified");
assert.equal(bundle.bundleHash,
  "2f028e0e9f34ec87c5da06f24ea027e17d433ad546f3e344de268bb79fb254d9");
accept("mission_deployment_data_bundle_identity_is_frozen");
assert.deepEqual({ mission: bundle.missionProfileIndexHash,
  deployment: bundle.deploymentProfileIndexHash }, {
  mission: "a25110638ff2beef6eddc04670eca54e16aff53af8afbbbe1e6c253ea1c33fa8",
  deployment: "25405463525eae5aae2fd9fe6a6c862141736224003013c9660afce4c0475383",
});
accept("mission_and_deployment_profile_indices_are_frozen");
assert.deepEqual(bundle.counts, { missionProfiles: 10, deploymentProfiles: 10,
  standardMissionProfiles: 5, skirmishMissionProfiles: 5,
  standardDeploymentProfiles: 5, skirmishDeploymentProfiles: 5 });
accept("current_card_denominator_is_ten_plus_ten");
assert.deepEqual(bundle.ruleSections.map((entry) => entry.title),
  ["5.5 Mission Cards", "5.6 Deployment Cards",
    "9.2 Mission Selection and the Draft",
    "9.2.1 Mission and Deployment Card Details", "12.1 Pre-Game Protocol"]);
accept("five_exact_core_rule_sections_are_bound");
assert.deepEqual(bundle.ruleClauses.map((entry) => entry.atomId).sort(),
  [...OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_NEW_ATOM_IDS]);
accept("twenty_one_exact_clause_boundaries_cover_route_atoms");
assert.deepEqual(bundle.supportedDraftEngagementScales, ["Skirmish", "Standard"]);
assert.deepEqual(bundle.unsupportedCurrentDraftEngagementScales, ["Grand Offensive"]);
accept("only_current_card_backed_engagement_scales_are_enabled");
assert.equal(bundle.sourcePolicy.refreshDuringDevelopment, false);
assert.equal(bundle.sourcePolicy.repositoryFallbackAllowed, false);
accept("source_lock_remains_offline_without_repository_fallback");
assert.equal(bundle.coreRulesHash,
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54");
assert.equal(bundle.p2pDeploymentSourceHash,
  "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c");
accept("core_and_p2p_source_content_hashes_are_pinned");

let draft = createOfficialMissionDeploymentDraftStateV1({
  missionDeploymentDraftDataBundle: bundle,
  participantIds: ["player2", "player1"], engagementScale: "Standard",
});
assert.equal(draft.stage, "submit_draft_sets");
assert.deepEqual(draft.participantIds, ["player1", "player2"]);
accept("draft_state_starts_canonically_with_two_sorted_participants");
let choices = enumerateOfficialMissionDeploymentDraftChoicesV1({
  missionDeploymentDraftDataBundle: bundle, draftState: draft, playerId: "player1",
});
assert.equal(choices.length, 100);
accept("five_choose_two_squared_yields_100_rules_owned_inputs");
assert(choices.every((entry) => new Set(entry.value.missionRecordKeys).size === 2
  && new Set(entry.value.deploymentRecordKeys).size === 2));
accept("every_input_choice_forbids_own_set_duplicates");
assert(choices.every((entry) => entry.value.missionRecordKeys.every((key) => (
  bundle.missionProfiles.find((profile) => profile.recordKey === key)
    .engagementScale === "Standard"))));
accept("input_domain_filters_missions_to_agreed_scale");
assert.equal(enumerateOfficialMissionDeploymentDraftChoicesV1({
  missionDeploymentDraftDataBundle: bundle, draftState: draft, playerId: "spectator",
}).length, 0);
accept("nonparticipant_has_no_submit_choice");
const firstSubmission = choices[0];
draft = applyOfficialMissionDeploymentDraftChoiceV1({
  missionDeploymentDraftDataBundle: bundle, draftState: draft,
  playerId: "player1", choiceId: firstSubmission.choiceId,
}).draftState;
assert.deepEqual(Object.keys(draft.submissionsByPlayer), ["player1"]);
accept("first_participant_submission_is_committed");
choices = enumerateOfficialMissionDeploymentDraftChoicesV1({
  missionDeploymentDraftDataBundle: bundle, draftState: draft, playerId: "player2",
});
assert.equal(choices.length, 100);
assert.deepEqual(choices[0].value, firstSubmission.value);
accept("opponent_may_submit_the_same_two_card_names");
draft = applyOfficialMissionDeploymentDraftChoiceV1({
  missionDeploymentDraftDataBundle: bundle, draftState: draft,
  playerId: "player2", choiceId: choices[0].choiceId,
}).draftState;
const sharedMissionKey = firstSubmission.value.missionRecordKeys[0];
const sharedOccurrences = draft.faceUpRows.mission.filter((entry) => (
  entry.recordKey === sharedMissionKey));
assert.equal(sharedOccurrences.length, 2);
assert.notEqual(sharedOccurrences[0].occurrenceId, sharedOccurrences[1].occurrenceId);
accept("opposing_overlap_is_preserved_as_distinct_occurrences");
assert.equal(draft.stage, "opening_roll_off");
assert.deepEqual([draft.faceUpRows.mission.length, draft.faceUpRows.deployment.length], [4, 4]);
accept("two_submissions_open_four_plus_four_face_up_rows");
choices = enumerateOfficialMissionDeploymentDraftChoicesV1({
  missionDeploymentDraftDataBundle: bundle, draftState: draft, playerId: "player1",
});
rejects("MISSION_DEPLOYMENT_DRAFT_ROLL_OFF_REVEALS_REQUIRED", () => (
  applyOfficialMissionDeploymentDraftChoiceV1({
    missionDeploymentDraftDataBundle: bundle, draftState: draft,
    playerId: "player1", choiceId: choices[0].choiceId,
  })));
accept("opening_rolloff_rejects_missing_authority_reveals");
draft = applyOfficialMissionDeploymentDraftChoiceV1({
  missionDeploymentDraftDataBundle: bundle, draftState: draft,
  playerId: "player1", choiceId: choices[0].choiceId,
  chanceReveals: reveals([3, 3, 4, 2]),
}).draftState;
assert.equal(draft.stage, "opening_roll_off");
assert.equal(draft.rollOffHistory[0].result, "tie");
accept("tied_rolloff_keeps_the_rolloff_stage_open");
assert.equal(draft.rollOffAttempt, 1);
accept("tied_rolloff_is_recorded_as_attempt_one");
choices = enumerateOfficialMissionDeploymentDraftChoicesV1({
  missionDeploymentDraftDataBundle: bundle, draftState: draft, playerId: "player1",
});
draft = applyOfficialMissionDeploymentDraftChoiceV1({
  missionDeploymentDraftDataBundle: bundle, draftState: draft,
  playerId: "player1", choiceId: choices[0].choiceId,
  chanceReveals: reveals([6, 5, 1, 1]),
}).draftState;
assert.equal(draft.rollOffWinnerPlayerId, "player1");
assert.equal(draft.stage, "choose_colour");
accept("fresh_rolloff_attempt_resolves_a_winner");
choices = enumerateOfficialMissionDeploymentDraftChoicesV1({
  missionDeploymentDraftDataBundle: bundle, draftState: draft, playerId: "player1",
});
assert.deepEqual(choices.map((entry) => entry.value.colour), ["red", "blue"]);
accept("rolloff_winner_has_exactly_two_colour_choices");
draft = applyOfficialMissionDeploymentDraftChoiceV1({
  missionDeploymentDraftDataBundle: bundle, draftState: draft,
  playerId: "player1", choiceId: choices[0].choiceId,
}).draftState;
assert.deepEqual(draft.colourByPlayer, { player1: "red", player2: "blue" });
accept("winner_colour_choice_assigns_the_complement_to_opponent");
choices = enumerateOfficialMissionDeploymentDraftChoicesV1({
  missionDeploymentDraftDataBundle: bundle, draftState: draft, playerId: "player1",
});
assert.deepEqual(choices.map((entry) => entry.value.controlledDraft),
  ["mission", "deployment"]);
accept("winner_has_exactly_two_draft_control_choices");
draft = applyOfficialMissionDeploymentDraftChoiceV1({
  missionDeploymentDraftDataBundle: bundle, draftState: draft,
  playerId: "player1", choiceId: choices[0].choiceId,
}).draftState;
assert.deepEqual(draft.controllerByDraft, { mission: "player1", deployment: "player2" });
accept("mission_and_deployment_control_are_complementary");
assert.equal(enumerateOfficialMissionDeploymentDraftChoicesV1({
  missionDeploymentDraftDataBundle: bundle, draftState: draft, playerId: "player1",
}).length, 0);
accept("mission_controller_cannot_perform_opponents_elimination");
choices = enumerateOfficialMissionDeploymentDraftChoicesV1({
  missionDeploymentDraftDataBundle: bundle, draftState: draft, playerId: "player2",
});
assert.equal(choices.length, 6);
accept("mission_noncontroller_has_four_choose_two_eliminations");
draft = applyOfficialMissionDeploymentDraftChoiceV1({
  missionDeploymentDraftDataBundle: bundle, draftState: draft,
  playerId: "player2", choiceId: choices[0].choiceId,
}).draftState;
assert.equal(draft.missionDraft.remainingOccurrenceIds.length, 2);
accept("mission_elimination_leaves_exactly_two_occurrences");
choices = enumerateOfficialMissionDeploymentDraftChoicesV1({
  missionDeploymentDraftDataBundle: bundle, draftState: draft, playerId: "player1",
});
assert.equal(choices.length, 2);
accept("mission_controller_selects_one_of_the_remaining_two");
draft = applyOfficialMissionDeploymentDraftChoiceV1({
  missionDeploymentDraftDataBundle: bundle, draftState: draft,
  playerId: "player1", choiceId: choices[0].choiceId,
}).draftState;
assert.equal(draft.stage, "deployment_elimination");
accept("mission_selection_advances_to_deployment_elimination");
choices = enumerateOfficialMissionDeploymentDraftChoicesV1({
  missionDeploymentDraftDataBundle: bundle, draftState: draft, playerId: "player1",
});
assert.equal(choices.length, 6);
accept("deployment_noncontroller_has_four_choose_two_eliminations");
draft = applyOfficialMissionDeploymentDraftChoiceV1({
  missionDeploymentDraftDataBundle: bundle, draftState: draft,
  playerId: "player1", choiceId: choices[0].choiceId,
}).draftState;
choices = enumerateOfficialMissionDeploymentDraftChoicesV1({
  missionDeploymentDraftDataBundle: bundle, draftState: draft, playerId: "player2",
});
assert.equal(choices.length, 2);
accept("deployment_controller_selects_one_of_the_remaining_two");
draft = applyOfficialMissionDeploymentDraftChoiceV1({
  missionDeploymentDraftDataBundle: bundle, draftState: draft,
  playerId: "player2", choiceId: choices[0].choiceId,
}).draftState;
assert.equal(draft.stage, "complete");
assert.equal(verifyOfficialMissionDeploymentDraftStateV1(draft, bundle), true);
accept("full_kernel_draft_reaches_a_verified_complete_state");
assert.equal(draft.selectedMission.profile.engagementScale, "Standard");
assert.equal(draft.selectedMission.profile.fieldContract.arbitraryEffectExecutionClaimedByThisSlice,
  false);
accept("selected_mission_binds_scale_and_fields_without_effect_overclaim");
assert.equal(draft.selectedDeployment.profile.engagementScale, "Standard");
assert.equal(draft.selectedDeployment.profile.fieldContract.geometryMaterializedByThisSlice,
  false);
accept("selected_deployment_binds_scale_and_fields_without_geometry_overclaim");
assert.equal(draft.draftBinding.bindingHash,
  hashStarcraftTmgContract(Object.fromEntries(Object.entries(draft.draftBinding)
    .filter(([key]) => key !== "bindingHash"))));
accept("final_draft_binding_is_content_hash_sealed");
assert.deepEqual(draft.draftBinding.markerAffinityByNumber,
  { 1: "player1", 2: "player2", 3: "player1", 4: "player2", 5: null });
accept("marker_affinity_is_derived_after_both_drafts_from_colours");
assert.equal(draft.draftBinding.geometryExecutionReady, false);
assert.equal(draft.draftBinding.geometryExecutionOwner, "ticket_11_slice_107");
accept("selected_geometry_execution_remains_owned_by_slice107");
assert.equal(draft.draftBinding.arbitraryMissionEffectExecutionClaimed, false);
accept("arbitrary_mission_effect_execution_is_not_claimed");
assert.equal(draft.draftBinding.opposingDuplicateCardsAllowed, true);
assert.equal(draft.draftBinding.ownSetDuplicatesAllowed, false);
accept("binding_distinguishes_opposing_overlap_from_own_duplicates");
const tamperedState = structuredClone(draft);
tamperedState.stage = "opening_roll_off";
rejects("MISSION_DEPLOYMENT_DRAFT_STATE_INVALID", () => (
  verifyOfficialMissionDeploymentDraftStateV1(tamperedState, bundle)));
accept("state_hash_rejects_stage_tampering");
const stale = createOfficialMissionDeploymentDraftStateV1({
  missionDeploymentDraftDataBundle: bundle,
  participantIds: ["player1", "player2"], engagementScale: "Standard",
});
const staleChoice = enumerateOfficialMissionDeploymentDraftChoicesV1({
  missionDeploymentDraftDataBundle: bundle, draftState: stale, playerId: "player1",
})[0];
const advancedStale = applyOfficialMissionDeploymentDraftChoiceV1({
  missionDeploymentDraftDataBundle: bundle, draftState: stale,
  playerId: "player1", choiceId: staleChoice.choiceId,
}).draftState;
rejects("MISSION_DEPLOYMENT_DRAFT_CHOICE_INVALID", () => (
  applyOfficialMissionDeploymentDraftChoiceV1({
    missionDeploymentDraftDataBundle: bundle, draftState: advancedStale,
    playerId: "player1", choiceId: staleChoice.choiceId,
  })));
accept("choice_from_prior_state_hash_is_rejected_as_stale");
rejects("MISSION_DEPLOYMENT_DRAFT_SCALE_UNSUPPORTED", () => (
  createOfficialMissionDeploymentDraftStateV1({
    missionDeploymentDraftDataBundle: bundle,
    participantIds: ["player1", "player2"], engagementScale: "Grand Offensive",
  })));
accept("missing_current_grand_offensive_cards_fail_closed");

function prepareState() {
  const state = fixture.battleState({ activeSideKey: "player1" });
  state.phase = "army_building";
  state.rulesProcedureMode = true;
  state.pendingAction = null;
  state.missionDeploymentDraftParticipantIds = ["player1", "player2"];
  state.armyBuildingEngagementScale = { scaleId: "Standard" };
  state.officialMissionDeploymentDraftDataBundle = bundle;
  state.missionDeploymentDraftHistory = [];
  return state;
}
function bindingFor() {
  const dataHash = hashStarcraftTmgContract(fixture.gameplayDataBundle);
  return { bindingHash: "slice-106-mission-deployment-draft-binding",
    dataSnapshotHash: dataHash,
    dependencies: { dataSnapshot: { contentHash: dataHash } } };
}
function runtimeDomain(state, sideKey) {
  const legal = runtime.enumerate(state, { sideKey, includeDisabled: true,
    matchBinding: bindingFor() });
  return legal.parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_PARAMETER_KIND));
}
function runtimeStep(state, sideKey, selector = (entries) => entries[0], chance = undefined) {
  const domain = runtimeDomain(state, sideKey);
  assert(domain, `missing draft domain for ${sideKey}`);
  const selected = selector(domain.constraints.choices);
  const instantiated = runtime.instantiate(state, domain,
    { choiceId: selected.choiceId }, { matchBinding: bindingFor() });
  return { domain, instantiated, applied: runtime.apply(state,
    instantiated.action, { matchBinding: bindingFor(), chanceReveals: chance }) };
}
let runtimeState = prepareState();
let runtimeResult = runtimeStep(runtimeState, "player1");
assert.equal(runtimeResult.domain.constraints.choiceCount, 100);
accept("runtime_exposes_the_complete_100_choice_submit_domain");
assert.equal(runtimeResult.domain.constraints.rulesOwnedCompleteChoiceDomain, true);
assert.equal(runtimeResult.domain.constraints.clientSuppliedRuleResultAccepted, false);
accept("runtime_domain_is_rules_owned_and_rejects_client_results");
rejects("MISSION_DEPLOYMENT_DRAFT_PARAMETERS_INVALID", () => (
  runtime.instantiate(runtimeState, runtimeResult.domain,
    { choiceId: runtimeResult.domain.constraints.choices[0].choiceId, result: "forged" },
    { matchBinding: bindingFor() })));
accept("runtime_rejects_client_supplied_extra_parameters");
runtimeState = runtimeResult.applied.state;
assert.equal(runtimeState.officialMissionDeploymentDraft.stage, "submit_draft_sets");
accept("runtime_commits_the_first_submission_through_executor75");
runtimeState = runtimeStep(runtimeState, "player2").applied.state;
const rollDomain = runtimeDomain(runtimeState, "player1");
const rollChoice = rollDomain.constraints.choices[0];
const rollInstantiated = runtime.instantiate(runtimeState, rollDomain,
  { choiceId: rollChoice.choiceId }, { matchBinding: bindingFor() });
runtimeResult = { domain: rollDomain, instantiated: rollInstantiated };
assert.deepEqual(runtimeResult.instantiated.action.chance.diceByPlayer,
  { player1: 2, player2: 2 });
assert.deepEqual(runtimeResult.instantiated.action.chance.layout,
  { initiativePlayer1: 2, initiativePlayer2: 2 });
assert.deepEqual(runtimeResult.instantiated.action.chance.revealOrder,
  ["player1:die:1", "player1:die:2", "player2:die:1", "player2:die:2"]);
accept("runtime_rolloff_contract_names_each_participants_two_dice");
runtimeState = runtime.apply(runtimeState, runtimeResult.instantiated.action,
  { matchBinding: bindingFor(), chanceReveals: reveals([3, 3, 4, 2]) }).state;
runtimeState = runtimeStep(runtimeState, "player1", undefined,
  reveals([6, 5, 1, 1])).applied.state;
runtimeState = runtimeStep(runtimeState, "player1").applied.state;
runtimeState = runtimeStep(runtimeState, "player1").applied.state;
runtimeState = runtimeStep(runtimeState, "player2").applied.state;
runtimeState = runtimeStep(runtimeState, "player1").applied.state;
runtimeState = runtimeStep(runtimeState, "player1").applied.state;
runtimeState = runtimeStep(runtimeState, "player2").applied.state;
assert.equal(runtimeState.officialMissionDeploymentDraft.stage, "complete");
accept("runtime_executes_the_complete_ten_step_tie_then_win_trace");
assert.equal(runtimeState.missionDeploymentDraftHistory.length, 10);
accept("runtime_persists_one_resolution_per_confirmed_step");
assert.equal(runtimeState.lastMissionDeploymentDraftResolution.completed, true);
assert.equal(runtimeState.lastMissionDeploymentDraftResolution.clientSuppliedRollsOrRuleResultAccepted,
  false);
accept("runtime_final_resolution_is_rules_owned_and_complete");
assert.equal(runtimeState.officialMissionDeploymentDraftBinding.bindingHash,
  runtimeState.officialMissionDeploymentDraft.draftBinding.bindingHash);
accept("runtime_promotes_complete_draft_binding_to_match_state");
const playerProjection = projectStarcraftTmgStateForViewerV2(runtimeState, "player1");
assert.equal(playerProjection.officialMissionDeploymentDraft.stage, "complete");
assert.equal(playerProjection.officialMissionDeploymentDraftBinding.geometryExecutionReady, false);
accept("player_room_projection_exposes_complete_public_draft_and_boundary");
const spectatorProjection = projectStarcraftTmgStateForViewerV2(runtimeState, null);
assert.equal(spectatorProjection.officialMissionDeploymentDraftBinding.bindingHash,
  runtimeState.officialMissionDeploymentDraftBinding.bindingHash);
assert.deepEqual(spectatorProjection.cardResources, {});
accept("spectator_projection_exposes_public_draft_without_private_cards");

const graphAudit = auditRuleRelationshipGraphV1(audit.graph);
assert.equal(graphAudit.valid, true);
assert.equal(graphAudit.declaredScopesValid, true);
accept("slice106_relationship_scope_passes_full_graph_audit");
assert.deepEqual({ sourceClauses: graphAudit.counts.sourceClauses,
  executableAtoms: graphAudit.counts.executableRuleAtoms,
  executors: graphAudit.counts.executors, remaining: graphAudit.counts.remainingActionableRuleAtoms,
  gaps: graphAudit.counts.blockingGaps },
{ sourceClauses: 1093, executableAtoms: 854, executors: 75, remaining: 58, gaps: 0 });
accept("graph_audit_counts_are_exact_with_zero_blocking_gaps");
const broken = structuredClone(audit.graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_RELATIONSHIP_SCOPE_ID));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "derived_value:missionDeploymentDraftV1.deploymentFieldContract"
  && entry.to === "semantic_projection:rules.selectedDeploymentGeometryOwnedBySlice107"));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash")));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
accept("missing_geometry_boundary_edge_blocks_release");
assert.equal(slice.historicalCompatibility.previousRuntimeHash,
  "82e6a48ff5531fd0b67821195d02a522210db3b4d5d343e94236b620773bd3ba");
assert.deepEqual([slice.historicalCompatibility.previousActionSchemaVersion,
  slice.historicalCompatibility.actionSchemaVersion],
  ["hybrid_legal_space_v43", "hybrid_legal_space_v44"]);
accept("v44_advances_without_mutating_frozen_v43_runtime");

function engineFor(keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-09-01T12:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-106-mission-deployment-draft",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 106 mission/deployment draft rules.";
function envelopeFor(engine, state) {
  return engine.createEnvelope({ roomId: "official-slice-106-mission-deployment-draft-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-mission-deployment-draft-no-geometry-v1",
        content: { kind: "geometry-artifact",
          geometryVersion: "mission_deployment_draft_no_geometry_v1" } },
      rulesDisplay: { artifactId: "official-slice-106-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "official-slice-106-action-schema-v44",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v44" } },
    }, state });
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
      geometryVersion: "mission_deployment_draft_no_geometry_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v44" } };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}
const keys = generateKeyPairSync("ed25519");
const authority = engineFor(keys, "slice-106-draft-short-seal-v1");
const seed = envelopeFor(authority, prepareState());
registerReplay(authority, seed);
const grant = authority.issueSeatAuthority({ grantId: "slice106-player1",
  roomId: seed.roomId, matchBindingHash: seed.matchBindingHash,
  seatKey: "player1", roleMode: "player", principalType: "human",
  capabilities: ["read_room", "read_legal_space", "preview", "confirm", "apply"] });
const lease = authority.issueControlLease({ seatAuthority: grant,
  sessionId: "slice-106-draft-session", leaseFence: 1,
  issuedAtRoomRevision: seed.stateRevision });
const legal = authority.legalSpace(seed, { seatAuthority: grant });
const authorityDomain = legal.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_PARAMETER_KIND));
const preview = authority.preview({ envelope: seed, seatAuthority: grant,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: { choiceId: authorityDomain.constraints.choices[0].choiceId } } });
assert.equal(preview.preview.previewSeal.sealAlgorithm, "hmac-sha256");
accept("authority_preview_has_short_lived_hmac_seal");
const confirmation = authority.confirmPreview({ envelope: seed,
  preview: preview.preview, seatAuthority: grant });
const committed = authority.apply({ envelope: seed,
  expectedStateRevision: seed.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: grant,
  controlLease: lease, idempotencyKey: "slice-106-draft-first-submission" });
assert.equal(committed.ok, true, JSON.stringify(committed));
assert.equal(committed.receipt.refereeSignature.signatureAlgorithm, "ed25519");
accept("authority_apply_receipt_has_long_lived_ed25519_signature");
let rollAuthorityState = prepareState();
rollAuthorityState = runtimeStep(rollAuthorityState, "player1").applied.state;
rollAuthorityState = runtimeStep(rollAuthorityState, "player2").applied.state;
const rollSeed = envelopeFor(authority, rollAuthorityState);
const rollGrant = authority.issueSeatAuthority({ grantId: "slice106-roll-player1",
  roomId: rollSeed.roomId, matchBindingHash: rollSeed.matchBindingHash,
  seatKey: "player1", roleMode: "player", principalType: "human",
  capabilities: ["read_room", "read_legal_space", "preview"] });
const rollLegal = authority.legalSpace(rollSeed, { seatAuthority: rollGrant });
const rollAuthorityDomain = rollLegal.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_PARAMETER_KIND));
const rollPreview = authority.preview({ envelope: rollSeed, seatAuthority: rollGrant,
  proposal: { kind: "parameterized", domainId: rollAuthorityDomain.domainId,
    parameters: { choiceId: rollAuthorityDomain.constraints.choices[0].choiceId } } });
assert.equal(rollPreview.ok, true, JSON.stringify(rollPreview));
assert.deepEqual(rollPreview.preview.core.chanceTicket.spec.layout,
  { initiativePlayer1: 2, initiativePlayer2: 2 });
assert.equal(rollPreview.preview.core.result.chancePending, true);
const rotated = engineFor(keys, "slice-106-draft-short-seal-v2");
registerReplay(rotated, seed);
assert.equal(rotated.replay({ initialEnvelope: seed,
  journal: [committed.receipt] }).ok, true);
accept("ed25519_receipt_replays_after_hmac_rotation");
const tampered = structuredClone(committed.receipt);
tampered.events.push({ type: "forged_mission_deployment_draft_event" });
assert.equal(rotated.replay({ initialEnvelope: seed,
  journal: [tampered] }).reason, "SIGNATURE_INVALID");
accept("tampered_long_lived_receipt_fails_replay");
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.equal(slice.harness.trainingTraceCandidates.length, 0);
assert.equal(slice.missionDeploymentDraftRulesProgress.sourceRefreshPerformed, false);
accept("no_skill_dsh_training_promotion_or_source_refresh_runs_in_slice106");
assert.equal(runtimeState.officialMissionDeploymentDraftBinding.productionRoomBindingEligible,
  false);
accept("draft_binding_stays_out_of_production_until_slice107_geometry");

assert.equal(acceptance.length, 70);
const report = { schema:
  "starcraft_tmg_official_mission_deployment_draft_rules_rule_slice_verification_v1",
generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
acceptanceTotal: acceptance.length, acceptance, failures: [],
sourceLockAudit: fixture.sourceLockAudit,
remainingRouteV2Hash: route.routeHash,
slice, audit, sliceAudit: audit, catalogueHash: slice.catalogueHash,
runtimeHash: runtime.descriptor.runtimeHash,
graphHash: audit.graph.graphHash, graph: audit.graph,
graphAudit: audit.graphAudit, coverage: audit.stateContractCoverage,
missionDeploymentDraftDataBundleHash: bundle.bundleHash,
missionProfileIndexHash: bundle.missionProfileIndexHash,
deploymentProfileIndexHash: bundle.deploymentProfileIndexHash,
sourceLockHash: bundle.sourceLockHash,
sourceSnapshotHash: bundle.sourceSnapshotHash,
normalizedDatasetHash: bundle.normalizedDatasetHash,
dataAudit: bundle.counts,
authorityFixture: { actionSchemaVersion: "hybrid_legal_space_v44",
  receiptCount: 1, ed25519ReplayAfterHmacRotation: true, tamperRejected: true },
rulesTruth: "official_mission_deployment_draft_state_transition_conformance",
trainingTruth: false };
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-mission-deployment-draft-rules-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, sliceHash: slice.sliceHash,
  catalogueHash: slice.catalogueHash, runtimeHash: runtime.descriptor.runtimeHash,
  graphHash: audit.graph.graphHash,
  missionDeploymentDraftDataBundleHash: bundle.bundleHash,
  graphNodes: audit.graph.nodes.length, graphEdges: audit.graph.edges.length,
  executableRuleAtoms: audit.counts.executableRuleAtoms,
  reviewRequiredRuleAtoms: audit.counts.reviewRequiredRuleAtoms,
  displayOnlyRuleAtoms: audit.counts.displayOnlyRuleAtoms,
  executorCount: runtime.descriptor.executorManifest.length,
  sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  skillsGenerated: 0, dshRuns: 0, trainingCandidates: 0 }, null, 2));
