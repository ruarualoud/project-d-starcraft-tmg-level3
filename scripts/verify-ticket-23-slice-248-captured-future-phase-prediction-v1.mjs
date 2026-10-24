import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import * as live from "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { hashStarcraftTmgContract } from "../packages/authoritative-engine/transition-v1.mjs";

const [capturePath, reportPath] = process.argv.slice(2);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const originalHash = hashStarcraftTmgContract(capture);
const selected = capture.choice.actionIndex.find(entry =>
  entry.id === capture.choice.plannerResult.recommendedCandidateId);
const input = { spatialActionSpace: {
  finiteActions: capture.choice.actionIndex.filter(entry => entry.kind === "finite")
    .map(entry => ({ candidateId: entry.id, action: entry.action })),
  parameterDomains: capture.choice.actionIndex.filter(entry => entry.kind === "parameterized")
    .map(entry => entry.action),
}, spatialObservation: capture.spatialObservation,
roomProjection: { state: { phase: capture.currentPhase } } };
assert.equal(capture.rawAction.candidateId, selected.id);
assert.equal(capture.spatialObservation.observationHash,
  capture.choice.authority.spatialObservationHash);
const submitted = live.projectStarcraftTmgSubmittedActionV1(capture.rawAction,
  input, capture.choice, { terminal: true,
    currentAttemptKey: capture.currentAttemptKey });
submitted.proposal = { kind: "parameterized", domainId: selected.id, parameters: {} };
const bound = live.bindStarcraftTmgFormationSelectionV1(submitted,
  capture.queryReceipts, capture.spatialObservation);
const options = { action: bound, spatialObservation: capture.spatialObservation,
  currentPhase: capture.currentPhase, queryReceipts: capture.queryReceipts };
const inspect = (action, overrides = {}) =>
  live.inspectStarcraftTmgOpponentPredictionFeasibilityV1({ ...options,
    ...overrides, responses: action.intent.predictedOpponentResponses,
    ownAction: action });
const normalized = live.normalizeStarcraftTmgOpponentPredictionsV1(options);
const inspection = inspect(normalized);
const report = { schemaVersion: "captured_future_phase_prediction_regression_v1",
  stateRevision: capture.stateRevision,
  originalPaidOutputHash: capture.originalPaidOutputHash,
  inspection, providerCalls: 0, roomMutations: 0 };
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
assert.equal(inspection.status, "consistent",
  "captured same-round Assault prediction must bind its timing, not request another paid response");
const expected = structuredClone(bound.intent.predictedOpponentResponses);
expected[0].horizon = { kind: "current_round", count: 1 };
assert.deepEqual(normalized.intent.predictedOpponentResponses, expected,
  "retain actor, target, exposure, confidence, basis and counterplay exactly");
assert.deepEqual(normalized.proposal, bound.proposal);
assert.deepEqual(normalized.formationSelection, bound.formationSelection);
assert.equal(normalized.selectedReason, bound.selectedReason);
assert.equal(normalized.opponentPredictionNormalization.operation,
  "bind_explicit_same_round_future_phase_horizon");

// These guards exercise this new repair only, not previously passed gates.
const activated = structuredClone(capture.spatialObservation);
for (const model of activated.models || []) {
  if (model.unitId === "player1-jim-raynor") model.status.activatedPhases.assault = true;
}
const stillActivated = live.normalizeStarcraftTmgOpponentPredictionsV1({
  ...options, spatialObservation: activated });
assert.equal(stillActivated.intent.predictedOpponentResponses[0].horizon.kind, "current_phase");
assert.equal(inspect(stillActivated, { spatialObservation: activated }).status, "contradicted");
const withoutEvidence = live.normalizeStarcraftTmgOpponentPredictionsV1({
  ...options, queryReceipts: [] });
assert.equal(withoutEvidence.intent.predictedOpponentResponses[0].horizon.kind, "current_phase");
const unbound = structuredClone(bound);
unbound.formationSelection.formationOptionId = "not-source-bound";
assert.equal(live.normalizeStarcraftTmgOpponentPredictionsV1({
  ...options, action: unbound }).intent.predictedOpponentResponses[0].horizon.kind,
"current_phase");
const laterRound = structuredClone(bound);
laterRound.intent.predictedOpponentResponses[0].basis.push("This attack is only possible next round.");
assert.equal(live.normalizeStarcraftTmgOpponentPredictionsV1({
  ...options, action: laterRound }).intent.predictedOpponentResponses[0].horizon.kind,
"current_phase");
const noExplicitPhase = structuredClone(bound);
noExplicitPhase.intent.predictedOpponentResponses[0].basis = ["Enemy may fire at the Queen."];
assert.equal(live.normalizeStarcraftTmgOpponentPredictionsV1({
  ...options, action: noExplicitPhase }).intent.predictedOpponentResponses[0].horizon.kind,
"current_phase");
const facts = live.projectStarcraftTmgOpponentPredictionTimingFactsV1({
  spatialObservation: capture.spatialObservation, currentPhase: "movement" });
assert.equal(facts.actionPhaseByClass.ranged_attack, "assault");
assert.equal(facts.opponents.find(entry => entry.unitId === "player1-jim-raynor")
  .activatedPhases.assault, false);
const contradiction = inspect(bound).contradictions[0];
assert.equal(contradiction.currentPhase, "movement");
assert.equal(contradiction.predictedPhase, "assault");
assert.match(contradiction.repairHint, /current_round/u);
assert.match(contradiction.repairHint, /preserve/u);
assert.equal(hashStarcraftTmgContract(capture), originalHash);
await writeFile(reportPath, JSON.stringify({ ...report, status: "passed",
  onlyHorizonChanged: true, originalPaidOutputAndCaptureUnchanged: true,
  actorActivationUnknownAndUnboundEvidenceRemainStrict: true,
  generationAndCorrectionSharePhaseFacts: true,
  normalization: normalized.opponentPredictionNormalization,
}, null, 2) + "\n");
console.log(JSON.stringify({ passed: true, stateRevision: capture.stateRevision,
  providerCalls: 0, roomMutations: 0 }));
