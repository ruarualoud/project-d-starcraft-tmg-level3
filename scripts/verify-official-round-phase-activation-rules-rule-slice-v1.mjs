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
  OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_NEW_ATOM_IDS,
  OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_PARAMETER_KIND,
  openOfficialRoundPhaseActivationRulesPendingV1,
} from "../packages/rule-atoms/official-round-phase-activation-rules-executor-v1.mjs";
import {
  resolveOfficialActivationTurnOrderV1,
  resolveOfficialPhaseActionMenuV1,
  resolveOfficialRoundPhaseSequenceV1,
} from "../packages/rule-atoms/official-round-phase-activation-rules-kernel-v1.mjs";
import { OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-round-phase-activation-rules-relationship-contract-v1.mjs";
import {
  createOfficialRoundPhaseActivationRulesRuleSliceV1,
  verifyOfficialRoundPhaseActivationRulesRuleSliceV1,
} from "../packages/rule-atoms/official-round-phase-activation-rules-rule-slice-v1.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import {
  createOfficialRoundPhaseActivationDataBundleV1,
  verifyOfficialRoundPhaseActivationDataBundleV1,
} from "../packages/source-data/official-round-phase-activation-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-unit-card-supply-rules-rule-slice-v1-report.json"), "utf8"));
const routeBaseReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-elevation-effective-size-rules-rule-slice-v1-report.json"), "utf8"));
const acceptance = [];

function accept(name) { acceptance.push(name); }
function plan(planId, procedureKind, input) {
  return { planId, procedureKind, input,
    rulesOwnedInputsComplete: true, clientSuppliedResult: false };
}
function procedure(state, procedureKind, candidatePlan) {
  return { procedureKind, sideKey: state.activeSideKey,
    candidatePlansComplete: true, rulesDenominatorComplete: true,
    candidatePlans: [candidatePlan] };
}
function prepare(fixture, bundle) {
  const state = fixture.battleState({ activeSideKey: "player1" });
  state.round = 2; state.phase = "movement"; state.firstPlayerSideKey = "player1";
  state.rulesProcedureMode = true;
  state.officialRoundPhaseActivationDataBundle = bundle;
  state.roundPhaseActivationRulesHistory = [];
  return state;
}
function bindingFor(gameplayDataBundle) {
  const dataHash = hashStarcraftTmgContract(gameplayDataBundle);
  return { bindingHash: "slice-94-round-phase-activation-binding",
    dataSnapshotHash: dataHash,
    dependencies: { dataSnapshot: { contentHash: dataHash } } };
}
function domainFor(runtime, state, binding) {
  return runtime.enumerate(state, { sideKey: state.activeSideKey,
    includeDisabled: true, matchBinding: binding }).parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_PARAMETER_KIND));
}
function engineFor(runtime, keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-09-01T11:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-94-round-phase-activation",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 94 round/phase activation rules.";
function envelopeFor(engine, fixture, state) {
  return engine.createEnvelope({ roomId: "official-slice-94-round-phase-activation-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-round-phase-activation-geometry-v1",
        content: { kind: "geometry-artifact",
          geometryVersion: "round_phase_activation_no_geometry_v1" } },
      rulesDisplay: { artifactId: "official-slice-94-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "official-slice-94-action-schema-v32",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v32" } },
    }, state });
}
function credentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({ grantId: "slice-94-round-phase-grant",
    roomId: envelope.roomId, matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1", roleMode: "player", principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
  return { authority, lease: engine.issueControlLease({ seatAuthority: authority,
    sessionId: "slice-94-round-phase-session", leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision }) };
}
function registerReplay(engine, initial, fixture, runtime) {
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
      geometryVersion: "round_phase_activation_no_geometry_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v32" },
  };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}

const slice = createOfficialRoundPhaseActivationRulesRuleSliceV1({
  previousSlice: previousReport.slice });
const audit = verifyOfficialRoundPhaseActivationRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice });
assert.deepEqual(audit.counts, { executableRuleAtoms: 690,
  newlyExecutableRuleAtoms: 7, reviewRequiredRuleAtoms: 222,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 690,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 63, missingStateContractExecutors: 0 });
accept("01_slice94_promotes_exact_7_route_atoms_to_690_executable");

const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 94);
assert.deepEqual(assignment.atomIds,
  [...OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_NEW_ATOM_IDS]);
assert.deepEqual({ executable: assignment.executableAfter,
  review: assignment.reviewRequiredAfter }, { executable: 690, review: 222 });
accept("02_route_v2_exact_slice94_atom_identity_and_counts_match");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executorManifest.length, 63);
accept("03_runtime_exposes_round_phase_activation_as_executor_63");
const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const bundle = createOfficialRoundPhaseActivationDataBundleV1({ dataset: fixture.dataset });
assert.equal(verifyOfficialRoundPhaseActivationDataBundleV1(bundle), true);
accept("04_source_bundle_is_content_hash_verified");
assert.deepEqual(bundle.ruleSectionRecords.map((entry) => entry.title), [
  "PART 8: THE GAME SEQUENCE", "PART 12: QUICK REFERENCE"]);
accept("05_part8_and_part12_records_match_frozen_capture");
assert.equal(bundle.ruleClauses.length, 7);
assert.equal(new Set(bundle.ruleClauses.map((entry) => entry.sourceTextHash)).size, 7);
accept("06_seven_exact_clause_hashes_cover_seven_route_atoms");
assert.deepEqual(bundle.sourcePolicy, { captureMode: "slice_75_single_official_capture_lock",
  refreshDuringDevelopment: false, repositoryFallbackAllowed: false,
  pdfRole: "primary_normative_core_rules_source" });
accept("07_source_lock_is_offline_without_repository_fallback");

const sequence = resolveOfficialRoundPhaseSequenceV1({
  roundPhaseActivationDataBundle: bundle, rulesOwnedSequenceRequested: true });
assert.equal(sequence.maximumRounds, 5);
accept("08_game_maximum_is_five_rounds");
assert.deepEqual(sequence.phaseSequence.map((entry) => entry.phase),
  ["movement", "assault", "combat", "cleanup"]);
accept("09_four_phases_are_in_strict_official_order");
assert.deepEqual(sequence.alternatingActivationPhaseOrdinals, [1, 2, 3]);
accept("10_only_first_three_phases_use_alternating_activation");
assert.equal(sequence.roundSixMayNotBegin, true);
accept("11_sequence_explicitly_forbids_beginning_round_six");
assert.deepEqual(sequence.phaseSequence[0].phaseActionTypes,
  ["deploy", "move", "disengage", "hold"]);
accept("12_movement_phase_summary_contains_four_official_action_classes");
assert.deepEqual(sequence.phaseSequence[1].phaseActionTypes,
  ["ranged_attack", "charge", "run", "hold"]);
accept("13_assault_phase_summary_contains_four_official_action_classes");
assert.deepEqual(sequence.phaseSequence[2].phaseActionTypes, ["close_combat_attack"]);
accept("14_combat_phase_summary_contains_close_combat_attack");
assert.deepEqual(sequence.phaseSequence[3].orderedOperations,
  ["control_markers", "score_vp", "end_of_game_check", "end_of_round_effects",
    "cleanup", "initiative"]);
accept("15_scoring_cleanup_operations_preserve_quick_reference_order");
assert.throws(() => resolveOfficialRoundPhaseSequenceV1({
  roundPhaseActivationDataBundle: bundle, rulesOwnedSequenceRequested: true,
  clientSuppliedMaximumRounds: 9 }), /ROUND_PHASE_SEQUENCE_REQUEST_INVALID/u);
accept("16_client_cannot_replace_round_limit_or_phase_sequence");

function menu(phase, unitLocation, extra = {}) {
  return resolveOfficialPhaseActionMenuV1({ roundPhaseActivationDataBundle: bundle,
    phase, unitLocation, rulesOwnedMenuRequested: true, ...extra });
}
assert.deepEqual(menu("movement", "battlefield").phaseActionTypes,
  ["disengage", "hold", "move"]);
accept("17_battlefield_movement_unit_gets_move_hold_disengage_classes");
assert.deepEqual(menu("movement", "reserves").phaseActionTypes, ["deploy"]);
accept("18_reserve_movement_unit_gets_deploy_class_only");
assert.deepEqual(menu("assault", "battlefield").phaseActionTypes,
  ["charge", "hold", "ranged_attack", "run"]);
accept("19_battlefield_assault_unit_gets_official_action_classes");
assert.deepEqual(menu("cleanup", "battlefield").phaseActionTypes, []);
accept("20_cleanup_has_no_unit_phase_action_menu");
assert.equal(menu("combat", "battlefield").completeCurrentLegalSpaceClaimed, false);
accept("21_phase_menu_does_not_claim_complete_current_legalspace");
assert.throws(() => menu("movement", "battlefield",
  { clientSuppliedActionTypes: ["teleport"] }), /PHASE_ACTION_MENU_REQUEST_INVALID/u);
accept("22_client_cannot_inject_phase_action_types");

function turn(extra = {}) {
  return resolveOfficialActivationTurnOrderV1({
    roundPhaseActivationDataBundle: bundle, round: 2, phase: "movement",
    playerSideKeys: ["player1", "player2"], activeSideKey: "player1",
    activatedUnitId: "unit-a", unitLocation: "battlefield",
    completedPhaseActionType: "hold", activatedUnitWasEligible: true,
    activationMarkerBeforeAction: false, phaseActionFullyResolved: true,
    completedUnitCount: 1, completedPhaseActionCount: 1,
    opponentPassed: false, actingSideHasRemainingActivation: true, ...extra });
}
assert.deepEqual({ next: turn().nextTurn, side: turn().nextActiveSideKey },
  { next: "opponent_activates", side: "player2" });
accept("23_completed_activation_hands_turn_to_opponent");
assert.equal(turn().playersAlternateOneUnitPerTurn, true);
accept("24_turn_certificate_binds_one_unit_alternation");
assert.deepEqual({ next: turn({ opponentPassed: true }).nextTurn,
  side: turn({ opponentPassed: true }).nextActiveSideKey },
{ next: "same_side_continues", side: "player1" });
accept("25_same_side_continues_only_after_opponent_pass");
assert.equal(turn({ opponentPassed: true, actingSideHasRemainingActivation: false })
  .nextTurn, "phase_complete");
accept("26_no_remaining_activation_after_opponent_pass_completes_phase");
assert.throws(() => turn({ completedUnitCount: 2 }),
  /ONE_PHASE_ACTION_COMPLETION_RECEIPT_REQUIRED/u);
accept("27_two_units_cannot_be_completed_in_one_activation");
assert.throws(() => turn({ completedPhaseActionCount: 2 }),
  /ONE_PHASE_ACTION_COMPLETION_RECEIPT_REQUIRED/u);
accept("28_two_phase_actions_cannot_be_completed_in_one_activation");
assert.throws(() => turn({ phaseActionFullyResolved: false }),
  /ONE_PHASE_ACTION_COMPLETION_RECEIPT_REQUIRED/u);
accept("29_unresolved_atomic_action_cannot_advance_alternation");
assert.throws(() => turn({ round: 6 }), /ROUND_PHASE_ACTIVATION_ROUND_OUT_OF_RANGE/u);
accept("30_round_six_activation_fails_closed");
assert.throws(() => turn({ completedPhaseActionType: "ranged_attack" }),
  /PHASE_ACTION_TYPE_NOT_IN_PHASE/u);
accept("31_action_type_from_another_phase_fails_closed");
assert.throws(() => turn({ phase: "cleanup" }), /ROUND_PHASE_ACTIVATION_TURN_INVALID/u);
accept("32_cleanup_cannot_use_alternating_unit_activation");
assert.throws(() => turn({ completedPhaseActionType: "deploy" }),
  /MOVEMENT_BATTLEFIELD_ACTION_TYPE_INVALID/u);
accept("33_battlefield_unit_cannot_use_reserve_deploy_class");

const state = prepare(fixture, bundle); const binding = bindingFor(fixture.gameplayDataBundle);
const sequencePlan = plan("round-phase-sequence-plan", "round_phase_sequence", {
  rulesOwnedSequenceRequested: true });
const opened = openOfficialRoundPhaseActivationRulesPendingV1(state,
  procedure(state, "round_phase_sequence", sequencePlan));
const domain = domainFor(runtime, opened.state, binding);
assert(domain); assert.equal(domain.constraints.completeCurrentLegalSpaceClaimed, false);
accept("34_runtime_exposes_rules_owned_sequence_parameter_domain");
const action = runtime.instantiate(opened.state, domain,
  { choiceId: domain.constraints.choices[0].choiceId }, { matchBinding: binding });
const applied = runtime.apply(opened.state, action.action, { matchBinding: binding });
assert.equal(applied.state.pendingAction, null);
assert.equal(applied.state.lastRoundPhaseActivationRulesResolution.result.maximumRounds, 5);
accept("35_runtime_apply_persists_sequence_history_and_event");
const stateDrift = structuredClone(opened.state); stateDrift.round = 3;
assert.equal(runtime.enumerate(stateDrift, { sideKey: "player1", includeDisabled: true,
  matchBinding: binding }).candidates[0].disabledReason,
"ROUND_PHASE_ACTIVATION_PENDING_INVALID");
accept("36_round_drift_invalidates_old_sequence_domain");
const sourceDrift = structuredClone(opened.state);
sourceDrift.officialDevelopmentTrancheSourceLockAudit.lockHash = "0".repeat(64);
assert.equal(runtime.enumerate(sourceDrift, { sideKey: "player1", includeDisabled: true,
  matchBinding: binding }).candidates[0].disabledReason,
"ROUND_PHASE_ACTIVATION_SOURCE_LOCK_BINDING_INVALID");
accept("37_source_lock_drift_disables_sequence_legalspace");

const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
assert.deepEqual({ nodes: graph.nodes.length, edges: graph.edges.length },
  { nodes: 10448, edges: 30143 });
const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_RELATIONSHIP_SCOPE_ID));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "derived_value:roundPhaseActivationV1.onePhaseAction"
    && entry.to === "derived_value:roundPhaseActivationV1.nextActivationTurn"));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash")));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
accept("38_relationship_graph_is_valid_and_blocks_missing_action_to_turn_edge");

const keys = generateKeyPairSync("ed25519");
const authority = engineFor(runtime, keys, "slice-94-round-phase-short-seal-v1");
const seed = envelopeFor(authority, fixture, state);
const authorityOpened = openOfficialRoundPhaseActivationRulesPendingV1(seed.state,
  procedure(seed.state, "round_phase_sequence", sequencePlan));
const initial = authority.createEnvelope({ roomId: seed.roomId,
  matchBinding: seed.matchBinding, state: authorityOpened.state });
registerReplay(authority, initial, fixture, runtime);
const access = credentials(authority, initial);
const authoritySpace = authority.legalSpace(initial, { seatAuthority: access.authority });
const authorityDomain = authoritySpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_PARAMETER_KIND));
const preview = authority.preview({ envelope: initial, seatAuthority: access.authority,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: { choiceId: authorityDomain.constraints.choices[0].choiceId } } });
assert.equal(preview.ok, true, JSON.stringify(preview));
const confirmation = authority.confirmPreview({ envelope: initial,
  preview: preview.preview, seatAuthority: access.authority });
const authoritativeApplied = authority.apply({ envelope: initial,
  expectedStateRevision: initial.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: access.authority,
  controlLease: access.lease, idempotencyKey: "slice-94-round-phase-activation" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
const replay = engineFor(runtime, keys, "slice-94-round-phase-rotated-seal-v2");
registerReplay(replay, initial, fixture, runtime);
assert.equal(replay.replay({ initialEnvelope: initial,
  journal: [authoritativeApplied.receipt] }).ok, true);
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_phase_event" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
accept("39_authority_ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

assert.equal(acceptance.length, 39);
const report = {
  schema: "starcraft_tmg_official_round_phase_activation_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit, roundPhaseActivationDataBundle: bundle,
  remainingRouteV2Hash: route.routeHash, slice, sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash, catalogueHash: slice.catalogueHash,
  graph, graphAudit: audit.graphAudit, coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true,
    historicalRulesDisplayRetained: true },
  ctx2skill: slice.ctx2skill, harness: slice.harness,
  rulesEligible: false, productionRoomEligible: false,
  rulesTruth: "official_round_phase_activation_primitive_conformance",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-round-phase-activation-rules-rule-slice-v1-report.json"),
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
