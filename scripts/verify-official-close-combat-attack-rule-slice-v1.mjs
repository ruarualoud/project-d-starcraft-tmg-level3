#!/usr/bin/env node

import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgAuthoritativeEngine } from "../packages/authoritative-engine/transition-v1.mjs";
import { createOfficialActivationPassRuleSliceV1 } from "../packages/rule-atoms/official-activation-pass-rule-slice-v1.mjs";
import { createOfficialAssaultHoldRuleSliceV1 } from "../packages/rule-atoms/official-assault-hold-rule-slice-v1.mjs";
import {
  createOfficialCloseCombatAttackRuleSliceV1,
  verifyOfficialCloseCombatAttackRuleSliceV1,
} from "../packages/rule-atoms/official-close-combat-attack-rule-slice-v1.mjs";
import { OFFICIAL_CLOSE_COMBAT_ATTACK_NEW_ATOM_IDS } from "../packages/rule-atoms/official-close-combat-attack-executor-v1.mjs";
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
const SOURCE_DIR = path.join(ROOT, "build", "source-intake", "official-rules", "command-center", "firestore");
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
    JSON.parse(await readFile(path.join(SOURCE_DIR, `${collectionId}.json`), "utf8")),
  ])));
  const snapshot = liveReport.commandSnapshot;
  return {
    snapshot,
    dataset: createOfficialCommandCenterDataset({ snapshot, firestorePayloads }),
  };
}

function model(id, xInches) {
  return {
    id,
    xInches,
    yInches: 10,
    baseShape: "round",
    baseWidthInches: 1.26,
    baseDepthInches: 1.26,
    elevation: "ground",
    supportTerrainIds: [],
    adjacentAccessPointIds: [],
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

function combatState(profileBundle) {
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
    pieces: [
      piece("p1-marines", "player1", [model("p1-fighting", 10), model("p1-supporting", 8.74)]),
      piece("p2-marines", "player2", [model("p2-fighting", 12)]),
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
const closeCombatAudit = verifyOfficialCloseCombatAttackRuleSliceV1({
  denominator,
  movementHoldSlice,
  passSlice,
  assaultHoldSlice,
  phaseInitiativeSlice,
  combatPassSlice,
  previousSlice: elevatedSlice,
  slice: closeCombatSlice,
});
const historicalRuntime = createOfficialExecutableRuleRuntimeV1({ catalogue: elevatedSlice.catalogue });
assert.equal(elevatedSlice.catalogueHash, "aa307fd28b6b89841bfb0fb68ca7096a0c8c85efd789fd71951105d399c37263");
assert.equal(historicalRuntime.descriptor.runtimeHash, "0eab90a477e91b6693ecd72406df3882be9e264578d1e70d7222d42a6056c535");
assert.equal(closeCombatAudit.counts.changedNonTargetAtoms, 0);
assert.equal(closeCombatAudit.counts.executableRuleAtoms, 53 + OFFICIAL_CLOSE_COMBAT_ATTACK_NEW_ATOM_IDS.length);
const rulesRuntime = createOfficialExecutableRuleRuntimeV1({ catalogue: closeCombatSlice.catalogue });
const refereeKeys = generateKeyPairSync("ed25519");
const engine = createStarcraftTmgAuthoritativeEngine({
  rulesRuntime,
  allowIncompleteRuleRuntimeForDevelopment: true,
  now: () => OCCURRED_AT,
  cryptoOptions: {
    ...refereeKeys,
    hmacSecret: "ticket-11-close-combat-verifier-v1",
  },
});
const { snapshot, dataset } = await officialData();
const profileBundle = createOfficialCombatProfileBundleV1({
  snapshot,
  dataset,
  recordKeys: ["army_units:marine"],
});
const initial = engine.createEnvelope({
  roomId: "official-close-combat-legal-space-room",
  dataVersion: `${dataset.dataVersions.unitsVersion}/${dataset.dataVersions.cardsVersion}/${dataset.dataVersions.rulesVersion}`,
  dependencies: {
    sourceSnapshot: { artifactId: "official-command-center-snapshot", content: snapshot },
    dataSnapshot: { artifactId: "official-combat-profile-bundle", content: profileBundle },
  },
  state: combatState(profileBundle),
});
const credentials = playerCredentials(engine, initial);
const legal = engine.legalSpace(initial, { seatAuthority: credentials.authority });
const attacks = legal.finiteActions.filter((entry) => entry.action.actionType === "fight");

assert.equal(attacks.length, 1);
assert.equal(attacks[0].action.pieceId, "p1-marines");
assert.equal(attacks[0].action.targetId, "p2-marines");
assert.equal(attacks[0].action.weaponName, "Strike");
assert.equal(attacks[0].action.closeRanksMode, "decline");
assert.deepEqual(attacks[0].action.chance, {
  kind: "fixed_roll_sequence",
  faces: 6,
  count: 4,
  layout: { hit: 2, armour: 2, evade: 0, surge: 0 },
});
assert.equal(legal.rulesRuntimeBinding.trainingTruth, false);

const preview = engine.preview({
  envelope: initial,
  seatAuthority: credentials.authority,
  proposal: { kind: "finite", actionKey: attacks[0].actionKey },
});
assert.equal(preview.ok, true);
assert.equal(preview.preview.core.chanceTicket.schemaVersion, "starcraft_tmg_chance_bundle_v1");
assert.equal(preview.preview.core.chanceTicket.tickets.length, 4);
assert.equal(preview.preview.core.result.chancePending, true);
assert.equal(preview.preview.core.result.postStateHash, null);
assert.equal(preview.preview.core.result.eventsHash, null);
assert.deepEqual(preview.preview.core.result.events, []);

const repeatedPreview = engine.preview({
  envelope: initial,
  seatAuthority: credentials.authority,
  proposal: { kind: "finite", actionKey: attacks[0].actionKey },
});
assert.equal(repeatedPreview.ok, true);
assert.deepEqual(
  repeatedPreview.preview.core.chanceTicket,
  preview.preview.core.chanceTicket,
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
  idempotencyKey: "ticket-11-close-combat-apply-v1",
});
assert.equal(applied.ok, true);
assert.equal(applied.receipt.chanceReveal.schemaVersion, "starcraft_tmg_chance_reveal_bundle_v1");
assert.equal(applied.receipt.chanceReveal.reveals.length, 4);
assert.equal(applied.receipt.events.length, 1);
assert.equal(applied.receipt.events[0].type, "close_combat_attack");
assert.equal(applied.receipt.events[0].attackPool.dice, 2);
assert.equal(applied.receipt.events[0].attackPool.rolls.length, 2);
assert.equal(applied.receipt.events[0].armourPool.unusedPreallocatedRolls.length
  + applied.receipt.events[0].armourPool.rolls.length, 2);
assert.equal(applied.receipt.eligibleForTraining, false);
const replay = engine.replay({ initialEnvelope: initial, journal: [applied.receipt] });
assert.equal(replay.ok, true);
assert.equal(replay.envelope.stateHash, applied.envelope.stateHash);

const markerTransition = rulesRuntime.apply(initial.state, attacks[0].action, {
  matchBinding: initial.matchBinding,
  postRevision: 1,
  chanceReveals: [
    { faces: 6, outcome: 6 },
    { faces: 6, outcome: 1 },
    { faces: 6, outcome: 1 },
    { faces: 6, outcome: 6 },
  ],
});
assert.equal(markerTransition.state.pieces.find((entry) => entry.id === "p2-marines").damageMarker, 1);
assert.equal(markerTransition.events[0].casualtyModelIds.length, 0);
const casualtyTransition = rulesRuntime.apply(initial.state, attacks[0].action, {
  matchBinding: initial.matchBinding,
  postRevision: 1,
  chanceReveals: [
    { faces: 6, outcome: 6 },
    { faces: 6, outcome: 6 },
    { faces: 6, outcome: 1 },
    { faces: 6, outcome: 1 },
  ],
});
const casualtyTarget = casualtyTransition.state.pieces.find((entry) => entry.id === "p2-marines");
assert.equal(casualtyTarget.isDestroyed, true);
assert.equal(casualtyTarget.currentModels, 0);
assert.deepEqual(casualtyTransition.events[0].casualtyModelIds, ["p2-fighting"]);
assert.equal(casualtyTransition.events[0].postDamageMarker, 0);

const expandedBundle = createOfficialCombatProfileBundleV1({
  snapshot,
  dataset,
  recordKeys: ["army_units:marauder", "army_units:marine"],
});
const driftEnvelope = engine.createEnvelope({
  roomId: "official-close-combat-data-drift-room",
  dataVersion: `${dataset.dataVersions.unitsVersion}/${dataset.dataVersions.cardsVersion}/${dataset.dataVersions.rulesVersion}`,
  dependencies: {
    sourceSnapshot: { artifactId: "official-command-center-snapshot", content: snapshot },
    dataSnapshot: { artifactId: "official-combat-profile-bundle", content: profileBundle },
  },
  state: combatState(expandedBundle),
});
const driftLegal = engine.legalSpace(driftEnvelope, {
  internalServerAuthority: true,
  sideKey: "player1",
});
assert.equal(driftLegal.finiteActions.some((entry) => entry.action.actionType === "fight"), false);
assert.equal(driftLegal.disabledDiagnostics.some((entry) => (
  String(entry.disabledReason).includes("CLOSE_COMBAT_ATTACK_DATA_SNAPSHOT_MISMATCH")
)), true);

const opponentAuthority = engine.issueSeatAuthority({
  grantId: "official-close-combat-opponent-grant",
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
  proposal: { kind: "finite", actionKey: attacks[0].actionKey },
});
assert.equal(opponentPreview.ok, true);
assert.equal(opponentPreview.preview.core.confirmationPolicy.requiresExplicitHuman, true);
assert.equal(opponentPreview.preview.core.result.chancePending, true);
const opponentApply = engine.apply({
  envelope: initial,
  expectedStateRevision: initial.stateRevision,
  preview: opponentPreview.preview,
  seatAuthority: opponentAuthority,
  controlLease: credentials.lease,
  idempotencyKey: "opponent-must-not-apply",
});
assert.equal(opponentApply.ok, false);
assert.equal(opponentApply.reason, "CAPABILITY_DENIED");

const replayEngine = createStarcraftTmgAuthoritativeEngine({
  rulesRuntime,
  allowIncompleteRuleRuntimeForDevelopment: true,
  now: () => OCCURRED_AT,
  cryptoOptions: {
    ...refereeKeys,
    hmacSecret: "rotated-short-term-hmac-secret-v2",
  },
});
const bindingDependencies = [
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
];
for (const [kind, content] of bindingDependencies) {
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
const crossSecretReplay = replayEngine.replay({ initialEnvelope: initial, journal: [applied.receipt] });
assert.equal(crossSecretReplay.ok, true);
assert.equal(crossSecretReplay.envelope.stateHash, applied.envelope.stateHash);

const tamperedReceipt = structuredClone(applied.receipt);
tamperedReceipt.chanceReveal.reveals[0].outcome = tamperedReceipt.chanceReveal.reveals[0].outcome === 6 ? 5 : 6;
const tamperedReplay = replayEngine.replay({ initialEnvelope: initial, journal: [tamperedReceipt] });
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");

console.log(JSON.stringify({
  schema: "starcraft_tmg_official_close_combat_attack_rule_slice_verification_v1",
  acceptancePassed: 8,
  acceptanceTotal: 8,
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  dataVersions: dataset.dataVersions,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  sliceHash: closeCombatSlice.sliceHash,
  catalogueHash: closeCombatSlice.catalogueHash,
  closeCombatRuntimeHash: rulesRuntime.descriptor.runtimeHash,
  executableRuleAtomCount: closeCombatAudit.counts.executableRuleAtoms,
  closeCombatNewRuleAtomCount: OFFICIAL_CLOSE_COMBAT_ATTACK_NEW_ATOM_IDS.length,
  rulesTruth: "single_target_no_close_ranks_simple_weapon_close_combat_executable_subset",
  trainingTruth: false,
}, null, 2));
