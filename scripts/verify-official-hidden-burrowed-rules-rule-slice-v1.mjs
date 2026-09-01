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
  OFFICIAL_HIDDEN_BURROWED_RULES_NEW_ATOM_IDS,
  OFFICIAL_HIDDEN_BURROWED_RULES_PARAMETER_KIND,
  openOfficialHiddenBurrowedRulesPendingV1,
} from "../packages/rule-atoms/official-hidden-burrowed-rules-executor-v1.mjs";
import {
  resolveOfficialBurrowedCombatActivationV1,
  resolveOfficialBurrowedHiddenLifecycleV1,
  resolveOfficialBurrowedMovementPassThroughV1,
  resolveOfficialBurrowedPermissionsV1,
  resolveOfficialHiddenBurrowedAttackDefenseV1,
  resolveOfficialHiddenTargetingVisibilityV1,
} from "../packages/rule-atoms/official-hidden-burrowed-rules-kernel-v1.mjs";
import { OFFICIAL_HIDDEN_BURROWED_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-hidden-burrowed-rules-relationship-contract-v1.mjs";
import {
  createOfficialHiddenBurrowedRulesRuleSliceV1,
  verifyOfficialHiddenBurrowedRulesRuleSliceV1,
} from "../packages/rule-atoms/official-hidden-burrowed-rules-rule-slice-v1.mjs";
import { createOfficialRemainingRuleAtomRouteV2 } from
  "../packages/rule-atoms/official-remaining-rule-atom-route-v2.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { getOfficialCurrentProductRecord } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import {
  createOfficialHiddenBurrowedDataBundleV1,
  verifyOfficialHiddenBurrowedDataBundleV1,
} from "../packages/source-data/official-hidden-burrowed-data-bundle-v1.mjs";
import { getOfficialModelBaseGeometryProfileV1 } from
  "../packages/source-data/official-model-base-geometry-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-status-stay-in-play-rules-rule-slice-v1-report.json"), "utf8"));
const routeBaseReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-elevation-effective-size-rules-rule-slice-v1-report.json"), "utf8"));
const acceptance = [];
function accept(...names) { acceptance.push(...names); }

const slice = createOfficialHiddenBurrowedRulesRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialHiddenBurrowedRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 747,
  newlyExecutableRuleAtoms: 18, reviewRequiredRuleAtoms: 165,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 747,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 68, missingStateContractExecutors: 0 });
accept("01_slice99_promotes_exact_18_route_atoms_to_747_executable");
const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 99);
assert.deepEqual(assignment.atomIds, [...OFFICIAL_HIDDEN_BURROWED_RULES_NEW_ATOM_IDS]);
assert.deepEqual([assignment.executableAfter, assignment.reviewRequiredAfter], [747, 165]);
accept("02_route_v2_exact_slice99_atom_identity_and_counts_match");
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executorManifest.length, 68);
accept("03_runtime_exposes_hidden_burrowed_as_executor_68");

const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const bundle = createOfficialHiddenBurrowedDataBundleV1({ dataset: fixture.dataset });
assert.equal(verifyOfficialHiddenBurrowedDataBundleV1(bundle), true);
assert.deepEqual(bundle.ruleClauses.map((entry) => entry.atomId).sort(),
  [...OFFICIAL_HIDDEN_BURROWED_RULES_NEW_ATOM_IDS]);
assert.equal(bundle.ruleSectionRecord.recordKey, "rules_sections:FuahgilWtc8nccVSp2Vv");
assert.equal(bundle.ruleClauses.every((entry) => entry.sourceTextHashes.every((hash) => (
  /^[a-f0-9]{64}$/u.test(hash)))), true);
assert.equal(bundle.sourcePolicy.refreshDuringDevelopment, false);
assert.equal(bundle.sourcePolicy.repositoryFallbackAllowed, false);
assert.equal(bundle.hiddenDefinitionIndex.length, 5);
assert.equal(bundle.pathOfShadows.description,
  "This Unit gains HIDDEN Status until it performs another action.");
assert.equal(bundle.burrowedCarrierRegistry.entries.length, 0);
assert.deepEqual(bundle.sourceReconciliation, {
  corePdfContainsStartOfRoundHiddenGrant: true,
  commandCenterPart11ContainsStartOfRoundHiddenGrant: false,
  resolution: "core_pdf_is_primary_normative_rule_source",
  silentSourceMergeAllowed: false,
});
accept("04_hidden_burrowed_bundle_is_content_hash_verified",
  "05_eighteen_exact_core_clause_boundaries_cover_route_atoms",
  "06_official_part11_record_identity_is_pinned",
  "07_each_clause_binds_source_text_and_candidate_sequence_hashes",
  "08_source_lock_remains_offline_without_refresh_or_repository_fallback",
  "09_current_hidden_definition_denominator_is_five",
  "10_stalker_path_of_shadows_current_carrier_is_pinned",
  "11_no_current_burrowed_carrier_is_explicitly_quarantined",
  "12_core_pdf_and_command_center_start_round_difference_is_explicit");

function piece(recordKey, id, sideKey, xInches, statuses = []) {
  const record = getOfficialCurrentProductRecord(fixture.dataset, recordKey);
  const profile = getOfficialModelBaseGeometryProfileV1(
    bundle.modelBaseGeometryDataBundle, recordKey,
  );
  return { id, name: record.payload.name, sideKey, officialUnitRecordKey: recordKey,
    sourceRecordHash: record.sourceRecordHash, officialPayloadHash: record.payloadHash,
    currentModels: 1, maxModels: 1, currentSupply: 3, destroyedModelIds: [],
    isOnField: true, isInReserves: false, isDestroyed: false,
    statuses: structuredClone(statuses), derivedKeywords: [], selectedUpgradeNames: [],
    abilityEffects: [], combatEffects: [], assaultEffects: [], timedEffects: [],
    damageMarker: 0, activatedPhases: { movement: false, assault: false, combat: false },
    models: [{ id: `${id}-model`, xInches, yInches: 10,
      baseShape: profile.baseShape, baseWidthInches: profile.baseWidthMilliInches / 1000,
      baseDepthInches: profile.baseDepthMilliInches / 1000, baseRotationDegrees: 0,
      elevation: "ground", supportTerrainIds: [], adjacentAccessPointIds: [],
      isOnField: true, isDestroyed: false }] };
}
function stateFor(actorStatuses = [], targetStatuses = []) {
  const state = fixture.battleState({ round: 2, activeSideKey: "player1" });
  state.rulesProcedureMode = true;
  state.officialHiddenBurrowedDataBundle = bundle;
  state.hiddenBurrowedHistory = [];
  state.pieces = [piece("army_units:marine", "actor", "player1", 10, actorStatuses),
    piece("army_units:stalker", "target", "player2", 16, targetStatuses)];
  state.log = [];
  return state;
}
function kernel(state, extra = {}) {
  return { state, hiddenBurrowedDataBundle: bundle,
    rulesOwnedStateRequested: true, ...extra };
}
function witness(state, event) {
  state.log.push({ type: "fixture_witness", events: [structuredClone(event)] });
  return hashStarcraftTmgContract(event);
}
function lifecycle(state, triggerKind, event) {
  const triggerEventHash = witness(state, event);
  return resolveOfficialBurrowedHiddenLifecycleV1(kernel(state, {
    procedureKind: "reconcile_burrowed_hidden_lifecycle", pieceId: "target",
    triggerKind, triggerEventHash,
  }));
}
function setGap(state, gapMilliInches) {
  const [actor, target] = state.pieces.map((entry) => entry.models[0]);
  const centers = ((actor.baseWidthInches + target.baseWidthInches) / 2)
    + (gapMilliInches / 1000);
  target.xInches = actor.xInches + centers;
}

let state = stateFor();
let result = lifecycle(state, "gain_burrowed", { type: "burrowed_gained",
  pieceId: "target" });
assert.deepEqual(result.mutation.piecePatches[0].set.statuses.map((entry) => entry.name),
  ["burrowed", "hidden"]);
state = stateFor([], ["burrowed"]); state.phase = "start_of_round";
result = lifecycle(state, "start_round", { type: "start_of_round_resolved",
  pieceId: "target" });
assert.equal(result.hiddenAdded, true);
state = stateFor([], ["burrowed", "hidden"]);
result = lifecycle(state, "action_performed", { type: "unit_action_performed",
  pieceId: "target", actionType: "hold" });
assert.deepEqual(result.mutation.piecePatches[0].set.statuses, ["burrowed", "hidden"]);
state = stateFor([], ["burrowed", "hidden"]);
result = lifecycle(state, "action_performed", { type: "unit_action_performed",
  pieceId: "target", actionType: "move" });
assert.deepEqual(result.mutation.piecePatches[0].set.statuses, []);
state = stateFor([], ["burrowed", "hidden"]);
assert.throws(() => lifecycle(state, "action_performed", { type: "unit_action_performed",
  pieceId: "target", actionType: "shoot" }), /BURROWED_ACTION_NOT_PERMITTED/u);
state = stateFor([], ["burrowed", "hidden"]);
result = lifecycle(state, "remove_burrowed", { type: "burrowed_removed",
  pieceId: "target" });
assert.equal(result.hiddenRemoved && result.burrowedRemoved, true);
assert.deepEqual(result.statusClassification, { burrowed: "status", hidden: "status" });
accept("13_gaining_burrowed_adds_burrowed_and_hidden_statuses",
  "14_start_of_round_regrants_hidden_to_burrowed_unit",
  "15_hold_preserves_burrowed_and_hidden",
  "16_non_hold_permitted_action_removes_burrowed_and_hidden",
  "17_action_outside_burrowed_whitelist_fails_closed",
  "18_explicit_burrowed_removal_also_removes_hidden",
  "19_burrowed_and_hidden_are_executable_status_classifications");

function targeting(state, selectionKind, requiresLineOfSight) {
  return resolveOfficialHiddenTargetingVisibilityV1(kernel(state, {
    procedureKind: "evaluate_hidden_targeting_visibility", actingPieceId: "actor",
    actingModelId: "actor-model", targetPieceId: "target",
    selectionKind, requiresLineOfSight,
  }));
}
state = stateFor([], ["hidden"]); setGap(state, 4000);
result = targeting(state, "ranged_attack", true);
assert.equal(result.distanceAllowsSelection, true);
state = stateFor([], ["hidden"]); setGap(state, 4001);
result = targeting(state, "ranged_attack", true);
assert.equal(result.distanceAllowsSelection, false);
assert.equal(result.visible, false);
assert.equal(targeting(state, "los_special_ability", false).distanceAllowsSelection, true);
assert.equal(result.distanceMilliInches, 4001);
accept("20_hidden_target_is_selectable_at_exactly_four_inches",
  "21_hidden_ranged_target_beyond_four_inches_is_rejected",
  "22_hidden_beyond_four_is_not_visible_regardless_of_los",
  "23_non_los_special_ability_is_not_blocked_by_hidden",
  "24_hidden_distance_uses_exact_round_base_edge_gap");

function defense(state, attackKind, event) {
  const attackEventHash = witness(state, event);
  return { attackEventHash, result: resolveOfficialHiddenBurrowedAttackDefenseV1(
    kernel(state, { procedureKind: "evaluate_hidden_burrowed_attack_defense",
      targetPieceId: "target", attackKind, attackEventHash })) };
}
state = stateFor([], ["hidden"]);
let row = defense(state, "impact", { type: "impact_pending", targetPieceId: "target" });
assert.equal(row.result.impactImmune, true);
state = stateFor([], ["hidden"]);
row = defense(state, "targeting_attack", { type: "attack_targeted",
  targetPieceId: "target" }); assert.equal(row.result.evadeEligible, true);
state = stateFor([], ["burrowed"]);
row = defense(state, "targeting_attack", { type: "attack_targeted",
  targetPieceId: "target" }); assert.equal(row.result.evadeEligible, true);
state = stateFor([], ["burrowed", "hidden"]);
row = defense(state, "targeting_attack", { type: "attack_targeted",
  targetPieceId: "target" }); assert.equal(row.result.evadeOpportunityCount, 1);
const second = defense(state, "targeting_attack", { type: "attack_targeted",
  targetPieceId: "target", attackOrdinal: 2 });
assert.equal(second.result.evadeOpportunityCount, 1);
state.hiddenBurrowedHistory.push({ result: { attackEventHash: row.attackEventHash } });
assert.throws(() => resolveOfficialHiddenBurrowedAttackDefenseV1(kernel(state, {
  procedureKind: "evaluate_hidden_burrowed_attack_defense", targetPieceId: "target",
  attackKind: "targeting_attack", attackEventHash: row.attackEventHash,
})), /ALREADY_RESOLVED/u);
state = stateFor(); row = defense(state, "targeting_attack",
  { type: "attack_targeted", targetPieceId: "target" });
assert.equal(row.result.damageResolutionDirective, "ordinary_resolution");
accept("25_hidden_unit_is_immune_to_impact",
  "26_hidden_grants_evade_for_each_targeting_attack",
  "27_burrowed_grants_evade_for_each_targeting_attack",
  "28_hidden_and_burrowed_do_not_duplicate_evade_for_same_attack",
  "29_separate_targeting_attack_event_gets_separate_evade_opportunity",
  "30_same_attack_event_cannot_receive_duplicate_defense_resolution",
  "31_unit_without_hidden_or_burrowed_uses_ordinary_attack_resolution");

state = stateFor([], ["burrowed"]); state.pieces[1].models[0].xInches = 12;
function movement(endX) {
  return resolveOfficialBurrowedMovementPassThroughV1(kernel(state, {
    procedureKind: "evaluate_burrowed_movement_pass_through", movingPieceId: "actor",
    movingModelId: "actor-model", burrowedPieceId: "target",
    pathPoints: [{ xMilliInches: 10000, yMilliInches: 10000 },
      { xMilliInches: endX, yMilliInches: 10000 }],
  }));
}
result = movement(16000);
assert.equal(result.assessments[0].pathCrossesBase, true);
assert.equal(result.endpointLegal, true);
const [actorModel, targetModel] = state.pieces.map((entry) => entry.models[0]);
const inside = Math.round((12 + (actorModel.baseWidthInches + targetModel.baseWidthInches) / 2
  + 0.999) * 1000);
result = movement(inside);
assert.equal(result.endpointLegal, false);
assert.equal(result.otherMovementGeometryStillRequiredByExistingConsumer, true);
accept("32_models_may_cross_a_burrowed_model_base",
  "33_endpoint_beyond_burrowed_engagement_range_is_legal",
  "34_endpoint_within_burrowed_engagement_range_is_illegal",
  "35_burrowed_certificate_does_not_bypass_other_movement_geometry");

state = stateFor([], ["burrowed"]);
result = resolveOfficialBurrowedPermissionsV1(kernel(state, {
  procedureKind: "derive_burrowed_permissions", pieceId: "target",
}));
assert.equal(result.effectiveSize, 0); assert.equal(result.disengageCurrentSupply, 0);
assert.deepEqual(result.permittedActionTypes,
  ["close_ranks", "deploy", "disengage", "hold", "move", "run"]);
assert.equal(result.holdPreservesBurrowed, true);
assert.equal(result.specialAbilitiesAllowedByDefault, true);
assert.equal(result.missionControlProhibitedByExistingExecutableAtom, true);
accept("36_burrowed_effective_size_is_zero_for_all_purposes",
  "37_burrowed_current_supply_is_zero_for_disengage",
  "38_burrowed_action_whitelist_is_exact",
  "39_hold_is_only_whitelisted_action_that_preserves_burrowed",
  "40_burrowed_units_retain_special_abilities_by_default",
  "41_existing_burrowed_mission_control_prohibition_is_retained");

state = stateFor([], ["burrowed", "hidden"]); state.phase = "combat";
const combatHash = witness(state, { type: "combat_phase_start_engagement",
  engagedUnitIds: ["actor", "target"] });
function combat(extra) {
  return resolveOfficialBurrowedCombatActivationV1(kernel(state, {
    procedureKind: "evaluate_burrowed_combat_activation", pieceId: "target",
    combatStartEventHash: combatHash, ...extra,
  }));
}
result = combat({ role: "burrowed_actor" });
assert.equal(result.mustActivate && !result.closeCombatAttackAllowed, true);
state.pieces[1].statuses = [];
const closeRanksEventHash = witness(state, { type: "close_ranks_resolved",
  pieceId: "target", burrowedRemoved: true });
assert.equal(combat({ role: "burrowed_actor", closeRanksEventHash })
  .closeCombatAttackAllowed, true);
state.pieces[1].statuses = ["burrowed", "hidden"];
assert.equal(combat({ role: "enemy_attacking_burrowed" }).enemyAttacksNormally, true);
assert.throws(() => resolveOfficialBurrowedCombatActivationV1(kernel(state, {
  procedureKind: "evaluate_burrowed_combat_activation", pieceId: "target",
  role: "burrowed_actor", combatStartEventHash: "0".repeat(64),
})), /BURROWED_COMBAT_START_EVENT_INVALID/u);
assert.equal(bundle.sourceReconciliation.silentSourceMergeAllowed, false);
accept("42_engaged_burrowed_unit_must_activate_but_cannot_attack",
  "43_hash_bound_close_ranks_removal_allows_following_close_combat_attack",
  "44_engaged_enemy_may_attack_burrowed_unit_normally",
  "45_forged_combat_start_witness_fails_closed",
  "46_source_reconciliation_never_silently_merges_missing_command_center_rule");

function procedure(stateInput, kind, extra = {}) {
  return { procedureKind: kind, sideKey: stateInput.activeSideKey,
    rulesDenominatorComplete: true, ...extra };
}
const dataHash = hashStarcraftTmgContract(fixture.gameplayDataBundle);
const binding = { bindingHash: "slice-99-hidden-burrowed-binding",
  dataSnapshotHash: dataHash,
  rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
  dependencies: { dataSnapshot: { contentHash: dataHash } } };
state = stateFor();
const gainHash = witness(state, { type: "burrowed_gained", pieceId: "target" });
const opened = openOfficialHiddenBurrowedRulesPendingV1(state,
  procedure(state, "reconcile_burrowed_hidden_lifecycle", { pieceId: "target",
    triggerKind: "gain_burrowed", triggerEventHash: gainHash }));
const domain = runtime.enumerate(opened.state, { sideKey: "player1", includeDisabled: true,
  matchBinding: binding }).parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_HIDDEN_BURROWED_RULES_PARAMETER_KIND));
assert(domain);
const instantiated = runtime.instantiate(opened.state, domain,
  { choiceId: domain.constraints.choices[0].choiceId }, { matchBinding: binding });
const applied = runtime.apply(opened.state, instantiated.action, { matchBinding: binding });
assert.deepEqual(applied.state.pieces[1].statuses.map((entry) => entry.name),
  ["burrowed", "hidden"]);
const drifted = structuredClone(opened.state); drifted.pieces[1].currentSupply += 1;
assert.equal(runtime.enumerate(drifted, { sideKey: "player1", includeDisabled: true,
  matchBinding: binding }).candidates[0].disabledReason, "HIDDEN_BURROWED_PENDING_INVALID");
assert.throws(() => runtime.apply(opened.state, { ...instantiated.action, ruleAtomIds: [] },
  { matchBinding: binding }), /RULE_RUNTIME_ACTION_LINEAGE_MISMATCH/u);
const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
assert(graph.coverageScopes.some((entry) => (
  entry.scopeId === OFFICIAL_HIDDEN_BURROWED_RULES_RELATIONSHIP_SCOPE_ID)));
accept("47_runtime_exposes_hash_bound_hidden_burrowed_parameter_domain",
  "48_runtime_apply_commits_rules_owned_status_mutation",
  "49_state_drift_and_forged_atom_lineage_fail_closed",
  "50_relationship_graph_covers_new_executor_and_frozen_consumers");

function engineFor(keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    cryptoOptions: { keyId: "ticket-11-slice-99-hidden-burrowed",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 99 Hidden/Burrowed rules.";
function envelopeFor(engine, stateInput) {
  return engine.createEnvelope({ roomId: "official-slice-99-hidden-burrowed-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-hidden-burrowed-geometry-v1",
        content: { kind: "geometry-artifact",
          geometryVersion: "hidden_burrowed_base_edge_geometry_v1" } },
      rulesDisplay: { artifactId: "official-slice-99-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "official-slice-99-action-schema-v37",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v37" } },
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
      geometryVersion: "hidden_burrowed_base_edge_geometry_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v37" },
  };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}
const keys = generateKeyPairSync("ed25519");
const authority = engineFor(keys, "slice-99-hidden-burrowed-short-seal-v1");
state = stateFor();
const authorityGainHash = witness(state, { type: "burrowed_gained", pieceId: "target" });
const seed = envelopeFor(authority, state);
const authorityOpened = openOfficialHiddenBurrowedRulesPendingV1(seed.state,
  procedure(seed.state, "reconcile_burrowed_hidden_lifecycle", { pieceId: "target",
    triggerKind: "gain_burrowed", triggerEventHash: authorityGainHash }));
const initialEnvelope = authority.createEnvelope({ roomId: seed.roomId,
  matchBinding: seed.matchBinding, state: authorityOpened.state });
registerReplay(authority, initialEnvelope);
const seat = authority.issueSeatAuthority({ grantId: "slice-99-hidden-burrowed-grant",
  roomId: initialEnvelope.roomId, matchBindingHash: initialEnvelope.matchBindingHash,
  seatKey: "player1", roleMode: "player", principalType: "human",
  capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
const lease = authority.issueControlLease({ seatAuthority: seat,
  sessionId: "slice-99-hidden-burrowed-session", leaseFence: 1,
  issuedAtRoomRevision: initialEnvelope.stateRevision });
const space = authority.legalSpace(initialEnvelope, { seatAuthority: seat });
const authorityDomain = space.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_HIDDEN_BURROWED_RULES_PARAMETER_KIND));
const preview = authority.preview({ envelope: initialEnvelope, seatAuthority: seat,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: { choiceId: authorityDomain.constraints.choices[0].choiceId } } });
const confirmation = authority.confirmPreview({ envelope: initialEnvelope,
  preview: preview.preview, seatAuthority: seat });
const authoritativeApplied = authority.apply({ envelope: initialEnvelope,
  expectedStateRevision: initialEnvelope.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: seat, controlLease: lease,
  idempotencyKey: "slice-99-hidden-burrowed" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
const replay = engineFor(keys, "slice-99-hidden-burrowed-rotated-seal-v2");
registerReplay(replay, initialEnvelope);
assert.equal(replay.replay({ initialEnvelope,
  journal: [authoritativeApplied.receipt] }).ok, true);
accept("51_authority_preview_confirm_apply_and_replay_survive_hmac_rotation");
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_hidden_burrowed_event" });
assert.equal(replay.replay({ initialEnvelope, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
accept("52_ed25519_replay_rejects_tampered_hidden_burrowed_receipt");

assert.equal(acceptance.length, 52);
const report = {
  schema: "starcraft_tmg_official_hidden_burrowed_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit, hiddenBurrowedDataBundle: bundle,
  remainingRouteV2Hash: route.routeHash, slice, sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash, catalogueHash: slice.catalogueHash,
  graph, graphAudit: audit.graphAudit, coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true,
    historicalRulesDisplayRetained: true },
  boundaries: { currentOfficialBurrowedCarrierAvailable: false,
    currentHiddenDefinitionCount: bundle.hiddenDefinitionIndex.length,
    existingConsumersFrozen: true },
  ctx2skill: slice.ctx2skill, harness: slice.harness,
  rulesEligible: false, productionRoomEligible: false,
  rulesTruth: "official_hidden_burrowed_rules_state_transition_conformance",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-hidden-burrowed-rules-rule-slice-v1-report.json"),
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
