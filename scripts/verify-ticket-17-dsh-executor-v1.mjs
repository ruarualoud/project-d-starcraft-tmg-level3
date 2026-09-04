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
  assertStarcraftTmgSkillGenerationContract,
  createStarcraftTmgSkillGenerationJobManifest,
  STARCRAFT_TMG_DSH_BASELINE_V1,
} from "../packages/skill-generation/contracts-v1.mjs";
import {
  DSH_NPM_TARBALL_SHA256,
  DSH_PLUGIN_LOCK_HASH,
} from "../packages/skill-generation-runtime/dsh-pinned-runtime-v1.mjs";
import {
  STARCRAFT_TMG_DSH_CANDIDATE_TOOL_SCHEMA_HASH,
  STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_HASH,
  STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_V1,
  createStarcraftTmgDshSkillExecutorV1,
  verifyStarcraftTmgDshExecutionSessionV1,
} from "../packages/skill-generation-runtime/dsh-skill-executor-v1.mjs";
import {
  createDisposableOsSkillRunnerV1,
  verifyDisposableOsMediatedJobReceiptV1,
} from "../packages/skill-generation-runtime/disposable-os-runner-v1.mjs";
import {
  STARCRAFT_TMG_SKILL_COST_POLICY_V1 as costPolicy,
  createStarcraftTmgOfflineSkillProviderBrokerV1,
  createStarcraftTmgSkillCostGuardV1,
} from "../packages/skill-generation-runtime/provider-broker-v1.mjs";
import {
  runTeachCtx2SkillRoleGraphV1,
  verifyTeachCtx2SkillRunResultV1,
} from "../packages/skill-generation-runtime/teach-ctx2skill-role-graph-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV1 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v1.mjs";
import { loadCurrentOfficialSkillFixtureV1 } from
  "./support/current-official-skill-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = path.join(
  ROOT,
  "build/ticket-17-skill-generation-v1/slice-169-report.json",
);
const GENERATED_AT = "2026-09-04T18:00:00.000Z";
const RUN_ID = "run.slice169.dsh.executor.1";
const checks = [];
const failures = [];

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function envelope(body, field) {
  return { ...body, [field]: hashStarcraftTmgContract(body) };
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

function clock() {
  let second = 0;
  return () => new Date(Date.UTC(2026, 8, 4, 18, 0, second++))
    .toISOString();
}

const fixture = await loadCurrentOfficialSkillFixtureV1({ root: ROOT });
const task = fixture.curriculum.tasks.find((row) => (
  row.family === "how_to_play" && row.generationEligible
));
assert(task);
const stagedInput = fixture.stage(task.taskId);
const primaryEvidenceId = stagedInput.evidence.find((row) => (
  row.kind === "current_rule_atom"
))?.evidenceId || stagedInput.evidence[0].evidenceId;

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

const job = createStarcraftTmgSkillGenerationJobManifest({
  jobId: "skill-job-slice169-dsh",
  executionArm: "dsh",
  roleRoute: "rule_skill_builder",
  skillType: "turn_flow",
  objective: "Generate one bounded current-official how-to-play candidate.",
  rulesVersion: stagedInput.bindings.rules.rulesVersion,
  dataVersion: stagedInput.bindings.source.normalizedDatasetHash,
  sourceSnapshotRefs: [{
    sourceId: "starcraft-tmg.current-official-composite",
    snapshotId: "starcraft-tmg.current-official-composite.slice169",
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
  runtime: {
    packageName: STARCRAFT_TMG_DSH_BASELINE_V1.packageName,
    version: STARCRAFT_TMG_DSH_BASELINE_V1.version,
    commit: STARCRAFT_TMG_DSH_BASELINE_V1.commit,
    packageIntegrityHash: DSH_NPM_TARBALL_SHA256,
    effectiveConfigHash: STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_HASH,
    pluginLockHash: DSH_PLUGIN_LOCK_HASH,
    profileName: "project-d-starcraft-skill-isolated-v1",
    sessionFormatVersion: "0",
    internalRetries: 0,
  },
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
    schemaHash: STARCRAFT_TMG_DSH_CANDIDATE_TOOL_SCHEMA_HASH,
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
    schedulerJobId: "scheduler-slice169-dsh",
    attempt: 1,
    leaseId: "lease-slice169-dsh",
    fenceTokenHash: hashStarcraftTmgContract("fence-slice169-dsh"),
  },
  outputSchemaHash: hashStarcraftTmgContract(
    "starcraft-tmg-teach-ctx2skill-candidate-v1",
  ),
  createdAt: GENERATED_AT,
});

function claim(input = {}) {
  return {
    claimId: input.claimId,
    claimType: input.claimType || "legality",
    statement: input.statement || `Bounded current-rule claim for ${input.claimId}.`,
    evidenceIds: input.evidenceIds || [primaryEvidenceId],
    advisoryOnly: input.advisoryOnly ?? false,
    ...(input.supersedesClaimId ? {
      supersedesClaimId: input.supersedesClaimId,
      correctionTargetId: input.correctionTargetId,
    } : {}),
  };
}

function roleOutput(role, packet) {
  const contextReceipts = packet.contextReceipts;
  if (role === "planner") return {
    summary: "Plan one source-bounded rule lesson.",
    questions: [{
      questionId: "question.rule.boundary",
      prompt: "What is the rule, its precondition, and rejection boundary?",
      evidenceIds: [primaryEvidenceId],
    }],
    learningObjectives: ["State the supported rule without extending it."],
  };
  if (role === "tutor") return {
    summary: "Teach the supported rule and expose a boundary.",
    claims: [
      claim({ claimId: "claim.rule.core" }),
      claim({ claimId: "claim.rule.boundary" }),
    ],
    lessonSteps: [{
      stepId: "lesson.rule.core",
      summary: "Read the current RuleAtom and preserve its boundary.",
      claimIds: ["claim.rule.core", "claim.rule.boundary"],
    }],
  };
  if (role === "student") return {
    summary: "Answer the planned question from taught claims.",
    claims: [],
    answers: [{
      questionId: "question.rule.boundary",
      answerSummary: "The action is legal only inside the cited RuleAtom.",
      claimIds: ["claim.rule.core", "claim.rule.boundary"],
    }],
    uncertainties: [],
  };
  if (role === "challenger") return {
    summary: "Probe the stated legality boundary.",
    probes: [{
      probeId: "probe.illegal.boundary",
      kind: "illegal_boundary",
      targetClaimId: "claim.rule.boundary",
      prompt: "Does the statement reject material outside the denominator?",
    }],
  };
  if (role === "reasoner") return {
    summary: "Resolve the probe without hidden reasoning.",
    claims: [claim({ claimId: "claim.rule.scope" })],
    resolutions: [{
      probeId: "probe.illegal.boundary",
      disposition: "conceded",
      decisionSummary: "The first boundary wording needs correction.",
      claimIds: ["claim.rule.boundary", "claim.rule.scope"],
    }],
  };
  if (role === "proposer") {
    const factJudge = contextReceipts.find((row) => row.role === "fact_judge");
    const failed = factJudge.output.verdicts.find((row) => (
      row.claimId === "claim.rule.boundary"
    ));
    return {
      summary: "Bind the failed boundary to one revision target.",
      revisionTargets: [{
        targetId: "revision.rule.boundary.v1",
        targetClaimId: failed.claimId,
        targetClaimHash: failed.claimHash,
        factJudgeReceiptHash: factJudge.receiptHash,
        failureCodes: failed.failureCodes,
        patchSummary: "Replace the broad boundary with the exact RuleAtom.",
      }],
      candidatePlan: {
        skillId: `skill.${stagedInput.task.subjectId.replaceAll(":", ".")}`,
        version: "0.1.0-candidate.1",
        skillType: "turn_flow",
        title: `How to play: ${stagedInput.task.label}`,
        focusClaimIds: ["claim.rule.core", "claim.rule.scope"],
      },
    };
  }
  if (role === "generator") {
    const plan = contextReceipts.find((row) => row.role === "proposer")
      .output.candidatePlan;
    return {
      summary: "Materialize one unreviewed candidate after correction.",
      claims: [claim({
        claimId: "claim.rule.boundary.v2",
        supersedesClaimId: "claim.rule.boundary",
        correctionTargetId: "revision.rule.boundary.v1",
        statement: "The skill applies only to the exact cited denominator.",
      })],
      candidateDraft: {
        skillId: plan.skillId,
        version: plan.version,
        skillType: plan.skillType,
        title: plan.title,
        summary: "A current-source-bounded how-to-play candidate.",
        claimIds: ["claim.rule.core", "claim.rule.scope", "claim.rule.boundary.v2"],
        procedure: ["Read the current RuleAtom before proposing an action."],
        legalityChecks: ["Ask the authoritative Rules service for legality."],
        illegalPatterns: ["Do not extend beyond the cited RuleAtom."],
        examples: ["Use an action returned by current LegalSpace."],
        counterExamples: ["Reject an invented action absent from LegalSpace."],
        judgeTests: [
          {
            testId: "judge.positive.current",
            kind: "positive",
            claimIds: ["claim.rule.core", "claim.rule.scope"],
            expected: "pass",
          },
          {
            testId: "judge.negative.boundary",
            kind: "negative",
            claimIds: ["claim.rule.boundary.v2"],
            expected: "reject",
          },
        ],
        unresolvedClaims: [],
      },
    };
  }
  throw new Error(`unknown role: ${role}`);
}

function fakeWorker() {
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
    async complete({ providerRequest }) {
      calls.push(clone(providerRequest));
      const ordinal = calls.length;
      const prompt = providerRequest.promptNodes[0];
      const outputValue = roleOutput(prompt.roleRequest.role, {
        stagedInput: prompt.stagedInput,
        contextReceipts: prompt.contextReceipts,
      });
      const output = {
        schemaVersion: "starcraft_tmg_offline_skill_role_output_v1",
        channels: { skill_generation_role_output: outputValue },
      };
      const inputUnits = 100 + ordinal;
      const outputUnits = 20 + ordinal;
      const cacheHit = 10;
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
        providerRequestIdHash: hashStarcraftTmgContract(`slice169-${ordinal}`),
        providerSystemFingerprintHash: hashStarcraftTmgContract("fixture-model"),
        status: 200,
        usage: {
          inputUnits,
          outputUnits,
          totalUnits: inputUnits + outputUnits,
          inputCacheHitUnits: cacheHit,
          inputCacheMissUnits: inputUnits - cacheHit,
          reasoningOutputUnits: ordinal,
        },
        responseFingerprint: hashStarcraftTmgContract(output),
        dnsAddressSetHash: hashStarcraftTmgContract(["93.184.216.34"]),
        tlsServerName: "api.deepseek.com",
        tlsCertificateVerificationDisabled: false,
        redirectFollowed: false,
        proxyUsed: false,
        physicalAttempts: 1,
        automaticRetries: 0,
        startedAt: `2026-09-04T18:01:${String(ordinal).padStart(2, "0")}.000Z`,
        finishedAt: `2026-09-04T18:01:${String(ordinal + 1).padStart(2, "0")}.000Z`,
        trainingTruth: false,
      };
      return { output, usageReceipt: envelope(receiptBody, "receiptHash") };
    },
  };
}

async function judgeClaim(packet) {
  const failed = packet.phase === "fact_judge"
    && packet.claim.claimId === "claim.rule.boundary";
  return {
    passed: !failed,
    failureCodes: failed ? ["MISSING_NEGATIVE_BOUNDARY"] : [],
    findingCodes: failed ? ["REVISION_REQUIRED"] : ["CURRENT_EVIDENCE_MATCH"],
    evaluator: {
      id: "current-rules-fact-judge",
      version: "1.0.0",
      hash: hashStarcraftTmgContract("slice169-fact-judge"),
      independentContext: true,
    },
  };
}

async function replayCandidate(packet) {
  return {
    passed: true,
    failureCodes: [],
    replayedJudgeTestIds: packet.candidate.skillArtifact.judgeTests
      .map((test) => test.testId),
    currentBinding: packet.currentBinding,
    evaluator: {
      id: "current-rules-cross-time-replay",
      version: "1.0.0",
      hash: hashStarcraftTmgContract("slice169-cross-time"),
      independentContext: true,
    },
  };
}

await check("executor_config_is_hash_bound_and_capability_minimal", () => {
  assert.equal(hashStarcraftTmgContract(STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_V1),
    STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_HASH);
  assert.deepEqual(STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_V1.directProviderPlugins, []);
  assert.deepEqual(STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_V1.processTools, []);
  assert.deepEqual(STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_V1.networkTools, []);
  assert.deepEqual(STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_V1.subagents, []);
});

const worker = fakeWorker();
const broker = createStarcraftTmgOfflineSkillProviderBrokerV1({
  providerWorkerPort: worker,
  costGuard: createStarcraftTmgSkillCostGuardV1({ now: clock() }),
  now: clock(),
});
let id = 0;
const executor = await createStarcraftTmgDshSkillExecutorV1({
  repositoryRoot: ROOT,
  jobManifest: job,
  broker,
  workerRef: "provider-worker-slice169",
  createId: (label) => `${label}.${++id}`,
  now: clock(),
  startedAt: GENERATED_AT,
});

let graphResult;
let bundle;
await check("real_dsh_agents_execute_all_seven_model_roles", async () => {
  graphResult = await runTeachCtx2SkillRoleGraphV1({
    runId: RUN_ID,
    stagedInput,
    executeRole: executor.executeRole,
    judgeClaim,
    replayCandidate,
    emitCandidate: executor.emitCandidate,
  });
  assert.equal(worker.calls.length, 7);
  assert.deepEqual(executor.readState().completedRoles, [
    "planner", "tutor", "student", "challenger", "reasoner", "proposer",
    "generator",
  ]);
  assert.equal(executor.readState().candidateEmissions, 1);
});

await check("legacy_role_graph_remains_independently_reconstructable", () => {
  assert.equal(verifyTeachCtx2SkillRunResultV1(graphResult, stagedInput), true);
  assert.equal(graphResult.candidate.status, "candidate_unreviewed");
  assert.equal(graphResult.counts.candidateEmissions, 1);
});

await check("complete_dsh_run_receipt_and_candidate_bundle_are_emitted", () => {
  bundle = executor.finalize({ roleGraphResult: graphResult, stagedInput });
  assertStarcraftTmgSkillGenerationContract(
    bundle.candidateBundle,
    "candidate-skill-bundle",
  );
  assertStarcraftTmgSkillGenerationContract(bundle.runReceipt, "run-receipt");
  assert.equal(bundle.runReceipt.disposition, "candidate_emitted");
  assert.equal(bundle.runReceipt.dshSessionId,
    bundle.executionSession.sessionId);
  assert.equal(bundle.runReceipt.candidateBundleHash,
    bundle.candidateBundle.integrity.hash);
});

await check("execution_session_is_independently_hash_and_lineage_verified", () => {
  assert.equal(verifyStarcraftTmgDshExecutionSessionV1(
    bundle.executionSession,
    job,
    bundle.isolationAttestation,
  ), true);
  assert.equal(bundle.executionSession.roleExecutions.length, 7);
  assert.equal(bundle.executionSession.candidateEmission.invocationCount, 1);
});

await check("every_dsh_role_uses_one_host_broker_relay_and_no_direct_network", () => {
  for (const execution of bundle.executionSession.roleExecutions) {
    assert.equal(execution.osIsolationReceipt.bridge.requestCount, 1);
    assert.equal(execution.osIsolationReceipt.capabilities.providerBrokerMounted,
      false);
    assert.equal(execution.osIsolationReceipt.capabilities
      .hostMediatedProviderBridge, true);
    assert.equal(execution.osIsolationReceipt.capabilities.directNetworkAllowed,
      false);
    assert.equal(execution.providerReceipt.physicalAttempts, 1);
    assert.equal(execution.providerReceipt.automaticRetries, 0);
  }
});

await check("real_dsh_sessions_are_redacted_and_usage_complete", () => {
  const serialized = JSON.stringify(bundle.executionSession);
  assert.equal(serialized.includes("Execute sealed role"), false);
  assert.equal(serialized.includes("Plan one source-bounded rule lesson"), false);
  assert.equal(serialized.includes("promptNodes"), false);
  assert.equal(serialized.includes("provider-worker-slice169"), false);
  assert(bundle.executionSession.roleExecutions.every((execution) => (
    execution.dshSession.eventTypeCounts["assistant/message"] === 1
    && execution.dshSession.usage.totalTokens
      === execution.providerReceipt.usage.totalTokens
  )));
});

await check("candidate_tool_is_a_real_two_step_dsh_session_call_once", () => {
  const candidate = bundle.executionSession.candidateEmission;
  assert.equal(candidate.dshSession.eventTypeCounts["tool/call"], 1);
  assert.equal(candidate.dshSession.eventTypeCounts["tool/result"], 1);
  assert.equal(candidate.dshSession.eventTypeCounts["step/start"], 2);
  assert.equal(candidate.toolAck.candidateOnly, true);
  assert.equal(candidate.toolAck.mayPublishSkill, false);
  assert.equal(candidate.toolAck.canAffectRules, false);
  assert.equal(candidate.toolAck.trainingTruth, false);
});

await check("provider_token_cache_and_cost_ledgers_close_exactly", () => {
  assert.equal(bundle.executionSession.providerAttempts, 7);
  assert.equal(bundle.executionSession.retryEvents, 0);
  assert.equal(bundle.executionSession.usage.inputTokens, 728);
  assert.equal(bundle.executionSession.usage.outputTokens, 168);
  assert.equal(bundle.executionSession.usage.cacheHitTokens, 70);
  assert.equal(bundle.executionSession.usage.cacheMissTokens, 658);
  assert.equal(bundle.executionSession.usage.totalTokens, 896);
  assert(bundle.executionSession.calculatedCostNanoUsd > 0);
  assert(bundle.executionSession.calculatedCostCnyMicros > 0);
  assert.equal(bundle.runReceipt.totalInputTokens, 728);
});

await check("candidate_and_run_stay_non_authoritative_until_ticket_18", () => {
  assert.equal(bundle.candidateBundle.candidateStatus, "candidate_unreviewed");
  assert.equal(bundle.candidateBundle.promotionEligible, false);
  assert.equal(bundle.candidateBundle.canAffectRules, false);
  assert.equal(bundle.runReceipt.promotionAttempted, false);
  assert.equal(bundle.runReceipt.promotionEligible, false);
  assert.equal(bundle.runReceipt.trainingTruth, false);
});

await check("tampered_dsh_execution_session_fails_closed", () => {
  const tampered = clone(bundle.executionSession);
  tampered.usage.totalTokens += 1;
  assert.throws(() => verifyStarcraftTmgDshExecutionSessionV1(
    tampered,
    job,
    bundle.isolationAttestation,
  ), /hash mismatch/u);
});

await check("tampered_cost_grant_fails_after_outer_session_is_resealed", () => {
  const tampered = clone(bundle.executionSession);
  tampered.roleExecutions[0].costGrant.grantHash = "0".repeat(64);
  delete tampered.sessionHash;
  tampered.sessionHash = hashStarcraftTmgContract(tampered);
  assert.throws(() => verifyStarcraftTmgDshExecutionSessionV1(
    tampered,
    job,
    bundle.isolationAttestation,
  ), /cost grant hash mismatch/u);
});

await check("second_candidate_emission_is_rejected_without_another_tool_call", async () => {
  await assert.rejects(() => executor.emitCandidate({}),
    /DSH_CANDIDATE_EMISSION_CARDINALITY_INVALID/u);
  assert.equal(bundle.executionSession.candidateEmission.invocationCount, 1);
});

await check("candidate_emission_before_role_and_gate_closure_is_rejected", async () => {
  const isolatedWorker = fakeWorker();
  const isolatedExecutor = await createStarcraftTmgDshSkillExecutorV1({
    repositoryRoot: ROOT,
    jobManifest: job,
    broker: createStarcraftTmgOfflineSkillProviderBrokerV1({
      providerWorkerPort: isolatedWorker,
      costGuard: createStarcraftTmgSkillCostGuardV1(),
    }),
    workerRef: "provider-worker-slice169-early-emission",
  });
  await assert.rejects(() => isolatedExecutor.emitCandidate({}),
    /DSH_CANDIDATE_EMISSION_CARDINALITY_INVALID/u);
  assert.equal(isolatedWorker.calls.length, 0);
});

const SMALL_RELAY_WORKER = String.raw`import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
const [requestPath, responsePath] = process.argv.slice(2);
const input = JSON.parse(await readFile(requestPath, "utf8"));
const bridge = path.join(path.dirname(responsePath), "bridge");
const requestFile = path.join(bridge, "request-000001.json");
const temp = path.join(bridge, ".request-000001.json.tmp");
await writeFile(temp, JSON.stringify(input.bridgeRequest) + "\n");
await rename(temp, requestFile);
let response;
for (;;) {
  try { response = JSON.parse(await readFile(path.join(bridge, "response-000001.json"), "utf8")); break; }
  catch (error) { if (error.code !== "ENOENT") throw error; await new Promise((resolve) => setTimeout(resolve, 5)); }
}
await writeFile(responsePath, JSON.stringify({ ok: response.ok === true }), "utf8");
`;

const relayRunner = createDisposableOsSkillRunnerV1({ repositoryRoot: ROOT });
const relayAttestation = await relayRunner.attest();
await check("mediated_runner_hashes_one_bounded_request_response_pair", async () => {
  const result = await relayRunner.runMediated({
    jobId: "slice169-small-relay-success",
    attestationHash: relayAttestation.attestationHash,
    entrySource: SMALL_RELAY_WORKER,
    stagedInput: {
      bridgeRequest: { schemaVersion: "fixture_bridge_v1", value: "safe" },
    },
    bridge: {
      maximumRequests: 1,
      async handler(request, context) {
        assert.equal(context.ordinal, 1);
        assert.equal(request.value, "safe");
        return { ok: true };
      },
    },
  });
  assert.equal(result.output.ok, true);
  assert.equal(result.receipt.bridge.requestCount, 1);
  assert.equal(verifyDisposableOsMediatedJobReceiptV1(
    result.receipt,
    relayAttestation,
  ), result.receipt);
});

const SECRET_BRIDGE_WORKER = SMALL_RELAY_WORKER.replace(
  "await writeFile(temp, JSON.stringify(input.bridgeRequest) + \"\\n\");",
  String.raw`const field = "author" + "ization";
const marker = "Bear" + "er ";
const material = "abcdefghijkl" + "mnopqrstuvwxyz";
input.bridgeRequest[field] = marker + material;
await writeFile(temp, JSON.stringify(input.bridgeRequest) + "\n");`,
);
await check("credential_shaped_bridge_request_never_reaches_handler", async () => {
  let calls = 0;
  await assert.rejects(() => relayRunner.runMediated({
    jobId: "slice169-small-relay-secret",
    attestationHash: relayAttestation.attestationHash,
    entrySource: SECRET_BRIDGE_WORKER,
    stagedInput: {
      bridgeRequest: {
        schemaVersion: "fixture_bridge_v1",
      },
    },
    bridge: {
      maximumRequests: 1,
      async handler() { calls += 1; return { ok: true }; },
    },
  }), /ISOLATION_BRIDGE_REQUEST_INVALID/u);
  assert.equal(calls, 0);
});

const TWO_REQUEST_WORKER = SMALL_RELAY_WORKER.replace(
  "await writeFile(responsePath, JSON.stringify({ ok: response.ok === true }), \"utf8\");",
  String.raw`const second = path.join(bridge, "request-000002.json");
await writeFile(second, JSON.stringify({ schemaVersion: "fixture_bridge_v1", value: "second" }) + "\n");
await new Promise(() => {});`,
);
await check("bridge_cardinality_escape_kills_child_and_does_not_retry", async () => {
  let calls = 0;
  await assert.rejects(() => relayRunner.runMediated({
    jobId: "slice169-small-relay-cardinality",
    attestationHash: relayAttestation.attestationHash,
    entrySource: TWO_REQUEST_WORKER,
    stagedInput: {
      bridgeRequest: { schemaVersion: "fixture_bridge_v1", value: "first" },
    },
    bridge: {
      maximumRequests: 1,
      async handler() { calls += 1; return { ok: true }; },
    },
    timeoutMs: 1_000,
  }), /ISOLATION_BRIDGE_CARDINALITY_EXCEEDED/u);
  assert.equal(calls, 1);
});

await check("bridge_worker_crash_and_timeout_fail_closed", async () => {
  await assert.rejects(() => relayRunner.runMediated({
    jobId: "slice169-small-relay-crash",
    attestationHash: relayAttestation.attestationHash,
    entrySource: "process.exit(9);",
    stagedInput: { safe: true },
    bridge: { maximumRequests: 1, async handler() { return { ok: true }; } },
  }), /ISOLATION_WORKER_EXIT_INVALID|ISOLATION_BRIDGE_RECEIPT_INVALID/u);
  await assert.rejects(() => relayRunner.runMediated({
    jobId: "slice169-small-relay-timeout",
    attestationHash: relayAttestation.attestationHash,
    entrySource: "await new Promise(() => {});",
    stagedInput: { safe: true },
    bridge: { maximumRequests: 1, async handler() { return { ok: true }; } },
    timeoutMs: 100,
  }), /ISOLATION_WORKER_TIMEOUT|ISOLATION_BRIDGE_RECEIPT_INVALID/u);
});

await check("slice169_uses_no_external_provider_or_source_refresh", () => {
  assert.equal(worker.calls.length, 7);
  assert.equal(costPolicy.sourceRefreshPerformed, false);
  assert.equal(bundle.executionSession.calculatedCostNanoUsd > 0, true);
  assert.equal(bundle.executionSession.roleExecutions.every((execution) => (
    execution.providerReceipt.providerRequestHash.length === 64
  )), true);
});

const reportBody = {
  schemaVersion: "starcraft_tmg_ticket_17_slice_169_dsh_executor_report_v1",
  generatedAt: GENERATED_AT,
  ticket: 17,
  slice: 169,
  status: failures.length ? "fail" : "pass",
  checks,
  summary: {
    total: checks.length,
    passed: checks.filter((row) => row.passed).length,
    failed: failures.length,
  },
  evidence: {
    dshVersion: STARCRAFT_TMG_DSH_BASELINE_V1.version,
    dshExecutorConfigHash: STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_HASH,
    candidateToolSchemaHash: STARCRAFT_TMG_DSH_CANDIDATE_TOOL_SCHEMA_HASH,
    roleGraphRunHash: graphResult?.runHash || null,
    dshExecutionSessionHash: bundle?.executionSession?.sessionHash || null,
    candidateBundleHash: bundle?.candidateBundle?.integrity?.hash || null,
    runReceiptHash: bundle?.runReceipt?.integrity?.hash || null,
    realDshRoleSessions: bundle?.executionSession?.roleExecutions?.length || 0,
    realDshCandidateToolSessions: bundle ? 1 : 0,
    providerBridgeRequests: bundle?.executionSession?.roleExecutions
      ?.reduce((sum, execution) => (
        sum + execution.osIsolationReceipt.bridge.requestCount
      ), 0) || 0,
    candidateToolCalls: bundle?.executionSession?.candidateEmission
      ?.invocationCount || 0,
    physicalProviderAttempts: bundle?.executionSession?.providerAttempts || 0,
    automaticRetries: bundle?.executionSession?.retryEvents || 0,
    fixtureProviderCalls: worker.calls.length,
    externalProviderCalls: 0,
    externalInputTokens: 0,
    externalOutputTokens: 0,
    externalCacheHitTokens: 0,
    externalCacheMissTokens: 0,
    externalTotalTokens: 0,
    externalEstimatedCostUsd: "0.00000000",
    externalEstimatedCostCny: "0.00",
    sourceRefreshPerformed: false,
    promotions: 0,
    trainingTruth: false,
  },
  offlineSkillEvolution: {
    sourceBoundary: "slice164_current_official_task_staged_input",
    dshExecutorUsed: true,
    candidateBundles: bundle ? 1 : 0,
    candidatesPromoted: 0,
    heldOutScenariosRun: 0,
    completeGameAbRuns: 0,
    humanReviews: 0,
  },
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    actualHarness: "@deepseek-ai/dsh@0.1.1-rc.2",
    providerBoundary: "host_mediated_file_relay_to_ticket16_worker",
    promptPackRoutes: ["rule_skill_builder_prompt"],
    harnessToolsCalled: ["emit_candidate_skill"],
    memoryTraceEvidence: { refs: [], writes: 0 },
    trainingTraceCandidates: 0,
    blocks: [
      "real_paired_dsh_vs_control_generation_waits_for_slice_170",
      "candidate_requires_ticket_18_evaluation_and_admin_promotion",
    ],
  },
};
const report = {
  ...reportBody,
  reportHash: hashStarcraftTmgContract(reportBody),
};
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
