#!/usr/bin/env node

// Reproduce the actual A v5 review stopping at a settled output truncation.
// Captured plan/facts, synthetic ports only: no Provider or original writes.
import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { reviewRosterFinalPlanV3 } from
  "../packages/roster-strategist/roster-final-plan-review-v1.mjs";
import { createRosterPlanningSecureDeliberationFactoryV1 } from
  "../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs";
import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";

const sourcePath = process.argv[2];
assert(sourcePath);
const original = await readFile(sourcePath, "utf8");
const draft = JSON.parse(original);
const plan = JSON.parse(draft.planSerialized);
assert.equal(plan.planVersion, 5);
const incomplete = reason => Object.assign(new Error(
  "ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE"), {
  code: "ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE",
  providerIncompleteReason: reason,
});
const completed = request => {
  const sources = request.promptNodes.find(n => n.kind === "frozen-plan-claims").sources;
  assert.equal(request.promptNodes.find(n => n.kind === "frozen-plan-cross-claim-index")
    .sources.length, 50, "each child keeps the COMPLETE original cross-claim context");
  return { output: {
    schemaVersion: "starcraft_tmg_roster_final_plan_review_shard_v1",
    roundKind: "final_plan_review", findings: [],
    publicSummary: "Synthetic coverage only, not a strategy judgment.",
    reviewedClaimPaths: sources.map(s => s.path), hasUnreportedMaterialFindings: false,
  }, receipt: { receiptHash: hash(request.contextHash) } };
};
const responses = new Map();
const requests = [];
const failedContexts = [];
const progress = [];
const input = { plan, sessionId: "a-v5-incomplete-subdivision-repro",
  toolReceipts: draft.toolReceipts,
  selectedCandidateInputHash: draft.selectedCandidateInput
    ? hash(draft.selectedCandidateInput) : null,
  adaptiveReview: true,
  onShardProgress: event => progress.push(structuredClone(event)),
};
let failureInjected = false;
const review = await reviewRosterFinalPlanV3({ ...input,
  deliberation: { async deliberate(request) {
    requests.push(structuredClone(request));
    if (!failureInjected) {
      failureInjected = true;
      failedContexts.push(request.contextHash);
      throw incomplete("max_output_tokens");
    }
    const result = completed(request);
    responses.set(request.contextHash, structuredClone(result));
    return result;
  } },
});
assert.equal(requests.length, 9, "one failed root, two children, six unaffected roots");
assert.equal(review.reviewedClaimCount, 50);
assert.equal(new Set(review.reviewedClaimPaths).size, 50);
assert.equal(review.shardCount, 8);
assert.equal(review.adaptiveSubdivision.failedContexts.length, 1);
assert.equal(review.adaptiveSubdivision.failedContexts[0].contextHash, failedContexts[0]);
assert.equal(review.adaptiveSubdivision.coverage.length, 50);
assert(progress.some(e => e.type === "review_shard_subdivided"));
assert.equal(review.planHash, plan.planHash);
assert.equal(review.trainingTruth, false);

// Resume the SAME graph: known incomplete parent is not sent again, and the
// actual retained-output seam can match every completed child context exactly.
let unexpectedNewCalls = 0;
const replay = await reviewRosterFinalPlanV3({ ...input,
  incompleteShardContextHashes: failedContexts,
  deliberation: { async deliberate(request) {
    assert.notEqual(request.contextHash, failedContexts[0], "do not repurchase incomplete root");
    const result = responses.get(request.contextHash);
    if (!result) { unexpectedNewCalls += 1; throw Error("unrecorded child context"); }
    return structuredClone(result);
  } },
});
assert.equal(unexpectedNewCalls, 0);
assert.deepEqual(replay.reviewedClaimPaths, review.reviewedClaimPaths);
assert.deepEqual(replay.findings, review.findings);
assert.deepEqual(replay.adaptiveSubdivision.coverage, review.adaptiveSubdivision.coverage);

for (const error of [incomplete("other"), incomplete("unreported"),
  Object.assign(new Error("unknown egress"), { code: "ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP" }),
  Object.assign(new Error("authentication"), { code: "ROSTER_WORKSPACE_PROVIDER_AUTH_STOP" })]) {
  let calls = 0;
  await assert.rejects(() => reviewRosterFinalPlanV3({ ...input,
    deliberation: { async deliberate() { calls += 1; throw error; } },
  }), e => e === error);
  assert.equal(calls, 1, "non-capacity/unknown/auth failures never cause extra sends");
}

// Exercise the real secure adapter's typed failure handoff, not merely a fake
// error constructed by this test. Existing raw retention remains independent.
const events = [];
let workerMode = "typed_failure";
let workspaceSends = 0;
const secure = await createRosterPlanningSecureDeliberationFactoryV1({
  profile: { providerProfileId: "subdivision-repro", version: "1",
    integrity: { hash: "a".repeat(64) }, provider: "test-only", model: "test-only" },
  readCredential: async () => ({ credentialBytes: Buffer.from("test-only") }),
  createRegistry: () => ({ resolveEgressBinding: async () => ({ ok: true,
    egressBinding: { endpoint: { url: "https://example.invalid/responses" },
      model: "test-only", maxOutputUnits: 32768 } }) }),
  createWorker: () => ({ attachCredential: async () => ({ ok: true, workerRef: "test-only" }),
    async send({ body }) {
      if (workerMode === "workspace") {
        workspaceSends += 1;
        if (workspaceSends > 1) {
          const request = JSON.parse(body.input);
          return { status: 200, payload: { status: "completed",
            usage: { input_tokens: 100, output_tokens: 100, total_tokens: 200 },
            output: [{ type: "message", role: "assistant", status: "completed",
              content: [{ type: "output_text", text: JSON.stringify(completed({
                ...request, contextHash: "workspace-fake",
              }).output) }] }] },
            transportReceipt: { receiptHash: hash(workspaceSends) } };
        }
      }
      return { status: 200, payload: { status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
      usage: { input_tokens: 23745, output_tokens: 32768, total_tokens: 56513 },
      output: [{ type: "message", role: "assistant", status: "incomplete",
        content: [{ type: "output_text", text: "{\"partial\":" }] }] },
      transportReceipt: { receiptHash: "b".repeat(64) } }; },
    close: async () => {} }),
});
try {
  const port = await secure.factory.createForRun({ sessionId: "typed-failure",
    onEvent: event => events.push(event) });
  await assert.rejects(() => port.deliberate(requests[0]), e => e.code
    === "ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE"
    && e.providerIncompleteReason === "max_output_tokens");
  const failure = events.find(e => e.type === "round_failed");
  assert.equal(failure.failedOutputRecord.providerIncompleteReason, "max_output_tokens");
  assert.equal(failure.failedOutputRecord.eligibleForCompletedReplyRecovery, false);
  assert.equal(failure.usage.totalUnits, 56513);

  // Ordinary product workspace, private COPY of A, actual secure adapter.
  workerMode = "workspace";
  const root = path.resolve(import.meta.dirname, "..");
  const isolated = await mkdtemp(path.join(root, "build/s272-incomplete-subdivision-"));
  await mkdir(path.join(isolated, "drafts"), { mode: 0o700 });
  await copyFile(sourcePath, path.join(isolated, "drafts", `${draft.sessionId}.json`));
  const product = await createRosterPlanningProductModuleV1({ root,
    fixtureRoot: path.resolve(root, "../.."), dataDirectory: isolated,
    mapConfiguration: JSON.parse(await readFile(path.join(root,
      "build/ticket-23-three-arm-official-standard1-20261008-v1/shared-map-configuration.json"), "utf8")),
    deliberationFactory: secure.factory });
  await product.service.reviewFinalPlan(draft.sessionId);
  const deadline = Date.now() + 45000;
  let session;
  do {
    session = product.service.readSession(draft.sessionId);
    if (session.planReview?.status !== "running") break;
    await new Promise(resolve => setTimeout(resolve, 20));
  } while (Date.now() < deadline);
  assert.equal(session.planReview?.status, "completed",
    JSON.stringify(session.planReview?.failure || "review still running"));
  assert.equal(workspaceSends, 9);
  assert.equal(session.planReview.review.reviewedClaimCount, 50);
  assert.equal(session.planReview.review.adaptiveSubdivision.failedContexts.length, 1);
  const persisted = JSON.parse(await readFile(path.join(isolated, "drafts",
    `${draft.sessionId}.json`), "utf8"));
  assert(persisted.failedProviderOutputs.some(o => o.providerStatus === "incomplete"
    && o.providerIncompleteReason === "max_output_tokens"
    && o.eligibleForCompletedReplyRecovery === false));
  await product.service.reviewFinalPlan(draft.sessionId);
  assert.equal(workspaceSends, 9, "completed same-plan review needs no new request");
} finally { await secure.close(); }
assert.equal(await readFile(sourcePath, "utf8"), original);
console.log(JSON.stringify({ status: "passed", capturedPlanVersion: 5,
  reviewedPaths: 50, originalRoots: 7, completedLeaves: 8, syntheticCalls: 9,
  completeCrossClaimContext: true, incompleteParentNotRepurchased: true,
  childContextsResumable: true, otherFailuresNotRetried: true,
  actualAdapterTypedHandoff: true, ordinaryWorkspaceCopyCompleted: true,
  persistedIncompleteNotAdmitted: true, originalDraftUnchanged: true,
  providerCalls: 0, originalWorkspaceWrites: 0, roomWrites: 0, trainingTruth: false }));
