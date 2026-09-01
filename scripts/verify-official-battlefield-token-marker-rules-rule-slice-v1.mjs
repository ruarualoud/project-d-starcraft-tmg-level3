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
  OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_NEW_ATOM_IDS,
} from "../packages/rule-atoms/official-battlefield-token-marker-rules-executor-v1.mjs";
import {
  createOfficialBattlefieldMarkerV1,
  createOfficialBattlefieldTokenMarkerRegistryV1,
  createOfficialBattlefieldTokenV1,
  deriveOfficialBattlefieldMarkerViewsV1,
  measureOfficialClosestTokenBaseEdgeV1,
  projectOfficialBattlefieldTokenV1,
  projectOfficialIntangibleMarkerV1,
  resolveOfficialTokenMarkerCleanupV1,
  resolveOfficialTokenMovementOverlapV1,
  verifyOfficialBattlefieldTokenMarkerRegistryV1,
} from "../packages/rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs";
import { OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-battlefield-token-marker-rules-relationship-contract-v1.mjs";
import {
  createOfficialBattlefieldTokenMarkerRulesRuleSliceV1,
  verifyOfficialBattlefieldTokenMarkerRulesRuleSliceV1,
} from "../packages/rule-atoms/official-battlefield-token-marker-rules-rule-slice-v1.mjs";
import { OFFICIAL_BALANCED_TERRAIN_SETUP_PLAN_SCHEMA } from
  "../packages/rule-atoms/official-balanced-terrain-rules-kernel-v1.mjs";
import {
  createOfficialBattlefieldViewportProjectionV1,
  createOfficialDeploymentGeometryBindingV1,
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
  createOfficialBattlefieldTokenMarkerRulesDataBundleV1,
  verifyOfficialBattlefieldTokenMarkerRulesDataBundleV1,
} from "../packages/source-data/official-battlefield-token-marker-rules-data-bundle-v1.mjs";
import { createOfficialBalancedTerrainRulesDataBundleV1 } from
  "../packages/source-data/official-balanced-terrain-rules-data-bundle-v1.mjs";
import { createOfficialDeploymentGeometryDataBundleV1 } from
  "../packages/source-data/official-deployment-geometry-data-bundle-v1.mjs";
import { createOfficialMissionDeploymentDraftDataBundleV1 } from
  "../packages/source-data/official-mission-deployment-draft-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-balanced-terrain-rules-rule-slice-v1-report.json"), "utf8"));
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
function completeDraft(bundle, deploymentRecordKey) {
  const missionKeys = bundle.missionProfiles.filter((entry) => (
    entry.engagementScale === "Skirmish")).slice(0, 2).map((entry) => entry.recordKey);
  const deploymentKeys = bundle.deploymentProfiles.filter((entry) => (
    entry.engagementScale === "Skirmish")).slice(0, 2).map((entry) => entry.recordKey);
  if (!deploymentKeys.includes(deploymentRecordKey)) deploymentKeys[0] = deploymentRecordKey;
  let state = createOfficialMissionDeploymentDraftStateV1({
    missionDeploymentDraftDataBundle: bundle,
    participantIds: ["player1", "player2"], engagementScale: "Skirmish",
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
    originalFootprint: structuredClone(footprint), footprint,
    heightTier: options.heightTier || "ground_level",
    standableHorizontalSurface: options.standableHorizontalSurface === true,
    openings: [], adjacentElevationPairs: structuredClone(options.adjacentElevationPairs || []),
    accessPoints: structuredClone(options.accessPoints || []) };
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
      accessPoints: [{ accessPointId: "access-sk-centre", role: "ladder",
        footprint: { xMin: 17, xMax: 17.5, yMin: 17, yMax: 17.5 },
        connects: ["ground", "high"], groundApproachPath: [
          { x: 14, y: 18 }, { x: 17.25, y: 17.25 },
        ] }],
    }),
    terrain("sk-size-one-south", 1, "ordinary", 16, 17, 3, 4),
    terrain("sk-size-one-north", 1, "ordinary", 19, 20, 32, 33),
  ];
  return { schema: OFFICIAL_BALANCED_TERRAIN_SETUP_PLAN_SCHEMA,
    placementMethod: "alternating", premadeMapId: null,
    physicalLayoutConfirmedByPlayerIds: ["player1", "player2"],
    placementHistory: pieces.map((entry, index) => ({ ordinal: index + 1,
      terrainPieceId: entry.terrainPieceId,
      placedByPlayerId: index % 2 === 0 ? "player1" : "player2" })),
    terrainPieces: pieces, size3PlusAvailable: true,
    quadrantManoeuvreLanes: [
      ["south_west", 8, 10, 14, 10], ["south_east", 22, 10, 28, 10],
      ["north_west", 8, 26, 14, 26], ["north_east", 22, 26, 28, 26],
    ].map(([quadrant, x1, y1, x2, y2]) => ({ quadrant,
      laneId: `sk-manoeuvre-${quadrant}`, start: { x: x1, y: y1 },
      end: { x: x2, y: y2 }, widthInches: 100 / 25.4 })),
    fireLanes: [9, 27].map((x, index) => ({ laneId: `sk-fire-${index + 1}`,
      start: { x, y: 0 }, end: { x, y: 36 }, widthInches: 6 })),
    trainingTruth: false };
}
function matchBinding(fixture) {
  const dataHash = hashStarcraftTmgContract(fixture.gameplayDataBundle);
  return { dataSnapshotHash: dataHash,
    dependencies: { dataSnapshot: { contentHash: dataHash } } };
}

const slice = createOfficialBattlefieldTokenMarkerRulesRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialBattlefieldTokenMarkerRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 894,
  newlyExecutableRuleAtoms: 11, reviewRequiredRuleAtoms: 18,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 894,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 78, missingStateContractExecutors: 0 });
accept("slice109_promotes_11_atoms_to_894_executable");
const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 109);
assert.deepEqual(assignment.atomIds,
  [...OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_NEW_ATOM_IDS]);
assert.deepEqual([assignment.executableAfter, assignment.reviewRequiredAfter], [894, 18]);
accept("route_v2_slice109_atom_identity_and_counts_match");
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executorManifest.length, 78);
assert(runtime.descriptor.executorManifest.some((entry) => (
  entry.executorId === "authority.battlefield-token-marker-rules-v1")));
accept("runtime_exposes_token_marker_rules_as_executor_78");
assert.deepEqual({ slice: slice.sliceHash, catalogue: slice.catalogueHash,
  runtime: runtime.descriptor.runtimeHash, graph: audit.graph.graphHash }, {
  slice: "139a4f04c79b6ac38bb5becf4a9250331a10b633021c6793f0ac20d0a45e670f",
  catalogue: "a72cd596d12b656aad71521ae8c95925a52aac7d48d3f69f289454347a7160d8",
  runtime: "1b59d0467d49145fa81f2ffb7de70a33f1db033d76078f439dbdef64775579c8",
  graph: "6612a5f597990381f2b896f84f29fe816fba6dcf46bcd06ed6c952035776f897",
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
const tokenMarkerBundle = createOfficialBattlefieldTokenMarkerRulesDataBundleV1({
  dataset: fixture.dataset, deploymentGeometryDataBundle: geometryBundle,
});
assert.equal(verifyOfficialBattlefieldTokenMarkerRulesDataBundleV1(tokenMarkerBundle), true);
accept("token_marker_data_bundle_is_content_hash_verified");
assert.equal(tokenMarkerBundle.ruleClauses.length, 11);
assert.deepEqual(tokenMarkerBundle.ruleClauses.map((entry) => entry.atomId).sort(),
  [...OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_NEW_ATOM_IDS]);
accept("eleven_exact_source_clauses_bind_eleven_route_atoms");
assert.equal(tokenMarkerBundle.coreRulesHash,
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54");
assert.equal(tokenMarkerBundle.sourcePolicy.refreshDuringDevelopment, false);
assert.equal(tokenMarkerBundle.sourcePolicy.repositoryFallbackAllowed, false);
accept("frozen_official_source_lock_performs_no_refresh_or_repo_fallback");
assert.deepEqual({ size: tokenMarkerBundle.tokenContract.terrainSize,
  ownBase: tokenMarkerBundle.tokenContract.ownBaseRequired,
  expiry: tokenMarkerBundle.tokenContract.defaultExpiry,
  measurement: tokenMarkerBundle.tokenContract.measurement },
{ size: 0, ownBase: true, expiry: "end_of_game_round",
  measurement: "closest_base_edge" });
accept("token_contract_preserves_size_zero_own_base_expiry_and_edge_measurement");
assert.deepEqual({ physical: tokenMarkerBundle.markerContract.physicalPresence,
  footprint: tokenMarkerBundle.markerContract.rulesFootprint,
  los: tokenMarkerBundle.markerContract.blocksLineOfSight,
  movement: tokenMarkerBundle.markerContract.blocksMovement },
{ physical: false, footprint: null, los: false, movement: false });
accept("marker_contract_has_no_physical_los_or_movement_presence");
assert.deepEqual(Object.keys(tokenMarkerBundle.markerKinds).sort(),
  ["activation", "factionIndicator", "firstPlayer", "mode", "zoneOfInfluence"]);
accept("five_specialized_marker_kinds_are_explicit");
assert.deepEqual(tokenMarkerBundle.cleanupContract.retained,
  ["stay_in_play", "damage_marker", "mission_marker",
    "mission_control_faction_indicator"]);
accept("cleanup_exception_denominator_is_explicit");

const profileByName = new Map(geometryBundle.geometryProfiles.map((entry) => (
  [entry.name, entry])));
const partialDraft = completeDraft(draftBundle, profileByName.get("AGRIA VALLEY").recordKey);
const partialBinding = createOfficialDeploymentGeometryBindingV1({
  deploymentGeometryDataBundle: geometryBundle,
  missionDeploymentDraftDataBundle: draftBundle,
  missionDeploymentDraftState: partialDraft,
});
const registry = createOfficialBattlefieldTokenMarkerRegistryV1({
  battlefieldTokenMarkerRulesDataBundle: tokenMarkerBundle,
  deploymentGeometryBinding: partialBinding,
});
assert.equal(verifyOfficialBattlefieldTokenMarkerRegistryV1(registry,
  tokenMarkerBundle, partialBinding), true);
accept("partial_entry_profile_builds_a_hash_verified_registry");
assert.equal(registry.partialEntryEdgeMarkerCount, 6);
assert(registry.zoneOfInfluenceMarkers.every((entry) => entry.shape === "l_corner"
  && entry.physicalPresence === false && entry.rulesFootprint === null));
accept("agria_partial_edges_materialize_six_exact_intangible_l_corners");
const fullDraft = completeDraft(draftBundle, profileByName.get("ABANDONED CAMP").recordKey);
const fullBinding = createOfficialDeploymentGeometryBindingV1({
  deploymentGeometryDataBundle: geometryBundle,
  missionDeploymentDraftDataBundle: draftBundle,
  missionDeploymentDraftState: fullDraft,
});
const fullRegistry = createOfficialBattlefieldTokenMarkerRegistryV1({
  battlefieldTokenMarkerRulesDataBundle: tokenMarkerBundle,
  deploymentGeometryBinding: fullBinding,
});
assert.equal(fullRegistry.partialEntryEdgeMarkerCount, 0);
accept("full_table_entry_edges_create_no_zoi_corner_markers");

const token = createOfficialBattlefieldTokenV1({ registry,
  tokenId: "creep-tumor-1", tokenKind: "creep_tumor",
  coordinate: { x: 18, y: 18 }, baseDiameterMm: 32, createdRound: 1 });
near(token.baseDiameterInches, 32 / 25.4);
assert.equal(token.rulesFootprint.diameterInches, token.baseDiameterInches);
accept("token_base_uses_exact_official_mm_to_inch_geometry");
assert.deepEqual({ size: token.terrainSize, tangible: token.tangibleBattlefieldAsset,
  ownBase: token.ownBase }, { size: 0, tangible: true, ownBase: true });
accept("token_is_a_tangible_size_zero_terrain_asset_with_own_base");
const clearMove = resolveOfficialTokenMovementOverlapV1({ registry, token,
  modelBaseDiameterMm: 32, destination: { x: 10, y: 10 } });
assert.equal(clearMove.mayTraverseThroughToken, true);
assert.equal(clearMove.mayEndAtDestination, true);
accept("models_may_traverse_through_tokens");
const overlapMove = resolveOfficialTokenMovementOverlapV1({ registry, token,
  modelBaseDiameterMm: 100, destination: { x: 18, y: 18 } });
assert.equal(overlapMove.destinationOverlapsToken, true);
assert.equal(overlapMove.mayEndAtDestination, false);
accept("model_scale_is_used_to_reject_default_end_overlap");
const allowedOverlap = resolveOfficialTokenMovementOverlapV1({ registry, token,
  modelBaseDiameterMm: 100, destination: { x: 18, y: 18 },
  explicitEndOverlapPermission: true });
assert.equal(allowedOverlap.mayEndAtDestination, true);
accept("explicit_effect_can_allow_token_end_overlap");
const edgeMeasurement = measureOfficialClosestTokenBaseEdgeV1({ registry, token,
  originCoordinate: { x: 10, y: 18 }, originBaseDiameterMm: 100 });
near(edgeMeasurement.distanceInches, 8 - (100 / 25.4 / 2) - (32 / 25.4 / 2));
accept("token_distance_measures_between_closest_base_edges");
const persistentToken = createOfficialBattlefieldTokenV1({ registry,
  tokenId: "shade-1", tokenKind: "shade", coordinate: { x: 24, y: 18 },
  baseDiameterMm: 32, createdRound: 1, stayInPlay: true });
assert.equal(persistentToken.cleanupDisposition, "retain");
accept("stay_in_play_token_survives_default_round_cleanup");
assert.equal(token.cleanupDisposition, "remove");
accept("ordinary_token_expires_at_end_of_round");

const activation = createOfficialBattlefieldMarkerV1({ registry,
  markerId: "activation:u1", markerKind: "activation", markerRole: "movement",
  anchorId: "u1", face: "arrow_up", sideKey: "player1" });
assert.equal(activation.physicalPresence, false);
assert.equal(activation.rulesFootprint, null);
accept("activation_marker_is_intangible_even_when_rendered_beside_unit");
assert.equal(activation.blocksLineOfSight, false);
assert.equal(activation.blocksMovement, false);
accept("markers_never_block_line_of_sight_or_movement");
const mode = createOfficialBattlefieldMarkerV1({ registry,
  markerId: "mode:u1:burrowed", markerKind: "mode", markerRole: "burrowed",
  anchorId: "u1", sideKey: "player1" });
assert.equal(mode.stayInPlay, true);
assert.equal(mode.cleanupDisposition, "retain");
accept("mode_marker_has_stay_in_play_lifecycle");
const control = createOfficialBattlefieldMarkerV1({ registry,
  markerId: "control:m1", markerKind: "faction_indicator",
  markerRole: "mission_marker_control", anchorId: "mission-marker-1",
  sideKey: "player1" });
assert.equal(control.cleanupDisposition, "retain");
accept("mission_control_faction_indicator_is_retained");
const area = createOfficialBattlefieldMarkerV1({ registry,
  markerId: "area:a1", markerKind: "faction_indicator",
  markerRole: "special_ability_area", coordinate: { x: 12, y: 12 },
  sideKey: "player2" });
assert.equal(area.cleanupDisposition, "remove");
accept("special_ability_area_faction_indicator_uses_default_cleanup");
const cleanup = resolveOfficialTokenMarkerCleanupV1({ registry,
  tokens: [token, persistentToken], markers: [activation, mode, control, area] });
assert.deepEqual(cleanup.removedTokenIds, ["creep-tumor-1"]);
assert.deepEqual(cleanup.retainedTokenIds, ["shade-1"]);
assert.deepEqual(cleanup.removedMarkerIds, ["activation:u1", "area:a1"]);
assert.deepEqual(cleanup.retainedMarkerIds, ["control:m1", "mode:u1:burrowed"]);
accept("cleanup_kernel_computes_exact_remove_and_retain_sets");

const pieces = [{ id: "u1", sideKey: "player1",
  activatedPhases: { movement: true, assault: false, combat: false },
  statuses: [{ statusName: "burrowed" }] },
{ id: "u2", sideKey: "player2",
  activatedPhases: { movement: true, assault: true, combat: false }, statuses: [] }];
const missionMarkers = partialBinding.markerTargets.map((entry) => ({ ...entry,
  controlSideKey: entry.number === 1 ? "player1" : null }));
const views = deriveOfficialBattlefieldMarkerViewsV1({ registry, pieces,
  missionMarkers, firstPlayerSideKey: "player1" });
assert.equal(views.activationMarkers.find((entry) => entry.anchorId === "u1").face,
  "arrow_up");
accept("movement_completion_uses_activation_arrow_up_face");
assert.equal(views.activationMarkers.find((entry) => entry.anchorId === "u2").face,
  "reverse");
accept("assault_completion_uses_activation_reverse_face");
assert.equal(views.factionIndicators[0].markerRole, "mission_marker_control");
assert.equal(views.factionIndicators[0].sideKey, "player1");
accept("faction_indicator_view_derives_from_mission_control_state");
assert.equal(views.firstPlayerMarker.sideKey, "player1");
assert.equal(views.firstPlayerMarker.anchorId, "player1");
accept("first_player_marker_derives_from_first_player_side_key");
assert.equal(views.modeMarkers[0].markerRole, "burrowed");
assert.equal(views.modeMarkers[0].stayInPlay, true);
accept("burrowed_status_derives_a_persistent_mode_marker");
assert.equal(views.zoneOfInfluenceMarkers.length, 6);
accept("derived_views_include_exact_static_zoi_marker_set");
const passedViews = deriveOfficialBattlefieldMarkerViewsV1({ registry, pieces,
  missionMarkers, firstPlayerSideKey: "player2" });
assert.equal(passedViews.firstPlayerMarker.sideKey, "player2");
assert.equal(registry.firstPlayerMarkerAuthority, "state.firstPlayerSideKey");
accept("initiative_transfer_recomputes_view_without_mutating_registry_truth");

const projection = createOfficialBattlefieldViewportProjectionV1({
  deploymentGeometryBinding: partialBinding,
  cssWidth: 720, cssHeight: 720, devicePixelRatio: 1, zoom: 1,
});
const tokenProjection = projectOfficialBattlefieldTokenV1({ registry, token,
  deploymentGeometryBinding: partialBinding, viewportProjection: projection,
  minimumTouchTargetCss: 44 });
near(tokenProjection.diameterCss, (32 / 25.4) * projection.cssPixelsPerInch);
accept("map_and_token_share_exact_mm_to_inch_to_css_scale");
const retina = createOfficialBattlefieldViewportProjectionV1({
  deploymentGeometryBinding: partialBinding,
  cssWidth: 720, cssHeight: 720, devicePixelRatio: 3, zoom: 1,
});
const retinaToken = projectOfficialBattlefieldTokenV1({ registry, token,
  deploymentGeometryBinding: partialBinding, viewportProjection: retina });
near(retinaToken.diameterCss, tokenProjection.diameterCss);
assert.equal(retina.viewport.backingWidth, projection.viewport.backingWidth * 3);
accept("dpr_changes_backing_store_not_token_or_map_css_scale");
assert(tokenProjection.touchTargetDiameterCss >= tokenProjection.diameterCss);
assert.equal(tokenProjection.touchTargetAffectsRulesCollision, false);
accept("token_touch_target_expansion_never_changes_collision_base");
const zoi = createOfficialBattlefieldMarkerV1({ registry,
  markerId: "zoi-project", markerKind: "zone_of_influence",
  markerRole: "entry_corner", coordinate: { x: 0, y: 24 }, sideKey: "player1" });
const zoiProjection = projectOfficialIntangibleMarkerV1({ registry, marker: zoi,
  deploymentGeometryBinding: partialBinding, viewportProjection: projection,
  visualIconDiameterCss: 18, minimumTouchTargetCss: 44 });
assert.equal(zoiProjection.rulesDiameterInches, 0);
assert.equal(zoiProjection.rulesFootprint, null);
assert.equal(zoiProjection.touchTargetDiameterCss, 44);
accept("marker_icon_and_touch_size_create_no_rules_footprint");
const zoom = createOfficialBattlefieldViewportProjectionV1({
  deploymentGeometryBinding: partialBinding,
  cssWidth: 720, cssHeight: 720, devicePixelRatio: 2, zoom: 2,
  panCssX: 17, panCssY: -9,
});
const zoomToken = projectOfficialBattlefieldTokenV1({ registry, token,
  deploymentGeometryBinding: partialBinding, viewportProjection: zoom });
near(zoomToken.diameterCss, tokenProjection.diameterCss * 2);
assert.equal(zoomToken.worldGeometryHash, tokenProjection.worldGeometryHash);
accept("zoom_and_pan_change_projection_only_not_token_world_geometry");

function readyState() {
  const state = fixture.battleState({ activeSideKey: "player1" });
  state.phase = "pre_game"; state.rulesProcedureMode = true; state.pendingAction = null;
  state.officialMissionDeploymentDraftDataBundle = draftBundle;
  state.officialDeploymentGeometryDataBundle = geometryBundle;
  state.officialBalancedTerrainRulesDataBundle = terrainBundle;
  state.officialBattlefieldTokenMarkerRulesDataBundle = tokenMarkerBundle;
  state.officialMissionDeploymentDraft = fullDraft;
  state.officialMissionDeploymentDraftBinding = fullDraft.draftBinding;
  const geometryLegal = runtime.enumerate(state, { sideKey: "player1",
    matchBinding: matchBinding(fixture) });
  const withGeometry = runtime.apply(state, geometryLegal.candidates[0], {
    matchBinding: matchBinding(fixture) }).state;
  const terrainLegal = runtime.enumerate(withGeometry, { sideKey: "player1",
    matchBinding: matchBinding(fixture) });
  const terrainDomain = terrainLegal.parameterDomains[0];
  const terrainAction = runtime.instantiate(withGeometry, terrainDomain,
    { setupPlan: skirmishPlan() }, { matchBinding: matchBinding(fixture) }).action;
  return runtime.apply(withGeometry, terrainAction, {
    matchBinding: matchBinding(fixture) }).state;
}
const preRegistryState = readyState();
const legal = runtime.enumerate(preRegistryState, { sideKey: "player1",
  includeDisabled: true, matchBinding: matchBinding(fixture) });
assert.equal(legal.candidates[0].actionType,
  "materialize_battlefield_token_marker_registry");
assert.equal(legal.parameterDomains.length, 0);
accept("runtime_exposes_deterministic_finite_registry_action");
const exactRegistryAction = Object.fromEntries(Object.entries(legal.candidates[0])
  .filter(([key]) => !["isEnabled", "disabledReason", "score", "details"].includes(key)));
const applied = runtime.apply(preRegistryState, exactRegistryAction, {
  matchBinding: matchBinding(fixture) });
assert.equal(applied.state.officialBattlefieldSetup.stage,
  "battlefield_token_marker_registry_complete_ticket_11_slice_110_pending");
accept("runtime_commits_registry_and_explicit_slice110_boundary");
assert.equal(applied.state.officialBattlefieldTokenMarkerRegistry.registryHash,
  applied.state.officialBattlefieldSetup.battlefieldTokenMarkerRegistryHash);
assert.equal(applied.state.officialBattlefieldMarkerViewsAtSetup.firstPlayerMarker.sideKey,
  "player1");
accept("runtime_state_stores_registry_and_derived_setup_views");
assert.equal(runtime.enumerate(applied.state, { sideKey: "player1",
  matchBinding: matchBinding(fixture) }).candidates.some((entry) => (
  entry.actionType === "materialize_battlefield_token_marker_registry")), false);
accept("registry_materialization_is_idempotently_absent_after_commit");
const cleanupState = structuredClone(applied.state);
cleanupState.phase = "cleanup";
cleanupState.activeSideKey = null;
cleanupState.pendingAction = null;
const liveRegistry = cleanupState.officialBattlefieldTokenMarkerRegistry;
cleanupState.officialBattlefieldTokens = [
  createOfficialBattlefieldTokenV1({ registry: liveRegistry,
    tokenId: "cleanup-default-token", tokenKind: "corrosive_bile",
    coordinate: { x: 10, y: 10 }, baseDiameterMm: 32,
    createdRound: Number(cleanupState.round) }),
  createOfficialBattlefieldTokenV1({ registry: liveRegistry,
    tokenId: "cleanup-persistent-token", tokenKind: "shade",
    coordinate: { x: 14, y: 10 }, baseDiameterMm: 32,
    createdRound: Number(cleanupState.round),
    stayInPlay: true }),
];
cleanupState.officialBattlefieldMarkers = [
  createOfficialBattlefieldMarkerV1({ registry: liveRegistry,
    markerId: "cleanup-activation", markerKind: "activation",
    markerRole: "assault", anchorId: "u1", face: "reverse", sideKey: "player1" }),
  createOfficialBattlefieldMarkerV1({ registry: liveRegistry,
    markerId: "cleanup-mode", markerKind: "mode", markerRole: "burrowed",
    anchorId: "u1", sideKey: "player1" }),
];
const cleanupLegal = runtime.enumerate(cleanupState, { sideKey: "player1",
  matchBinding: matchBinding(fixture) });
assert.equal(cleanupLegal.candidates[0].actionType,
  "cleanup_battlefield_tokens_and_markers");
const exactCleanupAction = Object.fromEntries(Object.entries(cleanupLegal.candidates[0])
  .filter(([key]) => !["isEnabled", "disabledReason", "score", "details"].includes(key)));
const cleaned = runtime.apply(cleanupState, exactCleanupAction, {
  matchBinding: matchBinding(fixture) });
assert.deepEqual(cleaned.state.officialBattlefieldTokens.map((entry) => entry.tokenId),
  ["cleanup-persistent-token"]);
assert.deepEqual(cleaned.state.officialBattlefieldMarkers.map((entry) => entry.markerId),
  ["cleanup-mode"]);
assert.equal(cleaned.state.lastBattlefieldTokenMarkerCleanupRound,
  Number(cleanupState.round));
accept("runtime_executes_end_round_token_marker_cleanup_before_cleanup_refresh");
assert.equal(runtime.enumerate(cleaned.state, { sideKey: "player1",
  matchBinding: matchBinding(fixture) }).candidates.some((entry) => (
  entry.actionType === "cleanup_battlefield_tokens_and_markers")), false);
accept("token_marker_cleanup_runs_exactly_once_per_round");
const forged = structuredClone(exactRegistryAction);
forged.expectedRegistryHash = "0".repeat(64);
rejects("BATTLEFIELD_TOKEN_MARKER_ACTION_STALE", () => runtime.apply(preRegistryState,
  forged, { matchBinding: matchBinding(fixture) }));
accept("forged_registry_hash_fails_closed");

const graphAudit = auditRuleRelationshipGraphV1(audit.graph);
assert.equal(graphAudit.valid, true);
assert.equal(graphAudit.declaredScopesValid, true);
accept("slice109_relationship_scope_passes_full_graph_audit");
assert.deepEqual({ sourceClauses: graphAudit.counts.sourceClauses,
  executableAtoms: graphAudit.counts.executableRuleAtoms,
  executors: graphAudit.counts.executors,
  remaining: graphAudit.counts.remainingActionableRuleAtoms,
  gaps: graphAudit.counts.blockingGaps },
{ sourceClauses: 1093, executableAtoms: 894, executors: 78, remaining: 18, gaps: 0 });
accept("graph_counts_are_exact_with_zero_blocking_gaps");
const broken = structuredClone(audit.graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_RELATIONSHIP_SCOPE_ID));
const forbidden = scope.forbiddenPaths.find((entry) => (
  entry.from === "semantic_projection:battlefieldTokenMarkerV1.uniformWorldToCss"));
const edgeBody = { from: forbidden.from, relationship: "writes", to: forbidden.to,
  scopeId: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_RELATIONSHIP_SCOPE_ID,
  provenance: "forged:frontend_geometry_truth" };
broken.edges.push({ edgeId: `relationship-edge:${hashStarcraftTmgContract(edgeBody)}`,
  ...edgeBody });
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash")));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
accept("frontend_projection_to_rules_geometry_path_is_forbidden");
assert.deepEqual([slice.historicalCompatibility.previousActionSchemaVersion,
  slice.historicalCompatibility.actionSchemaVersion],
  ["hybrid_legal_space_v46", "hybrid_legal_space_v47"]);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
accept("v47_advances_while_frozen_v46_rules_display_remains_readable");

const keys = generateKeyPairSync("ed25519");
function engineFor(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-09-02T12:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-109-token-marker",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 109 Token/Marker rules.";
function envelopeFor(engine) {
  return engine.createEnvelope({ roomId: "official-slice-109-token-marker-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId:
        "official-battlefield-token-marker-rules-data-bundle-v1",
      content: tokenMarkerBundle },
      rulesDisplay: { artifactId: "official-slice-109-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "official-slice-109-action-schema-v47",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v47" } },
    }, state: readyState() });
}
function registerReplay(engine, initial) {
  const entries = { sourceSnapshot: fixture.snapshot,
    dataSnapshot: fixture.gameplayDataBundle,
    rulesArtifact: { kind: "rules-artifact", rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: initial.matchBinding.rulesRuntimeBinding },
    executorArtifact: { kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: initial.matchBinding.rulesRuntimeBinding.runtimeHash,
      catalogueHash: initial.matchBinding.rulesRuntimeBinding.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest },
    geometryArtifact: tokenMarkerBundle,
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v47" } };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}
const authority = engineFor("slice-109-token-marker-short-seal-v1");
const initial = envelopeFor(authority);
registerReplay(authority, initial);
const seat = authority.issueSeatAuthority({ grantId: "slice-109-player1",
  roomId: initial.roomId, matchBindingHash: initial.matchBindingHash,
  seatKey: "player1", roleMode: "player", principalType: "human",
  capabilities: ["read_room", "read_legal_space", "preview", "confirm", "apply"] });
const lease = authority.issueControlLease({ seatAuthority: seat,
  sessionId: "slice-109-token-marker-session", leaseFence: 1,
  issuedAtRoomRevision: initial.stateRevision });
const authoritySpace = authority.legalSpace(initial, { seatAuthority: seat });
const finite = authoritySpace.finiteActions.find((entry) => (
  entry.action.actionType === "materialize_battlefield_token_marker_registry"));
assert(finite);
const preview = authority.preview({ envelope: initial, seatAuthority: seat,
  proposal: { kind: "finite", actionKey: finite.actionKey } });
assert.equal(preview.ok, true, JSON.stringify(preview));
assert.equal(preview.preview.previewSeal.sealAlgorithm, "hmac-sha256");
const confirmation = authority.confirmPreview({ envelope: initial,
  preview: preview.preview, seatAuthority: seat });
const authoritativeApplied = authority.apply({ envelope: initial,
  expectedStateRevision: initial.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: seat,
  controlLease: lease, idempotencyKey: "slice-109-token-marker" });
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
const replay = engineFor("slice-109-token-marker-rotated-seal-v2");
registerReplay(replay, initial);
assert.equal(replay.replay({ initialEnvelope: initial,
  journal: [authoritativeApplied.receipt] }).ok, true);
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_token_marker_event" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
accept("authority_hmac_preview_ed25519_apply_replay_and_tamper_rejection_pass");
assert.equal(authoritativeApplied.envelope.state.officialBattlefieldTokenMarkerRegistry
  .trainingTruth, false);
accept("authority_registry_stays_out_of_training_truth");
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.equal(slice.harness.trainingTraceCandidates.length, 0);
accept("ctx2skill_dsh_selfplay_muzero_and_memory_promotion_remain_zero");
assert.equal(slice.battlefieldTokenMarkerRulesProgress.sourceRefreshPerformed, false);
assert.equal(slice.battlefieldTokenMarkerRulesProgress
  .webAppUniformTokenMarkerProjectionExecutable, true);
accept("slice_records_frozen_source_and_uniform_web_app_projection_boundary");
assert.equal(acceptance.length, 55);

const report = { schema:
    "starcraft_tmg_official_battlefield_token_marker_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit,
  remainingRouteV2Hash: route.routeHash,
  slice, audit, sliceAudit: audit,
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
  graphHash: audit.graph.graphHash, graph: audit.graph, graphAudit,
  coverage: audit.stateContractCoverage,
  battlefieldTokenMarkerRulesDataBundleHash: tokenMarkerBundle.bundleHash,
  sourceLockHash: tokenMarkerBundle.sourceLockHash,
  sourceSnapshotHash: tokenMarkerBundle.sourceSnapshotHash,
  normalizedDatasetHash: tokenMarkerBundle.normalizedDatasetHash,
  geometryAudit: { battlefield: partialBinding.battlefield,
    partialEntryZoiCornerMarkerCount: registry.partialEntryEdgeMarkerCount,
    fullEntryZoiCornerMarkerCount: fullRegistry.partialEntryEdgeMarkerCount,
    tokenMillimetresPerInch: 25.4, markerRulesDiameterInches: 0,
    uniformWorldProjection: "pass", devicePixelRatioRulesInvariant: true,
    zoomPanRulesInvariant: true, touchTargetRulesInvariant: true },
  lifecycleAudit: { tokenDefaultExpiry: "remove",
    stayInPlayToken: "retain", activationMarker: "remove",
    modeMarker: "retain", missionControlFactionIndicator: "retain" },
  sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  rulesTruth: "official_battlefield_token_marker_rules_slice_verified",
  trainingTruth: false };
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-battlefield-token-marker-rules-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, acceptance: acceptance.length,
  sliceHash: slice.sliceHash, catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash, graphHash: audit.graph.graphHash,
  dataBundleHash: tokenMarkerBundle.bundleHash }, null, 2));
