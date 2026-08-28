#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  canonicalStarcraftTmgJson,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  createOfficialExistingHoldPositionEndGameContractClosureRuleSliceV1,
  verifyOfficialExistingHoldPositionEndGameContractClosureRuleSliceV1,
} from
  "../packages/rule-atoms/official-existing-hold-position-end-game-contract-closure-rule-slice-v1.mjs";
import {
  createOfficialHoldPositionEndGameRelationshipExtensionV1,
  OFFICIAL_HOLD_POSITION_END_GAME_RELATIONSHIP_NODE_IDS_V1,
} from
  "../packages/rule-atoms/official-hold-position-end-game-relationship-contract-v1.mjs";
import {
  applyOfficialHoldPositionEndGameV2,
  enumerateOfficialHoldPositionEndGameActionsV2,
  OFFICIAL_HOLD_POSITION_END_GAME_V2_ACTION_TYPE,
  OFFICIAL_HOLD_POSITION_END_GAME_V2_ATOM_IDS,
  OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_ID,
  OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_VERSION,
} from "../packages/rule-atoms/official-hold-position-end-game-executor-v2.mjs";
import {
  OFFICIAL_MISSION_MARKER_CONTROL_V3_ACTION_TYPE,
} from "../packages/rule-atoms/official-mission-marker-control-executor-v3.mjs";
import {
  createOfficialVictoryPointScoringRelationshipExtensionV1,
} from "../packages/rule-atoms/official-victory-point-scoring-relationship-contract-v1.mjs";
import {
  createOfficialSupplyLossLedgerV1,
} from "../packages/rule-atoms/official-supply-loss-ledger-v1.mjs";
import {
  applyOfficialVictoryPointScoringV2,
  enumerateOfficialVictoryPointScoringActionsV2,
  OFFICIAL_VICTORY_POINT_SCORING_V2_ACTION_TYPE,
  OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID,
} from "../packages/rule-atoms/official-victory-point-scoring-executor-v2.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
  queryRuleRelationshipImpactV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { auditExecutableAtomStateContractCoverageV1 } from
  "../packages/rule-atoms/rule-executor-state-contract-coverage-v1.mjs";
import {
  createOfficialCommandCenterDataset,
} from "../packages/source-data/official-command-center-adapter-v1.mjs";
import {
  createOfficialGameplayDataBundleV1,
} from "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import {
  createOfficialMissionSetupBindingV1,
} from "../packages/source-data/official-mission-setup-binding-v1.mjs";

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
const OCCURRED_AT = "2026-08-28T17:00:00.000Z";
const PREVIOUS_RUNTIME_HASH =
  "d29dc21552c919c9da004368ef79324c97d311d1f4321880dd7f5e2692f2bcfe";
const CURRENT_RUNTIME_HASH =
  "ecb2e9001d8a8f42cf45adb695bfc977dc79889fa8a6aacda258951b90d9cf64";
const PREVIOUS_EXECUTOR_SOURCE_HASH =
  "818368bf69e958a8e7785219180a26ae799dc2c432a2f46b9054bd18fb471656";
const CORE_RULES_URL =
  "https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf";
const CORE_RULES_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";
const HOLD_POSITION_DOCUMENT_HASH =
  "dc3ed374c4b64731455402ea0d6e325a9e468d7fdc6453d995122ff877f3d1f8";
const acceptance = [];

function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

function clone(value) {
  return structuredClone(value);
}

function contentHash(content) {
  return createHash("sha256").update(content).digest("hex");
}

function documentHash(document) {
  return createHash("sha256")
    .update(`${canonicalStarcraftTmgJson(document)}\n`)
    .digest("hex");
}

async function fetchOfficialBytes(url, kind) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error(`${kind} HTTP ${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
    }
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }
  throw lastError;
}

async function fetchOfficialJson(url, kind) {
  const bytes = await fetchOfficialBytes(url, kind);
  return JSON.parse(new TextDecoder().decode(bytes));
}

function marker(number, controlSideKey, controlResolutionHash) {
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
    controlDeterminedAt: {
      round: 2,
      step: OFFICIAL_MISSION_MARKER_CONTROL_V3_ACTION_TYPE,
      controlResolutionHash,
    },
  };
}

function liveMarine(id, sideKey, xInches) {
  return {
    id,
    sideKey,
    name: "Marine",
    officialUnitRecordKey: "army_units:marine",
    formationSize: "small",
    selectedUpgradeNames: [],
    combatTag: "ground",
    currentModels: 1,
    maxModels: 7,
    currentSupply: 0,
    damageMarker: 0,
    statuses: [],
    combatEffects: [],
    isOnField: true,
    isDestroyed: false,
    models: [{
      id: `${id}-model`,
      xInches,
      yInches: 0.63,
      baseShape: "round",
      baseWidthInches: 1.26,
      baseDepthInches: 1.26,
      elevation: "ground",
      supportTerrainIds: [],
      adjacentAccessPointIds: [],
      isOnField: true,
      isDestroyed: false,
    }],
    activatedPhases: { movement: true, assault: true, combat: true },
  };
}

function scoringState(input) {
  const controls = input.controls || [
    "player1",
    "player1",
    "player2",
    "player2",
    "player1",
  ];
  const controlResolutionHash = hashStarcraftTmgContract({
    kind: "slice-57-current-marker-control-resolution",
    round: 2,
    controls,
  });
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "cleanup",
    activeSideKey: null,
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: { combat: "player1" },
    phaseFirstActorByRound: {
      "2:combat": {
        round: 2,
        phase: "combat",
        markerHolderSideKey: "player1",
        chosenFirstActorSideKey: "player1",
      },
    },
    players: {
      player1: { sideKey: "player1", passedPhases: { combat: true } },
      player2: { sideKey: "player2", passedPhases: { combat: true } },
    },
    scores: clone(input.scores),
    officialGameplayDataBundle: input.gameplayDataBundle,
    officialMissionSetupBinding: input.missionSetupBinding,
    supplyLossLedger: clone(input.supplyLossLedger),
    scoringCleanupProgress: {
      schemaVersion: "starcraft_tmg_scoring_cleanup_progress_v1",
      round: 2,
      completedSteps: [OFFICIAL_MISSION_MARKER_CONTROL_V3_ACTION_TYPE],
      currentStep: OFFICIAL_VICTORY_POINT_SCORING_V2_ACTION_TYPE,
      controlResolutionHash,
      trainingTruth: false,
    },
    victoryPointScoringHistory: [],
    endGameResolutionHistory: [],
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
      missionMarkers: controls.map((sideKey, index) => (
        marker(index + 1, sideKey, controlResolutionHash)
      )),
      terrain: [],
      accessPoints: [],
      effectMarkers: [{ id: "protected-effect" }],
      tokens: [{ id: "protected-token" }],
    },
    cardResources: {
      player1: [{ id: "p1-card", currentResource: 2, maxResource: 2 }],
      player2: [{ id: "p2-card", currentResource: 1, maxResource: 2 }],
    },
    pieces: [
      liveMarine("p1-live", "player1", 0.63),
      liveMarine("p2-live", "player2", 53.37),
    ],
    gameOver: false,
    terminal: false,
    winner: "",
    terminalReason: "",
    log: [],
  };
}

function executableAction(candidate) {
  const {
    isEnabled: _isEnabled,
    disabledReason: _disabledReason,
    score: _score,
    details: _details,
    ...action
  } = candidate;
  return action;
}

function scoreState(state, matchBinding) {
  const candidate = enumerateOfficialVictoryPointScoringActionsV2(state, {
    sideKey: "player1",
    matchBinding,
  })[0];
  assert.ok(candidate, JSON.stringify(enumerateOfficialVictoryPointScoringActionsV2(
    state,
    { sideKey: "player1", includeDisabled: true, matchBinding },
  )));
  return applyOfficialVictoryPointScoringV2(state, executableAction(candidate), {
    matchBinding,
    postRevision: 1,
  }).state;
}

function applyEndGame(state, matchBinding) {
  const candidate = enumerateOfficialHoldPositionEndGameActionsV2(state, {
    sideKey: "player1",
    matchBinding,
  })[0];
  assert.ok(candidate, JSON.stringify(enumerateOfficialHoldPositionEndGameActionsV2(
    state,
    { sideKey: "player1", includeDisabled: true, matchBinding },
  )));
  return {
    candidate,
    action: executableAction(candidate),
    transition: applyOfficialHoldPositionEndGameV2(
      state,
      executableAction(candidate),
      { matchBinding, postRevision: 2 },
    ),
  };
}

function protectedState(state) {
  return clone({
    round: state.round,
    phase: state.phase,
    firstPlayerSideKey: state.firstPlayerSideKey,
    firstPassSideByPhase: state.firstPassSideByPhase,
    phaseFirstActorByRound: state.phaseFirstActorByRound,
    players: state.players,
    pieces: state.pieces,
    scores: state.scores,
    board: state.board,
    cardResources: state.cardResources,
    officialGameplayDataBundle: state.officialGameplayDataBundle,
    officialMissionSetupBinding: state.officialMissionSetupBinding,
    supplyLossLedger: state.supplyLossLedger,
    victoryPointScoringHistory: state.victoryPointScoringHistory,
  });
}

function credentials(engine, envelope, suffix, options = {}) {
  const seatAuthority = engine.issueSeatAuthority({
    grantId: `end-game-v2-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1",
    roleMode: options.roleMode || "player",
    principalType: options.principalType || "human",
    capabilities: options.capabilities
      || ["read_legal_space", "preview", "confirm", "apply"],
  });
  const controlLease = engine.issueControlLease({
    seatAuthority,
    sessionId: `end-game-v2-${suffix}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { seatAuthority, controlLease };
}

function applyFinite(engine, envelope, credential, executorId, idempotencyKey) {
  const legal = engine.legalSpace(envelope, { seatAuthority: credential.seatAuthority });
  const finite = legal.finiteActions.find((entry) => entry.action.executorId === executorId);
  assert.ok(finite, JSON.stringify(legal.disabledDiagnostics));
  const preview = engine.preview({
    envelope,
    seatAuthority: credential.seatAuthority,
    proposal: { kind: "finite", actionKey: finite.actionKey },
    occurredAt: OCCURRED_AT,
  });
  assert.equal(preview.ok, true, JSON.stringify(preview));
  const confirmation = engine.confirmPreview({
    envelope,
    preview: preview.preview,
    seatAuthority: credential.seatAuthority,
    occurredAt: OCCURRED_AT,
  });
  assert.equal(confirmation.ok, true, JSON.stringify(confirmation));
  const applied = engine.apply({
    envelope,
    expectedStateRevision: envelope.stateRevision,
    preview: preview.preview,
    confirmation: confirmation.confirmation,
    seatAuthority: credential.seatAuthority,
    controlLease: credential.controlLease,
    idempotencyKey,
    occurredAt: OCCURRED_AT,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return { legal, finite, preview, confirmation, applied };
}

function registerReplayDependencies(engine, envelope, runtime, sourceSnapshot, dataSnapshot) {
  const contents = {
    sourceSnapshot,
    dataSnapshot,
    rulesArtifact: {
      kind: "rules-artifact",
      rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: envelope.matchBinding.rulesRuntimeBinding,
    },
    executorArtifact: {
      kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: runtime.descriptor.runtimeHash,
      catalogueHash: runtime.descriptor.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest,
    },
    geometryArtifact: { kind: "geometry-artifact", geometryVersion: "fixed_point_round_base_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v17" },
  };
  for (const [kind, content] of Object.entries(contents)) {
    engine.registerDependency({
      kind,
      artifactId: envelope.matchBinding.dependencies[kind].artifactId,
      content,
    });
  }
  engine.registerDependency({
    kind: "rulesDisplay",
    artifactId: envelope.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown",
    locale: "en",
    content:
      `# Historical rules display\n\nFrozen rules version: ${runtime.descriptor.rulesVersion}`
      + "\n\nThis development artifact preserves the rules identity used by the match.",
  });
}

const previousReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-victory-point-scoring-contract-closure-v1-report.json",
  ),
  "utf8",
));
const previousCatalogue = previousReport.slice.catalogue;
const previousRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousCatalogue,
});
const previousExtension = createOfficialVictoryPointScoringRelationshipExtensionV1({
  catalogueHash: previousCatalogue.catalogueHash,
  runtimeHash: previousRuntime.descriptor.runtimeHash,
});
const previousGraph = createRuleRelationshipGraphV1({
  catalogue: previousCatalogue,
  extension: previousExtension,
});
const previousCoverage = auditExecutableAtomStateContractCoverageV1(previousGraph);
const slice = createOfficialExistingHoldPositionEndGameContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const sliceAudit = verifyOfficialExistingHoldPositionEndGameContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
const catalogue = slice.catalogue;
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
const extension = createOfficialHoldPositionEndGameRelationshipExtensionV1({
  catalogueHash: catalogue.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const graph = createRuleRelationshipGraphV1({ catalogue, extension });
const graphAudit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);
const ids = OFFICIAL_HOLD_POSITION_END_GAME_RELATIONSHIP_NODE_IDS_V1;

check("end_game_v2_reassigns_two_old_atoms_from_none_to_strict", () => {
  assert.equal(previousRuntime.descriptor.runtimeHash, PREVIOUS_RUNTIME_HASH);
  assert.deepEqual(previousCoverage.counts, {
    executableAtoms: 421,
    strictCompleteAtoms: 156,
    partialContractAtoms: 80,
    noContractAtoms: 185,
    executors: 42,
    declaredStateContractExecutors: 16,
    missingStateContractExecutors: 26,
  });
  assert.deepEqual(coverage.counts, {
    executableAtoms: 421,
    strictCompleteAtoms: 158,
    partialContractAtoms: 80,
    noContractAtoms: 183,
    executors: 42,
    declaredStateContractExecutors: 17,
    missingStateContractExecutors: 25,
  });
  assert.ok(OFFICIAL_HOLD_POSITION_END_GAME_V2_ATOM_IDS.every((atomId) => (
    previousCoverage.atomCoverage.find((entry) => entry.atomId === atomId)?.contractStatus
      === "none"
      && coverage.atomCoverage.find((entry) => entry.atomId === atomId)?.contractStatus
      === "strict_complete"
  )));
  assert.equal(sliceAudit.counts.changedNonTargetAtoms, 0);
  assert.equal(sliceAudit.counts.newlyExecutableRuleAtoms, 0);
  assert.equal(sliceAudit.counts.versionReassignedRuleAtoms, 2);
});

check("end_game_relationship_paths_reach_source_threshold_army_and_replay_judges", () => {
  const queries = [
    {
      startNodeId: ids.officialGameplayDataBundle,
      targetNodeIds: [ids.sourceBindingTest],
      relationships: ["projects_to", "verified_by"],
    },
    {
      startNodeId: ids.scores,
      targetNodeIds: [ids.thresholdTest],
      relationships: ["projects_to", "derives", "verified_by"],
    },
    {
      startNodeId: ids.pieces,
      targetNodeIds: [ids.armyWitnessTest],
      relationships: ["projects_to", "verified_by"],
    },
    {
      startNodeId: ids.endGameAction,
      targetNodeIds: [ids.replayTest],
      relationships: ["derives", "verified_by"],
    },
  ].map((query) => queryRuleRelationshipImpactV1(graph, { ...query, maxDepth: 9 }));
  assert.ok(queries.every((impact) => impact.paths.every((entry) => entry.reached)));
  assert.equal(graphAudit.valid, true);
  assert.equal(graphAudit.counts.blockingGaps, 0);
});

check("missing_end_game_invalidation_or_judge_edges_blocks_scope", () => {
  const broken = clone(extension);
  broken.edges = broken.edges.filter((entry) => (
    entry.provenance !== "hold_position_end_game_state_invalidation_v1"
      && entry.provenance !== "hold_position_end_game_judge_v1"
  ));
  const audit = auditRuleRelationshipGraphV1(createRuleRelationshipGraphV1({
    catalogue,
    extension: broken,
  }));
  assert.equal(audit.valid, false);
  assert.ok(audit.gaps.requiredEdgeGaps.length > 0);
  assert.ok(audit.gaps.requiredPathGaps.length > 0);
  assert.ok(audit.gaps.evidenceTestGaps.length > 0);
});

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
const dataset = createOfficialCommandCenterDataset({
  snapshot: liveReport.commandSnapshot,
  firestorePayloads,
});
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot: liveReport.commandSnapshot,
  dataset,
  unitRecordKeys: ["army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
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
const supplyLossLedger = createOfficialSupplyLossLedgerV1({
  round: 2,
  rulesRuntimeHash: CURRENT_RUNTIME_HASH,
});
const matchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: CURRENT_RUNTIME_HASH },
};

const leadNineScored = scoreState(scoringState({
  gameplayDataBundle,
  missionSetupBinding,
  supplyLossLedger,
  scores: { player1: 8, player2: 0 },
}), matchBinding);
const leadNine = applyEndGame(leadNineScored, matchBinding);
const player1Scored = scoreState(scoringState({
  gameplayDataBundle,
  missionSetupBinding,
  supplyLossLedger,
  scores: { player1: 9, player2: 0 },
}), matchBinding);
const player1Terminal = applyEndGame(player1Scored, matchBinding);
const player2Scored = scoreState(scoringState({
  gameplayDataBundle,
  missionSetupBinding,
  supplyLossLedger,
  scores: { player1: 0, player2: 3 },
  controls: ["player2", "player2", "player2", "player2", "player2"],
}), matchBinding);
const player2Terminal = applyEndGame(player2Scored, matchBinding);

check("lead_nine_continues_and_exact_lead_ten_ends_for_either_seat", () => {
  assert.deepEqual(leadNineScored.scores, { player1: 12, player2: 3 });
  assert.equal(leadNine.transition.endGameResolution.absoluteLead, 9);
  assert.equal(leadNine.transition.endGameResolution.outcome, "continue");
  assert.equal(leadNine.transition.state.scoringCleanupProgress.currentStep,
    "resolve_end_of_round_effects");
  assert.deepEqual(player1Scored.scores, { player1: 13, player2: 3 });
  assert.equal(player1Terminal.transition.endGameResolution.absoluteLead, 10);
  assert.equal(player1Terminal.transition.state.winner, "player1");
  assert.deepEqual(player2Scored.scores, { player1: 0, player2: 10 });
  assert.equal(player2Terminal.transition.endGameResolution.absoluteLead, 10);
  assert.equal(player2Terminal.transition.state.winner, "player2");
});

check("public_apply_exact_matches_enumeration_and_rejects_forged_payloads", () => {
  assert.equal(player1Terminal.candidate.executorId,
    OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_ID);
  assert.equal(player1Terminal.candidate.executorVersion,
    OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_VERSION);
  for (const forged of [
    { ...player1Terminal.action, executorVersion: "999.0.0" },
    { ...player1Terminal.action, ruleAtomIds: [] },
    { ...player1Terminal.action, details: { callerInjectedAuthority: true } },
    { ...player1Terminal.action, callerInjectedAuthority: true },
  ]) {
    assert.throws(
      () => applyOfficialHoldPositionEndGameV2(
        player1Scored,
        forged,
        { matchBinding },
      ),
      /END_GAME_V2_ACTION_(?:INVALID|MISMATCH)/u,
    );
  }
});

check("end_game_apply_writes_only_declared_terminal_progress_history_and_log", () => {
  assert.deepEqual(
    protectedState(player1Terminal.transition.state),
    protectedState(player1Scored),
  );
  assert.equal(player1Terminal.transition.state.endGameResolutionHistory.length, 1);
  assert.equal(player1Terminal.transition.state.gameOver, true);
  assert.equal(player1Terminal.transition.state.terminal, true);
  assert.equal(player1Terminal.transition.state.activeSideKey, null);
  assert.equal(player1Terminal.transition.state.log.at(-1).action.executorId,
    OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_ID);
});

check("scoring_history_army_round_terminal_and_match_drift_fail_closed", () => {
  const cases = [
    (() => {
      const state = clone(leadNineScored);
      state.victoryPointScoringHistory.at(-1).scoringResolutionHash = "0".repeat(64);
      return [state, matchBinding, "END_GAME_SCORING_HISTORY_INVALID"];
    })(),
    (() => {
      const state = clone(leadNineScored);
      state.pieces = state.pieces.filter((piece) => piece.sideKey !== "player2");
      return [state, matchBinding, "END_GAME_ARMY_TERMINAL_SCOPE_UNRESOLVED"];
    })(),
    (() => {
      const state = clone(leadNineScored);
      state.round = 5;
      return [state, matchBinding, "END_GAME_ROUND_UNSUPPORTED"];
    })(),
    (() => {
      const state = clone(leadNineScored);
      state.gameOver = true;
      return [state, matchBinding, "END_GAME_ALREADY_TERMINAL"];
    })(),
    [leadNineScored, { ...matchBinding, dataSnapshotHash: "0".repeat(64) },
      "END_GAME_DATA_SNAPSHOT_MISMATCH"],
  ];
  for (const [state, binding, expected] of cases) {
    const disabled = enumerateOfficialHoldPositionEndGameActionsV2(state, {
      sideKey: "player1",
      includeDisabled: true,
      matchBinding: binding,
    })[0];
    assert.equal(disabled.isEnabled, false);
    assert.equal(disabled.disabledReason, expected);
  }
});

const refereeKeys = generateKeyPairSync("ed25519");
function authority(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: { ...refereeKeys, keyId: "ticket-11-end-game-v2-key", hmacSecret },
  });
}

const authorityInitialState = scoringState({
  gameplayDataBundle,
  missionSetupBinding,
  supplyLossLedger,
  scores: { player1: 9, player2: 0 },
});
const engine = authority("ticket-11-end-game-v2-hmac-v1");
const initialEnvelope = engine.createEnvelope({
  roomId: "official-existing-hold-position-end-game-contract-room",
  dataVersion: "71/69/48",
  dependencies: {
    sourceSnapshot: {
      artifactId: "official-command-center-snapshot",
      content: liveReport.commandSnapshot,
    },
    dataSnapshot: {
      artifactId: "official-gameplay-data-bundle",
      content: gameplayDataBundle,
    },
  },
  state: authorityInitialState,
});
const scoringAuthority = applyFinite(
  engine,
  initialEnvelope,
  credentials(engine, initialEnvelope, "score"),
  OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID,
  "end-game-v2-scoring-apply",
);
const endGameAuthority = applyFinite(
  engine,
  scoringAuthority.applied.envelope,
  credentials(engine, scoringAuthority.applied.envelope, "end-game"),
  OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_ID,
  "end-game-v2-terminal-apply",
);

check("authority_legal_preview_confirm_apply_exposes_terminal_and_empty_legal_space", () => {
  assert.equal(endGameAuthority.applied.receipt.action.executorId,
    OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_ID);
  assert.deepEqual(endGameAuthority.applied.receipt.action.ruleAtomIds,
    [...OFFICIAL_HOLD_POSITION_END_GAME_V2_ATOM_IDS]);
  assert.equal(endGameAuthority.applied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
  assert.equal(endGameAuthority.applied.envelope.state.winner, "player1");
  const terminalCredentials = credentials(
    engine,
    endGameAuthority.applied.envelope,
    "terminal-read",
  );
  const terminalLegal = engine.legalSpace(endGameAuthority.applied.envelope, {
    seatAuthority: terminalCredentials.seatAuthority,
  });
  assert.equal(terminalLegal.finiteActions.length, 0);
  assert.equal(terminalLegal.parameterDomains.length, 0);
  assert.deepEqual(terminalLegal.terminal, {
    gameOver: true,
    winner: "player1",
    reason: "mission_hold_position_special_lead_10_plus",
    endGameResolutionHash:
      endGameAuthority.applied.envelope.state.endGameResolutionHistory.at(-1)
        .endGameResolutionHash,
  });
});

check("terminal_receipts_replay_after_hmac_rotation_and_tamper_fails", () => {
  const replayEngine = authority("ticket-11-end-game-v2-hmac-rotated-v1");
  registerReplayDependencies(
    replayEngine,
    initialEnvelope,
    runtime,
    liveReport.commandSnapshot,
    gameplayDataBundle,
  );
  const journal = [
    scoringAuthority.applied.receipt,
    endGameAuthority.applied.receipt,
  ];
  const replayed = replayEngine.replay({ initialEnvelope, journal });
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  assert.equal(replayed.envelope.stateHash, endGameAuthority.applied.envelope.stateHash);
  const tampered = clone(endGameAuthority.applied.receipt);
  tampered.events.push({ type: "forged_game_end" });
  assert.equal(replayEngine.replay({
    initialEnvelope,
    journal: [scoringAuthority.applied.receipt, tampered],
  }).reason, "SIGNATURE_INVALID");
});

const v1Source = await readFile(path.join(
  ROOT,
  "packages",
  "rule-atoms",
  "official-hold-position-end-game-executor-v1.mjs",
));

check("v1_source_runtime_and_historical_rules_display_remain_frozen", () => {
  assert.equal(contentHash(v1Source), PREVIOUS_EXECUTOR_SOURCE_HASH);
  assert.equal(previousRuntime.descriptor.runtimeHash, PREVIOUS_RUNTIME_HASH);
  assert.equal(previousCatalogue.executorManifest.some((entry) => (
    entry.executorId === "authority.hold-position-end-game-check-v1"
      && entry.executorVersion === "1.0.0"
  )), true);
  assert.equal(catalogue.executorManifest.some((entry) => (
    entry.executorId === "authority.hold-position-end-game-check-v1"
  )), false);
  assert.equal(initialEnvelope.matchBinding.rulesDisplayBinding.locale, "en");
  assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
  assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
});

const coreRulesBytes = await fetchOfficialBytes(CORE_RULES_URL, "coreRules");
const liveUrls = previousReport.liveOfficialRevalidation.urls;
const liveDocuments = {};
for (const [kind, url] of Object.entries(liveUrls)) {
  liveDocuments[kind] = await fetchOfficialJson(url, kind);
}

check("latest_official_core_71_69_48_and_hold_position_remain_current", () => {
  assert.equal(contentHash(coreRulesBytes), CORE_RULES_HASH);
  assert.deepEqual(dataset.dataVersions, {
    cardsVersion: "69",
    rulesVersion: "48",
    unitsVersion: "71",
  });
  assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
  assert.deepEqual(
    Object.fromEntries(Object.entries(liveDocuments).map(([kind, document]) => (
      [kind, documentHash(document)]
    ))),
    previousReport.liveOfficialRevalidation.hashes,
  );
  assert.equal(documentHash(liveDocuments.holdPosition), HOLD_POSITION_DOCUMENT_HASH);
  assert.ok(catalogue.sourceClauses
    .filter((clause) => OFFICIAL_HOLD_POSITION_END_GAME_V2_ATOM_IDS.some((atomId) => (
      catalogue.atoms.find((atom) => atom.atomId === atomId)?.clauseIds
        .includes(clause.clauseId)
    )))
    .every((clause) => clause.sourceContentHash === CORE_RULES_HASH));
});

check("ctx2skill_harness_memory_and_training_lanes_remain_closed", () => {
  assert.equal(slice.ctx2skill.ctx2skillLoopUsed, true);
  assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
  assert.deepEqual(slice.ctx2skill.promotions, []);
  assert.deepEqual(slice.harness.trainingTraceCandidates, []);
  assert.deepEqual(slice.harness.memoryTraceEvidence, {
    refs: [],
    promotionAttempted: false,
  });
  assert.equal(slice.rulesEligible, false);
  assert.equal(slice.productionRoomEligible, false);
  assert.equal(slice.trainingTruth, false);
});

const failures = acceptance.filter((entry) => !entry.passed);
const report = {
  schema: "starcraft_tmg_existing_hold_position_end_game_contract_closure_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  liveOfficialRevalidation: {
    urls: { coreRules: CORE_RULES_URL, ...liveUrls },
    hashes: {
      coreRules: contentHash(coreRulesBytes),
      ...Object.fromEntries(Object.entries(liveDocuments).map(([kind, document]) => (
        [kind, documentHash(document)]
      ))),
    },
    repositoryFallbackUsed: false,
  },
  frozenHistoricalV1: {
    executorId: "authority.hold-position-end-game-check-v1",
    executorVersion: "1.0.0",
    sourceHash: contentHash(v1Source),
    catalogueHash: previousCatalogue.catalogueHash,
    runtimeHash: previousRuntime.descriptor.runtimeHash,
    historicalRulesDisplayRetained: true,
    silentCompatibilityAllowed: false,
  },
  previousGraphHash: previousGraph.graphHash,
  graph,
  graphAudit,
  slice,
  sliceAudit,
  previousCoverage,
  coverage,
  catalogueHash: catalogue.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
  newlyExecutableRuleAtomIds: [],
  versionReassignedRuleAtomIds: [...OFFICIAL_HOLD_POSITION_END_GAME_V2_ATOM_IDS],
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder", "referee", "opponent"],
    skillsRead: [],
    skillsGenerated: [],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult: failures.length === 0
      ? "v2_terminal_receipts_replay_after_hmac_rotation_and_v1_remains_frozen"
      : "failed",
    promotions: [],
    blocks: ["25_existing_executors_still_require_state_contracts"],
    remainingRuleGaps: 491,
  },
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: ["referee_prompt", "opponent_prompt"],
    harnessToolsCalled: [
      "list_legal_actions",
      "preview_action",
      "confirm_action",
      "apply_action_after_user_confirmation",
      "replay_room",
      "query_rule_relationship_impact",
    ],
    uiTraceEvidence: ["terminal-summary-and-empty-post-terminal-legal-space"],
    agentDecisionEvidence: [
      "lead-nine-continues-and-lead-ten-terminates-for-either-seat",
      "army-elimination-final-round-and-trigger-priority-remain-fail-closed",
    ],
    memoryTraceEvidence: "no_memory_write_or_promotion_attempted",
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: [
      "missing_state_invalidation_or_judge_edge_removes_contract",
      "public_apply_terminal-summary_signature_or_replay_failure_removes_contract",
    ],
    userVisibleChecks: [
      "preview-shows-terminal-or-end-of-round-handoff",
      "terminal-room-shows-winner-reason-and-no-actions",
    ],
  },
  rulesTruth: "hold_position_end_game_v2_exact_public_action_and_state_contract",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-hold-position-end-game-contract-closure-v1-report.json",
  ),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash,
  catalogueHash: report.catalogueHash,
  runtimeHash: report.runtimeHash,
  graphHash: graph.graphHash,
  graphNodes: graph.nodes.length,
  graphEdges: graph.edges.length,
  strictCompleteAtoms: coverage.counts.strictCompleteAtoms,
  partialContractAtoms: coverage.counts.partialContractAtoms,
  noContractAtoms: coverage.counts.noContractAtoms,
  declaredStateContractExecutors: coverage.counts.declaredStateContractExecutors,
  stateContractMissingExecutors: coverage.counts.missingStateContractExecutors,
  failures,
}, null, 2));

if (failures.length > 0) process.exitCode = 1;
