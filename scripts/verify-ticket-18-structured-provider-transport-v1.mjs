#!/usr/bin/env node

import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from
  "../content/skill-generation/offline-provider-profile-v1.mjs";
import {
  STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_V1 as contract,
  STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_REF_V1 as contractRef,
} from "../content/skill-generation/ticket-18-faction-advice-editor-output-contract-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV2 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v2.mjs";
import {
  createStarcraftTmgStructuredProviderEgressTransportV1,
} from "../packages/secure-provider-runtime/structured-provider-egress-transport-v1.mjs";
import { createStarcraftTmgStructuredProviderWorkerPortV1 } from
  "../packages/secure-provider-runtime/structured-provider-worker-port-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = path.join(ROOT,
  "build/ticket-18-structured-generation-v1/r2-secure-transport-report.json");
const NOW = "2026-09-06T13:00:00.000Z";
const PUBLIC_ADDRESS = "93.184.216.34";
const checks = [];

async function check(id, operation) {
  await operation();
  checks.push({ id, passed: true });
}

const registry = createStarcraftTmgProviderProfileRegistryV2({
  entries: [{ providerProfile: profile, responsePath: "/responses" }],
  allowedProviders: ["deepseek-openai-compatible-direct"],
});
const binding = registry.resolveEgressBinding({
  profileRef: { id: profile.providerProfileId, version: profile.version,
    hash: profile.integrity.hash },
}).egressBinding;
const advice = {
  title: "带有 ASCII \"quotes\" 的任务建议",
  when: ["中文、反斜线 \\\\ 与换行\\n均须保真"],
  procedure: ["按固定顺序核对合法性"],
  alternatives: ["证据不足则保持不确定"],
  risk: "不要把格式合规误认为规则正确。",
  reviseIf: ["精确来源改变"],
  sourceRefs: ["core.example/p1"],
  unproven: ["策略收益仍需回放评估"],
};
const body = {
  model: binding.model,
  instructions: "Return exactly one schema-valid object.",
  input: "中文，ASCII \"quotes\"，反斜线 \\\\，换行\\n。",
  reasoning: { effort: "none" },
  temperature: binding.temperature,
  top_p: binding.topP,
  max_output_tokens: 256,
  stream: false,
  text: { format: { type: "json_schema", name: contract.schemaName,
    schema: contract.providerSchema } },
};
const request = {
  requestId: "transport-request-0001",
  endpoint: binding.endpoint,
  body,
  outputContractRef: contractRef,
};
const credential = () => Buffer.from("sk-structured-transport-test-only", "utf8");

function fakeRequestFactory({ status = 200, contentType = "application/json",
  payload = null, raw = null } = {}) {
  const calls = [];
  const requestImplementation = (options, onResponse) => {
    calls.push(options);
    const outbound = new EventEmitter();
    outbound.setTimeout = () => outbound;
    outbound.destroy = () => {};
    outbound.end = (sentBody) => {
      calls.at(-1).sentBody = sentBody;
      queueMicrotask(() => {
        const socket = new EventEmitter();
        socket.remoteAddress = PUBLIC_ADDRESS;
        outbound.emit("socket", socket);
        socket.emit("secureConnect");
        const response = new EventEmitter();
        response.statusCode = status;
        response.headers = { "content-type": contentType,
          "content-encoding": "identity", "x-request-id": "provider-id-1" };
        response.destroy = () => {};
        onResponse(response);
        const bytes = Buffer.from(raw === null
          ? JSON.stringify(payload) : raw, "utf8");
        response.emit("data", bytes);
        response.emit("end");
      });
    };
    return outbound;
  };
  return { calls, requestImplementation };
}

function completedPayload() {
  return {
    id: "response-transport-1", object: "response", status: "completed",
    model: binding.model,
    output: [{ type: "message", status: "completed", role: "assistant",
      content: [{ type: "output_text", text: JSON.stringify(advice) }] }],
    usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
    error: null, incomplete_details: null,
  };
}

await check("r2.transport-one-attempt-schema-bound-success", async () => {
  const fake = fakeRequestFactory({ payload: completedPayload() });
  const transport = createStarcraftTmgStructuredProviderEgressTransportV1({
    resolveAddresses: async () => [{ address: PUBLIC_ADDRESS, family: 4 }],
    requestImplementation: fake.requestImplementation,
    now: () => NOW,
  });
  const result = await transport.send({ egressBinding: binding,
    credentialBytes: credential(), sendRequest: request });
  assert.equal(result.physicalAttempts, 1);
  assert.equal(fake.calls.length, 1);
  assert.equal(fake.calls[0].agent, false);
  assert.equal(fake.calls[0].rejectUnauthorized, true);
  assert.equal(fake.calls[0].servername, binding.endpoint.hostname);
  assert.equal(fake.calls[0].path, binding.endpoint.path);
  assert.equal(result.transportReceipt.outputContractRef.hash, contractRef.hash);
  assert.equal(result.transportReceipt.schemaHash,
    hashStarcraftTmgContract(contract.providerSchema));
  assert.equal(result.transportReceipt.automaticRetries, 0);
});

await check("r2.transport-rejects-private-dns-before-request", async () => {
  const fake = fakeRequestFactory({ payload: completedPayload() });
  const transport = createStarcraftTmgStructuredProviderEgressTransportV1({
    resolveAddresses: async () => [{ address: "127.0.0.1", family: 4 }],
    requestImplementation: fake.requestImplementation,
  });
  await assert.rejects(() => transport.send({ egressBinding: binding,
    credentialBytes: credential(), sendRequest: request }), (error) =>
    error.code === "PROVIDER_DNS_RESOLUTION_FAILED"
      && error.safeReceipt.requestDefinitelyNotSent === true);
  assert.equal(fake.calls.length, 0);
});

await check("r2.transport-rejects-endpoint-drift-before-request", async () => {
  const fake = fakeRequestFactory({ payload: completedPayload() });
  const transport = createStarcraftTmgStructuredProviderEgressTransportV1({
    resolveAddresses: async () => [{ address: PUBLIC_ADDRESS, family: 4 }],
    requestImplementation: fake.requestImplementation,
  });
  await assert.rejects(() => transport.send({ egressBinding: binding,
    credentialBytes: credential(), sendRequest: { ...request,
      endpoint: { ...request.endpoint, path: "/chat/completions" } } }),
  (error) => error.code === "PROVIDER_REQUEST_CONTRACT_REJECTED"
    && error.safeReceipt.requestDefinitelyNotSent === true);
  assert.equal(fake.calls.length, 0);
});

await check("r2.transport-redacts-html-auth-failure", async () => {
  const fake = fakeRequestFactory({ status: 403, contentType: "text/html",
    raw: "<html>forbidden and secret-shaped server response</html>" });
  const transport = createStarcraftTmgStructuredProviderEgressTransportV1({
    resolveAddresses: async () => [{ address: PUBLIC_ADDRESS, family: 4 }],
    requestImplementation: fake.requestImplementation,
  });
  await assert.rejects(() => transport.send({ egressBinding: binding,
    credentialBytes: credential(), sendRequest: request }), (error) => {
    assert.equal(error.code, "PROVIDER_AUTHENTICATION_FAILED");
    assert.equal(JSON.stringify(error.safeReceipt).includes("html"), false);
    return true;
  });
  assert.equal(fake.calls.length, 1);
});

await check("r2.worker-isolates-and-zeroes-credential", async () => {
  const port = createStarcraftTmgStructuredProviderWorkerPortV1({
    providerProfileRegistry: registry,
  });
  const bytes = credential();
  const attached = await port.attachCredential({ providerProfile: profile,
    attachmentId: "structured-attachment-test-0001", credentialBytes: bytes });
  assert.equal(bytes.every((byte) => byte === 0), true);
  assert.equal(port.metadata().providerTransportOwner, "credential_child_only");
  const detached = await port.detachCredential({ workerRef: attached.workerRef,
    reason: "structured_test_complete" });
  assert.equal(detached.ok, true);
  await port.close();
});

const report = {
  schemaVersion: "ticket_18_slice_174_r2_secure_transport_report_v1",
  ticket: 18,
  slice: 174,
  workpoint: "174-R2",
  passed: checks.every((row) => row.passed),
  checks,
  providerEndpointCalled: false,
  paidProviderCalls: 0,
  childCredentialIsolationTested: true,
  trainingTruth: false,
};
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ report: REPORT_PATH, passed: report.passed,
  checks: checks.length }));
