#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V10 as execution } from
  "../content/skill-generation/ticket-17-slice-170-live-how-to-play-v10.mjs";
import { STARCRAFT_TMG_TICKET_17_SLICE_170_PAIRED_PROOF_V1 as proof } from
  "../content/skill-generation/ticket-17-slice-170-paired-proof-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_ROOT = path.join(
  ROOT,
  "build/ticket-17-slice-170-live-paired-skill-v1",
);
const PREFLIGHT_ROOT = path.join(
  ROOT,
  "build/ticket-17-skill-generation-v1",
);
const REPORT_PATH = path.join(
  PREFLIGHT_ROOT,
  "slice-170-recovery-readiness-report.json",
);
const RUNNER_PATH = path.join(
  ROOT,
  "scripts/run-ticket-17-live-paired-skill-once-v1.mjs",
);
const checks = [];
const failures = [];

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function verifyEnvelope(value, field) {
  const copy = clone(value);
  const observed = copy?.[field];
  assert(copy && typeof copy === "object");
  delete copy[field];
  assert.equal(observed, hashStarcraftTmgContract(copy));
}

async function jsonFile(pathname) {
  return JSON.parse(await readFile(pathname, "utf8"));
}

async function exists(pathname) {
  try {
    await readFile(pathname);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
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

const [
  pairedPreflight,
  keychainPreflight,
  priorTracerReport,
  priorTracerLock,
  priorHowToPlayReport,
  priorHowToPlayLock,
  priorRecoveryReport,
  priorRecoveryLock,
  priorRoleShapeReport,
  priorRoleShapeLock,
  priorTransientTransportReport,
  priorTransientTransportLock,
  priorTransportDiagnosticReport,
  priorTransportDiagnosticLock,
  priorClassifiedFailureReport,
  priorClassifiedFailureLock,
  priorParentValidationFailureReport,
  priorParentValidationFailureLock,
  priorGeneratorParentValidationFailureReport,
  priorGeneratorParentValidationFailureLock,
  priorMalformedGeneratorFailureReport,
  priorMalformedGeneratorFailureLock,
  priorChallengerCanaryPreflight,
  priorChallengerCanaryReport,
  priorChallengerCanaryLock,
  runnerSource,
] = await Promise.all([
  jsonFile(path.join(PREFLIGHT_ROOT, "slice-170-preflight-report.json")),
  jsonFile(path.join(PREFLIGHT_ROOT, "slice-170-keychain-report.json")),
  jsonFile(path.join(BUILD_ROOT, "live-report.json")),
  jsonFile(path.join(BUILD_ROOT, "one-pair-attempt.lock.json")),
  jsonFile(path.join(BUILD_ROOT,
    "how-to-play-attempt-1/live-report.json")),
  jsonFile(path.join(BUILD_ROOT,
    "how-to-play-attempt-1/one-pair-attempt.lock.json")),
  jsonFile(path.join(BUILD_ROOT,
    "how-to-play-attempt-2/live-report.json")),
  jsonFile(path.join(BUILD_ROOT,
    "how-to-play-attempt-2/one-pair-attempt.lock.json")),
  jsonFile(path.join(BUILD_ROOT,
    "how-to-play-attempt-3/live-report.json")),
  jsonFile(path.join(BUILD_ROOT,
    "how-to-play-attempt-3/one-pair-attempt.lock.json")),
  jsonFile(path.join(BUILD_ROOT,
    "how-to-play-attempt-4/live-report.json")),
  jsonFile(path.join(BUILD_ROOT,
    "how-to-play-attempt-4/one-pair-attempt.lock.json")),
  jsonFile(path.join(BUILD_ROOT,
    "how-to-play-attempt-5/live-report.json")),
  jsonFile(path.join(BUILD_ROOT,
    "how-to-play-attempt-5/one-pair-attempt.lock.json")),
  jsonFile(path.join(BUILD_ROOT,
    "how-to-play-attempt-6/live-report.json")),
  jsonFile(path.join(BUILD_ROOT,
    "how-to-play-attempt-6/one-pair-attempt.lock.json")),
  jsonFile(path.join(BUILD_ROOT,
    "how-to-play-attempt-7/live-report.json")),
  jsonFile(path.join(BUILD_ROOT,
    "how-to-play-attempt-7/one-pair-attempt.lock.json")),
  jsonFile(path.join(BUILD_ROOT,
    "how-to-play-attempt-8/live-report.json")),
  jsonFile(path.join(BUILD_ROOT,
    "how-to-play-attempt-8/one-pair-attempt.lock.json")),
  jsonFile(path.join(BUILD_ROOT,
    "how-to-play-attempt-9/live-report.json")),
  jsonFile(path.join(BUILD_ROOT,
    "how-to-play-attempt-9/one-pair-attempt.lock.json")),
  jsonFile(path.join(PREFLIGHT_ROOT,
    "slice-170-challenger-canary-preflight-report.json")),
  jsonFile(path.join(BUILD_ROOT,
    "how-to-play-challenger-canary-1/live-report.json")),
  jsonFile(path.join(BUILD_ROOT,
    "how-to-play-challenger-canary-1/one-call-attempt.lock.json")),
  readFile(RUNNER_PATH, "utf8"),
]);

await check("recovery_target_and_cost_envelope_are_exact", () => {
  assert.equal(execution.targetAttemptOrdinal, 10);
  assert.equal(execution.target.taskId, proof.target.taskId);
  assert.equal(execution.target.productionSkillId,
    "skill.starcraft-tmg.how-to-play");
  assert.equal(execution.target.productionCatalogueSkillCount, 53);
  assert.equal(execution.costLedger.targetStartingCnyMicros, 30_407_752);
  assert.equal(execution.costLedger.maximumNewPairCnyMicros, 49_431_389);
  assert.equal(execution.costLedger.maximumCumulativeCnyMicros, 79_839_141);
  assert.equal(execution.costLedger.crossesNotificationThresholdAtMaximum,
    false);
});

await check("paired_preflight_binds_current_runner_and_execution", () => {
  verifyEnvelope(pairedPreflight, "reportHash");
  assert.equal(pairedPreflight.status, "passed");
  assert.equal(pairedPreflight.assertionsPassed, 23);
  assert.equal(pairedPreflight.assertionsTotal, 23);
  assert.equal(pairedPreflight.contractHash, proof.contractHash);
  assert.equal(pairedPreflight.executionContractHash,
    execution.executionContractHash);
  assert.equal(pairedPreflight.liveRunnerSourceHash,
    hashStarcraftTmgContract(runnerSource));
  assert.equal(pairedPreflight.externalProviderCalls, 0);
});

await check("keychain_preflight_is_safe_and_current", () => {
  verifyEnvelope(keychainPreflight, "reportHash");
  assert.equal(keychainPreflight.status, "passed");
  assert.equal(keychainPreflight.assertionsPassed, 6);
  assert.equal(keychainPreflight.assertionsTotal, 6);
  assert.equal(keychainPreflight.ingressKind,
    execution.credentialIngress.kind);
  assert.equal(keychainPreflight.chatCredentialAllowed, false);
  assert.equal(keychainPreflight.environmentCredentialAllowed, false);
  assert.equal(keychainPreflight.argumentCredentialAllowed, false);
  assert.equal(keychainPreflight.repositoryCredentialAllowed, false);
  assert.equal(keychainPreflight.externalProviderCalls, 0);
});

await check("obsolete_tracer_attempt_is_immutable_and_conservatively_billed", () => {
  verifyEnvelope(priorTracerReport, "reportHash");
  verifyEnvelope(priorTracerLock, "lockHash");
  assert.equal(priorTracerReport.reportHash,
    execution.priorObsoleteTracerAttempt.reportHash);
  assert.equal(priorTracerLock.lockHash,
    execution.priorObsoleteTracerAttempt.lockHash);
  assert.equal(execution.priorObsoleteTracerAttempt.mayHaveBeenBilled, true);
  assert.equal(execution.costLedger.priorTracerConservativeCnyMicros, 714_814);
  assert.equal(priorTracerReport.candidatesPromoted, 0);
});

await check("first_how_to_play_attempt_proves_zero_egress_and_zero_cost", () => {
  verifyEnvelope(priorHowToPlayReport, "reportHash");
  verifyEnvelope(priorHowToPlayLock, "lockHash");
  const prior = execution.priorHowToPlayAttempt;
  assert.equal(priorHowToPlayReport.reportHash, prior.reportHash);
  assert.equal(priorHowToPlayLock.lockHash, prior.lockHash);
  assert.equal(priorHowToPlayReport.status, "failed");
  assert.equal(priorHowToPlayReport.providerFailureReceipt.code,
    prior.providerFailureCode);
  assert.equal(priorHowToPlayReport.providerFailureReceipt
    .requestDefinitelyNotSent, true);
  assert.equal(priorHowToPlayReport.providerFailureReceipt
    .requestMayHaveBeenSent, false);
  assert.equal(priorHowToPlayReport.providerPhysicalAttemptsObserved, 0);
  assert.equal(priorHowToPlayReport.calculatedOrConservativeCostCny,
    "0.000000");
  assert.equal(priorHowToPlayReport.candidatesPromoted, 0);
});

await check("first_recovery_attempt_is_frozen_as_one_conservative_call", () => {
  verifyEnvelope(priorRecoveryReport, "reportHash");
  verifyEnvelope(priorRecoveryLock, "lockHash");
  const prior = execution.priorRecoveryAttempt;
  assert.equal(priorRecoveryReport.reportHash, prior.reportHash);
  assert.equal(priorRecoveryLock.lockHash, prior.lockHash);
  assert.equal(priorRecoveryReport.status, "failed");
  assert.equal(priorRecoveryReport.failureCode, prior.failureCode);
  assert.equal(priorRecoveryReport.providerWorkerCallsObserved, 1);
  assert.equal(priorRecoveryReport.providerPhysicalAttemptsObserved, 1);
  assert.equal(priorRecoveryReport.usageKnown, false);
  assert.equal(priorRecoveryReport.calculatedOrConservativeCostCny,
    "3.530814");
  assert.equal(priorRecoveryReport.candidatesPromoted, 0);
});

await check("role_shape_attempt_is_frozen_as_three_known_calls", () => {
  verifyEnvelope(priorRoleShapeReport, "reportHash");
  verifyEnvelope(priorRoleShapeLock, "lockHash");
  const prior = execution.priorRoleShapeAttempt;
  assert.equal(priorRoleShapeReport.reportHash, prior.reportHash);
  assert.equal(priorRoleShapeLock.lockHash, prior.lockHash);
  assert.equal(priorRoleShapeReport.status, "failed");
  assert.equal(priorRoleShapeReport.failureCode, prior.failureCode);
  assert.equal(priorRoleShapeReport.providerWorkerCallsObserved, 3);
  assert.equal(priorRoleShapeReport.providerPhysicalAttemptsObserved, 3);
  assert.equal(priorRoleShapeReport.providerObserved.totals.inputTokens,
    prior.inputTokens);
  assert.equal(priorRoleShapeReport.providerObserved.totals.outputTokens,
    prior.outputTokens);
  assert.equal(priorRoleShapeReport.providerObserved.totals.totalTokens,
    prior.totalTokens);
  assert.equal(priorRoleShapeReport.providerObserved.totals
    .calculatedCostNanoUsd, prior.calculatedCostNanoUsd);
  assert.equal(priorRoleShapeReport.calculatedOrConservativeCostCny,
    "1.552187");
  assert.equal(priorRoleShapeReport.candidatesPromoted, 0);
});

await check("transient_transport_attempt_is_frozen_with_conservative_call", () => {
  verifyEnvelope(priorTransientTransportReport, "reportHash");
  verifyEnvelope(priorTransientTransportLock, "lockHash");
  const prior = execution.priorTransientTransportAttempt;
  assert.equal(priorTransientTransportReport.reportHash, prior.reportHash);
  assert.equal(priorTransientTransportLock.lockHash, prior.lockHash);
  assert.equal(priorTransientTransportReport.status, "failed");
  assert.equal(priorTransientTransportReport.failureCode, prior.failureCode);
  assert.equal(priorTransientTransportReport.brokerFailureReceipt.role,
    prior.failedRole);
  assert.equal(priorTransientTransportReport.providerWorkerCallsObserved,
    prior.providerWorkerCallsObserved);
  assert.equal(priorTransientTransportReport.providerPhysicalAttemptsObserved,
    prior.physicalProviderAttemptsObserved);
  assert.equal(priorTransientTransportReport
    .providerSuccessReceiptsBeforeFailure.length,
  prior.successfulProviderReceiptsObserved);
  assert.equal(priorTransientTransportReport.providerObserved.totals
    .totalTokens, prior.successfulTotalTokens);
  assert.equal(priorTransientTransportReport.providerObserved.totals
    .calculatedCostNanoUsd, prior.successfulCalculatedCostNanoUsd);
  assert.equal(priorTransientTransportReport.calculatedOrConservativeCostCny,
    "5.083318");
  assert.equal(priorTransientTransportReport.candidatesPromoted, 0);
});

await check("transport_diagnostic_attempt_is_frozen_without_false_detail", () => {
  verifyEnvelope(priorTransportDiagnosticReport, "reportHash");
  verifyEnvelope(priorTransportDiagnosticLock, "lockHash");
  const prior = execution.priorTransportDiagnosticAttempt;
  assert.equal(priorTransportDiagnosticReport.reportHash, prior.reportHash);
  assert.equal(priorTransportDiagnosticLock.lockHash, prior.lockHash);
  assert.equal(priorTransportDiagnosticReport.status, "failed");
  assert.equal(priorTransportDiagnosticReport.failureCode, prior.failureCode);
  assert.equal(priorTransportDiagnosticReport.brokerFailureReceipt.role,
    prior.failedRole);
  assert.equal(priorTransportDiagnosticReport.providerWorkerCallsObserved,
    prior.providerWorkerCallsObserved);
  assert.equal(priorTransportDiagnosticReport.providerPhysicalAttemptsObserved,
    prior.physicalProviderAttemptsObserved);
  assert.equal(priorTransportDiagnosticReport
    .providerSuccessReceiptsBeforeFailure.length,
  prior.successfulProviderReceiptsObserved);
  assert.equal(priorTransportDiagnosticReport.providerObserved.totals
    .totalTokens, prior.successfulTotalTokens);
  assert.equal(priorTransportDiagnosticReport.providerObserved.totals
    .calculatedCostNanoUsd, prior.successfulCalculatedCostNanoUsd);
  assert.equal(priorTransportDiagnosticReport.brokerFailureReceipt
    .transportFailureReceipt, null);
  assert.equal(priorTransportDiagnosticReport.calculatedOrConservativeCostCny,
    "5.083791");
  assert.equal(priorTransportDiagnosticReport.candidatesPromoted, 0);
});

await check("classified_failure_attempt_proves_local_result_rejection", () => {
  verifyEnvelope(priorClassifiedFailureReport, "reportHash");
  verifyEnvelope(priorClassifiedFailureLock, "lockHash");
  const prior = execution.priorClassifiedFailureAttempt;
  assert.equal(priorClassifiedFailureReport.reportHash, prior.reportHash);
  assert.equal(priorClassifiedFailureLock.lockHash, prior.lockHash);
  assert.equal(priorClassifiedFailureReport.status, "failed");
  assert.equal(priorClassifiedFailureReport.failureCode, prior.failureCode);
  assert.equal(priorClassifiedFailureReport.brokerFailureReceipt.role,
    prior.failedRole);
  assert.equal(priorClassifiedFailureReport.brokerFailureReceipt
    .transportFailureClass, prior.transportFailureClass);
  assert.equal(priorClassifiedFailureReport.brokerFailureReceipt
    .providerWorkerState.state, prior.providerWorkerState);
  assert.equal(priorClassifiedFailureReport.providerWorkerCallsObserved,
    prior.providerWorkerCallsObserved);
  assert.equal(priorClassifiedFailureReport.providerPhysicalAttemptsObserved,
    prior.physicalProviderAttemptsObserved);
  assert.equal(priorClassifiedFailureReport.providerObserved.totals.totalTokens,
    prior.successfulTotalTokens);
  assert.equal(priorClassifiedFailureReport.providerObserved.totals
    .calculatedCostNanoUsd, prior.successfulCalculatedCostNanoUsd);
  assert.equal(priorClassifiedFailureReport.calculatedOrConservativeCostCny,
    "3.565905");
  assert.equal(priorClassifiedFailureReport.candidatesPromoted, 0);
});

await check("parent_validation_failure_attempt_is_frozen_as_attempt_seven", () => {
  verifyEnvelope(priorParentValidationFailureReport, "reportHash");
  verifyEnvelope(priorParentValidationFailureLock, "lockHash");
  const prior = execution.priorParentValidationFailureAttempt;
  assert.equal(priorParentValidationFailureReport.reportHash, prior.reportHash);
  assert.equal(priorParentValidationFailureLock.lockHash, prior.lockHash);
  assert.equal(priorParentValidationFailureReport.status, "failed");
  assert.equal(priorParentValidationFailureReport.failureCode,
    prior.failureCode);
  assert.equal(priorParentValidationFailureReport.brokerFailureReceipt.role,
    prior.failedRole);
  assert.equal(priorParentValidationFailureReport.brokerFailureReceipt
    .transportFailureClass, prior.transportFailureClass);
  assert.equal(priorParentValidationFailureReport.providerWorkerCallsObserved,
    prior.providerWorkerCallsObserved);
  assert.equal(priorParentValidationFailureReport.providerObserved.totals
    .totalTokens, prior.successfulTotalTokens);
  assert.equal(priorParentValidationFailureReport.calculatedOrConservativeCostCny,
    "3.565626");
  assert.equal(priorParentValidationFailureReport.candidatesPromoted, 0);
});

await check("generator_parent_failure_is_reconstructed_as_seven_calls", () => {
  verifyEnvelope(priorGeneratorParentValidationFailureReport, "reportHash");
  verifyEnvelope(priorGeneratorParentValidationFailureLock, "lockHash");
  const prior = execution.priorGeneratorParentValidationFailureAttempt;
  assert.equal(priorGeneratorParentValidationFailureReport.reportHash,
    prior.reportHash);
  assert.equal(priorGeneratorParentValidationFailureLock.lockHash,
    prior.lockHash);
  assert.equal(priorGeneratorParentValidationFailureReport.status, "failed");
  assert.equal(priorGeneratorParentValidationFailureReport.failureCode,
    prior.failureCode);
  assert.equal(priorGeneratorParentValidationFailureReport
    .brokerFailureReceipt.role, prior.failedRole);
  assert.equal(priorGeneratorParentValidationFailureReport
    .brokerFailureReceipt.transportFailureClass, prior.transportFailureClass);
  assert.equal(priorGeneratorParentValidationFailureReport
    .providerWorkerCallsObserved, prior.providerWorkerCallsObserved);
  assert.equal(priorGeneratorParentValidationFailureReport
    .providerPhysicalAttemptsObserved,
  prior.reportedPhysicalProviderAttemptsObserved);
  assert.equal(priorGeneratorParentValidationFailureReport
    .providerSuccessReceiptsBeforeFailure.length,
  prior.successfulProviderReceiptsObserved);
  assert.equal(priorGeneratorParentValidationFailureReport
    .providerSuccessReceiptsBeforeFailure.length
      + priorGeneratorParentValidationFailureReport
        .providerFailureReceipt.physicalAttempts,
  prior.reconstructedPhysicalProviderAttemptsObserved);
  assert.equal(priorGeneratorParentValidationFailureReport
    .providerObserved.totals.totalTokens, prior.successfulTotalTokens);
  assert.equal(priorGeneratorParentValidationFailureReport
    .providerObserved.totals.calculatedCostNanoUsd,
  prior.successfulCalculatedCostNanoUsd);
  assert.equal(priorGeneratorParentValidationFailureReport
    .calculatedOrConservativeCostCny, "3.603783");
  assert.equal(priorGeneratorParentValidationFailureReport.usageKnown, true);
  assert.equal(prior.failedCallUsageKnown, false);
  assert.equal(priorGeneratorParentValidationFailureReport
    .candidatesPromoted, 0);
});

await check("malformed_generator_attempt_is_frozen_as_fourteen_calls", () => {
  verifyEnvelope(priorMalformedGeneratorFailureReport, "reportHash");
  verifyEnvelope(priorMalformedGeneratorFailureLock, "lockHash");
  const prior = execution.priorMalformedGeneratorFailureAttempt;
  assert.equal(priorMalformedGeneratorFailureReport.reportHash,
    prior.reportHash);
  assert.equal(priorMalformedGeneratorFailureLock.lockHash, prior.lockHash);
  assert.equal(priorMalformedGeneratorFailureReport.status, "failed");
  assert.equal(priorMalformedGeneratorFailureReport.failureCode,
    prior.failureCode);
  assert.equal(priorMalformedGeneratorFailureReport.brokerFailureReceipt.role,
    prior.failedRole);
  assert.equal(priorMalformedGeneratorFailureReport.brokerFailureReceipt
    .transportFailureClass, prior.observedTransportFailureClass);
  assert.equal(priorMalformedGeneratorFailureReport.providerWorkerCallsObserved,
    prior.providerWorkerCallsObserved);
  assert.equal(priorMalformedGeneratorFailureReport
    .providerPhysicalAttemptsObserved, prior.physicalProviderAttemptsObserved);
  assert.equal(priorMalformedGeneratorFailureReport
    .providerSuccessReceiptsBeforeFailure.length,
  prior.successfulProviderReceiptsObserved);
  assert.equal(priorMalformedGeneratorFailureReport.successfulUsageKnown,
    prior.successfulUsageKnown);
  assert.equal(priorMalformedGeneratorFailureReport.failedCallUsageKnown,
    prior.failedCallUsageKnown);
  assert.equal(priorMalformedGeneratorFailureReport.usageKnown, false);
  assert.equal(priorMalformedGeneratorFailureReport.providerObserved.totals
    .totalTokens, prior.successfulTotalTokens);
  assert.equal(priorMalformedGeneratorFailureReport.providerObserved.totals
    .calculatedCostNanoUsd, prior.successfulCalculatedCostNanoUsd);
  assert.equal(priorMalformedGeneratorFailureReport
    .calculatedOrConservativeCostCny, "3.689865");
  assert.equal(priorMalformedGeneratorFailureReport.candidatesPromoted, 0);
});

await check("live_challenger_canary_is_frozen_as_one_passed_call", () => {
  verifyEnvelope(priorChallengerCanaryPreflight, "reportHash");
  verifyEnvelope(priorChallengerCanaryReport, "reportHash");
  verifyEnvelope(priorChallengerCanaryLock, "lockHash");
  const prior = execution.priorChallengerCanary;
  assert.equal(priorChallengerCanaryPreflight.reportHash,
    prior.preflightReportHash);
  assert.equal(priorChallengerCanaryPreflight.status, "passed");
  assert.equal(priorChallengerCanaryReport.reportHash, prior.reportHash);
  assert.equal(priorChallengerCanaryLock.lockHash, prior.lockHash);
  assert.equal(priorChallengerCanaryReport.status, "passed");
  assert.equal(priorChallengerCanaryReport.providerPhysicalAttempts, 1);
  assert.equal(priorChallengerCanaryReport.totalTokens, prior.totalTokens);
  assert.equal(priorChallengerCanaryReport.calculatedCostCnyMicros,
    prior.calculatedCostCnyMicros);
  assert.equal(priorChallengerCanaryReport.canary.roleGraphAdvancedTo,
    "reasoner");
  assert.equal(priorChallengerCanaryReport.candidateEmissions, 0);
  assert.equal(priorChallengerCanaryReport.candidatesPromoted, 0);
});

await check("recovery_attempt_is_unclaimed_and_requires_fresh_authority", async () => {
  const targetRoot = path.join(BUILD_ROOT, execution.outputDirectoryName);
  assert.equal(await exists(path.join(targetRoot,
    "one-pair-attempt.lock.json")), false);
  assert.equal(await exists(path.join(targetRoot, "live-report.json")), false);
  assert.equal(execution.automaticRetryAllowed, false);
  assert.equal(execution.rerunRequiresFreshUserAuthority, true);
  assert.equal(execution.requiredFlags.length, 5);
  assert.equal(execution.credentialIngress.chatCredentialAllowed, false);
});

const reportBody = {
  schemaVersion:
    "starcraft_tmg_ticket_17_slice_170_recovery_readiness_report_v10",
  ticket: 17,
  slice: 170,
  status: failures.length === 0 ? "passed" : "failed",
  generatedAt: "2026-09-05T10:30:00.000Z",
  assertionsPassed: checks.filter((row) => row.passed).length,
  assertionsTotal: checks.length,
  checks,
  proofContractHash: proof.contractHash,
  executionContractHash: execution.executionContractHash,
  liveRunnerSourceHash: hashStarcraftTmgContract(runnerSource),
  pairedPreflightReportHash: pairedPreflight.reportHash,
  keychainPreflightReportHash: keychainPreflight.reportHash,
  priorTracerReportHash: priorTracerReport.reportHash,
  priorHowToPlayReportHash: priorHowToPlayReport.reportHash,
  priorRecoveryReportHash: priorRecoveryReport.reportHash,
  priorRoleShapeReportHash: priorRoleShapeReport.reportHash,
  priorTransientTransportReportHash: priorTransientTransportReport.reportHash,
  priorTransportDiagnosticReportHash: priorTransportDiagnosticReport.reportHash,
  priorClassifiedFailureReportHash: priorClassifiedFailureReport.reportHash,
  priorParentValidationFailureReportHash:
    priorParentValidationFailureReport.reportHash,
  priorGeneratorParentValidationFailureReportHash:
    priorGeneratorParentValidationFailureReport.reportHash,
  priorMalformedGeneratorFailureReportHash:
    priorMalformedGeneratorFailureReport.reportHash,
  priorChallengerCanaryReportHash: priorChallengerCanaryReport.reportHash,
  targetAttemptOrdinal: execution.targetAttemptOrdinal,
  targetStartingCnyMicros: execution.costLedger.targetStartingCnyMicros,
  maximumCumulativeCnyMicros:
    execution.costLedger.maximumCumulativeCnyMicros,
  nextNotificationThresholdCnyMicros:
    execution.costLedger.nextNotificationThresholdCnyMicros,
  externalProviderCalls: 0,
  externalBillableTokens: 0,
  sourceRefreshPerformed: false,
  candidatesPromoted: 0,
  trainingTruth: false,
};
const report = {
  ...reportBody,
  reportHash: hashStarcraftTmgContract(reportBody),
};
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
