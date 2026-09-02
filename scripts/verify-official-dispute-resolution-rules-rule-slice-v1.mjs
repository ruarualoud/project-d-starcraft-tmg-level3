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
  OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_ID,
  OFFICIAL_DISPUTE_RESOLUTION_RULES_NEW_ATOM_IDS,
} from "../packages/rule-atoms/official-dispute-resolution-rules-executor-v1.mjs";
import {
  createOfficialProvisionalRulingChoicesV1,
  createOfficialSimultaneousEliminationDisputeV1,
  resolveOfficialRulesDisputeRollOffV1,
} from "../packages/rule-atoms/official-dispute-resolution-rules-kernel-v1.mjs";
import { OFFICIAL_DISPUTE_RESOLUTION_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-dispute-resolution-rules-relationship-contract-v1.mjs";
import {
  createOfficialDisputeResolutionRulesRuleSliceV1,
  verifyOfficialDisputeResolutionRulesRuleSliceV1,
} from "../packages/rule-atoms/official-dispute-resolution-rules-rule-slice-v1.mjs";
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
import {
  createOfficialDisputeResolutionRulesDataBundleV1,
  verifyOfficialDisputeResolutionRulesDataBundleV1,
} from "../packages/source-data/official-dispute-resolution-rules-data-bundle-v1.mjs";
import { createOfficialMissionDeploymentDraftDataBundleV1 } from
  "../packages/source-data/official-mission-deployment-draft-data-bundle-v1.mjs";
import { createOfficialReserveLifecycleDataBundleV1 } from
  "../packages/source-data/official-reserve-lifecycle-data-bundle-v1.mjs";
import { createOfficialScoringFinalizationRulesDataBundleV1 } from
  "../packages/source-data/official-scoring-finalization-rules-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-scoring-finalization-rules-rule-slice-v1-report.json"), "utf8"));
const routeBaseReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-elevation-effective-size-rules-rule-slice-v1-report.json"), "utf8"));
const acceptance = [];
function accept(name) { acceptance.push(`${acceptance.length + 1}_${name}`); }
function rejects(code, operation) {
  assert.throws(operation, (error) => String(error?.message || error).startsWith(code));
}
function executable(row) {
  return Object.fromEntries(Object.entries(row).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key))));
}

const slice = createOfficialDisputeResolutionRulesRuleSliceV1({
  previousSlice: previousReport.slice });
const audit = verifyOfficialDisputeResolutionRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice });
assert.deepEqual(audit.counts, { executableRuleAtoms: 912,
  newlyExecutableRuleAtoms: 4, reviewRequiredRuleAtoms: 0,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 912,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 80, missingStateContractExecutors: 0 });
accept("slice111_promotes_four_atoms_to_912_executable");
const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 111);
assert.deepEqual(assignment.atomIds, [...OFFICIAL_DISPUTE_RESOLUTION_RULES_NEW_ATOM_IDS]);
accept("route_v2_exact_slice111_atom_identity");
assert.deepEqual([assignment.executableAfter, assignment.reviewRequiredAfter], [912, 0]);
accept("route_v2_closes_actionable_denominator");
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executorManifest.length, 80);
assert(runtime.descriptor.executorManifest.some((entry) => (
  entry.executorId === OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_ID)));
accept("runtime_exposes_dispute_resolution_as_executor80");
assert.deepEqual({ slice: slice.sliceHash, catalogue: slice.catalogueHash,
  runtime: runtime.descriptor.runtimeHash, graph: audit.graph.graphHash }, {
  slice: "f8183a5a689ea5ec72381f52d0bba8f58ae4585db8d53f5b0f6f343aa70bd20d",
  catalogue: "5b3bd5d65a6e3478e98536e7fb71133fd0624c99cccbc47c886c96f731c16d46",
  runtime: "6e3527cea5b9a005bb5462eb33bc8f2a7a3a93636778ae9a6daec2d8fab903b9",
  graph: "63f37c40a54006ab67096df72b9e2e9f6b6836c38d82aad3ee10d6d41017e44c" });
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
const scoringBundle = createOfficialScoringFinalizationRulesDataBundleV1({
  dataset: fixture.dataset, gameplayDataBundle: fixture.gameplayDataBundle,
  reserveLifecycleDataBundle: reserveBundle,
  battlefieldTokenMarkerRulesDataBundle: tokenBundle });
const dataBundle = createOfficialDisputeResolutionRulesDataBundleV1({
  dataset: fixture.dataset, gameplayDataBundle: fixture.gameplayDataBundle,
  scoringFinalizationRulesDataBundle: scoringBundle });
assert.equal(verifyOfficialDisputeResolutionRulesDataBundleV1(dataBundle), true);
accept("data_bundle_is_content_hash_verified");
assert.equal(dataBundle.ruleClauses.length, 4);
assert.deepEqual(dataBundle.ruleClauses.map((entry) => entry.atomId).sort(),
  [...OFFICIAL_DISPUTE_RESOLUTION_RULES_NEW_ATOM_IDS]);
accept("four_source_clause_groups_bind_four_route_atoms");
assert.equal(dataBundle.sourcePolicy.refreshDuringDevelopment, false);
assert.equal(dataBundle.sourcePolicy.repositoryFallbackAllowed, false);
accept("frozen_source_performs_no_refresh_or_repository_fallback");
assert.deepEqual({ dice: dataBundle.disputeContract.dicePerPlayer,
  faces: dataBundle.disputeContract.dieFaces,
  winner: dataBundle.disputeContract.higherTotalWins,
  tie: dataBundle.disputeContract.tiePolicy },
{ dice: 2, faces: 6, winner: true,
  tie: "repeat_new_roll_off_attempt_until_winner" });
accept("core_12_9_rolloff_contract_is_exact");
assert.deepEqual({ owner: dataBundle.disputeContract.rulingOwner,
  scope: dataBundle.disputeContract.rulingScope,
  continue: dataBundle.disputeContract.continueAfterRuling,
  verify: dataBundle.disputeContract.postMatchVerificationRequired },
{ owner: "roll_off_winner", scope: "specific_instance_only",
  continue: true, verify: true });
accept("ruling_owner_scope_continue_and_verify_contract_is_exact");
assert.deepEqual({ typed: dataBundle.manualAdjudicationContract.typedOptionsOnly,
  patch: dataBundle.manualAdjudicationContract.arbitraryPatchAccepted,
  training: dataBundle.manualAdjudicationContract.roomTrainingEligibleAfterUse },
{ typed: true, patch: false, training: false });
accept("manual_adjudication_is_typed_and_training_ineligible");
assert.deepEqual({ permanent:
    dataBundle.authorityContract.permanentReceiptSignature,
  short: dataBundle.authorityContract.shortLivedPreviewSeal,
  wholeState: dataBundle.authorityContract.clientWholeStateMutationAccepted },
{ permanent: "ed25519", short: "hmac-sha256", wholeState: false });
accept("hash_ed25519_and_hmac_authority_contract_is_bound");
assert.equal(dataBundle.scoringFinalizationRulesDataBundleHash,
  scoringBundle.bundleHash);
accept("slice111_binds_frozen_slice110_scoring_lineage");

function attach(state) {
  state.rulesProcedureMode = true;
  state.officialReserveLifecycleDataBundle = reserveBundle;
  state.officialBattlefieldTokenMarkerRulesDataBundle = tokenBundle;
  state.officialScoringFinalizationRulesDataBundle = scoringBundle;
  state.officialDisputeResolutionRulesDataBundle = dataBundle;
  return state;
}
function simultaneousState() {
  const state = attach(fixture.battleState({ round: 3,
    activeSideKey: "player1" }));
  state.phase = "cleanup";
  state.firstPlayerSideKey = "player1";
  state.activeSideKey = "player1";
  state.scores = { player1: 3, player2: 5 };
  state.scoringCleanupProgress = { schemaVersion:
      "starcraft_tmg_scoring_cleanup_progress_v1", round: 3,
    completedSteps: ["determine_mission_marker_control", "score_victory_points"],
    currentStep: "check_end_game_conditions", trainingTruth: false };
  for (const piece of state.pieces) {
    piece.isDestroyed = true;
    piece.isOnField = false;
    piece.isInReserves = false;
    piece.currentModels = 0;
    piece.currentSupply = 0;
    for (const model of piece.models || []) {
      model.isDestroyed = true;
      model.isOnField = false;
    }
  }
  return state;
}
function matchBinding() {
  const dataHash = hashStarcraftTmgContract(fixture.gameplayDataBundle);
  return { bindingHash: "slice111-match-binding", dataSnapshotHash: dataHash,
    rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
    dependencies: { dataSnapshot: { contentHash: dataHash } } };
}
const simultaneous = simultaneousState();
const dispute = createOfficialSimultaneousEliminationDisputeV1({
  disputeResolutionRulesDataBundle: dataBundle, state: simultaneous });
assert.equal(dispute.disputeKind, "simultaneous_army_elimination");
assert(dispute.participantIds.every((sideKey) => (
  dispute.specificInstance.armyStatusBySide[sideKey].eliminated)));
accept("simultaneous_elimination_becomes_specific_dispute_instance");
assert.deepEqual(dispute.rulingOptions.map((entry) => entry.effectKind).sort(),
  ["terminal_draw", "terminal_winner", "terminal_winner"]);
accept("specific_instance_has_three_typed_terminal_options");
assert.equal(dispute.coordinatorSideKey, "player1");
assert.equal(dataBundle.authorityContract.coordinatorDoesNotOwnRuling, true);
accept("operational_coordinator_does_not_own_provisional_ruling");
const tieReveals = [3, 4, 5, 2].map((outcome, counter) => (
  { counter, faces: 6, outcome }));
const tied = resolveOfficialRulesDisputeRollOffV1({
  disputeResolutionRulesDataBundle: dataBundle,
  participantIds: dispute.participantIds, attempt: 1,
  chanceReveals: tieReveals });
assert.equal(tied.outcome, "tie");
accept("equal_2d6_totals_tie");
assert.equal(tied.nextProcedure, "rules_dispute_roll_off");
accept("tie_requires_fresh_rolloff_attempt");
const winReveals = [6, 5, 1, 2].map((outcome, counter) => (
  { counter, faces: 6, outcome }));
const wonKernel = resolveOfficialRulesDisputeRollOffV1({
  disputeResolutionRulesDataBundle: dataBundle,
  participantIds: dispute.participantIds, attempt: 2,
  chanceReveals: winReveals });
assert.equal(wonKernel.winnerSideKey, "player1");
accept("higher_2d6_total_wins_dispute_rolloff");
rejects("DISPUTE_ROLL_OFF_REVEALS_REQUIRED", () => (
  resolveOfficialRulesDisputeRollOffV1({
    disputeResolutionRulesDataBundle: dataBundle,
    participantIds: dispute.participantIds, attempt: 1, chanceReveals: [] })));
accept("missing_authority_reveals_fail_closed");
const choices = createOfficialProvisionalRulingChoicesV1({
  disputeResolutionRulesDataBundle: dataBundle,
  dispute, rollOffWinnerSideKey: "player1" });
assert.equal(choices.length, 3);
assert(choices.every((entry) => entry.rulingOwnerSideKey === "player1"));
accept("rolloff_winner_owns_all_specific_instance_choices");
rejects("PROVISIONAL_RULING_OWNER_INVALID", () => (
  createOfficialProvisionalRulingChoicesV1({
    disputeResolutionRulesDataBundle: dataBundle,
    dispute, rollOffWinnerSideKey: "spectator" })));
accept("nonparticipant_cannot_own_provisional_ruling");

const initialSpace = runtime.enumerate(simultaneous, { sideKey: "player1",
  matchBinding: matchBinding() });
assert.equal(initialSpace.candidates.length, 1);
assert.equal(initialSpace.candidates[0].details.procedureKind,
  "open_simultaneous_elimination_dispute");
accept("runtime_prioritizes_one_rules_owned_dispute_open_action");
const opened = runtime.apply(simultaneous, executable(initialSpace.candidates[0]),
  { matchBinding: matchBinding() });
assert.equal(opened.state.pendingRulesDispute.disputeKind,
  "simultaneous_army_elimination");
accept("runtime_apply_opens_content_hash_bound_dispute");
const rollSpace = runtime.enumerate(opened.state, { sideKey: "player1",
  matchBinding: matchBinding() });
assert.equal(rollSpace.candidates.length, 1);
assert.equal(rollSpace.candidates[0].chance.count, 4);
accept("pending_dispute_exposes_only_four_dice_rolloff");
const tiedRuntime = runtime.apply(opened.state, executable(rollSpace.candidates[0]), {
  matchBinding: matchBinding(), chanceReveals: tieReveals });
assert.equal(tiedRuntime.state.pendingRulesDispute.rollOffAttempt, 2);
accept("runtime_tie_increments_attempt_without_ruling_owner");
assert.notEqual(tiedRuntime.state.pendingRulesDispute.disputeHash,
  opened.state.pendingRulesDispute.disputeHash);
accept("fresh_attempt_reseals_pending_dispute_content");
const secondRollSpace = runtime.enumerate(tiedRuntime.state, { sideKey: "player1",
  matchBinding: matchBinding() });
const won = runtime.apply(tiedRuntime.state, executable(secondRollSpace.candidates[0]), {
  matchBinding: matchBinding(), chanceReveals: winReveals });
assert.equal(won.state.pendingProvisionalRuling.rollOffWinnerSideKey, "player1");
accept("resolved_rolloff_assigns_exact_provisional_ruling_owner");
assert.equal(runtime.enumerate(won.state, { sideKey: "player2",
  matchBinding: matchBinding() }).candidates.length, 0);
accept("losing_side_has_no_provisional_ruling_action");
const rulingSpace = runtime.enumerate(won.state, { sideKey: "player1",
  matchBinding: matchBinding() });
assert.equal(rulingSpace.candidates.length, 3);
accept("winner_sees_complete_three_option_finite_legal_space");
const treatPlayer2 = rulingSpace.candidates.find((entry) => (
  entry.details.optionId === "treat-player2-as-surviving-side"));
rejects("DISPUTE_RESOLUTION_ACTION_STALE", () => runtime.apply(won.state,
  { ...executable(treatPlayer2), disputeResolutionPlan: {
    ...treatPlayer2.disputeResolutionPlan, planHash: "0".repeat(64) } },
  { matchBinding: matchBinding() }));
accept("forged_provisional_ruling_plan_fails_closed");
const ruled = runtime.apply(won.state, executable(treatPlayer2), {
  matchBinding: matchBinding() });
assert.equal(ruled.state.provisionalRulings[0].rulingOwnerSideKey, "player1");
assert.equal(ruled.state.provisionalRulings[0].selectedOption.winnerSideKey, "player2");
accept("winner_can_decide_specific_instance_without_forced_self_interest");
assert.deepEqual(ruled.state.scores, { player1: 3, player2: 15 });
accept("typed_terminal_ruling_applies_exact_ten_vp_effect");
assert.equal(ruled.state.gameOver, true);
assert.equal(ruled.state.winner, "player2");
accept("specific_instance_ruling_commits_terminal_outcome");
assert.equal(ruled.state.provisionalRulings[0].continueAfterProvisionalRuling, true);
accept("provisional_ruling_records_continue_play_flow");
assert.equal(ruled.state.manualAdjudicationUsed, true);
assert.equal(ruled.state.eligibleForTraining, false);
accept("manual_ruling_permanently_marks_room_training_ineligible");
assert.equal(runtime.enumerate(ruled.state, { sideKey: "player2",
  matchBinding: matchBinding() }).candidates.length, 0);
accept("noncoordinator_cannot_record_post_match_verification");
const verificationSpace = runtime.enumerate(ruled.state, { sideKey: "player1",
  matchBinding: matchBinding() });
assert.deepEqual(verificationSpace.candidates.map((entry) => (
  entry.details.verificationOutcome)).sort(),
["ruling_confirmed", "ruling_corrected", "verification_unresolved"]);
accept("post_match_window_exposes_three_auditable_verification_outcomes");
const confirm = verificationSpace.candidates.find((entry) => (
  entry.details.verificationOutcome === "ruling_confirmed"));
const verified = runtime.apply(ruled.state, executable(confirm), {
  matchBinding: matchBinding() });
assert.match(verified.state.provisionalRulings[0].verificationHash,
  /^[a-f0-9]{64}$/u);
accept("post_match_apply_records_content_hash_verification");
assert.deepEqual({ scores: verified.state.scores, winner: verified.state.winner },
  { scores: ruled.state.scores, winner: ruled.state.winner });
accept("verification_preserves_as_played_scores_and_winner");
const terminalSpace = runtime.enumerate(verified.state, { sideKey: "player1",
  matchBinding: matchBinding() });
assert.equal(terminalSpace.candidates.length, 0);
assert.equal(terminalSpace.terminal.gameOver, true);
accept("verified_terminal_room_returns_terminal_summary_without_actions");

const graphAudit = auditRuleRelationshipGraphV1(audit.graph);
assert.equal(graphAudit.valid, true);
assert.equal(graphAudit.counts.blockingGaps, 0);
accept("relationship_graph_has_no_blocking_gap");
assert(audit.graph.coverageScopes.some((entry) => (
  entry.scopeId === OFFICIAL_DISPUTE_RESOLUTION_RULES_RELATIONSHIP_SCOPE_ID)));
accept("slice111_relationship_scope_is_registered");
const forbiddenCanonicalWrite = audit.graph.edges.find((entry) => (
  entry.from === "derived_value:disputeResolutionV1.specificInstanceRuling"
  && entry.relationship === "writes"
  && entry.to === "semantic_authority:canonicalRulesImmutable"));
assert.equal(forbiddenCanonicalWrite, undefined);
accept("provisional_ruling_has_no_canonical_rules_write_path");
assert.deepEqual([slice.historicalCompatibility.previousActionSchemaVersion,
  slice.historicalCompatibility.actionSchemaVersion],
  ["hybrid_legal_space_v48", "hybrid_legal_space_v49"]);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
accept("v49_advances_while_v48_rules_display_remains_readable");

const keys = generateKeyPairSync("ed25519");
function engineFor(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-09-02T14:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-111-dispute-resolution",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Frozen Slice 111 dispute-resolution rules";
function envelopeFor(engine) {
  return engine.createEnvelope({ roomId: "official-slice-111-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-source",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-gameplay",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "dispute-resolution-data-v1",
        content: dataBundle },
      rulesDisplay: { artifactId: "slice111-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "slice111-action-schema-v49",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v49" } },
    }, state: won.state });
}
function registerReplay(engine, initial) {
  const entries = { sourceSnapshot: fixture.snapshot,
    dataSnapshot: fixture.gameplayDataBundle,
    rulesArtifact: { kind: "rules-artifact",
      rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: initial.matchBinding.rulesRuntimeBinding },
    executorArtifact: { kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: initial.matchBinding.rulesRuntimeBinding.runtimeHash,
      catalogueHash: initial.matchBinding.rulesRuntimeBinding.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest },
    geometryArtifact: dataBundle,
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v49" } };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}
const authority = engineFor("slice111-short-seal-v1");
const initial = envelopeFor(authority);
registerReplay(authority, initial);
const seat = authority.issueSeatAuthority({ grantId: "slice111-player1",
  roomId: initial.roomId, matchBindingHash: initial.matchBindingHash,
  seatKey: "player1", roleMode: "player", principalType: "human",
  capabilities: ["read_room", "read_legal_space", "preview", "confirm", "apply"] });
const lease = authority.issueControlLease({ seatAuthority: seat,
  sessionId: "slice111-session", leaseFence: 1,
  issuedAtRoomRevision: initial.stateRevision });
const authoritySpace = authority.legalSpace(initial, { seatAuthority: seat });
const finite = authoritySpace.finiteActions.find((entry) => (
  entry.action.disputeResolutionPlan?.choice?.option?.optionId
    === "treat-player2-as-surviving-side"));
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
  controlLease: lease, idempotencyKey: "slice111-provisional-ruling" });
assert.equal(authorityApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
assert.equal(authorityApplied.receipt.eligibleForTraining, false);
assert.equal(authorityApplied.receipt.manualAdjudication, true);
accept("authority_receipt_uses_ed25519_and_remains_training_ineligible");
const replay = engineFor("slice111-rotated-seal-v2");
registerReplay(replay, initial);
assert.equal(replay.replay({ initialEnvelope: initial,
  journal: [authorityApplied.receipt] }).ok, true);
accept("authority_replay_survives_hmac_rotation");
const tampered = structuredClone(authorityApplied.receipt);
tampered.events.push({ type: "forged_ruling_verification" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
accept("tampered_provisional_ruling_receipt_is_rejected");
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.equal(slice.harness.trainingTraceCandidates.length, 0);
assert.equal(slice.sliceForecast.remainingActionableAtomsAfterThisSlice, 0);
assert.equal(slice.sliceForecast.remainingPlannedSlicesAfterThisSlice, 0);
accept("ticket11_closes_without_skill_dsh_muzero_or_training_promotion");
assert.equal(acceptance.length, 50);

const report = {
  schema: "starcraft_tmg_official_dispute_resolution_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit,
  remainingRouteV2Hash: route.routeHash,
  slice, audit, sliceAudit: audit,
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
  graphHash: audit.graph.graphHash, graph: audit.graph, graphAudit,
  coverage: audit.stateContractCoverage,
  disputeResolutionRulesDataBundleHash: dataBundle.bundleHash,
  sourceLockHash: dataBundle.sourceLockHash,
  sourceSnapshotHash: dataBundle.sourceSnapshotHash,
  normalizedDatasetHash: dataBundle.normalizedDatasetHash,
  ticket11Closure: { actionableAtoms: 912, executableAtoms: 912,
    reviewRequiredAtoms: 0, displayOnlyAtomsRetained: 114,
    declaredStateContractExecutors: 80,
    remainingRuleSlices: 0, ruleVerticalsComplete: 101,
    manualAdjudicationTrainingEligible: false,
    productionRoomEligible: false },
  ctx2skillLoopUsed: true, targetGames: ["starcraft-tmg"],
  roleRoutes: ["rule_skill_builder"], skillsRead: [], skillsGenerated: [],
  judgeTestsRun: 50, crossTimeReplayResult: "pass_without_skill_generation",
  promotions: [], blocks: ["production_ui_agent_skill_selfplay_muzero_pending"],
  remainingRuleGaps: 0,
  harnessLoopUsed: true,
  harnessToolsCalled: ["list_legal_actions", "preview_action",
    "apply_action_after_user_confirmation", "replay_room"],
  uiTraceEvidence: "authority_trace_only_browser_and_device_ui_pending",
  agentDecisionEvidence:
    "rules_owned_dispute_rolloff_and_typed_specific_instance_ruling",
  memoryTraceEvidence: { refs: [], promotionAttempted: false },
  trainingTraceCandidates: [],
  rollbackOrDemotionRules: ["source_state_or_replay_drift_quarantines_slice111"],
  userVisibleChecks: ["rolloff_ruling_continue_and_verification_are_explainable"],
  sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  rulesTruth: "official_dispute_resolution_rules_slice_verified",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-dispute-resolution-rules-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, acceptance: acceptance.length,
  sliceHash: slice.sliceHash, catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash, graphHash: audit.graph.graphHash,
  dataBundleHash: dataBundle.bundleHash }, null, 2));
