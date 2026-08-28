#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from "../packages/authoritative-engine/transition-v1.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_ACTION_ATOM_IDS,
  OFFICIAL_RESERVE_DEPLOY_EXECUTOR_ID,
  OFFICIAL_RESERVE_DEPLOY_EXECUTOR_VERSION,
  OFFICIAL_RESERVE_DEPLOY_NEW_ATOM_IDS,
  OFFICIAL_RESERVE_DEPLOY_PARAMETER_KIND,
} from "../packages/rule-atoms/official-reserve-deploy-executor-v1.mjs";
import {
  createOfficialReserveDeployRuleSliceV1,
  verifyOfficialReserveDeployRuleSliceV1,
} from "../packages/rule-atoms/official-reserve-deploy-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialRoundSupplyStateV1 } from "../packages/rule-atoms/official-round-supply-state-v1.mjs";
import { createOfficialCommandCenterDataset } from "../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialMissionSetupBindingV1 } from "../packages/source-data/official-mission-setup-binding-v1.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_FRONT_IMAGE_HASH,
  createOfficialReserveDeployDataBundleV1,
  verifyOfficialReserveDeployDataBundleV1,
} from "../packages/source-data/official-reserve-deploy-data-bundle-v1.mjs";

assert.equal(OFFICIAL_RESERVE_DEPLOY_PARAMETER_KIND, "official_reserve_deploy_path_v1");
assert.equal(OFFICIAL_RESERVE_DEPLOY_NEW_ATOM_IDS.length, 30);
assert.equal(typeof createOfficialReserveDeployRuleSliceV1, "function");
assert.equal(typeof createOfficialReserveDeployDataBundleV1, "function");

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
const HISTORICAL_SLICE_17_RUNTIME_HASH =
  "454d0a289d536b9d75e11f393a37386a2bffff05563fd371f49ccbd7a0f14be0";
const acceptance = [];

const previousReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-start-of-round-rule-slice-v1-report.json"),
  "utf8",
));
const slice = createOfficialReserveDeployRuleSliceV1({ previousSlice: previousReport.slice });
const audit = verifyOfficialReserveDeployRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(audit.counts.executableRuleAtoms, 219);
assert.equal(audit.counts.newlyExecutableRuleAtoms, 30);
assert.equal(audit.counts.reviewRequiredRuleAtoms, 693);
assert.equal(audit.counts.changedNonTargetAtoms, 0);

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
const reserveDeployDataBundle = createOfficialReserveDeployDataBundleV1({ snapshot, dataset });
assert.equal(reserveDeployDataBundle.deploymentProfile.name, "GAUNTLET");
assert.equal(reserveDeployDataBundle.unitMovementProfile.baseDiameterMm, 32);
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot,
  dataset,
  unitRecordKeys: ["army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
  cleanupCardRecordKeys: ["tactical_cards:academy", "tactical_cards:terran_armed_forces"],
  reserveDeployData: true,
});
assert.equal(
  gameplayDataBundle.reserveDeployDataBundle.reserveDeployDataBundleHash,
  reserveDeployDataBundle.reserveDeployDataBundleHash,
);

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executableRuleAtomCount, 219);
assert.ok(runtime.descriptor.parameterDomainKinds.includes(OFFICIAL_RESERVE_DEPLOY_PARAMETER_KIND));
acceptance.push("catalogue_promotes_only_thirty_reserve_deploy_atoms");

verifyOfficialReserveDeployDataBundleV1(reserveDeployDataBundle);
assert.equal(reserveDeployDataBundle.repositoryFallbackAllowed, false);
assert.equal(reserveDeployDataBundle.productionRoomBindingEligible, false);
assert.equal(reserveDeployDataBundle.deploymentProfile.geometry.battlefield.widthInches, 54);
assert.equal(reserveDeployDataBundle.deploymentProfile.geometry.battlefield.heightInches, 36);
assert.equal(reserveDeployDataBundle.deploymentProfile.geometry.zoneOfInfluenceDepthInches, 6);
assert.equal(reserveDeployDataBundle.unitMovementProfile.sourceValue, "4/7");
assert.equal(reserveDeployDataBundle.unitMovementProfile.baseDiameterMm, 32);
acceptance.push("current_gauntlet_marine_speed_and_latest_p2p_base_are_hash_bound");

async function fetchOfficialImage(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (response.ok) {
        const bytes = Buffer.from(await response.arrayBuffer());
        return new Response(bytes, {
          status: response.status,
          headers: response.headers,
        });
      }
      lastError = new Error(`official deployment image HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }
  throw lastError;
}

const imageResponse = await fetchOfficialImage(
  reserveDeployDataBundle.deploymentProfile.frontUrl,
);
assert.equal(imageResponse.ok, true, `official deployment image HTTP ${imageResponse.status}`);
const liveImageHash = createHash("sha256")
  .update(Buffer.from(await imageResponse.arrayBuffer()))
  .digest("hex");
assert.equal(liveImageHash, OFFICIAL_RESERVE_DEPLOY_FRONT_IMAGE_HASH);
acceptance.push("current_official_gauntlet_image_bytes_match_reviewed_geometry_hash");

const driftedReserveData = structuredClone(reserveDeployDataBundle);
driftedReserveData.deploymentProfile.geometry.frontImage.sha256 = "b".repeat(64);
assert.throws(
  () => verifyOfficialReserveDeployDataBundleV1(driftedReserveData),
  /official_reserve_deploy_data_bundle_invalid/u,
);
acceptance.push("official_deployment_data_or_geometry_drift_fails_closed");

const missionSetupBinding = createOfficialMissionSetupBindingV1({
  gameplayDataBundle,
  missionDraftReceiptHash: hashStarcraftTmgContract({ kind: "reserve-deploy-mission-draft" }),
  deploymentDraftReceiptHash: hashStarcraftTmgContract({ kind: "reserve-deploy-deployment-draft" }),
  seatColorAssignment: { player1: "red", player2: "blue" },
});
const { privateKey, publicKey } = generateKeyPairSync("ed25519");

function authoritativeEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-reserve-deploy-referee-v1",
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
    isOnField: input.isOnField === true,
    isDestroyed: false,
  };
}

function marinePiece(input) {
  const profile = reserveDeployDataBundle.unitMovementProfile;
  const currentModels = Number(input.currentModels || 4);
  const positions = input.positions || [];
  return {
    id: input.id,
    name: "Marine",
    sideKey: input.sideKey,
    officialUnitRecordKey: profile.recordKey,
    sourceRecordHash: profile.sourceRecordHash,
    currentModels,
    currentSupply: Number(input.currentSupply ?? (currentModels <= 3 ? 0 : currentModels <= 6 ? 1 : 2)),
    isOnField: input.isOnField === true,
    isDestroyed: false,
    statuses: input.isOnField === true ? [] : ["stationary"],
    selectedUpgradeNames: [],
    activatedPhases: { movement: false, assault: false, combat: false },
    models: Array.from({ length: currentModels }, (_unused, index) => marineModel(
      `${input.id}-m${index + 1}`,
      {
        isOnField: input.isOnField === true,
        xInches: positions[index]?.xInches,
        yInches: positions[index]?.yInches,
      },
    )),
  };
}

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
        reserveDeployDataBundle.deploymentProfile.geometry.missionMarkers,
      ),
      effectMarkers: [],
      tokens: [],
      markers: [],
      terrain: [],
      accessPoints: [],
    },
    cardResources: { player1: [], player2: [] },
    pieces: input.pieces || [
      marinePiece({ id: "p1-reserve", sideKey: "player1" }),
      marinePiece({ id: "p2-reserve", sideKey: "player2" }),
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
    grantId: `reserve-deploy-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `reserve-deploy-${suffix}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

const validParameters = {
  leadingModelId: "p1-reserve-m1",
  entryAlongEdgeMilliInches: 10_000,
  path: [{ xMilliInches: 10_000, yMilliInches: 3_000 }],
  placements: [
    { modelId: "p1-reserve-m2", xMilliInches: 8_000, yMilliInches: 3_000 },
    { modelId: "p1-reserve-m3", xMilliInches: 10_000, yMilliInches: 5_000 },
    { modelId: "p1-reserve-m4", xMilliInches: 12_000, yMilliInches: 3_000 },
  ],
};

function deployDomain(engine, envelope, authority) {
  const legal = engine.legalSpace(envelope, { seatAuthority: authority });
  const domain = legal.parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_RESERVE_DEPLOY_PARAMETER_KIND
      && entry.pieceId === "p1-reserve"
  ));
  assert.ok(domain, JSON.stringify(legal.disabledDiagnostics));
  return { legal, domain };
}

const engine = authoritativeEngine("ticket-11-reserve-deploy-seal-v1");
const initialState = movementState();
const initial = envelopeForState(engine, "official-reserve-deploy-room", initialState);
const access = credentials(engine, initial, "player1", "valid");
const { legal, domain } = deployDomain(engine, initial, access.authority);
assert.equal(domain.executorId, OFFICIAL_RESERVE_DEPLOY_EXECUTOR_ID);
assert.equal(domain.executorVersion, OFFICIAL_RESERVE_DEPLOY_EXECUTOR_VERSION);
assert.deepEqual(domain.ruleAtomIds, [...OFFICIAL_RESERVE_DEPLOY_ACTION_ATOM_IDS]);
assert.equal(domain.constraints.maxDistanceMilliInches, 4_000);
assert.equal(domain.constraints.availableSupply, 10);
assert.equal(domain.constraints.currentSupply, 1);
acceptance.push("movement_legal_space_exposes_exact_continuous_deploy_domain");

const preview = engine.preview({
  envelope: initial,
  seatAuthority: access.authority,
  proposal: { kind: "parameterized", domainId: domain.domainId, parameters: validParameters },
});
assert.equal(preview.ok, true, JSON.stringify(preview));
assert.equal(preview.preview.core.action.deployPlan.schemaVersion,
  "starcraft_tmg_official_reserve_deploy_plan_v1");
assert.equal(preview.preview.core.action.deployPlan.distanceTravelledInches, 3.63);
assert.equal(preview.preview.core.action.deployPlan.speedAllowanceInches, 4);
assert.equal(preview.preview.core.confirmationPolicy.baseClass, "explicit_human");
assert.equal(preview.preview.core.confirmationPolicy.requiresExplicitHuman, true);
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
  idempotencyKey: "reserve-deploy-valid-v1",
});
assert.equal(applied.ok, true, JSON.stringify(applied));
const deployedPiece = applied.envelope.state.pieces.find((piece) => piece.id === "p1-reserve");
assert.equal(deployedPiece.isOnField, true);
assert.equal(deployedPiece.statuses.includes("stationary"), false);
assert.equal(deployedPiece.activatedPhases.movement, true);
assert.equal(deployedPiece.inCoherency, true);
assert.equal(deployedPiece.lastLeadingModelId, "p1-reserve-m1");
assert.deepEqual(
  deployedPiece.models.map((model) => [model.id, model.xInches, model.yInches]),
  [
    ["p1-reserve-m1", 10, 3],
    ["p1-reserve-m2", 8, 3],
    ["p1-reserve-m3", 10, 5],
    ["p1-reserve-m4", 12, 3],
  ],
);
assert.equal(applied.envelope.state.activeSideKey, "player2");
assert.equal(applied.envelope.state.officialRoundSupplyState.onTableSupplyBySide.player1, 1);
assert.equal(applied.envelope.state.officialRoundSupplyState.reserveSupplyBySide.player1, 0);
assert.equal(applied.envelope.state.officialRoundSupplyState.availableSupplyBySide.player1, 9);
assert.equal(applied.receipt.trainingTruth, false);
const player2Access = credentials(engine, applied.envelope, "player2", "alternating-deploy");
const player2Legal = engine.legalSpace(applied.envelope, {
  seatAuthority: player2Access.authority,
});
assert.ok(player2Legal.parameterDomains.some((entry) => (
  entry.parameterKind === OFFICIAL_RESERVE_DEPLOY_PARAMETER_KIND
    && entry.pieceId === "p2-reserve"
)), JSON.stringify(player2Legal.disabledDiagnostics));
acceptance.push("deploy_applies_leading_path_coherency_activation_supply_and_alternation_atomically");

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
  path: [{ xMilliInches: 10_000, yMilliInches: 5_000 }],
}, /DEPLOY_PATH_EXCEEDS_SPEED/u);
assertInstantiationRejected({
  ...validParameters,
  entryAlongEdgeMilliInches: 0,
}, /DEPLOY_ENTRY_POINT_INVALID/u);
assertInstantiationRejected({
  ...validParameters,
  placements: [
    { modelId: "p1-reserve-m2", xMilliInches: 10_000, yMilliInches: 3_000 },
    ...validParameters.placements.slice(1),
  ],
}, /DEPLOY_BASE_OVERLAP/u);
assertInstantiationRejected({
  ...validParameters,
  placements: [
    { modelId: "p1-reserve-m2", xMilliInches: 15_000, yMilliInches: 3_000 },
    ...validParameters.placements.slice(1),
  ],
}, /DEPLOY_OUT_OF_COHERENCY/u);
acceptance.push("speed_entry_edge_overlap_and_coherency_violations_fail_closed");

const staleState = structuredClone(initial.state);
staleState.pieces[0].statuses.push("unsupported-status");
assert.throws(
  () => runtime.instantiate(staleState, domain, validParameters, {
    matchBinding: initial.matchBinding,
  }),
  /DEPLOY_PARAMETER_DOMAIN_STALE/u,
);
acceptance.push("parameter_domain_rejects_stale_state_material");

const enemyPositions = [{ xInches: 10, yInches: 4.5 }];
const enemyState = movementState({
  pieces: [
    marinePiece({ id: "p1-reserve", sideKey: "player1" }),
    marinePiece({
      id: "p2-live",
      sideKey: "player2",
      currentModels: 1,
      currentSupply: 0,
      isOnField: true,
      positions: enemyPositions,
    }),
  ],
});
const enemyEnvelope = envelopeForState(engine, "official-reserve-deploy-engagement-room", enemyState);
const enemyAccess = credentials(engine, enemyEnvelope, "player1", "engagement");
const { domain: enemyDomain } = deployDomain(engine, enemyEnvelope, enemyAccess.authority);
assert.throws(
  () => runtime.instantiate(enemyEnvelope.state, enemyDomain, {
    ...validParameters,
    placements: [
      validParameters.placements[0],
      { modelId: "p1-reserve-m3", xMilliInches: 8_000, yMilliInches: 5_000 },
      validParameters.placements[2],
    ],
  }, { matchBinding: enemyEnvelope.matchBinding }),
  /DEPLOY_ENEMY_ENGAGEMENT_RANGE/u,
);
acceptance.push("enemy_engagement_endpoint_fails_closed");

const fullSupplyPositions = Array.from({ length: 45 }, (_unused, index) => ({
  xInches: 2 + ((index % 18) * 2.5),
  yInches: 10 + (Math.floor(index / 18) * 2.5),
}));
const fullSupplyPieces = [marinePiece({ id: "p1-reserve", sideKey: "player1" })];
for (let index = 0; index < 5; index += 1) {
  fullSupplyPieces.push(marinePiece({
    id: `p1-live-${index + 1}`,
    sideKey: "player1",
    currentModels: 9,
    currentSupply: 2,
    isOnField: true,
    positions: fullSupplyPositions.slice(index * 9, (index + 1) * 9),
  }));
}
fullSupplyPieces.push(marinePiece({ id: "p2-reserve", sideKey: "player2" }));
const fullSupplyState = movementState({ pieces: fullSupplyPieces });
const fullSupplyEnvelope = envelopeForState(
  engine,
  "official-reserve-deploy-full-supply-room",
  fullSupplyState,
);
const fullSupplyAccess = credentials(engine, fullSupplyEnvelope, "player1", "full-supply");
const fullSupplyLegal = engine.legalSpace(fullSupplyEnvelope, {
  seatAuthority: fullSupplyAccess.authority,
});
assert.equal(fullSupplyLegal.parameterDomains.some((entry) => entry.actionType === "deploy"), false);
assert.ok(fullSupplyLegal.disabledDiagnostics.some((entry) => (
  entry.action?.pieceId === "p1-reserve"
    && entry.disabledReason === "DEPLOY_INSUFFICIENT_AVAILABLE_SUPPLY"
)));
acceptance.push("available_supply_exhaustion_disables_reserve_deployment");

const replayEngine = authoritativeEngine("ticket-11-reserve-deploy-rotated-seal-v2");
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
  ["geometryArtifact", {
    kind: "geometry-artifact",
    geometryVersion: "fixed_point_round_base_v1",
  }],
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
const replayed = replayEngine.replay({
  initialEnvelope: initial,
  journal: [applied.receipt],
});
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, applied.envelope.stateHash);
const tamperedJournal = [structuredClone(applied.receipt)];
tamperedJournal[0].events.push({ type: "forged_reserve_deploy" });
const tamperedReplay = replayEngine.replay({
  initialEnvelope: initial,
  journal: tamperedJournal,
});
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
acceptance.push("ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(historicalRuntime.descriptor.runtimeHash, HISTORICAL_SLICE_17_RUNTIME_HASH);
assert.equal(historicalRuntime.descriptor.executableRuleAtomCount, 189);
assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
acceptance.push("historical_slice17_runtime_and_rules_display_remain_strictly_frozen");

assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs");

const report = {
  schema: "starcraft_tmg_official_reserve_deploy_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  dataVersions: dataset.dataVersions,
  liveOfficialRevalidation: {
    ...previousReport.liveOfficialRevalidation,
    gauntletFrontImageSha256: liveImageHash,
  },
  gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
  reserveDeployDataBundleHash: reserveDeployDataBundle.reserveDeployDataBundleHash,
  slice,
  audit,
  runtime: runtime.descriptor,
  historicalSliceHash: previousReport.slice.sliceHash,
  historicalCatalogueHash: previousReport.slice.catalogueHash,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesTruth: "official_gauntlet_marine_reserve_deploy_exact_subset",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-reserve-deploy-rule-slice-v1-report.json"),
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
