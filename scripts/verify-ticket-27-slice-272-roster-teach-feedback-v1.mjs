// Concrete bugs: selection purpose disappears at the actual Workspace Teach
// input, and completed Teach cannot return to Builder/model deliberation.
import assert from "node:assert/strict";
import path from "node:path";
import { readFile, writeFile, mkdir, mkdtemp } from "node:fs/promises";
import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";
import { createIterativeRosterFileStoreV1 } from
  "../packages/roster-strategist/iterative-roster-file-store-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const option = key => process.argv.find(arg => arg.startsWith(`--${key}=`))
  ?.slice(key.length + 3);
const root = path.resolve(import.meta.dirname, "..");
const capture = JSON.parse(await readFile(option("capture"), "utf8"));
await mkdir(path.join(root, "build"), { recursive: true });
const directory = await mkdtemp(path.join(root, "build/roster-teach-feedback-"));
const store = createIterativeRosterFileStoreV1({
  directory: path.join(directory, "iterative-draft") });
const state = structuredClone(capture.state);
state.modelContextVersion = 6;
state.teachFeedbackPolicy = "skill_teach_roster_coevolution_v1";
await store.save(state.sessionId, state);
for (const reply of capture.replies) {
  await store.retainReply(reply.requestKey, reply);
}
let foundationRequest;
let decisionRequest;
let mode = "foundation";
const alternative = capture.alternative;
assert.notDeepEqual(alternative.units, state.currentCandidate.input.units);
const factory = { createForRun: async ({ onEvent }) => ({
  descriptor: () => ({ kind: "local_concrete_bug_repro",
    modelVersion: "local-fake", promptVersion: "feedback_repro_v1" }),
  deliberate: async request => {
    if (mode === "foundation") {
      foundationRequest = request;
      throw Object.assign(new Error("LOCAL_CAPTURE_ONLY"),
        { code: "LOCAL_CAPTURE_ONLY" });
    }
    decisionRequest = request;
    const frozen = request.promptNodes.find(node => node.role === "frozen_context")
      ?.content;
    assert.ok(Object.keys(frozen.skillGuidance.projections).length > 0);
    assert.equal(frozen.decisionState.teachFeedback.disposition, "pending");
    assert.equal(frozen.decisionState.teachFeedback.taughtPlan.planHash,
      capture.plan.planHash);
    const output = { schemaVersion: "starcraft_tmg_iterative_roster_flash_model_port_v1",
      kind: "propose", question: "", queries: [], candidateInput: alternative,
      plan: { ...capture.replyTemplate.plan, mapEvidenceHash: "",
        victoryRoute: "Local reproduction: revisit the combination after Teach",
        strategy: { ...capture.replyTemplate.plan.strategy,
          revisionReason: "Local fake revises a real legal combination after the supplied challenge" } },
      assumptionDisposition: "revise" };
    await onEvent({ type: "round_completed", paidProviderCall: false,
      receiptHash: hashStarcraftTmgContract(output),
      sanitizedOutputRecord: { sanitizedOutput: output },
      usage: { inputUnits: 0, outputUnits: 0, totalUnits: 0 } });
    return { output, receipt: { paidProviderCall: false } };
  },
}) };
const product = await createRosterPlanningProductModuleV1({ root,
  fixtureRoot: option("fixture"), dataDirectory: directory,
  mapConfiguration: capture.mapConfiguration,
  deliberationFactory: factory, enableIterativeDraft: true });
const handoff = await product.iterativeDraft.prepareTeachHandoff(state.sessionId);
const teach = await product.service.createAgentSelectedTeachSession({
  setup: capture.setup, handoff });
assert.deepEqual(teach.agentSelectedStrategySource?.plan, state.plan,
  "actual Workspace dropped the selection purpose before Teach");
await product.service.startPlanning(teach.sessionId);
const deadline = Date.now() + 60_000;
while (product.service.readSession(teach.sessionId).status === "running"
  && Date.now() < deadline) {
  await new Promise(resolve => setTimeout(resolve, 10));
}
assert.ok(foundationRequest, "actual foundation request was not observed");
assert.deepEqual(foundationRequest.promptNodes.find(node =>
  node.nodeType === "agent-selected-strategy-source")?.content.plan, state.plan);
assert.match(foundationRequest.userMessage, /candidate snapshot/i);

mode = "revisit";
await product.iterativeDraft.attachTeachFeedback(state.sessionId, {
  ...teach, status: "planned", plan: capture.plan,
  evidence: { toolReceipts: capture.toolReceipts },
});
const pending = await product.iterativeDraft.read(state.sessionId);
assert.equal(pending.status, "active");
assert.equal(pending.currentCandidate.candidateHash, state.currentCandidate.candidateHash);
await product.iterativeDraft.resume(state.sessionId);
const revised = await product.iterativeDraft.read(state.sessionId);
assert.equal(revised.currentCandidate.mineralSpent, 2000);
assert.notEqual(revised.currentCandidate.candidateHash, state.currentCandidate.candidateHash);
assert.equal(revised.iterations.at(-1).rulesVerdictStatus, "legal");
assert.equal(revised.teachFeedbackHistory[0].disposition, "reopened");
assert.equal(revised.openingDeploymentSchedule, null);
assert.deepEqual(revised.iterations.slice(0, state.iterations.length), state.iterations);
assert.ok(decisionRequest.responseFormat.schema.properties.kind.enum
  .includes("accept_teach"));
const prefix = capture.replies.map(reply => reply.receiptHash);
for (const reply of capture.replies) {
  assert.deepEqual(await store.loadRetainedReply(reply.requestKey), reply);
}
const history = await product.iterativeJourney.exportExperience(state.sessionId);
assert.equal(history.trainingTruth, false);
assert.equal(history.hiddenChainOfThoughtStored, false);
assert.equal(history.sourceBoundPaidReplyHashes.length >= prefix.length, true);
assert.ok(history.events.some(event => event.kind === "teach_feedback"));
assert.ok(history.events.some(event => event.kind === "model_decision"
  && event.output?.kind === "propose"));
const report = { status: "passed", sourcePurposeDelivered: true,
  sharedBuilderLegal2000Revision: true, teachCanReopenRoster: true,
  originalReplyCount: prefix.length, originalRepliesPreserved: true,
  experienceEventCount: history.events.length,
  providerCalls: 0, roomMutations: 0, trainingTruth: false,
  dataDirectory: directory };
await writeFile(option("output"), JSON.stringify(report, null, 2) + "\n",
  { mode: 0o600 });
process.stdout.write(JSON.stringify(report) + "\n");
