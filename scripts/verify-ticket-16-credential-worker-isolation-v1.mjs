#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_16_CREDENTIAL_WORKER_ISOLATION_V1 as contract } from
  "../content/provider/ticket-16-credential-worker-isolation-v1.mjs";
import { STARCRAFT_TMG_TICKET_16_SECURE_BYOK_CONSENT_V1 as predecessor } from
  "../content/provider/ticket-16-secure-byok-consent-v1.mjs";
import { createProviderProfile } from
  "../packages/character-agent/contracts-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgSecureProviderAttachmentControlV1,
  STARCRAFT_TMG_PROVIDER_DISCLOSURE_NOTICE_VERSION } from
  "../packages/secure-provider-runtime/credential-attachment-control-v1.mjs";
import { createStarcraftTmgCredentialWorkerPortV1,
  STARCRAFT_TMG_CREDENTIAL_WORKER_CHILD_VERSION } from
  "../packages/secure-provider-runtime/credential-worker-port-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_ROOT = path.join(ROOT,
  "build/ticket-16-slice-155-credential-worker-isolation-v1");
const REPORT_PATH = path.join(REPORT_ROOT, "report.json");
const CHILD_PATH = path.join(ROOT,
  "packages/secure-provider-runtime/credential-worker-child-v1.mjs");
const SYNTHETIC_BYTES = Object.freeze([
  0x73, 0x6b, 0x2d, 0x73, 0x6c, 0x69, 0x63, 0x65, 0x31, 0x35, 0x35,
  0x2d, 0x73, 0x79, 0x6e, 0x74, 0x68, 0x65, 0x74, 0x69, 0x63, 0x2d,
  0x6e, 0x65, 0x76, 0x65, 0x72, 0x2d, 0x6c, 0x69, 0x76, 0x65,
]);
const checks = [];
const failures = [];
let actualChildProcessesSpawned = 0;

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

function syntheticBuffer() {
  return Buffer.from(SYNTHETIC_BYTES);
}

function allZero(value) {
  return Buffer.isBuffer(value) && value.every((byte) => byte === 0);
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

function profile(overrides = {}) {
  return createProviderProfile({
    providerProfileId: "starcraft-tmg.direct-provider.slice-155.v1",
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

function deterministicIds(prefix = "fixture") {
  let sequence = 0;
  return () => `${prefix}-${String(++sequence).padStart(4, "0")}`;
}

function createActualPort(options = {}) {
  const userObserver = options.onWorkerExit;
  return createStarcraftTmgCredentialWorkerPortV1({
    createId: deterministicIds(options.idPrefix || "actual"),
    handshakeTimeoutMs: 3000,
    shutdownGraceMs: 500,
    ...options,
    onWorkerExit(event) {
      actualChildProcessesSpawned += 0;
      return userObserver?.(event);
    },
  });
}

async function attachActual(port, attachmentId = "slice-155-attachment-001") {
  const bytes = syntheticBuffer();
  const result = await port.attachCredential({
    attachmentId,
    providerProfile: profile(),
    credentialBytes: bytes,
  });
  actualChildProcessesSpawned += 1;
  return { result, bytes };
}

class FakeChild extends EventEmitter {
  constructor(handler = null) {
    super();
    this.pid = 99001;
    this.connected = true;
    this.exitCode = null;
    this.signalCode = null;
    this.handler = handler;
    this.sent = [];
  }

  send(message, callback) {
    this.sent.push(message);
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

await check("contract_is_hash_sealed_and_pins_slice_154", () => {
  verifyHash(contract, "contractHash");
  assert.equal(contract.predecessorContractHash, predecessor.contractHash);
  assert.equal(contract.acceptance.fixedAssertions, 25);
});

await check("mtl_reference_is_commit_and_byte_hash_pinned", () => {
  assert.equal(contract.mtlSchedulingReference.commit,
    "50ef5c29c655c015335d76e78fb4a0ecb442252f");
  assert.equal(contract.mtlSchedulingReference.exactInputs.length, 5);
  for (const entry of contract.mtlSchedulingReference.exactInputs) {
    assert.match(entry.sha256, /^[a-f0-9]{64}$/u);
  }
  assert.equal(contract.mtlSchedulingReference.copiedCode, false);
});

await check("mtl_harness_scheduling_principles_are_preserved", () => {
  for (const principle of [
    "freeze_a_content_addressed_harness_instead_of_scattered_runtime_flags",
    "isolate_each_agent_session_and_credential_broker_with_parent_mediated_ipc",
    "bind_every_decision_to_seat_or_principal_state_revision_and_legalspace_hash",
    "use_bounded_workflow_start_continue_close_sessions_and_tool_budgets",
    "stop_and_replan_at_random_opponent_reaction_or_state_drift_boundaries",
  ]) assert(contract.mtlSchedulingReference.adoptedSchedulingFlow.includes(principle));
});

await check("starcraft_adaptation_keeps_four_roles_human_confirmation_and_offline_dsh", () => {
  const adaptations = contract.mtlSchedulingReference.starcraftAdaptations;
  assert(adaptations.includes(
    "online_tutor_opponent_commentator_and_companion_have_separate_context_and_tool_capabilities"));
  assert(adaptations.includes(
    "only_opponent_may_select_a_current_enabled_legalspace_candidate"));
  assert(adaptations.includes(
    "no_online_agent_may_confirm_apply_or_batch_replay_a_provider_authored_plan"));
  assert(adaptations.includes("human_human_mode_never_schedules_a_model"));
  assert(adaptations.includes("dsh_is_reserved_for_offline_skill_generation_only"));
});

await check("child_source_has_no_provider_rules_room_agent_skill_memory_or_dsh_import", async () => {
  const source = await readFile(CHILD_PATH, "utf8");
  const importLines = source.split("\n")
    .filter((line) => /^\s*import(?:\s|\()/u.test(line));
  assert.deepEqual(importLines, []);
  for (const forbiddenCapability of [
    "fetch(", "node:http", "node:https", "createConnection(", "connect(",
  ]) assert(!source.includes(forbiddenCapability), forbiddenCapability);
  assert(source.includes("message.credentialBytes.fill(0)"));
  assert(source.includes("sensitiveBytes.fill(0)"));
});

await check("port_metadata_declares_exact_scrubbed_non_live_process_contract", () => {
  const port = createActualPort();
  const metadata = port.metadata();
  assert.equal(metadata.processGranularity, "one_child_per_attachment");
  assert.deepEqual(metadata.environment, ["NODE_NO_WARNINGS"]);
  assert.deepEqual(metadata.stdio, ["ignore", "ignore", "ignore", "ipc"]);
  assert.equal(metadata.shell, false);
  assert.equal(metadata.providerTransportMounted, false);
  assert.equal(metadata.externalNetworkAllowed, false);
  assert.equal(metadata.automaticRestartAllowed, false);
  assert.equal(metadata.automaticRetryAllowed, false);
});

await check("actual_child_attach_acks_and_zeroes_the_parent_buffer", async () => {
  const port = createActualPort({ idPrefix: "attach" });
  const { result, bytes } = await attachActual(port);
  assert.equal(result.ok, true);
  assert.match(result.workerRef, /^sc-provider-worker-/u);
  assert.equal(allZero(bytes), true);
  assert.deepEqual(Object.keys(result).sort(), ["ok", "workerRef"]);
  await port.close();
});

await check("actual_child_reports_scrubbed_environment_and_non_live_state", async () => {
  const port = createActualPort({ idPrefix: "isolation" });
  const { result } = await attachActual(port);
  const state = port.readWorkerState({ workerRef: result.workerRef });
  assert.equal(state.ok, true);
  assert.equal(state.worker.state, "attached");
  assert(Number.isInteger(state.worker.processId));
  assert.equal(state.worker.processIsolated, true);
  assert.equal(state.worker.providerTransportMounted, false);
  assert.equal(state.worker.networkRequestMade, false);
  assert.equal(state.worker.automaticRestarted, false);
  await port.close();
});

await check("each_attachment_receives_a_distinct_child_process", async () => {
  const port = createActualPort({ idPrefix: "distinct" });
  const first = await attachActual(port, "slice-155-attachment-101");
  const second = await attachActual(port, "slice-155-attachment-102");
  const stateA = port.readWorkerState({ workerRef: first.result.workerRef });
  const stateB = port.readWorkerState({ workerRef: second.result.workerRef });
  assert.notEqual(first.result.workerRef, second.result.workerRef);
  assert.notEqual(stateA.worker.processId, stateB.worker.processId);
  await port.close();
});

await check("graceful_detach_waits_for_exit_and_records_expected_tombstone", async () => {
  const port = createActualPort({ idPrefix: "detach" });
  const { result } = await attachActual(port);
  assert.deepEqual(await port.detachCredential({
    workerRef: result.workerRef,
    reason: "explicit_user_detach",
  }), { ok: true });
  const state = port.readWorkerState({ workerRef: result.workerRef });
  assert.equal(state.worker.state, "exited");
  assert.equal(state.worker.expectedExit, true);
  assert.equal(state.worker.exitReason, "expected_shutdown");
  assert.equal(state.worker.credentialPersistence, "none_after_process_exit");
  await port.close();
});

await check("port_close_terminates_all_children_and_is_idempotent", async () => {
  const port = createActualPort({ idPrefix: "close" });
  const first = await attachActual(port, "slice-155-attachment-201");
  const second = await attachActual(port, "slice-155-attachment-202");
  const closed = await port.close();
  assert.equal(closed.detachedWorkers, 2);
  assert.equal(port.readWorkerState({ workerRef: first.result.workerRef })
    .worker.expectedExit, true);
  assert.equal(port.readWorkerState({ workerRef: second.result.workerRef })
    .worker.expectedExit, true);
  assert.equal((await port.close()).idempotentReplay, true);
});

await check("unexpected_child_crash_is_observable_and_never_restarted", async () => {
  const exits = [];
  const port = createActualPort({
    idPrefix: "crash",
    onWorkerExit(event) { exits.push(event); },
  });
  const { result } = await attachActual(port);
  const before = port.readWorkerState({ workerRef: result.workerRef });
  const pid = before.worker.processId;
  assert(Number.isInteger(pid) && pid > 1);
  process.kill(pid, "SIGKILL");
  await waitFor(() => exits.length === 1, "unexpected exit observer did not run");
  const after = port.readWorkerState({ workerRef: result.workerRef });
  assert.equal(after.worker.exitReason, "unexpected_sigkill");
  assert.equal(after.worker.expectedExit, false);
  assert.equal(after.worker.automaticRestarted, false);
  assert.equal(exits[0].attachmentId, "slice-155-attachment-001");
  await port.close();
});

await check("crashed_worker_ref_cannot_reanimate_or_alias_a_new_attachment", async () => {
  const port = createActualPort({ idPrefix: "no-restart" });
  const first = await attachActual(port, "slice-155-attachment-301");
  const pid = port.readWorkerState({ workerRef: first.result.workerRef })
    .worker.processId;
  process.kill(pid, "SIGKILL");
  await waitFor(() => port.readWorkerState({ workerRef: first.result.workerRef })
    .worker.state === "exited", "crashed worker did not become a tombstone");
  const second = await attachActual(port, "slice-155-attachment-302");
  assert.notEqual(second.result.workerRef, first.result.workerRef);
  assert.notEqual(port.readWorkerState({ workerRef: second.result.workerRef })
    .worker.processId, pid);
  await port.close();
});

await check("handshake_timeout_kills_the_child_and_zeroes_input", async () => {
  let child;
  const port = createStarcraftTmgCredentialWorkerPortV1({
    childPath: "/injected/no-ack-child.mjs",
    spawnProcess() {
      child = new FakeChild();
      return child;
    },
    createId: deterministicIds("timeout"),
    handshakeTimeoutMs: 20,
    shutdownGraceMs: 20,
  });
  const bytes = syntheticBuffer();
  await assert.rejects(port.attachCredential({
    attachmentId: "slice-155-attachment-timeout",
    providerProfile: profile(),
    credentialBytes: bytes,
  }), /timed out/u);
  assert.equal(allZero(bytes), true);
  assert.equal(child.signalCode, "SIGKILL");
  await port.close();
});

await check("polluted_initialization_ack_is_rejected_killed_and_zeroed", async () => {
  let child;
  const port = createStarcraftTmgCredentialWorkerPortV1({
    childPath: "/injected/polluted-child.mjs",
    spawnProcess() {
      child = new FakeChild((message, instance) => {
        if (message.type !== "initialize") return;
        instance.emit("message", {
          type: "initialized",
          requestId: message.requestId,
          attachmentId: message.attachmentId,
          ok: true,
          workerVersion: STARCRAFT_TMG_CREDENTIAL_WORKER_CHILD_VERSION,
          profileHash: message.profileBinding.profileHash,
          isolation: {
            processIsolated: true,
            environmentInheritedFromParent: false,
            environmentKeys: ["NODE_NO_WARNINGS"],
            environmentAllowlistPassed: true,
            standardInputClosed: true,
            standardOutputApplicationDataAllowed: false,
            standardErrorApplicationDataAllowed: false,
            credentialPersistence: "child_process_session_memory_only",
            credentialReturnedOverIpc: false,
            providerTransportMounted: false,
            networkRequestMade: false,
            rulesRoomAgentSkillMemoryOrDshImported: false,
            trainingTruth: false,
          },
          apiKey: "polluted-ack",
          trainingTruth: false,
        });
      });
      return child;
    },
    createId: deterministicIds("polluted"),
    handshakeTimeoutMs: 100,
    shutdownGraceMs: 20,
  });
  const bytes = syntheticBuffer();
  await assert.rejects(port.attachCredential({
    attachmentId: "slice-155-attachment-polluted",
    providerProfile: profile(),
    credentialBytes: bytes,
  }), /acknowledgement rejected/u);
  assert.equal(child.signalCode, "SIGKILL");
  assert.equal(allZero(bytes), true);
  await port.close();
});

await check("spawn_failure_still_zeroes_the_owned_input", async () => {
  const port = createStarcraftTmgCredentialWorkerPortV1({
    childPath: "/injected/spawn-failure.mjs",
    spawnProcess() { throw new Error("synthetic spawn failure"); },
    createId: deterministicIds("spawn"),
  });
  const bytes = syntheticBuffer();
  await assert.rejects(port.attachCredential({
    attachmentId: "slice-155-attachment-spawn-fail",
    providerProfile: profile(),
    credentialBytes: bytes,
  }), /synthetic spawn failure/u);
  assert.equal(allZero(bytes), true);
  await port.close();
});

await check("duplicate_and_capacity_fail_closed_without_touching_the_live_child", async () => {
  const port = createActualPort({ idPrefix: "capacity", maxWorkers: 1 });
  const first = await attachActual(port, "slice-155-attachment-capacity");
  const duplicateBytes = syntheticBuffer();
  await assert.rejects(port.attachCredential({
    attachmentId: "slice-155-attachment-capacity",
    providerProfile: profile(),
    credentialBytes: duplicateBytes,
  }), /already exists/u);
  assert.equal(allZero(duplicateBytes), true);
  const capacityBytes = syntheticBuffer();
  await assert.rejects(port.attachCredential({
    attachmentId: "slice-155-attachment-capacity-2",
    providerProfile: profile(),
    credentialBytes: capacityBytes,
  }), /capacity exceeded/u);
  assert.equal(allZero(capacityBytes), true);
  assert.equal(port.readWorkerState({ workerRef: first.result.workerRef })
    .worker.state, "attached");
  await port.close();
});

await check("unknown_detach_is_safe_and_idempotent", async () => {
  const port = createActualPort({ idPrefix: "unknown" });
  assert.deepEqual(await port.detachCredential({
    workerRef: "sc-provider-worker-does-not-exist",
    reason: "explicit_user_detach",
  }), { ok: true });
  assert.equal(port.readWorkerState({
    workerRef: "sc-provider-worker-does-not-exist",
  }).reason, "credential_worker_not_found");
  await port.close();
});

await check("placeholder_and_online_dsh_profiles_never_spawn_a_child", async () => {
  let spawns = 0;
  const port = createStarcraftTmgCredentialWorkerPortV1({
    spawnProcess() { spawns += 1; return new FakeChild(); },
    createId: deterministicIds("profile"),
  });
  const placeholderBytes = syntheticBuffer();
  await assert.rejects(port.attachCredential({
    attachmentId: "slice-155-placeholder-profile",
    providerProfile: profile({ model: "administrator_must_select" }),
    credentialBytes: placeholderBytes,
  }), /unconfigured model/u);
  const dshBytes = syntheticBuffer();
  await assert.rejects(port.attachCredential({
    attachmentId: "slice-155-online-dsh-profile",
    providerProfile: profile({ provider: "local-dsh-runtime" }),
    credentialBytes: dshBytes,
  }), /online DSH/u);
  assert.equal(allZero(placeholderBytes), true);
  assert.equal(allZero(dshBytes), true);
  assert.equal(spawns, 0);
  await port.close();
});

function controlFixture(port) {
  const providerProfile = profile();
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
  const policy = {
    ...policyBody,
    policyHash: hashStarcraftTmgContract(policyBody),
  };
  const control = createStarcraftTmgSecureProviderAttachmentControlV1({
    sessionLifecycle: {
      async readSession() {
        return { ok: true, session: {
          lifecycleState: "active",
          binding,
          connection: { epoch: 1 },
        } };
      },
    },
    providerSupervisor: {
      async readState() {
        return { ok: true, state: {
          sessionBindingHash: binding.sessionBindingHash,
          connectionEpoch: 1,
          budget: { policy, remainingUnits: 1000 },
        } };
      },
    },
    providerProfileRegistry: {
      async resolve() { return { ok: true, providerProfile }; },
    },
    credentialAttachmentPort: port,
    createId: () => "slice-155-control-attachment",
    createNonce: () => Buffer.alloc(32, 7).toString("base64url"),
    now: () => "2026-09-04T00:00:00.000Z",
  });
  return {
    control,
    input: {
      roomId: "slice-155-control-room",
      sessionId: "slice-155-control-session",
      expectedConnectionEpoch: 1,
      providerProfileRef: {
        id: providerProfile.providerProfileId,
        version: providerProfile.version,
        hash: providerProfile.integrity.hash,
      },
      disclosureNoticeVersion: STARCRAFT_TMG_PROVIDER_DISCLOSURE_NOTICE_VERSION,
      consentAccepted: true,
    },
  };
}

await check("slice_154_control_hands_synthetic_bytes_to_the_actual_child_port", async () => {
  const port = createActualPort({ idPrefix: "control" });
  const fixture = controlFixture(port);
  const prepared = await fixture.control.prepareAttachment(fixture.input, {});
  assert.equal(prepared.ok, true);
  const bytes = syntheticBuffer();
  const attached = await fixture.control.attachCredentialBytes({
    roomId: fixture.input.roomId,
    sessionId: fixture.input.sessionId,
    expectedConnectionEpoch: 1,
    attachmentId: prepared.attachment.attachmentId,
    ingressNonce: prepared.ingress.nonce,
    credentialBytes: bytes,
  }, {});
  actualChildProcessesSpawned += 1;
  assert.equal(attached.ok, true);
  assert.equal(attached.attachment.state, "attached");
  assert.equal(allZero(bytes), true);
  assert(!JSON.stringify(attached).includes("sc-provider-worker-"));
  await fixture.control.close();
  await port.close();
});

await check("control_detach_reaches_actual_child_and_removes_credential_lifetime", async () => {
  const port = createActualPort({ idPrefix: "control-detach" });
  const fixture = controlFixture(port);
  const prepared = await fixture.control.prepareAttachment(fixture.input, {});
  const bytes = syntheticBuffer();
  const attached = await fixture.control.attachCredentialBytes({
    roomId: fixture.input.roomId,
    sessionId: fixture.input.sessionId,
    expectedConnectionEpoch: 1,
    attachmentId: prepared.attachment.attachmentId,
    ingressNonce: prepared.ingress.nonce,
    credentialBytes: bytes,
  }, {});
  actualChildProcessesSpawned += 1;
  const detached = await fixture.control.detachAttachment({
    roomId: fixture.input.roomId,
    sessionId: fixture.input.sessionId,
    expectedConnectionEpoch: 1,
    attachmentId: prepared.attachment.attachmentId,
  }, {});
  assert.equal(detached.ok, true);
  assert.equal(detached.attachment.state, "detached");
  assert.equal(attached.receipt.sensitiveMaterialPersisted, false);
  await port.close();
});

await check("unknown_child_protocol_message_fails_closed_without_stdout_or_network", async () => {
  const child = spawn(process.execPath, [CHILD_PATH], {
    shell: false,
    stdio: ["ignore", "ignore", "ignore", "ipc"],
    serialization: "advanced",
    env: { NODE_NO_WARNINGS: "1" },
  });
  actualChildProcessesSpawned += 1;
  const outcome = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("protocol rejection timed out"));
    }, 3000);
    child.once("message", (message) => {
      clearTimeout(timer);
      resolve(message);
    });
    child.once("error", reject);
    child.send({ type: "read_room", requestId: "slice-155-forbidden-message" });
  });
  assert.equal(outcome.type, "worker_failure");
  assert.equal(outcome.reason, "credential_worker_protocol_rejected");
  assert.equal(outcome.trainingTruth, false);
  await new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) resolve();
    else child.once("exit", resolve);
  });
});

await check("source_and_safe_artifacts_never_contain_the_synthetic_value", async () => {
  const [childSource, portSource] = await Promise.all([
    readFile(CHILD_PATH, "utf8"),
    readFile(path.join(ROOT,
      "packages/secure-provider-runtime/credential-worker-port-v1.mjs"), "utf8"),
  ]);
  const reconstructed = Buffer.from(SYNTHETIC_BYTES).toString("utf8");
  assert(!childSource.includes(reconstructed));
  assert(!portSource.includes(reconstructed));
  assert(!JSON.stringify(contract).includes(reconstructed));
  assert(!childSource.includes("credentialHash"));
  assert(!portSource.includes("credentialHash"));
});

await check("process_isolation_claim_is_bounded_and_future_egress_work_stays_open", () => {
  assert.equal(contract.isolationLimits.processIsolationIsNotAnOsSandbox, true);
  assert.equal(contract.isolationLimits.egressDeniedByAbsenceInThisSlice, true);
  assert.equal(contract.isolationLimits.egressAllowlistOwnedBySlice, 156);
  assert.equal(contract.isolationLimits.crashStatusCompositionOwnedBySlice, 159);
  assert.equal(contract.authority.workerMayReadRoomOrLegalSpace, false);
  assert.equal(contract.authority.workerMayConfirmOrApply, false);
});

await check("run_truth_records_real_children_but_no_real_key_provider_or_training", () => {
  assert(actualChildProcessesSpawned >= 10,
    `expected at least ten actual child processes, observed ${actualChildProcessesSpawned}`);
  assert.deepEqual(contract.runTruth, {
    sourceRefreshPerformed: false,
    providerCalled: false,
    userCredentialAccepted: false,
    syntheticCredentialExercised: true,
    childProcessesSpawned: true,
    providerTransportMounted: false,
    networkRequestMade: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
    productionReady: false,
  });
  assert.equal(contract.acceptance.realApiKeyRequired, false);
  assert.equal(contract.acceptance.actualChildProcessesRequired, true);
  assert.equal(contract.harnessEvidence.memoryTraceEvidence.writes, 0);
});

assert.equal(checks.length, contract.acceptance.fixedAssertions,
  "Slice 155 fixed assertion denominator changed");

const reportBody = {
  schemaVersion:
    "starcraft_tmg_ticket_16_slice_155_credential_worker_isolation_verification_v1",
  generatedAt: "2026-09-04T00:00:00.000Z",
  ticket: 16,
  slice: 155,
  status: failures.length ? "failed" : "passed",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  contractHash: contract.contractHash,
  predecessorContractHash: contract.predecessorContractHash,
  actualChildProcessesSpawned,
  ticketProgress: failures.length ? "2/10" : "3/10",
  projectProgress: "14/22",
  remainingTicketSlices: failures.length ? 8 : 7,
  nextSlice: failures.length ? 155 : 156,
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
  `Ticket 16 Slice 155 ${report.status} ${report.assertionsPassed}/${report.assertionsTotal}; `
  + `${report.ticketProgress}; children=${actualChildProcessesSpawned}; ${report.reportHash}\n`,
);
if (failures.length) throw new Error(failures.join("\n"));
