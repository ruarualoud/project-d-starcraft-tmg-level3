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
  OFFICIAL_FLYING_RULES_NEW_ATOM_IDS,
  OFFICIAL_FLYING_RULES_PARAMETER_KIND,
  openOfficialFlyingRulesPendingV1,
} from "../packages/rule-atoms/official-flying-rules-executor-v1.mjs";
import {
  evaluateOfficialFlyingCoverV1,
  officialFlyingParticipationVerdictV1,
} from "../packages/rule-atoms/official-flying-rules-kernel-v1.mjs";
import { OFFICIAL_FLYING_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-flying-rules-relationship-contract-v1.mjs";
import {
  createOfficialFlyingRulesRuleSliceV1,
  verifyOfficialFlyingRulesRuleSliceV1,
} from "../packages/rule-atoms/official-flying-rules-rule-slice-v1.mjs";
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
  OUTPUT_DIR, "official-gap-place-geometry-rule-slice-v1-report.json",
), "utf8"));
const acceptance = [];
function executableAction(value) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}
function rectangle(id, minX, maxX, minY, maxY, input = {}) {
  return { id, terrainKind: input.terrainKind || "wall", size: input.size ?? 2,
    landingAllowed: input.landingAllowed === true,
    footprint: { shape: "axis_aligned_rectangle", minXMilliInches: minX,
      maxXMilliInches: maxX, minYMilliInches: minY, maxYMilliInches: maxY } };
}
function prepare(fixture, input = {}) {
  const state = fixture.battleState({ activeSideKey: "player1", pieces: [
    { id: "flying-actor", sideKey: "player1", flying: true,
      positions: input.actorPositions || [{ xInches: 5, yInches: 5 },
        { xInches: 5, yInches: 7 }] },
    { id: "ground-enemy", sideKey: "player2",
      positions: input.groundEnemyPositions || [{ xInches: 25, yInches: 20 }] },
    { id: "flying-enemy", sideKey: "player2", flying: true,
      positions: input.flyingEnemyPositions || [{ xInches: 30, yInches: 20 }] },
  ] });
  state.phase = input.phase || "movement";
  state.rulesProcedureMode = true;
  state.board.terrain = structuredClone(input.terrain || []);
  for (const piece of state.pieces) {
    piece.name = `Rules fixture ${piece.id}`;
    piece.rulesFixtureOnly = true;
    delete piece.officialUnitRecordKey;
    delete piece.sourceRecordHash;
    delete piece.officialPayloadHash;
  }
  for (const model of state.pieces[0].models) {
    model.usesFlightStand = true;
    model.measurementBaseKind = "flight_stand_bottom";
    model.overhangRadiusInches = 4;
  }
  return state;
}
function placements(points = [{ x: 12000, y: 5000 }, { x: 12000, y: 7000 }]) {
  return points.map((entry, index) => ({ modelId: `flying-actor-model-${index + 1}`,
    xMilliInches: entry.x, yMilliInches: entry.y }));
}
function moveProcedure(input = {}) {
  return { procedureKind: "move", sideKey: "player1", actorUnitId: "flying-actor",
    candidatePlansComplete: true, rulesDenominatorComplete: true,
    candidatePlans: [{ planId: input.planId || "flying-move-plan",
      leadingModelId: "flying-actor-model-1",
      movementType: input.movementType || "move",
      maxDistanceMilliInches: Number(input.maxDistanceMilliInches ?? 7000),
      placements: input.placements || placements() }] };
}
function coverProcedure(input = {}) {
  return { procedureKind: "cover_check", sideKey: "player1",
    actorUnitId: "flying-actor", candidatePlansComplete: true,
    rulesDenominatorComplete: true,
    candidatePlans: [{ planId: input.planId || "flying-cover-plan",
      targetUnitId: input.targetUnitId || "ground-enemy",
      traceEvidenceComplete: true,
      terrainChecks: input.terrainChecks || [{ terrainId: "cover-wall",
        traceIntersects: true, terrainEffectiveSize: 2,
        attackerEffectiveSize: 2, targetEffectiveSize: 2,
        attackerWithinOneInch: false, targetWithinOneInch: false,
        elevationDeadZoneAppliesToNonFlyingModel: false, closeQuarters: false }] }] };
}
function bindingFor(fixture, runtime) {
  return { bindingHash: "slice-83-flying-rules-binding",
    dataSnapshotHash: hashStarcraftTmgContract(fixture.gameplayDataBundle),
    rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash } };
}
function domainFor(runtime, state, binding) {
  return runtime.enumerate(state, { sideKey: "player1", includeDisabled: true,
    matchBinding: binding }).parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_FLYING_RULES_PARAMETER_KIND
  ));
}
function engineFor(runtime, keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-08-31T15:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-83-flying-rules",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 83 Flying procedure.";
function envelopeFor(engine, fixture, state) {
  return engine.createEnvelope({ roomId: "official-slice-83-flying-rules-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-flying-rules-kernel-v1",
        content: { kind: "geometry-artifact", geometryVersion: "flying_rules_kernel_v1" } },
      rulesDisplay: { artifactId: "official-slice-83-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
    }, state });
}
function credentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({ grantId: "slice-83-flying-rules-grant",
    roomId: envelope.roomId, matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1", roleMode: "player", principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
  return { authority, lease: engine.issueControlLease({ seatAuthority: authority,
    sessionId: "slice-83-flying-rules-session", leaseFence: 1,
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
    geometryArtifact: { kind: "geometry-artifact", geometryVersion: "flying_rules_kernel_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v25" } };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content,
  });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}

const slice = createOfficialFlyingRulesRuleSliceV1({ previousSlice: previousReport.slice });
const audit = verifyOfficialFlyingRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 549,
  newlyExecutableRuleAtoms: 24, reviewRequiredRuleAtoms: 363,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 549,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 52, missingStateContractExecutors: 0 });
assert.equal(OFFICIAL_FLYING_RULES_NEW_ATOM_IDS.length, 24);
acceptance.push("slice83_promotes_exact_24_current_review_atoms_to_549_executable");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const binding = bindingFor(fixture, runtime);
const officialFlying = getOfficialCurrentProductRecord(
  fixture.dataset, "army_units:point_defense_drone",
);
assert.match(officialFlying.payload.tags, /Flying/u);
assert.equal(officialFlying.payload.stats.speed, "-");
assert.equal(slice.flyingRulesProgress.currentOfficialMovableFlyingCarrierAvailable, false);
assert.equal(slice.flyingRulesProgress.sourceRefreshPerformed, false);
acceptance.push("fixed_source_lock_identifies_point_defense_drone_as_null_speed_flying_carrier");

const transitState = prepare(fixture, { terrain: [
  rectangle("wall", 7000, 9000, 4000, 6000),
] });
transitState.pieces[1].models[0].xInches = 8;
transitState.pieces[1].models[0].yInches = 5;
const transitOpened = openOfficialFlyingRulesPendingV1(transitState, moveProcedure());
const transitChoice = transitOpened.pending.choices[0];
assert.equal(transitChoice.horizontalPointToPointDistance, 7000);
assert.equal(transitChoice.measurementBases[0].measurementBaseKind, "flight_stand_bottom");
assert.equal(transitChoice.measurementBases[0].overhangIgnored, true);
acceptance.push("flight_stand_bottom_is_the_measurement_and_positioning_base");
assert.deepEqual(transitChoice.transit, { terrainIgnored: true, modelBasesIgnored: true,
  elevationIgnored: true, accessPointsRequired: false });
acceptance.push("leading_model_moves_horizontally_point_to_point_through_terrain_and_models");

const elevationState = prepare(fixture);
elevationState.pieces[0].models[0].elevation = "high";
const elevationOpened = openOfficialFlyingRulesPendingV1(elevationState,
  moveProcedure({ maxDistanceMilliInches: 7000 }));
assert.equal(elevationOpened.pending.choices[0].horizontalPointToPointDistance, 7000);
acceptance.push("vertical_elevation_difference_does_not_increase_flying_movement_distance");

assert.throws(() => openOfficialFlyingRulesPendingV1(prepare(fixture),
  moveProcedure({ movementType: "charge" })), /FLYING_CHARGE_FORBIDDEN/u);
acceptance.push("flying_unit_cannot_charge");
assert.equal(officialFlyingParticipationVerdictV1(
  prepare(fixture).pieces[0], "charge_target",
).allowed, false);
acceptance.push("flying_unit_cannot_be_charged");

const endpointReject = prepare(fixture, {
  flyingEnemyPositions: [{ xInches: 14.258, yInches: 5 }],
});
assert.throws(() => openOfficialFlyingRulesPendingV1(endpointReject, moveProcedure()),
  /FLYING_ENEMY_FLYING_ENDPOINT_SEPARATION_REQUIRED/u);
acceptance.push("flying_endpoint_rejects_less_than_one_inch_from_enemy_flying_base");
const endpointExact = prepare(fixture, {
  flyingEnemyPositions: [{ xInches: 14.26, yInches: 5 }],
});
assert.equal(openOfficialFlyingRulesPendingV1(endpointExact,
  moveProcedure()).pending.choices[0].endpoint.enemyFlyingMinimumEdgeDistanceMilliInches, 1000);
acceptance.push("flying_endpoint_accepts_exactly_one_inch_from_enemy_flying_base");

const groundContact = prepare(fixture, {
  groundEnemyPositions: [{ xInches: 13.26, yInches: 5 }],
});
const contactChoice = openOfficialFlyingRulesPendingV1(
  groundContact, moveProcedure(),
).pending.choices[0];
assert.equal(contactChoice.endpoint.groundBaseContactAllowedWithoutEngagement, true);
assert.equal(contactChoice.restrictions.neverEngaged, true);
acceptance.push("flying_and_ground_may_end_base_to_base_without_engagement");

for (const role of ["engagement_source", "engagement_target", "combat_activation",
  "close_ranks_actor", "close_combat_attacker", "close_combat_target"] ) {
  assert.equal(officialFlyingParticipationVerdictV1(groundContact.pieces[0], role).allowed, false);
}
acceptance.push("flying_never_engages_and_cannot_participate_in_combat_or_close_ranks");
for (const role of ["mission_contestor", "mission_controller"]) {
  assert.equal(officialFlyingParticipationVerdictV1(groundContact.pieces[0], role).allowed, false);
}
acceptance.push("flying_cannot_control_or_contest_mission_markers");

const coherencyChoice = transitOpened.pending.choices[0];
assert.equal(coherencyChoice.coherencyLinks.length, 1);
assert.equal(coherencyChoice.coherencyLinks[0].terrainIgnored, true);
assert.equal(coherencyChoice.coherencyLinks[0].otherUnitModelsIgnored, true);
acceptance.push("flying_coherency_links_ignore_terrain_and_other_unit_models");
assert.throws(() => openOfficialFlyingRulesPendingV1(prepare(fixture), moveProcedure({
  placements: placements([{ x: 12000, y: 5000 }, { x: 12000, y: 9001 }]),
})), /FLYING_COHERENCY_RANGE_INVALID/u);
acceptance.push("flying_models_still_must_be_wholly_within_three_inches_of_leading_model");

const grassOverflight = prepare(fixture, { terrain: [
  rectangle("grass-path", 7500, 8500, 4500, 5500, { terrainKind: "grass" }),
] });
const grassOverflightOpened = openOfficialFlyingRulesPendingV1(
  grassOverflight, moveProcedure(),
);
assert.deepEqual(grassOverflightOpened.pending.choices[0].grass.overflownTerrainIds,
  ["grass-path"]);
assert.deepEqual(grassOverflightOpened.pending.choices[0].grass.removedAtEndpointTerrainIds, []);
acceptance.push("flying_overflight_does_not_remove_grass");

const grassLanding = prepare(fixture, { terrain: [
  rectangle("grass-endpoint", 11500, 12500, 4500, 5500, { terrainKind: "grass" }),
] });
const grassLandingOpened = openOfficialFlyingRulesPendingV1(grassLanding, moveProcedure());
assert.deepEqual(grassLandingOpened.pending.choices[0].grass.removedAtEndpointTerrainIds,
  ["grass-endpoint"]);
acceptance.push("flying_endpoint_on_grass_schedules_permanent_removal");

const baseCover = evaluateOfficialFlyingCoverV1({
  attacker: prepare(fixture).pieces[0], target: prepare(fixture).pieces[1],
  traceEvidenceComplete: true, terrainChecks: [{ terrainId: "wall",
    traceIntersects: true, terrainEffectiveSize: 99, attackerEffectiveSize: 2,
    targetEffectiveSize: 2, attackerWithinOneInch: false, targetWithinOneInch: false,
    elevationDeadZoneAppliesToNonFlyingModel: false }],
});
assert.equal(baseCover.fullCoverIgnoredToOrFromFlying, true);
assert.equal(baseCover.lineOfSightBlocked, false);
acceptance.push("line_of_sight_to_or_from_flying_ignores_full_cover");
assert.equal(baseCover.flyingEffectiveSize, "higher_than_every_terrain");
assert.equal(baseCover.flyingTerrainSizeContribution, 0);
acceptance.push("flying_effective_size_exceeds_every_terrain_without_terrain_contribution");

const flyingNearCover = evaluateOfficialFlyingCoverV1({
  attacker: prepare(fixture).pieces[0], target: prepare(fixture).pieces[1],
  traceEvidenceComplete: true, terrainChecks: [{ terrainId: "wall",
    traceIntersects: true, terrainEffectiveSize: 9, attackerEffectiveSize: 2,
    targetEffectiveSize: 2, attackerWithinOneInch: true, targetWithinOneInch: false,
    elevationDeadZoneAppliesToNonFlyingModel: false }],
});
assert.equal(flyingNearCover.terrainChecks[0].attackerDirectCoverBlocks, false);
acceptance.push("terrain_cannot_provide_direct_cover_to_the_flying_model");

const groundNearCover = evaluateOfficialFlyingCoverV1({
  attacker: prepare(fixture).pieces[0], target: prepare(fixture).pieces[1],
  traceEvidenceComplete: true, terrainChecks: [{ terrainId: "wall",
    traceIntersects: true, terrainEffectiveSize: 2, attackerEffectiveSize: 2,
    targetEffectiveSize: 2, attackerWithinOneInch: false, targetWithinOneInch: true,
    elevationDeadZoneAppliesToNonFlyingModel: false }],
});
assert.equal(groundNearCover.terrainChecks[0].targetDirectCoverBlocks, true);
assert.equal(groundNearCover.lineOfSightBlocked, true);
acceptance.push("direct_cover_that_applies_to_the_non_flying_model_is_retained");

const deadZone = evaluateOfficialFlyingCoverV1({
  attacker: prepare(fixture).pieces[0], target: prepare(fixture).pieces[1],
  traceEvidenceComplete: true, terrainChecks: [{ terrainId: "cliff",
    traceIntersects: true, terrainEffectiveSize: 3, attackerEffectiveSize: 2,
    targetEffectiveSize: 2, elevationDeadZoneAppliesToNonFlyingModel: true }],
});
assert.equal(deadZone.terrainChecks[0].elevationDeadZoneBlocks, true);
acceptance.push("elevation_dead_zone_that_applies_to_the_non_flying_model_is_retained");
assert.equal(deadZone.flyingHighGroundCoverEligible, false);
assert.equal(deadZone.flyingAttackOriginatesFromLowerElevation, false);
acceptance.push("flying_never_gains_high_ground_cover_or_lower_elevation_attack_origin");

const moveDomain = domainFor(runtime, grassLandingOpened.state, binding);
const moveAction = runtime.instantiate(grassLandingOpened.state, moveDomain,
  { choiceId: moveDomain.constraints.choices[0].choiceId }, { matchBinding: binding });
const moved = runtime.apply(grassLandingOpened.state,
  executableAction(moveAction.action), { matchBinding: binding });
assert.equal(moved.state.pieces[0].models[0].xInches, 12);
assert.equal(moved.state.board.terrain[0].isRemoved, true);
assert.equal(moved.state.lastFlyingRulesResolution.procedureKind, "move");
acceptance.push("runtime_legalspace_instantiate_apply_moves_and_removes_endpoint_grass");

const coverOpened = openOfficialFlyingRulesPendingV1(prepare(fixture), coverProcedure());
const coverDomain = domainFor(runtime, coverOpened.state, binding);
const coverAction = runtime.instantiate(coverOpened.state, coverDomain,
  { choiceId: coverDomain.constraints.choices[0].choiceId }, { matchBinding: binding });
const coverApplied = runtime.apply(coverOpened.state,
  executableAction(coverAction.action), { matchBinding: binding });
assert.equal(coverApplied.state.lastFlyingRulesResolution.procedureKind, "cover_check");
assert.equal(coverApplied.state.lastFlyingRulesResolution.coverResult.fullCoverIgnoredToOrFromFlying,
  true);
acceptance.push("runtime_cover_check_uses_the_same_certified_cover_result_hash");

const stale = structuredClone(grassLandingOpened.state);
stale.board.terrain.push(rectangle("late-wall", 11000, 13000, 4000, 6000));
assert.throws(() => runtime.instantiate(stale, moveDomain,
  { choiceId: moveDomain.constraints.choices[0].choiceId }, { matchBinding: binding }),
  /FLYING_PENDING_INVALID/u);
const sourceDrift = structuredClone(grassLandingOpened.state);
sourceDrift.officialDevelopmentTrancheSourceLockAudit.lockHash = "0".repeat(64);
assert.equal(runtime.enumerate(sourceDrift, { sideKey: "player1", includeDisabled: true,
  matchBinding: binding }).candidates[0].disabledReason,
"FLYING_SOURCE_LOCK_BINDING_INVALID");
acceptance.push("piece_terrain_pending_or_source_lock_drift_invalidates_flying_legalspace");

const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_FLYING_RULES_RELATIONSHIP_SCOPE_ID
));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "derived_value:flyingRulesV1.coverEffectiveSizeAndElevation"
    && entry.to === "action_variant:flyingRulesV1.resolve"
));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash"),
));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
acceptance.push("relationship_graph_blocks_a_missing_cover_to_resolution_dependency");

const keys = generateKeyPairSync("ed25519");
const authority = engineFor(runtime, keys, "slice-83-flying-short-seal-v1");
const authoritySeed = envelopeFor(authority, fixture, grassLanding);
const authorityOpened = openOfficialFlyingRulesPendingV1(
  authoritySeed.state,
  moveProcedure(),
);
const initial = authority.createEnvelope({
  roomId: authoritySeed.roomId,
  matchBinding: authoritySeed.matchBinding,
  state: authorityOpened.state,
});
registerReplay(authority, initial, fixture, runtime);
const access = credentials(authority, initial);
const authoritySpace = authority.legalSpace(initial, { seatAuthority: access.authority });
const authorityDomain = authoritySpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_FLYING_RULES_PARAMETER_KIND
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
  controlLease: access.lease, idempotencyKey: "slice-83-flying-rules" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
assert.equal(authoritativeApplied.envelope.state.board.terrain[0].isRemoved, true);
const replay = engineFor(runtime, keys, "slice-83-flying-rotated-seal-v2");
registerReplay(replay, initial, fixture, runtime);
assert.equal(replay.replay({ initialEnvelope: initial,
  journal: [authoritativeApplied.receipt] }).ok, true);
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_flying_event" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
assert.equal(initial.matchBinding.rulesDisplayBinding.artifactHash,
  hashStarcraftTmgContract(DISPLAY));
acceptance.push("authority_ed25519_replay_survives_hmac_rotation_rejects_tamper_and_retains_display");

assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
acceptance.push("no_skill_dsh_muzero_memory_selfplay_or_training_promotion_occurs_in_slice83");
assert.equal(acceptance.length, 28);

const report = {
  schema: "starcraft_tmg_official_flying_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit,
  officialCurrentFlyingCarrier: { recordKey: officialFlying.recordKey,
    name: officialFlying.payload.name, speed: officialFlying.payload.stats.speed,
    tags: officialFlying.payload.tags,
    currentOfficialMovableFlyingCarrierAvailable: false },
  slice, sliceAudit: audit, runtimeHash: runtime.descriptor.runtimeHash,
  catalogueHash: slice.catalogueHash, graph, graphAudit: audit.graphAudit,
  coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true,
    historicalRulesDisplayRetained: true },
  ctx2skill: slice.ctx2skill, harness: slice.harness,
  rulesEligible: false, productionRoomEligible: false,
  rulesTruth: "official_flying_rules_conformance_with_current_carrier_quarantine",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, "official-flying-rules-rule-slice-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ schema: report.schema,
  acceptancePassed: report.acceptancePassed, acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash, catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash, graphHash: graph.graphHash,
  graphCounts: { nodes: graph.nodes.length, edges: graph.edges.length },
  counts: audit.counts, sourceLockHash: fixture.sourceLockAudit.lockHash,
  officialCurrentFlyingCarrier: report.officialCurrentFlyingCarrier,
  sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  trainingTruth: false }, null, 2));
