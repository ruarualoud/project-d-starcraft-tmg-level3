#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_16_PROVIDER_PRODUCT_FLOW_V1 as contract } from
  "../content/provider/ticket-16-provider-product-flow-v1.mjs";
import { STARCRAFT_TMG_TICKET_16_DURABLE_PROVIDER_GATEWAY_V1 as predecessor } from
  "../content/provider/ticket-16-durable-provider-gateway-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE } from
  "../packages/client-domain/client-domain-v1.mjs";
import { createInMemoryStarcraftTmgLifecycleAdapter } from
  "../packages/client-domain/lifecycle-adapters-v1.mjs";
import {
  createStarcraftTmgSecureProviderSessionClientV1,
} from "../packages/client-domain/secure-provider-session-client-v1.mjs";
import {
  createHttpStarcraftTmgSecureProviderClientTransportV1,
  StarcraftTmgSecureProviderClientTransportError,
} from "../packages/client-domain/secure-provider-transport-adapters-v1.mjs";
import {
  createStarcraftTmgBattleLabRuntime,
  dispatchStarcraftTmgTrustedBattleLabProviderV1,
  readStarcraftTmgTrustedBattleLabProviderV1,
} from "../apps/starcraft-tmg-battle-lab/battle-lab-runtime-v1.mjs";
import { containsStarcraftTmgOnlineCredentialMaterialV1 } from
  "../packages/online-agent-session/portable-credential-material-v1.mjs";
import { createStarcraftTmgSecureProviderHttpControlV1 } from
  "../packages/secure-provider-runtime/http-control-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_ROOT = path.join(ROOT,
  "build/ticket-16-slice-160-provider-product-flow-v1");
const REPORT_PATH = path.join(REPORT_ROOT, "report.json");
const GENERATED_AT = "2026-09-04T09:00:00.000Z";
const PROFILE_REF = Object.freeze({
  id: "starcraft-tmg.direct-provider.slice-160.v1",
  version: "1.0.0",
  hash: "a".repeat(64),
});
const PUBLIC_PROFILE = Object.freeze({
  profileRef: PROFILE_REF,
  providerId: "openai-compatible-direct",
  model: "gpt-test-model",
  maxContextUnits: 65_536,
  maxOutputUnits: 256,
  timeoutMs: 5_000,
  trainingTruth: false,
});
const SYNTHETIC_SECRET = "sk-slice160-synthetic-credential-only";
const checks = [];
const failures = [];

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

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function allZero(bytes) {
  return [...bytes].every((byte) => byte === 0);
}

function makeSession(epoch = 1) {
  return Object.freeze({
    roomId: "slice-160-room",
    sessionId: "slice-160-agent-session",
    sessionBindingHash: "b".repeat(64),
    principalScopeHash: "c".repeat(64),
    connectionEpoch: epoch,
    lifecycleState: "active",
    trainingTruth: false,
  });
}

function makeAttachment(state, detachReason = null) {
  return {
    schemaVersion: "starcraft_tmg_secure_provider_attachment_control_v1.attachment",
    attachmentId: "attachment-slice-160",
    roomId: "slice-160-room",
    sessionId: "slice-160-agent-session",
    sessionBindingHash: "b".repeat(64),
    state,
    provider: {
      profileRef: clone(PROFILE_REF),
      providerId: PUBLIC_PROFILE.providerId,
      requestedModel: PUBLIC_PROFILE.model,
    },
    budget: {
      policyHash: "d".repeat(64),
      maxTotalUnits: 4_096,
      maxTurns: 8,
      maxInputUnitsPerTurn: 512,
      maxOutputUnitsPerTurn: 256,
      remainingUnits: 4_096,
      currency: "provider_units",
      automaticRetryAllowed: false,
    },
    disclosureNoticeVersion: "starcraft_tmg_provider_data_disclosure_v1",
    consentReceiptHash: "e".repeat(64),
    consentedAt: GENERATED_AT,
    ingressExpiresAt: "2026-09-04T09:02:00.000Z",
    attachmentExpiresAt: "2026-09-04T17:00:00.000Z",
    attachedAt: state === "attached" ? "2026-09-04T09:00:01.000Z" : null,
    detachedAt: state === "detached" ? "2026-09-04T09:00:02.000Z" : null,
    detachReason,
    retryRequiresNewConsent: true,
    automaticRetryAllowed: false,
    sensitiveMaterialPersisted: false,
    productionReady: false,
    trainingTruth: false,
    projectionHash: "f".repeat(64),
  };
}

const server = {
  state: "missing",
  prepareCalls: 0,
  attachCalls: 0,
  readCalls: 0,
  detachCalls: 0,
  syntheticSecretObserved: false,
  failAttach: false,
};
const serverRawBodies = [];
const requestMetadata = [];
const controlPlane = {
  metadata() {
    return { maxCredentialBytes: 256 };
  },
  async prepareAttachment(input, context) {
    server.prepareCalls += 1;
    assert.equal(context.principalSessionRef, "principal-session-slice-160");
    assert.deepEqual(input.providerProfileRef, PROFILE_REF);
    assert.equal(input.consentAccepted, true);
    server.state = "awaiting_ingress";
    return {
      ok: true,
      attachment: makeAttachment("awaiting_ingress"),
      consentReceipt: { receiptHash: "e".repeat(64) },
      ingress: {
        nonce: "n".repeat(43),
        expiresAt: "2026-09-04T09:02:00.000Z",
        mediaType: "application/octet-stream",
        minBytes: 8,
        maxBytes: 256,
        singleUse: true,
      },
      trainingTruth: false,
    };
  },
  async attachCredentialBytes(input) {
    server.attachCalls += 1;
    server.syntheticSecretObserved = Buffer.compare(
      Buffer.from(input.credentialBytes), Buffer.from(SYNTHETIC_SECRET),
    ) === 0;
    if (server.failAttach) {
      server.state = "attach_failed";
      return {
        ok: false,
        reason: "credential_worker_attach_failed",
        attachment: makeAttachment("attach_failed"),
      };
    }
    server.state = "attached";
    return {
      ok: true,
      attachment: makeAttachment("attached"),
      receipt: { receiptHash: "1".repeat(64) },
      trainingTruth: false,
    };
  },
  async readAttachment() {
    server.readCalls += 1;
    return { ok: true, attachment: makeAttachment(server.state), trainingTruth: false };
  },
  async detachAttachment() {
    server.detachCalls += 1;
    server.state = "detached";
    return {
      ok: true,
      attachment: makeAttachment("detached", "explicit_user_detach"),
      receipt: { receiptHash: "2".repeat(64) },
      trainingTruth: false,
    };
  },
};
const http = createStarcraftTmgSecureProviderHttpControlV1({
  controlPlane,
  providerProfileRegistry: {
    listPublic() {
      return { ok: true, profiles: [PUBLIC_PROFILE], trainingTruth: false };
    },
  },
  principalAuthenticator: {
    async authenticate() {
      return {
        ok: true,
        principalSessionRef: "principal-session-slice-160",
        authenticationScopeHash: "3".repeat(64),
      };
    },
  },
});

async function fakeFetch(rawUrl, init = {}) {
  const url = new URL(rawUrl, "https://slice-160.invalid");
  const headers = Object.fromEntries(Object.entries(init.headers || {})
    .map(([name, value]) => [name.toLowerCase(), value]));
  const record = {
    method: init.method,
    pathname: url.pathname,
    queryFieldNames: [...url.searchParams.keys()].sort(),
    headerNames: Object.keys(headers).sort(),
    contentType: headers["content-type"] || null,
    credentials: init.credentials,
    cache: init.cache,
    bodyKind: init.body instanceof Uint8Array ? "binary"
      : typeof init.body === "string" ? "json" : "none",
    bodyBytes: init.body instanceof Uint8Array ? init.body.byteLength
      : typeof init.body === "string" ? Buffer.byteLength(init.body) : 0,
  };
  requestMetadata.push(record);
  let body;
  let rawBody;
  if (typeof init.body === "string") body = JSON.parse(init.body);
  if (init.body instanceof Uint8Array) {
    rawBody = Buffer.from(init.body);
    serverRawBodies.push(rawBody);
  }
  const result = await http.handle({
    method: init.method,
    pathname: url.pathname,
    query: url.searchParams,
    headers,
    ...(body ? { body, bodyBytes: Buffer.byteLength(init.body) } : {}),
    ...(rawBody ? { rawBody, bodyBytes: rawBody.byteLength } : {}),
    secureTransport: true,
    remoteAddress: "203.0.113.10",
  });
  return {
    status: result.status,
    async text() { return JSON.stringify(result.response); },
  };
}

let currentSession = null;
const sessionListeners = new Set();
const sessionSource = {
  read: () => currentSession,
  subscribe(listener) {
    sessionListeners.add(listener);
    return () => sessionListeners.delete(listener);
  },
};
function setSession(value) {
  currentSession = value;
  for (const listener of sessionListeners) listener();
}

const transport = createHttpStarcraftTmgSecureProviderClientTransportV1({
  baseUrl: "https://slice-160.invalid",
  fetchImpl: fakeFetch,
});
const client = createStarcraftTmgSecureProviderSessionClientV1({
  transport,
  sessionSource,
});

await check("slice_contract_is_hash_sealed_and_chained_to_slice_159", () => {
  const { contractHash, ...body } = contract;
  assert.equal(contractHash, hashStarcraftTmgContract(body));
  assert.equal(contract.predecessorContractHash, predecessor.contractHash);
  assert.equal(contract.acceptance.fixedAssertions, 37);
});

await check("server_metadata_exposes_only_safe_immutable_profile_fields", () => {
  const metadata = http.metadata();
  assert.deepEqual(metadata.profiles, [PUBLIC_PROFILE]);
  const serialized = JSON.stringify(metadata);
  assert(!/baseUrl|completionPath|headers|credential|apiKey/iu.test(serialized));
});

await check("client_initial_projection_is_stable_and_requires_an_agent_session", () => {
  assert.strictEqual(client.read(), client.read());
  assert.equal(client.read().status, "session_required");
  assert.equal(client.read().sessionBound, false);
});

await check("profile_catalogue_loads_without_creating_provider_authority", async () => {
  const result = await client.dispatch({ type: "load_profiles" });
  assert.equal(result.ok, true);
  assert.deepEqual(result.view.profiles, [PUBLIC_PROFILE]);
  assert.equal(result.view.status, "session_required");
  assert.equal(result.view.liveProviderCalled, false);
});

await check("active_private_agent_session_enables_prepare_without_public_locator", () => {
  setSession(makeSession());
  const view = client.read();
  assert.equal(view.status, "ready");
  assert.equal(view.capabilities.prepare, true);
  assert(!JSON.stringify(view).includes("slice-160-agent-session"));
});

await check("prepare_requires_explicit_consent_before_http", async () => {
  const before = server.prepareCalls;
  const result = await client.dispatch({
    type: "prepare_attachment",
    providerProfileRef: PROFILE_REF,
    consentAccepted: false,
  });
  assert.equal(result.ok, false);
  assert.equal(result.rejection.code, "PROVIDER_EXPLICIT_CONSENT_REQUIRED");
  assert.equal(server.prepareCalls, before);
});

await check("prepare_rejects_an_unlisted_profile_before_http", async () => {
  const before = server.prepareCalls;
  const result = await client.dispatch({
    type: "prepare_attachment",
    providerProfileRef: { ...PROFILE_REF, hash: "9".repeat(64) },
    consentAccepted: true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.rejection.code, "PROVIDER_PROFILE_NOT_LISTED");
  assert.equal(server.prepareCalls, before);
});

await check("prepare_uses_cookie_auth_no_store_and_exact_json_consent", async () => {
  const result = await client.dispatch({
    type: "prepare_attachment",
    providerProfileRef: PROFILE_REF,
    consentAccepted: true,
  });
  assert.equal(result.ok, true);
  const request = requestMetadata.find((entry) => entry.pathname.endsWith("/attachments/intents"));
  assert.equal(request.credentials, "include");
  assert.equal(request.cache, "no-store");
  assert.equal(request.contentType, "application/json");
  assert(!request.headerNames.includes("authorization"));
});

await check("awaiting_secret_projection_excludes_nonce_attachment_and_session_ids", () => {
  const view = client.read();
  assert.equal(view.status, "awaiting_secret");
  assert.equal(view.ingress.singleUse, true);
  const serialized = JSON.stringify(view);
  for (const forbidden of ["n".repeat(43), "attachment-slice-160",
    "slice-160-agent-session"]) assert(!serialized.includes(forbidden));
});

await check("disclosure_truthfully_distinguishes_memory_from_persistence", () => {
  const disclosure = client.read().disclosure;
  assert.equal(disclosure.browserPersistence, false);
  assert.equal(disclosure.applicationInputClearedBeforeNetworkAwait, true);
  assert.equal(disclosure.mutableRequestBytesZeroed, true);
  assert.equal(disclosure.serverPersistence, false);
  assert.equal(disclosure.isolatedWorkerSessionMemory, true);
});

await check("budget_is_labelled_as_consent_time_envelope_not_live_spend", () => {
  const budget = client.read().attachment.budgetEnvelope;
  assert.equal(budget.maxTotalUnits, 4_096);
  assert.equal(budget.accountingAuthority, "durable_server_store");
  assert.equal(budget.projectionMeaning,
    "consent_time_maximum_envelope_not_live_spend");
  assert(!Object.hasOwn(budget, "remainingUnits"));
});

let successfulCredentialBytes;
await check("secret_ingress_uses_binary_media_nonce_cookie_and_no_authorization", async () => {
  successfulCredentialBytes = new TextEncoder().encode(SYNTHETIC_SECRET);
  const result = await client.dispatch({
    type: "attach_secret", credentialBytes: successfulCredentialBytes,
  });
  assert.equal(result.ok, true);
  assert.equal(server.syntheticSecretObserved, true);
  const request = requestMetadata.find((entry) => entry.bodyKind === "binary");
  assert.equal(request.contentType, "application/octet-stream");
  assert.equal(request.credentials, "include");
  assert.equal(request.cache, "no-store");
  assert(request.headerNames.includes("x-project-d-provider-ingress-nonce"));
  assert(!request.headerNames.includes("authorization"));
});

await check("caller_transport_and_server_secret_buffers_are_zeroed", () => {
  assert(allZero(successfulCredentialBytes));
  assert(serverRawBodies.length >= 1);
  assert(serverRawBodies.every(allZero));
});

await check("attached_projection_contains_only_safe_provider_state", () => {
  const view = client.read();
  assert.equal(view.status, "attached");
  assert.equal(view.attachment.provider.requestedModel, PUBLIC_PROFILE.model);
  assert.equal(view.publicProjectionContainsSensitiveInput, false);
  assert.equal(containsStarcraftTmgOnlineCredentialMaterialV1(view), false);
});

await check("refresh_reads_the_current_server_attachment_without_secret", async () => {
  const before = server.readCalls;
  const result = await client.dispatch({ type: "refresh_attachment" });
  assert.equal(result.ok, true);
  assert.equal(server.readCalls, before + 1);
  assert.equal(result.view.status, "attached");
});

await check("explicit_detach_projects_destroyed_credential_state", async () => {
  const result = await client.dispatch({ type: "detach_attachment" });
  assert.equal(result.ok, true);
  assert.equal(server.detachCalls, 1);
  assert.equal(result.view.attachment.state, "detached");
  assert.equal(result.view.attachment.detachReason, "explicit_user_detach");
  assert.equal(result.view.capabilities.detach, false);
});

await check("agent_session_epoch_change_clears_local_attachment_projection", async () => {
  await client.dispatch({
    type: "prepare_attachment", providerProfileRef: PROFILE_REF, consentAccepted: true,
  });
  const bytes = new TextEncoder().encode(SYNTHETIC_SECRET);
  await client.dispatch({ type: "attach_secret", credentialBytes: bytes });
  assert(client.read().attachment);
  setSession(makeSession(2));
  assert.equal(client.read().attachment, null);
  assert.equal(client.read().status, "ready");
});

let failedCredentialBytes;
await check("worker_attach_failure_clears_bytes_and_shows_code_only_error", async () => {
  server.failAttach = true;
  await client.dispatch({
    type: "prepare_attachment", providerProfileRef: PROFILE_REF, consentAccepted: true,
  });
  failedCredentialBytes = new TextEncoder().encode(SYNTHETIC_SECRET);
  const result = await client.dispatch({
    type: "attach_secret", credentialBytes: failedCredentialBytes,
  });
  assert.equal(result.ok, false);
  assert.equal(result.view.status, "error");
  assert.equal(result.rejection.code, "credential_worker_attach_failed");
  assert(allZero(failedCredentialBytes));
  assert(!JSON.stringify(result).includes(SYNTHETIC_SECRET));
  server.failAttach = false;
});

await check("network_failure_zeroes_the_binary_request_and_never_retries", async () => {
  let calls = 0;
  const failing = createHttpStarcraftTmgSecureProviderClientTransportV1({
    baseUrl: "https://slice-160.invalid",
    fetchImpl: async () => { calls += 1; throw new Error("synthetic network failure"); },
  });
  const bytes = new TextEncoder().encode(SYNTHETIC_SECRET);
  await assert.rejects(() => failing.execute({
    operation: "attach",
    roomId: "slice-160-room",
    sessionId: "slice-160-agent-session",
    expectedConnectionEpoch: 2,
    attachmentId: "attachment-slice-160",
    ingressNonce: "n".repeat(43),
    credentialBytes: bytes,
  }), (error) => error instanceof StarcraftTmgSecureProviderClientTransportError
    && error.code === "PROVIDER_CLIENT_NETWORK_UNAVAILABLE");
  assert.equal(calls, 1);
  assert(allZero(bytes));
});

await check("non_loopback_plain_http_is_rejected_before_fetch", () => {
  assert.throws(() => createHttpStarcraftTmgSecureProviderClientTransportV1({
    baseUrl: "http://provider.example",
    fetchImpl: fakeFetch,
  }), /HTTPS/u);
});

await check("credential_material_is_rejected_outside_binary_ingress", async () => {
  await assert.rejects(() => transport.execute({
    operation: "prepare",
    roomId: "slice-160-room",
    sessionId: "slice-160-agent-session",
    expectedConnectionEpoch: 2,
    providerProfileRef: PROFILE_REF,
    disclosureNoticeVersion: "starcraft_tmg_provider_data_disclosure_v1",
    consentAccepted: true,
    apiKey: SYNTHETIC_SECRET,
  }), (error) => error.code === "PROVIDER_CLIENT_SECRET_OUTSIDE_BINARY_INGRESS");
});

await check("credential_echo_in_http_response_is_rejected_as_unsafe", async () => {
  const unsafe = createHttpStarcraftTmgSecureProviderClientTransportV1({
    baseUrl: "https://slice-160.invalid",
    fetchImpl: async () => ({
      async text() {
        return JSON.stringify({
          schemaVersion: "starcraft_tmg_secure_provider_http_v1",
          result: { ok: true, apiKey: SYNTHETIC_SECRET },
        });
      },
    }),
  });
  await assert.rejects(() => unsafe.execute({ operation: "metadata" }),
    (error) => error.code === "PROVIDER_CLIENT_RESPONSE_UNSAFE");
});

await check("client_intents_reject_extra_endpoint_model_header_or_budget_authority", async () => {
  for (const field of ["baseUrl", "model", "headers", "budget"]) {
    const result = await client.dispatch({ type: "load_profiles", [field]: "forbidden" });
    assert.equal(result.ok, false);
  }
});

await check("all_public_client_results_exclude_synthetic_secret_and_private_locators", () => {
  const serialized = JSON.stringify(client.read());
  assert(!serialized.includes(SYNTHETIC_SECRET));
  assert(!serialized.includes("attachment-slice-160"));
  assert(!serialized.includes("slice-160-agent-session"));
  assert(!serialized.includes("n".repeat(43)));
});

const sourcePaths = {
  client: "packages/client-domain/secure-provider-session-client-v1.mjs",
  transport: "packages/client-domain/secure-provider-transport-adapters-v1.mjs",
  expoRuntime: "apps/starcraft-tmg-expo/lib/level3/client-domain-mount-runtime.mjs",
  expoProvider: "apps/starcraft-tmg-expo/lib/level3/client-domain-provider.tsx",
  expoPanel: "apps/starcraft-tmg-expo/components/character/tactical-adjutant-panel.tsx",
  battleRuntime: "apps/starcraft-tmg-battle-lab/battle-lab-runtime-v1.mjs",
  battleApp: "apps/starcraft-tmg-battle-lab/app.mjs",
  battleHtml: "apps/starcraft-tmg-battle-lab/index.html",
};
const sources = Object.fromEntries(await Promise.all(Object.entries(sourcePaths)
  .map(async ([name, relative]) => [name,
    await readFile(path.join(ROOT, relative), "utf8")])));

await check("new_client_transport_and_ui_sources_use_no_browser_persistence_or_logging", () => {
  const current = Object.values(sources).join("\n");
  assert(!/localStorage|sessionStorage|indexedDB/gu.test(current));
  assert(!/console\.(?:log|info|warn|error|debug)/gu.test(current));
});

await check("expo_web_mounts_provider_lifecycle_separately_from_game_dispatch", () => {
  assert(sources.expoRuntime.includes("secureProviderSession"));
  assert(sources.expoRuntime.includes("readStarcraftTmgTrustedRoleAgentSessionV1"));
  assert(sources.expoProvider.includes("enableSecureProviderSession: web"));
  assert(!sources.expoRuntime.includes('type: "attach_secret"'));
});

await check("battle_lab_runtime_keeps_exact_four_public_operations", async () => {
  const lab = createStarcraftTmgBattleLabRuntime({
    transport: { execute: async () => ({ ok: false, reason: "EXPECTED" }) },
    lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
    enableRoleAgentSession: true,
    enableSecureProviderSession: true,
    agentTransport: { execute: async () => ({ ok: false, reason: "EXPECTED" }) },
    secureProviderTransport: {
      execute: async ({ operation }) => operation === "metadata"
        ? { ok: true, profiles: [PUBLIC_PROFILE] }
        : { ok: false, reason: "EXPECTED" },
    },
  });
  assert.deepEqual(Object.keys(lab).sort(), [...STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE].sort());
  assert(readStarcraftTmgTrustedBattleLabProviderV1(lab));
  assert.equal((await dispatchStarcraftTmgTrustedBattleLabProviderV1(
    lab, { type: "load_profiles" },
  )).ok, true);
  assert.equal(readStarcraftTmgTrustedBattleLabProviderV1(lab).profiles.length, 1);
  assert(!Object.keys(lab).includes("secureProviderSession"));
});

await check("battle_lab_password_input_is_cleared_before_await_and_bytes_are_zeroed", () => {
  assert(sources.battleHtml.includes('data-provider-secret type="password"'));
  assert(sources.battleHtml.includes('autocomplete="off"'));
  const read = sources.battleApp.indexOf('const draft = el["provider-secret"].value');
  const clear = sources.battleApp.indexOf('el["provider-secret"].value = ""', read);
  const awaitCall = sources.battleApp.indexOf("await invokeProvider", read);
  const zero = sources.battleApp.indexOf("credentialBytes.fill(0)", awaitCall);
  assert(read >= 0 && clear > read && awaitCall > clear && zero > awaitCall);
});

await check("expo_password_input_is_secure_and_cleared_before_await", () => {
  assert(sources.expoPanel.includes("secureTextEntry"));
  assert(sources.expoPanel.includes('autoComplete="off"'));
  const encode = sources.expoPanel.indexOf("new TextEncoder().encode(providerKeyDraft)");
  const clear = sources.expoPanel.indexOf('setProviderKeyDraft("")', encode);
  const awaitCall = sources.expoPanel.indexOf("await runProviderIntent", encode);
  const zero = sources.expoPanel.indexOf("credentialBytes.fill(0)", awaitCall);
  assert(encode >= 0 && clear > encode && awaitCall > clear && zero > awaitCall);
});

await check("both_surfaces_show_disclosure_consent_attached_error_and_detach_controls", () => {
  for (const token of ["Provider receives", "no automatic retry", "consent",
    "awaiting_secret", "attached", "rejection", "detach_attachment"]) {
    assert(`${sources.expoPanel}\n${sources.battleApp}\n${sources.battleHtml}`
      .toLowerCase().includes(token.toLowerCase()), `missing product token ${token}`);
  }
});

await check("surface_budget_copy_does_not_claim_the_envelope_is_live_spend", () => {
  assert(sources.expoPanel.includes("非实时消费"));
  assert(sources.expoPanel.includes("exact ledger stays server-side"));
  assert(sources.battleApp.includes("not live spend; exact ledger stays server-side"));
});

await check("surface_controls_never_accept_arbitrary_endpoint_header_model_or_budget", () => {
  for (const forbidden of ["provider-base-url", "provider-header", "provider-model-input",
    "provider-budget-input"]) {
    assert(!sources.battleHtml.includes(forbidden));
    assert(!sources.expoPanel.includes(forbidden));
  }
  assert(sources.battleHtml.includes("Server-approved Provider / model"));
  assert(sources.expoPanel.includes("Server-approved Provider / model"));
});

await check("product_flow_retains_no_live_provider_skill_dsh_or_training_claim", () => {
  assert.equal(contract.runTruth.providerCalled, false);
  assert.equal(contract.runTruth.userCredentialAccepted, false);
  assert.equal(contract.runTruth.skillGenerated, false);
  assert.equal(contract.runTruth.dshRun, false);
  assert.equal(contract.runTruth.muzeroDataGenerated, false);
  assert.equal(contract.runTruth.selfPlayRun, false);
  assert.equal(contract.runTruth.trainingTruth, false);
  assert.equal(contract.harnessEvidence.trainingTraceCandidates, 0);
});

await check("http_request_observations_store_metadata_only_and_never_secret_content", () => {
  assert(requestMetadata.length >= 6);
  assert(requestMetadata.every((entry) => !Object.hasOwn(entry, "body")));
  assert(!JSON.stringify(requestMetadata).includes(SYNTHETIC_SECRET));
});

await check("credential_ingress_is_single_use_and_not_reusable_after_terminal_state", async () => {
  const bytes = new TextEncoder().encode(SYNTHETIC_SECRET);
  const before = server.attachCalls;
  const result = await client.dispatch({ type: "attach_secret", credentialBytes: bytes });
  assert.equal(result.ok, false);
  assert.equal(server.attachCalls, before);
  assert(allZero(bytes));
});

await check("provider_client_projection_is_non_authoritative_and_non_training", () => {
  const view = client.read();
  assert.equal(view.trainingTruth, false);
  assert.equal(view.liveProviderCalled, false);
  assert.equal(view.automaticRetryAllowed, false);
  assert.equal(view.cachePersisted, false);
  assert.equal(view.publicProjectionContainsSensitiveInput, false);
});

await check("slice_keeps_native_device_acceptance_explicitly_deferred", () => {
  assert.equal(contract.productFlow.nativeStatus,
    "deferred_with_ticket_14_physical_device_acceptance");
  assert(sources.expoProvider.includes("enableSecureProviderSession: web"));
});

assert.equal(checks.length, contract.acceptance.fixedAssertions,
  "fixed assertion denominator drifted");

const reportBody = {
  schemaVersion: "starcraft_tmg_ticket_16_provider_product_flow_report_v1",
  generatedAt: GENERATED_AT,
  ticket: 16,
  slice: 160,
  status: failures.length ? "failed" : "passed",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  contractHash: contract.contractHash,
  httpRequestCount: requestMetadata.length,
  syntheticSecretAcceptedByIsolatedControlFixture: server.syntheticSecretObserved,
  callerAndServerBufferZeroingVerified: serverRawBodies.every(allZero),
  publicClientInterface: ["read", "dispatch", "subscribe"],
  sharedClientDomainInterface: [...STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE],
  sourceRefreshPerformed: false,
  liveProviderCalled: false,
  userCredentialAccepted: false,
  skillGenerated: false,
  dshRun: false,
  muzeroDataGenerated: false,
  selfPlayRun: false,
  trainingTruth: false,
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
  console.log(`Ticket 16 Slice 160 passed ${checks.length}/${checks.length}; 8/10; httpRequests=${requestMetadata.length}; ${report.reportHash}`);
}
