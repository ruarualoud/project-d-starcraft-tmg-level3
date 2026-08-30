#!/usr/bin/env node

import assert from "node:assert/strict";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  applyOfficialSpecialistLoadoutV2,
  enumerateOfficialSpecialistLoadoutV2,
  instantiateOfficialSpecialistLoadoutV2,
  OFFICIAL_SPECIALIST_LOADOUT_PARAMETER_KIND,
} from "../packages/rule-atoms/official-specialist-loadout-executor-v2.mjs";
import {
  applyOfficialSpecialistRangedBatchV2,
  enumerateOfficialSpecialistRangedBatchV2,
  OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_ID,
} from "../packages/rule-atoms/official-specialist-ranged-batch-executor-v2.mjs";
import {
  battleState as goliathBattleState,
  gameplayDataBundle,
  matchBinding,
} from "./verify-official-goliath-scatter-v2-public-contract-v1.mjs";

export { gameplayDataBundle, matchBinding };

function action(candidate) {
  return Object.fromEntries(Object.entries(candidate).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}

function marinePiece() {
  return {
    id: "p1-marines",
    name: "Marine",
    sideKey: "player1",
    officialUnitRecordKey: "army_units:marine",
    sourceRecordHash:
      "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215",
    currentModels: 6,
    maxModels: 6,
    currentSupply: 1,
    isOnField: false,
    isDestroyed: false,
    statuses: [],
    combatEffects: [],
    assaultEffects: [],
    selectedUpgradeNames: ["AGG-12"],
    activatedPhases: { movement: false, assault: false, combat: false },
    models: Array.from({ length: 6 }, (_unused, index) => ({
      id: `p1-marines-m${index + 1}`,
      isOnField: false,
      isDestroyed: false,
    })),
  };
}

export function armyBuildingState() {
  const state = goliathBattleState();
  state.round = 1;
  state.phase = "army_building";
  delete state.phaseFirstActorByRound;
  state.pieces = [marinePiece()];
  state.board.terrain = [];
  state.log = [];
  return state;
}

export function configureMarine() {
  const state = armyBuildingState();
  const enumeration = enumerateOfficialSpecialistLoadoutV2(state, {
    sideKey: "player1", matchBinding, throwOnError: true,
  });
  const domain = enumeration.parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_SPECIALIST_LOADOUT_PARAMETER_KIND
  ));
  assert.ok(domain);
  assert.equal(domain.constraints.gameplayDataBundleHash,
    gameplayDataBundle.gameplayDataBundleHash);
  const instantiated = instantiateOfficialSpecialistLoadoutV2(state, domain, {
    assignments: [{ weaponName: "AGG-12", modelId: "p1-marines-m1" }],
  }, { matchBinding });
  const applied = applyOfficialSpecialistLoadoutV2(
    state,
    instantiated.action,
    { matchBinding, postRevision: 1 },
  );
  const marine = applied.state.pieces[0];
  assert.equal(marine.specialistLoadout.gameplayDataBundleHash,
    gameplayDataBundle.gameplayDataBundleHash);
  assert.equal(marine.specialistLoadoutHash,
    hashStarcraftTmgContract(Object.fromEntries(Object.entries(
      marine.specialistLoadout,
    ).filter(([key]) => key !== "specialistLoadoutHash"))));
  return applied.state;
}

function onField(model, index) {
  return {
    ...structuredClone(model),
    xInches: 5,
    yInches: 5 + (index * 1.5),
    baseShape: "round",
    baseWidthInches: 1.26,
    baseDepthInches: 1.26,
    elevation: "ground",
    supportTerrainIds: [],
    adjacentAccessPointIds: [],
    isOnField: true,
    isDestroyed: false,
  };
}

function goliath(id, yInches) {
  return {
    id,
    name: "Goliath",
    sideKey: "player2",
    officialUnitRecordKey: "army_units:goliath",
    sourceRecordHash:
      "e36b38cc46ff9a2fecce9f1fa7bc087923fca2fc29fad2d9f0eead479a68ab16",
    currentModels: 1,
    maxModels: 1,
    currentSupply: 2,
    isOnField: true,
    isDestroyed: false,
    combatTag: "ground",
    statuses: [],
    combatEffects: [],
    assaultEffects: [],
    selectedUpgradeNames: [],
    damageMarker: 0,
    activatedPhases: { movement: false, assault: false, combat: false },
    models: [{
      id: `${id}-m1`, xInches: 16, yInches,
      baseShape: "round", baseWidthInches: 3.15, baseDepthInches: 3.15,
      elevation: "ground", supportTerrainIds: [], adjacentAccessPointIds: [],
      isOnField: true, isDestroyed: false,
    }],
  };
}

export function battleStateFromConfigured(configuredState) {
  const state = structuredClone(configuredState);
  state.phase = "assault";
  state.round = 2;
  state.phaseFirstActorByRound = {
    "2:assault": { round: 2, phase: "assault", markerHolderSideKey: "player1",
      chosenFirstActorSideKey: "player1" },
  };
  state.log = [];
  const marine = state.pieces[0];
  marine.isOnField = true;
  marine.combatTag = "ground";
  marine.models = marine.models.map(onField);
  state.pieces.push(goliath("p2-goliath-a", 7));
  state.pieces.push(goliath("p2-goliath-b", 12));
  return state;
}

export function battleState() {
  return battleStateFromConfigured(configureMarine());
}

const initial = battleState();
const first = enumerateOfficialSpecialistRangedBatchV2(initial, {
  sideKey: "player1", matchBinding, throwOnError: true,
});
assert.equal(first.length, 4);
assert.equal(first.every((entry) => (
  entry.executorId === OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_ID
    && entry.dataAdapterReceiptHash.length === 64
)), true);
const firstApplied = applyOfficialSpecialistRangedBatchV2(
  initial,
  action(first[0]),
  { matchBinding, postRevision: 2,
    chanceReveals: Array.from({ length: first[0].chance.count }, () => 1) },
);
assert.equal(firstApplied.sequenceComplete, false);
assert.equal(firstApplied.state.officialGameplayDataBundle.gameplayDataBundleHash,
  gameplayDataBundle.gameplayDataBundleHash);
assert.equal(firstApplied.state.pendingRangedAttackSequence.specialistLoadoutHash,
  firstApplied.state.pieces[0].specialistLoadoutHash);
const second = enumerateOfficialSpecialistRangedBatchV2(firstApplied.state, {
  sideKey: "player1", matchBinding, throwOnError: true,
});
assert.ok(second.length >= 1);
const secondApplied = applyOfficialSpecialistRangedBatchV2(
  firstApplied.state,
  action(second[0]),
  { matchBinding, postRevision: 3,
    chanceReveals: Array.from({ length: second[0].chance.count }, () => 1) },
);
assert.equal(secondApplied.sequenceComplete, true);
assert.equal(secondApplied.state.pendingRangedAttackSequence, undefined);
assert.equal(secondApplied.state.officialGameplayDataBundle.gameplayDataBundleHash,
  gameplayDataBundle.gameplayDataBundleHash);

console.log(JSON.stringify({
  schema: "starcraft_tmg_official_specialist_v2_public_contract_report_v1",
  assertions: 16,
  currentGameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
  firstCandidateCount: first.length,
  secondCandidateCount: second.length,
  loadoutAndSequentialBatchesVerified: true,
  repositoryFallbackAllowed: false,
  silentCompatibilityUsed: false,
  trainingTruth: false,
}, null, 2));
