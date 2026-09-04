#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  TEACH_CTX2SKILL_EMISSION_ACK_SCHEMA,
  TEACH_CTX2SKILL_ROLE_GRAPH_HASH,
  TEACH_CTX2SKILL_ROLE_GRAPH_V1,
  createTeachCtx2SkillCandidateEmitterV1,
  runTeachCtx2SkillRoleGraphV1,
  verifyTeachCtx2SkillCandidateV1,
  verifyTeachCtx2SkillRoleGraphV1,
  verifyTeachCtx2SkillRunResultV1,
} from "../packages/skill-generation-runtime/teach-ctx2skill-role-graph-v1.mjs";
import { verifyCurrentOfficialSkillStagedInputV1 } from
  "../packages/skill-generation-runtime/current-official-evidence-v1.mjs";
import { loadCurrentOfficialSkillFixtureV1 } from
  "./support/current-official-skill-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_PATH = path.join(
  ROOT,
  "build/ticket-17-skill-generation-v1/slice-165-report.json",
);
const FACT_EVALUATOR_HASH = hashStarcraftTmgContract({
  id: "current-rules-fact-judge",
  version: "1.0.0",
});
const CROSS_TIME_EVALUATOR_HASH = hashStarcraftTmgContract({
  id: "current-rules-cross-time-replay",
  version: "1.0.0",
});

const fixture = await loadCurrentOfficialSkillFixtureV1({ root: ROOT });
const task = fixture.curriculum.tasks.find((row) => (
  row.family === "how_to_play" && row.generationEligible
));
assert(task);
const stagedInput = fixture.stage(task.taskId);
const primaryEvidenceId = stagedInput.evidence[0].evidenceId;
const capturedRequests = [];
const capturedEmissions = [];

function claim(input = {}) {
  return {
    claimId: input.claimId,
    claimType: input.claimType || "legality",
    statement: input.statement || `Bounded current-rule claim for ${input.claimId}.`,
    evidenceIds: input.evidenceIds || [primaryEvidenceId],
    advisoryOnly: input.advisoryOnly ?? false,
    ...(input.supersedesClaimId
      ? {
          supersedesClaimId: input.supersedesClaimId,
          correctionTargetId: input.correctionTargetId,
        }
      : {}),
  };
}

function baseRoleOutput(role, packet) {
  const { contextReceipts } = packet;
  const boundEvidenceId = packet.stagedInput.evidence.find((row) => (
    row.kind === "current_rule_atom"
  ))?.evidenceId || packet.stagedInput.evidence[0].evidenceId;
  if (role === "planner") {
    return {
      summary: "Plan one source-bounded rule lesson.",
      questions: [{
        questionId: "question.rule.boundary",
        prompt: "What is the rule, its precondition, and its rejection boundary?",
        evidenceIds: [boundEvidenceId],
      }],
      learningObjectives: [
        "State the supported rule without extending its executable denominator.",
      ],
    };
  }
  if (role === "tutor") {
    return {
      summary: "Teach the supported rule and expose a boundary for challenge.",
      claims: [
        claim({ claimId: "claim.rule.core", evidenceIds: [boundEvidenceId] }),
        claim({ claimId: "claim.rule.boundary", evidenceIds: [boundEvidenceId] }),
      ],
      lessonSteps: [{
        stepId: "lesson.rule.core",
        summary: "Read the current RuleAtom and preserve its exact boundary.",
        claimIds: ["claim.rule.core", "claim.rule.boundary"],
      }],
    };
  }
  if (role === "student") {
    return {
      summary: "Answer the planned question using only taught claims.",
      claims: [],
      answers: [{
        questionId: "question.rule.boundary",
        answerSummary: "The action is legal only inside the cited current RuleAtom boundary.",
        claimIds: ["claim.rule.core", "claim.rule.boundary"],
      }],
      uncertainties: [],
    };
  }
  if (role === "challenger") {
    return {
      summary: "Probe the stated legality boundary.",
      probes: [{
        probeId: "probe.illegal.boundary",
        kind: "illegal_boundary",
        targetClaimId: "claim.rule.boundary",
        prompt: "Does the statement reject material outside the cited executable denominator?",
      }],
    };
  }
  if (role === "reasoner") {
    return {
      summary: "Resolve the probe without persisting hidden reasoning.",
      claims: [claim({ claimId: "claim.rule.scope", evidenceIds: [boundEvidenceId] })],
      resolutions: [{
        probeId: "probe.illegal.boundary",
        disposition: "conceded",
        decisionSummary: "The first boundary wording needs a narrower correction.",
        claimIds: ["claim.rule.boundary", "claim.rule.scope"],
      }],
    };
  }
  if (role === "proposer") {
    const factJudge = contextReceipts.find((receipt) => receipt.role === "fact_judge");
    const failed = factJudge.output.verdicts.find((verdict) => (
      verdict.claimId === "claim.rule.boundary"
    ));
    return {
      summary: "Bind the failed boundary to one explicit revision target.",
      revisionTargets: [{
        targetId: "revision.rule.boundary.v1",
        targetClaimId: failed.claimId,
        targetClaimHash: failed.claimHash,
        factJudgeReceiptHash: factJudge.receiptHash,
        failureCodes: failed.failureCodes,
        patchSummary: "Replace the broad boundary with an exact current-RuleAtom boundary.",
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
    const proposer = contextReceipts.find((receipt) => receipt.role === "proposer");
    const plan = proposer.output.candidatePlan;
    return {
      summary: "Materialize one unreviewed candidate draft after correction.",
      claims: [claim({
        claimId: "claim.rule.boundary.v2",
        evidenceIds: [boundEvidenceId],
        supersedesClaimId: "claim.rule.boundary",
        correctionTargetId: "revision.rule.boundary.v1",
        statement: "The skill applies only to the exact cited current RuleAtom denominator.",
      })],
      candidateDraft: {
        skillId: plan.skillId,
        version: plan.version,
        skillType: plan.skillType,
        title: plan.title,
        summary: "A current-source-bounded how-to-play candidate.",
        claimIds: ["claim.rule.core", "claim.rule.scope", "claim.rule.boundary.v2"],
        procedure: ["Read the current RuleAtom before proposing an action."],
        legalityChecks: ["Ask the authoritative Rules service for current legality."],
        illegalPatterns: ["Do not extend the action beyond the cited RuleAtom."],
        examples: ["Use an action returned by current LegalSpace."],
        counterExamples: ["Reject an invented action absent from current LegalSpace."],
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
  throw new Error(`unexpected role: ${role}`);
}

function roleExecutor(options = {}) {
  return async (packet) => {
    capturedRequests.push(packet.request);
    const output = baseRoleOutput(packet.request.role, packet);
    if (options.mutate && options.role === packet.request.role) {
      return options.mutate(structuredClone(output), packet);
    }
    return output;
  };
}

async function judgeClaim(packet) {
  const failedInitialBoundary = packet.phase === "fact_judge"
    && packet.claim.claimId === "claim.rule.boundary";
  return {
    passed: !failedInitialBoundary,
    failureCodes: failedInitialBoundary ? ["MISSING_NEGATIVE_BOUNDARY"] : [],
    findingCodes: failedInitialBoundary
      ? ["REVISION_REQUIRED"]
      : ["CURRENT_EVIDENCE_MATCH"],
    evaluator: {
      id: "current-rules-fact-judge",
      version: "1.0.0",
      hash: FACT_EVALUATOR_HASH,
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
      hash: CROSS_TIME_EVALUATOR_HASH,
      independentContext: true,
    },
  };
}

async function emitCandidate(emission) {
  capturedEmissions.push(emission);
  return {
    schemaVersion: TEACH_CTX2SKILL_EMISSION_ACK_SCHEMA,
    accepted: true,
    emissionId: "emission.slice165.valid.1",
    emissionHash: emission.emissionHash,
    candidateHash: emission.candidate.candidateHash,
    candidateOnly: true,
  };
}

function run(overrides = {}) {
  return runTeachCtx2SkillRoleGraphV1({
    runId: overrides.runId || "run.slice165.valid.1",
    stagedInput: overrides.stagedInput || stagedInput,
    executeRole: overrides.executeRole || roleExecutor(),
    judgeClaim: overrides.judgeClaim || judgeClaim,
    replayCandidate: overrides.replayCandidate || replayCandidate,
    emitCandidate: overrides.emitCandidate || emitCandidate,
  });
}

const checks = [];
async function check(id, callback) {
  try {
    await callback();
    checks.push({ id, passed: true });
  } catch (error) {
    checks.push({
      id,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

let validResult;
await check("nine_node_teach_ctx2skill_graph_is_hash_sealed_and_topological", () => {
  assert.equal(verifyTeachCtx2SkillRoleGraphV1(), true);
  assert.deepEqual(TEACH_CTX2SKILL_ROLE_GRAPH_V1.sequence, [
    "planner", "tutor", "student", "challenger", "reasoner", "fact_judge",
    "proposer", "generator", "cross_time_gate",
  ]);
  assert.match(TEACH_CTX2SKILL_ROLE_GRAPH_HASH, /^[a-f0-9]{64}$/u);
});

await check("slice164_current_official_task_is_the_only_worker_evidence_surface", () => {
  assert.equal(verifyCurrentOfficialSkillStagedInputV1(stagedInput), true);
  assert.equal(stagedInput.task.family, "how_to_play");
  assert.equal(stagedInput.evidence.length, 1);
  assert.equal(stagedInput.evidence[0].kind, "current_rule_atom");
});

await check("valid_role_graph_runs_all_roles_and_emits_exactly_one_candidate", async () => {
  capturedRequests.length = 0;
  capturedEmissions.length = 0;
  validResult = await run();
  assert.equal(validResult.counts.graphNodes, 9);
  assert.equal(validResult.counts.boundedRoleExecutions, 7);
  assert.equal(validResult.counts.deterministicGateExecutions, 2);
  assert.equal(validResult.counts.candidateEmissions, 1);
  assert.equal(capturedRequests.length, 7);
  assert.equal(capturedEmissions.length, 1);
});

await check("independent_consumer_reconstructs_the_run_and_candidate_contracts", () => {
  assert.equal(verifyTeachCtx2SkillCandidateV1(validResult.candidate, stagedInput), true);
  assert.equal(verifyTeachCtx2SkillRunResultV1(validResult, stagedInput), true);
  const tampered = structuredClone(validResult);
  tampered.roleReceipts[1].output.summary = "tampered after sealing";
  assert.throws(() => verifyTeachCtx2SkillRunResultV1(tampered, stagedInput),
    /TEACH_CTX2SKILL_RUN_HASH_INVALID/u);
  const semanticallyForged = structuredClone(validResult);
  semanticallyForged.counts.providerAttempts = 1;
  delete semanticallyForged.runHash;
  semanticallyForged.runHash = hashStarcraftTmgContract(semanticallyForged);
  assert.throws(() => verifyTeachCtx2SkillRunResultV1(semanticallyForged, stagedInput),
    /TEACH_CTX2SKILL_RUN_CLOSURE_INVALID/u);
  const authorityForged = structuredClone(validResult.candidate);
  authorityForged.authority.canAffectRules = true;
  delete authorityForged.candidateHash;
  authorityForged.candidateHash = hashStarcraftTmgContract(authorityForged);
  assert.throws(() => verifyTeachCtx2SkillCandidateV1(authorityForged, stagedInput),
    /TEACH_CTX2SKILL_CANDIDATE_INVALID/u);
});

await check("role_executor_requests_are_offline_non_authoritative_and_cannot_emit", () => {
  assert(capturedRequests.every((request) => (
    request.capabilities.readStagedEvidence === true
    && request.capabilities.emitCandidateSkill === false
    && request.capabilities.judgeOwnClaims === false
    && request.capabilities.network === false
    && request.capabilities.room === false
    && request.capabilities.mutableRulesRuntime === false
    && request.capabilities.memoryWrite === false
    && request.capabilities.skillPublish === false
    && request.capabilities.trainingWrite === false
    && request.rawReasoningRequested === false
    && request.trainingTruth === false
  )));
});

await check("teach_questions_and_student_answers_have_exact_coverage", () => {
  const planner = validResult.roleReceipts.find((receipt) => receipt.role === "planner");
  const student = validResult.roleReceipts.find((receipt) => receipt.role === "student");
  assert.deepEqual(student.output.answers.map((answer) => answer.questionId),
    planner.output.questions.map((question) => question.questionId));
});

await check("claims_are_enriched_with_content_locator_and_current_rules_hashes", () => {
  const claims = validResult.roleReceipts.flatMap((receipt) => receipt.output.claims || []);
  assert(claims.length >= 3);
  for (const item of claims) {
    assert.match(item.claimHash, /^[a-f0-9]{64}$/u);
    for (const ref of item.evidenceRefs) {
      assert.match(ref.contentHash, /^[a-f0-9]{64}$/u);
      assert.match(ref.locatorHash, /^[a-f0-9]{64}$/u);
      assert.match(ref.rulesReceiptHash, /^[a-f0-9]{64}$/u);
    }
  }
});

await check("independent_fact_judge_failure_is_preserved_as_revision_lineage", () => {
  const factJudge = validResult.roleReceipts.find((receipt) => receipt.role === "fact_judge");
  const failed = factJudge.output.verdicts.filter((verdict) => !verdict.passed);
  const proposer = validResult.roleReceipts.find((receipt) => receipt.role === "proposer");
  assert.deepEqual(failed.map((verdict) => verdict.claimId), ["claim.rule.boundary"]);
  assert.equal(factJudge.output.allClaimsPassed, false);
  assert.equal(proposer.output.revisionTargets[0].targetClaimHash, failed[0].claimHash);
  assert.equal(proposer.output.revisionTargets[0].factJudgeReceiptHash,
    factJudge.receiptHash);
});

await check("generator_correction_supersedes_the_failed_claim_without_silent_edit", () => {
  const corrected = validResult.candidate.skillArtifact.claims.find((item) => (
    item.claimId === "claim.rule.boundary.v2"
  ));
  assert.equal(corrected.supersedesClaimId, "claim.rule.boundary");
  assert.equal(corrected.correctionTargetId, "revision.rule.boundary.v1");
  assert(!validResult.candidate.skillArtifact.claims.some((item) => (
    item.claimId === "claim.rule.boundary"
  )));
});

await check("cross_time_rejudges_every_candidate_claim_and_replays_every_test", () => {
  const crossTime = validResult.roleReceipts.find((receipt) => (
    receipt.role === "cross_time_gate"
  ));
  assert.equal(crossTime.output.passed, true);
  assert.equal(crossTime.output.claimVerdicts.length,
    validResult.candidate.skillArtifact.claims.length);
  assert.deepEqual([...crossTime.output.replayedJudgeTestIds].sort(),
    validResult.candidate.skillArtifact.judgeTests.map((test) => test.testId).sort());
});

await check("candidate_and_emission_never_gain_rules_strategy_training_or_publish_authority", () => {
  assert.deepEqual(validResult.candidate.authority, {
    humanReviewed: false,
    canAffectStrategy: false,
    canAffectRules: false,
    promotionEligible: false,
    mayPublishSkill: false,
    memoryWrite: false,
    trainingTruth: false,
  });
  assert.equal(capturedEmissions[0].authority.candidateOnly, true);
  assert.equal(validResult.counts.promotions, 0);
  assert.equal(validResult.trainingTruth, false);
});

await check("emission_controller_rejects_zero_and_multiple_calls", async () => {
  const zero = createTeachCtx2SkillCandidateEmitterV1({ emitCandidate });
  assert.throws(() => zero.close(), /TEACH_CTX2SKILL_EMISSION_CARDINALITY_INVALID/u);
  const once = createTeachCtx2SkillCandidateEmitterV1({ emitCandidate });
  await once.emit(capturedEmissions[0]);
  await assert.rejects(() => once.emit(capturedEmissions[0]),
    /TEACH_CTX2SKILL_EMISSION_CARDINALITY_EXCEEDED/u);
  assert.equal(once.close(), true);
});

await check("role_output_with_hidden_reasoning_or_self_emission_fails_closed", async () => {
  await assert.rejects(() => run({
    runId: "run.slice165.hostile.reasoning",
    executeRole: roleExecutor({
      role: "planner",
      mutate(output) {
        output.chainOfThought = "private scratchpad";
        return output;
      },
    }),
  }), /TEACH_CTX2SKILL_ROLE_OUTPUT_UNSAFE/u);
  await assert.rejects(() => run({
    runId: "run.slice165.hostile.emission",
    executeRole: roleExecutor({
      role: "planner",
      mutate(output) {
        output.emitCandidateSkill = { candidate: "forged" };
        return output;
      },
    }),
  }), /TEACH_CTX2SKILL_ROLE_OUTPUT_UNSAFE/u);
});

await check("credential_like_role_or_judge_output_fails_closed", async () => {
  await assert.rejects(() => run({
    runId: "run.slice165.hostile.credential",
    executeRole: roleExecutor({
      role: "planner",
      mutate(output) {
        output.summary = "authorization: Bearer abcdefghijklmnopqrstuvwxyz";
        return output;
      },
    }),
  }), /TEACH_CTX2SKILL_ROLE_OUTPUT_UNSAFE/u);
  await assert.rejects(() => run({
    runId: "run.slice165.hostile.judge",
    judgeClaim: async () => ({
      passed: true,
      failureCodes: [],
      findingCodes: [],
      evaluator: {
        id: "unsafe-judge",
        version: "1.0.0",
        hash: FACT_EVALUATOR_HASH,
        independentContext: true,
        apiKey: "sk-abcdefghijklmnopqrstuvwxyz",
      },
    }),
  }), /TEACH_CTX2SKILL_FACT_JUDGE_OUTPUT_UNSAFE/u);
});

await check("unstaged_evidence_and_legality_without_current_rules_receipt_fail_closed", async () => {
  await assert.rejects(() => run({
    runId: "run.slice165.hostile.unstaged",
    executeRole: roleExecutor({
      role: "tutor",
      mutate(output) {
        output.claims[0].evidenceIds = ["rule:not-staged"];
        return output;
      },
    }),
  }), /TEACH_CTX2SKILL_CLAIM_EVIDENCE_UNSTAGED/u);
  const mission = fixture.curriculum.tasks.find((row) => row.family === "mission");
  const missionInput = fixture.stage(mission.taskId);
  const sourceEvidenceId = missionInput.evidence.find((row) => (
    row.kind === "official_product_record"
  )).evidenceId;
  await assert.rejects(() => run({
    runId: "run.slice165.hostile.no-rules-receipt",
    stagedInput: missionInput,
    executeRole: roleExecutor({
      role: "tutor",
      mutate(output) {
        output.claims[0].evidenceIds = [sourceEvidenceId];
        return output;
      },
    }),
  }), /TEACH_CTX2SKILL_LEGALITY_CLAIM_RULES_RECEIPT_REQUIRED/u);
});

await check("unknown_probe_and_incomplete_student_coverage_fail_closed", async () => {
  await assert.rejects(() => run({
    runId: "run.slice165.hostile.probe",
    executeRole: roleExecutor({
      role: "challenger",
      mutate(output) {
        output.probes[0].targetClaimId = "claim.not-present";
        return output;
      },
    }),
  }), /TEACH_CTX2SKILL_PROBE_REFERENCE_INVALID/u);
  await assert.rejects(() => run({
    runId: "run.slice165.hostile.student",
    executeRole: roleExecutor({
      role: "student",
      mutate(output) {
        output.answers = [];
        return output;
      },
    }),
  }), /TEACH_CTX2SKILL_STUDENT_ANSWERS_INVALID/u);
});

await check("tampered_revision_lineage_and_generator_plan_drift_fail_closed", async () => {
  await assert.rejects(() => run({
    runId: "run.slice165.hostile.lineage",
    executeRole: roleExecutor({
      role: "proposer",
      mutate(output) {
        output.revisionTargets[0].targetClaimHash = "0".repeat(64);
        return output;
      },
    }),
  }), /TEACH_CTX2SKILL_REVISION_LINEAGE_INVALID/u);
  await assert.rejects(() => run({
    runId: "run.slice165.hostile.plan-drift",
    executeRole: roleExecutor({
      role: "generator",
      mutate(output) {
        output.candidateDraft.version = "0.1.0-candidate.forged";
        return output;
      },
    }),
  }), /TEACH_CTX2SKILL_CANDIDATE_PLAN_DRIFT/u);
});

await check("cross_time_binding_drift_or_failed_claim_prevents_emission", async () => {
  let emissions = 0;
  await assert.rejects(() => run({
    runId: "run.slice165.hostile.cross-time-binding",
    replayCandidate: async (packet) => ({
      ...(await replayCandidate(packet)),
      currentBinding: {
        ...packet.currentBinding,
        rulesGraphHash: "0".repeat(64),
      },
    }),
    emitCandidate: async () => {
      emissions += 1;
      throw new Error("must not emit");
    },
  }), /TEACH_CTX2SKILL_CROSS_TIME_DISPOSITION_INVALID/u);
  assert.equal(emissions, 0);
  await assert.rejects(() => run({
    runId: "run.slice165.hostile.cross-time-claim",
    judgeClaim: async (packet) => {
      const result = await judgeClaim(packet);
      if (packet.phase === "cross_time_candidate"
        && packet.claim.claimId === "claim.rule.core") {
        return {
          ...result,
          passed: false,
          failureCodes: ["CROSS_TIME_RULE_DRIFT"],
        };
      }
      return result;
    },
    emitCandidate: async () => {
      emissions += 1;
      throw new Error("must not emit");
    },
  }), /TEACH_CTX2SKILL_CROSS_TIME_DISPOSITION_INVALID/u);
  assert.equal(emissions, 0);
});

await check("bad_emission_ack_fails_without_retry", async () => {
  let calls = 0;
  await assert.rejects(() => run({
    runId: "run.slice165.hostile.ack",
    emitCandidate: async (emission) => {
      calls += 1;
      return {
        schemaVersion: TEACH_CTX2SKILL_EMISSION_ACK_SCHEMA,
        accepted: true,
        emissionId: "emission.slice165.bad.ack",
        emissionHash: emission.emissionHash,
        candidateHash: "0".repeat(64),
        candidateOnly: true,
      };
    },
  }), /TEACH_CTX2SKILL_EMISSION_ACK_INVALID/u);
  assert.equal(calls, 1);
});

await check("slice165_is_offline_zero_token_zero_cost_and_creates_no_promotion", () => {
  assert.equal(validResult.dshUsed, false);
  assert.equal(validResult.modelUsed, false);
  assert.equal(validResult.counts.providerAttempts, 0);
  assert.equal(validResult.counts.inputTokens, 0);
  assert.equal(validResult.counts.outputTokens, 0);
  assert.equal(validResult.counts.totalTokens, 0);
  assert.equal(validResult.counts.estimatedCostCny, 0);
  assert.equal(validResult.counts.promotions, 0);
});

const failures = checks.filter((row) => !row.passed);
const reportBody = {
  schemaVersion: "starcraft_tmg_ticket_17_slice_165_teach_ctx2skill_role_graph_report_v1",
  generatedAt: "2026-09-04T15:00:00.000Z",
  ticket: 17,
  slice: 165,
  ok: failures.length === 0,
  checks,
  failures,
  evidence: {
    roleGraphHash: TEACH_CTX2SKILL_ROLE_GRAPH_HASH,
    stagedInputHash: stagedInput.stagedInputHash,
    runHash: validResult?.runHash || null,
    candidateHash: validResult?.candidate?.candidateHash || null,
    roleReceipts: validResult?.counts?.graphNodes || 0,
    boundedRoleExecutions: validResult?.counts?.boundedRoleExecutions || 0,
    deterministicGates: validResult?.counts?.deterministicGateExecutions || 0,
    candidateEmissions: validResult?.counts?.candidateEmissions || 0,
    providerCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedCostCny: 0,
    dshInstalled: false,
    dshRuns: 0,
    promotions: 0,
    sourceRefreshPerformed: false,
    trainingTruth: false,
  },
  offlineSkillEvolution: {
    sourceBoundary: "slice164_current_official_task_staged_input",
    teachRoleReceipts: 3,
    ctx2skillRoleReceipts: 6,
    questionTreeNodesRead: fixture.questionTree.counts.totalNodes,
    candidateBundles: validResult ? 1 : 0,
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
    skillsGenerated: validResult ? 1 : 0,
    judgeTestsRun: checks.length,
    crossTimeReplayResult: validResult ? "passed_candidate_still_unreviewed" : "failed",
    promotions: 0,
    blocks: [
      "os_isolation_not_proven_until_slice_166",
      "dsh_not_installed_until_slice_167",
      "real_paired_generation_not_run_until_slice_170",
      "candidate_requires_ticket_18_evaluation_and_admin_promotion",
    ],
    remainingRuleGaps: [],
  },
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: ["rule_skill_builder_prompt"],
    harnessToolsCalled: ["emit_candidate_skill"],
    uiTraceEvidence: null,
    agentDecisionEvidence: {
      selectedCandidateHash: validResult?.candidate?.candidateHash || null,
      selectionBoundary: "all_claims_rejudged_and_cross_time_replay_passed",
    },
    memoryTraceEvidence: { refs: [], writes: 0 },
    trainingTraceCandidates: 0,
    rollbackOrDemotionRules: [
      "any_parent_evidence_or_current_rules_hash_drift_invalidates_the_run",
      "any_fact_or_cross_time_failure_blocks_candidate_emission",
      "emitted_candidate_has_zero_runtime_authority_until_ticket_18_promotion",
    ],
    userVisibleChecks: [],
  },
};
const report = {
  ...reportBody,
  reportHash: hashStarcraftTmgContract(reportBody),
};
await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
