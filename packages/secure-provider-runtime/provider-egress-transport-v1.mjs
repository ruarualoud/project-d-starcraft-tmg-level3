import { createHash } from "node:crypto";
import { lookup as dnsLookup } from "node:dns/promises";
import https from "node:https";
import net from "node:net";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  assertStarcraftTmgProviderEgressBindingV1,
  StarcraftTmgProviderEgressError,
  STARCRAFT_TMG_PROVIDER_EGRESS_TRANSPORT_VERSION,
} from "./provider-egress-contract-v1.mjs";

export {
  StarcraftTmgProviderEgressError,
  STARCRAFT_TMG_PROVIDER_EGRESS_TRANSPORT_VERSION,
};

const DEFAULT_MAX_REQUEST_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_RESPONSE_BYTES = 1024 * 1024;
const DEFAULT_MAX_HEADER_BYTES = 32 * 1024;
const COMPLETE_FIELDS = new Set([
  "egressBinding", "credentialBytes", "providerRequest", "signal",
]);
const REQUEST_FIELDS = new Set([
  "schemaVersion", "requestId", "intent", "promptPack", "promptNodes",
  "userMessage", "responseContract", "maxOutputUnits",
]);
const RESPONSE_CONTRACT_FIELDS = new Set([
  "allowedChannels", "decisionCandidateSource",
]);
const INTENTS = new Set([
  "chat", "explain", "take_turn", "commentate", "reflect",
]);
const CHANNEL = /^[a-z][a-z0-9_]{1,63}$/u;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,200}$/u;
const SAFE_MODEL = /^[A-Za-z0-9._:/-]{1,240}$/u;
const SENSITIVE_FIELD =
  /(?:api.?key|authorization|bearer|cookie|credential|secret|access.?token|refresh.?token)/iu;
const SENSITIVE_VALUE =
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}|\bsk-[A-Za-z0-9_-]{12,}|(?:api[_-]?key|authorization|credential|secret)\s*[:=]\s*[^\s,;}]{6,}/iu;

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function exactFields(value, allowed, label) {
  if (!object(value)) throw new TypeError(`${label} must be an object`);
  const forbidden = Object.keys(value).filter((key) => !allowed.has(key));
  if (forbidden.length) throw new TypeError(`${label} contains forbidden fields`);
}

function safeId(value, field) {
  const normalized = String(value || "").trim();
  if (!SAFE_ID.test(normalized)) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function requiredString(value, field, maximum) {
  const normalized = String(value || "");
  if (!normalized.trim() || normalized.length > maximum) {
    throw new TypeError(`${field} is invalid`);
  }
  return normalized;
}

function positiveInteger(value, field, maximum) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1
    || normalized > maximum) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function exactIntegerHeader(value) {
  if (typeof value !== "string" || !/^(?:0|[1-9][0-9]{0,15})$/u.test(value)) {
    return null;
  }
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) ? normalized : null;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function ipv4Integer(address) {
  if (net.isIP(address) !== 4) return null;
  return address.split(".").reduce((result, octet) =>
    ((result << 8) | Number(octet)) >>> 0, 0);
}

function inIpv4Cidr(address, network, prefix) {
  const value = ipv4Integer(address);
  const base = ipv4Integer(network);
  if (value === null || base === null) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) === (base & mask);
}

const NON_GLOBAL_IPV4 = Object.freeze([
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10],
  ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24],
  ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
]);

function expandedIpv6(address) {
  if (net.isIP(address) !== 6 || address.includes("%")) return null;
  let normalized = address.toLowerCase();
  const embeddedIpv4 = normalized.match(/(?:^|:)(\d+\.\d+\.\d+\.\d+)$/u)?.[1];
  if (embeddedIpv4) {
    const integer = ipv4Integer(embeddedIpv4);
    if (integer === null) return null;
    normalized = normalized.slice(0, -embeddedIpv4.length)
      + `${((integer >>> 16) & 0xffff).toString(16)}:${(integer & 0xffff).toString(16)}`;
  }
  const halves = normalized.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;
  const words = [...left, ...Array(missing).fill("0"), ...right];
  if (words.length !== 8 || words.some((word) => !/^[a-f0-9]{1,4}$/u.test(word))) {
    return null;
  }
  return words.map((word) => Number.parseInt(word, 16));
}

export function isStarcraftTmgGloballyRoutableAddressV1(address) {
  const family = net.isIP(address);
  if (family === 4) {
    return !NON_GLOBAL_IPV4.some(([network, prefix]) =>
      inIpv4Cidr(address, network, prefix));
  }
  if (family !== 6) return false;
  const words = expandedIpv6(address);
  if (!words) return false;
  // Deliberately conservative: only 2000::/3 global unicast is eligible.
  if ((words[0] & 0xe000) !== 0x2000) return false;
  // IANA 2001::/23 protocol assignments are denied as a whole. This may deny
  // globally reachable exceptions, but cannot accidentally admit a special
  // non-global destination.
  if (words[0] === 0x2001 && words[1] <= 0x01ff) return false;
  if (words[0] === 0x2001 && words[1] === 0x0db8) return false;
  if (words[0] === 0x2002) return false;
  if (words[0] >= 0x3ff0 && words[0] <= 0x3fff) return false;
  return true;
}

async function defaultResolveAddresses(hostname) {
  return dnsLookup(hostname, { all: true, verbatim: true });
}

function normalizeAddressRecords(records) {
  if (!Array.isArray(records) || records.length < 1 || records.length > 16) {
    throw new StarcraftTmgProviderEgressError("PROVIDER_DNS_PUBLIC_ADDRESS_REQUIRED", {
      requestDefinitelyNotSent: true,
    });
  }
  const unique = new Map();
  for (const record of records) {
    const address = String(record?.address || "").toLowerCase();
    const family = Number(record?.family || net.isIP(address));
    if (net.isIP(address) !== family
      || !isStarcraftTmgGloballyRoutableAddressV1(address)) {
      throw new StarcraftTmgProviderEgressError("PROVIDER_DNS_NON_GLOBAL_REJECTED", {
        requestDefinitelyNotSent: true,
      });
    }
    unique.set(`${family}:${address}`, { address, family });
  }
  return [...unique.values()].sort((a, b) =>
    a.family - b.family || a.address.localeCompare(b.address));
}

function normalizeProviderRequest(value, binding) {
  exactFields(value, REQUEST_FIELDS, "providerRequest");
  if (value.schemaVersion !== "starcraft_tmg_direct_provider_request_v1") {
    throw new TypeError("providerRequest schemaVersion is invalid");
  }
  const intent = String(value.intent || "").toLowerCase();
  if (!INTENTS.has(intent)) throw new TypeError("providerRequest intent is invalid");
  exactFields(value.responseContract, RESPONSE_CONTRACT_FIELDS,
    "providerRequest.responseContract");
  const allowedChannels = value.responseContract.allowedChannels;
  if (!Array.isArray(allowedChannels) || allowedChannels.length < 1
    || allowedChannels.length > 8 || new Set(allowedChannels).size !== allowedChannels.length
    || allowedChannels.some((channel) => !CHANNEL.test(channel))) {
    throw new TypeError("providerRequest allowedChannels are invalid");
  }
  const maxOutputUnits = positiveInteger(value.maxOutputUnits,
    "providerRequest.maxOutputUnits", binding.maxOutputUnits);
  const result = {
    schemaVersion: value.schemaVersion,
    requestId: safeId(value.requestId, "providerRequest.requestId"),
    intent,
    promptPack: requiredString(value.promptPack, "providerRequest.promptPack", 200),
    promptNodes: clone(value.promptNodes),
    userMessage: requiredString(value.userMessage, "providerRequest.userMessage", 64 * 1024),
    responseContract: {
      allowedChannels: [...allowedChannels],
      decisionCandidateSource: requiredString(
        value.responseContract.decisionCandidateSource,
        "providerRequest.responseContract.decisionCandidateSource", 200),
    },
    maxOutputUnits,
  };
  if (containsSensitiveMaterial(result)) {
    throw new TypeError("providerRequest contains credential-shaped material");
  }
  return freeze(result);
}

function containsSensitiveMaterial(value, seen = new Set()) {
  if (typeof value === "string") return SENSITIVE_VALUE.test(value);
  if (!value || typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.some((entry) => containsSensitiveMaterial(entry, seen));
  }
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_FIELD.test(key) || containsSensitiveMaterial(child, seen)) return true;
  }
  return false;
}

function printableCredential(value, maximum) {
  return Buffer.isBuffer(value) && value.length >= 8 && value.length <= maximum
    && value.every((byte) => byte >= 0x21 && byte <= 0x7e);
}

function requestBody(request, binding) {
  const systemContract = {
    schemaVersion: `${STARCRAFT_TMG_PROVIDER_EGRESS_TRANSPORT_VERSION}.prompt-contract`,
    promptPack: request.promptPack,
    responseContract: {
      requiredShape: {
        channels: Object.fromEntries(request.responseContract.allowedChannels
          .map((channel) => [channel, "object_when_used"])),
      },
      ...request.responseContract,
      rulesAuthority: "external_rules_and_referee_only",
      arbitraryToolCallsAllowed: false,
      trainingTruth: false,
    },
    promptNodes: request.promptNodes,
  };
  const body = {
    model: binding.model,
    messages: [
      {
        role: "system",
        content: "Follow the sealed Project D prompt contract below. Return exactly one JSON object and no markdown.\n"
          + JSON.stringify(systemContract),
      },
      {
        role: "user",
        content: JSON.stringify({ intent: request.intent, message: request.userMessage }),
      },
    ],
    temperature: binding.temperature,
    top_p: binding.topP,
    [binding.maxOutputField]: request.maxOutputUnits,
  };
  if (binding.responseFormatMode !== "prompt_only") {
    body.response_format = { type: "json_object" };
  }
  return JSON.stringify(body);
}

function contentText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  const parts = content.filter((part) => object(part)
    && ["text", "output_text"].includes(part.type)
    && typeof part.text === "string").map((part) => part.text);
  return parts.length ? parts.join("") : null;
}

function outputFromPayload(payload) {
  const message = payload?.choices?.[0]?.message;
  if (object(message?.parsed)) return clone(message.parsed);
  if (object(message?.content)) return clone(message.content);
  const text = contentText(message?.content);
  if (!text) throw new StarcraftTmgProviderEgressError(
    "PROVIDER_RESPONSE_CONTRACT_REJECTED", { requestMayHaveBeenSent: true });
  try {
    const parsed = JSON.parse(text);
    if (!object(parsed)) throw new Error("not an object");
    return parsed;
  } catch {
    throw new StarcraftTmgProviderEgressError(
      "PROVIDER_RESPONSE_CONTRACT_REJECTED", { requestMayHaveBeenSent: true });
  }
}

function safeUsage(value = {}) {
  const integer = (candidate) => Number.isSafeInteger(Number(candidate))
    && Number(candidate) >= 0 ? Number(candidate) : 0;
  const inputUnits = integer(value.prompt_tokens ?? value.input_tokens);
  const outputUnits = integer(value.completion_tokens ?? value.output_tokens);
  const totalUnits = Math.max(integer(value.total_tokens),
    inputUnits + outputUnits);
  return freeze({ inputUnits, outputUnits, totalUnits });
}

function sameNetworkAddress(left, right) {
  const family = net.isIP(left);
  if (family !== net.isIP(right)) return false;
  if (family === 4) return left === right;
  if (family !== 6) return false;
  const a = expandedIpv6(left);
  const b = expandedIpv6(right);
  return Boolean(a && b) && a.every((word, index) => word === b[index]);
}

function statusCode(status) {
  if (status === 401 || status === 403) return "PROVIDER_AUTHENTICATION_FAILED";
  if (status === 402) return "PROVIDER_PAYMENT_REQUIRED";
  if (status === 408) return "PROVIDER_HTTP_TIMEOUT";
  if (status === 429) return "PROVIDER_RATE_LIMITED";
  if (status >= 300 && status < 400) return "PROVIDER_REDIRECT_REJECTED";
  if (status >= 500) return "PROVIDER_UPSTREAM_FAILED";
  return "PROVIDER_HTTP_REJECTED";
}

function safeTime(now) {
  return new Date(now()).toISOString();
}

export function createStarcraftTmgProviderEgressTransportV1(options = {}) {
  const resolveAddresses = options.resolveAddresses || defaultResolveAddresses;
  const requestImplementation = options.requestImplementation || https.request;
  const now = options.now || (() => new Date().toISOString());
  const maxRequestBytes = positiveInteger(
    options.maxRequestBytes || DEFAULT_MAX_REQUEST_BYTES,
    "maxRequestBytes", 16 * 1024 * 1024);
  const maxResponseBytes = positiveInteger(
    options.maxResponseBytes || DEFAULT_MAX_RESPONSE_BYTES,
    "maxResponseBytes", 16 * 1024 * 1024);
  const maxHeaderBytes = positiveInteger(
    options.maxHeaderBytes || DEFAULT_MAX_HEADER_BYTES,
    "maxHeaderBytes", 128 * 1024);
  const maxCredentialBytes = positiveInteger(
    options.maxCredentialBytes || 8_192, "maxCredentialBytes", 65_536);
  if (typeof resolveAddresses !== "function"
    || typeof requestImplementation !== "function" || typeof now !== "function") {
    throw new TypeError("Provider egress adapters are invalid");
  }

  function metadata() {
    return freeze({
      schemaVersion: `${STARCRAFT_TMG_PROVIDER_EGRESS_TRANSPORT_VERSION}.metadata`,
      protocols: ["https:"],
      dnsPolicy: "all_answers_must_be_globally_routable_then_pin_one_answer",
      tlsCertificateVerificationDisabled: false,
      redirectsAllowed: false,
      proxyAllowed: false,
      customAuthorizationHeadersAllowed: false,
      physicalAttempts: 1,
      automaticRetryAllowed: false,
      maxRequestBytes,
      maxResponseBytes,
      maxHeaderBytes,
      trainingTruth: false,
    });
  }

  async function complete(input = {}) {
    exactFields(input, COMPLETE_FIELDS, "Provider egress complete input");
    const binding = assertStarcraftTmgProviderEgressBindingV1(input.egressBinding);
    if (!printableCredential(input.credentialBytes, maxCredentialBytes)) {
      throw new StarcraftTmgProviderEgressError("PROVIDER_CREDENTIAL_INVALID", {
        requestDefinitelyNotSent: true,
      });
    }
    if (input.signal !== undefined && input.signal !== null
      && (typeof input.signal !== "object"
        || typeof input.signal.addEventListener !== "function")) {
      throw new TypeError("Provider egress signal is invalid");
    }
    if (input.signal?.aborted) {
      throw new StarcraftTmgProviderEgressError("PROVIDER_ABORTED", {
        requestDefinitelyNotSent: true,
      });
    }
    let request;
    try {
      request = normalizeProviderRequest(input.providerRequest, binding);
    } catch {
      throw new StarcraftTmgProviderEgressError("PROVIDER_REQUEST_CONTRACT_REJECTED", {
        requestDefinitelyNotSent: true,
      });
    }
    const body = requestBody(request, binding);
    if (Buffer.byteLength(body, "utf8") > maxRequestBytes) {
      throw new StarcraftTmgProviderEgressError("PROVIDER_REQUEST_TOO_LARGE", {
        requestDefinitelyNotSent: true,
      });
    }
    let records;
    try {
      records = normalizeAddressRecords(await resolveAddresses(
        binding.endpoint.hostname));
    } catch (error) {
      if (error instanceof StarcraftTmgProviderEgressError) throw error;
      throw new StarcraftTmgProviderEgressError("PROVIDER_DNS_RESOLUTION_FAILED", {
        requestDefinitelyNotSent: true,
      });
    }
    if (input.signal?.aborted) {
      throw new StarcraftTmgProviderEgressError("PROVIDER_ABORTED", {
        requestDefinitelyNotSent: true,
      });
    }
    const selected = records[0];
    const addressSetHash = hashStarcraftTmgContract(records);
    const startedAt = safeTime(now);
    let physicalAttempts = 0;

    return await new Promise((resolve, reject) => {
      let settled = false;
      let providerRequest;
      const finish = (operation, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(totalTimer);
        input.signal?.removeEventListener?.("abort", abort);
        operation(value);
      };
      const fail = (error) => finish(reject, error);
      const abort = () => {
        providerRequest?.destroy?.();
        fail(new StarcraftTmgProviderEgressError("PROVIDER_ABORTED", {
          requestMayHaveBeenSent: physicalAttempts === 1,
          physicalAttempts,
        }));
      };
      const totalTimer = setTimeout(() => {
        providerRequest?.destroy?.();
        fail(new StarcraftTmgProviderEgressError("PROVIDER_TRANSPORT_TIMEOUT", {
          requestMayHaveBeenSent: physicalAttempts === 1,
          physicalAttempts,
        }));
      }, binding.timeoutMs);
      input.signal?.addEventListener?.("abort", abort, { once: true });
      const lookup = (_hostname, lookupOptions, callback) => {
        if (lookupOptions?.all) callback(null, [selected]);
        else callback(null, selected.address, selected.family);
      };
      try {
        physicalAttempts = 1;
        providerRequest = requestImplementation({
          protocol: "https:",
          hostname: binding.endpoint.hostname,
          port: binding.endpoint.port,
          path: binding.endpoint.path,
          method: "POST",
          servername: binding.endpoint.hostname,
          rejectUnauthorized: true,
          agent: false,
          lookup,
          maxHeaderSize: maxHeaderBytes,
          joinDuplicateHeaders: false,
          headers: {
            authorization: `Bearer ${input.credentialBytes.toString("utf8")}`,
            "content-type": "application/json",
            accept: "application/json",
            "accept-encoding": "identity",
            connection: "close",
            "content-length": String(Buffer.byteLength(body, "utf8")),
          },
        }, (response) => {
          const status = Number(response?.statusCode || 0);
          if (!Number.isInteger(status) || status < 100 || status > 599) {
            response?.destroy?.();
            fail(new StarcraftTmgProviderEgressError(
              "PROVIDER_RESPONSE_CONTRACT_REJECTED", {
                requestMayHaveBeenSent: true, physicalAttempts,
              }));
            return;
          }
          if (status < 200 || status >= 300) {
            response?.destroy?.();
            fail(new StarcraftTmgProviderEgressError(statusCode(status), {
              status, requestMayHaveBeenSent: true, physicalAttempts,
            }));
            return;
          }
          const contentType = String(response.headers?.["content-type"] || "")
            .toLowerCase();
          const contentEncoding = String(response.headers?.["content-encoding"]
            || "identity").toLowerCase();
          const rawDeclaredLength = response.headers?.["content-length"];
          const declaredLength = rawDeclaredLength === undefined
            ? null : exactIntegerHeader(String(rawDeclaredLength));
          if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/u.test(contentType)
            || contentEncoding !== "identity"
            || (rawDeclaredLength !== undefined && declaredLength === null)
            || (declaredLength !== null && declaredLength > maxResponseBytes)) {
            response.destroy?.();
            fail(new StarcraftTmgProviderEgressError(
              "PROVIDER_RESPONSE_CONTRACT_REJECTED", {
                requestMayHaveBeenSent: true, physicalAttempts,
              }));
            return;
          }
          const chunks = [];
          let bytes = 0;
          response.on("data", (chunk) => {
            const buffer = Buffer.from(chunk);
            bytes += buffer.length;
            if (bytes > maxResponseBytes) {
              response.destroy?.();
              providerRequest.destroy?.();
              fail(new StarcraftTmgProviderEgressError(
                "PROVIDER_RESPONSE_TOO_LARGE", {
                  requestMayHaveBeenSent: true, physicalAttempts,
                }));
              return;
            }
            chunks.push(buffer);
          });
          response.on("error", () => fail(new StarcraftTmgProviderEgressError(
            "PROVIDER_RESPONSE_STREAM_FAILED", {
              requestMayHaveBeenSent: true, physicalAttempts,
            })));
          response.on("end", () => {
            if (settled) return;
            let payload;
            try {
              payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            } catch {
              fail(new StarcraftTmgProviderEgressError(
                "PROVIDER_RESPONSE_CONTRACT_REJECTED", {
                  requestMayHaveBeenSent: true, physicalAttempts,
                }));
              return;
            }
            let output;
            try {
              output = outputFromPayload(payload);
            } catch (error) {
              fail(error);
              return;
            }
            if (containsSensitiveMaterial(output)) {
              fail(new StarcraftTmgProviderEgressError(
                "PROVIDER_RESPONSE_SENSITIVE_MATERIAL_REJECTED", {
                  requestMayHaveBeenSent: true, physicalAttempts,
                }));
              return;
            }
            const reportedModel = SAFE_MODEL.test(String(payload?.model || ""))
              ? String(payload.model) : null;
            const rawRequestId = String(response.headers?.["x-request-id"] || "");
            const receiptBody = {
              schemaVersion:
                `${STARCRAFT_TMG_PROVIDER_EGRESS_TRANSPORT_VERSION}.success`,
              requestId: request.requestId,
              providerProfileRef: clone(binding.providerProfileRef),
              egressPolicyHash: binding.policyHash,
              providerId: binding.providerId,
              requestedModel: binding.model,
              reportedModel,
              providerRequestIdHash: SAFE_ID.test(rawRequestId)
                ? sha256(rawRequestId) : null,
              status,
              usage: safeUsage(payload?.usage),
              responseFingerprint: sha256(JSON.stringify(output)),
              dnsAddressSetHash: addressSetHash,
              tlsServerName: binding.endpoint.hostname,
              tlsCertificateVerificationDisabled: false,
              redirectFollowed: false,
              proxyUsed: false,
              physicalAttempts,
              automaticRetries: 0,
              startedAt,
              finishedAt: safeTime(now),
              trainingTruth: false,
            };
            finish(resolve, freeze({
              output: clone(output),
              usageReceipt: {
                ...receiptBody,
                receiptHash: hashStarcraftTmgContract(receiptBody),
              },
            }));
          });
        });
      } catch {
        fail(new StarcraftTmgProviderEgressError("PROVIDER_TRANSPORT_FAILED", {
          requestMayHaveBeenSent: physicalAttempts === 1,
          physicalAttempts,
        }));
        return;
      }
      providerRequest.once?.("socket", (socket) => {
        socket.once?.("secureConnect", () => {
          const observed = String(socket.remoteAddress || "").toLowerCase();
          if (!sameNetworkAddress(observed, selected.address)) {
            providerRequest.destroy?.();
            fail(new StarcraftTmgProviderEgressError(
              "PROVIDER_REMOTE_ADDRESS_DRIFT", {
                requestMayHaveBeenSent: true, physicalAttempts,
              }));
          }
        });
      });
      providerRequest.once?.("error", () => fail(
        new StarcraftTmgProviderEgressError("PROVIDER_TRANSPORT_FAILED", {
          requestMayHaveBeenSent: physicalAttempts === 1,
          physicalAttempts,
        })));
      providerRequest.setTimeout?.(binding.timeoutMs, () => {
        providerRequest.destroy?.();
        fail(new StarcraftTmgProviderEgressError("PROVIDER_TRANSPORT_TIMEOUT", {
          requestMayHaveBeenSent: true, physicalAttempts,
        }));
      });
      try {
        providerRequest.end(body);
      } catch {
        fail(new StarcraftTmgProviderEgressError("PROVIDER_TRANSPORT_FAILED", {
          requestMayHaveBeenSent: physicalAttempts === 1,
          physicalAttempts,
        }));
      }
    });
  }

  return Object.freeze({ metadata, complete });
}
