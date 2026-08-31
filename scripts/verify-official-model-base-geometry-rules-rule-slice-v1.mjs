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
  OFFICIAL_MODEL_BASE_GEOMETRY_RULES_NEW_ATOM_IDS,
  OFFICIAL_MODEL_BASE_GEOMETRY_RULES_PARAMETER_KIND,
  openOfficialModelBaseGeometryRulesPendingV1,
} from "../packages/rule-atoms/official-model-base-geometry-rules-executor-v1.mjs";
import {
  createOfficialModelBaseFootprintV1,
  createOfficialNoLegalCoherencyPositionCertificateV1,
  evaluateOfficialBaseMeasurementV1,
  evaluateOfficialCoherencyPlacementV1,
  evaluateOfficialWithinWhollyWithinV1,
} from "../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";
import { OFFICIAL_MODEL_BASE_GEOMETRY_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-model-base-geometry-rules-relationship-contract-v1.mjs";
import {
  createOfficialModelBaseGeometryRulesRuleSliceV1,
  verifyOfficialModelBaseGeometryRulesRuleSliceV1,
} from "../packages/rule-atoms/official-model-base-geometry-rules-rule-slice-v1.mjs";
import { createOfficialRemainingRuleAtomRouteV2 } from
  "../packages/rule-atoms/official-remaining-rule-atom-route-v2.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { getOfficialCurrentProductRecord } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import {
  createOfficialModelBaseGeometryDataBundleV1,
  verifyOfficialModelBaseGeometryDataBundleV1,
} from "../packages/source-data/official-model-base-geometry-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR, "official-special-terrain-rules-rule-slice-v1-report.json",
), "utf8"));
const routeBaseReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR, "official-elevation-effective-size-rules-rule-slice-v1-report.json",
), "utf8"));
const acceptance = [];

function prepare(fixture, bundle, input = {}) {
  const state = fixture.battleState({ activeSideKey: "player1", pieces: [
    { id: "p1-actor", sideKey: "player1",
      positions: input.actorPositions || [{ xInches: 5, yInches: 5 },
        { xInches: 5, yInches: 7 }] },
    { id: "p2-target", sideKey: "player2",
      positions: input.targetPositions || [{ xInches: 13, yInches: 5 }] },
  ] });
  state.phase = input.phase || "movement";
  state.rulesProcedureMode = true;
  state.officialModelBaseGeometryDataBundle = bundle;
  state.board.terrain = structuredClone(input.terrain || []);
  state.board.tokens = structuredClone(input.tokens || []);
  if (input.specialTerrainAgreement) {
    state.board.specialTerrainAgreement = structuredClone(input.specialTerrainAgreement);
  }
  return state;
}
function replaceUnit(piece, dataset, recordKey, base) {
  const record = getOfficialCurrentProductRecord(dataset, recordKey);
  piece.name = record.payload.name;
  piece.officialUnitRecordKey = recordKey;
  piece.sourceRecordHash = record.sourceRecordHash;
  piece.officialPayloadHash = record.payloadHash;
  for (const model of piece.models) {
    model.baseShape = base.shape;
    model.baseWidthInches = base.width;
    model.baseDepthInches = base.depth;
    model.baseRotationDegrees = base.rotation || 0;
  }
}
function ref(unitId, modelId) { return { kind: "model", unitId, modelId }; }
function procedure(state, kind, plan) {
  return { procedureKind: kind, sideKey: "player1", actorUnitId: "p1-actor",
    candidatePlansComplete: true, rulesDenominatorComplete: true,
    candidatePlans: [plan] };
}
function bindingFor(runtime, bundle) {
  const contentHash = hashStarcraftTmgContract(bundle);
  return { bindingHash: "slice-87-model-base-geometry-binding",
    rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
    geometryArtifactHash: contentHash,
    dependencies: { geometryArtifact: { contentHash } } };
}
function domainFor(runtime, state, binding) {
  return runtime.enumerate(state, { sideKey: "player1", includeDisabled: true,
    matchBinding: binding }).parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_MODEL_BASE_GEOMETRY_RULES_PARAMETER_KIND
  ));
}
function engineFor(runtime, keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-09-01T01:30:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-87-model-base-geometry",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 87 model/base geometry rules.";
function envelopeFor(engine, fixture, bundle, state) {
  return engine.createEnvelope({ roomId: "official-slice-87-model-base-geometry-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-model-base-geometry-data-bundle-v1",
        content: bundle },
      rulesDisplay: { artifactId: "official-slice-87-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
    }, state });
}
function credentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({ grantId: "slice-87-model-base-grant",
    roomId: envelope.roomId, matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1", roleMode: "player", principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
  return { authority, lease: engine.issueControlLease({ seatAuthority: authority,
    sessionId: "slice-87-model-base-session", leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision }) };
}
function registerReplay(engine, initial, fixture, runtime, bundle) {
  const entries = { sourceSnapshot: fixture.snapshot,
    dataSnapshot: fixture.gameplayDataBundle,
    rulesArtifact: { kind: "rules-artifact", rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: initial.matchBinding.rulesRuntimeBinding },
    executorArtifact: { kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: initial.matchBinding.rulesRuntimeBinding.runtimeHash,
      catalogueHash: initial.matchBinding.rulesRuntimeBinding.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest },
    geometryArtifact: bundle,
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v25" } };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content,
  });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}

const slice = createOfficialModelBaseGeometryRulesRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialModelBaseGeometryRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 612,
  newlyExecutableRuleAtoms: 21, reviewRequiredRuleAtoms: 300,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 612,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 56, missingStateContractExecutors: 0 });
acceptance.push("slice87_promotes_exact_21_route_atoms_to_612_executable");

const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 87);
assert.deepEqual(assignment.atomIds, [...OFFICIAL_MODEL_BASE_GEOMETRY_RULES_NEW_ATOM_IDS]);
assert.equal(assignment.executableAfter, 612);
assert.equal(assignment.reviewRequiredAfter, 300);
acceptance.push("route_v2_exact_slice87_atom_identity_and_counts_match");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const bundle = createOfficialModelBaseGeometryDataBundleV1({ dataset: fixture.dataset });
assert.equal(verifyOfficialModelBaseGeometryDataBundleV1(bundle), true);
assert.deepEqual(fixture.snapshot.dataVersions, {
  unitsVersion: "71", cardsVersion: "69", rulesVersion: "48",
});
acceptance.push("sealed_source_lock_binds_versions_71_69_48_without_refresh");

assert.equal(bundle.profiles.length, 26);
assert.equal(new Set(bundle.profiles.map((entry) => entry.recordKey)).size, 26);
acceptance.push("official_current_unit_base_profile_denominator_is_26_of_26");

assert.equal(bundle.profiles.filter((entry) => entry.baseShape === "round").length, 25);
assert.equal(bundle.profiles.filter((entry) => entry.baseShape === "rectangle").length, 1);
acceptance.push("official_base_shape_denominator_is_25_round_plus_1_rectangle");

const hydraliskProfile = bundle.profiles.find((entry) => (
  entry.recordKey === "army_units:hydralisk"
));
assert.deepEqual({ shape: hydraliskProfile.baseShape,
  width: hydraliskProfile.baseWidthMillimetres,
  depth: hydraliskProfile.baseDepthMillimetres,
  source: hydraliskProfile.p2pSource.sourceId,
  page: hydraliskProfile.p2pSource.pdfPage },
{ shape: "rectangle", width: 40, depth: 100, source: "zerg_p2p", page: 1 });
acceptance.push("hydralisk_40_by_100_mm_rectangular_base_is_source_bound");

const state = prepare(fixture, bundle);
const actor = state.pieces[0]; const target = state.pieces[1];
const actorModel = actor.models[0]; const targetModel = target.models[0];
const round = createOfficialModelBaseFootprintV1({ piece: actor,
  model: actorModel, dataBundle: bundle });
assert.equal(round.shape, "round");
assert.equal(round.widthMilliInches, 1260);
assert.equal(round.physicalMiniatureExcluded, true);
acceptance.push("round_base_footprint_uses_p2p_size_and_excludes_miniature_geometry");

const rectangleState = prepare(fixture, bundle, { actorPositions: [
  { xInches: 6, yInches: 6 }, { xInches: 10, yInches: 6 },
] });
replaceUnit(rectangleState.pieces[0], fixture.dataset, "army_units:hydralisk",
  { shape: "rectangle", width: 1.575, depth: 3.937, rotation: 90 });
const rectangle = createOfficialModelBaseFootprintV1({ piece: rectangleState.pieces[0],
  model: rectangleState.pieces[0].models[0], dataBundle: bundle });
assert.equal(rectangle.shape, "rectangle");
assert.equal(rectangle.vertices.length, 4);
assert.equal(rectangle.rotationDegrees, 90);
acceptance.push("rotated_rectangular_hydralisk_base_has_exact_four_vertex_footprint");

const wrongBaseState = structuredClone(rectangleState);
wrongBaseState.pieces[0].models[0].baseDepthInches = 1.575;
assert.throws(() => createOfficialModelBaseFootprintV1({ piece: wrongBaseState.pieces[0],
  model: wrongBaseState.pieces[0].models[0], dataBundle: bundle }),
/MODEL_BASE_GEOMETRY_CORRECT_BASE_REQUIRED/u);
acceptance.push("wrong_shape_or_size_cannot_satisfy_correct_official_base_requirement");

targetModel.xInches = 7.52;
const measured = evaluateOfficialBaseMeasurementV1({ state,
  source: ref(actor.id, actorModel.id), target: ref(target.id, targetModel.id),
  dataBundle: bundle });
assert.equal(measured.distanceMilliInches, 1260);
assert.equal(measured.distanceInches, 1.26);
acceptance.push("model_distance_uses_nearest_base_edges_in_inches");

targetModel.xInches = 6.26;
const contact = evaluateOfficialBaseMeasurementV1({ state,
  source: ref(actor.id, actorModel.id), target: ref(target.id, targetModel.id),
  dataBundle: bundle });
assert.equal(contact.distanceMilliInches, 0);
assert.equal(contact.baseToBaseContact, true);
acceptance.push("physical_base_contact_has_zero_distance");

assert.equal(contact.unrestrictedPremeasurement, true);
assert.equal(contact.miniatureOverhangIgnored, true);
assert.equal(contact.source.footprint.scenicElementsExcluded, true);
acceptance.push("premeasurement_is_unrestricted_and_overhang_scenery_are_ignored");

state.board.tokens.push({ id: "round-token", xInches: 8, yInches: 5,
  baseShape: "round", baseWidthInches: 1, baseDepthInches: 1 });
const tokenDistance = evaluateOfficialBaseMeasurementV1({ state,
  source: ref(actor.id, actorModel.id), target: { kind: "token", id: "round-token" },
  dataBundle: bundle });
assert.equal(tokenDistance.tokenAndMarkerNearestEdgeUsed, true);
assert.equal(tokenDistance.distanceMilliInches, 1870);
acceptance.push("token_and_marker_distance_uses_nearest_physical_edge");

targetModel.xInches = 8.5;
const partial = evaluateOfficialWithinWhollyWithinV1({ state,
  source: ref(actor.id, actorModel.id), targetUnitId: target.id,
  rangeMilliInches: 3000, dataBundle: bundle });
assert.equal(partial.assessments[0].within, true);
assert.equal(partial.assessments[0].whollyWithin, false);
acceptance.push("partial_base_overlap_satisfies_within_but_not_wholly_within");

targetModel.xInches = 8;
const whole = evaluateOfficialWithinWhollyWithinV1({ state,
  source: ref(actor.id, actorModel.id), targetUnitId: target.id,
  rangeMilliInches: 3000, dataBundle: bundle });
assert.equal(whole.assessments[0].whollyWithin, true);
acceptance.push("complete_target_base_inside_range_satisfies_wholly_within");

target.models.push({ ...structuredClone(target.models[0]), id: "p2-target-model-2",
  xInches: 10 });
target.currentModels = 2;
const unitRelation = evaluateOfficialWithinWhollyWithinV1({ state,
  source: ref(actor.id, actorModel.id), targetUnitId: target.id,
  rangeMilliInches: 3000, dataBundle: bundle });
assert.equal(unitRelation.unitWithin, true);
assert.equal(unitRelation.unitWhollyWithin, false);
acceptance.push("unit_within_uses_any_model_while_unit_wholly_within_uses_every_model");

const rectangleTarget = rectangleState.pieces[1];
rectangleTarget.models[0].xInches = 12;
const rectangleMeasurement = evaluateOfficialBaseMeasurementV1({ state: rectangleState,
  source: ref(rectangleState.pieces[0].id, rectangleState.pieces[0].models[0].id),
  target: ref(rectangleTarget.id, rectangleTarget.models[0].id), dataBundle: bundle });
assert.equal(rectangleMeasurement.distanceMilliInches > 0, true);
assert.equal(rectangleMeasurement.source.footprint.shape, "rectangle");
acceptance.push("round_to_rotated_rectangle_nearest_edge_measurement_is_executable");

const coherencyState = prepare(fixture, bundle);
const [leading, other] = coherencyState.pieces[0].models;
const coherencyPlan = { planId: "coherency-plan", leadingModelId: leading.id,
  currentlyEngagedEnemyUnitIds: [], placements: [
    { modelId: leading.id, xMilliInches: 5000, yMilliInches: 5000 },
    { modelId: other.id, xMilliInches: 7000, yMilliInches: 5000 },
  ] };
const coherency = evaluateOfficialCoherencyPlacementV1({ state: coherencyState,
  actor: coherencyState.pieces[0], plan: coherencyPlan, dataBundle: bundle });
assert.equal(coherency.inCoherency, true);
assert.equal(coherency.linkEdges.length, 1);
acceptance.push("placed_models_require_wholly_within_three_and_connected_link_graph");

assert.equal(coherency.canControlOrContestMissionMarkers, true);
assert.equal(coherency.leadingModelNominationEndsOnActionResolution, true);
acceptance.push("in_coherency_enables_mission_capability_and_nomination_is_action_scoped");

const outPlan = structuredClone(coherencyPlan);
outPlan.planId = "out-of-coherency-plan";
outPlan.closestLegalPlacementDenominatorComplete = true;
outPlan.placements[1].xMilliInches = 9000;
const out = evaluateOfficialCoherencyPlacementV1({ state: coherencyState,
  actor: coherencyState.pieces[0], plan: outPlan, dataBundle: bundle });
assert.equal(out.outOfCoherency, true);
assert.equal(out.canControlOrContestMissionMarkers, false);
acceptance.push("closest_legal_beyond_three_is_out_of_coherency_and_loses_mission_capability");

const blockedState = prepare(fixture, bundle, { terrain: [{ id: "wall",
  blocksPlacement: true, footprint: { shape: "axis_aligned_rectangle",
    minXMilliInches: 5750, maxXMilliInches: 6250,
    minYMilliInches: 4000, maxYMilliInches: 6000 } }] });
assert.throws(() => evaluateOfficialCoherencyPlacementV1({ state: blockedState,
  actor: blockedState.pieces[0], plan: coherencyPlan, dataBundle: bundle }),
/MODEL_BASE_GEOMETRY_COHERENCY_LINK_INVALID/u);
acceptance.push("terrain_crossing_without_access_point_blocks_coherency_link");

const accessState = structuredClone(blockedState);
accessState.board.specialTerrainAgreement = { terrainEntries: [{ terrainId: "wall",
  accessPoints: [{ accessPointId: "door", footprint: {
    minXMilliInches: 5750, maxXMilliInches: 6250,
    minYMilliInches: 4750, maxYMilliInches: 5250 } }] }] };
const throughAccess = evaluateOfficialCoherencyPlacementV1({ state: accessState,
  actor: accessState.pieces[0], plan: coherencyPlan, dataBundle: bundle });
assert.equal(throughAccess.linkEdges.length, 1);
acceptance.push("coherency_link_may_cross_declared_access_point");

const proof = createOfficialNoLegalCoherencyPositionCertificateV1({
  modelId: other.id, leadingModelId: leading.id,
  stateGeometryHash: coherency.stateGeometryHash,
  candidatePositionDenominatorComplete: true, legalLinkedPositionCount: 0,
  proofArtifactHash: hashStarcraftTmgContract({ fixture: "no-linked-position" }),
});
const casualtyPlan = { planId: "casualty-plan", leadingModelId: leading.id,
  placements: [
    { modelId: leading.id, xMilliInches: 5000, yMilliInches: 5000 },
    { modelId: other.id, outcome: "casualty", noLegalPositionCertificate: proof },
  ] };
const casualty = evaluateOfficialCoherencyPlacementV1({ state: coherencyState,
  actor: coherencyState.pieces[0], plan: casualtyPlan, dataBundle: bundle });
assert.deepEqual(casualty.casualtyModelIds, [other.id]);
acceptance.push("no_legal_link_certificate_authorizes_immediate_placement_casualty");

const forgedCasualty = structuredClone(casualtyPlan);
forgedCasualty.placements[1].noLegalPositionCertificate.legalLinkedPositionCount = 1;
assert.throws(() => evaluateOfficialCoherencyPlacementV1({ state: coherencyState,
  actor: coherencyState.pieces[0], plan: forgedCasualty, dataBundle: bundle }),
/MODEL_BASE_GEOMETRY_CASUALTY_PROOF_INVALID/u);
acceptance.push("forged_or_incomplete_casualty_proof_is_rejected");

const wobblyPlan = { planId: "wobbly-plan", modelId: leading.id,
  agreedPosition: { xMilliInches: 5500, yMilliInches: 5500, rotationDegrees: 0 },
  physicalDisplayPosition: { xMilliInches: 5400, yMilliInches: 5450 },
  positionMarkerId: "wobbly-leading-marker",
  agreedPlayerKeys: ["player1", "player2"] };
const wobblyOpened = openOfficialModelBaseGeometryRulesPendingV1(coherencyState,
  procedure(coherencyState, "wobbly_position_agreement", wobblyPlan));
assert.equal(wobblyOpened.pending.choices[0].result.treatedAsAgreedPositionForAllRules, true);
acceptance.push("mutually_agreed_wobbly_position_is_rules_position_for_all_purposes");

assert.throws(() => openOfficialModelBaseGeometryRulesPendingV1(coherencyState,
  procedure(coherencyState, "wobbly_position_agreement", {
    ...wobblyPlan, agreedPlayerKeys: ["player1"] })),
/MODEL_BASE_GEOMETRY_WOBBLY_AGREEMENT_INCOMPLETE/u);
acceptance.push("wobbly_position_requires_all_players_and_visible_marker");

const binding = bindingFor(runtime, bundle);
const measurementPlan = { planId: "runtime-measurement-plan",
  source: ref(coherencyState.pieces[0].id, leading.id),
  target: ref(coherencyState.pieces[1].id, coherencyState.pieces[1].models[0].id) };
const opened = openOfficialModelBaseGeometryRulesPendingV1(coherencyState,
  procedure(coherencyState, "measurement_check", measurementPlan));
const domain = domainFor(runtime, opened.state, binding);
assert(domain);
assert.equal(domain.constraints.choices.length, 1);
assert.equal(domain.constraints.currentOfficialBaseGeometryProductionQuarantineLifted, true);
acceptance.push("runtime_domain_binds_complete_certified_plan_set_and_lifts_current_geometry_quarantine");

const coherencyOpened = openOfficialModelBaseGeometryRulesPendingV1(coherencyState,
  procedure(coherencyState, "coherency_placement_check", coherencyPlan));
const coherencyDomain = domainFor(runtime, coherencyOpened.state, binding);
const coherencyAction = runtime.instantiate(coherencyOpened.state, coherencyDomain,
  { choiceId: coherencyDomain.constraints.choices[0].choiceId }, { matchBinding: binding });
const coherencyApplied = runtime.apply(coherencyOpened.state,
  coherencyAction.action, { matchBinding: binding });
assert.equal(coherencyApplied.state.pieces[0].models[1].xInches, 7);
assert.equal(coherencyApplied.state.pieces[0].coherencyStatus.status, "in_coherency");
assert.equal(coherencyApplied.state.pieces[0].leadingModelNomination, undefined);
acceptance.push("authority_apply_updates_placements_coherency_and_ends_leading_nomination");

const casualtyOpened = openOfficialModelBaseGeometryRulesPendingV1(coherencyState,
  procedure(coherencyState, "coherency_placement_check", casualtyPlan));
const casualtyDomain = domainFor(runtime, casualtyOpened.state, binding);
const casualtyAction = runtime.instantiate(casualtyOpened.state, casualtyDomain,
  { choiceId: casualtyDomain.constraints.choices[0].choiceId }, { matchBinding: binding });
const casualtyApplied = runtime.apply(casualtyOpened.state,
  casualtyAction.action, { matchBinding: binding });
assert.equal(casualtyApplied.state.pieces[0].currentModels, 1);
assert.equal(casualtyApplied.state.pieces[0].models[1].isDestroyed, true);
acceptance.push("authority_apply_persists_certified_no_link_casualty");

const sourceDrift = structuredClone(opened.state);
sourceDrift.officialDevelopmentTrancheSourceLockAudit.lockHash = "0".repeat(64);
assert.equal(runtime.enumerate(sourceDrift, { sideKey: "player1", includeDisabled: true,
  matchBinding: binding }).candidates[0].disabledReason,
"MODEL_BASE_GEOMETRY_SOURCE_LOCK_BINDING_INVALID");
acceptance.push("source_drift_disables_model_base_geometry_legalspace");

const geometryDrift = structuredClone(binding);
geometryDrift.dependencies.geometryArtifact.contentHash = "0".repeat(64);
assert.equal(runtime.enumerate(opened.state, { sideKey: "player1", includeDisabled: true,
  matchBinding: geometryDrift }).candidates[0].disabledReason,
"MODEL_BASE_GEOMETRY_ARTIFACT_BINDING_INVALID");
acceptance.push("geometry_artifact_drift_disables_model_base_geometry_legalspace");

const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_MODEL_BASE_GEOMETRY_RULES_RELATIONSHIP_SCOPE_ID
));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "derived_value:modelBaseGeometryV1.baseFootprint"
    && entry.to === "derived_value:modelBaseGeometryV1.nearestEdgeDistance"
));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash"),
));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
acceptance.push("relationship_graph_blocks_missing_base_to_measurement_dependency");

const keys = generateKeyPairSync("ed25519");
const authority = engineFor(runtime, keys, "slice-87-model-base-short-seal-v1");
const authoritySeed = envelopeFor(authority, fixture, bundle, coherencyState);
const authorityOpened = openOfficialModelBaseGeometryRulesPendingV1(
  authoritySeed.state, procedure(authoritySeed.state, "measurement_check", measurementPlan),
);
const initial = authority.createEnvelope({ roomId: authoritySeed.roomId,
  matchBinding: authoritySeed.matchBinding, state: authorityOpened.state });
registerReplay(authority, initial, fixture, runtime, bundle);
const access = credentials(authority, initial);
const authoritySpace = authority.legalSpace(initial, { seatAuthority: access.authority });
const authorityDomain = authoritySpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_MODEL_BASE_GEOMETRY_RULES_PARAMETER_KIND
));
const preview = authority.preview({ envelope: initial, seatAuthority: access.authority,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: { choiceId: authorityDomain.constraints.choices[0].choiceId } } });
assert.equal(preview.ok, true, JSON.stringify(preview));
const confirmation = authority.confirmPreview({ envelope: initial,
  preview: preview.preview, seatAuthority: access.authority });
const authoritativeApplied = authority.apply({ envelope: initial,
  expectedStateRevision: initial.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: access.authority,
  controlLease: access.lease, idempotencyKey: "slice-87-model-base-geometry" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
const replay = engineFor(runtime, keys, "slice-87-model-base-rotated-seal-v2");
registerReplay(replay, initial, fixture, runtime, bundle);
assert.equal(replay.replay({ initialEnvelope: initial,
  journal: [authoritativeApplied.receipt] }).ok, true);
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_model_base_geometry_event" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
acceptance.push("authority_ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.modelBaseGeometryRulesProgress.sourceRefreshPerformed, false);
acceptance.push("no_source_refresh_skill_dsh_muzero_selfplay_or_training_promotion_occurs");
assert.equal(acceptance.length, 34);

const report = {
  schema: "starcraft_tmg_official_model_base_geometry_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit,
  modelBaseGeometryDataBundle: bundle,
  remainingRouteV2Hash: route.routeHash,
  slice, sliceAudit: audit, runtimeHash: runtime.descriptor.runtimeHash,
  catalogueHash: slice.catalogueHash, graph, graphAudit: audit.graphAudit,
  coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true,
    historicalRulesDisplayRetained: true },
  ctx2skill: slice.ctx2skill, harness: slice.harness,
  rulesEligible: false, productionRoomEligible: false,
  rulesTruth: "official_model_base_geometry_measurement_and_coherency_conformance",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-model-base-geometry-rules-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ schema: report.schema,
  acceptancePassed: report.acceptancePassed, acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash, catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash, graphHash: graph.graphHash,
  graphCounts: { nodes: graph.nodes.length, edges: graph.edges.length },
  counts: audit.counts, routeV2Hash: route.routeHash,
  baseProfiles: { total: bundle.profiles.length,
    round: bundle.profiles.filter((entry) => entry.baseShape === "round").length,
    rectangle: bundle.profiles.filter((entry) => entry.baseShape === "rectangle").length },
  sourceLockHash: fixture.sourceLockAudit.lockHash,
  sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  trainingTruth: false }, null, 2));
