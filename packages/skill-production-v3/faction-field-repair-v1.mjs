import { seal, verifySeal, hash, exact, text, clone, fail } from '../skill-production/common.mjs';
import { createFactionWritingPlanV1, validateFactionDraftV1, factionRoleWorkspaceV1 } from './faction-strategy-workflow-v1.mjs';
import { assertNoKnownFactionRuleFailureV1 } from './faction-known-rule-findings-v1.mjs';
import { inspectFactionSemanticDebtV1 } from '../skill-evaluation/faction-semantic-debt-v1.mjs';

export function createFactionFieldRepairPlanV1({ input, sectionResult, knownRulePolicy }) {
  [input, sectionResult, knownRulePolicy].forEach(verifySeal);
  if (knownRulePolicy.inputHash !== input.hash || sectionResult.runtimeAccepted || sectionResult.trainingTruth
    || !createFactionWritingPlanV1(input).sections.some(s => hash(s) === hash(sectionResult.section))) fail('FACTION_FIELD_REPAIR_INPUT_DRIFT');
  validateFactionDraftV1(sectionResult.draft, input);
  assertNoKnownFactionRuleFailureV1({ input, policy: knownRulePolicy, draft: sectionResult.draft });
  const debt = inspectFactionSemanticDebtV1({ input, draft: sectionResult.draft });
  if (!debt.findings.length) fail('FACTION_FIELD_REPAIR_NO_KNOWN_DEBT');
  const targets = debt.findings.map(f => {
    if (!/^reviseIf\.(0|[1-9][0-9]*)$/.test(f.path)) fail('FACTION_FIELD_REPAIR_PATH_NOT_IMPLEMENTED');
    return { targetId: 'field-' + hash({ sectionResultHash: sectionResult.hash, index: f.index, path: f.path }).slice(0, 20),
      index: f.index, path: f.path, title: sectionResult.draft.recommendations[f.index].title,
      recommendationHash: f.recommendationHash, oldText: f.text, oldTextHash: f.textHash, finding: f };
  });
  return seal({ version: 'faction_field_repair_plan_v1', inputHash: input.hash, sectionResultHash: sectionResult.hash,
    sectionId: sectionResult.section.id, draftHash: hash(sectionResult.draft), knownRulePolicyHash: knownRulePolicy.hash,
    debtHash: debt.hash, sourceBinding: input.sourceBinding, targets, sourceEvidence: debt.sourceEvidence,
    scope: 'exact_independently_flagged_text_fields_only_preserve_every_other_field',
    fullSourceAndOverallRequired: true, semanticAcceptanceInherited: false, trainingTruth: false });
}

export function applyFactionFieldRepairV1(output, { input, sectionResult, knownRulePolicy, plan }) {
  verifySeal(plan);
  if (createFactionFieldRepairPlanV1({ input, sectionResult, knownRulePolicy }).hash !== plan.hash) fail('FACTION_FIELD_REPAIR_PLAN_DRIFT');
  exact(output, ['replacements']);
  if (!Array.isArray(output.replacements) || output.replacements.length !== plan.targets.length) fail('FACTION_FIELD_REPAIR_DENOMINATOR');
  const draft = clone(sectionResult.draft), pending = new Map(plan.targets.map(t => [t.targetId, t])), changes = [];
  for (const replacement of output.replacements) {
    exact(replacement, ['targetId', 'text']); text(replacement.text, 1600);
    const target = pending.get(replacement.targetId);
    if (!target) fail('FACTION_FIELD_REPAIR_TARGET_INVALID'); pending.delete(replacement.targetId);
    if (replacement.text === target.oldText) fail('FACTION_FIELD_REPAIR_NO_PROGRESS');
    const position = Number(target.path.slice('reviseIf.'.length));
    if (draft.recommendations[target.index].reviseIf[position] !== target.oldText) fail('FACTION_FIELD_REPAIR_PLAN_DRIFT');
    draft.recommendations[target.index].reviseIf[position] = replacement.text;
    changes.push({ targetId: target.targetId, index: target.index, path: target.path, beforeHash: target.oldTextHash, afterHash: hash(replacement.text) });
  }
  validateFactionDraftV1(draft, input);
  assertNoKnownFactionRuleFailureV1({ input, policy: knownRulePolicy, draft });
  const knownDebtAfter = inspectFactionSemanticDebtV1({ input, draft });
  if (knownDebtAfter.findings.length) fail('FACTION_FIELD_REPAIR_KNOWN_DEBT_REMAINS');
  const unchangedRecommendationIndices = draft.recommendations.flatMap((r, n) => hash(r) === hash(sectionResult.draft.recommendations[n]) ? [n] : []);
  return seal({ version: 'faction_field_repair_patch_v1', planHash: plan.hash, inputHash: input.hash,
    parentSectionResultHash: sectionResult.hash, parentDraftHash: hash(sectionResult.draft), draftHash: hash(draft), draft,
    rawOutputHash: hash(output), changes, unchangedRecommendationIndices, knownDebtAfter,
    allUnflaggedFieldsPreserved: true, oldProviderOutputOverwritten: false,
    sourceReviewPassed: false, independentEvaluationPassed: false, runtimeAccepted: false, trainingTruth: false });
}

export async function repairFactionSectionFieldsV1({ input, sectionResult, knownRulePolicy, runtime, store }) {
  const plan = createFactionFieldRepairPlanV1({ input, sectionResult, knownRulePolicy });
  const packet = seal({ id: 'faction-field-repair.' + input.factionRecordKey.split(':')[1], inputHash: input.hash, sourceBinding: input.sourceBinding });
  const roleId = 'edit.' + plan.hash.slice(0, 20);
  const edited = await runtime.role({ packet, roleId, maxOutput: 4096,
    instruction: '修复独立来源检查已确认的单字段矛盾。完整官方来源、总规则、整节draft及修复证据均保留。只重写editTargetsAtEnd列出的字段，使它与来源和同一建议其他步骤一致；其余字段、引用、条数与其他建议一字不改。不要把审查意见当新规则，不推翻每玩家每次激活一个Reaction限制，不用虚构组合替代。只返回{"replacements":[{"targetId":"从editTargetsAtEnd复制实际ID","text":"该字段修正后的完整文字"}]}；每个给定targetId恰好一次，不返回parentHash/planHash/其他元数据，不宣称已通过验收。',
    workspace: { ...factionRoleWorkspaceV1(input), section: sectionResult.section, draft: sectionResult.draft, repairPlan: plan,
      editTargetsAtEnd: plan.targets } });
  const patch = applyFactionFieldRepairV1(edited.output, { input, sectionResult, knownRulePolicy, plan });
  const result = seal({ version: 'faction_section_field_repair_candidate_v1', inputHash: input.hash,
    parentSectionResultHash: sectionResult.hash, plan, editArtifactHash: edited.hash, patch,
    sourceReviewPassed: false, independentEvaluationPassed: false, runtimeAccepted: false,
    remainingGate: 'fresh_whole_section_source_review_then_complete_faction_consumer_and_strategy_evaluation', trainingTruth: false });
  const lease = store.acquire(roleId + '.candidate', { resultHash: result.hash });
  return lease.cached ? verifySeal(lease.artifact) : store.finish(lease, result);
}
