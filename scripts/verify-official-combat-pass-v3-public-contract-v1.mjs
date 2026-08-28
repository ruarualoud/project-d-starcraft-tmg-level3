#!/usr/bin/env node

import assert from "node:assert/strict";

import {
  applyOfficialCombatPassV3,
  enumerateOfficialCombatPassV3Actions,
} from "../packages/rule-atoms/official-combat-pass-executor-v3.mjs";

function model(id, xInches) {
  return {
    id,
    xInches,
    yInches: 10,
    baseShape: "round",
    baseWidthInches: 1,
    baseDepthInches: 1,
    elevation: "ground",
    supportTerrainIds: [],
    adjacentAccessPointIds: [],
    isDestroyed: false,
  };
}

function piece(id, sideKey, xInches) {
  return {
    id,
    sideKey,
    name: id,
    combatTag: "ground",
    currentModels: 1,
    maxModels: 1,
    isOnField: true,
    isDestroyed: false,
    models: [model(`${id}-model`, xInches)],
    activatedPhases: { movement: true, assault: true, combat: false },
  };
}

function stateFixture({ phaseChoice = true } = {}) {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "combat",
    activeSideKey: "player1",
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: {},
    phaseFirstActorByRound: phaseChoice ? {
      "2:combat": {
        round: 2,
        phase: "combat",
        markerHolderSideKey: "player1",
        chosenFirstActorSideKey: "player1",
      },
    } : {},
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: { sideKey: "player2", passedPhases: {} },
    },
    scores: { player1: 0, player2: 0 },
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
    cardResources: { player1: [], player2: [] },
    pieces: [
      piece("p1-unit", "player1", 10),
      piece("p2-unit", "player2", 20),
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

const state = stateFixture();
const action = executableAction(enumerateOfficialCombatPassV3Actions(state, {
  sideKey: "player1",
})[0]);
const forged = {
  ...action,
  executorVersion: "999.0.0",
  ruleAtomIds: [],
  forgedField: "must-not-be-normalized-away",
};

assert.throws(
  () => applyOfficialCombatPassV3(state, forged),
  /COMBAT_PASS_V3_ACTION_(?:INVALID|MISMATCH)/u,
  "public Combat Pass apply must reject a forged executor identity and atom lineage",
);

const missingPhaseChoice = stateFixture({ phaseChoice: false });
assert.equal(
  enumerateOfficialCombatPassV3Actions(missingPhaseChoice, {
    sideKey: "player1",
  }).length,
  0,
  "Combat Pass must remain hidden until the marker holder makes a fresh Combat first-actor choice",
);
assert.equal(
  enumerateOfficialCombatPassV3Actions(missingPhaseChoice, {
    sideKey: "player1",
    includeDisabled: true,
  })[0]?.disabledReason,
  "COMBAT_PASS_V3_PHASE_FIRST_ACTOR_REQUIRED",
);
assert.throws(
  () => applyOfficialCombatPassV3(missingPhaseChoice, action),
  /COMBAT_PASS_V3_ACTION_STALE/u,
);
