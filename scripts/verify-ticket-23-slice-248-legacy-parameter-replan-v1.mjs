import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { decodeStarcraftTmgLiveDecisionRecordV1 } from
  "../packages/online-agent-session/sqlite-live-decision-store-v1.mjs";
import { createStarcraftTmgLiveFlashDecisionPortV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))
  ?.slice(name.length + 3);
const capture = JSON.parse(await readFile(argument("capture"), "utf8"));
const database = new DatabaseSync(argument("database"), { readOnly: true });
const row = database.prepare("SELECT record_json FROM sc_live_decision_records WHERE scope_key = ?")
  .get(capture.match.scope.scopeKey);
database.close();
assert.ok(row, "actual original decision scope must exist");
let record = decodeStarcraftTmgLiveDecisionRecordV1(row.record_json);
const choice = record.decisions[capture.choice.choiceKey];
assert.equal(choice.status, "provider_output_invalid");
assert.equal(choice.proposalValidationRounds, 3);
assert.equal(choice.semanticCorrectionRounds, 1);
const before = structuredClone(choice);
// This local copy exercises the same decide/commit/Prompt seam. The real SQLite
// is opened read-only; no real Provider or Room is attached.
record = { ...record, decisions: { [choice.choiceKey]: choice } };
let savedPrompt = null;
let firstNewStage = null;
let workerCalls = 0;
const authority = choice.authority;
const actionSpace = {
  authority: {
    stateRevision: authority.stateRevision, stateHash: authority.stateHash,
    legalSpaceHash: authority.legalSpaceHash,
  },
  actionSpaceHash: authority.spatialActionSpaceHash,
  finiteActions: choice.actionIndex.filter(item => item.kind === "finite")
    .map(item => ({ candidateId: item.id, action: item.action })),
  parameterDomains: choice.actionIndex.filter(item => item.kind === "parameterized")
    .map(item => item.action),
};
const port = createStarcraftTmgLiveFlashDecisionPortV1({
  profileCandidates: [record.selectedProfile],
  providerInteractionMode: record.providerInteractionMode,
  providerSupervisor: {
    readState: async () => ({ ok: true }),
    sendTurn: async () => {
      workerCalls += 1;
      firstNewStage = savedPrompt.nodes.find(node => node.nodeId === "agent-stage")
        ?.content?.stage;
      return { ok: false, reason: "LOCAL_FIRST_NEW_REQUEST_CAPTURE_ONLY" };
    },
  },
  promptArtifactStore: {
    put: ({ artifact }) => {
      savedPrompt = structuredClone(artifact);
      return { ok: true, bytes: Buffer.byteLength(JSON.stringify(artifact)),
        ref: { id: "local-prompt", hash: artifact.promptArtifactHash } };
    },
    release: () => {},
  },
  profileAvailabilityPort: { check: async () => ({ ok: true }) },
  strategySkillPort: { resolve: async () => ({ ok: true }) },
  spatialQueryPort: { query: async () => { throw new Error("unexpected local Rules query"); } },
  store: {
    durability: "local_readonly_capture_test",
    load: async () => record,
    commit: async (scopeKey, expected, next) => {
      assert.equal(scopeKey, record.scope.scopeKey);
      assert.equal(expected, record.revision);
      record = next;
      return { ok: true, revision: record.revision };
    },
  },
});
let report;
try {
  const result = await port.decide({
    scope: record.scope,
    retryApproved: true,
    roomProjection: {
      room: { roomId: authority.roomId, stateRevision: authority.stateRevision,
        stateHash: authority.stateHash },
      matchBinding: { bindingHash: authority.matchBindingHash },
      viewer: { seatKey: authority.seatKey },
      state: { phase: "movement", round: 2, pieces: [], markers: [], terrain: [] },
    },
    legalSpace: {
      roomId: authority.roomId, matchBindingHash: authority.matchBindingHash,
      stateRevision: authority.stateRevision, stateHash: authority.stateHash,
      legalSpaceHash: authority.legalSpaceHash, actions: [],
    },
    spatialActionSpace: actionSpace,
    spatialObservation: { observationHash: authority.spatialObservationHash,
      units: [], offTableUnits: [], terrain: [] },
  });
  assert.equal(workerCalls, 1, `expected one local boundary observation, got ${result.reason}`);
  assert.equal(firstNewStage, "planning", "legacy invalid intent must return to Planner, not fourth Action");
  const recovered = record.decisions[before.choiceKey];
  assert.equal(recovered.proposalValidationRounds, before.proposalValidationRounds,
    "lifetime proposal failure count must not reset on resume");
  assert.equal(recovered.semanticCorrectionRounds, before.semanticCorrectionRounds);
  assert.deepEqual(recovered.attemptKeys.slice(0, before.attemptKeys.length), before.attemptKeys);
  for (const key of before.attemptKeys) {
    assert.deepEqual(recovered.attempts[key], before.attempts[key]);
  }
  assert.deepEqual(recovered.queryReceipts, before.queryReceipts);
  assert.equal(recovered.failedPlannerResults.at(-1).plannerResult.recommendedCandidateId,
    before.plannerResult.recommendedCandidateId);
  assert.equal(recovered.parameterContractUpgradeHistory.length, 1);
  assert.deepEqual(recovered.parameterContractUpgradeHistory[0].previousContinuationMessages,
    before.providerContinuationMessages);
  const recovery = savedPrompt.nodes.find(node => node.nodeId === "current-decision-recovery")?.content;
  assert.ok(recovery?.failures.some(item => item.kind === "parameter_contract_upgrade"));
  assert.ok(recovery?.failures.some(item => item.feedback?.unavailableChoices
    ?.includes("remove_activation_marker")));
  assert.equal(result.ok, false, "the local request observation never supplies an executable action");
  report = { ok: true, firstNewStage, lifetimeProposalFailures: recovered.proposalValidationRounds,
    priorPaidAttemptsUnchanged: true, priorContinuationArchived: true,
    upgradeCount: recovered.parameterContractUpgradeHistory.length,
    localWorkerCalls: workerCalls, realProviderCalls: 0, originalRoomWrites: 0,
    originalDecisionStoreWrites: 0, trainingTruth: false };
  console.log("R81_LEGACY_PARAMETER_REPLAN_OK", JSON.stringify(report));
} catch (error) {
  report = { ok: false, message: error.message, firstNewStage, localWorkerCalls: workerCalls,
    realProviderCalls: 0, originalRoomWrites: 0, originalDecisionStoreWrites: 0,
    trainingTruth: false };
  throw error;
} finally {
  if (argument("report")) await writeFile(argument("report"), JSON.stringify(report) + "\n",
    { mode: 0o600 });
}
