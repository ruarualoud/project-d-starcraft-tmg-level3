import { fail, hash, seal, verifySeal }
  from '../skill-production/common.mjs';
import { STRATEGY_AXES, validateStrategyDraftV1 }
  from './strategy-contract-v1.mjs';
import { REVIEW_FIELDS, reconcileStrategyReviewOpinionsV1 }
  from './strategy-evidence-review-v1.mjs';

function orderedCandidates(production) {
  if (production.schema !== 'extra_faction_production_result_v1'
    || production.candidates.length !== STRATEGY_AXES.faction.length) {
    fail('EXTRA_FACTION_FINAL_AXIS_DENOMINATOR_INVALID');
  }
  const byAxis = new Map(production.candidates.map(candidate =>
    [candidate.axis, candidate]));
  if (byAxis.size !== STRATEGY_AXES.faction.length
    || STRATEGY_AXES.faction.some(axis => !byAxis.has(axis))) {
    fail('EXTRA_FACTION_FINAL_AXIS_DENOMINATOR_INVALID');
  }
  return STRATEGY_AXES.faction.map(axis => byAxis.get(axis));
}

export function finalizeExtraFactionSkillV1({ input, production }) {
  [input, production].forEach(verifySeal);
  if (production.inputHash !== input.hash
    || hash(production.scope) !== hash(input.contract.scope)
    || production.pending.length !== 0
    || production.sourceReviewedAxes !== STRATEGY_AXES.faction.length
    || production.modelReportedClearAxes !== STRATEGY_AXES.faction.length
    || production.sourceReviewIndependentlyVerified !== false
    || production.runtimeAccepted !== false
    || production.trainingTruth !== false) {
    fail('EXTRA_FACTION_FINAL_PRODUCTION_INVALID');
  }
  const sources = new Map(input.workspace.fullFrozenSources.sources
    .map(source => [source.ref, source]));
  const candidates = orderedCandidates(production);
  const axisAudits = candidates.map(candidate => {
    verifySeal(candidate);
    const lifecycle = reconcileStrategyReviewOpinionsV1(
      candidate.reviews.map(review => review.evidence), hash(candidate.policy));
    const checkedFields = lifecycle.events.map(event =>
      event.targetId.replace(/^field\./u, ''));
    if (candidate.inputHash !== input.hash || candidate.reviews.length !== 3
      || candidate.lifecycle.open !== 0 || candidate.lifecycle.uncertain !== 0
      || lifecycle.open !== 0 || lifecycle.uncertain !== 0
      || lifecycle.modelReportedClear !== REVIEW_FIELDS.length
      || new Set(checkedFields).size !== REVIEW_FIELDS.length
      || REVIEW_FIELDS.some(field => !checkedFields.includes(field))) {
      fail('EXTRA_FACTION_FINAL_SOURCE_REVIEW_INVALID');
    }
    const boundSources = candidate.policy.ruleRefs.map(ref => {
      const source = sources.get(ref);
      if (!source) fail('EXTRA_FACTION_FINAL_SOURCE_REF_INVALID');
      return { ref, sourceHash: hash(source) };
    });
    return seal({ schema: 'extra_faction_independent_source_axis_audit_v1',
      inputHash: input.hash, productionHash: production.hash,
      candidateHash: candidate.hash, policyHash: hash(candidate.policy),
      axis: candidate.axis, checkedFields: [...REVIEW_FIELDS], boundSources,
      sourceReviewPassed: true,
      decisionCaseCount: 0,
      semanticAcceptanceInherited: false,
      runtimeAccepted: false,
      trainingTruth: false });
  });
  const draft = { policies: candidates.map(candidate => candidate.policy) };
  validateStrategyDraftV1(draft, input.contract, {
    allowedRuleRefs: [...sources.keys()], allowedCaseIds: [],
  });
  const structureAudit = seal({
    schema: 'extra_faction_strategy_structure_audit_v1',
    inputHash: input.hash, productionHash: production.hash,
    axes: candidates.map(candidate => candidate.axis),
    policies: candidates.map(candidate => ({ axis: candidate.axis,
      when: candidate.policy.when.length,
      alternatives: candidate.policy.alternatives.length,
      opponentBranches: candidate.policy.opponentBranches.length,
      reviseIf: candidate.policy.reviseIf.length,
      requiredQueries: candidate.policy.requiredQueries.length })),
    conditionalDecisionContractPassed: true,
    realDecisionCases: 0,
    fullGameStrategyEffectivenessProven: false,
    runtimeAccepted: false,
    trainingTruth: false });
  const sourceAudit = seal({
    schema: 'extra_faction_independent_source_audit_bundle_v1',
    inputHash: input.hash, productionHash: production.hash,
    scope: production.scope, axisAudits,
    axesChecked: axisAudits.length,
    fieldsChecked: axisAudits.length * REVIEW_FIELDS.length,
    sourceReviewPassed: true,
    runtimeAccepted: false,
    trainingTruth: false });
  const generalSkill = input.workspace.strategyDependencies.generalSkill;
  const generalLayer = input.workspace.strategyDependencies.generalLayer;
  [generalSkill, generalLayer].forEach(verifySeal);
  if (generalSkill.skillId !== 'starcraft-tmg.general-rules-and-strategy'
    || generalSkill.strategyLayerHash !== generalLayer.hash
    || hash(generalSkill.sourceBinding) !== hash(input.contract.sourceBinding)
    || !generalLayer.assessment.sourceReviewPassed
    || !generalLayer.assessment.decisionCasesPassed) {
    fail('EXTRA_FACTION_FINAL_GENERAL_DEPENDENCY_INVALID');
  }
  const factionId = input.contract.scope.ownFaction.split(':')[1];
  const sourceRefs = [...new Set(draft.policies.flatMap(policy => policy.ruleRefs))];
  const skill = seal({ schema: 'project_d_game_skill_v1',
    gameId: 'starcraft-tmg', rulesVersion: input.contract.sourceBinding.rules,
    sourceBinding: input.contract.sourceBinding,
    skillId: `starcraft-tmg.faction.${factionId}`,
    factionRecordKey: input.contract.scope.ownFaction,
    version: '1.0.0-offline-source-reviewed', skillType: 'strategy',
    dependencies: { generalSkillHash: generalSkill.hash,
      generalLayerHash: generalLayer.hash,
      rulesReferenceHash: input.contract.referenceHash },
    knowledge: draft.policies.map(policy => ({ axis: policy.axis, policy })),
    sourceRefs,
    preconditions: ['加载精确总规则 Skill 与当前玩家可见战场状态',
      '从 Rules 服务取得当前 LegalSpace，并核对编军、升级、阶段与资源'],
    procedure: draft.policies.map(policy => ({ axis: policy.axis,
      title: policy.title, when: policy.when, objective: policy.objective,
      steps: policy.decisionProcedure, alternatives: policy.alternatives,
      opponentBranches: policy.opponentBranches, risk: policy.risk,
      reviseIf: policy.reviseIf, requiredQueries: policy.requiredQueries,
      ruleRefs: policy.ruleRefs })),
    judgeTests: {
      productionEvidenceHash: production.hash,
      consumerEvidenceHash: structureAudit.hash,
      rosterEvaluationHash: input.workspace.factionEvidence.hash,
      ruleEvaluationHash: sourceAudit.hash,
      sourceAuditHash: sourceAudit.hash,
      structureAuditHash: structureAudit.hash,
      sourceAxesPassed: STRATEGY_AXES.faction.length,
      sourceFieldsPassed: STRATEGY_AXES.faction.length * REVIEW_FIELDS.length,
      realDecisionCases: 0,
      evaluatedDecisionAxes: [],
      uncoveredDecisionAxes: [...STRATEGY_AXES.faction],
    },
    confidence: 'all_fields_source_bound_and_strategy_structure_checked_real_cases_and_full_game_unproven',
    trustTier: 'offline_source_reviewed_advisory',
    status: 'offline_candidate', humanReviewed: false,
    canAffectStrategy: true, canAffectRules: false,
    fullGameStrategyEffectivenessProven: false,
    runtimeAccepted: false, published: false, trainingTruth: false });
  const routerEntry = seal({
    schema: 'starcraft_faction_skill_router_entry_v1',
    gameId: 'starcraft-tmg', factionRecordKey: skill.factionRecordKey,
    skillId: skill.skillId, skillHash: skill.hash,
    offlineProductionLoads: [skill.hash], runtimeLoads: [],
    legalityAuthority: 'rules_service_only',
    runtimeBlockedUntil: ['isolated_room_arena', 'version_registry_cas'],
    runtimeAccepted: false, trainingTruth: false });
  return seal({ schema: 'extra_faction_finalization_result_v1',
    inputHash: input.hash, productionHash: production.hash,
    sourceAudit, structureAudit, skill, routerEntry,
    formalOfflineSkillCompleted: true,
    realDecisionCases: 0,
    runtimeAccepted: false,
    trainingTruth: false });
}

export function renderFinalExtraFactionSkillV1(result) {
  verifySeal(result); verifySeal(result.skill);
  const lines = [`# 本族策略 Skill：${result.skill.factionRecordKey}`, '',
    `版本：${result.skill.version}`, '',
    '状态：6 个策略轴的全部字段已绑定冻结官方来源并通过结构审计。',
    '限制：本轮没有真实局面 case；局面效果和整局胜率尚未证明，Rules 服务始终裁定合法性。', ''];
  for (const policy of result.skill.procedure) lines.push(
    `## ${policy.title}（${policy.axis}）`, '',
    `适用：${policy.when.join('；')}`, '', `目标：${policy.objective}`, '',
    ...policy.steps.map((step, index) => `${index + 1}. ${step}`), '',
    `备选：${policy.alternatives.map(row =>
      `${row.option}（${row.preferWhen}）`).join('；')}`, '',
    `对手回应：${policy.opponentBranches.map(row =>
      `${row.response} → ${row.adaptation}`).join('；')}`, '',
    `风险：${policy.risk}`, '', `改计划：${policy.reviseIf.join('；')}`, '',
    `查询：${policy.requiredQueries.join('、')}`, '',
    `来源：${policy.ruleRefs.join('；')}`, '');
  lines.push(`结构化 Skill hash：${result.skill.hash}`, '');
  return lines.join('\n');
}
