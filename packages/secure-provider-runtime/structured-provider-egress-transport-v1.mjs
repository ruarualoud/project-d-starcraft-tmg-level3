import { createHash } from "node:crypto";
import { lookup as dnsLookup } from "node:dns/promises";
import https from "node:https";
import net from "node:net";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { assertStarcraftTmgProviderEgressBindingV2 } from
  "./provider-egress-contract-v2.mjs";
import { isStarcraftTmgGloballyRoutableAddressV1 } from
  "./provider-egress-transport-v1.mjs";
import { normalizeStarcraftTmgOutputContractRefV1 } from
  "../structured-generation/output-contract-registry-v1.mjs";

export const STARCRAFT_TMG_STRUCTURED_PROVIDER_EGRESS_TRANSPORT_VERSION =
  "starcraft_tmg_structured_provider_egress_transport_v1";

const INPUT_FIELDS = new Set([
  "egressBinding", "credentialBytes", "sendRequest", "signal",
]);
const SEND_FIELDS = new Set([
  "requestId", "endpoint", "body", "outputContractRef",
]);
const ENDPOINT_FIELDS = new Set(["protocol", "hostname", "port", "path"]);
const BODY_FIELDS = new Set([
  "model", "instructions", "input", "reasoning", "temperature", "top_p",
  "max_output_tokens", "stream", "text",
]);
const ID = /^[A-Za-z0-9._:-]{8,200}$/u;
const MAX_REQUEST_BYTES = 2 * 1024 * 1024;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const MAX_HEADER_BYTES = 32 * 1024;

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
  if (!object(value) || Object.keys(value).some((key) => !allowed.has(key))) {
    throw new TypeError(`${label} contains invalid fields`);
  }
}

function safeId(value, field) {
  const result = String(value || "");
  if (!ID.test(result)) throw new TypeError(`${field} is invalid`);
  return result;
}

function printableCredential(value, maximum = 8_192) {
  return Buffer.isBuffer(value) && value.length >= 8 && value.length <= maximum
    && value.every((byte) => byte >= 0x21 && byte <= 0x7e);
}

function endpointEqual(left, right) {
  return hashStarcraftTmgContract(left) === hashStarcraftTmgContract(right);
}

function normalizeSendRequest(value, binding) {
  exactFields(value, SEND_FIELDS, "Structured egress sendRequest");
  exactFields(value.endpoint, ENDPOINT_FIELDS, "Structured egress endpoint");
  if (!endpointEqual(value.endpoint, binding.endpoint)) {
    throw new TypeError("Structured egress endpoint drift");
  }
  exactFields(value.body, BODY_FIELDS, "Structured egress body");
  const body = clone(value.body);
  if (body.model !== binding.model || body.stream !== false
    || body.reasoning?.effort !== "none"
    || body.max_output_tokens < 1
    || body.max_output_tokens > binding.maxOutputUnits
    || body.text?.format?.type !== "json_schema"
    || typeof body.text.format.name !== "string"
    || !object(body.text.format.schema)
    || typeof body.instructions !== "string" || !body.instructions
    || typeof body.input !== "string" || !body.input
    || body.temperature !== binding.temperature || body.top_p !== binding.topP) {
    throw new TypeError("Structured egress body violates binding");
  }
  return freeze({
    requestId: safeId(value.requestId, "sendRequest.requestId"),
    endpoint: clone(value.endpoint),
    body,
    outputContractRef: normalizeStarcraftTmgOutputContractRefV1(
      value.outputContractRef),
  });
}

function normalizeAddresses(records) {
  if (!Array.isArray(records) || records.length < 1 || records.length > 16) {
    throw new TypeError("Provider DNS answer count is invalid");
  }
  const result = new Map();
  for (const row of records) {
    const address = String(row?.address || "").toLowerCase();
    const family = Number(row?.family || net.isIP(address));
    if (net.isIP(address) !== family
      || !isStarcraftTmgGloballyRoutableAddressV1(address)) {
      throw new TypeError("Provider DNS returned a non-global address");
    }
    result.set(`${family}:${address}`, { address, family });
  }
  return [...result.values()].sort((a, b) =>
    a.family - b.family || a.address.localeCompare(b.address));
}

function expandedIpv6(address) {
  if (net.isIP(address) !== 6 || address.includes("%")) return null;
  let normalized = address.toLowerCase();
  const ipv4 = normalized.match(/(?:^|:)(\d+\.\d+\.\d+\.\d+)$/u)?.[1];
  if (ipv4) {
    const octets = ipv4.split(".").map(Number);
    const integer = octets.reduce((result, octet) =>
      ((result << 8) | octet) >>> 0, 0);
    normalized = normalized.slice(0, -ipv4.length)
      + `${((integer >>> 16) & 0xffff).toString(16)}:${(integer & 0xffff).toString(16)}`;
  }
  const halves = normalized.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;
  const words = [...left, ...Array(missing).fill("0"), ...right];
  return words.length === 8 ? words.map((word) => Number.parseInt(word, 16)) : null;
}

function sameAddress(left, right) {
  const family = net.isIP(left);
  if (family !== net.isIP(right)) return false;
  if (family === 4) return left === right;
  const a = expandedIpv6(left);
  const b = expandedIpv6(right);
  return Boolean(a && b) && a.every((word, index) => word === b[index]);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export class StarcraftTmgStructuredTransportError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = "StarcraftTmgStructuredTransportError";
    this.code = code;
    const body = {
      schemaVersion:
        `${STARCRAFT_TMG_STRUCTURED_PROVIDER_EGRESS_TRANSPORT_VERSION}.failure`,
      code,
      requestDefinitelyNotSent: details.requestDefinitelyNotSent === true,
      requestMayHaveBeenSent: details.requestMayHaveBeenSent === true,
      status: Number.isInteger(details.status) ? details.status : null,
      physicalAttempts: Number.isInteger(details.physicalAttempts)
        ? details.physicalAttempts : 0,
      outputContractRef: details.outputContractRef
        ? normalizeStarcraftTmgOutputContractRefV1(details.outputContractRef) : null,
      automaticRetries: 0,
      trainingTruth: false,
    };
    this.safeReceipt = freeze({ ...body,
      receiptHash: hashStarcraftTmgContract(body) });
  }
}

export function createStarcraftTmgStructuredProviderEgressTransportV1(
  options = {}) {
  const resolveAddresses = options.resolveAddresses
    || ((hostname) => dnsLookup(hostname, { all: true, verbatim: true }));
  const requestImplementation = options.requestImplementation || https.request;
  const now = options.now || (() => new Date().toISOString());
  const maxRequestBytes = options.maxRequestBytes || MAX_REQUEST_BYTES;
  const maxResponseBytes = options.maxResponseBytes || MAX_RESPONSE_BYTES;
  const maxHeaderBytes = options.maxHeaderBytes || MAX_HEADER_BYTES;

  async function send(input = {}) {
    exactFields(input, INPUT_FIELDS, "Structured egress input");
    const binding = assertStarcraftTmgProviderEgressBindingV2(input.egressBinding);
    if (!printableCredential(input.credentialBytes)) {
      throw new StarcraftTmgStructuredTransportError("PROVIDER_CREDENTIAL_INVALID", {
        requestDefinitelyNotSent: true,
      });
    }
    let request;
    try { request = normalizeSendRequest(input.sendRequest, binding); }
    catch {
      throw new StarcraftTmgStructuredTransportError(
        "PROVIDER_REQUEST_CONTRACT_REJECTED", {
          requestDefinitelyNotSent: true,
          outputContractRef: input.sendRequest?.outputContractRef,
        });
    }
    if (input.signal?.aborted) {
      throw new StarcraftTmgStructuredTransportError("PROVIDER_ABORTED", {
        requestDefinitelyNotSent: true,
        outputContractRef: request.outputContractRef,
      });
    }
    const body = JSON.stringify(request.body);
    const credentialText = input.credentialBytes.toString("utf8");
    if (Buffer.byteLength(body, "utf8") > maxRequestBytes
      || body.includes(credentialText)) {
      throw new StarcraftTmgStructuredTransportError(
        body.includes(credentialText)
          ? "PROVIDER_REQUEST_CREDENTIAL_ECHO_REJECTED"
          : "PROVIDER_REQUEST_TOO_LARGE", {
          requestDefinitelyNotSent: true,
          outputContractRef: request.outputContractRef,
        });
    }
    let addresses;
    try {
      addresses = normalizeAddresses(await resolveAddresses(
        binding.endpoint.hostname));
    } catch {
      throw new StarcraftTmgStructuredTransportError(
        "PROVIDER_DNS_RESOLUTION_FAILED", {
          requestDefinitelyNotSent: true,
          outputContractRef: request.outputContractRef,
        });
    }
    const selected = addresses[0];
    const startedAt = new Date(now()).toISOString();
    let physicalAttempts = 0;
    return await new Promise((resolve, reject) => {
      let settled = false;
      let outbound;
      const finish = (operation, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        input.signal?.removeEventListener?.("abort", abort);
        operation(value);
      };
      const fail = (code, details = {}) => finish(reject,
        new StarcraftTmgStructuredTransportError(code, {
          outputContractRef: request.outputContractRef,
          physicalAttempts,
          ...details,
        }));
      const abort = () => {
        outbound?.destroy?.();
        fail("PROVIDER_ABORTED", {
          requestDefinitelyNotSent: physicalAttempts === 0,
          requestMayHaveBeenSent: physicalAttempts === 1,
        });
      };
      const timer = setTimeout(() => {
        outbound?.destroy?.();
        fail("PROVIDER_TRANSPORT_TIMEOUT", {
          requestMayHaveBeenSent: physicalAttempts === 1,
        });
      }, binding.timeoutMs);
      input.signal?.addEventListener?.("abort", abort, { once: true });
      const lookup = (_hostname, lookupOptions, callback) => {
        if (lookupOptions?.all) callback(null, [selected]);
        else callback(null, selected.address, selected.family);
      };
      try {
        physicalAttempts = 1;
        outbound = requestImplementation({
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
            authorization: `Bearer ${credentialText}`,
            "content-type": "application/json",
            accept: "application/json",
            "accept-encoding": "identity",
            connection: "close",
            "content-length": String(Buffer.byteLength(body, "utf8")),
          },
        }, (response) => {
          const status = Number(response?.statusCode || 0);
          const type = String(response.headers?.["content-type"] || "")
            .toLowerCase();
          const encoding = String(response.headers?.["content-encoding"]
            || "identity").toLowerCase();
          if (!Number.isInteger(status) || status < 100 || status > 599
            || !/^application\/json(?:\s*;\s*charset=utf-8)?$/u.test(type)
            || encoding !== "identity") {
            response.destroy?.();
            fail(status === 402 ? "PROVIDER_PAYMENT_REQUIRED"
              : status === 401 || status === 403
                ? "PROVIDER_AUTHENTICATION_FAILED"
                : "PROVIDER_RESPONSE_CONTRACT_REJECTED", {
              status: Number.isInteger(status) ? status : null,
              requestMayHaveBeenSent: true,
            });
            return;
          }
          const chunks = [];
          let bytes = 0;
          response.on("data", (chunk) => {
            const buffer = Buffer.from(chunk);
            bytes += buffer.length;
            if (bytes > maxResponseBytes) {
              response.destroy?.(); outbound.destroy?.();
              fail("PROVIDER_RESPONSE_TOO_LARGE", {
                status, requestMayHaveBeenSent: true,
              });
              return;
            }
            chunks.push(buffer);
          });
          response.on("error", () => fail("PROVIDER_RESPONSE_STREAM_FAILED", {
            status, requestMayHaveBeenSent: true,
          }));
          response.on("end", () => {
            if (settled) return;
            const raw = Buffer.concat(chunks);
            let payload;
            try {
              const text = raw.toString("utf8");
              if (text.includes(credentialText)) {
                throw new Error("credential echo");
              }
              payload = JSON.parse(text);
              if (!object(payload)) throw new Error("payload is not an object");
            } catch {
              fail(status === 402 ? "PROVIDER_PAYMENT_REQUIRED"
                : status === 401 || status === 403
                  ? "PROVIDER_AUTHENTICATION_FAILED"
                  : "PROVIDER_RESPONSE_CONTRACT_REJECTED", {
                status, requestMayHaveBeenSent: true,
              });
              return;
            } finally {
              raw.fill(0);
              chunks.forEach((chunk) => chunk.fill(0));
            }
            const receiptBody = {
              schemaVersion:
                `${STARCRAFT_TMG_STRUCTURED_PROVIDER_EGRESS_TRANSPORT_VERSION}.success`,
              requestId: request.requestId,
              providerProfileRef: clone(binding.providerProfileRef),
              egressPolicyHash: binding.policyHash,
              outputContractRef: clone(request.outputContractRef),
              endpointDialect: binding.endpointDialect,
              requestedModel: binding.model,
              requestBodyHash: hashStarcraftTmgContract(request.body),
              schemaHash: hashStarcraftTmgContract(
                request.body.text.format.schema),
              payloadHash: hashStarcraftTmgContract(payload),
              providerRequestIdHash: typeof response.headers?.["x-request-id"]
                === "string" ? sha256(response.headers["x-request-id"]) : null,
              dnsAddressSetHash: hashStarcraftTmgContract(addresses),
              tlsServerName: binding.endpoint.hostname,
              status,
              physicalAttempts: 1,
              automaticRetries: 0,
              startedAt,
              finishedAt: new Date(now()).toISOString(),
              trainingTruth: false,
            };
            finish(resolve, freeze({
              delivery: "response_received",
              status,
              payload: clone(payload),
              physicalAttempts: 1,
              transportReceipt: { ...receiptBody,
                receiptHash: hashStarcraftTmgContract(receiptBody) },
            }));
          });
        });
      } catch {
        fail("PROVIDER_TRANSPORT_FAILED", {
          requestMayHaveBeenSent: physicalAttempts === 1,
          requestDefinitelyNotSent: physicalAttempts === 0,
        });
        return;
      }
      outbound.once?.("socket", (socket) => {
        socket.once?.("secureConnect", () => {
          if (!sameAddress(String(socket.remoteAddress || "").toLowerCase(),
            selected.address)) {
            outbound.destroy?.();
            fail("PROVIDER_REMOTE_ADDRESS_DRIFT", {
              requestMayHaveBeenSent: true,
            });
          }
        });
      });
      outbound.once?.("error", () => fail("PROVIDER_TRANSPORT_FAILED", {
        requestMayHaveBeenSent: physicalAttempts === 1,
      }));
      outbound.setTimeout?.(binding.timeoutMs, () => {
        outbound.destroy?.();
        fail("PROVIDER_TRANSPORT_TIMEOUT", { requestMayHaveBeenSent: true });
      });
      try { outbound.end(body); }
      catch {
        fail("PROVIDER_TRANSPORT_FAILED", {
          requestMayHaveBeenSent: physicalAttempts === 1,
        });
      }
    });
  }

  return Object.freeze({ send });
}
