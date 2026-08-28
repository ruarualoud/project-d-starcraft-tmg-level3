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
import {
  OFFICIAL_MULTI_MODEL_CLOSE_RANKS_NEW_ATOM_IDS,
  OFFICIAL_MULTI_MODEL_CLOSE_RANKS_PARAMETER_KIND,
} from "../packages/rule-atoms/official-multi-model-close-ranks-combat-executor-v1.mjs";
import {
  createOfficialMultiModelCloseRanksRuleSliceV1,
  verifyOfficialMultiModelCloseRanksRuleSliceV1,
} from "../packages/rule-atoms/official-multi-model-close-ranks-rule-slice-v1.mjs";
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
    currentSupply: models.length >= 7 ? 2 : 0,
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
      piece("p1-marines", "player1", [
        model("p1-leading", 10, 10),
        model("p1-two", 10.5, 11.3),
        model("p1-three", 9, 11.5),
        model("p1-four", 8.5, 10),
        model("p1-five", 9, 8.5),
        model("p1-six", 10.5, 8.7),
        model("p1-seven", 7, 11),
      ]),
      piece("p2-marines", "player2", [model("p2-target", 12, 10)]),
    ],
    log: [],
  };
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
const assaultHoldSlice = createOfficialAssaultHoldRuleSliceV1({ denominator, movementHoldSlice, previousSlice: passSlice });
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
const multiModelSlice = createOfficialMultiModelCloseRanksRuleSliceV1({
  denominator,
  movementHoldSlice,
  passSlice,
  assaultHoldSlice,
  phaseInitiativeSlice,
  combatPassSlice,
  elevatedSlice,
  closeCombatSlice,
  previousSlice: closeRanksSlice,
});
const audit = verifyOfficialMultiModelCloseRanksRuleSliceV1({
  denominator,
  movementHoldSlice,
  passSlice,
  assaultHoldSlice,
  phaseInitiativeSlice,
  combatPassSlice,
  elevatedSlice,
  closeCombatSlice,
  previousSlice: closeRanksSlice,
  slice: multiModelSlice,
});
assert.equal(audit.counts.executableRuleAtoms, 116 + OFFICIAL_MULTI_MODEL_CLOSE_RANKS_NEW_ATOM_IDS.length);
assert.equal(audit.counts.changedNonTargetAtoms, 0);

const historicalRuntime = createOfficialExecutableRuleRuntimeV1({ catalogue: closeRanksSlice.catalogue });
assert.equal(historicalRuntime.descriptor.runtimeHash, "00629183ae15464fd003d5a3c31cb3b1719540399f71870e300cadd6689f89de");
const rulesRuntime = createOfficialExecutableRuleRuntimeV1({ catalogue: multiModelSlice.catalogue });
const { snapshot, dataset } = await officialData();
assert.deepEqual(snapshot.dataVersions, { cardsVersion: "69", rulesVersion: "48", unitsVersion: "71" });
const profileBundle = createOfficialCombatProfileBundleV1({
  snapshot,
  dataset,
  recordKeys: ["army_units:marine"],
});
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const refereeKeys = {
  keyId: "ticket-11-multi-model-close-ranks-referee-v1",
  privateKey,
  publicKey,
  hmacSecret: "ticket-11-multi-model-close-ranks-seal-v1",
};
const engine = registeredEngine(rulesRuntime, refereeKeys);
const initial = envelopeFor(engine, "official-multi-model-close-ranks-room", combatState(profileBundle), snapshot, profileBundle);
const credentials = playerCredentials(engine, initial);
const legal = engine.legalSpace(initial, { seatAuthority: credentials.authority });
const domain = legal.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_MULTI_MODEL_CLOSE_RANKS_PARAMETER_KIND
));
assert.ok(domain);
assert.deepEqual(domain.constraints.eligibleLeadingModelIds, [
  "p1-five",
  "p1-four",
  "p1-leading",
  "p1-seven",
  "p1-six",
  "p1-three",
  "p1-two",
]);

const proposal = {
  kind: "parameterized",
  domainId: domain.domainId,
  parameters: {
    leadingModelId: "p1-leading",
    path: [
      { xMilliInches: 10500, yMilliInches: 11300 },
      { xMilliInches: 10740, yMilliInches: 10000 },
    ],
    placements: [
      { modelId: "p1-two", xMilliInches: 11370, yMilliInches: 11091 },
      { modelId: "p1-three", xMilliInches: 12630, yMilliInches: 11091 },
      { modelId: "p1-four", xMilliInches: 13260, yMilliInches: 10000 },
      { modelId: "p1-five", xMilliInches: 12630, yMilliInches: 8909 },
      { modelId: "p1-six", xMilliInches: 11370, yMilliInches: 8909 },
      { modelId: "p1-seven", xMilliInches: 9480, yMilliInches: 10000 },
    ],
  },
};
const preview = engine.preview({ envelope: initial, seatAuthority: credentials.authority, proposal });
assert.equal(preview.ok, true, JSON.stringify(preview));
assert.equal(preview.preview.core.action.closeRanksPlan.leadingModelId, "p1-leading");
assert.deepEqual(
  preview.preview.core.action.closeRanksPlan.placementSequence.map((entry) => entry.prioritySatisfied),
  ["enemy_base_contact", "enemy_base_contact", "enemy_base_contact", "enemy_base_contact", "enemy_base_contact", "friendly_fighting_rank_contact"],
);
assert.equal(preview.preview.core.result.chancePending, true);
assert.ok(preview.preview.core.chanceTicket.tickets.every((ticket) => ticket.outcomeHidden === true));
const repeatedPreview = engine.preview({ envelope: initial, seatAuthority: credentials.authority, proposal });
assert.equal(repeatedPreview.ok, true);
assert.deepEqual(
  repeatedPreview.preview.core.chanceTicket.tickets.map((ticket) => ticket.commitment),
  preview.preview.core.chanceTicket.tickets.map((ticket) => ticket.commitment),
);

const skippedEnemyContactProposal = structuredClone(proposal);
skippedEnemyContactProposal.parameters.placements[0] = {
  modelId: "p1-two",
  xMilliInches: 9480,
  yMilliInches: 10000,
};
const skippedEnemyContact = engine.preview({
  envelope: initial,
  seatAuthority: credentials.authority,
  proposal: skippedEnemyContactProposal,
});
assert.equal(skippedEnemyContact.ok, false);
assert.equal(skippedEnemyContact.reason, "PROPOSAL_INVALID");
assert.match(skippedEnemyContact.message, /CLOSE_RANKS_ENEMY_CONTACT_REQUIRED/u);

const skippedFriendlyContactProposal = structuredClone(proposal);
skippedFriendlyContactProposal.parameters.placements[5] = {
  modelId: "p1-seven",
  xMilliInches: 9480,
  yMilliInches: 11500,
};
const skippedFriendlyContact = engine.preview({
  envelope: initial,
  seatAuthority: credentials.authority,
  proposal: skippedFriendlyContactProposal,
});
assert.equal(skippedFriendlyContact.ok, false);
assert.equal(skippedFriendlyContact.reason, "PROPOSAL_INVALID");
assert.match(skippedFriendlyContact.message, /CLOSE_RANKS_FRIENDLY_CONTACT_REQUIRED/u);

const wrongPlacementOrderProposal = structuredClone(proposal);
wrongPlacementOrderProposal.parameters.placements = [
  wrongPlacementOrderProposal.parameters.placements[5],
  ...wrongPlacementOrderProposal.parameters.placements.slice(0, 5),
];
const wrongPlacementOrder = engine.preview({
  envelope: initial,
  seatAuthority: credentials.authority,
  proposal: wrongPlacementOrderProposal,
});
assert.equal(wrongPlacementOrder.ok, false);
assert.match(wrongPlacementOrder.message, /CLOSE_RANKS_ENEMY_CONTACT_REQUIRED/u);

const overlapProposal = structuredClone(proposal);
overlapProposal.parameters.placements[0] = {
  modelId: "p1-two",
  xMilliInches: 10740,
  yMilliInches: 10000,
};
const overlapPreview = engine.preview({
  envelope: initial,
  seatAuthority: credentials.authority,
  proposal: overlapProposal,
});
assert.equal(overlapPreview.ok, false);
assert.match(overlapPreview.message, /CLOSE_RANKS_PLACEMENT_ILLEGAL/u);

const confirmed = engine.confirmPreview({ envelope: initial, preview: preview.preview, seatAuthority: credentials.authority });
assert.equal(confirmed.ok, true);
const applied = engine.apply({
  envelope: initial,
  expectedStateRevision: initial.stateRevision,
  preview: preview.preview,
  confirmation: confirmed.confirmation,
  seatAuthority: credentials.authority,
  controlLease: credentials.lease,
  idempotencyKey: "ticket-11-multi-model-close-ranks-apply-v1",
});
assert.equal(applied.ok, true);
assert.deepEqual(applied.receipt.events.map((event) => event.type), ["close_ranks", "close_combat_attack"]);
assert.equal(applied.receipt.events[0].placementCounts.enemyBaseContact, 5);
assert.equal(applied.receipt.events[0].placementCounts.friendlyFightingRankContact, 1);
const moved = applied.envelope.state.pieces.find((entry) => entry.id === "p1-marines");
assert.deepEqual(moved.models.map((entry) => [entry.id, entry.xInches, entry.yInches]), [
  ["p1-leading", 10.74, 10],
  ["p1-two", 11.37, 11.091],
  ["p1-three", 12.63, 11.091],
  ["p1-four", 13.26, 10],
  ["p1-five", 12.63, 8.909],
  ["p1-six", 11.37, 8.909],
  ["p1-seven", 9.48, 10],
]);
const replay = engine.replay({ initialEnvelope: initial, journal: [applied.receipt] });
assert.equal(replay.ok, true);
assert.equal(replay.envelope.stateHash, applied.envelope.stateHash);

const opponentAuthority = engine.issueSeatAuthority({
  grantId: "official-multi-model-close-ranks-opponent-grant",
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
  proposal,
});
assert.equal(opponentPreview.ok, true);
assert.equal(opponentPreview.preview.core.confirmationPolicy.requiresExplicitHuman, true);
const opponentApply = engine.apply({
  envelope: initial,
  expectedStateRevision: initial.stateRevision,
  preview: opponentPreview.preview,
  seatAuthority: opponentAuthority,
  controlLease: credentials.lease,
  idempotencyKey: "multi-model-close-ranks-opponent-must-not-apply",
});
assert.equal(opponentApply.ok, false);
assert.equal(opponentApply.reason, "CAPABILITY_DENIED");

const replayEngine = registeredEngine(rulesRuntime, {
  ...refereeKeys,
  hmacSecret: "ticket-11-multi-model-close-ranks-rotated-seal-v2",
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
const rotatedReplay = replayEngine.replay({ initialEnvelope: initial, journal: [applied.receipt] });
assert.equal(rotatedReplay.ok, true);
assert.equal(rotatedReplay.envelope.stateHash, applied.envelope.stateHash);

const pinnedState = combatState(profileBundle);
const pinnedPiece = pinnedState.pieces.find((entry) => entry.id === "p1-marines");
Object.assign(pinnedPiece.models.find((entry) => entry.id === "p1-leading"), {
  xInches: 10.74,
  yInches: 10,
});
Object.assign(pinnedPiece.models.find((entry) => entry.id === "p1-two"), {
  xInches: 10,
  yInches: 11.8,
});
const pinnedEnvelope = envelopeFor(
  engine,
  "official-multi-model-close-ranks-pinned-room",
  pinnedState,
  snapshot,
  profileBundle,
);
const pinnedCredentials = playerCredentials(engine, pinnedEnvelope);
const pinnedLegal = engine.legalSpace(pinnedEnvelope, { seatAuthority: pinnedCredentials.authority });
const pinnedDomain = pinnedLegal.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_MULTI_MODEL_CLOSE_RANKS_PARAMETER_KIND
));
assert.ok(pinnedDomain);
assert.deepEqual(pinnedDomain.constraints.pinnedModelIds, ["p1-leading"]);
assert.equal(pinnedDomain.constraints.eligibleLeadingModelIds.includes("p1-leading"), false);
const pinnedProposal = {
  kind: "parameterized",
  domainId: pinnedDomain.domainId,
  parameters: {
    leadingModelId: "p1-two",
    path: [{ xMilliInches: 11370, yMilliInches: 11091 }],
    placements: [
      { modelId: "p1-three", xMilliInches: 12630, yMilliInches: 11091 },
      { modelId: "p1-four", xMilliInches: 13260, yMilliInches: 10000 },
      { modelId: "p1-five", xMilliInches: 12630, yMilliInches: 8909 },
      { modelId: "p1-six", xMilliInches: 11370, yMilliInches: 8909 },
      { modelId: "p1-seven", xMilliInches: 9480, yMilliInches: 10000 },
    ],
  },
};
const pinnedPreview = engine.preview({
  envelope: pinnedEnvelope,
  seatAuthority: pinnedCredentials.authority,
  proposal: pinnedProposal,
});
assert.equal(pinnedPreview.ok, true, JSON.stringify(pinnedPreview));
assert.deepEqual(pinnedPreview.preview.core.action.closeRanksPlan.placementCounts, {
  enemyBaseContact: 4,
  friendlyFightingRankContact: 1,
  coherencyOnly: 0,
  pinned: 1,
});
assert.equal(
  pinnedPreview.preview.core.action.closeRanksPlan.pinnedModelIds.includes(
    pinnedPreview.preview.core.action.closeRanksPlan.leadingModelId,
  ),
  false,
);

const pinnedLeadingProposal = structuredClone(pinnedProposal);
pinnedLeadingProposal.parameters.leadingModelId = "p1-leading";
const pinnedLeadingPreview = engine.preview({
  envelope: pinnedEnvelope,
  seatAuthority: pinnedCredentials.authority,
  proposal: pinnedLeadingProposal,
});
assert.equal(pinnedLeadingPreview.ok, false);
assert.match(pinnedLeadingPreview.message, /CLOSE_RANKS_LEADING_MODEL_INVALID/u);

const singleState = combatState(profileBundle);
singleState.pieces[0] = piece("p1-marines", "player1", [model("p1-single", 10, 10)]);
const singleEnvelope = envelopeFor(
  engine,
  "official-multi-model-runtime-single-model-room",
  singleState,
  snapshot,
  profileBundle,
);
const singleCredentials = playerCredentials(engine, singleEnvelope);
const singleLegal = engine.legalSpace(singleEnvelope, { seatAuthority: singleCredentials.authority });
const singleDomain = singleLegal.parameterDomains.find((entry) => (
  entry.parameterKind === "official_close_ranks_single_model_path_v1"
));
assert.ok(singleDomain);
assert.equal(singleLegal.parameterDomains.some((entry) => (
  entry.parameterKind === OFFICIAL_MULTI_MODEL_CLOSE_RANKS_PARAMETER_KIND
)), false);
const singlePreview = engine.preview({
  envelope: singleEnvelope,
  seatAuthority: singleCredentials.authority,
  proposal: {
    kind: "parameterized",
    domainId: singleDomain.domainId,
    parameters: { path: [{ xMilliInches: 10500, yMilliInches: 10000 }] },
  },
});
assert.equal(singlePreview.ok, true, JSON.stringify(singlePreview));
assert.equal(singlePreview.preview.core.action.executorId, "authority.close-combat-attack-v3");
assert.equal(singlePreview.preview.core.action.closeRanksPlan.supportedScope, "single_model_round_base_ground_no_terrain_v1");
const singleConfirmed = engine.confirmPreview({
  envelope: singleEnvelope,
  preview: singlePreview.preview,
  seatAuthority: singleCredentials.authority,
});
assert.equal(singleConfirmed.ok, true);
const singleApplied = engine.apply({
  envelope: singleEnvelope,
  expectedStateRevision: singleEnvelope.stateRevision,
  preview: singlePreview.preview,
  confirmation: singleConfirmed.confirmation,
  seatAuthority: singleCredentials.authority,
  controlLease: singleCredentials.lease,
  idempotencyKey: "ticket-11-v3-single-model-close-ranks-apply-v1",
});
assert.equal(singleApplied.ok, true, JSON.stringify(singleApplied));
assert.deepEqual(singleApplied.receipt.events.map((event) => event.type), ["close_ranks", "close_combat_attack"]);
const singleReplay = engine.replay({ initialEnvelope: singleEnvelope, journal: [singleApplied.receipt] });
assert.equal(singleReplay.ok, true);
assert.equal(singleReplay.envelope.stateHash, singleApplied.envelope.stateHash);

assert.throws(() => createOfficialMultiModelCloseRanksRuleSliceV1({
  denominator,
  movementHoldSlice,
  passSlice,
  assaultHoldSlice,
  phaseInitiativeSlice,
  combatPassSlice,
  elevatedSlice,
  closeCombatSlice,
  previousSlice: {
    ...closeRanksSlice,
    catalogueHash: "0".repeat(64),
  },
}), /official_close_ranks_slice_hash_mismatch|catalogue/u);

const report = {
  schema: "starcraft_tmg_official_multi_model_close_ranks_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: 10,
  acceptanceTotal: 10,
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  dataVersions: dataset.dataVersions,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  slice: multiModelSlice,
  audit,
  runtime: rulesRuntime.descriptor,
  ctx2skill: {
    ...multiModelSlice.ctx2skill,
    crossTimeReplayResult: "passed_multi_model_formation_and_rotated_hmac_replay",
  },
  harness: multiModelSlice.harness,
  rulesTruth: "ordered_multi_model_contact_priority_close_ranks_plus_close_combat_attack",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-multi-model-close-ranks-rule-slice-v1-report.json"),
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
  sliceHash: multiModelSlice.sliceHash,
  catalogueHash: multiModelSlice.catalogueHash,
  multiModelRuntimeHash: rulesRuntime.descriptor.runtimeHash,
  executableRuleAtomCount: audit.counts.executableRuleAtoms,
  newlyExecutableRuleAtomCount: OFFICIAL_MULTI_MODEL_CLOSE_RANKS_NEW_ATOM_IDS.length,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  rulesTruth: report.rulesTruth,
  trainingTruth: false,
}, null, 2));
