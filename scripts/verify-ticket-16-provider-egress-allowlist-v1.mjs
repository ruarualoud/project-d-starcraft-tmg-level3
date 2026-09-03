#!/usr/bin/env node

import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_16_PROVIDER_EGRESS_ALLOWLIST_V1 as contract } from
  "../content/provider/ticket-16-provider-egress-allowlist-v1.mjs";
import { STARCRAFT_TMG_TICKET_16_CREDENTIAL_WORKER_ISOLATION_V1 as predecessor } from
  "../content/provider/ticket-16-credential-worker-isolation-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createProviderProfile } from
  "../packages/character-agent/contracts-v1.mjs";
import {
  createStarcraftTmgSecureProviderAttachmentControlV1,
  STARCRAFT_TMG_PROVIDER_DISCLOSURE_NOTICE_VERSION,
} from "../packages/secure-provider-runtime/credential-attachment-control-v1.mjs";
import {
  assertStarcraftTmgProviderEgressBindingV1,
} from "../packages/secure-provider-runtime/provider-egress-contract-v1.mjs";
import {
  createStarcraftTmgProviderEgressTransportV1,
  isStarcraftTmgGloballyRoutableAddressV1,
  StarcraftTmgProviderEgressError,
} from "../packages/secure-provider-runtime/provider-egress-transport-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV1 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v1.mjs";
import {
  createStarcraftTmgProviderEgressWorkerPortV1,
  STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION,
} from "../packages/secure-provider-runtime/provider-egress-worker-port-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_ROOT = path.join(ROOT,
  "build/ticket-16-slice-156-provider-egress-allowlist-v1");
const REPORT_PATH = path.join(REPORT_ROOT, "report.json");
const SYNTHETIC_BYTES = Object.freeze([
  0x73, 0x6b, 0x2d, 0x73, 0x6c, 0x69, 0x63, 0x65, 0x31, 0x35, 0x36,
  0x2d, 0x73, 0x79, 0x6e, 0x74, 0x68, 0x65, 0x74, 0x69, 0x63, 0x2d,
  0x6e, 0x65, 0x76, 0x65, 0x72, 0x2d, 0x6c, 0x69, 0x76, 0x65,
]);
const checks = [];
const failures = [];
let actualChildren = 0;
let injectedHttpsRequests = 0;

async function check(id, operation) {
  try {
    await operation();
    checks.push({ id, passed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push({ id, passed: false, error: message });
    failures.push(`${id}: ${message}`);
  }
}

function verifyHash(value, field) {
  const { [field]: observed, ...body } = value;
  assert.equal(observed, hashStarcraftTmgContract(body));
}

function syntheticBuffer() {
  return Buffer.from(SYNTHETIC_BYTES);
}

function allZero(buffer) {
  return Buffer.isBuffer(buffer) && buffer.every((byte) => byte === 0);
}

function profile(overrides = {}) {
  return createProviderProfile({
    providerProfileId: "starcraft-tmg.direct-provider.slice-156.v1",
    version: "1.0.0",
    provider: "openai-compatible-direct",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-test-model",
    contextBudget: 4096,
    outputBudget: 256,
    timeoutMs: 1000,
    retryPolicy: {
      maxAttempts: 1,
      owner: "session_supervisor",
      internalRetry: false,
    },
    ...overrides,
  });
}

function registry(providerProfile = profile(), options = {}) {
  return createStarcraftTmgProviderProfileRegistryV1({
    entries: [{ providerProfile, completionPath: "/chat/completions" }],
    ...options,
  });
}

function ref(providerProfile) {
  return {
    id: providerProfile.providerProfileId,
    version: providerProfile.version,
    hash: providerProfile.integrity.hash,
  };
}

async function bindingFor(providerProfile = profile()) {
  const result = await registry(providerProfile).resolveEgressBinding({
    profileRef: ref(providerProfile),
  });
  assert.equal(result.ok, true);
  return result.egressBinding;
}

function providerRequest(overrides = {}) {
  return {
    schemaVersion: "starcraft_tmg_direct_provider_request_v1",
    requestId: "slice-156-provider-request-001",
    intent: "chat",
    promptPack: "novice_teacher_prompt",
    promptNodes: [{ kind: "rules", ref: "sealed-rules-ref" }],
    userMessage: "Explain the current legal movement options.",
    responseContract: {
      allowedChannels: ["reply"],
      decisionCandidateSource: "none_read_only",
    },
    maxOutputUnits: 64,
    ...overrides,
  };
}

function successPayload(overrides = {}) {
  return JSON.stringify({
    model: "gpt-test-model-2026-09",
    choices: [{ message: { content: JSON.stringify({
      channels: { reply: { text: "Synthetic fixture output." } },
    }) } }],
    usage: { prompt_tokens: 12, completion_tokens: 4, total_tokens: 16 },
    ...overrides,
  });
}

function createHttpsFixture(plans = [{}]) {
  const observations = [];
  let index = 0;
  function requestImplementation(options, callback) {
    injectedHttpsRequests += 1;
    const plan = plans[Math.min(index, plans.length - 1)];
    index += 1;
    const request = new EventEmitter();
    request.destroyed = false;
    request.destroy = () => { request.destroyed = true; };
    request.setTimeout = () => {};
    request.end = (body) => {
      observations.push({ options, body, request });
      if (plan.throwOnEnd) throw new Error("injected end failure");
      if (plan.hang) return;
      queueMicrotask(() => {
        const response = new EventEmitter();
        const payload = plan.payload ?? successPayload();
        response.statusCode = plan.status ?? 200;
        response.headers = {
          "content-type": "application/json; charset=utf-8",
          "content-length": String(Buffer.byteLength(payload)),
          "x-request-id": "req-slice-156-fixture",
          ...(plan.headers || {}),
        };
        response.destroyed = false;
        response.destroy = () => { response.destroyed = true; };
        response.resume = () => {};
        callback(response);
        if (response.destroyed) return;
        queueMicrotask(() => {
          for (const chunk of plan.chunks || [Buffer.from(payload)]) {
            response.emit("data", chunk);
          }
          response.emit("end");
        });
      });
    };
    return request;
  }
  return { requestImplementation, observations, count: () => index };
}

async function fixtureTransport({ providerProfile = profile(), plans, options = {},
  addresses = [{ address: "93.184.216.34", family: 4 }] } = {}) {
  const fixture = createHttpsFixture(plans);
  let resolutions = 0;
  const transport = createStarcraftTmgProviderEgressTransportV1({
    resolveAddresses: async () => { resolutions += 1; return addresses; },
    requestImplementation: fixture.requestImplementation,
    now: (() => {
      let second = 0;
      return () => new Date(Date.UTC(2026, 8, 4, 1, 0, second++)).toISOString();
    })(),
    ...options,
  });
  return {
    transport,
    binding: await bindingFor(providerProfile),
    fixture,
    resolutions: () => resolutions,
  };
}

async function completeFixture(fixture, overrides = {}) {
  return fixture.transport.complete({
    egressBinding: fixture.binding,
    credentialBytes: syntheticBuffer(),
    providerRequest: providerRequest(),
    ...overrides,
  });
}

function deterministicIds(prefix) {
  let sequence = 0;
  return () => `${prefix}-${String(++sequence).padStart(4, "0")}`;
}

function actualPort(providerProfile = profile(), options = {}) {
  return createStarcraftTmgProviderEgressWorkerPortV1({
    providerProfileRegistry: registry(providerProfile),
    createId: deterministicIds(options.idPrefix || "actual-egress"),
    handshakeTimeoutMs: 3000,
    shutdownGraceMs: 500,
    ...options,
  });
}

async function attachActual(port, providerProfile = profile(),
  attachmentId = "slice-156-attachment-001") {
  const bytes = syntheticBuffer();
  const attached = await port.attachCredential({
    attachmentId,
    providerProfile,
    credentialBytes: bytes,
  });
  actualChildren += 1;
  return { attached, bytes };
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitFor(predicate, message, attempts = 100) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (predicate()) return;
    await wait(5);
  }
  assert.fail(message);
}

class FakeChild extends EventEmitter {
  constructor(handler) {
    super();
    this.pid = 99156;
    this.connected = true;
    this.exitCode = null;
    this.signalCode = null;
    this.handler = handler;
  }

  send(message, callback) {
    queueMicrotask(() => {
      callback?.(null);
      this.handler?.(message, this);
    });
  }

  kill(signal = "SIGTERM") {
    if (this.exitCode !== null || this.signalCode !== null) return true;
    this.connected = false;
    this.signalCode = signal;
    queueMicrotask(() => this.emit("exit", null, signal));
    return true;
  }
}

function emitValidInitialize(message, child) {
  child.emit("message", {
    type: "initialized",
    requestId: message.requestId,
    attachmentId: message.attachmentId,
    ok: true,
    workerVersion: STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION,
    providerProfileHash: message.egressBinding.providerProfileRef.hash,
    egressPolicyHash: message.egressBinding.policyHash,
    isolation: {
      processIsolated: true,
      environmentInheritedFromParent: false,
      environmentKeys: ["NODE_NO_WARNINGS"],
      environmentAllowlistPassed: true,
      credentialPersistence: "child_process_session_memory_only",
      credentialReturnedOverIpc: false,
      providerTransportMounted: true,
      networkRequestMadeAtInitialization: false,
      rulesRoomAgentSkillMemoryOrDshImported: false,
      trainingTruth: false,
    },
    trainingTruth: false,
  });
}

function fakeWorkerSuccess(message, binding) {
  const receiptBody = {
    schemaVersion: "starcraft_tmg_provider_egress_transport_v1.success",
    requestId: message.providerRequest.requestId,
    providerProfileRef: binding.providerProfileRef,
    egressPolicyHash: binding.policyHash,
    providerId: binding.providerId,
    requestedModel: binding.model,
    reportedModel: binding.model,
    providerRequestIdHash: null,
    status: 200,
    usage: { inputUnits: 0, outputUnits: 0, totalUnits: 0 },
    responseFingerprint: "c".repeat(64),
    dnsAddressSetHash: "d".repeat(64),
    tlsServerName: binding.endpoint.hostname,
    tlsCertificateVerificationDisabled: false,
    redirectFollowed: false,
    proxyUsed: false,
    physicalAttempts: 1,
    automaticRetries: 0,
    startedAt: "2026-09-04T01:00:00.000Z",
    finishedAt: "2026-09-04T01:00:01.000Z",
    trainingTruth: false,
  };
  return {
    output: { channels: { reply: { text: "Injected child result." } } },
    usageReceipt: {
      ...receiptBody,
      receiptHash: hashStarcraftTmgContract(receiptBody),
    },
  };
}

function fakeWorkerFailure(code, physicalAttempts) {
  const receiptBody = {
    schemaVersion: "starcraft_tmg_provider_egress_transport_v1.failure",
    code,
    requestDefinitelyNotSent: physicalAttempts === 0,
    requestMayHaveBeenSent: physicalAttempts === 1,
    status: null,
    physicalAttempts,
    automaticRetries: 0,
    trainingTruth: false,
  };
  return {
    ...receiptBody,
    receiptHash: hashStarcraftTmgContract(receiptBody),
  };
}

await check("contract_is_hash_sealed_and_binds_slice_155", () => {
  verifyHash(contract, "contractHash");
  assert.equal(contract.predecessorContractHash, predecessor.contractHash);
  assert.equal(contract.acceptance.fixedAssertions, 40);
});

await check("mtl_scheduling_lineage_is_pinned_and_starcraft_adapted", () => {
  assert.equal(contract.mtlSchedulingLineage.commit,
    "50ef5c29c655c015335d76e78fb4a0ecb442252f");
  assert(contract.mtlSchedulingLineage.adopted.includes(
    "credential_broker_alone_owns_provider_transport"));
  assert(contract.mtlSchedulingLineage.starcraftDifferences.includes(
    "no_online_automatic_retry_or_contract_repair_round"));
  assert(contract.mtlSchedulingLineage.starcraftDifferences.includes(
    "no_doh_bypass_or_deepseek_specific_online_path"));
});

await check("external_network_standards_are_primary_and_explicit", () => {
  assert.deepEqual(contract.externalStandards.map((entry) => entry.owner),
    ["IANA", "IANA", "Node.js"]);
  assert(contract.externalStandards.every((entry) =>
    entry.url.startsWith("https://")));
  assert.equal(contract.egressPolicy.addressClassifier.startsWith("conservative"), true);
});

await check("registry_metadata_and_public_list_are_endpoint_free", async () => {
  const providerProfile = profile();
  const value = registry(providerProfile);
  assert.equal(value.metadata().userSuppliedEndpointAllowed, false);
  assert.deepEqual(value.metadata().allowedPorts, [443]);
  const listing = value.listPublic();
  assert.equal(listing.profiles.length, 1);
  assert.equal(listing.profiles[0].model, providerProfile.model);
  assert(!JSON.stringify(listing).includes("api.openai.com"));
});

await check("registry_requires_the_exact_server_profile_reference", async () => {
  const providerProfile = profile();
  const value = registry(providerProfile);
  assert.equal((await value.resolve({ profileRef: ref(providerProfile) })).ok, true);
  assert.equal((await value.resolveEgressBinding({
    profileRef: ref(providerProfile),
  })).ok, true);
  await assert.rejects(value.resolve({
    profileRef: { ...ref(providerProfile), baseUrl: "https://evil.example" },
  }), /forbidden fields/u);
  await assert.rejects(value.resolve({
    profileRef: ref(providerProfile), model: "client-model",
  }), /forbidden fields/u);
});

await check("registry_rejects_unknown_version_and_hash_without_fallback", async () => {
  const providerProfile = profile();
  const value = registry(providerProfile);
  assert.equal((await value.resolve({ profileRef: {
    ...ref(providerProfile), hash: "f".repeat(64),
  } })).reason, "provider_profile_not_found");
  assert.equal((await value.resolve({ profileRef: {
    ...ref(providerProfile), version: "2.0.0",
  } })).reason, "provider_profile_not_found");
});

await check("registry_rejects_non_https_userinfo_query_fragment_ip_and_localhost", () => {
  for (const baseUrl of [
    "http://api.openai.com/v1",
    "https://user:pass@api.openai.com/v1",
    "https://api.openai.com/v1?route=x",
    "https://api.openai.com/v1#fragment",
    "https://127.0.0.1/v1",
    "https://localhost/v1",
  ]) assert.throws(() => registry(profile({ baseUrl })), /Provider/u);
});

await check("registry_rejects_unlisted_provider_port_retry_and_ambiguous_paths", () => {
  assert.throws(() => registry(profile({ provider: "another-provider" })),
    /allowlisted/u);
  assert.throws(() => registry(profile({ model: "administrator_must_select" })),
    /not configured/u);
  assert.throws(() => registry(profile({ provider: "local-dsh-runtime" }), {
    allowedProviders: ["local-dsh-runtime"],
  }), /Online DSH/u);
  assert.throws(() => registry(profile({ baseUrl: "https://api.openai.com:8443/v1" })),
    /port/u);
  assert.throws(() => registry(profile({ retryPolicy: {
    maxAttempts: 2, owner: "session_supervisor", internalRetry: false,
  } })), /exactly one/u);
  assert.throws(() => createStarcraftTmgProviderProfileRegistryV1({
    entries: [{ providerProfile: profile(), completionPath: "/../admin" }],
  }), /path/u);
});

await check("egress_binding_is_hash_sealed_exact_and_single_attempt", async () => {
  const binding = await bindingFor();
  assert.equal(assertStarcraftTmgProviderEgressBindingV1(binding).policyHash,
    binding.policyHash);
  assert.equal(binding.endpoint.hostname, "api.openai.com");
  assert.equal(binding.endpoint.path, "/v1/chat/completions");
  assert.equal(binding.physicalAttempts, 1);
  assert.equal(binding.automaticRetryAllowed, false);
  assert.throws(() => assertStarcraftTmgProviderEgressBindingV1({
    ...binding, endpoint: { ...binding.endpoint, hostname: "127.0.0.1" },
  }), /hash|policy/u);
});

await check("ipv4_classifier_rejects_special_purpose_and_accepts_public_unicast", () => {
  for (const address of [
    "0.0.0.0", "10.2.3.4", "100.64.1.1", "127.0.0.1",
    "169.254.1.1", "172.16.0.1", "192.0.2.4", "192.168.1.1",
    "198.18.0.1", "198.51.100.9", "203.0.113.7", "224.0.0.1",
    "255.255.255.255",
  ]) assert.equal(isStarcraftTmgGloballyRoutableAddressV1(address), false,
    address);
  for (const address of ["1.1.1.1", "8.8.8.8", "93.184.216.34"]) {
    assert.equal(isStarcraftTmgGloballyRoutableAddressV1(address), true, address);
  }
});

await check("ipv6_classifier_is_conservative_and_rejects_local_documentation_and_transition", () => {
  for (const address of [
    "::", "::1", "::ffff:127.0.0.1", "fe80::1", "fc00::1",
    "2001:db8::1", "2002::1", "3fff::1", "ff02::1",
  ]) assert.equal(isStarcraftTmgGloballyRoutableAddressV1(address), false,
    address);
  for (const address of ["2606:4700:4700::1111", "2001:4860:4860::8888"]) {
    assert.equal(isStarcraftTmgGloballyRoutableAddressV1(address), true, address);
  }
});

await check("transport_metadata_freezes_https_dns_tls_proxy_redirect_and_attempt_policy", () => {
  const transport = createStarcraftTmgProviderEgressTransportV1({
    resolveAddresses: async () => [],
    requestImplementation() {},
  });
  const metadata = transport.metadata();
  assert.deepEqual(metadata.protocols, ["https:"]);
  assert.equal(metadata.tlsCertificateVerificationDisabled, false);
  assert.equal(metadata.redirectsAllowed, false);
  assert.equal(metadata.proxyAllowed, false);
  assert.equal(metadata.physicalAttempts, 1);
  assert.equal(metadata.automaticRetryAllowed, false);
});

let successfulFixture;
await check("transport_uses_exact_https_authority_tls_sni_and_dns_pinning", async () => {
  successfulFixture = await fixtureTransport();
  await completeFixture(successfulFixture);
  const observed = successfulFixture.fixture.observations[0];
  assert.equal(observed.options.protocol, "https:");
  assert.equal(observed.options.hostname, "api.openai.com");
  assert.equal(observed.options.port, 443);
  assert.equal(observed.options.path, "/v1/chat/completions");
  assert.equal(observed.options.servername, "api.openai.com");
  assert.equal(observed.options.rejectUnauthorized, true);
  assert.equal(observed.options.agent, false);
  assert.equal(Object.hasOwn(observed.options, "proxyEnv"), false);
  const selected = await new Promise((resolve, reject) => {
    observed.options.lookup("api.openai.com", { all: true }, (error, records) =>
      error ? reject(error) : resolve(records));
  });
  assert.deepEqual(selected, [{ address: "93.184.216.34", family: 4 }]);
});

await check("transport_generates_only_fixed_headers_and_server_owned_model_path", () => {
  const observed = successfulFixture.fixture.observations[0];
  assert.deepEqual(Object.keys(observed.options.headers).sort(), [
    "accept", "accept-encoding", "authorization", "connection",
    "content-length", "content-type",
  ]);
  assert.equal(observed.options.headers["accept-encoding"], "identity");
  const body = JSON.parse(observed.body);
  assert.equal(body.model, "gpt-test-model");
  assert.equal(body.max_tokens, 64);
  assert.equal(body.messages.length, 2);
  assert(!observed.body.includes(Buffer.from(SYNTHETIC_BYTES).toString("utf8")));
});

await check("transport_returns_bounded_output_and_hash_sealed_safe_receipt", async () => {
  const fixture = await fixtureTransport();
  const result = await completeFixture(fixture);
  verifyHash(result.usageReceipt, "receiptHash");
  assert.equal(result.output.channels.reply.text, "Synthetic fixture output.");
  assert.deepEqual(result.usageReceipt.usage, {
    inputUnits: 12, outputUnits: 4, totalUnits: 16,
  });
  assert.equal(result.usageReceipt.providerRequestIdHash.length, 64);
  assert.equal(result.usageReceipt.responseFingerprint.length, 64);
  assert.equal(result.usageReceipt.redirectFollowed, false);
  assert.equal(result.usageReceipt.proxyUsed, false);
});

await check("successful_transport_performs_exactly_one_physical_attempt_without_retry", async () => {
  const fixture = await fixtureTransport();
  const result = await completeFixture(fixture);
  assert.equal(fixture.fixture.count(), 1);
  assert.equal(result.usageReceipt.physicalAttempts, 1);
  assert.equal(result.usageReceipt.automaticRetries, 0);
});

await check("mixed_public_and_non_global_dns_answers_fail_before_https", async () => {
  const fixture = await fixtureTransport({ addresses: [
    { address: "93.184.216.34", family: 4 },
    { address: "127.0.0.1", family: 4 },
  ] });
  await assert.rejects(completeFixture(fixture), (error) => {
    assert.equal(error.code, "PROVIDER_DNS_NON_GLOBAL_REJECTED");
    assert.equal(error.safeReceipt.requestDefinitelyNotSent, true);
    return true;
  });
  assert.equal(fixture.fixture.count(), 0);
});

await check("empty_or_unbounded_dns_answers_fail_before_https", async () => {
  for (const addresses of [[], Array.from({ length: 17 }, (_, index) => ({
    address: `8.8.8.${index + 1}`, family: 4,
  }))]) {
    const fixture = await fixtureTransport({ addresses });
    await assert.rejects(completeFixture(fixture),
      /PROVIDER_DNS_PUBLIC_ADDRESS_REQUIRED/u);
    assert.equal(fixture.fixture.count(), 0);
  }
});

await check("dns_resolver_failure_is_typed_as_definitely_not_sent", async () => {
  const binding = await bindingFor();
  const transport = createStarcraftTmgProviderEgressTransportV1({
    resolveAddresses: async () => { throw new Error("synthetic DNS failure"); },
    requestImplementation() { assert.fail("HTTPS must not run"); },
  });
  await assert.rejects(transport.complete({
    egressBinding: binding,
    credentialBytes: syntheticBuffer(),
    providerRequest: providerRequest(),
  }), (error) => {
    assert.equal(error.code, "PROVIDER_DNS_RESOLUTION_FAILED");
    assert.equal(error.safeReceipt.requestDefinitelyNotSent, true);
    assert.equal(error.safeReceipt.physicalAttempts, 0);
    return true;
  });
});

await check("redirect_is_rejected_without_following_location", async () => {
  const fixture = await fixtureTransport({ plans: [{
    status: 302,
    headers: { location: "https://evil.example/steal" },
  }] });
  await assert.rejects(completeFixture(fixture), (error) => {
    assert.equal(error.code, "PROVIDER_REDIRECT_REJECTED");
    assert.equal(error.safeReceipt.physicalAttempts, 1);
    return true;
  });
  assert.equal(fixture.fixture.count(), 1);
});

await check("http_auth_rate_limit_and_upstream_failures_are_typed_without_body", async () => {
  for (const [status, code] of [
    [401, "PROVIDER_AUTHENTICATION_FAILED"],
    [429, "PROVIDER_RATE_LIMITED"],
    [503, "PROVIDER_UPSTREAM_FAILED"],
  ]) {
    const fixture = await fixtureTransport({ plans: [{ status }] });
    await assert.rejects(completeFixture(fixture), (error) => {
      assert.equal(error.code, code);
      assert.equal(error.safeReceipt.status, status);
      return true;
    });
    assert.equal(fixture.fixture.count(), 1);
  }
});

await check("response_media_encoding_and_declared_length_fail_closed", async () => {
  for (const headers of [
    { "content-type": "text/plain" },
    { "content-encoding": "gzip" },
    { "content-length": "invalid" },
    { "content-length": "2048" },
  ]) {
    const fixture = await fixtureTransport({
      plans: [{ headers }], options: { maxResponseBytes: 1024 },
    });
    await assert.rejects(completeFixture(fixture),
      /PROVIDER_RESPONSE_CONTRACT_REJECTED/u);
  }
});

await check("streaming_response_overflow_destroys_and_rejects", async () => {
  const fixture = await fixtureTransport({
    plans: [{
      headers: { "content-length": undefined },
      chunks: [Buffer.alloc(600, 0x61), Buffer.alloc(600, 0x62)],
    }],
    options: { maxResponseBytes: 1024 },
  });
  await assert.rejects(completeFixture(fixture),
    /PROVIDER_RESPONSE_TOO_LARGE/u);
  assert.equal(fixture.fixture.observations[0].request.destroyed, true);
});

await check("invalid_json_and_credential_shaped_output_are_rejected", async () => {
  const invalid = await fixtureTransport({ plans: [{ payload: "not-json" }] });
  await assert.rejects(completeFixture(invalid),
    /PROVIDER_RESPONSE_CONTRACT_REJECTED/u);
  const unsafe = await fixtureTransport({ plans: [{ payload: successPayload({
    choices: [{ message: { content: JSON.stringify({
      channels: { reply: { authorization: "Bearer syntheticpollution123" } },
    }) } }],
  }) }] });
  await assert.rejects(completeFixture(unsafe),
    /PROVIDER_RESPONSE_SENSITIVE_MATERIAL_REJECTED/u);
});

await check("request_contract_secret_and_size_fail_before_dns_or_https", async () => {
  const fixture = await fixtureTransport({ options: { maxRequestBytes: 512 } });
  for (const request of [
    providerRequest({ schemaVersion: "wrong" }),
    providerRequest({ userMessage: "authorization=synthetic-secret-value" }),
    providerRequest({ userMessage: "x".repeat(2000) }),
  ]) {
    await assert.rejects(completeFixture(fixture, { providerRequest: request }),
      /PROVIDER_REQUEST/u);
  }
  assert.equal(fixture.resolutions(), 0);
  assert.equal(fixture.fixture.count(), 0);
});

await check("already_aborted_signal_fails_before_dns_or_https", async () => {
  const fixture = await fixtureTransport();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(completeFixture(fixture, { signal: controller.signal }),
    /PROVIDER_ABORTED/u);
  assert.equal(fixture.resolutions(), 0);
  assert.equal(fixture.fixture.count(), 0);
});

await check("total_timeout_ends_one_ambiguous_physical_attempt_without_retry", async () => {
  const providerProfile = profile({ timeoutMs: 20 });
  const fixture = await fixtureTransport({ providerProfile, plans: [{ hang: true }] });
  await assert.rejects(completeFixture(fixture), (error) => {
    assert.equal(error.code, "PROVIDER_TRANSPORT_TIMEOUT");
    assert.equal(error.safeReceipt.requestMayHaveBeenSent, true);
    assert.equal(error.safeReceipt.physicalAttempts, 1);
    return true;
  });
  assert.equal(fixture.fixture.count(), 1);
});

await check("in_flight_abort_destroys_one_ambiguous_attempt_without_retry", async () => {
  const fixture = await fixtureTransport({ plans: [{ hang: true }] });
  const controller = new AbortController();
  const operation = completeFixture(fixture, { signal: controller.signal });
  setTimeout(() => controller.abort(), 5);
  await assert.rejects(operation, (error) => {
    assert.equal(error.code, "PROVIDER_ABORTED");
    assert.equal(error.safeReceipt.requestMayHaveBeenSent, true);
    assert.equal(error.safeReceipt.physicalAttempts, 1);
    return true;
  });
  assert.equal(fixture.fixture.count(), 1);
  assert.equal(fixture.fixture.observations[0].request.destroyed, true);
});

await check("synchronous_request_end_failure_is_typed_and_never_retried", async () => {
  const fixture = await fixtureTransport({ plans: [{ throwOnEnd: true }] });
  await assert.rejects(completeFixture(fixture), (error) => {
    assert.equal(error.code, "PROVIDER_TRANSPORT_FAILED");
    assert.equal(error.safeReceipt.physicalAttempts, 1);
    return true;
  });
  assert.equal(fixture.fixture.count(), 1);
});

await check("actual_provider_child_attaches_without_network_and_zeroes_parent_buffer", async () => {
  const providerProfile = profile();
  const port = actualPort(providerProfile, { idPrefix: "attach-egress" });
  const { attached, bytes } = await attachActual(port, providerProfile);
  assert.equal(attached.ok, true);
  assert.equal(allZero(bytes), true);
  const state = port.readWorkerState({ workerRef: attached.workerRef });
  assert.equal(state.worker.providerTransportMounted, true);
  assert.equal(state.worker.state, "attached");
  await port.close();
});

await check("actual_provider_child_rejects_invalid_request_before_network_and_remains_detachable", async () => {
  const providerProfile = profile();
  const port = actualPort(providerProfile, { idPrefix: "preflight-egress" });
  const { attached } = await attachActual(port, providerProfile,
    "slice-156-attachment-preflight");
  await assert.rejects(port.complete({
    workerRef: attached.workerRef,
    providerRequest: providerRequest({ schemaVersion: "forbidden-schema" }),
  }), (error) => {
    assert.equal(error.code, "PROVIDER_REQUEST_CONTRACT_REJECTED");
    assert.equal(error.safeReceipt.requestDefinitelyNotSent, true);
    assert.equal(error.safeReceipt.physicalAttempts, 0);
    return true;
  });
  assert.equal(port.readWorkerState({ workerRef: attached.workerRef }).worker.state,
    "attached");
  await port.close();
});

await check("registry_mismatch_zeroes_input_without_spawning_a_child", async () => {
  let spawns = 0;
  const configured = profile();
  const port = createStarcraftTmgProviderEgressWorkerPortV1({
    providerProfileRegistry: registry(configured),
    spawnProcess() { spawns += 1; return null; },
  });
  const bytes = syntheticBuffer();
  await assert.rejects(port.attachCredential({
    attachmentId: "slice-156-registry-mismatch",
    providerProfile: profile({ model: "different-model" }),
    credentialBytes: bytes,
  }), /did not resolve/u);
  assert.equal(allZero(bytes), true);
  assert.equal(spawns, 0);
  await port.close();
});

await check("unsafe_child_result_is_rejected_and_the_worker_is_killed", async () => {
  let child;
  const providerProfile = profile();
  const port = createStarcraftTmgProviderEgressWorkerPortV1({
    providerProfileRegistry: registry(providerProfile),
    childPath: "/injected/unsafe-egress-child.mjs",
    spawnProcess() {
      child = new FakeChild((message, instance) => {
        if (message.type === "initialize") emitValidInitialize(message, instance);
        if (message.type === "complete") instance.emit("message", {
          type: "provider_result",
          requestId: message.requestId,
          ok: true,
          value: { output: {}, usageReceipt: {} },
          apiKey: "polluted-result",
          workerVersion: STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION,
          trainingTruth: false,
        });
      });
      return child;
    },
    createId: deterministicIds("unsafe-egress"),
    handshakeTimeoutMs: 100,
    shutdownGraceMs: 20,
  });
  const bytes = syntheticBuffer();
  const attached = await port.attachCredential({
    attachmentId: "slice-156-unsafe-child",
    providerProfile,
    credentialBytes: bytes,
  });
  await assert.rejects(port.complete({
    workerRef: attached.workerRef,
    providerRequest: providerRequest(),
  }), /forbidden fields|unsafe/u);
  assert.equal(child.signalCode, "SIGKILL");
  await port.close();
});

await check("parent_port_accepts_only_a_hash_bound_safe_child_success", async () => {
  let bound;
  const providerProfile = profile();
  const port = createStarcraftTmgProviderEgressWorkerPortV1({
    providerProfileRegistry: registry(providerProfile),
    childPath: "/injected/safe-egress-child.mjs",
    spawnProcess() {
      return new FakeChild((message, instance) => {
        if (message.type === "initialize") {
          bound = message.egressBinding;
          emitValidInitialize(message, instance);
        }
        if (message.type === "complete") instance.emit("message", {
          type: "provider_result",
          requestId: message.requestId,
          ok: true,
          value: fakeWorkerSuccess(message, bound),
          workerVersion: STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION,
          trainingTruth: false,
        });
        if (message.type === "shutdown") {
          instance.emit("message", {
            type: "shutdown_complete",
            requestId: message.requestId,
            ok: true,
            reason: message.reason,
            workerVersion: STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION,
            sensitiveBytesZeroed: true,
            trainingTruth: false,
          });
          instance.kill("SIGTERM");
        }
      });
    },
    createId: deterministicIds("safe-egress"),
    handshakeTimeoutMs: 100,
    shutdownGraceMs: 20,
  });
  const bytes = syntheticBuffer();
  const attached = await port.attachCredential({
    attachmentId: "slice-156-safe-child",
    providerProfile,
    credentialBytes: bytes,
  });
  const result = await port.complete({
    workerRef: attached.workerRef,
    providerRequest: providerRequest(),
  });
  assert.equal(result.output.channels.reply.text, "Injected child result.");
  verifyHash(result.usageReceipt, "receiptHash");
  await port.close();
});

await check("parent_abort_is_forwarded_to_the_child_and_returns_a_safe_failure", async () => {
  const providerProfile = profile();
  const port = createStarcraftTmgProviderEgressWorkerPortV1({
    providerProfileRegistry: registry(providerProfile),
    childPath: "/injected/cancellable-egress-child.mjs",
    spawnProcess() {
      return new FakeChild((message, instance) => {
        if (message.type === "initialize") emitValidInitialize(message, instance);
        if (message.type === "cancel") {
          instance.emit("message", {
            type: "cancel_complete",
            requestId: message.requestId,
            targetRequestId: message.targetRequestId,
            ok: true,
            matched: true,
            workerVersion: STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION,
            trainingTruth: false,
          });
          instance.emit("message", {
            type: "provider_result",
            requestId: message.targetRequestId,
            ok: false,
            code: "PROVIDER_ABORTED",
            safeReceipt: fakeWorkerFailure("PROVIDER_ABORTED", 1),
            workerVersion: STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION,
            trainingTruth: false,
          });
        }
        if (message.type === "shutdown") {
          instance.emit("message", {
            type: "shutdown_complete",
            requestId: message.requestId,
            ok: true,
            reason: message.reason,
            workerVersion: STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION,
            sensitiveBytesZeroed: true,
            trainingTruth: false,
          });
          instance.kill("SIGTERM");
        }
      });
    },
    createId: deterministicIds("cancel-egress"),
    handshakeTimeoutMs: 100,
    shutdownGraceMs: 20,
  });
  const bytes = syntheticBuffer();
  const attached = await port.attachCredential({
    attachmentId: "slice-156-cancel-child",
    providerProfile,
    credentialBytes: bytes,
  });
  const controller = new AbortController();
  const operation = port.complete({
    workerRef: attached.workerRef,
    providerRequest: providerRequest(),
    signal: controller.signal,
  });
  setTimeout(() => controller.abort(), 5);
  await assert.rejects(operation, (error) => {
    assert.equal(error.code, "PROVIDER_ABORTED");
    assert.equal(error.safeReceipt.requestMayHaveBeenSent, true);
    return true;
  });
  await port.close();
});

await check("unexpected_actual_child_exit_is_observable_and_never_restarted", async () => {
  const exits = [];
  const providerProfile = profile();
  const port = actualPort(providerProfile, {
    idPrefix: "crash-egress",
    onWorkerExit(event) { exits.push(event); },
  });
  const { attached } = await attachActual(port, providerProfile,
    "slice-156-attachment-crash");
  const before = port.readWorkerState({ workerRef: attached.workerRef });
  process.kill(before.worker.processId, "SIGKILL");
  await waitFor(() => exits.length === 1, "Provider Worker crash not observed");
  const after = port.readWorkerState({ workerRef: attached.workerRef });
  assert.equal(after.worker.exitReason, "unexpected_sigkill");
  assert.equal(after.worker.automaticRestarted, false);
  await port.close();
});

function controlFixture(port, providerProfile) {
  const binding = {
    sessionBindingHash: "a".repeat(64),
    principalScopeHash: "b".repeat(64),
  };
  const policyBody = {
    schemaVersion: "starcraft_tmg_provider_budget_policy_v1",
    maxTotalUnits: 1000,
    maxTurns: 4,
    maxInputUnitsPerTurn: 200,
    maxOutputUnitsPerTurn: 100,
    timeoutMs: 1000,
    currency: "provider_units",
    automaticRetryAllowed: false,
  };
  const policy = { ...policyBody, policyHash: hashStarcraftTmgContract(policyBody) };
  return createStarcraftTmgSecureProviderAttachmentControlV1({
    sessionLifecycle: {
      async readSession() { return { ok: true, session: {
        lifecycleState: "active", binding, connection: { epoch: 1 },
      } }; },
    },
    providerSupervisor: {
      async readState() { return { ok: true, state: {
        sessionBindingHash: binding.sessionBindingHash,
        connectionEpoch: 1,
        budget: { policy, remainingUnits: 1000 },
      } }; },
    },
    providerProfileRegistry: {
      async resolve() { return { ok: true, providerProfile }; },
    },
    credentialAttachmentPort: port,
    createId: () => "slice-156-control-attachment",
    createNonce: () => Buffer.alloc(32, 8).toString("base64url"),
    now: () => "2026-09-04T01:00:00.000Z",
  });
}

await check("slice_154_consent_composes_with_the_provider_egress_child_port", async () => {
  const providerProfile = profile();
  const port = actualPort(providerProfile, { idPrefix: "control-egress" });
  const control = controlFixture(port, providerProfile);
  const intent = {
    roomId: "slice-156-control-room",
    sessionId: "slice-156-control-session",
    expectedConnectionEpoch: 1,
    providerProfileRef: ref(providerProfile),
    disclosureNoticeVersion: STARCRAFT_TMG_PROVIDER_DISCLOSURE_NOTICE_VERSION,
    consentAccepted: true,
  };
  const prepared = await control.prepareAttachment(intent, {});
  const bytes = syntheticBuffer();
  const attached = await control.attachCredentialBytes({
    roomId: intent.roomId,
    sessionId: intent.sessionId,
    expectedConnectionEpoch: 1,
    attachmentId: prepared.attachment.attachmentId,
    ingressNonce: prepared.ingress.nonce,
    credentialBytes: bytes,
  }, {});
  actualChildren += 1;
  assert.equal(attached.ok, true);
  assert.equal(allZero(bytes), true);
  const detached = await control.detachAttachment({
    roomId: intent.roomId,
    sessionId: intent.sessionId,
    expectedConnectionEpoch: 1,
    attachmentId: prepared.attachment.attachmentId,
  }, {});
  assert.equal(detached.ok, true);
  await control.close();
  await port.close();
});

await check("actual_child_import_graph_contains_provider_transport_but_no_game_agent_or_dsh", async () => {
  const [child, transport, egressContract] = await Promise.all([
    readFile(path.join(ROOT,
      "packages/secure-provider-runtime/provider-egress-worker-child-v1.mjs"), "utf8"),
    readFile(path.join(ROOT,
      "packages/secure-provider-runtime/provider-egress-transport-v1.mjs"), "utf8"),
    readFile(path.join(ROOT,
      "packages/secure-provider-runtime/provider-egress-contract-v1.mjs"), "utf8"),
  ]);
  const specifiers = (source) => [...source.matchAll(
    /(?:from\s+|import\s*)["']([^"']+)["']/gu)].map((match) => match[1]);
  assert.deepEqual(specifiers(child).sort(), [
    "./provider-egress-contract-v1.mjs",
    "./provider-egress-transport-v1.mjs",
  ]);
  const graphImports = [...specifiers(transport), ...specifiers(egressContract)];
  for (const forbidden of [
    "rules-service", "room-runtime", "role-context-runtime", "skill-runtime",
    "memory-store", "deepseek", "dsh", "transition-v1",
  ]) assert(!graphImports.some((entry) => entry.toLowerCase().includes(forbidden)),
    forbidden);
  assert(child.includes("credentialBytes.fill(0)"));
  assert(child.includes("inFlight?.controller.abort()"));
});

await check("safe_sources_contract_and_report_never_retain_the_synthetic_value", async () => {
  const paths = [
    "packages/secure-provider-runtime/provider-egress-contract-v1.mjs",
    "packages/secure-provider-runtime/provider-profile-registry-v1.mjs",
    "packages/secure-provider-runtime/provider-egress-transport-v1.mjs",
    "packages/secure-provider-runtime/provider-egress-worker-child-v1.mjs",
    "packages/secure-provider-runtime/provider-egress-worker-port-v1.mjs",
  ];
  const reconstructed = Buffer.from(SYNTHETIC_BYTES).toString("utf8");
  for (const pathname of paths) {
    const source = await readFile(path.join(ROOT, pathname), "utf8");
    assert(!source.includes(reconstructed), pathname);
    assert(!source.includes("credentialHash"), pathname);
  }
  assert(!JSON.stringify(contract).includes(reconstructed));
});

await check("run_truth_records_only_injected_https_and_no_live_provider_or_training", () => {
  assert(actualChildren >= 4, `expected at least four actual children, got ${actualChildren}`);
  assert(injectedHttpsRequests >= 10,
    `expected injected HTTPS coverage, got ${injectedHttpsRequests}`);
  assert.deepEqual(contract.runTruth, {
    sourceRefreshPerformed: false,
    systemDnsProbePerformed: false,
    injectedDnsOnly: true,
    injectedHttpsOnly: true,
    providerCalled: false,
    userCredentialAccepted: false,
    syntheticCredentialExercised: true,
    actualCredentialChildSpawned: true,
    networkRequestMadeByActualChild: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
    productionReady: false,
  });
  assert.equal(contract.ownership.workerMaySelectConfirmOrApply, false);
  assert.equal(contract.harnessEvidence.memoryTraceEvidence.writes, 0);
});

assert.equal(checks.length, contract.acceptance.fixedAssertions,
  "Slice 156 fixed assertion denominator changed");

const reportBody = {
  schemaVersion:
    "starcraft_tmg_ticket_16_slice_156_provider_egress_allowlist_verification_v1",
  generatedAt: "2026-09-04T01:00:00.000Z",
  ticket: 16,
  slice: 156,
  status: failures.length ? "failed" : "passed",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  contractHash: contract.contractHash,
  predecessorContractHash: contract.predecessorContractHash,
  actualChildren,
  injectedHttpsRequests,
  ticketProgress: failures.length ? "3/10" : "4/10",
  projectProgress: "14/22",
  remainingTicketSlices: failures.length ? 7 : 6,
  nextSlice: failures.length ? 156 : 157,
  liveCredentialNeededNow: false,
  liveCredentialRequiredAtSlice: 162,
  runTruth: contract.runTruth,
  harness: contract.harnessEvidence,
};
const report = {
  ...reportBody,
  reportHash: hashStarcraftTmgContract(reportBody),
};

await mkdir(REPORT_ROOT, { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(
  `Ticket 16 Slice 156 ${report.status} ${report.assertionsPassed}/${report.assertionsTotal}; `
  + `${report.ticketProgress}; actualChildren=${actualChildren}; injectedHttps=${injectedHttpsRequests}; `
  + `${report.reportHash}\n`,
);
if (failures.length) throw new Error(failures.join("\n"));
