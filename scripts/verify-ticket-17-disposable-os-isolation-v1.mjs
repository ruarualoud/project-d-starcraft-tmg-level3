#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  DISPOSABLE_OS_ISOLATION_ATTESTATION_SCHEMA,
  DISPOSABLE_OS_JOB_RECEIPT_SCHEMA,
  DISPOSABLE_OS_PROFILE_TEMPLATE_HASH,
  createDisposableOsSkillRunnerV1,
  selectDisposableIsolationBackendV1,
  verifyDisposableOsIsolationAttestationV1,
  verifyDisposableOsJobReceiptV1,
} from "../packages/skill-generation-runtime/disposable-os-runner-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_PATH = path.join(
  ROOT,
  "build/ticket-17-skill-generation-v1/slice-166-report.json",
);
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

async function rejectsCode(operation, code) {
  await assert.rejects(operation, (error) => error?.code === code);
}

const runner = createDisposableOsSkillRunnerV1({ repositoryRoot: ROOT });

await check("unsupported_host_fails_closed_without_child_process_fallback", () => {
  assert.throws(() => selectDisposableIsolationBackendV1({
    platform: "linux",
    sandboxExecQualified: false,
    containerQualified: false,
  }), (error) => error?.code === "ISOLATION_BACKEND_UNAVAILABLE");
  assert.throws(() => selectDisposableIsolationBackendV1({
    platform: "darwin",
    sandboxExecQualified: false,
    containerQualified: false,
  }), (error) => error?.code === "ISOLATION_BACKEND_UNAVAILABLE");
  assert.throws(() => selectDisposableIsolationBackendV1({
    platform: "linux",
    sandboxExecQualified: false,
    containerQualified: true,
  }), (error) => error?.code === "ISOLATION_CONTAINER_BACKEND_NOT_IMPLEMENTED");
});

await check("job_cannot_run_before_current_behavioral_attestation", async () => {
  await rejectsCode(() => runner.run({
    jobId: "pre-attestation",
    attestationHash: "0".repeat(64),
    entrySource: "process.exit(0);",
    stagedInput: { test: true },
  }), "ISOLATION_ATTESTATION_REQUIRED");
});

const attestation = await runner.attest();

await check("attestation_is_hash_sealed_and_profile_template_pinned", () => {
  assert.equal(attestation.schemaVersion,
    DISPOSABLE_OS_ISOLATION_ATTESTATION_SCHEMA);
  assert.equal(attestation.profileTemplateHash,
    DISPOSABLE_OS_PROFILE_TEMPLATE_HASH);
  assert.match(attestation.backendBinding.sandboxExecutableHash, /^[a-f0-9]{64}$/u);
  assert.match(attestation.backendBinding.nodeExecutableHash, /^[a-f0-9]{64}$/u);
  assert.equal(verifyDisposableOsIsolationAttestationV1(attestation), attestation);
});

await check("staged_input_is_readable_and_hash_bound", () => {
  assert.equal(attestation.behavioralProof.stagedInputReadable, true);
  assert.equal(attestation.behavioralProof.stagedInputHashMatched, true);
  assert.equal(attestation.behavioralProof.cleanupVerified, true);
});

await check("host_and_repository_reads_are_behaviorally_denied", () => {
  assert.equal(attestation.behavioralProof.hostDataReadDenied, true);
  assert.equal(attestation.behavioralProof.protectedReadsTotal, 3);
  assert.equal(attestation.behavioralProof.protectedReadsDenied, 3);
});

await check("room_rules_and_skill_registry_capabilities_are_not_mounted", () => {
  assert.deepEqual(attestation.backendBinding
    ? Object.keys(attestation.capabilities).filter((key) => (
        key.endsWith("Mounted") && attestation.capabilities[key] === true
      ))
    : ["missing"], []);
  assert.equal(attestation.capabilities.roomMounted, false);
  assert.equal(attestation.capabilities.rulesMounted, false);
  assert.equal(attestation.capabilities.skillRegistryMounted, false);
});

await check("outside_write_and_unapproved_process_are_behaviorally_denied", () => {
  assert.equal(attestation.behavioralProof.outsideWriteDenied, true);
  assert.equal(attestation.behavioralProof.unapprovedProcessDenied, true);
  assert.match(attestation.behavioralProof.denialCodes.outsideWrite,
    /^(?:EPERM|EACCES)$/u);
  assert.match(attestation.behavioralProof.denialCodes.unapprovedProcess,
    /^(?:EPERM|EACCES)$/u);
});

await check("direct_loopback_network_is_behaviorally_denied", () => {
  assert.equal(attestation.behavioralProof.directNetworkDenied, true);
  assert.equal(attestation.behavioralProof.loopbackConnectionsAccepted, 0);
  assert.match(attestation.behavioralProof.denialCodes.directNetwork,
    /^(?:EPERM|EACCES)$/u);
});

await check("worker_environment_is_explicit_and_parent_credentials_are_absent", () => {
  assert.equal(attestation.behavioralProof.environmentAllowlistPassed, true);
  assert.equal(attestation.capabilities.providerBrokerMounted, false);
  assert.equal(attestation.capabilities.directNetworkAllowed, false);
});

const HAPPY_WORKER = String.raw`import { readFile, writeFile } from "node:fs/promises";
const [requestPath, responsePath] = process.argv.slice(2);
const request = JSON.parse(await readFile(requestPath, "utf8"));
await writeFile(responsePath, JSON.stringify({
  accepted: true,
  taskId: request.taskId,
  stagedValue: request.stagedValue,
}), "utf8");
`;

let successfulRun;
await check("attested_runner_executes_one_staged_only_disposable_job", async () => {
  successfulRun = await runner.run({
    jobId: "slice166-happy-job",
    attestationHash: attestation.attestationHash,
    entrySource: HAPPY_WORKER,
    stagedInput: {
      taskId: "how_to_play.current_rule_atom",
      stagedValue: 166,
    },
  });
  assert.deepEqual(successfulRun.output, {
    accepted: true,
    taskId: "how_to_play.current_rule_atom",
    stagedValue: 166,
  });
  assert.equal(successfulRun.receipt.schemaVersion,
    DISPOSABLE_OS_JOB_RECEIPT_SCHEMA);
  assert.equal(successfulRun.receipt.execution.cleanupVerified, true);
  assert.equal(verifyDisposableOsJobReceiptV1(
    successfulRun.receipt, attestation), successfulRun.receipt);
});

await check("wrong_or_tampered_attestation_cannot_authorize_a_job", async () => {
  await rejectsCode(() => runner.run({
    jobId: "bad-attestation-job",
    attestationHash: "f".repeat(64),
    entrySource: HAPPY_WORKER,
    stagedInput: { taskId: "blocked", stagedValue: 0 },
  }), "ISOLATION_ATTESTATION_MISMATCH");
  const tampered = structuredClone(attestation);
  tampered.capabilities.directNetworkAllowed = true;
  assert.throws(() => verifyDisposableOsIsolationAttestationV1(tampered),
    (error) => error?.code === "ISOLATION_ATTESTATION_HASH_INVALID");
});

await check("stdout_is_not_an_application_result_channel", async () => {
  await rejectsCode(() => runner.run({
    jobId: "stdout-only-job",
    attestationHash: attestation.attestationHash,
    entrySource: "console.log(JSON.stringify({ accepted: true }));",
    stagedInput: { taskId: "stdout-only" },
  }), "ISOLATION_OUTPUT_MISSING");
});

await check("credential_shaped_staged_input_and_output_fail_closed", async () => {
  await rejectsCode(() => runner.run({
    jobId: "credential-input-job",
    attestationHash: attestation.attestationHash,
    entrySource: HAPPY_WORKER,
    stagedInput: { apiKey: "not-a-real-provider-key" },
  }), "ISOLATION_JOB_PAYLOAD_INVALID");
  await rejectsCode(() => runner.run({
    jobId: "detached-key-input-job",
    attestationHash: attestation.attestationHash,
    entrySource: HAPPY_WORKER,
    stagedInput: { payload: `jsk-${"x".repeat(20)}` },
  }), "ISOLATION_JOB_PAYLOAD_INVALID");
  const unsafeWorker = String.raw`import { writeFile } from "node:fs/promises";
const responsePath = process.argv[3];
const output = { ["api" + "Key"]: ["not", "a", "real", "provider", "key"].join("-") };
await writeFile(responsePath, JSON.stringify(output), "utf8");
`;
  await rejectsCode(() => runner.run({
    jobId: "credential-output-job",
    attestationHash: attestation.attestationHash,
    entrySource: unsafeWorker,
    stagedInput: { taskId: "credential-output" },
  }), "ISOLATION_OUTPUT_UNSAFE");
});

await check("timeout_kills_the_disposable_process_group_and_cleans_up", async () => {
  const hangingWorker = "setInterval(() => {}, 1000);";
  await assert.rejects(() => runner.run({
    jobId: "timeout-job",
    attestationHash: attestation.attestationHash,
    entrySource: hangingWorker,
    stagedInput: { taskId: "timeout" },
    timeoutMs: 50,
  }), (error) => (
    error?.code === "ISOLATION_WORKER_TIMEOUT" && error.cleanupVerified === true
  ));
});

await check("nonzero_exit_and_malformed_output_fail_closed_after_cleanup", async () => {
  await assert.rejects(() => runner.run({
    jobId: "nonzero-exit-job",
    attestationHash: attestation.attestationHash,
    entrySource: "process.exit(7);",
    stagedInput: { taskId: "nonzero" },
  }), (error) => (
    error?.code === "ISOLATION_WORKER_EXIT_INVALID"
      && error.cleanupVerified === true
  ));
  const malformedWorker = String.raw`import { writeFile } from "node:fs/promises";
await writeFile(process.argv[3], "not-json", "utf8");
`;
  await assert.rejects(() => runner.run({
    jobId: "malformed-output-job",
    attestationHash: attestation.attestationHash,
    entrySource: malformedWorker,
    stagedInput: { taskId: "malformed" },
  }), (error) => (
    error?.code === "ISOLATION_OUTPUT_JSON_INVALID"
      && error.cleanupVerified === true
  ));
});

await check("job_receipt_tamper_is_rejected_by_an_independent_consumer", () => {
  const tampered = structuredClone(successfulRun.receipt);
  tampered.capabilities.repositoryMounted = true;
  assert.throws(() => verifyDisposableOsJobReceiptV1(tampered, attestation),
    (error) => error?.code === "ISOLATION_JOB_RECEIPT_IDENTITY_INVALID");
});

await check("isolation_has_zero_provider_tokens_cost_and_authority", () => {
  for (const value of [attestation, successfulRun.receipt]) {
    assert.equal(value.externalUsage.providerCalls, 0);
    assert.equal(value.externalUsage.inputTokens, 0);
    assert.equal(value.externalUsage.outputTokens, 0);
    assert.equal(value.externalUsage.cacheHitTokens, 0);
    assert.equal(value.externalUsage.cacheMissTokens, 0);
    assert.equal(value.externalUsage.totalTokens, 0);
    assert.equal(value.externalUsage.estimatedCny, "0.00");
    assert(Object.values(value.authority).every((entry) => entry === false));
  }
});

const reportBody = {
  schemaVersion: "starcraft_tmg_ticket_17_slice_166_report_v1",
  ticket: 17,
  slice: 166,
  status: failures.length === 0 ? "pass" : "fail",
  checks,
  summary: {
    total: checks.length,
    passed: checks.filter((entry) => entry.passed).length,
    failed: failures.length,
  },
  isolation: {
    attestationHash: attestation.attestationHash,
    profileTemplateHash: attestation.profileTemplateHash,
    backend: attestation.backend,
    sandboxExecutableHash:
      attestation.backendBinding.sandboxExecutableHash,
    nodeExecutableHash: attestation.backendBinding.nodeExecutableHash,
    protectedCapabilityCount: 3,
    allHostAndRepositoryReadsDenied:
      attestation.behavioralProof.hostDataReadDenied
      && attestation.behavioralProof.protectedReadsDenied === 3,
    outsideWriteDenied: attestation.behavioralProof.outsideWriteDenied,
    unapprovedProcessDenied:
      attestation.behavioralProof.unapprovedProcessDenied,
    directNetworkDenied: attestation.behavioralProof.directNetworkDenied,
    loopbackConnectionsAccepted:
      attestation.behavioralProof.loopbackConnectionsAccepted,
    cleanupVerified: attestation.behavioralProof.cleanupVerified,
  },
  successfulJob: successfulRun ? {
    receiptHash: successfulRun.receipt.receiptHash,
    entryHash: successfulRun.receipt.entryHash,
    stagedInputHash: successfulRun.receipt.stagedInputHash,
    outputHash: successfulRun.receipt.outputHash,
    profileHash: successfulRun.receipt.profileHash,
    cleanupVerified: successfulRun.receipt.execution.cleanupVerified,
  } : null,
  authority: {
    candidateCreated: false,
    skillPublished: false,
    rulesChanged: false,
    roomOperated: false,
    memoryWritten: false,
    trainingTruthCreated: false,
  },
  externalUsage: {
    providerCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheHitTokens: 0,
    cacheMissTokens: 0,
    totalTokens: 0,
    estimatedUsd: "0.00000000",
    estimatedCny: "0.00",
  },
  sourceRefreshPerformed: false,
  dshInstalledOrRun: false,
};
const report = {
  ...reportBody,
  reportHash: hashStarcraftTmgContract(reportBody),
};
await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
