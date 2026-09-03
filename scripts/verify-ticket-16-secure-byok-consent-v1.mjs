#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_16_SECURE_BYOK_CONSENT_V1 as contract } from
  "../content/provider/ticket-16-secure-byok-consent-v1.mjs";
import { STARCRAFT_TMG_TICKET_16_SECURE_BYOK_PROVIDER_BOUNDARY_V1 as boundary } from
  "../content/provider/ticket-16-secure-byok-provider-boundary-v1.mjs";
import { createKerriganPrimalProductBundleV1 } from
  "../content/characters/kerrigan-primal-v1.mjs";
import {
  createProviderProfile,
} from "../packages/character-agent/contracts-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  createStarcraftTmgOnlineAgentSessionLifecycleV1,
  createStarcraftTmgOnlinePrincipalBindingV1,
} from "../packages/online-agent-session/session-lifecycle-v1.mjs";
import { createStarcraftTmgProviderGatewaySupervisorV1 } from
  "../packages/online-agent-session/provider-gateway-supervisor-v1.mjs";
import { containsStarcraftTmgOnlineCredentialMaterialV1 } from
  "../packages/online-agent-session/portable-credential-material-v1.mjs";
import {
  createStarcraftTmgSecureProviderAttachmentControlV1,
  STARCRAFT_TMG_PROVIDER_DISCLOSURE_NOTICE_VERSION,
} from "../packages/secure-provider-runtime/credential-attachment-control-v1.mjs";
import {
  createStarcraftTmgSecureProviderHttpControlV1,
  STARCRAFT_TMG_SECURE_PROVIDER_API_PREFIX,
} from "../packages/secure-provider-runtime/http-control-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_ROOT = path.join(ROOT,
  "build/ticket-16-slice-154-secure-byok-consent-v1");
const REPORT_PATH = path.join(REPORT_ROOT, "report.json");
const ROOM_ID = "slice-154-room";
const SYNTHETIC_BYTES = Object.freeze([
  0x73, 0x6b, 0x2d, 0x73, 0x6c, 0x69, 0x63, 0x65, 0x31, 0x35, 0x34,
  0x2d, 0x73, 0x79, 0x6e, 0x74, 0x68, 0x65, 0x74, 0x69, 0x63, 0x2d,
  0x6e, 0x65, 0x76, 0x65, 0x72, 0x2d, 0x6c, 0x69, 0x76, 0x65,
]);

const checks = [];
const failures = [];

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
  const { [field]: observed, ...unsigned } = value;
  assert.equal(observed, hashStarcraftTmgContract(unsigned));
}

function allZero(buffer) {
  return buffer.every((byte) => byte === 0);
}

function roomBinding() {
  return {
    schemaVersion: "starcraft_tmg_match_room_binding_v1",
    rulesVersion: "0.112.0-official-faq-v1-current",
    dataVersion: "official-onetime-snapshot-v1",
    matchBindingHash: "a".repeat(64),
    sourceSnapshotHash: "b".repeat(64),
    dataSnapshotHash: "c".repeat(64),
    rulesArtifactHash: "d".repeat(64),
    executorArtifactHash: "e".repeat(64),
    geometryArtifactHash: "f".repeat(64),
    actionSchemaHash: "1".repeat(64),
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

async function waitFor(predicate, message) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  assert.fail(message);
}

function syntheticBuffer() {
  return Buffer.from(SYNTHETIC_BYTES);
}

function safeSerialized(value) {
  const serialized = JSON.stringify(value);
  assert(!serialized.includes("slice154-synthetic-never-live"));
  assert.equal(containsStarcraftTmgOnlineCredentialMaterialV1(value), false);
  return serialized;
}

async function createFixture(options = {}) {
  const bundle = createKerriganPrimalProductBundleV1();
  const characterPackage = bundle.characterPackage;
  const selectionHash = hashStarcraftTmgContract({
    characterId: characterPackage.characterId,
    fixture: "ticket-16-slice-154",
  });
  const profile = options.profile || createProviderProfile({
    providerProfileId: "starcraft-tmg.direct-provider.slice-154.v1",
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
  });
  const profileRef = Object.freeze({
    id: profile.providerProfileId,
    version: profile.version,
    hash: profile.integrity.hash,
  });
  const principalBindings = new Map();
  function binding(scopeHash) {
    return createStarcraftTmgOnlinePrincipalBindingV1({
      roomId: ROOM_ID,
      principalScopeHash: scopeHash,
      seatKey: "player1",
      principalType: "human",
      principalRoleMode: "player",
      bindingRevision: 1,
      allowedAgentModes: ["tutor", "companion"],
      characterId: characterPackage.characterId,
      characterPackageHash: characterPackage.integrity.hash,
      characterSelectionHash: selectionHash,
      roomBinding: roomBinding(),
    });
  }
  principalBindings.set("principal-a", binding("2".repeat(64)));
  principalBindings.set("principal-b", binding("3".repeat(64)));
  let sessionSequence = 0;
  const lifecycle = createStarcraftTmgOnlineAgentSessionLifecycleV1({
    principalAuthority: {
      async resolve({ roomId, principalSessionRef }) {
        const candidate = principalBindings.get(principalSessionRef);
        return candidate?.roomId === roomId
          ? { ok: true, binding: candidate }
          : { ok: false, reason: "principal_not_authenticated" };
      },
    },
    characterCatalog: {
      async resolve(input) {
        return input.characterId === characterPackage.characterId
          && input.characterPackageHash === characterPackage.integrity.hash
          ? { ok: true, characterPackage }
          : { ok: false, reason: "character_not_found" };
      },
    },
    createId() {
      sessionSequence += 1;
      return `slice-154-session-${String(sessionSequence).padStart(3, "0")}`;
    },
    now: () => "2026-09-03T15:00:00.000Z",
  });
  const sessionResult = await lifecycle.createSession({
    roomId: ROOM_ID,
    mode: "tutor",
    characterId: characterPackage.characterId,
  }, { principalSessionRef: "principal-a" });
  assert.equal(sessionResult.ok, true);
  const session = sessionResult.session;
  const supervisor = createStarcraftTmgProviderGatewaySupervisorV1({
    sessionLifecycle: lifecycle,
    budgetPolicy: {
      maxTotalUnits: 2000,
      maxTurns: 8,
      maxInputUnitsPerTurn: 200,
      maxOutputUnitsPerTurn: 100,
      timeoutMs: 1000,
    },
  });
  let nowMs = Date.parse("2026-09-03T15:10:00.000Z");
  let attachmentSequence = 0;
  let nonceSequence = 0;
  const registryCalls = [];
  const attachCalls = [];
  const detachCalls = [];
  const port = options.port || {
    async attachCredential(input) {
      attachCalls.push({
        attachmentId: input.attachmentId,
        profileHash: input.providerProfile.integrity.hash,
        expectedBytes: Buffer.compare(input.credentialBytes,
          Buffer.from(SYNTHETIC_BYTES)) === 0,
        byteLength: input.credentialBytes.length,
      });
      return {
        ok: true,
        workerRef: `slice154-worker-${String(attachCalls.length).padStart(3, "0")}`,
      };
    },
    async detachCredential(input) {
      detachCalls.push({ ...input });
      return { ok: true };
    },
  };
  const control = createStarcraftTmgSecureProviderAttachmentControlV1({
    sessionLifecycle: lifecycle,
    providerSupervisor: supervisor,
    providerProfileRegistry: {
      async resolve(input) {
        registryCalls.push(input);
        if (typeof options.resolveProfile === "function") {
          return options.resolveProfile(input, profile);
        }
        return input.profileRef.id === profileRef.id
          && input.profileRef.version === profileRef.version
          && input.profileRef.hash === profileRef.hash
          ? { ok: true, providerProfile: profile }
          : { ok: false, reason: "not_found" };
      },
    },
    credentialAttachmentPort: port,
    now: () => new Date(nowMs).toISOString(),
    createId() {
      attachmentSequence += 1;
      return `slice-154-attachment-${String(attachmentSequence).padStart(3, "0")}`;
    },
    createNonce() {
      nonceSequence += 1;
      return Buffer.alloc(32, nonceSequence).toString("base64url");
    },
    nonceTtlMs: options.nonceTtlMs || 1000,
    attachmentTtlMs: options.attachmentTtlMs || 10000,
    maxAttachmentRecords: options.maxAttachmentRecords || 32,
    minCredentialBytes: 8,
    maxCredentialBytes: 128,
  });
  const authenticator = {
    async authenticate({ headers }) {
      const token = headers?.authorization || headers?.Authorization;
      if (token === "Bearer principal-a") {
        return {
          ok: true,
          principalSessionRef: "principal-a",
          authenticationScopeHash: "2".repeat(64),
        };
      }
      if (token === "Bearer principal-b") {
        return {
          ok: true,
          principalSessionRef: "principal-b",
          authenticationScopeHash: "3".repeat(64),
        };
      }
      return { ok: false, reason: "not_authenticated" };
    },
  };
  const http = createStarcraftTmgSecureProviderHttpControlV1({
    controlPlane: control,
    principalAuthenticator: authenticator,
    allowInsecureLoopbackDevelopment:
      options.allowInsecureLoopbackDevelopment === true,
    maxJsonBodyBytes: 4096,
    maxSecretBodyBytes: 128,
  });
  function consent(overrides = {}) {
    return {
      roomId: ROOM_ID,
      sessionId: session.sessionId,
      expectedConnectionEpoch: session.connection.epoch,
      providerProfileRef: profileRef,
      disclosureNoticeVersion:
        STARCRAFT_TMG_PROVIDER_DISCLOSURE_NOTICE_VERSION,
      consentAccepted: true,
      ...overrides,
    };
  }
  async function prepare(overrides = {}, requestOverrides = {}) {
    const body = consent(overrides);
    return http.handle({
      method: "POST",
      pathname: `${STARCRAFT_TMG_SECURE_PROVIDER_API_PREFIX}/attachments/intents`,
      headers: {
        authorization: "Bearer principal-a",
        "content-type": "application/json",
        ...(requestOverrides.headers || {}),
      },
      body,
      bodyBytes: Buffer.byteLength(JSON.stringify(body)),
      secureTransport: true,
      ...requestOverrides,
    });
  }
  async function attach(prepared, buffer = syntheticBuffer(), overrides = {}) {
    const attachmentId = prepared.response.result.attachment.attachmentId;
    const query = {
      roomId: ROOM_ID,
      sessionId: session.sessionId,
      expectedConnectionEpoch: session.connection.epoch,
      ...(overrides.query || {}),
    };
    return http.handle({
      method: "PUT",
      pathname:
        `${STARCRAFT_TMG_SECURE_PROVIDER_API_PREFIX}/attachments/${attachmentId}/secret`,
      query,
      headers: {
        authorization: "Bearer principal-a",
        "content-type": "application/octet-stream",
        "x-project-d-provider-ingress-nonce": prepared.response.result.ingress.nonce,
        ...(overrides.headers || {}),
      },
      rawBody: buffer,
      bodyBytes: buffer.length,
      secureTransport: true,
      ...overrides.request,
    });
  }
  function attachmentRequest(prepared, method = "GET", overrides = {}) {
    const attachmentId = prepared.response.result.attachment.attachmentId;
    return http.handle({
      method,
      pathname:
        `${STARCRAFT_TMG_SECURE_PROVIDER_API_PREFIX}/attachments/${attachmentId}`,
      query: {
        roomId: ROOM_ID,
        sessionId: session.sessionId,
        expectedConnectionEpoch: session.connection.epoch,
        ...(overrides.query || {}),
      },
      headers: {
        authorization: "Bearer principal-a",
        ...(overrides.headers || {}),
      },
      secureTransport: true,
      ...overrides.request,
    });
  }
  return {
    profile,
    profileRef,
    principalBindings,
    lifecycle,
    supervisor,
    session,
    control,
    http,
    registryCalls,
    attachCalls,
    detachCalls,
    consent,
    prepare,
    attach,
    attachmentRequest,
    advance(milliseconds) { nowMs += milliseconds; },
  };
}

await check("contract_is_hash_sealed_and_pins_slice_153", () => {
  verifyHash(contract, "contractHash");
  assert.equal(contract.predecessorBoundaryHash, boundary.boundaryHash);
  assert.equal(contract.acceptance.fixedAssertions, 27);
});

await check("deep_module_exposes_four_player_operations_and_no_rules_or_agent_power", () => {
  assert.deepEqual(contract.deepModule.publicControlOperations, [
    "prepareAttachment", "attachCredentialBytes", "readAttachment", "detachAttachment",
  ]);
  assert(contract.deepModule.doesNotOwn.includes(
    "rules_legality_room_state_rng_or_confirmation"));
  assert.equal(contract.authority.providerMayConfirmOrApply, false);
  assert.equal(contract.authority.dshAllowed, false);
});

await check("http_metadata_is_small_no_store_non_live_and_credential_safe", async () => {
  const fixture = await createFixture();
  const result = await fixture.http.handle({
    method: "GET",
    pathname: `${STARCRAFT_TMG_SECURE_PROVIDER_API_PREFIX}/metadata`,
    secureTransport: true,
  });
  assert.equal(result.status, 200);
  assert.equal(result.headers["cache-control"].includes("no-store"), true);
  assert.equal(result.response.result.liveProviderCallAllowed, false);
  assert.equal(result.response.result.sensitiveIngress.maxBytes, 128);
  assert.equal(result.response.result.endpoints.length, 6);
  safeSerialized(result);
});

await check("production_requires_tls_and_forwarded_headers_do_not_bypass_it", async () => {
  const fixture = await createFixture();
  const body = fixture.consent();
  const denied = await fixture.http.handle({
    method: "POST",
    pathname: `${STARCRAFT_TMG_SECURE_PROVIDER_API_PREFIX}/attachments/intents`,
    headers: {
      authorization: "Bearer principal-a",
      "content-type": "application/json",
      "x-forwarded-proto": "https",
    },
    body,
    bodyBytes: Buffer.byteLength(JSON.stringify(body)),
    secureTransport: false,
    remoteAddress: "203.0.113.10",
  });
  assert.equal(denied.status, 426);
  const local = await createFixture({ allowInsecureLoopbackDevelopment: true });
  const allowed = await local.prepare({}, {
    secureTransport: false,
    remoteAddress: "127.0.0.1",
    headers: { host: "localhost", "content-type": "application/json",
      authorization: "Bearer principal-a" },
  });
  assert.equal(allowed.status, 200);
});

await check("authentication_precedes_registry_and_early_raw_body_is_zeroed", async () => {
  const fixture = await createFixture();
  const body = fixture.consent();
  const denied = await fixture.http.handle({
    method: "POST",
    pathname: `${STARCRAFT_TMG_SECURE_PROVIDER_API_PREFIX}/attachments/intents`,
    headers: { "content-type": "application/json" },
    body,
    bodyBytes: Buffer.byteLength(JSON.stringify(body)),
    secureTransport: true,
  });
  assert.equal(denied.status, 401);
  assert.equal(fixture.registryCalls.length, 0);
  const raw = syntheticBuffer();
  const ingressDenied = await fixture.http.handle({
    method: "PUT",
    pathname: `${STARCRAFT_TMG_SECURE_PROVIDER_API_PREFIX}/attachments/unknown-id/secret`,
    rawBody: raw,
    secureTransport: true,
  });
  assert.equal(ingressDenied.status, 401);
  assert.equal(allZero(raw), true);
});

await check("consent_requires_exact_json_media_type_encoding_and_body_length", async () => {
  const fixture = await createFixture();
  const wrongType = await fixture.prepare({}, {
    headers: { authorization: "Bearer principal-a", "content-type": "text/plain" },
  });
  assert.equal(wrongType.status, 415);
  const encoded = await fixture.prepare({}, {
    headers: { authorization: "Bearer principal-a", "content-type": "application/json",
      "content-encoding": "gzip" },
  });
  assert.equal(encoded.status, 415);
  const mismatch = await fixture.prepare({}, { bodyBytes: 1 });
  assert.equal(mismatch.status, 400);
  assert.equal(mismatch.response.result.reason, "provider_consent_length_mismatch");
});

await check("explicit_current_disclosure_consent_is_mandatory", async () => {
  const fixture = await createFixture();
  const absent = await fixture.prepare({ consentAccepted: false });
  assert.equal(absent.response.result.reason,
    "provider_disclosure_consent_required");
  const stale = await fixture.prepare({ disclosureNoticeVersion: "old-notice" });
  assert.equal(stale.response.result.reason,
    "provider_disclosure_notice_mismatch");
  assert.equal(fixture.attachCalls.length, 0);
});

await check("consent_binds_server_profile_session_and_current_budget", async () => {
  const fixture = await createFixture();
  const prepared = await fixture.prepare();
  assert.equal(prepared.status, 200);
  const value = prepared.response.result.attachment;
  verifyHash(value, "projectionHash");
  assert.equal(value.sessionBindingHash, fixture.session.binding.sessionBindingHash);
  assert.equal(value.provider.profileRef.hash, fixture.profile.integrity.hash);
  assert.equal(value.provider.requestedModel, "gpt-test-model");
  assert.equal(value.budget.automaticRetryAllowed, false);
  assert.equal(value.budget.remainingUnits, 2000);
  assert.match(prepared.response.result.consentReceiptHash, /^[a-f0-9]{64}$/u);
});

await check("client_authority_and_sensitive_fields_are_rejected_before_registry", async () => {
  for (const [field, value] of [
    ["model", "client-model"],
    ["baseUrl", "https://example.test/v1"],
    ["budget", { maxTotalUnits: 999999 }],
    ["principalScopeHash", "9".repeat(64)],
    ["apiKey", "not-a-real-value"],
  ]) {
    const fixture = await createFixture();
    const result = await fixture.prepare({ [field]: value });
    assert.equal(result.status, 400, field);
    assert.equal(fixture.registryCalls.length, 0, field);
    safeSerialized(result);
  }
});

await check("missing_placeholder_and_online_dsh_profiles_fail_closed", async () => {
  const missing = await createFixture({ resolveProfile: () => ({ ok: false }) });
  assert.equal((await missing.prepare()).response.result.reason,
    "provider_profile_not_available");
  const placeholder = createKerriganPrimalProductBundleV1().providerProfile;
  const placeholderFixture = await createFixture({ profile: placeholder });
  assert.equal((await placeholderFixture.prepare()).response.result.reason,
    "provider_model_not_configured");
  const dshProfile = createProviderProfile({
    providerProfileId: "slice-154-dsh-profile",
    version: "1.0.0",
    provider: "local-dsh-runtime",
    baseUrl: "https://example.test/v1",
    model: "offline-only",
  });
  const dsh = await createFixture({ profile: dshProfile });
  assert.equal((await dsh.prepare()).response.result.reason, "online_dsh_forbidden");
});

await check("binary_ingress_hands_off_once_zeroes_buffer_and_returns_safe_status", async () => {
  const fixture = await createFixture();
  const prepared = await fixture.prepare();
  const buffer = syntheticBuffer();
  const attached = await fixture.attach(prepared, buffer);
  assert.equal(attached.status, 200);
  assert.equal(attached.response.result.attachment.state, "attached");
  assert.equal(fixture.attachCalls.length, 1);
  assert.equal(fixture.attachCalls[0].expectedBytes, true);
  assert.equal(allZero(buffer), true);
  safeSerialized(attached);
  assert(!JSON.stringify(attached).includes("worker-001"));
});

await check("ingress_media_length_size_and_ascii_gates_zero_every_buffer", async () => {
  const wrongTypeFixture = await createFixture();
  const wrongPrepared = await wrongTypeFixture.prepare();
  const wrongTypeBuffer = syntheticBuffer();
  const wrongType = await wrongTypeFixture.attach(wrongPrepared, wrongTypeBuffer, {
    headers: { "content-type": "text/plain" },
  });
  assert.equal(wrongType.status, 415);
  assert.equal(allZero(wrongTypeBuffer), true);

  const mismatchFixture = await createFixture();
  const mismatchPrepared = await mismatchFixture.prepare();
  const mismatchBuffer = syntheticBuffer();
  const mismatch = await mismatchFixture.attach(mismatchPrepared, mismatchBuffer, {
    request: { bodyBytes: mismatchBuffer.length + 1 },
  });
  assert.equal(mismatch.status, 400);
  assert.equal(allZero(mismatchBuffer), true);

  const asciiFixture = await createFixture();
  const asciiPrepared = await asciiFixture.prepare();
  const asciiBuffer = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]);
  const invalidAscii = await asciiFixture.attach(asciiPrepared, asciiBuffer);
  assert.equal(invalidAscii.response.result.reason, "provider_secret_bytes_invalid");
  assert.equal(allZero(asciiBuffer), true);
  assert.equal(asciiFixture.attachCalls.length, 0);
});

await check("wrong_nonce_fails_constant_shape_without_consuming_the_intent", async () => {
  const fixture = await createFixture();
  const prepared = await fixture.prepare();
  const badBuffer = syntheticBuffer();
  const denied = await fixture.attach(prepared, badBuffer, {
    headers: { "x-project-d-provider-ingress-nonce": "x".repeat(43) },
  });
  assert.equal(denied.response.result.reason, "provider_ingress_rejected");
  assert.equal(allZero(badBuffer), true);
  const goodBuffer = syntheticBuffer();
  assert.equal((await fixture.attach(prepared, goodBuffer)).status, 200);
  assert.equal(fixture.attachCalls.length, 1);
});

await check("nonce_is_consumed_before_handoff_and_cannot_be_replayed", async () => {
  const fixture = await createFixture();
  const prepared = await fixture.prepare();
  assert.equal((await fixture.attach(prepared)).status, 200);
  const replayBuffer = syntheticBuffer();
  const replay = await fixture.attach(prepared, replayBuffer);
  assert.equal(replay.status, 409);
  assert.equal(replay.response.result.reason, "provider_ingress_already_consumed");
  assert.equal(allZero(replayBuffer), true);
  assert.equal(fixture.attachCalls.length, 1);
});

await check("expired_nonce_detaches_without_worker_handoff", async () => {
  const fixture = await createFixture({ nonceTtlMs: 1000 });
  const prepared = await fixture.prepare();
  fixture.advance(1000);
  const buffer = syntheticBuffer();
  const result = await fixture.attach(prepared, buffer);
  assert.equal(result.status, 410);
  assert.equal(result.response.result.attachment.state, "expired");
  assert.equal(fixture.attachCalls.length, 0);
  assert.equal(allZero(buffer), true);
});

await check("read_projection_contains_status_not_nonce_principal_worker_or_sensitive_material", async () => {
  const fixture = await createFixture();
  const prepared = await fixture.prepare();
  await fixture.attach(prepared);
  const read = await fixture.attachmentRequest(prepared);
  assert.equal(read.status, 200);
  assert.equal(read.response.result.attachment.state, "attached");
  assert.equal(read.response.result.attachment.sensitiveMaterialPersisted, false);
  const serialized = safeSerialized(read);
  assert(!serialized.includes("principal-a"));
  assert(!serialized.includes("worker-001"));
  assert(!serialized.includes(prepared.response.result.ingress.nonce));
});

await check("cross_principal_room_and_session_scopes_fail_closed", async () => {
  const fixture = await createFixture();
  const prepared = await fixture.prepare();
  const crossPrincipal = await fixture.attachmentRequest(prepared, "GET", {
    headers: { authorization: "Bearer principal-b" },
  });
  assert.equal(crossPrincipal.status, 403);
  const wrongRoom = await fixture.attachmentRequest(prepared, "GET", {
    query: { roomId: "another-room" },
  });
  assert.equal(wrongRoom.status, 403);
  const wrongSession = await fixture.attachmentRequest(prepared, "GET", {
    query: { sessionId: "slice-154-session-999" },
  });
  assert.equal(wrongSession.status, 403);
});

await check("reconnect_fences_stale_epoch_but_preserves_same_session_binding", async () => {
  const fixture = await createFixture();
  const prepared = await fixture.prepare();
  await fixture.attach(prepared);
  const reconnected = await fixture.lifecycle.reconnectSession({
    roomId: ROOM_ID,
    sessionId: fixture.session.sessionId,
    expectedConnectionEpoch: 1,
  }, { principalSessionRef: "principal-a" });
  assert.equal(reconnected.ok, true);
  const stale = await fixture.attachmentRequest(prepared, "GET");
  assert.equal(stale.status, 409);
  const current = await fixture.attachmentRequest(prepared, "GET", {
    query: { expectedConnectionEpoch: 2 },
  });
  assert.equal(current.status, 200);
  assert.equal(current.response.result.attachment.state, "attached");
});

await check("pending_consent_can_be_superseded_but_attached_consent_cannot", async () => {
  const fixture = await createFixture();
  const first = await fixture.prepare();
  const second = await fixture.prepare();
  assert.equal(second.status, 200);
  const old = await fixture.attachmentRequest(first);
  assert.equal(old.response.result.attachment.state, "detached");
  assert.equal(old.response.result.attachment.detachReason,
    "superseded_by_new_consent");
  await fixture.attach(second);
  const rejected = await fixture.prepare();
  assert.equal(rejected.status, 409);
  assert.equal(rejected.response.result.reason, "provider_attachment_already_active");
});

await check("explicit_detach_terminates_once_and_is_idempotent", async () => {
  const fixture = await createFixture();
  const prepared = await fixture.prepare();
  await fixture.attach(prepared);
  const detached = await fixture.attachmentRequest(prepared, "DELETE");
  assert.equal(detached.status, 200);
  assert.equal(detached.response.result.attachment.state, "detached");
  assert.equal(detached.response.result.idempotentReplay, false);
  assert.equal(fixture.detachCalls.length, 1);
  const replay = await fixture.attachmentRequest(prepared, "DELETE");
  assert.equal(replay.response.result.idempotentReplay, true);
  assert.equal(fixture.detachCalls.length, 1);
});

await check("trusted_session_end_and_principal_revocation_remove_active_workers", async () => {
  const endedFixture = await createFixture();
  const endedPrepared = await endedFixture.prepare();
  await endedFixture.attach(endedPrepared);
  await endedFixture.lifecycle.endSession({
    roomId: ROOM_ID,
    sessionId: endedFixture.session.sessionId,
    expectedConnectionEpoch: 1,
  }, { principalSessionRef: "principal-a" });
  const ended = await endedFixture.control.revokeSession({
    sessionId: endedFixture.session.sessionId,
    reason: "session_ended",
  });
  assert.equal(ended.revoked, true);
  assert.equal(endedFixture.detachCalls.at(-1).reason, "session_ended");

  const revokedFixture = await createFixture();
  const revokedPrepared = await revokedFixture.prepare();
  await revokedFixture.attach(revokedPrepared);
  revokedFixture.principalBindings.delete("principal-a");
  const revoked = await revokedFixture.control.revokeSession({
    sessionId: revokedFixture.session.sessionId,
    reason: "principal_revoked",
  });
  assert.equal(revoked.revoked, true);
  assert.equal(revokedFixture.detachCalls.at(-1).reason, "principal_revoked");
});

await check("unsafe_worker_acknowledgement_is_redacted_and_requires_new_consent", async () => {
  const attachCalls = [];
  const detachCalls = [];
  const fixture = await createFixture({
    port: {
      async attachCredential(input) {
        attachCalls.push(input.attachmentId);
        return { ok: true, workerRef: "slice154-worker-unsafe", apiKey: "unsafe" };
      },
      async detachCredential(input) {
        detachCalls.push(input);
        return { ok: true };
      },
    },
  });
  const prepared = await fixture.prepare();
  const buffer = syntheticBuffer();
  const failed = await fixture.attach(prepared, buffer);
  assert.equal(failed.status, 502);
  assert.equal(failed.response.result.reason, "credential_worker_attach_failed");
  assert.equal(failed.response.result.attachment.state, "attach_failed");
  assert.equal(allZero(buffer), true);
  safeSerialized(failed);
  assert.equal(attachCalls.length, 1);
  assert.equal(detachCalls.length, 1);
  assert.equal(detachCalls[0].reason, "unsafe_worker_acknowledgement");
});

await check("detach_failure_stays_visible_and_a_later_detach_can_retry", async () => {
  let detachAttempts = 0;
  const fixture = await createFixture({
    port: {
      async attachCredential() {
        return { ok: true, workerRef: "slice154-worker-detach-retry" };
      },
      async detachCredential() {
        detachAttempts += 1;
        if (detachAttempts === 1) return { ok: false };
        return { ok: true };
      },
    },
  });
  const prepared = await fixture.prepare();
  await fixture.attach(prepared);
  const failed = await fixture.attachmentRequest(prepared, "DELETE");
  assert.equal(failed.status, 502);
  assert.equal(failed.response.result.attachment.state, "detach_failed");
  const retried = await fixture.attachmentRequest(prepared, "DELETE");
  assert.equal(retried.status, 200);
  assert.equal(retried.response.result.attachment.state, "detached");
  assert.equal(detachAttempts, 2);
});

await check("detach_during_ingress_waits_for_ack_then_terminates_without_exposure", async () => {
  const gate = deferred();
  const attachCalls = [];
  const detachCalls = [];
  const fixture = await createFixture({
    port: {
      async attachCredential(input) {
        attachCalls.push(input.attachmentId);
        return gate.promise;
      },
      async detachCredential(input) {
        detachCalls.push(input);
        return { ok: true };
      },
    },
  });
  const prepared = await fixture.prepare();
  const buffer = syntheticBuffer();
  const pending = fixture.attach(prepared, buffer);
  await waitFor(() => attachCalls.length === 1, "worker attach did not begin");
  const detaching = await fixture.attachmentRequest(prepared, "DELETE");
  assert.equal(detaching.response.result.detachPending, true);
  assert.equal(detaching.response.result.attachment.state, "detaching");
  gate.resolve({ ok: true, workerRef: "slice154-worker-concurrent" });
  const result = await pending;
  assert.equal(result.status, 409);
  assert.equal(result.response.result.reason,
    "provider_attachment_detached_during_ingress");
  assert.equal(detachCalls.length, 1);
  assert.equal(allZero(buffer), true);
  const read = await fixture.attachmentRequest(prepared);
  assert.equal(read.response.result.attachment.state, "detached");
});

await check("record_capacity_fails_closed_without_evicting_a_pending_attachment", async () => {
  const fixture = await createFixture({ maxAttachmentRecords: 1 });
  const first = await fixture.prepare();
  const second = await fixture.prepare();
  assert.equal(second.status, 429);
  assert.equal(second.response.result.reason,
    "provider_attachment_capacity_exceeded");
  const retained = await fixture.attachmentRequest(first);
  assert.equal(retained.response.result.attachment.state, "awaiting_ingress");
  assert.equal(fixture.attachCalls.length, 0);
});

await check("source_keeps_sensitive_bytes_out_of_strings_hashes_maps_and_public_receipts", async () => {
  const [controlSource, httpSource] = await Promise.all([
    readFile(path.join(ROOT,
      "packages/secure-provider-runtime/credential-attachment-control-v1.mjs"), "utf8"),
    readFile(path.join(ROOT,
      "packages/secure-provider-runtime/http-control-v1.mjs"), "utf8"),
  ]);
  assert(!controlSource.includes("credentialBytes.toString"));
  assert(!controlSource.includes("nonceDigest(secretBuffer"));
  assert(!controlSource.includes("rawSecretPersisted"));
  assert(controlSource.includes("secretBuffer.fill(0)"));
  assert(httpSource.includes("ownedRawBody?.fill(0)"));
  assert(httpSource.includes("content-encoding"));
});

await check("run_truth_records_synthetic_boundary_work_not_a_real_call_or_training", () => {
  assert.deepEqual(contract.runTruth, {
    sourceRefreshPerformed: false,
    providerCalled: false,
    userCredentialAccepted: false,
    syntheticCredentialExercised: true,
    credentialWorkerIsolated: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
    productionReady: false,
  });
  assert.equal(contract.acceptance.realApiKeyRequired, false);
  assert.equal(contract.acceptance.fullTicketLiveCallSlice, 162);
  assert.equal(contract.harnessEvidence.harnessLoopUsed, true);
  assert.deepEqual(contract.harnessEvidence.promptPackRoutes, []);
  assert.equal(contract.harnessEvidence.memoryTraceEvidence.writes, 0);
});

assert.equal(checks.length, contract.acceptance.fixedAssertions,
  "Slice 154 fixed assertion denominator changed");

const reportBody = {
  schemaVersion:
    "starcraft_tmg_ticket_16_slice_154_secure_byok_consent_verification_v1",
  generatedAt: "2026-09-03T15:00:00.000Z",
  ticket: 16,
  slice: 154,
  status: failures.length ? "failed" : "passed",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  contractHash: contract.contractHash,
  predecessorBoundaryHash: contract.predecessorBoundaryHash,
  sliceDenominator: boundary.slices.length,
  ticketProgress: failures.length ? "1/10" : "2/10",
  projectProgress: "14/22",
  nextSlice: failures.length ? 154 : 155,
  liveCredentialNeededNow: false,
  liveCredentialRequiredAtSlice: 162,
  authority: contract.runTruth,
  harness: contract.harnessEvidence,
};
const report = {
  ...reportBody,
  reportHash: hashStarcraftTmgContract(reportBody),
};

await mkdir(REPORT_ROOT, { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(
  `Ticket 16 Slice 154 ${report.status} ${report.assertionsPassed}/${report.assertionsTotal}; `
  + `${report.ticketProgress}; ${report.reportHash}\n`,
);
if (failures.length) throw new Error(failures.join("\n"));
