#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from
  "../content/skill-generation/offline-provider-profile-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  createStarcraftTmgSkillGenerationJobManifest,
  STARCRAFT_TMG_DSH_BASELINE_V1,
} from "../packages/skill-generation/contracts-v1.mjs";
import {
  DSH_EFFECTIVE_CONFIG_ROWS_HASH,
  DSH_NPM_TARBALL_SHA256,
  DSH_PLUGIN_LOCK_HASH,
} from "../packages/skill-generation-runtime/dsh-pinned-runtime-v1.mjs";
import {
  STARCRAFT_TMG_DIRECT_CONTROL_MODEL_ROLES_V1 as modelRoles,
  STARCRAFT_TMG_DIRECT_CONTROL_RUNTIME_V1,
  STARCRAFT_TMG_SKILL_COST_POLICY_V1 as costPolicy,
  StarcraftTmgOfflineSkillProviderBrokerError,
  compileStarcraftTmgOfflineSkillRoleProviderRequestV1,
  createStarcraftTmgDirectSkillControlExecutorV1,
  createStarcraftTmgOfflineSkillProviderBrokerV1,
  createStarcraftTmgSkillCostGuardV1,
  verifyStarcraftTmgDirectControlSessionV1,
} from "../packages/skill-generation-runtime/provider-broker-v1.mjs";
import {
  TEACH_CTX2SKILL_ROLE_GRAPH_HASH,
  TEACH_CTX2SKILL_ROLE_REQUEST_SCHEMA,
} from "../packages/skill-generation-runtime/teach-ctx2skill-role-graph-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV1 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v1.mjs";
import { createStarcraftTmgProviderEgressWorkerPortV1 } from
  "../packages/secure-provider-runtime/provider-egress-worker-port-v1.mjs";
import { loadCurrentOfficialSkillFixtureV1 } from
  "./support/current-official-skill-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = path.join(
  ROOT,
  "build/ticket-17-skill-generation-v1/slice-168-report.json",
);
const GENERATED_AT = "2026-09-04T17:00:00.000Z";
const RUN_ID = "run.slice168.direct-control.1";
const checks = [];
const failures = [];

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function envelope(body, field) {
  return { ...body, [field]: hashStarcraftTmgContract(body) };
}

function verifyEnvelope(value, field) {
  const copy = clone(value);
  const observed = copy[field];
  delete copy[field];
  assert.equal(observed, hashStarcraftTmgContract(copy));
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

async function rejectsCode(operation, code) {
  await assert.rejects(operation, (error) => (
    error instanceof StarcraftTmgOfflineSkillProviderBrokerError
      ? error.code === code : String(error?.message || "").includes(code)
  ));
}

function clock(startSecond = 0) {
  let second = startSecond;
  return () => new Date(Date.UTC(2026, 8, 4, 17, 0, second++))
    .toISOString();
}

const fixture = await loadCurrentOfficialSkillFixtureV1({ root: ROOT });
const task = fixture.curriculum.tasks.find((row) => (
  row.family === "how_to_play" && row.generationEligible
));
assert(task);
const stagedInput = fixture.stage(task.taskId);
const registry = createStarcraftTmgProviderProfileRegistryV1({
  entries: [{
    providerProfile: profile,
    completionPath: "/chat/completions",
  }],
  allowedProviders: ["deepseek-openai-compatible-direct"],
});
const resolvedProfile = await registry.resolveEgressBinding({
  profileRef: {
    id: profile.providerProfileId,
    version: profile.version,
    hash: profile.integrity.hash,
  },
});
assert.equal(resolvedProfile.ok, true);

function makeJob(arm, overrides = {}) {
  const dsh = arm === "dsh";
  return createStarcraftTmgSkillGenerationJobManifest({
    jobId: `skill-job-slice168-${arm}`,
    executionArm: arm,
    roleRoute: "rule_skill_builder",
    skillType: "turn_flow",
    objective: "Generate one bounded current-official how-to-play candidate.",
    rulesVersion: stagedInput.bindings.rules.rulesVersion,
    dataVersion: stagedInput.bindings.source.normalizedDatasetHash,
    sourceSnapshotRefs: [{
      sourceId: "starcraft-tmg.current-official-composite",
      snapshotId: "starcraft-tmg.current-official-composite.slice168",
      snapshotHash: stagedInput.bindings.source.sourceSnapshotHash,
      authorityStatus: "official_current",
      rulesEligible: true,
    }],
    stagedInputHash: stagedInput.stagedInputHash,
    existingSkillSetHash: hashStarcraftTmgContract([]),
    promptPackRef: {
      id: "starcraft-tmg.ctx2skill.rule-builder.v1",
      version: "1.0.0",
      hash: hashStarcraftTmgContract("starcraft-tmg-rule-builder-prompt-v1"),
    },
    runtime: dsh ? {
      packageName: STARCRAFT_TMG_DSH_BASELINE_V1.packageName,
      version: STARCRAFT_TMG_DSH_BASELINE_V1.version,
      commit: STARCRAFT_TMG_DSH_BASELINE_V1.commit,
      packageIntegrityHash: DSH_NPM_TARBALL_SHA256,
      effectiveConfigHash: DSH_EFFECTIVE_CONFIG_ROWS_HASH,
      pluginLockHash: DSH_PLUGIN_LOCK_HASH,
      profileName: "project-d-starcraft-skill-isolated-v1",
      sessionFormatVersion: "0",
      internalRetries: 0,
    } : STARCRAFT_TMG_DIRECT_CONTROL_RUNTIME_V1,
    providerProfileRef: {
      id: profile.providerProfileId,
      version: profile.version,
      hash: profile.integrity.hash,
      model: profile.model,
    },
    toolContract: {
      allowlist: [
        "read_staged_source",
        "read_existing_skills",
        "emit_candidate_skill",
      ],
      schemaHash: hashStarcraftTmgContract(
        "starcraft-tmg-candidate-emission-tool-schema-v1",
      ),
    },
    permissionProfile: {
      isolation: "disposable_container_or_microvm",
      repositoryMounted: false,
      productionSkillRegistryWrite: false,
      roomApiAccess: false,
      rulesMutationAccess: false,
      trainingTruthAccess: false,
      productionCredentialsMounted: false,
      telemetry: "disabled",
      egressMode: "provider_endpoint_allowlist_only",
      egressAllowlistHash: resolvedProfile.egressBinding.policyHash,
      enforcementOwner: "project-d-offline-skill-provider-broker",
    },
    budget: {
      maxProviderAttempts: 7,
      maxInputTokens: 1_400_000,
      maxOutputTokens: 3_584,
      maxWallMs: 900_000,
      maxEstimatedCost: 2,
      currency: "USD",
      priceTableVersion: costPolicy.policyHash,
    },
    scheduler: {
      schedulerJobId: `scheduler-slice168-${arm}`,
      attempt: 1,
      leaseId: `lease-slice168-${arm}`,
      fenceTokenHash: hashStarcraftTmgContract(`fence-slice168-${arm}`),
    },
    outputSchemaHash: hashStarcraftTmgContract(
      "starcraft-tmg-teach-ctx2skill-candidate-v1",
    ),
    createdAt: GENERATED_AT,
    ...overrides,
  });
}

const controlJob = makeJob("direct_provider_control");
const dshJob = makeJob("dsh");

function makeRolePacket(role, index = modelRoles.indexOf(role), overrides = {}) {
  const sequenceIndex = {
    planner: 0,
    tutor: 1,
    student: 2,
    challenger: 3,
    reasoner: 4,
    proposer: 6,
    generator: 7,
  }[role];
  const requestBody = {
    schemaVersion: TEACH_CTX2SKILL_ROLE_REQUEST_SCHEMA,
    runId: RUN_ID,
    nodeId: `node.${String(index).padStart(2, "0")}.${role}`,
    role,
    phase: index < 3 ? "teach" : "ctx2skill",
    sequenceIndex,
    graphHash: TEACH_CTX2SKILL_ROLE_GRAPH_HASH,
    taskRef: {
      taskId: stagedInput.task.taskId,
      taskHash: stagedInput.task.taskHash,
      family: stagedInput.task.family,
      subjectId: stagedInput.task.subjectId,
    },
    stagedInputHash: stagedInput.stagedInputHash,
    currentBinding: {
      stagedInputHash: stagedInput.stagedInputHash,
      sourceLockHash: stagedInput.bindings.source.sourceLockHash,
      sourceSnapshotHash: stagedInput.bindings.source.sourceSnapshotHash,
      normalizedDatasetHash:
        stagedInput.bindings.source.normalizedDatasetHash,
      rulesReceiptHash: stagedInput.bindings.rules.receiptHash,
      rulesCatalogueHash: stagedInput.bindings.rules.catalogueHash,
      rulesRuntimeHash: stagedInput.bindings.rules.runtimeHash,
      rulesGraphHash: stagedInput.bindings.rules.graphHash,
    },
    directParents: [],
    contextReceiptRefs: [],
    capabilities: {
      readStagedEvidence: true,
      writeRoleOutput: true,
      emitCandidateSkill: false,
      judgeOwnClaims: false,
      readRawRepository: false,
      readHostSecrets: false,
      network: false,
      room: false,
      mutableRulesRuntime: false,
      memoryWrite: false,
      skillPublish: false,
      trainingWrite: false,
    },
    rawReasoningRequested: false,
    candidateAuthority: "unreviewed_only",
    trainingTruth: false,
    ...clone(overrides.request || {}),
  };
  return {
    request: envelope(requestBody, "requestHash"),
    stagedInput: clone(stagedInput),
    contextReceipts: clone(overrides.contextReceipts || []),
    ...clone(overrides.packet || {}),
  };
}

function successValue(providerRequest, ordinal, overrides = {}) {
  const role = providerRequest.promptNodes[0].roleRequest.role;
  const output = overrides.output || {
    schemaVersion: "starcraft_tmg_offline_skill_role_output_v1",
    channels: {
      skill_generation_role_output: {
        role,
        fixtureOrdinal: ordinal,
        summary: `Bounded fixture output for ${role}.`,
      },
    },
  };
  const inputUnits = overrides.inputUnits ?? 100 + ordinal;
  const outputUnits = overrides.outputUnits ?? 20 + ordinal;
  const cacheHit = overrides.cacheHit ?? 10;
  const usage = overrides.usage || {
    inputUnits,
    outputUnits,
    totalUnits: inputUnits + outputUnits,
    inputCacheHitUnits: cacheHit,
    inputCacheMissUnits: inputUnits - cacheHit,
    reasoningOutputUnits: Math.min(ordinal, outputUnits),
  };
  const receiptBody = {
    schemaVersion: "starcraft_tmg_provider_egress_transport_v1.success",
    requestId: providerRequest.requestId,
    providerProfileRef: {
      id: profile.providerProfileId,
      version: profile.version,
      hash: profile.integrity.hash,
    },
    egressPolicyHash: resolvedProfile.egressBinding.policyHash,
    providerId: profile.provider,
    requestedModel: profile.model,
    reportedModel: profile.model,
    providerRequestIdHash: hashStarcraftTmgContract(
      `fixture-provider-request-${ordinal}`,
    ),
    providerSystemFingerprintHash: hashStarcraftTmgContract(
      "fixture-deepseek-v4-flash-0731",
    ),
    status: 200,
    usage,
    responseFingerprint: hashStarcraftTmgContract(output),
    dnsAddressSetHash: hashStarcraftTmgContract(["93.184.216.34"]),
    tlsServerName: "api.deepseek.com",
    tlsCertificateVerificationDisabled: false,
    redirectFollowed: false,
    proxyUsed: false,
    physicalAttempts: 1,
    automaticRetries: 0,
    startedAt: `2026-09-04T17:01:${String(ordinal).padStart(2, "0")}.000Z`,
    finishedAt: `2026-09-04T17:01:${String(ordinal + 1).padStart(2, "0")}.000Z`,
    trainingTruth: false,
    ...clone(overrides.receipt || {}),
  };
  return {
    output,
    usageReceipt: envelope(receiptBody, "receiptHash"),
  };
}

function failureError({ definitelyNotSent }) {
  const body = {
    schemaVersion: "starcraft_tmg_provider_egress_transport_v1.failure",
    code: definitelyNotSent
      ? "PROVIDER_WORKER_NOT_ATTACHED" : "PROVIDER_TRANSPORT_FAILED",
    requestDefinitelyNotSent: definitelyNotSent,
    requestMayHaveBeenSent: !definitelyNotSent,
    status: null,
    physicalAttempts: definitelyNotSent ? 0 : 1,
    automaticRetries: 0,
    trainingTruth: false,
  };
  const error = new Error(body.code);
  error.safeReceipt = envelope(body, "receiptHash");
  return error;
}

function fakeWorker(options = {}) {
  const calls = [];
  return {
    calls,
    metadata() {
      return {
        schemaVersion: "starcraft_tmg_provider_egress_worker_port_v1.metadata",
        providerTransportOwner: "credential_child_only",
        profileRegistryOwner: "server_parent_only",
        automaticRetryAllowed: false,
        trainingTruth: false,
      };
    },
    async complete(input) {
      calls.push(clone(input.providerRequest));
      const ordinal = calls.length;
      options.onCall?.(input, ordinal);
      if (options.error) throw options.error;
      return successValue(input.providerRequest, ordinal, options.success || {});
    },
  };
}

await check("profile_is_server_owned_exact_model_and_zero_retry", () => {
  assert.equal(profile.provider, "deepseek-openai-compatible-direct");
  assert.equal(profile.baseUrl, "https://api.deepseek.com");
  assert.equal(profile.model, "deepseek-v4-flash");
  assert.equal(profile.retryPolicy.maxAttempts, 1);
  assert.equal(profile.retryPolicy.internalRetry, false);
  assert.equal(profile.outputBudget, 4_096);
});

await check("broker_composes_the_real_ticket_16_provider_worker_port", async () => {
  const realWorkerPort = createStarcraftTmgProviderEgressWorkerPortV1({
    providerProfileRegistry: registry,
  });
  try {
    const realBroker = createStarcraftTmgOfflineSkillProviderBrokerV1({
      providerWorkerPort: realWorkerPort,
      costGuard: createStarcraftTmgSkillCostGuardV1(),
    });
    assert.equal(realBroker.metadata().providerOwner,
      "ticket_16_isolated_provider_worker");
    assert.equal(realWorkerPort.metadata().providerTransportOwner,
      "credential_child_only");
  } finally {
    await realWorkerPort.close();
  }
});

await check("cost_policy_is_hash_sealed_and_binds_ticket_16_baseline", () => {
  verifyEnvelope(costPolicy, "policyHash");
  assert.equal(costPolicy.historicalBaseline.inputTokens, 2_424);
  assert.equal(costPolicy.historicalBaseline.outputTokens, 44);
  assert.equal(costPolicy.historicalBaseline.totalTokens, 2_468);
  assert.equal(costPolicy.historicalBaseline.calculatedCostNanoUsd, 562_320);
  assert.equal(costPolicy.historicalBaseline.convertedCostCnyMicros, 4_499);
  assert.equal(costPolicy.conversion.marketOrInvoiceAuthority, false);
});

await check("cost_guard_starts_from_the_audited_external_baseline", () => {
  const snapshot = createStarcraftTmgSkillCostGuardV1().readSnapshot();
  verifyEnvelope(snapshot, "snapshotHash");
  assert.equal(snapshot.cumulativeCostNanoUsd, 562_320);
  assert.equal(snapshot.cumulativeCnyMicros, 4_499);
  assert.equal(snapshot.nextNotificationThresholdCnyMicros, 100_000_000);
});

await check("common_prompt_compiler_is_arm_neutral", () => {
  const packet = makeRolePacket("planner", 0);
  const left = compileStarcraftTmgOfflineSkillRoleProviderRequestV1({
    jobManifest: dshJob,
    rolePacket: packet,
    requestId: "paired-provider-request-001",
  });
  const right = compileStarcraftTmgOfflineSkillRoleProviderRequestV1({
    jobManifest: controlJob,
    rolePacket: packet,
    requestId: "paired-provider-request-001",
  });
  assert.equal(left.promptContractHash, right.promptContractHash);
  assert.equal(left.providerRequestHash, right.providerRequestHash);
  assert.deepEqual(left.providerRequest, right.providerRequest);
});

await check("compiled_prompt_preserves_tools_budgets_and_candidate_boundary", () => {
  const compiled = compileStarcraftTmgOfflineSkillRoleProviderRequestV1({
    jobManifest: controlJob,
    rolePacket: makeRolePacket("planner", 0),
    requestId: "compiled-provider-request-001",
  });
  assert.deepEqual(compiled.promptContract.toolContract.allowlist,
    controlJob.toolContract.allowlist);
  assert.equal(compiled.promptContract.toolContract.schemaHash,
    controlJob.toolContract.schemaHash);
  assert.equal(compiled.promptContract.toolContract
    .candidateEmissionAvailableToModelRole, false);
  assert.equal(compiled.budget.maxInputTokens, 200_000);
  assert.equal(compiled.budget.maxOutputTokens, 512);
  assert(compiled.serializedBytes < compiled.budget.maxInputTokens);
});

await check("credential_shaped_role_packet_is_rejected_before_cost_or_egress", () => {
  const packet = makeRolePacket("planner", 0);
  packet.apiKey = "fixture-sensitive-value";
  assert.throws(() => compileStarcraftTmgOfflineSkillRoleProviderRequestV1({
    jobManifest: controlJob,
    rolePacket: packet,
    requestId: "credential-reject-request-001",
  }), /credential material/u);
});

await check("tampered_role_request_hash_fails_closed", () => {
  const packet = makeRolePacket("planner", 0);
  packet.request.requestHash = "0".repeat(64);
  assert.throws(() => compileStarcraftTmgOfflineSkillRoleProviderRequestV1({
    jobManifest: controlJob,
    rolePacket: packet,
    requestId: "tampered-role-request-001",
  }), /hash mismatch/u);
});

await check("role_context_receipts_are_hash_and_reference_bound", () => {
  const packet = makeRolePacket("planner", 0);
  const contextReceipt = envelope({
    schemaVersion: "fixture_role_receipt_v1",
    role: "tutor",
    outputHash: hashStarcraftTmgContract("fixture-output"),
    trainingTruth: false,
  }, "receiptHash");
  const { requestHash: _oldHash, ...requestBody } = packet.request;
  requestBody.contextReceiptRefs = [{
    role: contextReceipt.role,
    receiptHash: contextReceipt.receiptHash,
  }];
  packet.request = envelope(requestBody, "requestHash");
  packet.contextReceipts = [contextReceipt];
  const compiled = compileStarcraftTmgOfflineSkillRoleProviderRequestV1({
    jobManifest: controlJob,
    rolePacket: packet,
    requestId: "context-bound-provider-request",
  });
  assert.equal(compiled.promptContract.contextReceipts[0].receiptHash,
    contextReceipt.receiptHash);
  packet.contextReceipts[0].outputHash = "0".repeat(64);
  assert.throws(() => compileStarcraftTmgOfflineSkillRoleProviderRequestV1({
    jobManifest: controlJob,
    rolePacket: packet,
    requestId: "context-tampered-provider-request",
  }), /hash mismatch/u);
});

await check("cost_threshold_crossing_fails_without_delivery_port", async () => {
  const guard = createStarcraftTmgSkillCostGuardV1({
    initialCostNanoUsd: 0,
    initialCnyMicros: 99_900_000,
  });
  await rejectsCode(() => guard.authorizeAttempt({
    attemptId: "cost-attempt-without-notifier",
    runId: RUN_ID,
    role: "planner",
    requestHash: hashStarcraftTmgContract("threshold-request"),
    maxInputTokens: 200_000,
    maxOutputTokens: 512,
  }), "COST_NOTIFICATION_DELIVERY_REQUIRED");
  assert.equal(guard.readSnapshot().pendingAttempts, 0);
});

await check("every_crossed_hundred_cny_tier_is_delivered_in_order", async () => {
  const notices = [];
  const guard = createStarcraftTmgSkillCostGuardV1({
    initialCostNanoUsd: 0,
    initialCnyMicros: 0,
    now: clock(20),
    notifier: {
      async notify(notice) {
        notices.push(notice);
        return {
          schemaVersion: "starcraft_tmg_skill_cost_guard_v1.notice-ack",
          delivered: true,
          noticeHash: notice.noticeHash,
          thresholdCnyMicros: notice.thresholdCnyMicros,
          deliveredAt: "2026-09-04T17:00:40.000Z",
        };
      },
    },
  });
  const authorization = await guard.authorizeAttempt({
    attemptId: "cost-attempt-multi-threshold",
    runId: RUN_ID,
    role: "planner",
    requestHash: hashStarcraftTmgContract("multi-threshold-request"),
    maxInputTokens: 1,
    maxOutputTokens: 20_000_000,
  });
  assert.deepEqual(notices.map((notice) => notice.thresholdCnyMicros),
    [100_000_000, 200_000_000]);
  assert.equal(authorization.notificationReceiptHashes.length, 2);
  assert(notices.every((notice) => notice.createdAt
    <= authorization.authorizedAt));
});

await check("bad_notification_ack_blocks_authorization", async () => {
  const guard = createStarcraftTmgSkillCostGuardV1({
    initialCostNanoUsd: 0,
    initialCnyMicros: 99_900_000,
    notifier: {
      async notify(notice) {
        return {
          schemaVersion: "starcraft_tmg_skill_cost_guard_v1.notice-ack",
          delivered: false,
          noticeHash: notice.noticeHash,
          thresholdCnyMicros: notice.thresholdCnyMicros,
          deliveredAt: GENERATED_AT,
        };
      },
    },
  });
  await rejectsCode(() => guard.authorizeAttempt({
    attemptId: "cost-attempt-bad-ack",
    runId: RUN_ID,
    role: "planner",
    requestHash: hashStarcraftTmgContract("bad-ack-request"),
    maxInputTokens: 200_000,
    maxOutputTokens: 512,
  }), "COST_NOTIFICATION_DELIVERY_REJECTED");
  assert.equal(guard.readSnapshot().pendingAttempts, 0);
});

await check("broker_delivers_threshold_notice_before_provider_egress", async () => {
  const order = [];
  const thresholdWorker = fakeWorker({
    onCall() { order.push("provider"); },
  });
  const thresholdGuard = createStarcraftTmgSkillCostGuardV1({
    initialCostNanoUsd: 0,
    initialCnyMicros: 99_900_000,
    now: clock(45),
    notifier: {
      async notify(notice) {
        order.push(`notice:${notice.thresholdCnyMicros}`);
        return {
          schemaVersion: "starcraft_tmg_skill_cost_guard_v1.notice-ack",
          delivered: true,
          noticeHash: notice.noticeHash,
          thresholdCnyMicros: notice.thresholdCnyMicros,
          deliveredAt: "2026-09-04T17:00:55.000Z",
        };
      },
    },
  });
  const thresholdBroker = createStarcraftTmgOfflineSkillProviderBrokerV1({
    providerWorkerPort: thresholdWorker,
    costGuard: thresholdGuard,
    now: clock(56),
  });
  await thresholdBroker.completeRole({
    jobManifest: controlJob,
    workerRef: "provider-worker-threshold-order",
    rolePacket: makeRolePacket("planner", 0),
    attemptId: "threshold-order-attempt-001",
  });
  assert.deepEqual(order, ["notice:100000000", "provider"]);
});

const worker = fakeWorker();
const costGuard = createStarcraftTmgSkillCostGuardV1({ now: clock(60) });
const broker = createStarcraftTmgOfflineSkillProviderBrokerV1({
  providerWorkerPort: worker,
  costGuard,
  now: clock(80),
});
const executor = createStarcraftTmgDirectSkillControlExecutorV1({
  broker,
  jobManifest: controlJob,
  workerRef: "provider-worker-slice168-control",
  createId: (() => {
    let ordinal = 0;
    return (label) => `${label}.${++ordinal}`;
  })(),
  now: clock(100),
});
const roleOutputs = [];
for (let index = 0; index < modelRoles.length; index += 1) {
  roleOutputs.push(await executor.executeRole(
    makeRolePacket(modelRoles[index], index),
  ));
}
const directSession = executor.finalize();

await check("broker_exposes_one_common_worker_ref_only_boundary", () => {
  const metadata = broker.metadata();
  assert.deepEqual(metadata.acceptedArms, ["dsh", "direct_provider_control"]);
  assert.equal(metadata.credentialInputAccepted, false);
  assert.equal(metadata.workerReferenceOnly, true);
  assert.equal(metadata.physicalAttemptsPerRole, 1);
  assert.equal(metadata.automaticRetryAllowed, false);
});

await check("direct_control_executes_all_seven_model_roles_in_order", () => {
  assert.equal(worker.calls.length, 7);
  assert.deepEqual(roleOutputs.map((output) => output.role), modelRoles);
  assert.deepEqual(executor.readState().completedRoles, modelRoles);
  assert.equal(executor.readState().state, "complete");
});

await check("every_role_has_one_physical_attempt_and_zero_retry", () => {
  assert.equal(directSession.providerAttempts, 7);
  assert.equal(directSession.retryEvents, 0);
  assert.equal(new Set(worker.calls.map((request) => request.requestId)).size, 7);
});

await check("direct_control_session_is_independently_hash_verified", () => {
  assert.equal(verifyStarcraftTmgDirectControlSessionV1(
    directSession,
    controlJob,
  ), true);
  verifyEnvelope(directSession, "sessionHash");
});

await check("usage_records_input_output_cache_hit_cache_miss_and_total", () => {
  assert.equal(directSession.usage.inputTokens, 728);
  assert.equal(directSession.usage.outputTokens, 168);
  assert.equal(directSession.usage.cacheHitTokens, 70);
  assert.equal(directSession.usage.cacheMissTokens, 658);
  assert.equal(directSession.usage.reasoningTokens, 28);
  assert.equal(directSession.usage.totalTokens, 896);
});

await check("pricing_and_cny_forecast_are_bound_without_invoice_claim", () => {
  assert(directSession.calculatedCostNanoUsd > 0);
  assert(directSession.calculatedCostCnyMicros > 0);
  assert.equal(costPolicy.providerInvoiceAuthoritative, true);
  assert.equal(costPolicy.conversion.kind,
    "conservative_budget_guard_ceiling_not_market_quote");
});

await check("cost_snapshot_accounts_for_every_settled_role", () => {
  const snapshot = broker.readCostSnapshot();
  assert.equal(snapshot.pendingAttempts, 0);
  assert.equal(snapshot.settledAttempts, 7);
  assert(snapshot.cumulativeCostNanoUsd
    > costPolicy.historicalBaseline.calculatedCostNanoUsd);
  assert.equal(snapshot.deliveredThresholdCnyMicros.length, 0);
});

await check("safe_session_persists_hashes_not_prompt_response_or_worker_ref", () => {
  const serialized = JSON.stringify(directSession);
  assert.equal(serialized.includes("promptNodes"), false);
  assert.equal(serialized.includes("fixtureOrdinal"), false);
  assert.equal(serialized.includes("provider-worker-slice168-control"), false);
  assert.equal(directSession.rawPromptPersisted, false);
  assert.equal(directSession.rawResponsePersisted, false);
  assert.equal(directSession.rawReasoningPersisted, false);
});

await check("control_executor_never_loads_dsh_or_emits_candidate", () => {
  assert.equal(directSession.executionArm, "direct_provider_control");
  assert.equal(directSession.dshLoaded, false);
  assert.equal(directSession.candidateEmissions, 0);
  assert.equal(executor.metadata().candidateEmissionOwner,
    "post_cross_time_cardinality_controller");
});

await check("wrong_role_order_fails_before_provider_attempt", async () => {
  const isolatedWorker = fakeWorker();
  const isolatedBroker = createStarcraftTmgOfflineSkillProviderBrokerV1({
    providerWorkerPort: isolatedWorker,
    costGuard: createStarcraftTmgSkillCostGuardV1(),
  });
  const isolatedExecutor = createStarcraftTmgDirectSkillControlExecutorV1({
    broker: isolatedBroker,
    jobManifest: controlJob,
    workerRef: "provider-worker-wrong-role-sequence",
  });
  await rejectsCode(() => isolatedExecutor.executeRole(
    makeRolePacket("tutor", 1),
  ), "DIRECT_CONTROL_ROLE_SEQUENCE_REJECTED");
  assert.equal(isolatedWorker.calls.length, 0);
});

await check("dsh_job_cannot_be_mislabelled_as_control_executor", () => {
  assert.throws(() => createStarcraftTmgDirectSkillControlExecutorV1({
    broker,
    jobManifest: dshJob,
    workerRef: "provider-worker-dsh-as-control",
  }), /direct-control executor cannot load DSH/u);
});

await check("wrong_price_policy_or_attempt_denominator_is_rejected", () => {
  const badPolicyJob = makeJob("direct_provider_control", {
    budget: {
      ...controlJob.budget,
      priceTableVersion: hashStarcraftTmgContract("wrong-price-policy"),
    },
  });
  assert.throws(() => compileStarcraftTmgOfflineSkillRoleProviderRequestV1({
    jobManifest: badPolicyJob,
    rolePacket: makeRolePacket("planner", 0),
    requestId: "wrong-price-policy-request",
  }), /outside the offline Provider broker policy/u);
  const badAttemptsJob = makeJob("direct_provider_control", {
    budget: { ...controlJob.budget, maxProviderAttempts: 8 },
  });
  assert.throws(() => createStarcraftTmgDirectSkillControlExecutorV1({
    broker,
    jobManifest: badAttemptsJob,
    workerRef: "provider-worker-wrong-attempt-count",
  }), /outside the offline Provider broker policy/u);
});

await check("incomplete_direct_session_cannot_close_green", () => {
  const incomplete = createStarcraftTmgDirectSkillControlExecutorV1({
    broker,
    jobManifest: controlJob,
    workerRef: "provider-worker-incomplete-session",
  });
  assert.throws(() => incomplete.finalize(), (error) => (
    error.code === "DIRECT_CONTROL_EXECUTION_INCOMPLETE"
  ));
});

await check("tampered_direct_session_is_rejected", () => {
  const tampered = clone(directSession);
  tampered.usage.totalTokens += 1;
  assert.throws(() => verifyStarcraftTmgDirectControlSessionV1(
    tampered,
    controlJob,
  ), /hash mismatch/u);
});

await check("definitely_not_sent_failure_costs_zero_and_cannot_retry", async () => {
  const failedWorker = fakeWorker({
    error: failureError({ definitelyNotSent: true }),
  });
  const failedGuard = createStarcraftTmgSkillCostGuardV1();
  const failedBroker = createStarcraftTmgOfflineSkillProviderBrokerV1({
    providerWorkerPort: failedWorker,
    costGuard: failedGuard,
  });
  const failedExecutor = createStarcraftTmgDirectSkillControlExecutorV1({
    broker: failedBroker,
    jobManifest: controlJob,
    workerRef: "provider-worker-definitely-not-sent",
  });
  await rejectsCode(() => failedExecutor.executeRole(
    makeRolePacket("planner", 0),
  ), "OFFLINE_PROVIDER_ATTEMPT_FAILED");
  const after = failedGuard.readSnapshot();
  assert.equal(after.cumulativeCostNanoUsd,
    costPolicy.historicalBaseline.calculatedCostNanoUsd);
  await rejectsCode(() => failedExecutor.executeRole(
    makeRolePacket("planner", 0),
  ), "DIRECT_CONTROL_EXECUTOR_CLOSED");
  assert.equal(failedWorker.calls.length, 1);
});

await check("ambiguous_failure_charges_forecast_and_cannot_retry", async () => {
  const failedWorker = fakeWorker({
    error: failureError({ definitelyNotSent: false }),
  });
  const failedGuard = createStarcraftTmgSkillCostGuardV1();
  const before = failedGuard.readSnapshot();
  const failedBroker = createStarcraftTmgOfflineSkillProviderBrokerV1({
    providerWorkerPort: failedWorker,
    costGuard: failedGuard,
  });
  await rejectsCode(() => failedBroker.completeRole({
    jobManifest: controlJob,
    workerRef: "provider-worker-ambiguous-failure",
    rolePacket: makeRolePacket("planner", 0),
    attemptId: "ambiguous-provider-attempt-001",
  }), "OFFLINE_PROVIDER_ATTEMPT_FAILED");
  const after = failedGuard.readSnapshot();
  assert(after.cumulativeCostNanoUsd > before.cumulativeCostNanoUsd);
  assert.equal(after.pendingAttempts, 0);
  assert.equal(failedWorker.calls.length, 1);
});

await check("unsafe_success_is_conservatively_accounted_and_rejected", async () => {
  const malformedWorker = fakeWorker({
    success: {
      output: {
        schemaVersion: "starcraft_tmg_offline_skill_role_output_v1",
        channels: {
          skill_generation_role_output: { role: "planner" },
          forbidden_extra_channel: {},
        },
      },
    },
  });
  const malformedGuard = createStarcraftTmgSkillCostGuardV1();
  const before = malformedGuard.readSnapshot();
  const malformedBroker = createStarcraftTmgOfflineSkillProviderBrokerV1({
    providerWorkerPort: malformedWorker,
    costGuard: malformedGuard,
  });
  await rejectsCode(() => malformedBroker.completeRole({
    jobManifest: controlJob,
    workerRef: "provider-worker-malformed-output",
    rolePacket: makeRolePacket("planner", 0),
    attemptId: "malformed-provider-attempt-001",
  }), "OFFLINE_PROVIDER_RESULT_REJECTED");
  const after = malformedGuard.readSnapshot();
  assert(after.cumulativeCostNanoUsd > before.cumulativeCostNanoUsd);
  assert.equal(after.pendingAttempts, 0);
});

await check("usage_over_role_budget_is_rejected_and_conservatively_accounted", async () => {
  const overWorker = fakeWorker({
    success: { inputUnits: 200_001, cacheHit: 0 },
  });
  const overGuard = createStarcraftTmgSkillCostGuardV1();
  const overBroker = createStarcraftTmgOfflineSkillProviderBrokerV1({
    providerWorkerPort: overWorker,
    costGuard: overGuard,
  });
  await rejectsCode(() => overBroker.completeRole({
    jobManifest: controlJob,
    workerRef: "provider-worker-over-budget",
    rolePacket: makeRolePacket("planner", 0),
    attemptId: "over-budget-provider-attempt-001",
  }), "OFFLINE_PROVIDER_RESULT_REJECTED");
  assert.equal(overGuard.readSnapshot().pendingAttempts, 0);
});

await check("no_rule_skill_memory_room_or_training_authority_is_granted", () => {
  assert.equal(directSession.canAffectRules, false);
  assert.equal(directSession.canAffectStrategy, false);
  assert.equal(directSession.mayPublishSkill, false);
  assert.equal(directSession.promotionEligible, false);
  assert.equal(directSession.trainingTruth, false);
  assert.equal(controlJob.mayReadOnlineRooms, false);
  assert.equal(controlJob.mayCallRulesMutation, false);
});

await check("slice_168_makes_no_external_provider_or_source_refresh", () => {
  assert.equal(costPolicy.sourceRefreshPerformed, false);
  assert.equal(worker.calls.length, 7);
  assert(worker.calls.every((request) => request.requestId
    .startsWith("skill-provider-")));
});

const reportBody = {
  schemaVersion:
    "starcraft_tmg_ticket_17_slice_168_skill_provider_broker_control_report_v1",
  generatedAt: GENERATED_AT,
  ticket: 17,
  slice: 168,
  status: failures.length ? "fail" : "pass",
  checks,
  summary: {
    total: checks.length,
    passed: checks.filter((row) => row.passed).length,
    failed: failures.length,
  },
  evidence: {
    providerProfileHash: profile.integrity.hash,
    providerEgressPolicyHash: resolvedProfile.egressBinding.policyHash,
    providerPricingSnapshotHash:
      costPolicy.providerPricingSnapshotHash,
    costPolicyHash: costPolicy.policyHash,
    directControlRuntimeHash: hashStarcraftTmgContract(
      STARCRAFT_TMG_DIRECT_CONTROL_RUNTIME_V1,
    ),
    directControlSessionHash: directSession.sessionHash,
    commonModelRoles: modelRoles.length,
    directControlFixtureCalls: worker.calls.length,
    physicalAttemptsPerRole: 1,
    automaticRetries: 0,
    externalProviderCalls: 0,
    sourceRefreshPerformed: false,
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
    cumulativeAuditedProviderTokens: 2_468,
    cumulativeAuditedProviderCostUsd: "0.00056232",
    nextNotificationThresholdCny: 100,
  },
  offlineSkillEvolution: {
    sourceBoundary:
      "slice164_current_official_task_staged_input_no_refresh",
    teachArtifactsGenerated: 0,
    questionTreeNodesRead: fixture.questionTree.nodes.length,
    candidateBundles: 0,
    mementoCandidates: 0,
    skillOptPatches: 0,
    heldOutScenariosRun: 0,
    completeGameAbRuns: 0,
    humanReviews: 0,
  },
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder"],
    skillsRead: 0,
    skillsGenerated: 0,
    judgeTestsRun: checks.length,
    crossTimeReplayResult: "not_run_broker_control_only",
    promotions: 0,
    blocks: [
      "real_dsh_executor_not_implemented_until_slice_169",
      "bounded_real_pair_not_authorized_until_slice_170",
      "ticket_18_evaluation_and_admin_promotion_required",
    ],
    remainingRuleGaps: [],
  },
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: ["rule_skill_builder_prompt"],
    harnessToolsCalled: ["offline_provider_complete_role"],
    uiTraceEvidence: null,
    agentDecisionEvidence: {
      directControlRoles: clone(modelRoles),
      commonPromptCompiler: true,
      realProviderUsed: false,
    },
    memoryTraceEvidence: { refs: [], writes: 0 },
    trainingTraceCandidates: 0,
    rollbackOrDemotionRules: [
      "missing_cost_notification_delivery_blocks_the_attempt",
      "any_provider_ambiguity_is_conservatively_charged_and_never_retried",
      "profile_prompt_tool_budget_or_pricing_drift_blocks_both_arms",
      "candidate_authority_remains_outside_the_provider_broker",
    ],
    userVisibleChecks: [],
  },
  authority: {
    candidateCreated: false,
    skillPublished: false,
    rulesChanged: false,
    roomOperated: false,
    memoryWritten: false,
    muzeroDataCreated: false,
    selfPlayRun: false,
    trainingTruthCreated: false,
  },
};
const report = envelope(reportBody, "reportHash");
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (failures.length) {
  console.error(JSON.stringify(report));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    report: path.relative(ROOT, REPORT_PATH),
    total: report.summary.total,
    passed: report.summary.passed,
    failed: report.summary.failed,
    reportHash: report.reportHash,
    evidence: report.evidence,
    externalUsage: report.externalUsage,
  }));
}
