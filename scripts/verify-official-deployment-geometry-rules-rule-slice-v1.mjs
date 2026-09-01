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
import {
  OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_NEW_ATOM_IDS,
} from "../packages/rule-atoms/official-deployment-geometry-rules-executor-v1.mjs";
import {
  createOfficialBattlefieldViewportProjectionV1,
  createOfficialDeploymentGeometryBindingV1,
  createOfficialTerrainHeightTierLedgerV1,
  finalizeOfficialMissionMarkerPlacementV1,
  projectOfficialWorldCircleToViewportV1,
  unprojectOfficialViewportPointV1,
  verifyOfficialDeploymentGeometryBindingV1,
  verifyOfficialMissionMarkerPlacementV1,
} from "../packages/rule-atoms/official-deployment-geometry-rules-kernel-v1.mjs";
import { OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-deployment-geometry-rules-relationship-contract-v1.mjs";
import {
  createOfficialDeploymentGeometryRulesRuleSliceV1,
  verifyOfficialDeploymentGeometryRulesRuleSliceV1,
} from "../packages/rule-atoms/official-deployment-geometry-rules-rule-slice-v1.mjs";
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
  createOfficialDeploymentGeometryDataBundleV1,
  verifyOfficialDeploymentGeometryDataBundleV1,
} from "../packages/source-data/official-deployment-geometry-data-bundle-v1.mjs";
import { createOfficialMissionDeploymentDraftDataBundleV1 } from
  "../packages/source-data/official-mission-deployment-draft-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-mission-deployment-draft-rules-rule-slice-v1-report.json"), "utf8"));
const routeBaseReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-elevation-effective-size-rules-rule-slice-v1-report.json"), "utf8"));
const acceptance = [];
function accept(description) {
  acceptance.push(`${String(acceptance.length + 1).padStart(2, "0")}_${description}`);
}
function rejects(code, operation) {
  assert.throws(operation, (error) => String(error?.message || error).startsWith(code));
}
function near(left, right, epsilon = 1e-9) {
  assert(Math.abs(left - right) <= epsilon, `${left} != ${right}`);
}
function engineFor(runtime, keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-09-01T14:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-107-deployment-geometry",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 107 Deployment geometry rules.";
function envelopeFor(engine, fixture, bundle, state) {
  return engine.createEnvelope({ roomId: "official-slice-107-deployment-geometry-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-deployment-geometry-data-bundle-v1",
        content: bundle },
      rulesDisplay: { artifactId: "official-slice-107-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "official-slice-107-action-schema-v45",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v45" } },
    }, state });
}
function credentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({ grantId: "slice-107-player1",
    roomId: envelope.roomId, matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1", roleMode: "player", principalType: "human",
    capabilities: ["read_room", "read_legal_space", "preview", "confirm", "apply"] });
  return { authority, lease: engine.issueControlLease({ seatAuthority: authority,
    sessionId: "slice-107-geometry-session", leaseFence: 1,
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
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v45" } };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}

const slice = createOfficialDeploymentGeometryRulesRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialDeploymentGeometryRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 866,
  newlyExecutableRuleAtoms: 12, reviewRequiredRuleAtoms: 46,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 866,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 76, missingStateContractExecutors: 0 });
accept("slice107_promotes_12_atoms_to_866_executable");
const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 107);
assert.deepEqual(assignment.atomIds, [...OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_NEW_ATOM_IDS]);
assert.deepEqual([assignment.executableAfter, assignment.reviewRequiredAfter], [866, 46]);
accept("route_v2_slice107_atom_identity_and_counts_match");
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executorManifest.length, 76);
assert(runtime.descriptor.executorManifest.some((entry) => (
  entry.executorId === "authority.deployment-geometry-rules-v1")));
accept("runtime_exposes_deployment_geometry_as_executor_76");
assert.deepEqual({ slice: slice.sliceHash, catalogue: slice.catalogueHash,
  runtime: runtime.descriptor.runtimeHash, graph: audit.graph.graphHash }, {
  slice: "aafc7e6351442fca2b700e73840dde19617262c32ae10d708df39a9b2dbf1ca1",
  catalogue: "6b2414a21b5614ca436c55a3e9cf29374f49420ebfaba443cf94421c46b045fb",
  runtime: "80a2723a52530b63c9d169dc2064b6bb009cccfce46550e0438e99cfa6bd98d8",
  graph: "39a98b83cbeb20e60584305def4ae93bbe8d1037c0d1a48d238118fe47b146b6",
});
accept("slice_catalogue_runtime_and_graph_hashes_are_frozen");

const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const draftBundle = createOfficialMissionDeploymentDraftDataBundleV1({
  dataset: fixture.dataset,
});
const bundle = createOfficialDeploymentGeometryDataBundleV1({
  dataset: fixture.dataset, missionDeploymentDraftDataBundle: draftBundle,
});
assert.equal(verifyOfficialDeploymentGeometryDataBundleV1(bundle), true);
accept("deployment_geometry_bundle_is_content_hash_verified");
assert.equal(bundle.geometryProfiles.length, 10);
assert.deepEqual(bundle.counts, { geometryProfiles: 10, standardProfiles: 5,
  skirmishProfiles: 5, standardMissionMarkersPerProfile: 5,
  skirmishMissionMarkersPerProfile: 3, promotedAtoms: 12 });
accept("ten_profile_denominator_is_five_standard_plus_five_skirmish");
assert.equal(bundle.ruleClauses.length, 12);
assert.deepEqual(bundle.ruleClauses.map((entry) => entry.atomId).sort(),
  [...OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_NEW_ATOM_IDS]);
accept("twelve_exact_clause_boundaries_cover_route_atoms");
assert.equal(bundle.sourcePrecedence.setupOrder, "core_pdf_page_78_primary");
assert.equal(bundle.sourcePrecedence.commandCenterSetupOrderConflictDetected, true);
assert.equal(bundle.sourcePrecedence.commandCenterRuleProseMayOverrideCorePdf, false);
accept("core_pdf_setup_order_wins_over_conflicting_command_center_prose");
assert.equal(bundle.sourcePrecedence.draftFieldContractCorrection,
  "skirmish_deployment_cards_define_markers_1_2_5_only");
accept("skirmish_marker_denominator_correction_is_explicit");
assert.equal(bundle.sourcePolicy.refreshDuringDevelopment, false);
assert.equal(bundle.sourcePolicy.repositoryFallbackAllowed, false);
accept("source_lock_stays_offline_without_repository_fallback");
assert.equal(bundle.viewportProjectionContract.millimetresPerInch, 25.4);
assert.equal(bundle.viewportProjectionContract.uniformAxesRequired, true);
assert.equal(bundle.viewportProjectionContract.devicePixelRatioAffectsRulesGeometry, false);
accept("shared_web_app_projection_contract_separates_rules_and_view_coordinates");

const byName = new Map(bundle.geometryProfiles.map((entry) => [entry.name, entry]));
assert.deepEqual(byName.get("ABANDONED CAMP").missionMarkers.map((entry) => (
  [entry.number, entry.coordinate.x, entry.coordinate.y])),
[[1, 6, 18], [2, 30, 18], [5, 18, 18]]);
accept("abandoned_camp_exact_three_marker_coordinates_are_transcribed");
assert.deepEqual(byName.get("AGRIA VALLEY").entryEdgesByColour.red.segments.map((entry) => (
  [entry.side, entry.startInches, entry.endInches])),
[["top", 0, 12], ["left", 24, 36]]);
accept("agria_valley_exact_red_corner_entry_is_transcribed");
assert.deepEqual(byName.get("CHAR PLAINS").missionMarkers.map((entry) => (
  [entry.number, entry.coordinate.x, entry.coordinate.y])),
[[1, 6, 6], [2, 6, 30], [5, 24, 18]]);
accept("char_plains_asymmetric_marker_five_coordinate_is_transcribed");
assert.deepEqual(byName.get("FRONTIER").entryEdgesByColour.blue.segments.map((entry) => (
  [entry.side, entry.startInches, entry.endInches])),
[["left", 12, 24], ["right", 12, 24]]);
accept("frontier_disconnected_blue_entry_segments_are_transcribed");
assert.deepEqual(byName.get("GAUNTLET").missionMarkers.map((entry) => (
  [entry.number, entry.coordinate.x, entry.coordinate.y])),
[[1, 12, 24], [2, 42, 12], [3, 36, 24], [4, 18, 12], [5, 27, 18]]);
accept("gauntlet_exact_five_marker_coordinates_are_transcribed");
assert.deepEqual(byName.get("TYPHOON").entryEdgesByColour.red.segments.map((entry) => (
  [entry.side, entry.startInches, entry.endInches])),
[["top", 30, 54], ["right", 18, 36]]);
accept("typhoon_exact_red_corner_entry_is_transcribed");
assert.deepEqual(byName.get("ACROPOLIS").entryEdgesByColour.blue.segments.map((entry) => (
  [entry.side, entry.startInches, entry.endInches])),
[["bottom", 0, 18], ["top", 36, 54]]);
accept("acropolis_opposed_partial_blue_entries_are_transcribed");
assert.deepEqual(byName.get("PROVING GROUNDS").entryEdgesByColour.red.segments.map((entry) => (
  [entry.side, entry.startInches, entry.endInches, entry.fullTableEdge])),
[["left", 0, 36, true], ["right", 0, 36, true]]);
accept("proving_grounds_two_full_red_edges_are_transcribed");
assert.deepEqual(byName.get("BREACH").missionMarkers.map((entry) => (
  [entry.number, entry.coordinate.x, entry.coordinate.y])),
[[1, 18, 30], [2, 36, 30], [3, 36, 6], [4, 18, 6], [5, 27, 18]]);
accept("breach_exact_five_marker_coordinates_are_transcribed");
assert(bundle.geometryProfiles.every((profile) => profile.setupOrder.join("|")
  === "confirm_table_dimensions|assign_entry_edges|set_zone_of_influence_corner_markers|set_terrain|place_mission_markers"));
accept("all_profiles_use_the_primary_pdf_five_step_setup_order");
assert(bundle.geometryProfiles.every((profile) => Object.values(profile.entryEdgesByColour)
  .every((entry) => entry.segments.every((segment) => (
    segment.zoneOfInfluenceDepthInches === 6)))));
accept("every_entry_segment_materializes_a_six_inch_influence_zone");

function exactChoice(state, playerId, kind, predicate = () => true, chanceReveals) {
  const choices = enumerateOfficialMissionDeploymentDraftChoicesV1({
    missionDeploymentDraftDataBundle: draftBundle, draftState: state, playerId,
  });
  const selected = choices.find((entry) => entry.choiceKind === kind && predicate(entry));
  assert(selected, `missing ${kind}`);
  return applyOfficialMissionDeploymentDraftChoiceV1({
    missionDeploymentDraftDataBundle: draftBundle, draftState: state,
    playerId, choiceId: selected.choiceId, chanceReveals,
  }).draftState;
}
function completeGauntletDraft() {
  const gauntlet = byName.get("GAUNTLET").recordKey;
  const standardMissions = draftBundle.missionProfiles.filter((entry) => (
    entry.engagementScale === "Standard")).slice(0, 2).map((entry) => entry.recordKey);
  const standardDeployments = draftBundle.deploymentProfiles.filter((entry) => (
    entry.engagementScale === "Standard")).slice(0, 2).map((entry) => entry.recordKey);
  if (!standardDeployments.includes(gauntlet)) standardDeployments[0] = gauntlet;
  let state = createOfficialMissionDeploymentDraftStateV1({
    missionDeploymentDraftDataBundle: draftBundle,
    participantIds: ["player1", "player2"], engagementScale: "Standard",
  });
  const submit = (entry) => entry.value.missionRecordKeys.join("|")
      === standardMissions.slice().sort().join("|")
    && entry.value.deploymentRecordKeys.join("|")
      === standardDeployments.slice().sort().join("|");
  state = exactChoice(state, "player1", "submit_draft_set", submit);
  state = exactChoice(state, "player2", "submit_draft_set", submit);
  state = exactChoice(state, "player1", "resolve_opening_roll_off", () => true,
    [6, 5, 1, 1].map((outcome, counter) => ({ counter, faces: 6, outcome })));
  state = exactChoice(state, "player1", "choose_player_colour",
    (entry) => entry.value.colour === "red");
  state = exactChoice(state, "player1", "choose_draft_control",
    (entry) => entry.value.controlledDraft === "deployment");
  state = exactChoice(state, "player1", "eliminate_mission_cards");
  state = exactChoice(state, "player2", "select_mission_card");
  state = exactChoice(state, "player2", "eliminate_deployment_cards",
    (entry) => state.deploymentDraft.remainingOccurrenceIds
      .filter((id) => !entry.value.occurrenceIds.includes(id))
      .some((id) => state.faceUpRows.deployment.find((row) => (
        row.occurrenceId === id))?.recordKey === gauntlet));
  state = exactChoice(state, "player1", "select_deployment_card",
    (entry) => state.faceUpRows.deployment.find((row) => (
      row.occurrenceId === entry.value.occurrenceId))?.recordKey === gauntlet);
  return state;
}

const draftState = completeGauntletDraft();
const geometryBinding = createOfficialDeploymentGeometryBindingV1({
  deploymentGeometryDataBundle: bundle,
  missionDeploymentDraftDataBundle: draftBundle,
  missionDeploymentDraftState: draftState,
});
assert.equal(verifyOfficialDeploymentGeometryBindingV1(geometryBinding, bundle), true);
assert.deepEqual(geometryBinding.battlefield, { widthInches: 54, heightInches: 36,
  metricDisplayReference: { widthCentimetres: 137, heightCentimetres: 92 } });
accept("completed_draft_materializes_exact_selected_battlefield_dimensions");
assert.equal(geometryBinding.geometryExecutionReady, true);
assert.equal(geometryBinding.missionMarkerPhysicalPlacementComplete, false);
assert.equal(geometryBinding.setupSequence[3].status, "pending_ticket_11_slice_108");
accept("geometry_is_ready_while_physical_markers_wait_for_terrain");
assert.deepEqual(Object.keys(geometryBinding.entryEdgesByPlayer).sort(),
  ["player1", "player2"]);
assert.equal(geometryBinding.entryEdgesByPlayer.player1.colour, "red");
accept("draft_colour_choice_assigns_entry_edges_to_exact_players");

const ledger = createOfficialTerrainHeightTierLedgerV1({
  deploymentGeometryBinding: geometryBinding,
  terrainPieces: [{ terrainPieceId: "mid-centre", heightTier: "mid_ground",
    footprint: { xMin: 26, xMax: 28, yMin: 17, yMax: 19 }, impassable: false }],
});
const placement = finalizeOfficialMissionMarkerPlacementV1({
  deploymentGeometryBinding: geometryBinding, terrainHeightTierLedger: ledger,
});
assert.equal(verifyOfficialMissionMarkerPlacementV1(placement, geometryBinding, ledger), true);
assert.equal(placement.missionMarkers.find((entry) => entry.number === 5).elevation,
  "mid_ground");
assert(placement.missionMarkers.filter((entry) => entry.number !== 5)
  .every((entry) => entry.elevation === "ground_level"));
accept("marker_elevation_is_rules_derived_from_game_start_terrain_support");
rejects("DEPLOYMENT_GEOMETRY_MISSION_MARKER_IMPASSABLE_OVERLAP", () => (
  finalizeOfficialMissionMarkerPlacementV1({
    deploymentGeometryBinding: geometryBinding,
    terrainHeightTierLedger: createOfficialTerrainHeightTierLedgerV1({
      deploymentGeometryBinding: geometryBinding,
      terrainPieces: [{ terrainPieceId: "blocked-one", heightTier: "high_ground",
        footprint: { xMin: 11, xMax: 13, yMin: 23, yMax: 25 }, impassable: true }],
    }),
  })));
accept("impassable_terrain_overlap_with_marker_fails_closed");
rejects("DEPLOYMENT_GEOMETRY_TERRAIN_PIECE_INVALID", () => (
  createOfficialTerrainHeightTierLedgerV1({ deploymentGeometryBinding: geometryBinding,
    terrainPieces: [{ terrainPieceId: "missing-height", heightTier: "",
      footprint: { xMin: 1, xMax: 2, yMin: 1, yMax: 2 }, impassable: false }] })));
accept("faq_9_46_requires_every_terrain_piece_height_tier_at_game_start");

for (const viewport of [{ cssWidth: 360, cssHeight: 360, devicePixelRatio: 1 },
  { cssWidth: 1080, cssHeight: 720, devicePixelRatio: 2 },
  { cssWidth: 390, cssHeight: 844, devicePixelRatio: 3 }]) {
  const projection = createOfficialBattlefieldViewportProjectionV1({
    deploymentGeometryBinding: geometryBinding, ...viewport,
  });
  assert.equal(projection.xCssPixelsPerInch, projection.yCssPixelsPerInch);
  const circle = projectOfficialWorldCircleToViewportV1({
    deploymentGeometryBinding: geometryBinding, viewportProjection: projection,
    x: 27, y: 18, diameterMm: 32, minimumTouchTargetCss: 44,
  });
  near(circle.diameterInches, 32 / 25.4);
  assert(circle.touchTargetDiameterCss >= circle.diameterCss);
  assert.equal(circle.touchTargetAffectsRulesCollision, false);
  const world = unprojectOfficialViewportPointV1({
    deploymentGeometryBinding: geometryBinding, viewportProjection: projection,
    xCss: circle.xCss, yCss: circle.yCss,
  });
  near(world.x, 27); near(world.y, 18);
}
accept("desktop_tablet_and_phone_viewports_preserve_uniform_scale_and_roundtrip");
const normalProjection = createOfficialBattlefieldViewportProjectionV1({
  deploymentGeometryBinding: geometryBinding, cssWidth: 1080, cssHeight: 720,
  devicePixelRatio: 1, zoom: 1,
});
const retinaProjection = createOfficialBattlefieldViewportProjectionV1({
  deploymentGeometryBinding: geometryBinding, cssWidth: 1080, cssHeight: 720,
  devicePixelRatio: 3, zoom: 1,
});
assert.equal(normalProjection.cssPixelsPerInch, retinaProjection.cssPixelsPerInch);
assert.equal(retinaProjection.viewport.backingWidth,
  normalProjection.viewport.backingWidth * 3);
accept("device_pixel_ratio_changes_backing_store_but_not_rules_or_css_scale");
const zoomedProjection = createOfficialBattlefieldViewportProjectionV1({
  deploymentGeometryBinding: geometryBinding, cssWidth: 1080, cssHeight: 720,
  devicePixelRatio: 2, zoom: 2, panCssX: 17, panCssY: -9,
});
near(zoomedProjection.cssPixelsPerInch, normalProjection.cssPixelsPerInch * 2);
assert.equal(zoomedProjection.physicalRulesGeometryInvariant, true);
accept("zoom_and_pan_change_projection_without_changing_world_geometry");
const fiftyMm = projectOfficialWorldCircleToViewportV1({
  deploymentGeometryBinding: geometryBinding, viewportProjection: normalProjection,
  x: 5, y: 5, diameterMm: 50,
});
near(fiftyMm.diameterInches, 50 / 25.4);
accept("arbitrary_official_model_base_mm_uses_the_same_25_4_conversion");

function runtimeState() {
  const state = fixture.battleState({ activeSideKey: "player1" });
  state.phase = "pre_game"; state.rulesProcedureMode = true; state.pendingAction = null;
  state.officialMissionDeploymentDraftDataBundle = draftBundle;
  state.officialDeploymentGeometryDataBundle = bundle;
  state.officialMissionDeploymentDraft = draftState;
  state.officialMissionDeploymentDraftBinding = draftState.draftBinding;
  state.deploymentGeometryHistory = [];
  return state;
}
function matchBinding() {
  const dataHash = hashStarcraftTmgContract(fixture.gameplayDataBundle);
  return { dataSnapshotHash: dataHash,
    dependencies: { dataSnapshot: { contentHash: dataHash } } };
}
const state = runtimeState();
const legal = runtime.enumerate(state, { sideKey: "player1", includeDisabled: true,
  matchBinding: matchBinding() });
assert.equal(legal.parameterDomains.length, 0);
assert.equal(legal.candidates.length, 1);
assert.equal(legal.candidates[0].actionType, "materialize_deployment_geometry");
assert.equal(legal.candidates[0].details.markerTargetCount, 5);
accept("runtime_exposes_one_rules_owned_selected_geometry_action");
const applied = runtime.apply(state, legal.candidates[0], { matchBinding: matchBinding() });
assert.equal(applied.state.officialDeploymentGeometryBinding.bindingHash,
  geometryBinding.bindingHash);
assert.equal(applied.state.officialBattlefieldSetup.stage,
  "terrain_pending_ticket_11_slice_108");
assert.equal(applied.state.lastDeploymentGeometryResolution.clientSuppliedGeometryAccepted,
  false);
accept("runtime_commits_geometry_and_explicit_slice108_terrain_boundary");
assert.equal(runtime.enumerate(applied.state, { sideKey: "player1",
  matchBinding: matchBinding() }).candidates.some((entry) => (
  entry.actionType === "materialize_deployment_geometry")), false);
accept("geometry_materialization_is_idempotently_absent_after_commit");
const stale = structuredClone(legal.candidates[0]);
stale.deploymentGeometryPlan.expectedBindingHash = "0".repeat(64);
rejects("DEPLOYMENT_GEOMETRY_ACTION_STALE", () => (
  runtime.apply(state, stale, { matchBinding: matchBinding() })));
accept("forged_geometry_plan_hash_fails_closed");

const keys = generateKeyPairSync("ed25519");
const authority = engineFor(runtime, keys, "slice-107-geometry-short-seal-v1");
const initial = envelopeFor(authority, fixture, bundle, runtimeState());
registerReplay(authority, initial, fixture, runtime, bundle);
const access = credentials(authority, initial);
const authoritySpace = authority.legalSpace(initial, { seatAuthority: access.authority });
const finite = authoritySpace.finiteActions.find((entry) => (
  entry.action.actionType === "materialize_deployment_geometry"));
assert(finite, JSON.stringify({ finiteActions: authoritySpace.finiteActions,
  disabledDiagnostics: authoritySpace.disabledDiagnostics }));
const preview = authority.preview({ envelope: initial, seatAuthority: access.authority,
  proposal: { kind: "finite", actionKey: finite.actionKey } });
assert.equal(preview.ok, true, JSON.stringify(preview));
assert.equal(preview.preview.previewSeal.sealAlgorithm, "hmac-sha256");
const confirmation = authority.confirmPreview({ envelope: initial,
  preview: preview.preview, seatAuthority: access.authority });
const authoritativeApplied = authority.apply({ envelope: initial,
  expectedStateRevision: initial.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: access.authority,
  controlLease: access.lease, idempotencyKey: "slice-107-deployment-geometry" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
const replay = engineFor(runtime, keys, "slice-107-geometry-rotated-seal-v2");
registerReplay(replay, initial, fixture, runtime, bundle);
assert.equal(replay.replay({ initialEnvelope: initial,
  journal: [authoritativeApplied.receipt] }).ok, true);
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_deployment_geometry_event" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
accept("authority_hmac_preview_ed25519_apply_replay_and_tamper_rejection_pass");

const graphAudit = auditRuleRelationshipGraphV1(audit.graph);
assert.equal(graphAudit.valid, true);
assert.equal(graphAudit.declaredScopesValid, true);
accept("slice107_relationship_scope_passes_full_graph_audit");
assert.deepEqual({ sourceClauses: graphAudit.counts.sourceClauses,
  executableAtoms: graphAudit.counts.executableRuleAtoms,
  executors: graphAudit.counts.executors,
  remaining: graphAudit.counts.remainingActionableRuleAtoms,
  gaps: graphAudit.counts.blockingGaps },
{ sourceClauses: 1093, executableAtoms: 866, executors: 76, remaining: 46, gaps: 0 });
accept("graph_counts_are_exact_with_zero_blocking_gaps");
const broken = structuredClone(audit.graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_RELATIONSHIP_SCOPE_ID));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "derived_value:deploymentGeometryV1.mmToInchPhysicalTokenSize"
  && entry.to === "derived_value:deploymentGeometryV1.uniformWorldToViewportProjection"));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash")));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
accept("missing_piece_scale_to_viewport_edge_blocks_release");
assert.deepEqual([slice.historicalCompatibility.previousActionSchemaVersion,
  slice.historicalCompatibility.actionSchemaVersion],
  ["hybrid_legal_space_v44", "hybrid_legal_space_v45"]);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
accept("v45_advances_while_frozen_v44_display_remains_readable");
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.equal(slice.harness.trainingTraceCandidates.length, 0);
accept("ctx2skill_and_harness_record_no_skill_or_training_promotion");

const report = { schema: "starcraft_tmg_official_deployment_geometry_rules_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit,
  remainingRouteV2Hash: route.routeHash,
  slice, audit, sliceAudit: audit,
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
  graphHash: audit.graph.graphHash, graph: audit.graph,
  graphAudit, coverage: audit.coverage,
  deploymentGeometryDataBundleHash: bundle.bundleHash,
  geometryProfileIndexHash: bundle.geometryProfileIndexHash,
  sourceLockHash: bundle.sourceLockHash,
  sourceSnapshotHash: bundle.sourceSnapshotHash,
  normalizedDatasetHash: bundle.normalizedDatasetHash,
  dataAudit: { geometryProfileCount: bundle.geometryProfiles.length,
    standardMarkerCount: 5, skirmishMarkerCount: 3,
    viewportProjectionRoundtrip: "pass", sourceRefreshPerformed: false,
    repositoryFallbackUsed: false },
  rulesTruth: "official_deployment_geometry_rule_slice_verified",
  trainingTruth: false };
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-deployment-geometry-rules-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, acceptance: acceptance.length,
  sliceHash: slice.sliceHash, catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash, graphHash: audit.graph.graphHash,
  dataBundleHash: bundle.bundleHash,
  geometryProfileIndexHash: bundle.geometryProfileIndexHash }, null, 2));
