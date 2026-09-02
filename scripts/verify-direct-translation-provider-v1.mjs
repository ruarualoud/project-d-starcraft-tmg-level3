#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_ZH_CN_CORE_GLOSSARY_V1 } from
  "../content/localization/zh-cn-core-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  createStarcraftTmgDirectTranslationProviderV1,
  createStarcraftTmgTranslationProviderProfileV1,
  StarcraftTmgTranslationProviderError,
} from "../packages/localization/direct-translation-provider-v1.mjs";
import { createConfiguredStarcraftTmgOfficialSourceLocalizationRuntimeV2 } from
  "../packages/product-composition/source-localization-factory-v2.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = path.join(ROOT, "build/ticket-12-direct-translation-provider-v1/report.json");
const CREATED_AT = "2026-09-02T17:00:00.000Z";
const SECRET = "provider-secret-slice-115-never-persist";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function headers(values = {}) {
  const map = Object.fromEntries(Object.entries(values).map(([key, value]) => [key.toLowerCase(), String(value)]));
  return { get(name) { return map[String(name || "").toLowerCase()] ?? null; } };
}

function response(status, payload, extraHeaders = {}, onText = () => {}) {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headers({ "content-length": Buffer.byteLength(text, "utf8"), ...extraHeaders }),
    async text() {
      onText();
      return text;
    },
  };
}

function profile(overrides = {}) {
  return createStarcraftTmgTranslationProviderProfileV1({
    id: "translation-admin-default",
    version: "1",
    providerClass: "direct_translation_provider",
    provider: "openai-compatible-direct",
    baseUrl: "https://translation.example/v1",
    allowedHosts: ["translation.example"],
    chatCompletionsPath: "/chat/completions",
    model: "translation-model-v1",
    promptTemplateVersion: "starcraft-tmg-translation-prompt-v1",
    secretRef: "vault://translation/provider-primary",
    temperature: 0,
    topP: 1,
    maxInputChars: 16000,
    maxOutputTokens: 64,
    timeoutMs: 100,
    retryPolicy: { maxAttempts: 2, baseDelayMs: 10 },
    pricing: {
      inputMicrosPerMillionTokens: 1_000_000,
      outputMicrosPerMillionTokens: 2_000_000,
    },
    maxCostMicros: 5000,
    ...overrides,
  });
}

const frozen = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: ROOT });
const canonicalBefore = JSON.stringify(frozen.dataset);
const primaryProfile = profile();
const captures = [];
const delays = [];
let bodyReadsOnFailure = 0;
let secretResolutions = 0;
let clock = 1000;
let providerRequest = null;
const successfulPayload = {
  id: "translation-response-1",
  model: "translation-model-v1",
  choices: [{ message: { content: JSON.stringify({ translatedText: "使徒" }) } }],
  usage: { prompt_tokens: 480, completion_tokens: 3, total_tokens: 483 },
};
let transportCall = 0;
const directProvider = createStarcraftTmgDirectTranslationProviderV1({
  resolveProfile: async () => primaryProfile,
  resolveSecret: async (secretRef) => {
    secretResolutions += 1;
    assert(secretRef === primaryProfile.secretRef, "secret reference mismatch");
    return SECRET;
  },
  async fetchImplementation(url, options) {
    transportCall += 1;
    captures.push({ url, options });
    clock += 7;
    if (transportCall === 1) {
      return response(429, `unsafe failure body ${SECRET}`, { "x-request-id": "translation-rate-limit-1" }, () => {
        bodyReadsOnFailure += 1;
      });
    }
    return response(200, successfulPayload, { "x-request-id": "translation-success-2" });
  },
  sleep: async (delayMs) => { delays.push(delayMs); },
  nowMs: () => clock,
  now: () => CREATED_AT,
});
const translationAdapter = {
  async translate(request) {
    providerRequest = clone(request);
    return directProvider.translate(request);
  },
};
const composition = createConfiguredStarcraftTmgOfficialSourceLocalizationRuntimeV2({
  sourceLock: frozen.lock,
  sourceLockAudit: frozen.audit,
  snapshot: frozen.snapshot,
  dataset: frozen.dataset,
  glossaries: [STARCRAFT_TMG_ZH_CN_CORE_GLOSSARY_V1],
  translationAdapter,
  resolveProviderProfile(id) {
    return id === primaryProfile.id ? primaryProfile : null;
  },
  now: () => CREATED_AT,
});

const checks = [];
const failures = [];
async function check(id, fn) {
  try {
    await fn();
    checks.push({ id, passed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push({ id, passed: false, error: message });
    failures.push(`${id}: ${message}`);
  }
}

let runtimeResult;

await check("provider_profile_is_sealed_https_host_allowlisted_and_dsh_free", () => {
  assert(primaryProfile.profileHash === hashStarcraftTmgContract(
    Object.fromEntries(Object.entries(primaryProfile).filter(([key]) => key !== "profileHash")),
  ), "profile seal mismatch");
  assert(primaryProfile.providerClass === "direct_translation_provider", "direct Provider class missing");
  assert(primaryProfile.dshAllowed === false && primaryProfile.mayAffectRules === false, "Provider profile authority widened");
});

await check("real_direct_adapter_wire_contract_retries_once_then_returns_structured_translation", async () => {
  runtimeResult = await composition.runtime.requestMachineTranslation({
    recordType: "unit",
    canonicalId: "adept",
    fieldPath: "army_units[].name",
    targetLocale: "zh-CN",
    providerProfileId: primaryProfile.id,
    createdAt: CREATED_AT,
  });
  assert(runtimeResult.ok && runtimeResult.candidate.translatedText === "使徒", "structured translation failed");
  assert(captures.length === 2 && delays.join(",") === "10", "bounded retry sequence mismatch");
  assert(bodyReadsOnFailure === 0, "unsafe Provider failure body was read");
  assert(captures[0].url === "https://translation.example/v1/chat/completions", "egress endpoint mismatch");
  assert(secretResolutions === 1, "secret was resolved more than once per translation");
});

await check("credential_is_header_only_and_absent_from_prompt_candidate_receipts_and_failures", () => {
  assert(captures.every((entry) => entry.options.headers.authorization === `Bearer ${SECRET}`), "secret did not reach authorization header");
  assert(captures.every((entry) => !entry.options.body.includes(SECRET)), "secret entered request body");
  assert(!JSON.stringify(runtimeResult).includes(SECRET), "secret entered runtime result");
  assert(!JSON.stringify(runtimeResult.candidate.providerReceipt).includes(primaryProfile.secretRef), "secret reference entered public receipt");
});

await check("receipt_binds_profile_model_egress_prompt_glossary_dataset_cost_and_attempts", () => {
  const receipt = runtimeResult.candidate.providerReceipt;
  assert(receipt.providerProfileRef.hash === primaryProfile.profileHash, "profile hash missing");
  assert(receipt.model === primaryProfile.model && receipt.egress.host === "translation.example", "model/egress binding missing");
  assert(receipt.promptTemplateVersion === primaryProfile.promptTemplateVersion && receipt.promptHash, "prompt receipt missing");
  assert(receipt.glossaryHash === STARCRAFT_TMG_ZH_CN_CORE_GLOSSARY_V1.glossaryHash, "glossary binding missing");
  assert(receipt.datasetHash === composition.datasetManifest.datasetHash, "dataset binding missing");
  assert(receipt.attemptCount === 2 && receipt.attempts[0].code === "TRANSLATION_PROVIDER_RATE_LIMITED", "attempt accounting mismatch");
  assert(receipt.attempts[1].code === "ok" && receipt.cost.actualMicros <= receipt.cost.maxMicros, "success/cost receipt mismatch");
  assert(receipt.receiptHash === hashStarcraftTmgContract(
    Object.fromEntries(Object.entries(receipt).filter(([key]) => key !== "receiptHash")),
  ), "provider receipt seal mismatch");
});

await check("translation_is_machine_draft_only_and_canonical_source_remains_byte_stable", () => {
  assert(runtimeResult.candidate.status === "machine_draft", "translation bypassed human review");
  assert(runtimeResult.candidate.displayOnly === true && runtimeResult.candidate.mayAffectRules === false, "translation gained Rules authority");
  assert(runtimeResult.candidate.eligibleForTraining === false && runtimeResult.candidate.trainingTruth === false, "translation gained training authority");
  assert(JSON.stringify(frozen.dataset) === canonicalBefore, "Provider changed frozen canonical dataset");
  const canonical = composition.runtime.render({
    recordType: "unit",
    canonicalId: "adept",
    fieldPath: "army_units[].name",
    targetLocale: "zh-CN",
  });
  assert(canonical.text === "Adept" && canonical.source === "canonical_fallback", "unreviewed draft replaced canonical display");
});

await check("cost_reservation_rejects_before_secret_resolution_or_egress", async () => {
  const lowBudget = profile({ maxCostMicros: 0 });
  let fetches = 0;
  let secrets = 0;
  const provider = createStarcraftTmgDirectTranslationProviderV1({
    resolveProfile: async () => lowBudget,
    resolveSecret: async () => { secrets += 1; return SECRET; },
    fetchImplementation: async () => { fetches += 1; throw new Error("must not fetch"); },
    sleep: async () => {},
  });
  let code = null;
  try {
    await provider.translate(providerRequest);
  } catch (error) {
    code = error?.code;
  }
  assert(code === "TRANSLATION_PROVIDER_COST_BUDGET_EXCEEDED", "cost budget did not fail closed");
  assert(fetches === 0 && secrets === 0, "cost rejection happened after credential/egress");
});

await check("retry_exhaustion_returns_safe_attempt_ledger_without_reading_failure_bodies", async () => {
  let calls = 0;
  let reads = 0;
  const provider = createStarcraftTmgDirectTranslationProviderV1({
    resolveProfile: async () => primaryProfile,
    resolveSecret: async () => SECRET,
    fetchImplementation: async () => {
      calls += 1;
      return response(500, `unsafe ${SECRET}`, { "x-request-id": `failed-${calls}` }, () => { reads += 1; });
    },
    sleep: async () => {},
  });
  let failure;
  try {
    await provider.translate(providerRequest);
  } catch (error) {
    failure = error;
  }
  assert(failure instanceof StarcraftTmgTranslationProviderError, "typed Provider failure missing");
  assert(failure.code === "TRANSLATION_PROVIDER_UPSTREAM_FAILED", "failure class mismatch");
  assert(calls === 2 && reads === 0 && failure.safeReceipt.attemptCount === 2, "bounded failure accounting mismatch");
  assert(!JSON.stringify(failure.safeReceipt).includes(SECRET), "failure receipt leaked secret/body");
});

await check("malformed_output_and_credential_echo_fail_closed_without_retry", async () => {
  let malformedCalls = 0;
  const malformed = createStarcraftTmgDirectTranslationProviderV1({
    resolveProfile: async () => primaryProfile,
    resolveSecret: async () => SECRET,
    fetchImplementation: async () => {
      malformedCalls += 1;
      return response(200, { choices: [{ message: { content: "not-json" } }] });
    },
    sleep: async () => {},
  });
  let malformedCode;
  try { await malformed.translate(providerRequest); } catch (error) { malformedCode = error?.code; }
  assert(malformedCode === "TRANSLATION_PROVIDER_RESPONSE_CONTRACT_REJECTED" && malformedCalls === 1, "malformed response retried or passed");

  const echo = createStarcraftTmgDirectTranslationProviderV1({
    resolveProfile: async () => primaryProfile,
    resolveSecret: async () => SECRET,
    fetchImplementation: async () => response(200, {
      choices: [{ message: { content: JSON.stringify({ translatedText: SECRET }) } }],
    }),
    sleep: async () => {},
  });
  let echoFailure;
  try { await echo.translate(providerRequest); } catch (error) { echoFailure = error; }
  assert(echoFailure?.code === "TRANSLATION_PROVIDER_CREDENTIAL_ECHO_DETECTED", "credential echo was accepted");
  assert(!JSON.stringify(echoFailure.safeReceipt).includes(SECRET), "credential echo leaked into failure receipt");
});

await check("https_and_host_allowlist_are_enforced_before_transport", () => {
  let httpRejected = false;
  try { profile({ baseUrl: "http://translation.example/v1" }); } catch (error) {
    httpRejected = error?.code === "TRANSLATION_PROVIDER_HTTPS_REQUIRED";
  }
  let hostRejected = false;
  try { profile({ baseUrl: "https://other.example/v1" }); } catch (error) {
    hostRejected = error?.code === "TRANSLATION_PROVIDER_HOST_NOT_ALLOWED";
  }
  assert(httpRejected && hostRejected, "HTTPS/host allowlist gate failed");
});

await check("dsh_is_rejected_before_profile_resolution_or_egress", async () => {
  let resolved = 0;
  let fetched = 0;
  const provider = createStarcraftTmgDirectTranslationProviderV1({
    resolveProfile: async () => { resolved += 1; return primaryProfile; },
    resolveSecret: async () => SECRET,
    fetchImplementation: async () => { fetched += 1; throw new Error("must not fetch"); },
    sleep: async () => {},
  });
  const dshRequest = clone(providerRequest);
  dshRequest.intent.providerClass = "deepseek-harness";
  let code;
  try { await provider.translate(dshRequest); } catch (error) { code = error?.code; }
  assert(code === "TRANSLATION_PROVIDER_DSH_FORBIDDEN", "DSH translation path was not rejected");
  assert(resolved === 0 && fetched === 0, "DSH reached profile or network seam");
});

await check("runtime_surfaces_safe_failure_receipt_for_operator_retry_accounting", async () => {
  const failingProvider = createStarcraftTmgDirectTranslationProviderV1({
    resolveProfile: async () => primaryProfile,
    resolveSecret: async () => SECRET,
    fetchImplementation: async () => response(500, "never read"),
    sleep: async () => {},
  });
  const failingComposition = createConfiguredStarcraftTmgOfficialSourceLocalizationRuntimeV2({
    sourceLock: frozen.lock,
    sourceLockAudit: frozen.audit,
    snapshot: frozen.snapshot,
    dataset: frozen.dataset,
    glossaries: [STARCRAFT_TMG_ZH_CN_CORE_GLOSSARY_V1],
    translationAdapter: failingProvider,
    resolveProviderProfile: () => primaryProfile,
    now: () => CREATED_AT,
  });
  const result = await failingComposition.runtime.requestMachineTranslation({
    recordType: "unit",
    canonicalId: "adept",
    fieldPath: "army_units[].name",
    targetLocale: "zh-CN",
    providerProfileId: primaryProfile.id,
    createdAt: CREATED_AT,
  });
  assert(result.ok === false && result.failureClass === "TRANSLATION_PROVIDER_UPSTREAM_FAILED", "runtime failure class missing");
  assert(result.providerFailureReceipt.attemptCount === 2, "runtime failure attempt ledger missing");
  assert(!JSON.stringify(result).includes(SECRET), "runtime failure leaked credential");
});

const report = {
  schema: "starcraft_tmg_ticket_12_slice_115_direct_translation_provider_verification_v1",
  generatedAt: CREATED_AT,
  ticket: 12,
  slice: 115,
  status: failures.length === 0 ? "passed" : "failed",
  checks,
  counts: {
    assertions: checks.length,
    passed: checks.filter((entry) => entry.passed).length,
    failed: failures.length,
    successfulAttemptCount: runtimeResult?.candidate?.providerReceipt?.attemptCount || 0,
  },
  evidence: {
    providerProfileHash: primaryProfile.profileHash,
    providerReceiptHash: runtimeResult?.candidate?.providerReceipt?.receiptHash || null,
    promptHash: runtimeResult?.candidate?.providerReceipt?.promptHash || null,
    glossaryHash: STARCRAFT_TMG_ZH_CN_CORE_GLOSSARY_V1.glossaryHash,
    localizationDatasetHash: composition.datasetManifest.datasetHash,
    directAdapterWireSmoke: failures.length === 0 ? "passed" : "failed",
    liveExternalProviderSmoke: "not_run_no_user_supplied_external_provider_credential",
    productionReady: false,
    canonicalUnchanged: JSON.stringify(frozen.dataset) === canonicalBefore,
  },
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["fact_probe"],
    skillsRead: 0,
    skillsGenerated: 0,
    judgeTests: checks.length,
    crossTimeReplayResult: failures.length === 0 ? "passed" : "failed",
    promotions: [],
    blocks: ["live_external_provider_requires_user_supplied_credential", "translation_remains_human_review_required_display_only"],
    remainingRuleGaps: 0,
  },
  dshUsed: false,
  muzeroUsed: false,
  selfPlayUsed: false,
  trainingPromotion: false,
  failures,
};
report.reportHash = hashStarcraftTmgContract(report);
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
