#!/usr/bin/env node

import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ID,
  OFFICIAL_SCORING_FINALIZATION_RULES_NEW_ATOM_IDS,
} from "../packages/rule-atoms/official-scoring-finalization-rules-executor-v1.mjs";
import {
  createOfficialInitialFirstPlayerAssignmentChoicesV1,
  resolveOfficialArmyEliminationV1,
  resolveOfficialInitialFirstPlayerRollOffV1,
  resolveOfficialRoundLimitFinalScoreV1,
} from "../packages/rule-atoms/official-scoring-finalization-rules-kernel-v1.mjs";
import { OFFICIAL_SCORING_FINALIZATION_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-scoring-finalization-rules-relationship-contract-v1.mjs";
import {
  createOfficialScoringFinalizationRulesRuleSliceV1,
  verifyOfficialScoringFinalizationRulesRuleSliceV1,
} from "../packages/rule-atoms/official-scoring-finalization-rules-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialRemainingRuleAtomRouteV2 } from
  "../packages/rule-atoms/official-remaining-rule-atom-route-v2.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { createOfficialBattlefieldTokenMarkerRulesDataBundleV1 } from
  "../packages/source-data/official-battlefield-token-marker-rules-data-bundle-v1.mjs";
import { createOfficialDeploymentGeometryDataBundleV1 } from
  "../packages/source-data/official-deployment-geometry-data-bundle-v1.mjs";
import { createOfficialMissionDeploymentDraftDataBundleV1 } from
  "../packages/source-data/official-mission-deployment-draft-data-bundle-v1.mjs";
import { createOfficialReserveLifecycleDataBundleV1 } from
  "../packages/source-data/official-reserve-lifecycle-data-bundle-v1.mjs";
import {
  createOfficialScoringFinalizationRulesDataBundleV1,
  verifyOfficialScoringFinalizationRulesDataBundleV1,
} from "../packages/source-data/official-scoring-finalization-rules-data-bundle-v1.mjs";
import { createOfficialUnitCardSupplyDataBundleV1 } from
  "../packages/source-data/official-unit-card-supply-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-battlefield-token-marker-rules-rule-slice-v1-report.json"), "utf8"));
const routeBaseReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-elevation-effective-size-rules-rule-slice-v1-report.json"), "utf8"));
const acceptance = [];
function accept(name) { acceptance.push(`${acceptance.length + 1}_${name}`); }
function rejects(code, operation) {
  assert.throws(operation, (error) => String(error?.message || error).startsWith(code));
}

const slice = createOfficialScoringFinalizationRulesRuleSliceV1({
  previousSlice: previousReport.slice });
const audit = verifyOfficialScoringFinalizationRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice });
assert.deepEqual(audit.counts, { executableRuleAtoms: 908,
  newlyExecutableRuleAtoms: 14, reviewRequiredRuleAtoms: 4,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 908,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 79, missingStateContractExecutors: 0 });
accept("slice110_promotes_14_atoms_to_908_executable");
const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 110);
assert.deepEqual(assignment.atomIds, [...OFFICIAL_SCORING_FINALIZATION_RULES_NEW_ATOM_IDS]);
accept("route_v2_exact_slice110_atom_identity");
assert.deepEqual([assignment.executableAfter, assignment.reviewRequiredAfter], [908, 4]);
accept("route_v2_leaves_exactly_four_actionable_atoms");
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executorManifest.length, 79);
assert(runtime.descriptor.executorManifest.some((entry) => (
  entry.executorId === OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ID)));
accept("runtime_exposes_scoring_finalization_as_executor79");
assert.deepEqual({ slice: slice.sliceHash, catalogue: slice.catalogueHash,
  runtime: runtime.descriptor.runtimeHash, graph: audit.graph.graphHash }, {
  slice: "283c21b9aa3f7d9220c89cf62f63a73baec4eaa0d8b9890adcc05f965e6be39a",
  catalogue: "7488a01ac487b4544fc7c09080dcf8242b50bf701577154cd5b806a5d52d0777",
  runtime: "d0aebfd5de012a3eb7821a3cb5c698304551c641d38b6ce9ef8a0cbc4481c413",
  graph: "07ccc04786a2e0845a8e3147c715cfb44563efb3ab1acdf13e433dadbfaa5753" });
accept("slice_catalogue_runtime_graph_hashes_are_frozen");

const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const draftBundle = createOfficialMissionDeploymentDraftDataBundleV1({
  dataset: fixture.dataset });
const geometryBundle = createOfficialDeploymentGeometryDataBundleV1({
  dataset: fixture.dataset, missionDeploymentDraftDataBundle: draftBundle });
const tokenBundle = createOfficialBattlefieldTokenMarkerRulesDataBundleV1({
  dataset: fixture.dataset, deploymentGeometryDataBundle: geometryBundle });
const reserveBundle = createOfficialReserveLifecycleDataBundleV1({
  dataset: fixture.dataset, gameplayDataBundle: fixture.gameplayDataBundle });
const unitSupplyBundle = createOfficialUnitCardSupplyDataBundleV1({
  dataset: fixture.dataset });
const dataBundle = createOfficialScoringFinalizationRulesDataBundleV1({
  dataset: fixture.dataset, gameplayDataBundle: fixture.gameplayDataBundle,
  reserveLifecycleDataBundle: reserveBundle,
  battlefieldTokenMarkerRulesDataBundle: tokenBundle });
assert.equal(verifyOfficialScoringFinalizationRulesDataBundleV1(dataBundle), true);
accept("data_bundle_is_content_hash_verified");
assert.equal(dataBundle.ruleClauses.length, 14);
assert.deepEqual(dataBundle.ruleClauses.map((entry) => entry.atomId).sort(),
  [...OFFICIAL_SCORING_FINALIZATION_RULES_NEW_ATOM_IDS]);
accept("fourteen_source_clause_groups_bind_fourteen_route_atoms");
assert.equal(dataBundle.sourcePolicy.refreshDuringDevelopment, false);
assert.equal(dataBundle.sourcePolicy.repositoryFallbackAllowed, false);
accept("frozen_source_performs_no_refresh_or_repository_fallback");
assert.deepEqual(dataBundle.firstPlayerContract,
  { dicePerPlayer: 2, dieFaces: 6,
    tiePolicy: "repeat_new_roll_off_attempt_until_winner",
    winnerMayAssignMarkerToEitherParticipant: true,
    markerStateAuthority: "state.firstPlayerSideKey" });
accept("initial_first_player_source_contract_is_exact");
assert.deepEqual({ range: dataBundle.markerControlContract.rangeInches,
  supply: dataBundle.markerControlContract.sumCurrentSupply,
  higher: dataBundle.markerControlContract.higherTotalControls,
  tie: dataBundle.markerControlContract.tiedTotalContestedNoTransfer },
{ range: 3, supply: true, higher: true, tie: true });
accept("marker_control_contract_binds_supply_higher_and_tie_rules");
assert.equal(dataBundle.markerControlContract.authorityExecutor,
  "authority.mission-marker-control-v3");
accept("slice_consumes_frozen_atomic_control_executor");
assert.deepEqual({ elimination:
    dataBundle.terminalContract.armyEliminationRequiresNoFieldModelsAndNoReserveUnits,
  award: dataBundle.terminalContract.survivingPlayerVpAward,
  rounds: dataBundle.terminalContract.roundLimit },
{ elimination: true, award: 10, rounds: 5 });
accept("elimination_survivor_award_and_round_limit_are_pinned");
assert.deepEqual({ highest: dataBundle.terminalContract.highestVpWins,
  tiebreaker: dataBundle.terminalContract.missionTiebreaker,
  fallback: dataBundle.terminalContract.noTiebreakerFallback },
{ highest: true, tiebreaker: null, fallback: "draw" });
accept("highest_vp_and_current_mission_draw_fallback_are_pinned");
assert.deepEqual(dataBundle.projectionContract,
  { rulesUnit: "inch", modelBaseSizeAuthority: "official_mm",
    mapZoomAffectsRulesGeometry: false, panAffectsRulesGeometry: false,
    devicePixelRatioAffectsRulesGeometry: false,
    touchTargetAffectsRulesGeometry: false, uniformAxesRequired: true });
accept("map_model_and_frontend_scale_contract_is_explicit");

const tieReveals = [3, 4, 5, 2].map((outcome, counter) => (
  { counter, faces: 6, outcome }));
const tieRoll = resolveOfficialInitialFirstPlayerRollOffV1({
  scoringFinalizationRulesDataBundle: dataBundle,
  participantIds: ["player1", "player2"], attempt: 1,
  chanceReveals: tieReveals });
assert.equal(tieRoll.outcome, "tie");
assert.equal(tieRoll.nextProcedure, "initial_first_player_roll_off");
accept("tied_2d6_totals_require_a_fresh_attempt");
const winReveals = [6, 5, 1, 2].map((outcome, counter) => (
  { counter, faces: 6, outcome }));
const winRoll = resolveOfficialInitialFirstPlayerRollOffV1({
  scoringFinalizationRulesDataBundle: dataBundle,
  participantIds: ["player1", "player2"], attempt: 2,
  chanceReveals: winReveals });
assert.equal(winRoll.winnerSideKey, "player1");
assert.deepEqual(winRoll.totalsBySide, { player1: 11, player2: 3 });
accept("authority_2d6_rolloff_resolves_exact_winner");
rejects("INITIAL_FIRST_PLAYER_ROLL_OFF_REVEALS_REQUIRED", () => (
  resolveOfficialInitialFirstPlayerRollOffV1({
    scoringFinalizationRulesDataBundle: dataBundle,
    participantIds: ["player1", "player2"], attempt: 1, chanceReveals: [] })));
accept("missing_rolloff_reveals_fail_closed");
const choices = createOfficialInitialFirstPlayerAssignmentChoicesV1({
  scoringFinalizationRulesDataBundle: dataBundle,
  participantIds: ["player1", "player2"], rollOffWinnerSideKey: "player1" });
assert.deepEqual(choices.map((entry) => entry.assignedFirstPlayerSideKey),
  ["player1", "player2"]);
accept("rolloff_winner_can_assign_marker_to_either_participant");

function matchBinding() {
  const dataHash = hashStarcraftTmgContract(fixture.gameplayDataBundle);
  return { bindingHash: "slice110-match-binding",
    dataSnapshotHash: dataHash,
    rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
    dependencies: { dataSnapshot: { contentHash: dataHash } } };
}
function attach(state) {
  state.rulesProcedureMode = true;
  state.officialReserveLifecycleDataBundle = reserveBundle;
  state.officialUnitCardSupplyDataBundle = unitSupplyBundle;
  state.officialBattlefieldTokenMarkerRulesDataBundle = tokenBundle;
  state.officialScoringFinalizationRulesDataBundle = dataBundle;
  return state;
}
const setup = attach(fixture.battleState({ round: 2, activeSideKey: "player1" }));
setup.round = 1; setup.phase = "pre_game";
setup.officialBattlefieldSetup = {
  stage: "battlefield_token_marker_registry_complete_ticket_11_slice_110_pending" };
setup.officialBattlefieldTokenMarkerRegistry = {
  schema: "starcraft_tmg_official_battlefield_token_marker_registry_v1",
  registryHash: "a".repeat(64), zoneOfInfluenceMarkers: [] };
setup.officialMissionMarkerPlacement = { missionMarkers:
  setup.board.missionMarkers.map((entry, index) => ({ ...entry, number: index + 1,
    controlSideKey: null })) };
const setupSpace = runtime.enumerate(setup, { sideKey: "player1",
  matchBinding: matchBinding() });
const rollCandidate = setupSpace.candidates.find((entry) => (
  entry.executorId === OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ID));
assert(rollCandidate);
assert.equal(rollCandidate.chance.count, 4);
accept("runtime_enumerates_initial_rolloff_with_four_hidden_dice");
const rollAction = Object.fromEntries(Object.entries(rollCandidate).filter(([key]) => (
  !["isEnabled", "disabledReason", "score", "details"].includes(key))));
const rolled = runtime.apply(setup, rollAction, { matchBinding: matchBinding(),
  chanceReveals: winReveals });
assert.equal(rolled.state.officialBattlefieldSetup.stage,
  "initial_first_player_roll_off_complete_assignment_pending");
assert.equal(rolled.state.activeSideKey, "player1");
accept("runtime_apply_advances_winner_owned_assignment_stage");
const assignmentSpace = runtime.enumerate(rolled.state, { sideKey: "player1",
  matchBinding: matchBinding() });
const assignmentRows = assignmentSpace.candidates.filter((entry) => (
  entry.executorId === OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ID));
assert.equal(assignmentRows.length, 2);
accept("runtime_exposes_complete_two_choice_assignment_domain");
const assignPlayer2 = assignmentRows.find((entry) => (
  entry.details.assignedFirstPlayerSideKey === "player2"));
const assignedAction = Object.fromEntries(Object.entries(assignPlayer2).filter(([key]) => (
  !["isEnabled", "disabledReason", "score", "details"].includes(key))));
const assigned = runtime.apply(rolled.state, assignedAction,
  { matchBinding: matchBinding() });
assert.equal(assigned.state.firstPlayerSideKey, "player2");
assert.equal(assigned.state.officialBattlefieldMarkerViewsAtSetup
  .firstPlayerMarker.sideKey, "player2");
accept("assignment_updates_state_and_rederives_marker_view");
assert.equal(assigned.state.officialBattlefieldSetup.stage,
  "scoring_finalization_rules_complete_ticket_11_slice_111_pending");
accept("pregame_stage_advances_to_slice111_pending");
rejects("SCORING_FINALIZATION_ACTION_STALE", () => runtime.apply(rolled.state,
  { ...assignedAction, scoringFinalizationPlan: {
    ...assignedAction.scoringFinalizationPlan, planHash: "0".repeat(64) } },
  { matchBinding: matchBinding() }));
accept("forged_assignment_plan_fails_closed");

function marker(number, controlSideKey, controlHash) {
  return { id: `mission-marker-${number}`, number,
    controlSideKey, factionIndicatorSideKey: controlSideKey,
    controlDeterminedAt: { round: 5,
      step: "determine_mission_marker_control",
      controlResolutionHash: controlHash } };
}
function finalState() {
  const state = attach(fixture.battleState({ round: 5, activeSideKey: "player1",
    pieces: [{ id: "p1-marine", sideKey: "player1",
      positions: Array.from({ length: 6 }, (_, i) => ({ xInches: 5 + i, yInches: 5 })) },
    { id: "p2-reserve", sideKey: "player2",
      positions: Array.from({ length: 6 }, (_, i) => ({ xInches: 25 + i, yInches: 25 })) }] }));
  const reserve = state.pieces.find((entry) => entry.id === "p2-reserve");
  reserve.isOnField = false; reserve.isInReserves = true;
  reserve.models.forEach((model) => { model.isOnField = false; });
  state.phase = "cleanup"; state.firstPlayerSideKey = "player1";
  state.activeSideKey = "player1"; state.scores = { player1: 2, player2: 2 };
  const controlHash = "b".repeat(64);
  state.board.missionMarkers = [marker(1, "player1", controlHash),
    marker(2, "player2", controlHash), marker(3, "player1", controlHash),
    marker(4, "player2", controlHash), marker(5, "player1", controlHash)];
  state.scoringCleanupProgress = { schemaVersion:
      "starcraft_tmg_scoring_cleanup_progress_v1", round: 5,
    completedSteps: ["determine_mission_marker_control"],
    currentStep: "score_victory_points", controlResolutionHash: controlHash,
    trainingTruth: false };
  state.supplyLossLedger = { scoreableLossCreditedToSide:
      { player1: 1, player2: 0 } };
  return state;
}
const final = finalState();
const finalResolution = resolveOfficialRoundLimitFinalScoreV1({
  scoringFinalizationRulesDataBundle: dataBundle, state: final,
  finalReserveVpBySide: { player1: 1, player2: 0 } });
assert.deepEqual(finalResolution.breakdowns.player1,
  { destroyedEnemySupplyVp: 1, finalReserveVp: 1, markerVp: 3,
    controlledMarkerVp: finalResolution.breakdowns.player1.controlledMarkerVp,
    roundVp: 5 });
accept("final_score_sums_supply_reserve_and_controlled_marker_vp");
assert.deepEqual(finalResolution.resultingScores, { player1: 7, player2: 4 });
assert.equal(finalResolution.winnerSideKey, "player1");
accept("highest_final_mission_score_wins");
const finalSpace = runtime.enumerate(final, { sideKey: "player1",
  matchBinding: matchBinding() });
const finalCandidate = finalSpace.candidates.find((entry) => (
  entry.executorId === OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ID));
assert(finalCandidate);
assert.equal(finalCandidate.details.reserveResolution.entries.length, 1);
accept("runtime_final_window_consumes_exact_reserve_destruction_result");
const finalAction = Object.fromEntries(Object.entries(finalCandidate).filter(([key]) => (
  !["isEnabled", "disabledReason", "score", "details"].includes(key))));
const finalized = runtime.apply(final, finalAction, { matchBinding: matchBinding() });
assert.equal(finalized.state.pieces.find((entry) => entry.id === "p2-reserve").isDestroyed,
  true);
assert.equal(finalized.state.finalReserveDestructionLedger
  .consumedByFinalScoringSlice110, true);
accept("final_reserve_is_destroyed_and_ledger_consumed_atomically");
assert.deepEqual(finalized.state.scores, { player1: 7, player2: 4 });
assert.equal(finalized.state.gameOver, true);
assert.equal(finalized.state.winner, "player1");
accept("round_limit_apply_commits_terminal_winner_and_scores");

const drawn = finalState();
drawn.pieces.find((entry) => entry.id === "p2-reserve").isOnField = true;
drawn.pieces.find((entry) => entry.id === "p2-reserve").isInReserves = false;
drawn.scores = { player1: 0, player2: 0 };
drawn.supplyLossLedger.scoreableLossCreditedToSide = { player1: 0, player2: 0 };
drawn.board.missionMarkers[4].controlSideKey = null;
drawn.board.missionMarkers[4].factionIndicatorSideKey = null;
const drawResult = resolveOfficialRoundLimitFinalScoreV1({
  scoringFinalizationRulesDataBundle: dataBundle, state: drawn,
  finalReserveVpBySide: { player1: 0, player2: 0 } });
assert.equal(drawResult.outcome, "draw");
assert.equal(drawResult.winnerSideKey, null);
accept("no_mission_tiebreaker_falls_back_to_draw");
const zoomed = structuredClone(drawn);
zoomed.frontendViewport = { zoom: 4, devicePixelRatio: 3,
  cssPixelsPerInch: 91, tokenTouchTargetCss: 96 };
const zoomedResult = resolveOfficialRoundLimitFinalScoreV1({
  scoringFinalizationRulesDataBundle: dataBundle, state: zoomed,
  finalReserveVpBySide: { player1: 0, player2: 0 } });
assert.equal(zoomedResult.finalScoreResolutionHash, drawResult.finalScoreResolutionHash);
accept("frontend_zoom_dpr_and_touch_target_do_not_change_rules_result");

const eliminated = finalState();
eliminated.round = 3;
for (const piece of eliminated.pieces.filter((entry) => entry.sideKey === "player2")) {
  piece.isDestroyed = true; piece.isOnField = false; piece.isInReserves = false;
  piece.currentModels = 0; piece.currentSupply = 0;
  piece.models.forEach((model) => { model.isDestroyed = true; model.isOnField = false; });
}
const elimination = resolveOfficialArmyEliminationV1({
  scoringFinalizationRulesDataBundle: dataBundle, state: eliminated });
assert.deepEqual(elimination.eliminatedSideKeys, ["player2"]);
assert.equal(elimination.survivingSideKey, "player1");
accept("army_elimination_requires_no_field_models_and_no_reserves");
assert.equal(elimination.survivorVpAward, 10);
assert.equal(elimination.resultingScores.player1, eliminated.scores.player1 + 10);
accept("surviving_player_receives_exactly_ten_vp");
const bothEliminated = structuredClone(eliminated);
for (const piece of bothEliminated.pieces.filter((entry) => entry.sideKey === "player1")) {
  piece.isDestroyed = true; piece.isOnField = false; piece.isInReserves = false;
  piece.currentModels = 0; piece.currentSupply = 0;
}
rejects("ARMY_ELIMINATION_SIMULTANEOUS_OUTCOME_UNRESOLVED", () => (
  resolveOfficialArmyEliminationV1({
    scoringFinalizationRulesDataBundle: dataBundle, state: bothEliminated })));
bothEliminated.scoringCleanupProgress.currentStep = "check_end_game_conditions";
const unresolvedSpace = runtime.enumerate(bothEliminated, { sideKey: "player1",
  matchBinding: matchBinding() });
assert.equal(unresolvedSpace.candidates.some((entry) => (
  entry.actionType === "check_end_game_conditions")), false);
accept("simultaneous_elimination_is_quarantined_not_invented");

const graphAudit = auditRuleRelationshipGraphV1(audit.graph);
assert.equal(graphAudit.valid, true);
assert.equal(graphAudit.counts.blockingGaps, 0);
accept("relationship_graph_has_no_blocking_gap");
assert(audit.graph.coverageScopes.some((entry) => (
  entry.scopeId === OFFICIAL_SCORING_FINALIZATION_RULES_RELATIONSHIP_SCOPE_ID)));
accept("slice110_relationship_scope_is_registered");
const scaleEdge = audit.graph.edges.find((entry) => (
  entry.scopeId === OFFICIAL_SCORING_FINALIZATION_RULES_RELATIONSHIP_SCOPE_ID
  && entry.from === "semantic_projection:scoringFinalizationV1.worldInchesNotPixels"));
assert(scaleEdge);
accept("world_inch_projection_relationship_is_auditable");
assert.deepEqual([slice.historicalCompatibility.previousActionSchemaVersion,
  slice.historicalCompatibility.actionSchemaVersion],
  ["hybrid_legal_space_v47", "hybrid_legal_space_v48"]);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
accept("v48_advances_while_v47_rules_display_remains_readable");

const keys = generateKeyPairSync("ed25519");
function engineFor(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-09-02T12:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-110-scoring-finalization",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Frozen Slice 110 scoring-finalization rules";
function envelopeFor(engine) {
  return engine.createEnvelope({ roomId: "official-slice-110-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-source", content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-gameplay",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "scoring-finalization-data-v1",
        content: dataBundle },
      rulesDisplay: { artifactId: "slice110-rules-display", mediaType: "text/markdown",
        locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "slice110-action-schema-v48",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v48" } },
    }, state: rolled.state });
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
    geometryArtifact: dataBundle,
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v48" } };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}
const authority = engineFor("slice110-short-seal-v1");
const initial = envelopeFor(authority);
registerReplay(authority, initial);
const seat = authority.issueSeatAuthority({ grantId: "slice110-player1",
  roomId: initial.roomId, matchBindingHash: initial.matchBindingHash,
  seatKey: "player1", roleMode: "player", principalType: "human",
  capabilities: ["read_room", "read_legal_space", "preview", "confirm", "apply"] });
const lease = authority.issueControlLease({ seatAuthority: seat,
  sessionId: "slice110-session", leaseFence: 1,
  issuedAtRoomRevision: initial.stateRevision });
const authoritySpace = authority.legalSpace(initial, { seatAuthority: seat });
const finite = authoritySpace.finiteActions.find((entry) => (
  entry.action.scoringFinalizationPlan?.choice?.assignedFirstPlayerSideKey === "player2"));
assert(finite);
const preview = authority.preview({ envelope: initial, seatAuthority: seat,
  proposal: { kind: "finite", actionKey: finite.actionKey } });
assert.equal(preview.preview.previewSeal.sealAlgorithm, "hmac-sha256");
accept("authority_preview_uses_hmac_short_seal");
const confirmation = authority.confirmPreview({ envelope: initial,
  preview: preview.preview, seatAuthority: seat });
const authorityApplied = authority.apply({ envelope: initial,
  expectedStateRevision: initial.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: seat,
  controlLease: lease, idempotencyKey: "slice110-assignment" });
assert.equal(authorityApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
accept("authority_receipt_uses_ed25519_long_signature");
const replay = engineFor("slice110-rotated-seal-v2");
registerReplay(replay, initial);
assert.equal(replay.replay({ initialEnvelope: initial,
  journal: [authorityApplied.receipt] }).ok, true);
accept("authority_replay_survives_hmac_rotation");
const tampered = structuredClone(authorityApplied.receipt);
tampered.events.push({ type: "forged_final_score" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
accept("tampered_terminal_receipt_is_rejected");
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.equal(slice.harness.trainingTraceCandidates.length, 0);
accept("ctx2skill_dsh_selfplay_muzero_and_memory_promotions_remain_zero");
assert.equal(slice.scoringFinalizationRulesProgress.worldInchMapModelScaleInvariant, true);
assert.equal(slice.scoringFinalizationRulesProgress.sourceRefreshPerformed, false);
accept("slice_records_world_scale_invariant_and_frozen_source_boundary");
assert.equal(dataBundle.counts.firstPlayerAtoms, 4);
accept("first_player_atom_subdenominator_is_four");
assert.equal(dataBundle.counts.markerControlAtoms, 4);
accept("marker_control_atom_subdenominator_is_four");
assert.equal(dataBundle.counts.terminalAtoms, 3);
accept("terminal_atom_subdenominator_is_three");
assert.equal(dataBundle.counts.finalScoreAtoms, 3);
accept("final_score_atom_subdenominator_is_three");
assert.equal(slice.sliceForecast.remainingPlannedSlicesAfterThisSlice, 1);
accept("exactly_one_rule_slice_remains_after_slice110");
assert.equal(slice.sliceForecast.remainingActionableAtomsAfterThisSlice, 4);
accept("exactly_four_rule_atoms_remain_after_slice110");
assert.equal(slice.productionRoomEligible, false);
accept("partial_catalogue_remains_production_ineligible");
assert.equal(slice.rulesEligible, false);
accept("partial_catalogue_remains_rules_ineligible");
assert.equal(slice.historicalCompatibility.previousCatalogueMutationAllowed, false);
accept("previous_catalogue_mutation_remains_forbidden");
assert.equal(slice.historicalCompatibility.previousExecutorSourceMutationAllowed, false);
accept("previous_executor_source_mutation_remains_forbidden");
assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
accept("silent_compatibility_remains_forbidden");
assert.equal(audit.graphAudit.counts.executors, 79);
accept("graph_audit_covers_all_79_executors");
assert.equal(audit.stateContractCoverage.counts.strictCompleteAtoms, 908);
accept("state_contract_coverage_is_strict_for_all_908_atoms");
assert.equal(audit.catalogueAudit.counts.byDisposition.display_only, 114);
accept("display_only_rule_denominator_remains_114");
assert.equal(finalResolution.clientPixelOrVisualScaleAccepted, false);
accept("final_score_explicitly_rejects_pixel_geometry");
assert.equal(assigned.state.officialBattlefieldMarkerViewsAtSetup
  .physicalRulesGeometryDerivedFromVisuals, false);
accept("first_player_marker_view_never_becomes_rules_geometry");
assert.equal(acceptance.length, 60);

const report = { schema:
    "starcraft_tmg_official_scoring_finalization_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit,
  remainingRouteV2Hash: route.routeHash,
  slice, audit, sliceAudit: audit,
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
  graphHash: audit.graph.graphHash, graph: audit.graph, graphAudit,
  coverage: audit.stateContractCoverage,
  scoringFinalizationRulesDataBundleHash: dataBundle.bundleHash,
  sourceLockHash: dataBundle.sourceLockHash,
  sourceSnapshotHash: dataBundle.sourceSnapshotHash,
  normalizedDatasetHash: dataBundle.normalizedDatasetHash,
  scaleAudit: { rulesUnit: "inch", officialModelBaseSizeAuthority: "official_mm",
    zoomRulesInvariant: true, panRulesInvariant: true,
    devicePixelRatioRulesInvariant: true, touchTargetRulesInvariant: true,
    frontendPixelsConsumedByControlOrScoring: false },
  terminalAudit: { survivorVpAward: 10, roundLimit: 5,
    currentMissionTiebreaker: null, tiedFallback: "draw",
    simultaneousElimination: "fail_closed_slice111_dispute_pending" },
  sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  rulesTruth: "official_scoring_finalization_rules_slice_verified",
  trainingTruth: false };
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-scoring-finalization-rules-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, acceptance: acceptance.length,
  sliceHash: slice.sliceHash, catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash, graphHash: audit.graph.graphHash,
  dataBundleHash: dataBundle.bundleHash }, null, 2));
