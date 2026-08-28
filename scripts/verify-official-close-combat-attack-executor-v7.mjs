#!/usr/bin/env node

import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1 } from
  "../content/official-command-center-faction-delta-2026-08-25-v1.mjs";
import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_26_V1 } from
  "../content/official-command-center-faction-delta-2026-08-26-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  applyOfficialCloseCombatAttackV7,
  enumerateOfficialCloseCombatAttackV7,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID,
  OFFICIAL_DECLARE_FIGHT_ACTION_TYPE,
  OFFICIAL_PASS_REACTION_ACTION_TYPE,
  OFFICIAL_RESOLVE_FIGHT_ACTION_TYPE,
  OFFICIAL_USE_REACTION_ACTION_TYPE,
} from "../packages/rule-atoms/official-close-combat-attack-executor-v7.mjs";
import {
  createOfficialCloseCombatAttackRuleSliceV7,
  verifyOfficialCloseCombatAttackRuleSliceV7,
} from "../packages/rule-atoms/official-close-combat-attack-rule-slice-v7.mjs";
import { OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_ID } from
  "../packages/rule-atoms/official-cleanup-refresh-executor-v2.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { OFFICIAL_POWER_FIELD_SOURCE_RECORD_HASH } from
  "../packages/rule-atoms/official-dodge-resolution-kernel-v1.mjs";
import { createOfficialSupplyLossLedgerV1 } from
  "../packages/rule-atoms/official-supply-loss-ledger-v1.mjs";
import { createOfficialCommandCenterDataset } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { applyOfficialCommandCenterFirestoreDelta } from
  "../packages/source-data/official-command-center-snapshot-delta-v1.mjs";
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
const OCCURRED_AT = "2026-08-26T00:00:00.000Z";

const previousReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-close-combat-attack-rule-slice-v6-report.json"),
  "utf8",
));
const driftReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-command-center-community-drift-v2-report.json"),
  "utf8",
));
const basePayloads = Object.fromEntries(await Promise.all([
  "army_units",
  "faction_cards",
  "rules_sections",
  "tactical_cards",
].map(async (collectionId) => [
  collectionId,
  JSON.parse(await readFile(path.join(FIRESTORE_DIR, `${collectionId}.json`), "utf8")),
])));
const firstFactionApplication = applyOfficialCommandCenterFirestoreDelta({
  basePayload: basePayloads.faction_cards,
  delta: OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1,
});
const secondFactionApplication = applyOfficialCommandCenterFirestoreDelta({
  basePayload: firstFactionApplication.firestorePayload,
  delta: OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_26_V1,
});
const snapshot = driftReport.currentOfficialSnapshot.snapshot;
const dataset = createOfficialCommandCenterDataset({
  snapshot,
  firestorePayloads: {
    ...basePayloads,
    faction_cards: secondFactionApplication.firestorePayload,
  },
});
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot,
  dataset,
  missionRecordKey: "faction_cards:mission_hold_position",
  unitRecordKeys: ["army_units:kerrigan", "army_units:marine"],
  attackProfileData: true,
});
const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
const slice = createOfficialCloseCombatAttackRuleSliceV7({
  previousSlice: previousReport.slice,
});
const sliceAudit = verifyOfficialCloseCombatAttackRuleSliceV7({
  previousSlice: previousReport.slice,
  slice,
});
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const supplyLossLedger = createOfficialSupplyLossLedgerV1({
  round: 1,
  rulesRuntimeHash: historicalRuntime.descriptor.runtimeHash,
});
const matchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: historicalRuntime.descriptor.runtimeHash },
};

function model(id, xInches, baseDiameterInches) {
  return {
    id,
    xInches,
    yInches: 10,
    baseShape: "round",
    baseWidthInches: baseDiameterInches,
    baseDepthInches: baseDiameterInches,
    elevation: "ground",
    supportTerrainIds: [],
    adjacentAccessPointIds: [],
    isDestroyed: false,
    isOnField: true,
  };
}

function piece(input) {
  const profile = gameplayDataBundle.combatProfileBundle
    .profilesByRecordKey[input.recordKey];
  return {
    id: input.id,
    sideKey: input.sideKey,
    name: profile.unitName,
    officialUnitRecordKey: input.recordKey,
    sourceRecordHash: profile.sourceRecordHash,
    formationSize: "small",
    selectedUpgradeNames: [],
    combatTag: "ground",
    currentModels: 1,
    maxModels: 1,
    currentSupply: input.currentSupply,
    damageMarker: 0,
    statuses: [],
    combatEffects: [],
    assaultEffects: [],
    isOnField: true,
    isDestroyed: false,
    models: [model(input.modelId, input.xInches, input.baseDiameterInches)],
    activatedPhases: { movement: true, assault: true, combat: false },
  };
}

function powerField(readiness = "ready", face = readiness === "ready" ? "up" : "down") {
  return {
    id: "p2-power-field",
    sideKey: "player2",
    cardKind: "tactical",
    officialCardRecordKey: "tactical_cards:power_field",
    sourceRecordHash: OFFICIAL_POWER_FIELD_SOURCE_RECORD_HASH,
    readiness,
    face,
    activeEffects: [],
  };
}

function state(input = {}) {
  const round = Number(input.round || 1);
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round,
    phase: "combat",
    activeSideKey: "player1",
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: {},
    phaseFirstActorByRound: {
      [`${round}:combat`]: {
        round,
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
    officialGameplayDataBundle: gameplayDataBundle,
    supplyLossLedger: structuredClone(input.supplyLossLedger || supplyLossLedger),
    board: {
      widthInches: 54,
      heightInches: 36,
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
    cardResources: {
      player1: [],
      player2: input.card === null ? [] : [input.card || powerField()],
    },
    pieces: [
      piece({
        id: "p1-kerrigan",
        modelId: "p1-kerrigan-model",
        sideKey: "player1",
        recordKey: "army_units:kerrigan",
        currentSupply: 1,
        xInches: 10,
        baseDiameterInches: 1.575,
      }),
      piece({
        id: "p2-marine",
        modelId: "p2-marine-model",
        sideKey: "player2",
        recordKey: "army_units:marine",
        currentSupply: 0,
        xInches: 11.8,
        baseDiameterInches: 1.26,
      }),
    ],
    log: [],
  };
}

function action(candidate) {
  const {
    isEnabled: _isEnabled,
    disabledReason: _disabledReason,
    score: _score,
    details: _details,
    ...result
  } = candidate;
  return result;
}

function candidateFor(current, sideKey, actionType) {
  return enumerateOfficialCloseCombatAttackV7(current, {
    sideKey,
    matchBinding,
  }).candidates.find((candidate) => candidate.actionType === actionType);
}

function engineWithKeys(refereeKeys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: { ...refereeKeys, hmacSecret },
  });
}

function seatCredentials(engine, envelope, sideKey, suffix) {
  const authority = engine.issueSeatAuthority({
    grantId: `${envelope.roomId}-${sideKey}-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `${envelope.roomId}-${sideKey}-${suffix}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

function applyFinite(engine, envelope, sideKey, actionType, suffix) {
  const credentials = seatCredentials(engine, envelope, sideKey, suffix);
  const legal = engine.legalSpace(envelope, { seatAuthority: credentials.authority });
  const finite = legal.finiteActions.find((entry) => entry.action.actionType === actionType);
  assert.ok(finite, `${actionType} missing: ${JSON.stringify(legal.disabledDiagnostics)}`);
  const preview = engine.preview({
    envelope,
    seatAuthority: credentials.authority,
    proposal: { kind: "finite", actionKey: finite.actionKey },
  });
  assert.equal(preview.ok, true, JSON.stringify(preview));
  const confirmed = engine.confirmPreview({
    envelope,
    preview: preview.preview,
    seatAuthority: credentials.authority,
  });
  assert.equal(confirmed.ok, true, JSON.stringify(confirmed));
  const applied = engine.apply({
    envelope,
    expectedStateRevision: envelope.stateRevision,
    preview: preview.preview,
    confirmation: confirmed.confirmation,
    seatAuthority: credentials.authority,
    controlLease: credentials.lease,
    idempotencyKey: `${envelope.roomId}-${suffix}`,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return { credentials, legal, finite, preview, confirmed, applied };
}

function registerReplayDependencies(engine, initial) {
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
    ["actionSchema", {
      kind: "action-schema",
      schemaVersion: "hybrid_legal_space_v1",
    }],
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

function declareWithHits(current, rolls = [4, 4, 1, 1, 1, 1]) {
  const declaration = candidateFor(current, "player1", OFFICIAL_DECLARE_FIGHT_ACTION_TYPE);
  assert.ok(declaration);
  return applyOfficialCloseCombatAttackV7(current, action(declaration), {
    matchBinding,
    postRevision: 1,
    chanceReveals: rolls,
  });
}

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

check("slice_promotes_twenty_atoms_and_preserves_slice_28", () => {
  assert.equal(sliceAudit.counts.executableRuleAtoms, 326);
  assert.equal(sliceAudit.counts.newlyExecutableRuleAtoms, 20);
  assert.equal(sliceAudit.counts.reviewRequiredRuleAtoms, 586);
  assert.equal(sliceAudit.counts.displayOnlyRuleAtoms, 114);
  assert.equal(sliceAudit.counts.changedNonTargetAtoms, 0);
  assert.equal(slice.effectKernel.executableEffectAtomIds.length, 8);
  assert.equal(slice.effectKernel.knownUnimplementedEffectAtoms, 5);
  assert.equal(
    historicalRuntime.descriptor.runtimeHash,
    "ee255eee5aa16cdccb2ef2ce3ea3b49ae190862419e76a061e0824e7c3405eb6",
  );
});

check("latest_data_and_ready_power_field_stage_the_attack", () => {
  assert.equal(snapshot.snapshotHash,
    "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78");
  assert.equal(dataset.datasetHash,
    "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a");
  const declaration = candidateFor(state(), "player1", OFFICIAL_DECLARE_FIGHT_ACTION_TYPE);
  assert.equal(declaration.executorId, OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID);
  assert.deepEqual(declaration.chance.layout, { hit: 6, armour: 0, evade: 0, surge: 0 });
});

check("guardian_shell_exhausts_power_field_and_dodge_cancels_two_transfers", () => {
  const declared = declareWithHits(state());
  assert.equal(declared.state.pendingAttack.stage, "reaction_open");
  assert.deepEqual(
    enumerateOfficialCloseCombatAttackV7(declared.state, {
      sideKey: "player1",
      matchBinding,
    }).candidates,
    [],
  );
  const use = candidateFor(declared.state, "player2", OFFICIAL_USE_REACTION_ACTION_TYPE);
  const reacted = applyOfficialCloseCombatAttackV7(declared.state, action(use), {
    matchBinding,
    postRevision: 2,
  });
  assert.equal(reacted.state.cardResources.player2[0].readiness, "exhausted");
  assert.equal(reacted.state.cardResources.player2[0].face, "down");
  const resolve = candidateFor(
    reacted.state,
    "player1",
    OFFICIAL_RESOLVE_FIGHT_ACTION_TYPE,
  );
  const completed = applyOfficialCloseCombatAttackV7(reacted.state, action(resolve), {
    matchBinding,
    postRevision: 3,
    chanceReveals: [6, 6, 1, 1, 1, 1],
  });
  const event = completed.events.find((entry) => entry.type === "close_combat_attack");
  assert.equal(event.criticalHit.transferDiceBeforeDodge, 2);
  assert.equal(event.criticalHit.dodgeReductionApplied, 2);
  assert.equal(event.criticalHit.bypassedArmourDice, 0);
  assert.equal(event.armourPool.dice, 2);
  assert.equal(event.armourPool.saves, 2);
  assert.equal(event.damagePool.totalDamage, 0);
  assert.equal(completed.state.pieces[1].isDestroyed, false);
  assert.equal("pendingAttack" in completed.state, false);
});

check("pass_keeps_critical_hit_and_destroys_the_marine", () => {
  const declared = declareWithHits(state());
  const pass = candidateFor(declared.state, "player2", OFFICIAL_PASS_REACTION_ACTION_TYPE);
  const passed = applyOfficialCloseCombatAttackV7(declared.state, action(pass), {
    matchBinding,
    postRevision: 2,
  });
  const resolve = candidateFor(passed.state, "player1", OFFICIAL_RESOLVE_FIGHT_ACTION_TYPE);
  const completed = applyOfficialCloseCombatAttackV7(passed.state, action(resolve), {
    matchBinding,
    postRevision: 3,
    chanceReveals: [6, 6, 6, 6, 6, 6],
  });
  const event = completed.events.find((entry) => entry.type === "close_combat_attack");
  assert.equal(event.criticalHit.bypassedArmourDice, 2);
  assert.equal(event.damagePool.totalDamage, 4);
  assert.equal(completed.state.pieces[1].isDestroyed, true);
});

check("no_hits_open_no_reaction_and_leave_the_card_ready", () => {
  const completed = declareWithHits(state(), [1, 1, 1, 1, 1, 1]);
  assert.equal("pendingAttack" in completed.state, false);
  assert.equal(completed.state.cardResources.player2[0].readiness, "ready");
  assert.equal(completed.state.activeSideKey, "player2");
  assert.equal(completed.events.at(-1).reaction.offered, false);
});

check("unavailable_reaction_delegates_to_frozen_v6_attack", () => {
  for (const current of [state({ card: null }), state({ card: powerField("exhausted") })]) {
    const candidates = enumerateOfficialCloseCombatAttackV7(current, {
      sideKey: "player1",
      matchBinding,
    }).candidates;
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].actionType, "fight");
    assert.equal(candidates[0].details.executorPath, "historical_v6_delegate");
  }
});

check("malformed_card_and_nonlatest_binding_fail_closed", () => {
  const malformed = state({ card: powerField("ready", "down") });
  assert.deepEqual(enumerateOfficialCloseCombatAttackV7(malformed, {
    sideKey: "player1",
    matchBinding,
  }).candidates, []);
  const disabled = enumerateOfficialCloseCombatAttackV7(malformed, {
    sideKey: "player1",
    matchBinding,
    includeDisabled: true,
  }).candidates[0];
  assert.equal(disabled.isEnabled, false);
  assert.equal(disabled.disabledReason, "GUARDIAN_SHELL_CARD_STATE_INVALID");

  const oldBundle = structuredClone(gameplayDataBundle);
  oldBundle.sourceSnapshotHash = "243ecbae04073569ccd9b0cb091ab72ac566da5b0ff0fc81a25a84baee70571c";
  const oldState = state();
  oldState.officialGameplayDataBundle = oldBundle;
  assert.deepEqual(enumerateOfficialCloseCombatAttackV7(oldState, {
    sideKey: "player1",
    matchBinding: {
      ...matchBinding,
      dataSnapshotHash: hashStarcraftTmgContract(oldBundle),
    },
  }).candidates, []);
});

check("reaction_action_is_stale_after_the_window_advances", () => {
  const declared = declareWithHits(state());
  const use = action(candidateFor(declared.state, "player2", OFFICIAL_USE_REACTION_ACTION_TYPE));
  const reacted = applyOfficialCloseCombatAttackV7(declared.state, use, {
    matchBinding,
    postRevision: 2,
  });
  assert.throws(() => applyOfficialCloseCombatAttackV7(reacted.state, use, {
    matchBinding,
    postRevision: 3,
  }), /CLOSE_COMBAT_ATTACK_V7_ACTION_STALE/);
});

check("runtime_exposes_only_the_current_owner_during_the_pending_window", () => {
  const runtimeLedger = createOfficialSupplyLossLedgerV1({
    round: 1,
    rulesRuntimeHash: runtime.descriptor.runtimeHash,
  });
  const runtimeBinding = {
    dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
    rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
  };
  const before = state({ supplyLossLedger: runtimeLedger });
  const declaration = runtime.enumerate(before, {
    sideKey: "player1",
    matchBinding: runtimeBinding,
  }).candidates.find((candidate) => candidate.actionType === OFFICIAL_DECLARE_FIGHT_ACTION_TYPE);
  const declared = runtime.apply(before, action(declaration), {
    matchBinding: runtimeBinding,
    postRevision: 1,
    chanceReveals: [4, 4, 1, 1, 1, 1],
  });
  assert.deepEqual(runtime.enumerate(declared.state, {
    sideKey: "player1",
    matchBinding: runtimeBinding,
  }).candidates, []);
  assert.deepEqual(runtime.enumerate(declared.state, {
    sideKey: "player2",
    matchBinding: runtimeBinding,
  }).candidates.map((candidate) => candidate.actionType), [
    OFFICIAL_PASS_REACTION_ACTION_TYPE,
    OFFICIAL_USE_REACTION_ACTION_TYPE,
  ]);
  assert.equal(runtime.descriptor.executableRuleAtomCount, 326);
  assert.equal(runtime.descriptor.productionRoomEligible, false);
});

check("power_field_runs_ready_exhausted_cleanup_ready_in_one_state_lineage", () => {
  const runtimeLedger = createOfficialSupplyLossLedgerV1({
    round: 2,
    rulesRuntimeHash: runtime.descriptor.runtimeHash,
  });
  const runtimeBinding = {
    dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
    rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
  };
  const before = state({ round: 2, supplyLossLedger: runtimeLedger });
  const declaration = enumerateOfficialCloseCombatAttackV7(before, {
    sideKey: "player1",
    matchBinding: runtimeBinding,
  }).candidates.find((candidate) => candidate.actionType === OFFICIAL_DECLARE_FIGHT_ACTION_TYPE);
  const declared = applyOfficialCloseCombatAttackV7(before, action(declaration), {
    matchBinding: runtimeBinding,
    postRevision: 1,
    chanceReveals: [4, 4, 1, 1, 1, 1],
  });
  const use = enumerateOfficialCloseCombatAttackV7(declared.state, {
    sideKey: "player2",
    matchBinding: runtimeBinding,
  }).candidates.find((candidate) => candidate.actionType === OFFICIAL_USE_REACTION_ACTION_TYPE);
  const reacted = applyOfficialCloseCombatAttackV7(declared.state, action(use), {
    matchBinding: runtimeBinding,
    postRevision: 2,
  });
  const resolve = enumerateOfficialCloseCombatAttackV7(reacted.state, {
    sideKey: "player1",
    matchBinding: runtimeBinding,
  }).candidates.find((candidate) => candidate.actionType === OFFICIAL_RESOLVE_FIGHT_ACTION_TYPE);
  const completed = applyOfficialCloseCombatAttackV7(reacted.state, action(resolve), {
    matchBinding: runtimeBinding,
    postRevision: 3,
    chanceReveals: [6, 6, 1, 1, 1, 1],
  });
  assert.equal(completed.state.cardResources.player2[0].readiness, "exhausted");

  const cleanupState = structuredClone(completed.state);
  cleanupState.phase = "cleanup";
  cleanupState.activeSideKey = null;
  cleanupState.firstPlayerSideKey = "player1";
  cleanupState.players.player1.passedPhases = { combat: true };
  cleanupState.players.player2.passedPhases = { combat: true };
  cleanupState.firstPassSideByPhase = { combat: "player1" };
  cleanupState.board.missionMarkers = [];
  cleanupState.board.tokens = [];
  cleanupState.board.markers = [];
  cleanupState.officialMissionSetupBinding = createOfficialMissionSetupBindingV1({
    gameplayDataBundle,
    missionDraftReceiptHash: hashStarcraftTmgContract({ kind: "mission-draft" }),
    deploymentDraftReceiptHash: hashStarcraftTmgContract({ kind: "deployment-draft" }),
    seatColorAssignment: { player1: "red", player2: "blue" },
  });
  const proofHash = "d".repeat(64);
  cleanupState.scoringCleanupProgress = {
    schemaVersion: "starcraft_tmg_scoring_cleanup_progress_v1",
    round: 2,
    currentStep: "cleanup_and_refresh",
    completedSteps: [
      "determine_mission_marker_control",
      "score_victory_points",
      "check_end_game_conditions",
      "resolve_end_of_round_effects",
    ],
    controlResolutionHash: "a".repeat(64),
    scoringResolutionHash: "b".repeat(64),
    endGameResolutionHash: "c".repeat(64),
    effectQueueProofHash: proofHash,
    trainingTruth: false,
  };
  cleanupState.endOfRoundEffectHistory = [{
    schema: "starcraft_tmg_official_end_of_round_effect_history_entry_v2",
    round: 2,
    effectQueueProofHash: proofHash,
    effectCount: 0,
    queueComplete: true,
    trainingTruth: false,
  }];
  const cleanup = runtime.enumerate(cleanupState, {
    sideKey: "player1",
    matchBinding: runtimeBinding,
  }).candidates.find((candidate) => candidate.actionType === "cleanup_and_refresh");
  assert.equal(cleanup.executorId, OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_ID);
  assert.equal(cleanup.cleanupResolution.cardRefreshes[0].beforeReadiness, "exhausted");
  const refreshed = runtime.apply(cleanupState, action(cleanup), {
    matchBinding: runtimeBinding,
    postRevision: 4,
  });
  assert.equal(refreshed.state.cardResources.player2[0].readiness, "ready");
  assert.equal(refreshed.state.cardResources.player2[0].face, "up");
  assert.equal("reactionUsage" in refreshed.state, false);
  assert.ok(refreshed.state.pieces.every((piece) => (
    Object.values(piece.activatedPhases).every((activated) => activated === false)
  )));
  assert.equal(refreshed.state.scoringCleanupProgress.currentStep, "determine_initiative");
});

check("authority_three_stage_two_seat_apply_and_replay_is_exact", () => {
  const runtimeLedger = createOfficialSupplyLossLedgerV1({
    round: 1,
    rulesRuntimeHash: runtime.descriptor.runtimeHash,
  });
  const refereeKeys = generateKeyPairSync("ed25519");
  const engine = engineWithKeys(refereeKeys, "ticket-11-guardian-shell-short-seal-v1");
  const initial = engine.createEnvelope({
    roomId: "official-guardian-shell-authority-room",
    matchId: "official-guardian-shell-authority-match-v1",
    dataVersion:
      `${dataset.dataVersions.unitsVersion}/${dataset.dataVersions.cardsVersion}/${dataset.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: {
        artifactId: "official-command-center-snapshot-2026-08-26",
        content: snapshot,
      },
      dataSnapshot: {
        artifactId: "official-guardian-shell-gameplay-data-bundle",
        content: gameplayDataBundle,
      },
    },
    state: state({ supplyLossLedger: runtimeLedger }),
  });
  registerReplayDependencies(engine, initial);
  const declared = applyFinite(
    engine,
    initial,
    "player1",
    OFFICIAL_DECLARE_FIGHT_ACTION_TYPE,
    "declare",
  );
  assert.equal(declared.preview.preview.core.chanceTicket.tickets.length, 6);
  assert.equal(declared.applied.receipt.action.executorId,
    OFFICIAL_CLOSE_COMBAT_ATTACK_V7_EXECUTOR_ID);
  assert.ok(declared.applied.envelope.state.pendingAttack, JSON.stringify(declared.applied.receipt));

  const attackerDuringReaction = seatCredentials(
    engine,
    declared.applied.envelope,
    "player1",
    "attacker-during-reaction",
  );
  assert.equal(engine.legalSpace(declared.applied.envelope, {
    seatAuthority: attackerDuringReaction.authority,
  }).finiteActions.length, 0);

  const reacted = applyFinite(
    engine,
    declared.applied.envelope,
    "player2",
    OFFICIAL_USE_REACTION_ACTION_TYPE,
    "react",
  );
  assert.equal(reacted.preview.preview.core.chanceTicket, null);
  assert.equal(reacted.applied.envelope.state.cardResources.player2[0].readiness,
    "exhausted");

  const defenderAfterReaction = seatCredentials(
    engine,
    reacted.applied.envelope,
    "player2",
    "defender-after-reaction",
  );
  assert.equal(engine.legalSpace(reacted.applied.envelope, {
    seatAuthority: defenderAfterReaction.authority,
  }).finiteActions.length, 0);

  const resolved = applyFinite(
    engine,
    reacted.applied.envelope,
    "player1",
    OFFICIAL_RESOLVE_FIGHT_ACTION_TYPE,
    "resolve",
  );
  assert.equal(resolved.preview.preview.core.chanceTicket.tickets.length, 6);
  assert.equal("pendingAttack" in resolved.applied.envelope.state, false);
  assert.equal(resolved.applied.receipt.eligibleForTraining, false);
  assert.equal(resolved.applied.receipt.refereeSignature.signatureAlgorithm, "ed25519");

  const replayEngine = engineWithKeys(
    refereeKeys,
    "ticket-11-guardian-shell-rotated-short-seal-v2",
  );
  registerReplayDependencies(replayEngine, initial);
  const journal = [
    declared.applied.receipt,
    reacted.applied.receipt,
    resolved.applied.receipt,
  ];
  const replay = replayEngine.replay({ initialEnvelope: initial, journal });
  assert.equal(replay.ok, true, JSON.stringify(replay));
  assert.equal(replay.envelope.stateHash, resolved.applied.envelope.stateHash);

  const tampered = structuredClone(journal);
  tampered[1].events[0].dodgeReduction = 99;
  const rejected = replayEngine.replay({ initialEnvelope: initial, journal: tampered });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, "SIGNATURE_INVALID");
});

const failures = acceptance.filter((entry) => !entry.passed);
const report = {
  schema: "starcraft_tmg_official_close_combat_attack_rule_slice_v7_report",
  generatedAt: new Date().toISOString(),
  verifier: "official-close-combat-attack-rule-slice-v7",
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  slice,
  audit: sliceAudit,
  sliceAudit,
  runtime: runtime.descriptor,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  latestOfficialData: {
    sourceSnapshotHash: snapshot.snapshotHash,
    datasetHash: dataset.datasetHash,
    dataVersions: dataset.dataVersions,
  },
  rulesEligible: false,
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-close-combat-attack-rule-slice-v7-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  verifier: report.verifier,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash,
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
  executableRuleAtoms: sliceAudit.counts.executableRuleAtoms,
  reviewRequiredRuleAtoms: sliceAudit.counts.reviewRequiredRuleAtoms,
  displayOnlyRuleAtoms: sliceAudit.counts.displayOnlyRuleAtoms,
  failures,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
