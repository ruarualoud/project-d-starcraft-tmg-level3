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
import { createStarcraftTmgAuthoritativeEngine } from "../packages/authoritative-engine/transition-v1.mjs";
import {
  enumerateOfficialStartOfRoundActionsV1,
  OFFICIAL_START_OF_ROUND_EXECUTOR_ID,
} from "../packages/rule-atoms/official-start-of-round-executor-v1.mjs";
import {
  OFFICIAL_START_OF_ROUND_V2_ACTION_TYPE,
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID,
} from "../packages/rule-atoms/official-start-of-round-executor-v2.mjs";
import {
  createOfficialExistingStartOfRoundContractClosureRuleSliceV1,
  verifyOfficialExistingStartOfRoundContractClosureRuleSliceV1,
} from
  "../packages/rule-atoms/official-existing-start-of-round-contract-closure-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialStartOfRoundRelationshipExtensionV1 } from
  "../packages/rule-atoms/official-start-of-round-relationship-contract-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { auditExecutableAtomStateContractCoverageV1 } from
  "../packages/rule-atoms/rule-executor-state-contract-coverage-v1.mjs";
import { createOfficialCommandCenterDataset } from "../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialMissionSetupBindingV1 } from "../packages/source-data/official-mission-setup-binding-v1.mjs";

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
const OCCURRED_AT = "2026-08-28T22:00:00.000Z";
const HASH_A = "a".repeat(64);
const SLICE_HASH =
  "3a81f7d6c7d5b61fd443d63521a05d20336950f59ae68f0e4839d2dcc89b012b";
const PREVIOUS_SLICE_HASH =
  "54170af6469649848bbacc19743c4ba0952441d8fa510a1892100a58bfb55448";
const CATALOGUE_HASH =
  "70f8a9b7e69c45f788aa3d967417a04898dfeff2855e64760bd5ae397a318529";
const RUNTIME_HASH =
  "b4a63b98baebc6fc74f43356d94b4e61f1456c3c561ef9c771083644a29c1a99";
const GRAPH_HASH =
  "62e894083bdf2d4e52601f9bc3d17da857d7954b40033ac3d481498dfaa4ee5e";
const FROZEN_V1_EXECUTOR_SOURCE_HASH =
  "2d7542321dc8cdc7f1f283c5da4a03a8d30158007f6d5061890d9c47e15b01f6";
const CURRENT_V2_EXECUTOR_SOURCE_HASH =
  "0dca5a1a8a10f292cf5b03de9139a9f4c2855915a698ea67df6b46d2cee05820";
const CORE_RULES_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";
const ACTION_SCHEMA_CONTENT = Object.freeze({
  kind: "action-schema",
  schemaVersion: "hybrid_legal_space_v19",
});
const OFFICIAL_URLS = Object.freeze({
  coreRules: "https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf",
  versions:
    "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/"
    + "starcrafttmgbeta/documents/system_metadata/versions",
  holdPosition:
    "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/"
    + "starcrafttmgbeta/documents/faction_cards/mission_hold_position",
});

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
    liveReport,
    firestorePayloads,
    snapshot: liveReport.commandSnapshot,
    dataset: createOfficialCommandCenterDataset({
      snapshot: liveReport.commandSnapshot,
      firestorePayloads,
    }),
  };
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

function marine(profile, input) {
  return {
    id: input.id,
    sideKey: input.sideKey,
    officialUnitRecordKey: profile.recordKey,
    sourceRecordHash: profile.sourceRecordHash,
    currentModels: input.currentModels,
    currentSupply: input.currentSupply,
    isOnField: input.isOnField,
    isDestroyed: input.isDestroyed || false,
    statuses: [],
    selectedUpgradeNames: [],
    startOfRoundEffects: [],
    activatedPhases: { movement: false, assault: false, combat: false },
  };
}

function startState(input) {
  const round = Number(input.round || 3);
  const firstPlayerSideKey = input.firstPlayerSideKey || "player2";
  const scores = input.scores || { player1: 5, player2: 3 };
  const unitProfile = input.gameplayDataBundle.combatProfileBundle.profiles[0];
  const [academy, armedForces] = input.gameplayDataBundle.cleanupCardBundle.profiles;
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round,
    phase: "start_of_round",
    activeSideKey: null,
    firstPlayerSideKey,
    firstPassSideByPhase: {},
    phaseFirstActorByRound: {
      [`${round - 1}:movement`]: {
        round: round - 1,
        phase: "movement",
        markerHolderSideKey: "player1",
        chosenFirstActorSideKey: "player1",
      },
    },
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: { sideKey: "player2", passedPhases: {} },
    },
    scores,
    officialGameplayDataBundle: input.gameplayDataBundle,
    officialMissionSetupBinding: input.missionSetupBinding,
    cleanupRefreshHistory: [{
      schema: "starcraft_tmg_official_cleanup_refresh_history_entry_v5",
      round: round - 1,
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
      round: round - 1,
      nextRound: round,
      previousFirstPlayerSideKey: firstPlayerSideKey === "player1" ? "player2" : "player1",
      nextFirstPlayerSideKey: firstPlayerSideKey,
      scores,
      initiativeMode: "trailing_player",
      rollOff: null,
      initiativeResolutionHash: HASH_A,
      trainingTruth: false,
    }],
    board: {
      widthInches: 54,
      heightInches: 36,
      missionMarkers: [],
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
    pieces: input.pieces || [
      marine(unitProfile, {
        id: "p1-live-marine",
        sideKey: "player1",
        currentModels: 6,
        currentSupply: 1,
        isOnField: true,
      }),
      marine(unitProfile, {
        id: "p1-reserve-marine",
        sideKey: "player1",
        currentModels: 9,
        currentSupply: 2,
        isOnField: false,
      }),
      marine(unitProfile, {
        id: "p2-live-marine",
        sideKey: "player2",
        currentModels: 9,
        currentSupply: 2,
        isOnField: true,
      }),
    ],
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
    grantId: `start-of-round-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode,
    principalType,
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `start-of-round-${suffix}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

function envelopeForState(engine, roomId, snapshot, gameplayDataBundle, state) {
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

function applyStart(engine, envelope, sideKey, suffix) {
  const access = credentials(engine, envelope, sideKey, suffix);
  const legal = engine.legalSpace(envelope, { seatAuthority: access.authority });
  const finite = legal.finiteActions.find((entry) => (
    entry.action.actionType === OFFICIAL_START_OF_ROUND_V2_ACTION_TYPE
  ));
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
    idempotencyKey: `start-of-round-${suffix}`,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return { access, legal, finite, preview, confirmed, applied };
}

function assertDisabled(engine, envelope, sideKey, expectedReason, suffix) {
  const access = credentials(engine, envelope, sideKey, suffix);
  const legal = engine.legalSpace(envelope, { seatAuthority: access.authority });
  assert.equal(legal.finiteActions.some((entry) => (
    entry.action.actionType === OFFICIAL_START_OF_ROUND_V2_ACTION_TYPE
  )), false);
  assert.ok(legal.disabledDiagnostics.some((entry) => (
    entry.action?.actionType === OFFICIAL_START_OF_ROUND_V2_ACTION_TYPE
      && entry.disabledReason === expectedReason
  )), `${suffix}:${expectedReason}:${JSON.stringify(legal.disabledDiagnostics)}`);
}

const previousReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR,
    "official-existing-determine-initiative-contract-closure-v1-report.json"),
  "utf8",
));
const historicalReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-start-of-round-rule-slice-v1-report.json"),
  "utf8",
));
const acceptance = [];
const slice = createOfficialExistingStartOfRoundContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialExistingStartOfRoundContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(slice.sliceHash, SLICE_HASH);
assert.equal(slice.previousSliceHash, PREVIOUS_SLICE_HASH);
assert.equal(slice.catalogueHash, CATALOGUE_HASH);
assert.equal(audit.runtimeHash, RUNTIME_HASH);
assert.equal(audit.graphHash, GRAPH_HASH);
assert.equal(audit.counts.executableRuleAtoms, 421);
assert.equal(audit.counts.newlyExecutableRuleAtoms, 0);
assert.equal(audit.counts.versionReassignedRuleAtoms, 13);
assert.equal(audit.counts.reviewRequiredRuleAtoms, 491);
assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
assert.equal(audit.counts.changedNonTargetAtoms, 0);
acceptance.push("catalogue_rebinds_only_thirteen_existing_start_of_round_atoms");

const { liveReport, firestorePayloads, snapshot, dataset } = await officialData();
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot,
  dataset,
  unitRecordKeys: ["army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
  cleanupCardRecordKeys: [
    "tactical_cards:academy",
    "tactical_cards:terran_armed_forces",
  ],
});
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const extension = createOfficialStartOfRoundRelationshipExtensionV1({
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const graph = createRuleRelationshipGraphV1({ catalogue: slice.catalogue, extension });
const graphAudit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);
assert.equal(graph.graphHash, GRAPH_HASH);
assert.equal(graphAudit.valid, true);
assert.deepEqual(coverage.counts, {
  executableAtoms: 421,
  strictCompleteAtoms: 186,
  partialContractAtoms: 78,
  noContractAtoms: 157,
  executors: 42,
  declaredStateContractExecutors: 25,
  missingStateContractExecutors: 17,
});
acceptance.push("relationship_graph_closes_thirteen_atoms_and_one_executor_contract");
const missionSetupBinding = createOfficialMissionSetupBindingV1({
  gameplayDataBundle,
  missionDraftReceiptHash: hashStarcraftTmgContract({ kind: "mission-draft-receipt" }),
  deploymentDraftReceiptHash: hashStarcraftTmgContract({ kind: "deployment-draft-receipt" }),
  seatColorAssignment: { player1: "red", player2: "blue" },
});
assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
assert.equal(gameplayDataBundle.missionScoringProfile.startingSupply, 6);
assert.equal(gameplayDataBundle.missionScoringProfile.extraSupplyPerRound, 2);
acceptance.push("latest_official_hold_position_marine_and_card_data_is_hash_bound");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function authoritativeEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-start-of-round-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}

const engine = authoritativeEngine("ticket-11-start-of-round-seal-v1");
const initialState = startState({ gameplayDataBundle, missionSetupBinding });
const initial = envelopeForState(
  engine,
  "official-start-of-round-finite-room",
  snapshot,
  gameplayDataBundle,
  initialState,
);
const step = applyStart(engine, initial, "player2", "finite-round-three");
assert.equal(step.legal.schemaVersion, "starcraft_tmg_authority_v2.legal-space");
assert.equal(initial.matchBinding.dependencies.actionSchema.contentHash,
  hashStarcraftTmgContract(ACTION_SCHEMA_CONTENT));
assert.equal(step.finite.action.executorId, OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID);
assert.deepEqual(step.finite.action.ruleAtomIds,
  [...OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ATOM_IDS]);
assert.equal(step.preview.preview.core.chanceTicket, null);
assert.equal(step.applied.envelope.state.phase, "movement");
assert.equal(step.applied.envelope.state.activeSideKey, "player2");
assert.deepEqual(step.applied.envelope.state.officialRoundSupplyState.supplyPoolBySide, {
  player1: 10,
  player2: 10,
});
assert.deepEqual(step.applied.envelope.state.officialRoundSupplyState.onTableSupplyBySide, {
  player1: 1,
  player2: 2,
});
assert.deepEqual(step.applied.envelope.state.officialRoundSupplyState.reserveSupplyBySide, {
  player1: 2,
  player2: 0,
});
assert.deepEqual(step.applied.envelope.state.officialRoundSupplyState.availableSupplyBySide, {
  player1: 9,
  player2: 8,
});
assert.ok(step.applied.envelope.state.pieces
  .filter((piece) => !piece.isDestroyed)
  .every((piece) => piece.statuses.includes("stationary")));
assert.equal(step.applied.envelope.state.cardResources.player1[0].readiness, "ready");
assert.equal(step.applied.envelope.state.cardResources.player1[0].face, "up");
assert.equal(step.applied.envelope.state.startOfRoundHistory.at(-1).trainingTruth, false);
assert.deepEqual(
  step.finite.action.startOfRoundResolution.effectQueue.playerOrder,
  ["player2", "player1"],
);
assert.deepEqual(
  step.finite.action.startOfRoundResolution.effectQueue.effects.map((entry) => (
    entry.ownerSideKey
  )),
  ["player2", "player1", "player1"],
);
for (const key of [
  "scores",
  "officialGameplayDataBundle",
  "officialMissionSetupBinding",
  "cleanupRefreshHistory",
  "determineInitiativeHistory",
  "board",
  "phaseFirstActorByRound",
]) {
  assert.deepEqual(step.applied.envelope.state[key], initial.state[key], key);
}
assert.deepEqual(
  step.applied.envelope.state.pieces.map(({ statuses: _statuses, ...piece }) => piece),
  initial.state.pieces.map(({ statuses: _statuses, ...piece }) => piece),
);
assert.equal(step.applied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
acceptance.push("round_three_supply_stationary_ready_and_history_apply_atomically");

const opponentAccess = credentials(
  engine,
  initial,
  "player2",
  "opponent",
  "opponent",
  "model",
);
const opponentLegal = engine.legalSpace(initial, {
  seatAuthority: opponentAccess.authority,
});
const opponentFinite = opponentLegal.finiteActions.find((entry) => (
  entry.action.executorId === OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID
));
assert.ok(opponentFinite);
const opponentPreview = engine.preview({
  envelope: initial,
  seatAuthority: opponentAccess.authority,
  proposal: { kind: "finite", actionKey: opponentFinite.actionKey },
});
assert.equal(opponentPreview.ok, true);
assert.equal(opponentPreview.preview.core.confirmationPolicy.requiresExplicitHuman, true);
assert.equal(engine.confirmPreview({
  envelope: initial,
  preview: opponentPreview.preview,
  seatAuthority: opponentAccess.authority,
}).reason, "CAPABILITY_DENIED");
assert.equal(engine.apply({
  envelope: initial,
  expectedStateRevision: initial.stateRevision,
  preview: opponentPreview.preview,
  seatAuthority: opponentAccess.authority,
  controlLease: opponentAccess.lease,
  idempotencyKey: "start-of-round-opponent-forbidden",
}).reason, "CAPABILITY_DENIED");
acceptance.push("opponent_can_preview_but_cannot_confirm_or_apply");

const movementAccess = credentials(engine, step.applied.envelope, "player2", "movement-choice");
const movementLegal = engine.legalSpace(step.applied.envelope, {
  seatAuthority: movementAccess.authority,
});
assert.equal(movementLegal.finiteActions.filter((entry) => (
  entry.action.actionType === "choose_first_actor"
)).length, 2);
acceptance.push("movement_phase_choice_opens_only_after_start_window_receipt");

const beforeLegal = engine.legalSpace(initial, { seatAuthority: step.access.authority });
assert.equal(beforeLegal.finiteActions.some((entry) => (
  entry.action.actionType === "choose_first_actor"
)), false);
acceptance.push("movement_operations_are_not_exposed_before_start_window_resolution");

const unknownEffectState = structuredClone(initialState);
unknownEffectState.pieces[0].startOfRoundEffects.push({ id: "unsupported-trigger" });
assertDisabled(
  engine,
  envelopeForState(engine, "official-start-of-round-unknown-effect-room", snapshot,
    gameplayDataBundle, unknownEffectState),
  "player2",
  "START_OF_ROUND_EFFECT_SCOPE_UNRESOLVED",
  "unknown-effect",
);
const burrowedState = structuredClone(initialState);
burrowedState.pieces[0].statuses.push("burrowed");
assertDisabled(
  engine,
  envelopeForState(engine, "official-start-of-round-burrowed-room", snapshot,
    gameplayDataBundle, burrowedState),
  "player2",
  "START_OF_ROUND_EFFECT_SCOPE_UNRESOLVED",
  "burrowed",
);
acceptance.push("unknown_and_burrowed_start_effects_fail_closed");

const profile = gameplayDataBundle.combatProfileBundle.profiles[0];
const overCapState = startState({
  gameplayDataBundle,
  missionSetupBinding,
  pieces: Array.from({ length: 6 }, (_, index) => marine(profile, {
    id: `over-cap-${index}`,
    sideKey: "player1",
    currentModels: 9,
    currentSupply: 2,
    isOnField: true,
  })),
});
assertDisabled(
  engine,
  envelopeForState(engine, "official-start-of-round-over-cap-room", snapshot,
    gameplayDataBundle, overCapState),
  "player2",
  "START_OF_ROUND_SUPPLY_CAP_EXCEEDED",
  "over-cap",
);
acceptance.push("finite_round_on_table_supply_over_cap_fails_closed");

const wrongSupplyState = structuredClone(initialState);
wrongSupplyState.pieces[0].currentSupply = 2;
assertDisabled(
  engine,
  envelopeForState(engine, "official-start-of-round-wrong-supply-room", snapshot,
    gameplayDataBundle, wrongSupplyState),
  "player2",
  "START_OF_ROUND_CURRENT_SUPPLY_MISMATCH",
  "wrong-supply",
);
acceptance.push("current_supply_must_match_current_official_squad_profile");

const finalState = startState({
  gameplayDataBundle,
  missionSetupBinding,
  round: 5,
  firstPlayerSideKey: "player1",
  scores: { player1: 3, player2: 5 },
  pieces: Array.from({ length: 8 }, (_, index) => marine(profile, {
    id: `final-round-${index}`,
    sideKey: index < 6 ? "player1" : "player2",
    currentModels: 9,
    currentSupply: 2,
    isOnField: true,
  })),
});
const finalEnvelope = envelopeForState(engine, "official-start-of-round-final-room", snapshot,
  gameplayDataBundle, finalState);
const finalStep = applyStart(engine, finalEnvelope, "player1", "final-round");
assert.equal(finalStep.applied.envelope.state.officialRoundSupplyState.mode, "unlimited");
assert.deepEqual(finalStep.applied.envelope.state.officialRoundSupplyState.supplyPoolBySide, {
  player1: null,
  player2: null,
});
assert.deepEqual(finalStep.applied.envelope.state.officialRoundSupplyState.availableSupplyBySide, {
  player1: null,
  player2: null,
});
acceptance.push("final_round_supply_is_unlimited_without_erasing_observed_supply");

const staleState = structuredClone(initialState);
const runtimeCandidate = runtime.enumerate(staleState, {
  sideKey: "player2",
  matchBinding: initial.matchBinding,
}).candidates.find((candidate) => (
  candidate.actionType === OFFICIAL_START_OF_ROUND_V2_ACTION_TYPE
));
assert.ok(runtimeCandidate);
const {
  details: _details,
  isEnabled: _isEnabled,
  disabledReason: _disabled,
  score: _score,
  ...staleAction
} = runtimeCandidate;
staleState.cardResources.player1[0].readiness = "ready";
staleState.cardResources.player1[0].face = "up";
assert.throws(
  () => runtime.apply(staleState, staleAction, {
    postRevision: 1,
    matchBinding: initial.matchBinding,
  }),
  /START_OF_ROUND_V2_ACTION_MISMATCH/u,
);
acceptance.push("previewed_start_resolution_rejects_stale_card_material");

const forgedHistoryState = structuredClone(initialState);
forgedHistoryState.determineInitiativeHistory[0].round = 999;
forgedHistoryState.determineInitiativeHistory[0].scores = {
  player1: 999,
  player2: 999,
};
forgedHistoryState.determineInitiativeHistory[0].initiativeMode = "caller_forged";
assert.equal(enumerateOfficialStartOfRoundActionsV1(forgedHistoryState, {
  sideKey: "player2",
  matchBinding: initial.matchBinding,
}).length, 1);
assertDisabled(
  engine,
  envelopeForState(engine, "official-start-of-round-forged-history-room", snapshot,
    gameplayDataBundle, forgedHistoryState),
  "player2",
  "START_OF_ROUND_V2_INITIATIVE_HISTORY_INVALID",
  "forged-initiative-history",
);
const sourceDriftState = structuredClone(initialState);
sourceDriftState.officialGameplayDataBundle.sourceSnapshotHash = "f".repeat(64);
assertDisabled(
  engine,
  envelopeForState(engine, "official-start-of-round-source-drift-room", snapshot,
    gameplayDataBundle, sourceDriftState),
  "player2",
  "START_OF_ROUND_V2_LATEST_OFFICIAL_DATA_REQUIRED",
  "source-drift",
);
assertDisabled(
  engine,
  initial,
  "player1",
  "START_OF_ROUND_FIRST_PLAYER_ONLY",
  "wrong-seat",
);
acceptance.push("current_prefix_source_and_first_player_boundary_fail_closed");

const replayEngine = authoritativeEngine("ticket-11-start-of-round-rotated-seal-v2");
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
  journal: [step.applied.receipt],
});
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, step.applied.envelope.stateHash);
const tamperedJournal = [structuredClone(step.applied.receipt)];
tamperedJournal[0].events.push({ type: "forged_start_of_round" });
const tamperedReplay = replayEngine.replay({ initialEnvelope: initial, journal: tamperedJournal });
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
acceptance.push("ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

const previousRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
const frozenV1ExecutorSource = await readFile(path.join(
  ROOT,
  "packages/rule-atoms/official-start-of-round-executor-v1.mjs",
));
const currentV2ExecutorSource = await readFile(path.join(
  ROOT,
  "packages/rule-atoms/official-start-of-round-executor-v2.mjs",
));
assert.equal(previousRuntime.descriptor.runtimeHash,
  "e8b303a317e186721fbf5c5f9b4c53236aeeba95487f29b39ba076254f6fcfb7");
assert.equal(historicalReport.runtime.runtimeHash,
  "454d0a289d536b9d75e11f393a37386a2bffff05563fd371f49ccbd7a0f14be0");
assert.equal(historicalReport.runtime.executableRuleAtomCount, 189);
assert.equal(historicalReport.historicalRuntimeHash,
  "7edeb5f2b688a4e12e37241469a47b6f3fa1ee13bcaf029631452ef8c962d558");
assert.equal(contentHash(frozenV1ExecutorSource), FROZEN_V1_EXECUTOR_SOURCE_HASH);
assert.equal(contentHash(currentV2ExecutorSource), CURRENT_V2_EXECUTOR_SOURCE_HASH);
assert.equal(historicalReport.acceptancePassed, 13);
assert.equal(historicalReport.acceptanceTotal, 13);
assert.equal(previousRuntime.descriptor.executorManifest.some((entry) => (
  entry.executorId === OFFICIAL_START_OF_ROUND_EXECUTOR_ID
    && entry.executorVersion === "1.0.0"
)), true);
assert.equal(enumerateOfficialStartOfRoundActionsV1(initial.state, {
  sideKey: "player2",
  matchBinding: initial.matchBinding,
}).length, 1);
assert.equal(runtime.descriptor.executorManifest.some((entry) => (
  entry.executorId === OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID
    && entry.executorVersion === "2.0.0"
)), true);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
assert.equal(slice.historicalCompatibility.previousExecutorSourceMutationAllowed, false);
assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
acceptance.push("frozen_v1_runtime_replay_and_rules_display_remain_available");

const liveOfficial = {
  coreRules: await fetchOfficialBytes(OFFICIAL_URLS.coreRules, "coreRules"),
  versions: await fetchOfficialJson(OFFICIAL_URLS.versions, "versions"),
  holdPosition: await fetchOfficialJson(OFFICIAL_URLS.holdPosition, "holdPosition"),
};
assert.equal(contentHash(liveOfficial.coreRules), CORE_RULES_HASH);
assert.deepEqual(dataset.dataVersions, {
  cardsVersion: "69",
  rulesVersion: "48",
  unitsVersion: "71",
});
assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
assert.equal(documentHash(liveOfficial.versions),
  previousReport.liveOfficialRevalidation.hashes.versions);
assert.equal(documentHash(liveOfficial.holdPosition), documentHash(localDocument(
  firestorePayloads.faction_cards,
  "/faction_cards/mission_hold_position",
)));
acceptance.push("live_official_core_hold_position_and_71_69_48_data_are_current");

assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs");

const report = {
  schema: "starcraft_tmg_existing_start_of_round_contract_closure_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  dataVersions: dataset.dataVersions,
  liveOfficialRevalidation: {
    urls: OFFICIAL_URLS,
    hashes: {
      coreRules: contentHash(liveOfficial.coreRules),
      versions: documentHash(liveOfficial.versions),
      holdPosition: documentHash(liveOfficial.holdPosition),
    },
    dataVersions: dataset.dataVersions,
    repositoryFallbackUsed: gameplayDataBundle.repositoryFallbackAllowed,
  },
  gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
  slice,
  sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash,
  catalogueHash: slice.catalogueHash,
  graph: {
    graphHash: graph.graphHash,
    nodes: graph.nodes.length,
    edges: graph.edges.length,
  },
  graphAudit,
  coverage,
  previousCoverage: previousReport.coverage,
  frozenExecutorSourceHash: FROZEN_V1_EXECUTOR_SOURCE_HASH,
  currentExecutorSourceHash: CURRENT_V2_EXECUTOR_SOURCE_HASH,
  authorityFixture: {
    actionSchemaVersion: ACTION_SCHEMA_CONTENT.schemaVersion,
    executorId: step.applied.receipt.action.executorId,
    receiptSignatureAlgorithm: step.applied.receipt.refereeSignature.signatureAlgorithm,
  },
  historicalSliceHash: previousReport.slice.sliceHash,
  historicalCatalogueHash: previousReport.slice.catalogueHash,
  historicalRuntimeHash: previousRuntime.descriptor.runtimeHash,
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesTruth:
    "start_of_round_v2_current_initiative_handoff_exact_with_frozen_v1_isolation",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR,
    "official-existing-start-of-round-contract-closure-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: report.slice.sliceHash,
  catalogueHash: report.slice.catalogueHash,
  runtimeHash: report.runtimeHash,
  graphHash: report.graph.graphHash,
  coverage: report.coverage.counts,
  actionSchemaVersion: report.authorityFixture.actionSchemaVersion,
  rulesTruth: report.rulesTruth,
  trainingTruth: report.trainingTruth,
}, null, 2));
