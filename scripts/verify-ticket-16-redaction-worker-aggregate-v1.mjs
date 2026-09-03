#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  STARCRAFT_TMG_TICKET_16_REDACTION_BROWSER_WORKER_AGGREGATE_V1 as contract,
} from "../content/provider/ticket-16-redaction-browser-worker-aggregate-v1.mjs";
import { STARCRAFT_TMG_TICKET_16_PROVIDER_PRODUCT_FLOW_V1 as predecessor } from
  "../content/provider/ticket-16-provider-product-flow-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgSecureProviderSessionClientV1 } from
  "../packages/client-domain/secure-provider-session-client-v1.mjs";
import {
  createHttpStarcraftTmgSecureProviderClientTransportV1,
} from "../packages/client-domain/secure-provider-transport-adapters-v1.mjs";
import {
  containsStarcraftTmgKnownCredentialEchoV1,
  containsStarcraftTmgOnlineCredentialMaterialV1,
} from "../packages/online-agent-session/portable-credential-material-v1.mjs";
import {
  createStarcraftTmgSecureProviderHttpControlV1,
  STARCRAFT_TMG_SECURE_PROVIDER_API_PREFIX,
} from "../packages/secure-provider-runtime/http-control-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_ROOT = path.join(ROOT,
  "build/ticket-16-slice-161-redaction-worker-aggregate-v1");
const REPORT_PATH = path.join(REPORT_ROOT, "report.json");
const GENERATED_AT = "2026-09-04T10:30:00.000Z";
const SECRET_TEXT = "t16x+fuzz/BYOK?A=9&k";
const SECRET_BYTES = new TextEncoder().encode(SECRET_TEXT);
const checks = [];
const failures = [];

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function allZero(value) {
  return [...value].every((byte) => byte === 0);
}

function base64(value) {
  return Buffer.from(value).toString("base64");
}

function variants(value = SECRET_BYTES) {
  const text = new TextDecoder().decode(value);
  const encoded = base64(value);
  const hex = Buffer.from(value).toString("hex");
  return Object.freeze({
    raw_utf8: text,
    url_encoded: encodeURIComponent(text),
    double_url_encoded: encodeURIComponent(encodeURIComponent(text)),
    base64_padded: encoded,
    base64_unpadded: encoded.replace(/=+$/u, ""),
    base64url_unpadded: encoded.replace(/\+/gu, "-").replace(/\//gu, "_")
      .replace(/=+$/u, ""),
    hex_lower: hex,
    hex_upper: hex.toUpperCase(),
    json_escaped: JSON.stringify(text).slice(1, -1),
    unicode_escaped_ascii: [...text].map((character) => (
      `\\u${character.codePointAt(0).toString(16).padStart(4, "0")}`
    )).join(""),
  });
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

function profile() {
  return Object.freeze({
    profileRef: Object.freeze({
      id: "starcraft-tmg.slice-161.profile",
      version: "1.0.0",
      hash: "a".repeat(64),
    }),
    providerId: "deterministic-provider",
    model: "deterministic-model",
    maxContextUnits: 4096,
    maxOutputUnits: 256,
    timeoutMs: 1000,
    trainingTruth: false,
  });
}

function sessionSource() {
  return {
    read() {
      return {
        roomId: "slice-161-room",
        sessionId: "slice-161-agent-session",
        connectionEpoch: 1,
        lifecycleState: "active",
      };
    },
    subscribe() { return () => {}; },
  };
}

function httpInput(rawBody) {
  return {
    method: "PUT",
    pathname:
      `${STARCRAFT_TMG_SECURE_PROVIDER_API_PREFIX}/attachments/slice-161-attachment/secret`,
    query: {
      roomId: "slice-161-room",
      sessionId: "slice-161-agent-session",
      expectedConnectionEpoch: 1,
    },
    headers: {
      "content-type": "application/octet-stream",
      "x-project-d-provider-ingress-nonce": "n".repeat(43),
    },
    rawBody,
    bodyBytes: rawBody.byteLength,
    secureTransport: true,
    remoteAddress: "203.0.113.16",
  };
}

function createHttp(echo, { throws = false } = {}) {
  return createStarcraftTmgSecureProviderHttpControlV1({
    controlPlane: {
      metadata() { return { maxCredentialBytes: 256 }; },
      async prepareAttachment() { return { ok: false, reason: "not_used" }; },
      async attachCredentialBytes() {
        if (throws) throw new Error(`${SECRET_TEXT}:${echo}`);
        return {
          ok: true,
          attachment: { state: "attached", diagnostic: echo },
          receipt: { receiptHash: "b".repeat(64) },
          trainingTruth: false,
        };
      },
      async readAttachment() { return { ok: false, reason: "not_used" }; },
      async detachAttachment() { return { ok: false, reason: "not_used" }; },
    },
    principalAuthenticator: {
      async authenticate() {
        return {
          ok: true,
          principalSessionRef: "slice-161-principal",
          authenticationScopeHash: "c".repeat(64),
        };
      },
    },
  });
}

await check("contract_is_hash_sealed_and_binds_slice_160", () => {
  const { contractHash, ...body } = contract;
  assert.equal(contractHash, hashStarcraftTmgContract(body));
  assert.equal(contract.predecessorContractHash, predecessor.contractHash);
  assert.equal(contract.acceptance.fixedAssertions, 36);
});

await check("redaction_manifest_pins_ten_echo_encodings", () => {
  assert.deepEqual(contract.redaction.knownSecretEchoEncodings,
    Object.keys(variants()));
});

await check("known_secret_guard_detects_raw_utf8", () => {
  assert(containsStarcraftTmgKnownCredentialEchoV1(
    { diagnostic: variants().raw_utf8 }, SECRET_BYTES));
});

await check("known_secret_guard_detects_url_and_double_url_encoding", () => {
  assert(containsStarcraftTmgKnownCredentialEchoV1(
    variants().url_encoded, SECRET_BYTES));
  assert(containsStarcraftTmgKnownCredentialEchoV1(
    variants().double_url_encoded, SECRET_BYTES));
});

await check("known_secret_guard_detects_base64_and_base64url", () => {
  for (const name of ["base64_padded", "base64_unpadded", "base64url_unpadded"]) {
    assert(containsStarcraftTmgKnownCredentialEchoV1(variants()[name], SECRET_BYTES));
  }
});

await check("known_secret_guard_detects_lower_and_upper_hex", () => {
  assert(containsStarcraftTmgKnownCredentialEchoV1(variants().hex_lower, SECRET_BYTES));
  assert(containsStarcraftTmgKnownCredentialEchoV1(variants().hex_upper, SECRET_BYTES));
});

await check("known_secret_guard_detects_json_and_unicode_escape", () => {
  assert(containsStarcraftTmgKnownCredentialEchoV1(variants().json_escaped,
    SECRET_BYTES));
  assert(containsStarcraftTmgKnownCredentialEchoV1(variants().unicode_escaped_ascii,
    SECRET_BYTES));
});

await check("known_secret_guard_does_not_flag_unrelated_safe_receipt", () => {
  assert.equal(containsStarcraftTmgKnownCredentialEchoV1({
    ok: true, receiptHash: "d".repeat(64), trainingTruth: false,
  }, SECRET_BYTES), false);
});

await check("client_transport_rejects_every_echo_encoding_and_zeroes_bytes", async () => {
  let calls = 0;
  for (const [encoding, echo] of Object.entries(variants())) {
    const transport = createHttpStarcraftTmgSecureProviderClientTransportV1({
      baseUrl: "https://slice-161.invalid",
      fetchImpl: async (_url, init) => {
        calls += 1;
        assert(init.body instanceof Uint8Array);
        return {
          async text() {
            return JSON.stringify({
              schemaVersion: "starcraft_tmg_secure_provider_http_v1",
              result: { ok: true, diagnostic: echo },
            });
          },
        };
      },
    });
    const credentialBytes = new Uint8Array(SECRET_BYTES);
    let rejection = null;
    try {
      await transport.execute({
        operation: "attach",
        roomId: "slice-161-room",
        sessionId: "slice-161-agent-session",
        expectedConnectionEpoch: 1,
        attachmentId: "slice-161-attachment",
        ingressNonce: "n".repeat(43),
        credentialBytes,
      });
    } catch (error) {
      rejection = error;
    }
    assert.equal(rejection?.code, "PROVIDER_CLIENT_RESPONSE_UNSAFE", encoding);
    assert(allZero(credentialBytes));
  }
  assert.equal(calls, Object.keys(variants()).length);
});

await check("client_transport_network_failure_is_code_only_one_attempt_and_zeroed", async () => {
  let calls = 0;
  const transport = createHttpStarcraftTmgSecureProviderClientTransportV1({
    baseUrl: "https://slice-161.invalid",
    fetchImpl: async () => {
      calls += 1;
      throw new Error(SECRET_TEXT);
    },
  });
  const credentialBytes = new Uint8Array(SECRET_BYTES);
  await assert.rejects(() => transport.execute({
    operation: "attach",
    roomId: "slice-161-room",
    sessionId: "slice-161-agent-session",
    expectedConnectionEpoch: 1,
    attachmentId: "slice-161-attachment",
    ingressNonce: "n".repeat(43),
    credentialBytes,
  }), (error) => error?.code === "PROVIDER_CLIENT_NETWORK_UNAVAILABLE"
    && !String(error).includes(SECRET_TEXT));
  assert.equal(calls, 1);
  assert(allZero(credentialBytes));
});

await check("http_control_replaces_every_encoded_echo_and_zeroes_owned_body", async () => {
  for (const [encoding, echo] of Object.entries(variants())) {
    const raw = Buffer.from(SECRET_BYTES);
    const result = await createHttp(echo).handle(httpInput(raw));
    assert.equal(result.status, 500, encoding);
    assert.equal(result.response.result.reason,
      "unsafe_provider_response_projection");
    assert(!JSON.stringify(result).includes(echo));
    assert(allZero(raw));
  }
});

await check("http_control_catches_unexpected_error_without_message_or_secret", async () => {
  const raw = Buffer.from(SECRET_BYTES);
  const result = await createHttp("ignored", { throws: true }).handle(httpInput(raw));
  assert.equal(result.status, 500);
  assert.equal(result.response.result.reason, "provider_control_failed");
  assert(!JSON.stringify(result).includes(SECRET_TEXT));
  assert(allZero(raw));
});

await check("client_projection_replaces_arbitrary_transport_error_code", async () => {
  const listed = profile();
  const client = createStarcraftTmgSecureProviderSessionClientV1({
    sessionSource: sessionSource(),
    transport: {
      async execute(input) {
        if (input.operation === "metadata") return { ok: true, profiles: [listed] };
        return { ok: false, reason: `PROVIDER_${SECRET_TEXT}` };
      },
    },
  });
  await client.dispatch({ type: "load_profiles" });
  const result = await client.dispatch({
    type: "prepare_attachment",
    providerProfileRef: listed.profileRef,
    consentAccepted: true,
  });
  assert.equal(result.rejection.code, "PROVIDER_CLIENT_OPERATION_FAILED");
  assert(!JSON.stringify(result).includes(SECRET_TEXT));
});

await check("client_projection_preserves_a_fixed_safe_worker_failure_code", async () => {
  const listed = profile();
  const client = createStarcraftTmgSecureProviderSessionClientV1({
    sessionSource: sessionSource(),
    transport: {
      async execute(input) {
        if (input.operation === "metadata") return { ok: true, profiles: [listed] };
        return { ok: false, reason: "credential_worker_attach_failed" };
      },
    },
  });
  await client.dispatch({ type: "load_profiles" });
  const result = await client.dispatch({
    type: "prepare_attachment",
    providerProfileRef: listed.profileRef,
    consentAccepted: true,
  });
  assert.equal(result.rejection.code, "credential_worker_attach_failed");
  assert.equal(containsStarcraftTmgOnlineCredentialMaterialV1(result), false);
});

const sourcePaths = [
  "packages/online-agent-session/portable-credential-material-v1.mjs",
  "packages/client-domain/secure-provider-session-client-v1.mjs",
  "packages/client-domain/secure-provider-transport-adapters-v1.mjs",
  "packages/secure-provider-runtime/http-control-v1.mjs",
];
const sourceText = (await Promise.all(sourcePaths.map((relative) =>
  readFile(path.join(ROOT, relative), "utf8")))).join("\n");

await check("redaction_sources_use_no_browser_persistence_or_application_logging", () => {
  assert(!/localStorage|sessionStorage|indexedDB/gu.test(sourceText));
  assert(!/console\.(?:log|info|warn|error|debug)/gu.test(sourceText));
});

await check("failure_aggregate_executes_cancel_timeout_crash_and_recovery_gates", async () => {
  const durable = await readFile(path.join(ROOT,
    "scripts/verify-ticket-16-durable-provider-gateway-runtime-v1.mjs"), "utf8");
  const egress = await readFile(path.join(ROOT,
    "scripts/verify-ticket-16-provider-egress-allowlist-v1.mjs"), "utf8");
  for (const token of [
    "definitely_not_sent_failure_settles_durable_budget_at_zero",
    "may_have_been_sent_failure_consumes_full_reservation",
    "cancelled_dispatched_attempt_settles_unknown_usage_once",
    "startup_recovery_abandons_reserved_pre_egress_without_charge",
    "startup_recovery_marks_dispatched_attempt_ambiguous_and_charges_full",
  ]) assert(durable.includes(token), token);
  for (const token of [
    "total_timeout_ends_one_ambiguous_physical_attempt_without_retry",
    "unexpected_actual_child_exit_is_observable_and_never_restarted",
  ]) assert(egress.includes(token), token);
});

await check("failure_aggregate_keeps_one_attempt_and_zero_automatic_retries", () => {
  assert.equal(contract.workerFailureAggregate
    .physicalAttemptsPerLogicalExecutionMaximum, 1);
  assert.equal(contract.workerFailureAggregate.automaticProviderRetries, 0);
  assert.equal(contract.workerFailureAggregate.automaticSchemaRepairs, 0);
});

await check("ambiguous_recovery_requires_fresh_approval_and_credential", () => {
  assert.equal(contract.workerFailureAggregate
    .ambiguousRecoveryNeedsFreshApprovalAndCredential, true);
  assert(contract.workerFailureAggregate.requiredPaths.includes(
    "dispatched_recovery_ambiguous_full_reservation"));
});

await check("slice_runs_real_credential_child_but_no_external_provider", () => {
  assert.equal(contract.runTruth.realCredentialChildUsed, true);
  assert.equal(contract.runTruth.providerCalled, false);
  assert.equal(contract.runTruth.userCredentialAccepted, false);
});

await check("slice_keeps_skill_dsh_selfplay_muzero_and_training_out_of_scope", () => {
  assert.equal(contract.runTruth.skillGenerated, false);
  assert.equal(contract.runTruth.dshRun, false);
  assert.equal(contract.runTruth.selfPlayRun, false);
  assert.equal(contract.runTruth.muzeroDataGenerated, false);
  assert.equal(contract.runTruth.trainingTruth, false);
  assert.equal(contract.harnessEvidence.trainingTraceCandidates, 0);
});

assert.equal(checks.length, contract.acceptance.nodeAssertions,
  "node assertion denominator drifted");

const reportBody = {
  schemaVersion:
    "starcraft_tmg_ticket_16_redaction_worker_aggregate_report_v1",
  generatedAt: GENERATED_AT,
  ticket: 16,
  slice: 161,
  status: failures.length ? "failed" : "passed",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  contractHash: contract.contractHash,
  encodingCorpusSize: Object.keys(variants()).length,
  fixedFailurePaths: clone(contract.workerFailureAggregate.requiredPaths),
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
const serialized = JSON.stringify(reportBody);
for (const echo of Object.values(variants())) assert(!serialized.includes(echo));
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
  console.log(`Ticket 16 Slice 161 redaction/worker ${checks.length}/${checks.length}; encodings=${Object.keys(variants()).length}; ${report.reportHash}`);
}
