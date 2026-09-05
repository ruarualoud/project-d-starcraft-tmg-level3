#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_CHALLENGER_CANARY_V1 as execution } from
  "../content/skill-generation/ticket-17-slice-170-live-challenger-canary-v1.mjs";
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from
  "../content/skill-generation/offline-provider-profile-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  runStarcraftTmgChallengerCanaryV1,
  verifyStarcraftTmgChallengerCanaryV1,
} from "../packages/skill-generation-runtime/challenger-canary-v1.mjs";
import { createStarcraftTmgHowToPlaySkillStagedInputV1 } from
  "../packages/skill-generation-runtime/how-to-play-skill-input-v1.mjs";
import {
  createStarcraftTmgSlice170SkillJobV1,
} from "../packages/skill-generation-runtime/paired-skill-proof-v1.mjs";
import {
  createStarcraftTmgSkillCostGuardV1,
} from "../packages/skill-generation-runtime/provider-broker-v1.mjs";
import { createStarcraftTmgOfflineSkillProviderBrokerV5 } from
  "../packages/skill-generation-runtime/provider-broker-v5.mjs";
import { createStarcraftTmgProductionSkillCatalogueV1 } from
  "../packages/skill-generation-runtime/production-skill-catalogue-v1.mjs";
import { createStarcraftTmgProviderEgressWorkerPortV2 } from
  "../packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs";
import { createStarcraftTmgProviderProfileRegistryV1 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v1.mjs";
import { loadCurrentOfficialSkillFixtureV1 } from
  "./support/current-official-skill-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = path.join(
  ROOT,
  "build/ticket-17-skill-generation-v1",
  "slice-170-challenger-canary-preflight-report.json",
);
const BASE_PREFLIGHT_PATH = path.join(
  ROOT,
  "build/ticket-17-skill-generation-v1/slice-170-preflight-report.json",
);
const RUNNER_PATH = path.join(
  ROOT,
  "scripts/run-ticket-17-live-challenger-canary-once-v1.mjs",
);
const FIXTURE_CHILD_PATH = path.join(
  ROOT,
  "scripts/fixtures/provider-egress-worker-ipc-fixture-v1.mjs",
);
const PRIOR_ROOT = path.join(
  ROOT,
  "build/ticket-17-slice-170-live-paired-skill-v1/how-to-play-attempt-7",
);
const IMPLEMENTATION_PATHS = [
  "packages/skill-generation-runtime/challenger-canary-v1.mjs",
  "packages/skill-generation-runtime/paired-skill-proof-v1.mjs",
  "packages/skill-generation-runtime/provider-broker-v5.mjs",
  "packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs",
  "packages/secure-provider-runtime/provider-egress-worker-child-v1-classified.mjs",
  "packages/secure-provider-runtime/provider-worker-success-classifier-v1.mjs",
];
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
  const observed = copy?.[field];
  assert(copy && typeof copy === "object");
  delete copy[field];
  assert.equal(observed, hashStarcraftTmgContract(copy));
}

async function check(id, operation) {
  try {
    await operation();
    checks.push({ id, passed: true });
  } catch (error) {
    const message = error instanceof Error
      ? error.stack || error.message : String(error);
    checks.push({ id, passed: false, error: message });
    failures.push(`${id}: ${message}`);
  }
}

function clock() {
  let ordinal = 0;
  return () => new Date(Date.UTC(2026, 8, 5, 10, 0, ordinal++))
    .toISOString();
}

function ids() {
  let ordinal = 0;
  return () => `fixture-${String(++ordinal).padStart(4, "0")}`;
}

function spawnFixture(mode) {
  return spawn(process.execPath, [FIXTURE_CHILD_PATH, mode], {
    shell: false,
    windowsHide: true,
    stdio: ["ignore", "ignore", "ignore", "ipc"],
    serialization: "advanced",
    env: { NODE_NO_WARNINGS: "1" },
  });
}

const fixture = await loadCurrentOfficialSkillFixtureV1({ root: ROOT });
const productionCatalogue = createStarcraftTmgProductionSkillCatalogueV1(fixture);
const stagedInput = createStarcraftTmgHowToPlaySkillStagedInputV1({
  ...fixture,
  productionCatalogue,
});
const registry = createStarcraftTmgProviderProfileRegistryV1({
  entries: [{ providerProfile: profile, completionPath: "/chat/completions" }],
  allowedProviders: ["deepseek-openai-compatible-direct"],
});
const resolved = await registry.resolveEgressBinding({
  profileRef: {
    id: profile.providerProfileId,
    version: profile.version,
    hash: profile.integrity.hash,
  },
});
assert.equal(resolved.ok, true);
const basePreflight = JSON.parse(await readFile(BASE_PREFLIGHT_PATH, "utf8"));
const priorReport = JSON.parse(await readFile(
  path.join(PRIOR_ROOT, "live-report.json"), "utf8"));
const priorLock = JSON.parse(await readFile(
  path.join(PRIOR_ROOT, "one-pair-attempt.lock.json"), "utf8"));
const runnerSource = await readFile(RUNNER_PATH, "utf8");
const implementationSources = await Promise.all(
  IMPLEMENTATION_PATHS.map(async (relativePath) => ({
    relativePath,
    sourceHash: hashStarcraftTmgContract(
      await readFile(path.join(ROOT, relativePath), "utf8"),
    ),
  })),
);
const implementationSourceHash = hashStarcraftTmgContract(
  implementationSources,
);

await check("canary_contract_freezes_attempt_seven_and_one_call_budget", () => {
  assert.equal(execution.ticket, 17);
  assert.equal(execution.slice, 170);
  assert.equal(execution.priorParentValidationFailureAttempt.targetAttemptOrdinal,
    7);
  assert.equal(execution.priorParentValidationFailureAttempt.successfulTotalTokens,
    19_102);
  assert.equal(execution.priorParentValidationFailureAttempt
    .attemptCalculatedOrConservativeCostCnyMicros, 3_565_626);
  assert.equal(execution.costLedger.targetStartingCnyMicros, 23_100_954);
  assert.equal(execution.canary.maximumPhysicalProviderAttempts, 1);
  assert.equal(execution.canary.maxInputTokens, 32_000);
  assert.equal(execution.canary.maxOutputTokens, 1_024);
  assert.equal(execution.canary.maximumForecastCostCnyMicros, 123_454);
  assert.equal(execution.costLedger.crossesNotificationThresholdAtMaximum,
    false);
  assert.match(execution.executionContractHash, /^[a-f0-9]{64}$/u);
});

await check("attempt_seven_report_and_lock_match_frozen_lineage", () => {
  verifyEnvelope(priorReport, "reportHash");
  verifyEnvelope(priorLock, "lockHash");
  const prior = execution.priorParentValidationFailureAttempt;
  assert.equal(priorReport.reportHash, prior.reportHash);
  assert.equal(priorLock.lockHash, prior.lockHash);
  assert.equal(priorReport.status, "failed");
  assert.equal(priorReport.runId, prior.runId);
  assert.equal(priorReport.brokerFailureReceipt.transportFailureClass,
    prior.transportFailureClass);
  assert.equal(priorReport.providerObserved.totals.totalTokens,
    prior.successfulTotalTokens);
  assert.equal(priorReport.calculatedOrConservativeCostCny, "3.565626");
  assert.equal(priorReport.candidatesPromoted, 0);
});

await check("base_preflight_proves_full_real_ipc_and_fault_matrix", () => {
  verifyEnvelope(basePreflight, "reportHash");
  assert.equal(basePreflight.status, "passed");
  assert.equal(basePreflight.assertionsPassed, 21);
  assert.equal(basePreflight.assertionsTotal, 21);
  assert.equal(basePreflight.reportHash,
    execution.boundaryCorrection.realIpcPreflightReportHash);
  assert(basePreflight.checks.some((row) => row.id
    === "independent_v2_real_ipc_runs_all_seven_roles_on_both_arms"
    && row.passed));
  assert(basePreflight.checks.some((row) => row.id
    === "independent_v2_real_ipc_fault_matrix_is_classified_and_quarantined"
    && row.passed));
  assert.equal(basePreflight.externalProviderCalls, 0);
});

await check("canary_job_retains_legacy_compile_budget_before_v5_cap", () => {
  const job = createStarcraftTmgSlice170SkillJobV1({
    arm: "direct_provider_control",
    stagedInput,
    egressAllowlistHash: resolved.egressBinding.policyHash,
    createdAt: "2026-09-05T10:00:00.000Z",
    budgetProfile: "challenger_canary_v1",
  });
  assert.equal(job.budget.maxProviderAttempts, 7);
  assert.equal(job.budget.maxInputTokens, 7_000_000);
  assert.equal(job.budget.maxOutputTokens, 7_168);
  assert.equal(job.budget.maxEstimatedCost, 4);
  assert.match(job.integrity.hash, /^[a-f0-9]{64}$/u);
});

await check("one_real_ipc_challenger_advances_role_graph_without_candidate", async () => {
  const port = createStarcraftTmgProviderEgressWorkerPortV2({
    providerProfileRegistry: registry,
    spawnProcess: () => spawnFixture("success"),
    maxWorkers: 1,
    maxOutputBytes: 256 * 1024,
  });
  let attached = null;
  try {
    attached = await port.attachCredential({
      attachmentId: "slice170-canary-success-fixture",
      providerProfile: profile,
      credentialBytes: Buffer.from("fixture-development-only", "utf8"),
    });
    const broker = createStarcraftTmgOfflineSkillProviderBrokerV5({
      providerWorkerPort: port,
      costGuard: createStarcraftTmgSkillCostGuardV1({
        initialCostNanoUsd: execution.costLedger.targetStartingNanoUsd,
        initialCnyMicros: execution.costLedger.targetStartingCnyMicros,
        now: clock(),
      }),
      now: clock(),
      attemptBudgetCap: {
        maxInputTokens: execution.canary.maxInputTokens,
        maxOutputTokens: execution.canary.maxOutputTokens,
      },
    });
    const result = await runStarcraftTmgChallengerCanaryV1({
      stagedInput,
      broker,
      workerRef: attached.workerRef,
      egressAllowlistHash: resolved.egressBinding.policyHash,
      createId: ids(),
      now: clock(),
      startedAt: "2026-09-05T10:00:00.000Z",
      runId: "slice170.canary.fixture.success",
    });
    assert.equal(verifyStarcraftTmgChallengerCanaryV1(result), true);
    assert.equal(result.providerAttempts, 1);
    assert.equal(result.roleGraphAdvancedTo, "reasoner");
    assert.equal(result.candidateEmissions, 0);
    assert.equal(result.budgetGrant.maxInputTokens, 32_000);
    assert.equal(result.budgetGrant.maxOutputTokens, 1_024);
  } finally {
    if (attached) await port.detachCredential({
      workerRef: attached.workerRef,
      reason: "slice170_canary_success_fixture_complete",
    });
    await port.close();
  }
});

await check("one_real_ipc_tamper_is_classified_without_second_call", async () => {
  const port = createStarcraftTmgProviderEgressWorkerPortV2({
    providerProfileRegistry: registry,
    spawnProcess: () => spawnFixture("receipt_hash"),
    maxWorkers: 1,
    maxOutputBytes: 256 * 1024,
  });
  let attached = null;
  try {
    attached = await port.attachCredential({
      attachmentId: "slice170-canary-failure-fixture",
      providerProfile: profile,
      credentialBytes: Buffer.from("fixture-development-only", "utf8"),
    });
    const broker = createStarcraftTmgOfflineSkillProviderBrokerV5({
      providerWorkerPort: port,
      costGuard: createStarcraftTmgSkillCostGuardV1({
        initialCostNanoUsd: execution.costLedger.targetStartingNanoUsd,
        initialCnyMicros: execution.costLedger.targetStartingCnyMicros,
        now: clock(),
      }),
      now: clock(),
      attemptBudgetCap: {
        maxInputTokens: execution.canary.maxInputTokens,
        maxOutputTokens: execution.canary.maxOutputTokens,
      },
    });
    await assert.rejects(runStarcraftTmgChallengerCanaryV1({
      stagedInput,
      broker,
      workerRef: attached.workerRef,
      egressAllowlistHash: resolved.egressBinding.policyHash,
      createId: ids(),
      now: clock(),
      startedAt: "2026-09-05T10:00:00.000Z",
      runId: "slice170.canary.fixture.failure",
    }), (error) => (
      error?.code === "OFFLINE_PROVIDER_ATTEMPT_FAILED"
        && error?.safeReceipt?.transportFailureClass
          === "PROVIDER_SUCCESS_RECEIPT_HASH_REJECTED"
        && error?.safeReceipt?.physicalAttempts === 1
        && error?.safeReceipt?.automaticRetries === 0
    ));
  } finally {
    if (attached) await port.detachCredential({
      workerRef: attached.workerRef,
      reason: "slice170_canary_failure_fixture_complete",
    });
    await port.close();
  }
});

await check("live_runner_checks_every_gate_before_keychain_ingress", () => {
  const ingress = runnerSource.indexOf(
    "await readStarcraftTmgDeepSeekCredentialFromKeychainV1");
  assert(ingress > 0);
  for (const gate of [
    "if (!flagsAuthorized())",
    "if (!await validBasePreflight())",
    "if (!await validCanaryPreflight())",
    "if (!await validKeychainPreflight())",
    "if (!await validPriorAttempt())",
    "if (await alreadyClaimed())",
    "await claimAttempt(runId, startedAt)",
  ]) assert(runnerSource.indexOf(gate) < ingress);
  assert(runnerSource.includes('open(LOCK_PATH, "wx", 0o600)'));
  assert(runnerSource.includes("observation.calls > 1"));
  assert(runnerSource.includes("maximumPhysicalProviderAttempts: 1"));
});

await check("live_runner_uses_keychain_only_and_persists_no_raw_payload", () => {
  assert(runnerSource.includes(
    "readStarcraftTmgDeepSeekCredentialFromKeychainV1"));
  assert(!runnerSource.includes("process.stdin"));
  assert(!runnerSource.includes("process.env."));
  assert(!/process\.argv[^\n]*(?:key|token|secret)/iu.test(runnerSource));
  assert(runnerSource.includes("credentialBytes?.fill(0)"));
  assert(runnerSource.includes("rawPromptPersisted: false"));
  assert(runnerSource.includes("rawResponsePersisted: false"));
  assert(runnerSource.includes("candidateEmissions: 0"));
  assert(runnerSource.includes("candidatesPromoted: 0"));
  assert(runnerSource.includes("sourceRefreshPerformed: false"));
});

const reportBody = {
  schemaVersion:
    "starcraft_tmg_ticket_17_slice_170_challenger_canary_preflight_report_v1",
  ticket: 17,
  slice: 170,
  status: failures.length === 0 ? "passed" : "failed",
  generatedAt: "2026-09-05T10:00:00.000Z",
  assertionsPassed: checks.filter((row) => row.passed).length,
  assertionsTotal: checks.length,
  checks,
  executionContractHash: execution.executionContractHash,
  basePreflightReportHash: basePreflight.reportHash,
  priorAttemptReportHash: priorReport.reportHash,
  priorAttemptLockHash: priorLock.lockHash,
  runnerSourceHash: hashStarcraftTmgContract(runnerSource),
  implementationSourceHash,
  maximumPhysicalProviderAttempts: 1,
  maximumForecastCostCnyMicros:
    execution.canary.maximumForecastCostCnyMicros,
  externalProviderCalls: 0,
  externalBillableTokens: 0,
  sourceRefreshPerformed: false,
  candidatesPromoted: 0,
  trainingTruth: false,
};
const report = envelope(reportBody, "reportHash");
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
