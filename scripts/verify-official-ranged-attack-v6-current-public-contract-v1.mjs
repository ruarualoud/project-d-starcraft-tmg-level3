#!/usr/bin/env node

import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createOfficialExistingMedicMedpackV2ContractClosureRuleSliceV1 } from
  "../packages/rule-atoms/official-existing-medic-medpack-v2-contract-closure-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  applyOfficialRangedAttackV6,
  enumerateOfficialRangedAttackActionsV6,
  OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID,
} from "../packages/rule-atoms/official-ranged-attack-executor-v6.mjs";
import {
  createOfficialCommandCenterDataset,
} from "../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../packages/source-data/official-gameplay-data-bundle-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const FIRESTORE_DIR = path.join(
  ROOT,
  "build/source-intake/official-rules/command-center/firestore",
);
const ACTION_SCHEMA_CONTENT = Object.freeze({
  kind: "action-schema",
  schemaVersion: "hybrid_legal_space_v24",
});
const liveReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-live-source-snapshots-report.json",
), "utf8"));
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-existing-stimpack-move-v2-contract-closure-v1-report.json",
), "utf8"));
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
  unitRecordKeys: ["army_units:jim_raynor", "army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
  attackProfileData: true,
});
const slice66 = createOfficialExistingMedicMedpackV2ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice66.catalogue });
const matchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
};

function model(id, xInches, baseWidthInches) {
  return {
    id,
    baseShape: "round",
    baseWidthInches,
    baseDepthInches: baseWidthInches,
    xInches,
    yInches: 5,
    isOnField: true,
    isDestroyed: false,
    elevation: "ground",
    supportTerrainIds: [],
    adjacentAccessPointIds: [],
  };
}

function piece(input) {
  const profile = gameplayDataBundle.combatProfileBundle
    .profilesByRecordKey[input.recordKey];
  return {
    id: input.id,
    name: profile.unitName,
    sideKey: input.sideKey,
    officialUnitRecordKey: input.recordKey,
    sourceRecordHash: profile.sourceRecordHash,
    currentModels: 1,
    currentSupply: input.currentSupply,
    destroyedModelIds: [],
    isOnField: true,
    isDestroyed: false,
    combatTag: "ground",
    combatTags: [...profile.combatTags],
    statuses: [],
    selectedUpgradeNames: input.selectedUpgradeNames,
    combatEffects: [],
    assaultEffects: [],
    damageMarker: 0,
    activatedPhases: { movement: false, assault: false, combat: false },
    models: [model(`${input.id}-model-1`, input.xInches, input.baseWidthInches)],
  };
}

function state(input = {}) {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 3,
    phase: "assault",
    activeSideKey: "player1",
    firstPlayerSideKey: "player1",
    phaseFirstActorByRound: {
      "3:assault": {
        round: 3,
        phase: "assault",
        markerHolderSideKey: "player1",
        chosenFirstActorSideKey: "player1",
      },
    },
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: { sideKey: "player2", passedPhases: {} },
    },
    scores: { player1: 2, player2: 1 },
    board: {
      widthInches: 54,
      heightInches: 36,
      missionMarkers: [],
      terrain: [],
      effectMarkers: [],
      tokens: [],
      markers: [],
      accessPoints: [],
      engagementGeometry: {
        schemaVersion: "starcraft_tmg_engagement_geometry_input_v2",
        modelCoordinatesComplete: true,
        baseFootprintsComplete: true,
        terrainFootprintsComplete: true,
        elevationSupportsComplete: true,
        accessPointAdjacencyComplete: true,
      },
    },
    officialGameplayDataBundle: gameplayDataBundle,
    pieces: [
      piece({
        id: "player1-raynor",
        sideKey: "player1",
        recordKey: "army_units:jim_raynor",
        currentSupply: 1,
        selectedUpgradeNames: input.selectedUpgradeNames ?? [],
        baseWidthInches: 1.575,
        xInches: 5,
      }),
      piece({
        id: "player2-marine",
        sideKey: "player2",
        recordKey: "army_units:marine",
        currentSupply: 0,
        selectedUpgradeNames: [],
        baseWidthInches: 1.26,
        xInches: input.targetXInches ?? 14,
      }),
    ],
    log: [],
  };
}

function exactAction(candidate) {
  return Object.fromEntries(Object.entries(candidate).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}

function protectedHash(value) {
  return hashStarcraftTmgContract({
    scores: value.scores,
    missionMarkers: value.board.missionMarkers,
    tokens: value.board.tokens,
    markers: value.board.markers,
    officialGameplayDataBundle: value.officialGameplayDataBundle,
  });
}

assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
assert.equal(liveReport.commandSnapshot.snapshotHash,
  "c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61");
assert.equal(dataset.datasetHash,
  "38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63");
assert.deepEqual(dataset.dataVersions, {
  cardsVersion: "69",
  rulesVersion: "48",
  unitsVersion: "71",
});

const directBefore = state();
const directProtected = protectedHash(directBefore);
const directCandidate = enumerateOfficialRangedAttackActionsV6(directBefore, {
  sideKey: "player1",
  matchBinding,
}).find((candidate) => candidate.weaponName === "Commando Rifle");
assert.ok(directCandidate);
const directApplied = applyOfficialRangedAttackV6(
  directBefore,
  exactAction(directCandidate),
  { matchBinding, postRevision: 1, chanceReveals: [3, 1, 1, 1, 1, 6, 6] },
);
assert.equal(directApplied.ok, true);
assert.equal(directApplied.state.pieces[1].damageMarker, 1);
assert.equal(directApplied.state.pieces[0].activatedPhases.assault, true);
assert.equal(protectedHash(directApplied.state), directProtected);

const staleAction = structuredClone(exactAction(directCandidate));
staleAction.weaponName = "forged-weapon";
assert.throws(() => applyOfficialRangedAttackV6(directBefore, staleAction, {
  matchBinding,
  chanceReveals: [3, 1, 1, 1, 1, 6, 6],
}), /RANGED_ATTACK_V6_ACTION_STALE/u);

const c14Before = state({ selectedUpgradeNames: ["C-14 rifle"] });
const c14Candidate = enumerateOfficialRangedAttackActionsV6(c14Before, {
  sideKey: "player1",
  matchBinding,
}).find((candidate) => candidate.weaponName === "C-14 rifle");
assert.ok(c14Candidate);
const c14Applied = applyOfficialRangedAttackV6(c14Before, exactAction(c14Candidate), {
  matchBinding,
  postRevision: 1,
  chanceReveals: Array.from({ length: c14Candidate.chance.count }, () => 1),
});
assert.equal(c14Applied.delegatedExecutor.executorId, "authority.ranged-attack-v5");

const runtimeCandidates = runtime.enumerate(directBefore, {
  sideKey: "player1",
  matchBinding,
}).candidates.filter((candidate) => (
  candidate.executorId === OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID
));
assert.equal(runtimeCandidates.length, 1);
const runtimeApplied = runtime.apply(directBefore, exactAction(runtimeCandidates[0]), {
  matchBinding,
  chanceReveals: [3, 1, 1, 1, 1, 6, 6],
});
assert.equal(runtimeApplied.state.pieces[0].activatedPhases.assault, true);

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function authoritativeEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-08-29T08:00:00.000Z",
    cryptoOptions: {
      keyId: "ticket-11-slice-67-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}

function credentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({
    grantId: "slice-67-player1-grant",
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1",
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: "slice-67-player1-session",
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

function registerReplayDependencies(engine, initial) {
  for (const [kind, content] of [
    ["sourceSnapshot", liveReport.commandSnapshot],
    ["dataSnapshot", gameplayDataBundle],
    ["rulesArtifact", {
      kind: "rules-artifact",
      rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: initial.matchBinding.rulesRuntimeBinding,
    }],
    ["executorArtifact", {
      kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: runtime.descriptor.runtimeHash,
      catalogueHash: runtime.descriptor.catalogueHash,
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
    content: `# Historical rules display\n\nFrozen rules version: ${runtime.descriptor.rulesVersion}`
      + "\n\nThis development artifact preserves the rules identity used by the match.",
  });
}

const engine = authoritativeEngine("ticket-11-slice-67-short-seal-v1");
const initialEnvelope = engine.createEnvelope({
  roomId: "official-slice-67-ranged-attack-room",
  dataVersion: "71/69/48",
  dependencies: {
    sourceSnapshot: {
      artifactId: "official-command-center-snapshot",
      content: liveReport.commandSnapshot,
    },
    dataSnapshot: {
      artifactId: "official-ranged-attack-gameplay-data-bundle",
      content: gameplayDataBundle,
    },
  },
  state: state(),
});
assert.equal(initialEnvelope.matchBinding.dependencies.actionSchema.contentHash,
  hashStarcraftTmgContract(ACTION_SCHEMA_CONTENT));
const access = credentials(engine, initialEnvelope);
const legalSpace = engine.legalSpace(initialEnvelope, {
  seatAuthority: access.authority,
});
const ranged = legalSpace.finiteActions.find((entry) => (
  entry.action.executorId === OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID
    && entry.action.weaponName === "Commando Rifle"
));
assert.ok(ranged);
const preview = engine.preview({
  envelope: initialEnvelope,
  seatAuthority: access.authority,
  proposal: { kind: "finite", actionKey: ranged.actionKey },
});
assert.equal(preview.ok, true);
assert.equal(preview.preview.core.chanceTicket.tickets.length, 7);
const confirmed = engine.confirmPreview({
  envelope: initialEnvelope,
  preview: preview.preview,
  seatAuthority: access.authority,
});
assert.equal(confirmed.ok, true);
const applied = engine.apply({
  envelope: initialEnvelope,
  expectedStateRevision: initialEnvelope.stateRevision,
  preview: preview.preview,
  confirmation: confirmed.confirmation,
  seatAuthority: access.authority,
  controlLease: access.lease,
  idempotencyKey: "ticket-11-slice-67-ranged-attack",
});
assert.equal(applied.ok, true);
assert.equal(applied.receipt.action.executorId, OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID);
assert.equal(applied.receipt.refereeSignature.signatureAlgorithm, "ed25519");

const replayEngine = authoritativeEngine("ticket-11-slice-67-rotated-short-seal-v2");
registerReplayDependencies(replayEngine, initialEnvelope);
const replayed = replayEngine.replay({
  initialEnvelope,
  journal: [applied.receipt],
});
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, applied.envelope.stateHash);
const tampered = structuredClone(applied.receipt);
tampered.events.push({ type: "forged_slice_67_event" });
const tamperedReplay = replayEngine.replay({
  initialEnvelope,
  journal: [tampered],
});
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");

console.log(JSON.stringify({
  schema: "starcraft_tmg_official_ranged_attack_v6_current_public_contract_v1",
  sourceSnapshotHash: liveReport.commandSnapshot.snapshotHash,
  datasetHash: dataset.datasetHash,
  gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
  dataVersions: dataset.dataVersions,
  directCommandoApplied: true,
  delegatedC14Applied: true,
  runtimeApplied: true,
  authorityApplied: true,
  replayAfterHmacRotation: true,
  repositoryFallbackUsed: false,
  trainingTruth: false,
}, null, 2));
