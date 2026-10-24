// Reproduce A v5's billed, incomplete review losing its raw text. All Worker
// responses are synthetic; only a private copy of the captured draft is used.
import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";
import { createRosterPlanningSecureDeliberationFactoryV1,
  recoverRosterFailedProviderOutputV1 } from
  "../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs";

const root = path.resolve(import.meta.dirname, "..");
const capturedRoot = path.join(root,
  "build/ticket-23-three-arm-official-standard1-20261008-v1");
const sessionId = "rws-91cb3366-9f15-4744-82a0-5273a61fb5c8";
const source = path.join(capturedRoot, "plan-workspace/drafts",
  `${sessionId}.json`);
const original = await readFile(source, "utf8");
const isolated = await mkdtemp(path.join(root,
  "build/s272-incomplete-output-retention-"));
await mkdir(path.join(isolated, "drafts"));
await copyFile(source, path.join(isolated, "drafts", `${sessionId}.json`));
const events = [];
let sends = 0;
let messageStatus = "incomplete";
// Even complete-looking JSON cannot certify a provider-incomplete response.
const rawText = JSON.stringify({ schemaVersion:
  "starcraft_tmg_roster_final_plan_review_shard_v1",
  roundKind: "final_plan_review", findings: [],
  publicSummary: "Synthetic incomplete response, never admitted." });
const secure = await createRosterPlanningSecureDeliberationFactoryV1({
  profile: { providerProfileId: "retention-repro", version: "1",
    integrity: { hash: "a".repeat(64) }, provider: "test-only",
    model: "test-only" },
  readCredential: async () => ({ credentialBytes: Buffer.from("test-only") }),
  createRegistry: () => ({ resolveEgressBinding: async () => ({ ok: true,
    egressBinding: { endpoint: { url: "https://example.invalid/responses" },
      model: "test-only", maxOutputUnits: 32768 } }) }),
  createWorker: () => ({
    attachCredential: async () => ({ ok: true, workerRef: "test-only" }),
    async send() {
      sends += 1;
      return { status: 200, payload: { status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
        usage: { input_tokens: 23745, output_tokens: 32768,
          total_tokens: 56513 },
        output: [{ type: "message", role: "assistant", status: messageStatus,
          content: [{ type: "output_text", text: rawText }] }] },
        transportReceipt: { receiptHash: "b".repeat(64) } };
    },
    close: async () => {},
  }),
});
try {
  const originalCreate = secure.factory.createForRun;
  const factory = { ...secure.factory, async createForRun(input) {
    return originalCreate({ ...input, onEvent: async event => {
      events.push(event);
      await input.onEvent?.(event);
    } });
  } };
  const product = await createRosterPlanningProductModuleV1({ root,
    fixtureRoot: path.resolve(root, "../.."), dataDirectory: isolated,
    mapConfiguration: JSON.parse(await readFile(path.join(capturedRoot,
      "shared-map-configuration.json"), "utf8")),
    deliberationFactory: factory });
  await product.service.reviewFinalPlan(sessionId);
  const deadline = Date.now() + 15000;
  let session;
  do {
    session = product.service.readSession(sessionId);
    if (session.planReview?.status !== "running") break;
    await new Promise(resolve => setTimeout(resolve, 20));
  } while (Date.now() < deadline);
  assert.equal(session.planReview?.failure?.code,
    "ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE");
  assert.equal(sends, 1, "no automatic resend after the known response");
  const failure = events.findLast(event => event.type === "round_failed");
  assert.equal(failure?.failedOutputRecord?.rawText, rawText,
    "billed incomplete review must retain its exact output at the real factory seam");
  assert.equal(failure.usage.totalUnits, 56513);
  const persisted = JSON.parse(await readFile(path.join(isolated, "drafts",
    `${sessionId}.json`), "utf8"));
  const retained = persisted.failedProviderOutputs?.at(-1);
  assert.equal(retained?.rawText, rawText,
    "ordinary workspace must persist the factory's incomplete output");
  assert.equal(retained.rawTextHash, hashStarcraftTmgContract(rawText));
  assert.equal(retained.providerIncompleteReason, "max_output_tokens");
  assert.equal(recoverRosterFailedProviderOutputV1(retained), null,
    "an incomplete provider result is diagnostic, not a completed review");
  assert.equal(persisted.publicOutputs.some(output =>
    output.outputHash === hashStarcraftTmgContract(JSON.parse(rawText))), false);

  // Providers also return an incomplete envelope with a completed message.
  messageStatus = "completed";
  const port = await secure.factory.createForRun({ sessionId: "second-shape",
    onEvent: event => events.push(event) });
  await assert.rejects(() => port.deliberate({ roundKind: "final_plan_review",
    roundIndex: 1, contextHash: "c".repeat(64),
    responseFormat: { kind: "provider_strict_json_schema", schemaName: "test",
      schema: { type: "object" }, outputContractRef:
        { id: "test", version: "1", hash: "d".repeat(64) } } }),
  error => error.code === "ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE");
  assert.equal(events.at(-1).failedOutputRecord.rawText, rawText);
  assert.equal(sends, 2);
  assert.equal(await readFile(source, "utf8"), original,
    "the original A draft and its paid history remain unchanged");
  console.log(JSON.stringify({ status: "passed", providerCalls: 0,
    originalWorkspaceWrites: 0, roomWrites: 0, fakeWorkerCalls: sends,
    incompleteMessageAndEnvelopeRetained: true,
    ordinaryWorkspacePrivatePersistence: true,
    incompleteNotAdmitted: true, automaticRetry: false,
    trainingTruth: false }));
} finally { await secure.close(); }
