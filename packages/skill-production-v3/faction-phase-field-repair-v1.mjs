import { inspectFactionPhaseSourceDebtV1 } from '../skill-evaluation/faction-phase-source-debt-v1.mjs';
import { inspectFactionUnitRoleDebtV1 } from '../skill-evaluation/faction-unit-role-debt-v1.mjs';
import { inspectFactionCrossFieldSourceAuditV1 } from '../skill-evaluation/faction-cross-field-source-audit-v1.mjs';
import { createFactionWritingPlanV1, validateFactionDraftV1, factionRoleWorkspaceV1 } from './faction-strategy-workflow-v1.mjs';
import { seal, verifySeal, hash, exact, text, clone, fail } from '../skill-production/common.mjs';

// A separate version leaves the already paid v2 role inputs/plan hashes intact.
// This produces a repair candidate, never a source-review acceptance waiver.
export function createFactionPhaseFieldPlanV1({ input, section, draft }) {
  verifySeal(input); validateFactionDraftV1(draft, input);
  if (!createFactionWritingPlanV1(input).sections.some(s => hash(s) === hash(section))) fail('FACTION_PHASE_FIELD_SECTION_DRIFT');
  const audit = inspectFactionPhaseSourceDebtV1({ input, draft });
  if (!audit.findings.length) fail('FACTION_PHASE_FIELD_NO_DEBT');
  const grouped = new Map();
  for (const finding of audit.findings) {
    const r = draft.recommendations[finding.index], parts = finding.path.split('.');
    if (!r || !['when', 'procedure', 'alternatives', 'risk', 'reviseIf', 'unproven'].includes(parts[0])
      || parts.length > 2 || parts.length === 2 && (!/^(0|[1-9][0-9]*)$/.test(parts[1]) || !Array.isArray(r[parts[0]])))
      fail('FACTION_PHASE_FIELD_PATH_INVALID');
    const oldText = parts.length === 1 ? r[parts[0]] : r[parts[0]][Number(parts[1])];
    if (typeof oldText !== 'string' || oldText !== finding.text || hash(oldText) !== finding.textHash
      || hash(r) !== finding.recommendationHash) fail('FACTION_PHASE_FIELD_FINDING_DRIFT');
    const key = finding.index + ':' + finding.path;
    const target = grouped.get(key) || { targetId: 'phase-field-' + hash({ inputHash: input.hash, sectionId: section.id,
      draftHash: hash(draft), index: finding.index, path: finding.path }).slice(0, 20),
      index: finding.index, path: finding.path, title: r.title, oldText, oldTextHash: hash(oldText), findings: [] };
    target.findings.push(finding); grouped.set(key, target);
  }
  return seal({ version: 'faction_phase_field_plan_v1', inputHash: input.hash, sectionId: section.id, draftHash: hash(draft),
    auditHash: audit.hash, sourceBinding: input.sourceBinding, targets: [...grouped.values()], sourceEvidence: audit.sourceEvidence,
    batchSize: 3, fullSourceAndOverallRequired: true, wholeDraftRetainedInEveryBatch: true,
    allFieldsAppliedAtomically: true, semanticAcceptanceInherited: false, trainingTruth: false });
}

function validateReplacements(output, targets) {
  exact(output, ['replacements']);
  if (!Array.isArray(output.replacements) || output.replacements.length !== targets.length) fail('FACTION_PHASE_FIELD_DENOMINATOR');
  const pending = new Map(targets.map(t => [t.targetId, t]));
  for (const r of output.replacements) {
    exact(r, ['targetId', 'text']); text(r.text, 1600);
    const t = pending.get(r.targetId); if (!t) fail('FACTION_PHASE_FIELD_TARGET_INVALID'); pending.delete(r.targetId);
    if (r.text === t.oldText) fail('FACTION_PHASE_FIELD_NO_PROGRESS');
  }
}

export function applyFactionPhaseFieldRepairV1(output, { input, section, draft, plan }) {
  verifySeal(plan);
  if (createFactionPhaseFieldPlanV1({ input, section, draft }).hash !== plan.hash) fail('FACTION_PHASE_FIELD_PLAN_DRIFT');
  validateReplacements(output, plan.targets);
  const next = clone(draft), changes = [];
  for (const r of output.replacements) {
    const t = plan.targets.find(t => t.targetId === r.targetId), parts = t.path.split('.');
    if (parts.length === 1) next.recommendations[t.index][parts[0]] = r.text;
    else next.recommendations[t.index][parts[0]][Number(parts[1])] = r.text;
    changes.push({ targetId: t.targetId, index: t.index, path: t.path, beforeHash: t.oldTextHash, afterHash: hash(r.text) });
  }
  validateFactionDraftV1(next, input);
  const debtsAfter = [inspectFactionPhaseSourceDebtV1, inspectFactionUnitRoleDebtV1, inspectFactionCrossFieldSourceAuditV1]
    .map(inspect => inspect({ input, draft: next }));
  if (debtsAfter.some(audit => audit.findings.length)) fail('FACTION_PHASE_FIELD_KNOWN_DEBT_REMAINS');
  return seal({ version: 'faction_phase_field_patch_v1', planHash: plan.hash, parentDraftHash: hash(draft), draftHash: hash(next),
    draft: next, rawOutputHash: hash(output), changes, debtsAfter,
    unchangedRecommendationIndices: next.recommendations.flatMap((r, index) => hash(r) === hash(draft.recommendations[index]) ? [index] : []),
    allUnflaggedFieldsPreserved: true, oldProviderOutputOverwritten: false, freshWholeSectionReviewRequired: true,
    sourceReviewPassed: false, independentEvaluationPassed: false, runtimeAccepted: false, trainingTruth: false });
}

export async function repairFactionPhaseFieldsV1({ input, section, draft, runtime, store }) {
  const plan = createFactionPhaseFieldPlanV1({ input, section, draft });
  const packet = seal({ id: 'faction.' + input.factionRecordKey.split(':')[1], inputHash: input.hash, sourceBinding: input.sourceBinding });
  const id = section.id + '.phase-fields-v1.' + plan.hash.slice(0, 20);
  const issueLease = store.acquire(id + '.issue', { planHash: plan.hash });
  if (!issueLease.cached) store.finish(issueLease, plan);
  const replacements = [], artifactHashes = [];
  for (let start = 0; start < plan.targets.length; start += plan.batchSize) {
    const targets = plan.targets.slice(start, start + plan.batchSize);
    const edited = await runtime.role({ packet, roleId: id + '.batch.' + start, maxOutput: 4096,
      instruction: '按独立官方来源反例修复editTargetsAtEnd指定字段。完整官方来源、522条总规则、整节draft和全部11处修复问题仍在上下文中；对照同条其他字段避免新矛盾。本批最多3个目标，仅返回每个实际targetId和该字段修正后的完整text，格式{"replacements":[{"targetId":"实际ID","text":"完整修订文字"}]}。不得改未指定字段，不返回hash/index/path/验收标记，不把反例解释编成新规则。保留正确的卡牌耗尽/最高BUFF规则，区分Active已有激活窗口与额外消耗激活、非致命伤害与随后普通伤害、单次Move与分别执行的额外Move。保持有条件的策略取舍，无法证明的优势不能写成事实。全部批次齐备才应用，并重新审查整段；此编辑不授予通过状态。',
      workspace: { ...factionRoleWorkspaceV1(input), section, draft, repairPlan: plan, editTargetsAtEnd: targets } });
    validateReplacements(edited.output, targets); replacements.push(...edited.output.replacements); artifactHashes.push(edited.hash);
  }
  const patch = applyFactionPhaseFieldRepairV1({ replacements }, { input, section, draft, plan });
  const result = seal({ version: 'faction_phase_field_repair_candidate_v1', plan, patch, artifactHashes,
    sourceReviewPassed: false, freshWholeSectionReviewRequired: true, runtimeAccepted: false, trainingTruth: false });
  const lease = store.acquire(id + '.patch', { resultHash: result.hash });
  return lease.cached ? verifySeal(lease.artifact) : store.finish(lease, result);
}
