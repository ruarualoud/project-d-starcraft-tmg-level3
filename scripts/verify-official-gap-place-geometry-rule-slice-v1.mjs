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
  OFFICIAL_GAP_PLACE_GEOMETRY_NEW_ATOM_IDS,
  OFFICIAL_GAP_PLACE_GEOMETRY_PARAMETER_KIND,
  openOfficialGapPlaceGeometryPendingV1,
} from "../packages/rule-atoms/official-gap-place-geometry-executor-v1.mjs";
import { OFFICIAL_GAP_PLACE_GEOMETRY_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-gap-place-geometry-relationship-contract-v1.mjs";
import {
  createOfficialGapPlaceGeometryRuleSliceV1,
  verifyOfficialGapPlaceGeometryRuleSliceV1,
} from "../packages/rule-atoms/official-gap-place-geometry-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { getOfficialCurrentProductRecord } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR, "official-direct-movement-displacement-rule-slice-v1-report.json",
), "utf8"));
const acceptance = [];
function executableAction(value) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}
function terrainRectangle(id, minX, maxX, minY = 4000, maxY = 6000) {
  return { id, shape: "axis_aligned_rectangle", blocksPlacement: true,
    footprint: { shape: "axis_aligned_rectangle", minXMilliInches: minX,
      maxXMilliInches: maxX, minYMilliInches: minY, maxYMilliInches: maxY } };
}
function prepare(fixture, input = {}) {
  const state = fixture.battleState({ activeSideKey: "player1", pieces: [
    { id: "p1-actor", sideKey: "player1",
      positions: input.actorPositions || [{ xInches: 4.5, yInches: 2 }],
      flying: input.flying === true },
    { id: "p2-enemy", sideKey: "player2",
      positions: input.enemyPositions || [{ xInches: 20, yInches: 20 }] },
  ] });
  state.phase = input.phase || "movement";
  state.rulesProcedureMode = true;
  state.board.terrain = structuredClone(input.terrain || []);
  for (const piece of state.pieces) piece.sizeCharacteristic = Number(
    piece.id === "p1-actor" ? input.size ?? 2 : 2,
  );
  return state;
}
function placement(modelId, x, y) {
  return { modelId, xMilliInches: x, yMilliInches: y };
}
function physicalGap(leftId, rightId, leftX, rightX, input = {}) {
  return { gapId: input.gapId || "gap-main", kind: input.kind || "physical_gap",
    leftBoundary: { objectId: leftId,
      point: { xMilliInches: leftX, yMilliInches: 5000 } },
    rightBoundary: { objectId: rightId,
      point: { xMilliInches: rightX, yMilliInches: 5000 } },
    ...(input.kind === "terrain_opening"
      ? { openingId: input.openingId || "opening-main" } : {}) };
}
function gapProcedure(input = {}) {
  const startX = Number(input.startX ?? 4500);
  const endpointY = Number(input.endpointY ?? 8000);
  const modelId = input.modelId || "p1-actor-model-1";
  return { procedureKind: "gap_traversal", sideKey: "player1",
    actorUnitId: "p1-actor", movementType: input.movementType || "move",
    candidatePlansComplete: true, geometryDenominatorComplete: true,
    candidatePlans: [{ planId: input.planId || "gap-plan", leadingModelId: modelId,
      path: input.path || [{ xMilliInches: startX, yMilliInches: 2000 },
        { xMilliInches: startX, yMilliInches: endpointY }],
      gapMouths: input.gapMouths || [], coherencyGapMouths: [],
      placements: [placement(modelId, startX, endpointY)] }] };
}
function placeProcedure(input = {}) {
  return { procedureKind: "place", sideKey: "player1", actorUnitId: "p1-actor",
    maxDistanceMilliInches: Number(input.maxDistanceMilliInches || 3000),
    candidatePlansComplete: true, geometryDenominatorComplete: true,
    candidatePlans: [input.plan || { planId: "place-plan",
      leadingModelId: "p1-actor-model-1", path: [{ forged: "ignored" }],
      gapMouths: [{ forged: "ignored" }], elevationRequirement: "ignored",
      coherencyGapMouths: [], placements: [
        placement("p1-actor-model-1", 7000, 5000),
        placement("p1-actor-model-2", 7000, 7000),
      ] }] };
}
function bindingFor(fixture, runtime) {
  return { bindingHash: "slice-82-gap-place-binding",
    dataSnapshotHash: hashStarcraftTmgContract(fixture.gameplayDataBundle),
    rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash } };
}
function domainFor(runtime, state, binding) {
  return runtime.enumerate(state, { sideKey: "player1", includeDisabled: true,
    matchBinding: binding }).parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_GAP_PLACE_GEOMETRY_PARAMETER_KIND
  ));
}
function engineFor(runtime, keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-08-31T12:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-82-gap-place",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 82 Gap and Place procedure.";
function envelopeFor(engine, fixture, state) {
  return engine.createEnvelope({ roomId: "official-slice-82-gap-place-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-gap-place-geometry-kernel-v1",
        content: { kind: "geometry-artifact",
          geometryVersion: "gap_place_geometry_kernel_v1" } },
      rulesDisplay: { artifactId: "official-slice-82-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
    }, state });
}
function credentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({ grantId: "slice-82-gap-place-grant",
    roomId: envelope.roomId, matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1", roleMode: "player", principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
  return { authority, lease: engine.issueControlLease({ seatAuthority: authority,
    sessionId: "slice-82-gap-place-session", leaseFence: 1,
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
      geometryVersion: "gap_place_geometry_kernel_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v25" } };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content,
  });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}

const slice = createOfficialGapPlaceGeometryRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialGapPlaceGeometryRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 525,
  newlyExecutableRuleAtoms: 15, reviewRequiredRuleAtoms: 387,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 525,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 51, missingStateContractExecutors: 0 });
assert.equal(OFFICIAL_GAP_PLACE_GEOMETRY_NEW_ATOM_IDS.length, 15);
acceptance.push("slice82_promotes_exact_15_current_review_atoms_to_525_executable");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const binding = bindingFor(fixture, runtime);
assert.equal(fixture.sourceLockAudit.lockHash,
  "1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1");
assert.equal(getOfficialCurrentProductRecord(
  fixture.dataset, "army_units:marine",
).payload.stats.size, "2");
assert.equal(slice.gapPlaceGeometryProgress.sourceRefreshPerformed, false);
acceptance.push("fixed_official_source_lock_is_reused_without_network_refresh");

const oneInchTerrain = [terrainRectangle("left", 0, 4000),
  terrainRectangle("right", 5000, 9000)];
const oneInchGap = physicalGap("left", "right", 4000, 5000);
const smallOpened = openOfficialGapPlaceGeometryPendingV1(
  prepare(fixture, { terrain: oneInchTerrain }),
  gapProcedure({ gapMouths: [oneInchGap] }),
);
assert.equal(smallOpened.pending.choices[0].gaps[0].widthMilliInches, 1000);
assert.equal(smallOpened.pending.choices[0].gaps[0].requiredWidthMilliInches, 1000);
acceptance.push("size_two_or_lower_traverses_a_physically_derived_one_inch_gap");

const narrowTerrain = [terrainRectangle("left", 0, 4000),
  terrainRectangle("right", 4999, 9000)];
assert.throws(() => openOfficialGapPlaceGeometryPendingV1(
  prepare(fixture, { actorPositions: [{ xInches: 4.499, yInches: 2 }],
    terrain: narrowTerrain }),
  gapProcedure({ startX: 4499,
    gapMouths: [physicalGap("left", "right", 4000, 4999)] }),
), /GAP_PLACE_CLEARANCE_INSUFFICIENT/u);
acceptance.push("size_two_or_lower_rejects_a_999_milli_inch_gap");

const largeTerrain = [terrainRectangle("left", 0, 4000),
  terrainRectangle("right", 7000, 9000)];
const largeOpened = openOfficialGapPlaceGeometryPendingV1(
  prepare(fixture, { actorPositions: [{ xInches: 5.5, yInches: 2 }],
    size: 3, terrain: largeTerrain }),
  gapProcedure({ startX: 5500,
    gapMouths: [physicalGap("left", "right", 4000, 7000)] }),
);
assert.equal(largeOpened.pending.choices[0].gaps[0].requiredWidthMilliInches, 3000);
acceptance.push("size_three_or_larger_traverses_a_three_inch_gap");

assert.throws(() => openOfficialGapPlaceGeometryPendingV1(
  prepare(fixture, { actorPositions: [{ xInches: 5.499, yInches: 2 }], size: 3,
    terrain: [terrainRectangle("left", 0, 4000),
      terrainRectangle("right", 6999, 9000)] }),
  gapProcedure({ startX: 5499,
    gapMouths: [physicalGap("left", "right", 4000, 6999)] }),
), /GAP_PLACE_CLEARANCE_INSUFFICIENT/u);
acceptance.push("size_three_or_larger_rejects_a_sub_three_inch_gap");

assert.throws(() => openOfficialGapPlaceGeometryPendingV1(
  prepare(fixture, { terrain: oneInchTerrain }),
  gapProcedure({ path: [{ xMilliInches: 4500, yMilliInches: 7000 },
    { xMilliInches: 4500, yMilliInches: 8000 }], gapMouths: [oneInchGap] }),
), /GAP_PLACE_PATH_INVALID|GAP_PLACE_PATH_DOES_NOT_CROSS_DECLARED_GAP/u);
assert.throws(() => openOfficialGapPlaceGeometryPendingV1(
  prepare(fixture, { actorPositions: [{ xInches: 2.5, yInches: 2 }],
    terrain: oneInchTerrain }),
  gapProcedure({ startX: 2500,
    gapMouths: [physicalGap("left", "right", 0, 5000)] }),
), /GAP_PLACE_GAP_NOT_MINIMUM_PHYSICAL_SPACE/u);
acceptance.push("a_gap_must_be_physical_boundaries_crossed_by_the_actual_path");

const openingTerrain = [terrainRectangle("arch", 4000, 5000)];
openingTerrain[0].openings = [{ openingId: "opening-main",
  leftPoint: { xMilliInches: 4000, yMilliInches: 5000 },
  rightPoint: { xMilliInches: 5000, yMilliInches: 5000 },
  passableAgreed: true }];
const openingGap = physicalGap("arch", "arch", 4000, 5000,
  { kind: "terrain_opening", openingId: "opening-main" });
const openingOpened = openOfficialGapPlaceGeometryPendingV1(
  prepare(fixture, { terrain: openingTerrain }),
  gapProcedure({ gapMouths: [openingGap] }),
);
assert.equal(openingOpened.pending.choices[0].gaps[0].kind, "terrain_opening");
acceptance.push("archway_doorway_or_breach_is_classified_as_a_gap_in_its_terrain_piece");

assert.throws(() => openOfficialGapPlaceGeometryPendingV1(
  prepare(fixture, { terrain: [{ ...openingTerrain[0], openings: [{
    ...openingTerrain[0].openings[0], passableAgreed: false }] }] }),
  gapProcedure({ gapMouths: [physicalGap("arch", "arch", 4000, 5000,
    { kind: "terrain_opening", openingId: "opening-main" })] }),
), /GAP_PLACE_OPENING_AGREEMENT_REQUIRED/u);
acceptance.push("ground_unit_terrain_opening_requires_the_setup_passability_agreement");

for (const movementType of ["move", "run", "charge", "disengage", "close_ranks"]) {
  const opened = openOfficialGapPlaceGeometryPendingV1(
    prepare(fixture, { terrain: oneInchTerrain }),
    gapProcedure({ movementType, gapMouths: [oneInchGap] }),
  );
  assert.equal(opened.pending.choices[0].movementType, movementType);
}
acceptance.push("gap_clearance_applies_to_move_run_charge_disengage_and_close_ranks");

assert.throws(() => openOfficialGapPlaceGeometryPendingV1(
  prepare(fixture, { terrain: oneInchTerrain }),
  gapProcedure({ endpointY: 5000, gapMouths: [oneInchGap] }),
), /GAP_PLACE_ENDPOINT_OVERLAP/u);
acceptance.push("transit_clearance_does_not_permit_stopping_where_the_base_does_not_fit");

const flyingTerrain = [terrainRectangle("left", 0, 4000),
  terrainRectangle("right", 4500, 9000)];
const flyingOpened = openOfficialGapPlaceGeometryPendingV1(
  prepare(fixture, { actorPositions: [{ xInches: 4.25, yInches: 2 }], flying: true,
    terrain: flyingTerrain }),
  gapProcedure({ startX: 4250,
    gapMouths: [physicalGap("left", "right", 4000, 4500)] }),
);
assert.equal(flyingOpened.pending.choices[0].gaps[0].clearanceIgnoredForFlying, true);
acceptance.push("flying_leading_model_bypasses_sub_threshold_gap_clearance_point_to_point");

assert.throws(() => openOfficialGapPlaceGeometryPendingV1(
  prepare(fixture, { actorPositions: [{ xInches: 4.25, yInches: 2 }], flying: true,
    terrain: flyingTerrain }),
  gapProcedure({ startX: 4250, endpointY: 5000,
    gapMouths: [physicalGap("left", "right", 4000, 4500)] }),
), /GAP_PLACE_ENDPOINT_OVERLAP/u);
acceptance.push("flying_gap_bypass_still_requires_a_nonoverlapping_physical_endpoint");

const placeState = prepare(fixture, { phase: "movement", actorPositions: [
  { xInches: 5, yInches: 5 }, { xInches: 5, yInches: 7 }],
  enemyPositions: [{ xInches: 20, yInches: 20 }] });
const placeOpened = openOfficialGapPlaceGeometryPendingV1(placeState, placeProcedure());
const placeChoice = placeOpened.pending.choices[0];
assert.equal(placeChoice.leadingModelId, "p1-actor-model-1");
assert.equal(placeChoice.maxDistanceMilliInches, 3000);
acceptance.push("place_nominates_a_leading_model_wholly_within_the_declared_distance");
assert.equal(placeChoice.placements.length, 2);
assert.equal(placeChoice.placeSemantics.remainingModelsResetInCoherency, true);
acceptance.push("place_resets_every_remaining_model_and_proves_unit_coherency");
assert.deepEqual({ path: placeChoice.placeSemantics.pathIgnored,
  gap: placeChoice.placeSemantics.gapClearanceIgnored,
  elevation: placeChoice.placeSemantics.elevationRequirementsIgnored },
{ path: true, gap: true, elevation: true });
acceptance.push("place_is_not_movement_and_ignores_path_gap_clearance_and_elevation_requirements");

const enemyNear = prepare(fixture, { phase: "movement", actorPositions: [
  { xInches: 5, yInches: 5 }, { xInches: 5, yInches: 7 }],
  enemyPositions: [{ xInches: 8.5, yInches: 5 }] });
assert.throws(() => openOfficialGapPlaceGeometryPendingV1(enemyNear, placeProcedure()),
  /GAP_PLACE_ENEMY_SEPARATION_REQUIRED/u);
acceptance.push("place_requires_legal_nonoverlap_and_enemy_separated_endpoints_by_default");

const assaultPlace = openOfficialGapPlaceGeometryPendingV1(
  prepare(fixture, { phase: "assault", actorPositions: [
    { xInches: 5, yInches: 5 }, { xInches: 5, yInches: 7 }],
  enemyPositions: [{ xInches: 8.5, yInches: 5 }] }), placeProcedure(),
);
assert.equal(assaultPlace.pending.choices[0].placeSemantics.assaultEngagementException, true);
acceptance.push("assault_phase_place_may_end_within_enemy_engagement_range");

assert.throws(() => openOfficialGapPlaceGeometryPendingV1(placeState,
  placeProcedure({ plan: { planId: "far", leadingModelId: "p1-actor-model-1",
    coherencyGapMouths: [], placements: [
      placement("p1-actor-model-1", 7000, 5000),
      placement("p1-actor-model-2", 12000, 5000)] } })),
/GAP_PLACE_COHERENCY_RANGE_INVALID/u);
acceptance.push("place_rejects_a_remaining_model_outside_wholly_within_three_inch_coherency");

const blockedPlaceState = prepare(fixture, { phase: "movement", actorPositions: [
  { xInches: 5, yInches: 5 }, { xInches: 5, yInches: 7 }],
  terrain: [terrainRectangle("divider", 7700, 8300, 4000, 6000)] });
assert.throws(() => openOfficialGapPlaceGeometryPendingV1(blockedPlaceState,
  placeProcedure({ plan: { planId: "blocked", leadingModelId: "p1-actor-model-1",
    coherencyGapMouths: [], placements: [
      placement("p1-actor-model-1", 7000, 5000),
      placement("p1-actor-model-2", 9000, 5000)] } })),
/GAP_PLACE_COHERENCY_LINK_INVALID/u);
acceptance.push("place_rejects_a_ground_unit_without_a_valid_coherency_link");

const placeDomain = domainFor(runtime, placeOpened.state, binding);
const placeAction = runtime.instantiate(placeOpened.state, placeDomain,
  { choiceId: placeDomain.constraints.choices[0].choiceId }, { matchBinding: binding });
const placeApplied = runtime.apply(placeOpened.state,
  executableAction(placeAction.action), { matchBinding: binding });
assert.equal(placeApplied.state.pieces[0].models[0].xInches, 7);
assert.equal(placeApplied.state.pieces[0].models[1].yInches, 7);
assert.equal(placeApplied.state.lastGapPlaceGeometryResolution.procedureKind, "place");
acceptance.push("runtime_legalspace_instantiate_and_apply_use_the_same_geometry_plan_hash");

const stale = structuredClone(placeOpened.state);
stale.board.terrain.push(terrainRectangle("late-wall", 6500, 7500, 4000, 6000));
assert.throws(() => runtime.instantiate(stale, placeDomain,
  { choiceId: placeDomain.constraints.choices[0].choiceId }, { matchBinding: binding }),
/GAP_PLACE_PENDING_INVALID/u);
const sourceDrift = structuredClone(placeOpened.state);
sourceDrift.officialDevelopmentTrancheSourceLockAudit.lockHash = "0".repeat(64);
assert.equal(runtime.enumerate(sourceDrift, { sideKey: "player1", includeDisabled: true,
  matchBinding: binding }).candidates[0].disabledReason,
"GAP_PLACE_SOURCE_LOCK_BINDING_INVALID");
acceptance.push("piece_board_pending_or_source_lock_drift_invalidates_gap_place_legalspace");

const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_GAP_PLACE_GEOMETRY_RELATIONSHIP_SCOPE_ID
));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "derived_value:gapPlaceGeometryV1.legalEndpointFit"
    && entry.to === "derived_value:gapPlaceGeometryV1.placeRangeAndCoherency"
));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash"),
));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
acceptance.push("relationship_graph_blocks_a_missing_endpoint_to_place_dependency");

const keys = generateKeyPairSync("ed25519");
const authority = engineFor(runtime, keys, "slice-82-gap-place-short-seal-v1");
const initial = envelopeFor(authority, fixture, placeOpened.state);
registerReplay(authority, initial, fixture, runtime);
const access = credentials(authority, initial);
const authoritySpace = authority.legalSpace(initial, { seatAuthority: access.authority });
const authorityDomain = authoritySpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_GAP_PLACE_GEOMETRY_PARAMETER_KIND
));
assert(authorityDomain, JSON.stringify(authoritySpace.disabledDiagnostics));
const preview = authority.preview({ envelope: initial, seatAuthority: access.authority,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: { choiceId: authorityDomain.constraints.choices[0].choiceId } } });
assert.equal(preview.ok, true, JSON.stringify(preview));
const confirmation = authority.confirmPreview({ envelope: initial,
  preview: preview.preview, seatAuthority: access.authority });
const authoritativeApplied = authority.apply({ envelope: initial,
  expectedStateRevision: initial.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: access.authority,
  controlLease: access.lease, idempotencyKey: "slice-82-gap-place" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
const replay = engineFor(runtime, keys, "slice-82-gap-place-rotated-seal-v2");
registerReplay(replay, initial, fixture, runtime);
assert.equal(replay.replay({ initialEnvelope: initial,
  journal: [authoritativeApplied.receipt] }).ok, true);
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_gap_place_event" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
assert.equal(initial.matchBinding.rulesDisplayBinding.artifactHash,
  hashStarcraftTmgContract(DISPLAY));
acceptance.push("authority_ed25519_replay_survives_hmac_rotation_rejects_tamper_and_retains_display");

assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
acceptance.push("no_skill_dsh_muzero_memory_selfplay_or_training_promotion_occurs_in_slice82");
assert.equal(acceptance.length, 25);

const report = {
  schema: "starcraft_tmg_official_gap_place_geometry_rule_slice_verification_v1",
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
  rulesTruth: "official_gap_clearance_and_place_geometry_conformance",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-gap-place-geometry-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ schema: report.schema,
  acceptancePassed: report.acceptancePassed, acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash, catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash, graphHash: graph.graphHash,
  graphCounts: { nodes: graph.nodes.length, edges: graph.edges.length },
  counts: audit.counts, sourceLockHash: fixture.sourceLockAudit.lockHash,
  sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  trainingTruth: false }, null, 2));
