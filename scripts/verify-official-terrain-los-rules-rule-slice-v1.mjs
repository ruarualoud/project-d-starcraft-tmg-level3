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
  OFFICIAL_TERRAIN_LOS_RULES_NEW_ATOM_IDS,
  OFFICIAL_TERRAIN_LOS_RULES_PARAMETER_KIND,
  openOfficialTerrainLosRulesPendingV1,
} from "../packages/rule-atoms/official-terrain-los-rules-executor-v1.mjs";
import {
  createOfficialTerrainPieceV1,
  evaluateOfficialLeadingModelTerrainV1,
  evaluateOfficialTerrainLineOfSightV1,
} from "../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs";
import { OFFICIAL_TERRAIN_LOS_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-terrain-los-rules-relationship-contract-v1.mjs";
import {
  createOfficialTerrainLosRulesRuleSliceV1,
  verifyOfficialTerrainLosRulesRuleSliceV1,
} from "../packages/rule-atoms/official-terrain-los-rules-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { getOfficialCurrentProductRecord } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import {
  createOfficialTerrainLosDataBundleV1,
  OFFICIAL_TERRAIN_LOS_CORE_RULEBOOK_HASH,
} from "../packages/source-data/official-terrain-los-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR, "official-flying-rules-rule-slice-v1-report.json",
), "utf8"));
const acceptance = [];

function executableAction(value) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}
function terrain(id, size, input = {}) {
  return createOfficialTerrainPieceV1({ id, size,
    terrainKind: input.terrainKind || "ordinary",
    footprint: input.footprint || { shape: "axis_aligned_rectangle",
      minXMilliInches: 8000, maxXMilliInches: 10000,
      minYMilliInches: 3000, maxYMilliInches: 7000 },
    standableHorizontalSurface: input.standableHorizontalSurface === true,
    openings: input.openings || [] });
}
function opening(input = {}) {
  return { openingId: input.openingId || "door-main",
    footprint: input.footprint || { shape: "axis_aligned_rectangle",
      minXMilliInches: 8000, maxXMilliInches: 10000,
      minYMilliInches: 3500, maxYMilliInches: 6500 },
    movementPassableAgreed: input.movementPassableAgreed === true,
    lineOfSightOpenAgreed: input.lineOfSightOpenAgreed === true };
}
function prepare(fixture, terrainBundle, input = {}) {
  const state = fixture.battleState({ activeSideKey: "player1", pieces: [
    { id: "p1-actor", sideKey: "player1",
      positions: input.actorPositions || [{ xInches: 5, yInches: 5 }] },
    { id: "p2-target", sideKey: "player2",
      positions: input.targetPositions || [{ xInches: 13, yInches: 5 }] },
  ] });
  state.phase = input.phase || "combat";
  state.rulesProcedureMode = true;
  state.officialTerrainLosDataBundle = terrainBundle;
  state.board.terrain = structuredClone(input.terrain || []);
  for (const support of input.actorSupportTerrainIds || []) {
    state.pieces[0].models[0].supportTerrainIds.push(support);
  }
  for (const support of input.targetSupportTerrainIds || []) {
    state.pieces[1].models[0].supportTerrainIds.push(support);
  }
  state.pieces[0].models[0].elevation = input.actorElevation || "ground";
  state.pieces[1].models[0].elevation = input.targetElevation || "ground";
  return state;
}
function replaceWithOfficialUnit(piece, dataset, recordKey) {
  const record = getOfficialCurrentProductRecord(dataset, recordKey);
  piece.name = record.payload.name;
  piece.officialUnitRecordKey = recordKey;
  piece.sourceRecordHash = record.sourceRecordHash;
  piece.officialPayloadHash = record.payloadHash;
}
function moveInput(state, dataBundle, pathPoints = null) {
  const model = state.pieces[0].models[0];
  return { state, actor: state.pieces[0], leadingModelId: model.id, dataBundle,
    path: pathPoints || [
      { xMilliInches: Math.round(model.xInches * 1000),
        yMilliInches: Math.round(model.yInches * 1000) },
      { xMilliInches: 13000, yMilliInches: 5000 },
    ] };
}
function losInput(state, dataBundle) {
  return { state, attacker: state.pieces[0],
    attackerModelId: state.pieces[0].models[0].id,
    target: state.pieces[1], targetModelId: state.pieces[1].models[0].id,
    dataBundle };
}
function moveProcedure(state, input = {}) {
  const model = state.pieces[0].models[0];
  return { procedureKind: "leading_model_terrain_check", sideKey: "player1",
    actorUnitId: "p1-actor", candidatePlansComplete: true,
    rulesDenominatorComplete: true, candidatePlans: [{
      planId: input.planId || "terrain-move-plan", leadingModelId: model.id,
      path: input.path || [
        { xMilliInches: Math.round(model.xInches * 1000),
          yMilliInches: Math.round(model.yInches * 1000) },
        { xMilliInches: 13000, yMilliInches: 5000 },
      ],
    }] };
}
function losProcedure(state, input = {}) {
  return { procedureKind: "line_of_sight_check", sideKey: "player1",
    actorUnitId: "p1-actor", candidatePlansComplete: true,
    rulesDenominatorComplete: true, candidatePlans: [{
      planId: input.planId || "line-of-sight-plan", targetUnitId: "p2-target",
      attackerModelId: state.pieces[0].models[0].id,
      targetModelId: state.pieces[1].models[0].id,
    }] };
}
function bindingFor(fixture, runtime, terrainBundle) {
  return { bindingHash: "slice-84-terrain-los-binding",
    dataSnapshotHash: hashStarcraftTmgContract(fixture.gameplayDataBundle),
    rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
    geometryArtifactHash: hashStarcraftTmgContract(terrainBundle),
    dependencies: { geometryArtifact: {
      contentHash: hashStarcraftTmgContract(terrainBundle),
    } } };
}
function domainFor(runtime, state, binding) {
  return runtime.enumerate(state, { sideKey: "player1", includeDisabled: true,
    matchBinding: binding }).parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_TERRAIN_LOS_RULES_PARAMETER_KIND
  ));
}
function engineFor(runtime, keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-08-31T18:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-84-terrain-los",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 84 terrain and LoS rules.";
function envelopeFor(engine, fixture, terrainBundle, state) {
  return engine.createEnvelope({ roomId: "official-slice-84-terrain-los-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-terrain-los-data-and-kernel-v1",
        content: terrainBundle },
      rulesDisplay: { artifactId: "official-slice-84-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
    }, state });
}
function credentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({ grantId: "slice-84-terrain-los-grant",
    roomId: envelope.roomId, matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1", roleMode: "player", principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
  return { authority, lease: engine.issueControlLease({ seatAuthority: authority,
    sessionId: "slice-84-terrain-los-session", leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision }) };
}
function registerReplay(engine, initial, fixture, runtime, terrainBundle) {
  const entries = { sourceSnapshot: fixture.snapshot,
    dataSnapshot: fixture.gameplayDataBundle,
    rulesArtifact: { kind: "rules-artifact", rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: initial.matchBinding.rulesRuntimeBinding },
    executorArtifact: { kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: initial.matchBinding.rulesRuntimeBinding.runtimeHash,
      catalogueHash: initial.matchBinding.rulesRuntimeBinding.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest },
    geometryArtifact: terrainBundle,
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v25" } };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content,
  });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}

const slice = createOfficialTerrainLosRulesRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialTerrainLosRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 568,
  newlyExecutableRuleAtoms: 19, reviewRequiredRuleAtoms: 344,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 568,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 53, missingStateContractExecutors: 0 });
assert.equal(OFFICIAL_TERRAIN_LOS_RULES_NEW_ATOM_IDS.length, 19);
acceptance.push("slice84_promotes_exact_19_current_review_atoms_to_568_executable");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const terrainBundle = createOfficialTerrainLosDataBundleV1({ dataset: fixture.dataset });
const binding = bindingFor(fixture, runtime, terrainBundle);
assert.equal(terrainBundle.profiles.length, 26);
assert.equal(terrainBundle.profiles.filter((entry) => entry.printedSize !== null).length, 25);
assert.equal(terrainBundle.profiles.find((entry) => entry.recordKey === "army_units:marine")
  .printedSize, 2);
assert.equal(terrainBundle.profiles.find((entry) => (
  entry.recordKey === "army_units:point_defense_drone"
)).printedSize, null);
assert.equal(terrainBundle.coreRulebookHash, OFFICIAL_TERRAIN_LOS_CORE_RULEBOOK_HASH);
acceptance.push("fixed_official_source_binds_26_current_profiles_25_sizes_and_core_rulebook");

const agreedWall = terrain("wall-agreed", 2, { openings: [opening({
  movementPassableAgreed: true,
})] });
assert.equal(agreedWall.setupAgreement.footprintAgreed, true);
assert.equal(agreedWall.setupAgreement.openingDenominatorComplete, true);
assert.equal(agreedWall.terrainHash.length, 64);
assert.equal(agreedWall.setupAgreement.agreementHash.length, 64);
acceptance.push("terrain_footprint_and_complete_opening_denominator_are_content_hashed");

const tamperedAgreementState = prepare(fixture, terrainBundle, { terrain: [agreedWall] });
tamperedAgreementState.board.terrain[0].size = 3;
assert.throws(() => evaluateOfficialLeadingModelTerrainV1(
  moveInput(tamperedAgreementState, terrainBundle)), /TERRAIN_LOS_TERRAIN_INVALID/u);
acceptance.push("terrain_size_or_setup_contract_tamper_is_rejected_by_the_content_hash");

const ovalState = prepare(fixture, terrainBundle);
ovalState.pieces[0].models[0].baseShape = "oval";
ovalState.pieces[0].models[0].baseDepthInches = 2;
assert.throws(() => evaluateOfficialLeadingModelTerrainV1(
  moveInput(ovalState, terrainBundle)), /TERRAIN_LOS_MODEL_BASE_INVALID/u);
acceptance.push("non_round_model_base_geometry_fails_closed_to_slice87");

for (const size of [0, 1]) {
  const state = prepare(fixture, terrainBundle, { terrain: [terrain(`small-${size}`, size)] });
  const result = evaluateOfficialLeadingModelTerrainV1(moveInput(state, terrainBundle));
  assert.equal(result.interactions[0].movementPassableBySize, true);
  assert.equal(result.interactions[0].pathBlocked, false);
}
acceptance.push("size_zero_and_one_terrain_are_passable_to_the_leading_model");

const sizeOneState = prepare(fixture, terrainBundle, { terrain: [terrain("size-one", 1)] });
const sizeOneMove = evaluateOfficialLeadingModelTerrainV1(
  moveInput(sizeOneState, terrainBundle),
);
assert.equal(sizeOneMove.interactions[0].blockingForLineOfSight, true);
assert.equal(sizeOneMove.interactions[0].blockingClassificationControlsMovement, false);
acceptance.push("size_one_is_blocking_for_line_of_sight_but_blocking_does_not_control_movement");

const endpointState = prepare(fixture, terrainBundle, { terrain: [terrain("endpoint", 0)] });
assert.throws(() => evaluateOfficialLeadingModelTerrainV1(moveInput(endpointState,
  terrainBundle, [{ xMilliInches: 5000, yMilliInches: 5000 },
    { xMilliInches: 9000, yMilliInches: 5000 }])),
/TERRAIN_LOS_MOVEMENT_ENDPOINT_OVERLAP/u);
acceptance.push("no_leading_model_may_end_overlapping_any_terrain_size");

const largeState = prepare(fixture, terrainBundle, { terrain: [terrain("large", 2)] });
assert.throws(() => evaluateOfficialLeadingModelTerrainV1(
  moveInput(largeState, terrainBundle)), /TERRAIN_LOS_LARGE_TERRAIN_MOVEMENT_BLOCKED/u);
acceptance.push("size_two_and_larger_terrain_blocks_leading_model_transit");

const openingState = prepare(fixture, terrainBundle, { terrain: [agreedWall] });
const openingMove = evaluateOfficialLeadingModelTerrainV1(
  moveInput(openingState, terrainBundle),
);
assert.equal(openingMove.interactions[0].pathBlocked, false);
assert.deepEqual(openingMove.interactions[0].movementOpeningIdsUsed, ["door-main"]);
acceptance.push("explicit_movement_opening_clears_a_size_two_wall_for_the_round_base");

const clearState = prepare(fixture, terrainBundle);
assert.equal(evaluateOfficialTerrainLineOfSightV1(losInput(clearState,
  terrainBundle)).visible, true);
acceptance.push("absence_of_blocking_terrain_makes_the_target_visible");

const sizeOneSight = evaluateOfficialTerrainLineOfSightV1(
  losInput(sizeOneState, terrainBundle),
);
assert.equal(sizeOneSight.assessments[0].blockingTerrain, true);
assert.equal(sizeOneSight.assessments[0].fullCoverBlocks, false);
assert.equal(sizeOneSight.visible, true);
acceptance.push("blocking_terrain_without_full_or_direct_cover_does_not_block_visibility");

const fullState = prepare(fixture, terrainBundle, { terrain: [terrain("full", 2)] });
const full = evaluateOfficialTerrainLineOfSightV1(losInput(fullState, terrainBundle));
assert.equal(full.assessments[0].fullCoverBlocks, true);
assert.equal(full.visible, false);
acceptance.push("terrain_at_least_both_model_sizes_grants_full_cover_and_blocks_sight");

const partialState = prepare(fixture, terrainBundle, { terrain: [terrain("partial", 2, {
  footprint: { shape: "axis_aligned_rectangle", minXMilliInches: 8000,
    maxXMilliInches: 10000, minYMilliInches: 4800, maxYMilliInches: 5200 },
})] });
const partial = evaluateOfficialTerrainLineOfSightV1(losInput(partialState, terrainBundle));
assert.equal(partial.assessments[0].blockingTerrainTrace, false);
assert.equal(partial.assessments[0].visibilityWitness,
  "corresponding_top_base_points_clear");
assert.equal(partial.visible, true);
const diagonalState = prepare(fixture, terrainBundle, { actorPositions: [
  { xInches: 1, yInches: 1 }], targetPositions: [{ xInches: 11, yInches: 11 }],
terrain: [terrain("diagonal", 2, { footprint: { shape: "axis_aligned_rectangle",
  minXMilliInches: 4000, maxXMilliInches: 8000,
  minYMilliInches: 4000, maxYMilliInches: 8000 } })] });
assert.throws(() => evaluateOfficialTerrainLineOfSightV1(
  losInput(diagonalState, terrainBundle)),
/TERRAIN_LOS_UNSUPPORTED_RECTANGULAR_TRACE/u);
acceptance.push("a_partial_rectangle_that_does_not_hide_complete_bases_is_visible");

const directState = prepare(fixture, terrainBundle, { actorPositions: [
  { xInches: 2, yInches: 5 }], targetPositions: [{ xInches: 6.5, yInches: 5 }],
terrain: [terrain("direct", 2, { footprint: { shape: "axis_aligned_rectangle",
  minXMilliInches: 4000, maxXMilliInches: 5000,
  minYMilliInches: 3000, maxYMilliInches: 7000 } })] });
replaceWithOfficialUnit(directState.pieces[0], fixture.dataset, "army_units:goliath");
const direct = evaluateOfficialTerrainLineOfSightV1(losInput(directState, terrainBundle));
assert.equal(direct.assessments[0].fullCoverBlocks, false);
assert.equal(direct.assessments[0].targetDirectCover, true);
assert.equal(direct.visible, false);
acceptance.push("nearby_terrain_at_least_the_covered_model_size_grants_direct_cover");

const tooSmallDirectState = prepare(fixture, terrainBundle, { actorPositions: [
  { xInches: 2.5, yInches: 5 }], targetPositions: [{ xInches: 8.5, yInches: 5 }],
terrain: [terrain("too-small-direct", 2, { footprint: {
  shape: "axis_aligned_rectangle", minXMilliInches: 4000,
  maxXMilliInches: 5000, minYMilliInches: 3000, maxYMilliInches: 7000 } })] });
replaceWithOfficialUnit(tooSmallDirectState.pieces[0], fixture.dataset, "army_units:goliath");
const tooSmallDirect = evaluateOfficialTerrainLineOfSightV1(
  losInput(tooSmallDirectState, terrainBundle),
);
assert.equal(tooSmallDirect.assessments[0].attackerWithinOneInch, true);
assert.equal(tooSmallDirect.assessments[0].attackerDirectCover, false);
assert.equal(tooSmallDirect.visible, true);
acceptance.push("direct_cover_fails_when_terrain_is_smaller_than_the_near_model");

const independentState = prepare(fixture, terrainBundle, { terrain: [
  terrain("independent-a", 1, { footprint: { shape: "axis_aligned_rectangle",
    minXMilliInches: 7500, maxXMilliInches: 8500,
    minYMilliInches: 3000, maxYMilliInches: 7000 } }),
  terrain("independent-b", 1, { footprint: { shape: "axis_aligned_rectangle",
    minXMilliInches: 9500, maxXMilliInches: 10500,
    minYMilliInches: 3000, maxYMilliInches: 7000 } }),
] });
const independent = evaluateOfficialTerrainLineOfSightV1(
  losInput(independentState, terrainBundle),
);
assert.equal(independent.terrainEffectiveSizesNeverCombine, true);
assert.equal(independent.visible, true);
acceptance.push("multiple_terrain_pieces_are_assessed_independently_and_sizes_never_combine");

const defaultApertureState = prepare(fixture, terrainBundle, { terrain: [terrain(
  "default-aperture", 2, { openings: [opening()] },
)] });
const defaultAperture = evaluateOfficialTerrainLineOfSightV1(
  losInput(defaultApertureState, terrainBundle),
);
assert.equal(defaultAperture.assessments[0].defaultAperturesBlockLineOfSight, true);
assert.equal(defaultAperture.visible, false);
acceptance.push("an_aperture_blocks_line_of_sight_unless_explicitly_agreed_open");

const movementOnlySight = evaluateOfficialTerrainLineOfSightV1(
  losInput(openingState, terrainBundle),
);
assert.equal(movementOnlySight.assessments[0].openSightOpeningIds.length, 0);
assert.equal(movementOnlySight.visible, false);
acceptance.push("movement_passability_does_not_silently_make_an_opening_sight_open");

const sightOpeningState = prepare(fixture, terrainBundle, { terrain: [terrain(
  "sight-opening", 2, { openings: [opening({ lineOfSightOpenAgreed: true })] },
)] });
const sightOpening = evaluateOfficialTerrainLineOfSightV1(
  losInput(sightOpeningState, terrainBundle),
);
assert.deepEqual(sightOpening.assessments[0].openSightOpeningIds, ["door-main"]);
assert.equal(sightOpening.visible, true);
acceptance.push("explicit_full_width_sight_opening_clears_the_blocking_trace");

const surfaceState = prepare(fixture, terrainBundle, { actorPositions: [
  { xInches: 9, yInches: 5 }], targetPositions: [{ xInches: 13, yInches: 5 }],
terrain: [terrain("platform", 2, { standableHorizontalSurface: true })],
actorSupportTerrainIds: ["platform"], actorElevation: "high" });
const surface = evaluateOfficialTerrainLineOfSightV1(losInput(surfaceState, terrainBundle));
assert.equal(surface.assessments[0].topDownSurfaceExcluded, true);
assert.equal(surface.visible, true);
acceptance.push("top_down_horizontal_surface_stood_upon_is_excluded_as_a_los_barrier");

const deadZoneTerrain = terrain("high-platform", 3, {
  standableHorizontalSurface: true, footprint: { shape: "axis_aligned_rectangle",
    minXMilliInches: 4000, maxXMilliInches: 10000,
    minYMilliInches: 3000, maxYMilliInches: 7000 },
});
const deadZoneState = prepare(fixture, terrainBundle, { actorPositions: [
  { xInches: 5, yInches: 5 }], targetPositions: [{ xInches: 11.5, yInches: 5 }],
terrain: [deadZoneTerrain], actorSupportTerrainIds: ["high-platform"],
actorElevation: "high" });
const deadZone = evaluateOfficialTerrainLineOfSightV1(losInput(deadZoneState, terrainBundle));
const reverseDeadZone = evaluateOfficialTerrainLineOfSightV1({
  ...losInput(deadZoneState, terrainBundle), attacker: deadZoneState.pieces[1],
  attackerModelId: deadZoneState.pieces[1].models[0].id,
  target: deadZoneState.pieces[0], targetModelId: deadZoneState.pieces[0].models[0].id,
});
assert.equal(deadZone.assessments[0].elevationDeadZoneBlocks, true);
assert.equal(deadZone.visible, false);
assert.equal(reverseDeadZone.visible, false);
acceptance.push("size_three_high_ground_dead_zone_blocks_line_of_sight_in_both_directions");

const closeState = prepare(fixture, terrainBundle, { actorPositions: [
  { xInches: 9, yInches: 5 }], targetPositions: [{ xInches: 11.5, yInches: 5 }],
terrain: [deadZoneTerrain], actorSupportTerrainIds: ["high-platform"],
actorElevation: "high" });
const close = evaluateOfficialTerrainLineOfSightV1(losInput(closeState, terrainBundle));
assert.equal(close.assessments[0].closeQuarters, true);
assert.equal(close.assessments[0].elevationDeadZoneBlocks, false);
assert.equal(close.visible, true);
acceptance.push("close_quarters_overrides_direct_cover_and_the_elevation_dead_zone");

const delegatedState = prepare(fixture, terrainBundle, { actorPositions: [
  { xInches: 5, yInches: 5 }], targetPositions: [{ xInches: 13, yInches: 5 }],
terrain: [terrain("support", 2, { standableHorizontalSurface: true,
  footprint: { shape: "axis_aligned_rectangle", minXMilliInches: 4000,
    maxXMilliInches: 6000, minYMilliInches: 4000, maxYMilliInches: 6000 } }),
terrain("other-wall", 2)], actorSupportTerrainIds: ["support"],
actorElevation: "high" });
assert.throws(() => evaluateOfficialTerrainLineOfSightV1(
  losInput(delegatedState, terrainBundle)),
/TERRAIN_LOS_ELEVATION_EFFECTIVE_SIZE_DELEGATION_REQUIRED/u);
acceptance.push("elevated_model_effective_size_against_other_blockers_fails_closed_to_slice85");

for (const terrainKind of ["grass", "impassable", "ramp"]) {
  const deferredState = prepare(fixture, terrainBundle, { terrain: [terrain(
    `deferred-${terrainKind}`, 1, { terrainKind },
  )] });
  assert.throws(() => evaluateOfficialLeadingModelTerrainV1(
    moveInput(deferredState, terrainBundle)), /TERRAIN_LOS_DEFERRED_TERRAIN_KIND/u);
}
acceptance.push("grass_impassable_and_ramp_rules_fail_closed_to_slice86");

const runtimeOpened = openOfficialTerrainLosRulesPendingV1(fullState,
  losProcedure(fullState));
const runtimeDomain = domainFor(runtime, runtimeOpened.state, binding);
const runtimeAction = runtime.instantiate(runtimeOpened.state, runtimeDomain,
  { choiceId: runtimeDomain.constraints.choices[0].choiceId }, { matchBinding: binding });
const runtimeApplied = runtime.apply(runtimeOpened.state,
  executableAction(runtimeAction.action), { matchBinding: binding });
assert.equal(runtimeApplied.state.lastTerrainLosRulesResolution.procedureKind,
  "line_of_sight_check");
assert.equal(runtimeApplied.state.lastTerrainLosRulesResolution.result.visible, false);
assert.equal(runtimeApplied.state.pendingAction, null);
acceptance.push("runtime_enumerate_instantiate_apply_use_the_same_certified_plan_hash");

const stale = structuredClone(runtimeOpened.state);
stale.board.terrain.push(terrain("late-wall", 1));
assert.throws(() => runtime.instantiate(stale, runtimeDomain,
  { choiceId: runtimeDomain.constraints.choices[0].choiceId }, { matchBinding: binding }),
/TERRAIN_LOS_PENDING_INVALID/u);
const sourceDrift = structuredClone(runtimeOpened.state);
sourceDrift.officialDevelopmentTrancheSourceLockAudit.lockHash = "0".repeat(64);
assert.equal(runtime.enumerate(sourceDrift, { sideKey: "player1", includeDisabled: true,
  matchBinding: binding }).candidates[0].disabledReason,
"TERRAIN_LOS_SOURCE_LOCK_BINDING_INVALID");
const geometryDrift = structuredClone(binding);
geometryDrift.dependencies.geometryArtifact.contentHash = "0".repeat(64);
assert.equal(runtime.enumerate(runtimeOpened.state, { sideKey: "player1",
  includeDisabled: true, matchBinding: geometryDrift }).candidates[0].disabledReason,
"TERRAIN_LOS_GEOMETRY_ARTIFACT_BINDING_INVALID");
acceptance.push("state_source_or_geometry_binding_drift_invalidates_terrain_los_legalspace");

const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_TERRAIN_LOS_RULES_RELATIONSHIP_SCOPE_ID
));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "derived_value:terrainLosRulesV1.independentCoverAssessment"
    && entry.to === "derived_value:terrainLosRulesV1.visibility"
));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash"),
));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
acceptance.push("relationship_graph_blocks_a_missing_cover_to_visibility_dependency");

const keys = generateKeyPairSync("ed25519");
const authority = engineFor(runtime, keys, "slice-84-terrain-los-short-seal-v1");
const authorityBase = prepare(fixture, terrainBundle, { terrain: [terrain(
  "authority-full", 2,
)] });
const authoritySeed = envelopeFor(authority, fixture, terrainBundle, authorityBase);
const authorityOpened = openOfficialTerrainLosRulesPendingV1(
  authoritySeed.state, losProcedure(authoritySeed.state),
);
const initial = authority.createEnvelope({ roomId: authoritySeed.roomId,
  matchBinding: authoritySeed.matchBinding, state: authorityOpened.state });
registerReplay(authority, initial, fixture, runtime, terrainBundle);
const access = credentials(authority, initial);
const authoritySpace = authority.legalSpace(initial, { seatAuthority: access.authority });
const authorityDomain = authoritySpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_TERRAIN_LOS_RULES_PARAMETER_KIND
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
  controlLease: access.lease, idempotencyKey: "slice-84-terrain-los" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
assert.equal(authoritativeApplied.envelope.state.lastTerrainLosRulesResolution.result.visible,
  false);
const replay = engineFor(runtime, keys, "slice-84-terrain-los-rotated-seal-v2");
registerReplay(replay, initial, fixture, runtime, terrainBundle);
assert.equal(replay.replay({ initialEnvelope: initial,
  journal: [authoritativeApplied.receipt] }).ok, true);
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_terrain_los_event" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
assert.equal(initial.matchBinding.rulesDisplayBinding.artifactHash,
  hashStarcraftTmgContract(DISPLAY));
acceptance.push("authority_ed25519_replay_survives_hmac_rotation_rejects_tamper_and_retains_display");

assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.terrainLosRulesProgress.sourceRefreshPerformed, false);
acceptance.push("no_source_refresh_skill_dsh_muzero_selfplay_or_training_promotion_occurs");
assert.equal(acceptance.length, 30);

const report = {
  schema: "starcraft_tmg_official_terrain_los_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit,
  terrainLosDataBundle: terrainBundle,
  slice, sliceAudit: audit, runtimeHash: runtime.descriptor.runtimeHash,
  catalogueHash: slice.catalogueHash, graph, graphAudit: audit.graphAudit,
  coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true,
    historicalRulesDisplayRetained: true },
  ctx2skill: slice.ctx2skill, harness: slice.harness,
  rulesEligible: false, productionRoomEligible: false,
  rulesTruth: "official_terrain_footprint_movement_cover_and_visibility_conformance",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-terrain-los-rules-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ schema: report.schema,
  acceptancePassed: report.acceptancePassed, acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash, catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash, graphHash: graph.graphHash,
  graphCounts: { nodes: graph.nodes.length, edges: graph.edges.length },
  counts: audit.counts, sourceLockHash: fixture.sourceLockAudit.lockHash,
  officialCurrentProfiles: terrainBundle.profiles.length,
  sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  trainingTruth: false }, null, 2));
