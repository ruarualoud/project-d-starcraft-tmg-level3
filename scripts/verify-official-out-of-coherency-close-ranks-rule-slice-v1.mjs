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
import { createOfficialMovementHoldRuleSliceV1 } from "../packages/rule-atoms/official-movement-hold-rule-slice-v1.mjs";
import { createOfficialMultiModelCloseRanksRuleSliceV1 } from "../packages/rule-atoms/official-multi-model-close-ranks-rule-slice-v1.mjs";
import {
  OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_NEW_ATOM_IDS,
  OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_PARAMETER_KIND,
} from "../packages/rule-atoms/official-out-of-coherency-close-ranks-combat-executor-v1.mjs";
import {
  createOfficialOutOfCoherencyCloseRanksRuleSliceV1,
  verifyOfficialOutOfCoherencyCloseRanksRuleSliceV1,
} from "../packages/rule-atoms/official-out-of-coherency-close-ranks-rule-slice-v1.mjs";
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

function model(id, xInches, yInches = 0.63) {
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

function piece(id, sideKey, models, { currentSupply, combatActivated = false } = {}) {
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
    currentSupply,
    damageMarker: 0,
    statuses: [],
    combatEffects: [],
    isOnField: true,
    isDestroyed: false,
    models,
    activatedPhases: { movement: true, assault: true, combat: combatActivated },
  };
}

function fallbackAndCasualtyState(profileBundle) {
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
      widthInches: 14.45,
      heightInches: 1.26,
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
        model("p1-leading", 8.2),
        model("p1-one", 0.63),
        model("p1-two", 1.93),
        model("p1-three", 3.23),
        model("p1-four", 6.4),
        model("p1-five", 11.5),
        model("p1-six", 12.8),
      ], { currentSupply: 2 }),
      piece("p2-target", "player2", [model("p2-target-model", 10.04)], {
        currentSupply: 0,
      }),
      piece("p1-link-blocker", "player1", [model("p1-link-blocker-model", 5)], {
        currentSupply: 0,
      }),
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
  const passSlice = createOfficialActivationPassRuleSliceV1({
    denominator,
    previousSlice: movementHoldSlice,
  });
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
  const outOfCoherencySlice = createOfficialOutOfCoherencyCloseRanksRuleSliceV1({
    denominator,
    movementHoldSlice,
    passSlice,
    assaultHoldSlice,
    phaseInitiativeSlice,
    combatPassSlice,
    elevatedSlice,
    closeCombatSlice,
    closeRanksSlice,
    previousSlice: multiModelSlice,
  });
  return {
    movementHoldSlice,
    passSlice,
    assaultHoldSlice,
    phaseInitiativeSlice,
    combatPassSlice,
    elevatedSlice,
    closeCombatSlice,
    closeRanksSlice,
    multiModelSlice,
    outOfCoherencySlice,
  };
}

const denominator = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-canonical-rule-atom-denominator-v1-report.json"),
  "utf8",
)).denominator;
const slices = buildSliceChain(denominator);
const audit = verifyOfficialOutOfCoherencyCloseRanksRuleSliceV1({
  denominator,
  ...slices,
  previousSlice: slices.multiModelSlice,
  slice: slices.outOfCoherencySlice,
});
assert.equal(
  audit.counts.executableRuleAtoms,
  123 + OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_NEW_ATOM_IDS.length,
);

const { snapshot, dataset } = await officialData();
assert.deepEqual(dataset.dataVersions, { cardsVersion: "69", rulesVersion: "48", unitsVersion: "71" });
const profileBundle = createOfficialCombatProfileBundleV1({
  snapshot,
  dataset,
  recordKeys: ["army_units:marine"],
});
const rulesRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: slices.outOfCoherencySlice.catalogue,
});
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const engine = createStarcraftTmgAuthoritativeEngine({
  rulesRuntime,
  allowIncompleteRuleRuntimeForDevelopment: true,
  now: () => OCCURRED_AT,
  cryptoOptions: {
    keyId: "ticket-11-out-of-coherency-close-ranks-referee-v1",
    privateKey,
    publicKey,
    hmacSecret: "ticket-11-out-of-coherency-close-ranks-seal-v1",
  },
});
const initial = engine.createEnvelope({
  roomId: "official-out-of-coherency-close-ranks-room",
  dataVersion: `${snapshot.dataVersions.unitsVersion}/${snapshot.dataVersions.cardsVersion}/${snapshot.dataVersions.rulesVersion}`,
  dependencies: {
    sourceSnapshot: { artifactId: "official-command-center-snapshot", content: snapshot },
    dataSnapshot: { artifactId: "official-combat-profile-bundle", content: profileBundle },
  },
  state: fallbackAndCasualtyState(profileBundle),
});
const authority = engine.issueSeatAuthority({
  grantId: "out-of-coherency-player1-grant",
  roomId: initial.roomId,
  matchBindingHash: initial.matchBindingHash,
  seatKey: "player1",
  roleMode: "player",
  principalType: "human",
  capabilities: ["read_legal_space", "preview", "confirm", "apply"],
});
const lease = engine.issueControlLease({
  seatAuthority: authority,
  sessionId: "out-of-coherency-player1-session",
  leaseFence: 1,
  issuedAtRoomRevision: initial.stateRevision,
});
const legal = engine.legalSpace(initial, { seatAuthority: authority });
const domain = legal.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_PARAMETER_KIND
));
assert.ok(domain);
assert.deepEqual(domain.constraints.linkBlockingUnitIds, ["p1-link-blocker"]);

const proposal = {
  kind: "parameterized",
  domainId: domain.domainId,
  parameters: {
    leadingModelId: "p1-leading",
    path: [{ xMilliInches: 8780, yMilliInches: 630 }],
    placements: [
      { modelId: "p1-one", outcome: "placed", xMilliInches: 11300, yMilliInches: 630 },
      { modelId: "p1-two", outcome: "placed", xMilliInches: 7520, yMilliInches: 630 },
      { modelId: "p1-three", outcome: "placed", xMilliInches: 6260, yMilliInches: 630 },
      { modelId: "p1-four", outcome: "placed", xMilliInches: 12560, yMilliInches: 630 },
      { modelId: "p1-five", outcome: "placed", xMilliInches: 13820, yMilliInches: 630 },
      { modelId: "p1-six", outcome: "casualty" },
    ],
  },
};
const preview = engine.preview({ envelope: initial, seatAuthority: authority, proposal });
assert.equal(preview.ok, true, JSON.stringify(preview));
const plan = preview.preview.core.action.closeRanksPlan;
assert.equal(plan.outOfCoherency, true);
assert.deepEqual(plan.beyondThreeModelIds, ["p1-five", "p1-four"]);
assert.deepEqual(plan.casualtyModelIds, ["p1-six"]);
assert.deepEqual(plan.placementCounts, {
  enemyBaseContact: 1,
  friendlyFightingRankContact: 2,
  coherencyOnlyWithinThree: 1,
  closestLinkedOutOfCoherency: 1,
  outsideThree: 2,
  casualty: 1,
  pinned: 0,
});
assert.deepEqual(plan.placementSequence.map((entry) => entry.prioritySatisfied), [
  "enemy_base_contact",
  "friendly_fighting_rank_contact",
  "coherency_only_within_three",
  "friendly_fighting_rank_contact",
  "closest_linked_out_of_coherency",
  "no_legal_coherency_link_casualty",
]);
assert.equal(plan.postPlacementCurrentModels, 6);
assert.equal(plan.postPlacementCurrentSupply, 1);
assert.equal(preview.preview.core.result.chancePending, true);
assert.ok(preview.preview.core.chanceTicket.tickets.every((ticket) => ticket.outcomeHidden === true));
const repeatedPreview = engine.preview({ envelope: initial, seatAuthority: authority, proposal });
assert.equal(repeatedPreview.ok, true, JSON.stringify(repeatedPreview));
assert.deepEqual(
  repeatedPreview.preview.core.chanceTicket.tickets.map((ticket) => ticket.commitment),
  preview.preview.core.chanceTicket.tickets.map((ticket) => ticket.commitment),
);

function rejectedPreview(mutator, expectedCode) {
  const invalidProposal = structuredClone(proposal);
  mutator(invalidProposal);
  const result = engine.preview({
    envelope: initial,
    seatAuthority: authority,
    proposal: invalidProposal,
  });
  assert.equal(result.ok, false, JSON.stringify(result));
  assert.equal(result.reason, "PROPOSAL_INVALID");
  assert.match(result.message, new RegExp(expectedCode, "u"));
}

rejectedPreview((invalid) => {
  invalid.parameters.placements[2] = { modelId: "p1-three", outcome: "casualty" };
}, "CLOSE_RANKS_CASUALTY_NOT_REQUIRED");
rejectedPreview((invalid) => {
  invalid.parameters.placements[2] = {
    modelId: "p1-three",
    outcome: "placed",
    xMilliInches: 3740,
    yMilliInches: 630,
  };
}, "CLOSE_RANKS_COHERENCY_LINK_REQUIRED");
rejectedPreview((invalid) => {
  invalid.parameters.placements[2] = {
    modelId: "p1-three",
    outcome: "placed",
    xMilliInches: 13820,
    yMilliInches: 630,
  };
}, "CLOSE_RANKS_WITHIN_THREE_REQUIRED");
rejectedPreview((invalid) => {
  invalid.parameters.placements[3] = {
    modelId: "p1-four",
    outcome: "placed",
    xMilliInches: 13820,
    yMilliInches: 630,
  };
}, "CLOSE_RANKS_NOT_CLOSEST_LEGAL");
rejectedPreview((invalid) => {
  invalid.parameters.placements[5] = {
    modelId: "p1-six",
    outcome: "placed",
    xMilliInches: 3740,
    yMilliInches: 630,
  };
}, "CLOSE_RANKS_COHERENCY_LINK_REQUIRED");

const confirmation = engine.confirmPreview({
  envelope: initial,
  preview: preview.preview,
  seatAuthority: authority,
});
assert.equal(confirmation.ok, true, JSON.stringify(confirmation));
const applied = engine.apply({
  envelope: initial,
  expectedStateRevision: initial.stateRevision,
  preview: preview.preview,
  confirmation: confirmation.confirmation,
  seatAuthority: authority,
  controlLease: lease,
  idempotencyKey: "ticket-11-out-of-coherency-close-ranks-apply-v1",
});
assert.equal(applied.ok, true, JSON.stringify(applied));
assert.equal(applied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
assert.deepEqual(applied.receipt.events.map((event) => event.type), [
  "close_ranks",
  "coherency_casualty",
  "close_combat_attack",
]);
const appliedPiece = applied.envelope.state.pieces.find((entry) => entry.id === "p1-marines");
assert.equal(appliedPiece.currentModels, 6);
assert.equal(appliedPiece.currentSupply, 1);
assert.deepEqual(appliedPiece.coherencyStatus, {
  schemaVersion: "starcraft_tmg_unit_coherency_status_v1",
  status: "out_of_coherency",
  isOutOfCoherency: true,
  determinedAt: { round: 1, phase: "combat", repositionAction: "close_ranks" },
  leadingModelId: "p1-leading",
  beyondThreeModelIds: ["p1-five", "p1-four"],
  casualtyModelIds: ["p1-six"],
  trainingTruth: false,
});
const removed = appliedPiece.models.find((entry) => entry.id === "p1-six");
assert.equal(removed.isDestroyed, true);
assert.equal(removed.isOnField, false);

const replay = engine.replay({ initialEnvelope: initial, journal: [applied.receipt] });
assert.equal(replay.ok, true, JSON.stringify(replay));
assert.equal(replay.envelope.stateHash, applied.envelope.stateHash);

const opponentAuthority = engine.issueSeatAuthority({
  grantId: "out-of-coherency-opponent-grant",
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
assert.equal(opponentPreview.ok, true, JSON.stringify(opponentPreview));
assert.equal(opponentPreview.preview.core.confirmationPolicy.requiresExplicitHuman, true);
const opponentApply = engine.apply({
  envelope: initial,
  expectedStateRevision: initial.stateRevision,
  preview: opponentPreview.preview,
  seatAuthority: opponentAuthority,
  controlLease: lease,
  idempotencyKey: "ticket-11-out-of-coherency-opponent-must-not-apply",
});
assert.equal(opponentApply.ok, false);
assert.equal(opponentApply.reason, "CAPABILITY_DENIED");

const replayEngine = createStarcraftTmgAuthoritativeEngine({
  rulesRuntime,
  allowIncompleteRuleRuntimeForDevelopment: true,
  now: () => OCCURRED_AT,
  cryptoOptions: {
    keyId: "ticket-11-out-of-coherency-close-ranks-referee-v1",
    privateKey,
    publicKey,
    hmacSecret: "ticket-11-out-of-coherency-close-ranks-rotated-seal-v2",
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
const rotatedReplay = replayEngine.replay({ initialEnvelope: initial, journal: [applied.receipt] });
assert.equal(rotatedReplay.ok, true, JSON.stringify(rotatedReplay));
assert.equal(rotatedReplay.envelope.stateHash, applied.envelope.stateHash);

const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: slices.multiModelSlice.catalogue,
});
assert.equal(
  historicalRuntime.descriptor.runtimeHash,
  "4c55f45312951847ff3ec5b7128e2ff69962d4ed1ff264304f22171bfc6e00cb",
);
assert.throws(() => createOfficialOutOfCoherencyCloseRanksRuleSliceV1({
  denominator,
  ...slices,
  previousSlice: {
    ...slices.multiModelSlice,
    catalogueHash: "0".repeat(64),
  },
}), /official_multi_model_close_ranks_slice_hash_mismatch|catalogue/u);

const report = {
  schema: "starcraft_tmg_official_out_of_coherency_close_ranks_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: 12,
  acceptanceTotal: 12,
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  dataVersions: dataset.dataVersions,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  slice: slices.outOfCoherencySlice,
  audit,
  runtime: rulesRuntime.descriptor,
  ctx2skill: {
    ...slices.outOfCoherencySlice.ctx2skill,
    crossTimeReplayResult:
      "passed_closest_linked_out_of_coherency_supply_casualty_and_rotated_hmac_replay",
  },
  harness: slices.outOfCoherencySlice.harness,
  rulesTruth:
    "bounded_exact_lattice_close_ranks_closest_linked_out_of_coherency_and_no_link_casualty",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-out-of-coherency-close-ranks-rule-slice-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  officialSourceSnapshotHash: report.officialSourceSnapshotHash,
  officialDatasetHash: report.officialDatasetHash,
  dataVersions: report.dataVersions,
  sliceHash: slices.outOfCoherencySlice.sliceHash,
  catalogueHash: slices.outOfCoherencySlice.catalogueHash,
  runtimeHash: rulesRuntime.descriptor.runtimeHash,
  executableRuleAtomCount: audit.counts.executableRuleAtoms,
  newlyExecutableRuleAtomCount: OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_NEW_ATOM_IDS.length,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  rulesTruth: report.rulesTruth,
  trainingTruth: false,
}, null, 2));
