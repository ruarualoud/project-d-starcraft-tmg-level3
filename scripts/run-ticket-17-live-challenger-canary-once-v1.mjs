#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_CHALLENGER_CANARY_V1 as execution } from
  "../content/skill-generation/ticket-17-slice-170-live-challenger-canary-v1.mjs";
import { STARCRAFT_TMG_TICKET_17_SLICE_170_PAIRED_PROOF_V1 as proof } from
  "../content/skill-generation/ticket-17-slice-170-paired-proof-v1.mjs";
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from
  "../content/skill-generation/offline-provider-profile-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { assertStarcraftTmgSkillGenerationCredentialFree } from
  "../packages/skill-generation/contracts-v1.mjs";
import {
  runStarcraftTmgChallengerCanaryV1,
  verifyStarcraftTmgChallengerCanaryV1,
} from "../packages/skill-generation-runtime/challenger-canary-v1.mjs";
import { createStarcraftTmgHowToPlaySkillStagedInputV1 } from
  "../packages/skill-generation-runtime/how-to-play-skill-input-v1.mjs";
import {
  createStarcraftTmgSkillCostGuardV1,
} from "../packages/skill-generation-runtime/provider-broker-v1.mjs";
import { createStarcraftTmgOfflineSkillProviderBrokerV5 } from
  "../packages/skill-generation-runtime/provider-broker-v5.mjs";
import { createStarcraftTmgProductionSkillCatalogueV1 } from
  "../packages/skill-generation-runtime/production-skill-catalogue-v1.mjs";
import {
  readStarcraftTmgDeepSeekCredentialFromKeychainV1,
  STARCRAFT_TMG_DEEPSEEK_DEV_KEYCHAIN_ITEM_V1 as keychainItem,
} from "../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs";
import { createStarcraftTmgProviderEgressWorkerPortV2 } from
  "../packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs";
import { createStarcraftTmgProviderProfileRegistryV1 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v1.mjs";
import { priceStarcraftTmgDeepSeekV4FlashUsageV1 } from
  "../packages/secure-provider-runtime/provider-pricing-v1.mjs";
import { loadCurrentOfficialSkillFixtureV1 } from
  "./support/current-official-skill-fixture-v1.mjs";
import { assertStarcraftTmgSkillProductionNotHeldV1 } from
  "../packages/skill-generation-runtime/production-review-hold-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUNNER_PATH = fileURLToPath(import.meta.url);
const BUILD_ROOT = path.join(
  ROOT,
  "build/ticket-17-slice-170-live-paired-skill-v1",
  execution.outputDirectoryName,
);
const PREFLIGHT_ROOT = path.join(ROOT, "build/ticket-17-skill-generation-v1");
const BASE_PREFLIGHT_PATH = path.join(
  PREFLIGHT_ROOT,
  "slice-170-preflight-report.json",
);
const CANARY_PREFLIGHT_PATH = path.join(
  PREFLIGHT_ROOT,
  "slice-170-challenger-canary-preflight-report.json",
);
const KEYCHAIN_PREFLIGHT_PATH = path.join(
  PREFLIGHT_ROOT,
  "slice-170-keychain-report.json",
);
const PRIOR_ROOT = path.join(
  ROOT,
  "build/ticket-17-slice-170-live-paired-skill-v1/how-to-play-attempt-7",
);
const LOCK_PATH = path.join(BUILD_ROOT, "one-call-attempt.lock.json");
const REPORT_PATH = path.join(BUILD_ROOT, "live-report.json");
const SAFE_RESULT_PATH = path.join(BUILD_ROOT, "canary-safe-result.json");
const FLAGS = new Set(execution.requiredFlags);
const IMPLEMENTATION_PATHS = [
  "packages/skill-generation-runtime/challenger-canary-v1.mjs",
  "packages/skill-generation-runtime/paired-skill-proof-v1.mjs",
  "packages/skill-generation-runtime/provider-broker-v5.mjs",
  "packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs",
  "packages/secure-provider-runtime/provider-egress-worker-child-v1-classified.mjs",
  "packages/secure-provider-runtime/provider-worker-success-classifier-v1.mjs",
];

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function envelope(body, field) {
  return { ...body, [field]: hashStarcraftTmgContract(body) };
}

function validEnvelope(value, field) {
  if (!value || typeof value !== "object") return false;
  const copy = clone(value);
  const observed = copy[field];
  delete copy[field];
  return observed === hashStarcraftTmgContract(copy);
}

async function jsonFile(pathname) {
  return JSON.parse(await readFile(pathname, "utf8"));
}

async function writeJsonAtomic(pathname, value) {
  const temporary = `${pathname}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporary, pathname);
}

async function implementationSourceHash() {
  const rows = await Promise.all(IMPLEMENTATION_PATHS.map(async (relativePath) => ({
    relativePath,
    sourceHash: hashStarcraftTmgContract(
      await readFile(path.join(ROOT, relativePath), "utf8"),
    ),
  })));
  return hashStarcraftTmgContract(rows);
}

function flagsAuthorized() {
  const values = process.argv.slice(2);
  return values.length === FLAGS.size
    && values.every((value) => FLAGS.has(value));
}

async function validBasePreflight() {
  try {
    const report = await jsonFile(BASE_PREFLIGHT_PATH);
    return validEnvelope(report, "reportHash")
      && report.status === "passed"
      && report.assertionsPassed === 21
      && report.assertionsTotal === 21
      && report.reportHash
        === execution.boundaryCorrection.realIpcPreflightReportHash
      && report.contractHash === proof.contractHash
      && report.externalProviderCalls === 0
      && report.checks.some((row) => row.id
        === "independent_v2_real_ipc_runs_all_seven_roles_on_both_arms"
        && row.passed === true)
      && report.checks.some((row) => row.id
        === "independent_v2_real_ipc_fault_matrix_is_classified_and_quarantined"
        && row.passed === true);
  } catch {
    return false;
  }
}

async function validCanaryPreflight() {
  try {
    const [report, runnerSource, basePreflight, currentImplementationHash] =
      await Promise.all([
      jsonFile(CANARY_PREFLIGHT_PATH),
      readFile(RUNNER_PATH, "utf8"),
      jsonFile(BASE_PREFLIGHT_PATH),
      implementationSourceHash(),
    ]);
    return validEnvelope(report, "reportHash")
      && report.status === "passed"
      && report.assertionsPassed === 8
      && report.assertionsTotal === 8
      && report.executionContractHash === execution.executionContractHash
      && report.basePreflightReportHash === basePreflight.reportHash
      && report.runnerSourceHash === hashStarcraftTmgContract(runnerSource)
      && report.implementationSourceHash === currentImplementationHash
      && report.externalProviderCalls === 0;
  } catch {
    return false;
  }
}

async function validKeychainPreflight() {
  try {
    const report = await jsonFile(KEYCHAIN_PREFLIGHT_PATH);
    return validEnvelope(report, "reportHash")
      && report.status === "passed"
      && report.assertionsPassed === 6
      && report.assertionsTotal === 6
      && report.ingressKind === "macos_login_keychain_generic_password"
      && report.chatCredentialAllowed === false
      && report.environmentCredentialAllowed === false
      && report.argumentCredentialAllowed === false
      && report.repositoryCredentialAllowed === false
      && report.externalProviderCalls === 0;
  } catch {
    return false;
  }
}

async function validPriorAttempt() {
  try {
    const [report, lock] = await Promise.all([
      jsonFile(path.join(PRIOR_ROOT, "live-report.json")),
      jsonFile(path.join(PRIOR_ROOT, "one-pair-attempt.lock.json")),
    ]);
    const prior = execution.priorParentValidationFailureAttempt;
    return validEnvelope(report, "reportHash")
      && validEnvelope(lock, "lockHash")
      && report.status === "failed"
      && report.runId === prior.runId
      && report.reportHash === prior.reportHash
      && report.failureCode === prior.failureCode
      && report.brokerFailureReceipt?.role === prior.failedRole
      && report.brokerFailureReceipt?.transportFailureClass
        === prior.transportFailureClass
      && report.providerWorkerCallsObserved
        === prior.providerWorkerCallsObserved
      && report.providerPhysicalAttemptsObserved
        === prior.physicalProviderAttemptsObserved
      && report.providerSuccessReceiptsBeforeFailure.length
        === prior.successfulProviderReceiptsObserved
      && report.providerObserved?.totals?.inputTokens
        === prior.successfulInputTokens
      && report.providerObserved?.totals?.outputTokens
        === prior.successfulOutputTokens
      && report.providerObserved?.totals?.totalTokens
        === prior.successfulTotalTokens
      && report.calculatedOrConservativeCostCny
        === (prior.attemptCalculatedOrConservativeCostCnyMicros
          / 1_000_000).toFixed(6)
      && report.candidatesPromoted === 0
      && lock.lockHash === prior.lockHash
      && lock.runId === prior.runId
      && lock.targetAttemptOrdinal === prior.targetAttemptOrdinal
      && lock.automaticRetryAllowed === false;
  } catch {
    return false;
  }
}

async function alreadyClaimed() {
  try {
    await readFile(LOCK_PATH);
    return true;
  } catch (error) {
    return error?.code !== "ENOENT";
  }
}

async function claimAttempt(runId, claimedAt) {
  await mkdir(BUILD_ROOT, { recursive: true, mode: 0o700 });
  let handle;
  try {
    handle = await open(LOCK_PATH, "wx", 0o600);
  } catch (error) {
    throw Object.assign(new Error("CHALLENGER_CANARY_ALREADY_CLAIMED"), {
      code: "CHALLENGER_CANARY_ALREADY_CLAIMED",
      cause: error,
    });
  }
  const body = {
    schemaVersion:
      "starcraft_tmg_ticket_17_slice_170_challenger_canary_lock_v1",
    purpose: execution.purpose,
    runId,
    proofContractHash: proof.contractHash,
    executionContractHash: execution.executionContractHash,
    claimedAt,
    maximumPhysicalProviderAttempts: 1,
    automaticRetryAllowed: false,
    rerunRequiresFreshUserAuthority: true,
    trainingTruth: false,
  };
  await handle.writeFile(`${JSON.stringify(envelope(body, "lockHash"), null, 2)}\n`);
  await handle.close();
}

function safeCode(error) {
  const code = String(error?.code || error?.message || "")
    .split(":")[0].toUpperCase();
  return /^[A-Z][A-Z0-9_]{2,95}$/u.test(code)
    ? code : "CHALLENGER_CANARY_FAILED";
}

async function main() {
  try {
    assertStarcraftTmgSkillProductionNotHeldV1();
  } catch (error) {
    console.error(error.code);
    process.exitCode = 2;
    return;
  }
  if (!flagsAuthorized()) {
    console.error("CHALLENGER_CANARY_EXPLICIT_AUTHORITY_REQUIRED");
    process.exitCode = 2;
    return;
  }
  if (!await validBasePreflight()) {
    console.error("CHALLENGER_CANARY_BASE_PREFLIGHT_REQUIRED");
    process.exitCode = 2;
    return;
  }
  if (!await validCanaryPreflight()) {
    console.error("CHALLENGER_CANARY_PREFLIGHT_REQUIRED");
    process.exitCode = 2;
    return;
  }
  if (!await validKeychainPreflight()) {
    console.error("CHALLENGER_CANARY_KEYCHAIN_PREFLIGHT_REQUIRED");
    process.exitCode = 2;
    return;
  }
  if (!await validPriorAttempt()) {
    console.error("CHALLENGER_CANARY_PRIOR_ATTEMPT_DRIFTED");
    process.exitCode = 2;
    return;
  }
  if (await alreadyClaimed()) {
    console.error("CHALLENGER_CANARY_ALREADY_CLAIMED");
    process.exitCode = 2;
    return;
  }

  const startedAt = new Date().toISOString();
  const runId = `slice170.canary.${randomUUID()}`;
  let credentialBytes = null;
  let keychainReceipt = null;
  let coreWorker = null;
  let attached = null;
  let broker = null;
  const observation = { calls: 0, receipts: [], failure: null };
  await claimAttempt(runId, startedAt);
  try {
    const keychainIngress =
      await readStarcraftTmgDeepSeekCredentialFromKeychainV1(keychainItem);
    credentialBytes = keychainIngress.credentialBytes;
    keychainReceipt = keychainIngress.receipt;
    const fixture = await loadCurrentOfficialSkillFixtureV1({ root: ROOT });
    const productionCatalogue =
      createStarcraftTmgProductionSkillCatalogueV1(fixture);
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
    if (resolved.ok !== true) throw Object.assign(
      new Error("CHALLENGER_CANARY_PROFILE_RESOLUTION_FAILED"),
      { code: "CHALLENGER_CANARY_PROFILE_RESOLUTION_FAILED" },
    );
    coreWorker = createStarcraftTmgProviderEgressWorkerPortV2({
      providerProfileRegistry: registry,
      maxWorkers: 1,
      maxOutputBytes: 256 * 1024,
      handshakeTimeoutMs: 5_000,
      shutdownGraceMs: 1_000,
    });
    const workerPort = Object.freeze({
      metadata: (...args) => coreWorker.metadata(...args),
      async complete(...args) {
        observation.calls += 1;
        if (observation.calls > 1) throw Object.assign(
          new Error("CHALLENGER_CANARY_CALL_LIMIT_EXCEEDED"),
          { code: "CHALLENGER_CANARY_CALL_LIMIT_EXCEEDED" },
        );
        try {
          const result = await coreWorker.complete(...args);
          observation.receipts.push(clone(result.usageReceipt));
          return result;
        } catch (error) {
          observation.failure = clone(error?.safeReceipt || null);
          throw error;
        }
      },
      readWorkerState: (...args) => coreWorker.readWorkerState(...args),
    });
    attached = await coreWorker.attachCredential({
      attachmentId: `slice170-canary-${randomUUID()}`,
      providerProfile: profile,
      credentialBytes,
    });
    if (attached.ok !== true || !credentialBytes.every((byte) => byte === 0)) {
      throw Object.assign(new Error("CHALLENGER_CANARY_ATTACH_FAILED"), {
        code: "CHALLENGER_CANARY_ATTACH_FAILED",
      });
    }
    const costGuard = createStarcraftTmgSkillCostGuardV1({
      initialCostNanoUsd: execution.costLedger.targetStartingNanoUsd,
      initialCnyMicros: execution.costLedger.targetStartingCnyMicros,
    });
    broker = createStarcraftTmgOfflineSkillProviderBrokerV5({
      providerWorkerPort: workerPort,
      costGuard,
      attemptBudgetCap: {
        maxInputTokens: execution.canary.maxInputTokens,
        maxOutputTokens: execution.canary.maxOutputTokens,
      },
    });
    const canary = await runStarcraftTmgChallengerCanaryV1({
      stagedInput,
      broker,
      workerRef: attached.workerRef,
      egressAllowlistHash: resolved.egressBinding.policyHash,
      createId: () => randomUUID(),
      now: () => new Date().toISOString(),
      startedAt,
      runId,
    });
    verifyStarcraftTmgChallengerCanaryV1(canary);
    if (observation.calls !== 1 || observation.receipts.length !== 1) {
      throw Object.assign(new Error("CHALLENGER_CANARY_DENOMINATOR_INVALID"), {
        code: "CHALLENGER_CANARY_DENOMINATOR_INVALID",
      });
    }
    const providerReceipt = observation.receipts[0];
    const pricingReceipt = priceStarcraftTmgDeepSeekV4FlashUsageV1({
      providerId: providerReceipt.providerId,
      requestedModel: providerReceipt.requestedModel,
      reportedModel: providerReceipt.reportedModel,
      startedAt: providerReceipt.startedAt,
      usage: providerReceipt.usage,
    });
    const costSnapshot = broker.readCostSnapshot();
    if (costSnapshot.cumulativeCostNanoUsd
        > execution.costLedger.maximumCumulativeNanoUsd
      || costSnapshot.cumulativeCnyMicros
        > execution.costLedger.maximumCumulativeCnyMicros) {
      throw Object.assign(new Error("CHALLENGER_CANARY_COST_LIMIT_EXCEEDED"), {
        code: "CHALLENGER_CANARY_COST_LIMIT_EXCEEDED",
      });
    }
    const body = {
      schemaVersion:
        "starcraft_tmg_ticket_17_slice_170_challenger_canary_live_report_v1",
      ticket: 17,
      slice: 170,
      status: "passed",
      runId,
      proofContractHash: proof.contractHash,
      executionContractHash: execution.executionContractHash,
      basePreflightReportHash: (await jsonFile(BASE_PREFLIGHT_PATH)).reportHash,
      canaryPreflightReportHash:
        (await jsonFile(CANARY_PREFLIGHT_PATH)).reportHash,
      priorAttemptReportHash:
        execution.priorParentValidationFailureAttempt.reportHash,
      keychainIngressReceipt: keychainReceipt,
      canary,
      providerReceipt,
      pricingReceipt,
      costSnapshot,
      inputTokens: providerReceipt.usage.inputUnits,
      outputTokens: providerReceipt.usage.outputUnits,
      totalTokens: providerReceipt.usage.totalUnits,
      calculatedCostNanoUsd: pricingReceipt.calculatedCostNanoUsd,
      calculatedCostCnyMicros: costSnapshot.cumulativeCnyMicros
        - execution.costLedger.targetStartingCnyMicros,
      providerPhysicalAttempts: 1,
      automaticRetries: 0,
      candidateEmissions: 0,
      candidatesPromoted: 0,
      selfPlayRuns: 0,
      muzeroExports: 0,
      sourceRefreshPerformed: false,
      parentInputZeroed: true,
      localInputPersisted: false,
      rawPromptPersisted: false,
      rawResponsePersisted: false,
      rawReasoningPersisted: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      trainingTruth: false,
    };
    const report = envelope(body, "reportHash");
    assertStarcraftTmgSkillGenerationCredentialFree(
      report,
      "live challenger canary report",
    );
    await writeJsonAtomic(SAFE_RESULT_PATH, canary);
    await writeJsonAtomic(REPORT_PATH, report);
    console.log(
      `Ticket 17 Slice 170 Challenger canary passed; attempts=1; tokens=${report.totalTokens}; costCny=${(report.calculatedCostCnyMicros / 1_000_000).toFixed(6)}; ${report.reportHash}`,
    );
  } catch (error) {
    const costSnapshot = broker?.readCostSnapshot?.() || null;
    const body = {
      schemaVersion:
        "starcraft_tmg_ticket_17_slice_170_challenger_canary_live_report_v1",
      ticket: 17,
      slice: 170,
      status: "failed",
      runId,
      proofContractHash: proof.contractHash,
      executionContractHash: execution.executionContractHash,
      priorAttemptReportHash:
        execution.priorParentValidationFailureAttempt.reportHash,
      failureCode: safeCode(error),
      providerWorkerCallsObserved: observation.calls,
      providerPhysicalAttemptsObserved:
        observation.failure?.physicalAttempts ?? observation.calls,
      providerFailureReceipt: observation.failure,
      brokerFailureReceipt: clone(error?.safeReceipt || null),
      providerSuccessReceiptHashes: observation.receipts
        .map((receipt) => receipt.receiptHash),
      keychainIngressReceipt: keychainReceipt,
      costSnapshot,
      calculatedOrConservativeCostNanoUsd: costSnapshot
        ? costSnapshot.cumulativeCostNanoUsd
          - execution.costLedger.targetStartingNanoUsd : null,
      calculatedOrConservativeCostCnyMicros: costSnapshot
        ? costSnapshot.cumulativeCnyMicros
          - execution.costLedger.targetStartingCnyMicros : null,
      automaticRetries: 0,
      rerunAllowedAutomatically: false,
      candidateEmissions: 0,
      candidatesPromoted: 0,
      selfPlayRuns: 0,
      muzeroExports: 0,
      sourceRefreshPerformed: false,
      localInputPersisted: false,
      rawPromptPersisted: false,
      rawResponsePersisted: false,
      rawReasoningPersisted: false,
      startedAt,
      failedAt: new Date().toISOString(),
      trainingTruth: false,
    };
    assertStarcraftTmgSkillGenerationCredentialFree(
      body,
      "failed challenger canary report",
    );
    await writeJsonAtomic(REPORT_PATH, envelope(body, "reportHash"))
      .catch(() => {});
    console.error(safeCode(error));
    process.exitCode = 1;
  } finally {
    credentialBytes?.fill(0);
    if (coreWorker && attached?.workerRef) {
      await coreWorker.detachCredential({
        workerRef: attached.workerRef,
        reason: "slice170_challenger_canary_finally",
      }).catch(() => {});
    }
    await coreWorker?.close().catch(() => {});
  }
}

if (process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
