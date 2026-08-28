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
import {
  createOfficialExistingReserveDeployContractClosureRuleSliceV1,
  verifyOfficialExistingReserveDeployContractClosureRuleSliceV1,
} from
  "../packages/rule-atoms/official-existing-reserve-deploy-contract-closure-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_EXECUTOR_ID,
} from "../packages/rule-atoms/official-reserve-deploy-executor-v1.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID,
  OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_VERSION,
  OFFICIAL_RESERVE_DEPLOY_V2_PARAMETER_KIND,
} from "../packages/rule-atoms/official-reserve-deploy-executor-v2.mjs";
import { createOfficialReserveDeployRelationshipExtensionV1 } from
  "../packages/rule-atoms/official-reserve-deploy-relationship-contract-v1.mjs";
import {
  OFFICIAL_START_OF_ROUND_V2_ACTION_TYPE,
} from "../packages/rule-atoms/official-start-of-round-executor-v2.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { auditExecutableAtomStateContractCoverageV1 } from
  "../packages/rule-atoms/rule-executor-state-contract-coverage-v1.mjs";
import { createOfficialCommandCenterDataset } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialMissionSetupBindingV1 } from
  "../packages/source-data/official-mission-setup-binding-v1.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_FRONT_IMAGE_HASH,
  OFFICIAL_RESERVE_DEPLOYMENT_RECORD_KEY,
  OFFICIAL_RESERVE_DEPLOY_UNIT_RECORD_KEY,
} from "../packages/source-data/official-reserve-deploy-data-bundle-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const FIRESTORE_DIR = path.join(
  ROOT,
  "build/source-intake/official-rules/command-center/firestore",
);
const OCCURRED_AT = "2026-08-28T23:00:00.000Z";
const SLICE_HASH =
  "95d7d170e04ea331949f75dc50709c3e7e4da42a166f71a6096794299967f378";
const PREVIOUS_SLICE_HASH =
  "3a81f7d6c7d5b61fd443d63521a05d20336950f59ae68f0e4839d2dcc89b012b";
const CATALOGUE_HASH =
  "702434b35a0f0af64acd03b706993f02153e1c6c1e4533fa6b65be6f3da7d4e1";
const RUNTIME_HASH =
  "f8cae053d340153b166c12c69e25f719e2b79b6abce78ba05a59f978248bb27c";
const GRAPH_HASH =
  "afd540544a397b5c1a55c305477d57a2c2bf713fcadb8fd6834e5e1358e9a2f8";
const FROZEN_V1_EXECUTOR_SOURCE_HASH =
  "4b401c7f66dcb034df65ae23b3fe434d3a9c77e2e18bcbd6bcd2e5b78163b012";
const CURRENT_V2_EXECUTOR_SOURCE_HASH =
  "8a449b51528dbdf855db2406b2be8377b63cbf9c7d236d6ff8dd80ce73292c09";
const CORE_RULES_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";
const TERRAN_P2P_HASH =
  "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c";
const ACTION_SCHEMA_CONTENT = Object.freeze({
  kind: "action-schema",
  schemaVersion: "hybrid_legal_space_v20",
});
const OFFICIAL_URLS = Object.freeze({
  coreRules: "https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf",
  terranP2P:
    "https://starcraft-tmg.com/files/downloads/StarCraft-Terran-P2P-Card-Sheets-A4_EN.pdf",
  versions:
    "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/"
    + "starcrafttmgbeta/documents/system_metadata/versions",
  marine:
    "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/"
    + `starcrafttmgbeta/documents/${OFFICIAL_RESERVE_DEPLOY_UNIT_RECORD_KEY.replace(":", "/")}`,
  gauntlet:
    "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/"
    + `starcrafttmgbeta/documents/${OFFICIAL_RESERVE_DEPLOYMENT_RECORD_KEY.replace(":", "/")}`,
});

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
  }
  throw lastError;
}

async function fetchOfficialJson(url, kind) {
  return JSON.parse(new TextDecoder().decode(await fetchOfficialBytes(url, kind)));
}

function localDocument(payload, suffix) {
  const document = payload.documents.find((entry) => entry.name.endsWith(suffix));
  assert.ok(document, `local document missing: ${suffix}`);
  return document;
}

function card(profile, sideKey, suffix, readiness = "ready") {
  return {
    id: `${sideKey}-${suffix}`,
    sideKey,
    officialCardRecordKey: profile.recordKey,
    sourceRecordHash: profile.sourceRecordHash,
    cardKind: profile.cardKind,
    readiness,
    face: readiness === "ready" ? "up" : "down",
    activeEffects: [],
    startOfRoundEffects: [],
  };
}

function marineModel(id, isOnField, xInches = 0, yInches = 0) {
  return {
    id,
    baseShape: "round",
    baseWidthInches: 1.26,
    baseDepthInches: 1.26,
    xInches,
    yInches,
    isOnField,
    isDestroyed: false,
  };
}

function marine(profile, input) {
  return {
    id: input.id,
    sideKey: input.sideKey,
    officialUnitRecordKey: profile.recordKey,
    sourceRecordHash: profile.sourceRecordHash,
    currentModels: input.currentModels,
    currentSupply: input.currentSupply,
    isOnField: input.isOnField,
    isDestroyed: false,
    statuses: [],
    selectedUpgradeNames: [],
    startOfRoundEffects: [],
    activatedPhases: { movement: false, assault: false, combat: false },
    models: Array.from({ length: input.currentModels }, (_unused, index) => marineModel(
      `${input.id}-m${index + 1}`,
      input.isOnField,
      input.isOnField ? input.xInches + (index * 2) : 0,
      input.isOnField ? input.yInches : 0,
    )),
  };
}

function startState(gameplayDataBundle, missionSetupBinding) {
  const profile = gameplayDataBundle.combatProfileBundle.profiles[0];
  const [academy, armedForces] = gameplayDataBundle.cleanupCardBundle.profiles;
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 3,
    phase: "start_of_round",
    activeSideKey: null,
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: {},
    phaseFirstActorByRound: {},
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: { sideKey: "player2", passedPhases: {} },
    },
    scores: { player1: 3, player2: 4 },
    officialGameplayDataBundle: gameplayDataBundle,
    officialMissionSetupBinding: missionSetupBinding,
    cleanupRefreshHistory: [{
      schema: "starcraft_tmg_official_cleanup_refresh_history_entry_v5",
      round: 2,
      branch: "empty",
      cleanupResolutionHash: "3".repeat(64),
      preCleanupMaterialHash: "4".repeat(64),
      retainedMaterialHash: "5".repeat(64),
      statusCleanupHash: "6".repeat(64),
      removedStatusEffectHashes: [],
      removedMarkerHashes: [],
      refreshedCardCount: 0,
      resetActivationPieceCount: 0,
      clearedReactionUsageEntryCount: 0,
      clearedAcademyReactionUsageEntryCount: 0,
      damageMarkersRetained: true,
      trainingTruth: false,
    }],
    determineInitiativeHistory: [{
      schema: "starcraft_tmg_official_determine_initiative_history_entry_v1",
      round: 2,
      nextRound: 3,
      previousFirstPlayerSideKey: "player2",
      nextFirstPlayerSideKey: "player1",
      scores: { player1: 3, player2: 4 },
      initiativeMode: "trailing_player",
      rollOff: null,
      initiativeResolutionHash: "7".repeat(64),
      trainingTruth: false,
    }],
    board: {
      widthInches: 54,
      heightInches: 36,
      missionMarkers: clone(
        gameplayDataBundle.reserveDeployDataBundle.deploymentProfile.geometry.missionMarkers,
      ),
      effectMarkers: [],
      tokens: [],
      markers: [],
      terrain: [],
      accessPoints: [],
    },
    cardResources: {
      player1: [card(academy, "player1", "academy", "exhausted")],
      player2: [card(armedForces, "player2", "armed-forces")],
    },
    pieces: [
      marine(profile, {
        id: "p1-reserve",
        sideKey: "player1",
        currentModels: 4,
        currentSupply: 1,
        isOnField: false,
      }),
      marine(profile, {
        id: "p2-live",
        sideKey: "player2",
        currentModels: 1,
        currentSupply: 0,
        isOnField: true,
        xInches: 40,
        yInches: 18,
      }),
      marine(profile, {
        id: "p2-reserve",
        sideKey: "player2",
        currentModels: 4,
        currentSupply: 1,
        isOnField: false,
      }),
    ],
    startOfRoundHistory: [],
    gameOver: false,
    terminal: false,
    winner: "",
    terminalReason: "",
    log: [],
  };
}

function credentials(
  engine,
  envelope,
  sideKey,
  suffix,
  roleMode = "player",
  principalType = "human",
) {
  const authority = engine.issueSeatAuthority({
    grantId: `reserve-deploy-v2-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode,
    principalType,
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `reserve-deploy-v2-${suffix}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

function applyFinite(engine, envelope, sideKey, predicate, suffix) {
  const access = credentials(engine, envelope, sideKey, suffix);
  const legal = engine.legalSpace(envelope, { seatAuthority: access.authority });
  const finite = legal.finiteActions.find((entry) => predicate(entry.action));
  assert.ok(finite, `${suffix}:${JSON.stringify(legal.disabledDiagnostics)}`);
  const preview = engine.preview({
    envelope,
    seatAuthority: access.authority,
    proposal: { kind: "finite", actionKey: finite.actionKey },
  });
  assert.equal(preview.ok, true, JSON.stringify(preview));
  const confirmed = engine.confirmPreview({
    envelope,
    preview: preview.preview,
    seatAuthority: access.authority,
  });
  assert.equal(confirmed.ok, true, JSON.stringify(confirmed));
  const applied = engine.apply({
    envelope,
    expectedStateRevision: envelope.stateRevision,
    preview: preview.preview,
    confirmation: confirmed.confirmation,
    seatAuthority: access.authority,
    controlLease: access.lease,
    idempotencyKey: `reserve-deploy-v2-${suffix}`,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return { access, legal, finite, preview, confirmed, applied };
}

function deployDomain(engine, envelope, access, pieceId) {
  const legal = engine.legalSpace(envelope, { seatAuthority: access.authority });
  const domain = legal.parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_RESERVE_DEPLOY_V2_PARAMETER_KIND
      && entry.pieceId === pieceId
  ));
  assert.ok(domain, `${pieceId}:${JSON.stringify(legal.disabledDiagnostics)}`);
  return { legal, domain };
}

function applyDeploy(engine, envelope, sideKey, pieceId, parameters, suffix) {
  const access = credentials(engine, envelope, sideKey, suffix);
  const { legal, domain } = deployDomain(engine, envelope, access, pieceId);
  const preview = engine.preview({
    envelope,
    seatAuthority: access.authority,
    proposal: { kind: "parameterized", domainId: domain.domainId, parameters },
  });
  assert.equal(preview.ok, true, JSON.stringify(preview));
  const confirmed = engine.confirmPreview({
    envelope,
    preview: preview.preview,
    seatAuthority: access.authority,
  });
  assert.equal(confirmed.ok, true, JSON.stringify(confirmed));
  const applied = engine.apply({
    envelope,
    expectedStateRevision: envelope.stateRevision,
    preview: preview.preview,
    confirmation: confirmed.confirmation,
    seatAuthority: access.authority,
    controlLease: access.lease,
    idempotencyKey: `reserve-deploy-v2-${suffix}`,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return { access, legal, domain, preview, confirmed, applied };
}

function registerReplayDependencies(engine, initial, snapshot, gameplayDataBundle, runtime) {
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
    ["actionSchema", ACTION_SCHEMA_CONTENT],
  ]) {
    engine.registerDependency({
      kind,
      artifactId: initial.matchBinding.dependencies[kind].artifactId,
      content,
    });
  }
  engine.registerDependency({
    kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown",
    locale: "en",
    content: `# Historical rules display\n\nFrozen rules version: ${runtime.descriptor.rulesVersion}\n\nThis development artifact preserves the rules identity used by the match.`,
  });
}

const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-existing-start-of-round-contract-closure-v1-report.json",
), "utf8"));
assert.equal(previousReport.slice.sliceHash, PREVIOUS_SLICE_HASH);
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
  cleanupCardRecordKeys: [
    "tactical_cards:academy",
    "tactical_cards:terran_armed_forces",
  ],
  reserveDeployData: true,
});
const missionSetupBinding = createOfficialMissionSetupBindingV1({
  gameplayDataBundle,
  missionDraftReceiptHash: hashStarcraftTmgContract({ kind: "mission-draft-receipt" }),
  deploymentDraftReceiptHash: hashStarcraftTmgContract({ kind: "deployment-draft-receipt" }),
  seatColorAssignment: { player1: "red", player2: "blue" },
});
const slice = createOfficialExistingReserveDeployContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const sliceAudit = verifyOfficialExistingReserveDeployContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const extension = createOfficialReserveDeployRelationshipExtensionV1({
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const graph = createRuleRelationshipGraphV1({ catalogue: slice.catalogue, extension });
const graphAudit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);
const acceptance = [];

assert.equal(slice.sliceHash, SLICE_HASH);
assert.equal(slice.catalogueHash, CATALOGUE_HASH);
assert.equal(runtime.descriptor.runtimeHash, RUNTIME_HASH);
assert.equal(graph.graphHash, GRAPH_HASH);
assert.equal(sliceAudit.counts.changedAtoms, 30);
assert.equal(sliceAudit.counts.changedNonTargetAtoms, 0);
assert.equal(sliceAudit.counts.newlyExecutableRuleAtoms, 0);
assert.equal(graphAudit.valid, true);
assert.deepEqual(coverage.counts, {
  executableAtoms: 421,
  strictCompleteAtoms: 216,
  partialContractAtoms: 67,
  noContractAtoms: 138,
  executors: 42,
  declaredStateContractExecutors: 26,
  missingStateContractExecutors: 16,
});
assert.ok(OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ATOM_IDS.every((atomId) => (
  coverage.strictCompleteAtomIds.includes(atomId)
)));
acceptance.push("slice_rebinds_only_thirty_existing_atoms_and_closes_one_contract");

assert.equal(contentHash(await readFile(path.join(
  ROOT,
  "packages/rule-atoms/official-reserve-deploy-executor-v1.mjs",
))), FROZEN_V1_EXECUTOR_SOURCE_HASH);
assert.equal(contentHash(await readFile(path.join(
  ROOT,
  "packages/rule-atoms/official-reserve-deploy-executor-v2.mjs",
))), CURRENT_V2_EXECUTOR_SOURCE_HASH);
assert.equal(runtime.descriptor.executorManifest.some((entry) => (
  entry.executorId === OFFICIAL_RESERVE_DEPLOY_EXECUTOR_ID
)), false);
assert.equal(runtime.descriptor.executorManifest.some((entry) => (
  entry.executorId === OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID
    && entry.executorVersion === OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_VERSION
)), true);
acceptance.push("frozen_v1_source_is_unchanged_and_current_runtime_routes_only_v2");

assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
assert.equal(gameplayDataBundle.reserveDeployDataBundle.repositoryFallbackAllowed, false);
assert.equal(gameplayDataBundle.reserveDeployDataBundle.unitMovementProfile.sourceValue, "4/7");
assert.equal(gameplayDataBundle.reserveDeployDataBundle.unitMovementProfile.baseDiameterMm, 32);
assert.equal(gameplayDataBundle.reserveDeployDataBundle.deploymentProfile.name, "GAUNTLET");
acceptance.push("current_official_gauntlet_marine_speed_supply_and_base_are_hash_bound");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function authoritativeEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-reserve-deploy-v2-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}

const engine = authoritativeEngine("ticket-11-reserve-deploy-v2-seal-v1");
const initial = engine.createEnvelope({
  roomId: "official-reserve-deploy-v2-room",
  dataVersion:
    `${snapshot.dataVersions.unitsVersion}/${snapshot.dataVersions.cardsVersion}`
    + `/${snapshot.dataVersions.rulesVersion}`,
  dependencies: {
    sourceSnapshot: { artifactId: "official-command-center-snapshot", content: snapshot },
    dataSnapshot: { artifactId: "official-gameplay-data-bundle", content: gameplayDataBundle },
  },
  state: startState(gameplayDataBundle, missionSetupBinding),
});
assert.equal(initial.matchBinding.dependencies.actionSchema.contentHash,
  hashStarcraftTmgContract(ACTION_SCHEMA_CONTENT));
const start = applyFinite(
  engine,
  initial,
  "player1",
  (action) => action.actionType === OFFICIAL_START_OF_ROUND_V2_ACTION_TYPE,
  "start",
);
const phase = applyFinite(
  engine,
  start.applied.envelope,
  "player1",
  (action) => action.actionType === "choose_first_actor"
    && action.chosenFirstActorSideKey === "player1",
  "phase",
);
assert.equal(phase.applied.envelope.state.phase, "movement");
assert.equal(phase.applied.envelope.state.activeSideKey, "player1");
acceptance.push("authority_start_v2_and_phase_v1_handoffs_open_current_deploy_domain");

const p1Parameters = {
  leadingModelId: "p1-reserve-m1",
  entryAlongEdgeMilliInches: 10_000,
  path: [{ xMilliInches: 10_000, yMilliInches: 3_000 }],
  placements: [
    { modelId: "p1-reserve-m2", xMilliInches: 8_000, yMilliInches: 3_000 },
    { modelId: "p1-reserve-m3", xMilliInches: 10_000, yMilliInches: 5_000 },
    { modelId: "p1-reserve-m4", xMilliInches: 12_000, yMilliInches: 3_000 },
  ],
};
const p1Deploy = applyDeploy(
  engine,
  phase.applied.envelope,
  "player1",
  "p1-reserve",
  p1Parameters,
  "p1-deploy",
);
assert.equal(p1Deploy.domain.executorId, OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID);
assert.equal(p1Deploy.preview.preview.core.confirmationPolicy.requiresExplicitHuman, true);
assert.equal(p1Deploy.applied.envelope.state.pieces[0].isOnField, true);
assert.equal(p1Deploy.applied.envelope.state.pieces[0].statuses.includes("stationary"), false);
assert.equal(p1Deploy.applied.envelope.state.pieces[0].activatedPhases.movement, true);
assert.equal(p1Deploy.applied.envelope.state.officialRoundSupplyState.onTableSupplyBySide.player1,
  1);
assert.equal(p1Deploy.applied.envelope.state.officialRoundSupplyState.reserveSupplyBySide.player1,
  0);
assert.equal(p1Deploy.applied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
acceptance.push("first_deploy_applies_path_placement_activation_supply_and_alternation_atomically");

const opponentAccess = credentials(
  engine,
  p1Deploy.applied.envelope,
  "player2",
  "opponent",
  "opponent",
  "model",
);
const { domain: opponentDomain } = deployDomain(
  engine,
  p1Deploy.applied.envelope,
  opponentAccess,
  "p2-reserve",
);
const p2Parameters = {
  leadingModelId: "p2-reserve-m1",
  entryAlongEdgeMilliInches: 44_000,
  path: [{ xMilliInches: 44_000, yMilliInches: 33_000 }],
  placements: [
    { modelId: "p2-reserve-m2", xMilliInches: 42_000, yMilliInches: 33_000 },
    { modelId: "p2-reserve-m3", xMilliInches: 44_000, yMilliInches: 31_000 },
    { modelId: "p2-reserve-m4", xMilliInches: 46_000, yMilliInches: 33_000 },
  ],
};
const opponentPreview = engine.preview({
  envelope: p1Deploy.applied.envelope,
  seatAuthority: opponentAccess.authority,
  proposal: {
    kind: "parameterized",
    domainId: opponentDomain.domainId,
    parameters: p2Parameters,
  },
});
assert.equal(opponentPreview.ok, true, JSON.stringify(opponentPreview));
assert.equal(engine.confirmPreview({
  envelope: p1Deploy.applied.envelope,
  preview: opponentPreview.preview,
  seatAuthority: opponentAccess.authority,
}).reason, "CAPABILITY_DENIED");
assert.equal(engine.apply({
  envelope: p1Deploy.applied.envelope,
  expectedStateRevision: p1Deploy.applied.envelope.stateRevision,
  preview: opponentPreview.preview,
  seatAuthority: opponentAccess.authority,
  controlLease: opponentAccess.lease,
  idempotencyKey: "reserve-deploy-v2-opponent-forbidden",
}).reason, "CAPABILITY_DENIED");
acceptance.push("opponent_can_preview_deploy_but_cannot_confirm_or_apply");

const p2Deploy = applyDeploy(
  engine,
  p1Deploy.applied.envelope,
  "player2",
  "p2-reserve",
  p2Parameters,
  "p2-deploy",
);
assert.equal(p2Deploy.applied.envelope.state.pieces[2].isOnField, true);
assert.equal(p2Deploy.applied.envelope.state.officialRoundSupplyState.onTableSupplyBySide.player2,
  1);
assert.equal(p2Deploy.applied.envelope.state.officialRoundSupplyState.reserveSupplyBySide.player2,
  0);
assert.equal(p2Deploy.applied.envelope.state.log.filter((entry) => (
  entry.action?.executorId === OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID
)).length, 2);
acceptance.push("second_deploy_consumes_the_first_deploy_supply_lineage_without_silent_reset");

for (const key of [
  "scores",
  "officialGameplayDataBundle",
  "officialMissionSetupBinding",
  "startOfRoundHistory",
  "phaseFirstActorByRound",
  "board",
  "cardResources",
]) {
  assert.deepEqual(p2Deploy.applied.envelope.state[key], phase.applied.envelope.state[key], key);
}
acceptance.push("deploys_preserve_scores_sources_setup_history_board_cards_and_phase_choice");

const forgedLineageState = clone(p1Deploy.applied.envelope.state);
const p1Log = forgedLineageState.log.find((entry) => (
  entry.action?.executorId === OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID
));
p1Log.events.find((entry) => entry.type === "reserve_deployed")
  .roundSupplyStateHashBefore = "f".repeat(64);
const forgedEnumeration = runtime.enumerate(forgedLineageState, {
  sideKey: "player2",
  includeDisabled: true,
  matchBinding: p1Deploy.applied.envelope.matchBinding,
});
assert.equal(forgedEnumeration.parameterDomains.some((entry) => (
  entry.parameterKind === OFFICIAL_RESERVE_DEPLOY_V2_PARAMETER_KIND
)), false);
assert.ok(forgedEnumeration.candidates.some((entry) => (
  entry.disabledReason === "RESERVE_DEPLOY_V2_SUPPLY_LINEAGE_INVALID"
)));
acceptance.push("forged_intermediate_supply_lineage_fails_closed");

const replayEngine = authoritativeEngine("ticket-11-reserve-deploy-v2-rotated-seal-v2");
registerReplayDependencies(replayEngine, initial, snapshot, gameplayDataBundle, runtime);
const journal = [
  start.applied.receipt,
  phase.applied.receipt,
  p1Deploy.applied.receipt,
  p2Deploy.applied.receipt,
];
const replayed = replayEngine.replay({ initialEnvelope: initial, journal });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, p2Deploy.applied.envelope.stateHash);
const tamperedJournal = clone(journal);
tamperedJournal[3].events.push({ type: "forged_reserve_deploy_v2" });
const tamperedReplay = replayEngine.replay({
  initialEnvelope: initial,
  journal: tamperedJournal,
});
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
acceptance.push("four_receipt_ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(historicalRuntime.descriptor.runtimeHash,
  "b4a63b98baebc6fc74f43356d94b4e61f1456c3c561ef9c771083644a29c1a99");
assert.equal(historicalRuntime.descriptor.executorManifest.some((entry) => (
  entry.executorId === OFFICIAL_RESERVE_DEPLOY_EXECUTOR_ID
)), true);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
acceptance.push("historical_v1_runtime_and_rules_display_remain_strictly_frozen");

const liveOfficial = {
  coreRules: await fetchOfficialBytes(OFFICIAL_URLS.coreRules, "coreRules"),
  terranP2P: await fetchOfficialBytes(OFFICIAL_URLS.terranP2P, "terranP2P"),
  versions: await fetchOfficialJson(OFFICIAL_URLS.versions, "versions"),
  marine: await fetchOfficialJson(OFFICIAL_URLS.marine, "marine"),
  gauntlet: await fetchOfficialJson(OFFICIAL_URLS.gauntlet, "gauntlet"),
  gauntletImage: await fetchOfficialBytes(
    gameplayDataBundle.reserveDeployDataBundle.deploymentProfile.frontUrl,
    "gauntletImage",
  ),
};
assert.equal(contentHash(liveOfficial.coreRules), CORE_RULES_HASH);
assert.equal(contentHash(liveOfficial.terranP2P), TERRAN_P2P_HASH);
assert.equal(contentHash(liveOfficial.gauntletImage), OFFICIAL_RESERVE_DEPLOY_FRONT_IMAGE_HASH);
assert.deepEqual(dataset.dataVersions, {
  cardsVersion: "69",
  rulesVersion: "48",
  unitsVersion: "71",
});
assert.equal(documentHash(liveOfficial.versions),
  previousReport.liveOfficialRevalidation.hashes.versions);
assert.equal(documentHash(liveOfficial.marine), documentHash(localDocument(
  firestorePayloads.army_units,
  "/army_units/marine",
)));
assert.equal(documentHash(liveOfficial.gauntlet), documentHash(localDocument(
  firestorePayloads.faction_cards,
  "/faction_cards/2NdngLtIeZAprsWr25hM",
)));
acceptance.push("live_core_p2p_marine_gauntlet_image_and_71_69_48_sources_are_current");

assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs");

const report = {
  schema: "starcraft_tmg_existing_reserve_deploy_contract_closure_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  dataVersions: dataset.dataVersions,
  liveOfficialRevalidation: {
    urls: {
      ...OFFICIAL_URLS,
      gauntletImage: gameplayDataBundle.reserveDeployDataBundle.deploymentProfile.frontUrl,
    },
    hashes: {
      coreRules: contentHash(liveOfficial.coreRules),
      terranP2P: contentHash(liveOfficial.terranP2P),
      versions: documentHash(liveOfficial.versions),
      marine: documentHash(liveOfficial.marine),
      gauntlet: documentHash(liveOfficial.gauntlet),
      gauntletImage: contentHash(liveOfficial.gauntletImage),
    },
    dataVersions: dataset.dataVersions,
    repositoryFallbackUsed: gameplayDataBundle.repositoryFallbackAllowed,
  },
  gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
  reserveDeployDataBundleHash:
    gameplayDataBundle.reserveDeployDataBundle.reserveDeployDataBundleHash,
  slice,
  sliceAudit,
  runtimeHash: runtime.descriptor.runtimeHash,
  catalogueHash: slice.catalogueHash,
  graph,
  graphAudit,
  coverage,
  previousCoverage: previousReport.coverage,
  frozenExecutorSourceHash: FROZEN_V1_EXECUTOR_SOURCE_HASH,
  currentExecutorSourceHash: CURRENT_V2_EXECUTOR_SOURCE_HASH,
  authorityFixture: {
    actionSchemaVersion: ACTION_SCHEMA_CONTENT.schemaVersion,
    executorId: OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID,
    receiptCount: journal.length,
    receiptSignatureAlgorithm:
      p2Deploy.applied.receipt.refereeSignature.signatureAlgorithm,
  },
  historicalSliceHash: previousReport.slice.sliceHash,
  historicalCatalogueHash: previousReport.slice.catalogueHash,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesTruth: "reserve_deploy_v2_current_handoffs_supply_lineage_exact_with_frozen_v1_isolation",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR,
    "official-existing-reserve-deploy-contract-closure-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: report.slice.sliceHash,
  catalogueHash: report.catalogueHash,
  runtimeHash: report.runtimeHash,
  graphHash: report.graph.graphHash,
  graphNodes: report.graph.nodes.length,
  graphEdges: report.graph.edges.length,
  strictCompleteAtoms: report.coverage.counts.strictCompleteAtoms,
  partialContractAtoms: report.coverage.counts.partialContractAtoms,
  noContractAtoms: report.coverage.counts.noContractAtoms,
  stateContractMissingExecutors: report.coverage.counts.missingStateContractExecutors,
  repositoryFallbackUsed: report.liveOfficialRevalidation.repositoryFallbackUsed,
  trainingTruth: report.trainingTruth,
}, null, 2));
