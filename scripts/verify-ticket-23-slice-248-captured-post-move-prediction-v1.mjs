import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import {
  projectStarcraftTmgSubmittedActionV1,
  bindStarcraftTmgFormationSelectionV1,
  inspectStarcraftTmgOpponentPredictionFeasibilityV1,
  normalizeStarcraftTmgOpponentPredictionsV1,
} from "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";

const [capturePath, reportPath] = process.argv.slice(2);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const originalHash = hashStarcraftTmgContract(capture);
const spatialActionSpace = {
  finiteActions: capture.choice.actionIndex.filter(a => a.kind === "finite")
    .map(a => ({ candidateId: a.id, action: a.action })),
  parameterDomains: capture.choice.actionIndex
    .filter(a => a.kind === "parameterized").map(a => a.action),
};
const input = { spatialActionSpace,
  spatialObservation: capture.spatialObservation,
  roomProjection: { state: { phase: capture.currentPhase } },
};
const submitted = projectStarcraftTmgSubmittedActionV1(capture.rawAction,
  input, capture.choice,
  { terminal: true, currentAttemptKey: capture.currentAttemptKey });
// Reproduce the production Planner binding before the exported formation
// binder. The terminal protocol names a candidate, not a proposal envelope.
const selected = capture.choice.actionIndex.find(a =>
  a.id === capture.choice.plannerResult.recommendedCandidateId);
assert.equal(capture.rawAction.candidateId, selected.id);
assert.equal(selected.kind, "parameterized");
submitted.proposal = { kind: "parameterized", domainId: selected.id,
  parameters: {} };
const bound = bindStarcraftTmgFormationSelectionV1(submitted,
  capture.queryReceipts, capture.spatialObservation);
const checkInput = {
  responses: bound.intent.predictedOpponentResponses,
  spatialObservation: capture.spatialObservation,
  currentPhase: capture.currentPhase,
  queryReceipts: capture.queryReceipts,
};
const inspection = inspectStarcraftTmgOpponentPredictionFeasibilityV1({
  ...checkInput, ownAction: bound,
});
await writeFile(reportPath, JSON.stringify({
  schemaVersion: "captured_post_move_prediction_regression_v1",
  originalPaidOutputHash: capture.originalPaidOutputHash,
  stateRevision: capture.stateRevision,
  selectedOptionId: bound.formationSelection.formationOptionId,
  inspection, providerCalls: 0, roomMutations: 0,
}, null, 2) + "\n");
assert.equal(inspection.status, "consistent",
  "post-move Raynor/Marine counterfire must use the selected formation, not old positions");
const normalized = normalizeStarcraftTmgOpponentPredictionsV1({
  action: bound, spatialObservation: capture.spatialObservation,
  currentPhase: capture.currentPhase, queryReceipts: capture.queryReceipts,
});
assert.deepEqual(normalized.intent.predictedOpponentResponses,
  bound.intent.predictedOpponentResponses,
  "do not silently drop a valid model-authored post-move prediction");
// Without a source-bound own move, the captured old position is still used.
assert.equal(inspectStarcraftTmgOpponentPredictionFeasibilityV1(checkInput)
  .status, "contradicted");
const unbound = structuredClone(bound);
unbound.formationSelection.formationOptionId = "unbound-option";
assert.equal(inspectStarcraftTmgOpponentPredictionFeasibilityV1({
  ...checkInput, ownAction: unbound,
}).status, "contradicted");
// New geometry does not erase the opponent's actual phase activation.
const activated = structuredClone(capture.spatialObservation);
for (const model of activated.models || []) {
  if (model.unitId === "player1-jim-raynor") {
    model.status.activatedPhases.assault = true;
  }
}
const unavailable = inspectStarcraftTmgOpponentPredictionFeasibilityV1({
  ...checkInput, spatialObservation: activated, ownAction: bound,
});
assert(unavailable.contradictions.some(c => c.actorId === "player1-jim-raynor"
  && c.reason === "actor_already_activated_for_predicted_phase"));
assert.equal(hashStarcraftTmgContract(capture), originalHash);
await writeFile(reportPath, JSON.stringify({
  schemaVersion: "captured_post_move_prediction_regression_v1",
  status: "passed", stateRevision: capture.stateRevision,
  originalPaidOutputHash: capture.originalPaidOutputHash,
  selectedFormationUsedForPostMoveTargets: true,
  bothModelAuthoredPredictionsRetained: true,
  oldAndUnboundGeometryRemainStrict: true,
  opponentPhaseActivationStillChecked: true,
  originalCaptureUnchanged: true, providerCalls: 0, roomMutations: 0,
}, null, 2) + "\n");
console.log(JSON.stringify({ passed: true, stateRevision: capture.stateRevision }));
