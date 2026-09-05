#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  STARCRAFT_TMG_SLICE_170_BLIND_EVALUATION_V1 as evaluationContract,
  STARCRAFT_TMG_TICKET_17_SLICE_170_PAIRED_PROOF_V1 as proof,
} from "../content/skill-generation/ticket-17-slice-170-paired-proof-v1.mjs";
import { STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V10 as execution } from
  "../content/skill-generation/ticket-17-slice-170-live-how-to-play-v10.mjs";
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from
  "../content/skill-generation/offline-provider-profile-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { assertStarcraftTmgSkillGenerationCredentialFree } from
  "../packages/skill-generation/contracts-v1.mjs";
import {
  createStarcraftTmgSkillCostGuardV1,
} from "../packages/skill-generation-runtime/provider-broker-v1.mjs";
import { createStarcraftTmgOfflineSkillProviderBrokerV5 } from
  "../packages/skill-generation-runtime/provider-broker-v5.mjs";
import {
  createStarcraftTmgSlice170BlindAssignmentV1,
  runStarcraftTmgSlice170PairedProofV1,
  verifyStarcraftTmgSlice170PairedProofV1,
} from "../packages/skill-generation-runtime/paired-skill-proof-v1.mjs";
import { createStarcraftTmgHowToPlaySkillStagedInputV1 } from
  "../packages/skill-generation-runtime/how-to-play-skill-input-v1.mjs";
import { createStarcraftTmgProductionSkillCatalogueV1 } from
  "../packages/skill-generation-runtime/production-skill-catalogue-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV1 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v1.mjs";
import { createStarcraftTmgProviderEgressWorkerPortV2 } from
  "../packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs";
import { priceStarcraftTmgDeepSeekV4FlashUsageV1 } from
  "../packages/secure-provider-runtime/provider-pricing-v1.mjs";
import {
  readStarcraftTmgDeepSeekCredentialFromKeychainV1,
  STARCRAFT_TMG_DEEPSEEK_DEV_KEYCHAIN_ITEM_V1 as keychainItem,
} from
  "../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs";
import { loadCurrentOfficialSkillFixtureV1 } from
  "./support/current-official-skill-fixture-v1.mjs";
import { assertStarcraftTmgSkillProductionNotHeldV1 } from
  "../packages/skill-generation-runtime/production-review-hold-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIVE_RUNNER_PATH = fileURLToPath(import.meta.url);
const BASE_REPORT_ROOT = path.join(
  ROOT,
  "build/ticket-17-slice-170-live-paired-skill-v1",
);
const EXECUTION_FLAGS = new Set(execution.requiredFlags);
const REPORT_ROOT = path.join(BASE_REPORT_ROOT, execution.outputDirectoryName);
const PREFLIGHT_PATH = path.join(
  ROOT,
  "build/ticket-17-skill-generation-v1/slice-170-preflight-report.json",
);
const KEYCHAIN_PREFLIGHT_PATH = path.join(
  ROOT,
  "build/ticket-17-skill-generation-v1/slice-170-keychain-report.json",
);
const RECOVERY_READINESS_PATH = path.join(
  ROOT,
  "build/ticket-17-skill-generation-v1/slice-170-recovery-readiness-report.json",
);
const LOCK_PATH = path.join(REPORT_ROOT, "one-pair-attempt.lock.json");
const REPORT_PATH = path.join(REPORT_ROOT, "live-report.json");
const SAFE_RESULT_PATH = path.join(REPORT_ROOT, "paired-safe-result.json");
const PRIOR_LOCK_PATH = path.join(
  BASE_REPORT_ROOT,
  "one-pair-attempt.lock.json",
);
const PRIOR_REPORT_PATH = path.join(BASE_REPORT_ROOT, "live-report.json");
const PRIOR_HOW_TO_PLAY_ROOT = path.join(
  BASE_REPORT_ROOT,
  "how-to-play-attempt-1",
);
const PRIOR_RECOVERY_ROOT = path.join(
  BASE_REPORT_ROOT,
  "how-to-play-attempt-2",
);
const PRIOR_ROLE_SHAPE_ROOT = path.join(
  BASE_REPORT_ROOT,
  "how-to-play-attempt-3",
);
const PRIOR_TRANSIENT_TRANSPORT_ROOT = path.join(
  BASE_REPORT_ROOT,
  "how-to-play-attempt-4",
);
const PRIOR_TRANSPORT_DIAGNOSTIC_ROOT = path.join(
  BASE_REPORT_ROOT,
  "how-to-play-attempt-5",
);
const PRIOR_CLASSIFIED_FAILURE_ROOT = path.join(
  BASE_REPORT_ROOT,
  "how-to-play-attempt-6",
);
const PRIOR_PARENT_VALIDATION_FAILURE_ROOT = path.join(
  BASE_REPORT_ROOT,
  "how-to-play-attempt-7",
);
const PRIOR_GENERATOR_PARENT_VALIDATION_FAILURE_ROOT = path.join(
  BASE_REPORT_ROOT,
  "how-to-play-attempt-8",
);
const PRIOR_MALFORMED_GENERATOR_FAILURE_ROOT = path.join(
  BASE_REPORT_ROOT,
  "how-to-play-attempt-9",
);
const PRIOR_CHALLENGER_CANARY_ROOT = path.join(
  BASE_REPORT_ROOT,
  "how-to-play-challenger-canary-1",
);
const PRIOR_CHALLENGER_CANARY_PREFLIGHT_PATH = path.join(
  ROOT,
  "build/ticket-17-skill-generation-v1/slice-170-challenger-canary-preflight-report.json",
);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function envelope(body, field) {
  return { ...body, [field]: hashStarcraftTmgContract(body) };
}

function safeCode(error, fallback = "LIVE_PAIRED_SKILL_RUN_FAILED") {
  const code = String(error?.code || error?.message || "")
    .split(":")[0].toUpperCase();
  return /^[A-Z][A-Z0-9_]{2,95}$/u.test(code) ? code : fallback;
}

function requireCondition(condition, code) {
  if (!condition) throw Object.assign(new Error(code), { code });
}

function exactFlags(flags, expected) {
  return flags.length === expected.size
    && flags.every((flag) => expected.has(flag));
}

function flagsAuthorized() {
  return exactFlags(process.argv.slice(2), EXECUTION_FLAGS);
}

function liveWindowOpen() {
  return Date.now() >= Date.parse(proof.liveAuthority.notBeforeInstant);
}

async function jsonFile(pathname) {
  return JSON.parse(await readFile(pathname, "utf8"));
}

async function validPreflight() {
  try {
    const report = await jsonFile(PREFLIGHT_PATH);
    const liveSource = await readFile(LIVE_RUNNER_PATH, "utf8");
    const copy = clone(report);
    const observed = copy.reportHash;
    delete copy.reportHash;
    return report.status === "passed"
      && report.assertionsPassed === 23
      && report.assertionsTotal === 23
      && report.contractHash === proof.contractHash
      && report.promptPackHash === proof.common.promptPackHash
      && report.evaluationContractHash
        === evaluationContract.evaluationContractHash
      && report.executionContractHash === execution.executionContractHash
      && report.liveRunnerSourceHash
        === hashStarcraftTmgContract(liveSource)
      && observed === hashStarcraftTmgContract(copy)
      && report.externalProviderCalls === 0;
  } catch {
    return false;
  }
}

async function validKeychainPreflight() {
  try {
    const report = await jsonFile(KEYCHAIN_PREFLIGHT_PATH);
    const copy = clone(report);
    const observed = copy.reportHash;
    delete copy.reportHash;
    return report.status === "passed"
      && report.assertionsPassed === 6
      && report.assertionsTotal === 6
      && report.ingressKind === "macos_login_keychain_generic_password"
      && report.chatCredentialAllowed === false
      && report.environmentCredentialAllowed === false
      && report.argumentCredentialAllowed === false
      && report.repositoryCredentialAllowed === false
      && report.externalProviderCalls === 0
      && observed === hashStarcraftTmgContract(copy);
  } catch {
    return false;
  }
}

async function validRecoveryReadiness() {
  try {
    const [report, liveSource, pairedPreflight, keychainPreflight] =
      await Promise.all([
        jsonFile(RECOVERY_READINESS_PATH),
        readFile(LIVE_RUNNER_PATH, "utf8"),
        jsonFile(PREFLIGHT_PATH),
        jsonFile(KEYCHAIN_PREFLIGHT_PATH),
      ]);
    const copy = clone(report);
    const observed = copy.reportHash;
    delete copy.reportHash;
    return report.status === "passed"
      && report.assertionsPassed === 15
      && report.assertionsTotal === 15
      && report.proofContractHash === proof.contractHash
      && report.executionContractHash === execution.executionContractHash
      && report.liveRunnerSourceHash === hashStarcraftTmgContract(liveSource)
      && report.pairedPreflightReportHash === pairedPreflight.reportHash
      && report.keychainPreflightReportHash === keychainPreflight.reportHash
      && report.priorHowToPlayReportHash
        === execution.priorHowToPlayAttempt.reportHash
      && report.priorRecoveryReportHash
        === execution.priorRecoveryAttempt.reportHash
      && report.priorRoleShapeReportHash
        === execution.priorRoleShapeAttempt.reportHash
      && report.priorTransientTransportReportHash
        === execution.priorTransientTransportAttempt.reportHash
      && report.priorTransportDiagnosticReportHash
        === execution.priorTransportDiagnosticAttempt.reportHash
      && report.priorClassifiedFailureReportHash
        === execution.priorClassifiedFailureAttempt.reportHash
      && report.priorParentValidationFailureReportHash
        === execution.priorParentValidationFailureAttempt.reportHash
      && report.priorGeneratorParentValidationFailureReportHash
        === execution.priorGeneratorParentValidationFailureAttempt.reportHash
      && report.priorMalformedGeneratorFailureReportHash
        === execution.priorMalformedGeneratorFailureAttempt.reportHash
      && report.priorChallengerCanaryReportHash
        === execution.priorChallengerCanary.reportHash
      && report.targetAttemptOrdinal === execution.targetAttemptOrdinal
      && report.externalProviderCalls === 0
      && observed === hashStarcraftTmgContract(copy);
  } catch {
    return false;
  }
}

function validEnvelope(value, field) {
  const copy = clone(value);
  const observed = copy?.[field];
  if (!copy || typeof copy !== "object") return false;
  delete copy[field];
  return observed === hashStarcraftTmgContract(copy);
}

async function validPriorTracerPrerequisite() {
  try {
    const [report, lock] = await Promise.all([
      jsonFile(PRIOR_REPORT_PATH),
      jsonFile(PRIOR_LOCK_PATH),
    ]);
    return validEnvelope(report, "reportHash")
      && validEnvelope(lock, "lockHash")
      && report.status === "failed"
      && report.reportHash === execution.priorObsoleteTracerAttempt.reportHash
      && report.runId === execution.priorObsoleteTracerAttempt.runId
      && report.contractHash
        === execution.priorObsoleteTracerAttempt.proofContractHash
      && report.failureCode
        === execution.priorObsoleteTracerAttempt.failureCode
      && report.providerPhysicalAttemptsObserved
        === execution.priorObsoleteTracerAttempt.providerCallsObserved
      && report.automaticRetries === 0
      && report.candidatesPromoted === 0
      && lock.lockHash === execution.priorObsoleteTracerAttempt.lockHash
      && lock.runId === execution.priorObsoleteTracerAttempt.runId
      && lock.contractHash
        === execution.priorObsoleteTracerAttempt.proofContractHash
      && lock.automaticRetryAllowed === false;
  } catch {
    return false;
  }
}

async function validPriorHowToPlayPrerequisite() {
  try {
    const [report, lock] = await Promise.all([
      jsonFile(path.join(PRIOR_HOW_TO_PLAY_ROOT, "live-report.json")),
      jsonFile(path.join(PRIOR_HOW_TO_PLAY_ROOT,
        "one-pair-attempt.lock.json")),
    ]);
    const prior = execution.priorHowToPlayAttempt;
    return validEnvelope(report, "reportHash")
      && validEnvelope(lock, "lockHash")
      && report.status === "failed"
      && report.runId === prior.runId
      && report.reportHash === prior.reportHash
      && report.contractHash === prior.proofContractHash
      && report.executionContractHash === prior.executionContractHash
      && report.failureCode === prior.failureCode
      && report.providerFailureReceipt?.code === prior.providerFailureCode
      && report.providerFailureReceipt?.requestDefinitelyNotSent
        === prior.requestDefinitelyNotSent
      && report.providerFailureReceipt?.requestMayHaveBeenSent
        === prior.requestMayHaveBeenSent
      && report.providerPhysicalAttemptsObserved
        === prior.physicalProviderAttemptsObserved
      && report.automaticRetries === 0
      && report.candidatesPromoted === 0
      && lock.lockHash === prior.lockHash
      && lock.runId === prior.runId
      && lock.executionContractHash === prior.executionContractHash
      && lock.automaticRetryAllowed === false;
  } catch {
    return false;
  }
}

async function validPriorRecoveryPrerequisite() {
  try {
    const [report, lock] = await Promise.all([
      jsonFile(path.join(PRIOR_RECOVERY_ROOT, "live-report.json")),
      jsonFile(path.join(PRIOR_RECOVERY_ROOT,
        "one-pair-attempt.lock.json")),
    ]);
    const prior = execution.priorRecoveryAttempt;
    return validEnvelope(report, "reportHash")
      && validEnvelope(lock, "lockHash")
      && report.status === "failed"
      && report.runId === prior.runId
      && report.reportHash === prior.reportHash
      && report.contractHash === prior.proofContractHash
      && report.executionContractHash === prior.executionContractHash
      && report.failureCode === prior.failureCode
      && report.providerWorkerCallsObserved === prior.providerWorkerCallsObserved
      && report.providerPhysicalAttemptsObserved
        === prior.physicalProviderAttemptsObserved
      && report.usageKnown === prior.usageKnown
      && report.calculatedOrConservativeCostCny
        === (prior.conservativeCostCnyMicros / 1_000_000).toFixed(6)
      && report.automaticRetries === 0
      && report.candidatesPromoted === 0
      && lock.lockHash === prior.lockHash
      && lock.runId === prior.runId
      && lock.executionContractHash === prior.executionContractHash
      && lock.automaticRetryAllowed === false;
  } catch {
    return false;
  }
}

async function validPriorRoleShapePrerequisite() {
  try {
    const [report, lock] = await Promise.all([
      jsonFile(path.join(PRIOR_ROLE_SHAPE_ROOT, "live-report.json")),
      jsonFile(path.join(PRIOR_ROLE_SHAPE_ROOT,
        "one-pair-attempt.lock.json")),
    ]);
    const prior = execution.priorRoleShapeAttempt;
    return validEnvelope(report, "reportHash")
      && validEnvelope(lock, "lockHash")
      && report.status === "failed"
      && report.runId === prior.runId
      && report.reportHash === prior.reportHash
      && report.contractHash === prior.proofContractHash
      && report.executionContractHash === prior.executionContractHash
      && report.failureCode === prior.failureCode
      && report.providerWorkerCallsObserved === prior.providerWorkerCallsObserved
      && report.providerPhysicalAttemptsObserved
        === prior.physicalProviderAttemptsObserved
      && report.usageKnown === prior.usageKnown
      && report.providerObserved?.totals?.inputTokens === prior.inputTokens
      && report.providerObserved?.totals?.outputTokens === prior.outputTokens
      && report.providerObserved?.totals?.totalTokens === prior.totalTokens
      && report.providerObserved?.totals?.calculatedCostNanoUsd
        === prior.calculatedCostNanoUsd
      && report.calculatedOrConservativeCostCny
        === (prior.calculatedCostCnyMicros / 1_000_000).toFixed(6)
      && report.automaticRetries === 0
      && report.candidatesPromoted === 0
      && lock.lockHash === prior.lockHash
      && lock.runId === prior.runId
      && lock.executionContractHash === prior.executionContractHash
      && lock.automaticRetryAllowed === false;
  } catch {
    return false;
  }
}

async function validPriorTransientTransportPrerequisite() {
  try {
    const [report, lock] = await Promise.all([
      jsonFile(path.join(PRIOR_TRANSIENT_TRANSPORT_ROOT, "live-report.json")),
      jsonFile(path.join(PRIOR_TRANSIENT_TRANSPORT_ROOT,
        "one-pair-attempt.lock.json")),
    ]);
    const prior = execution.priorTransientTransportAttempt;
    return validEnvelope(report, "reportHash")
      && validEnvelope(lock, "lockHash")
      && report.status === "failed"
      && report.runId === prior.runId
      && report.reportHash === prior.reportHash
      && report.contractHash === prior.proofContractHash
      && report.executionContractHash === prior.executionContractHash
      && report.failureCode === prior.failureCode
      && report.brokerFailureReceipt?.role === prior.failedRole
      && report.providerWorkerCallsObserved === prior.providerWorkerCallsObserved
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
      && report.providerObserved?.totals?.calculatedCostNanoUsd
        === prior.successfulCalculatedCostNanoUsd
      && report.calculatedOrConservativeCostCny
        === (prior.attemptCalculatedOrConservativeCostCnyMicros
          / 1_000_000).toFixed(6)
      && report.automaticRetries === 0
      && report.candidatesPromoted === 0
      && lock.lockHash === prior.lockHash
      && lock.runId === prior.runId
      && lock.executionContractHash === prior.executionContractHash
      && lock.automaticRetryAllowed === false;
  } catch {
    return false;
  }
}

async function validPriorTransportDiagnosticPrerequisite() {
  try {
    const [report, lock] = await Promise.all([
      jsonFile(path.join(PRIOR_TRANSPORT_DIAGNOSTIC_ROOT, "live-report.json")),
      jsonFile(path.join(PRIOR_TRANSPORT_DIAGNOSTIC_ROOT,
        "one-pair-attempt.lock.json")),
    ]);
    const prior = execution.priorTransportDiagnosticAttempt;
    return validEnvelope(report, "reportHash")
      && validEnvelope(lock, "lockHash")
      && report.status === "failed"
      && report.runId === prior.runId
      && report.reportHash === prior.reportHash
      && report.contractHash === prior.proofContractHash
      && report.executionContractHash === prior.executionContractHash
      && report.failureCode === prior.failureCode
      && report.brokerFailureReceipt?.role === prior.failedRole
      && report.providerWorkerCallsObserved === prior.providerWorkerCallsObserved
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
      && report.providerObserved?.totals?.calculatedCostNanoUsd
        === prior.successfulCalculatedCostNanoUsd
      && report.brokerFailureReceipt?.transportFailureReceipt === null
      && prior.transportFailureReceiptPreserved === false
      && report.calculatedOrConservativeCostCny
        === (prior.attemptCalculatedOrConservativeCostCnyMicros
          / 1_000_000).toFixed(6)
      && report.automaticRetries === 0
      && report.candidatesPromoted === 0
      && lock.lockHash === prior.lockHash
      && lock.runId === prior.runId
      && lock.executionContractHash === prior.executionContractHash
      && lock.automaticRetryAllowed === false;
  } catch {
    return false;
  }
}

async function validPriorClassifiedFailurePrerequisite() {
  try {
    const [report, lock] = await Promise.all([
      jsonFile(path.join(PRIOR_CLASSIFIED_FAILURE_ROOT, "live-report.json")),
      jsonFile(path.join(PRIOR_CLASSIFIED_FAILURE_ROOT,
        "one-pair-attempt.lock.json")),
    ]);
    const prior = execution.priorClassifiedFailureAttempt;
    return validEnvelope(report, "reportHash")
      && validEnvelope(lock, "lockHash")
      && report.status === "failed"
      && report.runId === prior.runId
      && report.reportHash === prior.reportHash
      && report.contractHash === prior.proofContractHash
      && report.executionContractHash === prior.executionContractHash
      && report.failureCode === prior.failureCode
      && report.brokerFailureReceipt?.role === prior.failedRole
      && report.brokerFailureReceipt?.transportFailureClass
        === prior.transportFailureClass
      && report.brokerFailureReceipt?.providerWorkerState?.state
        === prior.providerWorkerState
      && report.providerWorkerCallsObserved === prior.providerWorkerCallsObserved
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
      && report.providerObserved?.totals?.calculatedCostNanoUsd
        === prior.successfulCalculatedCostNanoUsd
      && report.calculatedOrConservativeCostCny
        === (prior.attemptCalculatedOrConservativeCostCnyMicros
          / 1_000_000).toFixed(6)
      && report.automaticRetries === 0
      && report.candidatesPromoted === 0
      && lock.lockHash === prior.lockHash
      && lock.runId === prior.runId
      && lock.executionContractHash === prior.executionContractHash
      && lock.automaticRetryAllowed === false;
  } catch {
    return false;
  }
}

async function validPriorParentValidationFailurePrerequisite() {
  try {
    const [report, lock] = await Promise.all([
      jsonFile(path.join(PRIOR_PARENT_VALIDATION_FAILURE_ROOT,
        "live-report.json")),
      jsonFile(path.join(PRIOR_PARENT_VALIDATION_FAILURE_ROOT,
        "one-pair-attempt.lock.json")),
    ]);
    const prior = execution.priorParentValidationFailureAttempt;
    return validEnvelope(report, "reportHash")
      && validEnvelope(lock, "lockHash")
      && report.status === "failed"
      && report.runId === prior.runId
      && report.reportHash === prior.reportHash
      && report.executionContractHash === prior.executionContractHash
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

async function validPriorGeneratorParentValidationFailurePrerequisite() {
  try {
    const [report, lock] = await Promise.all([
      jsonFile(path.join(PRIOR_GENERATOR_PARENT_VALIDATION_FAILURE_ROOT,
        "live-report.json")),
      jsonFile(path.join(PRIOR_GENERATOR_PARENT_VALIDATION_FAILURE_ROOT,
        "one-pair-attempt.lock.json")),
    ]);
    const prior = execution.priorGeneratorParentValidationFailureAttempt;
    const reconstructedPhysicalAttempts =
      report.providerSuccessReceiptsBeforeFailure.length
        + Number(report.providerFailureReceipt?.physicalAttempts || 0);
    return validEnvelope(report, "reportHash")
      && validEnvelope(lock, "lockHash")
      && report.status === "failed"
      && report.runId === prior.runId
      && report.reportHash === prior.reportHash
      && report.executionContractHash === prior.executionContractHash
      && report.failureCode === prior.failureCode
      && report.brokerFailureReceipt?.role === prior.failedRole
      && report.brokerFailureReceipt?.transportFailureClass
        === prior.transportFailureClass
      && report.brokerFailureReceipt?.providerWorkerState?.state
        === prior.providerWorkerState
      && report.providerWorkerCallsObserved
        === prior.providerWorkerCallsObserved
      && report.providerPhysicalAttemptsObserved
        === prior.reportedPhysicalProviderAttemptsObserved
      && reconstructedPhysicalAttempts
        === prior.reconstructedPhysicalProviderAttemptsObserved
      && report.providerSuccessReceiptsBeforeFailure.length
        === prior.successfulProviderReceiptsObserved
      && report.providerObserved?.totals?.inputTokens
        === prior.successfulInputTokens
      && report.providerObserved?.totals?.outputTokens
        === prior.successfulOutputTokens
      && report.providerObserved?.totals?.totalTokens
        === prior.successfulTotalTokens
      && report.providerObserved?.totals?.calculatedCostNanoUsd
        === prior.successfulCalculatedCostNanoUsd
      && report.providerFailureReceipt?.requestMayHaveBeenSent === true
      && report.providerFailureReceipt?.physicalAttempts === 1
      && report.calculatedOrConservativeCostCny
        === (prior.attemptCalculatedOrConservativeCostCnyMicros
          / 1_000_000).toFixed(6)
      && report.automaticRetries === 0
      && report.candidatesPromoted === 0
      && lock.lockHash === prior.lockHash
      && lock.runId === prior.runId
      && lock.targetAttemptOrdinal === prior.targetAttemptOrdinal
      && lock.automaticRetryAllowed === false;
  } catch {
    return false;
  }
}

async function validPriorMalformedGeneratorFailurePrerequisite() {
  try {
    const [report, lock] = await Promise.all([
      jsonFile(path.join(PRIOR_MALFORMED_GENERATOR_FAILURE_ROOT,
        "live-report.json")),
      jsonFile(path.join(PRIOR_MALFORMED_GENERATOR_FAILURE_ROOT,
        "one-pair-attempt.lock.json")),
    ]);
    const prior = execution.priorMalformedGeneratorFailureAttempt;
    return validEnvelope(report, "reportHash")
      && validEnvelope(lock, "lockHash")
      && report.status === "failed"
      && report.runId === prior.runId
      && report.reportHash === prior.reportHash
      && report.executionContractHash === prior.executionContractHash
      && report.failureCode === prior.failureCode
      && report.brokerFailureReceipt?.role === prior.failedRole
      && report.brokerFailureReceipt?.transportFailureClass
        === prior.observedTransportFailureClass
      && report.providerWorkerCallsObserved
        === prior.providerWorkerCallsObserved
      && report.providerPhysicalAttemptsObserved
        === prior.physicalProviderAttemptsObserved
      && report.providerSuccessReceiptsBeforeFailure.length
        === prior.successfulProviderReceiptsObserved
      && report.successfulUsageKnown === prior.successfulUsageKnown
      && report.failedCallUsageKnown === prior.failedCallUsageKnown
      && report.usageKnown === false
      && report.providerObserved?.totals?.inputTokens
        === prior.successfulInputTokens
      && report.providerObserved?.totals?.outputTokens
        === prior.successfulOutputTokens
      && report.providerObserved?.totals?.totalTokens
        === prior.successfulTotalTokens
      && report.providerObserved?.totals?.calculatedCostNanoUsd
        === prior.successfulCalculatedCostNanoUsd
      && report.calculatedOrConservativeCostCny
        === (prior.attemptCalculatedOrConservativeCostCnyMicros
          / 1_000_000).toFixed(6)
      && report.automaticRetries === 0
      && report.candidatesPromoted === 0
      && lock.lockHash === prior.lockHash
      && lock.runId === prior.runId
      && lock.targetAttemptOrdinal === prior.targetAttemptOrdinal
      && lock.automaticRetryAllowed === false;
  } catch {
    return false;
  }
}

async function validPriorChallengerCanaryPrerequisite() {
  try {
    const [report, lock, preflight] = await Promise.all([
      jsonFile(path.join(PRIOR_CHALLENGER_CANARY_ROOT, "live-report.json")),
      jsonFile(path.join(PRIOR_CHALLENGER_CANARY_ROOT,
        "one-call-attempt.lock.json")),
      jsonFile(PRIOR_CHALLENGER_CANARY_PREFLIGHT_PATH),
    ]);
    const prior = execution.priorChallengerCanary;
    return validEnvelope(report, "reportHash")
      && validEnvelope(lock, "lockHash")
      && validEnvelope(preflight, "reportHash")
      && report.status === "passed"
      && report.runId === prior.runId
      && report.reportHash === prior.reportHash
      && report.executionContractHash === prior.executionContractHash
      && report.canaryPreflightReportHash === prior.preflightReportHash
      && report.providerPhysicalAttempts === prior.providerPhysicalAttempts
      && report.automaticRetries === prior.automaticRetries
      && report.inputTokens === prior.inputTokens
      && report.outputTokens === prior.outputTokens
      && report.totalTokens === prior.totalTokens
      && report.calculatedCostNanoUsd === prior.calculatedCostNanoUsd
      && report.calculatedCostCnyMicros === prior.calculatedCostCnyMicros
      && report.canary?.roleGraphAdvancedTo === prior.roleGraphAdvancedTo
      && report.candidateEmissions === prior.candidateEmissions
      && report.candidatesPromoted === prior.candidatesPromoted
      && preflight.reportHash === prior.preflightReportHash
      && preflight.status === "passed"
      && lock.lockHash === prior.lockHash
      && lock.runId === prior.runId
      && lock.maximumPhysicalProviderAttempts === 1
      && lock.automaticRetryAllowed === false;
  } catch {
    return false;
  }
}

async function priorAttemptExists() {
  try {
    await readFile(LOCK_PATH);
    return true;
  } catch (error) {
    return error?.code !== "ENOENT";
  }
}

async function priorSuccessExists() {
  try {
    const report = await jsonFile(REPORT_PATH);
    return report.status === "passed" && report.contractHash === proof.contractHash;
  } catch {
    return false;
  }
}

async function writeJsonAtomic(pathname, value) {
  const temporary = `${pathname}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporary, pathname);
}

async function claimAttempt(input) {
  await mkdir(REPORT_ROOT, { recursive: true, mode: 0o700 });
  let handle;
  try {
    handle = await open(LOCK_PATH, "wx", 0o600);
  } catch (error) {
    throw Object.assign(new Error("LIVE_PAIRED_SKILL_ATTEMPT_ALREADY_CLAIMED"), {
      code: "LIVE_PAIRED_SKILL_ATTEMPT_ALREADY_CLAIMED",
      cause: error,
    });
  }
  const body = {
    schemaVersion: "starcraft_tmg_ticket_17_slice_170_live_attempt_lock_v10",
    attemptPurpose: "formal_production_catalogue_how_to_play_pair",
    targetAttemptOrdinal: execution.targetAttemptOrdinal,
    runId: input.runId,
    contractHash: proof.contractHash,
    executionContractHash: execution.executionContractHash,
    productionSkillId: proof.target.productionSkillId,
    productionCatalogueHash: proof.target.productionCatalogueHash,
    assignmentCommitmentHash: input.assignmentCommitmentHash,
    claimedAt: input.claimedAt,
    maximumPhysicalProviderAttempts: 14,
    automaticRetryAllowed: false,
    rerunRequiresFreshUserAuthority: true,
    trainingTruth: false,
  };
  await handle.writeFile(`${JSON.stringify(envelope(body, "lockHash"), null, 2)}\n`);
  await handle.close();
}

function sumArmUsage(outputsByArm) {
  const rows = Object.entries(outputsByArm).map(([arm, output]) => ({
    arm,
    inputTokens: output.executionSession.usage.inputTokens,
    outputTokens: output.executionSession.usage.outputTokens,
    cacheHitTokens: output.executionSession.usage.cacheHitTokens,
    cacheMissTokens: output.executionSession.usage.cacheMissTokens,
    reasoningTokens: output.executionSession.usage.reasoningTokens,
    totalTokens: output.executionSession.usage.totalTokens,
    calculatedCostNanoUsd: output.executionSession.calculatedCostNanoUsd,
    calculatedCostCnyMicros: output.executionSession.calculatedCostCnyMicros,
  }));
  const total = rows.reduce((sum, row) => ({
    inputTokens: sum.inputTokens + row.inputTokens,
    outputTokens: sum.outputTokens + row.outputTokens,
    cacheHitTokens: sum.cacheHitTokens + row.cacheHitTokens,
    cacheMissTokens: sum.cacheMissTokens + row.cacheMissTokens,
    reasoningTokens: sum.reasoningTokens + row.reasoningTokens,
    totalTokens: sum.totalTokens + row.totalTokens,
    calculatedCostNanoUsd:
      sum.calculatedCostNanoUsd + row.calculatedCostNanoUsd,
    calculatedCostCnyMicros:
      sum.calculatedCostCnyMicros + row.calculatedCostCnyMicros,
  }), {
    inputTokens: 0,
    outputTokens: 0,
    cacheHitTokens: 0,
    cacheMissTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    calculatedCostNanoUsd: 0,
    calculatedCostCnyMicros: 0,
  });
  return { rows, total };
}

function summarizeObservedProviderSuccess(receipts) {
  try {
    const rows = receipts.map((receipt) => {
      const pricing = priceStarcraftTmgDeepSeekV4FlashUsageV1({
        providerId: receipt.providerId,
        requestedModel: receipt.requestedModel,
        reportedModel: receipt.reportedModel,
        startedAt: receipt.startedAt,
        usage: receipt.usage,
      });
      return {
        receiptHash: receipt.receiptHash,
        usage: clone(receipt.usage),
        pricingReceiptHash: pricing.receiptHash,
        calculatedCostNanoUsd: pricing.calculatedCostNanoUsd,
        calculatedCostUsd: pricing.calculatedCostUsd,
      };
    });
    const totals = rows.reduce((sum, row) => ({
      inputTokens: sum.inputTokens + row.usage.inputUnits,
      outputTokens: sum.outputTokens + row.usage.outputUnits,
      cacheHitTokens: sum.cacheHitTokens + row.usage.inputCacheHitUnits,
      cacheMissTokens: sum.cacheMissTokens + row.usage.inputCacheMissUnits,
      reasoningTokens:
        sum.reasoningTokens + (row.usage.reasoningOutputUnits ?? 0),
      totalTokens: sum.totalTokens + row.usage.totalUnits,
      calculatedCostNanoUsd:
        sum.calculatedCostNanoUsd + row.calculatedCostNanoUsd,
    }), {
      inputTokens: 0,
      outputTokens: 0,
      cacheHitTokens: 0,
      cacheMissTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
      calculatedCostNanoUsd: 0,
    });
    return { rows, totals };
  } catch {
    return null;
  }
}

async function writeSafeFailure(input) {
  const providerFailureReceipt = input.providerFailureReceipt
    ? clone(input.providerFailureReceipt) : null;
  const costSnapshot = input.costSnapshot ? clone(input.costSnapshot) : null;
  const baselineNanoUsd = execution.costLedger.targetStartingNanoUsd;
  const baselineCnyMicros = execution.costLedger.targetStartingCnyMicros;
  const failureCostNanoUsd = costSnapshot
    ? Math.max(0, costSnapshot.cumulativeCostNanoUsd
      - baselineNanoUsd) : null;
  const failureCostCnyMicros = costSnapshot
    ? Math.max(0, costSnapshot.cumulativeCnyMicros
      - baselineCnyMicros) : null;
  const providerSuccessReceipts = clone(
    input.providerSuccessReceipts || [],
  );
  const providerObserved = summarizeObservedProviderSuccess(
    providerSuccessReceipts,
  );
  const providerPhysicalAttemptsObserved = providerSuccessReceipts.length
    + Number(providerFailureReceipt?.physicalAttempts || 0);
  const successfulUsageKnown = providerObserved !== null
    && providerObserved.rows.length === providerSuccessReceipts.length;
  const failedCallUsageKnown = providerFailureReceipt?.physicalAttempts === 0;
  const body = {
    schemaVersion: "starcraft_tmg_ticket_17_slice_170_live_report_v10",
    ticket: 17,
    slice: 170,
    status: "failed",
    runId: input.runId,
    contractHash: proof.contractHash,
    executionContractHash: execution.executionContractHash,
    target: clone(execution.target),
    priorObsoleteTracerAttemptRef: {
      runId: execution.priorObsoleteTracerAttempt.runId,
      reportHash: execution.priorObsoleteTracerAttempt.reportHash,
      lockHash: execution.priorObsoleteTracerAttempt.lockHash,
      conservativeCostNanoUsd:
        execution.costLedger.priorTracerConservativeNanoUsd,
      conservativeCostCnyMicros:
        execution.costLedger.priorTracerConservativeCnyMicros,
    },
    priorHowToPlayAttemptRef: {
      runId: execution.priorHowToPlayAttempt.runId,
      reportHash: execution.priorHowToPlayAttempt.reportHash,
      lockHash: execution.priorHowToPlayAttempt.lockHash,
      requestDefinitelyNotSent:
        execution.priorHowToPlayAttempt.requestDefinitelyNotSent,
      physicalProviderAttemptsObserved:
        execution.priorHowToPlayAttempt.physicalProviderAttemptsObserved,
      costNanoUsd: execution.priorHowToPlayAttempt.costNanoUsd,
      costCnyMicros: execution.priorHowToPlayAttempt.costCnyMicros,
    },
    priorRecoveryAttemptRef: {
      runId: execution.priorRecoveryAttempt.runId,
      reportHash: execution.priorRecoveryAttempt.reportHash,
      lockHash: execution.priorRecoveryAttempt.lockHash,
      physicalProviderAttemptsObserved:
        execution.priorRecoveryAttempt.physicalProviderAttemptsObserved,
      usageKnown: execution.priorRecoveryAttempt.usageKnown,
      conservativeCostNanoUsd:
        execution.priorRecoveryAttempt.conservativeCostNanoUsd,
      conservativeCostCnyMicros:
        execution.priorRecoveryAttempt.conservativeCostCnyMicros,
    },
    priorRoleShapeAttemptRef: {
      runId: execution.priorRoleShapeAttempt.runId,
      reportHash: execution.priorRoleShapeAttempt.reportHash,
      lockHash: execution.priorRoleShapeAttempt.lockHash,
      physicalProviderAttemptsObserved:
        execution.priorRoleShapeAttempt.physicalProviderAttemptsObserved,
      usageKnown: execution.priorRoleShapeAttempt.usageKnown,
      inputTokens: execution.priorRoleShapeAttempt.inputTokens,
      outputTokens: execution.priorRoleShapeAttempt.outputTokens,
      totalTokens: execution.priorRoleShapeAttempt.totalTokens,
      calculatedCostNanoUsd:
        execution.priorRoleShapeAttempt.calculatedCostNanoUsd,
      calculatedCostCnyMicros:
        execution.priorRoleShapeAttempt.calculatedCostCnyMicros,
    },
    priorTransientTransportAttemptRef: {
      runId: execution.priorTransientTransportAttempt.runId,
      reportHash: execution.priorTransientTransportAttempt.reportHash,
      lockHash: execution.priorTransientTransportAttempt.lockHash,
      failedRole: execution.priorTransientTransportAttempt.failedRole,
      physicalProviderAttemptsObserved:
        execution.priorTransientTransportAttempt.physicalProviderAttemptsObserved,
      successfulProviderReceiptsObserved:
        execution.priorTransientTransportAttempt.successfulProviderReceiptsObserved,
      successfulUsageKnown:
        execution.priorTransientTransportAttempt.successfulUsageKnown,
      failedCallUsageKnown:
        execution.priorTransientTransportAttempt.failedCallUsageKnown,
      successfulInputTokens:
        execution.priorTransientTransportAttempt.successfulInputTokens,
      successfulOutputTokens:
        execution.priorTransientTransportAttempt.successfulOutputTokens,
      successfulTotalTokens:
        execution.priorTransientTransportAttempt.successfulTotalTokens,
      attemptCalculatedOrConservativeCostNanoUsd:
        execution.priorTransientTransportAttempt
          .attemptCalculatedOrConservativeCostNanoUsd,
      attemptCalculatedOrConservativeCostCnyMicros:
        execution.priorTransientTransportAttempt
          .attemptCalculatedOrConservativeCostCnyMicros,
    },
    priorTransportDiagnosticAttemptRef: {
      runId: execution.priorTransportDiagnosticAttempt.runId,
      reportHash: execution.priorTransportDiagnosticAttempt.reportHash,
      lockHash: execution.priorTransportDiagnosticAttempt.lockHash,
      failedRole: execution.priorTransportDiagnosticAttempt.failedRole,
      physicalProviderAttemptsObserved:
        execution.priorTransportDiagnosticAttempt
          .physicalProviderAttemptsObserved,
      successfulProviderReceiptsObserved:
        execution.priorTransportDiagnosticAttempt
          .successfulProviderReceiptsObserved,
      successfulUsageKnown:
        execution.priorTransportDiagnosticAttempt.successfulUsageKnown,
      failedCallUsageKnown:
        execution.priorTransportDiagnosticAttempt.failedCallUsageKnown,
      successfulInputTokens:
        execution.priorTransportDiagnosticAttempt.successfulInputTokens,
      successfulOutputTokens:
        execution.priorTransportDiagnosticAttempt.successfulOutputTokens,
      successfulTotalTokens:
        execution.priorTransportDiagnosticAttempt.successfulTotalTokens,
      attemptCalculatedOrConservativeCostNanoUsd:
        execution.priorTransportDiagnosticAttempt
          .attemptCalculatedOrConservativeCostNanoUsd,
      attemptCalculatedOrConservativeCostCnyMicros:
        execution.priorTransportDiagnosticAttempt
          .attemptCalculatedOrConservativeCostCnyMicros,
    },
    priorClassifiedFailureAttemptRef: {
      runId: execution.priorClassifiedFailureAttempt.runId,
      reportHash: execution.priorClassifiedFailureAttempt.reportHash,
      lockHash: execution.priorClassifiedFailureAttempt.lockHash,
      failedRole: execution.priorClassifiedFailureAttempt.failedRole,
      transportFailureClass:
        execution.priorClassifiedFailureAttempt.transportFailureClass,
      providerWorkerState:
        execution.priorClassifiedFailureAttempt.providerWorkerState,
      physicalProviderAttemptsObserved:
        execution.priorClassifiedFailureAttempt.physicalProviderAttemptsObserved,
      successfulProviderReceiptsObserved:
        execution.priorClassifiedFailureAttempt
          .successfulProviderReceiptsObserved,
      successfulInputTokens:
        execution.priorClassifiedFailureAttempt.successfulInputTokens,
      successfulOutputTokens:
        execution.priorClassifiedFailureAttempt.successfulOutputTokens,
      successfulTotalTokens:
        execution.priorClassifiedFailureAttempt.successfulTotalTokens,
      attemptCalculatedOrConservativeCostNanoUsd:
        execution.priorClassifiedFailureAttempt
          .attemptCalculatedOrConservativeCostNanoUsd,
      attemptCalculatedOrConservativeCostCnyMicros:
        execution.priorClassifiedFailureAttempt
          .attemptCalculatedOrConservativeCostCnyMicros,
    },
    priorParentValidationFailureAttemptRef: {
      runId: execution.priorParentValidationFailureAttempt.runId,
      reportHash: execution.priorParentValidationFailureAttempt.reportHash,
      lockHash: execution.priorParentValidationFailureAttempt.lockHash,
      failedRole: execution.priorParentValidationFailureAttempt.failedRole,
      transportFailureClass:
        execution.priorParentValidationFailureAttempt.transportFailureClass,
      physicalProviderAttemptsObserved:
        execution.priorParentValidationFailureAttempt
          .physicalProviderAttemptsObserved,
      successfulProviderReceiptsObserved:
        execution.priorParentValidationFailureAttempt
          .successfulProviderReceiptsObserved,
      successfulTotalTokens:
        execution.priorParentValidationFailureAttempt.successfulTotalTokens,
      attemptCalculatedOrConservativeCostNanoUsd:
        execution.priorParentValidationFailureAttempt
          .attemptCalculatedOrConservativeCostNanoUsd,
      attemptCalculatedOrConservativeCostCnyMicros:
        execution.priorParentValidationFailureAttempt
          .attemptCalculatedOrConservativeCostCnyMicros,
    },
    priorChallengerCanaryRef: clone(execution.priorChallengerCanary),
    priorGeneratorParentValidationFailureAttemptRef:
      clone(execution.priorGeneratorParentValidationFailureAttempt),
    priorMalformedGeneratorFailureAttemptRef:
      clone(execution.priorMalformedGeneratorFailureAttempt),
    targetStartingCost: {
      nanoUsd: baselineNanoUsd,
      cnyMicros: baselineCnyMicros,
    },
    assignmentCommitmentHash: input.assignmentCommitmentHash,
    startedAt: input.startedAt,
    failedAt: new Date().toISOString(),
    failureCode: input.failureCode,
    providerWorkerCallsObserved: input.providerCalls,
    providerPhysicalAttemptsObserved,
    providerFailureReceipt,
    brokerFailureReceipt: input.brokerFailureReceipt || null,
    providerSuccessReceiptsBeforeFailure: providerSuccessReceipts,
    providerObserved,
    keychainIngressReceipt: input.keychainIngressReceipt || null,
    costSnapshot,
    successfulUsageKnown,
    failedCallUsageKnown,
    usageKnown: successfulUsageKnown && failedCallUsageKnown,
    calculatedOrConservativeCostUsd: failureCostNanoUsd === null
      ? null : (failureCostNanoUsd / 1_000_000_000).toFixed(9),
    calculatedOrConservativeCostCny: failureCostCnyMicros === null
      ? null : (failureCostCnyMicros / 1_000_000).toFixed(6),
    providerInvoiceAuthoritative: true,
    automaticRetries: 0,
    rerunAllowedAutomatically: false,
    localInputPersisted: false,
    rawPromptPersisted: false,
    rawResponsePersisted: false,
    reasoningPersisted: false,
    candidatesPromoted: 0,
    trainingTruth: false,
  };
  assertStarcraftTmgSkillGenerationCredentialFree(
    body,
    "live paired safe failure report",
  );
  await mkdir(REPORT_ROOT, { recursive: true, mode: 0o700 });
  await writeJsonAtomic(REPORT_PATH, envelope(body, "reportHash"));
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
    console.error("LIVE_PAIRED_SKILL_EXPLICIT_AUTHORITY_REQUIRED");
    process.exitCode = 2;
    return;
  }
  if (!liveWindowOpen()) {
    console.error("LIVE_PAIRED_SKILL_OFF_PEAK_WINDOW_NOT_OPEN");
    process.exitCode = 2;
    return;
  }
  if (!await validPreflight()) {
    console.error("LIVE_PAIRED_SKILL_PREFLIGHT_REQUIRED");
    process.exitCode = 2;
    return;
  }
  if (!await validKeychainPreflight()) {
    console.error("LIVE_PAIRED_SKILL_KEYCHAIN_PREFLIGHT_REQUIRED");
    process.exitCode = 2;
    return;
  }
  if (!await validPriorTracerPrerequisite()) {
    console.error("LIVE_PAIRED_SKILL_PRIOR_TRACER_EVIDENCE_DRIFTED");
    process.exitCode = 2;
    return;
  }
  if (!await validPriorHowToPlayPrerequisite()) {
    console.error("LIVE_PAIRED_SKILL_PRIOR_HOW_TO_PLAY_EVIDENCE_DRIFTED");
    process.exitCode = 2;
    return;
  }
  if (!await validPriorRecoveryPrerequisite()) {
    console.error("LIVE_PAIRED_SKILL_PRIOR_RECOVERY_EVIDENCE_DRIFTED");
    process.exitCode = 2;
    return;
  }
  if (!await validPriorRoleShapePrerequisite()) {
    console.error("LIVE_PAIRED_SKILL_PRIOR_ROLE_SHAPE_EVIDENCE_DRIFTED");
    process.exitCode = 2;
    return;
  }
  if (!await validPriorTransientTransportPrerequisite()) {
    console.error("LIVE_PAIRED_SKILL_PRIOR_TRANSIENT_TRANSPORT_EVIDENCE_DRIFTED");
    process.exitCode = 2;
    return;
  }
  if (!await validPriorTransportDiagnosticPrerequisite()) {
    console.error("LIVE_PAIRED_SKILL_PRIOR_TRANSPORT_DIAGNOSTIC_EVIDENCE_DRIFTED");
    process.exitCode = 2;
    return;
  }
  if (!await validPriorClassifiedFailurePrerequisite()) {
    console.error("LIVE_PAIRED_SKILL_PRIOR_CLASSIFIED_FAILURE_EVIDENCE_DRIFTED");
    process.exitCode = 2;
    return;
  }
  if (!await validPriorParentValidationFailurePrerequisite()) {
    console.error("LIVE_PAIRED_SKILL_PRIOR_PARENT_VALIDATION_EVIDENCE_DRIFTED");
    process.exitCode = 2;
    return;
  }
  if (!await validPriorGeneratorParentValidationFailurePrerequisite()) {
    console.error(
      "LIVE_PAIRED_SKILL_PRIOR_GENERATOR_PARENT_VALIDATION_EVIDENCE_DRIFTED",
    );
    process.exitCode = 2;
    return;
  }
  if (!await validPriorMalformedGeneratorFailurePrerequisite()) {
    console.error(
      "LIVE_PAIRED_SKILL_PRIOR_MALFORMED_GENERATOR_EVIDENCE_DRIFTED",
    );
    process.exitCode = 2;
    return;
  }
  if (!await validPriorChallengerCanaryPrerequisite()) {
    console.error("LIVE_PAIRED_SKILL_CHALLENGER_CANARY_EVIDENCE_DRIFTED");
    process.exitCode = 2;
    return;
  }
  if (!await validRecoveryReadiness()) {
    console.error("LIVE_PAIRED_SKILL_RECOVERY_READINESS_REQUIRED");
    process.exitCode = 2;
    return;
  }
  if (await priorSuccessExists() || await priorAttemptExists()) {
    console.error("LIVE_PAIRED_SKILL_ATTEMPT_ALREADY_CLAIMED");
    process.exitCode = 2;
    return;
  }
  const startedAt = new Date().toISOString();
  const runId = `slice170-live-${randomUUID()}`;
  const runNonce = randomUUID();
  const assignment = createStarcraftTmgSlice170BlindAssignmentV1();
  let credentialBytes = null;
  let keychainReceipt = null;
  let coreWorker = null;
  let attached = null;
  let broker = null;
  const observation = { calls: 0, receipts: [], failure: null };
  await claimAttempt({
    runId,
    claimedAt: startedAt,
    assignmentCommitmentHash: assignment.commitment.commitmentHash,
  });
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
    requireCondition(resolved.ok === true,
      "LIVE_PAIRED_SKILL_PROFILE_RESOLUTION_FAILED");
    coreWorker = createStarcraftTmgProviderEgressWorkerPortV2({
      providerProfileRegistry: registry,
      maxWorkers: 1,
      maxOutputBytes: 256 * 1024,
      handshakeTimeoutMs: 5_000,
      shutdownGraceMs: 1_000,
    });
    const workerPort = Object.freeze({
      metadata: (...args) => coreWorker.metadata(...args),
      attachCredential: (...args) => coreWorker.attachCredential(...args),
      async complete(...args) {
        observation.calls += 1;
        try {
          const result = await coreWorker.complete(...args);
          observation.receipts.push(clone(result.usageReceipt));
          return result;
        } catch (error) {
          observation.failure = clone(error?.safeReceipt || null);
          throw error;
        }
      },
      detachCredential: (...args) => coreWorker.detachCredential(...args),
      readWorkerState: (...args) => coreWorker.readWorkerState(...args),
      close: (...args) => coreWorker.close(...args),
    });
    attached = await workerPort.attachCredential({
      attachmentId: `slice170-attachment-${runNonce}`,
      providerProfile: profile,
      credentialBytes,
    });
    requireCondition(attached.ok === true,
      "LIVE_PAIRED_SKILL_INPUT_ATTACH_FAILED");
    requireCondition(credentialBytes.every((byte) => byte === 0),
      "LIVE_PAIRED_SKILL_PARENT_INPUT_NOT_ZEROED");
    const costGuard = createStarcraftTmgSkillCostGuardV1({
      initialCostNanoUsd: execution.costLedger.targetStartingNanoUsd,
      initialCnyMicros: execution.costLedger.targetStartingCnyMicros,
    });
    broker = createStarcraftTmgOfflineSkillProviderBrokerV5({
      providerWorkerPort: workerPort,
      costGuard,
    });
    const paired = await runStarcraftTmgSlice170PairedProofV1({
      stagedInput,
      broker,
      workerRef: attached.workerRef,
      egressAllowlistHash: resolved.egressBinding.policyHash,
      repositoryRoot: ROOT,
      createId: (scope) => `${scope}-${randomUUID()}`,
      now: () => new Date().toISOString(),
      startedAt,
      runNonce,
      roleTimeoutMs: 150_000,
    });
    requireCondition(verifyStarcraftTmgSlice170PairedProofV1(paired),
      "LIVE_PAIRED_SKILL_RESULT_INVALID");
    requireCondition(observation.calls === 14
      && observation.receipts.length === 14
      && observation.receipts.every((receipt) => (
        receipt.physicalAttempts === 1
          && receipt.automaticRetries === 0
          && receipt.status >= 200 && receipt.status < 300
          && receipt.reportedModel === profile.model
      )), "LIVE_PAIRED_SKILL_PROVIDER_DENOMINATOR_INVALID");
    const usage = sumArmUsage(paired.outputsByArm);
    const costSnapshot = broker.readCostSnapshot();
    requireCondition(costSnapshot.cumulativeCostNanoUsd
      === execution.costLedger.targetStartingNanoUsd
        + usage.total.calculatedCostNanoUsd
      && costSnapshot.cumulativeCnyMicros
        === execution.costLedger.targetStartingCnyMicros
          + usage.total.calculatedCostCnyMicros
      && costSnapshot.cumulativeCostNanoUsd
        <= execution.costLedger.maximumCumulativeNanoUsd
      && costSnapshot.cumulativeCnyMicros
        <= execution.costLedger.maximumCumulativeCnyMicros,
    "LIVE_PAIRED_SKILL_COST_LEDGER_INVALID");
    const providerEvidence = observation.receipts.map((receipt) => ({
      receiptHash: receipt.receiptHash,
      providerId: receipt.providerId,
      requestedModel: receipt.requestedModel,
      reportedModel: receipt.reportedModel,
      providerRequestIdHash: receipt.providerRequestIdHash,
      providerSystemFingerprintHash: receipt.providerSystemFingerprintHash,
      status: receipt.status,
      usage: receipt.usage,
      responseFingerprint: receipt.responseFingerprint,
      dnsAddressSetHash: receipt.dnsAddressSetHash,
      tlsServerName: receipt.tlsServerName,
      physicalAttempts: receipt.physicalAttempts,
      automaticRetries: receipt.automaticRetries,
      startedAt: receipt.startedAt,
      finishedAt: receipt.finishedAt,
      trainingTruth: false,
    }));
    const reportBody = {
      schemaVersion: "starcraft_tmg_ticket_17_slice_170_live_report_v10",
      ticket: 17,
      slice: 170,
      status: "passed",
      runId,
      contractHash: proof.contractHash,
      executionContractHash: execution.executionContractHash,
      preflightReportHash: (await jsonFile(PREFLIGHT_PATH)).reportHash,
      target: clone(execution.target),
      priorObsoleteTracerAttemptRef: {
        runId: execution.priorObsoleteTracerAttempt.runId,
        reportHash: execution.priorObsoleteTracerAttempt.reportHash,
        lockHash: execution.priorObsoleteTracerAttempt.lockHash,
        conservativeCostNanoUsd:
          execution.costLedger.priorTracerConservativeNanoUsd,
        conservativeCostCnyMicros:
          execution.costLedger.priorTracerConservativeCnyMicros,
      },
      priorHowToPlayAttemptRef: {
        runId: execution.priorHowToPlayAttempt.runId,
        reportHash: execution.priorHowToPlayAttempt.reportHash,
        lockHash: execution.priorHowToPlayAttempt.lockHash,
        requestDefinitelyNotSent:
          execution.priorHowToPlayAttempt.requestDefinitelyNotSent,
        physicalProviderAttemptsObserved:
          execution.priorHowToPlayAttempt.physicalProviderAttemptsObserved,
        costNanoUsd: execution.priorHowToPlayAttempt.costNanoUsd,
        costCnyMicros: execution.priorHowToPlayAttempt.costCnyMicros,
      },
      priorRecoveryAttemptRef: {
        runId: execution.priorRecoveryAttempt.runId,
        reportHash: execution.priorRecoveryAttempt.reportHash,
        lockHash: execution.priorRecoveryAttempt.lockHash,
        physicalProviderAttemptsObserved:
          execution.priorRecoveryAttempt.physicalProviderAttemptsObserved,
        usageKnown: execution.priorRecoveryAttempt.usageKnown,
        conservativeCostNanoUsd:
          execution.priorRecoveryAttempt.conservativeCostNanoUsd,
        conservativeCostCnyMicros:
          execution.priorRecoveryAttempt.conservativeCostCnyMicros,
      },
      priorRoleShapeAttemptRef: {
        runId: execution.priorRoleShapeAttempt.runId,
        reportHash: execution.priorRoleShapeAttempt.reportHash,
        lockHash: execution.priorRoleShapeAttempt.lockHash,
        physicalProviderAttemptsObserved:
          execution.priorRoleShapeAttempt.physicalProviderAttemptsObserved,
        usageKnown: execution.priorRoleShapeAttempt.usageKnown,
        inputTokens: execution.priorRoleShapeAttempt.inputTokens,
        outputTokens: execution.priorRoleShapeAttempt.outputTokens,
        totalTokens: execution.priorRoleShapeAttempt.totalTokens,
        calculatedCostNanoUsd:
          execution.priorRoleShapeAttempt.calculatedCostNanoUsd,
        calculatedCostCnyMicros:
          execution.priorRoleShapeAttempt.calculatedCostCnyMicros,
      },
      priorTransientTransportAttemptRef: {
        runId: execution.priorTransientTransportAttempt.runId,
        reportHash: execution.priorTransientTransportAttempt.reportHash,
        lockHash: execution.priorTransientTransportAttempt.lockHash,
        failedRole: execution.priorTransientTransportAttempt.failedRole,
        physicalProviderAttemptsObserved:
          execution.priorTransientTransportAttempt.physicalProviderAttemptsObserved,
        successfulProviderReceiptsObserved:
          execution.priorTransientTransportAttempt.successfulProviderReceiptsObserved,
        successfulUsageKnown:
          execution.priorTransientTransportAttempt.successfulUsageKnown,
        failedCallUsageKnown:
          execution.priorTransientTransportAttempt.failedCallUsageKnown,
        successfulInputTokens:
          execution.priorTransientTransportAttempt.successfulInputTokens,
        successfulOutputTokens:
          execution.priorTransientTransportAttempt.successfulOutputTokens,
        successfulTotalTokens:
          execution.priorTransientTransportAttempt.successfulTotalTokens,
        attemptCalculatedOrConservativeCostNanoUsd:
          execution.priorTransientTransportAttempt
            .attemptCalculatedOrConservativeCostNanoUsd,
        attemptCalculatedOrConservativeCostCnyMicros:
          execution.priorTransientTransportAttempt
            .attemptCalculatedOrConservativeCostCnyMicros,
      },
      priorTransportDiagnosticAttemptRef: {
        runId: execution.priorTransportDiagnosticAttempt.runId,
        reportHash: execution.priorTransportDiagnosticAttempt.reportHash,
        lockHash: execution.priorTransportDiagnosticAttempt.lockHash,
        failedRole: execution.priorTransportDiagnosticAttempt.failedRole,
        physicalProviderAttemptsObserved:
          execution.priorTransportDiagnosticAttempt
            .physicalProviderAttemptsObserved,
        successfulProviderReceiptsObserved:
          execution.priorTransportDiagnosticAttempt
            .successfulProviderReceiptsObserved,
        successfulUsageKnown:
          execution.priorTransportDiagnosticAttempt.successfulUsageKnown,
        failedCallUsageKnown:
          execution.priorTransportDiagnosticAttempt.failedCallUsageKnown,
        successfulInputTokens:
          execution.priorTransportDiagnosticAttempt.successfulInputTokens,
        successfulOutputTokens:
          execution.priorTransportDiagnosticAttempt.successfulOutputTokens,
        successfulTotalTokens:
          execution.priorTransportDiagnosticAttempt.successfulTotalTokens,
        attemptCalculatedOrConservativeCostNanoUsd:
          execution.priorTransportDiagnosticAttempt
            .attemptCalculatedOrConservativeCostNanoUsd,
        attemptCalculatedOrConservativeCostCnyMicros:
          execution.priorTransportDiagnosticAttempt
            .attemptCalculatedOrConservativeCostCnyMicros,
      },
      priorClassifiedFailureAttemptRef: {
        runId: execution.priorClassifiedFailureAttempt.runId,
        reportHash: execution.priorClassifiedFailureAttempt.reportHash,
        lockHash: execution.priorClassifiedFailureAttempt.lockHash,
        failedRole: execution.priorClassifiedFailureAttempt.failedRole,
        transportFailureClass:
          execution.priorClassifiedFailureAttempt.transportFailureClass,
        providerWorkerState:
          execution.priorClassifiedFailureAttempt.providerWorkerState,
        physicalProviderAttemptsObserved:
          execution.priorClassifiedFailureAttempt
            .physicalProviderAttemptsObserved,
        successfulProviderReceiptsObserved:
          execution.priorClassifiedFailureAttempt
            .successfulProviderReceiptsObserved,
        successfulInputTokens:
          execution.priorClassifiedFailureAttempt.successfulInputTokens,
        successfulOutputTokens:
          execution.priorClassifiedFailureAttempt.successfulOutputTokens,
        successfulTotalTokens:
          execution.priorClassifiedFailureAttempt.successfulTotalTokens,
        attemptCalculatedOrConservativeCostNanoUsd:
          execution.priorClassifiedFailureAttempt
            .attemptCalculatedOrConservativeCostNanoUsd,
        attemptCalculatedOrConservativeCostCnyMicros:
          execution.priorClassifiedFailureAttempt
            .attemptCalculatedOrConservativeCostCnyMicros,
      },
      priorParentValidationFailureAttemptRef: {
        runId: execution.priorParentValidationFailureAttempt.runId,
        reportHash: execution.priorParentValidationFailureAttempt.reportHash,
        lockHash: execution.priorParentValidationFailureAttempt.lockHash,
        failedRole: execution.priorParentValidationFailureAttempt.failedRole,
        transportFailureClass:
          execution.priorParentValidationFailureAttempt.transportFailureClass,
        physicalProviderAttemptsObserved:
          execution.priorParentValidationFailureAttempt
            .physicalProviderAttemptsObserved,
        successfulProviderReceiptsObserved:
          execution.priorParentValidationFailureAttempt
            .successfulProviderReceiptsObserved,
        successfulTotalTokens:
          execution.priorParentValidationFailureAttempt.successfulTotalTokens,
        attemptCalculatedOrConservativeCostNanoUsd:
          execution.priorParentValidationFailureAttempt
            .attemptCalculatedOrConservativeCostNanoUsd,
        attemptCalculatedOrConservativeCostCnyMicros:
          execution.priorParentValidationFailureAttempt
            .attemptCalculatedOrConservativeCostCnyMicros,
      },
      priorChallengerCanaryRef: clone(execution.priorChallengerCanary),
      priorGeneratorParentValidationFailureAttemptRef:
        clone(execution.priorGeneratorParentValidationFailureAttempt),
      priorMalformedGeneratorFailureAttemptRef:
        clone(execution.priorMalformedGeneratorFailureAttempt),
      userAuthority: {
        explicitLiveHowToPlayRecovery9PairFlag: true,
        priorMalformedGeneratorFailureAttemptBilledAcknowledged: true,
        priorChallengerCanaryPassedAcknowledged: true,
        chatExposedMaterialAccepted: false,
        maximumPhysicalProviderAttemptsAcknowledged: 14,
        localIngress: "macos_login_keychain_generic_password",
        keychainReceipt,
      },
      assignmentCommitment: paired.assignmentCommitment,
      blindEvaluation: paired.blindEvaluation,
      assignmentReveal: paired.assignmentReveal,
      taskRef: paired.taskRef,
      productionSkillRef: paired.productionSkillRef,
      promptPackHash: paired.promptPackHash,
      pairedRunHash: paired.pairedRunHash,
      candidates: Object.fromEntries(Object.entries(paired.outputsByArm)
        .map(([arm, output]) => [arm, {
          skillId: output.candidateBundle.skillArtifact.skillId,
          skillType: output.candidateBundle.skillArtifact.skillType,
          roleGraphCandidateHash: output.roleGraphResult.candidate.candidateHash,
          candidateBundleHash: output.candidateBundle.integrity.hash,
          runReceiptHash: output.runReceipt.integrity.hash,
          executionSessionHash: output.executionSession.sessionHash
            || output.executionSession.safeSessionHash,
          score: paired.blindEvaluation.scores.find((row) => (
            paired.assignmentReveal.mapping[row.label] === arm
          ))?.score,
          status: "candidate_unreviewed",
          humanReviewed: false,
          promotionEligible: false,
          trainingTruth: false,
        }])),
      provider: {
        profileId: profile.providerProfileId,
        requestedModel: profile.model,
        physicalAttempts: observation.calls,
        automaticRetries: 0,
        safeReceipts: providerEvidence,
      },
      usageByArm: usage.rows,
      totalUsage: usage.total,
      calculatedCostUsd:
        (usage.total.calculatedCostNanoUsd / 1_000_000_000).toFixed(9),
      calculatedCostCny:
        (usage.total.calculatedCostCnyMicros / 1_000_000).toFixed(6),
      targetStartingCost: {
        nanoUsd: execution.costLedger.targetStartingNanoUsd,
        cnyMicros: execution.costLedger.targetStartingCnyMicros,
      },
      costSnapshot,
      startedAt,
      finishedAt: paired.endedAt,
      parentInputZeroed: true,
      localInputPersisted: false,
      rawPromptPersisted: false,
      rawResponsePersisted: false,
      reasoningPersisted: false,
      sourceRefreshPerformed: false,
      largeScaleProductionRun: false,
      candidatesPromoted: 0,
      memoryWrites: 0,
      selfPlayRuns: 0,
      muzeroExports: 0,
      humanReviewed: false,
      trainingTruth: false,
    };
    const report = envelope(reportBody, "reportHash");
    assertStarcraftTmgSkillGenerationCredentialFree(
      report,
      "live paired report",
    );
    await writeJsonAtomic(SAFE_RESULT_PATH, paired);
    for (const [arm, output] of Object.entries(paired.outputsByArm)) {
      await writeJsonAtomic(path.join(REPORT_ROOT, `candidate-${arm}.json`),
        output.candidateBundle);
      await writeFile(path.join(REPORT_ROOT, `candidate-${arm}.md`),
        `${output.candidateBundle.skillMarkdown}\n`, {
          encoding: "utf8",
          mode: 0o600,
        });
    }
    await writeJsonAtomic(REPORT_PATH, report);
    await workerPort.detachCredential({
      workerRef: attached.workerRef,
      reason: "slice170_pair_complete",
    });
    attached = null;
    console.log(
      `Ticket 17 Slice 170 live pair passed; attempts=14; tokens=${usage.total.totalTokens}; costUsd=${report.calculatedCostUsd}; dshScore=${report.candidates.dsh.score}; controlScore=${report.candidates.direct_provider_control.score}; ${report.reportHash}`,
    );
  } catch (error) {
    const failureCode = safeCode(error);
    await writeSafeFailure({
      runId,
      startedAt,
      failureCode,
      assignmentCommitmentHash: assignment.commitment.commitmentHash,
      providerCalls: observation.calls,
      providerFailureReceipt: observation.failure,
      brokerFailureReceipt: error?.safeReceipt || null,
      providerSuccessReceipts: observation.receipts,
      costSnapshot: broker?.readCostSnapshot?.() || null,
      keychainIngressReceipt: keychainReceipt,
    }).catch(() => {});
    console.error(failureCode);
    process.exitCode = 1;
  } finally {
    credentialBytes?.fill(0);
    if (coreWorker && attached?.workerRef) {
      await coreWorker.detachCredential({
        workerRef: attached.workerRef,
        reason: "slice170_pair_finally",
      }).catch(() => {});
    }
    await coreWorker?.close().catch(() => {});
  }
}

if (process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
