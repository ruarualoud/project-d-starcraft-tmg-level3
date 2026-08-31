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
import {
  OFFICIAL_UNIT_CARD_SUPPLY_RULES_NEW_ATOM_IDS,
  OFFICIAL_UNIT_CARD_SUPPLY_RULES_PARAMETER_KIND,
  openOfficialUnitCardSupplyRulesPendingV1,
} from "../packages/rule-atoms/official-unit-card-supply-rules-executor-v1.mjs";
import {
  resolveOfficialCurrentSupplyValueV1,
  resolveOfficialNullSpeedMobilityV1,
  resolveOfficialStartingSupplySlotsV1,
  resolveOfficialUnitCardLayoutV1,
} from "../packages/rule-atoms/official-unit-card-supply-rules-kernel-v1.mjs";
import { OFFICIAL_UNIT_CARD_SUPPLY_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-unit-card-supply-rules-relationship-contract-v1.mjs";
import {
  createOfficialUnitCardSupplyRulesRuleSliceV1,
  verifyOfficialUnitCardSupplyRulesRuleSliceV1,
} from "../packages/rule-atoms/official-unit-card-supply-rules-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialRemainingRuleAtomRouteV2 } from
  "../packages/rule-atoms/official-remaining-rule-atom-route-v2.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import {
  createOfficialUnitCardSupplyDataBundleV1,
  getOfficialUnitCardSupplyProfileV1,
  verifyOfficialUnitCardSupplyDataBundleV1,
} from "../packages/source-data/official-unit-card-supply-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-card-build-payment-rules-rule-slice-v1-report.json"), "utf8"));
const routeBaseReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-elevation-effective-size-rules-rule-slice-v1-report.json"), "utf8"));
const acceptance = [];

function profile(bundle, key) { return getOfficialUnitCardSupplyProfileV1(bundle, key); }
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
  state.phase = "movement"; state.rulesProcedureMode = true;
  state.officialUnitCardSupplyDataBundle = bundle;
  state.unitCardSupplyRulesHistory = [];
  return state;
}
function bindingFor(gameplayDataBundle) {
  const dataHash = hashStarcraftTmgContract(gameplayDataBundle);
  return { bindingHash: "slice-93-unit-card-supply-binding",
    dataSnapshotHash: dataHash,
    dependencies: { dataSnapshot: { contentHash: dataHash } } };
}
function domainFor(runtime, state, binding) {
  return runtime.enumerate(state, { sideKey: state.activeSideKey,
    includeDisabled: true, matchBinding: binding }).parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_UNIT_CARD_SUPPLY_RULES_PARAMETER_KIND));
}
function engineFor(runtime, keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-09-01T10:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-93-unit-card-supply",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 93 Unit-card and Supply rules.";
function envelopeFor(engine, fixture, state) {
  return engine.createEnvelope({ roomId: "official-slice-93-unit-card-supply-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-unit-card-supply-geometry-v1",
        content: { kind: "geometry-artifact",
          geometryVersion: "unit_card_supply_p2p_geometry_v1" } },
      rulesDisplay: { artifactId: "official-slice-93-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "official-slice-93-action-schema-v31",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v31" } },
    }, state });
}
function credentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({ grantId: "slice-93-unit-card-supply-grant",
    roomId: envelope.roomId, matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1", roleMode: "player", principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
  return { authority, lease: engine.issueControlLease({ seatAuthority: authority,
    sessionId: "slice-93-unit-card-supply-session", leaseFence: 1,
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
      geometryVersion: "unit_card_supply_p2p_geometry_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v31" },
  };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}

const slice = createOfficialUnitCardSupplyRulesRuleSliceV1({
  previousSlice: previousReport.slice });
const audit = verifyOfficialUnitCardSupplyRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice });
assert.deepEqual(audit.counts, { executableRuleAtoms: 683,
  newlyExecutableRuleAtoms: 12, reviewRequiredRuleAtoms: 229,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 683,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 62, missingStateContractExecutors: 0 });
acceptance.push("slice93_promotes_exact_12_route_atoms_to_683_executable");

const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 93);
assert.deepEqual(assignment.atomIds, [...OFFICIAL_UNIT_CARD_SUPPLY_RULES_NEW_ATOM_IDS]);
assert.deepEqual({ executable: assignment.executableAfter,
  review: assignment.reviewRequiredAfter }, { executable: 683, review: 229 });
acceptance.push("route_v2_exact_slice93_atom_identity_and_counts_match");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const bundle = createOfficialUnitCardSupplyDataBundleV1({ dataset: fixture.dataset });
assert.equal(verifyOfficialUnitCardSupplyDataBundleV1(bundle), true);
assert.deepEqual(bundle.audit, { unitCount: 26,
  factionCounts: { Protoss: 7, Terran: 7, Zerg: 12 },
  armySlotCounts: { Air: 0, Core: 10, Elite: 6, Hero: 3, Support: 3, Other: 4 },
  nullSpeedCount: 3, splitSpeedCount: 18, singleSpeedCount: 5,
  nullCombatRangeCount: 4, largeCompositionCount: 6, upgradeDefinitionCount: 183 });
acceptance.push("source_bundle_binds_all_26_current_official_unit_records");

assert.deepEqual(bundle.ruleSectionRecords.map((entry) => entry.title), [
  "PART 5: CARDS AND CHARACTERISTICS", "PART 6: THE SUPPLY SYSTEM",
  "PART 11: KEYWORD GLOSSARY AND DEFINITIONS"]);
acceptance.push("part5_part6_and_part11_records_match_frozen_capture");
assert.equal(bundle.ruleClauses.length, 12);
assert.equal(bundle.ruleClauses[0].clauseId, "core:11:supply-value-current-model-count");
acceptance.push("twelve_exact_pdf_clause_hashes_cover_the_twelve_atoms");
assert.equal(new Set(bundle.unitSourceIndex.map((entry) => entry.sourceRecordHash)).size, 26);
acceptance.push("all_26_unit_profiles_retain_distinct_current_source_record_identity");

const marine = profile(bundle, "army_units:marine");
const marineLayout = resolveOfficialUnitCardLayoutV1({ unitCardSupplyDataBundle: bundle,
  recordKey: marine.recordKey, rulesOwnedLayoutRequested: true });
assert.deepEqual({ faction: marineLayout.factionTag, slot: marineLayout.armySlotType,
  speed: marineLayout.speed.printedValue, range: marineLayout.combatRange.inches },
{ faction: "Terran", slot: "Core", speed: "4/7", range: 4 });
acceptance.push("marine_layout_exposes_faction_core_slot_split_speed_and_combat_range");

const kerrigan = resolveOfficialUnitCardLayoutV1({ unitCardSupplyDataBundle: bundle,
  recordKey: "army_units:kerrigan", rulesOwnedLayoutRequested: true });
assert.deepEqual({ faction: kerrigan.factionTag, slot: kerrigan.armySlotType,
  base: kerrigan.base.printedBase }, { faction: "Zerg", slot: "Hero", base: "Ø 40MM" });
acceptance.push("kerrigan_layout_exposes_zerg_hero_and_official_p2p_base");

const hydralisk = resolveOfficialUnitCardLayoutV1({ unitCardSupplyDataBundle: bundle,
  recordKey: "army_units:hydralisk", rulesOwnedLayoutRequested: true });
assert.deepEqual({ shape: hydralisk.base.shape, width: hydralisk.base.widthMillimetres,
  depth: hydralisk.base.depthMillimetres }, { shape: "rectangle", width: 40, depth: 100 });
acceptance.push("hydralisk_layout_preserves_unique_40_by_100_rectangle_base");

const medic = resolveOfficialUnitCardLayoutV1({ unitCardSupplyDataBundle: bundle,
  recordKey: "army_units:medic", rulesOwnedLayoutRequested: true });
assert.deepEqual(medic.combatRange, { printedValue: "-", inches: null });
acceptance.push("null_combat_range_is_preserved_without_inventing_numeric_range");

assert.deepEqual(marineLayout.phaseBoxes.map((entry) => [entry.phase,
  entry.definitionCount]), [["Any Phase", 0], ["Movement Phase", 2],
  ["Assault Phase", 5], ["Combat Phase", 2]]);
acceptance.push("phase_boxes_bind_all_183_upgrade_definitions_to_exact_phases");

assert.throws(() => resolveOfficialUnitCardLayoutV1({ unitCardSupplyDataBundle: bundle,
  recordKey: marine.recordKey, rulesOwnedLayoutRequested: true,
  clientSuppliedLayout: { armySlotType: "Hero" } }), /UNIT_CARD_LAYOUT_REQUEST_INVALID/u);
acceptance.push("client_cannot_replace_official_unit_card_layout");

function current(recordKey, currentModels, isDestroyed = false, extra = {}) {
  return resolveOfficialCurrentSupplyValueV1({ unitCardSupplyDataBundle: bundle,
    recordKey, currentModels, isDestroyed,
    rulesOwnedCurrentModelCountRequested: true, ...extra });
}
assert.deepEqual({ tier: current("army_units:marine", 9).selectedTier,
  supply: current("army_units:marine", 9).currentSupplyValue }, { tier: 3, supply: 2 });
acceptance.push("nine_current_marines_select_tier3_supply2");
assert.deepEqual({ tier: current("army_units:marine", 6).selectedTier,
  supply: current("army_units:marine", 6).currentSupplyValue }, { tier: 2, supply: 1 });
acceptance.push("six_current_marines_select_tier2_supply1");
assert.deepEqual({ tier: current("army_units:marine", 3).selectedTier,
  supply: current("army_units:marine", 3).currentSupplyValue }, { tier: 1, supply: 0 });
acceptance.push("three_current_marines_select_tier1_supply0");
assert.equal(current("army_units:marine", 6).updatedImmediatelyAfterCasualty, true);
acceptance.push("casualty_bracket_change_requires_immediate_supply_update");
assert.deepEqual(current("army_units:marine", 6).supplyUses,
  ["deployment", "mission_marker_control", "scoring", "tactical_mass"]);
acceptance.push("one_current_supply_projection_declares_all_four_rule_consumers");
assert.deepEqual({ tier: current("army_units:marine", 0, true).selectedTier,
  supply: current("army_units:marine", 0, true).currentSupplyValue },
{ tier: null, supply: 0 });
acceptance.push("destroyed_zero_model_unit_projects_zero_supply_without_fake_tier");
assert.throws(() => current("army_units:marine", 0),
  /CURRENT_SUPPLY_ZERO_MODELS_REQUIRES_DESTROYED/u);
acceptance.push("live_zero_model_state_fails_closed");
assert.throws(() => current("army_units:marine", 10), /CURRENT_SUPPLY_MODEL_COUNT_UNMAPPED/u);
acceptance.push("model_count_outside_official_supply_profile_fails_closed");
assert.throws(() => current("army_units:marine", 6, false,
  { clientSuppliedSupplyValue: 99 }), /CURRENT_SUPPLY_VALUE_REQUEST_INVALID/u);
acceptance.push("client_cannot_supply_current_supply_value");
assert.equal(current("army_units:goliath", 1).currentSupplyValue, 2);
acceptance.push("single_goliath_uses_its_official_supply2_profile");
assert.deepEqual([1, 2, 4].map((count) => current("army_units:hydralisk", count)
  .currentSupplyValue), [1, 2, 3]);
acceptance.push("hydralisk_current_counts_select_all_three_exact_supply_tiers");

function starting(recordKey, compositionKind, extra = {}) {
  return resolveOfficialStartingSupplySlotsV1({ unitCardSupplyDataBundle: bundle,
    recordKey, compositionKind, rulesOwnedCompositionRequested: true, ...extra });
}
assert.deepEqual({ models: starting("army_units:marine", "small").composition.startingModels,
  supply: starting("army_units:marine", "small").startingSupplyValue,
  slots: starting("army_units:marine", "small").armySlotRequirement },
{ models: 6, supply: 1, slots: { type: "Core", count: 1 } });
acceptance.push("marine_small_composition_uses_starting_supply1_and_one_core_slot");
assert.deepEqual({ models: starting("army_units:marine", "large").composition.startingModels,
  supply: starting("army_units:marine", "large").startingSupplyValue,
  slots: starting("army_units:marine", "large").armySlotRequirement.count },
{ models: 9, supply: 2, slots: 2 });
acceptance.push("marine_large_composition_uses_starting_supply2_and_two_core_slots");
assert.deepEqual(starting("army_units:goliath", "small").armySlotRequirement,
  { type: "Elite", count: 2 });
acceptance.push("single_goliath_occupies_two_elite_slots_from_starting_supply");
assert.deepEqual({ fieldable: starting("army_units:point_defense_drone", "small")
  .fieldableDuringArmyBuilding, slots: starting("army_units:point_defense_drone", "small")
  .armySlotRequirement }, { fieldable: false, slots: { type: null, count: 0 } });
acceptance.push("other_type_generated_unit_does_not_invent_army_building_slot");
assert.throws(() => starting("army_units:goliath", "large"),
  /STARTING_SUPPLY_COMPOSITION_UNAVAILABLE/u);
acceptance.push("unavailable_large_composition_fails_closed");
assert.throws(() => starting("army_units:marine", "small",
  { clientSuppliedArmySlots: { Core: 0 } }), /STARTING_SUPPLY_SLOTS_REQUEST_INVALID/u);
acceptance.push("client_cannot_replace_starting_supply_or_slots");

function mobility(recordKey, operationKind) {
  return resolveOfficialNullSpeedMobilityV1({ unitCardSupplyDataBundle: bundle,
    recordKey, operationKind, rulesOwnedMobilityCharacteristicRequested: true });
}
assert.throws(() => mobility("army_units:point_defense_drone", "move"),
  /UNIT_CARD_NULL_SPEED_FORBIDS_MOVE_OR_REPOSITION/u);
acceptance.push("point_defense_drone_null_speed_forbids_move");
assert.throws(() => mobility("army_units:omega_worm", "place"),
  /UNIT_CARD_NULL_SPEED_FORBIDS_MOVE_OR_REPOSITION/u);
acceptance.push("omega_worm_null_speed_forbids_place");
assert.throws(() => mobility("army_units:pylon", "involuntary_movement"),
  /UNIT_CARD_NULL_SPEED_FORBIDS_MOVE_OR_REPOSITION/u);
acceptance.push("pylon_null_speed_forbids_involuntary_reposition");
assert.equal(mobility("army_units:marine", "move").operationOtherwiseLegal, null);
acceptance.push("nonnull_speed_certificate_does_not_claim_full_operation_legality");
assert.deepEqual(profile(bundle, "army_units:marine").speed,
  { printedValue: "4/7", kind: "split", multiModelInches: 4,
    singleModelInches: 7, canMoveOrBeRepositioned: true });
acceptance.push("split_speed_preserves_multi_model_and_single_model_values");
assert.deepEqual(Object.values(bundle.unitProfiles.reduce((out, entry) => {
  out[entry.base.p2pSourceId] = entry.base.p2pSourceContentHash; return out;
}, {})).sort(), [
  "4e8547b2df8d545df3d0ebb7d7821521a888dc0437d6f4dde21d82145337a212",
  "6810f46ee422ac5d8f3cc169c3eda3ccb9551f01ab71a1f7e4ac8c266817b364",
  "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
].sort());
acceptance.push("all_unit_bases_bind_three_exact_may2026_p2p_hashes");
const secondBundle = createOfficialUnitCardSupplyDataBundleV1({ dataset: fixture.dataset });
assert.equal(secondBundle.bundleHash, bundle.bundleHash);
assert.equal(secondBundle.unitProfileIndexHash, bundle.unitProfileIndexHash);
acceptance.push("unit_profile_source_compilation_is_deterministic");

const state = prepare(fixture, bundle); const binding = bindingFor(fixture.gameplayDataBundle);
const supplyPlan = plan("marine-current-supply-plan", "current_supply_value", {
  recordKey: marine.recordKey, sourceRecordHash: marine.sourceRecordHash,
  payloadHash: marine.payloadHash, profileHash: marine.profileHash,
  currentModels: 6, isDestroyed: false, rulesOwnedCurrentModelCountRequested: true });
const opened = openOfficialUnitCardSupplyRulesPendingV1(state,
  procedure(state, "current_supply_value", supplyPlan));
const domain = domainFor(runtime, opened.state, binding);
assert(domain); assert.equal(runtime.descriptor.executorManifest.length, 62);
acceptance.push("runtime_exposes_unit_card_supply_as_executor_62");
const action = runtime.instantiate(opened.state, domain,
  { choiceId: domain.constraints.choices[0].choiceId }, { matchBinding: binding });
const applied = runtime.apply(opened.state, action.action, { matchBinding: binding });
assert.equal(applied.state.pendingAction, null);
assert.equal(applied.state.lastUnitCardSupplyRulesResolution.result.currentSupplyValue, 1);
acceptance.push("runtime_apply_persists_rules_owned_supply_history_and_event");
const stale = structuredClone(opened.state);
stale.pieces[0].currentModels -= 1;
assert.equal(runtime.enumerate(stale, { sideKey: "player1", includeDisabled: true,
  matchBinding: binding }).candidates[0].disabledReason, "UNIT_CARD_SUPPLY_PENDING_INVALID");
acceptance.push("piece_model_count_drift_invalidates_old_supply_domain");
const sourceDrift = structuredClone(opened.state);
sourceDrift.officialDevelopmentTrancheSourceLockAudit.lockHash = "0".repeat(64);
assert.equal(runtime.enumerate(sourceDrift, { sideKey: "player1", includeDisabled: true,
  matchBinding: binding }).candidates[0].disabledReason,
"UNIT_CARD_SUPPLY_SOURCE_LOCK_BINDING_INVALID");
acceptance.push("source_lock_drift_disables_unit_card_supply_legalspace");
const dataDrift = structuredClone(binding);
dataDrift.dependencies.dataSnapshot.contentHash = "0".repeat(64);
assert.equal(runtime.enumerate(opened.state, { sideKey: "player1", includeDisabled: true,
  matchBinding: dataDrift }).candidates[0].disabledReason,
"UNIT_CARD_SUPPLY_DATA_ARTIFACT_BINDING_INVALID");
acceptance.push("match_bound_data_drift_disables_unit_card_supply_legalspace");

const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
assert.deepEqual({ nodes: graph.nodes.length, edges: graph.edges.length },
  { nodes: 10386, edges: 30010 });
acceptance.push("relationship_graph_is_valid_at_10386_nodes_and_30010_edges");
const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_UNIT_CARD_SUPPLY_RULES_RELATIONSHIP_SCOPE_ID));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "state_field:pieces.currentModels"
    && entry.to === "derived_value:unitCardSupplyV1.currentModelCountTier"));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash")));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
acceptance.push("relationship_graph_blocks_missing_model_count_to_supply_tier_edge");

const keys = generateKeyPairSync("ed25519");
const authority = engineFor(runtime, keys, "slice-93-unit-card-supply-short-seal-v1");
const seed = envelopeFor(authority, fixture, state);
const authorityOpened = openOfficialUnitCardSupplyRulesPendingV1(seed.state,
  procedure(seed.state, "current_supply_value", supplyPlan));
const initial = authority.createEnvelope({ roomId: seed.roomId,
  matchBinding: seed.matchBinding, state: authorityOpened.state });
registerReplay(authority, initial, fixture, runtime);
const access = credentials(authority, initial);
const authoritySpace = authority.legalSpace(initial, { seatAuthority: access.authority });
const authorityDomain = authoritySpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_UNIT_CARD_SUPPLY_RULES_PARAMETER_KIND));
const preview = authority.preview({ envelope: initial, seatAuthority: access.authority,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: { choiceId: authorityDomain.constraints.choices[0].choiceId } } });
assert.equal(preview.ok, true, JSON.stringify(preview));
const confirmation = authority.confirmPreview({ envelope: initial,
  preview: preview.preview, seatAuthority: access.authority });
const authoritativeApplied = authority.apply({ envelope: initial,
  expectedStateRevision: initial.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: access.authority,
  controlLease: access.lease, idempotencyKey: "slice-93-unit-card-supply" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
const replay = engineFor(runtime, keys, "slice-93-unit-card-supply-rotated-seal-v2");
registerReplay(replay, initial, fixture, runtime);
assert.equal(replay.replay({ initialEnvelope: initial,
  journal: [authoritativeApplied.receipt] }).ok, true);
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_supply_event" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
acceptance.push("authority_ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

assert.equal(slice.unitCardSupplyRulesProgress.existingSupplyConsumersFrozenPendingVersionedMigration,
  true);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
acceptance.push("existing_supply_consumers_executors_and_rules_displays_remain_frozen");
assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.unitCardSupplyRulesProgress.sourceRefreshPerformed, false);
acceptance.push("no_source_refresh_skill_dsh_muzero_selfplay_or_training_promotion_occurs");
assert.equal(acceptance.length, 46);

const report = {
  schema: "starcraft_tmg_official_unit_card_supply_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit, unitCardSupplyDataBundle: bundle,
  remainingRouteV2Hash: route.routeHash, slice, sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash, catalogueHash: slice.catalogueHash,
  graph, graphAudit: audit.graphAudit, coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true,
    historicalRulesDisplayRetained: true },
  ctx2skill: slice.ctx2skill, harness: slice.harness,
  rulesEligible: false, productionRoomEligible: false,
  rulesTruth: "official_unit_card_supply_primitive_conformance", trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-unit-card-supply-rules-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ schema: report.schema,
  acceptancePassed: report.acceptancePassed, acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash, catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash, graphHash: graph.graphHash,
  graphCounts: { nodes: graph.nodes.length, edges: graph.edges.length },
  counts: audit.counts, unitSourceIndexHash: bundle.unitSourceIndexHash,
  unitProfileIndexHash: bundle.unitProfileIndexHash,
  sourceLockHash: fixture.sourceLockAudit.lockHash,
  sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  trainingTruth: false }, null, 2));
