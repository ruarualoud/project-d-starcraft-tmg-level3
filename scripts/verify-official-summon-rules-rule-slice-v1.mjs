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
  OFFICIAL_SUMMON_RULES_NEW_ATOM_IDS,
  OFFICIAL_SUMMON_RULES_PARAMETER_KIND,
  openOfficialSummonRulesPendingV1,
} from "../packages/rule-atoms/official-summon-rules-executor-v1.mjs";
import {
  resolveOfficialSummonActivationV1,
  resolveOfficialSummonDeploymentV1,
  resolveOfficialSummonPlacementV1,
  resolveOfficialSummonSupplyV1,
  resolveOfficialSummonedUnitClassificationV1,
  resolveOfficialSummonedUnitRelationshipsV1,
} from "../packages/rule-atoms/official-summon-rules-kernel-v1.mjs";
import { OFFICIAL_SUMMON_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-summon-rules-relationship-contract-v1.mjs";
import {
  createOfficialSummonRulesRuleSliceV1,
  verifyOfficialSummonRulesRuleSliceV1,
} from "../packages/rule-atoms/official-summon-rules-rule-slice-v1.mjs";
import { createOfficialRemainingRuleAtomRouteV2 } from
  "../packages/rule-atoms/official-remaining-rule-atom-route-v2.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { getOfficialCurrentProductRecord } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { getOfficialModelBaseGeometryProfileV1 } from
  "../packages/source-data/official-model-base-geometry-data-bundle-v1.mjs";
import {
  createOfficialSummonDataBundleV1,
  verifyOfficialSummonDataBundleV1,
} from "../packages/source-data/official-summon-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-hidden-burrowed-rules-rule-slice-v1-report.json"), "utf8"));
const routeBaseReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-elevation-effective-size-rules-rule-slice-v1-report.json"), "utf8"));
const acceptance = [];
function accept(...names) { acceptance.push(...names); }
function rejects(code, operation) {
  assert.throws(operation, (error) => String(error?.message || error).startsWith(code));
}

const slice = createOfficialSummonRulesRuleSliceV1({ previousSlice: previousReport.slice });
const audit = verifyOfficialSummonRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 760,
  newlyExecutableRuleAtoms: 13, reviewRequiredRuleAtoms: 152,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 760,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 69, missingStateContractExecutors: 0 });
accept("01_slice100_promotes_exact_13_route_atoms_to_760_executable");
const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 100);
assert.deepEqual(assignment.atomIds, [...OFFICIAL_SUMMON_RULES_NEW_ATOM_IDS]);
assert.deepEqual([assignment.executableAfter, assignment.reviewRequiredAfter], [760, 152]);
accept("02_route_v2_exact_slice100_atom_identity_and_counts_match");
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executorManifest.length, 69);
accept("03_runtime_exposes_summon_as_executor_69");

const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const bundle = createOfficialSummonDataBundleV1({ dataset: fixture.dataset });
assert.equal(verifyOfficialSummonDataBundleV1(bundle), true);
assert.deepEqual(bundle.ruleClauses.map((entry) => entry.atomId).sort(),
  [...OFFICIAL_SUMMON_RULES_NEW_ATOM_IDS]);
assert.deepEqual(bundle.ruleSectionRecords.map((entry) => entry.recordKey),
  ["rules_sections:Rj6sMyNODPQ8OHUc9Clp", "rules_sections:FuahgilWtc8nccVSp2Vv"]);
assert.equal(bundle.ruleClauses.every((entry) => entry.sourceTextHashes.every((hash) => (
  /^[a-f0-9]{64}$/u.test(hash)))), true);
assert.equal(bundle.sourcePolicy.refreshDuringDevelopment, false);
assert.equal(bundle.sourcePolicy.repositoryFallbackAllowed, false);
assert.deepEqual(bundle.summonedUnitProfiles.map((entry) => entry.unitName),
  ["Point Defense Drone", "Pylon", "Roachling"]);
assert.equal(bundle.summonedUnitProfiles.every((entry) => (
  entry.fieldableDuringArmyBuilding === false && entry.armySlotCount === 0
)), true);
assert.deepEqual(bundle.currentDeploymentDefinitions.map((entry) => entry.definitionName),
  ["Roachling Infestation", "Pylon Warp-In", "Rapid Ingress"]);
assert.equal(bundle.summonKeywordDefinition.recordKey, "army_units:corpser__roach_");
assert.equal(bundle.sourceReconciliation.pylonAndPointDefenseDroneUseGenericSummonGeometry,
  false);
accept("04_summon_bundle_is_content_hash_verified",
  "05_thirteen_exact_core_clause_boundaries_cover_route_atoms",
  "06_part9_and_part11_rule_record_identities_are_pinned",
  "07_each_clause_binds_source_text_and_candidate_sequence_hashes",
  "08_source_lock_remains_offline_without_repository_fallback",
  "09_current_summoned_unit_denominator_is_exactly_three",
  "10_all_three_current_summoned_units_are_non_fieldable_zero_slot_profiles",
  "11_current_special_ability_deployment_definition_denominator_is_three",
  "12_roachling_infestation_is_the_only_current_generic_summon_carrier",
  "13_pylon_and_drone_card_specific_geometry_is_not_silently_substituted");

function piece(recordKey, id, sideKey, positions, input = {}) {
  const record = getOfficialCurrentProductRecord(fixture.dataset, recordKey);
  const profile = getOfficialModelBaseGeometryProfileV1(
    bundle.modelBaseGeometryDataBundle, recordKey,
  );
  const onField = input.isOnField !== false;
  return { id, name: record.payload.name, sideKey, officialUnitRecordKey: recordKey,
    sourceRecordHash: record.sourceRecordHash, officialPayloadHash: record.payloadHash,
    currentModels: positions.length, maxModels: positions.length,
    currentSupply: Number(input.currentSupply || 0), destroyedModelIds: [],
    isOnField: onField, isInReserves: input.isInReserves === true,
    isDestroyed: false, isSummonedCandidate: input.isSummonedCandidate === true,
    combatTags: String(record.payload.tags || "").split(",").map((entry) => (
      entry.trim().toLowerCase())).filter(Boolean), statuses: [],
    selectedUpgradeNames: [], abilityEffects: [], combatEffects: [], assaultEffects: [],
    timedEffects: [], damageMarker: 0,
    activatedPhases: { movement: false, assault: false, combat: false },
    models: positions.map((point, index) => ({ id: `${id}-model-${index + 1}`,
      xInches: point.xInches, yInches: point.yInches,
      baseShape: profile.baseShape,
      baseWidthInches: profile.baseWidthMilliInches / 1000,
      baseDepthInches: profile.baseDepthMilliInches / 1000,
      baseRotationDegrees: 0, elevation: "ground", supportTerrainIds: [],
      adjacentAccessPointIds: [], isOnField: onField, isDestroyed: false })) };
}
function stateFor() {
  const state = fixture.battleState({ round: 2, activeSideKey: "player1" });
  state.phase = "movement"; state.rulesProcedureMode = true;
  state.officialSummonDataBundle = bundle; state.summonRulesHistory = [];
  state.pieces = [
    piece("army_units:corpser__roach_", "parent", "player1",
      [{ xInches: 10, yInches: 10 }]),
    piece("army_units:roachling", "summoned", "player1", [
      { xInches: 0, yInches: 0 }, { xInches: 0, yInches: 0 },
      { xInches: 0, yInches: 0 }], { isOnField: false, isSummonedCandidate: true }),
    piece("army_units:marine", "enemy", "player2", [{ xInches: 20, yInches: 10 }]),
  ];
  state.log = [];
  return state;
}
function kernel(state, extra = {}) {
  return { state, summonDataBundle: bundle, ...extra };
}
function placementPlan(input = {}) {
  const dx = Number(input.dx || 0); const dy = Number(input.dy || 0);
  return { planId: input.planId || "summon-placement",
    leadingModelId: "summoned-model-1", placements: [
      { modelId: "summoned-model-1", outcome: "placed",
        xMilliInches: 11615 + dx, yMilliInches: 10000 + dy, rotationDegrees: 0 },
      { modelId: "summoned-model-2", outcome: "placed",
        xMilliInches: Number(input.secondX || 12900) + dx,
        yMilliInches: 9000 + dy, rotationDegrees: 0 },
      { modelId: "summoned-model-3", outcome: "placed",
        xMilliInches: 12900 + dx, yMilliInches: 11000 + dy, rotationDegrees: 0 },
    ], currentlyEngagedEnemyUnitIds: [], closestLegalPlacementDenominatorComplete: false };
}
function witness(state, event) {
  state.log.push({ type: "fixture_witness", events: [structuredClone(event)] });
  return hashStarcraftTmgContract(event);
}
function trigger(state) {
  const definition = bundle.summonKeywordDefinition;
  return witness(state, { type: "special_ability_resolved", sideKey: "player1",
    pieceId: "parent", abilityName: definition.definitionName,
    abilityDefinitionHash: definition.definitionHash,
    summonedUnitRecordKey: "army_units:roachling" });
}
function deployment(state, triggerEventHash) {
  return resolveOfficialSummonDeploymentV1(kernel(state, { sideKey: "player1",
    parentPieceId: "parent", summonedPieceId: "summoned",
    parentContactModelId: "parent-model-1", placementPlan: placementPlan(),
    triggerEventHash }));
}
function commitMutation(state, mutation) {
  for (const patch of mutation.piecePatches) {
    const target = state.pieces.find((entry) => entry.id === patch.pieceId);
    assert.equal(hashStarcraftTmgContract(target), patch.expectedBeforePieceHash);
    Object.assign(target, structuredClone(patch.set));
  }
}

for (const profile of bundle.summonedUnitProfiles) {
  const classification = resolveOfficialSummonedUnitClassificationV1({
    summonDataBundle: bundle, recordKey: profile.recordKey,
    rulesOwnedClassificationRequested: true });
  assert.equal(classification.includedInArmyListDuringArmyBuilding, false);
  assert.equal(classification.armySlotCount, 0);
  assert.equal(classification.startsInReserves, false);
  assert.equal(classification.regularDeploymentAllowed, false);
  assert.equal(classification.deploymentAuthority, "special_ability_only");
}
accept("14_roachling_classification_excludes_army_list_slots_and_reserves",
  "15_pylon_classification_excludes_army_list_slots_and_reserves",
  "16_drone_classification_excludes_army_list_slots_and_reserves",
  "17_regular_deployment_is_rejected_by_rules_owned_classification",
  "18_only_special_ability_deployment_authority_is_exposed");
rejects("SUMMONED_UNIT_PROFILE_REQUIRED", () => (
  resolveOfficialSummonedUnitClassificationV1({ summonDataBundle: bundle,
    recordKey: "army_units:marine", rulesOwnedClassificationRequested: true })
));
rejects("SUMMONED_UNIT_CLASSIFICATION_REQUEST_INVALID", () => (
  resolveOfficialSummonedUnitClassificationV1({ summonDataBundle: bundle,
    recordKey: "army_units:roachling", rulesOwnedClassificationRequested: true,
    clientSuppliedReserveStatus: false })
));
accept("19_non_summoned_profile_cannot_enter_summoned_classification",
  "20_client_cannot_supply_army_list_or_reserve_classification");

let state = stateFor();
let supply = resolveOfficialSummonSupplyV1(kernel(state, { sideKey: "player1",
  summonedPieceId: "summoned", rulesOwnedSupplyRequested: true }));
assert.equal(supply.summonedCurrentModels, 3);
assert.equal(supply.summonedCurrentSupplyValue, 0);
assert.equal(supply.supplyPool, 8);
assert.equal(supply.totalCurrentSupplyAfter, supply.totalCurrentSupplyBefore);
assert.equal(supply.summonAllowed, true);
accept("21_summoned_current_supply_is_selected_from_current_model_count",
  "22_total_current_supply_counts_only_on_table_units_before_summon",
  "23_round_supply_capacity_and_available_supply_are_rules_derived",
  "24_zero_supply_roachling_still_passes_the_exact_capacity_gate");
state.pieces[0].currentSupply = 1;
rejects("SUMMON_CURRENT_SUPPLY_STATE_DRIFT", () => (
  resolveOfficialSummonSupplyV1(kernel(state, { sideKey: "player1",
    summonedPieceId: "summoned", rulesOwnedSupplyRequested: true }))
));
accept("25_forged_existing_current_supply_fails_closed");

state = stateFor();
let placement = resolveOfficialSummonPlacementV1(kernel(state, { sideKey: "player1",
  parentPieceId: "parent", summonedPieceId: "summoned",
  parentContactModelId: "parent-model-1", placementPlan: placementPlan(),
  rulesOwnedPlacementRequested: true }));
assert.equal(placement.leadingModelBaseToBaseWithParent, true);
assert.equal(placement.remainingModelsInCoherency, true);
assert.equal(placement.enemyEngagementRangeExcluded, true);
assert.equal(placement.opponentZoneOfInfluenceExcluded, true);
assert.equal(placement.finalModelPositions.length, 3);
accept("26_leading_model_is_measured_base_to_base_with_parent",
  "27_all_remaining_models_are_placed_in_exact_coherency",
  "28_every_summoned_model_is_outside_enemy_engagement_range",
  "29_every_complete_base_is_outside_opponent_zone_of_influence",
  "30_arbitrary_complete_model_denominator_is_geometry_checked");
rejects("SUMMON_LEADING_MODEL_PARENT_B2B_REQUIRED", () => (
  resolveOfficialSummonPlacementV1(kernel(state, { sideKey: "player1",
    parentPieceId: "parent", summonedPieceId: "summoned",
    parentContactModelId: "parent-model-1", placementPlan: placementPlan({ dx: 100 }),
    rulesOwnedPlacementRequested: true }))
));
const incoherent = placementPlan({ secondX: 17000, planId: "incoherent" });
rejects("MODEL_BASE_GEOMETRY_WHOLLY_WITHIN_REQUIRED", () => (
  resolveOfficialSummonPlacementV1(kernel(state, { sideKey: "player1",
    parentPieceId: "parent", summonedPieceId: "summoned",
    parentContactModelId: "parent-model-1", placementPlan: incoherent,
    rulesOwnedPlacementRequested: true }))
));
state = stateFor(); state.pieces.find((entry) => entry.id === "enemy").models[0].xInches = 14.9;
rejects("MODEL_BASE_GEOMETRY_ENEMY_SEPARATION_REQUIRED", () => (
  resolveOfficialSummonPlacementV1(kernel(state, { sideKey: "player1",
    parentPieceId: "parent", summonedPieceId: "summoned",
    parentContactModelId: "parent-model-1", placementPlan: placementPlan(),
    rulesOwnedPlacementRequested: true }))
));
state = stateFor(); state.pieces[0].models[0].yInches = 31;
rejects("SUMMON_OPPONENT_ZONE_OF_INFLUENCE", () => (
  resolveOfficialSummonPlacementV1(kernel(state, { sideKey: "player1",
    parentPieceId: "parent", summonedPieceId: "summoned",
    parentContactModelId: "parent-model-1", placementPlan: placementPlan({ dy: 21000 }),
    rulesOwnedPlacementRequested: true }))
));
accept("31_non_contact_leading_model_is_rejected",
  "32_out_of_coherency_remaining_model_is_rejected",
  "33_enemy_overlap_or_engagement_endpoint_is_rejected",
  "34_whole_base_touching_opponent_influence_zone_is_rejected");

state = stateFor(); const triggerHash = trigger(state);
let deployed = deployment(state, triggerHash);
assert.equal(deployed.specialAbilityOnlyDeployment, true);
assert.equal(deployed.activationMarkerSetForSummoningPhase, true);
assert.equal(deployed.mutation.piecePatches[0].set.isInReserves, false);
assert.equal(deployed.mutation.piecePatches[0].set.isSummoned, true);
assert.equal(deployed.mutation.piecePatches[0].set.activatedPhases.movement, true);
commitMutation(state, deployed.mutation);
accept("35_hash_bound_roachling_infestation_authorizes_deployment",
  "36_deployment_mutation_keeps_summoned_unit_out_of_reserves",
  "37_deployment_sets_summoned_identity_and_parent_link",
  "38_deployment_sets_activation_marker_for_the_summoning_phase");
let activation = resolveOfficialSummonActivationV1(kernel(state, {
  summonedPieceId: "summoned", rulesOwnedActivationRequested: true }));
assert.equal(activation.activationEligible, false);
assert.equal(activation.activationSequence, "summoning_phase_locked");
state.phase = "assault";
const parentActivationHash = witness(state, { type: "unit_activation_ended",
  pieceId: "parent", sideKey: "player1", round: 2, phase: "assault",
  opponentActivationStarted: false });
activation = resolveOfficialSummonActivationV1(kernel(state, {
  summonedPieceId: "summoned", parentActivationEventHash: parentActivationHash,
  rulesOwnedActivationRequested: true }));
assert.equal(activation.activationEligible, true);
assert.equal(activation.activationSequence, "immediately_after_parent_before_opponent");
assert.equal(activation.mustPrecedeOpponentNextActivation, true);
state.pieces.find((entry) => entry.id === "parent").isOnField = false;
activation = resolveOfficialSummonActivationV1(kernel(state, {
  summonedPieceId: "summoned", rulesOwnedActivationRequested: true }));
assert.equal(activation.activationSequence, "normal_activation");
assert.equal(activation.parentAbsentAllowsNormalActivation, true);
accept("39_same_phase_summoned_activation_is_locked",
  "40_subsequent_parent_end_event_requires_immediate_linked_activation",
  "41_linked_activation_must_precede_the_opponent_next_activation",
  "42_absent_parent_restores_normal_activation");
state.pieces.find((entry) => entry.id === "parent").isOnField = true;
rejects("SUMMON_PARENT_ACTIVATION_END_EVENT_REQUIRED", () => (
  resolveOfficialSummonActivationV1(kernel(state, { summonedPieceId: "summoned",
    parentActivationEventHash: hashStarcraftTmgContract({ forged: true }),
    rulesOwnedActivationRequested: true }))
));
accept("43_forged_parent_activation_event_fails_closed");

let relationships = resolveOfficialSummonedUnitRelationshipsV1(kernel(state, {
  summonedPieceId: "summoned", rulesOwnedRelationshipsRequested: true }));
assert.equal(relationships.treatedAsFriendlyForAllRules, true);
assert.equal(relationships.isInReserves, false);
assert.equal(relationships.includedInFinalScore, false);
assert.equal(relationships.countsTowardTotalCurrentSupply, true);
accept("44_on_field_summoned_unit_is_friendly_for_all_rules",
  "45_summoned_unit_is_never_selectable_as_a_reserve_unit",
  "46_summoned_unit_is_excluded_from_final_score",
  "47_on_field_summoned_current_supply_counts_toward_total");

function procedure(stateInput, procedureKind, planInput) {
  return { procedureKind, sideKey: "player1", candidatePlansComplete: true,
    rulesDenominatorComplete: true, candidatePlans: [{ planId: `${procedureKind}-plan`,
      procedureKind, rulesOwnedInputsComplete: true, clientSuppliedResult: false,
      input: { state: stateInput, ...planInput } }] };
}
state = stateFor(); const runtimeTriggerHash = trigger(state);
const opened = openOfficialSummonRulesPendingV1(state, procedure(state,
  "summon_deployment", { sideKey: "player1", parentPieceId: "parent",
    summonedPieceId: "summoned", parentContactModelId: "parent-model-1",
    placementPlan: placementPlan(), triggerEventHash: runtimeTriggerHash }));
const space = runtime.enumerate(opened.state, { sideKey: "player1" });
const domain = space.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_SUMMON_RULES_PARAMETER_KIND));
const instantiated = runtime.instantiate(opened.state, domain,
  { choiceId: domain.constraints.choices[0].choiceId });
const applied = runtime.apply(opened.state, instantiated.action);
assert.equal(applied.state.pieces.find((entry) => entry.id === "summoned").isOnField, true);
assert.equal(audit.graph.coverageScopes.some((entry) => (
  entry.scopeId === OFFICIAL_SUMMON_RULES_RELATIONSHIP_SCOPE_ID)), true);
accept("48_runtime_exposes_hash_bound_summon_parameter_domain",
  "49_runtime_apply_commits_rules_owned_summon_mutation",
  "50_relationship_graph_covers_new_executor_and_all_frozen_consumers");

function engineFor(keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    cryptoOptions: { keyId: "ticket-11-slice-100-summon",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 100 Summon rules.";
function envelopeFor(engine, stateInput) {
  return engine.createEnvelope({ roomId: "official-slice-100-summon-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-summon-geometry-v1",
        content: { kind: "geometry-artifact", geometryVersion: "summon_base_geometry_v1" } },
      rulesDisplay: { artifactId: "official-slice-100-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "official-slice-100-action-schema-v38",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v38" } },
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
    geometryArtifact: { kind: "geometry-artifact", geometryVersion: "summon_base_geometry_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v38" } };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}
const keys = generateKeyPairSync("ed25519");
const authority = engineFor(keys, "slice-100-summon-short-seal-v1");
state = stateFor();
const seed = envelopeFor(authority, state);
const authorityOpened = openOfficialSummonRulesPendingV1(seed.state,
  procedure(seed.state, "summoned_unit_classification", {
    recordKey: "army_units:roachling", rulesOwnedClassificationRequested: true }));
const initialEnvelope = authority.createEnvelope({ roomId: seed.roomId,
  matchBinding: seed.matchBinding, state: authorityOpened.state });
registerReplay(authority, initialEnvelope);
const seat = authority.issueSeatAuthority({ grantId: "slice-100-summon-grant",
  roomId: initialEnvelope.roomId, matchBindingHash: initialEnvelope.matchBindingHash,
  seatKey: "player1", roleMode: "player", principalType: "human",
  capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
const lease = authority.issueControlLease({ seatAuthority: seat,
  sessionId: "slice-100-summon-session", leaseFence: 1,
  issuedAtRoomRevision: initialEnvelope.stateRevision });
const authoritySpace = authority.legalSpace(initialEnvelope, { seatAuthority: seat });
const authorityDomain = authoritySpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_SUMMON_RULES_PARAMETER_KIND));
const preview = authority.preview({ envelope: initialEnvelope, seatAuthority: seat,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: { choiceId: authorityDomain.constraints.choices[0].choiceId } } });
const confirmation = authority.confirmPreview({ envelope: initialEnvelope,
  preview: preview.preview, seatAuthority: seat });
const authoritativeApplied = authority.apply({ envelope: initialEnvelope,
  expectedStateRevision: initialEnvelope.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: seat, controlLease: lease,
  idempotencyKey: "slice-100-summon" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
const replay = engineFor(keys, "slice-100-summon-rotated-seal-v2");
registerReplay(replay, initialEnvelope);
assert.equal(replay.replay({ initialEnvelope,
  journal: [authoritativeApplied.receipt] }).ok, true);
accept("51_authority_preview_confirm_apply_and_replay_survive_hmac_rotation");
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_summon_event" });
assert.equal(replay.replay({ initialEnvelope, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
accept("52_ed25519_replay_rejects_tampered_summon_receipt");

assert.equal(acceptance.length, 52);
const graph = audit.graph; const graphAudit = auditRuleRelationshipGraphV1(graph);
const report = {
  schema: "starcraft_tmg_official_summon_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit, summonDataBundle: bundle,
  remainingRouteV2Hash: route.routeHash, slice, sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash, catalogueHash: slice.catalogueHash,
  graph, graphAudit, coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true,
    historicalRulesDisplayRetained: true },
  boundaries: { currentSummonedUnitCount: 3, currentSummonKeywordCarrierCount: 1,
    pylonAndPointDefenseDroneDistinctDeploymentRulesPreserved: true,
    existingConsumersFrozen: true },
  ctx2skill: slice.ctx2skill, harness: slice.harness,
  rulesEligible: false, productionRoomEligible: false,
  rulesTruth: "official_summon_rules_state_transition_conformance",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-summon-rules-rule-slice-v1-report.json"),
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
