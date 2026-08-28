#!/usr/bin/env node

import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from "../packages/authoritative-engine/transition-v1.mjs";
import {
  OFFICIAL_STANDARD_MOVE_ACTION_ATOM_IDS,
  OFFICIAL_STANDARD_MOVE_EXECUTOR_ID,
  OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION,
  OFFICIAL_STANDARD_MOVE_NEW_ATOM_IDS,
  OFFICIAL_STANDARD_MOVE_PARAMETER_KIND,
} from "../packages/rule-atoms/official-standard-move-executor-v1.mjs";
import {
  createOfficialStandardMoveRuleSliceV1,
  verifyOfficialStandardMoveRuleSliceV1,
} from "../packages/rule-atoms/official-standard-move-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialRoundSupplyStateV1 } from "../packages/rule-atoms/official-round-supply-state-v1.mjs";
import { createOfficialCommandCenterDataset } from "../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialMissionSetupBindingV1 } from "../packages/source-data/official-mission-setup-binding-v1.mjs";

assert.equal(OFFICIAL_STANDARD_MOVE_PARAMETER_KIND, "official_standard_move_path_v1");
assert.equal(OFFICIAL_STANDARD_MOVE_NEW_ATOM_IDS.length, 10);
assert.equal(typeof createOfficialStandardMoveRuleSliceV1, "function");

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
const HISTORICAL_SLICE_18_RUNTIME_HASH =
  "4b28cfd12fa388f3e8f7fa32547814ec2ad1cbb8205c4d547977eb9049e247a6";
const acceptance = [];

const previousReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-reserve-deploy-rule-slice-v1-report.json"),
  "utf8",
));
const slice = createOfficialStandardMoveRuleSliceV1({ previousSlice: previousReport.slice });
const audit = verifyOfficialStandardMoveRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(audit.counts.executableRuleAtoms, 229);
assert.equal(audit.counts.newlyExecutableRuleAtoms, 10);
assert.equal(audit.counts.reviewRequiredRuleAtoms, 683);
assert.equal(audit.counts.changedNonTargetAtoms, 0);
acceptance.push("catalogue_promotes_only_ten_exact_standard_move_atoms");

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
const dataset = createOfficialCommandCenterDataset({ snapshot, firestorePayloads });
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot,
  dataset,
  unitRecordKeys: ["army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
  cleanupCardRecordKeys: ["tactical_cards:academy", "tactical_cards:terran_armed_forces"],
  reserveDeployData: true,
});
assert.equal(gameplayDataBundle.reserveDeployDataBundle.deploymentProfile.name, "GAUNTLET");
assert.equal(gameplayDataBundle.reserveDeployDataBundle.unitMovementProfile.sourceValue, "4/7");
assert.equal(gameplayDataBundle.reserveDeployDataBundle.unitMovementProfile.baseDiameterMm, 32);
acceptance.push("standard_move_reuses_current_official_gauntlet_marine_and_latest_p2p_base_binding");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executableRuleAtomCount, 229);
assert.ok(runtime.descriptor.parameterDomainKinds.includes(OFFICIAL_STANDARD_MOVE_PARAMETER_KIND));
const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(historicalRuntime.descriptor.runtimeHash, HISTORICAL_SLICE_18_RUNTIME_HASH);
assert.equal(historicalRuntime.descriptor.executableRuleAtomCount, 219);
acceptance.push("slice18_runtime_and_rules_display_remain_strictly_frozen");

const missionSetupBinding = createOfficialMissionSetupBindingV1({
  gameplayDataBundle,
  missionDraftReceiptHash: hashStarcraftTmgContract({ kind: "standard-move-mission-draft" }),
  deploymentDraftReceiptHash: hashStarcraftTmgContract({ kind: "standard-move-deployment-draft" }),
  seatColorAssignment: { player1: "red", player2: "blue" },
});
const { privateKey, publicKey } = generateKeyPairSync("ed25519");

function authoritativeEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-standard-move-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}

function marineModel(id, input = {}) {
  return {
    id,
    baseShape: "round",
    baseWidthInches: 1.26,
    baseDepthInches: 1.26,
    xInches: Number(input.xInches || 0),
    yInches: Number(input.yInches || 0),
    isOnField: input.isOnField !== false,
    isDestroyed: false,
  };
}

function marinePiece(input) {
  const profile = gameplayDataBundle.reserveDeployDataBundle.unitMovementProfile;
  const positions = input.positions || [];
  const currentModels = Number(input.currentModels || positions.length || 1);
  return {
    id: input.id,
    name: "Marine",
    sideKey: input.sideKey,
    officialUnitRecordKey: profile.recordKey,
    sourceRecordHash: profile.sourceRecordHash,
    currentModels,
    currentSupply: Number(input.currentSupply ?? (currentModels <= 3 ? 0 : currentModels <= 6 ? 1 : 2)),
    isOnField: input.isOnField !== false,
    isDestroyed: false,
    statuses: input.statuses || [],
    selectedUpgradeNames: [],
    activatedPhases: { movement: false, assault: false, combat: false },
    models: Array.from({ length: currentModels }, (_unused, index) => marineModel(
      `${input.id}-m${index + 1}`,
      {
        isOnField: input.isOnField !== false,
        xInches: positions[index]?.xInches,
        yInches: positions[index]?.yInches,
      },
    )),
  };
}

const friendlyPositions = [
  { xInches: 10, yInches: 10 },
  { xInches: 12, yInches: 10 },
  { xInches: 10, yInches: 12 },
  { xInches: 8, yInches: 10 },
];

function movementState(input = {}) {
  const round = Number(input.round || 3);
  const state = {
    schemaVersion: "starcraft_tmg_state_v0",
    round,
    phase: input.phase || "movement",
    activeSideKey: input.activeSideKey || "player1",
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: {},
    phaseFirstActorByRound: {
      [`${round}:movement`]: {
        round,
        phase: "movement",
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
    officialMissionSetupBinding: missionSetupBinding,
    board: {
      widthInches: 54,
      heightInches: 36,
      missionMarkers: structuredClone(
        gameplayDataBundle.reserveDeployDataBundle.deploymentProfile.geometry.missionMarkers,
      ),
      effectMarkers: [],
      tokens: [],
      markers: [],
      terrain: [],
      accessPoints: [],
    },
    cardResources: { player1: [], player2: [] },
    pieces: input.pieces || [
      marinePiece({
        id: "p1-live",
        sideKey: "player1",
        currentModels: 4,
        positions: friendlyPositions,
        statuses: ["stationary"],
      }),
      marinePiece({
        id: "p2-live",
        sideKey: "player2",
        currentModels: 1,
        positions: [{ xInches: 40, yInches: 26 }],
      }),
    ],
    startOfRoundHistory: [],
    gameOver: false,
    terminal: false,
    winner: "",
    terminalReason: "",
    log: [],
  };
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({
    state,
    gameplayDataBundle,
    rulesRuntimeHash: runtime.descriptor.runtimeHash,
  });
  state.startOfRoundHistory.push({
    round,
    roundSupplyStateHash: state.officialRoundSupplyState.roundSupplyStateHash,
    trainingTruth: false,
  });
  return state;
}

function envelopeForState(engine, roomId, state) {
  return engine.createEnvelope({
    roomId,
    dataVersion: `${snapshot.dataVersions.unitsVersion}/${snapshot.dataVersions.cardsVersion}/${snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-command-center-snapshot", content: snapshot },
      dataSnapshot: { artifactId: "official-gameplay-data-bundle", content: gameplayDataBundle },
    },
    state,
  });
}

function credentials(engine, envelope, sideKey, suffix) {
  const authority = engine.issueSeatAuthority({
    grantId: `standard-move-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `standard-move-${suffix}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

function moveDomain(engine, envelope, authority, pieceId = "p1-live") {
  const legal = engine.legalSpace(envelope, { seatAuthority: authority });
  const domain = legal.parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_STANDARD_MOVE_PARAMETER_KIND
      && entry.pieceId === pieceId
  ));
  assert.ok(domain, JSON.stringify(legal.disabledDiagnostics));
  return { legal, domain };
}

const validParameters = {
  leadingModelId: "p1-live-m1",
  path: [{ xMilliInches: 14_000, yMilliInches: 10_000 }],
  placements: [
    { modelId: "p1-live-m2", xMilliInches: 12_000, yMilliInches: 10_000 },
    { modelId: "p1-live-m3", xMilliInches: 14_000, yMilliInches: 12_000 },
    { modelId: "p1-live-m4", xMilliInches: 16_000, yMilliInches: 10_000 },
  ],
};

const engine = authoritativeEngine("ticket-11-standard-move-seal-v1");
const initial = envelopeForState(engine, "official-standard-move-room", movementState());
const access = credentials(engine, initial, "player1", "valid");
const { domain } = moveDomain(engine, initial, access.authority);
assert.equal(domain.executorId, OFFICIAL_STANDARD_MOVE_EXECUTOR_ID);
assert.equal(domain.executorVersion, OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION);
assert.deepEqual(domain.ruleAtomIds, [...OFFICIAL_STANDARD_MOVE_ACTION_ATOM_IDS]);
assert.equal(domain.constraints.maxDistanceMilliInches, 4_000);
assert.deepEqual(domain.constraints.modelStartPoints["p1-live-m1"], {
  xMilliInches: 10_000,
  yMilliInches: 10_000,
});
acceptance.push("movement_legal_space_exposes_exact_source_bound_path_domain");

const preview = engine.preview({
  envelope: initial,
  seatAuthority: access.authority,
  proposal: { kind: "parameterized", domainId: domain.domainId, parameters: validParameters },
});
assert.equal(preview.ok, true, JSON.stringify(preview));
assert.equal(
  preview.preview.core.action.movePlan.schemaVersion,
  "starcraft_tmg_official_standard_move_plan_v1",
);
assert.equal(preview.preview.core.action.movePlan.distanceTravelledInches, 4);
assert.equal(preview.preview.core.action.movePlan.speedAllowanceInches, 4);
assert.equal(preview.preview.core.confirmationPolicy.baseClass, "direct_gesture");
assert.equal(preview.preview.core.confirmationPolicy.requiresExplicitHuman, false);
const confirmed = engine.confirmPreview({
  envelope: initial,
  preview: preview.preview,
  seatAuthority: access.authority,
});
assert.equal(confirmed.ok, true, JSON.stringify(confirmed));
const applied = engine.apply({
  envelope: initial,
  expectedStateRevision: initial.stateRevision,
  preview: preview.preview,
  confirmation: confirmed.confirmation,
  seatAuthority: access.authority,
  controlLease: access.lease,
  idempotencyKey: "standard-move-valid-v1",
});
assert.equal(applied.ok, true, JSON.stringify(applied));
const moved = applied.envelope.state.pieces.find((piece) => piece.id === "p1-live");
assert.deepEqual(
  moved.models.map((model) => [model.id, model.xInches, model.yInches]),
  [
    ["p1-live-m1", 14, 10],
    ["p1-live-m2", 12, 10],
    ["p1-live-m3", 14, 12],
    ["p1-live-m4", 16, 10],
  ],
);
assert.equal(moved.statuses.includes("stationary"), false);
assert.equal(moved.activatedPhases.movement, true);
assert.equal(moved.inCoherency, true);
assert.equal(applied.envelope.state.activeSideKey, "player2");
assert.equal(
  applied.envelope.state.officialRoundSupplyState.roundSupplyStateHash,
  initial.state.officialRoundSupplyState.roundSupplyStateHash,
);
assert.equal(applied.receipt.trainingTruth, false);
acceptance.push("same_unit_passage_move_set_activation_supply_stability_and_alternation_apply_atomically");

function assertInstantiationRejected(parameters, pattern) {
  assert.throws(
    () => runtime.instantiate(initial.state, domain, parameters, {
      matchBinding: initial.matchBinding,
    }),
    pattern,
  );
}

assertInstantiationRejected({
  ...validParameters,
  path: [{ xMilliInches: 14_001, yMilliInches: 10_000 }],
}, /MOVE_PATH_EXCEEDS_SPEED/u);
assertInstantiationRejected({
  ...validParameters,
  path: [{ xMilliInches: 10_000, yMilliInches: 10_000 }],
}, /MOVE_PATH_MUST_CHANGE_POSITION/u);
assertInstantiationRejected({
  ...validParameters,
  placements: [
    { modelId: "p1-live-m2", xMilliInches: 14_000, yMilliInches: 10_000 },
    ...validParameters.placements.slice(1),
  ],
}, /MOVE_BASE_OVERLAP/u);
assertInstantiationRejected({
  ...validParameters,
  placements: [
    { modelId: "p1-live-m2", xMilliInches: 10_000, yMilliInches: 10_000 },
    ...validParameters.placements.slice(1),
  ],
}, /MOVE_OUT_OF_COHERENCY/u);
acceptance.push("speed_zero_distance_overlap_and_coherency_violations_fail_closed");

const engagedState = movementState({
  pieces: [
    marinePiece({ id: "p1-live", sideKey: "player1", positions: [{ xInches: 10, yInches: 10 }] }),
    marinePiece({ id: "p2-live", sideKey: "player2", positions: [{ xInches: 12, yInches: 10 }] }),
  ],
});
const engagedEnvelope = envelopeForState(engine, "official-standard-move-engaged", engagedState);
const engagedLegal = runtime.enumerate(engagedEnvelope.state, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding: engagedEnvelope.matchBinding,
});
assert.equal(engagedLegal.parameterDomains.some((entry) => (
  entry.parameterKind === OFFICIAL_STANDARD_MOVE_PARAMETER_KIND
)), false);
assert.ok(engagedLegal.candidates.some((entry) => (
  entry.pieceId === "p1-live" && entry.disabledReason === "MOVE_UNIT_ENGAGED"
)), JSON.stringify(engagedLegal.candidates));
acceptance.push("engaged_unit_has_no_standard_move_domain");

const blockingState = movementState({
  pieces: [
    marinePiece({ id: "p1-live", sideKey: "player1", positions: [{ xInches: 10, yInches: 10 }] }),
    marinePiece({ id: "p1-blocker", sideKey: "player1", positions: [{ xInches: 12, yInches: 10 }] }),
    marinePiece({ id: "p2-live", sideKey: "player2", positions: [{ xInches: 40, yInches: 26 }] }),
  ],
});
const blockingEnvelope = envelopeForState(engine, "official-standard-move-blocking", blockingState);
const blockingAccess = credentials(engine, blockingEnvelope, "player1", "blocking");
const { domain: blockingDomain } = moveDomain(engine, blockingEnvelope, blockingAccess.authority);
assert.throws(
  () => runtime.instantiate(blockingEnvelope.state, blockingDomain, {
    leadingModelId: "p1-live-m1",
    path: [{ xMilliInches: 14_000, yMilliInches: 10_000 }],
    placements: [],
  }, { matchBinding: blockingEnvelope.matchBinding }),
  /MOVE_PATH_COLLISION/u,
);
acceptance.push("other_unit_blocks_leading_path_while_same_unit_models_do_not");

const enemyEndpointState = movementState({
  pieces: [
    marinePiece({ id: "p1-live", sideKey: "player1", positions: [{ xInches: 10, yInches: 10 }] }),
    marinePiece({ id: "p2-live", sideKey: "player2", positions: [{ xInches: 16, yInches: 10 }] }),
  ],
});
const enemyEndpointEnvelope = envelopeForState(
  engine,
  "official-standard-move-enemy-endpoint",
  enemyEndpointState,
);
const endpointAccess = credentials(engine, enemyEndpointEnvelope, "player1", "endpoint");
const { domain: endpointDomain } = moveDomain(engine, enemyEndpointEnvelope, endpointAccess.authority);
assert.equal(endpointDomain.constraints.maxDistanceMilliInches, 7_000);
assert.throws(
  () => runtime.instantiate(enemyEndpointEnvelope.state, endpointDomain, {
    leadingModelId: "p1-live-m1",
    path: [{ xMilliInches: 14_500, yMilliInches: 10_000 }],
    placements: [],
  }, { matchBinding: enemyEndpointEnvelope.matchBinding }),
  /MOVE_ENEMY_ENGAGEMENT_RANGE/u,
);
acceptance.push("enemy_ground_engagement_range_endpoint_fails_closed");

const staleState = structuredClone(initial.state);
staleState.board.terrain.push({ id: "unsupported-wall", size: 2 });
assert.throws(
  () => runtime.instantiate(staleState, domain, validParameters, {
    matchBinding: initial.matchBinding,
  }),
  /MOVE_PARAMETER_DOMAIN_STALE/u,
);
acceptance.push("terrain_or_parameter_domain_state_drift_fails_closed");

const replayEngine = authoritativeEngine("ticket-11-standard-move-rotated-seal-v2");
for (const [kind, content] of [
  ["sourceSnapshot", snapshot],
  ["dataSnapshot", gameplayDataBundle],
  ["rulesArtifact", {
    kind: "rules-artifact",
    rulesVersion: runtime.descriptor.rulesVersion,
    rulesRuntimeBinding: initial.matchBinding.rulesRuntimeBinding,
  }],
  ["executorArtifact", {
    kind: "executor-artifact",
    authorityVersion: "starcraft_tmg_authority_v2",
    rulesRuntimeHash: initial.matchBinding.rulesRuntimeBinding.runtimeHash,
    catalogueHash: initial.matchBinding.rulesRuntimeBinding.catalogueHash,
    executorManifest: runtime.descriptor.executorManifest,
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
  content: `# Historical rules display\n\nFrozen rules version: ${runtime.descriptor.rulesVersion}\n\nThis development artifact preserves the rules identity used by the match.`,
});
const replayed = replayEngine.replay({ initialEnvelope: initial, journal: [applied.receipt] });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, applied.envelope.stateHash);
const tamperedJournal = [structuredClone(applied.receipt)];
tamperedJournal[0].events.push({ type: "forged_standard_move" });
const tamperedReplay = replayEngine.replay({ initialEnvelope: initial, journal: tamperedJournal });
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
acceptance.push("ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs");

const report = {
  schema: "starcraft_tmg_official_standard_move_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  dataVersions: dataset.dataVersions,
  gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
  standardMoveDataBindingHash: gameplayDataBundle.reserveDeployDataBundle.reserveDeployDataBundleHash,
  slice,
  audit,
  runtime: runtime.descriptor,
  historicalSliceHash: previousReport.slice.sliceHash,
  historicalCatalogueHash: previousReport.slice.catalogueHash,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesTruth: "official_gauntlet_marine_standard_move_exact_subset",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-standard-move-rule-slice-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: report.slice.sliceHash,
  catalogueHash: report.slice.catalogueHash,
  runtimeHash: report.runtime.runtimeHash,
  executableRuleAtoms: report.audit.counts.executableRuleAtoms,
  reviewRequiredRuleAtoms: report.audit.counts.reviewRequiredRuleAtoms,
  displayOnlyRuleAtoms: report.audit.counts.displayOnlyRuleAtoms,
  forecastRemainingSlices: report.slice.sliceForecast.forecastRemainingSlicesAfterThisSlice,
  trainingTruth: report.trainingTruth,
}, null, 2));
