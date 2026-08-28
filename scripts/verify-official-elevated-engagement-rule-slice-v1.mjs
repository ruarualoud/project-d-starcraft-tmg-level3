#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgAuthoritativeEngine } from "../packages/authoritative-engine/transition-v1.mjs";
import { createOfficialActivationPassRuleSliceV1 } from "../packages/rule-atoms/official-activation-pass-rule-slice-v1.mjs";
import { createOfficialAssaultHoldRuleSliceV1 } from "../packages/rule-atoms/official-assault-hold-rule-slice-v1.mjs";
import { createOfficialCombatPassRuleSliceV1 } from "../packages/rule-atoms/official-combat-pass-rule-slice-v1.mjs";
import {
  createOfficialElevatedEngagementRuleSliceV1,
  verifyOfficialElevatedEngagementRuleSliceV1,
} from "../packages/rule-atoms/official-elevated-engagement-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialMovementHoldRuleSliceV1 } from "../packages/rule-atoms/official-movement-hold-rule-slice-v1.mjs";
import { createOfficialPhaseInitiativeRuleSliceV1 } from "../packages/rule-atoms/official-phase-initiative-rule-slice-v1.mjs";
import { resolveExecutableRuleAtoms } from "../packages/rule-atoms/rule-atom-catalogue-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const OCCURRED_AT = "2026-08-25T00:00:00.000Z";
const HISTORICAL_COMBAT_PASS_CATALOGUE_HASH =
  "88a1fa5cadd118ff44ace8d8a16963b7e8a46d08a89e698a2ca46da4091945ad";
const HISTORICAL_COMBAT_PASS_RUNTIME_HASH =
  "73f209508ba308cab5e334b57f5a3368f7ef45796cc4ab207b4224ebc71aba4d";
const OFFICIAL_CORE_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";

function model(id, xInches, elevation, supportTerrainIds, adjacentAccessPointIds) {
  return {
    id,
    xInches,
    yInches: 10,
    baseShape: "round",
    baseWidthInches: 1,
    baseDepthInches: 1,
    elevation,
    supportTerrainIds,
    adjacentAccessPointIds,
    isDestroyed: false,
  };
}

function piece(id, sideKey, models) {
  return {
    id,
    sideKey,
    name: id,
    combatTag: "ground",
    currentModels: models.length,
    maxModels: models.length,
    isOnField: true,
    isDestroyed: false,
    models,
    activatedPhases: { movement: true, assault: true, combat: false },
  };
}

function groundMidState() {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 1,
    phase: "combat",
    activeSideKey: "player1",
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: {},
    phaseFirstActorByRound: {
      "1:combat": {
        round: 1,
        phase: "combat",
        markerHolderSideKey: "player1",
        chosenFirstActorSideKey: "player1",
      },
    },
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: { sideKey: "player2", passedPhases: {} },
    },
    scores: { player1: 0, player2: 0 },
    board: {
      widthInches: 54,
      heightInches: 36,
      engagementGeometry: {
        schemaVersion: "starcraft_tmg_engagement_geometry_input_v2",
        modelCoordinatesComplete: true,
        baseFootprintsComplete: true,
        terrainFootprintsComplete: true,
        elevationSupportsComplete: true,
        accessPointAdjacencyComplete: true,
      },
      terrain: [{
        id: "mid-platform",
        size: 1,
        elevationSurface: true,
        footprint: "rect",
        rotationDegrees: 0,
        xInches: 12,
        yInches: 10,
        widthInches: 1,
        heightInches: 1,
      }],
      accessPoints: [{
        id: "ground-mid-door",
        terrainId: "mid-platform",
        connectsElevations: ["ground", "mid"],
        footprint: "rect",
        rotationDegrees: 0,
        xInches: 11,
        yInches: 10,
        widthInches: 1,
        heightInches: 1,
      }],
      effectMarkers: [],
    },
    cardResources: { player1: [], player2: [] },
    pieces: [
      piece("p1-unit", "player1", [model("p1-model", 10, "ground", [], ["ground-mid-door"])]),
      piece("p2-unit", "player2", [model("p2-model", 12, "mid", ["mid-platform"], ["ground-mid-door"])]),
    ],
    log: [],
  };
}

function playerCredentials(engine, envelope, sideKey = "player1") {
  const authority = engine.issueSeatAuthority({
    grantId: `${envelope.roomId}-${sideKey}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `${envelope.roomId}-${sideKey}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

function applyFinite(runtimeEngine, envelope, credentials, predicate, idempotencyKey) {
  const legal = runtimeEngine.legalSpace(envelope, { seatAuthority: credentials.authority });
  const finite = legal.finiteActions.find((row) => predicate(row.action));
  assert(finite, "expected finite action in official LegalSpace");
  const previewed = runtimeEngine.preview({
    envelope,
    seatAuthority: credentials.authority,
    proposal: { kind: "finite", actionKey: finite.actionKey },
    occurredAt: OCCURRED_AT,
  });
  assert.equal(previewed.ok, true);
  let confirmation;
  if (previewed.preview.core.confirmationPolicy.requiresExplicitHuman) {
    const confirmed = runtimeEngine.confirmPreview({
      envelope,
      preview: previewed.preview,
      seatAuthority: credentials.authority,
      occurredAt: OCCURRED_AT,
    });
    assert.equal(confirmed.ok, true);
    confirmation = confirmed.confirmation;
  }
  const applied = runtimeEngine.apply({
    envelope,
    preview: previewed.preview,
    confirmation,
    expectedStateRevision: envelope.stateRevision,
    seatAuthority: credentials.authority,
    controlLease: credentials.lease,
    idempotencyKey,
    occurredAt: OCCURRED_AT,
  });
  assert.equal(applied.ok, true);
  return { legal, finite, previewed, applied };
}

const denominatorReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-canonical-rule-atom-denominator-v1-report.json"),
  "utf8",
));
const denominator = denominatorReport.denominator;
const movementHoldSlice = createOfficialMovementHoldRuleSliceV1({ denominator });
const passSlice = createOfficialActivationPassRuleSliceV1({ denominator, previousSlice: movementHoldSlice });
const assaultHoldSlice = createOfficialAssaultHoldRuleSliceV1({
  denominator,
  movementHoldSlice,
  previousSlice: passSlice,
});
const phaseInitiativeSlice = createOfficialPhaseInitiativeRuleSliceV1({
  denominator,
  movementHoldSlice,
  passSlice,
  previousSlice: assaultHoldSlice,
});
const combatPassSlice = createOfficialCombatPassRuleSliceV1({
  denominator,
  movementHoldSlice,
  passSlice,
  assaultHoldSlice,
  previousSlice: phaseInitiativeSlice,
});
const slice = createOfficialElevatedEngagementRuleSliceV1({
  denominator,
  movementHoldSlice,
  passSlice,
  assaultHoldSlice,
  phaseInitiativeSlice,
  previousSlice: combatPassSlice,
});
const audit = verifyOfficialElevatedEngagementRuleSliceV1({
  denominator,
  movementHoldSlice,
  passSlice,
  assaultHoldSlice,
  phaseInitiativeSlice,
  previousSlice: combatPassSlice,
  slice,
});
const historicalRuntime = createOfficialExecutableRuleRuntimeV1({ catalogue: combatPassSlice.catalogue });
const rulesRuntime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const engine = createStarcraftTmgAuthoritativeEngine({
  rulesRuntime,
  allowIncompleteRuleRuntimeForDevelopment: true,
  now: () => OCCURRED_AT,
});

assert.equal(slice.newlyExecutableRuleAtomIds.length, 14);
assert.equal(slice.reassignedExecutableRuleAtomIds.length, 20);
assert.equal(audit.counts.executableRuleAtoms, 53);
assert.equal(audit.counts.reviewRequiredRuleAtoms, 859);
assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
assert.equal(audit.counts.changedNonTargetAtoms, 0);
assert.equal(audit.counts.executableContractGaps, 0);
assert.equal(audit.counts.evidenceGaps, 0);
assert.equal(rulesRuntime.descriptor.executableRuleAtomCount, 53);
assert.equal(rulesRuntime.descriptor.nonExecutableRuleAtomCount, 973);

assert.equal(combatPassSlice.catalogueHash, HISTORICAL_COMBAT_PASS_CATALOGUE_HASH);
assert.equal(historicalRuntime.descriptor.runtimeHash, HISTORICAL_COMBAT_PASS_RUNTIME_HASH);
assert.equal(historicalRuntime.descriptor.executableRuleAtomCount, 39);
const historicalEngine = createStarcraftTmgAuthoritativeEngine({
  rulesRuntime: historicalRuntime,
  allowIncompleteRuleRuntimeForDevelopment: true,
  now: () => OCCURRED_AT,
});
const historicalEnvelope = historicalEngine.createEnvelope({
  roomId: "official-elevated-engagement-historical-v1-room",
  state: groundMidState(),
});

const initial = engine.createEnvelope({
  roomId: "official-elevated-engagement-ground-mid-room",
  gameId: "starcraft-tmg",
  dataVersion: "official-current-fixture",
  state: groundMidState(),
});
const credentials = playerCredentials(engine, initial);
const legal = engine.legalSpace(initial, { seatAuthority: credentials.authority });
assert.equal(legal.finiteActions.length, 0);
assert.equal(legal.disabledCount, 1);
assert.equal(legal.disabledDiagnostics[0].disabledReason, "COMBAT_PASS_ENGAGED_UNIT_REMAINS");

const withoutAccessState = groundMidState();
withoutAccessState.board.accessPoints = [];
withoutAccessState.pieces[0].models[0].adjacentAccessPointIds = [];
withoutAccessState.pieces[1].models[0].adjacentAccessPointIds = [];
const withoutAccessEnvelope = engine.createEnvelope({
  roomId: "official-elevated-engagement-no-shared-access-room",
  state: withoutAccessState,
});
const withoutAccessCredentials = playerCredentials(engine, withoutAccessEnvelope);
const withoutAccessLegal = engine.legalSpace(withoutAccessEnvelope, {
  seatAuthority: withoutAccessCredentials.authority,
});
assert.equal(withoutAccessLegal.finiteActions.length, 1);
assert.equal(withoutAccessLegal.finiteActions[0].action.actionType, "pass");

const highMidState = groundMidState();
highMidState.board.terrain = [
  {
    id: "mid-platform",
    size: 1,
    elevationSurface: true,
    footprint: "rect",
    rotationDegrees: 0,
    xInches: 10,
    yInches: 10,
    widthInches: 1,
    heightInches: 1,
  },
  {
    id: "high-platform",
    size: 3,
    elevationSurface: true,
    footprint: "rect",
    rotationDegrees: 0,
    xInches: 12,
    yInches: 10,
    widthInches: 1,
    heightInches: 1,
  },
];
highMidState.board.accessPoints[0].terrainId = "high-platform";
highMidState.board.accessPoints[0].connectsElevations = ["mid", "high"];
Object.assign(highMidState.pieces[0].models[0], {
  elevation: "mid",
  supportTerrainIds: ["mid-platform"],
});
Object.assign(highMidState.pieces[1].models[0], {
  elevation: "high",
  supportTerrainIds: ["high-platform"],
});
const highMidEnvelope = engine.createEnvelope({
  roomId: "official-elevated-engagement-high-mid-room",
  state: highMidState,
});
const highMidCredentials = playerCredentials(engine, highMidEnvelope);
const highMidLegal = engine.legalSpace(highMidEnvelope, { seatAuthority: highMidCredentials.authority });
assert.equal(highMidLegal.finiteActions.length, 0);
assert.equal(highMidLegal.disabledDiagnostics[0].disabledReason, "COMBAT_PASS_ENGAGED_UNIT_REMAINS");

const groundHighState = groundMidState();
groundHighState.board.terrain = [{
  id: "high-platform",
  size: 3,
  elevationSurface: true,
  footprint: "rect",
  rotationDegrees: 0,
  xInches: 12,
  yInches: 10,
  widthInches: 1,
  heightInches: 1,
}];
groundHighState.board.accessPoints = [];
groundHighState.pieces[0].models[0].adjacentAccessPointIds = [];
Object.assign(groundHighState.pieces[1].models[0], {
  elevation: "high",
  supportTerrainIds: ["high-platform"],
  adjacentAccessPointIds: [],
});
const groundHighEnvelope = engine.createEnvelope({
  roomId: "official-elevated-engagement-ground-high-room",
  state: groundHighState,
});
const groundHighCredentials = playerCredentials(engine, groundHighEnvelope);
const groundHighLegal = engine.legalSpace(groundHighEnvelope, {
  seatAuthority: groundHighCredentials.authority,
});
assert.equal(groundHighLegal.finiteActions.length, 1);
assert.equal(groundHighLegal.finiteActions[0].action.actionType, "pass");

const sameHighState = groundMidState();
sameHighState.board.terrain = [{
  id: "shared-high-platform",
  size: 3,
  elevationSurface: true,
  footprint: "rect",
  rotationDegrees: 0,
  xInches: 11,
  yInches: 10,
  widthInches: 3,
  heightInches: 2,
}];
sameHighState.board.accessPoints = [];
for (const unit of sameHighState.pieces) {
  Object.assign(unit.models[0], {
    elevation: "high",
    supportTerrainIds: ["shared-high-platform"],
    adjacentAccessPointIds: [],
  });
}
const sameHighEnvelope = engine.createEnvelope({
  roomId: "official-elevated-engagement-same-high-room",
  state: sameHighState,
});
const sameHighCredentials = playerCredentials(engine, sameHighEnvelope);
const sameHighLegal = engine.legalSpace(sameHighEnvelope, {
  seatAuthority: sameHighCredentials.authority,
});
assert.equal(sameHighLegal.finiteActions.length, 0);
assert.equal(sameHighLegal.disabledDiagnostics[0].disabledReason, "COMBAT_PASS_ENGAGED_UNIT_REMAINS");

const mismatchedElevationState = groundMidState();
mismatchedElevationState.pieces[1].models[0].elevation = "ground";
const mismatchedElevationEnvelope = engine.createEnvelope({
  roomId: "official-elevated-engagement-mismatched-elevation-room",
  state: mismatchedElevationState,
});
const mismatchedElevationCredentials = playerCredentials(engine, mismatchedElevationEnvelope);
const mismatchedElevationLegal = engine.legalSpace(mismatchedElevationEnvelope, {
  seatAuthority: mismatchedElevationCredentials.authority,
});
assert.equal(mismatchedElevationLegal.finiteActions.length, 0);
assert.equal(
  mismatchedElevationLegal.disabledDiagnostics[0].disabledReason,
  "ENGAGEMENT_V2_ELEVATION_DECLARATION_MISMATCH",
);

const mismatchedAccessState = groundMidState();
mismatchedAccessState.pieces[0].models[0].adjacentAccessPointIds = [];
const mismatchedAccessEnvelope = engine.createEnvelope({
  roomId: "official-elevated-engagement-mismatched-access-room",
  state: mismatchedAccessState,
});
const mismatchedAccessCredentials = playerCredentials(engine, mismatchedAccessEnvelope);
const mismatchedAccessLegal = engine.legalSpace(mismatchedAccessEnvelope, {
  seatAuthority: mismatchedAccessCredentials.authority,
});
assert.equal(mismatchedAccessLegal.finiteActions.length, 0);
assert.equal(
  mismatchedAccessLegal.disabledDiagnostics[0].disabledReason,
  "ENGAGEMENT_V2_ACCESS_POINT_ADJACENCY_MISMATCH",
);

const elevatedFlyingState = groundMidState();
elevatedFlyingState.pieces[0].combatTag = "flying";
elevatedFlyingState.pieces[0].models[0].adjacentAccessPointIds = [];
const elevatedFlyingEnvelope = engine.createEnvelope({
  roomId: "official-elevated-engagement-flying-room",
  state: elevatedFlyingState,
});
const elevatedFlyingCredentials = playerCredentials(engine, elevatedFlyingEnvelope);
const elevatedFlyingLegal = engine.legalSpace(elevatedFlyingEnvelope, {
  seatAuthority: elevatedFlyingCredentials.authority,
});
assert.equal(elevatedFlyingLegal.finiteActions.length, 1);
assert.equal(elevatedFlyingLegal.finiteActions[0].action.actionType, "pass");

const historicalCredentials = playerCredentials(historicalEngine, historicalEnvelope);
const historicalLegal = historicalEngine.legalSpace(historicalEnvelope, {
  seatAuthority: historicalCredentials.authority,
});
assert.equal(historicalLegal.finiteActions.length, 0);
assert.equal(historicalLegal.disabledDiagnostics[0].disabledReason, "ENGAGEMENT_GEOMETRY_INCOMPLETE");

const cleanupInitial = engine.createEnvelope({
  roomId: "official-elevated-engagement-v2-cleanup-room",
  state: structuredClone(withoutAccessState),
});
const cleanupPlayer1 = playerCredentials(engine, cleanupInitial, "player1");
const cleanupPlayer2 = playerCredentials(engine, cleanupInitial, "player2");
const firstPass = applyFinite(
  engine,
  cleanupInitial,
  cleanupPlayer1,
  (action) => action.actionType === "pass",
  "elevated-engagement-pass-1",
);
assert.equal(firstPass.applied.receipt.action.executorId, "authority.combat-pass-v2");
assert(firstPass.applied.receipt.events.some((event) => (
  event.type === "combat_pass"
    && event.engagementGraphSchema === "starcraft_tmg_official_engagement_graph_v2"
    && /^[a-f0-9]{64}$/u.test(event.engagementGraphHash)
)));
const secondPass = applyFinite(
  engine,
  firstPass.applied.envelope,
  cleanupPlayer2,
  (action) => action.actionType === "pass",
  "elevated-engagement-pass-2",
);
assert.equal(secondPass.applied.envelope.state.phase, "cleanup");
assert.equal(secondPass.applied.envelope.state.activeSideKey, null);
const replayed = engine.replay({
  initialEnvelope: cleanupInitial,
  journal: [firstPass.applied.receipt, secondPass.applied.receipt],
});
assert.equal(replayed.ok, true);
assert.equal(replayed.envelope.stateHash, secondPass.applied.envelope.stateHash);

const dependencySet = {
  rulesVersion: slice.catalogue.rulesVersion,
  sourceSnapshotHashes: Object.fromEntries(slice.catalogue.sourceSnapshots.map((snapshot) => [
    snapshot.sourceSnapshotId,
    snapshot.contentHash,
  ])),
  executorVersions: Object.fromEntries(slice.catalogue.executorManifest.map((executor) => [
    executor.executorId,
    executor.executorVersion,
  ])),
};
const resolved = resolveExecutableRuleAtoms(slice.catalogue, dependencySet);
assert.equal(resolved.atomIds.length, 53);
assert(slice.catalogue.sourceSnapshots.some((snapshot) => snapshot.contentHash === OFFICIAL_CORE_HASH));
assert.equal(slice.ctx2skill.ctx2skillLoopUsed, true);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.equal(slice.harness.harnessLoopUsed, true);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
assert.equal(slice.ctx2skillPromotionEligible, false);

const acceptance = [
  "fourteen_elevation_atoms_promote_and_twenty_v1_atoms_reassign_only",
  "historical_thirty_nine_atom_catalogue_runtime_and_v1_geometry_remain_exact",
  "ground_mid_shared_access_point_creates_engagement",
  "ground_mid_without_shared_access_point_allows_mandatory_pass",
  "high_mid_shared_access_point_creates_engagement",
  "ground_high_never_engages_even_within_one_inch",
  "same_high_surface_engages_without_self_blocking_terrain",
  "declared_elevation_and_access_adjacency_must_match_derived_geometry",
  "flying_ignores_elevation_and_access_points_and_remains_unengaged",
  "two_v2_passes_bind_graph_hash_and_replay_into_cleanup",
  "all_fifty_three_atoms_resolve_against_exact_frozen_dependencies",
  "ctx2skill_harness_and_training_lanes_remain_non_promoting",
].map((id) => ({ id, passed: true }));

const report = {
  schema: "starcraft_tmg_official_elevated_engagement_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures: [],
  slice,
  audit,
  runtime: rulesRuntime.descriptor,
  historicalRuntime: historicalRuntime.descriptor,
  sourceFreshness: {
    officialCoreUrl: "https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf",
    expectedSha256: OFFICIAL_CORE_HASH,
    repositoryFallbackAllowed: false,
  },
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesTruth: "all_elevation_engagement_and_combat_pass_verified",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-elevated-engagement-rule-slice-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

process.stdout.write(`${JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash,
  catalogueHash: slice.catalogueHash,
  runtimeHash: rulesRuntime.descriptor.runtimeHash,
  counts: audit.counts,
}, null, 2)}\n`);
