#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  STARCRAFT_TMG_CTX2SKILL_PAIRED_PROMPT_PACK_V1 as promptPack,
  STARCRAFT_TMG_SLICE_170_BLIND_EVALUATION_V1 as evaluationContract,
  STARCRAFT_TMG_TICKET_17_SLICE_170_PAIRED_PROOF_V1 as proof,
} from "../content/skill-generation/ticket-17-slice-170-paired-proof-v1.mjs";
import { STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V10 as execution } from
  "../content/skill-generation/ticket-17-slice-170-live-how-to-play-v10.mjs";
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from
  "../content/skill-generation/offline-provider-profile-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  createStarcraftTmgSkillCostGuardV1,
} from "../packages/skill-generation-runtime/provider-broker-v1.mjs";
import {
  assertStarcraftTmgOfflineSkillRoleOutputV3,
} from "../packages/skill-generation-runtime/provider-broker-v3.mjs";
import {
  compileStarcraftTmgOfflineSkillRoleProviderRequestV4,
  createStarcraftTmgOfflineSkillProviderBrokerV5,
  verifyStarcraftTmgOfflineSkillProviderRoleReceiptV5,
} from "../packages/skill-generation-runtime/provider-broker-v5.mjs";
import {
  verifyStarcraftTmgHowToPlayModelProjectionV1,
} from "../packages/skill-generation-runtime/how-to-play-model-projection-v1.mjs";
import {
  createStarcraftTmgSlice170BlindAssignmentV1,
  createStarcraftTmgSlice170SkillJobV1,
  runStarcraftTmgSlice170PairedProofV1,
  verifyStarcraftTmgSlice170PairedProofV1,
} from "../packages/skill-generation-runtime/paired-skill-proof-v1.mjs";
import { createStarcraftTmgHowToPlaySkillStagedInputV1 } from
  "../packages/skill-generation-runtime/how-to-play-skill-input-v1.mjs";
import { createStarcraftTmgProductionSkillCatalogueV1 } from
  "../packages/skill-generation-runtime/production-skill-catalogue-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV1 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v1.mjs";
import { createStarcraftTmgProviderEgressTransportV1 } from
  "../packages/secure-provider-runtime/provider-egress-transport-v1.mjs";
import { StarcraftTmgProviderEgressError } from
  "../packages/secure-provider-runtime/provider-egress-contract-v1.mjs";
import { assertStarcraftTmgProviderWorkerSuccessV1 } from
  "../packages/secure-provider-runtime/provider-worker-success-classifier-v1.mjs";
import { createStarcraftTmgProviderEgressWorkerPortV2 } from
  "../packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs";
import { loadCurrentOfficialSkillFixtureV1 } from
  "./support/current-official-skill-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = path.join(
  ROOT,
  "build/ticket-17-skill-generation-v1/slice-170-preflight-report.json",
);
const GENERATED_AT = "2026-09-04T20:00:00.000Z";
const LIVE_RUNNER_PATH = path.join(
  ROOT,
  "scripts/run-ticket-17-live-paired-skill-once-v1.mjs",
);
const IPC_FIXTURE_PATH = path.join(
  ROOT,
  "scripts/fixtures/provider-egress-worker-ipc-fixture-v1.mjs",
);
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
    const message = error instanceof Error
      ? error.stack || error.message : String(error);
    checks.push({ id, passed: false, error: message });
    failures.push(`${id}: ${message}`);
  }
}

function clock() {
  let second = 0;
  return () => new Date(Date.UTC(2026, 8, 4, 20, 0, second++))
    .toISOString();
}

function ids() {
  let index = 0;
  return (scope) => `slice170-${scope.replaceAll(/[^A-Za-z0-9._:-]/gu, "-")}-${++index}`;
}

function spawnIpcFixture(mode = "success") {
  return spawn(process.execPath, [IPC_FIXTURE_PATH, mode], {
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
const evidenceId = proof.target.evidenceId;
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

function claim(claimId, statement) {
  return {
    claimId,
    claimType: "legality",
    statement,
    evidenceIds: [evidenceId],
    advisoryOnly: false,
  };
}

function roleOutput(role, prompt) {
  const contract = prompt.roleOutputContract;
  assert.equal(contract.role, role);
  if (role === "planner") return {
    summary: "Plan the one current How-to-Play routing Skill.",
    questions: [{
      questionId: "question.how-to-play.workflow",
      prompt:
        "How does one total Skill route a live question to an exact RuleAtom and authoritative Rules decision?",
      evidenceIds: [evidenceId],
    }],
    learningObjectives: [
      "Route by phase and chapter before retrieving an exact current RuleAtom.",
      "Keep legality and state transitions in the Rules/Referee service.",
    ],
  };
  if (role === "tutor") return {
    summary: "Teach the complete index and authority boundary.",
    claims: [
      claim("claim.index.binding",
        "One How-to-Play Skill routes 1,163 hash-bound RuleAtom references through 10 chapters: 1,049 executable current atoms and 114 display-only historical atoms."),
      claim("claim.rules.authority",
        "The chapter index is retrieval evidence only; current Rules/Referee LegalSpace and state-transition authority decide legality and mutation."),
    ],
    lessonSteps: [{
      stepId: "lesson.how-to-play.contract",
      summary:
        "Select a chapter, retrieve and verify an exact atom, then ask Rules.",
      claimIds: ["claim.index.binding", "claim.rules.authority"],
    }],
  };
  if (role === "student") return {
    summary: "Restate the total-Skill lookup and execution boundary.",
    claims: [],
    answers: [{
      questionId: "question.how-to-play.workflow",
      answerSummary:
        "Route the current phase or topic to a chapter, retrieve exact evidence, and let current LegalSpace decide legality.",
      claimIds: ["claim.index.binding", "claim.rules.authority"],
    }],
    uncertainties: [],
  };
  if (role === "challenger") return {
    summary: "Probe misuse of summaries and historical display atoms.",
    probes: [{
      probeId: "probe.illegal.index-as-authority",
      kind: "illegal_boundary",
      targetClaimId: "claim.rules.authority",
      prompt:
        "May an index summary or display-only atom decide live legality without exact retrieval and current Rules verification?",
    }],
  };
  if (role === "reasoner") return {
    summary: "Defend exact retrieval and the confirmed action lifecycle.",
    claims: [
      claim("claim.atom.retrieval",
        "Retrieve the full current RuleAtom by evidenceId and verify its content hash, locator hash, and current Rules receipt hash before use."),
      claim("claim.action.lifecycle",
        "Request current LegalSpace, Preview the enabled proposal, obtain human confirmation, Apply it, and verify AcceptedReceipt plus Replay; fail closed on missing or drifted evidence."),
    ],
    resolutions: [{
      probeId: "probe.illegal.index-as-authority",
      disposition: "defended",
      decisionSummary:
        "An index routes retrieval but never supplies legality; display-only atoms cannot seed current claims.",
      claimIds: ["claim.atom.retrieval", "claim.action.lifecycle"],
    }],
  };
  if (role === "proposer") return {
    summary: "Plan one total How-to-Play candidate from passed claims.",
    revisionTargets: [],
    candidatePlan: clone(contract.fixedValues.candidatePlan),
  };
  if (role === "generator") return {
    summary: "Materialize the bounded unreviewed total rules-routing candidate.",
    claims: [],
    candidateDraft: {
      ...clone(contract.fixedValues.candidateIdentity),
      summary:
        "One total How-to-Play Skill routes all phases through the complete current index while authoritative Rules/Referee services retain legality and state-transition authority.",
      claimIds: clone(contract.fixedValues.claimIds),
      procedure: [
        "Read the live phase and topic, then select the matching chapter from the 10-chapter index.",
        "Retrieve the full current RuleAtom by evidenceId and verify its content hash, locator hash, and Rules receipt hash.",
        "Ask the authoritative Rules/Referee service for current LegalSpace and use only an enabled proposal.",
        "Preview the proposal, obtain human confirmation, Apply it, then verify AcceptedReceipt and Replay.",
      ],
      legalityChecks: [
        "Fail closed when a RuleAtom, content hash, locator hash, Rules receipt, LegalSpace result, or state transition is missing or drifted.",
        "Keep all 114 display-only atoms readable for history but never use them to seed a current legality claim.",
      ],
      illegalPatterns: [
        "Reject treating a chapter summary as executable rule authority.",
        "Reject creating one deployable Skill per RuleAtom or bypassing current LegalSpace.",
      ],
      examples: [
        "For a movement question, select its chapter, retrieve the exact movement RuleAtom, then Preview the Rules-enabled action.",
      ],
      counterExamples: [
        "Do not infer legality from a display-only historical atom or apply an action without human confirmation.",
      ],
      judgeTests: [
        {
          testId: "judge.positive.exact-routing",
          kind: "positive",
          claimIds: [
            "claim.index.binding", "claim.rules.authority",
            "claim.atom.retrieval", "claim.action.lifecycle",
          ],
          expected: "pass",
        },
        {
          testId: "judge.negative.index-authority",
          kind: "negative",
          claimIds: ["claim.rules.authority", "claim.atom.retrieval"],
          expected: "reject",
        },
      ],
      unresolvedClaims: [],
    },
  };
  throw new Error(`unsupported role ${role}`);
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
    async complete({ providerRequest }) {
      calls.push(clone(providerRequest));
      const ordinal = calls.length;
      const prompt = providerRequest.promptNodes[0];
      const role = prompt.roleRequest.role;
      if (options.validationFailureRole === role) {
        throw new TypeError("fixture unsafe Provider success result");
      }
      if (options.failureRole === role) {
        throw new StarcraftTmgProviderEgressError(
          options.failureCode || "PROVIDER_UPSTREAM_FAILED",
          {
            status: options.failureStatus ?? 503,
            requestMayHaveBeenSent: true,
            physicalAttempts: 1,
          },
        );
      }
      const validRoleOutput = roleOutput(role, prompt);
      const projectedRoleOutput = typeof options.transformRoleOutput
          === "function"
        ? options.transformRoleOutput(validRoleOutput, role)
        : validRoleOutput;
      const output = {
        schemaVersion: "starcraft_tmg_offline_skill_role_output_v1",
        channels: {
          skill_generation_role_output: projectedRoleOutput,
        },
      };
      const inputUnits = 800 + ordinal;
      const outputUnits = 120 + ordinal;
      const cacheHit = 80;
      const receiptBody = {
        schemaVersion: "starcraft_tmg_provider_egress_transport_v1.success",
        requestId: providerRequest.requestId,
        providerProfileRef: {
          id: profile.providerProfileId,
          version: profile.version,
          hash: profile.integrity.hash,
        },
        egressPolicyHash: resolved.egressBinding.policyHash,
        providerId: profile.provider,
        requestedModel: profile.model,
        reportedModel: profile.model,
        providerRequestIdHash: hashStarcraftTmgContract(`slice170-${ordinal}`),
        providerSystemFingerprintHash: hashStarcraftTmgContract("fixture-model"),
        status: 200,
        usage: {
          inputUnits,
          outputUnits,
          totalUnits: inputUnits + outputUnits,
          inputCacheHitUnits: cacheHit,
          inputCacheMissUnits: inputUnits - cacheHit,
        },
        responseFingerprint: hashStarcraftTmgContract(output),
        dnsAddressSetHash: hashStarcraftTmgContract(["93.184.216.34"]),
        tlsServerName: "api.deepseek.com",
        tlsCertificateVerificationDisabled: false,
        redirectFollowed: false,
        proxyUsed: false,
        physicalAttempts: 1,
        automaticRetries: 0,
        startedAt: new Date(Date.UTC(2026, 8, 4, 20, 1, ordinal))
          .toISOString(),
        finishedAt: new Date(Date.UTC(2026, 8, 4, 20, 2, ordinal))
          .toISOString(),
        trainingTruth: false,
      };
      return { output, usageReceipt: envelope(receiptBody, "receiptHash") };
    },
    readWorkerState() {
      return {
        ok: true,
        worker: {
          state: "attached",
          exitReason: null,
          expectedExit: false,
          providerTransportMounted: true,
          automaticRestarted: false,
          trainingTruth: false,
        },
      };
    },
  };
}

let worker = null;
let broker = null;
let result = null;
let compactPlannerProviderRequest = null;

await check("paired_contract_and_cost_denominator_are_frozen", () => {
  assert.equal(proof.slice, 170);
  assert.equal(proof.common.maximumPhysicalProviderAttempts, 14);
  assert.equal(proof.common.automaticRetries, 0);
  assert.equal(proof.common.conservativeMaximumPairCostUsd, "6.178923520");
  assert.equal(proof.common.conservativeMaximumPairCostCny, "49.431389");
  assert.equal(proof.target.productionCatalogueSkillCount, 53);
  assert.equal(execution.target.productionSkillId,
    proof.target.productionSkillId);
  assert.equal(execution.target.productionCatalogueHash,
    proof.target.productionCatalogueHash);
  assert.equal(execution.targetAttemptOrdinal, 10);
  assert.equal(execution.outputDirectoryName, "how-to-play-attempt-10");
  assert.equal(execution.priorHowToPlayAttempt.requestDefinitelyNotSent, true);
  assert.equal(execution.priorHowToPlayAttempt
    .physicalProviderAttemptsObserved, 0);
  assert.equal(execution.priorHowToPlayAttempt.costNanoUsd, 0);
  assert.equal(execution.credentialIngress.kind,
    "macos_login_keychain_generic_password");
  assert.equal(execution.credentialIngress.chatCredentialAllowed, false);
  assert.equal(execution.credentialIngress.environmentCredentialAllowed,
    false);
  assert.equal(execution.credentialIngress.argumentCredentialAllowed, false);
  assert.equal(execution.credentialIngress.repositoryCredentialAllowed, false);
  assert.equal(execution.priorRecoveryAttempt.physicalProviderAttemptsObserved,
    1);
  assert.equal(execution.priorRecoveryAttempt.usageKnown, false);
  assert.equal(execution.priorRecoveryAttempt.conservativeCostCnyMicros,
    3_530_814);
  assert.equal(execution.priorRoleShapeAttempt
    .physicalProviderAttemptsObserved, 3);
  assert.equal(execution.priorRoleShapeAttempt.totalTokens, 880_861);
  assert.equal(execution.priorRoleShapeAttempt.calculatedCostCnyMicros,
    1_552_187);
  assert.equal(execution.priorTransientTransportAttempt
    .physicalProviderAttemptsObserved, 4);
  assert.equal(execution.priorTransientTransportAttempt
    .successfulTotalTokens, 881_491);
  assert.equal(execution.priorTransientTransportAttempt
    .attemptCalculatedOrConservativeCostCnyMicros, 5_083_318);
  assert.equal(execution.priorTransportDiagnosticAttempt
    .physicalProviderAttemptsObserved, 4);
  assert.equal(execution.priorTransportDiagnosticAttempt
    .successfulTotalTokens, 881_624);
  assert.equal(execution.priorTransportDiagnosticAttempt
    .attemptCalculatedOrConservativeCostCnyMicros, 5_083_791);
  assert.equal(execution.priorTransportDiagnosticAttempt
    .transportFailureReceiptPreserved, false);
  assert.equal(execution.priorClassifiedFailureAttempt
    .physicalProviderAttemptsObserved, 4);
  assert.equal(execution.priorClassifiedFailureAttempt
    .successfulTotalTokens, 19_175);
  assert.equal(execution.priorClassifiedFailureAttempt
    .transportFailureClass,
  "PROVIDER_WORKER_RESULT_VALIDATION_REJECTED");
  assert.equal(execution.priorClassifiedFailureAttempt
    .attemptCalculatedOrConservativeCostCnyMicros, 3_565_905);
  assert.equal(execution.priorParentValidationFailureAttempt
    .physicalProviderAttemptsObserved, 4);
  assert.equal(execution.priorParentValidationFailureAttempt
    .successfulTotalTokens, 19_102);
  assert.equal(execution.priorParentValidationFailureAttempt
    .attemptCalculatedOrConservativeCostCnyMicros, 3_565_626);
  assert.equal(execution.priorChallengerCanary.providerPhysicalAttempts, 1);
  assert.equal(execution.priorChallengerCanary.totalTokens, 7_369);
  assert.equal(execution.priorChallengerCanary.calculatedCostCnyMicros,
    13_150);
  assert.equal(execution.priorChallengerCanary.roleGraphAdvancedTo,
    "reasoner");
  assert.equal(execution.priorGeneratorParentValidationFailureAttempt
    .providerWorkerCallsObserved, 7);
  assert.equal(execution.priorGeneratorParentValidationFailureAttempt
    .reportedPhysicalProviderAttemptsObserved, 1);
  assert.equal(execution.priorGeneratorParentValidationFailureAttempt
    .reconstructedPhysicalProviderAttemptsObserved, 7);
  assert.equal(execution.priorGeneratorParentValidationFailureAttempt
    .successfulProviderReceiptsObserved, 6);
  assert.equal(execution.priorGeneratorParentValidationFailureAttempt
    .successfulTotalTokens, 40_506);
  assert.equal(execution.priorGeneratorParentValidationFailureAttempt
    .attemptCalculatedOrConservativeCostCnyMicros, 3_603_783);
  assert.equal(execution.priorMalformedGeneratorFailureAttempt
    .providerWorkerCallsObserved, 14);
  assert.equal(execution.priorMalformedGeneratorFailureAttempt
    .physicalProviderAttemptsObserved, 14);
  assert.equal(execution.priorMalformedGeneratorFailureAttempt
    .successfulProviderReceiptsObserved, 13);
  assert.equal(execution.priorMalformedGeneratorFailureAttempt
    .successfulTotalTokens, 90_859);
  assert.equal(execution.priorMalformedGeneratorFailureAttempt
    .failedCallUsageKnown, false);
  assert.equal(execution.priorMalformedGeneratorFailureAttempt
    .attemptCalculatedOrConservativeCostCnyMicros, 3_689_865);
  assert.equal(execution.costLedger.maximumNewPairNanoUsd, 6_178_923_520);
  assert.equal(execution.costLedger.maximumNewPairCnyMicros, 49_431_389);
  assert.equal(execution.costLedger.targetStartingCnyMicros, 30_407_752);
  assert.equal(execution.costLedger.maximumCumulativeCnyMicros, 79_839_141);
  assert.equal(execution.costLedger.crossesNotificationThresholdAtMaximum,
    false);
  assert.equal(evaluationContract.maximumScore, 100);
  assert.equal(evaluationContract.diagnosticReferenceFloor, 70);
  assert.equal(evaluationContract.qualityScoreIsSliceClosureGate, false);
  assert.equal(evaluationContract.qualityScoreIsPromotionGate, false);
  assert.equal(evaluationContract.baseSkillCatalogueComplete, false);
  assert.equal(proof.closureSemantics
    .technicalClosureRequiresDiagnosticReferenceFloor, false);
  assert.equal(proof.closureSemantics.baseSkillCatalogueComplete, false);
  assert.equal(proof.closureSemantics.catalogueCoverageClaimAllowed, false);
  assert.equal(proof.liveAuthority.notBeforeInstant,
    "2026-09-04T10:00:00.000Z");
  assert.equal(promptPack.roleSequence.length, 7);
  assert(promptPack.method.some((row) => (
    row.includes("Only Generator may return candidateDraft")
      && row.includes("no model role may invoke candidate emission")
  )));
  assert.match(proof.contractHash, /^[a-f0-9]{64}$/u);
});

await check("current_official_total_rules_skill_is_exact_and_not_refreshed", () => {
  assert.equal(stagedInput.task.taskId, proof.target.taskId);
  assert.equal(stagedInput.task.taskHash, proof.target.taskHash);
  assert.equal(stagedInput.stagedInputHash, proof.target.stagedInputHash);
  assert.equal(stagedInput.evidence.length, 1);
  assert.equal(stagedInput.evidence[0].contentHash,
    proof.target.evidenceContentHash);
  assert.equal(stagedInput.evidence[0].kind, "current_rule_index");
  assert.equal(stagedInput.evidence[0].content.skillId,
    proof.target.productionSkillId);
  assert.equal(stagedInput.bindings.productionCatalogueHash,
    productionCatalogue.catalogueHash);
  assert.equal(productionCatalogue.counts.productionSkills, 53);
  assert.equal(stagedInput.bindings.source.sourceRefreshPerformed, false);
});

await check("blind_assignment_is_committed_before_local_ingress", () => {
  const first = createStarcraftTmgSlice170BlindAssignmentV1();
  const second = createStarcraftTmgSlice170BlindAssignmentV1();
  assert.deepEqual(first, second);
  assert.equal(first.commitment.committedBeforeLocalIngress, true);
  assert.deepEqual(Object.values(first.mapping).sort(),
    ["direct_provider_control", "dsh"]);
});

await check("v4_compact_prompt_passes_transport_and_diagnostic_gates", async () => {
  const job = createStarcraftTmgSlice170SkillJobV1({
    arm: "direct_provider_control",
    stagedInput,
    egressAllowlistHash: resolved.egressBinding.policyHash,
    createdAt: GENERATED_AT,
  });
  const requestBody = {
    schemaVersion: "starcraft_tmg_teach_ctx2skill_role_request_v1",
    runId: "run.slice170.compiler.check",
    nodeId: "teach.plan",
    role: "planner",
    phase: "teach",
    sequenceIndex: 0,
    graphHash:
      "20246d7c90478a4150951a0e9e752cbc94685bd59e91993196dae2859abda639",
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
      normalizedDatasetHash: stagedInput.bindings.source.normalizedDatasetHash,
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
  };
  const rolePacket = {
    request: envelope(requestBody, "requestHash"),
    stagedInput,
    contextReceipts: [],
  };
  const compiled = compileStarcraftTmgOfflineSkillRoleProviderRequestV4({
    jobManifest: job,
    rolePacket,
    requestId: "slice170-compiler-request",
  });
  compactPlannerProviderRequest = clone(compiled.providerRequest);
  assert.notEqual(compiled.providerRequestHash,
    compiled.v3ProviderRequestHash);
  assert.equal(compiled.promptContract.roleOutputContract.role, "planner");
  assert.equal(compiled.promptContract.roleOutputContract.strictShapeVersion,
    "starcraft_tmg_paired_role_shape_v1");
  assert(Array.isArray(compiled.promptContract.roleOutputContract
    .exactJsonTemplate.channels.skill_generation_role_output.questions));
  assert.equal(compiled.promptContract.roleOutputContract
    .exactJsonTemplate.channels.skill_generation_role_output.questions.length,
  1);
  assert.equal(compiled.promptContract.promptPackArtifact.promptPackHash,
    promptPack.promptPackHash);
  assert.equal(verifyStarcraftTmgHowToPlayModelProjectionV1(
    compiled.promptContract.stagedInput,
    stagedInput,
  ), true);
  assert.equal(compiled.promptContract.fullStagedInputHash,
    stagedInput.stagedInputHash);
  assert.equal(compiled.promptContract.fullRuleEntriesIncludedInModelPrompt,
    false);
  assert.equal(compiled.promptContract.stagedInput.evidence[0]
    .fullRuleEntriesIncludedInModelPrompt, false);
  assert(compiled.promptContract.stagedInput.evidence[0].chapters.every(
    (chapter) => !Object.hasOwn(chapter, "entries"),
  ));
  assert(Buffer.byteLength(JSON.stringify(stagedInput), "utf8") > 700_000);
  assert(compiled.serializedBytes < 64 * 1024);
  assert(compiled.serializedBytes
    < Buffer.byteLength(JSON.stringify(stagedInput), "utf8") / 10);
  assert.equal(hashStarcraftTmgContract(compiled.providerRequest),
    compiled.providerRequestHash);
  assert.equal(compiled.promptContract.roleRequest.capabilities
    .readHostSecrets, undefined);
  const classifierFixtureWorker = fakeWorker();
  const classifierFixture = await classifierFixtureWorker.complete({
    providerRequest: compiled.providerRequest,
  });
  assert.equal(assertStarcraftTmgProviderWorkerSuccessV1(
    classifierFixture,
    {
      providerRequestId: compiled.providerRequest.requestId,
      egressBinding: resolved.egressBinding,
      maxOutputBytes: 256 * 1024,
    },
  ), true);
  const classifiedPort = createStarcraftTmgProviderEgressWorkerPortV2({
    providerProfileRegistry: registry,
    maxWorkers: 1,
    maxOutputBytes: 256 * 1024,
    handshakeTimeoutMs: 5_000,
    shutdownGraceMs: 1_000,
  });
  const classifiedMetadata = classifiedPort.metadata();
  assert.equal(classifiedMetadata.adapterVersion,
    "starcraft_tmg_provider_egress_worker_port_v2");
  assert.equal(classifiedMetadata.successRejectionProducesSafeTransportReceipt,
    true);
  const classifiedCredential = Buffer.from("fixture-development-only", "utf8");
  const classifiedAttachment = await classifiedPort.attachCredential({
    attachmentId: "slice170-classified-child-fixture",
    providerProfile: profile,
    credentialBytes: classifiedCredential,
  });
  assert.equal(classifiedCredential.every((byte) => byte === 0), true);
  assert.equal(classifiedPort.readWorkerState({
    workerRef: classifiedAttachment.workerRef,
  }).worker.state, "attached");
  await classifiedPort.detachCredential({
    workerRef: classifiedAttachment.workerRef,
    reason: "slice170_classified_fixture_complete",
  });
  await classifiedPort.close();
  const transport = createStarcraftTmgProviderEgressTransportV1({
    async resolveAddresses() {
      throw new Error("EXPECTED_OFFLINE_DNS_STOP");
    },
    requestImplementation() {
      throw new Error("NETWORK_MUST_NOT_RUN");
    },
  });
  const credentialBytes = Buffer.from("fixture-development-only", "utf8");
  try {
    await assert.rejects(transport.complete({
      egressBinding: resolved.egressBinding,
      credentialBytes,
      providerRequest: compiled.providerRequest,
    }), (error) => (
      error?.code === "PROVIDER_DNS_RESOLUTION_FAILED"
        && error?.safeReceipt?.requestDefinitelyNotSent === true
        && error?.safeReceipt?.physicalAttempts === 0
    ));
  } finally {
    credentialBytes.fill(0);
  }
  const malformedWorker = fakeWorker({
    transformRoleOutput(output, role) {
      assert.equal(role, "planner");
      return { ...output, questions: output.questions[0] };
    },
  });
  const malformedBroker = createStarcraftTmgOfflineSkillProviderBrokerV5({
    providerWorkerPort: malformedWorker,
    costGuard: createStarcraftTmgSkillCostGuardV1({ now: clock() }),
    now: clock(),
  });
  await assert.rejects(malformedBroker.completeRole({
    jobManifest: job,
    workerRef: "provider-worker-slice170-malformed-fixture",
    rolePacket,
    attemptId: "slice170-malformed-planner-attempt",
  }), (error) => (
    error?.code === "PAIRED_ROLE_OUTPUT_CONTRACT_REJECTED"
      && error?.safeReceipt?.role === "planner"
      && error?.safeReceipt?.outputDiagnostic?.field === "questions"
      && error?.safeReceipt?.outputDiagnostic?.kind === "object"
      && error?.safeReceipt?.outputDiagnostic?.payloadIncluded === false
      && error?.safeReceipt?.payloadIncluded === false
      && error?.safeReceipt?.physicalAttempts === 1
      && error?.safeReceipt?.automaticRetries === 0
  ));
  assert.equal(malformedWorker.calls.length, 1);
  const failedWorker = fakeWorker({
    failureRole: "planner",
    failureCode: "PROVIDER_UPSTREAM_FAILED",
    failureStatus: 503,
  });
  const failedBroker = createStarcraftTmgOfflineSkillProviderBrokerV5({
    providerWorkerPort: failedWorker,
    costGuard: createStarcraftTmgSkillCostGuardV1({ now: clock() }),
    now: clock(),
  });
  await assert.rejects(failedBroker.completeRole({
    jobManifest: job,
    workerRef: "provider-worker-slice170-failure-fixture",
    rolePacket,
    attemptId: "slice170-failed-planner-attempt",
  }), (error) => (
    error?.code === "OFFLINE_PROVIDER_ATTEMPT_FAILED"
      && error?.safeReceipt?.role === "planner"
      && error?.safeReceipt?.transportFailureCode
        === "PROVIDER_UPSTREAM_FAILED"
      && error?.safeReceipt?.transportFailureClass
        === "PROVIDER_UPSTREAM_FAILED"
      && error?.safeReceipt?.transportStatus === 503
      && error?.safeReceipt?.transportFailureReceipt?.status === 503
      && error?.safeReceipt?.requestMayHaveBeenSent === true
      && error?.safeReceipt?.physicalAttempts === 1
      && error?.safeReceipt?.automaticRetries === 0
      && error?.safeReceipt?.payloadIncluded === false
  ));
  assert.equal(failedWorker.calls.length, 1);
  const rejectedWorker = fakeWorker({ validationFailureRole: "planner" });
  const rejectedBroker = createStarcraftTmgOfflineSkillProviderBrokerV5({
    providerWorkerPort: rejectedWorker,
    costGuard: createStarcraftTmgSkillCostGuardV1({ now: clock() }),
    now: clock(),
  });
  await assert.rejects(rejectedBroker.completeRole({
    jobManifest: job,
    workerRef: "provider-worker-slice170-rejected-fixture",
    rolePacket,
    attemptId: "slice170-rejected-planner-attempt",
  }), (error) => (
    error?.code === "OFFLINE_PROVIDER_ATTEMPT_FAILED"
      && error?.safeReceipt?.transportFailureReceipt === null
      && error?.safeReceipt?.transportFailureClass
        === "PROVIDER_WORKER_RESULT_VALIDATION_REJECTED"
      && error?.safeReceipt?.providerWorkerState?.state === "attached"
      && error?.safeReceipt?.providerWorkerState?.providerTransportMounted
        === true
      && error?.safeReceipt?.payloadIncluded === false
      && error?.safeReceipt?.requestMayHaveBeenSent === true
      && error?.safeReceipt?.physicalAttempts === 1
  ));
  assert.equal(rejectedWorker.calls.length, 1);
});

await check("independent_v2_real_ipc_runs_all_seven_roles_on_both_arms", async () => {
  const ipcPort = createStarcraftTmgProviderEgressWorkerPortV2({
    providerProfileRegistry: registry,
    spawnProcess: () => spawnIpcFixture("success"),
    maxWorkers: 1,
    maxOutputBytes: 256 * 1024,
    handshakeTimeoutMs: 5_000,
    shutdownGraceMs: 1_000,
  });
  const ipcCalls = [];
  const observedIpcPort = Object.freeze({
    metadata: (...args) => ipcPort.metadata(...args),
    async complete(input) {
      ipcCalls.push(clone(input.providerRequest));
      return ipcPort.complete(input);
    },
    readWorkerState: (...args) => ipcPort.readWorkerState(...args),
  });
  let attachment = null;
  try {
    const credential = Buffer.from("fixture-development-only", "utf8");
    attachment = await ipcPort.attachCredential({
      attachmentId: "slice170-full-ipc-fixture",
      providerProfile: profile,
      credentialBytes: credential,
    });
    assert.equal(credential.every((byte) => byte === 0), true);
    const ipcWorkerState = ipcPort.readWorkerState({
      workerRef: attachment.workerRef,
    });
    assert.equal(ipcWorkerState.worker.state, "attached");
    broker = createStarcraftTmgOfflineSkillProviderBrokerV5({
      providerWorkerPort: observedIpcPort,
      costGuard: createStarcraftTmgSkillCostGuardV1({ now: clock() }),
      now: clock(),
    });
    result = await runStarcraftTmgSlice170PairedProofV1({
      stagedInput,
      broker,
      workerRef: attachment.workerRef,
      egressAllowlistHash: resolved.egressBinding.policyHash,
      repositoryRoot: ROOT,
      createId: ids(),
      now: clock(),
      startedAt: GENERATED_AT,
      runNonce: "ipc-boundary-fixture-v1",
      roleTimeoutMs: 60_000,
    });
    worker = { calls: ipcCalls };
    assert.equal(verifyStarcraftTmgSlice170PairedProofV1(result), true);
    assert.equal(result.counts.providerAttempts, 14);
    assert.equal(result.counts.automaticRetries, 0);
    assert.equal(worker.calls.length, 14);
    assert.deepEqual(Object.keys(result.outputsByArm).sort(),
      ["direct_provider_control", "dsh"]);
    assert(Object.values(result.outputsByArm).every((output) => (
      output.executionSession.roleExecutions.length === 7
    )));
  } finally {
    if (attachment) await ipcPort.detachCredential({
      workerRef: attachment.workerRef,
      reason: "slice170_full_ipc_fixture_complete",
    });
    await ipcPort.close();
  }
});

await check("independent_v2_real_ipc_fault_matrix_is_classified_and_quarantined", async () => {
  assert(compactPlannerProviderRequest);
  const matrix = [
    ["shape", "PROVIDER_SUCCESS_SHAPE_REJECTED"],
    ["output_size", "PROVIDER_SUCCESS_OUTPUT_SIZE_REJECTED"],
    ["receipt_hash", "PROVIDER_SUCCESS_RECEIPT_HASH_REJECTED"],
    ["request_binding", "PROVIDER_SUCCESS_REQUEST_BINDING_REJECTED"],
    ["profile_binding", "PROVIDER_SUCCESS_PROFILE_BINDING_REJECTED"],
    ["provider_identity", "PROVIDER_SUCCESS_PROVIDER_IDENTITY_REJECTED"],
    ["usage", "PROVIDER_SUCCESS_USAGE_REJECTED"],
    ["network_proof", "PROVIDER_SUCCESS_NETWORK_PROOF_REJECTED"],
    ["attempt_proof", "PROVIDER_SUCCESS_ATTEMPT_PROOF_REJECTED"],
    ["safety", "PROVIDER_SUCCESS_SAFETY_REJECTED"],
    ["envelope_request_binding",
      "PROVIDER_WORKER_ENVELOPE_REQUEST_BINDING_REJECTED"],
    ["envelope_shape", "PROVIDER_WORKER_SUCCESS_ENVELOPE_SHAPE_REJECTED"],
    ["envelope_identity",
      "PROVIDER_WORKER_SUCCESS_ENVELOPE_IDENTITY_REJECTED"],
  ];
  for (const [mode, expectedCode] of matrix) {
    const port = createStarcraftTmgProviderEgressWorkerPortV2({
      providerProfileRegistry: registry,
      spawnProcess: () => spawnIpcFixture(mode),
      maxWorkers: 1,
      maxOutputBytes: 256 * 1024,
      handshakeTimeoutMs: 5_000,
      shutdownGraceMs: 1_000,
    });
    let attachment = null;
    try {
      attachment = await port.attachCredential({
        attachmentId: `slice170-ipc-fault-${mode}`,
        providerProfile: profile,
        credentialBytes: Buffer.from("fixture-development-only", "utf8"),
      });
      await assert.rejects(port.complete({
        workerRef: attachment.workerRef,
        providerRequest: compactPlannerProviderRequest,
      }), (error) => (
        error?.code === expectedCode
          && error?.safeReceipt?.requestMayHaveBeenSent === true
          && error?.safeReceipt?.physicalAttempts === 1
      ));
      await new Promise((resolve) => setTimeout(resolve, 10));
      const state = port.readWorkerState({ workerRef: attachment.workerRef });
      assert.equal(state.ok, true);
      assert.equal(state.worker.providerTransportMounted, false);
      assert.equal(state.worker.automaticRestarted, false);
    } finally {
      if (attachment) await port.detachCredential({
        workerRef: attachment.workerRef,
        reason: "slice170_ipc_fault_fixture_complete",
      });
      await port.close();
    }
  }
});

await check("independent_v2_real_ipc_accepts_near_limit_generator_shaped_result", async () => {
  assert(compactPlannerProviderRequest);
  const port = createStarcraftTmgProviderEgressWorkerPortV2({
    providerProfileRegistry: registry,
    spawnProcess: () => spawnIpcFixture("near_output_limit"),
    maxWorkers: 1,
    maxOutputBytes: 256 * 1024,
    handshakeTimeoutMs: 5_000,
    shutdownGraceMs: 1_000,
  });
  let attachment = null;
  try {
    attachment = await port.attachCredential({
      attachmentId: "slice170-ipc-near-limit-generator",
      providerProfile: profile,
      credentialBytes: Buffer.from("fixture-development-only", "utf8"),
    });
    const value = await port.complete({
      workerRef: attachment.workerRef,
      providerRequest: compactPlannerProviderRequest,
    });
    assert.equal(value.output.fixturePadding.length, 240 * 1024);
    assert.equal(value.usageReceipt.physicalAttempts, 1);
  } finally {
    if (attachment) await port.detachCredential({
      workerRef: attachment.workerRef,
      reason: "slice170_ipc_near_limit_fixture_complete",
    });
    await port.close();
  }
});

await check("independent_v2_real_ipc_preserves_post_egress_failure_receipt", async () => {
  assert(compactPlannerProviderRequest);
  const port = createStarcraftTmgProviderEgressWorkerPortV2({
    providerProfileRegistry: registry,
    spawnProcess: () => spawnIpcFixture("provider_response_contract_failure"),
    maxWorkers: 1,
    maxOutputBytes: 256 * 1024,
    handshakeTimeoutMs: 5_000,
    shutdownGraceMs: 1_000,
  });
  let attachment = null;
  try {
    attachment = await port.attachCredential({
      attachmentId: "slice170-ipc-post-egress-failure",
      providerProfile: profile,
      credentialBytes: Buffer.from("fixture-development-only", "utf8"),
    });
    await assert.rejects(port.complete({
      workerRef: attachment.workerRef,
      providerRequest: compactPlannerProviderRequest,
    }), (error) => (
      error?.code === "PROVIDER_RESPONSE_CONTRACT_REJECTED"
        && error?.safeReceipt?.requestMayHaveBeenSent === true
        && error?.safeReceipt?.physicalAttempts === 1
        && error?.safeReceipt?.automaticRetries === 0
    ));
    const state = port.readWorkerState({ workerRef: attachment.workerRef });
    assert.equal(state.ok, true);
    assert.equal(state.worker.state, "attached");
    assert.equal(state.worker.providerTransportMounted, true);
  } finally {
    if (attachment) await port.detachCredential({
      workerRef: attachment.workerRef,
      reason: "slice170_ipc_post_egress_failure_fixture_complete",
    });
    await port.close();
  }
});

await check("real_ipc_dsh_and_control_pair_share_one_prompt_contract", () => {
  assert.equal(verifyStarcraftTmgSlice170PairedProofV1(result), true);
  assert.equal(worker.calls.length, 14);
  assert.equal(result.counts.providerAttempts, 14);
  assert.equal(result.counts.automaticRetries, 0);
  for (const output of Object.values(result.outputsByArm)) {
    assert.equal(output.executionSession.usage.reasoningTokens, 0);
  }
});

await check("every_model_role_has_an_exact_outer_json_shape", () => {
  const firstArm = worker.calls.slice(0, 7);
  assert.equal(firstArm.length, 7);
  for (const request of firstArm) {
    const prompt = request.promptNodes[0];
    const contract = prompt.roleOutputContract;
    const payload = contract.exactJsonTemplate.channels
      .skill_generation_role_output;
    assert.equal(contract.strictShapeVersion,
      "starcraft_tmg_paired_role_shape_v1");
    assert.equal(contract.exactJsonTemplate.schemaVersion,
      "starcraft_tmg_offline_skill_role_output_v1");
    assert.match(contract.arraySemantics, /array even when.*one item/iu);
    const fixtureOutput = roleOutput(prompt.roleRequest.role, prompt);
    assert.equal(assertStarcraftTmgOfflineSkillRoleOutputV3(
      prompt.roleRequest.role,
      fixtureOutput,
    ), fixtureOutput);
    assert(payload && typeof payload === "object");
  }
});

await check("one_student_answer_object_is_rejected_with_shape_only_diagnostics", () => {
  const malformed = {
    summary: "Malformed one-answer container fixture.",
    claims: [],
    answers: {
      questionId: "question.how-to-play.workflow",
      answerSummary: "This must be inside an array.",
      claimIds: ["claim.index.binding", "claim.rules.authority"],
    },
    uncertainties: [],
  };
  assert.throws(() => assertStarcraftTmgOfflineSkillRoleOutputV3(
    "student",
    malformed,
  ), (error) => (
    error?.code === "PAIRED_ROLE_OUTPUT_SHAPE_INVALID"
      && error?.outputDiagnostic?.role === "student"
      && error?.outputDiagnostic?.field === "answers"
      && error?.outputDiagnostic?.expected === "array_length_1_to_1"
      && error?.outputDiagnostic?.kind === "object"
      && error?.outputDiagnostic?.payloadIncluded === false
      && JSON.stringify(error.outputDiagnostic)
        .includes("This must be inside an array.") === false
  ));
});

await check("missing_optional_reasoning_breakdown_closes_as_zero", () => {
  for (const output of Object.values(result.outputsByArm)) {
    for (const role of output.executionSession.roleExecutions) {
      assert.equal(Object.hasOwn(role.pricingReceipt.usage,
        "reasoningOutputUnits"), false);
      const receipt = role.providerReceipt || role.receipt;
      assert.equal(receipt.usage.reasoningTokens, 0);
    }
  }
});

await check("all_provider_receipts_bind_v5_compact_actual_requests", () => {
  for (const output of Object.values(result.outputsByArm)) {
    for (const execution of output.executionSession.roleExecutions) {
      const receipt = execution.providerReceipt || execution.receipt;
      assert.equal(verifyStarcraftTmgOfflineSkillProviderRoleReceiptV5(
        receipt,
      ), true);
      const grant = execution.costGrant;
      assert.equal(receipt.providerRequestHash, grant.requestHash);
    }
  }
});

await check("model_facing_requests_are_arm_neutral_and_pairwise_equal", () => {
  const first = worker.calls.slice(0, 7).map(clone);
  const second = worker.calls.slice(7).map(clone);
  assert.equal(first.length, 7);
  assert.equal(second.length, 7);
  for (let index = 0; index < 7; index += 1) {
    delete first[index].requestId;
    delete second[index].requestId;
    assert.deepEqual(first[index], second[index]);
  }
});

await check("blind_evaluator_has_no_arm_usage_or_cost_input", () => {
  assert.equal(result.blindEvaluation.armIdentityAvailableToEvaluator, false);
  assert.equal(result.blindEvaluation.usageOrCostAvailableToEvaluator, false);
  assert.equal(result.blindEvaluation.scores.length, 2);
  assert(result.blindEvaluation.scores.every((row) => row.score === 100));
  assert.equal(result.blindEvaluation.disposition, "blind_tie");
  assert.equal(result.assignmentReveal.revealedAfterEvaluationHash,
    result.blindEvaluation.evaluationHash);
});

await check("both_candidates_remain_unreviewed_and_non_authoritative", () => {
  for (const output of Object.values(result.outputsByArm)) {
    assert.equal(output.candidateBundle.candidateStatus,
      "candidate_unreviewed");
    assert.equal(output.candidateBundle.humanReviewed, false);
    assert.equal(output.candidateBundle.canAffectStrategy, false);
    assert.equal(output.candidateBundle.canAffectRules, false);
    assert.equal(output.candidateBundle.promotionEligible, false);
    assert.equal(output.runReceipt.trainingTruth, false);
    assert.equal(output.candidateBundle.skillArtifact.skillId,
      proof.target.productionSkillId);
    assert.equal(output.candidateBundle.skillArtifact.skillType, "turn_flow");
    assert.equal(output.candidateBundle.skillArtifact.phase, "multi_phase");
    assert.deepEqual(output.candidateBundle.skillArtifact.appRuleEndpoints,
      proof.common.appRuleEndpoints);
    assert.equal(output.candidateBundle.provenance.claimRefs.length, 4);
    assert.equal(output.candidateBundle.provenance.evidenceRefs.length, 1);
    assert.equal(output.candidateBundle.provenance.evidenceRefs[0].evidenceId,
      proof.target.evidenceId);
    assert.equal(output.candidateBundle.provenance.evidenceRefs[0].contentHash,
      proof.target.evidenceContentHash);
    assert.equal(output.candidateBundle.provenance.evidenceRefs[0]
      .rulesReceiptHash, proof.target.currentRulesReceiptHash);
  }
  assert.equal(result.counts.promotions, 0);
});

await check("shared_cost_ledger_reconstructs_fourteen_fixture_attempts", () => {
  const snapshot = broker.readCostSnapshot();
  assert.equal(snapshot.pendingAttempts, 0);
  assert.equal(snapshot.settledAttempts, 14);
  const usage = Object.values(result.outputsByArm).reduce((total, output) => ({
    totalTokens: total.totalTokens + output.executionSession.usage.totalTokens,
    costNanoUsd: total.costNanoUsd
      + output.executionSession.calculatedCostNanoUsd,
  }), { totalTokens: 0, costNanoUsd: 0 });
  assert(usage.totalTokens > 0);
  assert.equal(snapshot.cumulativeCostNanoUsd,
    562_320 + usage.costNanoUsd);
  assert.equal(snapshot.deliveredThresholdCnyMicros.length, 0);
});

await check("assignment_or_evaluation_tampering_fails_closed", () => {
  const tampered = clone(result);
  tampered.assignmentReveal.mapping["candidate-a"] =
    tampered.assignmentReveal.mapping["candidate-a"] === "dsh"
      ? "direct_provider_control" : "dsh";
  assert.throws(() => verifyStarcraftTmgSlice170PairedProofV1(tampered),
    /closure|identity/iu);
  const tamperedScore = clone(result);
  tamperedScore.blindEvaluation.scores[0].score = 0;
  assert.throws(() => verifyStarcraftTmgSlice170PairedProofV1(tamperedScore),
    /closure|identity/iu);
});

await check("candidate_and_receipt_projection_contains_no_sensitive_material", () => {
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized,
    /\bBearer\s+|\b(?:sk|jsk)-[A-Za-z0-9_-]{12,}/iu);
  for (const output of Object.values(result.outputsByArm)) {
    assert.equal(output.executionSession.rawPromptPersisted, false);
    assert.equal(output.executionSession.rawResponsePersisted, false);
    assert.equal(output.executionSession.rawReasoningPersisted, false);
  }
  assert.equal(result.trainingTruth, false);
});

const liveSource = await readFile(LIVE_RUNNER_PATH, "utf8");

await check("live_runner_requires_exact_five_flag_recovery_authority_before_ingress", () => {
  assert.deepEqual(execution.requiredFlags, [
    "--authorize-live-how-to-play-skill-pair-recovery-9-once",
    "--ack-attempt-9-fourteen-requests-conservatively-billed",
    "--ack-challenger-canary-passed-one-call",
    "--attest-credential-from-local-keychain-not-chat",
    "--ack-maximum-14-provider-attempts",
  ]);
  assert(liveSource.includes(
    "new Set(execution.requiredFlags)",
  ));
  assert(liveSource.indexOf("if (!liveWindowOpen())")
    < liveSource.indexOf("await readStarcraftTmgDeepSeekCredentialFromKeychainV1"));
  assert(liveSource.indexOf("if (!flagsAuthorized())")
    < liveSource.indexOf("await readStarcraftTmgDeepSeekCredentialFromKeychainV1"));
  assert(liveSource.indexOf("if (!await validPreflight())")
    < liveSource.indexOf("await readStarcraftTmgDeepSeekCredentialFromKeychainV1"));
  assert(liveSource.indexOf("if (!await validKeychainPreflight())")
    < liveSource.indexOf("await readStarcraftTmgDeepSeekCredentialFromKeychainV1"));
  assert(liveSource.indexOf("if (!await validPriorTracerPrerequisite())")
    < liveSource.indexOf("await readStarcraftTmgDeepSeekCredentialFromKeychainV1"));
  assert(liveSource.indexOf("if (!await validPriorHowToPlayPrerequisite())")
    < liveSource.indexOf("await readStarcraftTmgDeepSeekCredentialFromKeychainV1"));
  assert(liveSource.indexOf("if (!await validPriorRecoveryPrerequisite())")
    < liveSource.indexOf("await readStarcraftTmgDeepSeekCredentialFromKeychainV1"));
  assert(liveSource.indexOf("if (!await validPriorRoleShapePrerequisite())")
    < liveSource.indexOf("await readStarcraftTmgDeepSeekCredentialFromKeychainV1"));
  assert(liveSource.indexOf(
    "if (!await validPriorTransientTransportPrerequisite())",
  ) < liveSource.indexOf(
    "await readStarcraftTmgDeepSeekCredentialFromKeychainV1",
  ));
  assert(liveSource.indexOf(
    "if (!await validPriorTransportDiagnosticPrerequisite())",
  ) < liveSource.indexOf(
    "await readStarcraftTmgDeepSeekCredentialFromKeychainV1",
  ));
  assert(liveSource.indexOf(
    "if (!await validPriorClassifiedFailurePrerequisite())",
  ) < liveSource.indexOf(
    "await readStarcraftTmgDeepSeekCredentialFromKeychainV1",
  ));
  assert(liveSource.indexOf(
    "if (!await validPriorParentValidationFailurePrerequisite())",
  ) < liveSource.indexOf(
    "await readStarcraftTmgDeepSeekCredentialFromKeychainV1",
  ));
  assert(liveSource.indexOf(
    "if (!await validPriorGeneratorParentValidationFailurePrerequisite())",
  ) < liveSource.indexOf(
    "await readStarcraftTmgDeepSeekCredentialFromKeychainV1",
  ));
  assert(liveSource.indexOf(
    "if (!await validPriorMalformedGeneratorFailurePrerequisite())",
  ) < liveSource.indexOf(
    "await readStarcraftTmgDeepSeekCredentialFromKeychainV1",
  ));
  assert(liveSource.indexOf(
    "if (!await validPriorChallengerCanaryPrerequisite())",
  ) < liveSource.indexOf(
    "await readStarcraftTmgDeepSeekCredentialFromKeychainV1",
  ));
  assert(liveSource.indexOf("if (!await validRecoveryReadiness())")
    < liveSource.indexOf("await readStarcraftTmgDeepSeekCredentialFromKeychainV1"));
});

await check("live_runner_claims_once_and_commits_blinding_before_ingress", () => {
  assert(liveSource.indexOf("await claimAttempt({")
    < liveSource.indexOf("await readStarcraftTmgDeepSeekCredentialFromKeychainV1"));
  assert(liveSource.includes("assignmentCommitmentHash"));
  assert(liveSource.includes("execution.executionContractHash"));
  assert(liveSource.includes("createStarcraftTmgHowToPlaySkillStagedInputV1"));
  assert(liveSource.includes("createStarcraftTmgProductionSkillCatalogueV1"));
  assert(liveSource.includes("createStarcraftTmgProviderEgressWorkerPortV2"));
  assert(liveSource.includes('open(LOCK_PATH, "wx", 0o600)'));
  assert(liveSource.includes("rerunAllowedAutomatically: false"));
});

await check("live_runner_accepts_only_attested_macos_keychain_bytes", () => {
  assert(liveSource.includes("readStarcraftTmgDeepSeekCredentialFromKeychainV1"));
  assert(liveSource.includes("keychainIngress.credentialBytes"));
  assert(!liveSource.includes("process.stdin"));
  assert(!liveSource.includes("process.env."));
  assert(!/process\.argv[^\n]*(?:key|token|secret)/iu.test(liveSource));
  assert(liveSource.includes("credentialBytes?.fill(0)"));
  assert(liveSource.includes("chatExposedMaterialAccepted: false"));
});

await check("live_runner_writes_only_safe_candidates_receipts_and_zero_authority", () => {
  assert(liveSource.includes("paired-safe-result.json"));
  assert(liveSource.includes("assertStarcraftTmgSkillGenerationCredentialFree"));
  assert(liveSource.includes("largeScaleProductionRun: false"));
  assert(liveSource.includes("candidatesPromoted: 0"));
  assert(liveSource.includes("selfPlayRuns: 0"));
  assert(liveSource.includes("muzeroExports: 0"));
  assert(liveSource.includes("roleTimeoutMs: 150_000"));
  assert(liveSource.includes("providerFailureReceipt: observation.failure"));
  assert(liveSource.includes("brokerFailureReceipt: error?.safeReceipt"));
  assert(liveSource.includes("providerSuccessReceipts: observation.receipts"));
  assert(liveSource.includes("costSnapshot: broker?.readCostSnapshot?.()"));
  assert(liveSource.includes(
    "initialCostNanoUsd: execution.costLedger.targetStartingNanoUsd",
  ));
  assert(liveSource.includes("report.liveRunnerSourceHash"));
});

const reportBody = {
  schemaVersion: "starcraft_tmg_ticket_17_slice_170_preflight_report_v1",
  ticket: 17,
  slice: 170,
  status: failures.length === 0 ? "passed" : "failed",
  generatedAt: GENERATED_AT,
  assertionsPassed: checks.filter((row) => row.passed).length,
  assertionsTotal: checks.length,
  checks,
  liveRunnerSourceHash: hashStarcraftTmgContract(liveSource),
  executionContractHash: execution.executionContractHash,
  contractHash: proof.contractHash,
  promptPackHash: promptPack.promptPackHash,
  evaluationContractHash: evaluationContract.evaluationContractHash,
  pairedRunHash: result?.pairedRunHash || null,
  dshCandidateHash:
    result?.outputsByArm?.dsh?.roleGraphResult?.candidate?.candidateHash || null,
  controlCandidateHash:
    result?.outputsByArm?.direct_provider_control?.roleGraphResult?.candidate
      ?.candidateHash || null,
  providerAttempts: result?.counts?.providerAttempts || 0,
  automaticRetries: result?.counts?.automaticRetries || 0,
  externalProviderCalls: 0,
  externalBillableTokens: 0,
  externalEstimatedCostUsd: "0.000000000",
  externalEstimatedCostCny: "0.000000",
  sourceRefreshPerformed: false,
  candidatesPromoted: 0,
  humanReviewed: false,
  trainingTruth: false,
};
const report = envelope(reportBody, "reportHash");
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
