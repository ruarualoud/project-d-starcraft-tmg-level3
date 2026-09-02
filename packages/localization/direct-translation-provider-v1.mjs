import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const STARCRAFT_TMG_DIRECT_TRANSLATION_PROVIDER_VERSION =
  "starcraft_tmg_direct_translation_provider_v1";

const DEFAULT_MAX_REQUEST_BYTES = 256 * 1024;
const DEFAULT_MAX_RESPONSE_BYTES = 256 * 1024;
const RETRYABLE_CODES = new Set([
  "TRANSLATION_PROVIDER_TRANSPORT_FAILED",
  "TRANSLATION_PROVIDER_TRANSPORT_TIMEOUT",
  "TRANSLATION_PROVIDER_BODY_TIMEOUT",
  "TRANSLATION_PROVIDER_HTTP_TIMEOUT",
  "TRANSLATION_PROVIDER_RATE_LIMITED",
  "TRANSLATION_PROVIDER_UPSTREAM_FAILED",
]);

function fail(code, receipt = {}) {
  throw new StarcraftTmgTranslationProviderError(code, receipt);
}

function requiredString(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function safeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : fallback;
}

function boundedInteger(value, field, min, max) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) {
    throw new Error(`${field} must be an integer in ${min}..${max}`);
  }
  return number;
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value || {}).filter(([key]) => !keys.includes(key)));
}

function assertSealed(value, hashKey, code) {
  if (!value?.[hashKey]
    || hashStarcraftTmgContract(without(value, [hashKey])) !== value[hashKey]) {
    fail(code);
  }
}

function seal(body, hashKey) {
  return deepFreeze({ ...body, [hashKey]: hashStarcraftTmgContract(body) });
}

function noCredentialMaterial(value, code) {
  const serialized = JSON.stringify(value || {}).toLowerCase();
  if (/api[_-]?key|authorization|bearer|secretvalue|access[_-]?token|cookie/.test(serialized)) {
    fail(code);
  }
}

function endpointFor(profile) {
  let base;
  try {
    base = new URL(profile.baseUrl);
  } catch {
    fail("TRANSLATION_PROVIDER_BASE_URL_INVALID");
  }
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) {
    fail("TRANSLATION_PROVIDER_HTTPS_REQUIRED");
  }
  if (!profile.allowedHosts.includes(base.hostname)) {
    fail("TRANSLATION_PROVIDER_HOST_NOT_ALLOWED", { egressHost: base.hostname });
  }
  const route = profile.chatCompletionsPath;
  if (!/^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+$/u.test(route)
    || route.includes("..") || route.includes("//")) {
    fail("TRANSLATION_PROVIDER_PATH_INVALID");
  }
  const basePath = base.pathname.replace(/\/+$/u, "");
  base.pathname = `${basePath}${route}`.replace(/\/{2,}/gu, "/");
  return { url: base.toString(), host: base.hostname, path: base.pathname };
}

function safeRequestId(value) {
  const normalized = String(value || "").trim();
  return /^[A-Za-z0-9._:-]{1,200}$/u.test(normalized) ? normalized : null;
}

function safeUsage(value = {}) {
  const inputTokens = safeInteger(value.prompt_tokens ?? value.input_tokens);
  const outputTokens = safeInteger(value.completion_tokens ?? value.output_tokens);
  const totalTokens = safeInteger(value.total_tokens) || inputTokens + outputTokens;
  return { inputTokens, outputTokens, totalTokens };
}

function costMicros(usage, pricing) {
  return Math.ceil((usage.inputTokens * pricing.inputMicrosPerMillionTokens
    + usage.outputTokens * pricing.outputMicrosPerMillionTokens) / 1_000_000);
}

function failureCode(status) {
  if (status === 401 || status === 403) return "TRANSLATION_PROVIDER_AUTHENTICATION_FAILED";
  if (status === 402) return "TRANSLATION_PROVIDER_PAYMENT_REQUIRED";
  if (status === 408) return "TRANSLATION_PROVIDER_HTTP_TIMEOUT";
  if (status === 429) return "TRANSLATION_PROVIDER_RATE_LIMITED";
  if (status >= 500) return "TRANSLATION_PROVIDER_UPSTREAM_FAILED";
  return "TRANSLATION_PROVIDER_HTTP_REJECTED";
}

function responseObject(payload) {
  const message = payload?.choices?.[0]?.message;
  if (message?.parsed && typeof message.parsed === "object" && !Array.isArray(message.parsed)) {
    return message.parsed;
  }
  if (message?.content && typeof message.content === "object" && !Array.isArray(message.content)) {
    return message.content;
  }
  if (typeof message?.content !== "string") {
    fail("TRANSLATION_PROVIDER_RESPONSE_CONTRACT_REJECTED", { reason: "assistant_json_missing" });
  }
  try {
    const parsed = JSON.parse(message.content);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not object");
    return parsed;
  } catch {
    fail("TRANSLATION_PROVIDER_RESPONSE_CONTRACT_REJECTED", { reason: "assistant_json_invalid" });
  }
}

function promptFor(request, profile) {
  const intent = request.intent;
  assertSealed(intent, "intentHash", "TRANSLATION_PROVIDER_INTENT_INVALID");
  if (intent.providerClass !== "direct_translation_provider"
    || /dsh|deepseek[-_ ]?harness/iu.test(intent.providerClass)
    || intent.providerProfileRef?.id !== profile.id
    || intent.providerProfileRef?.version !== profile.version
    || intent.promptTemplateVersion !== profile.promptTemplateVersion
    || intent.glossaryRef?.hash !== request.glossary?.glossaryHash
    || intent.canonicalTextHash !== hashStarcraftTmgContract(request.canonicalText)
    || intent.displayOnly !== true
    || intent.mayAffectRules !== false
    || intent.trainingTruth !== false) {
    fail("TRANSLATION_PROVIDER_INTENT_BINDING_MISMATCH");
  }
  assertSealed(request.glossary, "glossaryHash", "TRANSLATION_PROVIDER_GLOSSARY_INVALID");
  const contract = {
    schema: "starcraft_tmg_translation_prompt_contract_v1",
    promptTemplateVersion: profile.promptTemplateVersion,
    gameId: "starcraft-tmg",
    sourceLocale: intent.sourceLocale,
    targetLocale: intent.targetLocale,
    datasetRef: intent.datasetRef,
    recordRef: intent.recordRef,
    glossaryRef: intent.glossaryRef,
    constraints: {
      translateDisplayTextOnly: true,
      preserveIdentifiersNumbersAndGameTerms: true,
      doNotAddRules: true,
      doNotInterpretRules: true,
      outputJsonShape: { translatedText: "non-empty string" },
      dshAllowed: false,
      mayAffectRules: false,
      trainingTruth: false,
    },
    glossaryEntries: request.glossary.entries.map((entry) => ({
      sourceTerm: entry.sourceTerm,
      targetTerm: entry.targetTerm,
      caseSensitive: entry.caseSensitive,
      protectedIdentifier: entry.protectedIdentifier,
    })),
  };
  const system = `Follow this sealed translation contract. Return one JSON object and no markdown.\n${JSON.stringify(contract)}`;
  const user = JSON.stringify({ canonicalText: requiredString(request.canonicalText, "canonicalText") });
  return {
    system,
    user,
    promptHash: hashStarcraftTmgContract({ system, user }),
  };
}

function requestBody(profile, prompt) {
  return {
    model: profile.model,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    temperature: profile.temperature,
    top_p: profile.topP,
    max_tokens: profile.maxOutputTokens,
    response_format: { type: "json_object" },
  };
}

function attemptReceipt(body) {
  return seal({
    schema: "starcraft_tmg_translation_provider_attempt_v1",
    ...body,
  }, "attemptHash");
}

export class StarcraftTmgTranslationProviderError extends Error {
  constructor(code, safeReceipt = {}) {
    super(code);
    this.name = "StarcraftTmgTranslationProviderError";
    this.code = code;
    noCredentialMaterial(safeReceipt, "TRANSLATION_PROVIDER_FAILURE_RECEIPT_UNSAFE");
    this.safeReceipt = deepFreeze({
      schema: `${STARCRAFT_TMG_DIRECT_TRANSLATION_PROVIDER_VERSION}.failure`,
      code,
      retryable: RETRYABLE_CODES.has(code),
      ...clone(safeReceipt),
      productionReady: false,
      trainingTruth: false,
    });
  }
}

export function createStarcraftTmgTranslationProviderProfileV1(input = {}) {
  const providerClass = input.providerClass || "direct_translation_provider";
  if (providerClass !== "direct_translation_provider"
    || /dsh|deepseek[-_ ]?harness/iu.test(String(input.provider || ""))) {
    throw new Error("DSH is forbidden in translation Provider profiles");
  }
  noCredentialMaterial(without(input, ["secretRef"]), "TRANSLATION_PROVIDER_PROFILE_CONTAINS_CREDENTIAL");
  const allowedHosts = [...new Set((input.allowedHosts || []).map((host) => requiredString(host, "allowedHosts")))]
    .sort();
  if (allowedHosts.length === 0) throw new Error("allowedHosts is required");
  const body = {
    schema: "starcraft_tmg_translation_provider_profile_v1",
    id: requiredString(input.id, "id"),
    version: requiredString(input.version, "version"),
    providerClass,
    provider: requiredString(input.provider, "provider"),
    baseUrl: requiredString(input.baseUrl, "baseUrl"),
    allowedHosts,
    chatCompletionsPath: input.chatCompletionsPath || "/chat/completions",
    model: requiredString(input.model, "model"),
    promptTemplateVersion: requiredString(input.promptTemplateVersion, "promptTemplateVersion"),
    secretRef: requiredString(input.secretRef, "secretRef"),
    temperature: Number(input.temperature ?? 0),
    topP: Number(input.topP ?? 1),
    maxInputChars: boundedInteger(input.maxInputChars ?? 16000, "maxInputChars", 1, 1_000_000),
    maxOutputTokens: boundedInteger(input.maxOutputTokens ?? 1024, "maxOutputTokens", 1, 100_000),
    timeoutMs: boundedInteger(input.timeoutMs ?? 30000, "timeoutMs", 1, 300_000),
    retryPolicy: {
      maxAttempts: boundedInteger(input.retryPolicy?.maxAttempts ?? 2, "retryPolicy.maxAttempts", 1, 3),
      baseDelayMs: boundedInteger(input.retryPolicy?.baseDelayMs ?? 250, "retryPolicy.baseDelayMs", 0, 5000),
    },
    pricing: {
      inputMicrosPerMillionTokens: boundedInteger(
        input.pricing?.inputMicrosPerMillionTokens ?? 0,
        "pricing.inputMicrosPerMillionTokens",
        0,
        10_000_000_000,
      ),
      outputMicrosPerMillionTokens: boundedInteger(
        input.pricing?.outputMicrosPerMillionTokens ?? 0,
        "pricing.outputMicrosPerMillionTokens",
        0,
        10_000_000_000,
      ),
    },
    maxCostMicros: boundedInteger(input.maxCostMicros ?? 1_000_000, "maxCostMicros", 0, 1_000_000_000),
    fallbackPolicy: "fail_closed",
    dshAllowed: false,
    mayAffectRules: false,
    trainingTruth: false,
  };
  if (!Number.isFinite(body.temperature) || body.temperature < 0 || body.temperature > 2
    || !Number.isFinite(body.topP) || body.topP < 0 || body.topP > 1) {
    throw new Error("temperature/topP is outside the supported range");
  }
  endpointFor(body);
  return seal(body, "profileHash");
}

export function createStarcraftTmgDirectTranslationProviderV1(options = {}) {
  const fetchImplementation = options.fetchImplementation || globalThis.fetch;
  const resolveProfile = options.resolveProfile;
  const resolveSecret = options.resolveSecret;
  const sleep = options.sleep || ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));
  const nowMs = options.nowMs || (() => Date.now());
  const now = options.now || (() => new Date().toISOString());
  const maxRequestBytes = safeInteger(options.maxRequestBytes, DEFAULT_MAX_REQUEST_BYTES);
  const maxResponseBytes = safeInteger(options.maxResponseBytes, DEFAULT_MAX_RESPONSE_BYTES);
  if (typeof fetchImplementation !== "function" || typeof resolveProfile !== "function"
    || typeof resolveSecret !== "function" || typeof sleep !== "function") {
    throw new Error("fetchImplementation, resolveProfile, resolveSecret, and sleep are required");
  }

  async function translate(request = {}) {
    if (/dsh|deepseek[-_ ]?harness/iu.test(String(request.intent?.providerClass || ""))) {
      fail("TRANSLATION_PROVIDER_DSH_FORBIDDEN");
    }
    const profile = await resolveProfile(clone(request.intent?.providerProfileRef));
    assertSealed(profile, "profileHash", "TRANSLATION_PROVIDER_PROFILE_INVALID");
    const endpoint = endpointFor(profile);
    const prompt = promptFor(request, profile);
    if (request.canonicalText.length > profile.maxInputChars) {
      fail("TRANSLATION_PROVIDER_INPUT_TOO_LARGE", { profileHash: profile.profileHash });
    }
    const payload = requestBody(profile, prompt);
    const body = JSON.stringify(payload);
    if (Buffer.byteLength(body, "utf8") > maxRequestBytes) {
      fail("TRANSLATION_PROVIDER_REQUEST_TOO_LARGE", { profileHash: profile.profileHash, maxRequestBytes });
    }
    const estimatedInputTokens = Math.ceil(Buffer.byteLength(`${prompt.system}${prompt.user}`, "utf8") / 4);
    const reservedCostMicros = costMicros({
      inputTokens: estimatedInputTokens,
      outputTokens: profile.maxOutputTokens,
    }, profile.pricing);
    if (reservedCostMicros > profile.maxCostMicros) {
      fail("TRANSLATION_PROVIDER_COST_BUDGET_EXCEEDED", {
        profileHash: profile.profileHash,
        reservedCostMicros,
        maxCostMicros: profile.maxCostMicros,
      });
    }
    const secret = requiredString(await resolveSecret(profile.secretRef), "resolved Provider secret");
    const attempts = [];
    let lastError = null;

    for (let attempt = 1; attempt <= profile.retryPolicy.maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), profile.timeoutMs);
      const startedAtMs = nowMs();
      let headersReceived = false;
      try {
        const response = await fetchImplementation(endpoint.url, {
          method: "POST",
          headers: {
            authorization: `Bearer ${secret}`,
            "content-type": "application/json",
            accept: "application/json",
          },
          body,
          signal: controller.signal,
        });
        headersReceived = true;
        const requestId = safeRequestId(response?.headers?.get?.("x-request-id"));
        if (!response || response.ok !== true) {
          const status = safeInteger(response?.status);
          const code = failureCode(status);
          const receipt = attemptReceipt({
            attempt,
            status,
            requestId,
            code,
            retryable: RETRYABLE_CODES.has(code),
            elapsedMs: Math.max(0, safeInteger(nowMs() - startedAtMs)),
          });
          attempts.push(receipt);
          lastError = new StarcraftTmgTranslationProviderError(code);
          if (!receipt.retryable || attempt === profile.retryPolicy.maxAttempts) break;
          await sleep(profile.retryPolicy.baseDelayMs * attempt);
          continue;
        }
        const contentLength = safeInteger(response.headers?.get?.("content-length"));
        if (contentLength > maxResponseBytes) {
          fail("TRANSLATION_PROVIDER_RESPONSE_TOO_LARGE", { maxResponseBytes });
        }
        const responseText = await response.text();
        if (Buffer.byteLength(responseText, "utf8") > maxResponseBytes) {
          fail("TRANSLATION_PROVIDER_RESPONSE_TOO_LARGE", { maxResponseBytes });
        }
        if (responseText.includes(secret)) fail("TRANSLATION_PROVIDER_CREDENTIAL_ECHO_DETECTED");
        let responsePayload;
        try {
          responsePayload = JSON.parse(responseText);
        } catch {
          fail("TRANSLATION_PROVIDER_RESPONSE_JSON_INVALID");
        }
        const output = responseObject(responsePayload);
        const translatedText = requiredString(output.translatedText, "translatedText");
        const reportedUsage = safeUsage(responsePayload.usage);
        const usage = {
          inputTokens: Math.max(reportedUsage.inputTokens, estimatedInputTokens),
          outputTokens: Math.max(reportedUsage.outputTokens, Math.ceil(Buffer.byteLength(translatedText, "utf8") / 4)),
        };
        usage.totalTokens = usage.inputTokens + usage.outputTokens;
        const actualCostMicros = costMicros(usage, profile.pricing);
        if (actualCostMicros > profile.maxCostMicros) {
          fail("TRANSLATION_PROVIDER_ACTUAL_COST_EXCEEDED", {
            actualCostMicros,
            maxCostMicros: profile.maxCostMicros,
          });
        }
        attempts.push(attemptReceipt({
          attempt,
          status: safeInteger(response.status),
          requestId,
          code: "ok",
          retryable: false,
          elapsedMs: Math.max(0, safeInteger(nowMs() - startedAtMs)),
        }));
        const receiptBody = {
          schema: "starcraft_tmg_direct_translation_provider_receipt_v1",
          provider: profile.provider,
          providerClass: profile.providerClass,
          model: String(responsePayload.model || profile.model),
          requestId: requestId || `response-${hashStarcraftTmgContract(responsePayload).slice(0, 24)}`,
          providerProfileRef: { id: profile.id, version: profile.version, hash: profile.profileHash },
          egress: { protocol: "https", host: endpoint.host, pathHash: hashStarcraftTmgContract(endpoint.path) },
          promptTemplateVersion: profile.promptTemplateVersion,
          promptHash: prompt.promptHash,
          glossaryHash: request.glossary.glossaryHash,
          intentHash: request.intent.intentHash,
          datasetHash: request.intent.datasetRef.datasetHash,
          usage,
          cost: {
            currency: "USD",
            actualMicros: actualCostMicros,
            reservedMicros: reservedCostMicros,
            maxMicros: profile.maxCostMicros,
          },
          attemptCount: attempts.length,
          attempts,
          responseHash: hashStarcraftTmgContract({ translatedText }),
          createdAt: now(),
          canonicalUnchanged: true,
          displayOnly: true,
          mayAffectRules: false,
          eligibleForTraining: false,
          trainingTruth: false,
        };
        const providerReceipt = seal(receiptBody, "receiptHash");
        noCredentialMaterial(providerReceipt, "TRANSLATION_PROVIDER_RECEIPT_UNSAFE");
        return deepFreeze({
          translatedText,
          providerReceipt,
          qualitySignals: {
            glossaryHash: request.glossary.glossaryHash,
            promptTemplateVersion: profile.promptTemplateVersion,
            structuredOutputValidated: true,
            humanReviewRequired: true,
          },
          createdAt: now(),
        });
      } catch (error) {
        if (error instanceof StarcraftTmgTranslationProviderError) {
          lastError = error;
          if (attempts.at(-1)?.attempt !== attempt) {
            attempts.push(attemptReceipt({
              attempt,
              status: null,
              requestId: null,
              code: error.code,
              retryable: error.safeReceipt.retryable,
              elapsedMs: Math.max(0, safeInteger(nowMs() - startedAtMs)),
            }));
          }
        } else {
          const aborted = controller.signal.aborted || error?.name === "AbortError";
          const code = aborted
            ? headersReceived ? "TRANSLATION_PROVIDER_BODY_TIMEOUT" : "TRANSLATION_PROVIDER_TRANSPORT_TIMEOUT"
            : "TRANSLATION_PROVIDER_TRANSPORT_FAILED";
          lastError = new StarcraftTmgTranslationProviderError(code);
          attempts.push(attemptReceipt({
            attempt,
            status: null,
            requestId: null,
            code,
            retryable: true,
            elapsedMs: Math.max(0, safeInteger(nowMs() - startedAtMs)),
          }));
        }
        if (!lastError.safeReceipt.retryable || attempt === profile.retryPolicy.maxAttempts) break;
        await sleep(profile.retryPolicy.baseDelayMs * attempt);
      } finally {
        clearTimeout(timeout);
      }
    }
    throw new StarcraftTmgTranslationProviderError(lastError?.code || "TRANSLATION_PROVIDER_FAILED", {
      provider: profile.provider,
      model: profile.model,
      profileHash: profile.profileHash,
      egressHost: endpoint.host,
      promptHash: prompt.promptHash,
      glossaryHash: request.glossary.glossaryHash,
      intentHash: request.intent.intentHash,
      attemptCount: attempts.length,
      attempts,
    });
  }

  return Object.freeze({ translate });
}
