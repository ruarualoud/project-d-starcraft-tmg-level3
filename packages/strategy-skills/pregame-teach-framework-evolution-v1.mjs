// Separate experiment seam for the questioning Skill. A game checkpoint
// subjectStrategyRef substitution cannot measure a pregame Teach framework.
import { hashStarcraftTmgContract as hash } from "../authoritative-engine/referee-crypto-v1.mjs";
import { createRosterTeachFrameworkV1, verifyRosterTeachFrameworkV1,
  ROSTER_TEACH_AUTHORITY_V1 } from "../roster-strategist/roster-teach-framework-v1.mjs";

const clone = value => structuredClone(value);
const fail = (code, detail = "") => { throw Object.assign(new Error(`${code}:${detail}`), { code }); };
const ref = skill => ({ id: skill.frameworkId, version: skill.version, hash: skill.contentHash });

// This is a review input, not a fabricated terminal-game episode. Pregame
// evidence can discover questions; strategy efficacy needs real outcomes.
export function createRosterTeachFrameworkReviewBatchV1({ framework, experiences, outcomes = [] }) {
  verifyRosterTeachFrameworkV1(framework);
  if (!Array.isArray(experiences) || !experiences.length) fail("TEACH_REVIEW_EXPERIENCE_REQUIRED");
  const records = experiences.map(experience => {
    const job = experience.teachFramework;
    if (job?.status !== "completed" || job.state?.phase !== "completed"
      || job.state.framework?.contentHash !== framework.contentHash) {
      fail("TEACH_REVIEW_FRAMEWORK_EXPERIENCE_MISMATCH");
    }
    return { sessionId: experience.sessionId, planHash: job.planHash,
      appliedToPlanHash: job.appliedToPlanHash || null,
      sourceHash: job.state.sourceHash, setup: clone(experience.setup),
      coverage: clone(job.state.coverage), agenda: clone(job.state.agenda),
      evidence: clone(job.state.evidence), synthesis: clone(job.state.synthesis),
      repairHistory: clone(job.state.repairs), calls: clone(job.state.calls),
      applicationStatus: job.state.applicationStatus,
      outcomes: outcomes.filter(o => o.sessionId === experience.sessionId
        && o.planHash === job.appliedToPlanHash).map(clone) };
  });
  return { schema: "starcraft_tmg_teach_framework_review_batch_v1",
    experimentType: "pregame_teach", frameworkRef: ref(framework), records,
    reviewTargets: ["question_usefulness", "missing_questions", "wrong_queries",
      "unsupported_numbers", "strategy_suppression", "plan_continuity", "downstream_outcomes"],
    outcomeEvidencePresent: records.some(r => r.outcomes.length > 0),
    ...ROSTER_TEACH_AUTHORITY_V1 };
}

export function createRosterTeachFrameworkEvolutionCandidateV1({ parent, content, reviewBatch, publicRationale }) {
  verifyRosterTeachFrameworkV1(parent);
  if (reviewBatch?.experimentType !== "pregame_teach"
    || reviewBatch.frameworkRef?.hash !== parent.contentHash || !String(publicRationale || "").trim()) {
    fail("TEACH_EVOLUTION_REVIEW_BINDING_INVALID");
  }
  const candidate = createRosterTeachFrameworkV1({ parent, content,
    sourceRefs: [hash(reviewBatch), ...reviewBatch.records.map(r => r.sourceHash)] });
  return { candidate, publicRationale, reviewBatchHash: hash(reviewBatch),
    status: "quarantined_candidate", eligibleForProduction: false,
    requiredExperiment: "paired_pregame_teach_then_downstream_outcome", ...ROSTER_TEACH_AUTHORITY_V1 };
}

// The product adapter must run its ordinary Teach/Plan pipeline, not a mock
// judge or arbitrary room checkpoint. Execute once per key; uncertain calls
// must be recovered via readExecution before trying again. Caller persists
// state after every barrier; completed arms are never rerun.
export async function runRosterTeachFrameworkPairedExperimentV1(input) {
  const { baseline, candidate, cases, experimentPort, state, save } = input;
  verifyRosterTeachFrameworkV1(baseline);
  verifyRosterTeachFrameworkV1(candidate);
  if (candidate.parentVersion !== baseline.version || candidate.frameworkId !== baseline.frameworkId
    || !cases?.length || ["executePregameArm", "readExecution", "evaluatePair"]
      .some(name => typeof experimentPort?.[name] !== "function")) fail("TEACH_EXPERIMENT_PORT_INVALID");
  const binding = { baseline: ref(baseline), candidate: ref(candidate),
    cases: cases.map(c => ({ caseId: c.caseId, split: c.split, fixedInputHash: hash(c.fixedInput) })) };
  if (state.binding && hash(state.binding) !== hash(binding)) fail("TEACH_EXPERIMENT_BINDING_CHANGED");
  if (new Set(cases.map(c => c.caseId)).size !== cases.length
    || cases.some(c => !c.caseId || !["development", "heldout"].includes(c.split)
      || !["preset_immutable", "agent_may_reselect_after_evidence"].includes(c.fixedInput?.rosterEditAuthority)
      || ["mapRef", "missionRef", "rulesRef", "toolContractRef", "modelConfiguration",
        "strategySkillRefs", "opponentConfiguration", "budget", "seed"]
        .some(key => c.fixedInput?.[key] === undefined))) {
    fail("TEACH_EXPERIMENT_CASE_INVALID");
  }
  state.binding = binding;
  state.pairs ||= [];
  await save(clone(state));
  for (const item of cases) {
    let pair = state.pairs.find(p => p.caseId === item.caseId);
    if (!pair) {
      pair = { caseId: item.caseId, split: item.split,
        fixedInputHash: hash(item.fixedInput), arms: {}, evaluation: null };
      state.pairs.push(pair);
      await save(clone(state));
    }
    for (const [arm, framework] of [["baseline", baseline], ["candidate", candidate]]) {
      const key = `teach-${hash({ binding, caseId: item.caseId, arm }).slice(0, 32)}`;
      let result = pair.arms[arm]?.result;
      if (!result && pair.arms[arm]?.status === "dispatched") {
        const recovery = await experimentPort.readExecution({ executionKey: key });
        if (recovery?.status === "completed") result = recovery.result;
        else if (recovery?.status !== "not_sent") {
          fail("TEACH_EXPERIMENT_DISPATCH_UNKNOWN", key);
        }
      }
      if (!result) {
        pair.arms[arm] = { status: "dispatched", executionKey: key };
        await save(clone(state));
        result = await experimentPort.executePregameArm({ executionKey: key,
          fixedInput: clone(item.fixedInput), fixedInputHash: pair.fixedInputHash,
          framework: clone(framework), frameworkRef: ref(framework),
          // Opponent, map, model, tools, budget and seed belong in fixedInput.
          // Framework sees only this pregame context, never heldout answers.
          mutationAuthority: false });
      }
      if (result?.fixedInputHash !== pair.fixedInputHash
        || result?.frameworkRef?.hash !== framework.contentHash
        || result?.rulesAuthorityChanged !== false
        || result?.evaluatorChanged !== false
        || !result?.planRef || !result?.rosterRef
        || (item.fixedInput.rosterEditAuthority === "preset_immutable"
          && result.rosterRef.hash !== item.fixedInput.rosterRef?.hash)) {
        fail("TEACH_EXPERIMENT_RESULT_INVALID", key);
      }
      pair.arms[arm] = { status: "completed", executionKey: key, result: clone(result) };
      await save(clone(state));
    }
    if (!pair.evaluation) {
      pair.evaluation = await experimentPort.evaluatePair({ caseId: item.caseId,
        split: item.split, fixedInputHash: pair.fixedInputHash,
        baseline: clone(pair.arms.baseline.result), candidate: clone(pair.arms.candidate.result) });
      await save(clone(state));
    }
  }
  state.status = "paired_results_available";
  state.productionPromotionPerformed = false;
  await save(clone(state));
  return clone(state);
}

// Promotion is deliberately separate from candidate generation. Strategy
// success and semantic quality cannot be self-certified by the challenger.
export function qualifyRosterTeachFrameworkPromotionV1({ experiment, evaluationPolicy }) {
  const pairs = experiment?.pairs || [];
  const heldout = pairs.filter(p => p.split === "heldout");
  const minimum = evaluationPolicy?.minimumHeldoutCases;
  const reasons = [];
  if (!Number.isSafeInteger(minimum) || minimum < 1 || heldout.length < minimum) reasons.push("heldout_denominator_missing");
  if (experiment?.status !== "paired_results_available" || !pairs.length) reasons.push("paired_experiment_incomplete");
  for (const pair of pairs) {
    const e = pair.evaluation;
    if (e?.independentContext !== true || e?.fixedInputHash !== pair.fixedInputHash
      || e?.policyVersion !== evaluationPolicy?.version) reasons.push(`independent_evaluation_missing:${pair.caseId}`);
    if (e?.legalityRegressions !== 0 || e?.ruleAuthorityViolations !== 0
      || e?.qualityNoninferiorityPassed !== true || e?.strategySuppressionRegression !== false
      || e?.downstreamOutcomeEvidenceVerified !== true) reasons.push(`quality_or_outcomes_not_proven:${pair.caseId}`);
  }
  return { eligible: reasons.length === 0, reasons,
    baselineRef: experiment?.binding?.baseline || null, candidateRef: experiment?.binding?.candidate || null,
    rollbackTarget: experiment?.binding?.baseline || null,
    automaticPromotion: false, productionPromotionPerformed: false, ...ROSTER_TEACH_AUTHORITY_V1 };
}
