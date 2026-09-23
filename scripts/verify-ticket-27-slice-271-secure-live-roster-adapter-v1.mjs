#!/usr/bin/env node

// Concrete S271 product bug: the normal Web workspace has no secure paid
// deliberation factory even though the isolated acceptance runner has one.
// This boundary test uses a fake Worker: no Keychain read or Provider request.
import assert from "node:assert/strict";

import { createRosterPlanningSecureDeliberationFactoryV1 } from
  "../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs";

const events = [];
const calls = [];
let closed = false;
let credentialReference = null;
let nextSendError = null;
let nextOutput = null;
const profile = {
  providerProfileId: "test-roster-flash", version: "1",
  integrity: { hash: "a".repeat(64) }, provider: "test-provider",
  model: "test-flash",
};
const registry = {
  resolveEgressBinding: async () => ({ ok: true, egressBinding: {
    endpoint: { url: "https://example.invalid/responses" },
    model: "test-flash", temperature: 0, topP: 1,
    maxOutputUnits: 16_384,
  } }),
};
const worker = {
  async attachCredential(input) {
    credentialReference = input.credentialBytes;
    return { ok: true, workerRef: "test-worker" };
  },
  async send(input) {
    calls.push(input);
    if (nextSendError) {
      const error = nextSendError;
      nextSendError = null;
      throw error;
    }
    const kind = input.body.text.format.schema.properties.roundKind.enum[0];
    const output = nextOutput || { schemaVersion: "test.v1",
      roundKind: kind };
    nextOutput = null;
    return {
      status: 200,
      payload: {
        status: "completed", model: "test-flash",
        usage: { input_tokens: 12, output_tokens: 8,
          total_tokens: 20 },
        output: [{ type: "message", role: "assistant",
          status: "completed", content: [{ type: "output_text",
            text: JSON.stringify(output) }] }],
      },
      transportReceipt: { receiptHash: "b".repeat(64) },
      physicalAttempts: 1,
    };
  },
  async close() { closed = true; },
};

const secure = await createRosterPlanningSecureDeliberationFactoryV1({
  profile,
  readCredential: async () => ({
    credentialBytes: Buffer.from("dummy-test-key-only"),
  }),
  createRegistry: () => registry,
  createWorker: () => worker,
});
assert.equal(credentialReference.every((byte) => byte === 0), true);
assert.equal(calls.length, 0, "attach must not call the Provider");
assert.equal(secure.factory.availability().available, true);
const port = await secure.factory.createForRun({
  sessionId: "test-session", runKind: "initial",
  control: { cancelled: () => false },
  onEvent: (event) => events.push(event),
});

for (const [index, kind] of ["teach_challenge",
  "preset_plan_deepening"].entries()) {
  const output = await port.deliberate({
    sessionId: "test-session", roundIndex: index + 2,
    roundKind: kind, promptPack: "test-pack", promptNodes: [],
    userMessage: "test", responseContract: {}, contextHash: "c".repeat(64),
    maxOutputUnits: 16_384,
    responseFormat: {
      kind: "provider_strict_json_schema", schemaName: "test_round",
      outputContractRef: { id: "test", version: "1",
        hash: "d".repeat(64) },
      schema: {
        type: "object", additionalProperties: false,
        properties: {
          schemaVersion: { type: "string", minLength: 7,
            maxLength: 7, enum: ["test.v1"] },
          roundKind: { type: "string", minLength: kind.length,
            maxLength: kind.length, enum: [kind] },
        },
        required: ["schemaVersion", "roundKind"],
      },
    },
  });
  assert.equal(output.output.roundKind, kind);
  assert.equal(output.receipt.paidProviderCall, true);
  assert.equal(calls[index].body.text.format.schema.properties.roundKind
    .enum[0], kind);
  assert.equal(calls[index].body.max_output_tokens, 16_384);
}
assert.deepEqual(events.map((event) => event.type), [
  "round_started", "round_completed", "round_started", "round_completed",
]);
assert.equal(events[1].usage.totalUnits, 20);
assert.equal(events[1].sanitizedOutputRecord.outputHash.length, 64);
const request = {
  sessionId: "test-session", roundIndex: 5,
  roundKind: "teach_challenge", promptPack: "test-pack",
  promptNodes: [], userMessage: "test", responseContract: {},
  contextHash: "c".repeat(64), maxOutputUnits: 16_384,
  responseFormat: {
    kind: "provider_strict_json_schema", schemaName: "test_round",
    outputContractRef: { id: "test", version: "1",
      hash: "d".repeat(64) },
    schema: { type: "object", additionalProperties: false,
      properties: { schemaVersion: { type: "string",
        minLength: 7, maxLength: 7, enum: ["test.v1"] },
        roundKind: { type: "string", minLength: 15,
          maxLength: 15, enum: ["teach_challenge"] } },
      required: ["schemaVersion", "roundKind"] },
  },
};
nextOutput = { roundKind: "teach_challenge",
  schemaVersion: "test.v1", unexpectedPublicAlias: "test" };
const rawAlias = await port.deliberate(request);
assert.equal(rawAlias.output.unexpectedPublicAlias, "test");
assert.equal(events.at(-1).sanitizedOutputRecord
  .transportSchemaIssues.length, 1);
for (const [receipt, expected] of [
  [{ status: 403, requestMayHaveBeenSent: true },
    "ROSTER_WORKSPACE_PROVIDER_AUTH_STOP"],
  [{ requestDefinitelyNotSent: true },
    "ROSTER_WORKSPACE_PROVIDER_SEND_FAILED"],
  [undefined, "ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP"],
]) {
  nextSendError = Object.assign(new Error("test transport failure"),
    { safeReceipt: receipt });
  await assert.rejects(() => port.deliberate(request),
    (error) => error.code === expected);
  assert.equal(events.at(-1).type, "round_failed");
  assert.equal(events.at(-1).code, expected);
}
const priorCallCount = calls.length;
const cancelledPort = await secure.factory.createForRun({
  sessionId: "test-session", runKind: "cancelled",
  control: { cancelled: () => true },
  onEvent: (event) => events.push(event),
});
await assert.rejects(() => cancelledPort.deliberate(request),
  (error) => error.code === "ROSTER_WORKSPACE_CANCELLED");
assert.equal(events.at(-1).type, "round_failed");
assert.equal(calls.length, priorCallCount);
await secure.close();
assert.equal(closed, true);
process.stdout.write(`${JSON.stringify({ verdict: "PASS",
  dynamicContracts: ["teach_challenge", "preset_plan_deepening"],
  providerCallsAtAttach: 0, fakeWorkerCalls: calls.length,
  credentialReturnedToParent: false, trainingTruth: false,
  authAndAmbiguousDispatchHardStop: true,
  cancelledRoundClosedWithoutDispatch: true })}\n`);
