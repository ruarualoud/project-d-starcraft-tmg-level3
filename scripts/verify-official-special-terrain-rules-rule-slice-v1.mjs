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
  OFFICIAL_SPECIAL_TERRAIN_RULES_NEW_ATOM_IDS,
  OFFICIAL_SPECIAL_TERRAIN_RULES_PARAMETER_KIND,
  openOfficialSpecialTerrainRulesPendingV1,
} from "../packages/rule-atoms/official-special-terrain-rules-executor-v1.mjs";
import {
  certifyOfficialSpecialTerrainPlanV1,
  createOfficialSpecialTerrainAgreementV1,
} from "../packages/rule-atoms/official-special-terrain-rules-kernel-v1.mjs";
import { OFFICIAL_SPECIAL_TERRAIN_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-special-terrain-rules-relationship-contract-v1.mjs";
import {
  createOfficialSpecialTerrainRulesRuleSliceV1,
  verifyOfficialSpecialTerrainRulesRuleSliceV1,
} from "../packages/rule-atoms/official-special-terrain-rules-rule-slice-v1.mjs";
import {
  createOfficialRemainingRuleAtomRouteV2,
  OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
} from "../packages/rule-atoms/official-remaining-rule-atom-route-v2.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialTerrainPieceV1 } from
  "../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { getOfficialCurrentProductRecord } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialTerrainLosDataBundleV1 } from
  "../packages/source-data/official-terrain-los-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR, "official-elevation-effective-size-rules-rule-slice-v1-report.json",
), "utf8"));
const acceptance = [];

function inches(value) { return Number((Number(value) / 1000).toFixed(3)); }
function mm(value) { return Math.round(Number(value) * 1000); }
function rect(minX, maxX, minY = 4, maxY = 6) {
  return { shape: "axis_aligned_rectangle",
    minXMilliInches: mm(minX), maxXMilliInches: mm(maxX),
    minYMilliInches: mm(minY), maxYMilliInches: mm(maxY) };
}
function terrain(id, size, input = {}) {
  return createOfficialTerrainPieceV1({ id, size,
    terrainKind: input.terrainKind || "ordinary",
    footprint: input.footprint || rect(8, 12),
    standableHorizontalSurface: input.standableHorizontalSurface === true,
    openings: [] });
}
function accessPoint(accessPointId, footprint, connects, role = "generic") {
  return { accessPointId, footprint, connects, role };
}
function configureTerrain(state, definitions) {
  state.board.terrain = definitions.map((entry) => structuredClone(entry.piece));
  state.board.specialTerrainAgreement = createOfficialSpecialTerrainAgreementV1({
    terrainEntries: definitions.map((entry) => ({ terrainId: entry.piece.id,
      terrainKind: entry.piece.terrainKind,
      adjacentElevationPairs: entry.adjacentElevationPairs || [],
      accessPoints: entry.accessPoints || [] })),
  });
  return state;
}
function prepare(fixture, terrainBundle, input = {}) {
  const state = fixture.battleState({ activeSideKey: "player1", pieces: [
    { id: "p1-actor", sideKey: "player1",
      positions: input.actorPositions || [{ xInches: 5, yInches: 5 }] },
    { id: "p2-target", sideKey: "player2",
      positions: input.targetPositions || [{ xInches: 25, yInches: 5 }] },
  ] });
  state.phase = input.phase || "movement";
  state.rulesProcedureMode = true;
  state.officialTerrainLosDataBundle = terrainBundle;
  for (const piece of state.pieces) {
    for (const model of piece.models) {
      model.elevation = "ground";
      model.supportTerrainIds = [];
    }
  }
  return configureTerrain(state, input.definitions || []);
}
function replaceWithOfficialUnit(piece, dataset, recordKey) {
  const record = getOfficialCurrentProductRecord(dataset, recordKey);
  piece.name = record.payload.name;
  piece.officialUnitRecordKey = recordKey;
  piece.sourceRecordHash = record.sourceRecordHash;
  piece.officialPayloadHash = record.payloadHash;
  piece.combatTags = String(record.payload.tags || "").split(",")
    .map((entry) => entry.trim().toLowerCase()).filter(Boolean).sort();
  piece.combatTag = piece.combatTags.includes("flying") ? "flying" : "ground";
}
function movementPlan(state, input = {}) {
  const actor = state.pieces.find((piece) => piece.id === "p1-actor");
  const leading = actor.models[0];
  const placementById = new Map((input.placements || []).map((entry) => (
    [entry.modelId, entry]
  )));
  const placements = actor.models.map((model, index) => {
    const supplied = placementById.get(model.id) || (index === 0 ? input.leadingEnd : null);
    return { modelId: model.id,
      xMilliInches: supplied?.xMilliInches ?? mm(model.xInches),
      yMilliInches: supplied?.yMilliInches ?? mm(model.yInches),
      elevation: supplied?.elevation || model.elevation || "ground",
      supportTerrainIds: supplied?.supportTerrainIds || [] };
  });
  const leadingEnd = placements.find((entry) => entry.modelId === leading.id);
  return { planId: input.planId || "special-terrain-movement-plan",
    movementType: input.movementType || "move", leadingModelId: leading.id,
    maxDistanceMilliInches: input.maxDistanceMilliInches ?? 12000,
    placements,
    path: input.path || [
      { xMilliInches: mm(leading.xInches), yMilliInches: mm(leading.yInches),
        elevation: leading.elevation || "ground" },
      { xMilliInches: leadingEnd.xMilliInches,
        yMilliInches: leadingEnd.yMilliInches, elevation: leadingEnd.elevation },
    ],
    elevationTransitions: input.elevationTransitions || [],
    gapMouths: input.gapMouths || [],
    coherencyGapMouths: input.coherencyGapMouths || [] };
}
function movementCertificate(state, terrainBundle, plan) {
  return certifyOfficialSpecialTerrainPlanV1({ state,
    actor: state.pieces.find((piece) => piece.id === "p1-actor"),
    procedureKind: "special_terrain_movement_check", plan, dataBundle: terrainBundle });
}
function movementProcedure(state, plan) {
  return { procedureKind: "special_terrain_movement_check", sideKey: "player1",
    actorUnitId: "p1-actor", candidatePlansComplete: true,
    rulesDenominatorComplete: true, candidatePlans: [plan] };
}
function bindingFor(runtime, terrainBundle) {
  return { bindingHash: "slice-86-special-terrain-binding",
    rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
    geometryArtifactHash: hashStarcraftTmgContract(terrainBundle),
    dependencies: { geometryArtifact: {
      contentHash: hashStarcraftTmgContract(terrainBundle),
    } } };
}
function domainFor(runtime, state, binding) {
  return runtime.enumerate(state, { sideKey: "player1", includeDisabled: true,
    matchBinding: binding }).parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_SPECIAL_TERRAIN_RULES_PARAMETER_KIND
  ));
}
function engineFor(runtime, keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-09-01T01:30:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-86-special-terrain",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 86 special-terrain rules.";
function envelopeFor(engine, fixture, terrainBundle, state) {
  return engine.createEnvelope({ roomId: "official-slice-86-special-terrain-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-special-terrain-rules-kernel-v1",
        content: terrainBundle },
      rulesDisplay: { artifactId: "official-slice-86-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
    }, state });
}
function credentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({ grantId: "slice-86-special-terrain-grant",
    roomId: envelope.roomId, matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1", roleMode: "player", principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
  return { authority, lease: engine.issueControlLease({ seatAuthority: authority,
    sessionId: "slice-86-special-terrain-session", leaseFence: 1,
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

const slice = createOfficialSpecialTerrainRulesRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialSpecialTerrainRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 591,
  newlyExecutableRuleAtoms: 13, reviewRequiredRuleAtoms: 321,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 591,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 55, missingStateContractExecutors: 0 });
acceptance.push("slice86_promotes_exact_13_atoms_to_591_executable");

const route = createOfficialRemainingRuleAtomRouteV2(previousReport.slice.catalogue);
const slice86Route = route.assignments.find((entry) => entry.slice === 86);
assert.equal(route.routeHash, OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH);
assert.deepEqual(slice86Route.atomIds, [...OFFICIAL_SPECIAL_TERRAIN_RULES_NEW_ATOM_IDS]);
acceptance.push("route_v2_exact_slice86_atom_ids_match_executor_denominator");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const terrainBundle = createOfficialTerrainLosDataBundleV1({ dataset: fixture.dataset });
assert.deepEqual(fixture.snapshot.dataVersions, {
  unitsVersion: "71", cardsVersion: "69", rulesVersion: "48",
});
assert.equal(terrainBundle.profiles.length, 26);
acceptance.push("sealed_source_lock_binds_versions_71_69_48_and_26_profiles");

const grass = terrain("grass-a", 2, { terrainKind: "grass" });
const grassDefinition = { piece: grass };
const agreementState = prepare(fixture, terrainBundle, { definitions: [grassDefinition] });
assert.equal(agreementState.board.specialTerrainAgreement.terrainDenominatorComplete, true);
assert.equal(agreementState.board.specialTerrainAgreement.agreementHash.length, 64);
acceptance.push("complete_special_terrain_setup_agreement_is_content_hashed");

assert.throws(() => createOfficialSpecialTerrainAgreementV1({ terrainEntries: [
  { terrainId: "a", terrainKind: "ordinary", adjacentElevationPairs: [["ground", "mid"]],
    accessPoints: [accessPoint("duplicate-ap", rect(1, 2), ["ground", "mid"])] },
  { terrainId: "b", terrainKind: "ordinary", adjacentElevationPairs: [["ground", "mid"]],
    accessPoints: [accessPoint("duplicate-ap", rect(3, 4), ["ground", "mid"])] },
] }), /SPECIAL_TERRAIN_AGREEMENT_DENOMINATOR_INVALID/u);
acceptance.push("access_point_ids_are_globally_unique_in_setup_denominator");

const invalidGrassState = prepare(fixture, terrainBundle, { definitions: [{
  piece: terrain("bad-grass", 1, { terrainKind: "grass" }),
}] });
assert.throws(() => movementCertificate(invalidGrassState, terrainBundle,
  movementPlan(invalidGrassState, { leadingEnd: { xMilliInches: 6000,
    yMilliInches: 5000, elevation: "ground" } })), /SPECIAL_TERRAIN_GRASS_PROFILE_INVALID/u);
acceptance.push("grass_is_fail_closed_to_official_size_two_profile");

const impassable = terrain("cliff-a", 2, { terrainKind: "impassable" });
const impassableDefinition = { piece: impassable,
  adjacentElevationPairs: [["ground", "mid"]] };
const impassableState = prepare(fixture, terrainBundle,
  { definitions: [impassableDefinition] });
assert.equal(impassableState.board.specialTerrainAgreement.terrainEntries[0]
  .accessPoints.length, 0);
acceptance.push("impassable_terrain_is_derived_from_adjacent_level_without_access_point");

const small = terrain("scatter-a", 1);
const smallState = prepare(fixture, terrainBundle, { definitions: [{ piece: small }] });
const smallResult = movementCertificate(smallState, terrainBundle,
  movementPlan(smallState, { leadingEnd: { xMilliInches: 15000,
    yMilliInches: 5000, elevation: "ground" } })).result;
assert.equal(smallResult.terrainInteractions[0].sizeZeroOrOnePassable, true);
acceptance.push("size_zero_or_one_terrain_is_freely_passable");

assert.throws(() => movementCertificate(smallState, terrainBundle,
  movementPlan(smallState, { leadingEnd: { xMilliInches: 10000,
    yMilliInches: 5000, elevation: "ground" } })), /ENDPOINT_OVERLAP/u);
acceptance.push("model_endpoint_cannot_overlap_even_size_one_terrain");

assert.throws(() => movementCertificate(impassableState, terrainBundle,
  movementPlan(impassableState, { leadingEnd: { xMilliInches: 15000,
    yMilliInches: 5000, elevation: "mid" }, path: [
    { xMilliInches: 5000, yMilliInches: 5000, elevation: "ground" },
    { xMilliInches: 15000, yMilliInches: 5000, elevation: "mid" },
  ] })), /SPECIAL_TERRAIN_ACCESS_POINT_REQUIRED/u);
acceptance.push("elevation_change_without_access_point_is_rejected");

const platform = terrain("platform-a", 2);
const platformAccess = accessPoint("platform-ap", rect(8, 12), ["ground", "mid"]);
const accessState = prepare(fixture, terrainBundle, { definitions: [{ piece: platform,
  adjacentElevationPairs: [["ground", "mid"]], accessPoints: [platformAccess] }] });
const accessResult = movementCertificate(accessState, terrainBundle,
  movementPlan(accessState, { leadingEnd: { xMilliInches: 15000,
    yMilliInches: 5000, elevation: "mid" }, path: [
    { xMilliInches: 5000, yMilliInches: 5000, elevation: "ground" },
    { xMilliInches: 10000, yMilliInches: 5000, elevation: "mid" },
    { xMilliInches: 15000, yMilliInches: 5000, elevation: "mid" },
  ], elevationTransitions: [{ segmentIndex: 0, accessPointId: "platform-ap" }] })).result;
assert.equal(accessResult.accessPointUses[0].accessPointId, "platform-ap");
acceptance.push("access_point_connects_declared_levels_and_permits_elevation_change");

const ramp = terrain("ramp-a", 1, { terrainKind: "ramp",
  standableHorizontalSurface: true, footprint: rect(8, 12) });
const rampDefinition = { piece: ramp,
  adjacentElevationPairs: [["ground", "mid"], ["mid", "high"]],
  accessPoints: [
    accessPoint("ramp-base", rect(8, 9.5), ["ground", "mid"], "base"),
    accessPoint("ramp-top", rect(10.5, 12), ["mid", "high"], "top"),
  ] };
const rampState = prepare(fixture, terrainBundle, { definitions: [rampDefinition] });
const rampPlan = movementPlan(rampState, { leadingEnd: { xMilliInches: 15000,
  yMilliInches: 5000, elevation: "high" }, path: [
  { xMilliInches: 5000, yMilliInches: 5000, elevation: "ground" },
  { xMilliInches: 9000, yMilliInches: 5000, elevation: "mid" },
  { xMilliInches: 11000, yMilliInches: 5000, elevation: "mid" },
  { xMilliInches: 15000, yMilliInches: 5000, elevation: "high" },
], elevationTransitions: [
  { segmentIndex: 0, accessPointId: "ramp-base" },
  { segmentIndex: 2, accessPointId: "ramp-top" },
] });
const rampResult = movementCertificate(rampState, terrainBundle, rampPlan).result;
assert.deepEqual(rampResult.terrainInteractions[0].accessPointIdsUsedForTransit,
  ["ramp-base", "ramp-top"]);
acceptance.push("ramp_requires_base_and_top_access_and_assigns_mid_ground_surface");

const incompleteRampPlan = structuredClone(rampPlan);
incompleteRampPlan.elevationTransitions.pop();
assert.throws(() => movementCertificate(rampState, terrainBundle, incompleteRampPlan),
  /SPECIAL_TERRAIN_ACCESS_POINT_REQUIRED/u);
acceptance.push("ramp_route_missing_top_access_point_is_rejected");

assert.throws(() => movementCertificate(impassableState, terrainBundle,
  movementPlan(impassableState, { leadingEnd: { xMilliInches: 15000,
    yMilliInches: 5000, elevation: "ground" } })),
  /SPECIAL_TERRAIN_IMPASSABLE_MOVEMENT_FORBIDDEN/u);
acceptance.push("impassable_terrain_forbids_through_onto_and_across_movement");

const grassState = prepare(fixture, terrainBundle, { definitions: [grassDefinition] });
const grassPlan = movementPlan(grassState, { leadingEnd: { xMilliInches: 15000,
  yMilliInches: 5000, elevation: "ground" } });
const grassResult = movementCertificate(grassState, terrainBundle, grassPlan).result;
assert.deepEqual(grassResult.grassRemovedTerrainIds, ["grass-a"]);
acceptance.push("ground_leading_path_through_grass_marks_immediate_removal");

const grassOpened = openOfficialSpecialTerrainRulesPendingV1(grassState,
  movementProcedure(grassState, grassPlan));
const binding = bindingFor(runtime, terrainBundle);
const grassDomain = domainFor(runtime, grassOpened.state, binding);
const grassAction = runtime.instantiate(grassOpened.state, grassDomain,
  { choiceId: grassDomain.constraints.choices[0].choiceId }, { matchBinding: binding }).action;
const grassApplied = runtime.apply(grassOpened.state, grassAction, { matchBinding: binding });
const secondGrassResult = movementCertificate(grassApplied.state, terrainBundle,
  movementPlan(grassApplied.state, { planId: "after-grass-removal",
    leadingEnd: { xMilliInches: 16000, yMilliInches: 5000, elevation: "ground" },
    maxDistanceMilliInches: 1000 })).result;
assert.deepEqual(secondGrassResult.grassRemovedTerrainIds, []);
assert.equal(grassApplied.state.board.specialTerrainAgreement.terrainEntries.length, 1);
acceptance.push("removed_grass_stays_in_setup_audit_but_not_active_battle_geometry");

const losState = prepare(fixture, terrainBundle, { targetPositions: [{ xInches: 15,
  yInches: 5 }], definitions: [grassDefinition], phase: "combat" });
const losPlan = { planId: "grass-los-plan", targetUnitId: "p2-target",
  attackerModelId: losState.pieces[0].models[0].id,
  targetModelId: losState.pieces[1].models[0].id };
const losResult = certifyOfficialSpecialTerrainPlanV1({ state: losState,
  actor: losState.pieces[0], procedureKind: "grass_line_of_sight_check",
  plan: losPlan, dataBundle: terrainBundle }).result;
assert.equal(losResult.grassAssessments[0].terrainId, "grass-a");
assert.equal(losResult.visible, false);
acceptance.push("grass_size_two_blocks_line_of_sight_under_standard_cover_rules");

const flyingOverState = prepare(fixture, terrainBundle, { definitions: [grassDefinition] });
replaceWithOfficialUnit(flyingOverState.pieces[0], fixture.dataset,
  "army_units:point_defense_drone");
const flyingOverResult = movementCertificate(flyingOverState, terrainBundle,
  movementPlan(flyingOverState, { leadingEnd: { xMilliInches: 15000,
    yMilliInches: 5000, elevation: "ground" } })).result;
assert.deepEqual(flyingOverResult.grassRemovedTerrainIds, []);
assert.equal(flyingOverResult.flying, true);
acceptance.push("flying_overflight_does_not_remove_grass");

const flyingEndState = prepare(fixture, terrainBundle, { definitions: [grassDefinition] });
replaceWithOfficialUnit(flyingEndState.pieces[0], fixture.dataset,
  "army_units:point_defense_drone");
const flyingEndResult = movementCertificate(flyingEndState, terrainBundle,
  movementPlan(flyingEndState, { leadingEnd: { xMilliInches: 10000,
    yMilliInches: 5000, elevation: "ground" } })).result;
assert.deepEqual(flyingEndResult.grassRemovedTerrainIds, ["grass-a"]);
acceptance.push("flying_endpoint_on_grass_removes_grass_as_normal");

const flyingAccessState = prepare(fixture, terrainBundle, { definitions: [{
  piece: platform, adjacentElevationPairs: [["ground", "mid"]],
  accessPoints: [platformAccess],
}] });
replaceWithOfficialUnit(flyingAccessState.pieces[0], fixture.dataset,
  "army_units:point_defense_drone");
const flyingAccessResult = movementCertificate(flyingAccessState, terrainBundle,
  movementPlan(flyingAccessState, { leadingEnd: { xMilliInches: 15000,
    yMilliInches: 5000, elevation: "mid" }, path: [
    { xMilliInches: 5000, yMilliInches: 5000, elevation: "ground" },
    { xMilliInches: 15000, yMilliInches: 5000, elevation: "mid" },
  ] })).result;
assert.deepEqual(flyingAccessResult.accessPointUses, []);
assert.equal(flyingAccessResult.geometryOnlyPrintedSizeSubstitution, 0);
acceptance.push("flying_ignores_elevation_access_points_with_receipted_size_substitution");

assert.equal(grassResult.leadingModelOwnsGapAndTerrainInteraction, true);
assert.equal(grassResult.gapPlanHash.length, 64);
acceptance.push("leading_model_movement_always_reuses_frozen_gap_clearance_kernel");

assert.equal(smallResult.ordinaryTerrainResultHash.length, 64);
assert.equal(smallResult.ordinaryTerrainTransitIgnoredByFrozenFlyingSlice83, false);
acceptance.push("ordinary_small_terrain_reuses_frozen_slice84_transit_kernel");

const coherencyTerrain = terrain("coherency-platform", 2,
  { footprint: rect(8.5, 9.5, 4, 9) });
const coherencyAccess = accessPoint("coherency-ap", rect(8.5, 9.5, 4, 6),
  ["ground", "mid"]);
const coherencyState = prepare(fixture, terrainBundle, {
  actorPositions: [{ xInches: 7.5, yInches: 5 }, { xInches: 7.5, yInches: 8 }],
  definitions: [{ piece: coherencyTerrain,
    adjacentElevationPairs: [["ground", "mid"]], accessPoints: [coherencyAccess] }],
});
const [coherencyLeading, coherencyOther] = coherencyState.pieces[0].models;
const coherencyPlan = movementPlan(coherencyState, { maxDistanceMilliInches: 0,
  placements: [
    { modelId: coherencyLeading.id, xMilliInches: 7500, yMilliInches: 5000,
      elevation: "ground", supportTerrainIds: [] },
    { modelId: coherencyOther.id, xMilliInches: 10500, yMilliInches: 5000,
      elevation: "mid", supportTerrainIds: [] },
  ], path: [
    { xMilliInches: 7500, yMilliInches: 5000, elevation: "ground" },
    { xMilliInches: 7500, yMilliInches: 5000, elevation: "ground" },
  ] });
const coherencyResult = movementCertificate(coherencyState, terrainBundle,
  coherencyPlan).result;
assert.deepEqual(coherencyResult.coherencyAccessPointUses[0].accessPointIds,
  ["coherency-ap"]);
acceptance.push("multi_model_coherency_graph_can_link_through_access_point");

const blockedCoherencyState = prepare(fixture, terrainBundle, {
  actorPositions: [{ xInches: 7.5, yInches: 5 }, { xInches: 7.5, yInches: 8 }],
  definitions: [{ piece: coherencyTerrain,
    adjacentElevationPairs: [["ground", "mid"]], accessPoints: [
      accessPoint("off-route-ap", rect(8.5, 9.5, 7, 9), ["ground", "mid"]),
    ] }],
});
assert.throws(() => movementCertificate(blockedCoherencyState, terrainBundle,
  movementPlan(blockedCoherencyState, { maxDistanceMilliInches: 0,
    placements: [
      { modelId: blockedCoherencyState.pieces[0].models[0].id,
        xMilliInches: 7500, yMilliInches: 5000, elevation: "ground" },
      { modelId: blockedCoherencyState.pieces[0].models[1].id,
        xMilliInches: 10500, yMilliInches: 5000, elevation: "mid" },
    ], path: [
      { xMilliInches: 7500, yMilliInches: 5000, elevation: "ground" },
      { xMilliInches: 7500, yMilliInches: 5000, elevation: "ground" },
    ] })), /SPECIAL_TERRAIN_COHERENCY_ACCESS_POINT_REQUIRED/u);
acceptance.push("coherency_link_crossing_terrain_without_matching_access_is_rejected");

assert(grassDomain);
assert.equal(grassDomain.constraints.choices.length, 1);
assert.equal(grassDomain.constraints.choices[0].planHash,
  grassOpened.pending.choices[0].planHash);
acceptance.push("pending_and_parameter_domain_bind_complete_certified_plan_set");

assert.equal(grassApplied.ok, true);
assert.equal(grassApplied.state.pieces[0].models[0].xInches, 15);
assert.equal(grassApplied.state.board.terrain[0].isRemoved, true);
assert.equal(grassApplied.state.lastSpecialTerrainRulesResolution.planHash,
  grassOpened.pending.choices[0].planHash);
acceptance.push("runtime_apply_moves_models_and_persists_grass_removal_with_plan_hash");

const sourceDrift = structuredClone(grassOpened.state);
sourceDrift.officialDevelopmentTrancheSourceLockAudit.lockHash = "0".repeat(64);
assert.equal(runtime.enumerate(sourceDrift, { sideKey: "player1", includeDisabled: true,
  matchBinding: binding }).candidates[0].disabledReason,
"SPECIAL_TERRAIN_SOURCE_LOCK_BINDING_INVALID");
const geometryDrift = structuredClone(binding);
geometryDrift.dependencies.geometryArtifact.contentHash = "0".repeat(64);
assert.equal(runtime.enumerate(grassOpened.state, { sideKey: "player1",
  includeDisabled: true, matchBinding: geometryDrift }).candidates[0].disabledReason,
"SPECIAL_TERRAIN_GEOMETRY_ARTIFACT_BINDING_INVALID");
acceptance.push("source_or_geometry_drift_invalidates_special_terrain_legalspace");

const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_SPECIAL_TERRAIN_RULES_RELATIONSHIP_SCOPE_ID
));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "derived_value:specialTerrainRulesV1.accessPointGraph"
    && entry.to === "derived_value:specialTerrainRulesV1.elevationTransition"
));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash"),
));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
acceptance.push("relationship_graph_blocks_missing_access_to_elevation_dependency");

const keys = generateKeyPairSync("ed25519");
const authority = engineFor(runtime, keys, "slice-86-special-terrain-short-seal-v1");
const authoritySeed = envelopeFor(authority, fixture, terrainBundle, grassState);
const authorityOpened = openOfficialSpecialTerrainRulesPendingV1(
  authoritySeed.state, movementProcedure(authoritySeed.state, grassPlan),
);
const initial = authority.createEnvelope({ roomId: authoritySeed.roomId,
  matchBinding: authoritySeed.matchBinding, state: authorityOpened.state });
registerReplay(authority, initial, fixture, runtime, terrainBundle);
const access = credentials(authority, initial);
const authoritySpace = authority.legalSpace(initial, { seatAuthority: access.authority });
const authorityDomain = authoritySpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_SPECIAL_TERRAIN_RULES_PARAMETER_KIND
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
  controlLease: access.lease, idempotencyKey: "slice-86-special-terrain" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
assert.equal(authoritativeApplied.envelope.state.board.terrain[0].isRemoved, true);
const replay = engineFor(runtime, keys, "slice-86-special-terrain-rotated-seal-v2");
registerReplay(replay, initial, fixture, runtime, terrainBundle);
assert.equal(replay.replay({ initialEnvelope: initial,
  journal: [authoritativeApplied.receipt] }).ok, true);
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_special_terrain_event" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
acceptance.push("authority_ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.specialTerrainRulesProgress.sourceRefreshPerformed, false);
acceptance.push("no_source_refresh_skill_dsh_muzero_selfplay_or_training_promotion_occurs");
assert.equal(acceptance.length, 30);

const report = {
  schema: "starcraft_tmg_official_special_terrain_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit,
  terrainLosDataBundle: terrainBundle,
  remainingRouteV2Hash: route.routeHash,
  slice, sliceAudit: audit, runtimeHash: runtime.descriptor.runtimeHash,
  catalogueHash: slice.catalogueHash, graph, graphAudit: audit.graphAudit,
  coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true,
    historicalRulesDisplayRetained: true },
  ctx2skill: slice.ctx2skill, harness: slice.harness,
  rulesEligible: false, productionRoomEligible: false,
  rulesTruth: "official_special_terrain_and_access_point_conformance",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-special-terrain-rules-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ schema: report.schema,
  acceptancePassed: report.acceptancePassed, acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash, catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash, graphHash: graph.graphHash,
  graphCounts: { nodes: graph.nodes.length, edges: graph.edges.length },
  counts: audit.counts, routeV2Hash: route.routeHash,
  sourceLockHash: fixture.sourceLockAudit.lockHash,
  sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  trainingTruth: false }, null, 2));
