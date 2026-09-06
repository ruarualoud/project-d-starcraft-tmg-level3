#!/usr/bin/env node

import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from
  "../content/skill-generation/offline-provider-profile-v1.mjs";
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V1 as contract,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V1 as contractRef } from
  "../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV2 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v2.mjs";
import { runDirectLoop } from "../packages/skill-production/loops.mjs";
import { hash, seal, sha256, verifySeal } from
  "../packages/skill-production/common.mjs";
import { openProductionStore } from "../packages/skill-production/store.mjs";
import { createFactionReviewContextCapsuleV1 } from
  "../packages/skill-production-v3/faction-review-context-capsule-v1.mjs";
import { createFactionReviewTargetsV1 } from
  "../packages/skill-production-v3/faction-review-targets-v1.mjs";
import { createFactionWritingPlanV1 } from
  "../packages/skill-production-v3/faction-strategy-workflow-v1.mjs";
import { createFactionStructuredReviewRuntimeV1,
  deriveFactionLegacyStructuredReviewRoleIdsV1,
  materializeFactionStructuredReviewV1 } from
  "../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs";
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from
  "../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs";
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from
  "../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs";
import { createStarcraftTmgProviderCapabilityReceiptV1 } from
  "../packages/structured-generation/provider-capability-receipt-v1.mjs";
import { assertStarcraftTmgProviderCapabilityReceiptV1 } from
  "../packages/structured-generation/provider-capability-receipt-v1.mjs";
import { STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION } from
  "../packages/structured-generation/output-contract-registry-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = path.join(ROOT,
  "build/ticket-18-structured-generation-v1/r6-structured-review-runtime-readiness.json");
const CODE_FILES = [
  "content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs",
  "packages/skill-production-v3/faction-review-context-capsule-v1.mjs",
  "packages/skill-production-v3/faction-structured-review-runtime-v1.mjs",
  "scripts/run-ticket-18-structured-review-capability-canary-v1.mjs",
  "scripts/verify-ticket-18-faction-structured-review-runtime-v1.mjs",
];
const checks = [];
async function check(id, operation) {
  await operation(); checks.push({ id, passed: true });
}

const capabilityReport = verifySeal(JSON.parse(await readFile(path.join(ROOT,
  "build/ticket-18-structured-generation-v1/r6-structured-review-capability-report.json"),
"utf8")));
const capabilityRoot = path.join(ROOT, "build/ticket-18-structured-generation-v1",
  capabilityReport.runId);
const actualCapabilityReceipt = assertStarcraftTmgProviderCapabilityReceiptV1(
  JSON.parse(await readFile(path.join(capabilityRoot,
    "capability-receipt.json"), "utf8")));

const input = verifySeal(JSON.parse(await readFile(path.join(ROOT,
  "build/ticket-18-faction-production-v1/terran_armed_forces-input.json"),
"utf8")));
const db = new DatabaseSync(path.join(ROOT,
  "build/ticket-17-production-redesign-v1/production.sqlite"),
{ readOnly: true });
let corrected;
try {
  corrected = verifySeal(JSON.parse(db.prepare(
    "SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'",
  ).get("faction-v1-9a88d1a1008f0bb079ba",
    "faction.terran_armed_forces.objectives.1.known-rule-correction")
    .artifact)).value;
} finally { db.close(); }
const section = createFactionWritingPlanV1(input).sections.find((row) =>
  row.id === "faction.terran_armed_forces.objectives.1");
const draft = corrected.draft;
const reviewIndices = [0, 1];
const requiredSourceRefs = [];
const targets = createFactionReviewTargetsV1({ input, section, draft,
  indices: reviewIndices });
const roleId = `${section.id}.review-target-batch-v1.supportive.2.0.source-evidence-v1.3f8eeb087607ebe8f490`;
const packet = seal({ id: "faction.terran_armed_forces",
  inputHash: input.hash, sourceBinding: input.sourceBinding });
const roleRef = { id: roleId.replace(/\.source-evidence-v1\.[a-f0-9]{20}$/u, ""),
  version: "structured-review-v1",
  hash: hash(`${roleId.replace(/\.source-evidence-v1\.[a-f0-9]{20}$/u, "")}.structured-review-v1`) };
const capsule = createFactionReviewContextCapsuleV1({ factionInput: input,
  section, draft, reviewIndices, coverageRequiredSourceRefs: requiredSourceRefs,
  targets, roleRef, outputContractRef: contractRef, route: "supportive" });
const registry = createStarcraftTmgProviderProfileRegistryV2({
  entries: [{ providerProfile: profile, responsePath: "/responses" }],
  allowedProviders: ["deepseek-openai-compatible-direct"],
});
const binding = registry.resolveEgressBinding({
  profileRef: { id: profile.providerProfileId, version: profile.version,
    hash: profile.integrity.hash },
}).egressBinding;
const now = new Date();
const capabilityReceipt = createStarcraftTmgProviderCapabilityReceiptV1({
  providerProfileRef: binding.providerProfileRef,
  endpointPath: binding.endpoint.path,
  endpointDialect: binding.endpointDialect,
  model: binding.model,
  capability: "responses_json_schema",
  schemaSubsetVersion: STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION,
  outputContractRef: contractRef,
  probeInputHash: hash("structured-review-fixture-probe-input"),
  probeOutputHash: hash("structured-review-fixture-probe-output"),
  probeResult: "accepted_schema_valid",
  usage: { inputUnits: 10, outputUnits: 10, totalUnits: 20 },
  usageKnown: true,
  physicalAttempts: 1,
  probedAt: now.toISOString(),
  expiresAt: new Date(now.getTime() + 60_000).toISOString(),
});
const policy = { maxOutputUnits: 2_048, attemptEstimateMicros: 100_000,
  attemptTokenReserve: 150_000, allowDefinitelyNotSentRetry: false,
  allowOneCapacityRetry: false, idempotentRetrySupported: false,
  encryptedRawQuarantineAvailable: false };
const sourceSlot = (ref) => capsule.localIssue.reviewTask.sourceCatalogue
  .find((row) => row.ref === ref)?.slot;
const providerOutput = { verdicts: targets.targets.map((target, targetSlot) => ({
  targetSlot,
  focus: [{ path: target.fields[0].path,
    quote: target.fields[0].text.slice(0, 240) }],
  verdict: "supported",
  reason: "Fixture source-bound judgment; semantic truth is not claimed.",
  sourceSlots: [sourceSlot(target.recommendation.sourceRefs[0])],
})), coverage: [] };
const request = { packet, roleId,
  instruction: "Fixture review task.",
  workspace: { inputHash: input.hash, section, draft, reviewIndices,
    coverageRequiredSourceRefs: requiredSourceRefs,
    outputRequestAtEnd: { targetContract: targets,
      coverageOnlySourceRefs: requiredSourceRefs } } };

await check("review.actual-contract-capability-probe", async () => {
  assert.equal(capabilityReport.passed, true);
  assert.equal(capabilityReport.failure, null);
  assert.equal(capabilityReport.paidCallsThisExecution, 1);
  assert.equal(capabilityReport.automaticRetries, 0);
  assert(capabilityReport.ledger.knownTokens <= 50_000);
  assert(capabilityReport.ledger.reservedOrSettledMicros <= 100_000);
  assert.equal(capabilityReport.capabilityReceiptHash,
    actualCapabilityReceipt.receiptHash);
  assert.equal(actualCapabilityReceipt.outputContractRef.hash,
    contractRef.hash);
});

await check("review.contract-and-complete-context-capsule", async () => {
  assert(capsule.compiledInputBytes <= 512 * 1024);
  assert.equal(capsule.immutableBase.completeCoreFaqIncluded, true);
  assert.equal(capsule.immutableBase.completeCurrentFactionProductsIncluded,
    true);
  assert.equal(capsule.dependencyGraph.dependencyCatalogueComplete, true);
  assert(capsule.localIssue.reviewTask.includedSourceSlots.includes(
    sourceSlot(targets.targets[0].recommendation.sourceRefs[0])));
});

await check("review.host-materializes-identities-without-changing-judgments", async () => {
  const result = materializeFactionStructuredReviewV1({ providerOutput,
    capsule, input, section, draft, reviewIndices,
    requiredSourceRefs, targets });
  assert.deepEqual(result.output.verdicts.map((row) => row.targetId),
    targets.targets.map((row) => row.targetId));
  assert.deepEqual(result.output.verdicts.map((row) => row.sourceRefs[0]),
    targets.targets.map((row) => row.recommendation.sourceRefs[0]));
  assert.equal(result.receipt.judgmentsChanged, false);
});

await check("review.one-structured-attempt-no-prompt-fallback", async () => {
  const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({
    steps: [{ kind: "success", output: providerOutput }],
  });
  const store = openProductionStore(":memory:", {
    runId: "structured-review-provider-test",
    recipeHash: hash("structured-review-provider-test"),
    maxCalls: 2, maxCostMicros: 500_000, maxTokens: 300_000,
  });
  try {
    const runtime = createFactionStructuredReviewRuntimeV1({ input,
      runtime: { role: async () => assert.fail("fallback invoked") },
      store, dsh: { run: runDirectLoop },
      providerAdapter: createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({
        send: fault.send,
      }),
      egressBinding: binding, capabilityReceipt, outputContract: contract,
      executionPolicy: policy, priceUsage: (usage) => usage.totalUnits,
    });
    const result = await runtime.role(request);
    assert.deepEqual(result.output.verdicts.map((row) => row.targetId),
      targets.targets.map((row) => row.targetId));
    assert.equal(result.structuredDecodePassed, true);
    assert.equal(result.loop.calls, 1);
    assert.equal(fault.inspect().calls.length, 1);
  } finally { store.close(); }
});

await check("review.duplicate-target-slot-fails-closed", async () => {
  const invalid = structuredClone(providerOutput);
  invalid.verdicts[1].targetSlot = 0;
  assert.throws(() => materializeFactionStructuredReviewV1({
    providerOutput: invalid, capsule, input, section, draft, reviewIndices,
    requiredSourceRefs, targets,
  }), { code: "FACTION_STRUCTURED_REVIEW_TARGET_SLOT_INVALID" });
});

await check("review.omitted-source-slot-fails-closed", async () => {
  const invalid = structuredClone(providerOutput);
  invalid.verdicts[0].sourceSlots = [capsule.localIssue.reviewTask.sourceCatalogue
    .find((row) => row.includedAs === "not_in_current_faction_scope").slot];
  assert.throws(() => materializeFactionStructuredReviewV1({
    providerOutput: invalid, capsule, input, section, draft, reviewIndices,
    requiredSourceRefs, targets,
  }), { code: "FACTION_STRUCTURED_REVIEW_SOURCE_SLOT_INVALID" });
});

await check("review.legacy-and-structured-lineage-routes-are-distinct", async () => {
  const full = `${packet.id}.${roleId}`;
  const canonical = full.replace(/\.source-evidence-v1\.[a-f0-9]{20}$/u, "");
  assert.deepEqual(deriveFactionLegacyStructuredReviewRoleIdsV1([
    { id: full, artifact: { structuredDecodePassed: false } },
    { id: full.replace("supportive", "adversarial"),
      artifact: { structuredDecodePassed: true } },
  ]), [canonical]);
  let delegated = 0;
  const store = openProductionStore(":memory:", {
    runId: "structured-review-legacy-test",
    recipeHash: hash("structured-review-legacy-test"),
    maxCalls: 1, maxCostMicros: 100_000, maxTokens: 100_000,
  });
  try {
    const runtime = createFactionStructuredReviewRuntimeV1({ input,
      runtime: { role: async () => { delegated += 1; return "legacy"; } },
      store, dsh: { run: runDirectLoop },
      providerAdapter: { complete: async () => assert.fail("provider") },
      egressBinding: binding, capabilityReceipt, outputContract: contract,
      executionPolicy: policy, priceUsage: () => 0,
      legacyStructuredReviewRoleIds: [canonical],
    });
    assert.equal(await runtime.role(request), "legacy");
    assert.equal(delegated, 1);
  } finally { store.close(); }
});

const report = seal({
  version: "ticket_18_slice_174_structured_review_runtime_readiness_v1",
  ticket: 18, slice: 174, passed: true, checks,
  actualFailureRunId: "faction-v1-f0e6c2aa6d65daad62c6",
  actualFailureCode: "PROVIDER_RESPONSE_JSON_INVALID",
  actualFailureDiagnosticHash:
    "04bc9ce28dd2ac97860510acab6c41eab23585f27af96c7bed62f61da84ddd79",
  actualCapabilityRunId: capabilityReport.runId,
  actualCapabilityReportHash: capabilityReport.hash,
  actualCapabilityReceiptHash: actualCapabilityReceipt.receiptHash,
  outputContractRef: contractRef,
  contextCapsuleBytes: capsule.compiledInputBytes,
  completeCoreFaqIncluded: true,
  completeCurrentFactionProductsIncluded: true,
  hostOwnedIdentityMaterialization: true,
  onePhysicalAttemptPerInvocation: true,
  codeHashes: await Promise.all(CODE_FILES.map(async (file) => ({
    file, hash: sha256(await readFile(path.join(ROOT, file))),
  }))),
  providerCalls: 0, sourceRefreshPerformed: false,
  semanticAcceptanceInherited: false, trainingTruth: false,
});
await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ passed: report.passed, checks: checks.length,
  contextCapsuleBytes: report.contextCapsuleBytes,
  providerCalls: report.providerCalls, hash: report.hash }));
