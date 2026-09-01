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
import { createOfficialRemainingRuleAtomRouteV2 } from
  "../packages/rule-atoms/official-remaining-rule-atom-route-v2.mjs";
import {
  OFFICIAL_RESERVE_LIFECYCLE_RULES_NEW_ATOM_IDS,
  OFFICIAL_RESERVE_LIFECYCLE_RULES_PARAMETER_KIND,
  openOfficialReserveLifecycleRulesPendingV1,
} from "../packages/rule-atoms/official-reserve-lifecycle-rules-executor-v1.mjs";
import {
  resolveOfficialArmyInitialReservesV1,
  resolveOfficialFinalReserveDestructionV1,
  resolveOfficialPostArrivalReserveStateV1,
  resolveOfficialReserveTargetingRestrictionV1,
  resolveOfficialReturnToReservesV1,
} from "../packages/rule-atoms/official-reserve-lifecycle-rules-kernel-v1.mjs";
import { OFFICIAL_RESERVE_LIFECYCLE_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-reserve-lifecycle-rules-relationship-contract-v1.mjs";
import {
  createOfficialReserveLifecycleRulesRuleSliceV1,
  verifyOfficialReserveLifecycleRulesRuleSliceV1,
} from "../packages/rule-atoms/official-reserve-lifecycle-rules-rule-slice-v1.mjs";
import { createOfficialRoundSupplyStateV1 } from
  "../packages/rule-atoms/official-round-supply-state-v1.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import {
  createOfficialReserveLifecycleDataBundleV1,
  verifyOfficialReserveLifecycleDataBundleV1,
} from "../packages/source-data/official-reserve-lifecycle-data-bundle-v1.mjs";
import { createOfficialUnitCardSupplyDataBundleV1 } from
  "../packages/source-data/official-unit-card-supply-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-supply-pool-rules-rule-slice-v1-report.json"), "utf8"));
const routeBaseReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-elevation-effective-size-rules-rule-slice-v1-report.json"), "utf8"));
const acceptance = [];
function accept(name) { acceptance.push(name); }

const slice = createOfficialReserveLifecycleRulesRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialReserveLifecycleRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 712,
  newlyExecutableRuleAtoms: 17, reviewRequiredRuleAtoms: 200,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 712,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 65, missingStateContractExecutors: 0 });
accept("01_slice96_promotes_exact_17_route_atoms_to_712_executable");

const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 96);
assert.deepEqual(assignment.atomIds, [...OFFICIAL_RESERVE_LIFECYCLE_RULES_NEW_ATOM_IDS]);
assert.deepEqual({ executable: assignment.executableAfter,
  review: assignment.reviewRequiredAfter }, { executable: 712, review: 200 });
accept("02_route_v2_exact_slice96_atom_identity_and_counts_match");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executorManifest.length, 65);
accept("03_runtime_exposes_reserve_lifecycle_as_executor_65");
const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const unitBundle = createOfficialUnitCardSupplyDataBundleV1({ dataset: fixture.dataset });
const bundle = createOfficialReserveLifecycleDataBundleV1({ dataset: fixture.dataset,
  gameplayDataBundle: fixture.gameplayDataBundle });
assert.equal(verifyOfficialReserveLifecycleDataBundleV1(bundle), true);
accept("04_reserve_lifecycle_bundle_is_content_hash_verified");
assert.equal(bundle.ruleClauses.length, 17);
assert.deepEqual(bundle.ruleClauses.map((entry) => entry.atomId).sort(),
  [...OFFICIAL_RESERVE_LIFECYCLE_RULES_NEW_ATOM_IDS]);
accept("05_seventeen_exact_clause_boundaries_cover_seventeen_route_atoms");
assert.deepEqual(bundle.ruleSectionRecords.map((entry) => entry.recordKey), [
  "rules_sections:iuUyObNTQ2M8xK4IUqzC",
  "rules_sections:FuahgilWtc8nccVSp2Vv",
]);
accept("06_part8_and_part11_records_are_both_pinned");
assert.equal(bundle.ruleClauses.every((entry) => (
  entry.sourceTextHashes.every((hash) => /^[a-f0-9]{64}$/u.test(hash))
  && /^[a-f0-9]{64}$/u.test(entry.candidateSequenceHash)
)), true);
accept("07_each_clause_binds_source_text_and_candidate_sequence_hashes");
assert.deepEqual({ mission: bundle.mission.missionId,
  rounds: bundle.mission.gameLengthRounds,
  vpRate: bundle.mission.destroyedEnemySupplyVpPerSupply },
{ mission: "mission_hold_position", rounds: 5, vpRate: 1 });
accept("08_hold_position_final_round_and_destroyed_supply_rate_are_pinned");
assert.equal(bundle.sourcePolicy.refreshDuringDevelopment, false);
assert.equal(bundle.sourcePolicy.repositoryFallbackAllowed, false);
accept("09_source_lock_remains_offline_without_refresh_or_repository_fallback");

function positions(count, x = 5, y = 5) {
  return Array.from({ length: count }, (_, index) => ({
    xInches: x + (index % 3) * 1.5,
    yInches: y + Math.floor(index / 3) * 1.5,
  }));
}
function stateFor(options = {}) {
  const state = fixture.battleState({ round: options.round || 2,
    activeSideKey: "player1", pieces: [
      { id: "p1-marine", sideKey: "player1", positions: positions(6, 5, 5) },
      { id: "p2-marine", sideKey: "player2", positions: positions(6, 30, 20) },
    ] });
  state.rulesProcedureMode = true;
  state.officialReserveLifecycleDataBundle = bundle;
  state.officialUnitCardSupplyDataBundle = unitBundle;
  state.reserveLifecycleHistory = [];
  return state;
}
function kernel(state, extra = {}) {
  return { state, reserveLifecycleDataBundle: bundle,
    unitCardSupplyDataBundle: unitBundle,
    rulesOwnedStateRequested: true, ...extra };
}
function procedure(state, procedureKind, extra = {}) {
  return { procedureKind, sideKey: state.activeSideKey,
    rulesDenominatorComplete: true, ...extra };
}
function bindingFor(gameplayDataBundle) {
  const dataHash = hashStarcraftTmgContract(gameplayDataBundle);
  return { bindingHash: "slice-96-reserve-lifecycle-binding",
    dataSnapshotHash: dataHash,
    rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
    dependencies: { dataSnapshot: { contentHash: dataHash } } };
}
function domainFor(state, binding) {
  return runtime.enumerate(state, { sideKey: state.activeSideKey,
    includeDisabled: true, matchBinding: binding }).parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_RESERVE_LIFECYCLE_RULES_PARAMETER_KIND));
}
function applyProcedure(state, procedureKind, extra, binding) {
  const opened = openOfficialReserveLifecycleRulesPendingV1(state,
    procedure(state, procedureKind, extra));
  const domain = domainFor(opened.state, binding);
  assert(domain);
  const instantiated = runtime.instantiate(opened.state, domain,
    { choiceId: domain.constraints.choices[0].choiceId }, { matchBinding: binding });
  return { opened, domain, instantiated,
    applied: runtime.apply(opened.state, instantiated.action, { matchBinding: binding }) };
}

const setup = stateFor(); setup.round = 1; setup.phase = "setup";
const initial = resolveOfficialArmyInitialReservesV1(kernel(setup, {
  procedureKind: "army_initial_reserves", armyListUnitDenominatorComplete: true,
}));
assert.deepEqual(initial.units.map((entry) => entry.pieceId),
  ["p1-marine", "p2-marine"]);
accept("10_initial_reserves_uses_complete_army_list_unit_denominator");
assert.equal(initial.allArmyListUnitsBeginOffBattlefieldInReserves, true);
assert.equal(initial.reserveIsOffBattlefieldHoldingAreaUntilDeployment, true);
accept("11_every_army_list_unit_begins_off_battlefield_in_reserves");
assert.equal(initial.mutation.piecePatches.every((entry) => (
  entry.set.isOnField === false && entry.set.isInReserves === true
)), true);
accept("12_initial_reserves_returns_rules_owned_piece_and_model_patches");
assert.throws(() => resolveOfficialArmyInitialReservesV1(kernel(setup, {
  procedureKind: "army_initial_reserves", armyListUnitDenominatorComplete: false,
})), /INITIAL_RESERVES_WINDOW_INVALID/u);
accept("13_incomplete_initial_army_denominator_fails_closed");

const state = stateFor();
state.board.tokens.push(
  { id: "left-token", leftOnBattlefieldByPieceId: "p1-marine", stayInPlay: false },
  { id: "stay-token", leftOnBattlefieldByPieceId: "p1-marine", stayInPlay: true },
);
state.board.effectMarkers.push(
  { id: "left-marker", leftOnBattlefieldByPieceId: "p1-marine", stayInPlay: false },
  { id: "timed-marker", affectedPieceId: "p1-marine", expiresAt: "end_of_round" },
);
state.pieces[0].selectedUpgradeNames = ["Stimpack"];
state.pieces[0].damageMarker = 2;
state.pieces[0].statuses = ["buff_speed_1"];
state.pieces[0].combatEffects = [{ id: "round-effect", expiresAt: "end_of_round" }];
state.pieces[0].activatedPhases.movement = true;
const returnInput = kernel(state, { procedureKind: "return_to_reserves",
  pieceId: "p1-marine", triggerReceiptHash: "b".repeat(64),
  triggerAuthority: "rule_effect_resolution" });
const returned = resolveOfficialReturnToReservesV1(returnInput);
assert.equal(returned.returnedUnitIsNotDestroyed, true);
assert.equal(returned.currentSupplyReleasedImmediately, 1);
accept("14_returned_unit_is_not_destroyed_and_releases_current_supply_one");
assert.deepEqual(returned.retainedState.loadout.selectedUpgradeNames, ["Stimpack"]);
assert.equal(returned.equipmentAndArmyBuildingSelectionsRetained, true);
accept("15_return_retains_equipment_upgrades_and_army_building_choices");
assert.equal(returned.retainedState.damage.damageMarker, 2);
assert.equal(returned.currentDamageRetained, true);
accept("16_return_retains_current_damage_and_model_damage_ledger");
assert.deepEqual(returned.retainedState.timedEffects.statuses, ["buff_speed_1"]);
assert.equal(returned.timedEffectsContinueAndExpireNormally, true);
accept("17_return_keeps_timed_effects_running_on_their_normal_clock");
assert.equal(returned.retainedState.activatedPhases.movement, true);
assert.equal(returned.activationStateRetainedForCurrentPhase, true);
accept("18_return_retains_current_phase_activation_state");
assert.deepEqual(returned.reserveAbilityState, { active: "inactive",
  passive: "inactive", reaction: "inactive", mayTrigger: false,
  mayAffect: false, mayPayCosts: false, mayRespond: false });
accept("19_active_passive_and_reaction_abilities_are_inactive_in_reserves");
assert.deepEqual(returned.removeBoardTokenIds, ["left-token"]);
assert.deepEqual(returned.removeEffectMarkerIds, ["left-marker"]);
accept("20_non_stay_in_play_artifacts_left_on_battlefield_are_removed");
assert.deepEqual(returned.stayInPlayArtifactIds, ["stay-token"]);
assert.equal(returned.retainedState.timedEffects.affectedMarkers[0].id, "timed-marker");
accept("21_stay_in_play_and_unit_affected_timed_markers_are_preserved");
assert.throws(() => resolveOfficialReturnToReservesV1({ ...returnInput,
  triggerReceiptHash: "client-choice" }), /RETURN_TO_RESERVES_TRIGGER_INVALID/u);
accept("22_return_requires_hash_bound_rule_effect_trigger_authority");
assert.throws(() => resolveOfficialReturnToReservesV1({ ...returnInput,
  clientSuppliedMutation: {} }), /RESERVE_LIFECYCLE_STATE_INVALID/u);
accept("23_client_supplied_reserve_mutation_is_rejected");
const staleSupply = structuredClone(state); staleSupply.pieces[0].currentSupply = 9;
assert.throws(() => resolveOfficialReturnToReservesV1(kernel(staleSupply, {
  procedureKind: "return_to_reserves", pieceId: "p1-marine",
  triggerReceiptHash: "b".repeat(64), triggerAuthority: "rule_effect_resolution",
})), /RESERVE_LIFECYCLE_CURRENT_SUPPLY_STALE/u);
accept("24_stale_client_current_supply_fails_against_official_unit_profile");

const binding = bindingFor(fixture.gameplayDataBundle);
const returnFlow = applyProcedure(state, "return_to_reserves", {
  pieceId: "p1-marine", triggerReceiptHash: "b".repeat(64),
  triggerAuthority: "rule_effect_resolution",
}, binding);
const reservePiece = returnFlow.applied.state.pieces[0];
assert.equal(reservePiece.isOnField, false);
assert.equal(reservePiece.isInReserves, true);
assert.equal(reservePiece.isDestroyed, false);
accept("25_executor_apply_moves_unit_and_models_off_battlefield_into_reserves");
assert.equal("xInches" in reservePiece, false);
assert.equal(reservePiece.models.every((model) => (
  model.isOnField === false && !("xInches" in model) && !("yInches" in model)
)), true);
accept("26_return_apply_removes_battlefield_coordinates_from_live_models");
assert.deepEqual(returnFlow.applied.state.board.tokens.map((entry) => entry.id),
  ["stay-token"]);
assert.deepEqual(returnFlow.applied.state.board.effectMarkers.map((entry) => entry.id),
  ["timed-marker"]);
accept("27_apply_removes_only_rules_selected_left_artifacts");
assert.deepEqual(returnFlow.applied.state.pieces[0].selectedUpgradeNames, ["Stimpack"]);
assert.equal(returnFlow.applied.state.pieces[0].damageMarker, 2);
assert.equal(returnFlow.applied.state.pieces[0].activatedPhases.movement, true);
accept("28_apply_does_not_mutate_retained_loadout_damage_or_activation");
assert.equal(returnFlow.applied.state.officialRoundSupplyState.onTableSupplyBySide.player1, 0);
assert.equal(returnFlow.applied.state.officialRoundSupplyState.reserveSupplyBySide.player1, 1);
accept("29_return_apply_recalculates_round_supply_and_immediate_release");
assert.notEqual(returnFlow.applied.state.officialRoundSupplyState.roundSupplyStateHash,
  state.officialRoundSupplyState.roundSupplyStateHash);
accept("30_round_supply_hash_changes_with_return_transition");

const target = resolveOfficialReserveTargetingRestrictionV1(kernel(
  returnFlow.applied.state, { procedureKind: "reserve_targeting_restriction",
    pieceId: "p1-marine", explicitReserveAffectingException: false }));
assert.equal(target.canBeTargetedByAttackOrAbility, false);
assert.equal(target.explicitExceptionRequired, true);
accept("31_reserve_unit_cannot_be_targeted_without_explicit_exception");
assert.throws(() => resolveOfficialReserveTargetingRestrictionV1(kernel(
  returnFlow.applied.state, { procedureKind: "reserve_targeting_restriction",
    pieceId: "p1-marine", explicitReserveAffectingException: true,
    exceptionAtomId: "unregistered" })), /RESERVE_TARGETING_QUERY_INVALID/u);
accept("32_unregistered_reserve_affecting_exception_fails_closed");
const targetFlow = applyProcedure(returnFlow.applied.state,
  "reserve_targeting_restriction", { pieceId: "p1-marine",
    explicitReserveAffectingException: false }, binding);
assert.equal(targetFlow.applied.state.pieces[0].isInReserves, true);
assert.deepEqual(targetFlow.applied.events[0].affectedPieceIds, []);
accept("33_targeting_query_is_executable_but_non_mutating");

const arrivedState = structuredClone(returnFlow.applied.state);
const arrivedPiece = arrivedState.pieces[0];
arrivedPiece.isOnField = true;
arrivedPiece.models.forEach((model, index) => {
  model.isOnField = true; model.xInches = 5 + index; model.yInches = 5;
});
arrivedState.log.push({ events: [{ type: "reserve_deployed",
  pieceId: "p1-marine", deployPlanHash: "c".repeat(64) }] });
const arrival = resolveOfficialPostArrivalReserveStateV1(kernel(arrivedState, {
  procedureKind: "post_arrival_state", pieceId: "p1-marine",
}));
assert.equal(arrival.abilitiesResumeImmediately, true);
assert.equal(arrival.arrivalGeometryOwnedByFrozenReserveDeployV5, true);
accept("34_post_arrival_reuses_frozen_reserve_deploy_v5_witness_and_resumes_abilities");
assert.equal(arrival.zoneOfInfluenceAffectsAlreadyArrivedUnit, false);
assert.equal(arrival.zoneOfInfluenceRestrictsPostArrivalMovementLineOfSightOrRules, false);
accept("35_zone_of_influence_has_no_effect_after_completed_arrival");
assert.throws(() => resolveOfficialPostArrivalReserveStateV1(kernel({
  ...arrivedState, log: [] }, { procedureKind: "post_arrival_state",
  pieceId: "p1-marine" })), /POST_ARRIVAL_RESERVE_DEPLOY_WITNESS_REQUIRED/u);
accept("36_post_arrival_requires_real_reserve_deploy_receipt_witness");
const arrivalFlow = applyProcedure(arrivedState, "post_arrival_state",
  { pieceId: "p1-marine" }, binding);
assert.equal(arrivalFlow.applied.state.pieces[0].isInReserves, false);
assert.equal(arrivalFlow.applied.state.pieces[0].isOnField, true);
accept("37_post_arrival_apply_clears_reserve_membership_without_replacing_geometry");

const finalState = structuredClone(returnFlow.applied.state);
finalState.round = 5; finalState.phase = "cleanup";
finalState.officialRoundSupplyState = createOfficialRoundSupplyStateV1({
  state: finalState, gameplayDataBundle: fixture.gameplayDataBundle,
  rulesRuntimeHash: runtime.descriptor.runtimeHash,
});
const final = resolveOfficialFinalReserveDestructionV1(kernel(finalState, {
  procedureKind: "final_scoring_reserve_destruction",
  finalScoringPhaseStart: true, gameEndingByRoundLimit: true,
  specialVictoryAlreadyEnded: false,
}));
assert.deepEqual(final.entries.map((entry) => entry.pieceId), ["p1-marine"]);
assert.equal(final.entryDenominatorComplete, true);
accept("38_final_scoring_start_enumerates_every_live_reserve_unit");
assert.deepEqual(final.destroyedEnemySupplyVpBySide, { player1: 0, player2: 1 });
accept("39_final_reserve_destroyed_supply_creates_exact_enemy_vp_candidate");
assert.equal(final.scoringCommitDeferredToSlice110, true);
accept("40_final_destruction_ledger_does_not_silently_replace_frozen_scoring_executor");
assert.throws(() => resolveOfficialFinalReserveDestructionV1(kernel({
  ...finalState, round: 4 }, { procedureKind: "final_scoring_reserve_destruction",
  finalScoringPhaseStart: true, gameEndingByRoundLimit: true,
  specialVictoryAlreadyEnded: false })), /FINAL_RESERVE_DESTRUCTION_WINDOW_INVALID/u);
accept("41_non_final_round_cannot_trigger_final_reserve_destruction");
assert.throws(() => resolveOfficialFinalReserveDestructionV1(kernel(finalState, {
  procedureKind: "final_scoring_reserve_destruction",
  finalScoringPhaseStart: true, gameEndingByRoundLimit: false,
  specialVictoryAlreadyEnded: false })), /FINAL_RESERVE_DESTRUCTION_WINDOW_INVALID/u);
accept("42_special_or_non_round_limit_end_cannot_use_final_reserve_branch");
const finalFlow = applyProcedure(finalState, "final_scoring_reserve_destruction", {
  finalScoringPhaseStart: true, gameEndingByRoundLimit: true,
  specialVictoryAlreadyEnded: false,
}, binding);
assert.equal(finalFlow.applied.state.pieces[0].isDestroyed, true);
assert.equal(finalFlow.applied.state.pieces[0].currentModels, 0);
assert.equal(finalFlow.applied.state.pieces[0].currentSupply, 0);
accept("43_final_apply_marks_reserve_unit_and_models_destroyed");
assert.equal(finalFlow.applied.state.finalReserveDestructionLedger.entries[0]
  .currentSupplyBeforeDestruction, 1);
assert.match(finalFlow.applied.state.finalReserveDestructionLedger.ledgerHash,
  /^[a-f0-9]{64}$/u);
accept("44_final_apply_persists_pre_destruction_supply_in_hash_bound_ledger");

const driftOpened = returnFlow.opened.state;
const drifted = structuredClone(driftOpened); drifted.pieces[0].damageMarker = 3;
assert.equal(runtime.enumerate(drifted, { sideKey: "player1", includeDisabled: true,
  matchBinding: binding }).candidates[0].disabledReason,
"RESERVE_LIFECYCLE_PENDING_INVALID");
accept("45_piece_or_retained_state_drift_invalidates_pending_transition");
const sourceDrift = structuredClone(driftOpened);
sourceDrift.officialDevelopmentTrancheSourceLockAudit.lockHash = "0".repeat(64);
assert.equal(runtime.enumerate(sourceDrift, { sideKey: "player1", includeDisabled: true,
  matchBinding: binding }).candidates[0].disabledReason,
"RESERVE_LIFECYCLE_SOURCE_LOCK_BINDING_INVALID");
accept("46_source_lock_drift_disables_reserve_lifecycle_legalspace");

const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
assert.deepEqual({ nodes: graph.nodes.length, edges: graph.edges.length },
  { nodes: 10635, edges: 30528 });
accept("47_relationship_graph_is_valid_with_reserve_consumers_and_future_scoring_edges");
const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_RESERVE_LIFECYCLE_RULES_RELATIONSHIP_SCOPE_ID));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "derived_value:reserveLifecycleRulesV1.finalReserveDestruction"
    && entry.to === "state_field:finalReserveDestructionLedger"));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash")));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
accept("48_relationship_graph_blocks_missing_final_destruction_ledger_write");

function engineFor(keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-09-01T16:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-96-reserve-lifecycle",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 96 Reserve lifecycle rules.";
function envelopeFor(engine, stateInput) {
  return engine.createEnvelope({ roomId: "official-slice-96-reserve-lifecycle-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-reserve-lifecycle-geometry-v1",
        content: { kind: "geometry-artifact",
          geometryVersion: "reserve_lifecycle_frozen_deploy_v5_v1" } },
      rulesDisplay: { artifactId: "official-slice-96-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "official-slice-96-action-schema-v34",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v34" } },
    }, state: stateInput });
}
function registerReplay(engine, initial) {
  const entries = {
    sourceSnapshot: fixture.snapshot, dataSnapshot: fixture.gameplayDataBundle,
    rulesArtifact: { kind: "rules-artifact", rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: initial.matchBinding.rulesRuntimeBinding },
    executorArtifact: { kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: initial.matchBinding.rulesRuntimeBinding.runtimeHash,
      catalogueHash: initial.matchBinding.rulesRuntimeBinding.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest },
    geometryArtifact: { kind: "geometry-artifact",
      geometryVersion: "reserve_lifecycle_frozen_deploy_v5_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v34" },
  };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}
const keys = generateKeyPairSync("ed25519");
const authority = engineFor(keys, "slice-96-reserve-lifecycle-short-seal-v1");
const seed = envelopeFor(authority, state);
const authorityOpened = openOfficialReserveLifecycleRulesPendingV1(seed.state,
  procedure(seed.state, "return_to_reserves", { pieceId: "p1-marine",
    triggerReceiptHash: "d".repeat(64), triggerAuthority: "rule_effect_resolution" }));
const initialEnvelope = authority.createEnvelope({ roomId: seed.roomId,
  matchBinding: seed.matchBinding, state: authorityOpened.state });
registerReplay(authority, initialEnvelope);
const seat = authority.issueSeatAuthority({ grantId: "slice-96-reserve-lifecycle-grant",
  roomId: initialEnvelope.roomId, matchBindingHash: initialEnvelope.matchBindingHash,
  seatKey: "player1", roleMode: "player", principalType: "human",
  capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
const lease = authority.issueControlLease({ seatAuthority: seat,
  sessionId: "slice-96-reserve-lifecycle-session", leaseFence: 1,
  issuedAtRoomRevision: initialEnvelope.stateRevision });
const space = authority.legalSpace(initialEnvelope, { seatAuthority: seat });
const authorityDomain = space.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_RESERVE_LIFECYCLE_RULES_PARAMETER_KIND));
const preview = authority.preview({ envelope: initialEnvelope, seatAuthority: seat,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: { choiceId: authorityDomain.constraints.choices[0].choiceId } } });
const confirmation = authority.confirmPreview({ envelope: initialEnvelope,
  preview: preview.preview, seatAuthority: seat });
const authoritativeApplied = authority.apply({ envelope: initialEnvelope,
  expectedStateRevision: initialEnvelope.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: seat, controlLease: lease,
  idempotencyKey: "slice-96-reserve-lifecycle" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
accept("49_authority_preview_confirm_apply_uses_ed25519_and_short_hmac_seal");
const replay = engineFor(keys, "slice-96-reserve-lifecycle-rotated-seal-v2");
registerReplay(replay, initialEnvelope);
assert.equal(replay.replay({ initialEnvelope,
  journal: [authoritativeApplied.receipt] }).ok, true);
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_reserve_event" });
assert.equal(replay.replay({ initialEnvelope, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
accept("50_replay_survives_hmac_rotation_and_rejects_tampered_reserve_receipt");

assert.equal(acceptance.length, 50);
const report = {
  schema: "starcraft_tmg_official_reserve_lifecycle_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit,
  reserveLifecycleDataBundle: bundle,
  unitCardSupplyDataBundleHash: unitBundle.bundleHash,
  remainingRouteV2Hash: route.routeHash, slice, sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash, catalogueHash: slice.catalogueHash,
  graph, graphAudit: audit.graphAudit, coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true,
    historicalRulesDisplayRetained: true },
  boundaries: { reserveDeployV5OwnsArrivalGeometry: true,
    finalScoringCommitDeferredToSlice110: true,
    explicitReserveAffectingExceptionRegistryDeferred: true },
  ctx2skill: slice.ctx2skill, harness: slice.harness,
  rulesEligible: false, productionRoomEligible: false,
  rulesTruth: "official_reserve_lifecycle_state_transition_conformance",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-reserve-lifecycle-rules-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash, catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash, graphHash: graph.graphHash,
  graphCounts: { nodes: graph.nodes.length, edges: graph.edges.length },
  counts: audit.counts, dataBundleHash: bundle.bundleHash,
  sourceLockHash: fixture.sourceLockAudit.lockHash,
  sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  trainingTruth: false }, null, 2));
