#!/usr/bin/env node

import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgAuthoritativeEngine } from "../packages/authoritative-engine/transition-v1.mjs";
import { createOfficialActivationPassRuleSliceV1 } from "../packages/rule-atoms/official-activation-pass-rule-slice-v1.mjs";
import { createOfficialAssaultHoldRuleSliceV1 } from "../packages/rule-atoms/official-assault-hold-rule-slice-v1.mjs";
import { createOfficialCloseCombatAttackRuleSliceV1 } from "../packages/rule-atoms/official-close-combat-attack-rule-slice-v1.mjs";
import { createOfficialCloseRanksCombatRuleSliceV1 } from "../packages/rule-atoms/official-close-ranks-combat-rule-slice-v1.mjs";
import { createOfficialCombatPassRuleSliceV1 } from "../packages/rule-atoms/official-combat-pass-rule-slice-v1.mjs";
import { createOfficialElevatedEngagementRuleSliceV1 } from "../packages/rule-atoms/official-elevated-engagement-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_MISSION_MARKER_CONTROL_ACTION_TYPE,
  OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_ID,
} from "../packages/rule-atoms/official-mission-marker-control-executor-v1.mjs";
import {
  createOfficialMissionMarkerControlRuleSliceV1,
  verifyOfficialMissionMarkerControlRuleSliceV1,
} from "../packages/rule-atoms/official-mission-marker-control-rule-slice-v1.mjs";
import { createOfficialMovementHoldRuleSliceV1 } from "../packages/rule-atoms/official-movement-hold-rule-slice-v1.mjs";
import { createOfficialMultiModelCloseRanksRuleSliceV1 } from "../packages/rule-atoms/official-multi-model-close-ranks-rule-slice-v1.mjs";
import { createOfficialOutOfCoherencyCloseRanksRuleSliceV1 } from "../packages/rule-atoms/official-out-of-coherency-close-ranks-rule-slice-v1.mjs";
import { createOfficialPhaseInitiativeRuleSliceV1 } from "../packages/rule-atoms/official-phase-initiative-rule-slice-v1.mjs";
import { createOfficialCombatProfileBundleV1 } from "../packages/source-data/official-combat-profile-bundle-v1.mjs";
import { createOfficialCommandCenterDataset } from "../packages/source-data/official-command-center-adapter-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const FIRESTORE_DIR = path.join(
  ROOT,
  "build",
  "source-intake",
  "official-rules",
  "command-center",
  "firestore",
);
const OCCURRED_AT = "2026-08-25T00:00:00.000Z";
const HISTORICAL_V4_CATALOGUE_HASH =
  "db2e3de5a481a3eea05e6fb177475f062f937937fae67252d34573f8d762ee70";
const HISTORICAL_V4_RUNTIME_HASH =
  "a526844692ee0959e9df7a65e3ad27294c856b5815c9b980c8e7e040f070dd5f";

function model(id, xInches, yInches) {
  return {
    id,
    xInches,
    yInches,
    baseShape: "round",
    baseWidthInches: 1.26,
    baseDepthInches: 1.26,
    elevation: "ground",
    supportTerrainIds: [],
    adjacentAccessPointIds: [],
    isOnField: true,
    isDestroyed: false,
  };
}

function formationModels(id, count, centerX, centerY) {
  return Array.from({ length: count }, (_, index) => {
    const column = (index % 3) - 1;
    const row = Math.floor(index / 3);
    return model(`${id}-model-${index + 1}`, centerX + (column * 1.3), centerY + (row * 1.3));
  });
}

function coherencyStatus(status, leadingModelId) {
  const out = status === "out_of_coherency";
  return {
    schemaVersion: "starcraft_tmg_unit_coherency_status_v1",
    status,
    isOutOfCoherency: out,
    determinedAt: { round: 1, phase: "movement", repositionAction: "move" },
    leadingModelId,
    beyondThreeModelIds: out ? [leadingModelId] : [],
    casualtyModelIds: [],
    trainingTruth: false,
  };
}

function piece(id, sideKey, count, currentSupply, centerX, centerY, status = "in_coherency") {
  const models = formationModels(id, count, centerX, centerY);
  return {
    id,
    sideKey,
    name: "Marine",
    officialUnitRecordKey: "army_units:marine",
    formationSize: "small",
    selectedUpgradeNames: [],
    combatTag: "ground",
    currentModels: count,
    maxModels: count,
    currentSupply,
    damageMarker: 0,
    statuses: [],
    combatEffects: [],
    isOnField: true,
    isDestroyed: false,
    models,
    coherencyStatus: coherencyStatus(status, models[0].id),
    activatedPhases: { movement: true, assault: true, combat: true },
  };
}

function marker(number, xInches, controlSideKey = null) {
  return {
    id: `mission-marker-${number}`,
    number,
    xInches,
    yInches: 6,
    diameterMillimeters: 32,
    elevation: "ground",
    isActivated: true,
    controlSideKey,
    factionIndicatorSideKey: controlSideKey,
  };
}

function cleanupState(profileBundle) {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 1,
    phase: "cleanup",
    activeSideKey: null,
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: { combat: "player1" },
    players: {
      player1: { sideKey: "player1", passedPhases: { combat: true } },
      player2: { sideKey: "player2", passedPhases: { combat: true } },
    },
    scores: { player1: 0, player2: 0 },
    supplyDestroyedThisRound: { player1: 0, player2: 0 },
    officialCombatProfileBundle: profileBundle,
    board: {
      widthInches: 54,
      heightInches: 12,
      missionMarkerControlGeometry: {
        schemaVersion: "starcraft_tmg_mission_marker_control_geometry_v1",
        markerCoordinatesComplete: true,
        markerFootprintsComplete: true,
        markerElevationsComplete: true,
        lineOfSightTerrainComplete: true,
      },
      missionMarkers: [
        marker(1, 5),
        marker(2, 15, "player1"),
        marker(3, 25, "player1"),
        marker(4, 35, "player2"),
        marker(5, 45),
      ],
      terrain: [],
      accessPoints: [],
      effectMarkers: [],
    },
    cardResources: { player1: [], player2: [] },
    pieces: [
      piece("p1-marker-1", "player1", 6, 1, 5, 7.4),
      piece("p1-marker-2-out", "player1", 9, 2, 15, 7.4, "out_of_coherency"),
      piece("p2-marker-2-zero", "player2", 3, 0, 15, 3.3),
      piece("p1-marker-3", "player1", 6, 1, 25, 7.4),
      piece("p2-marker-3", "player2", 6, 1, 25, 3.3),
      piece("p1-marker-5-zero", "player1", 3, 0, 45, 7.4),
    ],
    log: [],
  };
}

async function officialData() {
  const liveReport = JSON.parse(await readFile(
    path.join(OUTPUT_DIR, "official-live-source-snapshots-report.json"),
    "utf8",
  ));
  const firestorePayloads = Object.fromEntries(await Promise.all([
    "army_units",
    "faction_cards",
    "rules_sections",
    "tactical_cards",
  ].map(async (collectionId) => [
    collectionId,
    JSON.parse(await readFile(path.join(FIRESTORE_DIR, `${collectionId}.json`), "utf8")),
  ])));
  return {
    snapshot: liveReport.commandSnapshot,
    dataset: createOfficialCommandCenterDataset({
      snapshot: liveReport.commandSnapshot,
      firestorePayloads,
    }),
  };
}

function buildSliceChain(denominator) {
  const movementHoldSlice = createOfficialMovementHoldRuleSliceV1({ denominator });
  const passSlice = createOfficialActivationPassRuleSliceV1({ denominator, previousSlice: movementHoldSlice });
  const assaultHoldSlice = createOfficialAssaultHoldRuleSliceV1({ denominator, movementHoldSlice, previousSlice: passSlice });
  const phaseInitiativeSlice = createOfficialPhaseInitiativeRuleSliceV1({ denominator, movementHoldSlice, passSlice, previousSlice: assaultHoldSlice });
  const combatPassSlice = createOfficialCombatPassRuleSliceV1({ denominator, movementHoldSlice, passSlice, assaultHoldSlice, previousSlice: phaseInitiativeSlice });
  const elevatedSlice = createOfficialElevatedEngagementRuleSliceV1({ denominator, movementHoldSlice, passSlice, assaultHoldSlice, phaseInitiativeSlice, previousSlice: combatPassSlice });
  const closeCombatSlice = createOfficialCloseCombatAttackRuleSliceV1({ denominator, movementHoldSlice, passSlice, assaultHoldSlice, phaseInitiativeSlice, combatPassSlice, previousSlice: elevatedSlice });
  const closeRanksSlice = createOfficialCloseRanksCombatRuleSliceV1({ denominator, movementHoldSlice, passSlice, assaultHoldSlice, phaseInitiativeSlice, combatPassSlice, elevatedSlice, previousSlice: closeCombatSlice });
  const multiModelSlice = createOfficialMultiModelCloseRanksRuleSliceV1({ denominator, movementHoldSlice, passSlice, assaultHoldSlice, phaseInitiativeSlice, combatPassSlice, elevatedSlice, closeCombatSlice, previousSlice: closeRanksSlice });
  const outOfCoherencySlice = createOfficialOutOfCoherencyCloseRanksRuleSliceV1({ denominator, movementHoldSlice, passSlice, assaultHoldSlice, phaseInitiativeSlice, combatPassSlice, elevatedSlice, closeCombatSlice, closeRanksSlice, previousSlice: multiModelSlice });
  const missionMarkerControlSlice = createOfficialMissionMarkerControlRuleSliceV1({ denominator, movementHoldSlice, passSlice, assaultHoldSlice, phaseInitiativeSlice, combatPassSlice, elevatedSlice, closeCombatSlice, closeRanksSlice, multiModelSlice, previousSlice: outOfCoherencySlice });
  return { movementHoldSlice, passSlice, assaultHoldSlice, phaseInitiativeSlice, combatPassSlice, elevatedSlice, closeCombatSlice, closeRanksSlice, multiModelSlice, outOfCoherencySlice, missionMarkerControlSlice };
}

function createEnvelope(engine, snapshot, profileBundle, roomId, state) {
  return engine.createEnvelope({
    roomId,
    dataVersion: `${snapshot.dataVersions.unitsVersion}/${snapshot.dataVersions.cardsVersion}/${snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-command-center-snapshot", content: snapshot },
      dataSnapshot: { artifactId: "official-combat-profile-bundle", content: profileBundle },
    },
    state,
  });
}

function seatCredentials(engine, envelope, sideKey, suffix, options = {}) {
  const authority = engine.issueSeatAuthority({
    grantId: `mission-marker-control-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: options.roleMode || "player",
    principalType: options.principalType || "human",
    capabilities: options.capabilities || ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `mission-marker-control-${suffix}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

function markerAction(space) {
  return space.finiteActions.find((entry) => (
    entry.action.actionType === OFFICIAL_MISSION_MARKER_CONTROL_ACTION_TYPE
  ));
}

function markerDiagnostic(space, reason) {
  return space.disabledDiagnostics.find((entry) => (
    entry.action.actionType === OFFICIAL_MISSION_MARKER_CONTROL_ACTION_TYPE
      && entry.disabledReason === reason
  ));
}

const denominator = JSON.parse(await readFile(path.join(OUTPUT_DIR, "official-canonical-rule-atom-denominator-v1-report.json"), "utf8")).denominator;
const slices = buildSliceChain(denominator);
const audit = verifyOfficialMissionMarkerControlRuleSliceV1({ denominator, ...slices, previousSlice: slices.outOfCoherencySlice, slice: slices.missionMarkerControlSlice });
assert.equal(audit.counts.changedNonTargetAtoms, 0);
assert.deepEqual({
  executable: audit.counts.executableRuleAtoms,
  reviewRequired: audit.counts.reviewRequiredRuleAtoms,
  displayOnly: audit.counts.displayOnlyRuleAtoms,
  newlyExecutable: audit.counts.newlyExecutableRuleAtoms,
}, {
  executable: 150,
  reviewRequired: 762,
  displayOnly: 114,
  newlyExecutable: 22,
});

const { snapshot, dataset } = await officialData();
assert.deepEqual(dataset.dataVersions, { cardsVersion: "69", rulesVersion: "48", unitsVersion: "71" });
const profileBundle = createOfficialCombatProfileBundleV1({ snapshot, dataset, recordKeys: ["army_units:marine"] });
const rulesRuntime = createOfficialExecutableRuleRuntimeV1({ catalogue: slices.missionMarkerControlSlice.catalogue });
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const engine = createStarcraftTmgAuthoritativeEngine({
  rulesRuntime,
  allowIncompleteRuleRuntimeForDevelopment: true,
  now: () => OCCURRED_AT,
  cryptoOptions: { keyId: "ticket-11-mission-marker-control-referee-v1", privateKey, publicKey, hmacSecret: "ticket-11-mission-marker-control-seal-v1" },
});
const acceptance = [];
acceptance.push("catalogue_promotes_exactly_22_atoms_without_mutating_non_targets");
acceptance.push("latest_frozen_official_command_center_versions_bind_current_supply");

const initial = createEnvelope(
  engine,
  snapshot,
  profileBundle,
  "official-mission-marker-control-room",
  cleanupState(profileBundle),
);
assert.ok(initial.matchBinding.rulesDisplayBinding.artifactHash);
const { authority, lease } = seatCredentials(engine, initial, "player1", "player1");
const legal = engine.legalSpace(initial, { seatAuthority: authority });
const finite = markerAction(legal);
assert.ok(finite, "First Player must receive the deterministic marker-control action in Cleanup");
assert.equal(finite.action.executorId, OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_ID);
assert.equal(finite.action.missionMarkerControlResolution.markerResults.length, 5);
assert.equal(finite.action.missionMarkerControlResolution.trainingTruth, false);
acceptance.push("first_player_legal_space_exposes_five_marker_explainable_resolution");

const preview = engine.preview({ envelope: initial, seatAuthority: authority, proposal: { kind: "finite", actionKey: finite.actionKey } });
assert.equal(preview.ok, true, JSON.stringify(preview));
assert.equal(preview.preview.core.confirmationPolicy.requiresExplicitHuman, true);
const confirmation = engine.confirmPreview({ envelope: initial, preview: preview.preview, seatAuthority: authority });
assert.equal(confirmation.ok, true, JSON.stringify(confirmation));
const applied = engine.apply({ envelope: initial, expectedStateRevision: initial.stateRevision, preview: preview.preview, confirmation: confirmation.confirmation, seatAuthority: authority, controlLease: lease, idempotencyKey: "ticket-11-mission-marker-control-apply-v1" });
assert.equal(applied.ok, true, JSON.stringify(applied));
assert.equal(applied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
assert.deepEqual(applied.envelope.state.board.missionMarkers.map((entry) => entry.controlSideKey), ["player1", "player2", "player1", "player2", "player1"]);
assert.equal(applied.envelope.state.board.missionMarkers[1].controlSideKey, "player2", "the Supply-2 Out-of-Coherency unit must not prevent the eligible Supply-0 enemy reclaim");
assert.deepEqual(applied.envelope.state.scoringCleanupProgress.completedSteps, [OFFICIAL_MISSION_MARKER_CONTROL_ACTION_TYPE]);
assert.equal(applied.envelope.state.scoringCleanupProgress.currentStep, "score_victory_points");
acceptance.push("human_confirmed_apply_resolves_supply_zero_tie_sticky_and_coherency_cases");

const replay = engine.replay({ initialEnvelope: initial, journal: [applied.receipt] });
assert.equal(replay.ok, true, JSON.stringify(replay));
assert.equal(replay.envelope.stateHash, applied.envelope.stateHash);
acceptance.push("ed25519_receipt_replays_exact_marker_and_progress_state");

const repeated = engine.legalSpace(applied.envelope, { seatAuthority: authority });
assert.equal(markerAction(repeated), undefined);
assert.ok(markerDiagnostic(repeated, "MISSION_MARKER_CONTROL_ALREADY_DETERMINED"));
acceptance.push("cleanup_control_step_cannot_repeat_in_the_same_round");

const player2 = seatCredentials(engine, initial, "player2", "player2");
const player2Legal = engine.legalSpace(initial, { seatAuthority: player2.authority });
assert.equal(markerAction(player2Legal), undefined);
assert.ok(markerDiagnostic(player2Legal, "MISSION_MARKER_CONTROL_FIRST_PLAYER_ONLY"));
acceptance.push("non_first_player_is_rejected_by_rules_owned_turn_authority");

const supplyMismatchState = cleanupState(profileBundle);
supplyMismatchState.pieces[0].currentSupply = 2;
const supplyMismatchEnvelope = createEnvelope(
  engine,
  snapshot,
  profileBundle,
  "official-mission-marker-control-supply-mismatch-room",
  supplyMismatchState,
);
const supplyMismatchCredentials = seatCredentials(
  engine,
  supplyMismatchEnvelope,
  "player1",
  "supply-mismatch",
);
const supplyMismatchLegal = engine.legalSpace(supplyMismatchEnvelope, {
  seatAuthority: supplyMismatchCredentials.authority,
});
assert.ok(markerDiagnostic(supplyMismatchLegal, "MISSION_MARKER_SUPPLY_STATE_MISMATCH"));
acceptance.push("current_supply_must_match_frozen_official_profile_tier");

const terrainState = cleanupState(profileBundle);
terrainState.board.terrain = [{
  id: "terrain-1",
  isRemoved: false,
  isDestroyed: false,
  xInches: 27,
  yInches: 6,
}];
const terrainEnvelope = createEnvelope(
  engine,
  snapshot,
  profileBundle,
  "official-mission-marker-control-terrain-scope-room",
  terrainState,
);
const terrainCredentials = seatCredentials(engine, terrainEnvelope, "player1", "terrain-scope");
const terrainLegal = engine.legalSpace(terrainEnvelope, { seatAuthority: terrainCredentials.authority });
assert.ok(markerDiagnostic(
  terrainLegal,
  "MISSION_MARKER_LINE_OF_SIGHT_TERRAIN_SCOPE_UNSUPPORTED",
));
acceptance.push("active_terrain_los_fails_closed_instead_of_guessing_visibility");

const elevatedState = cleanupState(profileBundle);
elevatedState.board.missionMarkers[0].elevation = "mid";
const elevatedEnvelope = createEnvelope(
  engine,
  snapshot,
  profileBundle,
  "official-mission-marker-control-elevated-scope-room",
  elevatedState,
);
const elevatedCredentials = seatCredentials(engine, elevatedEnvelope, "player1", "elevated-scope");
const elevatedLegal = engine.legalSpace(elevatedEnvelope, {
  seatAuthority: elevatedCredentials.authority,
});
assert.ok(markerDiagnostic(elevatedLegal, "MISSION_MARKER_ELEVATION_SCOPE_UNSUPPORTED"));
acceptance.push("elevated_marker_support_fails_closed_until_terrain_los_is_exact");

const invalidModelIdentityState = cleanupState(profileBundle);
invalidModelIdentityState.pieces[1].models[0].id = invalidModelIdentityState.pieces[0].models[0].id;
const invalidModelIdentityEnvelope = createEnvelope(
  engine,
  snapshot,
  profileBundle,
  "official-mission-marker-control-duplicate-model-room",
  invalidModelIdentityState,
);
const invalidModelIdentityCredentials = seatCredentials(
  engine,
  invalidModelIdentityEnvelope,
  "player1",
  "duplicate-model",
);
const invalidModelIdentityLegal = engine.legalSpace(invalidModelIdentityEnvelope, {
  seatAuthority: invalidModelIdentityCredentials.authority,
});
assert.ok(markerDiagnostic(invalidModelIdentityLegal, "MISSION_MARKER_MODEL_ID_INVALID"));
const outsideModelState = cleanupState(profileBundle);
outsideModelState.pieces[0].models[0].xInches = 0.1;
const outsideModelEnvelope = createEnvelope(
  engine,
  snapshot,
  profileBundle,
  "official-mission-marker-control-outside-model-room",
  outsideModelState,
);
const outsideModelCredentials = seatCredentials(
  engine,
  outsideModelEnvelope,
  "player1",
  "outside-model",
);
const outsideModelLegal = engine.legalSpace(outsideModelEnvelope, {
  seatAuthority: outsideModelCredentials.authority,
});
assert.ok(markerDiagnostic(outsideModelLegal, "MISSION_MARKER_MODEL_OUTSIDE_BATTLEFIELD"));
acceptance.push("duplicate_or_outside_active_model_geometry_fails_closed");

const missingCoherencyState = cleanupState(profileBundle);
delete missingCoherencyState.pieces[0].coherencyStatus;
const missingCoherencyEnvelope = createEnvelope(
  engine,
  snapshot,
  profileBundle,
  "official-mission-marker-control-missing-coherency-room",
  missingCoherencyState,
);
const missingCoherencyCredentials = seatCredentials(
  engine,
  missingCoherencyEnvelope,
  "player1",
  "missing-coherency",
);
const missingCoherencyLegal = engine.legalSpace(missingCoherencyEnvelope, {
  seatAuthority: missingCoherencyCredentials.authority,
});
assert.ok(markerDiagnostic(missingCoherencyLegal, "MISSION_MARKER_COHERENCY_STATUS_REQUIRED"));
acceptance.push("multi_model_unit_requires_durable_coherency_authority_state");

const opponentAuthority = engine.issueSeatAuthority({
  grantId: "mission-marker-control-opponent-grant",
  roomId: initial.roomId,
  matchBindingHash: initial.matchBindingHash,
  seatKey: "player1",
  roleMode: "opponent",
  principalType: "model",
  capabilities: ["read_legal_space", "preview", "apply"],
});
const opponentPreview = engine.preview({
  envelope: initial,
  seatAuthority: opponentAuthority,
  proposal: { kind: "finite", actionKey: finite.actionKey },
});
assert.equal(opponentPreview.ok, true, JSON.stringify(opponentPreview));
assert.equal(opponentPreview.preview.core.confirmationPolicy.requiresExplicitHuman, true);
const opponentApply = engine.apply({
  envelope: initial,
  expectedStateRevision: initial.stateRevision,
  preview: opponentPreview.preview,
  seatAuthority: opponentAuthority,
  controlLease: lease,
  idempotencyKey: "ticket-11-mission-marker-control-opponent-must-not-apply",
});
assert.equal(opponentApply.ok, false);
assert.equal(opponentApply.reason, "CAPABILITY_DENIED");
acceptance.push("opponent_model_can_preview_but_cannot_self_confirm_or_apply");

const replayEngine = createStarcraftTmgAuthoritativeEngine({
  rulesRuntime,
  allowIncompleteRuleRuntimeForDevelopment: true,
  now: () => OCCURRED_AT,
  cryptoOptions: {
    keyId: "ticket-11-mission-marker-control-referee-v1",
    privateKey,
    publicKey,
    hmacSecret: "ticket-11-mission-marker-control-rotated-seal-v2",
  },
});
for (const [kind, content] of [
  ["sourceSnapshot", snapshot],
  ["dataSnapshot", profileBundle],
  ["rulesArtifact", {
    kind: "rules-artifact",
    rulesVersion: rulesRuntime.descriptor.rulesVersion,
    rulesRuntimeBinding: initial.matchBinding.rulesRuntimeBinding,
  }],
  ["executorArtifact", {
    kind: "executor-artifact",
    authorityVersion: "starcraft_tmg_authority_v2",
    rulesRuntimeHash: initial.matchBinding.rulesRuntimeBinding.runtimeHash,
    catalogueHash: initial.matchBinding.rulesRuntimeBinding.catalogueHash,
    executorManifest: rulesRuntime.descriptor.executorManifest,
  }],
  ["geometryArtifact", { kind: "geometry-artifact", geometryVersion: "fixed_point_round_base_v1" }],
  ["actionSchema", { kind: "action-schema", schemaVersion: "hybrid_legal_space_v1" }],
]) {
  replayEngine.registerDependency({
    kind,
    artifactId: initial.matchBinding.dependencies[kind].artifactId,
    content,
  });
}
replayEngine.registerDependency({
  kind: "rulesDisplay",
  artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
  mediaType: "text/markdown",
  locale: "en",
  content: `# Historical rules display\n\nFrozen rules version: ${rulesRuntime.descriptor.rulesVersion}\n\nThis development artifact preserves the rules identity used by the match.`,
});
const rotatedReplay = replayEngine.replay({
  initialEnvelope: initial,
  journal: [applied.receipt],
});
assert.equal(rotatedReplay.ok, true, JSON.stringify(rotatedReplay));
assert.equal(rotatedReplay.envelope.stateHash, applied.envelope.stateHash);
const tamperedReceipt = structuredClone(applied.receipt);
tamperedReceipt.events.push({ type: "forged_marker_control" });
const tamperedReplay = replayEngine.replay({
  initialEnvelope: initial,
  journal: [tamperedReceipt],
});
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
acceptance.push("long_term_signature_survives_hmac_rotation_and_rejects_tamper");

const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: slices.outOfCoherencySlice.catalogue,
});
assert.equal(slices.outOfCoherencySlice.catalogueHash, HISTORICAL_V4_CATALOGUE_HASH);
assert.equal(historicalRuntime.descriptor.runtimeHash, HISTORICAL_V4_RUNTIME_HASH);
assert.equal(historicalRuntime.descriptor.executableRuleAtomCount, 128);
assert.throws(() => createOfficialMissionMarkerControlRuleSliceV1({
  denominator,
  ...slices,
  previousSlice: {
    ...slices.outOfCoherencySlice,
    catalogueHash: "0".repeat(64),
  },
}), /official_out_of_coherency_close_ranks_slice_hash_mismatch|catalogue/u);
acceptance.push("historical_v4_catalogue_runtime_and_rules_display_remain_frozen");

assert.equal(acceptance.length, 15);
const report = {
  schema: "starcraft_tmg_official_mission_marker_control_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: 15,
  acceptance,
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  dataVersions: dataset.dataVersions,
  slice: slices.missionMarkerControlSlice,
  audit,
  runtime: rulesRuntime.descriptor,
  historical: {
    catalogueHash: slices.outOfCoherencySlice.catalogueHash,
    runtimeHash: historicalRuntime.descriptor.runtimeHash,
    executableRuleAtomCount: historicalRuntime.descriptor.executableRuleAtomCount,
    rulesDisplayPreserved: Boolean(initial.matchBinding.rulesDisplayBinding.artifactHash),
  },
  ctx2skill: {
    ...slices.missionMarkerControlSlice.ctx2skill,
    skillsRead: [
      "wayfinder",
      "level3-wargame-app-developer",
      "tdd",
      "codebase-design",
      "ctx2skill-rule-skill-loop",
      "agentic-harness-evolution-loop",
    ],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult:
      "passed_mission_control_current_supply_coherency_sticky_ed25519_and_rotated_hmac_replay",
    promotions: [],
  },
  harness: {
    ...slices.missionMarkerControlSlice.harness,
    harnessToolsCalled: [
      "read_board_state",
      "list_legal_actions",
      "preview_action",
      "confirm_action_as_human",
      "apply_action_after_user_confirmation",
      "replay_room",
    ],
    uiTraceEvidence:
      "public_authority_contract_exposes_five_marker_explanation_device_ui_pending",
    memoryTraceEvidence: "no_runtime_memory_or_offline_skill_promotion_attempted",
    trainingTraceCandidates: [],
  },
  rulesTruth: "official_current_supply_out_of_coherency_sticky_marker_control_subset",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-mission-marker-control-rule-slice-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures: [],
  officialSourceSnapshotHash: report.officialSourceSnapshotHash,
  officialDatasetHash: report.officialDatasetHash,
  dataVersions: report.dataVersions,
  sliceHash: slices.missionMarkerControlSlice.sliceHash,
  catalogueHash: slices.missionMarkerControlSlice.catalogueHash,
  runtimeHash: rulesRuntime.descriptor.runtimeHash,
  executableRuleAtomCount: audit.counts.executableRuleAtoms,
  remainingExecutableRuleAtomCount: audit.counts.reviewRequiredRuleAtoms,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  rulesTruth: "official_current_supply_out_of_coherency_sticky_marker_control_subset",
  trainingTruth: false,
}, null, 2));
