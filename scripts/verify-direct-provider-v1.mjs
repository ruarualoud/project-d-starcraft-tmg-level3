#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createKerriganPrimalProductBundleV1 } from "../content/characters/kerrigan-primal-v1.mjs";
import {
  createStarcraftTmgAuthoritativeEngine,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/transition-v1.mjs";
import { createProviderProfile } from "../packages/character-agent/contracts-v1.mjs";
import {
  createStarcraftTmgOpenAiCompatibleProviderTransport,
  StarcraftTmgProviderError,
} from "../packages/character-agent/openai-compatible-provider-v1.mjs";
import { createStarcraftTmgCharacterSessionRuntime } from "../packages/character-agent/session-runtime-v1.mjs";
import { createStarcraftTmgRoomRuntime } from "../packages/room-runtime/in-memory-room-v1.mjs";
import { createStarcraftTmgSampleState, loadStarcraftTmgData } from "../../scripts/starcraft-tmg-rules-v0.mjs";

const LEVEL3_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(LEVEL3_ROOT, "..");
const REPORT_PATH = path.join(LEVEL3_ROOT, "build", "direct-provider-v1", "report.json");
const OCCURRED_AT = "2026-08-24T07:00:00.000Z";
const API_KEY_SENTINEL = "sk-verifier-direct-provider-never-persist";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function headerMap(entries = {}) {
  const normalized = Object.fromEntries(Object.entries(entries).map(([key, value]) => [key.toLowerCase(), String(value)]));
  return { get(name) { return normalized[String(name || "").toLowerCase()] ?? null; } };
}

function fakeResponse(status, payload, headers = {}) {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headerMap({ "content-length": Buffer.byteLength(text, "utf8"), ...headers }),
    async text() { return text; },
  };
}

function profile(overrides = {}) {
  return createProviderProfile({
    providerProfileId: "starcraft-tmg.direct-provider.verifier.v1",
    version: "1.0.0",
    provider: "openai-compatible-direct",
    baseUrl: "https://provider.example/v1",
    model: "provider-model-v1",
    temperature: 0.2,
    topP: 1,
    contextBudget: 32768,
    outputBudget: 2048,
    timeoutMs: 100,
    retryPolicy: { maxAttempts: 1, owner: "session_supervisor", internalRetry: false },
    fallbackPolicy: "fail_closed",
    extensions: { responseFormatMode: "json_object" },
    ...overrides,
  });
}

function request(providerProfile, overrides = {}) {
  return {
    providerProfile,
    apiKey: API_KEY_SENTINEL,
    promptPack: "novice_teacher_prompt",
    promptNodes: [{ nodeType: "platform-policy", authority: "platform", content: { trainingTruth: false } }],
    userMessage: "请解释当前局面",
    intent: "chat",
    responseContract: { allowedChannels: ["teaching"], decisionCandidateSource: "forbidden" },
    ...overrides,
  };
}

async function main() {
  const checks = [];
  const failures = [];
  const captures = [];
  let clockMs = 1000;
  const successfulPayload = {
    id: "provider-response-1",
    model: "provider-model-v1",
    choices: [{ message: { role: "assistant", content: JSON.stringify({ channels: { teaching: { text: "先观察合法候选，再决定行动。" } } }) } }],
    usage: { prompt_tokens: 120, completion_tokens: 20, total_tokens: 140 },
  };
  const transport = createStarcraftTmgOpenAiCompatibleProviderTransport({
    async fetchImplementation(url, options) {
      captures.push({ url, options });
      clockMs = 1025;
      return fakeResponse(200, successfulPayload, { "x-request-id": "request-verifier-1" });
    },
    nowMs: () => clockMs,
  });
  let successfulResult = null;
  let sessionInvocation = null;

  async function check(id, fn) {
    try {
      await fn();
      checks.push({ id, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      checks.push({ id, ok: false, error: message });
      failures.push(`${id}: ${message}`);
    }
  }

  await check("direct_transport_sends_bounded_json_and_returns_safe_receipt", async () => {
    successfulResult = await transport.complete(request(profile()));
    assert(captures.length === 1, "direct transport did not make exactly one attempt");
    assert(captures[0].url === "https://provider.example/v1/chat/completions", "provider endpoint normalization mismatch");
    assert(captures[0].options.headers.authorization === `Bearer ${API_KEY_SENTINEL}`, "BYOK was not sent to the direct Provider header");
    assert(!captures[0].options.body.includes(API_KEY_SENTINEL), "BYOK entered Provider request body");
    const sent = JSON.parse(captures[0].options.body);
    assert(sent.response_format.type === "json_object", "JSON response contract was not requested");
    assert(sent.messages[0].content.includes("arbitraryToolCallsAllowed"), "sealed Harness policy was not included");
    assert(successfulResult.output.channels.teaching.text.includes("合法候选"), "Provider JSON output was not parsed");
    assert(successfulResult.receipt.internalRetries === 0 && successfulResult.receipt.usage.totalTokens === 140, "safe Provider receipt mismatch");
    assert(!JSON.stringify(successfulResult).includes(API_KEY_SENTINEL), "safe Provider result leaked BYOK");
    assert(!JSON.stringify(successfulResult.receipt).includes("请解释当前局面"), "safe Provider receipt leaked prompt content");
  });

  await check("transport_requires_https_and_a_configured_model", async () => {
    const neverFetch = createStarcraftTmgOpenAiCompatibleProviderTransport({
      fetchImplementation: async () => { throw new Error("fetch must not run"); },
    });
    let httpCode = null;
    try {
      await neverFetch.complete(request(profile({ baseUrl: "http://provider.example/v1" })));
    } catch (error) {
      httpCode = error?.code;
    }
    assert(httpCode === "PROVIDER_HTTPS_REQUIRED", "insecure remote Provider URL was accepted");
    let modelCode = null;
    try {
      await neverFetch.complete(request(profile({ model: "administrator_must_select" })));
    } catch (error) {
      modelCode = error?.code;
    }
    assert(modelCode === "PROVIDER_MODEL_NOT_CONFIGURED", "placeholder model reached Provider transport");
  });

  await check("http_failures_do_not_read_or_echo_provider_body_and_never_retry_internally", async () => {
    let calls = 0;
    let bodyReads = 0;
    const failing = createStarcraftTmgOpenAiCompatibleProviderTransport({
      async fetchImplementation() {
        calls += 1;
        return {
          ok: false,
          status: 500,
          headers: headerMap({ "x-request-id": "request-upstream-500" }),
          async text() {
            bodyReads += 1;
            return `provider secret body ${API_KEY_SENTINEL}`;
          },
        };
      },
    });
    let failure = null;
    try {
      await failing.complete(request(profile()));
    } catch (error) {
      failure = error;
    }
    assert(failure instanceof StarcraftTmgProviderError && failure.code === "PROVIDER_UPSTREAM_FAILED", "HTTP 500 failure classification mismatch");
    assert(calls === 1 && bodyReads === 0, "Provider Adapter retried or read an unsafe failure body");
    assert(failure.safeReceipt.retryable === true && failure.safeReceipt.requestId === "request-upstream-500", "safe failure receipt mismatch");
    assert(!JSON.stringify(failure.safeReceipt).includes(API_KEY_SENTINEL), "failure receipt leaked Provider body or BYOK");
  });

  await check("timeout_covers_response_body_not_only_headers", async () => {
    const bodyTimeoutProfile = profile({ timeoutMs: 5 });
    const stalled = createStarcraftTmgOpenAiCompatibleProviderTransport({
      async fetchImplementation(_url, options) {
        return {
          ok: true,
          status: 200,
          headers: headerMap({ "x-request-id": "request-stalled-body" }),
          text() {
            return new Promise((_resolve, reject) => {
              options.signal.addEventListener("abort", () => {
                const error = new Error("aborted");
                error.name = "AbortError";
                reject(error);
              }, { once: true });
            });
          },
        };
      },
    });
    let code = null;
    try {
      await stalled.complete(request(bodyTimeoutProfile));
    } catch (error) {
      code = error?.code;
    }
    assert(code === "PROVIDER_BODY_TIMEOUT", "response-body timeout was not distinguished");
  });

  await check("character_session_binds_safe_provider_receipt_into_harness_trace", async () => {
    const data = await loadStarcraftTmgData(PROJECT_ROOT);
    const authorityEngine = createStarcraftTmgAuthoritativeEngine({ now: () => OCCURRED_AT });
    const roomRuntime = createStarcraftTmgRoomRuntime({ authorityEngine, now: () => OCCURRED_AT });
    const state = createStarcraftTmgSampleState(data);
    state.board.terrain = [];
    const serverSeatPlan = [
      { label: "tutor", seatKey: "player1", roleMode: "tutor", principalType: "model" },
    ];
    const room = await roomRuntime.createRoom({
      roomId: "direct-provider-verifier-room",
      gameId: "starcraft-tmg",
      initialStateAuthority: {
        source: "server_factory",
        state,
        dataVersion: data.version,
        receiptHash: hashStarcraftTmgContract({ source: "direct-provider-verifier-v2", state }),
        serverSeatPlan,
      },
      serverSeatPlan,
    });
    assert(room.ok, "room setup failed");
    const bundle = createKerriganPrimalProductBundleV1();
    const configuredProfile = profile({
      providerProfileId: bundle.providerProfile.providerProfileId,
      version: bundle.providerProfile.version,
    });
    const runtime = createStarcraftTmgCharacterSessionRuntime({ roomRuntime, providerTransport: transport, now: () => OCCURRED_AT });
    const created = await runtime.createSession({
      sessionId: "direct-provider-tutor-session",
      characterPackage: bundle.characterPackage,
      roleSkillPack: bundle.roleSkillPacks.tutor,
      conversationProfile: bundle.conversationProfile,
      providerProfile: configuredProfile,
      worldbooks: bundle.worldbooks,
      mode: "tutor",
      roomId: "direct-provider-verifier-room",
      seatId: "player1",
      seatToken: room.credentials.tutor.seatToken,
      rulesetVersion: "starcraft_tmg_rules_v0",
      memoryRefs: [],
      ruleSkillRefs: ["starcraft_tmg_turn_flow_v61"],
      createdAt: OCCURRED_AT,
    });
    assert(created.ok, "Tutor session setup failed");
    assert(runtime.bindByok({ sessionId: "direct-provider-tutor-session", apiKey: API_KEY_SENTINEL, boundAt: OCCURRED_AT }).ok, "BYOK bind failed");
    sessionInvocation = await runtime.invoke({
      sessionId: "direct-provider-tutor-session",
      userMessage: "请解释当前局面",
      intent: "chat",
      occurredAt: OCCURRED_AT,
    });
    assert(sessionInvocation.ok && sessionInvocation.output.channels.teaching, "real transport seam did not complete Tutor invocation");
    assert(sessionInvocation.trace.providerReceipt?.receiptHash, "safe Provider receipt was not bound into Harness trace");
    assert(sessionInvocation.trace.providerReceipt.responseFingerprint === successfulResult.receipt.responseFingerprint, "Harness trace receipt lost output binding");
    assert(sessionInvocation.trace.harnessToolsCalled.join("/") === "read_board_state/list_legal_actions/read_character_worldbook", "Tutor Harness trace tool sequence mismatch");
    assert(!JSON.stringify(sessionInvocation).includes(API_KEY_SENTINEL), "Harness trace or result leaked BYOK");
    const currentRoom = await roomRuntime.readRoom({ roomId: "direct-provider-verifier-room" });
    assert(sessionInvocation.preview === null && currentRoom.projection.room.stateRevision === 0, "Tutor Provider invocation mutated room");
  });

  const report = {
    schemaVersion: "starcraft_tmg_direct_provider_verifier_v1",
    generatedAt: new Date().toISOString(),
    ok: failures.length === 0,
    checks,
    failures,
    evidence: {
      providerReceiptHash: successfulResult?.receipt?.receiptHash || null,
      sessionTraceId: sessionInvocation?.trace?.traceId || null,
      requestCount: captures.length,
      providerEvidence: "injected_fetch_only_not_live_provider",
      apiKeyPersisted: false,
      internalRetries: 0,
      productionReady: false,
      trainingTruth: false,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["novice_teacher_prompt"],
      harnessToolsCalled: sessionInvocation?.trace?.harnessToolsCalled || [],
      uiTraceEvidence: "not_run",
      agentDecisionEvidence: null,
      memoryTraceEvidence: { refs: [], writes: 0, crossModeIsolationChecked: false },
      trainingTraceCandidates: 0,
      rollbackOrDemotionRules: [
        "disable a Provider profile after authentication, payment, response-contract, or unsafe-receipt failure",
        "require explicit supervisor authority before retrying any failed billable request",
        "keep all role outputs read-only unless the Opponent returns a current enabled LegalSpace candidate",
      ],
      userVisibleChecks: "not_run",
    },
  };
  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (!report.ok) throw new Error(failures.join("\n"));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
