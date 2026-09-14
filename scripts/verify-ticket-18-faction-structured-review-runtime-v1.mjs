#!/usr/bin/env node

import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from
  "../content/skill-generation/offline-provider-profile-v1.mjs";
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V1 as contractV1,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V1 as contractRefV1,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V2 as contractV2,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V2 as contractRefV2,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V3 as contractV3,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V3 as contractRefV3,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V4 as contract,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V4 as contractRef,
  STARCRAFT_TMG_FACTION_REVIEW_CONTRACT_MIGRATION_V1_TO_V2 as historicalContractMigration,
  STARCRAFT_TMG_FACTION_REVIEW_CONTRACT_MIGRATION_V2_TO_V3 as intermediateContractMigration,
  STARCRAFT_TMG_FACTION_REVIEW_CONTRACT_MIGRATION_V3_TO_V4 as contractMigration } from
  "../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV2 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v2.mjs";
import { runDirectLoop } from "../packages/skill-production/loops.mjs";
import { hash, seal, sha256, verifySeal } from
  "../packages/skill-production/common.mjs";
import { openProductionStore } from "../packages/skill-production/store.mjs";
import { createFactionReviewContextCapsuleV1,
  createFactionReviewOutputCapRecoveryContextCapsuleV1 } from
  "../packages/skill-production-v3/faction-review-context-capsule-v1.mjs";
import { createFactionReviewTargetsV1 } from
  "../packages/skill-production-v3/faction-review-targets-v1.mjs";
import { createFactionWritingPlanV1 } from
  "../packages/skill-production-v3/faction-strategy-workflow-v1.mjs";
import { createFactionStructuredReviewRuntimeV1,
  createFactionStructuredReviewOutputCapFailureImportV1,
  createFactionStructuredReviewOutputCapSuccessImportV1,
  deriveFactionLegacyStructuredReviewRoleIdsV1,
  materializeFactionStructuredReviewV1,
  verifyFactionStructuredReviewSchemaRepairScopeV1 } from
  "../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs";
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from
  "../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs";
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from
  "../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs";
import { createStarcraftTmgProviderCapabilityReceiptV1 } from
  "../packages/structured-generation/provider-capability-receipt-v1.mjs";
import { assertStarcraftTmgProviderCapabilityReceiptV1 } from
  "../packages/structured-generation/provider-capability-receipt-v1.mjs";
import { STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION,
  validateStarcraftTmgProviderJsonSchemaValueV1 } from
  "../packages/structured-generation/output-contract-registry-v1.mjs";
import { contextManifestRefStarcraftTmgV1 } from
  "../packages/structured-generation/context-capsule-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = path.join(ROOT,
  "build/ticket-18-structured-generation-v1/r6-structured-review-runtime-readiness.json");
const CODE_FILES = [
  "content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs",
  "packages/skill-production-v3/faction-review-context-capsule-v1.mjs",
  "packages/skill-production-v3/faction-structured-review-runtime-v1.mjs",
  "packages/skill-production-v3/faction-continuation-v1.mjs",
  "packages/skill-production-v3/faction-strategy-workflow-v1.mjs",
  "packages/secure-provider-runtime/provider-response-outcome-v1.mjs",
  "packages/structured-generation/output-contract-registry-v1.mjs",
  "packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs",
  "packages/structured-generation/structured-generation-runtime-v1.mjs",
  "scripts/run-ticket-18-faction-strategy-production-v1.mjs",
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
let corrected, actualBoundaryCandidate, actualV2BoundaryCandidate,
  actualV3BoundaryCandidate,
  actualCapacityUsage,
  actualCapacityFailure, actualCeilingUsage, actualCeilingFailure,
  actualWireFailure, actualCompactCandidate, actualCompactRuntimeReceipt,
  actualCompactAttempt;
try {
  corrected = verifySeal(JSON.parse(db.prepare(
    "SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'",
  ).get("faction-v1-9a88d1a1008f0bb079ba",
    "faction.terran_armed_forces.objectives.1.known-rule-correction")
    .artifact)).value;
  actualBoundaryCandidate = verifySeal(JSON.parse(db.prepare(
    "SELECT artifact FROM steps WHERE run=? AND id LIKE ? AND state='complete'",
  ).get("faction-v1-38cff03b5a47b54b6573",
    "structured-%.rejected-candidate").artifact)).value;
  actualV2BoundaryCandidate = verifySeal(JSON.parse(db.prepare(
    "SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'",
  ).get("faction-v1-3d2d9aba32a329115cbc",
    "structured-da764e78ec169cce7cc14c2837db1f6e8856bd845610933c.rejected-candidate")
    .artifact)).value;
  actualV3BoundaryCandidate = verifySeal(JSON.parse(db.prepare(
    "SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'",
  ).get("faction-v1-540b0fa661c00b3d3bdc",
    "structured-bd771c45d80b8b4092a72c977ff8930bb49fe965bfd83c5e.rejected-candidate")
    .artifact)).value;
  const capacityRow = db.prepare(
    "SELECT usage,response FROM attempts WHERE run=? AND code=?",
  ).get("faction-v1-ad5d16565e2b118d830a",
    "STRUCTURED_PROVIDER_INCOMPLETE");
  actualCapacityUsage = verifySeal(JSON.parse(capacityRow.usage)).value;
  actualCapacityFailure = verifySeal(JSON.parse(capacityRow.response)).value;
  const ceilingRow = db.prepare(
    "SELECT usage,response FROM attempts WHERE run=? AND code=?",
  ).get("faction-v1-64dfe1d35c4921569be7",
    "STRUCTURED_PROVIDER_INCOMPLETE");
  actualCeilingUsage = verifySeal(JSON.parse(ceilingRow.usage)).value;
  actualCeilingFailure = verifySeal(JSON.parse(ceilingRow.response)).value;
  const wireRow = db.prepare(
    "SELECT response FROM attempts WHERE run=? AND response LIKE ?",
  ).get("faction-v1-58dc727c7ae7ce8cece5",
    "%provider_json_not_parseable%");
  actualWireFailure = verifySeal(JSON.parse(wireRow.response)).value;
  const compactAttempt = db.prepare(
    "SELECT id,request_hash,usage,response FROM attempts WHERE run=? AND state='received' AND code IS NULL",
  ).get("faction-v1-cd070778679108170434");
  actualCompactAttempt = {
    ...compactAttempt,
    usage: verifySeal(JSON.parse(compactAttempt.usage)),
    response: verifySeal(JSON.parse(compactAttempt.response)),
  };
  actualCompactCandidate = verifySeal(JSON.parse(db.prepare(
    "SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'",
  ).get("faction-v1-cd070778679108170434",
    `${compactAttempt.id}.candidate`).artifact)).value;
  actualCompactRuntimeReceipt = verifySeal(JSON.parse(db.prepare(
    "SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'",
  ).get("faction-v1-cd070778679108170434",
    `${compactAttempt.id}.runtime-receipt`).artifact)).value;
} finally { db.close(); }
const actualCompactParentRecipe = verifySeal(JSON.parse(await readFile(
  path.join(ROOT, "build/ticket-18-faction-production-v1",
    "faction-v1-cd070778679108170434/recipe.json"), "utf8")));
const actualCompactOriginPermit =
  actualCompactParentRecipe.continuation.outputCapRecoveryImports[0];
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
const policy = { maxOutputUnits: 4_096, attemptEstimateMicros: 100_000,
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

await check("review.v1-v2-v3-frozen-v4-uses-whole-response-reason-bound", async () => {
  assert.equal(contractRefV1.hash,
    "ac4f185c7c8dc7ae13f49036dc771939a5e321687b19ef93506ec76febbef5a8");
  assert.equal(contractRefV2.hash,
    "00acc1f9562701e799e4e4056a5f30feb772b30bd34b0b146f815281c4a20315");
  assert.equal(historicalContractMigration.from.hash, contractRefV1.hash);
  assert.equal(historicalContractMigration.to.hash, contractRefV2.hash);
  assert.equal(contractRefV3.hash,
    "3f94f7ca7e348d92d2f17f23136e708012171277be664d33e03fd226835b9023");
  assert.equal(intermediateContractMigration.from.hash, contractRefV2.hash);
  assert.equal(intermediateContractMigration.to.hash, contractRefV3.hash);
  assert.equal(contractMigration.from.hash, contractRefV3.hash);
  assert.equal(contractMigration.to.hash, contractRef.hash);
  assert.deepEqual(contractMigration.changes, [{
    path: "$.properties.verdicts.items.properties.reason.maxLength",
    before: 1_200, after: 16_384,
    kind: "whole_response_bounded_string_safety_envelope",
  }, {
    path: "$.properties.coverage.items.properties.reason.maxLength",
    before: 400, after: 16_384,
    kind: "whole_response_bounded_string_safety_envelope",
  }]);
  assert.equal(actualBoundaryCandidate.outputContractRef.hash,
    contractRefV1.hash);
  assert.equal(actualBoundaryCandidate.providerValue.verdicts[1].reason.length,
    403);
  assert.equal(validateStarcraftTmgProviderJsonSchemaValueV1(
    contractV1.providerSchema,
    actualBoundaryCandidate.providerValue).ok, false);
  assert.equal(validateStarcraftTmgProviderJsonSchemaValueV1(
    contractV2.providerSchema,
    actualBoundaryCandidate.providerValue).ok, true);
  assert.deepEqual(actualV2BoundaryCandidate.providerValue.verdicts
    .map((row) => row.reason.length), [1_022, 854]);
  assert.equal(validateStarcraftTmgProviderJsonSchemaValueV1(
    contractV2.providerSchema,
    actualV2BoundaryCandidate.providerValue).ok, false);
  assert.equal(validateStarcraftTmgProviderJsonSchemaValueV1(
    contractV3.providerSchema,
    actualV2BoundaryCandidate.providerValue).ok, true);
  assert.deepEqual(actualV3BoundaryCandidate.providerValue.verdicts
    .map((row) => row.reason.length), [1_401, 1_237]);
  assert.equal(actualV3BoundaryCandidate.providerValue.coverage[0].reason
    .length, 459);
  assert.equal(validateStarcraftTmgProviderJsonSchemaValueV1(
    contractV3.providerSchema,
    actualV3BoundaryCandidate.providerValue).ok, false);
  assert.equal(validateStarcraftTmgProviderJsonSchemaValueV1(
    contract.providerSchema,
    actualV3BoundaryCandidate.providerValue).ok, true);
  assert.equal(contractMigration.wholeResponseMaxOutputUnits,
    policy.maxOutputUnits);
});

await check("review.actual-2048-incomplete-authorizes-one-4096-continuation", async () => {
  assert.equal(actualCapacityFailure.code,
    "STRUCTURED_PROVIDER_INCOMPLETE");
  assert.equal(actualCapacityFailure.incompleteReason, "max_output_tokens");
  assert.equal(actualCapacityFailure.outputContractRef.hash,
    contractRefV2.hash);
  assert.equal(actualCapacityFailure.automaticRetries, 0);
  assert.equal(actualCapacityUsage.outputUnits, 2_048);
  assert.equal(policy.maxOutputUnits, 4_096);
  assert.equal(policy.allowOneCapacityRetry, false);
  assert.match(await readFile(path.join(ROOT,
    "scripts/run-ticket-18-faction-strategy-production-v1.mjs"), "utf8"),
  /structuredReviewPolicy = Object\.freeze\(\{ maxOutputUnits: 4096,/u);
});

await check("review.actual-4096-cap-enables-one-compact-recovery", async () => {
  assert.equal(actualCeilingFailure.code,
    "STRUCTURED_PROVIDER_INCOMPLETE");
  assert.equal(actualCeilingFailure.incompleteReason, "max_output_tokens");
  assert.equal(actualCeilingFailure.outputContractRef.hash, contractRef.hash);
  assert.equal(actualCeilingFailure.capabilityReceiptHash,
    actualCapabilityReceipt.receiptHash);
  assert.equal(actualCeilingFailure.automaticRetries, 0);
  assert.equal(actualCeilingUsage.outputUnits, 4_096);
  assert.equal(actualCeilingFailure.status, 200);
  assert.equal(actualCeilingFailure.requestMayHaveBeenSent, true);
});

await check("review.actual-settled-compact-success-is-importable", async () => {
  const imported = createFactionStructuredReviewOutputCapSuccessImportV1({
    parentRunId: "faction-v1-cd070778679108170434",
    fullRoleId: actualCompactOriginPermit.fullRoleId,
    originIssueHash: actualCompactOriginPermit.originIssueHash,
    originAttemptId: actualCompactAttempt.id,
    originRequestHash: actualCompactAttempt.request_hash,
    candidate: actualCompactCandidate,
    runtimeReceipt: actualCompactRuntimeReceipt,
    providerResponse: actualCompactAttempt.response.value,
    usage: actualCompactAttempt.usage.value,
    usageHash: actualCompactAttempt.usage.hash,
  });
  assert.equal(imported.originalProviderCallSettled, true);
  assert.equal(imported.originalProviderCallsReplayed, 0);
  assert.equal(imported.originalUsage.outputUnits, 1_065);
  assert.equal(imported.candidate.providerValue.verdicts[0].reason.length, 629);
  assert.equal(imported.semanticAcceptanceInherited, false);
});

await check("review.actual-wire-failure-enables-lossless-normalizer-not-prompt-retry", async () => {
  assert.equal(actualWireFailure.code,
    "STRUCTURED_PROVIDER_SCHEMA_INVALID");
  assert.equal(actualWireFailure.status, 200);
  assert.deepEqual(actualWireFailure.schemaIssues,
    [{ path: "$", code: "provider_json_not_parseable" }]);
  assert.match(actualWireFailure.outputTextHash, /^[a-f0-9]{64}$/u);
  assert.equal(actualWireFailure.automaticRetries, 0);
  assert.equal(actualWireFailure.outputContractRef.hash, contractRefV2.hash);
});

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
  const verbose = structuredClone(providerOutput);
  verbose.verdicts[0].reason = "R".repeat(1_546);
  assert.throws(() => materializeFactionStructuredReviewV1({
    providerOutput: verbose, capsule, input, section, draft, reviewIndices,
    requiredSourceRefs, targets,
  }), { code: "TEXT_INVALID" });
  assert.equal(materializeFactionStructuredReviewV1({
    providerOutput: verbose, capsule, input, section, draft, reviewIndices,
    requiredSourceRefs, targets, reviewReasonMaximum: 16_384,
  }).output.verdicts[0].reason.length, 1_546);
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

await check("review.one-explicit-compact-recovery-after-output-cap", async () => {
  const compactBoundaryOutput = structuredClone(providerOutput);
  compactBoundaryOutput.verdicts[0].reason = "R".repeat(629);
  const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({
    steps: [{ kind: "incomplete", reason: "max_output_tokens",
      usage: { input_tokens: 120,
        input_tokens_details: { cached_tokens: 0 },
        output_tokens: 4_096,
        output_tokens_details: { reasoning_tokens: 0 },
        total_tokens: 4_216 } },
    { kind: "success", output: compactBoundaryOutput,
      usage: { input_tokens: 120,
        input_tokens_details: { cached_tokens: 0 },
        output_tokens: 1_065,
        output_tokens_details: { reasoning_tokens: 0 },
        total_tokens: 1_185 } }],
  });
  const store = openProductionStore(":memory:", {
    runId: "structured-review-output-cap-recovery-test",
    recipeHash: hash("structured-review-output-cap-recovery-test"),
    maxCalls: 3, maxCostMicros: 500_000, maxTokens: 300_000,
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
      allowBoundedOutputCapRecovery: true,
    });
    const result = await runtime.role(request);
    assert.equal(result.structuredDecodePassed, true);
    assert.equal(result.outputCapRecoveryReceipt.explicitRecoveryCalls, 1);
    assert.equal(result.outputCapRecoveryReceipt.originalAttemptReplayed, false);
    assert.equal(result.outputCapRecoveryReceipt.semanticAcceptanceInherited,
      false);
    assert.equal(result.outputCapRecoveryReceipt
      .requestedMaximumReasonCharacters, 600);
    assert.equal(result.outputCapRecoveryReceipt
      .acceptedMaximumReasonCharacters, 800);
    assert.equal(result.outputCapRecoveryReceipt
      .acceptedMaximumOutputUnits, 3_072);
    assert.equal(result.outputCapRecoveryReceipt
      .observedRecoveryOutputUnits, 1_065);
    assert.equal(fault.inspect().calls.length, 2);
    assert.notEqual(fault.inspect().calls[0].requestId,
      fault.inspect().calls[1].requestId);
    assert.equal(store.summary().attempts.filter((row) =>
      row.code === "STRUCTURED_PROVIDER_INCOMPLETE").length, 1);
  } finally { store.close(); }
});

await check("review.compact-recovery-hard-bounds-reject-without-truncation",
  async () => {
    for (const [name, output, outputTokens] of [["reason",
      (() => { const value = structuredClone(providerOutput);
        value.verdicts[0].reason = "R".repeat(801); return value; })(), 500],
    ["response", providerOutput, 3_073]]) {
      const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({
        steps: [{ kind: "incomplete", reason: "max_output_tokens",
          usage: { input_tokens: 120,
            input_tokens_details: { cached_tokens: 0 },
            output_tokens: 4_096,
            output_tokens_details: { reasoning_tokens: 0 },
            total_tokens: 4_216 } },
        { kind: "success", output,
          usage: { input_tokens: 120,
            input_tokens_details: { cached_tokens: 0 },
            output_tokens: outputTokens,
            output_tokens_details: { reasoning_tokens: 0 },
            total_tokens: 120 + outputTokens } }],
      });
      const store = openProductionStore(":memory:", {
        runId: `structured-review-hard-bound-${name}`,
        recipeHash: hash(`structured-review-hard-bound-${name}`),
        maxCalls: 3, maxCostMicros: 500_000, maxTokens: 300_000,
      });
      try {
        const runtime = createFactionStructuredReviewRuntimeV1({ input,
          runtime: { role: async () => assert.fail("fallback invoked") },
          store, dsh: { run: runDirectLoop },
          providerAdapter:
            createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({
              send: fault.send,
            }),
          egressBinding: binding, capabilityReceipt,
          outputContract: contract, executionPolicy: policy,
          priceUsage: (usage) => usage.totalUnits,
          allowBoundedOutputCapRecovery: true,
        });
        await assert.rejects(() => runtime.role(request), {
          code: "FACTION_STRUCTURED_REVIEW_OUTPUT_CAP_RECOVERY_NOT_COMPACT",
        });
        assert.equal(fault.inspect().calls.length, 2);
      } finally { store.close(); }
    }
  });

await check("review.imported-output-cap-failure-skips-rejected-attempt", async () => {
  const contextManifestRef = contextManifestRefStarcraftTmgV1(capsule);
  const executionPolicyRef = {
    id: "policy.faction-target-review.production",
    version: "2026.09.06.1",
    hash: hash(policy),
  };
  const invocationBody = {
    schemaVersion:
      "starcraft_tmg_structured_generation_runtime_v1.invocation",
    roleRef, contextManifestRef, outputContractRef: contractRef,
    executionPolicyRef, continuationRef: null,
    contextPayloadHash: hash({ instructions: capsule.instructions,
      input: capsule.compiledInput }),
    capabilityReceiptHash: capabilityReceipt.receiptHash,
    trainingTruth: false,
  };
  const invocationHash = hash(invocationBody);
  const originAttemptId = `structured-${invocationHash.slice(0, 48)}`;
  const usage = { inputUnits: 120, outputUnits: 4_096,
    totalUnits: 4_216, inputCacheHitUnits: 0,
    inputCacheMissUnits: 120, reasoningOutputUnits: 0 };
  const failureBody = {
    schemaVersion:
      "starcraft_tmg_deepseek_responses_json_schema_adapter_v1.failure",
    code: "STRUCTURED_PROVIDER_INCOMPLETE",
    requestDefinitelyNotSent: false,
    requestMayHaveBeenSent: true,
    status: 200,
    physicalAttempts: 1,
    outputContractRef: contractRef,
    capabilityReceiptHash: capabilityReceipt.receiptHash,
    usageKnown: true,
    usage,
    causeCode: null,
    incompleteReason: "max_output_tokens",
    payloadHash: hash("synthetic output-cap payload"),
    outputTextHash: null,
    schemaIssues: [],
    responseNormalization: null,
    responseNormalizationReceiptHash: null,
    automaticRetries: 0,
    trainingTruth: false,
  };
  const failureReceipt = { ...failureBody,
    receiptHash: hash(failureBody) };
  const originIssue = seal({
    version: "starcraft_tmg_structured_generation_runtime_v1.issue",
    invocationHash,
    outputContractRef: contractRef,
    class: "output_incomplete",
    code: "STRUCTURED_PROVIDER_INCOMPLETE",
    retryRoute: null,
    safeReceiptHash: failureReceipt.receiptHash,
    rejectedCandidateRef: null,
    rawPayloadPersisted: false,
    trainingTruth: false,
  });
  const imported = createFactionStructuredReviewOutputCapFailureImportV1({
    parentRunId: "faction-v1-0123456789abcdefabcd",
    fullRoleId: `${packet.id}.${roleId}`,
    originAttemptId,
    originRequestHash: hash("synthetic output-cap request"),
    originIssue,
    failureReceipt,
    usage,
    usageHash: hash({ value: usage }),
  });
  const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({
    steps: [{ kind: "success", output: providerOutput }],
  });
  const store = openProductionStore(":memory:", {
    runId: "structured-review-imported-output-cap-test",
    recipeHash: hash("structured-review-imported-output-cap-test"),
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
      executionPolicy: policy, priceUsage: (value) => value.totalUnits,
      allowBoundedOutputCapRecovery: true,
      outputCapRecoveryImports: [imported],
    });
    const result = await runtime.role(request);
    assert.equal(result.outputCapRecoveryReceipt.importedFailureHash,
      imported.hash);
    assert.equal(result.outputCapRecoveryReceipt.originalProviderCallsReplayed,
      0);
    assert.equal(fault.inspect().calls.length, 1);
    assert.notEqual(fault.inspect().calls[0].requestId, originAttemptId);
    assert.equal(store.summary().attempts.some((row) =>
      row.id === originAttemptId), false);
  } finally { store.close(); }
});

await check("review.imported-output-cap-success-uses-zero-current-usage",
  async () => {
    const originIssueHash = hash("synthetic imported output-cap issue");
    const recoveryRoleRef = {
      id: `${roleRef.id}.output-cap-recovery.1`,
      version: "structured-review-v1",
      hash: hash(`${roleRef.id}.output-cap-recovery.1.structured-review-v1`),
    };
    const recoveryCapsule =
      createFactionReviewOutputCapRecoveryContextCapsuleV1({
        capsule, roleRef: recoveryRoleRef,
        originIssueRef: { hash: originIssueHash,
          class: "output_incomplete" },
      });
    const executionPolicyRef = {
      id: "policy.faction-target-review.production",
      version: "2026.09.06.1",
      hash: hash(policy),
    };
    const invocationHash = hash({
      schemaVersion:
        "starcraft_tmg_structured_generation_runtime_v1.invocation",
      roleRef: recoveryRoleRef,
      contextManifestRef: contextManifestRefStarcraftTmgV1(recoveryCapsule),
      outputContractRef: contractRef,
      executionPolicyRef,
      continuationRef: null,
      contextPayloadHash: hash({ instructions: recoveryCapsule.instructions,
        input: recoveryCapsule.compiledInput }),
      capabilityReceiptHash: capabilityReceipt.receiptHash,
      trainingTruth: false,
    });
    const originAttemptId = `structured-${invocationHash.slice(0, 48)}`;
    const providerReceiptHash = hash("synthetic accepted provider receipt");
    const localValidationReceipt = {
      outputContractRef: contractRef,
      valueHash: hash(providerOutput),
      valid: true,
      trainingTruth: false,
    };
    const candidate = seal({
      version: "starcraft_tmg_structured_generation_runtime_v1.candidate",
      invocationHash,
      roleRef: recoveryRoleRef,
      contextManifestRef: contextManifestRefStarcraftTmgV1(recoveryCapsule),
      outputContractRef: contractRef,
      providerValue: providerOutput,
      providerReceiptHash,
      localValidationReceipt,
      semanticAcceptanceInherited: false,
      published: false,
      runtimeAccepted: false,
      trainingTruth: false,
    });
    const runtimeReceipt = seal({
      version: "starcraft_tmg_structured_generation_runtime_v1.receipt",
      invocationHash,
      attemptId: originAttemptId,
      outputContractRef: contractRef,
      status: "accepted",
      candidateHash: candidate.hash,
      issueHash: null,
      providerReceiptHash,
      providerAttempts: 1,
      automaticRetries: 0,
      acceptanceScope: "structured_decode_and_local_schema_only",
      semanticAcceptance: false,
      trainingTruth: false,
    });
    const usage = { inputUnits: 120, outputUnits: 40, totalUnits: 160,
      inputCacheHitUnits: 0, inputCacheMissUnits: 120,
      reasoningOutputUnits: 0 };
    const imported = createFactionStructuredReviewOutputCapSuccessImportV1({
      parentRunId: "faction-v1-0123456789abcdefabcd",
      fullRoleId: `${packet.id}.${roleId}`,
      originIssueHash,
      originAttemptId,
      originRequestHash: hash("synthetic accepted request"),
      candidate,
      runtimeReceipt,
      providerResponse: {
        output: providerOutput,
        usageReceipt: { requestId: originAttemptId, receiptHash:
          providerReceiptHash, outputContractRef: contractRef, usage },
        localValidationReceipt,
      },
      usage,
      usageHash: hash({ value: usage }),
    });
    let importedModelCalls = 0;
    const strictDsh = { run: (args) => runDirectLoop({
      ...args,
      callModel: async (request) => {
        importedModelCalls += 1;
        const response = await args.callModel(request);
        assert.deepEqual(response.usage, {
          inputUnits: 0, outputUnits: 0, totalUnits: 0,
          inputCacheHitUnits: 0, inputCacheMissUnits: 0,
          reasoningOutputUnits: 0,
        });
        return response;
      },
    }) };
    const store = openProductionStore(":memory:", {
      runId: "structured-review-imported-success-test",
      recipeHash: hash("structured-review-imported-success-test"),
      maxCalls: 2, maxCostMicros: 500_000, maxTokens: 300_000,
    });
    try {
      const runtime = createFactionStructuredReviewRuntimeV1({ input,
        runtime: { role: async () => assert.fail("fallback invoked") },
        store, dsh: strictDsh,
        providerAdapter: { complete: async () =>
          assert.fail("provider invoked") },
        egressBinding: binding, capabilityReceipt,
        outputContract: contract, executionPolicy: policy,
        priceUsage: () => 0,
        allowBoundedOutputCapRecovery: true,
        outputCapRecoverySuccessImports: [imported],
      });
      const result = await runtime.role(request);
      assert.equal(result.outputCapRecoveryReceipt.importedSuccessHash,
        imported.hash);
      assert.equal(result.outputCapSuccessImportReceipt
        .originalProviderCallsReplayed, 0);
      assert.equal(importedModelCalls, 1);
      assert.equal(store.summary().calls, 0);
    } finally { store.close(); }
  });

await check("review.one-bounded-schema-instance-repair-preserves-other-values", async () => {
  const rejected = structuredClone(providerOutput);
  rejected.verdicts[0].reason = "R".repeat(16_385);
  rejected.verdicts[0].sourceSlots = capsule.localIssue.reviewTask
    .includedSourceSlots.slice(0, 9);
  rejected.verdicts[0].unexpectedField = "delete only this field";
  const repaired = structuredClone(rejected);
  repaired.verdicts[0].reason = "Condensed without changing the judgment.";
  repaired.verdicts[0].sourceSlots = rejected.verdicts[0].sourceSlots.slice(0, 8);
  delete repaired.verdicts[0].unexpectedField;
  const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({
    steps: [{ kind: "success", output: rejected },
      { kind: "success", output: repaired }],
  });
  const store = openProductionStore(":memory:", {
    runId: "structured-review-repair-test",
    recipeHash: hash("structured-review-repair-test"),
    maxCalls: 3, maxCostMicros: 500_000, maxTokens: 600_000,
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
    assert.equal(result.structuredDecodePassed, true);
    assert.equal(result.schemaRepairScope.allOtherValuesHashEqual, true);
    assert.deepEqual(result.schemaRepairScope.allowedChangedPaths,
      ["$.verdicts[0].reason", "$.verdicts[0].sourceSlots",
        "$.verdicts[0].unexpectedField"]);
    assert.equal(fault.inspect().calls.length, 2);
    assert.equal(store.summary().attempts.filter((row) =>
      row.code === "STRUCTURED_PROVIDER_SCHEMA_INVALID").length, 1);
  } finally { store.close(); }
});

await check("review.exact-rejected-candidate-import-skips-initial-provider-call", async () => {
  const rejectedValue = structuredClone(providerOutput);
  rejectedValue.verdicts[1].reason = "R".repeat(16_387);
  const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
    contract.providerSchema, rejectedValue);
  assert.deepEqual(validation.issues[0], {
    path: "$.verdicts[1].reason", code: "string_too_long",
    actualLength: 16_387, minLength: 1, maxLength: 16_384,
  });
  const imported = seal({
    version:
      "starcraft_tmg_structured_generation_runtime_v1.rejected-candidate",
    invocationHash: hash("imported fixture invocation"),
    roleRef,
    contextManifestRef: contextManifestRefStarcraftTmgV1(capsule),
    outputContractRef: contractRef,
    providerValue: rejectedValue,
    validation,
    safeReceiptHash: hash("imported fixture receipt"),
    semanticAcceptanceInherited: false, published: false,
    runtimeAccepted: false, trainingTruth: false,
  });
  const repaired = structuredClone(rejectedValue);
  repaired.verdicts[1].reason = "R".repeat(16_383);
  const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({
    steps: [{ kind: "success", output: repaired }],
  });
  const store = openProductionStore(":memory:", {
    runId: "structured-review-import-test",
    recipeHash: hash("structured-review-import-test"),
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
      schemaRepairImports: [imported],
    });
    const result = await runtime.role(request);
    assert.equal(result.schemaRepairImportReceipt.initialProviderCallsReplayed,
      0);
    assert.equal(result.schemaRepairScope.allOtherValuesHashEqual, true);
    assert.equal(fault.inspect().calls.length, 1);
    assert.equal(store.summary().calls, 1);
  } finally { store.close(); }
});

await check("review.schema-repair-cannot-change-unflagged-verdict", async () => {
  const rejectedValue = structuredClone(providerOutput);
  rejectedValue.verdicts[0].reason = "R".repeat(16_385);
  const rejectedCandidate = seal({
    version: "fixture.rejected-candidate",
    providerValue: rejectedValue,
    validation: { issues: [{ path: "$.verdicts[0].reason",
      code: "string_too_long" }] },
  });
  const changed = structuredClone(rejectedValue);
  changed.verdicts[0].reason = "Short reason.";
  changed.verdicts[0].verdict = "uncertain";
  assert.throws(() => verifyFactionStructuredReviewSchemaRepairScopeV1({
    rejectedCandidate, repairedOutput: changed,
  }), { code: "FACTION_STRUCTURED_REVIEW_SCHEMA_REPAIR_SCOPE_INVALID" });
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
  previousOutputContractRef: contractRefV3,
  contractMigration,
  historicalOutputContractRefs: [contractRefV1, contractRefV2],
  historicalContractMigrations: [historicalContractMigration,
    intermediateContractMigration],
  actualBoundaryFailureRunId: "faction-v1-540b0fa661c00b3d3bdc",
  actualBoundaryRejectedCandidateHash: actualV3BoundaryCandidate.hash,
  actualCapacityFailureRunId: "faction-v1-ad5d16565e2b118d830a",
  actualCapacityFailureReceiptHash: actualCapacityFailure.receiptHash,
  actualOutputCeilingFailureRunId: "faction-v1-64dfe1d35c4921569be7",
  actualOutputCeilingFailureReceiptHash: actualCeilingFailure.receiptHash,
  capacityMigration: {
    failureClass: "output_incomplete",
    incompleteReason: "max_output_tokens",
    previousMaxOutputUnits: 2_048,
    nextMaxOutputUnits: 4_096,
    exactOutputContractRetained: true,
    oneExplicitContinuationOnly: true,
    automaticRetries: 0,
    profileCeilingOutputUnits: 4_096,
    atProfileCeilingRoute:
      "one_explicit_same_task_compact_recovery_with_new_attempt_identity",
    maximumFocusRowsPerTarget: 4,
    maximumSourceSlotsPerTarget: 4,
    maximumReasonCharacters: 600,
    hardMaximumReasonCharacters: 800,
    hardMaximumRecoveryOutputUnits: 3_072,
    settledFailureImportSupported: true,
    settledSuccessImportSupported: true,
    settledSuccessCurrentUsageZero: true,
    strictDshImportTested: true,
    actualSettledSuccessRunId: "faction-v1-cd070778679108170434",
    actualSettledSuccessAttemptId: actualCompactAttempt.id,
    actualSettledSuccessCandidateHash: actualCompactCandidate.hash,
    actualSettledSuccessOutputUnits:
      actualCompactAttempt.usage.value.outputUnits,
    actualSettledSuccessLongestReasonCharacters: Math.max(
      ...actualCompactCandidate.providerValue.verdicts.map((row) =>
        row.reason.length),
      ...actualCompactCandidate.providerValue.coverage.map((row) =>
        row.reason.length)),
    originalAttemptReplayAllowed: false,
    rejectedPartialOutputUsed: false,
    furtherRecoveryAllowed: false,
  },
  actualWireFailureRunId: "faction-v1-58dc727c7ae7ce8cece5",
  actualWireFailureReceiptHash: actualWireFailure.receiptHash,
  wireSyntaxRecovery: {
    policy: "lossless_unique_json_normalization_before_schema_validation",
    allowedKinds: ["outer_object_close", "single_json_fence",
      "single_json_fence_and_outer_object_close",
      "redundant_array_object_closers_v1", "single_unescaped_quote_v1"],
    originalActualTextRecoverable: false,
    promptOnlyRetryAllowed: false,
    schemaValidationAfterNormalization: true,
    semanticAcceptanceInherited: false,
  },
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
