import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { STRATEGY_AXES, createStrategyLayerV1 } from './strategy-contract-v1.mjs';
import { validateStrategyProductionOutputV1 } from './strategy-production-input-v1.mjs';
import { createEvidenceReviewedStrategyProductionV1 } from './strategy-evidence-production-v1.mjs';

// Direction-specific orchestration over the SAME seven-role, full-context,
// native-structured generator and independently anchored evidence reviewer.
// This seam does not turn a reviewer's allegation into an authorized edit.
export function createDirectedMatchupProductionV1({ input, generator, reviewer, store,
  onProgress = () => {} }) {
  verifySeal(input); verifySeal(input.contract);
  const scope = input.contract.scope;
  if (scope.family !== 'matchup' || scope.ownFaction === scope.opponentFaction
    || input.contract.dependencyProtocol !== 'complete_evaluated_game_skills_v1'
    || hash(input.contract.requiredAxes) !== hash(STRATEGY_AXES.matchup)
    || !input.workspace.strategyDependencies?.ownSkill?.knowledge?.length
    || !input.workspace.strategyDependencies?.opponentSkill?.knowledge?.length
    || input.evaluationManifest.heldoutInputsIncludedInWorkspace !== false
    || input.sourceRefreshPerformed !== false) fail('MATCHUP_PRODUCTION_INPUT_INVALID');
  const workflow = createEvidenceReviewedStrategyProductionV1({ input, generator, reviewer, store });
  async function produce() {
    const candidates = [];
    for (const axis of input.contract.requiredAxes) {
      onProgress({ stage: 'axis_started', axis, direction: scope, completedAxes: candidates.length });
      const candidate = await workflow.produceAxis(axis);
      verifySeal(candidate);
      if (candidate.inputHash !== input.hash || candidate.axis !== axis
        || candidate.lifecycle.policyHash !== hash(candidate.policy)
        || candidate.lifecycle.events.length !== 11) fail('MATCHUP_PRODUCTION_CANDIDATE_DRIFT');
      candidates.push(candidate);
      onProgress({ stage: 'axis_source_reviewed', axis, direction: scope,
        completedAxes: candidates.length, open: candidate.lifecycle.open, uncertain: candidate.lifecycle.uncertain });
    }
    const draft = { policies: candidates.map(c => c.policy) };
    const validation = validateStrategyProductionOutputV1(input, draft);
    const pending = candidates.flatMap(c => c.reviews.flatMap(r => r.evidence.checks
      .filter(check => check.verdict !== 'no_defect')
      .map(check => ({ axis: c.axis, policyHash: hash(c.policy), evidenceHash: check.hash,
        field: check.target.field, verdict: check.verdict,
        disposition: 'needs_source_adjudication_not_automatic_edit' }))));
    const result = seal({ schema: 'directed_matchup_production_result_v1', inputHash: input.hash,
      scope, candidates, validation,
      layer: createStrategyLayerV1({ contract: input.contract, draft, author: 'model_candidate' }),
      pending, sourceReviewedAxes: candidates.length,
      modelReportedClearAxes: candidates.filter(c => c.lifecycle.open === 0 && c.lifecycle.uncertain === 0).length,
      status: pending.length ? 'needs_source_adjudication' : 'needs_independent_source_and_decision_validation',
      uncoveredDecisionAxes: input.evaluationManifest.uncoveredAxes,
      runtimeCoverageGaps: input.evaluationManifest.runtimeCoverageGaps,
      sourceReviewIndependentlyVerified: false, fullGameStrategyEffectivenessProven: false,
      automaticRegenerationPerformed: false, sourceRefreshPerformed: false,
      runtimeAccepted: false, published: false, trainingTruth: false });
    const lease = store.acquire('directed-matchup-result.' + input.hash.slice(0, 48), { inputHash: input.hash, resultHash: result.hash });
    if (lease.cached) {
      verifySeal(lease.artifact);
      if (lease.artifact.hash !== result.hash) fail('MATCHUP_PRODUCTION_RESULT_DRIFT');
      return lease.artifact;
    }
    return store.finish(lease, result);
  }
  return Object.freeze({ produce });
}

export function renderDirectedMatchupCandidateV1(result) {
  verifySeal(result);
  if (result.schema !== 'directed_matchup_production_result_v1') fail('MATCHUP_PRODUCTION_RESULT_INVALID');
  return [`# 对抗策略候选：${result.scope.ownFaction} → ${result.scope.opponentFaction}`, '',
    `状态：${result.status}；已来源审查 ${result.sourceReviewedAxes}/5 维，模型报告无待处理问题 ${result.modelReportedClearAxes}/5 维。`, '',
    '这是尚待独立验收的模型候选，不是官方规则，也未证明整局胜率。反方向独立生产。', '',
    `尚无可执行决策案例覆盖的维度：${result.uncoveredDecisionAxes.join('、') || '无'}。`, '',
    ...result.candidates.flatMap(c => [`## ${c.policy.title} (${c.axis})`, '',
      `适用：${c.policy.when.join('；')}`, '', `目标：${c.policy.objective}`, '',
      ...c.policy.decisionProcedure.map((s, i) => `${i + 1}. ${s}`), '',
      `备选：${c.policy.alternatives.map(a => `${a.option}（${a.preferWhen}）`).join('；')}`, '',
      `对手回应：${c.policy.opponentBranches.map(b => `${b.response} → ${b.adaptation}`).join('；')}`, '',
      `风险：${c.policy.risk}`, '', `改计划：${c.policy.reviseIf.join('；')}`, '',
      `查询：${c.policy.requiredQueries.join('；')}`, '', `来源：${c.policy.ruleRefs.join('；')}`, '',
      `来源问题：${c.lifecycle.open} 项待裁定，${c.lifecycle.uncertain} 项不确定。`, ''])].join('\n') + '\n';
}
