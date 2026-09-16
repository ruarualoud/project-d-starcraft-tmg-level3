#!/usr/bin/env node

import assert from "node:assert/strict";

import { searchStarcraftTmgLegalFormationOptionsV1 } from
  "../packages/online-agent-session/legal-formation-search-v1.mjs";

const actorModelId = "marker-intent-model-1";
const domain = {
  schemaVersion: "ticket25_slice261_mission_marker_intent_fixture_v1",
  domainId: "ticket25-slice261:move:marker-intent",
  actionType: "move",
  sideKey: "player1",
  phase: "movement",
  pieceId: "marker-intent-unit",
  constraints: {
    battlefieldWidthMilliInches: 36_000,
    battlefieldHeightMilliInches: 36_000,
    maxDistanceMilliInches: 6_000,
    modelProfiles: [{
      modelId: actorModelId,
      baseShape: "round",
      baseWidthMilliInches: 1_260,
      baseDepthMilliInches: 1_260,
      startPoint: { xMilliInches: 10_000, yMilliInches: 10_000 },
    }],
  },
};

const state = {
  board: {
    widthInches: 36,
    heightInches: 36,
    terrain: [],
    missionMarkers: [{
      id: "mission-marker-1",
      number: 1,
      xInches: 20,
      yInches: 10,
      diameterMillimeters: 32,
    }],
    markers: [],
    tokens: [],
  },
  pieces: [],
};

const result = searchStarcraftTmgLegalFormationOptionsV1({
  state,
  domain,
  request: {
    preferredAnchor: { xMilliInches: 16_000, yMilliInches: 10_000 },
    maximumOptions: 1,
    maximumCandidateAttempts: 32,
    tacticalPurpose: "Move onto the official mission marker.",
    formationObjectives: [{
      kind: "control_objective",
      weight: 5,
      targetIds: ["mission-marker-1"],
    }],
  },
  instantiate: (_state, candidateDomain, parameters) => ({
    canonicalParameters: structuredClone(parameters),
    action: {
      actionType: candidateDomain.actionType,
      pieceId: candidateDomain.pieceId,
      spatialPlan: { canonicalParameters: structuredClone(parameters) },
    },
  }),
});

assert.equal(result.optionCount, 1,
  "focused marker-intent search must expose one legal formation");
const metric = result.formationOptions[0].tacticalMetrics.objectiveMetrics[0];
assert.equal(metric.kind, "control_objective");
assert.equal(metric.resolvedTargetCount, 1,
  "official xInches/yInches mission marker must resolve as the requested target");
assert(Number.isSafeInteger(metric.minimumTargetBaseEdgeDistanceMilliInches),
  "resolved mission-marker objective must expose a finite distance");
assert.equal(metric.minimumTargetBaseEdgeDistanceMilliInches, 2_740,
  "mission-marker distance must use nearest physical edges, not centre points");

process.stdout.write(`${JSON.stringify({
  schema: "ticket25_slice261_mission_marker_intent_v1",
  ok: true,
  domainId: result.domainId,
  optionId: result.formationOptions[0].formationOptionId,
  objectiveMetric: metric,
  providerCalls: 0,
  trainingTruth: false,
}, null, 2)}\n`);
