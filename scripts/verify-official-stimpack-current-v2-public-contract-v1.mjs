#!/usr/bin/env node

import assert from "node:assert/strict";

import {
  applyOfficialMarineStimpackActiveV3,
  enumerateOfficialMarineStimpackActiveV3,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_EXECUTOR_ID,
} from "../packages/rule-atoms/official-marine-stimpack-active-executor-v3.mjs";
import {
  applyOfficialStimpackRangedConsumerV2,
  enumerateOfficialStimpackRangedConsumerV2,
  OFFICIAL_RESOLVE_STIMPACK_PRECISION_ACTION_TYPE,
  OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_ID,
} from "../packages/rule-atoms/official-stimpack-ranged-consumer-executor-v2.mjs";
import * as fixture from "./verify-official-medic-medpack-v2-public-contract-v1.mjs";

export const { gameplayDataBundle } = fixture;
export const matchBinding = {
  ...fixture.matchBinding,
  rulesRuntimeBinding: { runtimeHash: "9".repeat(64) },
};

function action(candidate) {
  return Object.fromEntries(Object.entries(candidate).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}

export function movementState() {
  const state = structuredClone(fixture.state);
  state.phase = "movement";
  state.activeSideKey = "player1";
  state.players.player1.passedPhases = {};
  state.players.player2.passedPhases = {};
  const source = fixture.unit({ id: "p1-marine", recordKey: "army_units:marine",
    modelCount: 1, selectedUpgradeNames: ["Stimpack"], xInches: 5 });
  const target = fixture.unit({ id: "p2-marine", recordKey: "army_units:marine",
    modelCount: 1, selectedUpgradeNames: [], xInches: 15 });
  target.sideKey = "player2";
  target.models[0].yInches = 5;
  state.pieces = [source, target];
  state.cardResources.player1[0].readiness = "ready";
  state.cardResources.player1[0].face = "up";
  state.activeAbilityUseHistory = [];
  state.board.missionMarkers = [];
  state.board.effectMarkers = [];
  state.board.engagementGeometry = {
    schemaVersion: "starcraft_tmg_engagement_geometry_input_v2",
    modelCoordinatesComplete: true,
    baseFootprintsComplete: true,
    terrainFootprintsComplete: true,
    elevationSupportsComplete: true,
    accessPointAdjacencyComplete: true,
  };
  state.log = [];
  return state;
}

export function stimpackedState() {
  const state = movementState();
  const candidates = enumerateOfficialMarineStimpackActiveV3(state, {
    sideKey: "player1", matchBinding, throwOnError: true,
  });
  assert.equal(candidates.length, 2);
  assert.equal(candidates.every((entry) => (
    entry.executorId === OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_EXECUTOR_ID
      && entry.dataAdapterReceiptHash.length === 64
  )), true);
  const before = candidates.find((entry) => entry.abilityWindow === "before_action");
  const applied = applyOfficialMarineStimpackActiveV3(
    state,
    action(before),
    { matchBinding, postRevision: 1 },
  );
  assert.equal(applied.state.pieces[0].damageMarker, 2);
  assert.equal(applied.state.pieces[0].isDestroyed, false);
  assert.equal(applied.state.officialGameplayDataBundle.gameplayDataBundleHash,
    gameplayDataBundle.gameplayDataBundleHash);
  return applied.state;
}

export function precisionState() {
  const state = stimpackedState();
  state.phase = "assault";
  state.activeSideKey = "player1";
  state.pieces.forEach((piece) => { piece.activatedPhases.assault = false; });
  state.pieces[0].models[0].xInches = 5;
  state.pieces[1].models[0].xInches = 15;
  state.log = [];
  return state;
}

const precision = precisionState();
const ranged = enumerateOfficialStimpackRangedConsumerV2(precision, {
  sideKey: "player1", matchBinding, throwOnError: true,
});
assert.equal(ranged.length, 1);
assert.equal(ranged[0].executorId, OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_ID);
assert.equal(ranged[0].resolutionMode, "precision_pending_choice");
const opened = applyOfficialStimpackRangedConsumerV2(
  precision,
  action(ranged[0]),
  { matchBinding, postRevision: 2,
    chanceReveals: Array.from({ length: ranged[0].chance.count }, () => 1) },
);
assert.ok(opened.state.pendingAction);
assert.equal(opened.state.officialGameplayDataBundle.gameplayDataBundleHash,
  gameplayDataBundle.gameplayDataBundleHash);
const choices = enumerateOfficialStimpackRangedConsumerV2(opened.state, {
  sideKey: "player1", matchBinding, throwOnError: true,
});
assert.ok(choices.length > 1);
assert.equal(choices.every((entry) => (
  entry.actionType === OFFICIAL_RESOLVE_STIMPACK_PRECISION_ACTION_TYPE
    && entry.executorId === OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_ID
)), true);
const chosen = choices.at(-1);
const resolved = applyOfficialStimpackRangedConsumerV2(
  opened.state,
  action(chosen),
  { matchBinding, postRevision: 3 },
);
assert.equal(resolved.state.pendingAction, undefined);
assert.equal(resolved.state.officialGameplayDataBundle.gameplayDataBundleHash,
  gameplayDataBundle.gameplayDataBundleHash);

const later = stimpackedState();
later.phase = "assault";
later.activeSideKey = "player2";
later.pieces.forEach((piece) => { piece.activatedPhases.assault = false; });
later.pieces[0].models[0].xInches = 5;
later.pieces[1].models[0].xInches = 15;
later.log = [];
const standard = enumerateOfficialStimpackRangedConsumerV2(later, {
  sideKey: "player2", matchBinding, throwOnError: true,
});
assert.equal(standard.length, 1);
assert.equal(standard[0].resolutionMode, "later_standard_damage");
const damaged = applyOfficialStimpackRangedConsumerV2(
  later,
  action(standard[0]),
  { matchBinding, postRevision: 4,
    chanceReveals: Array.from({ length: standard[0].chance.count }, () => 6) },
);
assert.equal(damaged.state.pieces[0].isDestroyed, true);
assert.equal(damaged.state.officialGameplayDataBundle.gameplayDataBundleHash,
  gameplayDataBundle.gameplayDataBundleHash);

const stale = structuredClone(action(ranged[0]));
stale.dataAdapterReceiptHash = "0".repeat(64);
assert.throws(() => applyOfficialStimpackRangedConsumerV2(
  precision, stale, { matchBinding },
), /STIMPACK_RANGED_V2_ACTION_STALE/u);

console.log(JSON.stringify({
  schema: "starcraft_tmg_official_stimpack_current_v2_public_contract_v1",
  assertions: 20,
  latestOfficialBundleHash: gameplayDataBundle.gameplayDataBundleHash,
  activeCandidateCount: 2,
  precisionChoiceCount: choices.length,
  laterStandardDamageVerified: true,
  repositoryFallbackUsed: false,
  silentCompatibilityUsed: false,
  trainingTruth: false,
}, null, 2));
