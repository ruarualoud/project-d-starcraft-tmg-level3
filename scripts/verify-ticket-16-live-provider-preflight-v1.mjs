#!/usr/bin/env node

import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  STARCRAFT_TMG_TICKET_16_LIVE_PROVIDER_CLOSURE_V1 as contract,
  STARCRAFT_TMG_TICKET_16_LIVE_PROVIDER_PROFILE_V1 as liveProfile,
} from "../content/provider/ticket-16-live-provider-closure-v1.mjs";
import { STARCRAFT_TMG_TICKET_16_REDACTION_BROWSER_WORKER_AGGREGATE_V1 as predecessor } from
  "../content/provider/ticket-16-redaction-browser-worker-aggregate-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  isStarcraftTmgDeepSeekPeakWindowV1,
  priceStarcraftTmgDeepSeekV4FlashUsageV1,
  STARCRAFT_TMG_DEEPSEEK_V4_FLASH_PRICING_SNAPSHOT_V1 as pricing,
  verifyStarcraftTmgProviderPricingReceiptV1,
} from "../packages/secure-provider-runtime/provider-pricing-v1.mjs";
import { createStarcraftTmgProviderEgressTransportV1 } from
  "../packages/secure-provider-runtime/provider-egress-transport-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV1 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v1.mjs";
import {
  STARCRAFT_TMG_PROVIDER_DISCLOSURE_NOTICE_VERSION,
} from "../packages/secure-provider-runtime/credential-attachment-control-v1.mjs";
import { composeStarcraftTmgTicket16LiveRunV1 } from
  "./run-ticket-16-live-provider-once-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_ROOT = path.join(ROOT,
  "build/ticket-16-slice-162-live-provider-preflight-v1");
const REPORT_PATH = path.join(REPORT_ROOT, "report.json");
const LIVE_ROOT = path.join(ROOT, "build/ticket-16-slice-162-live-provider-v1");
const LIVE_REPORT_PATH = path.join(LIVE_ROOT, "live-report.json");
const LIVE_LOCK_PATH = path.join(LIVE_ROOT, "one-call-attempt.lock.json");
const RUNNER_PATH = path.join(ROOT,
  "scripts/run-ticket-16-live-provider-once-v1.mjs");
const GENERATED_AT = "2026-09-03T20:10:00.000Z";
const checks = [];
const failures = [];

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function verifyHash(value, field) {
  const { [field]: observed, ...body } = value;
  assert.equal(observed, hashStarcraftTmgContract(body));
}

async function check(id, operation) {
  try {
    await operation();
    checks.push({ id, passed: true });
  } catch (error) {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    checks.push({ id, passed: false, error: message });
    failures.push(`${id}: ${message}`);
  }
}

async function optionalFileHash(filename) {
  try {
    return hashStarcraftTmgContract(await readFile(filename));
  } catch {
    return null;
  }
}

function deepSeekBinding() {
  const registry = createStarcraftTmgProviderProfileRegistryV1({
    entries: [{ providerProfile: liveProfile, completionPath: "/chat/completions" }],
    allowedProviders: ["deepseek-openai-compatible-direct"],
  });
  return registry.resolveEgressBinding({
    profileRef: {
      id: liveProfile.providerProfileId,
      version: liveProfile.version,
      hash: liveProfile.integrity.hash,
    },
  });
}

function fixtureRequestImplementation(observation, payloadOverride = null) {
  return (options, callback) => {
    const request = new EventEmitter();
    request.destroy = () => {};
    request.end = (body) => {
      observation.options = options;
      observation.body = JSON.parse(body);
      const payload = payloadOverride || JSON.stringify({
        id: "fixture-deepseek-request-162",
        model: "deepseek-v4-flash",
        system_fingerprint: "fixture-v4-flash-0731-fingerprint",
        choices: [{ message: { content: JSON.stringify({
          schemaVersion: "starcraft_tmg_online_role_output_v1",
          channels: { teaching: { text: "安全连接测试。" } },
          visualCue: "explain",
          evidenceRefIds: [],
        }) } }],
        usage: {
          prompt_tokens: 120,
          prompt_cache_hit_tokens: 20,
          prompt_cache_miss_tokens: 100,
          completion_tokens: 10,
          total_tokens: 130,
          completion_tokens_details: { reasoning_tokens: 2 },
        },
      });
      queueMicrotask(() => {
        const response = new EventEmitter();
        response.statusCode = 200;
        response.headers = {
          "content-type": "application/json; charset=utf-8",
          "content-length": String(Buffer.byteLength(payload)),
          "x-request-id": "fixture-deepseek-request-162",
        };
        response.destroy = () => {};
        callback(response);
        queueMicrotask(() => {
          response.emit("data", Buffer.from(payload));
          response.emit("end");
        });
      });
    };
    return request;
  };
}

let transportResult;
let transportObservation;
async function runTransportFixture() {
  if (transportResult) return transportResult;
  const resolved = await deepSeekBinding();
  assert.equal(resolved.ok, true);
  transportObservation = {};
  const transport = createStarcraftTmgProviderEgressTransportV1({
    resolveAddresses: async () => [{ address: "93.184.216.34", family: 4 }],
    requestImplementation: fixtureRequestImplementation(transportObservation),
    now: (() => {
      let second = 0;
      return () => new Date(Date.UTC(2026, 8, 3, 20, 0, second++)).toISOString();
    })(),
  });
  const credential = Buffer.from("fixture-only-live-preflight-credential", "utf8");
  try {
    transportResult = await transport.complete({
      egressBinding: resolved.egressBinding,
      credentialBytes: credential,
      providerRequest: {
        schemaVersion: "starcraft_tmg_direct_provider_request_v1",
        requestId: "slice-162-preflight-request-001",
        intent: "explain",
        promptPack: "novice_teacher_prompt",
        promptNodes: [{ nodeType: "platform-policy", authority: "platform" }],
        userMessage: "Return the minimal JSON object.",
        responseContract: {
          allowedChannels: ["teaching"],
          decisionCandidateSource: "forbidden",
        },
        maxOutputUnits: 64,
      },
    });
  } finally {
    credential.fill(0);
  }
  return transportResult;
}

await check("contract_is_hash_sealed_and_binds_slice_161", () => {
  verifyHash(contract, "contractHash");
  assert.equal(contract.predecessorContractHash, predecessor.contractHash);
  assert.equal(contract.acceptance.fixedAssertions, 36);
  assert.match(contract.acceptance.browserSemanticEvidenceHash,
    /^[a-f0-9]{64}$/u);
  assert.equal(contract.acceptance.browserRasterArtifactsValidatedPerRun, true);
});

await check("live_profile_is_exact_server_owned_deepseek_direct_not_dsh", () => {
  assert.equal(liveProfile.provider, "deepseek-openai-compatible-direct");
  assert.equal(liveProfile.baseUrl, "https://api.deepseek.com");
  assert.equal(liveProfile.model, "deepseek-v4-flash");
  assert.equal(liveProfile.retryPolicy.maxAttempts, 1);
  assert.equal(liveProfile.retryPolicy.internalRetry, false);
});

await check("official_source_hashes_and_release_are_frozen", () => {
  assert.equal(contract.officialProviderEvidence.firstCallContentSha256,
    "fc590e5b2cc856c798d46314828dd790320e177317121a1864ef5428991d12d7");
  assert.equal(contract.officialProviderEvidence.chatApiContentSha256,
    "67b6a6c8ab70f51ad56f6018077ac58768d95f73b53639b4d00b3f6d57a4fad9");
  assert.equal(contract.officialProviderEvidence.officialModelRelease,
    "DeepSeek-V4-Flash-0731");
});

await check("pricing_snapshot_is_hash_sealed_and_contract_bound", () => {
  verifyHash(pricing, "snapshotHash");
  assert.equal(contract.officialProviderEvidence.pricingSnapshotHash,
    pricing.snapshotHash);
});

await check("pricing_snapshot_uses_exact_integer_nano_usd_rates", () => {
  assert.deepEqual(pricing.ratesPerTokenNanoUsd.offPeak,
    { inputCacheHit: 7, inputCacheMiss: 220, output: 660 });
  assert.deepEqual(pricing.ratesPerTokenNanoUsd.peak,
    { inputCacheHit: 14, inputCacheMiss: 440, output: 1320 });
});

await check("weekday_first_peak_interval_is_utc_01_to_04", () => {
  assert.equal(isStarcraftTmgDeepSeekPeakWindowV1(
    "2026-09-03T01:00:00.000Z"), true);
  assert.equal(isStarcraftTmgDeepSeekPeakWindowV1(
    "2026-09-03T04:00:00.000Z"), false);
});

await check("weekday_second_peak_interval_is_utc_06_to_10", () => {
  assert.equal(isStarcraftTmgDeepSeekPeakWindowV1(
    "2026-09-03T06:00:00.000Z"), true);
  assert.equal(isStarcraftTmgDeepSeekPeakWindowV1(
    "2026-09-03T10:00:00.000Z"), false);
});

await check("weekday_outside_peak_is_off_peak", () => {
  assert.equal(isStarcraftTmgDeepSeekPeakWindowV1(
    "2026-09-03T20:00:00.000Z"), false);
});

await check("weekend_is_off_peak", () => {
  assert.equal(isStarcraftTmgDeepSeekPeakWindowV1(
    "2026-09-05T07:00:00.000Z"), false);
});

let offPeakReceipt;
await check("off_peak_cost_is_exact_without_floating_point", () => {
  offPeakReceipt = priceStarcraftTmgDeepSeekV4FlashUsageV1({
    providerId: "deepseek-openai-compatible-direct",
    requestedModel: "deepseek-v4-flash",
    reportedModel: "deepseek-v4-flash",
    startedAt: "2026-09-03T20:00:00.000Z",
    usage: {
      inputUnits: 120, outputUnits: 10, totalUnits: 130,
      inputCacheHitUnits: 20, inputCacheMissUnits: 100,
      reasoningOutputUnits: 2,
    },
  });
  assert.equal(offPeakReceipt.calculatedCostNanoUsd, 28_740);
  assert.equal(offPeakReceipt.calculatedCostUsd, "0.00002874");
});

await check("peak_cost_is_exact_without_floating_point", () => {
  const receipt = priceStarcraftTmgDeepSeekV4FlashUsageV1({
    providerId: "deepseek-openai-compatible-direct",
    requestedModel: "deepseek-v4-flash",
    reportedModel: "deepseek-v4-flash",
    startedAt: "2026-09-03T06:00:00.000Z",
    usage: {
      inputUnits: 120, outputUnits: 10, totalUnits: 130,
      inputCacheHitUnits: 20, inputCacheMissUnits: 100,
    },
  });
  assert.equal(receipt.calculatedCostNanoUsd, 57_480);
  assert.equal(receipt.calculatedCostUsd, "0.00005748");
});

await check("pricing_receipt_is_hash_sealed_and_not_an_invoice_claim", () => {
  assert.equal(verifyStarcraftTmgProviderPricingReceiptV1(offPeakReceipt), true);
  assert.equal(offPeakReceipt.calculatedCostIsInvoice, false);
  assert.equal(offPeakReceipt.providerInvoiceAuthoritative, true);
});

await check("pricing_rejects_missing_cache_breakdown", () => {
  assert.throws(() => priceStarcraftTmgDeepSeekV4FlashUsageV1({
    providerId: "deepseek-openai-compatible-direct",
    requestedModel: "deepseek-v4-flash",
    reportedModel: "deepseek-v4-flash",
    startedAt: "2026-09-03T20:00:00.000Z",
    usage: { inputUnits: 120, outputUnits: 10, totalUnits: 130 },
  }));
});

await check("transport_uses_exact_deepseek_https_model_and_non_thinking_json", async () => {
  await runTransportFixture();
  assert.equal(transportObservation.options.hostname, "api.deepseek.com");
  assert.equal(transportObservation.options.path, "/chat/completions");
  assert.equal(transportObservation.body.model, "deepseek-v4-flash");
  assert.deepEqual(transportObservation.body.thinking, { type: "disabled" });
  assert.equal(transportObservation.body.reasoning_effort, "low");
  assert.deepEqual(transportObservation.body.response_format,
    { type: "json_object" });
});

await check("transport_extracts_exact_cache_and_reasoning_usage", async () => {
  const result = await runTransportFixture();
  assert.deepEqual(result.usageReceipt.usage, {
    inputUnits: 120,
    outputUnits: 10,
    totalUnits: 130,
    inputCacheHitUnits: 20,
    inputCacheMissUnits: 100,
    reasoningOutputUnits: 2,
  });
});

await check("transport_hashes_fingerprint_request_and_response", async () => {
  const result = await runTransportFixture();
  assert.match(result.usageReceipt.providerSystemFingerprintHash,
    /^[a-f0-9]{64}$/u);
  assert.match(result.usageReceipt.providerRequestIdHash, /^[a-f0-9]{64}$/u);
  assert.match(result.usageReceipt.responseFingerprint, /^[a-f0-9]{64}$/u);
  verifyHash(result.usageReceipt, "receiptHash");
  const resolved = await deepSeekBinding();
  const credential = Buffer.from("fixture-encoded-echo-secret-162", "utf8");
  const encodedEcho = credential.toString("base64");
  const payload = JSON.stringify({
    model: "deepseek-v4-flash",
    choices: [{ message: { content: JSON.stringify({
      channels: { teaching: { text: encodedEcho } },
    }) } }],
    usage: {
      prompt_tokens: 1,
      prompt_cache_hit_tokens: 0,
      prompt_cache_miss_tokens: 1,
      completion_tokens: 1,
      total_tokens: 2,
    },
  });
  const transport = createStarcraftTmgProviderEgressTransportV1({
    resolveAddresses: async () => [{ address: "93.184.216.34", family: 4 }],
    requestImplementation: fixtureRequestImplementation({}, payload),
  });
  try {
    await assert.rejects(() => transport.complete({
      egressBinding: resolved.egressBinding,
      credentialBytes: credential,
      providerRequest: {
        schemaVersion: "starcraft_tmg_direct_provider_request_v1",
        requestId: "slice-162-encoded-echo-request-001",
        intent: "explain",
        promptPack: "novice_teacher_prompt",
        promptNodes: [{ nodeType: "platform-policy" }],
        userMessage: "Return JSON.",
        responseContract: {
          allowedChannels: ["teaching"],
          decisionCandidateSource: "forbidden",
        },
        maxOutputUnits: 64,
      },
    }), (error) => error?.code
      === "PROVIDER_RESPONSE_SENSITIVE_MATERIAL_REJECTED");
  } finally {
    credential.fill(0);
  }
});

await check("real_live_composition_attaches_and_detaches_without_egress", async () => {
  const source = await readFile(path.join(ROOT,
    "packages/secure-provider-runtime/provider-egress-worker-port-v1.mjs"),
  "utf8");
  for (const field of [
    "providerSystemFingerprintHash", "inputCacheHitUnits",
    "inputCacheMissUnits", "reasoningOutputUnits",
  ]) assert(source.includes(field), field);
  const transportSource = await readFile(path.join(ROOT,
    "packages/secure-provider-runtime/provider-egress-transport-v1.mjs"),
  "utf8");
  assert(transportSource.includes("containsStarcraftTmgKnownCredentialEchoV1"));
  const runtime = await composeStarcraftTmgTicket16LiveRunV1(
    "preflight-composition-001", {
      sqlitePath: path.join(REPORT_ROOT, "composition-v2.sqlite"),
      recoveredAt: "2026-09-03T20:10:00.000Z",
    });
  try {
    const ref = {
      id: liveProfile.providerProfileId,
      version: liveProfile.version,
      hash: liveProfile.integrity.hash,
    };
    const prepared = await runtime.attachmentControl.prepareAttachment({
      roomId: runtime.roomId,
      sessionId: runtime.session.sessionId,
      expectedConnectionEpoch: runtime.session.connection.epoch,
      providerProfileRef: ref,
      disclosureNoticeVersion: STARCRAFT_TMG_PROVIDER_DISCLOSURE_NOTICE_VERSION,
      consentAccepted: true,
    }, runtime.context);
    assert.equal(prepared.ok, true);
    const secret = Buffer.from("synthetic-preflight-secret-162", "utf8");
    const attached = await runtime.attachmentControl.attachCredentialBytes({
      roomId: runtime.roomId,
      sessionId: runtime.session.sessionId,
      expectedConnectionEpoch: runtime.session.connection.epoch,
      attachmentId: prepared.attachment.attachmentId,
      ingressNonce: prepared.ingress.nonce,
      credentialBytes: secret,
    }, runtime.context);
    assert.equal(attached.ok, true);
    assert(secret.every((byte) => byte === 0));
    assert.equal(runtime.observation.completeCalls, 0);
    const detached = await runtime.attachmentControl.detachAttachment({
      roomId: runtime.roomId,
      sessionId: runtime.session.sessionId,
      expectedConnectionEpoch: runtime.session.connection.epoch,
      attachmentId: prepared.attachment.attachmentId,
    }, runtime.context);
    assert.equal(detached.ok, true);
  } finally {
    await runtime.attachmentControl.close();
    await runtime.coreWorker.close();
    await runtime.store.close();
  }
});

await check("runner_refuses_missing_flags_without_mutating_live_artifacts", async () => {
  const beforeReport = await optionalFileHash(LIVE_REPORT_PATH);
  const beforeLock = await optionalFileHash(LIVE_LOCK_PATH);
  const result = spawnSync(process.execPath, [RUNNER_PATH], {
    cwd: ROOT,
    input: Buffer.from("fixture-input-must-not-be-read\n", "utf8"),
    encoding: "utf8",
    timeout: 10_000,
  });
  assert.equal(result.status, 2);
  assert(result.stderr.includes("LIVE_PROVIDER_EXPLICIT_AUTHORIZATION_REQUIRED"));
  assert.equal(await optionalFileHash(LIVE_REPORT_PATH), beforeReport);
  assert.equal(await optionalFileHash(LIVE_LOCK_PATH), beforeLock);
});

await check("runner_accepts_no_environment_or_argument_credential", async () => {
  const source = await readFile(RUNNER_PATH, "utf8");
  assert(!source.includes("process.env"));
  assert(!/--(?:api-?key|credential|secret)(?:=|\b)/iu.test(source));
  assert(source.includes("anonymous_stdin_binary_pipe_only"));
  assert(source.indexOf("if (await priorAttemptClaimExists())")
    < source.indexOf("credentialBytes = await readCredentialBytes()"));
  assert(source.indexOf("await claimOneAttempt(runId, startedAt)")
    < source.indexOf("runtime = await composeStarcraftTmgTicket16LiveRunV1(runId)"));
  assert(contract.liveAuthority.explicitFlags.includes(
    "--attest-rotated-after-chat-exposure"));
});

await check("preflight_keeps_dsh_skill_muzero_selfplay_and_training_false", () => {
  assert.equal(contract.runTruthBeforeAuthorization.sourceRefreshPerformed, false);
  assert.equal(contract.runTruthBeforeAuthorization.liveProviderCalled, false);
  assert.equal(contract.runTruthBeforeAuthorization.skillGenerated, false);
  assert.equal(contract.runTruthBeforeAuthorization.dshRun, false);
  assert.equal(contract.runTruthBeforeAuthorization.muzeroDataGenerated, false);
  assert.equal(contract.runTruthBeforeAuthorization.selfPlayRun, false);
  assert.equal(contract.runTruthBeforeAuthorization.trainingTruth, false);
  assert.equal(contract.runTruthBeforeAuthorization.ticketComplete, false);
});

assert.equal(checks.length, contract.acceptance.preflightAssertions,
  "preflight assertion denominator drifted");

const reportBody = {
  schemaVersion: "starcraft_tmg_ticket_16_live_provider_preflight_report_v1",
  generatedAt: GENERATED_AT,
  ticket: 16,
  slice: 162,
  status: failures.length ? "failed" : "passed",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  contractHash: contract.contractHash,
  pricingSnapshotHash: pricing.snapshotHash,
  requestedModel: liveProfile.model,
  liveProviderCalled: false,
  userCredentialAccepted: false,
  sourceRefreshPerformed: false,
  skillGenerated: false,
  dshRun: false,
  muzeroDataGenerated: false,
  selfPlayRun: false,
  trainingTruth: false,
  ticketComplete: false,
  harness: clone(contract.harnessEvidence),
};
const report = {
  ...reportBody,
  reportHash: hashStarcraftTmgContract(reportBody),
};
await mkdir(REPORT_ROOT, { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Ticket 16 Slice 162 live preflight ${checks.length}/${checks.length}; no external call; ${report.reportHash}`);
}
