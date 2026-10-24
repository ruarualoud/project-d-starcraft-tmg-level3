import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";
import { createRosterPlanningSecureDeliberationFactoryV1 } from
  "../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs";

// Concrete fixed v7 incident: five paid shards exist, shard six has unknown
// egress/cost, and explicit one-send consent cannot pass the public review seam.
// Copy only the draft. No original writes, credential access or Provider calls.
const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const at = arg.indexOf("="); return [arg.slice(2, at), arg.slice(at + 1)];
}));
const root = path.resolve(import.meta.dirname, "..");
const setup = JSON.parse(await readFile(args.capture, "utf8"));
const bytes = await readFile(args.fixed, "utf8");
const fixed = JSON.parse(bytes);
const dispatch = fixed.providerDispatches.at(-1);
assert.equal(dispatch.status, "ambiguous");
assert.equal(dispatch.roundIndex, 6);
const directory = await mkdtemp(path.join(root, "build/s272-authorized-resume-bug-"));
await mkdir(path.join(directory, "drafts"));
await writeFile(path.join(directory, "drafts", `${fixed.sessionId}.json`), bytes,
  { mode: 0o600 });
let newRequests = 0;
const factory = {
  availability: () => ({ available: true, paidProvider: false }),
  async createForRun({ retryDispatch, onEvent }) {
    assert.equal(retryDispatch?.requestId, dispatch.requestId);
    return { descriptor: () => ({ available: true }), async deliberate(request) {
      newRequests += 1;
      assert.equal(request.roundIndex, 6, "five existing shards must replay locally");
      assert.equal(request.contextHash, dispatch.contextHash);
      await onEvent({ type: "provider_dispatch", dispatch: { ...dispatch,
        requestId: "fake-authorized-retry", retryOfRequestId: dispatch.requestId,
        retryAuthorizationId: retryDispatch.retryAuthorizationId,
        status: "reserved", costStatus: "not_sent" } });
      await onEvent({ type: "provider_dispatch", dispatch: { ...dispatch,
        requestId: "fake-authorized-retry", retryOfRequestId: dispatch.requestId,
        retryAuthorizationId: retryDispatch.retryAuthorizationId,
        status: "ambiguous", costStatus: "unknown" } });
      throw Object.assign(new Error("simulated retry also lost its response"),
        { code: "ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP" });
    } };
  },
};
async function open() {
  return createRosterPlanningProductModuleV1({ root, fixtureRoot: setup.fixtureRoot,
    dataDirectory: directory, mapConfiguration: setup.mapConfiguration,
    deliberationFactory: factory });
}
const checks = [];
try {
  const product = await open();
  await product.service.reviewFinalPlan(fixed.sessionId, {
    retryAmbiguousDispatch: true, expectedRequestId: dispatch.requestId,
  });
  for (let i = 0; i < 1000; i += 1) {
    if (product.service.readSession(fixed.sessionId).planReview.status !== "running") break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  const after = product.service.readSession(fixed.sessionId);
  assert.equal(after.planReview.status, "failed");
  assert.equal(newRequests, 1);
  assert.equal(after.retainedReplyCount, fixed.publicOutputs.length);
  assert.equal(after.plan.planHash, dispatch.planHash);
  assert.equal(after.providerDispatches.find(item => item.requestId === dispatch.requestId)
    .costStatus, "unknown");
  assert.equal(after.dispatchRetryAuthorizations.length, 1);
  assert.equal(after.dispatchRetryAuthorizations[0].status, "consumed");
  assert.equal(after.dispatchRetryAuthorizations[0].retryRequestId, "fake-authorized-retry");
  checks.push("same-plan same-context shard six only; five paid outputs retained");
  await assert.rejects(product.service.reviewFinalPlan(fixed.sessionId, {
    retryAmbiguousDispatch: true, expectedRequestId: "fake-authorized-retry",
  }), /REQUIRES_RECONCILIATION/u);
  const resumed = await open();
  assert.equal(resumed.service.readSession(fixed.sessionId)
    .dispatchRetryAuthorizations[0].status, "consumed");
  await assert.rejects(resumed.service.reviewFinalPlan(fixed.sessionId, {
    retryAmbiguousDispatch: true, expectedRequestId: "fake-authorized-retry",
  }), /REQUIRES_RECONCILIATION/u);
  assert.equal(newRequests, 1);
  assert.equal(await readFile(args.fixed, "utf8"), bytes);
  checks.push("restart preserves spent consent; a second ambiguous retry cannot send");
  const events = [];
  let physicalSends = 0;
  const isolated = await createRosterPlanningSecureDeliberationFactoryV1({
    readCredential: async () => ({ credentialBytes: Buffer.from("fake-not-a-key") }),
    createWorker: () => ({ attachCredential: async () => ({ ok: true, workerRef: "fake" }),
      close: async () => {}, send: async () => {
        physicalSends += 1;
        throw Object.assign(new Error("fake stream failure"), { safeReceipt: {
          code: "PROVIDER_RESPONSE_STREAM_FAILED", requestMayHaveBeenSent: true,
          requestDefinitelyNotSent: false, physicalAttempts: 1, status: 200,
        } });
      } }),
  });
  try {
    const request = { roundKind: "final_plan_review", roundIndex: 6,
      contextHash: "a".repeat(64), promptPack: "one-send-incident", promptNodes: [],
      userMessage: "public review", responseContract: {}, responseFormat: {
        kind: "provider_strict_json_schema", schemaName: "one_send_incident",
        schema: { type: "object", properties: {}, required: [], additionalProperties: false },
        outputContractRef: { id: "incident", version: "1", hash: "b".repeat(64) } } };
    const input = { sessionId: "isolated", runKind: "final-plan-review", planHash: "c".repeat(64),
      onEvent: async event => events.push(structuredClone(event)) };
    const original = await isolated.factory.createForRun(input);
    await assert.rejects(original.deliberate(request), /AMBIGUOUS_DISPATCH_STOP/u);
    const failedDispatch = events.filter(event => event.type === "provider_dispatch").at(-1).dispatch;
    const retryInput = { ...input, retryDispatch: { ...failedDispatch, retryAuthorizationId: "one-consent" } };
    const mismatched = await isolated.factory.createForRun(retryInput);
    await assert.rejects(mismatched.deliberate({ ...request, contextHash: "d".repeat(64) }),
      /RETRY_REQUEST_CHANGED/u);
    assert.equal(physicalSends, 1);
    const authorized = await isolated.factory.createForRun(retryInput);
    await assert.rejects(authorized.deliberate(request), /AMBIGUOUS_DISPATCH_STOP/u);
    assert.equal(physicalSends, 2);
    assert.equal(events.filter(event => event.type === "provider_dispatch").at(-1).dispatch
      .retryOfRequestId, failedDispatch.requestId);
    await assert.rejects(authorized.deliberate(request), /RETRY_AUTHORIZATION_CONSUMED/u);
    assert.equal(physicalSends, 2);
    checks.push("physical seam rejects changed request and a second send in the same run");
  } finally { await isolated.close(); }
  await writeFile(args.report, JSON.stringify({ ok: true, checks, fakeRequests: newRequests,
    providerCalls: 0, originalWorkspaceWrites: 0, roomMutations: 0,
    trainingTruth: false }, null, 2), { mode: 0o600 });
  console.log("AUTHORIZED_REVIEW_RESUME_OK");
} catch (error) {
  await writeFile(args.report, JSON.stringify({ ok: false, checks, failure: error.message,
    fakeRequests: newRequests, providerCalls: 0, originalWorkspaceWrites: 0,
    roomMutations: 0, trainingTruth: false }, null, 2), { mode: 0o600 });
  throw error;
}
