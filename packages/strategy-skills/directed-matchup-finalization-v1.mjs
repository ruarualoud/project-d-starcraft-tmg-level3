import { fail, hash, seal, verifySeal } from '../skill-production/common.mjs';
import { STRATEGY_AXES, createStrategyLayerV1, validateStrategyDraftV1 }
  from './strategy-contract-v1.mjs';
import { REVIEW_FIELDS, reconcileStrategyReviewOpinionsV1 }
  from './strategy-evidence-review-v1.mjs';

function orderedCandidates(production) {
  if (!Array.isArray(production.candidates)
    || production.candidates.length !== STRATEGY_AXES.matchup.length) {
    fail('MATCHUP_FINAL_AXIS_DENOMINATOR_INVALID');
  }
  const byAxis = new Map(production.candidates.map(row => [row.axis, row]));
  if (byAxis.size !== production.candidates.length
    || STRATEGY_AXES.matchup.some(axis => !byAxis.has(axis))) {
    fail('MATCHUP_FINAL_AXIS_DENOMINATOR_INVALID');
  }
  return STRATEGY_AXES.matchup.map(axis => byAxis.get(axis));
}

export function createDirectedMatchupIndependentSourceAuditV1({ input, production }) {
  [input, production].forEach(verifySeal);
  if (production.schema !== 'directed_matchup_production_result_v1'
    || production.inputHash !== input.hash
    || hash(production.scope) !== hash(input.contract.scope)
    || production.pending.length !== 0
    || production.sourceReviewedAxes !== STRATEGY_AXES.matchup.length
    || production.modelReportedClearAxes !== STRATEGY_AXES.matchup.length
    || production.sourceReviewIndependentlyVerified !== false
    || production.runtimeAccepted !== false || production.trainingTruth !== false) {
    fail('MATCHUP_FINAL_PRODUCTION_CANDIDATE_INVALID');
  }
  const sourceByRef = new Map(input.workspace.fullFrozenSources.sources
    .map(source => [source.ref, source]));
  const developmentById = new Map(input.workspace.developmentCases
    .map(testCase => [testCase.caseId, testCase]));
  const audits = orderedCandidates(production).map(candidate => {
    verifySeal(candidate);
    if (candidate.inputHash !== input.hash || candidate.reviews.length !== 3
      || candidate.lifecycle.open !== 0 || candidate.lifecycle.uncertain !== 0) {
      fail('MATCHUP_FINAL_SOURCE_REVIEW_INVALID');
    }
    const lifecycle = reconcileStrategyReviewOpinionsV1(
      candidate.reviews.map(review => review.evidence), hash(candidate.policy));
    const checkedFields = lifecycle.events.map(event =>
      event.targetId.replace(/^field\./u, ''));
    if (lifecycle.open !== 0 || lifecycle.uncertain !== 0
      || lifecycle.modelReportedClear !== REVIEW_FIELDS.length
      || new Set(checkedFields).size !== REVIEW_FIELDS.length
      || REVIEW_FIELDS.some(field => !checkedFields.includes(field))) {
      fail('MATCHUP_FINAL_SOURCE_FIELD_DENOMINATOR_INVALID');
    }
    const policyRefs = candidate.policy.ruleRefs;
    if (new Set(policyRefs).size !== policyRefs.length) fail('MATCHUP_FINAL_SOURCE_REF_DUPLICATED');
    const boundSources = policyRefs.map(ref => {
      const source = sourceByRef.get(ref);
      if (!source) fail('MATCHUP_FINAL_SOURCE_REF_INVALID');
      return seal({ ref, sourceHash: hash(source), passages: source.passages.map(passage => ({
        spanId: passage.spanId, textHash: hash(passage.text),
      })) });
    });
    for (const caseId of candidate.policy.caseIds) {
      const testCase = developmentById.get(caseId);
      if (!testCase || !testCase.policyAxes.includes(candidate.axis)) {
        fail('MATCHUP_FINAL_DEVELOPMENT_CASE_BINDING_INVALID');
      }
    }
    return seal({
      schema: 'directed_matchup_independent_source_axis_audit_v1',
      inputHash: input.hash,
      productionHash: production.hash,
      candidateHash: candidate.hash,
      policyHash: hash(candidate.policy),
      axis: candidate.axis,
      checkedFields: [...REVIEW_FIELDS],
      modelReviewLifecycleHash: lifecycle.hash,
      boundSources,
      developmentCaseIds: [...candidate.policy.caseIds],
      heldoutCaseIdsDisclosedToPolicy: [],
      hostChecks: {
        currentFieldAnchorsReconstructed: true,
        sourceSpanCoordinatesReconstructed: true,
        everyPolicySourceRefResolvedAgainstFrozenContext: true,
        developmentCaseScopeRecomputed: true,
        dependencyAndSourceBindingPreserved: true,
      },
      adjudicationScope: 'all_policy_fields_and_declared_source_bindings_not_full_game_optimality',
      fullCoverage: true,
      sourceReviewPassed: true,
      humanReviewed: false,
      canAffectRules: false,
      runtimeAccepted: false,
      trainingTruth: false,
    });
  });
  return seal({
    schema: 'directed_matchup_independent_source_audit_bundle_v1',
    inputHash: input.hash,
    productionHash: production.hash,
    scope: production.scope,
    axisAudits: audits,
    fieldsChecked: audits.reduce((total, audit) => total + audit.checkedFields.length, 0),
    sourceReviewPassed: audits.every(audit => audit.sourceReviewPassed),
    fullGameStrategyEffectivenessProven: false,
    runtimeAccepted: false,
    trainingTruth: false,
  });
}

export function finalizeDirectedMatchupSkillV1({ input, production, sourceAudit,
  caseResults }) {
  [input, production, sourceAudit, ...caseResults].forEach(verifySeal);
  if (sourceAudit.inputHash !== input.hash || sourceAudit.productionHash !== production.hash
    || sourceAudit.fieldsChecked !== STRATEGY_AXES.matchup.length * REVIEW_FIELDS.length
    || sourceAudit.axisAudits.length !== STRATEGY_AXES.matchup.length
    || !sourceAudit.sourceReviewPassed) fail('MATCHUP_FINAL_SOURCE_AUDIT_REQUIRED');
  const candidates = orderedCandidates(production);
  const opening = candidates.find(candidate => candidate.axis === 'opening_branches');
  const expectedCaseHashes = new Set([
    ...input.evaluationManifest.developmentCaseHashes,
    ...input.evaluationManifest.heldoutCaseHashes,
  ]);
  const splits = { development: 0, heldout: 0 };
  if (caseResults.length !== expectedCaseHashes.size || caseResults.length !== 2) {
    fail('MATCHUP_FINAL_CASE_DENOMINATOR_INVALID');
  }
  for (const result of caseResults) {
    if (!expectedCaseHashes.has(result.caseHash) || result.axis !== 'opening_branches'
      || result.inputHash !== input.hash || result.policyHash !== hash(opening.policy)
      || !['development', 'heldout'].includes(result.evaluationSplit)
      || !result.grade.legalCandidateSelected || !result.grade.decisionPreferencePassed
      || !result.grade.rationaleStructurePassed || !result.rulesReplayPassed) {
      fail('MATCHUP_FINAL_CASE_FAILED');
    }
    splits[result.evaluationSplit] += 1;
  }
  if (splits.development !== 1 || splits.heldout !== 1) {
    fail('MATCHUP_FINAL_CASE_DENOMINATOR_INVALID');
  }
  const draft = { policies: candidates.map(candidate => candidate.policy) };
  validateStrategyDraftV1(draft, input.contract, {
    allowedRuleRefs: input.workspace.fullFrozenSources.sources.map(source => source.ref),
    allowedCaseIds: input.workspace.developmentCases.map(testCase => testCase.caseId),
  });
  const base = createStrategyLayerV1({ contract: input.contract, draft, author: 'model_candidate' });
  const layer = seal({
    ...Object.fromEntries(Object.entries(base).filter(([key]) => key !== 'hash')),
    status: 'offline_strategy_candidate',
    assessment: {
      sourceReviewPassed: true,
      decisionCasesPassed: true,
      evaluatedDecisionAxes: ['opening_branches'],
      uncoveredDecisionAxes: [...production.uncoveredDecisionAxes],
      strategyEffectivenessProven: false,
      completeGamePassed: false,
      humanReviewed: false,
    },
    proof: {
      productionHash: production.hash,
      sourceAuditHash: sourceAudit.hash,
      caseResultHashes: caseResults.map(result => result.hash),
      rulesExecutedCaseCount: caseResults.length,
    },
    runtimeAccepted: false,
    published: false,
    trainingTruth: false,
  });
  const ownId = input.contract.scope.ownFaction.split(':')[1];
  const opponentId = input.contract.scope.opponentFaction.split(':')[1];
  const sourceRefs = [...new Set(draft.policies.flatMap(policy => policy.ruleRefs))];
  const skill = seal({
    schema: 'project_d_game_skill_v1',
    gameId: 'starcraft-tmg',
    rulesVersion: input.contract.sourceBinding.rules,
    sourceBinding: input.contract.sourceBinding,
    skillId: `starcraft-tmg.matchup.${ownId}-to-${opponentId}`,
    version: '1.0.0-offline-bounded-evaluation',
    skillType: 'strategy',
    direction: input.contract.scope,
    dependencies: {
      generalSkillHash: input.workspace.strategyDependencies.generalSkill.hash,
      ownFactionSkillHash: input.workspace.strategyDependencies.ownSkill.hash,
      opponentFactionSkillHash: input.workspace.strategyDependencies.opponentSkill.hash,
    },
    strategyLayerHash: layer.hash,
    sourceRefs,
    preconditions: [
      '加载精确总规则、己方势力与对方势力 Skill 依赖',
      '读取当前玩家可见状态、任务、阶段、资源、单位与升级',
      '先从 Rules 服务取得当前 LegalSpace；策略不能创造动作或裁定规则',
    ],
    procedure: draft.policies.map(policy => ({
      axis: policy.axis,
      title: policy.title,
      when: policy.when,
      objective: policy.objective,
      steps: policy.decisionProcedure,
      alternatives: policy.alternatives,
      opponentBranches: policy.opponentBranches,
      risk: policy.risk,
      reviseIf: policy.reviseIf,
      requiredQueries: policy.requiredQueries,
      ruleRefs: policy.ruleRefs,
      developmentCaseIds: policy.caseIds,
    })),
    legalityChecks: [
      'Rules 服务是动作合法性的唯一权威',
      '只选择当前 LegalSpace 中启用的候选',
      '写操作必须 Preview→房间确认策略→Apply→Replay',
    ],
    illegalPatterns: [
      '把对抗偏好写成规则事实',
      '读取对手私有信息或未披露升级',
      '使用 held-out 目标修改 Skill 正文',
      '把单步先手测试当作整局最优或胜率证明',
      '因来源冲突自行扩大 Rules 权限',
    ],
    examples: caseResults.filter(result => result.evaluationSplit === 'development')
      .map(result => ({ axis: result.axis, caseId: result.caseId, receiptHash: result.hash })),
    counterExamples: production.uncoveredDecisionAxes.map(axis =>
      `${axis}: 尚无真实局面开发/held-out 对照，不得宣称效果已验证`),
    judgeTests: {
      productionHash: production.hash,
      sourceAuditHash: sourceAudit.hash,
      caseResults: caseResults.map(result => ({ caseId: result.caseId,
        split: result.evaluationSplit, passed: true, receiptHash: result.hash })),
      evaluatedDecisionAxes: ['opening_branches'],
      uncoveredDecisionAxes: [...production.uncoveredDecisionAxes],
    },
    confidence: 'all_fields_source_bound_and_opening_rules_cases_passed_other_axes_and_full_game_unproven',
    trustTier: 'offline_evaluated_advisory',
    status: 'offline_candidate',
    humanReviewed: false,
    canAffectStrategy: true,
    canAffectRules: false,
    fullGameStrategyEffectivenessProven: false,
    runtimeAccepted: false,
    published: false,
    trainingTruth: false,
  });
  const routerEntry = seal({
    schema: 'starcraft_matchup_skill_router_entry_v1',
    gameId: 'starcraft-tmg',
    direction: input.contract.scope,
    skillId: skill.skillId,
    skillHash: skill.hash,
    strategyLayerHash: layer.hash,
    offlineProductionLoads: [skill.hash],
    runtimeLoads: [],
    legalityAuthority: 'rules_service_only',
    runtimeBlockedUntil: ['isolated_room_arena', 'version_registry_cas'],
    runtimeAccepted: false,
    trainingTruth: false,
  });
  return seal({
    schema: 'starcraft_directed_matchup_finalization_result_v1',
    inputHash: input.hash,
    productionHash: production.hash,
    sourceAuditHash: sourceAudit.hash,
    layer,
    skill,
    routerEntry,
    caseResults,
    formalOfflineSkillCompleted: true,
    completeGameStrategyEffectivenessProven: false,
    runtimeAccepted: false,
    trainingTruth: false,
  });
}

export function renderFinalDirectedMatchupSkillV1(result) {
  verifySeal(result); verifySeal(result.skill);
  const lines = [`# 对抗策略 Skill：${result.skill.direction.ownFaction} → ${result.skill.direction.opponentFaction}`, '',
    `版本：${result.skill.version}`, '',
    '状态：全部字段完成冻结来源绑定，opening_branches 的开发与留出 Rules 单步决策通过。',
    '限制：其余四轴与整局胜率尚未由真实对局证明；Rules 服务始终裁定合法性。', ''];
  for (const policy of result.skill.procedure) lines.push(`## ${policy.title}（${policy.axis}）`, '',
    `适用：${policy.when.join('；')}`, '', `目标：${policy.objective}`, '',
    ...policy.steps.map((step, index) => `${index + 1}. ${step}`), '',
    `备选：${policy.alternatives.map(row => `${row.option}（${row.preferWhen}）`).join('；')}`, '',
    `对手回应：${policy.opponentBranches.map(row => `${row.response} → ${row.adaptation}`).join('；')}`, '',
    `风险：${policy.risk}`, '', `改计划：${policy.reviseIf.join('；')}`, '',
    `查询：${policy.requiredQueries.join('、')}`, '', `来源：${policy.ruleRefs.join('；')}`, '');
  lines.push('## 未覆盖决策轴', '', ...result.skill.judgeTests.uncoveredDecisionAxes.map(axis => `- ${axis}`), '',
    `结构化 Skill hash：${result.skill.hash}`, `策略层 hash：${result.layer.hash}`, '');
  return lines.join('\n') + '\n';
}
