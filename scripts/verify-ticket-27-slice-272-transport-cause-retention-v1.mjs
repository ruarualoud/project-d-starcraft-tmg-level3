import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { createRosterPlanningSecureDeliberationFactoryV1 } from
  "../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs";

// Concrete live symptom: v7 review round6 becomes AMBIGUOUS_DISPATCH_STOP,
// but no original transport code survives in the durable dispatch projection.
// Reproduce only the cause-loss seam; never send or query a real Provider.
const events = [];
const safeReceipt = {
  schemaVersion: "starcraft_tmg_structured_provider_egress_transport_v1.failure",
  code: "PROVIDER_RESPONSE_STREAM_FAILED", status: 200,
  requestDefinitelyNotSent: false, requestMayHaveBeenSent: true,
  physicalAttempts: 1, receiptHash: "a".repeat(64),
  automaticRetries: 0, trainingTruth: false,
};
let sends = 0;
const secure = await createRosterPlanningSecureDeliberationFactoryV1({
  readCredential: async () => ({ credentialBytes: Buffer.from("not-a-real-credential") }),
  createRegistry: () => ({ resolveEgressBinding: async () => ({ ok: true,
    egressBinding: { model: "deepseek-flash", temperature: 0.2, topP: 1,
      maxOutputUnits: 8192, endpoint: { origin: "https://provider.invalid", path: "/responses" } },
  }) }),
  createWorker: () => ({
    attachCredential: async () => ({ ok: true, workerRef: "local-observation-worker" }),
    send: async () => {
      sends += 1;
      throw Object.assign(new Error(safeReceipt.code), {
        code: safeReceipt.code, safeReceipt: structuredClone(safeReceipt),
      });
    },
    close: async () => ({ ok: true }),
  }),
});
let report;
try {
  const port = await secure.factory.createForRun({
    sessionId: "local-concrete-cause-capture", runKind: "final-plan-review",
    planHash: "b".repeat(64), onEvent: async event => events.push(structuredClone(event)),
  });
  await assert.rejects(port.deliberate({
    roundKind: "final_plan_review", roundIndex: 6,
    contextHash: "c".repeat(64), maxOutputUnits: 1024,
    promptPack: "local-observation", promptNodes: [], userMessage: "local boundary observation",
    responseFormat: { kind: "provider_strict_json_schema", schemaName: "local_review",
      schema: { type: "object", properties: {} },
      outputContractRef: { id: "local-review", version: "1.0.0", hash: "d".repeat(64) } },
  }), error => error.code === "ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP");
  const dispatch = events.findLast(event => event.type === "provider_dispatch").dispatch;
  assert.equal(dispatch.transportFailure?.code, safeReceipt.code,
    "durable dispatch must retain the actual transport cause, not only generic stop");
  assert.equal(dispatch.transportFailure.status, 200);
  assert.equal(dispatch.transportFailure.physicalAttempts, 1);
  assert.equal(dispatch.transportFailure.requestMayHaveBeenSent, true);
  assert.equal(dispatch.costStatus, "unknown");
  const failed = events.findLast(event => event.type === "round_failed");
  assert.equal(failed.providerTransport.code, safeReceipt.code);
  assert.equal(failed.paidProviderCall, null);
  assert.equal(sends, 1);
  assert.equal(JSON.stringify(events).includes("not-a-real-credential"), false);
  report = { ok: true, actualCause: dispatch.transportFailure.code,
    genericStopRetained: failed.code, costStatus: dispatch.costStatus,
    paidProviderCall: failed.paidProviderCall, localWorkerCalls: sends,
    realProviderCalls: 0, originalWorkspaceWrites: 0, trainingTruth: false };
  console.log("TRANSPORT_CAUSE_RETENTION_OK", JSON.stringify(report));
} catch (error) {
  report = { ok: false, message: error.message, localWorkerCalls: sends,
    realProviderCalls: 0, originalWorkspaceWrites: 0, trainingTruth: false };
  throw error;
} finally {
  await secure.close();
  const target = process.argv.find(value => value.startsWith("--report="))?.slice(9);
  if (target) await writeFile(target, JSON.stringify(report) + "\n", { mode: 0o600 });
}
