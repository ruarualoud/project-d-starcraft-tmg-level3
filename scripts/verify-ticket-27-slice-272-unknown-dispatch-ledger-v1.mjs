import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { createRosterPlanningSecureDeliberationFactoryV1 } from
  "../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs";

// Concrete fresh v4 review failure: may-have-sent was recorded as unpaid,
// with no durable request ID for reconciliation. Fake credential/transport
// only; no Keychain access, actual Provider send, Room or original draft write.
const report = process.argv.find(arg => arg.startsWith("--report=")).slice(9);
let sends = 0;
const events = [];
const checks = [];
const request = { roundKind: "final_plan_review", roundIndex: 1,
  contextHash: "a".repeat(64), promptPack: "captured-dispatch-reproduction",
  promptNodes: [], userMessage: "public review", responseContract: {},
  responseFormat: { kind: "provider_strict_json_schema", schemaName: "dispatch_repro",
    schema: { type: "object", properties: {}, required: [], additionalProperties: false },
    outputContractRef: { id: "dispatch-repro", version: "1", hash: "b".repeat(64) } } };
const isolated = await createRosterPlanningSecureDeliberationFactoryV1({
  readCredential: async () => ({ credentialBytes: Buffer.from("not-a-real-credential") }),
  createWorker: () => ({ attachCredential: async ({ credentialBytes }) => {
    credentialBytes.fill(0); return { ok: true, workerRef: "fake-structured-worker" };
  }, async send(input) {
    sends += 1;
    const error = new Error("PROVIDER_WORKER_EXITED");
    error.safeReceipt = { requestMayHaveBeenSent: true, requestDefinitelyNotSent: false,
      physicalAttempts: 1, status: null, receiptHash: "c".repeat(64) };
    error.requestId = input.requestId;
    throw error;
  }, close: async () => {} }),
});
try {
  const port = await isolated.factory.createForRun({ sessionId: "captured-fresh-v4",
    runKind: "final-plan-review", onEvent: async event => events.push(structuredClone(event)) });
  await assert.rejects(port.deliberate(request), /ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP/u);
  const failed = events.find(event => event.type === "round_failed");
  assert.equal(failed.paidProviderCall, null,
    "unknown send state must not claim a definitely unpaid call");
  const dispatches = events.filter(event => event.type === "provider_dispatch");
  assert.deepEqual(dispatches.map(event => event.dispatch.status),
    ["reserved", "sending", "ambiguous"]);
  assert.equal(new Set(dispatches.map(event => event.dispatch.requestId)).size, 1);
  assert.equal(dispatches.at(-1).dispatch.contextHash, request.contextHash);
  assert.ok(dispatches.at(-1).dispatch.requestBodyHash);
  assert.equal(dispatches.at(-1).dispatch.costStatus, "unknown");
  assert.equal(sends, 1);
  checks.push("request_identity_is_persisted_before_send_and_unknown_cost_is_retained");
  const recovery = await isolated.factory.reconcileDispatch({
    dispatchRecord: dispatches.at(-1).dispatch, retainedOutputs: [] });
  assert.equal(recovery.action, "needs_attention");
  assert.equal(recovery.automaticResendAllowed, false);
  assert.equal(sends, 1);
  const legacy = await isolated.factory.reconcileDispatch({
    dispatchRecord: null, retainedOutputs: [] });
  assert.equal(legacy.reason, "legacy_request_identity_missing");
  assert.equal(legacy.costStatus, "unknown");
  checks.push("ambiguous_and_legacy_requests_are_not_blindly_resent");
  const retained = { roundKind: request.roundKind, roundIndex: request.roundIndex,
    dispatchRequestId: dispatches.at(-1).dispatch.requestId,
    contextHash: request.contextHash, outputContractRef: request.responseFormat.outputContractRef,
    sanitizedOutput: { public: true } };
  const { hashStarcraftTmgContract } = await import(
    "../packages/authoritative-engine/referee-crypto-v1.mjs");
  retained.outputHash = hashStarcraftTmgContract(retained.sanitizedOutput);
  const replay = await isolated.factory.reconcileDispatch({
    dispatchRecord: { ...dispatches.at(-1).dispatch, status: "completed" },
    retainedOutputs: [retained] });
  assert.equal(replay.action, "replay_local");
  assert.equal(sends, 1);
  const foreign = await isolated.factory.reconcileDispatch({
    dispatchRecord: { ...dispatches.at(-1).dispatch, status: "completed" },
    retainedOutputs: [{ ...retained, contextHash: "d".repeat(64) }] });
  assert.equal(foreign.action, "needs_attention");
  checks.push("only_context_bound_retained_reply_is_replayable_without_new_send");
  const guarded = await isolated.factory.createForRun({ sessionId: "persist-failure",
    onEvent: async event => { if (event.type === "provider_dispatch") {
      throw new Error("CAPTURED_PERSISTENCE_FAILED");
    } } });
  await assert.rejects(guarded.deliberate(request), /CAPTURED_PERSISTENCE_FAILED/u);
  assert.equal(sends, 1, "failed pre-send persistence cannot still call Provider");
  checks.push("pre_send_persistence_is_a_real_barrier");
  await writeFile(report, JSON.stringify({ ok: true, checks, fakeSends: sends,
    providerCalls: 0, originalWorkspaceWrites: 0, roomMutations: 0,
    trainingTruth: false }, null, 2), { mode: 0o600 });
  console.log("UNKNOWN_DISPATCH_LEDGER_OK", JSON.stringify(checks));
} catch (error) {
  await writeFile(report, JSON.stringify({ ok: false, checks, failure: error.message,
    providerCalls: 0, roomMutations: 0, trainingTruth: false }, null, 2), { mode: 0o600 });
  throw error;
} finally { await isolated.close(); }
