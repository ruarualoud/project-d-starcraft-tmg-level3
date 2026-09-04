#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_16_LIVE_PROVIDER_CLOSURE_V1 as contract } from
  "../content/provider/ticket-16-live-provider-closure-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  priceStarcraftTmgDeepSeekV4FlashUsageV1,
  verifyStarcraftTmgProviderPricingReceiptV1,
} from "../packages/secure-provider-runtime/provider-pricing-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIVE_ROOT = path.join(ROOT, "build/ticket-16-slice-162-live-provider-v1");
const LIVE_REPORT_PATH = path.join(LIVE_ROOT, "live-report.json");
const LIVE_LOCK_PATH = path.join(LIVE_ROOT, "one-call-attempt.lock.json");
const SQLITE_PATH = path.join(LIVE_ROOT, "provider-attempts.sqlite");
const BROWSER_REPORT_PATH = path.join(ROOT,
  "build/ticket-16-slice-161-browser-aggregate-v1/browser-report.json");
const REPORT_ROOT = path.join(ROOT,
  "build/ticket-16-slice-162-live-provider-closure-v1");
const REPORT_PATH = path.join(REPORT_ROOT, "report.json");
const EXPECTED_BROWSER_SEMANTIC_HASH =
  "be6435cbb723a3a4c6007fe95220f2701b784df623ac54d52c6d9f7d26714452";
const HASH = /^[a-f0-9]{64}$/u;
const FORBIDDEN_KEYS = new Set([
  "apikey", "authorization", "bearer", "cookie", "credential",
  "credentialhash", "rawprompt", "rawresponse", "reasoning", "secret",
]);
const checks = [];
const failures = [];

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function verifyHash(value, field) {
  const { [field]: observed, ...body } = value;
  assert.equal(observed, hashStarcraftTmgContract(body));
}

function normalizedKey(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/gu, "");
}

function recursiveKeys(value) {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => [
    normalizedKey(key),
    ...recursiveKeys(child),
  ]);
}

function browserSemanticEvidence(report) {
  return {
    schemaVersion: report.schemaVersion,
    generatedAt: report.generatedAt,
    ticket: report.ticket,
    slice: report.slice,
    status: report.status,
    assertionsPassed: report.assertionsPassed,
    assertionsTotal: report.assertionsTotal,
    checks: report.checks,
    artifactPaths: report.artifacts.map((entry) => entry.path),
    denominator: report.denominator,
    environment: report.environment,
    network: report.network,
    boundaries: report.boundaries,
  };
}

async function fileSha256(filename) {
  return createHash("sha256").update(await readFile(filename)).digest("hex");
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

let live;
let lock;
let browser;
try {
  [live, lock, browser] = await Promise.all([
    readFile(LIVE_REPORT_PATH, "utf8").then(JSON.parse),
    readFile(LIVE_LOCK_PATH, "utf8").then(JSON.parse),
    readFile(BROWSER_REPORT_PATH, "utf8").then(JSON.parse),
  ]);
} catch (error) {
  console.error("TICKET_16_LIVE_PROVIDER_EVIDENCE_MISSING");
  process.exitCode = 2;
  live = null;
}

if (live) {
  await check("live_report_is_passed_hash_sealed_and_contract_bound", () => {
    verifyHash(live, "reportHash");
    assert.equal(live.status, "passed");
    assert.equal(live.contractHash, contract.contractHash);
  });

  await check("one_call_lock_is_hash_sealed_and_matches_the_run", () => {
    verifyHash(lock, "lockHash");
    assert.equal(lock.runId, live.runId);
    assert.equal(lock.contractHash, contract.contractHash);
    assert.equal(lock.automaticRetryAllowed, false);
  });

  await check("authorization_records_one_call_and_rotated_key_attestation", () => {
    assert.equal(live.userAuthorization.explicitOneCallFlag, true);
    assert.equal(live.userAuthorization.rotatedAfterChatExposureAttested, true);
    assert.equal(live.userAuthorization.credentialIngress,
      "anonymous_stdin_binary_pipe_only");
  });

  await check("provider_model_and_official_release_are_exact", () => {
    assert.equal(live.provider.providerId,
      "deepseek-openai-compatible-direct");
    assert.equal(live.provider.requestedModel, "deepseek-v4-flash");
    assert.equal(live.provider.reportedModel, "deepseek-v4-flash");
    assert.equal(live.provider.officialModelRelease,
      "DeepSeek-V4-Flash-0731");
  });

  await check("provider_fingerprint_and_optional_request_id_are_hash_only", () => {
    assert.match(live.provider.providerSystemFingerprintHash, HASH);
    assert(live.provider.providerRequestIdHash === null
      || HASH.test(live.provider.providerRequestIdHash));
  });

  await check("https_receipt_proves_one_pinned_attempt_without_retry", () => {
    assert.equal(live.network.status, 200);
    assert.equal(live.network.tlsServerName, "api.deepseek.com");
    assert.match(live.network.dnsAddressSetHash, HASH);
    assert.equal(live.network.tlsCertificateVerificationDisabled, false);
    assert.equal(live.network.redirectFollowed, false);
    assert.equal(live.network.proxyUsed, false);
    assert.equal(live.network.physicalAttempts, 1);
    assert.equal(live.network.automaticRetries, 0);
  });

  await check("provider_usage_has_exact_cache_breakdown", () => {
    for (const field of [
      "inputUnits", "outputUnits", "totalUnits", "inputCacheHitUnits",
      "inputCacheMissUnits",
    ]) assert(Number.isSafeInteger(live.usage[field]) && live.usage[field] >= 0);
    assert.equal(live.usage.inputCacheHitUnits
      + live.usage.inputCacheMissUnits, live.usage.inputUnits);
    assert(live.usage.totalUnits >= live.usage.inputUnits
      + live.usage.outputUnits);
  });

  await check("cost_receipt_recomputes_exactly_from_the_official_snapshot", () => {
    assert.equal(verifyStarcraftTmgProviderPricingReceiptV1(live.pricing), true);
    const recomputed = priceStarcraftTmgDeepSeekV4FlashUsageV1({
      providerId: live.provider.providerId,
      requestedModel: live.provider.requestedModel,
      reportedModel: live.provider.reportedModel,
      startedAt: live.pricing.startedAt,
      usage: live.usage,
    });
    assert.equal(recomputed.receiptHash, live.pricing.receiptHash);
    assert.equal(live.pricing.calculatedCostIsInvoice, false);
    assert.equal(live.pricing.providerInvoiceAuthoritative, true);
  });

  await check("response_and_provider_receipts_are_fingerprints_only", () => {
    assert.match(live.responseFingerprint, HASH);
    assert.match(live.safeProviderReceiptHash, HASH);
  });

  await check("durable_attempt_settled_known_actual_usage_once", () => {
    assert.match(live.durable.attemptRecordHash, HASH);
    assert.match(live.durable.budgetRecordHash, HASH);
    assert.match(live.durable.auditChainHash, HASH);
    assert.equal(live.durable.status, "completed");
    assert.equal(live.durable.usageKnown, true);
    assert.equal(live.durable.chargedUnits,
      live.usage.inputUnits + live.usage.outputUnits);
  });

  await check("credential_prompt_response_and_reasoning_persistence_are_false", () => {
    assert.equal(live.parentCredentialZeroed, true);
    assert.equal(live.credentialPersisted, false);
    assert.equal(live.credentialHashPersisted, false);
    assert.equal(live.rawPromptPersisted, false);
    assert.equal(live.rawResponsePersisted, false);
    assert.equal(live.reasoningPersisted, false);
  });

  await check("live_report_contains_no_forbidden_private_field", () => {
    const forbidden = recursiveKeys(live)
      .filter((key) => FORBIDDEN_KEYS.has(key));
    assert.deepEqual(forbidden, []);
  });

  await check("sqlite_contains_no_literal_live_prompt_or_response_contract", async () => {
    const sqlite = await readFile(SQLITE_PATH);
    const text = sqlite.toString("utf8");
    assert(!text.includes("副官已完成安全连接测试"));
    assert(!text.includes("channels.teaching.text"));
    assert(!text.includes("starcraft_tmg_online_role_output_v1"));
  });

  await check("slice_161_real_browser_safe_state_evidence_is_bound", async () => {
    verifyHash(browser, "reportHash");
    assert.equal(browser.assertionsPassed, 16);
    assert.equal(browser.assertionsTotal, 16);
    const semanticHash = hashStarcraftTmgContract(
      browserSemanticEvidence(browser));
    assert.equal(semanticHash, EXPECTED_BROWSER_SEMANTIC_HASH);
    assert.match(live.browserEvidence.reportHash, HASH);
    assert.equal(live.browserEvidence.sourceSlice, 161);
    assert.equal(live.browserEvidence.semanticEvidenceHash, semanticHash);
    assert.deepEqual(live.browserEvidence.safeStates,
      ["error", "attached", "refresh", "detached"]);
    assert.equal(browser.artifacts.length, 3);
    await Promise.all(browser.artifacts.map(async (artifact) => {
      assert.equal(await fileSha256(path.join(ROOT, artifact.path)),
        artifact.sha256);
    }));
  });

  await check("live_run_does_not_generate_dsh_skill_selfplay_muzero_or_training", () => {
    assert.equal(live.skillGenerated, false);
    assert.equal(live.dshRun, false);
    assert.equal(live.selfPlayRun, false);
    assert.equal(live.muzeroDataGenerated, false);
    assert.equal(live.trainingTruth, false);
  });

  await check("ticket_closes_only_after_all_live_evidence_is_present", () => {
    assert.equal(live.ticketComplete, true);
    assert.equal(checks.slice(0, 15).every((entry) => entry.passed), true);
  });

  assert.equal(checks.length, contract.acceptance.liveClosureAssertions,
    "live closure assertion denominator drifted");

  const reportBody = {
    schemaVersion: "starcraft_tmg_ticket_16_live_provider_closure_report_v1",
    generatedAt: new Date().toISOString(),
    ticket: 16,
    slice: 162,
    status: failures.length ? "failed" : "passed",
    assertionsPassed: checks.filter((entry) => entry.passed).length,
    assertionsTotal: checks.length,
    checks,
    failures,
    contractHash: contract.contractHash,
    liveReportHash: live.reportHash,
    requestedModel: live.provider.requestedModel,
    reportedModel: live.provider.reportedModel,
    officialModelRelease: live.provider.officialModelRelease,
    usage: clone(live.usage),
    calculatedCostNanoUsd: live.pricing.calculatedCostNanoUsd,
    calculatedCostUsd: live.pricing.calculatedCostUsd,
    responseFingerprint: live.responseFingerprint,
    providerPhysicalAttempts: live.network.physicalAttempts,
    automaticRetries: live.network.automaticRetries,
    browserReportHash: browser.reportHash,
    browserSemanticEvidenceHash: EXPECTED_BROWSER_SEMANTIC_HASH,
    sourceRefreshPerformed: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
    ticketComplete: failures.length === 0,
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
    console.log(`Ticket 16 Slice 162 live closure ${checks.length}/${checks.length}; complete; ${report.reportHash}`);
  }
}
