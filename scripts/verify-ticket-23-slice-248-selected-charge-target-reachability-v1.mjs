#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  canonicalizeStarcraftTmgSubmittedParameterAliasesV1,
  completeStarcraftTmgSelectedChargeEvidenceV1,
  inspectStarcraftTmgCertainFailedChargeCandidatesV1,
  inspectStarcraftTmgSelectedChargeReachabilityV1,
  shouldPreferStarcraftTmgPromptRepairOverPlannerReplayV1,
} from "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { createOfficialPhysicalFootprintV1 } from
  "../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";

const candidateId = "hydralisk-charge";
const spatialActionSpace = { parameterDomains: [{
  domainId: candidateId,
  actionType: "charge",
  parameterKind: "official_selected_roster_charge_declaration_v1",
  pieceId: "player2-hydralisk",
  constraints: {
    speedInches: 5,
    chargeDistanceModifier: 0,
    chargeDistanceRoll: { diceCount: 1, keepHighest: 1 },
    eligibleTargetModelIdsByUnitId: {
      "player1-goliath": ["goliath-model-1"],
      "player1-marine": ["marine-model-1"],
    },
  },
}] };
const goliathReceipt = { queryKind: "space.inspect_relationships",
  result: { relationships: [{ edgeKind: "unit_spatial_relationship",
    fromUnitId: "player2-hydralisk", toUnitId: "player1-goliath",
    nearestPhysicalEdges: { distanceMilliInches: 18_776,
      precision: "exact_physical_footprints" } }] } };

const impossibleTarget = inspectStarcraftTmgSelectedChargeReachabilityV1({
  spatialActionSpace, candidateId, targetUnitId: "player1-goliath",
  queryReceipts: [goliathReceipt],
});
assert.equal(impossibleTarget.status, "exact");
assert.equal(impossibleTarget.certainDistanceShortfall, true);
assert.equal(impossibleTarget.maximumDistanceMilliInches, 11_000);
assert.equal(impossibleTarget.minimumMoveToEngageMilliInches, 17_776);
assert.equal(inspectStarcraftTmgSelectedChargeReachabilityV1({
  spatialActionSpace, candidateId, targetUnitId: "player1-marine",
  queryReceipts: [goliathReceipt],
}).status, "unknown");

let queries = 0;
const completed = await completeStarcraftTmgSelectedChargeEvidenceV1({
  spatialActionSpace, candidateId, targetUnitId: "player1-marine",
  queryReceipts: [goliathReceipt],
  spatialQueryPort: { async query({ request }) {
    queries += 1;
    assert.deepEqual(request.arguments.subjectUnitIds, ["player2-hydralisk"]);
    assert.deepEqual(request.arguments.targetIds, ["player1-marine"]);
    return { queryReceiptHash: "a".repeat(64),
      queryKind: "space.inspect_relationships", status: "advisory_estimate",
      result: { relationships: [{ edgeKind: "unit_spatial_relationship",
        fromUnitId: "player2-hydralisk", toUnitId: "player1-marine",
        nearestPhysicalEdges: { distanceMilliInches: 8_000,
          precision: "exact_physical_footprints" } }] } };
  } },
});
assert.equal(queries, 1);
assert.equal(completed.reachability.status, "exact");
assert.equal(completed.reachability.certainDistanceShortfall, false);
assert.equal(completed.receipts.length, 1);
assert.equal((await completeStarcraftTmgSelectedChargeEvidenceV1({
  spatialActionSpace, candidateId, targetUnitId: "player1-goliath",
  queryReceipts: [goliathReceipt],
  spatialQueryPort: { async query() { throw new Error("redundant query"); } },
})).receipts.length, 0);

// Captured r109 failure pattern: a whole Charge candidate has no target even
// at the maximum D6 roll. A second Charge with a nearer base must remain.
const scope = { roomId: "ticket23-r109", matchBindingHash: "binding-r109",
  stateRevision: 109, stateHash: "state-r109", seatKey: "player2" };
const observedModels = [
  ["player2-hydralisk", 0], ["player2-raptor", 10_000],
  ["player1-goliath", 19_776],
].map(([unitId, xMilliInches]) => ({ unitId, modelId: `${unitId}-model-1`,
  geometryStatus: "exact_rules_profile",
  footprint: createOfficialPhysicalFootprintV1({
    objectId: `${unitId}-model-1`, kind: "model_base", shape: "round",
    center: { xMilliInches, yMilliInches: 10_000 },
    widthMilliInches: 1_000, depthMilliInches: 1_000,
  }) }));
const exactObservation = { ...scope, viewer: { seatKey: "player2" },
  observationHash: "observation-r109",
  units: observedModels.map((model) => ({ unitId: model.unitId,
    currentModels: 1 })), models: observedModels };
const exactSpace = { authority: { ...scope,
  spatialObservationHash: exactObservation.observationHash },
  parameterDomains: [{ ...spatialActionSpace.parameterDomains[0],
    constraints: { ...spatialActionSpace.parameterDomains[0].constraints,
      eligibleTargetModelIdsByUnitId: {
        "player1-goliath": ["player1-goliath-model-1"],
      } } }, { ...spatialActionSpace.parameterDomains[0],
    domainId: "raptor-charge", pieceId: "player2-raptor",
    constraints: { ...spatialActionSpace.parameterDomains[0].constraints,
      speedInches: 6, eligibleTargetModelIdsByUnitId: {
        "player1-goliath": ["player1-goliath-model-1"],
      } } }] };
const excluded = inspectStarcraftTmgCertainFailedChargeCandidatesV1({
  spatialActionSpace: exactSpace, spatialObservation: exactObservation,
});
assert.deepEqual(excluded.map((entry) => entry.candidateId), [candidateId]);
assert.equal(excluded[0].targetDistances[0].baseEdgeDistanceMilliInches,
  18_776);
assert.equal(inspectStarcraftTmgCertainFailedChargeCandidatesV1({
  spatialActionSpace: exactSpace,
  spatialObservation: { ...exactObservation, stateRevision: 108 },
}).length, 0, "stale observations cannot prune a current legal candidate");

// Captured r109 proposal: the selected charge target was valid, but the
// provider used the public target aliases instead of the Rules keys.
const chargeDomain = exactSpace.parameterDomains[1];
const aliasedCharge = { leadingModelId: "player2-raptor-model-1",
  targets: [{ targetUnitId: "player1-goliath",
    targetModelId: "player1-goliath-model-1" }] };
assert.deepEqual(canonicalizeStarcraftTmgSubmittedParameterAliasesV1(
  chargeDomain, aliasedCharge), {
  leadingModelId: aliasedCharge.leadingModelId,
  targets: [{ unitId: "player1-goliath",
    modelId: "player1-goliath-model-1" }],
});
assert.deepEqual(canonicalizeStarcraftTmgSubmittedParameterAliasesV1(
  chargeDomain, { ...aliasedCharge, targets: [{ targetUnitId: "other",
    targetModelId: "player1-goliath-model-1" }] }), {
  ...aliasedCharge, targets: [{ targetUnitId: "other",
    targetModelId: "player1-goliath-model-1" }],
}, "unrecognized targets must still reach the Rules rejection path");

const exhaustedSavedChoice = { status: "provider_output_invalid",
  semanticCorrectionRounds: 4, promptRepairHistory: [],
  attemptKeys: ["old-paid-planner"],
  attempts: { "old-paid-planner": { status: "completed",
    promptPolicyVersion:
      "starcraft_tmg_planner_action_spatial_intent_solver_v28_json_channels" } } };
assert.equal(shouldPreferStarcraftTmgPromptRepairOverPlannerReplayV1(
  exhaustedSavedChoice, { retryApproved: true,
    promptPolicyVersion:
      "starcraft_tmg_planner_action_spatial_intent_solver_v29_json_channels",
    maxSemanticCorrectionRounds: 3 }), true);
assert.equal(shouldPreferStarcraftTmgPromptRepairOverPlannerReplayV1(
  exhaustedSavedChoice, { retryApproved: false,
    promptPolicyVersion:
      "starcraft_tmg_planner_action_spatial_intent_solver_v29_json_channels",
    maxSemanticCorrectionRounds: 3 }), false);

process.stdout.write(JSON.stringify({ ok: true, queries,
  goliathMinimumMoveMilliInches:
    impossibleTarget.minimumMoveToEngageMilliInches,
  certainFailureCandidatesExcluded: excluded.length,
  providerCalls: 0, roomMutations: 0 }) + "\n");
