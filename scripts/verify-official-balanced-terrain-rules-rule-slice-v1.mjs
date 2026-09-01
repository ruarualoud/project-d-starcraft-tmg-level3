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
  OFFICIAL_BALANCED_TERRAIN_RULES_NEW_ATOM_IDS,
  OFFICIAL_BALANCED_TERRAIN_RULES_PARAMETER_KIND,
} from "../packages/rule-atoms/official-balanced-terrain-rules-executor-v1.mjs";
import {
  certifyOfficialBalancedTerrainSetupV1,
  deriveOfficialTerrainGuidelineEnvelopeV1,
  OFFICIAL_BALANCED_TERRAIN_SETUP_PLAN_SCHEMA,
  projectOfficialBalancedTerrainToViewportV1,
  verifyOfficialBalancedTerrainArtifactsV1,
} from "../packages/rule-atoms/official-balanced-terrain-rules-kernel-v1.mjs";
import { OFFICIAL_BALANCED_TERRAIN_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-balanced-terrain-rules-relationship-contract-v1.mjs";
import {
  createOfficialBalancedTerrainRulesRuleSliceV1,
  verifyOfficialBalancedTerrainRulesRuleSliceV1,
} from "../packages/rule-atoms/official-balanced-terrain-rules-rule-slice-v1.mjs";
import {
  createOfficialBattlefieldViewportProjectionV1,
  createOfficialDeploymentGeometryBindingV1,
  projectOfficialWorldCircleToViewportV1,
} from "../packages/rule-atoms/official-deployment-geometry-rules-kernel-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  applyOfficialMissionDeploymentDraftChoiceV1,
  createOfficialMissionDeploymentDraftStateV1,
  enumerateOfficialMissionDeploymentDraftChoicesV1,
} from "../packages/rule-atoms/official-mission-deployment-draft-rules-kernel-v1.mjs";
import { createOfficialRemainingRuleAtomRouteV2 } from
  "../packages/rule-atoms/official-remaining-rule-atom-route-v2.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import {
  createOfficialBalancedTerrainRulesDataBundleV1,
  verifyOfficialBalancedTerrainRulesDataBundleV1,
} from "../packages/source-data/official-balanced-terrain-rules-data-bundle-v1.mjs";
import { createOfficialDeploymentGeometryDataBundleV1 } from
  "../packages/source-data/official-deployment-geometry-data-bundle-v1.mjs";
import { createOfficialMissionDeploymentDraftDataBundleV1 } from
  "../packages/source-data/official-mission-deployment-draft-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-deployment-geometry-rules-rule-slice-v1-report.json"), "utf8"));
const routeBaseReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-elevation-effective-size-rules-rule-slice-v1-report.json"), "utf8"));
const acceptance = [];
function accept(description) {
  acceptance.push(`${String(acceptance.length + 1).padStart(2, "0")}_${description}`);
}
function rejects(code, operation) {
  assert.throws(operation, (error) => String(error?.message || error).startsWith(code));
}
function near(left, right, epsilon = 1e-8) {
  assert(Math.abs(left - right) <= epsilon, `${left} != ${right}`);
}
function exactChoice(bundle, state, playerId, kind, predicate = () => true,
  chanceReveals) {
  const choices = enumerateOfficialMissionDeploymentDraftChoicesV1({
    missionDeploymentDraftDataBundle: bundle, draftState: state, playerId,
  });
  const selected = choices.find((entry) => entry.choiceKind === kind && predicate(entry));
  assert(selected, `missing ${kind}`);
  return applyOfficialMissionDeploymentDraftChoiceV1({
    missionDeploymentDraftDataBundle: bundle, draftState: state,
    playerId, choiceId: selected.choiceId, chanceReveals,
  }).draftState;
}
function completeDraft(bundle, engagementScale, deploymentRecordKey) {
  const missionKeys = bundle.missionProfiles.filter((entry) => (
    entry.engagementScale === engagementScale)).slice(0, 2).map((entry) => entry.recordKey);
  const deploymentKeys = bundle.deploymentProfiles.filter((entry) => (
    entry.engagementScale === engagementScale)).slice(0, 2).map((entry) => entry.recordKey);
  if (!deploymentKeys.includes(deploymentRecordKey)) deploymentKeys[0] = deploymentRecordKey;
  let state = createOfficialMissionDeploymentDraftStateV1({
    missionDeploymentDraftDataBundle: bundle,
    participantIds: ["player1", "player2"], engagementScale,
  });
  const submit = (entry) => entry.value.missionRecordKeys.join("|")
      === missionKeys.slice().sort().join("|")
    && entry.value.deploymentRecordKeys.join("|")
      === deploymentKeys.slice().sort().join("|");
  state = exactChoice(bundle, state, "player1", "submit_draft_set", submit);
  state = exactChoice(bundle, state, "player2", "submit_draft_set", submit);
  state = exactChoice(bundle, state, "player1", "resolve_opening_roll_off", () => true,
    [6, 5, 1, 1].map((outcome, counter) => ({ counter, faces: 6, outcome })));
  state = exactChoice(bundle, state, "player1", "choose_player_colour",
    (entry) => entry.value.colour === "red");
  state = exactChoice(bundle, state, "player1", "choose_draft_control",
    (entry) => entry.value.controlledDraft === "deployment");
  state = exactChoice(bundle, state, "player1", "eliminate_mission_cards");
  state = exactChoice(bundle, state, "player2", "select_mission_card");
  state = exactChoice(bundle, state, "player2", "eliminate_deployment_cards",
    (entry) => state.deploymentDraft.remainingOccurrenceIds
      .filter((id) => !entry.value.occurrenceIds.includes(id))
      .some((id) => state.faceUpRows.deployment.find((row) => (
        row.occurrenceId === id))?.recordKey === deploymentRecordKey));
  state = exactChoice(bundle, state, "player1", "select_deployment_card",
    (entry) => state.faceUpRows.deployment.find((row) => (
      row.occurrenceId === entry.value.occurrenceId))?.recordKey === deploymentRecordKey);
  return state;
}
function terrain(terrainPieceId, size, terrainKind, xMin, xMax, yMin, yMax,
  options = {}) {
  const footprint = { xMin, xMax, yMin, yMax };
  return { terrainPieceId, size, terrainKind,
    originalFootprint: structuredClone(options.originalFootprint || footprint),
    footprint, heightTier: options.heightTier || "ground_level",
    standableHorizontalSurface: options.standableHorizontalSurface === true,
    openings: structuredClone(options.openings || []),
    adjacentElevationPairs: structuredClone(options.adjacentElevationPairs || []),
    accessPoints: structuredClone(options.accessPoints || []) };
}
function access(accessPointId, xMin, xMax, yMin, yMax, pathValue) {
  return { accessPointId, role: "ladder", footprint: { xMin, xMax, yMin, yMax },
    connects: ["ground", "high"], groundApproachPath: pathValue };
}
function placementHistory(pieces) {
  return pieces.map((entry, index) => ({ ordinal: index + 1,
    terrainPieceId: entry.terrainPieceId,
    placedByPlayerId: index % 2 === 0 ? "player1" : "player2" }));
}
function standardPlan() {
  const pieces = [
    terrain("grass-sw", 2, "grass", 3, 5, 3, 5),
    terrain("grass-se", 2, "grass", 49, 51, 3, 5),
    terrain("grass-nw", 2, "grass", 3, 5, 31, 33),
    terrain("grass-ne", 2, "grass", 49, 51, 31, 33),
    terrain("ordinary-se", 2, "ordinary", 34, 36, 9, 11),
    terrain("ordinary-ne", 2, "ordinary", 34, 36, 25, 27),
    terrain("large-sw", 3, "ordinary", 20, 22, 15, 17, {
      heightTier: "high_ground", standableHorizontalSurface: true,
      adjacentElevationPairs: [["ground", "high"]],
      accessPoints: [access("access-large-sw", 20, 20.5, 15, 15.5,
        [{ x: 17, y: 16 }, { x: 20.25, y: 15.25 }])],
    }),
    terrain("large-nw", 3, "ordinary", 20, 22, 25, 27, {
      heightTier: "high_ground", standableHorizontalSurface: true,
      adjacentElevationPairs: [["ground", "high"]],
      accessPoints: [access("access-large-nw", 20, 20.5, 25, 25.5,
        [{ x: 17, y: 26 }, { x: 20.25, y: 25.25 }])],
    }),
    terrain("size-one-south", 1, "ordinary", 25, 26, 4, 5),
    terrain("size-one-north", 1, "ordinary", 28, 29, 31, 32),
  ];
  return { schema: OFFICIAL_BALANCED_TERRAIN_SETUP_PLAN_SCHEMA,
    placementMethod: "alternating", premadeMapId: null,
    physicalLayoutConfirmedByPlayerIds: ["player1", "player2"],
    placementHistory: placementHistory(pieces), terrainPieces: pieces,
    size3PlusAvailable: true,
    quadrantManoeuvreLanes: [
      { quadrant: "south_west", laneId: "manoeuvre-sw",
        start: { x: 7, y: 8 }, end: { x: 17, y: 8 }, widthInches: 100 / 25.4 },
      { quadrant: "south_east", laneId: "manoeuvre-se",
        start: { x: 38, y: 16 }, end: { x: 50, y: 16 }, widthInches: 100 / 25.4 },
      { quadrant: "north_west", laneId: "manoeuvre-nw",
        start: { x: 5, y: 21 }, end: { x: 17, y: 21 }, widthInches: 100 / 25.4 },
      { quadrant: "north_east", laneId: "manoeuvre-ne",
        start: { x: 39, y: 20 }, end: { x: 51, y: 20 }, widthInches: 100 / 25.4 },
    ],
    fireLanes: [
      { laneId: "fire-west", start: { x: 10, y: 0 }, end: { x: 10, y: 36 },
        widthInches: 6 },
      { laneId: "fire-east", start: { x: 44, y: 0 }, end: { x: 44, y: 36 },
        widthInches: 6 },
    ], trainingTruth: false };
}
function skirmishPlan() {
  const pieces = [
    terrain("sk-grass-sw", 2, "grass", 3, 5, 3, 5),
    terrain("sk-grass-se", 2, "grass", 31, 33, 3, 5),
    terrain("sk-grass-nw", 2, "grass", 3, 5, 31, 33),
    terrain("sk-ordinary-ne", 2, "ordinary", 31, 33, 31, 33),
    terrain("sk-centre-large", 3, "ordinary", 17, 19, 17, 19, {
      heightTier: "high_ground", standableHorizontalSurface: true,
      adjacentElevationPairs: [["ground", "high"]],
      accessPoints: [access("access-sk-centre", 17, 17.5, 17, 17.5,
        [{ x: 14, y: 18 }, { x: 17.25, y: 17.25 }])],
    }),
    terrain("sk-size-one-south", 1, "ordinary", 16, 17, 3, 4),
    terrain("sk-size-one-north", 1, "ordinary", 19, 20, 32, 33),
  ];
  return { schema: OFFICIAL_BALANCED_TERRAIN_SETUP_PLAN_SCHEMA,
    placementMethod: "alternating", premadeMapId: null,
    physicalLayoutConfirmedByPlayerIds: ["player1", "player2"],
    placementHistory: placementHistory(pieces), terrainPieces: pieces,
    size3PlusAvailable: true,
    quadrantManoeuvreLanes: [
      { quadrant: "south_west", laneId: "sk-manoeuvre-sw",
        start: { x: 8, y: 10 }, end: { x: 14, y: 10 }, widthInches: 100 / 25.4 },
      { quadrant: "south_east", laneId: "sk-manoeuvre-se",
        start: { x: 22, y: 10 }, end: { x: 28, y: 10 }, widthInches: 100 / 25.4 },
      { quadrant: "north_west", laneId: "sk-manoeuvre-nw",
        start: { x: 8, y: 26 }, end: { x: 14, y: 26 }, widthInches: 100 / 25.4 },
      { quadrant: "north_east", laneId: "sk-manoeuvre-ne",
        start: { x: 22, y: 26 }, end: { x: 28, y: 26 }, widthInches: 100 / 25.4 },
    ],
    fireLanes: [
      { laneId: "sk-fire-west", start: { x: 9, y: 0 }, end: { x: 9, y: 36 },
        widthInches: 6 },
      { laneId: "sk-fire-east", start: { x: 27, y: 0 }, end: { x: 27, y: 36 },
        widthInches: 6 },
    ], trainingTruth: false };
}
function certify(binding, geometryBundle, terrainBundle, setupPlan) {
  return certifyOfficialBalancedTerrainSetupV1({ deploymentGeometryBinding: binding,
    deploymentGeometryDataBundle: geometryBundle,
    balancedTerrainRulesDataBundle: terrainBundle, setupPlan });
}
function matchBinding(fixture) {
  const dataHash = hashStarcraftTmgContract(fixture.gameplayDataBundle);
  return { dataSnapshotHash: dataHash,
    dependencies: { dataSnapshot: { contentHash: dataHash } } };
}
function engineFor(runtime, keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-09-01T15:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-108-balanced-terrain",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 108 balanced terrain rules.";
function envelopeFor(engine, fixture, terrainBundle, state) {
  return engine.createEnvelope({ roomId: "official-slice-108-balanced-terrain-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-balanced-terrain-rules-data-bundle-v1",
        content: terrainBundle },
      rulesDisplay: { artifactId: "official-slice-108-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "official-slice-108-action-schema-v46",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v46" } },
    }, state });
}
function credentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({ grantId: "slice-108-player1",
    roomId: envelope.roomId, matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1", roleMode: "player", principalType: "human",
    capabilities: ["read_room", "read_legal_space", "preview", "confirm", "apply"] });
  return { authority, lease: engine.issueControlLease({ seatAuthority: authority,
    sessionId: "slice-108-terrain-session", leaseFence: 1,
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
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v46" } };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}

const slice = createOfficialBalancedTerrainRulesRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialBalancedTerrainRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 883,
  newlyExecutableRuleAtoms: 17, reviewRequiredRuleAtoms: 29,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 883,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 77, missingStateContractExecutors: 0 });
accept("slice108_promotes_17_atoms_to_883_executable");
const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 108);
assert.deepEqual(assignment.atomIds, [...OFFICIAL_BALANCED_TERRAIN_RULES_NEW_ATOM_IDS]);
assert.deepEqual([assignment.executableAfter, assignment.reviewRequiredAfter], [883, 29]);
accept("route_v2_slice108_atom_identity_and_counts_match");
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executorManifest.length, 77);
assert(runtime.descriptor.executorManifest.some((entry) => (
  entry.executorId === "authority.balanced-terrain-rules-v1")));
accept("runtime_exposes_balanced_terrain_as_executor_77");
assert.deepEqual({ slice: slice.sliceHash, catalogue: slice.catalogueHash,
  runtime: runtime.descriptor.runtimeHash, graph: audit.graph.graphHash }, {
  slice: "55fbcd3ddd3cc139a41fdbfb0888a99238250fbcb3de14c6d4b69cddcc5aa5bd",
  catalogue: "b59551acb4f23c65520bab35b250a9bbde0ab1ff781df87ec4af92a8da0458db",
  runtime: "06b7599333f098daa7741e8607ec57ceb562d1af5194661b2d18b42d5b62d1ce",
  graph: "0c3bb9eeda90208924cf79657cd3a2f682c422e36c5de0fc8b4adc20912eaa16",
});
accept("slice_catalogue_runtime_and_graph_hashes_are_frozen");

const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const draftBundle = createOfficialMissionDeploymentDraftDataBundleV1({
  dataset: fixture.dataset,
});
const geometryBundle = createOfficialDeploymentGeometryDataBundleV1({
  dataset: fixture.dataset, missionDeploymentDraftDataBundle: draftBundle,
});
const terrainBundle = createOfficialBalancedTerrainRulesDataBundleV1({
  dataset: fixture.dataset, deploymentGeometryDataBundle: geometryBundle,
});
assert.equal(verifyOfficialBalancedTerrainRulesDataBundleV1(terrainBundle), true);
accept("balanced_terrain_bundle_is_content_hash_verified");
assert.deepEqual(terrainBundle.counts, { promotedAtoms: 17, premadeMaps: 9,
  standardPremadeMaps: 6, skirmishPremadeMaps: 3 });
accept("official_premade_denominator_is_six_standard_plus_three_skirmish");
assert.equal(terrainBundle.ruleClauses.length, 17);
assert.deepEqual(terrainBundle.ruleClauses.map((entry) => entry.atomId).sort(),
  [...OFFICIAL_BALANCED_TERRAIN_RULES_NEW_ATOM_IDS]);
accept("seventeen_exact_source_clauses_bind_seventeen_route_atoms");
assert.equal(terrainBundle.categorySemantics.grassCountsTowardSize2, true);
assert.equal(terrainBundle.categorySemantics.categoryRangesAreIndependentConstraintsNotAdditiveBuckets,
  true);
accept("grass_is_a_size_two_and_total_subset_not_an_additive_bucket");
assert.equal(terrainBundle.distributionContract.manoeuvreWitnessCurrentBaseDepthMillimetres,
  100);
near(terrainBundle.distributionContract.manoeuvreWitnessMinimumWidthInches,
  100 / 25.4);
accept("current_maximum_official_base_depth_sets_100mm_manoeuvre_witness");
assert.equal(terrainBundle.sourcePolicy.refreshDuringDevelopment, false);
assert.equal(terrainBundle.sourcePolicy.repositoryFallbackAllowed, false);
accept("frozen_official_source_lock_performs_no_refresh_or_repo_fallback");

const profileByName = new Map(geometryBundle.geometryProfiles.map((entry) => (
  [entry.name, entry])));
const standardDraft = completeDraft(draftBundle, "Standard",
  profileByName.get("GAUNTLET").recordKey);
const standardBinding = createOfficialDeploymentGeometryBindingV1({
  deploymentGeometryDataBundle: geometryBundle,
  missionDeploymentDraftDataBundle: draftBundle,
  missionDeploymentDraftState: standardDraft,
});
const skirmishDraft = completeDraft(draftBundle, "Skirmish",
  profileByName.get("ABANDONED CAMP").recordKey);
const skirmishBinding = createOfficialDeploymentGeometryBindingV1({
  deploymentGeometryDataBundle: geometryBundle,
  missionDeploymentDraftDataBundle: draftBundle,
  missionDeploymentDraftState: skirmishDraft,
});
assert.deepEqual(standardBinding.battlefield, { widthInches: 54, heightInches: 36,
  metricDisplayReference: { widthCentimetres: 137, heightCentimetres: 92 } });
assert.deepEqual(skirmishBinding.battlefield, { widthInches: 36, heightInches: 36,
  metricDisplayReference: { widthCentimetres: 92, heightCentimetres: 92 } });
accept("standard_and_skirmish_bind_exact_official_world_dimensions");

const standardEnvelope = deriveOfficialTerrainGuidelineEnvelopeV1({
  deploymentGeometryBinding: standardBinding,
  deploymentGeometryDataBundle: geometryBundle,
  balancedTerrainRulesDataBundle: terrainBundle,
});
assert.deepEqual(Object.fromEntries(Object.entries(standardEnvelope.ranges).map(
  ([key, value]) => [key, [value.integerMinimum, value.integerMaximum]])), {
  total: [8, 12], size0: [0, 2], size1: [2, 4], size2: [6, 8],
  size3PlusWhenAvailable: [1, 2], grass: [4, 6],
});
accept("standard_54_by_36_count_envelope_matches_printed_guidance");
const skirmishEnvelope = deriveOfficialTerrainGuidelineEnvelopeV1({
  deploymentGeometryBinding: skirmishBinding,
  deploymentGeometryDataBundle: geometryBundle,
  balancedTerrainRulesDataBundle: terrainBundle,
});
assert.deepEqual(Object.fromEntries(Object.entries(skirmishEnvelope.ranges).map(
  ([key, value]) => [key, [value.integerMinimum, value.integerMaximum]])), {
  total: [6, 8], size0: [0, 1], size1: [2, 2], size2: [4, 5],
  size3PlusWhenAvailable: [1, 1], grass: [3, 4],
});
accept("skirmish_36_by_36_uses_exact_area_proportional_integer_envelope");

const standardArtifacts = certify(standardBinding, geometryBundle, terrainBundle,
  standardPlan());
assert.equal(verifyOfficialBalancedTerrainArtifactsV1({ ...standardArtifacts,
  deploymentGeometryBinding: standardBinding,
  balancedTerrainRulesDataBundle: terrainBundle }), true);
accept("standard_alternating_layout_certifies_complete_runtime_artifacts");
assert.deepEqual(standardArtifacts.certificate.counts.actual,
  { total: 10, size0: 0, size1: 2, size2: 6, size3PlusWhenAvailable: 2,
    grass: 4 });
accept("standard_counts_accept_four_grass_inside_six_size_two_pieces");
assert(standardArtifacts.certificate.quadrants.audits.every((entry) => (
  entry.significantTerrainPieceIds.length >= 2)));
accept("each_standard_quarter_contains_at_least_two_significant_footprints");
assert.equal(standardArtifacts.certificate.centre.significantTerrainPieceIds.includes(
  "large-sw"), true);
accept("standard_layout_has_significant_terrain_within_six_inches_of_centre");
assert.equal(standardArtifacts.certificate.fireLanes.clearOpposingEntryLaneCount, 2);
assert(standardArtifacts.certificate.fireLanes.audits.every((entry) => (
  entry.minimumWidthInches === undefined || entry.widthMilliInches >= 6000)));
accept("two_distinct_six_inch_opposing_entry_fire_lanes_are_clear");
assert.equal(standardArtifacts.certificate.accessPoints.largeStandableTerrainPieceCount, 2);
assert.equal(standardArtifacts.certificate.accessPoints.everyLargeStandablePieceHasReachableGroundAccess,
  true);
accept("both_large_standable_structures_have_ground_reachable_access");
assert.equal(standardArtifacts.certificate.quadrants.currentBaseClearanceWitnessComplete,
  true);
assert.equal(standardArtifacts.certificate.quadrants.globalArbitraryFormationPathClosureClaimed,
  false);
accept("100mm_current_base_clearance_is_proved_without_global_formation_claim");
assert.equal(standardArtifacts.terrainPieces.length, 10);
assert.equal(standardArtifacts.specialTerrainAgreement.terrainDenominatorComplete, true);
accept("slice84_and_slice86_runtime_terrain_artifacts_cover_full_denominator");
assert.equal(standardArtifacts.terrainHeightTierLedger.everyTerrainPieceAssigned, true);
assert.equal(standardArtifacts.terrainHeightTierLedger.terrainPieces.length, 10);
accept("slice107_height_ledger_assigns_every_terrain_piece_at_game_start");
assert.equal(standardArtifacts.missionMarkerPlacement.missionMarkers.length, 5);
assert(standardArtifacts.missionMarkerPlacement.missionMarkers.every((entry) => (
  entry.placementStatus === "placed" && entry.impassableOverlap === false)));
accept("mission_markers_finalize_only_after_terrain_without_impassable_overlap");

const skirmishArtifacts = certify(skirmishBinding, geometryBundle, terrainBundle,
  skirmishPlan());
assert.equal(skirmishArtifacts.certificate.counts.actual.total, 7);
assert.equal(skirmishArtifacts.certificate.balancedTerrainCertified, true);
accept("skirmish_scaled_seven_piece_layout_certifies");
assert(skirmishArtifacts.certificate.quadrants.audits.every((entry) => (
  entry.significantTerrainPieceIds.includes("sk-centre-large"))));
accept("centre_spanning_footprint_counts_in_each_quarter_it_physically_intersects");
assert.equal(skirmishArtifacts.missionMarkerPlacement.missionMarkers.find((entry) => (
  entry.number === 5))?.elevation, "high_ground");
accept("marker_on_standable_centre_terrain_inherits_high_ground_elevation");

const premade = standardPlan();
premade.placementMethod = "official_premade";
premade.premadeMapId = "standard-d6-1";
premade.placementHistory = [];
const premadeArtifacts = certify(standardBinding, geometryBundle, terrainBundle, premade);
assert.equal(premadeArtifacts.certificate.placementMethod.premadeMapId, "standard-d6-1");
assert.equal(premadeArtifacts.certificate.placementMethod.premadeSourceImageCoordinatesMachineTranscribed,
  false);
accept("premade_map_identity_requires_confirmed_physical_layout_not_invented_coordinates");

const relocationPlan = standardPlan();
relocationPlan.terrainPieces.push(terrain("marker-four-impassable", 2, "impassable",
  15.37, 17.37, 11, 13, { originalFootprint: { xMin: 17, xMax: 19,
    yMin: 11, yMax: 13 } }));
relocationPlan.placementHistory = placementHistory(relocationPlan.terrainPieces);
const relocated = certify(standardBinding, geometryBundle, terrainBundle, relocationPlan);
const relocation = relocated.certificate.relocations.find((entry) => (
  entry.terrainPieceId === "marker-four-impassable"));
assert.equal(relocation.relocated, true);
assert.equal(relocation.markerNumber, 4);
accept("impassable_marker_overlap_moves_to_a_nearest_legal_candidate");
const wrongRelocation = structuredClone(relocationPlan);
wrongRelocation.terrainPieces.find((entry) => (
  entry.terrainPieceId === "marker-four-impassable")).footprint.xMin = 15;
rejects("BALANCED_TERRAIN_RELOCATION_NOT_NEAREST", () => (
  certify(standardBinding, geometryBundle, terrainBundle, wrongRelocation)));
accept("non_nearest_impassable_marker_relocation_fails_closed");
const movedOrdinary = standardPlan();
movedOrdinary.terrainPieces[0].originalFootprint = { xMin: 2, xMax: 4, yMin: 3, yMax: 5 };
rejects("BALANCED_TERRAIN_NON_IMPASSABLE_RELOCATION_FORBIDDEN", () => (
  certify(standardBinding, geometryBundle, terrainBundle, movedOrdinary)));
accept("non_impassable_terrain_cannot_be_silently_relocated");
const badCount = standardPlan();
badCount.terrainPieces = badCount.terrainPieces.filter((entry) => (
  entry.terrainPieceId !== "grass-ne"));
badCount.placementHistory = placementHistory(badCount.terrainPieces);
rejects("BALANCED_TERRAIN_COUNT_GUIDELINE_FAILED", () => (
  certify(standardBinding, geometryBundle, terrainBundle, badCount)));
accept("missing_grass_piece_fails_independent_count_guideline");
const overlap = standardPlan();
overlap.terrainPieces.find((entry) => entry.terrainPieceId === "ordinary-se").footprint =
  { xMin: 3.5, xMax: 5.5, yMin: 3.5, yMax: 5.5 };
overlap.terrainPieces.find((entry) => entry.terrainPieceId === "ordinary-se").originalFootprint =
  { xMin: 3.5, xMax: 5.5, yMin: 3.5, yMax: 5.5 };
rejects("BALANCED_TERRAIN_PIECES_OVERLAP", () => (
  certify(standardBinding, geometryBundle, terrainBundle, overlap)));
accept("overlapping_terrain_footprints_fail_closed");
const closeMajor = standardPlan();
closeMajor.terrainPieces.find((entry) => entry.terrainPieceId === "ordinary-se").footprint =
  { xMin: 23, xMax: 25, yMin: 15, yMax: 17 };
closeMajor.terrainPieces.find((entry) => entry.terrainPieceId === "ordinary-se").originalFootprint =
  { xMin: 23, xMax: 25, yMin: 15, yMax: 17 };
rejects("BALANCED_TERRAIN_MAJOR_SEPARATION_FAILED", () => (
  certify(standardBinding, geometryBundle, terrainBundle, closeMajor)));
accept("major_structures_closer_than_three_inches_fail_closed");
const blockedFire = standardPlan();
blockedFire.fireLanes[0].start.x = 4;
blockedFire.fireLanes[0].end.x = 4;
rejects("BALANCED_TERRAIN_FIRE_LANE_BLOCKED", () => (
  certify(standardBinding, geometryBundle, terrainBundle, blockedFire)));
accept("fire_lane_crossing_size_two_terrain_fails_closed");
const narrowManoeuvre = standardPlan();
narrowManoeuvre.quadrantManoeuvreLanes[0].widthInches = 3;
rejects("BALANCED_TERRAIN_QUADRANT_MANOEUVRE_LANE_BLOCKED", () => (
  certify(standardBinding, geometryBundle, terrainBundle, narrowManoeuvre)));
accept("manoeuvre_lane_narrower_than_current_100mm_base_fails_closed");
const noAccess = standardPlan();
noAccess.terrainPieces.find((entry) => entry.terrainPieceId === "large-sw").accessPoints = [];
rejects("BALANCED_TERRAIN_LARGE_ACCESS_POINT_REQUIRED", () => (
  certify(standardBinding, geometryBundle, terrainBundle, noAccess)));
accept("large_standable_terrain_without_access_point_fails_closed");
const incompleteConfirm = standardPlan();
incompleteConfirm.physicalLayoutConfirmedByPlayerIds = ["player1"];
rejects("BALANCED_TERRAIN_PLAYER_CONFIRMATIONS_INCOMPLETE", () => (
  certify(standardBinding, geometryBundle, terrainBundle, incompleteConfirm)));
accept("all_players_must_confirm_the_complete_physical_layout");
const wrongAlternation = standardPlan();
wrongAlternation.placementHistory[0].placedByPlayerId = "player2";
rejects("BALANCED_TERRAIN_ALTERNATING_HISTORY_INVALID", () => (
  certify(standardBinding, geometryBundle, terrainBundle, wrongAlternation)));
accept("alternating_placement_is_red_first_one_piece_at_a_time");

const viewports = [
  { cssWidth: 360, cssHeight: 360, devicePixelRatio: 1, zoom: 1 },
  { cssWidth: 1080, cssHeight: 720, devicePixelRatio: 2, zoom: 1 },
  { cssWidth: 390, cssHeight: 844, devicePixelRatio: 3, zoom: 1.75,
    panCssX: 23, panCssY: -11 },
];
for (const viewport of viewports) {
  const projection = createOfficialBattlefieldViewportProjectionV1({
    deploymentGeometryBinding: standardBinding, ...viewport,
  });
  const terrainProjection = projectOfficialBalancedTerrainToViewportV1({
    deploymentGeometryBinding: standardBinding,
    balancedTerrainRulesDataBundle: terrainBundle,
    certificate: standardArtifacts.certificate, viewportProjection: projection,
  });
  assert.equal(terrainProjection.xCssPixelsPerInch,
    terrainProjection.yCssPixelsPerInch);
  assert.equal(terrainProjection.devicePixelRatioAffectsRulesGeometry, false);
  assert.equal(terrainProjection.panAndZoomAffectRulesGeometry, false);
  assert(terrainProjection.terrainPieces.every((entry) => (
    entry.rulesFootprintMilliInches.shape === "axis_aligned_rectangle")));
}
accept("desktop_tablet_and_phone_use_one_uniform_world_to_css_scale");
const normalProjection = createOfficialBattlefieldViewportProjectionV1({
  deploymentGeometryBinding: standardBinding,
  cssWidth: 1080, cssHeight: 720, devicePixelRatio: 1, zoom: 1,
});
const retinaProjection = createOfficialBattlefieldViewportProjectionV1({
  deploymentGeometryBinding: standardBinding,
  cssWidth: 1080, cssHeight: 720, devicePixelRatio: 3, zoom: 1,
});
assert.equal(normalProjection.cssPixelsPerInch, retinaProjection.cssPixelsPerInch);
assert.equal(retinaProjection.viewport.backingWidth,
  normalProjection.viewport.backingWidth * 3);
accept("device_pixel_ratio_changes_backing_store_not_rules_or_css_scale");
const projectedTerrain = projectOfficialBalancedTerrainToViewportV1({
  deploymentGeometryBinding: standardBinding,
  balancedTerrainRulesDataBundle: terrainBundle,
  certificate: standardArtifacts.certificate, viewportProjection: normalProjection,
});
const largeProjection = projectedTerrain.terrainPieces.find((entry) => (
  entry.terrainPieceId === "large-sw"));
near(largeProjection.widthCss, 2 * normalProjection.cssPixelsPerInch);
near(largeProjection.heightCss, 2 * normalProjection.cssPixelsPerInch);
accept("two_inch_terrain_footprint_projects_as_two_world_inches_on_both_axes");
const hundredMmModel = projectOfficialWorldCircleToViewportV1({
  deploymentGeometryBinding: standardBinding, viewportProjection: normalProjection,
  x: 17, y: 8, diameterMm: 100, minimumTouchTargetCss: 44,
});
near(hundredMmModel.diameterInches, 100 / 25.4);
near(hundredMmModel.diameterCss,
  (100 / 25.4) * normalProjection.cssPixelsPerInch);
accept("100mm_model_base_and_map_share_exact_25_4_mm_per_inch_projection");
assert(hundredMmModel.touchTargetDiameterCss >= hundredMmModel.diameterCss);
assert.equal(hundredMmModel.touchTargetAffectsRulesCollision, false);
accept("frontend_touch_target_expansion_never_changes_model_collision_size");
const zoomProjection = createOfficialBattlefieldViewportProjectionV1({
  deploymentGeometryBinding: standardBinding,
  cssWidth: 1080, cssHeight: 720, devicePixelRatio: 2,
  zoom: 2, panCssX: 17, panCssY: -9,
});
const zoomTerrain = projectOfficialBalancedTerrainToViewportV1({
  deploymentGeometryBinding: standardBinding,
  balancedTerrainRulesDataBundle: terrainBundle,
  certificate: standardArtifacts.certificate, viewportProjection: zoomProjection,
});
assert.deepEqual(zoomTerrain.terrainPieces.map((entry) => entry.rulesFootprintMilliInches),
  projectedTerrain.terrainPieces.map((entry) => entry.rulesFootprintMilliInches));
near(zoomTerrain.terrainPieces[0].widthCss, projectedTerrain.terrainPieces[0].widthCss * 2);
accept("zoom_and_pan_change_only_projection_while_world_terrain_stays_identical");

function runtimeState() {
  const state = fixture.battleState({ activeSideKey: "player1" });
  state.phase = "pre_game"; state.rulesProcedureMode = true; state.pendingAction = null;
  state.officialMissionDeploymentDraftDataBundle = draftBundle;
  state.officialDeploymentGeometryDataBundle = geometryBundle;
  state.officialBalancedTerrainRulesDataBundle = terrainBundle;
  state.officialMissionDeploymentDraft = standardDraft;
  state.officialMissionDeploymentDraftBinding = standardDraft.draftBinding;
  const geometryLegal = runtime.enumerate(state, { sideKey: "player1",
    matchBinding: matchBinding(fixture) });
  return runtime.apply(state, geometryLegal.candidates[0], {
    matchBinding: matchBinding(fixture) }).state;
}
const state = runtimeState();
const legal = runtime.enumerate(state, { sideKey: "player1", includeDisabled: true,
  matchBinding: matchBinding(fixture) });
const domain = legal.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_BALANCED_TERRAIN_RULES_PARAMETER_KIND));
assert(domain);
assert.equal(legal.candidates[0].actionType, "materialize_balanced_terrain_setup");
accept("runtime_exposes_complete_terrain_setup_parameter_domain");
const instantiated = runtime.instantiate(state, domain, { setupPlan: standardPlan() }, {
  matchBinding: matchBinding(fixture) });
assert.equal(instantiated.action.balancedTerrainPlan.expectedCertificateHash,
  standardArtifacts.certificate.certificateHash);
accept("runtime_recomputes_certificate_instead_of_accepting_client_balance_truth");
const applied = runtime.apply(state, instantiated.action, {
  matchBinding: matchBinding(fixture) });
assert.equal(applied.state.officialBattlefieldSetup.stage,
  "terrain_and_mission_markers_complete_ticket_11_slice_109_pending");
assert.equal(applied.state.board.terrain.length, 10);
accept("runtime_commits_terrain_markers_and_explicit_slice109_boundary");
assert.equal(runtime.enumerate(applied.state, { sideKey: "player1",
  matchBinding: matchBinding(fixture) }).candidates.some((entry) => (
  entry.actionType === "materialize_balanced_terrain_setup")), false);
accept("balanced_terrain_materialization_is_idempotently_absent_after_commit");
const forged = structuredClone(instantiated.action);
forged.balancedTerrainPlan.expectedCertificateHash = "0".repeat(64);
rejects("BALANCED_TERRAIN_ACTION_STALE", () => runtime.apply(state, forged, {
  matchBinding: matchBinding(fixture) }));
accept("forged_expected_certificate_hash_fails_closed");

const graphAudit = auditRuleRelationshipGraphV1(audit.graph);
assert.equal(graphAudit.valid, true);
assert.equal(graphAudit.declaredScopesValid, true);
accept("slice108_relationship_scope_passes_full_graph_audit");
assert.deepEqual({ sourceClauses: graphAudit.counts.sourceClauses,
  executableAtoms: graphAudit.counts.executableRuleAtoms,
  executors: graphAudit.counts.executors,
  remaining: graphAudit.counts.remainingActionableRuleAtoms,
  gaps: graphAudit.counts.blockingGaps },
{ sourceClauses: 1093, executableAtoms: 883, executors: 77, remaining: 29, gaps: 0 });
accept("graph_counts_are_exact_with_zero_blocking_gaps");
const broken = structuredClone(audit.graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_BALANCED_TERRAIN_RULES_RELATIONSHIP_SCOPE_ID));
const forbidden = scope.forbiddenPaths.find((entry) => (
  entry.from === "derived_value:balancedTerrainV1.sharedViewportProjection"
    && entry.to === "state_field:officialDeploymentGeometryBinding"));
const forgedEdgeBody = { from: forbidden.from, relationship: "derives",
  to: forbidden.to, scopeId: OFFICIAL_BALANCED_TERRAIN_RULES_RELATIONSHIP_SCOPE_ID,
  provenance: "forged:css_truth" };
broken.edges.push({ edgeId:
  `relationship-edge:${hashStarcraftTmgContract(forgedEdgeBody)}`, ...forgedEdgeBody });
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash")));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
accept("viewport_to_rules_geometry_dependency_is_forbidden_by_graph_gate");
assert.deepEqual([slice.historicalCompatibility.previousActionSchemaVersion,
  slice.historicalCompatibility.actionSchemaVersion],
  ["hybrid_legal_space_v45", "hybrid_legal_space_v46"]);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
accept("v46_advances_while_frozen_v45_rules_display_remains_readable");

const keys = generateKeyPairSync("ed25519");
const authority = engineFor(runtime, keys, "slice-108-terrain-short-seal-v1");
const initial = envelopeFor(authority, fixture, terrainBundle, runtimeState());
registerReplay(authority, initial, fixture, runtime, terrainBundle);
const accessGrant = credentials(authority, initial);
const authoritySpace = authority.legalSpace(initial, { seatAuthority: accessGrant.authority });
const authorityDomain = authoritySpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_BALANCED_TERRAIN_RULES_PARAMETER_KIND));
const preview = authority.preview({ envelope: initial, seatAuthority: accessGrant.authority,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: { setupPlan: standardPlan() } } });
assert.equal(preview.ok, true, JSON.stringify(preview));
assert.equal(preview.preview.previewSeal.sealAlgorithm, "hmac-sha256");
const confirmation = authority.confirmPreview({ envelope: initial,
  preview: preview.preview, seatAuthority: accessGrant.authority });
const authoritativeApplied = authority.apply({ envelope: initial,
  expectedStateRevision: initial.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: accessGrant.authority,
  controlLease: accessGrant.lease, idempotencyKey: "slice-108-balanced-terrain" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
const replay = engineFor(runtime, keys, "slice-108-terrain-rotated-seal-v2");
registerReplay(replay, initial, fixture, runtime, terrainBundle);
assert.equal(replay.replay({ initialEnvelope: initial,
  journal: [authoritativeApplied.receipt] }).ok, true);
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_balanced_terrain_event" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
accept("authority_hmac_preview_ed25519_apply_replay_and_tamper_rejection_pass");
assert.equal(authoritativeApplied.envelope.state.officialBalancedTerrainSetupCertificate
  .trainingTruth, false);
accept("authority_receipt_keeps_terrain_certificate_out_of_training_truth");

assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.equal(slice.harness.trainingTraceCandidates.length, 0);
accept("ctx2skill_dsh_selfplay_muzero_and_memory_promotion_remain_zero");
assert.equal(slice.balancedTerrainRulesProgress.sourceRefreshPerformed, false);
assert.equal(slice.balancedTerrainRulesProgress.webAppUniformTerrainProjectionExecutable,
  true);
accept("slice_records_frozen_source_and_web_app_uniform_projection_boundary");
assert.equal(acceptance.length, 57);

const report = { schema:
    "starcraft_tmg_official_balanced_terrain_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit,
  remainingRouteV2Hash: route.routeHash,
  slice, audit, sliceAudit: audit,
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
  graphHash: audit.graph.graphHash, graph: audit.graph, graphAudit,
  coverage: audit.stateContractCoverage,
  balancedTerrainRulesDataBundleHash: terrainBundle.bundleHash,
  premadeMapIndexHash: terrainBundle.premadeMapIndexHash,
  sourceLockHash: terrainBundle.sourceLockHash,
  sourceSnapshotHash: terrainBundle.sourceSnapshotHash,
  normalizedDatasetHash: terrainBundle.normalizedDatasetHash,
  geometryAudit: { standardBattlefield: standardBinding.battlefield,
    skirmishBattlefield: skirmishBinding.battlefield,
    maximumCurrentBaseDepthMillimetres: 100,
    uniformWorldProjection: "pass", devicePixelRatioRulesInvariant: true,
    zoomPanRulesInvariant: true, touchTargetRulesInvariant: true,
    arbitraryFormationPathClosureClaimed: false },
  sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  rulesTruth: "official_balanced_terrain_rules_slice_verified",
  trainingTruth: false };
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-balanced-terrain-rules-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, acceptance: acceptance.length,
  sliceHash: slice.sliceHash, catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash, graphHash: audit.graph.graphHash,
  dataBundleHash: terrainBundle.bundleHash,
  premadeMapIndexHash: terrainBundle.premadeMapIndexHash }, null, 2));
