#!/usr/bin/env node

import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgAuthoritativeEngine } from "../packages/authoritative-engine/transition-v1.mjs";
import { createOfficialActivationPassRuleSliceV1 } from "../packages/rule-atoms/official-activation-pass-rule-slice-v1.mjs";
import { createOfficialAssaultHoldRuleSliceV1 } from "../packages/rule-atoms/official-assault-hold-rule-slice-v1.mjs";
import { createOfficialCloseCombatAttackRuleSliceV1 } from "../packages/rule-atoms/official-close-combat-attack-rule-slice-v1.mjs";
import {
  createOfficialCloseRanksCombatRuleSliceV1,
  verifyOfficialCloseRanksCombatRuleSliceV1,
} from "../packages/rule-atoms/official-close-ranks-combat-rule-slice-v1.mjs";
import {
  OFFICIAL_CLOSE_RANKS_COMBAT_NEW_ATOM_IDS,
} from "../packages/rule-atoms/official-close-ranks-combat-executor-v1.mjs";
import { createOfficialCombatPassRuleSliceV1 } from "../packages/rule-atoms/official-combat-pass-rule-slice-v1.mjs";
import { createOfficialElevatedEngagementRuleSliceV1 } from "../packages/rule-atoms/official-elevated-engagement-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialMovementHoldRuleSliceV1 } from "../packages/rule-atoms/official-movement-hold-rule-slice-v1.mjs";
import { createOfficialPhaseInitiativeRuleSliceV1 } from "../packages/rule-atoms/official-phase-initiative-rule-slice-v1.mjs";
import { createOfficialCombatProfileBundleV1 } from "../packages/source-data/official-combat-profile-bundle-v1.mjs";
import { createOfficialCommandCenterDataset } from "../packages/source-data/official-command-center-adapter-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const FIRESTORE_DIR = path.join(ROOT, "build", "source-intake", "official-rules", "command-center", "firestore");
const OCCURRED_AT = "2026-08-25T00:00:00.000Z";

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
  const snapshot = liveReport.commandSnapshot;
  return {
    snapshot,
    dataset: createOfficialCommandCenterDataset({ snapshot, firestorePayloads }),
  };
}

function model(id, xInches, yInches = 10) {
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

function piece(id, sideKey, models) {
  return {
    id,
    sideKey,
    name: "Marine",
    officialUnitRecordKey: "army_units:marine",
    formationSize: "small",
    selectedUpgradeNames: [],
    combatTag: "ground",
    currentModels: models.length,
    maxModels: models.length,
    currentSupply: 0,
    damageMarker: 0,
    statuses: [],
    combatEffects: [],
    isOnField: true,
    isDestroyed: false,
    models,
    activatedPhases: { movement: true, assault: true, combat: false },
  };
}

function combatState(profileBundle, pieces = null) {
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
    supplyDestroyedThisRound: { player1: 0, player2: 0 },
    officialCombatProfileBundle: profileBundle,
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
      terrain: [],
      accessPoints: [],
      effectMarkers: [],
    },
    cardResources: { player1: [], player2: [] },
    pieces: pieces || [
      piece("p1-marines", "player1", [model("p1-leading", 10)]),
      piece("p2-marines", "player2", [model("p2-target", 12)]),
    ],
    log: [],
  };
}

function playerCredentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({
    grantId: `${envelope.roomId}-player1-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1",
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `${envelope.roomId}-player1-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

function registeredEngine(rulesRuntime, refereeKeys) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: refereeKeys,
  });
}

function envelopeFor(engine, roomId, state, snapshot, profileBundle) {
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

const denominator = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-canonical-rule-atom-denominator-v1-report.json"),
  "utf8",
)).denominator;
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
const elevatedSlice = createOfficialElevatedEngagementRuleSliceV1({
  denominator,
  movementHoldSlice,
  passSlice,
  assaultHoldSlice,
  phaseInitiativeSlice,
  previousSlice: combatPassSlice,
});
const closeCombatSlice = createOfficialCloseCombatAttackRuleSliceV1({
  denominator,
  movementHoldSlice,
  passSlice,
  assaultHoldSlice,
  phaseInitiativeSlice,
  combatPassSlice,
  previousSlice: elevatedSlice,
});
const closeRanksSlice = createOfficialCloseRanksCombatRuleSliceV1({
  denominator,
  movementHoldSlice,
  passSlice,
  assaultHoldSlice,
  phaseInitiativeSlice,
  combatPassSlice,
  elevatedSlice,
  previousSlice: closeCombatSlice,
});
const closeRanksAudit = verifyOfficialCloseRanksCombatRuleSliceV1({
  denominator,
  movementHoldSlice,
  passSlice,
  assaultHoldSlice,
  phaseInitiativeSlice,
  combatPassSlice,
  elevatedSlice,
  previousSlice: closeCombatSlice,
  slice: closeRanksSlice,
});
const historicalRuntime = createOfficialExecutableRuleRuntimeV1({ catalogue: closeCombatSlice.catalogue });
const rulesRuntime = createOfficialExecutableRuleRuntimeV1({ catalogue: closeRanksSlice.catalogue });

assert.equal(historicalRuntime.descriptor.catalogueHash, "13e9446504b80ee73e279537ee239a02a2ba4a6bb5cb5e1da4cb6c4ed85d795d");
assert.equal(historicalRuntime.descriptor.runtimeHash, "b0ac1cdd4aa9f2e11d5b3784fd444488278525b9de694746c693dd062612c69a");
assert.equal(closeRanksAudit.counts.changedNonTargetAtoms, 0);
assert.equal(closeRanksAudit.counts.versionReassignedAttackAtoms, 48);
assert.equal(closeRanksAudit.counts.executableRuleAtoms, 101 + OFFICIAL_CLOSE_RANKS_COMBAT_NEW_ATOM_IDS.length);

const { snapshot, dataset } = await officialData();
assert.deepEqual(snapshot.dataVersions, { cardsVersion: "69", rulesVersion: "48", unitsVersion: "71" });
const profileBundle = createOfficialCombatProfileBundleV1({
  snapshot,
  dataset,
  recordKeys: ["army_units:marine"],
});
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const refereeKeys = {
  keyId: "ticket-11-close-ranks-referee-v1",
  privateKey,
  publicKey,
  hmacSecret: "ticket-11-close-ranks-short-term-seal-v1",
};
const engine = registeredEngine(rulesRuntime, refereeKeys);
const initial = envelopeFor(
  engine,
  "official-close-ranks-room",
  combatState(profileBundle),
  snapshot,
  profileBundle,
);
const credentials = playerCredentials(engine, initial);
const legal = engine.legalSpace(initial, { seatAuthority: credentials.authority });
const declineFight = legal.finiteActions.find((entry) => entry.action.actionType === "fight");
const closeRanksDomain = legal.parameterDomains.find((entry) => entry.parameterKind === "official_close_ranks_single_model_path_v1");
assert.ok(declineFight);
assert.ok(closeRanksDomain);
assert.equal(closeRanksDomain.actionType, "fight");
assert.equal(closeRanksDomain.constraints.maxDistanceMilliInches, 3000);
assert.equal(closeRanksDomain.constraints.leadingModelId, "p1-leading");

const closeRanksProposal = {
  kind: "parameterized",
  domainId: closeRanksDomain.domainId,
  parameters: { path: [{ xMilliInches: 10500, yMilliInches: 10000 }] },
};
const preview = engine.preview({
  envelope: initial,
  seatAuthority: credentials.authority,
  proposal: closeRanksProposal,
});
assert.equal(preview.ok, true, JSON.stringify(preview));
assert.equal(preview.preview.core.action.closeRanksMode, "move");
assert.equal(preview.preview.core.action.closeRanksPlan.canonicalPath.distanceMilliInches, 500);
assert.equal(preview.preview.core.result.chancePending, true);
assert.equal(preview.preview.core.result.events.length, 0);
assert.equal(preview.preview.core.chanceTicket.tickets.length, 2);
assert.ok(preview.preview.core.chanceTicket.tickets.every((ticket) => ticket.outcomeHidden === true));

const repeatedPreview = engine.preview({
  envelope: initial,
  seatAuthority: credentials.authority,
  proposal: closeRanksProposal,
});
assert.equal(repeatedPreview.ok, true);
assert.deepEqual(
  repeatedPreview.preview.core.chanceTicket.tickets.map((ticket) => ticket.commitment),
  preview.preview.core.chanceTicket.tickets.map((ticket) => ticket.commitment),
);

const confirmed = engine.confirmPreview({
  envelope: initial,
  preview: preview.preview,
  seatAuthority: credentials.authority,
});
assert.equal(confirmed.ok, true);
const applied = engine.apply({
  envelope: initial,
  expectedStateRevision: initial.stateRevision,
  preview: preview.preview,
  confirmation: confirmed.confirmation,
  seatAuthority: credentials.authority,
  controlLease: credentials.lease,
  idempotencyKey: "ticket-11-close-ranks-apply-v1",
});
assert.equal(applied.ok, true);
assert.deepEqual(applied.receipt.events.map((event) => event.type), ["close_ranks", "close_combat_attack"]);
assert.equal(applied.envelope.state.pieces.find((entry) => entry.id === "p1-marines").models[0].xInches, 10.5);
assert.equal(applied.receipt.events[1].closeRanksMode, "move");
assert.match(applied.envelope.state.combatPhaseStartEngagementSnapshot.snapshotHash, /^[a-f0-9]{64}$/u);
assert.equal(applied.receipt.eligibleForTraining, false);
const replay = engine.replay({ initialEnvelope: initial, journal: [applied.receipt] });
assert.equal(replay.ok, true);
assert.equal(replay.envelope.stateHash, applied.envelope.stateHash);

const opponentAuthority = engine.issueSeatAuthority({
  grantId: "official-close-ranks-opponent-grant",
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
  proposal: closeRanksProposal,
});
assert.equal(opponentPreview.ok, true);
assert.equal(opponentPreview.preview.core.confirmationPolicy.requiresExplicitHuman, true);
const opponentApply = engine.apply({
  envelope: initial,
  expectedStateRevision: initial.stateRevision,
  preview: opponentPreview.preview,
  seatAuthority: opponentAuthority,
  controlLease: credentials.lease,
  idempotencyKey: "close-ranks-opponent-must-not-apply",
});
assert.equal(opponentApply.ok, false);
assert.equal(opponentApply.reason, "CAPABILITY_DENIED");

const replayEngine = registeredEngine(rulesRuntime, {
  ...refereeKeys,
  hmacSecret: "ticket-11-close-ranks-rotated-short-term-seal-v2",
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
const rotatedSecretReplay = replayEngine.replay({ initialEnvelope: initial, journal: [applied.receipt] });
assert.equal(rotatedSecretReplay.ok, true);
assert.equal(rotatedSecretReplay.envelope.stateHash, applied.envelope.stateHash);

const tamperedSnapshotState = combatState(profileBundle);
tamperedSnapshotState.combatPhaseStartEngagementSnapshot = {
  schemaVersion: "starcraft_tmg_combat_phase_start_engagement_snapshot_v1",
  round: 1,
  phase: "combat",
  units: [],
  snapshotHash: "0".repeat(64),
};
const tamperedSnapshotEnvelope = envelopeFor(
  engine,
  "official-close-ranks-tampered-snapshot-room",
  tamperedSnapshotState,
  snapshot,
  profileBundle,
);
const tamperedSnapshotLegal = engine.legalSpace(tamperedSnapshotEnvelope, {
  internalServerAuthority: true,
  sideKey: "player1",
});
assert.equal(tamperedSnapshotLegal.parameterDomains.length, 0);
assert.equal(tamperedSnapshotLegal.finiteActions.some((entry) => entry.action.actionType === "fight"), false);
assert.equal(tamperedSnapshotLegal.disabledDiagnostics.some((entry) => (
  String(entry.disabledReason).includes("CLOSE_RANKS_PHASE_START_SNAPSHOT_INVALID")
)), true);

for (const [id, pathPoints, message] of [
  ["over-three-inches", [{ xMilliInches: 13100, yMilliInches: 10000 }], /exceeds 3 inches/u],
  ["not-closer", [{ xMilliInches: 9500, yMilliInches: 10000 }], /must end closer/u],
]) {
  const rejected = engine.preview({
    envelope: initial,
    seatAuthority: credentials.authority,
    proposal: { kind: "parameterized", domainId: closeRanksDomain.domainId, parameters: { path: pathPoints } },
  });
  assert.equal(rejected.ok, false, id);
  assert.equal(rejected.reason, "PROPOSAL_INVALID", id);
  assert.match(rejected.message, message, id);
}

const newEnemyState = combatState(profileBundle, [
  piece("p1-marines", "player1", [model("p1-leading", 10)]),
  piece("p2-marines", "player2", [model("p2-target", 12)]),
  piece("p2-flank", "player2", [model("p2-flank-model", 12.5, 12)]),
]);
const newEnemyEnvelope = envelopeFor(engine, "official-close-ranks-new-enemy-room", newEnemyState, snapshot, profileBundle);
const newEnemyCredentials = playerCredentials(engine, newEnemyEnvelope);
const newEnemyLegal = engine.legalSpace(newEnemyEnvelope, { seatAuthority: newEnemyCredentials.authority });
const newEnemyDomain = newEnemyLegal.parameterDomains.find((entry) => entry.parameterKind === "official_close_ranks_single_model_path_v1");
assert.ok(newEnemyDomain);
const newEnemyPreview = engine.preview({
  envelope: newEnemyEnvelope,
  seatAuthority: newEnemyCredentials.authority,
  proposal: {
    kind: "parameterized",
    domainId: newEnemyDomain.domainId,
    parameters: { path: [{ xMilliInches: 10800, yMilliInches: 11000 }] },
  },
});
assert.equal(newEnemyPreview.ok, false);
assert.equal(newEnemyPreview.reason, "PROPOSAL_INVALID");
assert.match(newEnemyPreview.message, /new Enemy Unit/u);

const collisionState = combatState(profileBundle, [
  piece("p1-marines", "player1", [model("p1-leading", 10)]),
  piece("p1-blocker", "player1", [model("p1-blocker-model", 10.25, 11.25)]),
  piece("p2-marines", "player2", [model("p2-target", 12)]),
]);
const collisionEnvelope = envelopeFor(engine, "official-close-ranks-collision-room", collisionState, snapshot, profileBundle);
const collisionCredentials = playerCredentials(engine, collisionEnvelope);
const collisionLegal = engine.legalSpace(collisionEnvelope, { seatAuthority: collisionCredentials.authority });
const collisionDomain = collisionLegal.parameterDomains.find((entry) => entry.parameterKind === "official_close_ranks_single_model_path_v1" && entry.pieceId === "p1-marines");
assert.ok(collisionDomain);
const collisionPreview = engine.preview({
  envelope: collisionEnvelope,
  seatAuthority: collisionCredentials.authority,
  proposal: {
    kind: "parameterized",
    domainId: collisionDomain.domainId,
    parameters: { path: [{ xMilliInches: 10500, yMilliInches: 10000 }] },
  },
});
assert.equal(collisionPreview.ok, false);
assert.match(collisionPreview.message, /collides/u);

const pinnedEnvelope = envelopeFor(engine, "official-close-ranks-pinned-room", combatState(profileBundle, [
  piece("p1-marines", "player1", [model("p1-leading", 10)]),
  piece("p2-marines", "player2", [model("p2-target", 11.26)]),
]), snapshot, profileBundle);
const pinnedLegal = engine.legalSpace(pinnedEnvelope, { internalServerAuthority: true, sideKey: "player1" });
assert.equal(pinnedLegal.parameterDomains.some((entry) => entry.parameterKind === "official_close_ranks_single_model_path_v1"), false);
assert.equal(pinnedLegal.finiteActions.some((entry) => entry.action.actionType === "fight"), true);
assert.equal(pinnedLegal.disabledDiagnostics.some((entry) => String(entry.disabledReason).includes("CLOSE_RANKS_PINNED_MODEL")), true);

const multiModelEnvelope = envelopeFor(engine, "official-close-ranks-multi-model-room", combatState(profileBundle, [
  piece("p1-marines", "player1", [model("p1-fighting", 10), model("p1-supporting", 8.74)]),
  piece("p2-marines", "player2", [model("p2-target", 12)]),
]), snapshot, profileBundle);
const multiModelLegal = engine.legalSpace(multiModelEnvelope, { internalServerAuthority: true, sideKey: "player1" });
assert.equal(multiModelLegal.parameterDomains.some((entry) => entry.parameterKind === "official_close_ranks_single_model_path_v1"), false);
assert.equal(multiModelLegal.finiteActions.some((entry) => entry.action.actionType === "fight"), true);
assert.equal(multiModelLegal.disabledDiagnostics.some((entry) => String(entry.disabledReason).includes("CLOSE_RANKS_MULTI_MODEL_PLACEMENT_PENDING")), true);

const report = {
  schema: "starcraft_tmg_official_close_ranks_combat_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: 10,
  acceptanceTotal: 10,
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  dataVersions: dataset.dataVersions,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  slice: closeRanksSlice,
  audit: closeRanksAudit,
  runtime: rulesRuntime.descriptor,
  ctx2skill: closeRanksSlice.ctx2skill,
  harness: closeRanksSlice.harness,
  rulesTruth: "single_model_exact_path_close_ranks_plus_close_combat_attack",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-close-ranks-combat-rule-slice-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  dataVersions: dataset.dataVersions,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  sliceHash: closeRanksSlice.sliceHash,
  catalogueHash: closeRanksSlice.catalogueHash,
  closeRanksRuntimeHash: rulesRuntime.descriptor.runtimeHash,
  executableRuleAtomCount: closeRanksAudit.counts.executableRuleAtoms,
  closeRanksNewRuleAtomCount: OFFICIAL_CLOSE_RANKS_COMBAT_NEW_ATOM_IDS.length,
  rulesTruth: report.rulesTruth,
  trainingTruth: false,
}, null, 2));
