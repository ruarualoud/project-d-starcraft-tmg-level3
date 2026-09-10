import {
  clone,
  fail,
  freeze,
  hash,
  seal,
  verifySeal,
} from "../skill-production/common.mjs";
import {
  gradeStrategyDecisionV1,
  verifyCompiledStrategyCaseV1,
} from "./strategy-case-compiler-v1.mjs";

export const STARCRAFT_TMG_SKILLOPT_CANDIDATE_EVALUATION_VERSION =
  "starcraft_tmg_skillopt_candidate_evaluation_v1";

const MATCHUP_ID = /^starcraft-tmg\.matchup\.(.+)-to-(.+)$/u;

function withoutHash(value) {
  const copy = clone(value);
  delete copy.hash;
  return copy;
}

function assertParent(parent) {
  const skill = verifySeal(clone(parent));
  if (skill.schema !== "project_d_game_skill_v1"
    || skill.gameId !== "starcraft-tmg"
    || skill.skillType !== "strategy"
    || skill.status !== "offline_candidate"
    || !MATCHUP_ID.test(skill.skillId || "")
    || skill.canAffectRules !== false
    || skill.runtimeAccepted !== false
    || skill.trainingTruth !== false) {
    fail("SKILLOPT_PARENT_SKILL_INVALID", { skillId: skill.skillId });
  }
  return skill;
}

function nextSkill(parent, fields) {
  return seal({
    ...withoutHash(parent),
    ...fields,
    trustTier: "offline_skillopt_candidate_pending_independent_evaluation",
    status: "skillopt_candidate",
    humanReviewed: false,
    canAffectStrategy: true,
    canAffectRules: false,
    fullGameStrategyEffectivenessProven: false,
    runtimeAccepted: false,
    published: false,
    trainingTruth: false,
  });
}

export function compileStarcraftTmgSkillOptCandidateSkillV1(input = {}) {
  const parent = assertParent(input.parentSkill);
  const candidate = verifySeal(clone(input.skillOptCandidate));
  const change = candidate.change;
  if (candidate.schema !== "project_d_skillopt_candidate_v1"
    || candidate.gameId !== "starcraft-tmg"
    || candidate.status !== "quarantined_candidate"
    || candidate.parentSkillRef?.id !== parent.skillId
    || candidate.parentSkillRef?.version !== parent.version
    || candidate.parentSkillRef?.hash !== parent.hash
    || change?.targetSkillId !== parent.skillId
    || change?.targetSkillHash !== parent.hash
    || change?.operation !== "append_advisory_strategy_note"
    || change?.axis !== "opening_branches"
    || !parent.procedure?.some((axis) => axis.axis === change.axis)
    || candidate.requiresIndependentHeldoutEvaluation !== true
    || candidate.requiresArenaComparison !== true
    || candidate.mayReplaceAcceptedVersion !== false
    || candidate.runtimeAccepted !== false
    || candidate.trainingTruth !== false) {
    fail("SKILLOPT_CANDIDATE_PATCH_INVALID", { candidateId: candidate.candidateId });
  }
  const advisory = seal({
    schema: `${STARCRAFT_TMG_SKILLOPT_CANDIDATE_EVALUATION_VERSION}.advisory`,
    axis: change.axis,
    title: change.lesson.title,
    when: clone(change.lesson.when),
    guidance: change.lesson.guidance,
    risk: change.lesson.risk,
    reviseIf: clone(change.lesson.reviseIf),
    evidenceFindingIds: clone(change.evidenceFindingIds),
    reflectionHash: candidate.reflectionHash,
    evaluationPolicy: {
      kind: "compare_declared_objective_then_visible_state",
      fixedCandidateId: null,
    },
    canAffectRules: false,
    runtimeAccepted: false,
    trainingTruth: false,
  });
  return nextSkill(parent, {
    version: candidate.proposedVersion,
    skillOptAdvisories: [...clone(parent.skillOptAdvisories || []), advisory],
    evolution: {
      parentSkillRef: clone(candidate.parentSkillRef),
      skillOptCandidateHash: candidate.hash,
      reflectionHash: candidate.reflectionHash,
      independentHeldoutEvaluationHash: null,
      arenaComparisonHash: null,
      automaticPromotion: false,
    },
    confidence:
      "parent_evidence_preserved_skillopt_patch_pending_independent_heldout_and_arena",
    counterExamples: [
      ...clone(parent.counterExamples || []),
      "SkillOpt 复盘建议在独立留出与隔离 arena 通过前不得替换已接受版本",
    ],
  });
}

export function createStarcraftTmgSkillOptNegativeControlV1(input = {}) {
  const parent = assertParent(input.parentSkill);
  const fixedCandidateId = String(input.fixedCandidateId || "").trim();
  if (!/^first-player[12]$/u.test(fixedCandidateId)) {
    fail("SKILLOPT_NEGATIVE_CONTROL_CANDIDATE_INVALID");
  }
  const advisory = seal({
    schema: `${STARCRAFT_TMG_SKILLOPT_CANDIDATE_EVALUATION_VERSION}.advisory`,
    axis: "opening_branches",
    title: "Negative control: fixed first actor",
    when: ["Any choose-first-actor decision"],
    guidance: `Always select ${fixedCandidateId}, ignoring the declared objective and visible state.`,
    risk: "Intentionally unsafe policy used only to prove the evaluation gate rejects it.",
    reviseIf: ["Never revise during this negative-control evaluation."],
    evidenceFindingIds: [],
    reflectionHash: null,
    evaluationPolicy: {
      kind: "fixed_candidate_negative_control",
      fixedCandidateId,
    },
    canAffectRules: false,
    runtimeAccepted: false,
    trainingTruth: false,
  });
  return nextSkill(parent, {
    version: `${parent.version}+skillopt.negative-control.1`,
    skillOptAdvisories: [advisory],
    evolution: {
      parentSkillRef: { id: parent.skillId, version: parent.version, hash: parent.hash },
      skillOptCandidateHash: null,
      reflectionHash: null,
      independentHeldoutEvaluationHash: null,
      arenaComparisonHash: null,
      automaticPromotion: false,
    },
    confidence: "intentionally_invalid_fixed_actor_negative_control",
  });
}

function objectiveCandidateId(compiledCase) {
  const metric = compiledCase.prompt.objective?.metrics?.find((entry) =>
    entry.kind === "active_side_is");
  const candidateId = metric ? `first-${metric.sideKey}` : "";
  if (!compiledCase.prompt.candidates.some((entry) =>
    entry.candidateId === candidateId)) {
    fail("SKILLOPT_EVALUATION_OBJECTIVE_UNSUPPORTED", {
      caseId: compiledCase.prompt.caseId,
    });
  }
  return candidateId;
}

function selectCandidate(skill, compiledCase) {
  const advisory = skill.skillOptAdvisories?.at(-1);
  if (!advisory) return objectiveCandidateId(compiledCase);
  if (advisory.evaluationPolicy?.kind === "fixed_candidate_negative_control") {
    return advisory.evaluationPolicy.fixedCandidateId;
  }
  if (advisory.evaluationPolicy?.kind
    === "compare_declared_objective_then_visible_state") {
    return objectiveCandidateId(compiledCase);
  }
  fail("SKILLOPT_EVALUATION_POLICY_UNKNOWN", { skillId: skill.skillId });
}

export function evaluateStarcraftTmgSkillOnStrategyCaseV1(input = {}) {
  const skill = verifySeal(clone(input.skill));
  const compiledCase = verifyCompiledStrategyCaseV1(clone(input.compiledCase));
  if (skill.skillId !== input.expectedSkillId
    || skill.canAffectRules !== false
    || skill.runtimeAccepted !== false
    || skill.trainingTruth !== false) {
    fail("SKILLOPT_EVALUATION_SKILL_INVALID", { skillId: skill.skillId });
  }
  const candidateId = selectCandidate(skill, compiledCase);
  const decision = {
    candidateId,
    comparisons: compiledCase.prompt.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      tradeoff: candidate.candidateId === candidateId
        ? "Selected by the bounded evaluation policy."
        : "Legal alternative retained for comparison.",
    })),
    opponentResponse:
      "Re-read visible state and LegalSpace after the selected transition.",
    reviseIf:
      "Revise when the declared objective, visible state, or LegalSpace changes.",
  };
  const grade = gradeStrategyDecisionV1(compiledCase, decision);
  return seal({
    schema: `${STARCRAFT_TMG_SKILLOPT_CANDIDATE_EVALUATION_VERSION}.case-result`,
    skillId: skill.skillId,
    skillHash: skill.hash,
    skillVersion: skill.version,
    caseId: compiledCase.prompt.caseId,
    caseHash: compiledCase.hash,
    evaluationSplit: compiledCase.evaluation.split,
    selectedCandidateId: candidateId,
    grade,
    rulesExecutedCandidateOutcomes: compiledCase.evaluation.outcomes.length,
    allCandidateBranchesAppliedAndReplayed: compiledCase.evaluation.outcomes.every((outcome) =>
      outcome.replayPassed === true),
    passed: grade.legalCandidateSelected === true
      && grade.decisionPreferencePassed === true
      && grade.rationaleStructurePassed === true,
    fullGameStrategyEffectivenessProven: false,
    runtimeAccepted: false,
    eligibleForTraining: false,
    trainingTruth: false,
  });
}

export function summarizeStarcraftTmgSkillOptEvaluationV1(input = {}) {
  const skill = verifySeal(clone(input.skill));
  const results = input.results.map((result) => verifySeal(clone(result)));
  if (!results.length || results.some((result) => result.skillHash !== skill.hash)) {
    fail("SKILLOPT_EVALUATION_RESULT_SET_INVALID", { skillId: skill.skillId });
  }
  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;
  const criticalHighFindings = failed > 0 ? [{
    severity: "High",
    code: "SKILLOPT_STRATEGY_REGRESSION",
    failedCaseIds: results.filter((result) => !result.passed)
      .map((result) => result.caseId),
  }] : [];
  return seal({
    schema: `${STARCRAFT_TMG_SKILLOPT_CANDIDATE_EVALUATION_VERSION}.summary`,
    skillId: skill.skillId,
    skillHash: skill.hash,
    totalCases: results.length,
    passedCases: passed,
    failedCases: failed,
    allRulesReplayPassed: results.every((result) =>
      result.allCandidateBranchesAppliedAndReplayed),
    criticalHighFindings,
    nonBlockingFindings: [{
      severity: "Medium",
      code: "ONLY_BOUNDED_INITIATIVE_TRANSITIONS_EVALUATED",
      blocksIntegration: false,
    }],
    status: criticalHighFindings.length === 0
      ? "promotable_manual_approval_required"
      : "quarantined_regression",
    automaticPromotion: false,
    runtimeAccepted: false,
    fullGameStrategyEffectivenessProven: false,
    eligibleForTraining: false,
    trainingTruth: false,
  });
}
