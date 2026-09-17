import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";
import { assertStarcraftTmgCharacterContract } from "./contracts-v1.mjs";
import { normalizeProviderJsonDocumentV1 } from
  "../secure-provider-runtime/provider-response-outcome-v1.mjs";

export const STARCRAFT_TMG_DIRECT_PROVIDER_VERSION = "starcraft_tmg_openai_compatible_direct_provider_v1";

const DEFAULT_MAX_REQUEST_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_RESPONSE_BYTES = 1024 * 1024;

function requiredString(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function safeRequestId(value) {
  const normalized = String(value || "").trim();
  return /^[A-Za-z0-9._:-]{1,200}$/.test(normalized) ? normalized : null;
}

function safeInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : 0;
}

function safeUsage(value = {}) {
  const inputTokens = safeInteger(value.prompt_tokens ?? value.input_tokens);
  const outputTokens = safeInteger(value.completion_tokens ?? value.output_tokens);
  const totalTokens = safeInteger(value.total_tokens) || inputTokens + outputTokens;
  return Object.freeze({ inputTokens, outputTokens, totalTokens });
}

function statusFailureCode(status) {
  if (status === 401 || status === 403) return "PROVIDER_AUTHENTICATION_FAILED";
  if (status === 402) return "PROVIDER_PAYMENT_REQUIRED";
  if (status === 408) return "PROVIDER_HTTP_TIMEOUT";
  if (status === 429) return "PROVIDER_RATE_LIMITED";
  if (status >= 500) return "PROVIDER_UPSTREAM_FAILED";
  return "PROVIDER_HTTP_REJECTED";
}

function isRetryable(code) {
  return ["PROVIDER_TRANSPORT_FAILED", "PROVIDER_TRANSPORT_TIMEOUT", "PROVIDER_BODY_TIMEOUT", "PROVIDER_HTTP_TIMEOUT", "PROVIDER_RATE_LIMITED", "PROVIDER_UPSTREAM_FAILED"].includes(code);
}

export class StarcraftTmgProviderError extends Error {
  constructor(code, safeReceipt = {}) {
    super(code);
    this.name = "StarcraftTmgProviderError";
    this.code = code;
    this.safeReceipt = Object.freeze({
      schemaVersion: `${STARCRAFT_TMG_DIRECT_PROVIDER_VERSION}.failure`,
      ...safeReceipt,
      code,
      retryable: isRetryable(code),
      productionReady: false,
      trainingTruth: false,
    });
  }
}

function endpointFor(profile, allowInsecureLoopbackDevelopment) {
  let base;
  try {
    base = new URL(profile.baseUrl);
  } catch {
    throw new StarcraftTmgProviderError("PROVIDER_BASE_URL_INVALID");
  }
  const loopback = ["localhost", "127.0.0.1", "::1"].includes(base.hostname);
  if (base.protocol !== "https:" && !(allowInsecureLoopbackDevelopment && loopback && base.protocol === "http:")) {
    throw new StarcraftTmgProviderError("PROVIDER_HTTPS_REQUIRED");
  }
  if (base.username || base.password || base.search || base.hash) throw new StarcraftTmgProviderError("PROVIDER_BASE_URL_INVALID");
  const path = String(profile.extensions?.chatCompletionsPath || "/chat/completions");
  if (!/^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+$/.test(path) || path.includes("..") || path.includes("//")) {
    throw new StarcraftTmgProviderError("PROVIDER_COMPLETIONS_PATH_INVALID");
  }
  const basePath = base.pathname.replace(/\/+$/, "");
  base.pathname = `${basePath}${path}`.replace(/\/{2,}/g, "/");
  return base.toString();
}

function contentText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  const parts = content
    .filter((part) => part && typeof part === "object" && ["text", "output_text"].includes(part.type) && typeof part.text === "string")
    .map((part) => part.text);
  return parts.length ? parts.join("") : null;
}

function outputFromPayload(payload) {
  const message = payload?.choices?.[0]?.message;
  if (message?.parsed && typeof message.parsed === "object"
    && !Array.isArray(message.parsed)) {
    return { output: message.parsed, responseNormalization: "none",
      responseNormalizationEvidenceHash: null };
  }
  if (message?.content && typeof message.content === "object"
    && !Array.isArray(message.content)) {
    return { output: message.content, responseNormalization: "none",
      responseNormalizationEvidenceHash: null };
  }
  const text = contentText(message?.content);
  if (!text) throw new StarcraftTmgProviderError("PROVIDER_RESPONSE_CONTRACT_REJECTED", { reason: "assistant_json_missing" });
  const normalized = normalizeProviderJsonDocumentV1(text);
  let parsed;
  try {
    parsed = JSON.parse(normalized.text);
  } catch {
    throw new StarcraftTmgProviderError(
      "PROVIDER_RESPONSE_CONTRACT_REJECTED", {
        reason: "assistant_json_invalid",
        responseNormalization: normalized.kind,
      });
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new StarcraftTmgProviderError("PROVIDER_RESPONSE_CONTRACT_REJECTED", { reason: "assistant_json_not_object" });
  }
  return {
    output: parsed,
    responseNormalization: normalized.kind,
    responseNormalizationEvidenceHash: normalized.evidence
      ? hashStarcraftTmgContract(normalized.evidence) : null,
  };
}

function normalizeChannelEnvelope(output, allowedChannels) {
  if (output?.channels && typeof output.channels === "object"
    && !Array.isArray(output.channels)) {
    return { output, kind: "none", evidence: null };
  }
  const channelSet = new Set(allowedChannels);
  const keys = Object.keys(output || {});
  const channelKeys = keys.filter((key) => channelSet.has(key));
  if (!channelKeys.length
    || keys.some((key) => key !== "visualCue" && !channelSet.has(key))
    || channelKeys.some((key) => !output[key]
      || typeof output[key] !== "object" || Array.isArray(output[key]))) {
    return { output, kind: "none", evidence: null };
  }
  const normalized = {
    channels: Object.fromEntries(channelKeys.map((key) => [key, output[key]])),
    ...(output.visualCue === undefined ? {} : { visualCue: output.visualCue }),
  };
  return {
    output: normalized,
    kind: "top_level_channel_envelope_v1",
    evidence: {
      schemaVersion: "provider_top_level_channel_envelope_recovery_v1",
      recoveredChannels: channelKeys,
      visualCueRetained: output.visualCue !== undefined,
    },
  };
}

function requestBody(request, profile) {
  const allowedChannels = Array.isArray(request.responseContract?.allowedChannels)
    ? request.responseContract.allowedChannels.map((channel) => String(channel))
    : [];
  const allowedVisualCues = Array.isArray(
    request.responseContract?.allowedVisualCues)
    ? request.responseContract.allowedVisualCues.map((cue) => String(cue))
    : [];
  if (!allowedChannels.length) throw new StarcraftTmgProviderError("PROVIDER_REQUEST_CONTRACT_REJECTED", { reason: "allowed_channels_missing" });
  const systemContract = {
    schemaVersion: `${STARCRAFT_TMG_DIRECT_PROVIDER_VERSION}.prompt-contract`,
    promptPack: requiredString(request.promptPack, "promptPack"),
    responseContract: {
      requiredShape: { channels: Object.fromEntries(allowedChannels.map((channel) => [channel, "object_when_used"])) },
      allowedChannels,
      optionalVisualCue: allowedVisualCues.length
        ? { allowedValues: allowedVisualCues } : "omit",
      decisionCandidateSource: request.responseContract.decisionCandidateSource,
      rulesAuthority: "external_rules_and_referee_only",
      arbitraryToolCallsAllowed: false,
      trainingTruth: false,
    },
    promptNodes: request.promptNodes,
  };
  const maxOutputField = profile.extensions?.maxOutputField === "max_completion_tokens"
    ? "max_completion_tokens"
    : "max_tokens";
  const body = {
    model: profile.model,
    messages: [
      {
        role: "system",
        content: `Follow the sealed Project D prompt contract below. Return exactly one JSON object and no markdown.\n${JSON.stringify(systemContract)}`,
      },
      {
        role: "user",
        content: JSON.stringify({ intent: request.intent || "chat", message: requiredString(request.userMessage, "userMessage") }),
      },
    ],
    temperature: profile.temperature,
    top_p: profile.topP,
    [maxOutputField]: profile.outputBudget,
  };
  if (profile.provider === "deepseek-openai-compatible-direct"
    && profile.thinkingMode === "disabled") {
    body.thinking = { type: "disabled" };
    body.reasoning_effort = profile.reasoningEffort || "low";
  }
  if (profile.extensions?.responseFormatMode !== "prompt_only") body.response_format = { type: "json_object" };
  return body;
}

export function createStarcraftTmgOpenAiCompatibleProviderTransport(options = {}) {
  const fetchImplementation = options.fetchImplementation || globalThis.fetch;
  if (typeof fetchImplementation !== "function") throw new Error("fetchImplementation is required");
  const nowMs = typeof options.nowMs === "function" ? options.nowMs : () => Date.now();
  const allowInsecureLoopbackDevelopment = options.allowInsecureLoopbackDevelopment === true;
  const maxRequestBytes = safeInteger(options.maxRequestBytes) || DEFAULT_MAX_REQUEST_BYTES;
  const maxResponseBytes = safeInteger(options.maxResponseBytes) || DEFAULT_MAX_RESPONSE_BYTES;
  const observeResponseOutcome = typeof options.observeResponseOutcome
    === "function" ? options.observeResponseOutcome : null;

  async function complete(request = {}) {
    const profile = assertStarcraftTmgCharacterContract(request.providerProfile, "provider-profile");
    if (profile.model === "administrator_must_select") throw new StarcraftTmgProviderError("PROVIDER_MODEL_NOT_CONFIGURED");
    const apiKey = requiredString(request.apiKey, "apiKey");
    const url = endpointFor(profile, allowInsecureLoopbackDevelopment);
    const payload = requestBody(request, profile);
    const body = JSON.stringify(payload);
    if (Buffer.byteLength(body, "utf8") > maxRequestBytes) {
      throw new StarcraftTmgProviderError("PROVIDER_REQUEST_TOO_LARGE", { maxRequestBytes });
    }
    const timeoutMs = Math.max(1, Math.min(safeInteger(profile.timeoutMs) || 60000, 300000));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const startedAtMs = nowMs();
    let response;
    let headersReceived = false;
    try {
      response = await fetchImplementation(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
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
        const code = statusFailureCode(status);
        throw new StarcraftTmgProviderError(code, { status, requestId });
      }
      const contentLength = safeInteger(response.headers?.get?.("content-length"));
      if (contentLength > maxResponseBytes) {
        throw new StarcraftTmgProviderError("PROVIDER_RESPONSE_TOO_LARGE", { status: response.status, requestId, maxResponseBytes });
      }
      const responseText = await response.text();
      if (Buffer.byteLength(responseText, "utf8") > maxResponseBytes) {
        throw new StarcraftTmgProviderError("PROVIDER_RESPONSE_TOO_LARGE", { status: response.status, requestId, maxResponseBytes });
      }
      let responsePayload;
      try {
        responsePayload = JSON.parse(responseText);
      } catch {
        throw new StarcraftTmgProviderError("PROVIDER_RESPONSE_JSON_INVALID", { status: response.status, requestId });
      }
      if (observeResponseOutcome) {
        try {
          observeResponseOutcome(Object.freeze({
            status: response.status,
            model: String(responsePayload.model || profile.model),
            finishReason: responsePayload?.choices?.[0]?.finish_reason || null,
            content: contentText(responsePayload?.choices?.[0]?.message?.content),
            usage: safeUsage(responsePayload.usage),
          }));
        } catch {
          // Development observability must never change Provider semantics.
        }
      }
      const parsed = outputFromPayload(responsePayload);
      const envelope = normalizeChannelEnvelope(parsed.output,
        request.responseContract.allowedChannels);
      const output = envelope.output;
      const normalizationKinds = [parsed.responseNormalization, envelope.kind]
        .filter((kind) => kind && kind !== "none");
      const responseNormalization = normalizationKinds.join("+") || "none";
      const normalizationEvidence = parsed.responseNormalizationEvidenceHash
        || envelope.evidence ? {
          syntaxEvidenceHash: parsed.responseNormalizationEvidenceHash,
          envelopeEvidence: envelope.evidence,
        } : null;
      const elapsedMs = Math.max(0, safeInteger(nowMs() - startedAtMs));
      const receiptUnsigned = {
        schemaVersion: `${STARCRAFT_TMG_DIRECT_PROVIDER_VERSION}.receipt`,
        provider: profile.provider,
        providerProfileRef: { id: profile.providerProfileId, version: profile.version, hash: profile.integrity.hash },
        model: String(responsePayload.model || profile.model),
        requestId,
        status: response.status,
        usage: safeUsage(responsePayload.usage),
        elapsedMs,
        responseFingerprint: hashStarcraftTmgContract(output),
        responseNormalization,
        responseNormalizationEvidenceHash: normalizationEvidence
          ? hashStarcraftTmgContract(normalizationEvidence) : null,
        internalRetries: 0,
        productionReady: false,
        trainingTruth: false,
      };
      return Object.freeze({
        output: Object.freeze(output),
        receipt: Object.freeze({ ...receiptUnsigned, receiptHash: hashStarcraftTmgContract(receiptUnsigned) }),
      });
    } catch (error) {
      if (error instanceof StarcraftTmgProviderError) throw error;
      const aborted = controller.signal.aborted || error?.name === "AbortError";
      throw new StarcraftTmgProviderError(aborted
        ? headersReceived ? "PROVIDER_BODY_TIMEOUT" : "PROVIDER_TRANSPORT_TIMEOUT"
        : "PROVIDER_TRANSPORT_FAILED");
    } finally {
      clearTimeout(timeout);
    }
  }

  return Object.freeze({ complete });
}
