#!/usr/bin/env node

import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from
  "../content/skill-generation/offline-provider-profile-v1.mjs";
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V1 as contract,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V1 as contractRef } from
  "../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs";
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from
  "../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs";
import { priceStarcraftTmgDeepSeekV4FlashUsageV1 } from
  "../packages/secure-provider-runtime/provider-pricing-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV2 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v2.mjs";
import { createStarcraftTmgStructuredProviderWorkerPortV1 } from
  "../packages/secure-provider-runtime/structured-provider-worker-port-v1.mjs";
import { hash, seal, sha256, fail } from
  "../packages/skill-production/common.mjs";
import { openProductionStore } from "../packages/skill-production/store.mjs";
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1,
  STARCRAFT_TMG_STRUCTURED_PROVIDER_REQUEST_VERSION } from
  "../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs";
import { verifyStarcraftTmgProviderCapabilityCurrentV1 } from
  "../packages/structured-generation/provider-capability-receipt-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = path.join(ROOT,
  "build/ticket-17-production-redesign-v1/production.sqlite");
const BUILD = path.join(ROOT, "build/ticket-18-structured-generation-v1");
const TOKEN_CAP = 50_000;
const COST_CAP_MICROS = 100_000;
const CODE_FILES = [
  "content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs",
  "packages/structured-generation/output-contract-registry-v1.mjs",
  "packages/structured-generation/provider-capability-receipt-v1.mjs",
  "packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs",
  "packages/secure-provider-runtime/structured-provider-egress-transport-v1.mjs",
  "packages/secure-provider-runtime/structured-provider-worker-child-v1.mjs",
  "packages/secure-provider-runtime/structured-provider-worker-port-v1.mjs",
  "scripts/run-ticket-18-structured-review-capability-canary-v1.mjs",
];
function safeCode(error) {
  const code = String(error?.code || error?.message || "STRUCTURED_REVIEW_PROBE_FAILED");
  return /^[A-Z0-9_.:-]{3,160}$/u.test(code)
    ? code : "STRUCTURED_REVIEW_PROBE_FAILED";
}
function usageCostMicros(usage, receipt = {}) {
  try {
    const priced = priceStarcraftTmgDeepSeekV4FlashUsageV1({
      providerId: "deepseek-openai-compatible-direct",
      requestedModel: receipt.requestedModel || profile.model,
      reportedModel: receipt.reportedModel || profile.model,
      startedAt: receipt.startedAt,
      usage,
    });
    return Math.ceil(priced.calculatedCostNanoUsd * 8 / 1_000);
  } catch {
    return Math.ceil((usage.inputUnits * 440 + usage.outputUnits * 1_320)
      * 8 / 1_000);
  }
}

const db = new DatabaseSync(DB_PATH, { readOnly: true });
let preflight;
try {
  preflight = {
    runningIntentCount: db.prepare(
      "SELECT count(*) count FROM attempts WHERE state='intent'",
    ).get().count,
    paymentRequiredCount: db.prepare(
      "SELECT count(*) count FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'",
    ).get().count,
  };
} finally { db.close(); }
if (preflight.runningIntentCount) fail("AMBIGUOUS_EGRESS_NO_RETRY");
if (preflight.paymentRequiredCount) fail("API_BALANCE_EXHAUSTED_STOP_ALL_WORK");
const registry = createStarcraftTmgProviderProfileRegistryV2({
  entries: [{ providerProfile: profile, responsePath: "/responses" }],
  allowedProviders: ["deepseek-openai-compatible-direct"],
});
const binding = registry.resolveEgressBinding({
  profileRef: { id: profile.providerProfileId, version: profile.version,
    hash: profile.integrity.hash },
}).egressBinding;
const roleRef = { id: "structured.capability.probe.faction-review",
  version: "v1",
  hash: hash("structured-capability-probe-faction-review-v1") };
const codeHashes = await Promise.all(CODE_FILES.map(async (file) => ({
  file, hash: sha256(await readFile(path.join(ROOT, file))),
})));
const recipe = seal({
  version: "ticket_18_slice_174_structured_review_capability_canary_v1",
  ticket: 18, slice: 174,
  roleRef, outputContractRef: contractRef,
  providerProfileRef: binding.providerProfileRef,
  limits: { maxCalls: 1, maxTokens: TOKEN_CAP,
    maxCostMicros: COST_CAP_MICROS },
  preflight, codeHashes, sourceRefreshPerformed: false,
  semanticAcceptanceInherited: false, trainingTruth: false,
});
const runId = `structured-review-probe-${recipe.hash.slice(0, 32)}`;
const out = path.join(BUILD, runId);
await mkdir(out, { recursive: true });
await writeFile(path.join(out, "recipe.json"),
  `${JSON.stringify(recipe, null, 2)}\n`, "utf8");
const store = openProductionStore(DB_PATH, { runId, recipeHash: recipe.hash,
  maxCalls: 1, maxTokens: TOKEN_CAP, maxCostMicros: COST_CAP_MICROS });
const providerRequest = {
  schemaVersion: STARCRAFT_TMG_STRUCTURED_PROVIDER_REQUEST_VERSION,
  requestId: `review-probe-${recipe.hash.slice(0, 48)}`,
  roleRef,
  instructions: [
    "This is a tiny structured-output capability probe, not game advice or a real judgment.",
    "Return exactly one schema object with one synthetic verdict and an empty coverage array.",
    "Use targetSlot 0, path risk, an exact quote of at least eight characters, verdict uncertain, sourceSlots [0].",
    "Do not add markdown, target IDs, source IDs or control fields.",
  ].join("\n"),
  input: "Synthetic target slot 0 has risk text: synthetic review quote. No coverage slots are supplied.",
  outputContractRef: contractRef,
  maxOutputUnits: 256,
};
const attemptId = `structured-review-probe-${recipe.hash.slice(0, 40)}`;
const reservation = store.reserve(attemptId, providerRequest,
  COST_CAP_MICROS, TOKEN_CAP);
let worker = null, attached = null, result = null, failure = null;
let paidCalls = 0;
try {
  if (reservation.failed) fail(reservation.code);
  if (reservation.cached) result = reservation.response;
  else {
    worker = createStarcraftTmgStructuredProviderWorkerPortV1({
      providerProfileRegistry: registry,
    });
    const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
    try {
      attached = await worker.attachCredential({
        attachmentId: `structured-review-probe-${randomUUID()}`,
        providerProfile: profile,
        credentialBytes: ingress.credentialBytes,
      });
    } finally { ingress.credentialBytes.fill(0); }
    if (!attached.ok) fail("PROVIDER_ATTACHMENT_FAILED");
    const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({
      send: (request) => {
        paidCalls += 1;
        return worker.send({ workerRef: attached.workerRef, ...request });
      },
    });
    result = await adapter.probeCapability({ egressBinding: binding,
      outputContract: contract, providerRequest,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString() });
    if (!result.ok) {
      const error = new Error(result.errorCode);
      error.code = result.errorCode;
      error.safeReceipt = result.safeReceipt;
      throw error;
    }
    const costMicros = usageCostMicros(result.usage, {
      requestedModel: binding.model, reportedModel: binding.model,
      startedAt: result.capabilityReceipt.probedAt,
    });
    if (result.usage.totalUnits > TOKEN_CAP || costMicros > COST_CAP_MICROS) {
      fail("STRUCTURED_REVIEW_PROBE_BUDGET_EXCEEDED");
    }
    store.settle(attemptId, { usage: result.usage, costMicros,
      response: result });
  }
  if (!result?.ok || !verifyStarcraftTmgProviderCapabilityCurrentV1({
    receipt: result.capabilityReceipt,
    providerProfileRef: binding.providerProfileRef,
    endpointPath: binding.endpoint.path,
    endpointDialect: binding.endpointDialect,
    model: binding.model,
    capability: "responses_json_schema",
    outputContractRef: contractRef,
    now: new Date().toISOString(),
  }).ok) fail("STRUCTURED_REVIEW_CAPABILITY_NOT_CURRENT");
  await writeFile(path.join(out, "capability-receipt.json"),
    `${JSON.stringify(result.capabilityReceipt, null, 2)}\n`, "utf8");
} catch (error) {
  failure = { code: safeCode(error), diagnosticHash: hash(String(error.message)) };
  if (!reservation.cached && store.summary().attempts
    .some((row) => row.id === attemptId && row.state === "intent")) {
    const safe = error.safeReceipt || null;
    const known = safe?.usageKnown === true ? safe.usage : null;
    store.settle(attemptId, { usage: known,
      costMicros: known ? usageCostMicros(known, {
        requestedModel: binding.model, reportedModel: binding.model,
        startedAt: new Date().toISOString(),
      }) : null,
      failureReceipt: safe, code: safeCode(error),
      definitelyNotSent: safe?.requestDefinitelyNotSent === true });
  }
} finally {
  if (attached?.workerRef) await worker.detachCredential({
    workerRef: attached.workerRef,
    reason: "structured_review_probe_finished",
  }).catch(() => {});
  await worker?.close().catch(() => {});
}
const ledger = store.summary();
const report = seal({
  version: "ticket_18_slice_174_structured_review_capability_canary_report_v1",
  ticket: 18, slice: 174, runId, recipeHash: recipe.hash,
  passed: failure === null && result?.ok === true,
  failure,
  capabilityReceiptHash: result?.capabilityReceipt?.receiptHash || null,
  outputContractRef: contractRef,
  paidCallsThisExecution: paidCalls,
  ledger,
  limits: recipe.limits,
  automaticRetries: 0,
  sourceRefreshPerformed: false,
  semanticAcceptanceInherited: false,
  trainingTruth: false,
});
await writeFile(path.join(out, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(path.join(BUILD, "r6-structured-review-capability-report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ runId, passed: report.passed, failure,
  calls: ledger.calls, tokens: ledger.knownTokens,
  estimatedCny: ledger.reservedOrSettledMicros / 1e6,
  reportHash: report.hash }));
store.close();
if (failure) process.exitCode = 1;
