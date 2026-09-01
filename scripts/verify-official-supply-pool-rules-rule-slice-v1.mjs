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
  OFFICIAL_SUPPLY_POOL_RULES_NEW_ATOM_IDS,
  OFFICIAL_SUPPLY_POOL_RULES_PARAMETER_KIND,
  openOfficialSupplyPoolRulesPendingV1,
} from "../packages/rule-atoms/official-supply-pool-rules-executor-v1.mjs";
import {
  certifyOfficialSupplyPoolPlanV1,
  resolveOfficialAvailableSupplyVerificationV1,
  resolveOfficialCasualtySupplyReleaseV1,
  resolveOfficialDeploymentCardSupplyReferenceV1,
  resolveOfficialRoundOneSupplyPoolV1,
  verifyOfficialSupplyPoolPlanCertificateV1,
} from "../packages/rule-atoms/official-supply-pool-rules-kernel-v1.mjs";
import { OFFICIAL_SUPPLY_POOL_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-supply-pool-rules-relationship-contract-v1.mjs";
import {
  createOfficialSupplyPoolRulesRuleSliceV1,
  verifyOfficialSupplyPoolRulesRuleSliceV1,
} from "../packages/rule-atoms/official-supply-pool-rules-rule-slice-v1.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import {
  createOfficialSupplyPoolDataBundleV1,
  verifyOfficialSupplyPoolDataBundleV1,
} from "../packages/source-data/official-supply-pool-data-bundle-v1.mjs";
import { createOfficialUnitCardSupplyDataBundleV1 } from
  "../packages/source-data/official-unit-card-supply-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-round-phase-activation-rules-rule-slice-v1-report.json"), "utf8"));
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
function row(pieceId, sideKey, recordKey, currentModels,
  isOnBattlefield = true, isDestroyed = false) {
  return { pieceId, sideKey, recordKey, currentModels,
    isOnBattlefield, isDestroyed };
}
function prepare(fixture, supplyPoolDataBundle, unitCardSupplyDataBundle) {
  const state = fixture.battleState({ activeSideKey: "player1" });
  state.round = 1; state.phase = "movement"; state.rulesProcedureMode = true;
  state.officialSupplyPoolDataBundle = supplyPoolDataBundle;
  state.officialUnitCardSupplyDataBundle = unitCardSupplyDataBundle;
  state.supplyPoolRulesHistory = [];
  return state;
}
function bindingFor(gameplayDataBundle) {
  const dataHash = hashStarcraftTmgContract(gameplayDataBundle);
  return { bindingHash: "slice-95-supply-pool-binding",
    dataSnapshotHash: dataHash,
    dependencies: { dataSnapshot: { contentHash: dataHash } } };
}
function domainFor(runtime, state, binding) {
  return runtime.enumerate(state, { sideKey: state.activeSideKey,
    includeDisabled: true, matchBinding: binding }).parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_SUPPLY_POOL_RULES_PARAMETER_KIND));
}
function engineFor(runtime, keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-09-01T13:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-95-supply-pool",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 95 Supply Pool rules.";
function envelopeFor(engine, fixture, state) {
  return engine.createEnvelope({ roomId: "official-slice-95-supply-pool-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-supply-pool-geometry-v1",
        content: { kind: "geometry-artifact",
          geometryVersion: "supply_pool_gauntlet_reference_v1" } },
      rulesDisplay: { artifactId: "official-slice-95-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "official-slice-95-action-schema-v33",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v33" } },
    }, state });
}
function credentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({ grantId: "slice-95-supply-pool-grant",
    roomId: envelope.roomId, matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1", roleMode: "player", principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
  return { authority, lease: engine.issueControlLease({ seatAuthority: authority,
    sessionId: "slice-95-supply-pool-session", leaseFence: 1,
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
      geometryVersion: "supply_pool_gauntlet_reference_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v33" },
  };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}

const slice = createOfficialSupplyPoolRulesRuleSliceV1({
  previousSlice: previousReport.slice });
const audit = verifyOfficialSupplyPoolRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice });
assert.deepEqual(audit.counts, { executableRuleAtoms: 695,
  newlyExecutableRuleAtoms: 5, reviewRequiredRuleAtoms: 217,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 695,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 64, missingStateContractExecutors: 0 });
accept("01_slice95_promotes_exact_5_route_atoms_to_695_executable");

const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 95);
assert.deepEqual(assignment.atomIds, [...OFFICIAL_SUPPLY_POOL_RULES_NEW_ATOM_IDS]);
assert.deepEqual({ executable: assignment.executableAfter,
  review: assignment.reviewRequiredAfter }, { executable: 695, review: 217 });
accept("02_route_v2_exact_slice95_atom_identity_and_counts_match");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executorManifest.length, 64);
accept("03_runtime_exposes_supply_pool_as_executor_64");
const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const unitBundle = createOfficialUnitCardSupplyDataBundleV1({ dataset: fixture.dataset });
const bundle = createOfficialSupplyPoolDataBundleV1({ dataset: fixture.dataset,
  gameplayDataBundle: fixture.gameplayDataBundle });
assert.equal(verifyOfficialSupplyPoolDataBundleV1(bundle), true);
accept("04_supply_pool_bundle_is_content_hash_verified");
assert.equal(bundle.ruleClauses.length, 5);
assert.deepEqual(bundle.ruleClauses.map((entry) => entry.atomId).sort(),
  [...OFFICIAL_SUPPLY_POOL_RULES_NEW_ATOM_IDS]);
accept("05_five_exact_clause_hashes_cover_five_route_atoms");
assert.deepEqual(bundle.dependencyClauses.map((entry) => entry.atomId).sort(), [
  "rule-atom:available-supply-formula",
  "rule-atom:reserve-deployment-available-supply-check",
]);
accept("06_existing_formula_and_fielding_atoms_are_explicit_dependencies");
assert.equal(bundle.sourcePolicy.refreshDuringDevelopment, false);
assert.equal(bundle.sourcePolicy.repositoryFallbackAllowed, false);
accept("07_source_lock_is_offline_without_repository_fallback");
assert.deepEqual({ mission: bundle.mission.missionName,
  startingSupply: bundle.mission.startingSupply },
{ mission: "Hold Position", startingSupply: 6 });
accept("08_hold_position_mission_starts_each_player_at_supply_6");
assert.deepEqual({ deployment: bundle.deployment.name,
  depth: bundle.deployment.zoneOfInfluenceDepthInches },
{ deployment: "GAUNTLET", depth: 6 });
accept("09_gauntlet_deployment_card_has_six_inch_influence_zone");

const shared = { supplyPoolDataBundle: bundle,
  unitCardSupplyDataBundle: unitBundle, round: 1,
  playerSideKeys: ["player1", "player2"] };
const capacity = resolveOfficialRoundOneSupplyPoolV1({ ...shared,
  rulesOwnedSupplyPoolRequested: true });
assert.deepEqual(capacity.supplyPoolBySide, { player1: 6, player2: 6 });
accept("10_round_one_supply_pool_equals_mission_supply_for_both_players");
assert.equal(capacity.supplyPoolIsTotalInstantaneousBattlefieldCapacity, true);
assert.equal(capacity.reserveSupplyConsumesPool, false);
accept("11_supply_pool_is_instantaneous_battlefield_capacity_not_reserve_cost");
assert.throws(() => resolveOfficialRoundOneSupplyPoolV1({ ...shared, round: 2,
  rulesOwnedSupplyPoolRequested: true }), /ROUND_ONE_SUPPLY_POOL_REQUEST_INVALID/u);
assert.throws(() => resolveOfficialRoundOneSupplyPoolV1({ ...shared,
  rulesOwnedSupplyPoolRequested: true, clientSuppliedSupplyPool: 99 }),
/ROUND_ONE_SUPPLY_POOL_REQUEST_INVALID/u);
accept("12_later_round_or_client_capacity_cannot_enter_round_one_primitive");

const rows = [
  row("p1-marine", "player1", "army_units:marine", 6),
  row("p1-goliath-reserve", "player1", "army_units:goliath", 1, false),
  row("p2-marine", "player2", "army_units:marine", 9),
];
function available(extra = {}) {
  return resolveOfficialAvailableSupplyVerificationV1({ ...shared,
    rulesOwnedAvailableSupplyRequested: true,
    movementStartVerificationRequested: true,
    unitRows: rows, unitRowsComplete: true, ...extra });
}
assert.deepEqual(available().onTableSupplyBySide, { player1: 1, player2: 2 });
accept("13_on_table_supply_is_recalculated_from_current_model_tiers");
assert.deepEqual(available().availableSupplyBySide, { player1: 5, player2: 4 });
accept("14_available_supply_is_capacity_minus_friendly_on_table_supply");
assert.deepEqual(available().reserveSupplyBySide, { player1: 2, player2: 0 });
assert.equal(available().reserveExcludedFromOnTableSupply, true);
accept("15_reserve_supply_is_reported_but_excluded_from_pool_usage");
assert.equal(available().reserveFieldingEligibility[0].supplyEligibleToField, true);
accept("16_reserve_fielding_eligibility_reuses_available_supply_dependency");
assert.equal(available().unitSupplyRows.every((entry) => (
  /^[a-f0-9]{64}$/u.test(entry.currentSupplyResolutionHash)
)), true);
assert.equal(available().clientSuppliedSupplyValuesAccepted, false);
accept("17_every_unit_supply_value_has_rules_owned_resolution_hash");
assert.throws(() => available({ clientSuppliedCurrentSupplyValues: { "p1-marine": 0 } }),
  /SUPPLY_POOL_UNIT_DENOMINATOR_INCOMPLETE/u);
accept("18_client_cannot_forge_current_supply_values");
assert.throws(() => available({ unitRowsComplete: false }),
  /SUPPLY_POOL_UNIT_DENOMINATOR_INCOMPLETE/u);
accept("19_incomplete_unit_denominator_fails_closed");
const overCap = [0, 1, 2, 3].map((index) => (
  row(`p1-large-${index}`, "player1", "army_units:marine", 9)
)).concat(row("p2-one", "player2", "army_units:marine", 6));
assert.throws(() => available({ unitRows: overCap }), /SUPPLY_POOL_CAP_EXCEEDED/u);
accept("20_on_table_supply_above_capacity_fails_closed");

function casualty(beforeUnitRows, afterUnitRows, casualtyPieceId, extra = {}) {
  return resolveOfficialCasualtySupplyReleaseV1({ ...shared,
    rulesOwnedCasualtySupplyRequested: true, casualtyPieceId,
    beforeUnitRows, beforeUnitRowsComplete: true,
    afterUnitRows, afterUnitRowsComplete: true, ...extra });
}
const casualtyBefore = [
  row("p1-marine", "player1", "army_units:marine", 6),
  row("p2-marine", "player2", "army_units:marine", 6),
];
const casualtyAfter = [
  row("p1-marine", "player1", "army_units:marine", 3),
  row("p2-marine", "player2", "army_units:marine", 6),
];
const casualtyRelease = casualty(casualtyBefore, casualtyAfter, "p1-marine");
assert.deepEqual({ before: casualtyRelease.currentSupplyBefore,
  after: casualtyRelease.currentSupplyAfter, freed: casualtyRelease.supplyFreed },
{ before: 1, after: 0, freed: 1 });
accept("21_casualty_crossing_supply_tier_frees_exact_supply_delta");
assert.deepEqual({ before: casualtyRelease.availableSupplyBefore,
  after: casualtyRelease.availableSupplyAfter,
  increase: casualtyRelease.availableSupplyIncrease },
{ before: 5, after: 6, increase: 1 });
assert.equal(casualtyRelease.verificationContext, "casualty_recalculation");
accept("22_available_supply_increases_by_exact_casualty_supply_delta");
const destroyed = casualty([
  row("p1-goliath", "player1", "army_units:goliath", 1),
  row("p2-marine", "player2", "army_units:marine", 6),
], [
  row("p1-goliath", "player1", "army_units:goliath", 0, false, true),
  row("p2-marine", "player2", "army_units:marine", 6),
], "p1-goliath");
assert.equal(destroyed.supplyFreed, 2);
accept("23_destroyed_single_model_unit_frees_its_full_current_supply");
const sameTier = casualty(casualtyBefore, [
  row("p1-marine", "player1", "army_units:marine", 4),
  row("p2-marine", "player2", "army_units:marine", 6),
], "p1-marine");
assert.equal(sameTier.supplyFreed, 0);
accept("24_casualty_within_same_supply_tier_frees_zero_supply");
assert.throws(() => casualty(casualtyBefore, [
  row("p1-marine", "player1", "army_units:marine", 3),
  row("p2-marine", "player2", "army_units:marine", 4),
], "p1-marine"), /CASUALTY_SUPPLY_UNRELATED_UNIT_DRIFT/u);
accept("25_unrelated_unit_drift_invalidates_casualty_release");
assert.throws(() => casualty(casualtyAfter, casualtyBefore, "p1-marine"),
  /CASUALTY_SUPPLY_TRANSITION_INVALID/u);
accept("26_model_increase_cannot_be_certified_as_casualty_release");
assert.throws(() => casualty(casualtyBefore, casualtyAfter, "p1-marine",
  { clientSuppliedFreedSupply: 1 }), /CASUALTY_SUPPLY_RELEASE_REQUEST_INVALID/u);
accept("27_client_cannot_supply_freed_supply_value");

const deployment = resolveOfficialDeploymentCardSupplyReferenceV1({ ...shared,
  rulesOwnedDeploymentReferenceRequested: true });
assert.deepEqual({ name: deployment.deploymentName,
  depth: deployment.zoneOfInfluenceDepthInches }, { name: "GAUNTLET", depth: 6 });
accept("28_deployment_reference_resolves_exact_official_card_and_zone_depth");
assert.equal(Object.keys(deployment.entryEdgesByColor).length > 0, true);
assert.match(deployment.deploymentGeometryHash, /^[a-f0-9]{64}$/u);
accept("29_deployment_reference_binds_entry_edges_and_geometry_hash");
assert.equal(deployment.concreteArrivalLegalityRemainsReserveDeployExecutorOwned, true);
accept("30_reserve_deploy_executor_retains_concrete_arrival_legality");
assert.throws(() => resolveOfficialDeploymentCardSupplyReferenceV1({ ...shared,
  rulesOwnedDeploymentReferenceRequested: true,
  clientSuppliedInfluenceZone: 12 }), /DEPLOYMENT_CARD_REFERENCE_REQUEST_INVALID/u);
accept("31_client_cannot_replace_deployment_influence_zone");
assert.equal(available().completeLaterRoundSupplyLifecycleClaimed, false);
accept("32_slice_does_not_claim_complete_later_round_supply_lifecycle");

const capacityPlan = plan("round-one-capacity", "round_one_supply_pool", {
  round: 1, playerSideKeys: ["player1", "player2"],
  rulesOwnedSupplyPoolRequested: true });
const certificate = certifyOfficialSupplyPoolPlanV1({ plan: {
  ...capacityPlan, sideKey: "player1" }, procedureKind: "round_one_supply_pool",
  supplyPoolDataBundle: bundle, unitCardSupplyDataBundle: unitBundle });
assert.equal(verifyOfficialSupplyPoolPlanCertificateV1({ plan: {
  ...capacityPlan, sideKey: "player1" }, procedureKind: "round_one_supply_pool",
  supplyPoolDataBundle: bundle, unitCardSupplyDataBundle: unitBundle,
  certificate }), true);
accept("33_supply_pool_plan_certificate_rebuilds_exactly");

const state = prepare(fixture, bundle, unitBundle);
const binding = bindingFor(fixture.gameplayDataBundle);
const opened = openOfficialSupplyPoolRulesPendingV1(state,
  procedure(state, "round_one_supply_pool", capacityPlan));
const domain = domainFor(runtime, opened.state, binding);
assert(domain);
assert.equal(domain.constraints.completeLaterRoundSupplyLifecycleClaimed, false);
accept("34_runtime_exposes_rules_owned_supply_pool_parameter_domain");
const action = runtime.instantiate(opened.state, domain,
  { choiceId: domain.constraints.choices[0].choiceId }, { matchBinding: binding });
const applied = runtime.apply(opened.state, action.action, { matchBinding: binding });
assert.equal(applied.state.pendingAction, null);
assert.deepEqual(applied.state.lastSupplyPoolRulesResolution.result.supplyPoolBySide,
  { player1: 6, player2: 6 });
accept("35_runtime_apply_persists_supply_pool_history_and_event");
const stateDrift = structuredClone(opened.state); stateDrift.round = 2;
assert.equal(runtime.enumerate(stateDrift, { sideKey: "player1", includeDisabled: true,
  matchBinding: binding }).candidates[0].disabledReason, "SUPPLY_POOL_PENDING_INVALID");
accept("36_round_drift_invalidates_old_supply_pool_domain");
const sourceDrift = structuredClone(opened.state);
sourceDrift.officialDevelopmentTrancheSourceLockAudit.lockHash = "0".repeat(64);
assert.equal(runtime.enumerate(sourceDrift, { sideKey: "player1", includeDisabled: true,
  matchBinding: binding }).candidates[0].disabledReason,
"SUPPLY_POOL_SOURCE_LOCK_BINDING_INVALID");
accept("37_source_lock_drift_disables_supply_pool_legalspace");
const badBinding = structuredClone(binding);
badBinding.dependencies.dataSnapshot.contentHash = "f".repeat(64);
assert.equal(runtime.enumerate(opened.state, { sideKey: "player1", includeDisabled: true,
  matchBinding: badBinding }).candidates[0].disabledReason,
"SUPPLY_POOL_DATA_ARTIFACT_BINDING_INVALID");
accept("38_data_binding_drift_disables_supply_pool_legalspace");

const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
assert.deepEqual({ nodes: graph.nodes.length, edges: graph.edges.length },
  { nodes: 10500, edges: 30252 });
accept("39_relationship_graph_is_valid_with_supply_consumers");
const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_SUPPLY_POOL_RULES_RELATIONSHIP_SCOPE_ID));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "derived_value:supplyPoolRulesV1.roundOneMissionCapacity"
    && entry.to === "derived_value:supplyPoolRulesV1.availableSupply"));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash")));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
accept("40_relationship_graph_blocks_missing_capacity_to_available_edge");
assert.equal(slice.historicalCompatibility.previousSliceHash,
  previousReport.slice.sliceHash);
assert.equal(slice.historicalCompatibility.actionSchemaVersion,
  "hybrid_legal_space_v33");
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
accept("41_previous_slice_is_frozen_and_v33_retains_historical_rules_display");

const keys = generateKeyPairSync("ed25519");
const authority = engineFor(runtime, keys, "slice-95-supply-pool-short-seal-v1");
const seed = envelopeFor(authority, fixture, state);
const authorityOpened = openOfficialSupplyPoolRulesPendingV1(seed.state,
  procedure(seed.state, "round_one_supply_pool", capacityPlan));
const initial = authority.createEnvelope({ roomId: seed.roomId,
  matchBinding: seed.matchBinding, state: authorityOpened.state });
registerReplay(authority, initial, fixture, runtime);
const access = credentials(authority, initial);
const authoritySpace = authority.legalSpace(initial, { seatAuthority: access.authority });
const authorityDomain = authoritySpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_SUPPLY_POOL_RULES_PARAMETER_KIND));
const preview = authority.preview({ envelope: initial, seatAuthority: access.authority,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: { choiceId: authorityDomain.constraints.choices[0].choiceId } } });
assert.equal(preview.ok, true, JSON.stringify(preview));
const confirmation = authority.confirmPreview({ envelope: initial,
  preview: preview.preview, seatAuthority: access.authority });
const authoritativeApplied = authority.apply({ envelope: initial,
  expectedStateRevision: initial.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: access.authority,
  controlLease: access.lease, idempotencyKey: "slice-95-supply-pool" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
const replay = engineFor(runtime, keys, "slice-95-supply-pool-rotated-seal-v2");
registerReplay(replay, initial, fixture, runtime);
assert.equal(replay.replay({ initialEnvelope: initial,
  journal: [authoritativeApplied.receipt] }).ok, true);
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_supply_event" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
accept("42_authority_ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

assert.equal(acceptance.length, 42);
const report = {
  schema: "starcraft_tmg_official_supply_pool_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit,
  supplyPoolDataBundle: bundle, unitCardSupplyDataBundleHash: unitBundle.bundleHash,
  remainingRouteV2Hash: route.routeHash, slice, sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash, catalogueHash: slice.catalogueHash,
  graph, graphAudit: audit.graphAudit, coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true,
    historicalRulesDisplayRetained: true },
  ctx2skill: slice.ctx2skill, harness: slice.harness,
  rulesEligible: false, productionRoomEligible: false,
  rulesTruth: "official_supply_pool_primitive_conformance",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-supply-pool-rules-rule-slice-v1-report.json"),
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
