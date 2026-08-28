#!/usr/bin/env node

import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from "../packages/authoritative-engine/transition-v1.mjs";
import { createOfficialActivationPassRuleSliceV1 } from "../packages/rule-atoms/official-activation-pass-rule-slice-v1.mjs";
import { createOfficialAssaultHoldRuleSliceV1 } from "../packages/rule-atoms/official-assault-hold-rule-slice-v1.mjs";
import { createOfficialCloseCombatAttackRuleSliceV1 } from "../packages/rule-atoms/official-close-combat-attack-rule-slice-v1.mjs";
import { createOfficialCloseRanksCombatRuleSliceV1 } from "../packages/rule-atoms/official-close-ranks-combat-rule-slice-v1.mjs";
import { createOfficialCombatPassRuleSliceV1 } from "../packages/rule-atoms/official-combat-pass-rule-slice-v1.mjs";
import { createOfficialElevatedEngagementRuleSliceV1 } from "../packages/rule-atoms/official-elevated-engagement-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE,
  OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_ID,
} from "../packages/rule-atoms/official-mission-marker-control-executor-v2.mjs";
import {
  createOfficialMissionMarkerControlRuleSliceV1,
} from "../packages/rule-atoms/official-mission-marker-control-rule-slice-v1.mjs";
import { createOfficialMovementHoldRuleSliceV1 } from "../packages/rule-atoms/official-movement-hold-rule-slice-v1.mjs";
import { createOfficialMultiModelCloseRanksRuleSliceV1 } from "../packages/rule-atoms/official-multi-model-close-ranks-rule-slice-v1.mjs";
import { createOfficialOutOfCoherencyCloseRanksRuleSliceV1 } from "../packages/rule-atoms/official-out-of-coherency-close-ranks-rule-slice-v1.mjs";
import { createOfficialPhaseInitiativeRuleSliceV1 } from "../packages/rule-atoms/official-phase-initiative-rule-slice-v1.mjs";
import {
  createOfficialSupplyLossLedgerV1,
} from "../packages/rule-atoms/official-supply-loss-ledger-v1.mjs";
import {
  OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ID,
  OFFICIAL_SUPPLY_LOSS_COMBAT_PARAMETER_KIND,
} from "../packages/rule-atoms/official-supply-loss-combat-executor-v1.mjs";
import {
  OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE,
  OFFICIAL_VICTORY_POINT_SCORING_ATOM_IDS,
  OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_ID,
} from "../packages/rule-atoms/official-victory-point-scoring-executor-v1.mjs";
import {
  createOfficialVictoryPointScoringRuleSliceV1,
  verifyOfficialVictoryPointScoringRuleSliceV1,
} from "../packages/rule-atoms/official-victory-point-scoring-rule-slice-v1.mjs";
import {
  createOfficialGameplayDataBundleV1,
} from "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import {
  createOfficialMissionSetupBindingV1,
} from "../packages/source-data/official-mission-setup-binding-v1.mjs";
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
const HISTORICAL_MARKER_CATALOGUE_HASH =
  "9a841f18e820ae4f76908c5c4f5d471d4494c93bf4da39cecec056e235fc0217";
const HISTORICAL_MARKER_RUNTIME_HASH =
  "df44882962d38370829e4c72a4da6ec9e6d2e1f33b84bde12a581f0192e2ef1d";

function marker(number, controlSideKey) {
  return {
    id: `mission-marker-${number}`,
    number,
    xInches: 5 + ((number - 1) * 10),
    yInches: 6,
    diameterMillimeters: 32,
    elevation: "ground",
    isActivated: true,
    controlSideKey,
    factionIndicatorSideKey: controlSideKey,
  };
}

function combatModel(id, xInches, yInches = 0.63) {
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

function combatPiece(id, sideKey, models, currentSupply) {
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
    activatedPhases: { movement: true, assault: true, combat: false },
  };
}

function outOfCoherencyCombatState(gameplayDataBundle, supplyLossLedger) {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "combat",
    activeSideKey: "player1",
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: {},
    phaseFirstActorByRound: {
      "2:combat": {
        round: 2,
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
    officialGameplayDataBundle: gameplayDataBundle,
    supplyLossLedger: structuredClone(supplyLossLedger),
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
      combatPiece("p1-marines", "player1", [
        combatModel("p1-leading", 8.2),
        combatModel("p1-one", 0.63),
        combatModel("p1-two", 1.93),
        combatModel("p1-three", 3.23),
        combatModel("p1-four", 6.4),
        combatModel("p1-five", 11.5),
        combatModel("p1-six", 12.8),
      ], 2),
      combatPiece("p2-target", "player2", [combatModel("p2-target-model", 10.04)], 0),
      combatPiece(
        "p1-link-blocker",
        "player1",
        [combatModel("p1-link-blocker-model", 5)],
        0,
      ),
    ],
    log: [],
  };
}

function scoringState(gameplayDataBundle, missionSetupBinding, supplyLossLedger) {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "cleanup",
    activeSideKey: null,
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: { combat: "player1" },
    players: {
      player1: { sideKey: "player1", passedPhases: { combat: true } },
      player2: { sideKey: "player2", passedPhases: { combat: true } },
    },
    scores: { player1: 0, player2: 0 },
    officialGameplayDataBundle: gameplayDataBundle,
    officialMissionSetupBinding: missionSetupBinding,
    supplyLossLedger: structuredClone(supplyLossLedger),
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
        marker(1, "player1"),
        marker(2, "player1"),
        marker(3, "player2"),
        marker(4, "player2"),
        marker(5, "player1"),
      ],
      terrain: [],
      accessPoints: [],
      effectMarkers: [],
    },
    cardResources: { player1: [], player2: [] },
    pieces: [],
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
  const missionMarkerControlSlice = createOfficialMissionMarkerControlRuleSliceV1({
    denominator,
    movementHoldSlice,
    passSlice,
    assaultHoldSlice,
    phaseInitiativeSlice,
    combatPassSlice,
    elevatedSlice,
    closeCombatSlice,
    closeRanksSlice,
    multiModelSlice,
    previousSlice: outOfCoherencySlice,
  });
  const victoryPointScoringSlice = createOfficialVictoryPointScoringRuleSliceV1({
    denominator,
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
    previousSlice: missionMarkerControlSlice,
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
    missionMarkerControlSlice,
    victoryPointScoringSlice,
  };
}

function credentials(engine, envelope, sideKey, suffix, options = {}) {
  const authority = engine.issueSeatAuthority({
    grantId: `victory-point-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: options.roleMode || "player",
    principalType: options.principalType || "human",
    capabilities: options.capabilities || ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `victory-point-${suffix}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

function finiteAction(space, actionType) {
  return space.finiteActions.find((entry) => entry.action.actionType === actionType);
}

function applyFinite(engine, envelope, credentialsInput, actionType, idempotencyKey) {
  const legal = engine.legalSpace(envelope, { seatAuthority: credentialsInput.authority });
  const finite = finiteAction(legal, actionType);
  assert.ok(
    finite,
    `${actionType} must be present in LegalSpace: ${JSON.stringify(legal.disabledDiagnostics)}`,
  );
  const preview = engine.preview({
    envelope,
    seatAuthority: credentialsInput.authority,
    proposal: { kind: "finite", actionKey: finite.actionKey },
  });
  assert.equal(preview.ok, true, JSON.stringify(preview));
  const confirmation = engine.confirmPreview({
    envelope,
    preview: preview.preview,
    seatAuthority: credentialsInput.authority,
  });
  assert.equal(confirmation.ok, true, JSON.stringify(confirmation));
  const applied = engine.apply({
    envelope,
    expectedStateRevision: envelope.stateRevision,
    preview: preview.preview,
    confirmation: confirmation.confirmation,
    seatAuthority: credentialsInput.authority,
    controlLease: credentialsInput.lease,
    idempotencyKey,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return { legal, finite, preview, confirmation, applied };
}

const denominator = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-canonical-rule-atom-denominator-v1-report.json"),
  "utf8",
)).denominator;
const slices = buildSliceChain(denominator);
const audit = verifyOfficialVictoryPointScoringRuleSliceV1({
  denominator,
  ...slices,
  previousSlice: slices.missionMarkerControlSlice,
  slice: slices.victoryPointScoringSlice,
});
assert.deepEqual({
  executable: audit.counts.executableRuleAtoms,
  reviewRequired: audit.counts.reviewRequiredRuleAtoms,
  displayOnly: audit.counts.displayOnlyRuleAtoms,
  newlyExecutable: audit.counts.newlyExecutableRuleAtoms,
  versionReassigned: audit.counts.versionReassignedRuleAtoms,
  changedNonTarget: audit.counts.changedNonTargetAtoms,
}, {
  executable: 150 + OFFICIAL_VICTORY_POINT_SCORING_ATOM_IDS.length,
  reviewRequired: 762 - OFFICIAL_VICTORY_POINT_SCORING_ATOM_IDS.length,
  displayOnly: 114,
  newlyExecutable: OFFICIAL_VICTORY_POINT_SCORING_ATOM_IDS.length,
  versionReassigned: 97,
  changedNonTarget: 0,
});

const { snapshot, dataset } = await officialData();
assert.deepEqual(dataset.dataVersions, {
  cardsVersion: "69",
  rulesVersion: "48",
  unitsVersion: "71",
});
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot,
  dataset,
  unitRecordKeys: ["army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
});
assert.equal(gameplayDataBundle.missionScoringProfile.missionId, "mission_hold_position");
assert.equal(gameplayDataBundle.missionScoringProfile.format, "standard_engagement");
assert.equal(gameplayDataBundle.missionScoringProfile.markerScoringStartsRound, 2);
assert.equal(
  gameplayDataBundle.missionScoringProfile.sourceRecordHash,
  "70c391e589555f7b124a381572ad4b1272cb22b6fbcc6c140171e68ea1f18cfa",
);
assert.equal(
  gameplayDataBundle.missionScoringProfile.payloadHash,
  "617f8dbaa4337670c2d700ee05c21608facc318875f01f15379481310679a85d",
);
assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);

const rulesRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: slices.victoryPointScoringSlice.catalogue,
});
const missionSetupBinding = createOfficialMissionSetupBindingV1({
  gameplayDataBundle,
  missionDraftReceiptHash: hashStarcraftTmgContract({
    kind: "mission-draft-receipt",
    selectedMissionRecordKey: "faction_cards:mission_hold_position",
  }),
  deploymentDraftReceiptHash: hashStarcraftTmgContract({
    kind: "deployment-draft-receipt",
    selectedDeploymentRecordKey: "faction_cards:deployment_no_mans_land",
  }),
  seatColorAssignment: { player1: "red", player2: "blue" },
});
assert.deepEqual(missionSetupBinding.markerAffinityByNumber, {
  1: "player1",
  2: "player2",
  3: "player1",
  4: "player2",
  5: null,
});
const supplyLossLedger = createOfficialSupplyLossLedgerV1({
  round: 2,
  rulesRuntimeHash: rulesRuntime.descriptor.runtimeHash,
});
assert.deepEqual(supplyLossLedger.lossBySide, { player1: 0, player2: 0 });
assert.deepEqual(supplyLossLedger.entries, []);

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const engine = createStarcraftTmgAuthoritativeEngine({
  rulesRuntime,
  allowIncompleteRuleRuntimeForDevelopment: true,
  now: () => OCCURRED_AT,
  cryptoOptions: {
    keyId: "ticket-11-victory-point-referee-v1",
    privateKey,
    publicKey,
    hmacSecret: "ticket-11-victory-point-seal-v1",
  },
});
const initial = engine.createEnvelope({
  roomId: "official-victory-point-scoring-room",
  dataVersion: `${snapshot.dataVersions.unitsVersion}/${snapshot.dataVersions.cardsVersion}/${snapshot.dataVersions.rulesVersion}`,
  dependencies: {
    sourceSnapshot: { artifactId: "official-command-center-snapshot", content: snapshot },
    dataSnapshot: { artifactId: "official-gameplay-data-bundle", content: gameplayDataBundle },
  },
  state: scoringState(gameplayDataBundle, missionSetupBinding, supplyLossLedger),
});
assert.equal(initial.matchBinding.dataSnapshotHash, hashStarcraftTmgContract(gameplayDataBundle));

const combatEnvelope = engine.createEnvelope({
  roomId: "official-supply-loss-ledger-room",
  dataVersion: `${snapshot.dataVersions.unitsVersion}/${snapshot.dataVersions.cardsVersion}/${snapshot.dataVersions.rulesVersion}`,
  dependencies: {
    sourceSnapshot: { artifactId: "official-command-center-snapshot", content: snapshot },
    dataSnapshot: { artifactId: "official-gameplay-data-bundle", content: gameplayDataBundle },
  },
  state: outOfCoherencyCombatState(gameplayDataBundle, supplyLossLedger),
});
const combatEnumeration = rulesRuntime.enumerate(combatEnvelope.state, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding: combatEnvelope.matchBinding,
});
const supplyLossDomain = combatEnumeration.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_SUPPLY_LOSS_COMBAT_PARAMETER_KIND
));
assert.ok(supplyLossDomain, "Fight v5 must expose the OOC Close Ranks parameter domain");
assert.equal(supplyLossDomain.executorId, OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ID);
const supplyLossInstantiation = rulesRuntime.instantiate(
  combatEnvelope.state,
  supplyLossDomain,
  {
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
  { matchBinding: combatEnvelope.matchBinding },
);
assert.equal(supplyLossInstantiation.action.executorId, OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ID);
const supplyLossTransition = rulesRuntime.apply(
  combatEnvelope.state,
  supplyLossInstantiation.action,
  {
    matchBinding: combatEnvelope.matchBinding,
    postRevision: 1,
    chanceReveals: Array.from(
      { length: supplyLossInstantiation.action.chance.count },
      () => ({ faces: 6, outcome: 1 }),
    ),
  },
);
assert.deepEqual(supplyLossTransition.state.supplyLossLedger.lossBySide, {
  player1: 1,
  player2: 0,
});
assert.deepEqual(supplyLossTransition.state.supplyLossLedger.scoreableLossCreditedToSide, {
  player1: 0,
  player2: 0,
});
assert.deepEqual(
  supplyLossTransition.state.supplyLossLedger.entries.map((entry) => ({
    unitId: entry.unitId,
    causeKind: entry.causeKind,
    attributionStatus: entry.attributionStatus,
    scoreable: entry.scoreable,
    supplyDelta: entry.supplyDelta,
  })),
  [{
    unitId: "p1-marines",
    causeKind: "out_of_coherency_removal",
    attributionStatus: "unresolved_official_source",
    scoreable: false,
    supplyDelta: 1,
  }],
);
assert.equal(
  supplyLossTransition.events.at(-1).type,
  "supply_loss_recorded",
);

const player1 = credentials(engine, initial, "player1", "player1-marker");
const markerStep = applyFinite(
  engine,
  initial,
  player1,
  OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE,
  "ticket-11-victory-point-marker-control",
);
assert.equal(markerStep.finite.action.executorId, OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_ID);
assert.equal(markerStep.applied.envelope.state.scoringCleanupProgress.currentStep, "score_victory_points");

const scoringCredentials = credentials(
  engine,
  markerStep.applied.envelope,
  "player1",
  "player1-score",
);
const scoringStep = applyFinite(
  engine,
  markerStep.applied.envelope,
  scoringCredentials,
  OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE,
  "ticket-11-victory-point-score",
);
assert.equal(scoringStep.finite.action.executorId, OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_ID);
assert.deepEqual(scoringStep.finite.action.scoringResolution.breakdowns, {
  player1: {
    destroyedEnemySupplyVp: 0,
    markerVp: 4,
    roundVp: 4,
    controlledMarkerVp: [
      { markerId: "mission-marker-1", markerNumber: 1, affinitySideKey: "player1", vp: 1 },
      { markerId: "mission-marker-2", markerNumber: 2, affinitySideKey: "player2", vp: 2 },
      { markerId: "mission-marker-5", markerNumber: 5, affinitySideKey: null, vp: 1 },
    ],
  },
  player2: {
    destroyedEnemySupplyVp: 0,
    markerVp: 3,
    roundVp: 3,
    controlledMarkerVp: [
      { markerId: "mission-marker-3", markerNumber: 3, affinitySideKey: "player1", vp: 2 },
      { markerId: "mission-marker-4", markerNumber: 4, affinitySideKey: "player2", vp: 1 },
    ],
  },
});
assert.deepEqual(scoringStep.applied.envelope.state.scores, { player1: 4, player2: 3 });
assert.deepEqual(
  scoringStep.applied.envelope.state.scoringCleanupProgress.completedSteps,
  [OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE, OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE],
);
assert.equal(
  scoringStep.applied.envelope.state.scoringCleanupProgress.currentStep,
  "check_end_game_conditions",
);
assert.equal(scoringStep.applied.receipt.refereeSignature.signatureAlgorithm, "ed25519");

const replay = engine.replay({
  initialEnvelope: initial,
  journal: [markerStep.applied.receipt, scoringStep.applied.receipt],
});
assert.equal(replay.ok, true, JSON.stringify(replay));
assert.equal(replay.envelope.stateHash, scoringStep.applied.envelope.stateHash);

const opponent = credentials(engine, markerStep.applied.envelope, "player1", "opponent", {
  roleMode: "opponent",
  principalType: "model",
  capabilities: ["read_legal_space", "preview", "apply"],
});
const opponentLegal = engine.legalSpace(markerStep.applied.envelope, {
  seatAuthority: opponent.authority,
});
const opponentFinite = finiteAction(opponentLegal, OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE);
assert.ok(opponentFinite);
const opponentPreview = engine.preview({
  envelope: markerStep.applied.envelope,
  seatAuthority: opponent.authority,
  proposal: { kind: "finite", actionKey: opponentFinite.actionKey },
});
assert.equal(opponentPreview.ok, true, JSON.stringify(opponentPreview));
const opponentApply = engine.apply({
  envelope: markerStep.applied.envelope,
  expectedStateRevision: markerStep.applied.envelope.stateRevision,
  preview: opponentPreview.preview,
  seatAuthority: opponent.authority,
  controlLease: opponent.lease,
  idempotencyKey: "ticket-11-victory-point-opponent-must-not-apply",
});
assert.equal(opponentApply.ok, false);
assert.equal(opponentApply.reason, "CAPABILITY_DENIED");

const unresolvedEnvelope = engine.createEnvelope({
  roomId: "official-victory-point-unresolved-ooc-room",
  dataVersion: `${snapshot.dataVersions.unitsVersion}/${snapshot.dataVersions.cardsVersion}/${snapshot.dataVersions.rulesVersion}`,
  dependencies: {
    sourceSnapshot: { artifactId: "official-command-center-snapshot", content: snapshot },
    dataSnapshot: { artifactId: "official-gameplay-data-bundle", content: gameplayDataBundle },
  },
  state: scoringState(
    gameplayDataBundle,
    missionSetupBinding,
    supplyLossTransition.state.supplyLossLedger,
  ),
});
const unresolvedMarkerCredentials = credentials(
  engine,
  unresolvedEnvelope,
  "player1",
  "unresolved-marker",
);
const unresolvedMarkerStep = applyFinite(
  engine,
  unresolvedEnvelope,
  unresolvedMarkerCredentials,
  OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE,
  "ticket-11-victory-point-unresolved-marker-control",
);
const unresolvedScoreCredentials = credentials(
  engine,
  unresolvedMarkerStep.applied.envelope,
  "player1",
  "unresolved-score",
);
const unresolvedLegal = engine.legalSpace(unresolvedMarkerStep.applied.envelope, {
  seatAuthority: unresolvedScoreCredentials.authority,
});
assert.equal(
  finiteAction(unresolvedLegal, OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE),
  undefined,
);
assert.ok(unresolvedLegal.disabledDiagnostics.some((entry) => (
  entry.action.actionType === OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE
    && entry.disabledReason === "VP_SCORING_ATTRIBUTION_UNRESOLVED"
)));

const tamperedState = scoringState(gameplayDataBundle, missionSetupBinding, supplyLossLedger);
tamperedState.supplyLossLedger.lossBySide.player1 = 1;
const tamperedEnvelope = engine.createEnvelope({
  roomId: "official-victory-point-tampered-ledger-room",
  dataVersion: `${snapshot.dataVersions.unitsVersion}/${snapshot.dataVersions.cardsVersion}/${snapshot.dataVersions.rulesVersion}`,
  dependencies: {
    sourceSnapshot: { artifactId: "official-command-center-snapshot", content: snapshot },
    dataSnapshot: { artifactId: "official-gameplay-data-bundle", content: gameplayDataBundle },
  },
  state: tamperedState,
});
const tamperedAuthority = credentials(engine, tamperedEnvelope, "player1", "tampered");
const tamperedLegal = engine.legalSpace(tamperedEnvelope, {
  seatAuthority: tamperedAuthority.authority,
});
assert.equal(finiteAction(tamperedLegal, OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE), undefined);
assert.ok(tamperedLegal.disabledDiagnostics.some((entry) => (
  entry.disabledReason === "SUPPLY_LOSS_LEDGER_HASH_MISMATCH"
)));

const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: slices.missionMarkerControlSlice.catalogue,
});
assert.equal(slices.missionMarkerControlSlice.catalogueHash, HISTORICAL_MARKER_CATALOGUE_HASH);
assert.equal(historicalRuntime.descriptor.runtimeHash, HISTORICAL_MARKER_RUNTIME_HASH);
assert.equal(slices.victoryPointScoringSlice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slices.victoryPointScoringSlice.ctx2skill.promotions.length, 0);
assert.equal(slices.victoryPointScoringSlice.trainingTruth, false);

const acceptance = [
  "catalogue_promotes_exact_scoring_and_affinity_atoms_with_explicit_v5_v2_reassignments",
  "latest_official_hold_position_standard_record_is_hash_bound_without_repository_fallback",
  "draft_receipts_bind_red_blue_seats_and_fixed_marker_affinity",
  "runtime_bound_empty_supply_delta_ledger_is_required",
  "fight_v5_records_ooc_supply_delta_with_unresolved_attribution",
  "ooc_supply_delta_is_not_scored_as_zero_or_silently_credited",
  "marker_control_v2_uses_composite_gameplay_data_without_mutating_historical_v1",
  "first_player_scores_both_players_from_one_before_state",
  "hold_position_round_two_marker_affinity_values_are_exact",
  "vp_apply_is_atomic_and_advances_to_end_game_check",
  "ed25519_receipts_replay_after_two_step_cleanup_prefix",
  "opponent_model_can_preview_but_cannot_confirm_or_apply",
  "tampered_supply_loss_ledger_fails_closed",
  "historical_marker_catalogue_and_runtime_remain_frozen",
  "no_skill_dsh_muzero_or_training_promotion_occurs",
];
const report = {
  schema: "starcraft_tmg_official_victory_point_scoring_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  dataVersions: dataset.dataVersions,
  gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
  missionScoringProfileHash: gameplayDataBundle.missionScoringProfile.missionScoringProfileHash,
  missionSetupBindingHash: missionSetupBinding.missionSetupBindingHash,
  slice: slices.victoryPointScoringSlice,
  audit,
  runtime: rulesRuntime.descriptor,
  historicalCatalogueHash: slices.missionMarkerControlSlice.catalogueHash,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  ctx2skill: slices.victoryPointScoringSlice.ctx2skill,
  harness: slices.victoryPointScoringSlice.harness,
  rulesTruth: "official_hold_position_standard_round_two_zero_supply_delta_simultaneous_vp",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-victory-point-scoring-rule-slice-v1-report.json"),
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
  sliceHash: report.slice.sliceHash,
  catalogueHash: report.slice.catalogueHash,
  runtimeHash: report.runtime.runtimeHash,
  executableRuleAtomCount: report.audit.counts.executableRuleAtoms,
  newlyExecutableRuleAtomCount: report.audit.counts.newlyExecutableRuleAtoms,
  versionReassignedRuleAtomCount: report.audit.counts.versionReassignedRuleAtoms,
  historicalCatalogueHash: report.historicalCatalogueHash,
  historicalRuntimeHash: report.historicalRuntimeHash,
  rulesTruth: report.rulesTruth,
  trainingTruth: false,
}, null, 2));
