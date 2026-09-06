import { inspectFactionUnitRoleDebtV1 } from '../skill-evaluation/faction-unit-role-debt-v1.mjs';
import { inspectFactionCrossFieldSourceAuditV1 } from '../skill-evaluation/faction-cross-field-source-audit-v1.mjs';
import { createFactionWritingPlanV1, validateFactionDraftV1, factionRoleWorkspaceV1 } from './faction-strategy-workflow-v1.mjs';
import { seal, verifySeal, hash, exact, text, clone, fail } from '../skill-production/common.mjs';

// Registered, independently source-checked findings only. An LLM cannot add a
// target/path or grant itself an acceptance waiver through this contract.
export function inspectFactionRegisteredSourceDebtV2(args) {
  const audits = [inspectFactionUnitRoleDebtV1(args), inspectFactionCrossFieldSourceAuditV1(args)];
  return seal({ version: 'faction_registered_source_debt_v2', inputHash: args.input.hash, draftHash: hash(args.draft),
    audits, findings: audits.flatMap(a => a.findings), absenceProvesGeneralCorrectness: false, trainingTruth: false });
}

export function createFactionSourceFieldPlanV2({ input, section, draft }) {
  verifySeal(input); validateFactionDraftV1(draft, input);
  if (!createFactionWritingPlanV1(input).sections.some(s => hash(s) === hash(section))) fail('FACTION_SOURCE_FIELD_SECTION_DRIFT');
  const debt = inspectFactionRegisteredSourceDebtV2({ input, draft });
  if (!debt.findings.length) fail('FACTION_SOURCE_FIELD_NO_DEBT');
  const grouped = new Map();
  for (const finding of debt.findings) {
    const r = draft.recommendations[finding.index], parts = finding.path.split('.');
    if (!r || !['title', 'when', 'procedure', 'alternatives', 'risk', 'reviseIf', 'unproven'].includes(parts[0])
      || parts.length > 2 || parts.length === 2 && (!/^(0|[1-9][0-9]*)$/.test(parts[1]) || !Array.isArray(r[parts[0]])))
      fail('FACTION_SOURCE_FIELD_PATH_INVALID');
    const oldText = parts.length === 1 ? r[parts[0]] : r[parts[0]][Number(parts[1])];
    if (typeof oldText !== 'string' || oldText !== finding.text || hash(oldText) !== finding.textHash
      || hash(r) !== finding.recommendationHash) fail('FACTION_SOURCE_FIELD_FINDING_DRIFT');
    const key = finding.index + ':' + finding.path;
    const target = grouped.get(key) || { targetId: 'source-field-' + hash({ inputHash: input.hash, sectionId: section.id,
      draftHash: hash(draft), index: finding.index, path: finding.path }).slice(0, 20),
      index: finding.index, path: finding.path, title: r.title, oldText, oldTextHash: hash(oldText), findings: [] };
    target.findings.push(finding); grouped.set(key, target);
  }
  const targets = [...grouped.values()], evidence = new Map();
  for (const audit of debt.audits) for (const e of audit.sourceEvidence) {
    const prior = evidence.get(e.source.ref);
    if (prior && prior.sourceHash !== e.sourceHash) fail('FACTION_SOURCE_FIELD_EVIDENCE_CONFLICT');
    evidence.set(e.source.ref, e);
  }
  return seal({ version: 'faction_source_field_plan_v2', inputHash: input.hash, sectionId: section.id, draftHash: hash(draft),
    debtHash: debt.hash, auditHashes: debt.audits.map(a => a.hash), sourceBinding: input.sourceBinding,
    targets, sourceEvidence: [...evidence.values()], batchSize: 3,
    fullSourceAndOverallRequired: true, wholeDraftRetainedInEveryBatch: true,
    allFieldsAppliedAtomically: true, semanticAcceptanceInherited: false, trainingTruth: false });
}

function validateReplacements(output, targets) {
  exact(output, ['replacements']);
  if (!Array.isArray(output.replacements) || output.replacements.length !== targets.length) fail('FACTION_SOURCE_FIELD_DENOMINATOR');
  const pending = new Map(targets.map(t => [t.targetId, t]));
  for (const r of output.replacements) {
    exact(r, ['targetId', 'text']); text(r.text, 1600);
    const t = pending.get(r.targetId); if (!t) fail('FACTION_SOURCE_FIELD_TARGET_INVALID'); pending.delete(r.targetId);
    if (r.text === t.oldText) fail('FACTION_SOURCE_FIELD_NO_PROGRESS');
  }
  return output;
}

export function applyFactionSourceFieldRepairV2(output, { input, section, draft, plan }) {
  verifySeal(plan);
  if (createFactionSourceFieldPlanV2({ input, section, draft }).hash !== plan.hash) fail('FACTION_SOURCE_FIELD_PLAN_DRIFT');
  validateReplacements(output, plan.targets);
  const next = clone(draft), changes = [];
  for (const r of output.replacements) {
    const t = plan.targets.find(t => t.targetId === r.targetId), parts = t.path.split('.');
    if (parts.length === 1) next.recommendations[t.index][parts[0]] = r.text;
    else next.recommendations[t.index][parts[0]][Number(parts[1])] = r.text;
    changes.push({ targetId: t.targetId, index: t.index, path: t.path, beforeHash: t.oldTextHash, afterHash: hash(r.text) });
  }
  validateFactionDraftV1(next, input);
  const debtAfter = inspectFactionRegisteredSourceDebtV2({ input, draft: next });
  if (debtAfter.findings.length) fail('FACTION_SOURCE_FIELD_KNOWN_DEBT_REMAINS');
  return seal({ version: 'faction_source_field_patch_v2', planHash: plan.hash, parentDraftHash: hash(draft), draftHash: hash(next),
    draft: next, rawOutputHash: hash(output), changes, debtAfter,
    unchangedRecommendationIndices: next.recommendations.flatMap((r, index) => hash(r) === hash(draft.recommendations[index]) ? [index] : []),
    allUnflaggedFieldsPreserved: true, oldProviderOutputOverwritten: false, freshWholeSectionReviewRequired: true,
    sourceReviewPassed: false, independentEvaluationPassed: false, runtimeAccepted: false, trainingTruth: false });
}

export async function repairFactionSourceFieldsV2({ input, section, draft, runtime, store }) {
  const plan = createFactionSourceFieldPlanV2({ input, section, draft });
  const packet = seal({ id: 'faction.' + input.factionRecordKey.split(':')[1], inputHash: input.hash, sourceBinding: input.sourceBinding });
  const id = section.id + '.registered-source-fields-v2.' + plan.hash.slice(0, 20);
  const issueLease = store.acquire(id + '.issue', { planHash: plan.hash });
  if (!issueLease.cached) store.finish(issueLease, plan);
  const replacements = [], artifactHashes = [];
  for (let start = 0; start < plan.targets.length; start += plan.batchSize) {
    const targets = plan.targets.slice(start, start + plan.batchSize);
    const edited = await runtime.role({ packet, roleId: id + '.batch.' + start, maxOutput: 4096,
      instruction: '按独立官方来源反例修复editTargetsAtEnd指定字段。上下文仍包含完整官方来源、总规则、整节draft和全部修复问题；必须对照同条其他字段避免新矛盾。本批最多3个目标，仅返回每个实际targetId和该字段修正后的完整text，格式{"replacements":[{"targetId":"实际ID","text":"完整修订文字"}]}。不得改未指定字段，不返回hash/index/path/验收标记，不把反例解释编成新规则。保持有条件的策略取舍；无法证明的优势不能写成事实。所有批次齐备才会应用并重审完整段落。',
      workspace: { ...factionRoleWorkspaceV1(input), section, draft, repairPlan: plan, editTargetsAtEnd: targets } });
    validateReplacements(edited.output, targets); replacements.push(...edited.output.replacements); artifactHashes.push(edited.hash);
  }
  const patch = applyFactionSourceFieldRepairV2({ replacements }, { input, section, draft, plan });
  const result = seal({ version: 'faction_source_field_repair_candidate_v2', plan, patch, artifactHashes,
    sourceReviewPassed: false, freshWholeSectionReviewRequired: true, runtimeAccepted: false, trainingTruth: false });
  const lease = store.acquire(id + '.patch', { resultHash: result.hash });
  return lease.cached ? verifySeal(lease.artifact) : store.finish(lease, result);
}
