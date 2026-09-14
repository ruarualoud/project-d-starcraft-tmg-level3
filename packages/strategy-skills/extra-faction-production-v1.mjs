import { fail, hash, seal, verifySeal } from '../skill-production/common.mjs';
import { STRATEGY_AXES, createStrategyLayerV1 } from './strategy-contract-v1.mjs';
import { validateStrategyProductionOutputV1 } from './strategy-production-input-v1.mjs';
import { createEvidenceReviewedStrategyProductionV1 }
  from './strategy-evidence-production-v1.mjs';
import { EXTRA_FACTION_KEYS_V1 } from './extra-faction-input-v1.mjs';

export function createExtraFactionProductionV1({ input, generator, reviewer,
  store, onProgress = () => {} }) {
  verifySeal(input); verifySeal(input.contract);
  const scope = input.contract.scope;
  if (scope.family !== 'faction'
    || !EXTRA_FACTION_KEYS_V1.includes(scope.ownFaction)
    || hash(input.contract.requiredAxes) !== hash(STRATEGY_AXES.faction)
    || input.evaluationManifest.heldoutInputsIncludedInWorkspace !== false
    || input.workspace.developmentCases.length !== 0
    || input.sourceRefreshPerformed !== false) {
    fail('EXTRA_FACTION_PRODUCTION_INPUT_INVALID');
  }
  const workflow = createEvidenceReviewedStrategyProductionV1({
    input, generator, reviewer, store,
  });
  async function produce() {
    const candidates = [];
    for (const axis of input.contract.requiredAxes) {
      onProgress({ stage: 'axis_started', axis, faction: scope.ownFaction,
        completedAxes: candidates.length, totalAxes: input.contract.requiredAxes.length });
      const candidate = await workflow.produceAxis(axis);
      verifySeal(candidate); verifySeal(candidate.lifecycle);
      if (candidate.inputHash !== input.hash || candidate.axis !== axis
        || candidate.lifecycle.policyHash !== hash(candidate.policy)
        || candidate.lifecycle.events.length !== 11) {
        fail('EXTRA_FACTION_CANDIDATE_DRIFT');
      }
      candidates.push(candidate);
      onProgress({ stage: 'axis_source_reviewed', axis,
        faction: scope.ownFaction, completedAxes: candidates.length,
        totalAxes: input.contract.requiredAxes.length,
        open: candidate.lifecycle.open,
        uncertain: candidate.lifecycle.uncertain });
    }
    const draft = { policies: candidates.map(candidate => candidate.policy) };
    const validation = validateStrategyProductionOutputV1(input, draft);
    const pending = candidates.flatMap(candidate => candidate.reviews.flatMap(review =>
      review.evidence.checks.filter(check => check.verdict !== 'no_defect')
        .map(check => ({ axis: candidate.axis, policyHash: hash(candidate.policy),
          evidenceHash: check.hash, field: check.target.field,
          verdict: check.verdict,
          disposition: 'needs_source_adjudication_not_automatic_edit' }))));
    const result = seal({ schema: 'extra_faction_production_result_v1',
      inputHash: input.hash, scope, candidates, validation,
      layer: createStrategyLayerV1({ contract: input.contract, draft,
        author: 'model_candidate' }),
      pending,
      sourceReviewedAxes: candidates.length,
      modelReportedClearAxes: candidates.filter(candidate =>
        candidate.lifecycle.open === 0 && candidate.lifecycle.uncertain === 0).length,
      status: pending.length ? 'needs_source_adjudication'
        : 'needs_independent_decision_validation',
      uncoveredDecisionAxes: input.evaluationManifest.uncoveredAxes,
      runtimeCoverageGaps: input.evaluationManifest.runtimeCoverageGaps,
      sourceReviewIndependentlyVerified: false,
      fullGameStrategyEffectivenessProven: false,
      automaticRegenerationPerformed: false,
      sourceRefreshPerformed: false,
      runtimeAccepted: false,
      published: false,
      trainingTruth: false });
    const lease = store.acquire('extra-faction-result.' + input.hash.slice(0, 48),
      { inputHash: input.hash, resultHash: result.hash });
    if (lease.cached) {
      verifySeal(lease.artifact);
      if (lease.artifact.hash !== result.hash) fail('EXTRA_FACTION_RESULT_DRIFT');
      return lease.artifact;
    }
    return store.finish(lease, result);
  }
  return Object.freeze({ produce });
}

export function renderExtraFactionCandidateV1(result) {
  verifySeal(result);
  if (result.schema !== 'extra_faction_production_result_v1') {
    fail('EXTRA_FACTION_RESULT_INVALID');
  }
  return [`# 阵营策略候选：${result.scope.ownFaction}`, '',
    `状态：${result.status}；已来源审查 ${result.sourceReviewedAxes}/6 轴；模型报告无待处理问题 ${result.modelReportedClearAxes}/6 轴。`, '',
    '这是额外阵营的离线策略候选，不是官方规则；尚无本阵营真实局面案例或整局胜率证明。', '',
    ...result.candidates.flatMap(candidate => [
      `## ${candidate.policy.title} (${candidate.axis})`, '',
      `适用：${candidate.policy.when.join('；')}`, '',
      `目标：${candidate.policy.objective}`, '',
      ...candidate.policy.decisionProcedure.map((step, index) =>
        `${index + 1}. ${step}`), '',
      `备选：${candidate.policy.alternatives.map(option =>
        `${option.option}（${option.preferWhen}）`).join('；')}`, '',
      `对手回应：${candidate.policy.opponentBranches.map(branch =>
        `${branch.response} → ${branch.adaptation}`).join('；')}`, '',
      `风险：${candidate.policy.risk}`, '',
      `改计划：${candidate.policy.reviseIf.join('；')}`, '',
      `查询：${candidate.policy.requiredQueries.join('；')}`, '',
      `来源：${candidate.policy.ruleRefs.join('；')}`, '',
      `来源意见：${candidate.lifecycle.open}项待裁定，${candidate.lifecycle.uncertain}项不确定。`, '',
    ])].join('\n') + '\n';
}
