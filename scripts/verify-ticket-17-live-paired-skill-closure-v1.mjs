#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  STARCRAFT_TMG_SLICE_170_BLIND_EVALUATION_V1 as evaluationContract,
  STARCRAFT_TMG_TICKET_17_SLICE_170_PAIRED_PROOF_V1 as proof,
} from "../content/skill-generation/ticket-17-slice-170-paired-proof-v1.mjs";
import { STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V8 as execution } from
  "../content/skill-generation/ticket-17-slice-170-live-how-to-play-v8.mjs";
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from
  "../content/skill-generation/offline-provider-profile-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { assertStarcraftTmgSkillGenerationContract } from
  "../packages/skill-generation/contracts-v1.mjs";
import { verifyStarcraftTmgSlice170PairedProofV1 } from
  "../packages/skill-generation-runtime/paired-skill-proof-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIVE_ROOT = path.join(
  ROOT,
  "build/ticket-17-slice-170-live-paired-skill-v1",
  execution.outputDirectoryName,
);
const PRIOR_ROOT = path.join(
  ROOT,
  "build/ticket-17-slice-170-live-paired-skill-v1",
);
const PRIOR_HOW_TO_PLAY_ROOT = path.join(
  PRIOR_ROOT,
  "how-to-play-attempt-1",
);
const PRIOR_RECOVERY_ROOT = path.join(
  PRIOR_ROOT,
  "how-to-play-attempt-2",
);
const PRIOR_ROLE_SHAPE_ROOT = path.join(
  PRIOR_ROOT,
  "how-to-play-attempt-3",
);
const PRIOR_TRANSIENT_TRANSPORT_ROOT = path.join(
  PRIOR_ROOT,
  "how-to-play-attempt-4",
);
const PRIOR_TRANSPORT_DIAGNOSTIC_ROOT = path.join(
  PRIOR_ROOT,
  "how-to-play-attempt-5",
);
const PRIOR_CLASSIFIED_FAILURE_ROOT = path.join(
  PRIOR_ROOT,
  "how-to-play-attempt-6",
);
const PRIOR_PARENT_VALIDATION_FAILURE_ROOT = path.join(
  PRIOR_ROOT,
  "how-to-play-attempt-7",
);
const PRIOR_CHALLENGER_CANARY_ROOT = path.join(
  PRIOR_ROOT,
  "how-to-play-challenger-canary-1",
);
const REPORT_PATH = path.join(LIVE_ROOT, "live-report.json");
const SAFE_RESULT_PATH = path.join(LIVE_ROOT, "paired-safe-result.json");
const CLOSURE_PATH = path.join(
  ROOT,
  "build/ticket-17-skill-generation-v1/slice-170-live-closure-report.json",
);
const checks = [];
const failures = [];

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function verifyEnvelope(value, field) {
  const copy = clone(value);
  const observed = copy[field];
  delete copy[field];
  assert.equal(observed, hashStarcraftTmgContract(copy));
}

function envelope(body, field) {
  return { ...body, [field]: hashStarcraftTmgContract(body) };
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
  reportText,
  pairedText,
  priorReportText,
  priorLockText,
  priorHowToPlayReportText,
  priorHowToPlayLockText,
  priorRecoveryReportText,
  priorRecoveryLockText,
  priorRoleShapeReportText,
  priorRoleShapeLockText,
  priorTransientTransportReportText,
  priorTransientTransportLockText,
  priorTransportDiagnosticReportText,
  priorTransportDiagnosticLockText,
  priorClassifiedFailureReportText,
  priorClassifiedFailureLockText,
  priorParentValidationFailureReportText,
  priorParentValidationFailureLockText,
  priorChallengerCanaryReportText,
  priorChallengerCanaryLockText,
] = await Promise.all([
  readFile(REPORT_PATH, "utf8"),
  readFile(SAFE_RESULT_PATH, "utf8"),
  readFile(path.join(PRIOR_ROOT, "live-report.json"), "utf8"),
  readFile(path.join(PRIOR_ROOT, "one-pair-attempt.lock.json"), "utf8"),
  readFile(path.join(PRIOR_HOW_TO_PLAY_ROOT, "live-report.json"), "utf8"),
  readFile(path.join(PRIOR_HOW_TO_PLAY_ROOT,
    "one-pair-attempt.lock.json"), "utf8"),
  readFile(path.join(PRIOR_RECOVERY_ROOT, "live-report.json"), "utf8"),
  readFile(path.join(PRIOR_RECOVERY_ROOT,
    "one-pair-attempt.lock.json"), "utf8"),
  readFile(path.join(PRIOR_ROLE_SHAPE_ROOT, "live-report.json"), "utf8"),
  readFile(path.join(PRIOR_ROLE_SHAPE_ROOT,
    "one-pair-attempt.lock.json"), "utf8"),
  readFile(path.join(PRIOR_TRANSIENT_TRANSPORT_ROOT, "live-report.json"),
    "utf8"),
  readFile(path.join(PRIOR_TRANSIENT_TRANSPORT_ROOT,
    "one-pair-attempt.lock.json"), "utf8"),
  readFile(path.join(PRIOR_TRANSPORT_DIAGNOSTIC_ROOT, "live-report.json"),
    "utf8"),
  readFile(path.join(PRIOR_TRANSPORT_DIAGNOSTIC_ROOT,
    "one-pair-attempt.lock.json"), "utf8"),
  readFile(path.join(PRIOR_CLASSIFIED_FAILURE_ROOT, "live-report.json"),
    "utf8"),
  readFile(path.join(PRIOR_CLASSIFIED_FAILURE_ROOT,
    "one-pair-attempt.lock.json"), "utf8"),
  readFile(path.join(PRIOR_PARENT_VALIDATION_FAILURE_ROOT,
    "live-report.json"), "utf8"),
  readFile(path.join(PRIOR_PARENT_VALIDATION_FAILURE_ROOT,
    "one-pair-attempt.lock.json"), "utf8"),
  readFile(path.join(PRIOR_CHALLENGER_CANARY_ROOT, "live-report.json"),
    "utf8"),
  readFile(path.join(PRIOR_CHALLENGER_CANARY_ROOT,
    "one-call-attempt.lock.json"), "utf8"),
]);
const report = JSON.parse(reportText);
const paired = JSON.parse(pairedText);
const priorReport = JSON.parse(priorReportText);
const priorLock = JSON.parse(priorLockText);
const priorHowToPlayReport = JSON.parse(priorHowToPlayReportText);
const priorHowToPlayLock = JSON.parse(priorHowToPlayLockText);
const priorRecoveryReport = JSON.parse(priorRecoveryReportText);
const priorRecoveryLock = JSON.parse(priorRecoveryLockText);
const priorRoleShapeReport = JSON.parse(priorRoleShapeReportText);
const priorRoleShapeLock = JSON.parse(priorRoleShapeLockText);
const priorTransientTransportReport = JSON.parse(
  priorTransientTransportReportText,
);
const priorTransientTransportLock = JSON.parse(
  priorTransientTransportLockText,
);
const priorTransportDiagnosticReport = JSON.parse(
  priorTransportDiagnosticReportText,
);
const priorTransportDiagnosticLock = JSON.parse(
  priorTransportDiagnosticLockText,
);
const priorClassifiedFailureReport = JSON.parse(
  priorClassifiedFailureReportText,
);
const priorClassifiedFailureLock = JSON.parse(
  priorClassifiedFailureLockText,
);
const priorParentValidationFailureReport = JSON.parse(
  priorParentValidationFailureReportText,
);
const priorParentValidationFailureLock = JSON.parse(
  priorParentValidationFailureLockText,
);
const priorChallengerCanaryReport = JSON.parse(
  priorChallengerCanaryReportText,
);
const priorChallengerCanaryLock = JSON.parse(
  priorChallengerCanaryLockText,
);

await check("obsolete_faq_tracer_is_immutable_and_not_reused", () => {
  verifyEnvelope(priorReport, "reportHash");
  verifyEnvelope(priorLock, "lockHash");
  assert.equal(priorReport.reportHash,
    execution.priorObsoleteTracerAttempt.reportHash);
  assert.equal(priorLock.lockHash,
    execution.priorObsoleteTracerAttempt.lockHash);
  assert.equal(priorReport.status, "failed");
  assert.equal(execution.priorObsoleteTracerAttempt.mayHaveBeenBilled, true);
  assert.equal(execution.priorObsoleteTracerAttempt
    .reusableAsHowToPlayEvidence, false);
});

await check("first_how_to_play_attempt_is_bound_as_zero_egress_failure", () => {
  verifyEnvelope(priorHowToPlayReport, "reportHash");
  verifyEnvelope(priorHowToPlayLock, "lockHash");
  const prior = execution.priorHowToPlayAttempt;
  assert.equal(priorHowToPlayReport.reportHash, prior.reportHash);
  assert.equal(priorHowToPlayLock.lockHash, prior.lockHash);
  assert.equal(priorHowToPlayReport.status, "failed");
  assert.equal(priorHowToPlayReport.providerFailureReceipt.code,
    "PROVIDER_REQUEST_CONTRACT_REJECTED");
  assert.equal(priorHowToPlayReport.providerFailureReceipt
    .requestDefinitelyNotSent, true);
  assert.equal(priorHowToPlayReport.providerPhysicalAttemptsObserved, 0);
  assert.equal(priorHowToPlayReport.calculatedOrConservativeCostCny,
    "0.000000");
  assert.equal(priorHowToPlayReport.candidatesPromoted, 0);
});

await check("first_recovery_attempt_is_bound_as_one_conservative_call", () => {
  verifyEnvelope(priorRecoveryReport, "reportHash");
  verifyEnvelope(priorRecoveryLock, "lockHash");
  const prior = execution.priorRecoveryAttempt;
  assert.equal(priorRecoveryReport.reportHash, prior.reportHash);
  assert.equal(priorRecoveryLock.lockHash, prior.lockHash);
  assert.equal(priorRecoveryReport.status, "failed");
  assert.equal(priorRecoveryReport.failureCode,
    "OFFLINE_PROVIDER_RESULT_REJECTED");
  assert.equal(priorRecoveryReport.providerPhysicalAttemptsObserved, 1);
  assert.equal(priorRecoveryReport.usageKnown, false);
  assert.equal(priorRecoveryReport.calculatedOrConservativeCostCny,
    "3.530814");
  assert.equal(priorRecoveryReport.candidatesPromoted, 0);
});

await check("role_shape_attempt_is_bound_as_three_known_calls", () => {
  verifyEnvelope(priorRoleShapeReport, "reportHash");
  verifyEnvelope(priorRoleShapeLock, "lockHash");
  const prior = execution.priorRoleShapeAttempt;
  assert.equal(priorRoleShapeReport.reportHash, prior.reportHash);
  assert.equal(priorRoleShapeLock.lockHash, prior.lockHash);
  assert.equal(priorRoleShapeReport.status, "failed");
  assert.equal(priorRoleShapeReport.failureCode,
    "TEACH_CTX2SKILL_STUDENT_ANSWERS_INVALID");
  assert.equal(priorRoleShapeReport.providerPhysicalAttemptsObserved, 3);
  assert.equal(priorRoleShapeReport.providerObserved.totals.totalTokens,
    880_861);
  assert.equal(priorRoleShapeReport.calculatedOrConservativeCostCny,
    "1.552187");
  assert.equal(priorRoleShapeReport.candidatesPromoted, 0);
});

await check("transient_transport_attempt_is_bound_as_four_conservative_calls", () => {
  verifyEnvelope(priorTransientTransportReport, "reportHash");
  verifyEnvelope(priorTransientTransportLock, "lockHash");
  const prior = execution.priorTransientTransportAttempt;
  assert.equal(priorTransientTransportReport.reportHash, prior.reportHash);
  assert.equal(priorTransientTransportLock.lockHash, prior.lockHash);
  assert.equal(priorTransientTransportReport.status, "failed");
  assert.equal(priorTransientTransportReport.failureCode,
    "OFFLINE_PROVIDER_ATTEMPT_FAILED");
  assert.equal(priorTransientTransportReport.brokerFailureReceipt.role,
    "challenger");
  assert.equal(priorTransientTransportReport.providerPhysicalAttemptsObserved,
    4);
  assert.equal(priorTransientTransportReport.providerObserved.totals
    .totalTokens, 881_491);
  assert.equal(priorTransientTransportReport.calculatedOrConservativeCostCny,
    "5.083318");
  assert.equal(priorTransientTransportReport.candidatesPromoted, 0);
});

await check("later_failures_and_live_canary_are_immutable", () => {
  for (const [reportValue, lockValue] of [
    [priorTransportDiagnosticReport, priorTransportDiagnosticLock],
    [priorClassifiedFailureReport, priorClassifiedFailureLock],
    [priorParentValidationFailureReport, priorParentValidationFailureLock],
    [priorChallengerCanaryReport, priorChallengerCanaryLock],
  ]) {
    verifyEnvelope(reportValue, "reportHash");
    verifyEnvelope(lockValue, "lockHash");
  }
  assert.equal(priorTransportDiagnosticReport.reportHash,
    execution.priorTransportDiagnosticAttempt.reportHash);
  assert.equal(priorClassifiedFailureReport.reportHash,
    execution.priorClassifiedFailureAttempt.reportHash);
  assert.equal(priorParentValidationFailureReport.reportHash,
    execution.priorParentValidationFailureAttempt.reportHash);
  assert.equal(priorParentValidationFailureLock.lockHash,
    execution.priorParentValidationFailureAttempt.lockHash);
  assert.equal(priorParentValidationFailureReport.status, "failed");
  assert.equal(priorParentValidationFailureReport.providerObserved.totals
    .totalTokens, 19_102);
  assert.equal(priorParentValidationFailureReport
    .calculatedOrConservativeCostCny, "3.565626");
  assert.equal(priorChallengerCanaryReport.reportHash,
    execution.priorChallengerCanary.reportHash);
  assert.equal(priorChallengerCanaryLock.lockHash,
    execution.priorChallengerCanary.lockHash);
  assert.equal(priorChallengerCanaryReport.status, "passed");
  assert.equal(priorChallengerCanaryReport.providerPhysicalAttempts, 1);
  assert.equal(priorChallengerCanaryReport.totalTokens, 7_369);
  assert.equal(priorChallengerCanaryReport.calculatedCostCnyMicros, 13_150);
  assert.equal(priorChallengerCanaryReport.canary.roleGraphAdvancedTo,
    "reasoner");
  assert.equal(priorChallengerCanaryReport.candidateEmissions, 0);
  assert.equal(priorChallengerCanaryReport.candidatesPromoted, 0);
});

await check("live_report_is_hash_sealed_and_contract_bound", () => {
  verifyEnvelope(report, "reportHash");
  assert.equal(report.schemaVersion,
    "starcraft_tmg_ticket_17_slice_170_live_report_v8");
  assert.equal(report.status, "passed");
  assert.equal(report.contractHash, proof.contractHash);
  assert.equal(report.executionContractHash, execution.executionContractHash);
  assert.deepEqual(report.target, execution.target);
  assert.equal(report.taskRef.taskId, proof.target.taskId);
  assert.equal(report.productionSkillRef.skillId,
    proof.target.productionSkillId);
  assert.equal(report.productionSkillRef.catalogueHash,
    proof.target.productionCatalogueHash);
  assert.equal(report.promptPackHash, proof.common.promptPackHash);
  assert.equal(report.pairedRunHash, paired.pairedRunHash);
  assert.equal(report.priorHowToPlayAttemptRef.reportHash,
    execution.priorHowToPlayAttempt.reportHash);
  assert.equal(report.priorHowToPlayAttemptRef
    .physicalProviderAttemptsObserved, 0);
  assert.equal(report.priorRecoveryAttemptRef.reportHash,
    execution.priorRecoveryAttempt.reportHash);
  assert.equal(report.priorRecoveryAttemptRef
    .physicalProviderAttemptsObserved, 1);
  assert.equal(report.priorRecoveryAttemptRef.usageKnown, false);
  assert.equal(report.priorRoleShapeAttemptRef.reportHash,
    execution.priorRoleShapeAttempt.reportHash);
  assert.equal(report.priorRoleShapeAttemptRef
    .physicalProviderAttemptsObserved, 3);
  assert.equal(report.priorRoleShapeAttemptRef.totalTokens, 880_861);
  assert.equal(report.priorTransientTransportAttemptRef.reportHash,
    execution.priorTransientTransportAttempt.reportHash);
  assert.equal(report.priorTransientTransportAttemptRef
    .physicalProviderAttemptsObserved, 4);
  assert.equal(report.priorTransientTransportAttemptRef
    .successfulTotalTokens, 881_491);
  assert.equal(report.priorParentValidationFailureAttemptRef.reportHash,
    execution.priorParentValidationFailureAttempt.reportHash);
  assert.equal(report.priorParentValidationFailureAttemptRef
    .successfulTotalTokens, 19_102);
  assert.equal(report.priorChallengerCanaryRef.reportHash,
    execution.priorChallengerCanary.reportHash);
  assert.equal(report.priorChallengerCanaryRef.totalTokens, 7_369);
  assert.equal(report.userAuthority.localIngress,
    "macos_login_keychain_generic_password");
  assert.equal(report.userAuthority.chatExposedMaterialAccepted, false);
  assert.equal(report.userAuthority.explicitLiveHowToPlayRecovery7PairFlag,
    true);
  assert.equal(report.userAuthority
    .priorParentValidationFailureAttemptBilledAcknowledged, true);
  assert.equal(report.userAuthority
    .priorChallengerCanaryPassedAcknowledged, true);
  assert.equal(report.userAuthority.keychainReceipt.secretInArguments, false);
  assert.equal(report.userAuthority.keychainReceipt.secretInEnvironment, false);
  assert.equal(report.userAuthority.keychainReceipt.secretPersistedByRunner,
    false);
});

await check("safe_paired_result_reconstructs_both_arms", () => {
  assert.equal(verifyStarcraftTmgSlice170PairedProofV1(paired), true);
  assert.deepEqual(Object.keys(paired.outputsByArm).sort(),
    ["direct_provider_control", "dsh"]);
  assert.equal(paired.counts.providerAttempts, 14);
  assert.equal(paired.counts.automaticRetries, 0);
});

await check("fourteen_real_provider_receipts_are_complete_and_retry_free", () => {
  assert.equal(report.provider.profileId, profile.providerProfileId);
  assert.equal(report.provider.requestedModel, profile.model);
  assert.equal(report.provider.physicalAttempts, 14);
  assert.equal(report.provider.automaticRetries, 0);
  assert.equal(report.provider.safeReceipts.length, 14);
  for (const receipt of report.provider.safeReceipts) {
    assert.match(receipt.receiptHash, /^[a-f0-9]{64}$/u);
    assert.equal(receipt.providerId, profile.provider);
    assert.equal(receipt.requestedModel, profile.model);
    assert.equal(receipt.reportedModel, profile.model);
    assert(receipt.status >= 200 && receipt.status < 300);
    assert.equal(receipt.tlsServerName, "api.deepseek.com");
    assert.equal(receipt.physicalAttempts, 1);
    assert.equal(receipt.automaticRetries, 0);
    assert.equal(receipt.trainingTruth, false);
  }
});

await check("usage_and_cost_close_across_provider_and_arm_receipts", () => {
  const provider = report.provider.safeReceipts.reduce((sum, receipt) => ({
    inputTokens: sum.inputTokens + receipt.usage.inputUnits,
    outputTokens: sum.outputTokens + receipt.usage.outputUnits,
    totalTokens: sum.totalTokens + receipt.usage.totalUnits,
    cacheHitTokens: sum.cacheHitTokens + receipt.usage.inputCacheHitUnits,
    cacheMissTokens: sum.cacheMissTokens + receipt.usage.inputCacheMissUnits,
    reasoningTokens:
      sum.reasoningTokens + (receipt.usage.reasoningOutputUnits ?? 0),
  }), {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cacheHitTokens: 0,
    cacheMissTokens: 0,
    reasoningTokens: 0,
  });
  for (const key of Object.keys(provider)) {
    assert.equal(report.totalUsage[key], provider[key]);
  }
  const armCost = report.usageByArm.reduce(
    (sum, row) => sum + row.calculatedCostNanoUsd,
    0,
  );
  assert.equal(report.totalUsage.calculatedCostNanoUsd, armCost);
  assert.equal(report.calculatedCostUsd,
    (armCost / 1_000_000_000).toFixed(9));
  assert.equal(report.costSnapshot.pendingAttempts, 0);
  assert.equal(report.costSnapshot.settledAttempts, 14);
  assert.equal(report.costSnapshot.cumulativeCostNanoUsd,
    execution.costLedger.targetStartingNanoUsd + armCost);
  const armCostCny = report.usageByArm.reduce(
    (sum, row) => sum + row.calculatedCostCnyMicros,
    0,
  );
  assert.equal(report.costSnapshot.cumulativeCnyMicros,
    execution.costLedger.targetStartingCnyMicros + armCostCny);
  assert(report.costSnapshot.cumulativeCostNanoUsd
    <= execution.costLedger.maximumCumulativeNanoUsd);
  assert(report.costSnapshot.cumulativeCnyMicros
    <= execution.costLedger.maximumCumulativeCnyMicros);
});

await check("blind_scores_precede_reveal_and_exclude_arm_identity", () => {
  assert.equal(report.blindEvaluation.evaluationContractHash,
    evaluationContract.evaluationContractHash);
  assert.equal(report.blindEvaluation.armIdentityAvailableToEvaluator, false);
  assert.equal(report.blindEvaluation.usageOrCostAvailableToEvaluator, false);
  assert.equal(report.blindEvaluation.diagnosticScoreIsSliceClosureGate, false);
  assert.equal(report.blindEvaluation.baseSkillCatalogueComplete, false);
  assert.equal(evaluationContract.qualityScoreIsSliceClosureGate, false);
  assert.equal(evaluationContract.qualityScoreIsPromotionGate, false);
  assert.equal(report.blindEvaluation.scores.length, 2);
  assert(report.blindEvaluation.scores.every((row) => (
    Number.isSafeInteger(row.score) && row.score >= 0 && row.score <= 100
      && typeof row.metDiagnosticReferenceFloor === "boolean"
  )));
  assert.equal(report.assignmentReveal.revealedAfterEvaluationHash,
    report.blindEvaluation.evaluationHash);
  assert.equal(report.assignmentReveal.commitmentHash,
    report.assignmentCommitment.commitmentHash);
});

await check("candidate_files_match_safe_result_and_remain_unreviewed", async () => {
  for (const arm of ["dsh", "direct_provider_control"]) {
    const [candidateText, markdown] = await Promise.all([
      readFile(path.join(LIVE_ROOT, `candidate-${arm}.json`), "utf8"),
      readFile(path.join(LIVE_ROOT, `candidate-${arm}.md`), "utf8"),
    ]);
    const candidate = JSON.parse(candidateText);
    const expected = paired.outputsByArm[arm].candidateBundle;
    assert.deepEqual(candidate, expected);
    assert.equal(assertStarcraftTmgSkillGenerationContract(
      candidate,
      "candidate-skill-bundle",
    ), candidate);
    assert.equal(markdown.trim(), candidate.skillMarkdown.trim());
    assert.equal(candidate.candidateStatus, "candidate_unreviewed");
    assert.equal(candidate.humanReviewed, false);
    assert.equal(candidate.canAffectStrategy, false);
    assert.equal(candidate.canAffectRules, false);
    assert.equal(candidate.promotionEligible, false);
    assert.equal(candidate.trainingTruth, false);
    assert.equal(candidate.skillArtifact.skillId,
      proof.target.productionSkillId);
    assert.equal(candidate.skillArtifact.skillType, "turn_flow");
    assert.equal(candidate.skillArtifact.phase, "multi_phase");
    assert.deepEqual(candidate.skillArtifact.appRuleEndpoints,
      proof.common.appRuleEndpoints);
    assert.equal(report.candidates[arm].candidateBundleHash,
      candidate.integrity.hash);
  }
});

await check("persisted_evidence_contains_no_raw_prompt_or_sensitive_value", () => {
  const all = `${reportText}\n${pairedText}`;
  assert.doesNotMatch(all,
    /\bBearer\s+|\b(?:sk|jsk)-[A-Za-z0-9_-]{12,}/iu);
  assert.doesNotMatch(all, /"promptNodes"\s*:/u);
  assert.doesNotMatch(all, /"userMessage"\s*:/u);
  assert.equal(report.localInputPersisted, false);
  assert.equal(report.rawPromptPersisted, false);
  assert.equal(report.rawResponsePersisted, false);
  assert.equal(report.reasoningPersisted, false);
  assert.equal(report.parentInputZeroed, true);
});

await check("no_source_refresh_large_batch_promotion_memory_or_training", () => {
  assert.equal(report.sourceRefreshPerformed, false);
  assert.equal(report.largeScaleProductionRun, false);
  assert.equal(report.candidatesPromoted, 0);
  assert.equal(report.memoryWrites, 0);
  assert.equal(report.selfPlayRuns, 0);
  assert.equal(report.muzeroExports, 0);
  assert.equal(report.humanReviewed, false);
  assert.equal(report.trainingTruth, false);
  assert.equal(paired.counts.promotions, 0);
});

const reportBody = {
  schemaVersion: "starcraft_tmg_ticket_17_slice_170_live_closure_report_v1",
  ticket: 17,
  slice: 170,
  status: failures.length === 0 ? "passed" : "failed",
  generatedAt: new Date().toISOString(),
  assertionsPassed: checks.filter((row) => row.passed).length,
  assertionsTotal: checks.length,
  checks,
  contractHash: proof.contractHash,
  executionContractHash: execution.executionContractHash,
  liveReportHash: report.reportHash,
  pairedRunHash: paired.pairedRunHash,
  providerPhysicalAttempts: report.provider.physicalAttempts,
  automaticRetries: report.provider.automaticRetries,
  totalUsage: report.totalUsage,
  calculatedCostUsd: report.calculatedCostUsd,
  calculatedCostCny: report.calculatedCostCny,
  blindDisposition: report.blindEvaluation.disposition,
  dshScore: report.candidates.dsh.score,
  controlScore: report.candidates.direct_provider_control.score,
  candidatesPromoted: 0,
  sourceRefreshPerformed: false,
  trainingTruth: false,
};
const closure = envelope(reportBody, "reportHash");
await mkdir(path.dirname(CLOSURE_PATH), { recursive: true });
await writeFile(CLOSURE_PATH, `${JSON.stringify(closure, null, 2)}\n`, "utf8");
console.log(JSON.stringify(closure, null, 2));
if (failures.length > 0) process.exitCode = 1;
