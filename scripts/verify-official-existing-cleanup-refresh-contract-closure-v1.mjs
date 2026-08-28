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
import { createOfficialCharacteristicStatusKernelV1 } from
  "../packages/rule-atoms/official-characteristic-status-kernel-v1.mjs";
import {
  enumerateOfficialCleanupRefreshActionsV2,
  OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_ID,
} from "../packages/rule-atoms/official-cleanup-refresh-executor-v2.mjs";
import {
  applyOfficialCleanupRefreshV5,
  enumerateOfficialCleanupRefreshActionsV5,
  OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ATOM_IDS,
  OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ID,
} from "../packages/rule-atoms/official-cleanup-refresh-executor-v5.mjs";
import {
  createOfficialCleanupRefreshRelationshipExtensionV1,
  OFFICIAL_CLEANUP_REFRESH_RELATIONSHIP_NODE_IDS_V1,
} from "../packages/rule-atoms/official-cleanup-refresh-relationship-contract-v1.mjs";
import {
  applyOfficialEndOfRoundEffectsV5,
  enumerateOfficialEndOfRoundEffectsActionsV5,
} from "../packages/rule-atoms/official-end-of-round-effects-executor-v5.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  createOfficialExistingCleanupRefreshContractClosureRuleSliceV1,
  verifyOfficialExistingCleanupRefreshContractClosureRuleSliceV1,
} from
  "../packages/rule-atoms/official-existing-cleanup-refresh-contract-closure-rule-slice-v1.mjs";
import {
  enumerateOfficialCleanupRefreshActionsV3,
  OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ATOM_IDS,
  OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ID,
} from "../packages/rule-atoms/official-optical-flare-lifecycle-executors-v1.mjs";
import { createOfficialMarineStimpackKernelV1 } from
  "../packages/rule-atoms/official-marine-stimpack-kernel-v1.mjs";
import {
  OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ID,
} from "../packages/rule-atoms/official-stimpack-lifecycle-executors-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
  queryRuleRelationshipImpactV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { auditExecutableAtomStateContractCoverageV1 } from
  "../packages/rule-atoms/rule-executor-state-contract-coverage-v1.mjs";
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
const OCCURRED_AT = "2026-08-28T20:00:00.000Z";
const SLICE_HASH = "23d6385e012107abd6e2ad5b51d05f053d81e5a6833ad4afa09eaee3cc3b5d10";
const CATALOGUE_HASH =
  "edda61ad6599cf032caa13476412c1a63897c63babb66000f028019f31cb75e6";
const RUNTIME_HASH = "8698853a5f4804ede9da31b8ee1ebf5e51173c5797b10b6ef730874c524aa79d";
const GRAPH_HASH = "eef1c44a2d9074d7efcbafab8ceb0315bdcc140d9a4ba21722e68559160b51db";
const PREVIOUS_RUNTIME_HASH =
  "ec37637bc787d6d5870db5c02fa84f53b077d54f177542bd8282b710f42eb089";
const SOURCE_HASHES = Object.freeze({
  v1: "d5a20f7740a691ffc40ef63b7356166fec4dee229bff6471b47d29e394da0dc8",
  v2: "3fcb6fc1404a94512865df62c75e727cb4246de91f0d1bd4994a5bd1b7de4d28",
  v3: "d62804ddf7c8d3fb4967f0788258f568a53a6921b321e533a95ab7222c1d40e5",
  v4: "76ebc98d1575861414f247208ffc7735a9741bd0425c3fc12807737269a1fd02",
  v5: "244bc7ee615b74c183ba4aea0e6ab60a715573234ea6e0378e4b78a075ca562f",
});
const OFFICIAL_URLS = Object.freeze({
  coreRules: "https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf",
  versions:
    "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/"
    + "starcrafttmgbeta/documents/system_metadata/versions",
  part11:
    "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/"
    + "starcrafttmgbeta/documents/rules_sections/FuahgilWtc8nccVSp2Vv",
  academy:
    "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/"
    + "starcrafttmgbeta/documents/tactical_cards/academy",
  terranArmedForces:
    "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/"
    + "starcrafttmgbeta/documents/tactical_cards/terran_armed_forces",
});
const CORE_RULES_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";
const ACTION_SCHEMA_CONTENT = Object.freeze({
  kind: "action-schema",
  schemaVersion: "hybrid_legal_space_v19",
});
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

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function executableAction(candidate) {
  return without(candidate, ["isEnabled", "disabledReason", "score", "details"]);
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
  return JSON.parse(new TextDecoder().decode(await fetchOfficialBytes(url, kind)));
}

function localDocument(payload, suffix) {
  const document = payload.documents.find((entry) => entry.name.endsWith(suffix));
  assert.ok(document, `local document missing: ${suffix}`);
  return document;
}

function liveMarine(id, sideKey, xInches) {
  return {
    id,
    sideKey,
    name: "Marine",
    officialUnitRecordKey: "army_units:marine",
    selectedUpgradeNames: [],
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
      yInches: 1,
      isOnField: true,
      isDestroyed: false,
    }],
    activatedPhases: { movement: true, assault: true, combat: true },
  };
}

function endOfRoundState(gameplayDataBundle, missionSetupBinding) {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "cleanup",
    activeSideKey: null,
    firstPlayerSideKey: "player1",
    players: {
      player1: { sideKey: "player1", passedPhases: { combat: true } },
      player2: { sideKey: "player2", passedPhases: { combat: true } },
    },
    scores: { player1: 4, player2: 3 },
    officialGameplayDataBundle: gameplayDataBundle,
    officialMissionSetupBinding: missionSetupBinding,
    scoringCleanupProgress: {
      schemaVersion: "starcraft_tmg_scoring_cleanup_progress_v1",
      round: 2,
      completedSteps: [
        "determine_mission_marker_control",
        "score_victory_points",
        "check_end_game_conditions",
      ],
      currentStep: "resolve_end_of_round_effects",
      controlResolutionHash: "3".repeat(64),
      scoringResolutionHash: "4".repeat(64),
      endGameResolutionHash: "5".repeat(64),
      trainingTruth: false,
    },
    board: {
      missionMarkers: [{ id: "hold-position-center", controlledBy: "player1" }],
      effectMarkers: [],
      tokens: [],
      markers: [],
    },
    cardResources: { player1: [], player2: [] },
    pieces: [
      liveMarine("player1-marine", "player1", 1),
      liveMarine("player2-marine", "player2", 8),
    ],
    firstPassSideByPhase: { combat: "player1" },
    phaseFirstActorByRound: { "2": { combat: "player2" } },
    gameOver: false,
    terminal: false,
    winner: "",
    terminalReason: "",
    log: [],
  };
}

function opticalFlareState(baseState) {
  const state = clone(baseState);
  const pair = createOfficialCharacteristicStatusKernelV1().createOpticalFlareStatus({
    round: state.round,
    sourceSideKey: "player1",
    sourcePieceId: "player1-marine",
    targetPieceId: "player2-marine",
    abilityResolutionHash: "6".repeat(64),
  });
  state.pieces[1].statuses.push(pair.status);
  state.board.effectMarkers.push(pair.marker);
  return state;
}

function stimpackState(baseState) {
  const state = clone(baseState);
  const pair = createOfficialMarineStimpackKernelV1().createStatus({
    round: state.round,
    sourceSideKey: "player1",
    sourcePieceId: "player1-marine",
    abilityResolutionHash: "7".repeat(64),
  });
  state.pieces[0].statuses.push(pair.status);
  state.pieces[0].damageMarker = 2;
  state.board.effectMarkers.push(pair.marker);
  return state;
}

function toCleanupState(state, matchBinding) {
  const candidate = enumerateOfficialEndOfRoundEffectsActionsV5(state, {
    sideKey: "player1",
    matchBinding,
  })[0];
  assert.ok(candidate, "end-of-round v5 candidate missing");
  return applyOfficialEndOfRoundEffectsV5(
    state,
    executableAction(candidate),
    { matchBinding },
  ).state;
}

function cleanupCard(profile, id, sideKey, readiness) {
  return {
    id,
    sideKey,
    cardKind: profile.cardKind,
    officialCardRecordKey: profile.recordKey,
    sourceRecordHash: profile.sourceRecordHash,
    resource: profile.resource,
    resourceType: "CP",
    readiness,
    face: readiness === "ready" ? "up" : "down",
    activeEffects: [],
  };
}

function ledger(schema, round, entries) {
  const body = { schema, round, entries, trainingTruth: false };
  return { ...body, ledgerHash: hashStarcraftTmgContract(body) };
}

function candidates(runtime, state, matchBinding, sideKey = "player1", includeDisabled = false) {
  return runtime.enumerate(state, { sideKey, includeDisabled, matchBinding }).candidates;
}

function credentials(engine, envelope, suffix) {
  const seatAuthority = engine.issueSeatAuthority({
    grantId: `cleanup-v5-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1",
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const controlLease = engine.issueControlLease({
    seatAuthority,
    sessionId: `cleanup-v5-${suffix}-session`,
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
    geometryArtifact: {
      kind: "geometry-artifact",
      geometryVersion: "fixed_point_round_base_v1",
    },
    actionSchema: ACTION_SCHEMA_CONTENT,
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
  path.join(OUTPUT_DIR, "official-existing-end-of-round-effects-contract-closure-v1-report.json"),
  "utf8",
));
const historicalStimpackReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-marine-stimpack-rule-slice-v1-report.json"),
  "utf8",
));
const previousSlice = previousReport.slice;
const slice = createOfficialExistingCleanupRefreshContractClosureRuleSliceV1({
  previousSlice,
});
const sliceAudit = verifyOfficialExistingCleanupRefreshContractClosureRuleSliceV1({
  previousSlice,
  slice,
});
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const previousRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousSlice.catalogue,
});
const relationshipExtension = createOfficialCleanupRefreshRelationshipExtensionV1({
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const graph = createRuleRelationshipGraphV1({
  catalogue: slice.catalogue,
  extension: relationshipExtension,
});
const graphAudit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);

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
  cleanupCardRecordKeys: [
    "tactical_cards:academy",
    "tactical_cards:terran_armed_forces",
  ],
});
const missionSetupBinding = createOfficialMissionSetupBindingV1({
  gameplayDataBundle,
  missionDraftReceiptHash: "1".repeat(64),
  deploymentDraftReceiptHash: "2".repeat(64),
  seatColorAssignment: { player1: "red", player2: "blue" },
});
const matchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
};
const previousMatchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: previousRuntime.descriptor.runtimeHash },
};
const emptyCleanupState = toCleanupState(
  endOfRoundState(gameplayDataBundle, missionSetupBinding),
  matchBinding,
);
const opticalCleanupState = toCleanupState(
  opticalFlareState(endOfRoundState(gameplayDataBundle, missionSetupBinding)),
  matchBinding,
);
const stimpackCleanupState = toCleanupState(
  stimpackState(endOfRoundState(gameplayDataBundle, missionSetupBinding)),
  matchBinding,
);

check("slice_catalogue_runtime_and_graph_hashes_are_exact", () => {
  assert.equal(slice.sliceHash, SLICE_HASH);
  assert.equal(slice.catalogueHash, CATALOGUE_HASH);
  assert.equal(runtime.descriptor.runtimeHash, RUNTIME_HASH);
  assert.equal(graph.graphHash, GRAPH_HASH);
  assert.equal(sliceAudit.counts.executableRuleAtoms, 421);
  assert.equal(sliceAudit.counts.changedAtoms, 7);
  assert.equal(sliceAudit.counts.changedNonTargetAtoms, 0);
  assert.equal(sliceAudit.counts.newlyExecutableRuleAtoms, 0);
});

check("coverage_moves_to_167_strict_78_partial_176_none_and_23_of_42_contracts", () => {
  assert.equal(graphAudit.valid, true);
  assert.equal(graphAudit.counts.executors, 42);
  assert.equal(graphAudit.counts.declaredStateContractExecutors, 23);
  assert.equal(graphAudit.counts.stateContractMissingExecutors, 19);
  assert.deepEqual(coverage.counts, {
    executableAtoms: 421,
    strictCompleteAtoms: 167,
    partialContractAtoms: 78,
    noContractAtoms: 176,
    executors: 42,
    declaredStateContractExecutors: 23,
    missingStateContractExecutors: 19,
  });
});

check("empty_current_branch_uses_v2_atom_lineage_and_advances_to_initiative", () => {
  const historicalV2 = enumerateOfficialCleanupRefreshActionsV2(emptyCleanupState, {
    sideKey: "player1",
    matchBinding,
  })[0];
  const candidate = enumerateOfficialCleanupRefreshActionsV5(emptyCleanupState, {
    sideKey: "player1",
    matchBinding,
  })[0];
  assert.ok(historicalV2);
  assert.deepEqual(candidate.ruleAtomIds, historicalV2.ruleAtomIds);
  const applied = applyOfficialCleanupRefreshV5(
    emptyCleanupState,
    executableAction(candidate),
    { matchBinding },
  );
  assert.equal(applied.state.scoringCleanupProgress.currentStep, "determine_initiative");
  assert.equal(applied.state.cleanupRefreshHistory.at(-1).branch, "empty");
});

check("optical_flare_branch_uses_v3_lineage_and_removes_exact_status_and_marker", () => {
  const candidate = enumerateOfficialCleanupRefreshActionsV5(opticalCleanupState, {
    sideKey: "player1",
    matchBinding,
  })[0];
  assert.deepEqual(candidate.ruleAtomIds, [...OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ATOM_IDS]);
  const applied = applyOfficialCleanupRefreshV5(
    opticalCleanupState,
    executableAction(candidate),
    { matchBinding },
  );
  assert.ok(applied.state.pieces.every((piece) => piece.statuses.length === 0));
  assert.equal(applied.state.board.effectMarkers.length, 0);
  assert.equal(applied.events[0].removedStatusEffectHashes.length, 1);
});

check("stimpack_branch_uses_v5_lineage_removes_status_and_retains_damage", () => {
  const candidate = candidates(runtime, stimpackCleanupState, matchBinding).find((entry) => (
    entry.executorId === OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ID
  ));
  assert.ok(candidate);
  assert.deepEqual(candidate.ruleAtomIds, [...OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ATOM_IDS]);
  const applied = runtime.apply(
    stimpackCleanupState,
    executableAction(candidate),
    { matchBinding },
  );
  assert.ok(applied.state.pieces.every((piece) => piece.statuses.length === 0));
  assert.equal(applied.state.board.effectMarkers.length, 0);
  assert.equal(applied.state.pieces[0].damageMarker, 2);
  assert.deepEqual(applied.state.board.missionMarkers,
    stimpackCleanupState.board.missionMarkers);
  assert.deepEqual(applied.state.scores, stimpackCleanupState.scores);
});

const stateWithCards = clone(emptyCleanupState);
const profiles = gameplayDataBundle.cleanupCardBundle.profiles;
stateWithCards.cardResources.player1.push(cleanupCard(
  profiles[0],
  "player1-academy",
  "player1",
  "exhausted",
));
stateWithCards.cardResources.player2.push(cleanupCard(
  profiles[1],
  "player2-terran-armed-forces",
  "player2",
  "exhausted",
));

check("current_official_academy_and_terran_armed_forces_cards_refresh_exactly", () => {
  const candidate = enumerateOfficialCleanupRefreshActionsV5(stateWithCards, {
    sideKey: "player1",
    matchBinding,
  })[0];
  assert.equal(candidate.cleanupResolution.cardRefreshes.length, 2);
  const applied = applyOfficialCleanupRefreshV5(
    stateWithCards,
    executableAction(candidate),
    { matchBinding },
  );
  assert.ok(Object.values(applied.state.cardResources).flat().every((card) => (
    card.readiness === "ready" && card.face === "up"
  )));
});

const stateWithLedgers = clone(stateWithCards);
stateWithLedgers.reactionUsage = ledger(
  "starcraft_tmg_reaction_usage_ledger_v1",
  2,
  [{ activationKey: "a", sideKey: "player1" }],
);
stateWithLedgers.academyReactionUsage = ledger(
  "starcraft_tmg_academy_reaction_usage_ledger_v1",
  2,
  [{ cardId: "player1-academy" }],
);

check("activations_passes_and_both_round_ledgers_reset_while_actor_history_persists", () => {
  const candidate = enumerateOfficialCleanupRefreshActionsV5(stateWithLedgers, {
    sideKey: "player1",
    matchBinding,
  })[0];
  const applied = applyOfficialCleanupRefreshV5(
    stateWithLedgers,
    executableAction(candidate),
    { matchBinding },
  );
  assert.ok(applied.state.pieces.every((piece) => (
    Object.values(piece.activatedPhases).every((value) => value === false)
  )));
  assert.ok(Object.values(applied.state.players).every((player) => (
    Object.keys(player.passedPhases).length === 0
  )));
  assert.deepEqual(applied.state.firstPassSideByPhase, {});
  assert.equal("reactionUsage" in applied.state, false);
  assert.equal("academyReactionUsage" in applied.state, false);
  assert.deepEqual(applied.state.phaseFirstActorByRound,
    stateWithLedgers.phaseFirstActorByRound);
});

check("forged_lineage_diagnostic_and_details_are_rejected_by_exact_public_apply", () => {
  const candidate = enumerateOfficialCleanupRefreshActionsV5(emptyCleanupState, {
    sideKey: "player1",
    matchBinding,
  })[0];
  const action = executableAction(candidate);
  for (const forged of [
    { ...clone(action), ruleAtomIds: ["rule-atom:forged"] },
    { ...clone(action), callerDiagnostic: "forged" },
    { ...clone(action), details: { callerAuthored: true } },
  ]) {
    assert.throws(
      () => applyOfficialCleanupRefreshV5(emptyCleanupState, forged, { matchBinding }),
      /CLEANUP_REFRESH_V5_ACTION_MISMATCH/u,
    );
  }
});

check("wrong_seat_stale_progress_unknown_status_and_hidden_generic_marker_fail_closed", () => {
  assert.equal(enumerateOfficialCleanupRefreshActionsV5(emptyCleanupState, {
    sideKey: "player2",
    matchBinding,
  }).length, 0);
  const stale = clone(emptyCleanupState);
  stale.scoringCleanupProgress.currentStep = "determine_initiative";
  assert.equal(enumerateOfficialCleanupRefreshActionsV5(stale, {
    sideKey: "player1",
    matchBinding,
  }).length, 0);
  const unknown = clone(emptyCleanupState);
  unknown.pieces[0].statuses.push({ schema: "unknown_future_status_v1" });
  assert.equal(enumerateOfficialCleanupRefreshActionsV5(unknown, {
    sideKey: "player1",
    matchBinding,
  }).length, 0);
  const hidden = clone(emptyCleanupState);
  hidden.board.markers.push({ id: "unmodelled-marker" });
  assert.equal(enumerateOfficialCleanupRefreshActionsV5(hidden, {
    sideKey: "player1",
    matchBinding,
  }).length, 0);
});

check("relationship_query_reaches_judge_and_removed_invalidation_edge_breaks_audit", () => {
  const ids = OFFICIAL_CLEANUP_REFRESH_RELATIONSHIP_NODE_IDS_V1;
  const query = queryRuleRelationshipImpactV1(graph, {
    startNodeId: ids.officialGameplayDataBundle,
    targetNodeIds: [ids.staleProofTest],
    relationships: ["projects_to", "derives", "verified_by"],
    maxDepth: 5,
  });
  assert.deepEqual(query.reachedNodeIds, [ids.staleProofTest]);
  const requiredEdge = graph.coverageScopes
    .find((scope) => scope.executorId === OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ID)
    .requiredEdges.find((edge) => edge.relationship === "invalidates");
  const brokenBody = without(clone(graph), ["graphHash"]);
  brokenBody.edges = brokenBody.edges.filter((edge) => edge.edgeId !== requiredEdge.edgeId);
  const broken = { ...brokenBody, graphHash: hashStarcraftTmgContract(brokenBody) };
  assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
});

const refereeKeys = generateKeyPairSync("ed25519");
function authority(runtimeValue, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtimeValue,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      ...refereeKeys,
      keyId: "ticket-11-cleanup-v5-key",
      hmacSecret,
    },
  });
}

function createEnvelope(engine, roomId, state) {
  return engine.createEnvelope({
    roomId,
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
    state,
  });
}

const engine = authority(runtime, "ticket-11-cleanup-v5-hmac-v1");
const initialEnvelope = createEnvelope(
  engine,
  "official-existing-cleanup-refresh-contract-room",
  stimpackCleanupState,
);
const authorityApplied = applyFinite(
  engine,
  initialEnvelope,
  credentials(engine, initialEnvelope, "current"),
  OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ID,
  "cleanup-v5-apply",
);

check("authority_legal_preview_confirm_apply_uses_v5_v19_and_ed25519", () => {
  assert.equal(authorityApplied.legal.schemaVersion, "starcraft_tmg_authority_v2.legal-space");
  assert.equal(initialEnvelope.matchBinding.dependencies.actionSchema.contentHash,
    hashStarcraftTmgContract(ACTION_SCHEMA_CONTENT));
  assert.equal(authorityApplied.applied.receipt.action.executorId,
    OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ID);
  assert.deepEqual(authorityApplied.applied.receipt.action.ruleAtomIds,
    [...OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ATOM_IDS]);
  assert.equal(authorityApplied.applied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
  assert.equal(authorityApplied.applied.envelope.state.pieces[0].damageMarker, 2);
  assert.equal(authorityApplied.applied.envelope.state.scoringCleanupProgress.currentStep,
    "determine_initiative");
});

check("receipt_replays_after_hmac_rotation_and_tamper_fails_signature", () => {
  const replayEngine = authority(runtime, "ticket-11-cleanup-v5-hmac-rotated");
  registerReplayDependencies(
    replayEngine,
    initialEnvelope,
    runtime,
    liveReport.commandSnapshot,
    gameplayDataBundle,
  );
  const replayed = replayEngine.replay({
    initialEnvelope,
    journal: [authorityApplied.applied.receipt],
  });
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  assert.equal(replayed.envelope.stateHash, authorityApplied.applied.envelope.stateHash);
  const tampered = clone(authorityApplied.applied.receipt);
  tampered.events.push({ type: "forged_cleanup" });
  assert.equal(replayEngine.replay({ initialEnvelope, journal: [tampered] }).reason,
    "SIGNATURE_INVALID");
});

const executorSources = {
  v1: await readFile(path.join(ROOT,
    "packages/rule-atoms/official-cleanup-refresh-executor-v1.mjs")),
  v2: await readFile(path.join(ROOT,
    "packages/rule-atoms/official-cleanup-refresh-executor-v2.mjs")),
  v3: await readFile(path.join(ROOT,
    "packages/rule-atoms/official-optical-flare-lifecycle-executors-v1.mjs")),
  v4: await readFile(path.join(ROOT,
    "packages/rule-atoms/official-stimpack-lifecycle-executors-v1.mjs")),
  v5: await readFile(path.join(ROOT,
    "packages/rule-atoms/official-cleanup-refresh-executor-v5.mjs")),
};

check("frozen_v1_v2_v3_v4_sources_old_rules_display_and_current_data_rejection_hold", () => {
  assert.deepEqual(Object.fromEntries(Object.entries(executorSources).map(([key, value]) => (
    [key, contentHash(value)]
  ))), SOURCE_HASHES);
  assert.equal(previousRuntime.descriptor.runtimeHash, PREVIOUS_RUNTIME_HASH);
  const historicalCandidate = candidates(
    previousRuntime,
    stimpackCleanupState,
    previousMatchBinding,
    "player1",
    true,
  ).find((entry) => entry.executorId === OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ID);
  assert.equal(historicalCandidate.isEnabled, false);
  assert.equal(historicalCandidate.disabledReason,
    "STIMPACK_LIFECYCLE_LATEST_OFFICIAL_DATA_REQUIRED");
  assert.equal(historicalStimpackReport.acceptancePassed, 16);
  assert.equal(historicalStimpackReport.acceptanceTotal, 16);
  assert.equal(historicalStimpackReport.acceptance.includes(
    "ed25519_replay_survives_hmac_rotation_for_both_seats_and_rejects_tamper",
  ), true);
  assert.equal(previousSlice.historicalCompatibility.historicalRulesDisplayRetained, true);
  assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
  assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
  assert.equal(slice.catalogue.executorManifest.some((entry) => (
    entry.executorId === OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ID
  )), false);
});

const liveOfficial = {
  coreRules: await fetchOfficialBytes(OFFICIAL_URLS.coreRules, "coreRules"),
  versions: await fetchOfficialJson(OFFICIAL_URLS.versions, "versions"),
  part11: await fetchOfficialJson(OFFICIAL_URLS.part11, "part11"),
  academy: await fetchOfficialJson(OFFICIAL_URLS.academy, "academy"),
  terranArmedForces: await fetchOfficialJson(
    OFFICIAL_URLS.terranArmedForces,
    "terranArmedForces",
  ),
};

check("latest_official_core_part11_cards_and_71_69_48_data_are_live_current", () => {
  assert.equal(contentHash(liveOfficial.coreRules), CORE_RULES_HASH);
  assert.deepEqual(dataset.dataVersions, {
    cardsVersion: "69",
    rulesVersion: "48",
    unitsVersion: "71",
  });
  assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
  assert.equal(documentHash(liveOfficial.versions),
    previousReport.liveOfficialRevalidation.hashes.versions);
  assert.equal(documentHash(liveOfficial.part11), documentHash(localDocument(
    firestorePayloads.rules_sections,
    "/rules_sections/FuahgilWtc8nccVSp2Vv",
  )));
  assert.equal(documentHash(liveOfficial.academy), documentHash(localDocument(
    firestorePayloads.tactical_cards,
    "/tactical_cards/academy",
  )));
  assert.equal(documentHash(liveOfficial.terranArmedForces), documentHash(localDocument(
    firestorePayloads.tactical_cards,
    "/tactical_cards/terran_armed_forces",
  )));
});

check("ctx2skill_harness_dsh_memory_and_training_lanes_remain_closed", () => {
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
  assert.equal(JSON.stringify(slice).includes("dsh"), false);
});

const failures = acceptance.filter((entry) => !entry.passed);
const report = {
  schema: "starcraft_tmg_existing_cleanup_refresh_contract_closure_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  slice,
  sliceAudit,
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
  frozenExecutorSourceHashes: SOURCE_HASHES,
  liveOfficialRevalidation: {
    urls: OFFICIAL_URLS,
    hashes: {
      coreRules: contentHash(liveOfficial.coreRules),
      versions: documentHash(liveOfficial.versions),
      part11: documentHash(liveOfficial.part11),
      academy: documentHash(liveOfficial.academy),
      terranArmedForces: documentHash(liveOfficial.terranArmedForces),
    },
    dataVersions: dataset.dataVersions,
    repositoryFallbackUsed: gameplayDataBundle.repositoryFallbackAllowed,
  },
  authorityFixture: {
    actionSchemaVersion: ACTION_SCHEMA_CONTENT.schemaVersion,
    executorId: authorityApplied.applied.receipt.action.executorId,
    refereeSignatureAlgorithm:
      authorityApplied.applied.receipt.refereeSignature.signatureAlgorithm,
    replayStateHash: authorityApplied.applied.envelope.stateHash,
  },
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
    skillsRead: [],
    skillsGenerated: [],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult: failures.length === 0
      ? "cleanup_v5_three_branch_authority_replay_passed_with_v1_v2_v3_v4_frozen"
      : "blocked",
    promotions: [],
    blocks: failures.map((entry) => entry.id),
    remainingRuleGaps: 491,
  },
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: ["referee_prompt", "opponent_prompt", "selfplay_agent_prompt"],
    harnessToolsCalled: [
      "read_board_state",
      "list_legal_actions",
      "preview_action",
      "apply_action_after_user_confirmation",
      "replay_room",
    ],
    uiTraceEvidence: "authority_cleanup_trace_only_browser_and_device_ui_pending",
    agentDecisionEvidence: "exact_empty_optical_and_stimpack_cleanup_branch_selection",
    memoryTraceEvidence: { refs: [], promotionAttempted: false },
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: slice.harness.rollbackOrDemotionRules,
    userVisibleChecks: slice.harness.userVisibleChecks,
  },
  rulesTruth: "cleanup_refresh_v2_v3_v5_contracts_exact",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-existing-cleanup-refresh-contract-closure-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

if (failures.length > 0) {
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    schema: report.schema,
    acceptancePassed: report.acceptancePassed,
    acceptanceTotal: report.acceptanceTotal,
    sliceHash: slice.sliceHash,
    catalogueHash: slice.catalogueHash,
    runtimeHash: runtime.descriptor.runtimeHash,
    graphHash: graph.graphHash,
    coverage: coverage.counts,
    actionSchemaVersion: report.authorityFixture.actionSchemaVersion,
    rulesTruth: report.rulesTruth,
    trainingTruth: false,
  }, null, 2));
}
