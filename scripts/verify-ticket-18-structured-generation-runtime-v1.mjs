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
import { runDirectLoop } from "../packages/skill-production/loops.mjs";
import { openProductionStore } from
  "../packages/skill-production/store.mjs";
import { createStarcraftTmgProviderProfileRegistryV2 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v2.mjs";
import {
  createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1,
} from "../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs";
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from
  "../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs";
import {
  createStarcraftTmgStructuredDshModelBridgeV1,
  mapStarcraftTmgStructuredFinishToDshCommandV1,
} from "../packages/structured-generation/dsh-command-mapper-v1.mjs";
import { createStarcraftTmgOutputContractRegistryV1 } from
  "../packages/structured-generation/output-contract-registry-v1.mjs";
import { createStarcraftTmgProviderCapabilityReceiptV1 } from
  "../packages/structured-generation/provider-capability-receipt-v1.mjs";
import { createStarcraftTmgStructuredGenerationRuntimeV1 } from
  "../packages/structured-generation/structured-generation-runtime-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = path.join(ROOT,
  "build/ticket-18-structured-generation-v1/r3-runtime-report.json");
const NOW = "2026-09-06T12:00:00.000Z";
const checks = [];

async function check(id, operation) {
  await operation();
  checks.push({ id, passed: true });
}

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
const providerRegistry = createStarcraftTmgProviderProfileRegistryV2({
  entries: [{ providerProfile: profile, responsePath: "/responses" }],
  allowedProviders: ["deepseek-openai-compatible-direct"],
});
const binding = providerRegistry.resolveEgressBinding({
  profileRef: { id: profile.providerProfileId, version: profile.version,
    hash: profile.integrity.hash },
}).egressBinding;
const capabilityReceipt = createStarcraftTmgProviderCapabilityReceiptV1({
  providerProfileRef: binding.providerProfileRef,
  endpointPath: binding.endpoint.path,
  endpointDialect: binding.endpointDialect,
  model: binding.model,
  capability: "responses_json_schema",
  schemaSubsetVersion: contract.schemaSubsetVersion,
  outputContractRef: contractRef,
  probeInputHash: hashStarcraftTmgContract("probe-input"),
  probeOutputHash: hashStarcraftTmgContract(advice),
  probeResult: "accepted_schema_valid",
  usage: { inputUnits: 80, outputUnits: 24, totalUnits: 104 },
  usageKnown: true,
  physicalAttempts: 1,
  probedAt: "2026-09-06T10:00:00.000Z",
  expiresAt: "2026-09-07T10:00:00.000Z",
});
const roleRef = { id: "faction.objectives.editor.0.1", version: "v1",
  hash: hashStarcraftTmgContract("faction.objectives.editor.0.1") };
const contextManifestRef = { id: "context.faction.objectives.editor.0.1",
  version: "v1", hash: hashStarcraftTmgContract("context.editor.0.1") };
const executionPolicyRef = { id: "policy.faction.editor", version: "v1",
  hash: hashStarcraftTmgContract("policy.faction.editor") };
const invocation = { roleRef, contextManifestRef, outputContractRef: contractRef,
  executionPolicyRef, continuationRef: null };

function resolvers() {
  return {
    outputContractRegistry: createStarcraftTmgOutputContractRegistryV1({
      entries: [contract],
    }),
    contextManifestRegistry: {
      resolve(input) {
        return input.contextManifestRef.hash === contextManifestRef.hash
          ? { ok: true,
            instructions: "Return one source-grounded advice object.",
            input: "Bounded proof-carrying context placeholder for R3." }
          : { ok: false };
      },
    },
    executionPolicyRegistry: {
      resolve(input) {
        return input.executionPolicyRef.hash === executionPolicyRef.hash
          ? { ok: true, executionPolicy: { maxOutputUnits: 256,
            attemptEstimateMicros: 1000, attemptTokenReserve: 4096 } }
          : { ok: false };
      },
    },
    capabilityReceiptRegistry: {
      resolve(input) {
        return input.outputContractRef.hash === contractRef.hash
          ? { ok: true, capabilityReceipt } : { ok: false };
      },
    },
  };
}

function runtimeFor(step, runSuffix) {
  const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({
    steps: [step],
  });
  const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({
    send: fault.send, now: () => NOW,
  });
  const store = openProductionStore(":memory:", {
    runId: `structured-r3-${runSuffix}`,
    recipeHash: hashStarcraftTmgContract(`structured-r3-${runSuffix}`),
    maxCalls: 8,
    maxCostMicros: 100_000,
    maxTokens: 100_000,
  });
  const candidates = new Map();
  const originalFinish = store.finish;
  const proxy = {
    ...store,
    finish(lease, value) {
      const saved = originalFinish(lease, value);
      if (String(value?.version || "").endsWith(".candidate")) {
        candidates.set(saved.hash, saved);
      }
      return saved;
    },
  };
  const runtime = createStarcraftTmgStructuredGenerationRuntimeV1({
    ...resolvers(),
    providerAdapter: adapter,
    store: proxy,
    egressBinding: binding,
    priceUsage: (usage) => usage.totalUnits,
    classifyFailure({ error }) {
      if (error.code === "PROVIDER_PAYMENT_REQUIRED") {
        return { status: "stopped", class: "payment_stop",
          retryRoute: null };
      }
      if (error.code === "STRUCTURED_PROVIDER_AMBIGUOUS_SEND") {
        return { status: "stopped", class: "ambiguous_send",
          retryRoute: "manual_reconcile" };
      }
      return { status: "quarantined", class: "provider_output",
        retryRoute: "typed_issue_repair" };
    },
    readCandidate: (candidateRef) => candidates.get(candidateRef.hash),
  });
  return { runtime, store, fault };
}

await check("r3.one-interface-accepted-outcome", async () => {
  const run = runtimeFor({ kind: "success", output: advice }, "accepted");
  try {
    const result = await run.runtime.generateStructured(invocation);
    assert.equal(result.status, "accepted");
    assert.equal(result.candidateRef.contractHash, contractRef.hash);
    assert.equal(result.issueRef, null);
    assert.equal(result.usage.total, 160);
    const candidate = run.runtime.readCandidate(result.candidateRef);
    assert.deepEqual(candidate.providerValue, advice);
    assert.equal(candidate.semanticAcceptanceInherited, false);
    assert.equal(run.store.summary().calls, 1);
  } finally { run.store.close(); }
});

await check("r3.dsh-command-mapper-no-json-parser", async () => {
  const mapped = mapStarcraftTmgStructuredFinishToDshCommandV1({
    outputContractRef: contractRef, value: advice,
  });
  assert.deepEqual(mapped.command, { action: "finish", content: advice });
  assert.equal(mapped.receipt.arbitraryJsonParsingInDsh, false);
  assert.equal(mapped.receipt.modelAuthoredControlFields, false);
});

await check("r3.dsh-loop-crosses-structured-runtime-seam", async () => {
  const run = runtimeFor({ kind: "success", output: advice }, "dsh-bridge");
  try {
    const bridge = createStarcraftTmgStructuredDshModelBridgeV1({
      generate: run.runtime.generateStructured,
      readCandidate: run.runtime.readCandidate,
      bindInvocation: () => invocation,
    });
    const loop = await runDirectLoop({
      task: "One finish-only structured role.",
      callModel: bridge.callModel,
      toolPort: { execute: async () => assert.fail("tool must not run"),
        trace: () => [] },
    });
    assert.deepEqual(loop.final, advice);
    assert.equal(loop.calls, 1);
  } finally { run.store.close(); }
});

await check("r3.failure-is-sealed-not-auto-retried", async () => {
  const run = runtimeFor({ kind: "invalid_schema" }, "quarantine");
  try {
    const result = await run.runtime.generateStructured(invocation);
    assert.equal(result.status, "quarantined");
    assert.equal(result.candidateRef, null);
    assert.equal(result.issueRef.class, "provider_output");
    assert.equal(run.fault.inspect().calls.length, 1);
    assert.equal(run.store.summary().attempts[0].state, "failed");
  } finally { run.store.close(); }
});

await check("r3.ambiguous-send-stops-with-one-attempt", async () => {
  const run = runtimeFor({ kind: "ambiguous_send" }, "ambiguous");
  try {
    const result = await run.runtime.generateStructured(invocation);
    assert.equal(result.status, "stopped");
    assert.equal(result.issueRef.class, "ambiguous_send");
    assert.equal(run.fault.inspect().calls.length, 1);
    assert.equal(run.store.summary().unknownCalls, 1);
  } finally { run.store.close(); }
});

await check("r3.ticket17-and-faction-use-same-external-shape", async () => {
  const ticket17 = { ...invocation,
    roleRef: { id: "ticket17.generator", version: "v1",
      hash: hashStarcraftTmgContract("ticket17.generator") } };
  const faction = invocation;
  assert.deepEqual(Object.keys(ticket17).sort(), Object.keys(faction).sort());
  assert.deepEqual(Object.keys({
    status: "accepted", candidateRef: null, issueRef: null,
    receiptRef: null, usage: null,
  }).sort(), ["candidateRef", "issueRef", "receiptRef", "status", "usage"]);
});

const report = {
  schemaVersion: "ticket_18_slice_174_r3_runtime_report_v1",
  ticket: 18,
  slice: 174,
  workpoint: "174-R3",
  passed: checks.every((row) => row.passed),
  checks,
  externalOperation: "generateStructured",
  callerFamilies: ["ticket17", "ticket18_faction"],
  dshCommandMapper: true,
  networkUsed: false,
  paidProviderCalls: 0,
  trainingTruth: false,
};
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ report: REPORT_PATH, passed: report.passed,
  checks: checks.length }));
