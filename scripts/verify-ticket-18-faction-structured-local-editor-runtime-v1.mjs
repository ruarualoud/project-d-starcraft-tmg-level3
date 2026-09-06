#!/usr/bin/env node

import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from
  "../content/skill-generation/offline-provider-profile-v1.mjs";
import {
  STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_V1 as contract,
} from "../content/skill-generation/ticket-18-faction-advice-editor-output-contract-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV2 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v2.mjs";
import { runDirectLoop } from "../packages/skill-production/loops.mjs";
import { hash, seal, sha256, verifySeal } from
  "../packages/skill-production/common.mjs";
import { openProductionStore } from "../packages/skill-production/store.mjs";
import { createFactionWritingPlanV1 } from
  "../packages/skill-production-v3/faction-strategy-workflow-v1.mjs";
import { isolateFactionLocalEditorIssueV1 } from
  "../packages/skill-production-v3/faction-local-editor-context-capsule-v1.mjs";
import {
  createFactionStructuredLocalEditorImportV1,
  createFactionStructuredLocalEditorRuntimeV1,
} from "../packages/skill-production-v3/faction-structured-local-editor-runtime-v1.mjs";
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from
  "../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs";
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from
  "../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD = path.join(ROOT, "build/ticket-18-structured-generation-v1");
const CANARY_RUN = "structured-canary-8402a3b34415b4c8b4b808c7f101e46f";
const reportPath = path.join(BUILD,
  "r6-structured-local-editor-runtime-readiness.json");
const checks = [];
const CODE_FILES = [
  "packages/skill-production/model.mjs",
  "packages/skill-production-v3/faction-continuation-v1.mjs",
  "packages/skill-production-v3/faction-local-editor-context-capsule-v1.mjs",
  "packages/skill-production-v3/faction-structured-local-editor-runtime-v1.mjs",
  "packages/structured-generation/output-contract-registry-v1.mjs",
  "packages/structured-generation/provider-capability-receipt-v1.mjs",
  "packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs",
  "packages/structured-generation/structured-generation-runtime-v1.mjs",
  "packages/structured-generation/dsh-command-mapper-v1.mjs",
  "packages/structured-generation/context-capsule-v1.mjs",
  "packages/structured-generation/failure-classifier-v1.mjs",
  "packages/secure-provider-runtime/provider-egress-contract-v2.mjs",
  "packages/secure-provider-runtime/provider-profile-registry-v2.mjs",
  "packages/secure-provider-runtime/structured-provider-egress-transport-v1.mjs",
  "packages/secure-provider-runtime/structured-provider-worker-child-v1.mjs",
  "packages/secure-provider-runtime/structured-provider-worker-port-v1.mjs",
  "content/skill-generation/ticket-18-faction-advice-editor-output-contract-v1.mjs",
  "scripts/run-ticket-18-faction-strategy-production-v1.mjs",
  "scripts/verify-ticket-18-faction-structured-local-editor-runtime-v1.mjs",
];
const json = async (file, sealed = true) => {
  const value = JSON.parse(await readFile(file, "utf8"));
  return sealed ? verifySeal(value) : value;
};
async function check(id, operation) {
  await operation(); checks.push({ id, passed: true });
}

const input = await json(path.join(ROOT,
  "build/ticket-18-faction-production-v1/terran_armed_forces-input.json"));
const canaryRoot = path.join(BUILD, CANARY_RUN);
const [canaryRecipe, canaryReport, canaryCapsule, canaryHost, canaryRaw,
  capabilityReceipt] = await Promise.all([
  json(path.join(canaryRoot, "recipe.json")),
  json(path.join(canaryRoot, "report.json")),
  json(path.join(canaryRoot, "context-capsule.json")),
  json(path.join(canaryRoot, "host-materialization.json")),
  json(path.join(canaryRoot, "raw-structured-advice.json"), false),
  json(path.join(canaryRoot, "capability-receipt.json"), false),
]);
const imported = createFactionStructuredLocalEditorImportV1({
  recipeRunId: CANARY_RUN,
  recipe: canaryRecipe,
  report: canaryReport,
  capsule: canaryCapsule,
  hostMaterialization: canaryHost,
  rawAdvice: canaryRaw,
  outputContract: contract,
});
const db = new DatabaseSync(path.join(ROOT,
  "build/ticket-17-production-redesign-v1/production.sqlite"),
{ readOnly: true });
let journal;
let corrected;
try {
  const artifact = (id) => verifySeal(JSON.parse(db.prepare(
    "SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'",
  ).get("faction-v1-9a88d1a1008f0bb079ba", id).artifact)).value;
  journal = artifact("faction.terran_armed_forces.objectives.1.issue-journal.0");
  corrected = artifact(
    "faction.terran_armed_forces.objectives.1.known-rule-correction");
} finally { db.close(); }
const section = createFactionWritingPlanV1(input).sections.find((row) =>
  row.id === "faction.terran_armed_forces.objectives.1");
const packet = seal({ id: "faction.terran_armed_forces",
  inputHash: input.hash, sourceBinding: input.sourceBinding });
const registry = createStarcraftTmgProviderProfileRegistryV2({
  entries: [{ providerProfile: profile, responsePath: "/responses" }],
  allowedProviders: ["deepseek-openai-compatible-direct"],
});
const binding = registry.resolveEgressBinding({
  profileRef: { id: profile.providerProfileId, version: profile.version,
    hash: profile.integrity.hash },
}).egressBinding;
const policy = { maxOutputUnits: 2_048, attemptEstimateMicros: 100_000,
  attemptTokenReserve: 40_000, allowDefinitelyNotSentRetry: false,
  allowOneCapacityRetry: false, idempotentRetrySupported: false,
  encryptedRawQuarantineAvailable: false };

function requestFor(issueOrdinal) {
  const localIssues = isolateFactionLocalEditorIssueV1({
    issues: journal.issues, issueOrdinal,
  });
  return {
    packet,
    roleId: `${section.id}.editor.0.${issueOrdinal}.source-evidence-v1.3f8eeb087607ebe8f490`,
    instruction: "One local editor test.",
    workspace: { inputHash: input.hash, section, draft: corrected.draft,
      parentHash: hash(corrected.draft), issues: localIssues,
      localIssue: localIssues.issues[0], allIssues: journal.issues },
  };
}

await check("r6.imports-exact-r5-canary-with-zero-new-provider-calls", async () => {
  const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [] });
  const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({
    send: fault.send,
  });
  const store = openProductionStore(":memory:", {
    runId: "structured-editor-import-test",
    recipeHash: hash("structured-editor-import-test"),
    maxCalls: 2, maxCostMicros: 500_000, maxTokens: 100_000,
  });
  try {
    const runtime = createFactionStructuredLocalEditorRuntimeV1({
      input, runtime: { role: async () => assert.fail("fallback invoked") },
      store, dsh: { run: runDirectLoop }, providerAdapter: adapter,
      egressBinding: binding, capabilityReceipt, outputContract: contract,
      executionPolicy: policy, priceUsage: (usage) => usage.totalUnits,
      imports: [imported],
    });
    const result = await runtime.role(requestFor(1));
    assert.deepEqual(result.output, canaryRaw);
    assert.equal(result.structuredImportHash, imported.hash);
    assert.equal(result.semanticAcceptance, false);
    assert.equal(fault.inspect().calls.length, 0);
    assert.equal(store.summary().calls, 0);
  } finally { store.close(); }
});

await check("r6.nonimported-editor-crosses-one-structured-runtime-seam", async () => {
  const output = structuredClone(corrected.draft.recommendations[4]);
  output.title += "（结构化测试）";
  const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({
    steps: [{ kind: "success", output }],
  });
  const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({
    send: fault.send,
  });
  const store = openProductionStore(":memory:", {
    runId: "structured-editor-provider-test",
    recipeHash: hash("structured-editor-provider-test"),
    maxCalls: 2, maxCostMicros: 500_000, maxTokens: 100_000,
  });
  try {
    const runtime = createFactionStructuredLocalEditorRuntimeV1({
      input, runtime: { role: async () => assert.fail("fallback invoked") },
      store, dsh: { run: runDirectLoop }, providerAdapter: adapter,
      egressBinding: binding, capabilityReceipt, outputContract: contract,
      executionPolicy: policy, priceUsage: (usage) => usage.totalUnits,
      imports: [imported],
    });
    const result = await runtime.role(requestFor(2));
    assert.deepEqual(result.output, output);
    assert.equal(result.structuredDecodePassed, true);
    assert.equal(result.loop.calls, 1);
    assert.equal(fault.inspect().calls.length, 1);
    assert.equal(store.summary().calls, 1);
  } finally { store.close(); }
});

await check("r6.non-editor-role-delegates-without-contract-guessing", async () => {
  let delegated = 0;
  const runtime = createFactionStructuredLocalEditorRuntimeV1({
    input, runtime: { role: async () => { delegated += 1; return "delegated"; } },
    store: openProductionStore(":memory:", {
      runId: "structured-editor-delegate-test",
      recipeHash: hash("structured-editor-delegate-test"),
      maxCalls: 2, maxCostMicros: 500_000, maxTokens: 100_000,
    }),
    dsh: { run: runDirectLoop },
    providerAdapter: { complete: async () => assert.fail("provider invoked") },
    egressBinding: binding, capabilityReceipt, outputContract: contract,
    executionPolicy: policy, priceUsage: (usage) => usage.totalUnits,
    imports: [imported],
  });
  assert.equal(await runtime.role({ roleId: `${section.id}.reasoner` }),
    "delegated");
  assert.equal(delegated, 1);
});

await check("r6.sealed-legacy-editor-delegates-before-structured-cutover", async () => {
  let delegated = 0;
  const request = requestFor(2);
  const fullRoleId = `${request.packet.id}.${request.roleId}`
    .replace(/\.source-evidence-v1\.[a-f0-9]{20}$/u, "");
  const store = openProductionStore(":memory:", {
    runId: "structured-editor-legacy-delegate-test",
    recipeHash: hash("structured-editor-legacy-delegate-test"),
    maxCalls: 2, maxCostMicros: 500_000, maxTokens: 100_000,
  });
  try {
    const runtime = createFactionStructuredLocalEditorRuntimeV1({
      input, runtime: { role: async () => { delegated += 1; return "legacy"; } },
      store, dsh: { run: runDirectLoop },
      providerAdapter: { complete: async () => assert.fail("provider invoked") },
      egressBinding: binding, capabilityReceipt, outputContract: contract,
      executionPolicy: policy, priceUsage: (usage) => usage.totalUnits,
      imports: [imported], legacyPromptRoleIds: [fullRoleId],
    });
    assert.equal(await runtime.role(request), "legacy");
    assert.equal(delegated, 1);
  } finally { store.close(); }
});

const readiness = seal({
  version: "ticket_18_slice_174_structured_local_editor_readiness_v1",
  ticket: 18,
  slice: 174,
  workpoint: "174-R6",
  passed: checks.every((row) => row.passed),
  checks,
  actualCanaryRunId: CANARY_RUN,
  actualCanaryReportHash: canaryReport.hash,
  actualCapabilityReceiptHash: capabilityReceipt.receiptHash,
  actualImportHash: imported.hash,
  outputContractRef: imported.outputContractRef,
  codeHashes: await Promise.all(CODE_FILES.map(async (file) => ({
    file,
    hash: sha256(await readFile(path.join(ROOT, file))),
  }))),
  providerCalls: 0,
  sourceRefreshPerformed: false,
  semanticAcceptanceInherited: false,
  trainingTruth: false,
});
await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(readiness, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ report: reportPath, passed: readiness.passed,
  checks: checks.length, actualImportHash: imported.hash,
  providerCalls: readiness.providerCalls }));
