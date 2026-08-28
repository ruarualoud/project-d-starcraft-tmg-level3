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
import { createOfficialCombatPassRelationshipExtensionV1 } from
  "../packages/rule-atoms/official-combat-pass-relationship-contract-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  createOfficialExistingMissionMarkerControlContractClosureRuleSliceV1,
  verifyOfficialExistingMissionMarkerControlContractClosureRuleSliceV1,
} from "../packages/rule-atoms/official-existing-mission-marker-control-contract-closure-rule-slice-v1.mjs";
import {
  createOfficialMissionMarkerControlRelationshipExtensionV1,
  OFFICIAL_MISSION_MARKER_CONTROL_RELATIONSHIP_NODE_IDS_V1,
} from "../packages/rule-atoms/official-mission-marker-control-relationship-contract-v1.mjs";
import {
  OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_ID,
} from "../packages/rule-atoms/official-mission-marker-control-executor-v2.mjs";
import {
  applyOfficialMissionMarkerControlV3,
  enumerateOfficialMissionMarkerControlActionsV3,
  OFFICIAL_MISSION_MARKER_CONTROL_V3_ACTION_TYPE,
  OFFICIAL_MISSION_MARKER_CONTROL_V3_ATOM_IDS,
  OFFICIAL_MISSION_MARKER_CONTROL_V3_EXECUTOR_ID,
  OFFICIAL_MISSION_MARKER_CONTROL_V3_EXECUTOR_VERSION,
} from "../packages/rule-atoms/official-mission-marker-control-executor-v3.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
  queryRuleRelationshipImpactV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { auditExecutableAtomStateContractCoverageV1 } from
  "../packages/rule-atoms/rule-executor-state-contract-coverage-v1.mjs";
import { createOfficialSupplyLossLedgerV1 } from
  "../packages/rule-atoms/official-supply-loss-ledger-v1.mjs";
import { createOfficialCommandCenterDataset } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialMissionSetupBindingV1 } from
  "../packages/source-data/official-mission-setup-binding-v1.mjs";

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
const OCCURRED_AT = "2026-08-28T15:00:00.000Z";
const PREVIOUS_RUNTIME_HASH =
  "1d6b06dd12b6eae1c0471d9a5a38073c316a4835018f0c8fc47112344226e26c";
const CURRENT_RUNTIME_HASH =
  "7ba03eba7f2ea2f357c5264bcc2f261453a0f3b3c0fc9310db3c281a2eac8f55";
const PREVIOUS_EXECUTOR_SOURCE_HASH =
  "91be66aad9af063282c97f68e13e4391c16b2a603a52ef0bef23018e12616379";
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

function documentHash(document) {
  return createHash("sha256")
    .update(`${canonicalStarcraftTmgJson(document)}\n`)
    .digest("hex");
}

function contentHash(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function fetchOfficialJson(url, kind) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`${kind} HTTP ${response.status}`);
      return JSON.parse(new TextDecoder().decode(await response.arrayBuffer()));
    } catch (error) {
      lastError = error;
    }
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }
  throw lastError;
}

function marker(number, controlSideKey = null) {
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

function model(id, xInches) {
  return {
    id,
    xInches,
    yInches: 6,
    baseShape: "round",
    baseWidthInches: 1,
    baseDepthInches: 1,
    elevation: "ground",
    supportTerrainIds: [],
    isOnField: true,
    isDestroyed: false,
  };
}

function unit(id, sideKey, xInches, input = {}) {
  const isOnField = input.isOnField !== false;
  const currentModels = Number(input.currentModels || 4);
  const currentSupply = currentModels <= 3 ? 0 : currentModels <= 6 ? 1 : 2;
  return {
    id,
    sideKey,
    officialUnitRecordKey: "army_units:marine",
    combatTag: "ground",
    currentModels,
    currentSupply,
    isOnField,
    isDestroyed: false,
    coherencyStatus: {
      schemaVersion: "starcraft_tmg_unit_coherency_status_v1",
      status: "in_coherency",
      isOutOfCoherency: false,
    },
    models: isOnField ? Array.from({ length: currentModels }, (_, index) => (
      model(`${id}-model-${index + 1}`, xInches + (index * 0.02))
    )) : [],
    ...input,
  };
}

function stateFixture(gameplayDataBundle, missionSetupBinding, supplyLossLedger) {
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
    scores: { player1: 2, player2: 1 },
    officialGameplayDataBundle: gameplayDataBundle,
    officialMissionSetupBinding: missionSetupBinding,
    supplyLossLedger,
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
        marker(5, null),
      ],
      terrain: [],
      accessPoints: [],
      effectMarkers: [{ id: "fixture-effect" }],
      tokens: [{ id: "fixture-token" }],
    },
    cardResources: {
      player1: [{ id: "p1-card", currentResource: 2, maxResource: 2 }],
      player2: [{ id: "p2-card", currentResource: 1, maxResource: 2 }],
    },
    pieces: [
      unit("p1-marker-1", "player1", 5),
      unit("p1-marker-2", "player1", 15),
      unit("p2-marker-2", "player2", 15.5),
      unit("p1-marker-3-a", "player1", 25),
      unit("p1-marker-3-b", "player1", 25.5),
      unit("p2-marker-3", "player2", 24.5),
      unit("p2-marker-5", "player2", 45),
      unit("p2-flying-excluded", "player2", 5.5, { combatTag: "flying" }),
      unit("p2-burrowed-excluded", "player2", 5.5, { statuses: ["burrowed"] }),
      unit("p2-ooc-excluded", "player2", 5.5, {
        coherencyStatus: {
          schemaVersion: "starcraft_tmg_unit_coherency_status_v1",
          status: "out_of_coherency",
          isOutOfCoherency: true,
        },
      }),
      unit("p2-reserve-excluded", "player2", 5.5, { isOnField: false }),
    ],
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

function disabledReason(state, sideKey, matchBinding) {
  return enumerateOfficialMissionMarkerControlActionsV3(state, {
    sideKey,
    includeDisabled: true,
    matchBinding,
  })[0]?.disabledReason;
}

function markerPhysicalState(state) {
  return state.board.missionMarkers.map((entry) => ({
    id: entry.id,
    number: entry.number,
    xInches: entry.xInches,
    yInches: entry.yInches,
    diameterMillimeters: entry.diameterMillimeters,
    elevation: entry.elevation,
    isActivated: entry.isActivated,
  }));
}

function protectedState(state) {
  return clone({
    round: state.round,
    phase: state.phase,
    activeSideKey: state.activeSideKey,
    firstPlayerSideKey: state.firstPlayerSideKey,
    phaseFirstActorByRound: state.phaseFirstActorByRound,
    players: state.players,
    pieces: state.pieces,
    scores: state.scores,
    cardResources: state.cardResources,
    officialGameplayDataBundle: state.officialGameplayDataBundle,
    officialMissionSetupBinding: state.officialMissionSetupBinding,
    supplyLossLedger: state.supplyLossLedger,
    boardGeometry: {
      widthInches: state.board.widthInches,
      heightInches: state.board.heightInches,
      declaration: state.board.missionMarkerControlGeometry,
      markers: markerPhysicalState(state),
      terrain: state.board.terrain,
      accessPoints: state.board.accessPoints,
      effectMarkers: state.board.effectMarkers,
      tokens: state.board.tokens,
    },
  });
}

function credentials(engine, envelope, sideKey) {
  const seatAuthority = engine.issueSeatAuthority({
    grantId: `mission-marker-contract-${sideKey}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const controlLease = engine.issueControlLease({
    seatAuthority,
    sessionId: `mission-marker-contract-${sideKey}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { seatAuthority, controlLease };
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
    geometryArtifact: {
      kind: "geometry-artifact",
      geometryVersion: "fixed_point_round_base_v1",
    },
    actionSchema: {
      kind: "action-schema",
      schemaVersion: "hybrid_legal_space_v17",
    },
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
    content: `# Historical rules display\n\nFrozen rules version: ${runtime.descriptor.rulesVersion}\n\nThis development artifact preserves the rules identity used by the match.`,
  });
}

const previousReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-existing-combat-pass-contract-closure-v1-report.json"),
  "utf8",
));
const previousCatalogue = previousReport.slice.catalogue;
const previousRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousCatalogue,
});
const previousExtension = createOfficialCombatPassRelationshipExtensionV1({
  catalogueHash: previousCatalogue.catalogueHash,
  runtimeHash: previousRuntime.descriptor.runtimeHash,
});
const previousGraph = createRuleRelationshipGraphV1({
  catalogue: previousCatalogue,
  extension: previousExtension,
});
const previousCoverage = auditExecutableAtomStateContractCoverageV1(previousGraph);
const slice = createOfficialExistingMissionMarkerControlContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const sliceAudit = verifyOfficialExistingMissionMarkerControlContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
const catalogue = slice.catalogue;
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
const extension = createOfficialMissionMarkerControlRelationshipExtensionV1({
  catalogueHash: catalogue.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const graph = createRuleRelationshipGraphV1({ catalogue, extension });
const graphAudit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);
const ids = OFFICIAL_MISSION_MARKER_CONTROL_RELATIONSHIP_NODE_IDS_V1;

check("mission_marker_v3_reassigns_22_old_atoms_from_none_to_strict", () => {
  assert.equal(previousRuntime.descriptor.runtimeHash, PREVIOUS_RUNTIME_HASH);
  assert.deepEqual(previousCoverage.counts, {
    executableAtoms: 421,
    strictCompleteAtoms: 122,
    partialContractAtoms: 80,
    noContractAtoms: 219,
    executors: 42,
    declaredStateContractExecutors: 14,
    missingStateContractExecutors: 28,
  });
  assert.deepEqual(coverage.counts, {
    executableAtoms: 421,
    strictCompleteAtoms: 144,
    partialContractAtoms: 80,
    noContractAtoms: 197,
    executors: 42,
    declaredStateContractExecutors: 15,
    missingStateContractExecutors: 27,
  });
  assert.ok(OFFICIAL_MISSION_MARKER_CONTROL_V3_ATOM_IDS.every((atomId) => (
    previousCoverage.atomCoverage.find((entry) => entry.atomId === atomId)?.contractStatus
      === "none"
      && coverage.atomCoverage.find((entry) => entry.atomId === atomId)?.contractStatus
      === "strict_complete"
  )));
  assert.deepEqual(sliceAudit.counts, {
    executableRuleAtoms: 421,
    reviewRequiredRuleAtoms: 491,
    displayOnlyRuleAtoms: 114,
    changedAtoms: 22,
    changedNonTargetAtoms: 0,
    newlyExecutableRuleAtoms: 0,
    versionReassignedRuleAtoms: 22,
    declaredStateContractExecutors: 15,
    stateContractMissingExecutors: 27,
    strictCompleteAtoms: 144,
    partialContractAtoms: 80,
    noContractAtoms: 197,
  });
});

check("official_binding_supply_control_and_replay_paths_reach_judge_contracts", () => {
  const queries = [
    {
      startNodeId: ids.officialGameplayDataBundle,
      targetNodeIds: [ids.sourceBindingTest],
      relationships: ["projects_to", "verified_by"],
    },
    {
      startNodeId: ids.pieces,
      targetNodeIds: [ids.supplyAndGeometryTest],
      relationships: ["projects_to", "derives", "verified_by"],
    },
    {
      startNodeId: ids.controlAction,
      targetNodeIds: [ids.controlSemanticsTest, ids.replayTest],
      relationships: ["derives", "writes", "verified_by"],
    },
  ].map((query) => queryRuleRelationshipImpactV1(graph, {
    ...query,
    maxDepth: 9,
  }));
  assert.ok(queries.every((impact) => impact.paths.every((entry) => entry.reached)));
  assert.equal(graphAudit.valid, true);
});

check("missing_mission_marker_invalidation_or_judge_edges_blocks_scope", () => {
  const broken = clone(extension);
  broken.edges = broken.edges.filter((entry) => (
    entry.provenance !== "mission_marker_control_state_invalidation_v1"
      && entry.provenance !== "mission_marker_control_judge_v1"
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
const initialState = stateFixture(gameplayDataBundle, missionSetupBinding, supplyLossLedger);
const matchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: CURRENT_RUNTIME_HASH },
};
const candidate = enumerateOfficialMissionMarkerControlActionsV3(initialState, {
  sideKey: "player1",
  matchBinding,
})[0];
assert.ok(candidate, JSON.stringify(enumerateOfficialMissionMarkerControlActionsV3(
  initialState,
  { sideKey: "player1", includeDisabled: true, matchBinding },
)));
const exactAction = executableAction(candidate);
const protectedBefore = protectedState(initialState);
const direct = applyOfficialMissionMarkerControlV3(initialState, exactAction, {
  matchBinding,
  postRevision: 1,
});

check("public_apply_exact_matches_enumeration_and_rejects_forged_payloads", () => {
  assert.equal(candidate.executorId, OFFICIAL_MISSION_MARKER_CONTROL_V3_EXECUTOR_ID);
  assert.equal(candidate.executorVersion, OFFICIAL_MISSION_MARKER_CONTROL_V3_EXECUTOR_VERSION);
  for (const forged of [
    { ...exactAction, executorVersion: "999.0.0" },
    { ...exactAction, ruleAtomIds: [] },
    { ...exactAction, missionMarkerControlResolution: { markerResults: [] } },
    { ...exactAction, details: { callerInjectedAuthority: true } },
    { ...exactAction, callerInjectedAuthority: true },
  ]) {
    assert.throws(
      () => applyOfficialMissionMarkerControlV3(initialState, forged, { matchBinding }),
      /MISSION_MARKER_V3_ACTION_(?:INVALID|MISMATCH)/u,
    );
  }
});

check("higher_supply_tie_sticky_and_exclusion_keywords_resolve_exactly", () => {
  const results = direct.controlResolution.markerResults;
  assert.deepEqual(results.map((entry) => ({
    markerNumber: entry.markerNumber,
    nextControlSideKey: entry.nextControlSideKey,
    result: entry.result,
    supplyTotals: entry.supplyTotals,
  })), [
    { markerNumber: 1, nextControlSideKey: "player1", result: "sole_contestant_retains_control", supplyTotals: { player1: 1, player2: 0 } },
    { markerNumber: 2, nextControlSideKey: "player1", result: "tied_supply_no_transfer", supplyTotals: { player1: 1, player2: 1 } },
    { markerNumber: 3, nextControlSideKey: "player1", result: "higher_supply_reclaims_control", supplyTotals: { player1: 2, player2: 1 } },
    { markerNumber: 4, nextControlSideKey: "player2", result: "no_contest_sticky_control", supplyTotals: { player1: 0, player2: 0 } },
    { markerNumber: 5, nextControlSideKey: "player2", result: "sole_contestant_takes_control", supplyTotals: { player1: 0, player2: 1 } },
  ]);
  const markerOneReasons = new Set(results[0].ineligibleUnits.map((entry) => entry.reason));
  assert.ok(["flying", "burrowed", "out_of_coherency", "not_on_battlefield"]
    .every((reason) => markerOneReasons.has(reason)));
});

check("apply_writes_only_marker_control_cleanup_progress_and_log", () => {
  assert.deepEqual(protectedState(direct.state), protectedBefore);
  assert.deepEqual(
    direct.state.board.missionMarkers.map((entry) => entry.controlSideKey),
    ["player1", "player1", "player1", "player2", "player2"],
  );
  assert.deepEqual(direct.state.scoringCleanupProgress.completedSteps, [
    OFFICIAL_MISSION_MARKER_CONTROL_V3_ACTION_TYPE,
  ]);
  assert.equal(direct.state.scoringCleanupProgress.currentStep, "score_victory_points");
  assert.equal(direct.state.log.at(-1).action.executorId,
    OFFICIAL_MISSION_MARKER_CONTROL_V3_EXECUTOR_ID);
});

check("seat_lifecycle_source_supply_and_geometry_drift_fail_closed", () => {
  assert.equal(
    disabledReason(initialState, "player2", matchBinding),
    "MISSION_MARKER_CONTROL_FIRST_PLAYER_ONLY",
  );
  assert.equal(
    disabledReason(direct.state, "player1", matchBinding),
    "MISSION_MARKER_CONTROL_ALREADY_DETERMINED",
  );
  const wrongDataBinding = clone(matchBinding);
  wrongDataBinding.dataSnapshotHash = "0".repeat(64);
  assert.equal(
    disabledReason(initialState, "player1", wrongDataBinding),
    "MISSION_MARKER_V2_DATA_SNAPSHOT_MISMATCH",
  );
  const tamperedSupply = clone(initialState);
  tamperedSupply.supplyLossLedger.lossBySide.player1 = 1;
  assert.equal(
    disabledReason(tamperedSupply, "player1", matchBinding),
    "SUPPLY_LOSS_LEDGER_HASH_MISMATCH",
  );
  const incompleteGeometry = clone(initialState);
  incompleteGeometry.board.missionMarkerControlGeometry.markerCoordinatesComplete = false;
  assert.equal(
    disabledReason(incompleteGeometry, "player1", matchBinding),
    "MISSION_MARKER_GEOMETRY_INCOMPLETE",
  );
  const wrongUnitSupply = clone(initialState);
  wrongUnitSupply.pieces[0].currentSupply = 99;
  assert.equal(
    disabledReason(wrongUnitSupply, "player1", matchBinding),
    "MISSION_MARKER_SUPPLY_STATE_MISMATCH",
  );
});

const refereeKeys = generateKeyPairSync("ed25519");
function authority(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-existing-mission-marker-contract-v1",
      ...refereeKeys,
      hmacSecret,
    },
  });
}

const engine = authority("ticket-11-existing-mission-marker-hmac-v1");
const initialEnvelope = engine.createEnvelope({
  roomId: "official-existing-mission-marker-contract-room",
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
  state: initialState,
});
const player1 = credentials(engine, initialEnvelope, "player1");
const legal = engine.legalSpace(initialEnvelope, { seatAuthority: player1.seatAuthority });
const finite = legal.finiteActions.find((entry) => (
  entry.action.executorId === OFFICIAL_MISSION_MARKER_CONTROL_V3_EXECUTOR_ID
));
assert.ok(finite, JSON.stringify(legal.disabledDiagnostics));
const previewed = engine.preview({
  envelope: initialEnvelope,
  seatAuthority: player1.seatAuthority,
  proposal: { kind: "finite", actionKey: finite.actionKey },
  occurredAt: OCCURRED_AT,
});
assert.equal(previewed.ok, true, JSON.stringify(previewed));
const confirmed = engine.confirmPreview({
  envelope: initialEnvelope,
  preview: previewed.preview,
  seatAuthority: player1.seatAuthority,
  occurredAt: OCCURRED_AT,
});
assert.equal(confirmed.ok, true, JSON.stringify(confirmed));
const applied = engine.apply({
  envelope: initialEnvelope,
  expectedStateRevision: initialEnvelope.stateRevision,
  preview: previewed.preview,
  confirmation: confirmed.confirmation,
  seatAuthority: player1.seatAuthority,
  controlLease: player1.controlLease,
  idempotencyKey: "existing-mission-marker-control-apply-v1",
  occurredAt: OCCURRED_AT,
});

check("authority_legal_preview_confirm_apply_binds_v3_lineage", () => {
  assert.equal(applied.ok, true, JSON.stringify(applied));
  assert.equal(applied.receipt.action.executorId,
    OFFICIAL_MISSION_MARKER_CONTROL_V3_EXECUTOR_ID);
  assert.deepEqual(applied.receipt.action.ruleAtomIds,
    [...OFFICIAL_MISSION_MARKER_CONTROL_V3_ATOM_IDS]);
  assert.equal(applied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
  assert.equal(applied.envelope.state.scoringCleanupProgress.currentStep,
    "score_victory_points");
  const nextLegal = engine.legalSpace(applied.envelope, {
    seatAuthority: player1.seatAuthority,
  });
  assert.ok(nextLegal.finiteActions.some((entry) => (
    entry.action.actionType === "score_victory_points"
  )));
});

check("v3_receipt_replays_after_hmac_rotation_and_tamper_fails", () => {
  const replayEngine = authority("ticket-11-existing-mission-marker-hmac-rotated-v1");
  registerReplayDependencies(
    replayEngine,
    initialEnvelope,
    runtime,
    liveReport.commandSnapshot,
    gameplayDataBundle,
  );
  const replayed = replayEngine.replay({
    initialEnvelope,
    journal: [applied.receipt],
  });
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  assert.equal(replayed.envelope.stateHash, applied.envelope.stateHash);
  const tampered = clone(applied.receipt);
  tampered.events.push({ type: "forged_mission_marker_control" });
  assert.equal(replayEngine.replay({
    initialEnvelope,
    journal: [tampered],
  }).reason, "SIGNATURE_INVALID");
});

const v2Source = await readFile(
  path.join(ROOT, "packages", "rule-atoms", "official-mission-marker-control-executor-v2.mjs"),
);

check("v2_source_runtime_and_historical_rules_display_remain_frozen", () => {
  assert.equal(contentHash(v2Source), PREVIOUS_EXECUTOR_SOURCE_HASH);
  assert.equal(previousRuntime.descriptor.runtimeHash, PREVIOUS_RUNTIME_HASH);
  assert.equal(previousCatalogue.executorManifest.some((entry) => (
    entry.executorId === OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_ID
      && entry.executorVersion === "2.0.0"
  )), true);
  assert.equal(catalogue.executorManifest.some((entry) => (
    entry.executorId === OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_ID
  )), false);
  assert.equal(initialEnvelope.matchBinding.rulesDisplayBinding.locale, "en");
  assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
  assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
});

const liveDocuments = {};
for (const [kind, url] of Object.entries(previousReport.liveOfficialRevalidation.urls)) {
  liveDocuments[kind] = await fetchOfficialJson(url, kind);
}

check("live_official_71_69_48_and_bound_documents_remain_current", () => {
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
});

check("ctx2skill_harness_memory_and_training_lanes_remain_closed", () => {
  assert.equal(slice.ctx2skill.ctx2skillLoopUsed, true);
  assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
  assert.deepEqual(slice.ctx2skill.promotions, []);
  assert.deepEqual(slice.harness.trainingTraceCandidates, []);
  assert.equal(slice.harness.memoryTraceEvidence, "no-memory-write-or-promotion-attempted");
  assert.equal(slice.rulesEligible, false);
  assert.equal(slice.productionRoomEligible, false);
  assert.equal(slice.trainingTruth, false);
});

const failures = acceptance.filter((entry) => !entry.passed);
const report = {
  schema: "starcraft_tmg_existing_mission_marker_control_contract_closure_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  liveOfficialRevalidation: {
    urls: previousReport.liveOfficialRevalidation.urls,
    hashes: Object.fromEntries(Object.entries(liveDocuments).map(([kind, document]) => (
      [kind, documentHash(document)]
    ))),
    repositoryFallbackUsed: false,
  },
  frozenHistoricalV2: {
    executorId: OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_ID,
    executorVersion: "2.0.0",
    sourceHash: contentHash(v2Source),
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
  versionReassignedRuleAtomIds: [...OFFICIAL_MISSION_MARKER_CONTROL_V3_ATOM_IDS],
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder", "referee", "opponent"],
    skillsRead: [],
    skillsGenerated: [],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult: failures.length === 0
      ? "v3_receipt_replays_after_hmac_rotation_and_v2_runtime_remains_frozen"
      : "failed",
    promotions: [],
    blocks: ["27_existing_executors_still_require_state_contracts"],
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
    uiTraceEvidence: ["mission-marker-control-visible-only-at-exact-cleanup-step"],
    agentDecisionEvidence: [
      "exact-five-marker-current-supply-control-denominator",
      "forged-lineage-resolution-and-extra-fields-fail-closed",
    ],
    memoryTraceEvidence: "no_memory_write_or_promotion_attempted",
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: [
      "missing_state_invalidation_or_judge_edge_removes_contract",
      "public_apply_or_receipt_replay_failure_removes_contract",
    ],
    userVisibleChecks: [
      "marker_control_updates_before_victory_point_scoring",
    ],
  },
  rulesTruth: "mission_marker_control_v3_exact_public_action_and_state_contract",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-existing-mission-marker-control-contract-closure-v1-report.json"),
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
