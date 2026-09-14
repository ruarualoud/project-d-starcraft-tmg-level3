import { exact, fail, freeze, hash, seal, text, verifySeal } from '../skill-production/common.mjs';

export const STRATEGY_CONTRACT_VERSION = 'starcraft_conditional_strategy_v1';
export const STRATEGY_AXES = freeze({
  general: ['objective_plan', 'activation_tempo', 'movement_position', 'threat_trade',
    'resource_timing', 'uncertainty', 'opponent_response', 'review_adaptation'],
  faction: ['army_resources', 'unit_roles', 'phase_tempo', 'objectives', 'threat_tradeoffs', 'card_packages'],
  matchup: ['opponent_profile', 'opening_branches', 'counterplay', 'resource_exchange', 'endgame'],
});
const POLICY_KEYS = ['axis', 'title', 'when', 'objective', 'decisionProcedure', 'alternatives',
  'opponentBranches', 'risk', 'reviseIf', 'requiredQueries', 'ruleRefs', 'caseIds'];
function strings(values, minimum = 1) {
  if (!Array.isArray(values) || values.length < minimum || values.length > 32) fail('STRATEGY_LIST_INVALID');
  values.forEach(value => text(value, 4000));
}

// V1 reading/continuation artifacts remain immutable. This is an explicit new
// strategy dependency, not a re-interpretation of their rules-only acceptance.
export function createStrategyContractV1({ scope, sourceBinding, referenceHash, dependencies = [] }) {
  const expectedKeys = scope?.family === 'general' ? ['family']
    : scope?.family === 'faction' ? ['family', 'ownFaction'] : ['family', 'ownFaction', 'opponentFaction'];
  exact(scope, expectedKeys, 'STRATEGY_SCOPE_INVALID');
  if (!STRATEGY_AXES[scope.family] || (scope.family !== 'general' && !scope.ownFaction)
    || (scope.family === 'matchup' && (!scope.opponentFaction || scope.opponentFaction === scope.ownFaction))) {
    fail('STRATEGY_SCOPE_INVALID');
  }
  for (const value of Object.values(scope)) text(value, 160);
  if (!/^[a-f0-9]{64}$/u.test(referenceHash) || !sourceBinding || !Object.keys(sourceBinding).length) {
    fail('STRATEGY_BINDING_REQUIRED');
  }
  dependencies.forEach(verifySeal);
  if (dependencies.some(d => d.schema !== 'starcraft_strategy_layer_v1'
    || hash(d.contract.sourceBinding) !== hash(sourceBinding)
    || d.contract.referenceHash !== referenceHash)) fail('STRATEGY_DEPENDENCY_DRIFT');
  const required = scope.family === 'general' ? [] : [{ family: 'general' },
    ...(scope.family === 'matchup' ? [
      { family: 'faction', ownFaction: scope.ownFaction },
      { family: 'faction', ownFaction: scope.opponentFaction },
    ] : [])];
  // Source-reviewed, case-tested hypotheses may feed OFFLINE dependent work.
  // Runtime promotion remains separate; host seeds cannot silently qualify.
  if (dependencies.length !== required.length || required.some(s => !dependencies.some(d =>
    hash(d.contract.scope) === hash(s) && d.status === 'offline_strategy_candidate'
      && d.assessment?.sourceReviewPassed === true && d.assessment?.decisionCasesPassed === true))) {
    fail('STRATEGY_DEPENDENCIES_NOT_QUALIFIED');
  }
  return seal({ schema: STRATEGY_CONTRACT_VERSION, scope, sourceBinding, referenceHash,
    dependencyHashes: dependencies.map(d => d.hash), requiredAxes: STRATEGY_AXES[scope.family],
    proofBoundary: 'source_support_and_decision_cases_are_separate_from_full_game_effectiveness',
    runtimeAccepted: false, trainingTruth: false });
}

export function validateStrategyDraftV1(draft, contract, { allowedRuleRefs, allowedCaseIds } = {}) {
  verifySeal(contract);
  if (contract.schema !== STRATEGY_CONTRACT_VERSION) fail('STRATEGY_CONTRACT_INVALID');
  exact(draft, ['policies'], 'STRATEGY_DRAFT_INVALID');
  if (!Array.isArray(draft.policies) || !draft.policies.length || draft.policies.length > 64) fail('STRATEGY_POLICIES_INVALID');
  for (const p of draft.policies) {
    exact(p, POLICY_KEYS, 'STRATEGY_POLICY_INVALID');
    if (!contract.requiredAxes.includes(p.axis)) fail('STRATEGY_AXIS_INVALID');
    for (const field of ['title', 'objective', 'risk']) text(p[field], 4000);
    for (const field of ['when', 'decisionProcedure', 'reviseIf', 'requiredQueries']) strings(p[field]);
    strings(p.ruleRefs, 0); strings(p.caseIds, 0);
    if (allowedRuleRefs && p.ruleRefs.some(ref => !allowedRuleRefs.includes(ref))) fail('STRATEGY_SOURCE_REF_INVALID');
    if (allowedCaseIds && p.caseIds.some(id => !allowedCaseIds.includes(id))) fail('STRATEGY_CASE_REF_INVALID');
    if (!Array.isArray(p.alternatives) || p.alternatives.length < 2 || p.alternatives.length > 8) fail('STRATEGY_ALTERNATIVES_REQUIRED');
    for (const alt of p.alternatives) {
      exact(alt, ['option', 'preferWhen']); text(alt.option); text(alt.preferWhen);
    }
    if (new Set(p.alternatives.map(a => a.option.trim())).size < 2) fail('STRATEGY_ALTERNATIVES_DUPLICATED');
    if (!Array.isArray(p.opponentBranches) || !p.opponentBranches.length || p.opponentBranches.length > 8) fail('STRATEGY_RESPONSE_REQUIRED');
    for (const branch of p.opponentBranches) {
      exact(branch, ['response', 'adaptation']); text(branch.response); text(branch.adaptation);
    }
  }
  if (contract.requiredAxes.some(axis => !draft.policies.some(p => p.axis === axis))) fail('STRATEGY_COVERAGE_MISSING');
  return draft;
}

export function createStrategyLayerV1({ contract, draft, author = 'host_seed' }) {
  validateStrategyDraftV1(draft, contract);
  if (!['host_seed', 'model_candidate'].includes(author)) fail('STRATEGY_AUTHOR_INVALID');
  return seal({ schema: 'starcraft_strategy_layer_v1', contract, author,
    status: author === 'host_seed' ? 'design_seed_not_produced_skill' : 'unreviewed_strategy_candidate',
    draft, assessment: { sourceReviewPassed: false, decisionCasesPassed: false, strategyEffectivenessProven: false },
    runtimeAccepted: false, published: false, trainingTruth: false });
}

export function renderStrategyLayerV1(layer) {
  verifySeal(layer);
  const lines = ['# 总规则 Skill：通用策略层（设计种子）', '',
    `状态：${layer.status}；作者：${layer.author}。`, '',
    '这是新增的条件决策层，不替换规则参考书，不是已完成的模型生产结果。规则服务裁定合法性；下列偏好需要来源审阅、局面测试和整局评估。', '',
    `规则参考依赖：${layer.contract.referenceHash}`, '',
    '每次行动：读取己方可见局面 → 明确目标与时间窗 → 比较至少两个合法候选 → 检查对手回应 → Preview → 按房间确认策略提交 → 用结果决定是否改计划。', ''];
  for (const p of layer.draft.policies) lines.push(`## ${p.title}`, '',
    `适用：${p.when.join('；')}`, '', `目标：${p.objective}`, '',
    ...p.decisionProcedure.map((step, i) => `${i + 1}. ${step}`), '',
    `备选：${p.alternatives.map(a => `${a.option}（${a.preferWhen}）`).join('；')}`, '',
    `对手回应：${p.opponentBranches.map(b => `${b.response} → ${b.adaptation}`).join('；')}`, '',
    `风险：${p.risk}`, '', `改计划条件：${p.reviseIf.join('；')}`, '',
    `需要查询：${p.requiredQueries.join('、')}`, '',
    '验证状态：策略假设；尚未通过模型独立来源审阅和整局有效性测试。', '');
  return lines.join('\n') + '\n';
}
