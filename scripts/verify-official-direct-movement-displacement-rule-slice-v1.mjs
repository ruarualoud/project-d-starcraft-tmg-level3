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
  OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_NEW_ATOM_IDS,
  OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_PARAMETER_KIND,
  openOfficialDirectMovementDisplacementPendingV1,
} from "../packages/rule-atoms/official-direct-movement-displacement-executor-v1.mjs";
import { OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-direct-movement-displacement-relationship-contract-v1.mjs";
import {
  createOfficialDirectMovementDisplacementRuleSliceV1,
  verifyOfficialDirectMovementDisplacementRuleSliceV1,
} from "../packages/rule-atoms/official-direct-movement-displacement-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR, "official-close-combat-lifecycle-rule-slice-v1-report.json",
), "utf8"));
const acceptance = [];
function executableAction(value) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}
function token(id, xInches, yInches, displacement = true) {
  return { id, xInches, yInches, baseShape: "round", baseWidthInches: 1,
    baseDepthInches: 1, displacement, isRemoved: false, isDestroyed: false };
}
function prepare(fixture, input = {}) {
  const state = fixture.battleState({ activeSideKey: "player1", pieces: [
    { id: "p1-actor", sideKey: "player1",
      positions: input.actorPositions || [{ xInches: 5, yInches: 10 }] },
    { id: "p2-target", sideKey: "player2",
      positions: input.targetPositions || [{ xInches: 15, yInches: 10 }] },
  ] });
  state.phase = input.phase || "movement";
  state.rulesProcedureMode = true;
  state.board.tokens = structuredClone(input.tokens || []);
  return state;
}
function route(routeId, input = {}) {
  return { routeId, leadingModelId: input.leadingModelId || "p1-actor-model-1",
    targetReferenceModelId: input.targetReferenceModelId || "p2-target-model-1",
    points: input.points || [{ xMilliInches: 5000, yMilliInches: 10000 },
      { xMilliInches: 9000, yMilliInches: 10000 }],
    blockedByIds: input.blockedByIds || [],
    pathGeometryCertified: (input.blockedByIds || []).length > 0,
    continuesOriginalDirectionAfterBypass: (input.blockedByIds || []).length > 0,
    edgeStop: input.edgeStop === true,
    overlappedObjectIds: input.overlappedObjectIds || [] };
}
function procedure(input = {}) {
  const routeOptions = input.routeOptions || [route("route-main")];
  return { sideKey: "player1", actorUnitId: "p1-actor", targetUnitId: "p2-target",
    direction: input.direction || "directly_towards",
    movementType: input.movementType || "special_ability",
    maxDistanceMilliInches: input.maxDistanceMilliInches || 8000,
    involuntaryMovement: true, candidateRoutesComplete: true,
    candidatePlacementPlansComplete: true,
    displacementContactOptionsComplete: true, routeOptions,
    placementPlans: input.placementPlans || routeOptions.map((entry) => ({
      routeId: entry.routeId, placementPlanId: `${entry.routeId}-plan`, placements: [],
    })), displacementContactOptions: input.displacementContactOptions || [] };
}
function bindingFor(fixture, runtime) {
  return { bindingHash: "slice-81-direct-movement-binding",
    dataSnapshotHash: hashStarcraftTmgContract(fixture.gameplayDataBundle),
    rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash } };
}
function domainFor(runtime, state, binding) {
  return runtime.enumerate(state, { sideKey: "player1", includeDisabled: true,
    matchBinding: binding }).parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_PARAMETER_KIND
  ));
}
function engineFor(runtime, keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-08-31T10:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-81-direct-movement",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen direct-movement procedure.";
function envelopeFor(engine, fixture, state) {
  return engine.createEnvelope({ roomId: "official-slice-81-direct-movement-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-direct-movement-geometry-v1",
        content: { kind: "geometry-artifact",
          geometryVersion: "direct_movement_geometry_certificate_v1" } },
      rulesDisplay: { artifactId: "official-slice-81-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
    }, state });
}
function credentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({ grantId: "slice-81-direct-movement-grant",
    roomId: envelope.roomId, matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1", roleMode: "player", principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
  return { authority, lease: engine.issueControlLease({ seatAuthority: authority,
    sessionId: "slice-81-direct-movement-session", leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision }) };
}
function registerReplay(engine, initial, fixture, runtime) {
  const entries = { sourceSnapshot: fixture.snapshot,
    dataSnapshot: fixture.gameplayDataBundle,
    rulesArtifact: { kind: "rules-artifact", rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: initial.matchBinding.rulesRuntimeBinding },
    executorArtifact: { kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: initial.matchBinding.rulesRuntimeBinding.runtimeHash,
      catalogueHash: initial.matchBinding.rulesRuntimeBinding.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest },
    geometryArtifact: { kind: "geometry-artifact",
      geometryVersion: "direct_movement_geometry_certificate_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v25" } };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content,
  });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}

const slice = createOfficialDirectMovementDisplacementRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialDirectMovementDisplacementRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 510,
  newlyExecutableRuleAtoms: 9, reviewRequiredRuleAtoms: 402,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 510,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 50, missingStateContractExecutors: 0 });
assert.equal(OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_NEW_ATOM_IDS.length, 9);
acceptance.push("slice81_promotes_exact_9_current_review_atoms_to_510_executable");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const binding = bindingFor(fixture, runtime);
assert.equal(fixture.sourceLockAudit.lockHash,
  "1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1");
assert.equal(slice.directMovementDisplacementProgress.sourceRefreshPerformed, false);
acceptance.push("fixed_official_source_lock_is_reused_without_refresh_or_repository_fallback");

const multiState = prepare(fixture, { actorPositions: [
  { xInches: 5, yInches: 10 }, { xInches: 5, yInches: 12 },
  { xInches: 5, yInches: 14 }], targetPositions: [
  { xInches: 15, yInches: 10 }, { xInches: 17, yInches: 10 }] });
const multiProcedure = procedure({ routeOptions: [route("multi")], placementPlans: [
  { routeId: "multi", placementPlanId: "optimal", placements: [
    { modelId: "p1-actor-model-2", xMilliInches: 9000, yMilliInches: 12000 },
    { modelId: "p1-actor-model-3", xMilliInches: 9000, yMilliInches: 14000 }] },
  { routeId: "multi", placementPlanId: "dominated", placements: [
    { modelId: "p1-actor-model-2", xMilliInches: 8000, yMilliInches: 12000 },
    { modelId: "p1-actor-model-3", xMilliInches: 8000, yMilliInches: 14000 }] },
] });
const multiOpened = openOfficialDirectMovementDisplacementPendingV1(
  multiState, multiProcedure,
);
const multiDomain = domainFor(runtime, multiOpened.state, binding);
assert.deepEqual(multiDomain.constraints.eligibleLeadingModelIds, ["p1-actor-model-1"]);
assert(multiDomain.constraints.choices.every((entry) => (
  entry.route.targetReferenceModelId === "p2-target-model-1"
)));
acceptance.push("towards_uses_shortest_route_leader_and_physically_closest_target_model");
assert.equal(multiDomain.constraints.choices.length, 1);
assert.equal(multiDomain.constraints.choices[0].placementPlan.placementPlanId, "optimal");
assert.equal(multiDomain.constraints.choices[0].placementPlan.placements.length, 2);
acceptance.push("arbitrary_multi_model_placement_filters_pareto_dominated_towards_plans");

const awayState = prepare(fixture, { targetPositions: [
  { xInches: 15, yInches: 10 }, { xInches: 17, yInches: 10 }] });
const awayOpened = openOfficialDirectMovementDisplacementPendingV1(awayState,
  procedure({ direction: "directly_away", maxDistanceMilliInches: 3000,
    routeOptions: [route("away", { targetReferenceModelId: "p2-target-model-2",
      points: [{ xMilliInches: 5000, yMilliInches: 10000 },
        { xMilliInches: 2000, yMilliInches: 10000 }] })] }));
assert.equal(awayOpened.pending.choices[0].route.targetReferenceModelId,
  "p2-target-model-2");
acceptance.push("away_uses_the_physically_furthest_target_model_and_cannot_end_closer");

assert.throws(() => openOfficialDirectMovementDisplacementPendingV1(
  prepare(fixture), procedure({ maxDistanceMilliInches: 22000,
    routeOptions: [route("overshoot", { points: [
      { xMilliInches: 5000, yMilliInches: 10000 },
      { xMilliInches: 26000, yMilliInches: 10000 }] })] }),
), /DIRECT_MOVEMENT_ENDPOINT_RELATION_INVALID/u);
assert.throws(() => openOfficialDirectMovementDisplacementPendingV1(
  prepare(fixture), procedure({ routeOptions: [route("off-vector", { points: [
    { xMilliInches: 5000, yMilliInches: 10000 },
    { xMilliInches: 9000, yMilliInches: 11000 }] })] }),
), /DIRECT_MOVEMENT_VECTOR_INVALID/u);
acceptance.push("off_vector_or_wrong_towards_away_endpoint_fails_closed");

const upper = route("upper", { blockedByIds: ["wall"], points: [
  { xMilliInches: 5000, yMilliInches: 10000 },
  { xMilliInches: 6000, yMilliInches: 10000 },
  { xMilliInches: 7000, yMilliInches: 11000 },
  { xMilliInches: 8500, yMilliInches: 10000 },
  { xMilliInches: 9000, yMilliInches: 10000 }] });
const longer = route("longer", { blockedByIds: ["wall"], points: [
  { xMilliInches: 5000, yMilliInches: 10000 },
  { xMilliInches: 6000, yMilliInches: 10000 },
  { xMilliInches: 7000, yMilliInches: 12000 },
  { xMilliInches: 8500, yMilliInches: 10000 },
  { xMilliInches: 9000, yMilliInches: 10000 }] });
const blocked = openOfficialDirectMovementDisplacementPendingV1(prepare(fixture),
  procedure({ routeOptions: [upper, longer] }));
assert.deepEqual(blocked.pending.choices.map((entry) => entry.route.routeId), ["upper"]);
acceptance.push("blocked_direct_movement_exposes_only_the_shortest_certified_bypass");
const lower = route("lower", { blockedByIds: ["wall"], points: [
  { xMilliInches: 5000, yMilliInches: 10000 },
  { xMilliInches: 6000, yMilliInches: 10000 },
  { xMilliInches: 7000, yMilliInches: 9000 },
  { xMilliInches: 8500, yMilliInches: 10000 },
  { xMilliInches: 9000, yMilliInches: 10000 }] });
const tied = openOfficialDirectMovementDisplacementPendingV1(prepare(fixture),
  procedure({ routeOptions: [upper, lower] }));
assert.deepEqual(tied.pending.choices.map((entry) => entry.route.routeId).sort(),
  ["lower", "upper"]);
acceptance.push("equally_short_bypass_routes_remain_controlling_player_choices");

const edgeOpened = openOfficialDirectMovementDisplacementPendingV1(prepare(fixture),
  procedure({ direction: "directly_away", maxDistanceMilliInches: 10000,
    routeOptions: [route("edge", { points: [
      { xMilliInches: 5000, yMilliInches: 10000 },
      { xMilliInches: 630, yMilliInches: 10000 }], edgeStop: true })] }));
assert.equal(edgeOpened.pending.choices[0].route.endpoint.xMilliInches, 630);
assert.equal(edgeOpened.pending.choices[0].route.edgeStop, true);
acceptance.push("involuntary_movement_stops_with_the_whole_base_in_contact_with_board_edge");

const incomplete = procedure();
incomplete.candidateRoutesComplete = false;
assert.throws(() => openOfficialDirectMovementDisplacementPendingV1(
  prepare(fixture), incomplete,
), /DIRECT_MOVEMENT_PROCEDURE_CERTIFICATE_REQUIRED/u);
acceptance.push("incomplete_route_placement_or_contact_geometry_certificate_fails_closed");

const nonDisplacementState = prepare(fixture, { tokens: [token("crate", 9, 10, false)] });
assert.throws(() => openOfficialDirectMovementDisplacementPendingV1(
  nonDisplacementState, procedure({ routeOptions: [route("crate", {
    overlappedObjectIds: ["crate"] })] }),
), /DIRECT_MOVEMENT_DISPLACEMENT_OBJECT_INVALID/u);
acceptance.push("leading_model_overlap_permission_applies_only_to_displacement_objects");

const displacementState = prepare(fixture, { tokens: [token("displacement", 9, 10)] });
const displacementProcedure = procedure({ routeOptions: [route("displace", {
  overlappedObjectIds: ["displacement"] })], displacementContactOptions: [
  { objectId: "displacement", contactOptionId: "contact",
    xMilliInches: 10130, yMilliInches: 10000 },
  { objectId: "displacement", contactOptionId: "near",
    xMilliInches: 10500, yMilliInches: 10000 },
] });
const displacementOpened = openOfficialDirectMovementDisplacementPendingV1(
  displacementState, displacementProcedure,
);
assert.deepEqual(displacementOpened.pending.choices.map((entry) => (
  entry.displacementContact.contactOptionId
)), ["contact"]);
acceptance.push("displacement_resolution_prioritizes_immediate_base_contact_when_possible");
const nearestOpened = openOfficialDirectMovementDisplacementPendingV1(
  displacementState, procedure({ routeOptions: [route("nearest", {
    overlappedObjectIds: ["displacement"] })], displacementContactOptions: [
    { objectId: "displacement", contactOptionId: "nearer",
      xMilliInches: 10500, yMilliInches: 10000 },
    { objectId: "displacement", contactOptionId: "farther",
      xMilliInches: 11000, yMilliInches: 10000 },
  ] }),
);
assert.deepEqual(nearestOpened.pending.choices.map((entry) => (
  entry.displacementContact.contactOptionId
)), ["nearer"]);
acceptance.push("when_contact_is_certified_impossible_only_the_nearest_position_remains_legal");

const displacementDomain = domainFor(runtime, displacementOpened.state, binding);
const displacementAction = runtime.instantiate(displacementOpened.state,
  displacementDomain, { choiceId: displacementDomain.constraints.choices[0].choiceId },
  { matchBinding: binding });
const displacementApplied = runtime.apply(displacementOpened.state,
  executableAction(displacementAction.action), { matchBinding: binding });
assert.equal(displacementApplied.state.pieces[0].models[0].xInches, 9);
assert.equal(displacementApplied.state.board.tokens[0].xInches, 10.13);
assert.equal(displacementApplied.state.lastDirectMovementDisplacementResolution
  .displacementBaseContact, true);
acceptance.push("apply_moves_the_unit_then_immediately_repositions_the_displacement_object");

const stale = structuredClone(multiOpened.state);
stale.pieces.find((piece) => piece.id === "p2-target").models[0].xInches = 16;
assert.throws(() => runtime.instantiate(stale, multiDomain,
  { choiceId: multiDomain.constraints.choices[0].choiceId }, { matchBinding: binding }),
/DIRECT_MOVEMENT_PENDING_INVALID/u);
acceptance.push("piece_board_pending_or_geometry_change_invalidates_the_parameter_domain");
const sourceDrift = structuredClone(multiOpened.state);
sourceDrift.officialDevelopmentTrancheSourceLockAudit.lockHash = "0".repeat(64);
const disabled = runtime.enumerate(sourceDrift, { sideKey: "player1",
  includeDisabled: true, matchBinding: binding }).candidates[0];
assert.equal(disabled.disabledReason, "DIRECT_MOVEMENT_SOURCE_LOCK_BINDING_INVALID");
acceptance.push("source_lock_drift_fails_closed_before_direct_movement_resolution");

const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_RELATIONSHIP_SCOPE_ID
));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "derived_value:directMovementDisplacementV1.coherentParetoPlacements"
    && entry.to === "derived_value:directMovementDisplacementV1.contactOrNearestPlacement"
));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash"),
));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
acceptance.push("relationship_graph_blocks_missing_placement_to_displacement_dependency");

const keys = generateKeyPairSync("ed25519");
const authority = engineFor(runtime, keys, "slice-81-direct-movement-short-seal-v1");
const authorityState = openOfficialDirectMovementDisplacementPendingV1(
  prepare(fixture), procedure(),
).state;
const initial = envelopeFor(authority, fixture, authorityState);
registerReplay(authority, initial, fixture, runtime);
const access = credentials(authority, initial);
const authoritySpace = authority.legalSpace(initial, { seatAuthority: access.authority });
const authorityDomain = authoritySpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_PARAMETER_KIND
));
assert(authorityDomain, JSON.stringify({ domains: authoritySpace.parameterDomains,
  disabled: authoritySpace.disabledDiagnostics }));
const preview = authority.preview({ envelope: initial, seatAuthority: access.authority,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: { choiceId: authorityDomain.constraints.choices[0].choiceId } } });
assert.equal(preview.ok, true, JSON.stringify(preview));
const confirmation = authority.confirmPreview({ envelope: initial,
  preview: preview.preview, seatAuthority: access.authority });
const authoritativeApplied = authority.apply({ envelope: initial,
  expectedStateRevision: initial.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: access.authority,
  controlLease: access.lease, idempotencyKey: "slice-81-direct-movement" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
acceptance.push("authority_preview_confirm_apply_executes_the_choice_with_ed25519_signature");

const replay = engineFor(runtime, keys, "slice-81-direct-movement-rotated-seal-v2");
registerReplay(replay, initial, fixture, runtime);
const replayed = replay.replay({ initialEnvelope: initial,
  journal: [authoritativeApplied.receipt] });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_direct_movement_event" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
assert.equal(initial.matchBinding.rulesDisplayBinding.artifactHash,
  hashStarcraftTmgContract(DISPLAY));
acceptance.push("ed25519_replay_survives_hmac_rotation_rejects_tamper_and_retains_old_display");

assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
acceptance.push("no_skill_dsh_muzero_memory_selfplay_or_training_promotion_occurs_in_slice81");
assert.equal(acceptance.length, 20);

const report = {
  schema: "starcraft_tmg_official_direct_movement_displacement_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit, slice, sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash, catalogueHash: slice.catalogueHash,
  graph, graphAudit: audit.graphAudit, coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true,
    historicalRulesDisplayRetained: true },
  ctx2skill: slice.ctx2skill, harness: slice.harness,
  rulesEligible: false, productionRoomEligible: false,
  rulesTruth: "official_direct_movement_displacement_procedure_conformance",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-direct-movement-displacement-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ schema: report.schema,
  acceptancePassed: report.acceptancePassed, acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash, catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash, graphHash: graph.graphHash,
  graphCounts: { nodes: graph.nodes.length, edges: graph.edges.length },
  counts: audit.counts, sourceLockHash: fixture.sourceLockAudit.lockHash,
  sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  trainingTruth: false }, null, 2));
