import { inspectFactionUnitRoleDebtV1 } from '../skill-evaluation/faction-unit-role-debt-v1.mjs';
import { createFactionWritingPlanV1, validateFactionDraftV1, factionRoleWorkspaceV1 } from './faction-strategy-workflow-v1.mjs';
import { seal, verifySeal, hash, exact, text, clone, fail } from '../skill-production/common.mjs';

export function createFactionUnitRoleFieldPlanV1({ input, section, draft }) {
  verifySeal(input); validateFactionDraftV1(draft, input);
  if (!createFactionWritingPlanV1(input).sections.some(s => hash(s) === hash(section))) fail('FACTION_UNIT_FIELD_SECTION_DRIFT');
  const debt = inspectFactionUnitRoleDebtV1({ input, draft });
  if (!debt.findings.length) fail('FACTION_UNIT_FIELD_NO_KNOWN_DEBT');
  const targets = debt.findings.map(f => {
    if (!/^(procedure|alternatives)\.(0|[1-9][0-9]*)$/.test(f.path)) fail('FACTION_UNIT_FIELD_PATH_INVALID');
    return { targetId: 'unit-field-' + hash({ inputHash: input.hash, sectionId: section.id, draftHash: hash(draft), index: f.index, path: f.path }).slice(0, 20),
      index: f.index, path: f.path, title: f.title, recommendationHash: f.recommendationHash,
      oldText: f.text, oldTextHash: f.textHash, finding: f };
  });
  return seal({ version: 'faction_unit_role_field_plan_v1', inputHash: input.hash, sectionId: section.id, draftHash: hash(draft),
    sourceBinding: input.sourceBinding, debtHash: debt.hash, targets, sourceEvidence: debt.sourceEvidence,
    fullSourceAndOverallRequired: true, unaffectedFieldsMustRemainIdentical: true, semanticAcceptanceInherited: false, trainingTruth: false });
}

export function applyFactionUnitRoleFieldRepairV1(output, { input, section, draft, plan }) {
  verifySeal(plan);
  if (createFactionUnitRoleFieldPlanV1({ input, section, draft }).hash !== plan.hash) fail('FACTION_UNIT_FIELD_PLAN_DRIFT');
  exact(output, ['replacements']);
  if (!Array.isArray(output.replacements) || output.replacements.length !== plan.targets.length) fail('FACTION_UNIT_FIELD_DENOMINATOR');
  const next = clone(draft), pending = new Map(plan.targets.map(t => [t.targetId, t])), changes = [];
  for (const r of output.replacements) {
    exact(r, ['targetId', 'text']); text(r.text, 1600);
    const t = pending.get(r.targetId); if (!t) fail('FACTION_UNIT_FIELD_TARGET_INVALID'); pending.delete(r.targetId);
    if (r.text === t.oldText) fail('FACTION_UNIT_FIELD_NO_PROGRESS');
    const [field, index] = t.path.split('.');
    if (next.recommendations[t.index][field][Number(index)] !== t.oldText) fail('FACTION_UNIT_FIELD_PLAN_DRIFT');
    next.recommendations[t.index][field][Number(index)] = r.text;
    changes.push({ targetId: t.targetId, index: t.index, path: t.path, beforeHash: t.oldTextHash, afterHash: hash(r.text) });
  }
  validateFactionDraftV1(next, input);
  const knownDebtAfter = inspectFactionUnitRoleDebtV1({ input, draft: next });
  if (knownDebtAfter.findings.length) fail('FACTION_UNIT_FIELD_KNOWN_DEBT_REMAINS');
  return seal({ version: 'faction_unit_role_field_patch_v1', planHash: plan.hash, inputHash: input.hash, sectionId: section.id,
    parentDraftHash: hash(draft), draftHash: hash(next), draft: next, rawOutputHash: hash(output), changes, knownDebtAfter,
    unchangedRecommendationIndices: next.recommendations.flatMap((r, index) => hash(r) === hash(draft.recommendations[index]) ? [index] : []),
    allUnflaggedFieldsPreserved: true, oldProviderOutputOverwritten: false, sourceReviewPassed: false,
    independentEvaluationPassed: false, runtimeAccepted: false, trainingTruth: false });
}

export async function repairKnownFactionUnitRoleFieldsV1({ input, section, draft, runtime, store }) {
  const plan = createFactionUnitRoleFieldPlanV1({ input, section, draft });
  const packet = seal({ id: 'faction.' + input.factionRecordKey.split(':')[1], inputHash: input.hash, sourceBinding: input.sourceBinding });
  const id = section.id + '.known-unit-fields.' + plan.hash.slice(0, 20);
  const issueLease = store.acquire(id + '.issue', { planHash: plan.hash });
  if (!issueLease.cached) store.finish(issueLease, plan);
  const edited = await runtime.role({ packet, roleId: id, maxOutput: 4096,
    instruction: '根据独立来源反例修复editTargetsAtEnd指定的字段。完整官方来源、总规则、整节draft与所有相关原文仍在，必须读同一建议的其他字段确保一致。只重写标记字段的完整文字；不要修改其他字段、其他建议、引用、条数或元数据，不把问题原因当作超出原文的新规则。每个目标恰好一次，返回{"replacements":[{"targetId":"复制实际目标ID","text":"此字段修正后的完整文字"}]}，不要返回hash、index、path、验收结论或其他键。不得仅换个说法保留已确认的错误；不能解决则保持阻断，不编造。修订后将重新审查完整段落。',
    workspace: { ...factionRoleWorkspaceV1(input), section, draft, repairPlan: plan, editTargetsAtEnd: plan.targets } });
  const patch = applyFactionUnitRoleFieldRepairV1(edited.output, { input, section, draft, plan });
  const result = seal({ version: 'faction_unit_role_field_repair_candidate_v1', plan, patch, artifactHash: edited.hash,
    sourceReviewPassed: false, freshWholeSectionReviewRequired: true, runtimeAccepted: false, trainingTruth: false });
  const lease = store.acquire(id + '.patch', { resultHash: result.hash });
  return lease.cached ? verifySeal(lease.artifact) : store.finish(lease, result);
}
