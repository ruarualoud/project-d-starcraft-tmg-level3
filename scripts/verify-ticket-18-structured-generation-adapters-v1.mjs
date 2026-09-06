#!/usr/bin/env node

import assert from "node:assert/strict";
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
  createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1,
  STARCRAFT_TMG_STRUCTURED_PROVIDER_REQUEST_VERSION,
} from "../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs";
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from
  "../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs";
import { createStarcraftTmgProviderCapabilityReceiptV1 } from
  "../packages/structured-generation/provider-capability-receipt-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = path.join(ROOT,
  "build/ticket-18-structured-generation-v1/r2-adapter-report.json");
const checks = [];
const NOW = "2026-09-06T12:00:00.000Z";

async function check(id, operation) {
  await operation();
  checks.push({ id, passed: true });
}

const registry = createStarcraftTmgProviderProfileRegistryV2({
  entries: [{ providerProfile: profile, responsePath: "/responses" }],
  allowedProviders: ["deepseek-openai-compatible-direct"],
});
const resolved = registry.resolveEgressBinding({
  profileRef: { id: profile.providerProfileId, version: profile.version,
    hash: profile.integrity.hash },
});
assert.equal(resolved.ok, true);
const binding = resolved.egressBinding;
const advice = {
  title: "任务压力下保留撤退线",
  when: ["目标可计分且撤退路线开放"],
  procedure: ["先核对合法动作", "再承诺最小兵力"],
  alternatives: ["威胁过高时转为远程牵制"],
  risk: "过度承诺会损失后续行动资源。",
  reviseIf: ["对手增援改变威胁叠加"],
  sourceRefs: ["core.example/p1"],
  unproven: ["交换效率需要对战回放验证"],
};
const capabilityReceipt = createStarcraftTmgProviderCapabilityReceiptV1({
  providerProfileRef: binding.providerProfileRef,
  endpointPath: binding.endpoint.path,
  endpointDialect: binding.endpointDialect,
  model: binding.model,
  capability: "responses_json_schema",
  schemaSubsetVersion: contract.schemaSubsetVersion,
  outputContractRef: contractRef,
  probeInputHash: hashStarcraftTmgContract("already-probed-input"),
  probeOutputHash: hashStarcraftTmgContract(advice),
  probeResult: "accepted_schema_valid",
  usage: { inputUnits: 80, outputUnits: 24, totalUnits: 104 },
  usageKnown: true,
  physicalAttempts: 1,
  probedAt: "2026-09-06T10:00:00.000Z",
  expiresAt: "2026-09-07T10:00:00.000Z",
});
let requestSequence = 0;
function request() {
  requestSequence += 1;
  return {
    schemaVersion: STARCRAFT_TMG_STRUCTURED_PROVIDER_REQUEST_VERSION,
    requestId: `structured-request-${requestSequence}`,
    roleRef: { id: "faction.objectives.editor.0.1", version: "v1",
      hash: hashStarcraftTmgContract("faction.objectives.editor.0.1") },
    instructions: "Return one advice object grounded only in the supplied evidence.",
    input: "Synthetic source-bound editor context.",
    outputContractRef: contractRef,
    maxOutputUnits: 256,
  };
}

async function runStep(step, operation = "complete") {
  const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({
    steps: [step],
  });
  const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({
    send: fault.send,
    now: () => NOW,
  });
  if (operation === "probe") return { result: await adapter.probeCapability({
    egressBinding: binding,
    outputContract: contract,
    providerRequest: request(),
    expiresAt: "2026-09-07T12:00:00.000Z",
  }), inspection: fault.inspect() };
  return { result: await adapter.complete({
    egressBinding: binding,
    capabilityReceipt,
    outputContract: contract,
    providerRequest: request(),
  }), inspection: fault.inspect() };
}

await check("r2.responses-json-schema-request-and-success", async () => {
  const run = await runStep({ kind: "success", output: advice });
  assert.deepEqual(run.result.output, advice);
  assert.equal(run.result.usageReceipt.outputContractRef.hash, contractRef.hash);
  assert.equal(run.result.localValidationReceipt.valid, true);
  assert.equal(run.inspection.calls.length, 1);
  assert.equal(run.inspection.networkUsed, false);
});

for (const [id, text, expected, kind] of [
  ["missing-outer-object-close",
    JSON.stringify(advice).slice(0, -1), advice, "outer_object_close"],
  ["single-json-fence", `\`\`\`json\n${JSON.stringify(advice)}\n\`\`\``,
    advice, "single_json_fence"],
  ["single-unescaped-quote",
    JSON.stringify({ ...advice, risk: 'Move 6" then hold.' })
      .replace('6\\" then', '6" then'),
    { ...advice, risk: 'Move 6" then hold.' }, "single_unescaped_quote_v1"],
]) {
  await check(`r2.lossless-${id}`, async () => {
    const run = await runStep({ kind: "invalid_json", text });
    assert.deepEqual(run.result.output, expected);
    assert.equal(run.result.usageReceipt.responseNormalization.kind, kind);
    assert.equal(run.result.usageReceipt.responseNormalization.changed, true);
    assert.equal(run.result.localValidationReceipt.valid, true);
  });
}

for (const [id, step, code] of [
  ["refusal", { kind: "refusal" }, "STRUCTURED_PROVIDER_REFUSAL"],
  ["incomplete", { kind: "incomplete" }, "STRUCTURED_PROVIDER_INCOMPLETE"],
  ["usage-unknown", { kind: "usage_unknown", output: advice },
    "STRUCTURED_PROVIDER_USAGE_UNKNOWN"],
  ["invalid-json", { kind: "invalid_json" },
    "STRUCTURED_PROVIDER_SCHEMA_INVALID"],
  ["invalid-schema", { kind: "invalid_schema" },
    "STRUCTURED_PROVIDER_SCHEMA_INVALID"],
  ["ambiguous-send", { kind: "ambiguous_send" },
    "STRUCTURED_PROVIDER_AMBIGUOUS_SEND"],
  ["definitely-not-sent", { kind: "definitely_not_sent" },
    "STRUCTURED_PROVIDER_PRE_EGRESS_FAILED"],
]) {
  await check(`r2.${id}`, async () => {
    await assert.rejects(async () => runStep(step), (error) => {
      assert.equal(error.code, code);
      assert.equal(error.safeReceipt.automaticRetries, 0);
      if (id === "ambiguous-send") {
        assert.equal(error.safeReceipt.requestMayHaveBeenSent, true);
      }
      if (id === "definitely-not-sent") {
        assert.equal(error.safeReceipt.requestDefinitelyNotSent, true);
      }
      return true;
    });
  });
}

await check("r2.expired-capability-fails-before-send", async () => {
  const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({
    steps: [{ kind: "success", output: advice }],
  });
  const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({
    send: fault.send,
    now: () => "2026-09-08T12:00:00.000Z",
  });
  await assert.rejects(async () => adapter.complete({
    egressBinding: binding,
    capabilityReceipt,
    outputContract: contract,
    providerRequest: request(),
  }), (error) => error.code === "STRUCTURED_PROVIDER_CAPABILITY_REQUIRED"
    && error.safeReceipt.requestDefinitelyNotSent === true);
  assert.equal(fault.inspect().calls.length, 0);
});

await check("r2.capability-probe-produces-exact-receipt", async () => {
  const run = await runStep({ kind: "success", output: advice }, "probe");
  assert.equal(run.result.ok, true);
  assert.equal(run.result.capabilityReceipt.outputContractRef.hash,
    contractRef.hash);
  assert.equal(run.result.capabilityReceipt.probeResult,
    "accepted_schema_valid");
  assert.equal(run.inspection.calls.length, 1);
});

for (const [id, transportCode] of [
  ["payment-required-is-not-folded-into-ambiguous", "PROVIDER_PAYMENT_REQUIRED"],
  ["authentication-failure-is-not-folded-into-ambiguous",
    "PROVIDER_AUTHENTICATION_FAILED"],
]) {
  await check(`r2.${id}`, async () => {
    const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({
      send: async () => {
        const error = new Error(transportCode);
        error.code = transportCode;
        error.safeReceipt = {
          requestDefinitelyNotSent: false,
          requestMayHaveBeenSent: true,
          physicalAttempts: 1,
          status: transportCode === "PROVIDER_PAYMENT_REQUIRED" ? 402 : 403,
        };
        throw error;
      },
      now: () => NOW,
    });
    await assert.rejects(async () => adapter.complete({
      egressBinding: binding,
      capabilityReceipt,
      outputContract: contract,
      providerRequest: request(),
    }), (error) => error.code === transportCode
      && error.safeReceipt.requestMayHaveBeenSent === true);
  });
}

const report = {
  schemaVersion: "ticket_18_slice_174_r2_adapter_report_v1",
  ticket: 18,
  slice: 174,
  workpoint: "174-R2",
  passed: checks.every((row) => row.passed),
  checks,
  outputContractRef: contractRef,
  networkUsed: false,
  paidProviderCalls: 0,
  trainingTruth: false,
};
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ report: REPORT_PATH, passed: report.passed,
  checks: checks.length }));
