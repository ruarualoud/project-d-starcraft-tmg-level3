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
  OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_NEW_ATOM_IDS,
  OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_PARAMETER_KIND,
  OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_REUSED_FLYING_ATOM_IDS,
  openOfficialElevationEffectiveSizeRulesPendingV1,
} from "../packages/rule-atoms/official-elevation-effective-size-rules-executor-v1.mjs";
import {
  createOfficialTerrainElevationAgreementV1,
  evaluateOfficialEffectiveSizeV1,
  evaluateOfficialElevatedLineOfSightV1,
  evaluateOfficialHorizontalElevationDistanceV1,
} from "../packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs";
import { OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-elevation-effective-size-rules-relationship-contract-v1.mjs";
import {
  createOfficialElevationEffectiveSizeRulesRuleSliceV1,
  verifyOfficialElevationEffectiveSizeRulesRuleSliceV1,
} from "../packages/rule-atoms/official-elevation-effective-size-rules-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialTerrainPieceV1 } from
  "../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs";
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
  OUTPUT_DIR, "official-terrain-los-rules-rule-slice-v1-report.json",
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
  state.board.terrainElevationAgreement = createOfficialTerrainElevationAgreementV1({
    supportRelations: input.supportRelations || [],
  });
  const actorSupports = input.actorSupportTerrainIdsByModel
    || [input.actorSupportTerrainIds || []];
  const targetSupports = input.targetSupportTerrainIdsByModel
    || [input.targetSupportTerrainIds || []];
  for (const [index, model] of state.pieces[0].models.entries()) {
    model.supportTerrainIds = [...(actorSupports[index] || [])];
    model.elevation = input.actorElevations?.[index]
      || (model.supportTerrainIds.length ? "high" : "ground");
  }
  for (const [index, model] of state.pieces[1].models.entries()) {
    model.supportTerrainIds = [...(targetSupports[index] || [])];
    model.elevation = input.targetElevations?.[index]
      || (model.supportTerrainIds.length ? "high" : "ground");
  }
  return state;
}
function replaceWithOfficialUnit(piece, dataset, recordKey, combatTags = null) {
  const record = getOfficialCurrentProductRecord(dataset, recordKey);
  piece.name = record.payload.name;
  piece.officialUnitRecordKey = recordKey;
  piece.sourceRecordHash = record.sourceRecordHash;
  piece.officialPayloadHash = record.payloadHash;
  if (combatTags) {
    piece.combatTags = [...combatTags];
    piece.combatTag = combatTags[0];
  }
}
function effectiveSizeInput(state, dataBundle, input = {}) {
  return { state, subjectKind: input.subjectKind || "model",
    unitId: input.unitId || "p1-actor",
    modelId: input.modelId || state.pieces[0].models[0].id,
    terrainId: input.terrainId, dataBundle };
}
function losInput(state, dataBundle, reverse = false) {
  const attacker = reverse ? state.pieces[1] : state.pieces[0];
  const target = reverse ? state.pieces[0] : state.pieces[1];
  return { state, attacker, attackerModelId: attacker.models[0].id,
    target, targetModelId: target.models[0].id, dataBundle };
}
function losProcedure(state, input = {}) {
  return { procedureKind: "elevated_line_of_sight_check", sideKey: "player1",
    actorUnitId: "p1-actor", candidatePlansComplete: true,
    rulesDenominatorComplete: true, candidatePlans: [{
      planId: input.planId || "elevated-line-of-sight-plan",
      targetUnitId: "p2-target",
      attackerModelId: state.pieces[0].models[0].id,
      targetModelId: state.pieces[1].models[0].id,
    }] };
}
function bindingFor(runtime, terrainBundle) {
  return { bindingHash: "slice-85-elevation-effective-size-binding",
    rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
    geometryArtifactHash: hashStarcraftTmgContract(terrainBundle),
    dependencies: { geometryArtifact: {
      contentHash: hashStarcraftTmgContract(terrainBundle),
    } } };
}
function domainFor(runtime, state, binding) {
  return runtime.enumerate(state, { sideKey: "player1", includeDisabled: true,
    matchBinding: binding }).parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_PARAMETER_KIND
  ));
}
function engineFor(runtime, keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-09-01T00:30:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-85-elevation-effective-size",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 85 elevation rules.";
function envelopeFor(engine, fixture, terrainBundle, state) {
  return engine.createEnvelope({ roomId: "official-slice-85-elevation-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-elevation-effective-size-kernel-v1",
        content: terrainBundle },
      rulesDisplay: { artifactId: "official-slice-85-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
    }, state });
}
function credentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({ grantId: "slice-85-elevation-grant",
    roomId: envelope.roomId, matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1", roleMode: "player", principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
  return { authority, lease: engine.issueControlLease({ seatAuthority: authority,
    sessionId: "slice-85-elevation-session", leaseFence: 1,
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

const slice = createOfficialElevationEffectiveSizeRulesRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialElevationEffectiveSizeRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 578,
  newlyExecutableRuleAtoms: 10, reviewRequiredRuleAtoms: 334,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 578,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 54, missingStateContractExecutors: 0 });
assert.equal(OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_NEW_ATOM_IDS.length, 10);
acceptance.push("slice85_promotes_exact_10_remaining_atoms_to_578_executable");

for (const atomId of OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_NEW_ATOM_IDS) {
  assert.equal(previousReport.slice.catalogue.atoms.find((entry) => entry.atomId === atomId)
    ?.disposition, "review_required");
}
for (const atomId of OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_REUSED_FLYING_ATOM_IDS) {
  assert.equal(previousReport.slice.catalogue.atoms.find((entry) => entry.atomId === atomId)
    ?.disposition, "executable");
}
assert.equal(slice.elevationEffectiveSizeRulesProgress.roadmapOverlapCorrectionRequired, true);
assert.equal(slice.elevationEffectiveSizeRulesProgress.roadmapUnassignedAtomDebtAfterCorrection, 5);
acceptance.push("roadmap_correction_proves_10_new_plus_5_already_executable_flying_atoms");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const terrainBundle = createOfficialTerrainLosDataBundleV1({ dataset: fixture.dataset });
const binding = bindingFor(runtime, terrainBundle);
assert.equal(terrainBundle.profiles.length, 26);
assert.equal(terrainBundle.coreRulebookHash, OFFICIAL_TERRAIN_LOS_CORE_RULEBOOK_HASH);
assert.deepEqual(fixture.snapshot.dataVersions, {
  unitsVersion: "71", cardsVersion: "69", rulesVersion: "48",
});
acceptance.push("sealed_source_lock_binds_versions_71_69_48_and_26_current_profiles");

const platform = terrain("high-platform", 3, { standableHorizontalSurface: true,
  footprint: { shape: "axis_aligned_rectangle", minXMilliInches: 4000,
    maxXMilliInches: 10000, minYMilliInches: 3000, maxYMilliInches: 7000 } });
const stackedWall = terrain("stacked-wall", 2, {
  footprint: { shape: "axis_aligned_rectangle", minXMilliInches: 8000,
    maxXMilliInches: 10000, minYMilliInches: 3000, maxYMilliInches: 7000 } });
const highState = prepare(fixture, terrainBundle, { terrain: [platform, stackedWall],
  supportRelations: [{ terrainId: "stacked-wall", supportTerrainId: "high-platform" }],
  actorSupportTerrainIds: ["high-platform"] });
assert.equal(highState.board.terrainElevationAgreement.relationDenominatorComplete, true);
assert.equal(highState.board.terrainElevationAgreement.agreementHash.length, 64);
acceptance.push("complete_setup_support_graph_is_content_hashed");

const modelSize = evaluateOfficialEffectiveSizeV1(
  effectiveSizeInput(highState, terrainBundle),
);
assert.equal(modelSize.subject.printedSize, 2);
assert.equal(modelSize.subject.supportingTerrainEffectiveSize, 3);
assert.equal(modelSize.subject.effectiveSize, 5);
assert.equal(modelSize.subject.elevationBand, "high");
acceptance.push("elevated_model_effective_size_adds_direct_supporting_terrain_size");

const wallSize = evaluateOfficialEffectiveSizeV1(effectiveSizeInput(highState,
  terrainBundle, { subjectKind: "terrain", terrainId: "stacked-wall" }));
assert.equal(wallSize.subject.printedSize, 2);
assert.deepEqual(wallSize.subject.supportTerrainChain, ["high-platform"]);
assert.equal(wallSize.subject.effectiveSize, 5);
acceptance.push("stacked_terrain_effective_size_recursively_adds_support_chain");

const midPlatform = terrain("mid-platform", 2, { standableHorizontalSurface: true,
  footprint: { shape: "axis_aligned_rectangle", minXMilliInches: 4000,
    maxXMilliInches: 6000, minYMilliInches: 4000, maxYMilliInches: 6000 } });
const midState = prepare(fixture, terrainBundle, { terrain: [midPlatform],
  actorSupportTerrainIds: ["mid-platform"], actorElevations: ["mid"] });
assert.equal(evaluateOfficialEffectiveSizeV1(effectiveSizeInput(midState,
  terrainBundle)).subject.effectiveSize, 4);
assert.equal(evaluateOfficialEffectiveSizeV1(effectiveSizeInput(midState,
  terrainBundle)).subject.elevationBand, "mid");
acceptance.push("mid_ground_adds_size_one_or_two_support_to_model_size");

const groundState = prepare(fixture, terrainBundle);
const groundSize = evaluateOfficialEffectiveSizeV1(
  effectiveSizeInput(groundState, terrainBundle),
);
assert.equal(groundSize.subject.effectiveSize, groundSize.subject.printedSize);
assert.equal(groundSize.subject.elevationBand, "ground");
acceptance.push("ground_level_model_effective_size_equals_printed_size");

const distance = evaluateOfficialHorizontalElevationDistanceV1({ state: highState,
  leftUnitId: "p1-actor", leftModelId: highState.pieces[0].models[0].id,
  rightUnitId: "p2-target", rightModelId: highState.pieces[1].models[0].id,
  dataBundle: terrainBundle });
assert.equal(distance.distanceMilliInches, 6740);
assert.equal(distance.verticalHeightContribution, 0);
assert.equal(distance.topDownHorizontalMeasurement, true);
acceptance.push("cross_elevation_range_uses_horizontal_nearest_base_edges_only");

const cycleState = prepare(fixture, terrainBundle, { terrain: [platform,
  terrain("cycle-top", 1, { standableHorizontalSurface: true,
    footprint: platform.footprint })] });
cycleState.board.terrainElevationAgreement = createOfficialTerrainElevationAgreementV1({
  supportRelations: [
    { terrainId: "high-platform", supportTerrainId: "cycle-top" },
    { terrainId: "cycle-top", supportTerrainId: "high-platform" },
  ],
});
assert.throws(() => evaluateOfficialEffectiveSizeV1(
  effectiveSizeInput(cycleState, terrainBundle)), /ELEVATION_SUPPORT_CYCLE/u);
acceptance.push("terrain_support_cycles_fail_closed");

const mismatchState = structuredClone(highState);
mismatchState.pieces[0].models[0].elevation = "ground";
assert.throws(() => evaluateOfficialEffectiveSizeV1(
  effectiveSizeInput(mismatchState, terrainBundle)), /ELEVATION_MODEL_BAND_MISMATCH/u);
acceptance.push("client_elevation_label_cannot_override_rules_derived_band");

const tamperedState = structuredClone(highState);
tamperedState.board.terrain[0].size = 4;
assert.throws(() => evaluateOfficialEffectiveSizeV1(
  effectiveSizeInput(tamperedState, terrainBundle)), /ELEVATION_TERRAIN_INVALID/u);
acceptance.push("terrain_size_tamper_is_rejected_by_frozen_setup_hash");

const unsupportedSupport = structuredClone(highState);
unsupportedSupport.pieces[0].models[0].supportTerrainIds = ["missing-terrain"];
assert.throws(() => evaluateOfficialEffectiveSizeV1(
  effectiveSizeInput(unsupportedSupport, terrainBundle)), /ELEVATION_MODEL_SUPPORT_INVALID/u);
acceptance.push("missing_or_nonphysical_model_support_fails_closed");

const ovalState = structuredClone(highState);
ovalState.pieces[0].models[0].baseShape = "oval";
ovalState.pieces[0].models[0].baseDepthInches = 2;
assert.throws(() => evaluateOfficialEffectiveSizeV1(
  effectiveSizeInput(ovalState, terrainBundle)), /ELEVATION_MODEL_BASE_INVALID/u);
acceptance.push("arbitrary_model_base_geometry_remains_fail_closed_to_slice87");

const specialState = prepare(fixture, terrainBundle, { terrain: [terrain(
  "deferred-grass", 2, { terrainKind: "grass" },
)] });
assert.throws(() => evaluateOfficialEffectiveSizeV1(
  effectiveSizeInput(specialState, terrainBundle)),
/ELEVATION_SPECIAL_TERRAIN_DEFERRED_TO_SLICE86/u);
acceptance.push("grass_impassable_and_ramp_semantics_remain_slice86_only");

const stackedLos = evaluateOfficialElevatedLineOfSightV1(
  losInput(highState, terrainBundle),
);
assert.equal(stackedLos.attacker.effectiveSize, 5);
assert.equal(stackedLos.assessments.find((entry) => entry.terrainId === "stacked-wall")
  .terrainEffectiveSize, 5);
assert.equal(stackedLos.visible, false);
acceptance.push("stacked_wall_effective_size_five_blocks_equal_size_elevated_model");

const unstackedState = prepare(fixture, terrainBundle, {
  terrain: [platform, stackedWall], actorSupportTerrainIds: ["high-platform"] });
const unstackedLos = evaluateOfficialElevatedLineOfSightV1(
  losInput(unstackedState, terrainBundle),
);
assert.equal(unstackedLos.assessments.find((entry) => entry.terrainId === "stacked-wall")
  .terrainEffectiveSize, 2);
assert.equal(unstackedLos.visible, true);
acceptance.push("distinct_terrain_sizes_never_combine_without_declared_support_edge");

assert.equal(stackedLos.geometryAdapter.sourceKernel,
  "official_terrain_los_rules_kernel_v1");
assert.equal(stackedLos.geometryAdapter.priorExecutorSourceMutationAllowed, false);
assert.equal(stackedLos.geometryAdapter.inheritedResultHash.length, 64);
acceptance.push("slice84_geometry_is_reused_by_explicit_projection_without_source_mutation");

const deadZoneState = prepare(fixture, terrainBundle, { actorPositions: [
  { xInches: 5, yInches: 5 }], targetPositions: [{ xInches: 11.5, yInches: 5 }],
terrain: [platform], actorSupportTerrainIds: ["high-platform"] });
const deadZone = evaluateOfficialElevatedLineOfSightV1(
  losInput(deadZoneState, terrainBundle),
);
assert.equal(deadZone.assessments[0].elevationDeadZoneBlocks, true);
assert.equal(deadZone.visible, false);
acceptance.push("high_to_ground_same_terrain_dead_zone_remains_effective_size_aware");

const closeQuartersState = prepare(fixture, terrainBundle, { actorPositions: [
  { xInches: 9, yInches: 5 }], targetPositions: [{ xInches: 11.5, yInches: 5 }],
terrain: [platform], actorSupportTerrainIds: ["high-platform"] });
const closeQuarters = evaluateOfficialElevatedLineOfSightV1(
  losInput(closeQuartersState, terrainBundle),
);
assert.equal(closeQuarters.assessments[0].closeQuarters, true);
assert.equal(closeQuarters.assessments[0].elevationDeadZoneBlocks, false);
assert.equal(closeQuarters.visible, true);
acceptance.push("close_quarters_still_overrides_elevation_dead_zone_after_stacking");

const evadeState = prepare(fixture, terrainBundle, { actorPositions: [
  { xInches: 13, yInches: 5 }], targetPositions: [{ xInches: 5, yInches: 5 }],
terrain: [platform], targetSupportTerrainIds: ["high-platform"] });
const evade = evaluateOfficialElevatedLineOfSightV1(
  losInput(evadeState, terrainBundle),
);
assert.equal(evade.targetAllHighGround, true);
assert.equal(evade.attackOriginatesFromLowerElevation, true);
assert.equal(evade.highGroundEvadeEligible, true);
acceptance.push("all_high_ground_target_models_gain_evade_against_any_lower_origin_model");

const mixedTargetState = prepare(fixture, terrainBundle, { actorPositions: [
  { xInches: 13, yInches: 5 }], targetPositions: [
  { xInches: 5, yInches: 5 }, { xInches: 12, yInches: 8 }],
terrain: [platform], targetSupportTerrainIdsByModel: [["high-platform"], []],
targetElevations: ["high", "ground"] });
const mixedTarget = evaluateOfficialElevatedLineOfSightV1(
  losInput(mixedTargetState, terrainBundle),
);
assert.equal(mixedTarget.targetAllHighGround, false);
assert.equal(mixedTarget.highGroundEvadeEligible, false);
acceptance.push("one_target_model_off_high_ground_removes_unit_high_ground_evade");

const flyingState = prepare(fixture, terrainBundle, { terrain: [terrain(
  "flying-full-wall", 3,
)] });
replaceWithOfficialUnit(flyingState.pieces[0], fixture.dataset,
  "army_units:point_defense_drone", ["flying"]);
const flyingFull = evaluateOfficialElevatedLineOfSightV1(
  losInput(flyingState, terrainBundle),
);
assert.equal(flyingFull.attacker.effectiveSize, "higher_than_every_terrain");
assert.equal(flyingFull.assessments[0].fullCoverIgnoredToOrFromFlying, true);
assert.equal(flyingFull.visible, true);
assert.equal(flyingFull.geometryAdapter.flyingNullSizeGeometrySubstitutions.length, 1);
acceptance.push("flying_null_size_uses_explicit_geometry_only_adapter_and_ignores_full_cover");

const flyingDirectState = prepare(fixture, terrainBundle, { actorPositions: [
  { xInches: 5, yInches: 5 }], targetPositions: [{ xInches: 10.7, yInches: 5 }],
terrain: [terrain("flying-direct-wall", 2)] });
replaceWithOfficialUnit(flyingDirectState.pieces[0], fixture.dataset,
  "army_units:point_defense_drone", ["flying"]);
const flyingDirect = evaluateOfficialElevatedLineOfSightV1(
  losInput(flyingDirectState, terrainBundle),
);
assert.equal(flyingDirect.assessments[0].targetDirectCover, true);
assert.equal(flyingDirect.visible, false);
assert.equal(flyingDirect.flyingCoverIntegration.directCoverForNonFlyingModelRetained, true);
acceptance.push("flying_cover_adapter_retains_direct_cover_for_nonflying_model");

const flyingTargetState = structuredClone(evadeState);
replaceWithOfficialUnit(flyingTargetState.pieces[1], fixture.dataset,
  "army_units:point_defense_drone", ["flying"]);
flyingTargetState.pieces[1].models[0].supportTerrainIds = [];
flyingTargetState.pieces[1].models[0].elevation = "ground";
const flyingTarget = evaluateOfficialElevatedLineOfSightV1(
  losInput(flyingTargetState, terrainBundle),
);
assert.equal(flyingTarget.highGroundEvadeEligible, false);
assert.equal(flyingTarget.flyingHighGroundEvadeEligible, false);
acceptance.push("flying_target_never_receives_high_ground_evade");

const runtimeOpened = openOfficialElevationEffectiveSizeRulesPendingV1(
  highState, losProcedure(highState),
);
const runtimeDomain = domainFor(runtime, runtimeOpened.state, binding);
const runtimeAction = runtime.instantiate(runtimeOpened.state, runtimeDomain,
  { choiceId: runtimeDomain.constraints.choices[0].choiceId }, { matchBinding: binding });
const runtimeApplied = runtime.apply(runtimeOpened.state,
  executableAction(runtimeAction.action), { matchBinding: binding });
assert.equal(runtimeApplied.state.lastElevationEffectiveSizeRulesResolution.procedureKind,
  "elevated_line_of_sight_check");
assert.equal(runtimeApplied.state.lastElevationEffectiveSizeRulesResolution.result.visible,
  false);
assert.equal(runtimeApplied.state.pendingAction, null);
acceptance.push("runtime_enumerate_instantiate_apply_share_one_certified_plan_hash");

const stale = structuredClone(runtimeOpened.state);
stale.board.terrainElevationAgreement.supportRelations = [];
assert.throws(() => runtime.instantiate(stale, runtimeDomain,
  { choiceId: runtimeDomain.constraints.choices[0].choiceId }, { matchBinding: binding }),
/ELEVATION_PENDING_INVALID/u);
const sourceDrift = structuredClone(runtimeOpened.state);
sourceDrift.officialDevelopmentTrancheSourceLockAudit.lockHash = "0".repeat(64);
assert.equal(runtime.enumerate(sourceDrift, { sideKey: "player1", includeDisabled: true,
  matchBinding: binding }).candidates[0].disabledReason,
"ELEVATION_SOURCE_LOCK_BINDING_INVALID");
const geometryDrift = structuredClone(binding);
geometryDrift.dependencies.geometryArtifact.contentHash = "0".repeat(64);
assert.equal(runtime.enumerate(runtimeOpened.state, { sideKey: "player1",
  includeDisabled: true, matchBinding: geometryDrift }).candidates[0].disabledReason,
"ELEVATION_GEOMETRY_ARTIFACT_BINDING_INVALID");
acceptance.push("support_source_or_geometry_drift_invalidates_elevation_legalspace");

const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_RELATIONSHIP_SCOPE_ID
));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "derived_value:elevationEffectiveSizeRulesV1.terrainSupportGraph"
    && entry.to === "derived_value:elevationEffectiveSizeRulesV1.terrainEffectiveSize"
));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash"),
));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
acceptance.push("relationship_graph_blocks_missing_support_to_effective_size_dependency");

const keys = generateKeyPairSync("ed25519");
const authority = engineFor(runtime, keys, "slice-85-elevation-short-seal-v1");
const authoritySeed = envelopeFor(authority, fixture, terrainBundle, highState);
const authorityOpened = openOfficialElevationEffectiveSizeRulesPendingV1(
  authoritySeed.state, losProcedure(authoritySeed.state),
);
const initial = authority.createEnvelope({ roomId: authoritySeed.roomId,
  matchBinding: authoritySeed.matchBinding, state: authorityOpened.state });
registerReplay(authority, initial, fixture, runtime, terrainBundle);
const access = credentials(authority, initial);
const authoritySpace = authority.legalSpace(initial, { seatAuthority: access.authority });
const authorityDomain = authoritySpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_PARAMETER_KIND
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
  controlLease: access.lease, idempotencyKey: "slice-85-elevation" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
assert.equal(authoritativeApplied.envelope.state
  .lastElevationEffectiveSizeRulesResolution.result.visible, false);
const replay = engineFor(runtime, keys, "slice-85-elevation-rotated-seal-v2");
registerReplay(replay, initial, fixture, runtime, terrainBundle);
assert.equal(replay.replay({ initialEnvelope: initial,
  journal: [authoritativeApplied.receipt] }).ok, true);
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_elevation_event" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
assert.equal(initial.matchBinding.rulesDisplayBinding.artifactHash,
  hashStarcraftTmgContract(DISPLAY));
acceptance.push("authority_ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.elevationEffectiveSizeRulesProgress.sourceRefreshPerformed, false);
acceptance.push("no_source_refresh_skill_dsh_muzero_selfplay_or_training_promotion_occurs");
assert.equal(acceptance.length, 30);

const report = {
  schema: "starcraft_tmg_official_elevation_effective_size_rules_rule_slice_verification_v1",
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
  denominatorCorrection: { plannedPromotionCount: 15, actualNewPromotionCount: 10,
    reusedFlyingCoverAtomCount: 5,
    reusedFlyingCoverAtomIds: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_REUSED_FLYING_ATOM_IDS,
    remainingRoadmapAssignmentDebt: 5 },
  ctx2skill: slice.ctx2skill, harness: slice.harness,
  rulesEligible: false, productionRoomEligible: false,
  rulesTruth: "official_elevation_effective_size_and_high_ground_conformance",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-elevation-effective-size-rules-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ schema: report.schema,
  acceptancePassed: report.acceptancePassed, acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash, catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash, graphHash: graph.graphHash,
  graphCounts: { nodes: graph.nodes.length, edges: graph.edges.length },
  counts: audit.counts, sourceLockHash: fixture.sourceLockAudit.lockHash,
  denominatorCorrection: report.denominatorCorrection,
  sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  trainingTruth: false }, null, 2));
