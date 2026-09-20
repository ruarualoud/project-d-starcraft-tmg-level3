#!/usr/bin/env node

import assert from "node:assert/strict";

import { inspectStarcraftTmgChargeReachabilityV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { officialCharacteristicStatusUseTimingV1 } from
  "../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs";

const candidateId = "sc-domain-revision-27-raptor-charge";
const spatialActionSpace = {
  finiteActions: [{ candidateId: "sc-finite-pass",
    action: { actionType: "pass" } }],
  parameterDomains: [{
    domainId: candidateId,
    actionType: "charge",
    parameterKind: "official_selected_roster_charge_declaration_v1",
    pieceId: "player2-raptor",
    constraints: {
      speedInches: 5,
      chargeDistanceModifier: 0,
      chargeDistanceRoll: { diceCount: 1, keepHighest: 1, addTo: "speed" },
      eligibleTargetModelIdsByUnitId: {
        "player1-goliath-1": ["player1-goliath-1-model-1"],
        "player1-goliath-2": ["player1-goliath-2-model-1"],
        "player1-marine-1": ["player1-marine-1-model-1"],
      },
    },
  }],
};
const distances = {
  "player1-goliath-1": 21_164,
  "player1-goliath-2": 24_309,
  "player1-marine-1": 23_000,
};
const queryReceipts = [{
  queryKind: "space.inspect_relationships",
  result: {
    relationships: Object.entries(distances).map(([targetUnitId, distance]) => ({
      edgeKind: "unit_spatial_relationship",
      fromUnitId: "player2-raptor",
      toUnitId: targetUnitId,
      nearestPhysicalEdges: {
        distanceMilliInches: distance,
        precision: "exact_physical_footprints",
      },
    })),
  },
}];

assert.deepEqual(
  officialCharacteristicStatusUseTimingV1("charge_roll_advantage"),
  ["before_action"],
);
assert.deepEqual(
  officialCharacteristicStatusUseTimingV1("burrow_toggle"),
  ["before_action", "after_action"],
);

const reachability = inspectStarcraftTmgChargeReachabilityV1({
  spatialActionSpace,
  candidateId,
  queryReceipts,
});
assert.equal(reachability.status, "exact");
assert.equal(reachability.maximumDistanceMilliInches, 11_000);
assert.equal(reachability.nearestTargetBaseEdgeDistanceMilliInches, 21_164);
assert.equal(reachability.certainDistanceShortfall, true);

process.stdout.write(`${JSON.stringify({
  schema: "ticket23_slice248_charge_timing_and_reachability_repair_v1",
  ok: true,
  metabolicBoostUseTiming:
    officialCharacteristicStatusUseTimingV1("charge_roll_advantage"),
  reachability,
  providerCalls: 0,
  trainingTruth: false,
}, null, 2)}\n`);
