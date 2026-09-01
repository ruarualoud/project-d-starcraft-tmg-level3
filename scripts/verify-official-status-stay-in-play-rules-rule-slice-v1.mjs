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
  OFFICIAL_STATUS_STAY_IN_PLAY_RULES_NEW_ATOM_IDS,
  OFFICIAL_STATUS_STAY_IN_PLAY_RULES_PARAMETER_KIND,
  openOfficialStatusStayInPlayRulesPendingV1,
} from "../packages/rule-atoms/official-status-stay-in-play-rules-executor-v1.mjs";
import {
  resolveOfficialOnCreepStateV1,
  resolveOfficialShieldedDependenciesV1,
  resolveOfficialSiegeModeReserveRemovalV1,
  resolveOfficialSiegeModeRulesV1,
  resolveOfficialStatusCleanupReconciliationV1,
} from "../packages/rule-atoms/official-status-stay-in-play-rules-kernel-v1.mjs";
import { OFFICIAL_STATUS_STAY_IN_PLAY_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-status-stay-in-play-rules-relationship-contract-v1.mjs";
import {
  createOfficialStatusStayInPlayRulesRuleSliceV1,
  verifyOfficialStatusStayInPlayRulesRuleSliceV1,
} from "../packages/rule-atoms/official-status-stay-in-play-rules-rule-slice-v1.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { getOfficialCurrentProductRecord } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { getOfficialModelBaseGeometryProfileV1 } from
  "../packages/source-data/official-model-base-geometry-data-bundle-v1.mjs";
import {
  createOfficialStatusStayInPlayDataBundleV1,
  verifyOfficialStatusStayInPlayDataBundleV1,
} from "../packages/source-data/official-status-stay-in-play-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-unit-destruction-lifecycle-rules-rule-slice-v1-report.json"), "utf8"));
const routeBaseReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-elevation-effective-size-rules-rule-slice-v1-report.json"), "utf8"));
const acceptance = [];
function accept(name) { acceptance.push(name); }

const slice = createOfficialStatusStayInPlayRulesRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialStatusStayInPlayRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 729,
  newlyExecutableRuleAtoms: 12, reviewRequiredRuleAtoms: 183,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 729,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 67, missingStateContractExecutors: 0 });
accept("01_slice98_promotes_exact_12_route_atoms_to_729_executable");

const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 98);
assert.deepEqual(assignment.atomIds, [...OFFICIAL_STATUS_STAY_IN_PLAY_RULES_NEW_ATOM_IDS]);
assert.deepEqual({ executable: assignment.executableAfter,
  review: assignment.reviewRequiredAfter }, { executable: 729, review: 183 });
accept("02_route_v2_exact_slice98_atom_identity_and_counts_match");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executorManifest.length, 67);
accept("03_runtime_exposes_status_stay_in_play_as_executor_67");
const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const bundle = createOfficialStatusStayInPlayDataBundleV1({ dataset: fixture.dataset });
assert.equal(verifyOfficialStatusStayInPlayDataBundleV1(bundle), true);
assert.equal(bundle.bundleHash,
  "088ee125508854928763f78801821f67cdc05081916ada89563fc362294cf865");
accept("04_status_stay_in_play_bundle_is_content_hash_verified");
assert.deepEqual(bundle.ruleClauses.map((entry) => entry.atomId).sort(),
  [...OFFICIAL_STATUS_STAY_IN_PLAY_RULES_NEW_ATOM_IDS]);
accept("05_twelve_exact_part11_clause_boundaries_cover_route_atoms");
assert.equal(bundle.ruleSectionRecord.recordKey, "rules_sections:FuahgilWtc8nccVSp2Vv");
assert.equal(bundle.ruleSectionRecord.title, "PART 11: KEYWORD GLOSSARY AND DEFINITIONS");
accept("06_official_part11_record_identity_is_pinned");
assert.equal(bundle.ruleClauses.every((entry) => (
  entry.sourceTextHashes.every((hash) => /^[a-f0-9]{64}$/u.test(hash))
    && entry.candidateSequenceHashes.every((hash) => /^[a-f0-9]{64}$/u.test(hash))
)), true);
accept("07_each_clause_binds_source_text_and_candidate_sequence_hashes");
assert.equal(bundle.sourcePolicy.refreshDuringDevelopment, false);
assert.equal(bundle.sourcePolicy.repositoryFallbackAllowed, false);
accept("08_source_lock_remains_offline_without_refresh_or_repository_fallback");
assert.equal(bundle.zergGroundUnitProfiles.length, 12);
accept("09_current_ground_zerg_profile_denominator_is_twelve");
assert.equal(bundle.onCreepDependencyIndex.length, 10);
accept("10_current_on_creep_dependency_definition_denominator_is_ten");
assert.equal(bundle.omegaWormSourceOfCreep.recordKey, "army_units:omega_worm");
assert.equal(bundle.omegaWormSourceOfCreep.rangeMilliInches, 6000);
accept("11_omega_worm_source_of_creep_identity_and_range_are_pinned");
assert.deepEqual({ tumor: bundle.creepTumorGeometryRegistry.entries.length,
  siege: bundle.siegeModeCarrierRegistry.entries.length,
  shielded: bundle.shieldedDependentAbilityRegistry.entries.length },
{ tumor: 0, siege: 0, shielded: 0 });
accept("12_missing_current_carriers_and_tumor_geometry_are_explicitly_quarantined");

function officialPiece(recordKey, id, sideKey, positions, extra = {}) {
  const record = getOfficialCurrentProductRecord(fixture.dataset, recordKey);
  const profile = getOfficialModelBaseGeometryProfileV1(
    bundle.modelBaseGeometryDataBundle, recordKey,
  );
  const combatTags = String(record.payload.tags || "").split(/\s*,\s*/u)
    .map((entry) => entry.toLowerCase()).filter(Boolean).sort();
  return {
    id, name: record.payload.name, sideKey, officialUnitRecordKey: recordKey,
    sourceRecordHash: record.sourceRecordHash,
    officialPayloadHash: record.payloadHash,
    currentModels: positions.length, maxModels: positions.length, currentSupply: 0,
    destroyedModelIds: [], isOnField: true, isInReserves: false,
    isDestroyed: false, combatTag: combatTags.includes("ground") ? "ground" : "",
    combatTags, statuses: [], derivedKeywords: [], selectedUpgradeNames: [],
    abilityEffects: [], combatEffects: [], assaultEffects: [], timedEffects: [],
    damageMarker: 0, activatedPhases: { movement: false, assault: false, combat: false },
    models: positions.map((point, index) => ({ id: `${id}-model-${index + 1}`,
      xInches: point.xInches, yInches: point.yInches,
      baseShape: profile.baseShape,
      baseWidthInches: profile.baseWidthMilliInches / 1000,
      baseDepthInches: profile.baseDepthMilliInches / 1000,
      baseRotationDegrees: 0, elevation: "ground", supportTerrainIds: [],
      adjacentAccessPointIds: [], isOnField: true, isDestroyed: false })),
    ...structuredClone(extra),
  };
}
function stateFor() {
  const state = fixture.battleState({ round: 2, activeSideKey: "player1" });
  state.rulesProcedureMode = true;
  state.officialStatusStayInPlayDataBundle = bundle;
  state.statusStayInPlayHistory = [];
  state.players.player1.faction = "Zerg";
  state.players.player2.faction = "Zerg";
  state.pieces = [
    officialPiece("army_units:queen", "queen", "player1",
      [{ xInches: 10, yInches: 10 }]),
    officialPiece("army_units:omega_worm", "omega", "player2",
      [{ xInches: 15, yInches: 10 }]),
  ];
  return state;
}
function kernel(state, extra = {}) {
  return { state, statusStayInPlayDataBundle: bundle,
    rulesOwnedStateRequested: true, ...extra };
}
function procedure(state, procedureKind, extra = {}) {
  return { procedureKind, sideKey: state.activeSideKey,
    rulesDenominatorComplete: true, ...extra };
}
function bindingFor() {
  const dataHash = hashStarcraftTmgContract(fixture.gameplayDataBundle);
  return { bindingHash: "slice-98-status-stay-in-play-binding",
    dataSnapshotHash: dataHash,
    rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
    dependencies: { dataSnapshot: { contentHash: dataHash } } };
}
function domainFor(state, binding) {
  return runtime.enumerate(state, { sideKey: state.activeSideKey,
    includeDisabled: true, matchBinding: binding }).parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_STATUS_STAY_IN_PLAY_RULES_PARAMETER_KIND));
}
function applyProcedure(state, procedureKind, extra, binding) {
  const opened = openOfficialStatusStayInPlayRulesPendingV1(state,
    procedure(state, procedureKind, extra));
  const domain = domainFor(opened.state, binding);
  assert(domain);
  const instantiated = runtime.instantiate(opened.state, domain,
    { choiceId: domain.constraints.choices[0].choiceId }, { matchBinding: binding });
  return { opened, domain, instantiated,
    applied: runtime.apply(opened.state, instantiated.action,
      { matchBinding: binding }) };
}

const cleanupState = stateFor();
cleanupState.phase = "cleanup";
cleanupState.pieces[0].statuses = ["siege_mode",
  { id: "cleanup-status", expiresAt: "cleanup_and_refresh" }];
cleanupState.pieces[0].abilityEffects = [
  { id: "persistent-ability", stayInPlay: true },
  { id: "cleanup-ability", removalStep: "cleanup_and_refresh" },
];
cleanupState.board.effectMarkers = [
  { id: "mode-marker", markerType: "mode", status: "siege_mode" },
  { id: "cleanup-marker", markerType: "status", removeAt: "cleanup_and_refresh" },
];
cleanupState.board.tokens = [
  { id: "stay-token", stayInPlay: true },
  { id: "cleanup-token", expiresAt: "cleanup_and_refresh" },
];
const cleanup = resolveOfficialStatusCleanupReconciliationV1(kernel(cleanupState, {
  procedureKind: "reconcile_status_cleanup", cleanupAndRefreshWindow: true,
}));
assert.equal(cleanup.statusRows.find((entry) => entry.statusName === "siege_mode").outcome,
  "preserved");
accept("13_status_persists_through_cleanup_by_default");
assert.equal(cleanup.statusRows.find((entry) => entry.entryId === "cleanup-status").outcome,
  "removed");
accept("14_explicit_cleanup_status_removal_condition_still_applies");
assert.equal(cleanup.abilityEffectRows.find((entry) => (
  entry.entryId === "persistent-ability")).outcome, "preserved");
accept("15_stay_in_play_ability_effect_persists");
assert.equal(cleanup.abilityEffectRows.find((entry) => (
  entry.entryId === "cleanup-ability")).outcome, "removed");
accept("16_explicit_cleanup_ability_removal_condition_applies");
assert.equal(cleanup.markerRows.find((entry) => entry.id === "mode-marker").outcome,
  "preserved");
accept("17_mode_marker_is_a_status_marker_with_stay_in_play");
assert.deepEqual(cleanup.mutation.removeEffectMarkerIds, ["cleanup-marker"]);
accept("18_only_explicitly_expiring_marker_is_removed");
assert.equal(cleanup.tokenRows.find((entry) => entry.id === "stay-token").outcome,
  "preserved");
accept("19_stay_in_play_token_persists");
assert.deepEqual(cleanup.mutation.removeBoardTokenIds, ["cleanup-token"]);
accept("20_only_explicitly_expiring_token_is_removed");
assert.equal(cleanup.clientSuppliedMutationAccepted, false);
assert.equal(cleanup.specificRemovalConditionsStillApply, true);
accept("21_cleanup_mutation_is_rules_owned_and_condition_specific");

const creepState = stateFor();
const onCreep = resolveOfficialOnCreepStateV1(kernel(creepState, {
  procedureKind: "derive_on_creep_state", pieceId: "queen",
}));
assert.equal(onCreep.onCreep, true);
accept("22_ground_zerg_unit_within_omega_source_counts_as_on_creep");
assert.deepEqual(onCreep.mutation.piecePatches[0].set.derivedKeywords, ["on_creep"]);
accept("23_on_creep_keyword_is_added_by_rules_owned_patch");
assert.equal(onCreep.sourceAssessments[0].sourcePieceId, "omega");
assert.equal(onCreep.sourceAssessments[0].unitWithin, true);
accept("24_on_creep_receipt_contains_exact_source_model_geometry_assessment");
assert.equal(onCreep.dependentRuleDefinitions.length, 10);
assert.equal(onCreep.dependentRulesEnabledByKeywordOnly, true);
accept("25_on_creep_dependency_index_is_enabled_only_by_derived_keyword");
const farState = stateFor();
farState.pieces[0].derivedKeywords = ["on_creep", "other"];
farState.pieces[1].models[0].xInches = 30;
const offCreep = resolveOfficialOnCreepStateV1(kernel(farState, {
  procedureKind: "derive_on_creep_state", pieceId: "queen",
}));
assert.equal(offCreep.onCreep, false);
assert.deepEqual(offCreep.mutation.piecePatches[0].set.derivedKeywords, ["other"]);
accept("26_leaving_all_creep_sources_removes_only_derived_on_creep_keyword");
assert.equal(onCreep.friendlyOrEnemyAllowed, true);
assert.notEqual(creepState.pieces[0].sideKey, creepState.pieces[1].sideKey);
accept("27_enemy_omega_worm_source_is_valid_under_friendly_or_enemy_rule");
const tumorState = farState;
tumorState.board.tokens.push({ id: "tumor", tokenType: "creep_tumor" });
assert.throws(() => resolveOfficialOnCreepStateV1(kernel(tumorState, {
  procedureKind: "derive_on_creep_state", pieceId: "queen",
})), /ON_CREEP_TUMOR_GEOMETRY_UNAVAILABLE/u);
accept("28_creep_tumor_without_official_physical_geometry_fails_closed");
const marineState = stateFor();
marineState.pieces[0] = officialPiece("army_units:marine", "marine", "player1",
  [{ xInches: 10, yInches: 10 }]);
assert.throws(() => resolveOfficialOnCreepStateV1(kernel(marineState, {
  procedureKind: "derive_on_creep_state", pieceId: "marine",
})), /ON_CREEP_GROUND_ZERG_UNIT_REQUIRED/u);
accept("29_non_ground_zerg_unit_cannot_receive_on_creep");

const siegeState = stateFor();
const siegePiece = siegeState.pieces[0];
siegePiece.statuses = [{ id: "siege", statusName: "siege_mode" }];
siegePiece.siegeModeProfileSet = [
  { profileId: "ordinary", profileName: "Rifle", requiresSiegeMode: false },
  { profileId: "siege", profileName: "Siege Cannon", requiresSiegeMode: true },
];
siegePiece.siegeModeProfileSetHash = hashStarcraftTmgContract(
  siegePiece.siegeModeProfileSet,
);
const siege = resolveOfficialSiegeModeRulesV1(kernel(siegeState, {
  procedureKind: "evaluate_siege_mode_rules", pieceId: "queen",
}));
assert.deepEqual(siege.forbiddenActionTypes,
  ["charge", "close_ranks", "disengage", "move", "run"]);
accept("30_siege_mode_blocks_all_five_official_action_classes");
assert.deepEqual(siege.profileEligibility.filter((entry) => entry.eligible)
  .map((entry) => entry.profileId), ["siege"]);
accept("31_siege_mode_enables_siege_profile_and_disables_other_weapon");
const ordinaryState = structuredClone(siegeState);
ordinaryState.pieces[0].statuses = [];
const ordinary = resolveOfficialSiegeModeRulesV1(kernel(ordinaryState, {
  procedureKind: "evaluate_siege_mode_rules", pieceId: "queen",
}));
assert.deepEqual(ordinary.forbiddenActionTypes, []);
assert.deepEqual(ordinary.profileEligibility.filter((entry) => entry.eligible)
  .map((entry) => entry.profileId), ["ordinary"]);
accept("32_outside_siege_mode_ordinary_profile_is_eligible_and_actions_unblocked");
assert.equal(siege.currentOfficialCarrierAvailable, false);
assert.equal(siege.productionCarrierQuarantined, true);
accept("33_generic_siege_harness_is_executable_but_production_carrier_is_quarantined");
const forgedProfiles = structuredClone(siegeState);
forgedProfiles.pieces[0].siegeModeProfileSetHash = "0".repeat(64);
assert.throws(() => resolveOfficialSiegeModeRulesV1(kernel(forgedProfiles, {
  procedureKind: "evaluate_siege_mode_rules", pieceId: "queen",
})), /SIEGE_MODE_PROFILE_SET_INVALID/u);
accept("34_unhashed_or_drifted_siege_profile_set_is_rejected");
const reserveState = structuredClone(siegeState);
reserveState.pieces[0].isOnField = false;
reserveState.pieces[0].isInReserves = true;
reserveState.board.effectMarkers = [{ id: "siege-marker", markerType: "mode",
  status: "siege_mode", targetPieceId: "queen" }];
const reserve = resolveOfficialSiegeModeReserveRemovalV1(kernel(reserveState, {
  procedureKind: "remove_siege_mode_on_reserve", pieceId: "queen",
}));
assert.deepEqual(reserve.mutation.piecePatches[0].set.statuses, []);
accept("35_return_to_reserves_removes_siege_mode_status");
assert.deepEqual(reserve.mutation.removeEffectMarkerIds, ["siege-marker"]);
accept("36_return_to_reserves_removes_matching_siege_mode_marker");

const shieldState = stateFor();
const shieldPiece = shieldState.pieces[0];
shieldPiece.abilityEffects = [
  { id: "shield-only", requiresStatus: "shielded" },
  { id: "independent", stayInPlay: true },
];
shieldPiece.combatEffects = [{ id: "shield-combat", requiredStatus: "shielded" }];
shieldState.board.effectMarkers = [{ id: "shield-marker", targetPieceId: "queen",
  requiresStatus: "shielded" }, { id: "other-marker", targetPieceId: "queen" }];
const shieldLossEvent = { type: "damage_resolved", targetPieceId: "queen",
  shieldedLifecycle: { shieldedLost: true, shieldedAfter: false,
    shieldLossReason: "remaining_hit_points_removed" } };
shieldState.log.push({ type: "combat", events: [shieldLossEvent] });
const shield = resolveOfficialShieldedDependenciesV1(kernel(shieldState, {
  procedureKind: "resolve_shielded_dependencies", pieceId: "queen",
  triggerEventHash: hashStarcraftTmgContract(shieldLossEvent),
}));
assert.deepEqual(shield.endedEffects.map((entry) => entry.effectId).sort(),
  ["shield-combat", "shield-only"]);
accept("37_shield_loss_ends_every_requires_shielded_effect_across_effect_fields");
assert.deepEqual(shield.mutation.piecePatches[0].set.abilityEffects,
  [{ id: "independent", stayInPlay: true }]);
accept("38_shield_loss_preserves_non_dependent_effects");
assert.deepEqual(shield.mutation.removeEffectMarkerIds, ["shield-marker"]);
accept("39_shield_loss_removes_only_requires_shielded_marker");
assert.throws(() => resolveOfficialShieldedDependenciesV1(kernel(shieldState, {
  procedureKind: "resolve_shielded_dependencies", pieceId: "queen",
  triggerEventHash: "0".repeat(64),
})), /SHIELDED_DEPENDENCY_TRIGGER_INVALID/u);
accept("40_forged_shield_loss_event_hash_is_rejected");
const stillShielded = structuredClone(shieldState);
stillShielded.pieces[0].statuses = ["shielded"];
assert.throws(() => resolveOfficialShieldedDependenciesV1(kernel(stillShielded, {
  procedureKind: "resolve_shielded_dependencies", pieceId: "queen",
  triggerEventHash: hashStarcraftTmgContract(shieldLossEvent),
})), /SHIELDED_DEPENDENCY_TRIGGER_INVALID/u);
accept("41_dependencies_cannot_end_while_piece_still_has_shielded");

const binding = bindingFor();
const flow = applyProcedure(cleanupState, "reconcile_status_cleanup",
  { cleanupAndRefreshWindow: true }, binding);
assert.equal(flow.domain.constraints.procedureKind, "reconcile_status_cleanup");
assert.equal(flow.domain.parameterKind, OFFICIAL_STATUS_STAY_IN_PLAY_RULES_PARAMETER_KIND);
accept("42_runtime_exposes_hash_bound_status_parameter_domain");
assert.deepEqual(flow.applied.state.pieces[0].statuses, ["siege_mode"]);
assert.deepEqual(flow.applied.state.board.tokens.map((entry) => entry.id), ["stay-token"]);
assert.deepEqual(flow.applied.state.board.effectMarkers.map((entry) => entry.id),
  ["mode-marker"]);
accept("43_runtime_apply_commits_exact_cleanup_mutation_and_preserves_stay_in_play");
const drifted = structuredClone(flow.opened.state);
drifted.pieces[0].statuses.push({ id: "late-drift" });
assert.equal(runtime.enumerate(drifted, { sideKey: "player1", includeDisabled: true,
  matchBinding: binding }).candidates[0].disabledReason,
"STATUS_STAY_IN_PLAY_PENDING_INVALID");
assert.throws(() => runtime.apply(flow.opened.state, {
  ...flow.instantiated.action, ruleAtomIds: [],
}, { matchBinding: binding }), /RULE_RUNTIME_ACTION_LINEAGE_MISMATCH/u);
accept("44_state_drift_and_forged_atom_lineage_fail_closed");

const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
const scope = graph.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_STATUS_STAY_IN_PLAY_RULES_RELATIONSHIP_SCOPE_ID));
assert(scope);
assert.equal(scope.forbiddenPaths.length, 1);

function engineFor(keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    cryptoOptions: { keyId: "ticket-11-slice-98-status-stay-in-play",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 98 status rules.";
function envelopeFor(engine, stateInput) {
  return engine.createEnvelope({ roomId: "official-slice-98-status-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-status-geometry-v1",
        content: { kind: "geometry-artifact",
          geometryVersion: "status_omega_source_geometry_v1" } },
      rulesDisplay: { artifactId: "official-slice-98-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "official-slice-98-action-schema-v36",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v36" } },
    }, state: stateInput });
}
function registerReplay(engine, initial) {
  const entries = {
    sourceSnapshot: fixture.snapshot, dataSnapshot: fixture.gameplayDataBundle,
    rulesArtifact: { kind: "rules-artifact",
      rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: initial.matchBinding.rulesRuntimeBinding },
    executorArtifact: { kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: initial.matchBinding.rulesRuntimeBinding.runtimeHash,
      catalogueHash: initial.matchBinding.rulesRuntimeBinding.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest },
    geometryArtifact: { kind: "geometry-artifact",
      geometryVersion: "status_omega_source_geometry_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v36" },
  };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}
const keys = generateKeyPairSync("ed25519");
const authority = engineFor(keys, "slice-98-status-short-seal-v1");
const authorityState = stateFor();
const seed = envelopeFor(authority, authorityState);
const authorityOpened = openOfficialStatusStayInPlayRulesPendingV1(seed.state,
  procedure(seed.state, "derive_on_creep_state", { pieceId: "queen" }));
const initialEnvelope = authority.createEnvelope({ roomId: seed.roomId,
  matchBinding: seed.matchBinding, state: authorityOpened.state });
registerReplay(authority, initialEnvelope);
const seat = authority.issueSeatAuthority({ grantId: "slice-98-status-grant",
  roomId: initialEnvelope.roomId,
  matchBindingHash: initialEnvelope.matchBindingHash,
  seatKey: "player1", roleMode: "player", principalType: "human",
  capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
const lease = authority.issueControlLease({ seatAuthority: seat,
  sessionId: "slice-98-status-session", leaseFence: 1,
  issuedAtRoomRevision: initialEnvelope.stateRevision });
const space = authority.legalSpace(initialEnvelope, { seatAuthority: seat });
const authorityDomain = space.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_STATUS_STAY_IN_PLAY_RULES_PARAMETER_KIND));
assert(authorityDomain);
const preview = authority.preview({ envelope: initialEnvelope, seatAuthority: seat,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: { choiceId: authorityDomain.constraints.choices[0].choiceId } } });
const confirmation = authority.confirmPreview({ envelope: initialEnvelope,
  preview: preview.preview, seatAuthority: seat });
const authoritativeApplied = authority.apply({ envelope: initialEnvelope,
  expectedStateRevision: initialEnvelope.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: seat, controlLease: lease,
  idempotencyKey: "slice-98-status" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
const replay = engineFor(keys, "slice-98-status-rotated-seal-v2");
registerReplay(replay, initialEnvelope);
assert.equal(replay.replay({ initialEnvelope,
  journal: [authoritativeApplied.receipt] }).ok, true);
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_status_event" });
assert.equal(replay.replay({ initialEnvelope, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
accept("45_relationship_graph_and_authority_apply_replay_are_valid_and_tamper_evident");

assert.equal(acceptance.length, 45);
const report = {
  schema: "starcraft_tmg_official_status_stay_in_play_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit,
  statusStayInPlayDataBundle: bundle,
  remainingRouteV2Hash: route.routeHash, slice, sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash, catalogueHash: slice.catalogueHash,
  graph, graphAudit: audit.graphAudit, coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true,
    historicalRulesDisplayRetained: true },
  boundaries: { currentOfficialSiegeCarrierAvailable: false,
    creepTumorGeometryAvailable: false, genericSiegeHarnessOnly: true,
    existingConsumersFrozen: true },
  ctx2skill: slice.ctx2skill, harness: slice.harness,
  rulesEligible: false, productionRoomEligible: false,
  rulesTruth: "official_status_stay_in_play_rules_state_transition_conformance",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-status-stay-in-play-rules-rule-slice-v1-report.json"),
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
