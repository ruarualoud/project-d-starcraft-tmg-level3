import { seal, verifySeal, hash, exact, text, clone, fail } from '../skill-production/common.mjs';
import { validateTutorLessonV3 } from './runtime.mjs';
import { createFactionReviewTargetsV1, validateTargetedFactionReviewV1, planFactionReviewFieldBindingV1,
  applyFactionReviewFieldBindingV1 } from './faction-review-targets-v1.mjs';
import { correctKnownFactionRuleFailuresV1, assertNoKnownFactionRuleFailureV1, mergeFactionKnownSourceIssuesV1 } from './faction-known-rule-findings-v1.mjs';
import { adjudicateFactionSourceScopesV1 } from './faction-source-scope-adjudication-v1.mjs';

export const FACTION_AXES_V1 = ['army_resources', 'unit_roles', 'phase_tempo', 'objectives', 'threat_tradeoffs', 'card_packages'];
const ADVICE_SHAPE = { recommendations: [{ title: '标题', when: ['适用的可观察条件'], procedure: ['步骤'],
  alternatives: ['不同条件下的替代行动及取舍'], risk: '代价/失败风险', reviseIf: ['何时改变计划'],
  sourceRefs: ['完整官方来源ID'], unproven: ['尚需实际局面/对战检验的效果'] }] };

export function createFactionWritingPlanV1(input) {
  verifySeal(input);
  if (input.schema !== 'starcraft_faction_production_input_v1' || input.runtimeAccepted || input.trainingTruth) fail('FACTION_WORKFLOW_INPUT_INVALID');
  const name = input.factionRecordKey.split(':')[1], sections = [];
  for (const axis of FACTION_AXES_V1) {
    const refs = axis === 'unit_roles' || axis === 'card_packages'
      ? input.factionEvidence.armyPool.filter(p => p.profile.candidateKind === (axis === 'unit_roles' ? 'unit' : 'tactical')).map(p => p.source.ref)
      : [input.factionEvidence.primarySource.ref];
    const chunk = 5;
    for (let n = 0; n < refs.length; n += chunk) sections.push({ id: 'faction.' + name + '.' + axis + '.' + (n / chunk + 1),
      axis, requiredSourceRefs: refs.slice(n, n + chunk), writingScope: 'one_section_inside_one_faction_skill_not_a_separate_skill' });
  }
  return seal({ schema: 'starcraft_faction_writing_plan_v1', inputHash: input.hash, factionRecordKey: input.factionRecordKey,
    sections, axes: FACTION_AXES_V1, skillsToProduce: 1, sourceRefreshPerformed: false, trainingTruth: false });
}

export function createFactionReviewBatchPlanV1({ section, draft }) {
  if (!Array.isArray(draft?.recommendations) || !draft.recommendations.length
    || !Array.isArray(section?.requiredSourceRefs) || new Set(section.requiredSourceRefs).size !== section.requiredSourceRefs.length)
    fail('FACTION_REVIEW_BATCH_PLAN_INVALID');
  const batches = [];
  for (let first = 0; first < draft.recommendations.length; first += 2) {
    batches.push({ first, reviewIndices: draft.recommendations.slice(first, first + 2).map((_, n) => first + n), requiredSourceRefs: [] });
  }
  const sourceAssignments = section.requiredSourceRefs.map(sourceRef => {
    const firstCitingIndex = draft.recommendations.findIndex(r => r.sourceRefs.includes(sourceRef));
    // Source coverage belongs with an actual citing target, not automatically
    // with targets0/1. A genuinely absent source remains assigned to batch0
    // so the missing-content verdict cannot disappear from the denominator.
    const batchStart = firstCitingIndex < 0 ? 0 : Math.floor(firstCitingIndex / 2) * 2;
    batches.find(b => b.first === batchStart).requiredSourceRefs.push(sourceRef);
    return { sourceRef, firstCitingIndex, batchStart, missingFromDraft: firstCitingIndex < 0 };
  });
  return seal({ version: 'faction_review_batch_plan_v1', sectionId: section.id, draftHash: hash(draft), batches, sourceAssignments,
    policy: 'each_required_source_once_per_route_at_first_citing_target_batch_absence_stays_visible',
    citationPlacementNotSemanticProof: true, trainingTruth: false });
}

// Global sources are supplied by runtime.role's stable full-source prefix.
// Do not duplicate them or trim the qualified overall dependency to a summary.
export function factionRoleWorkspaceV1(input) {
  verifySeal(input);
  return { inputHash: input.hash, factionRecordKey: input.factionRecordKey, overallDependencyHash: input.overallDependencyHash,
    overallSkill: input.overallSkill, operationalGuide: input.operationalGuide,
    factionEvidence: input.factionEvidence, taskBoundary: input.taskBoundary };
}

function refs(values, input) {
  const available = new Set(input.frozenSources.prompt.sources.map(s => s.ref));
  if (!Array.isArray(values) || !values.length || values.length > 8 || new Set(values).size !== values.length
    || values.some(r => !available.has(r))) fail('FACTION_SOURCE_REFERENCE_INVALID');
}
function strings(values, { empty = false, max = 16 } = {}) {
  if (!Array.isArray(values) || (!empty && !values.length) || values.length > max) fail('FACTION_STRING_ARRAY_INVALID');
  values.forEach(s => text(s, 1600));
}
export function validateFactionTreeV1(output, input, field = 'questions') {
  exact(output, ['branches']);
  if (!Array.isArray(output.branches) || output.branches.length !== FACTION_AXES_V1.length) fail('FACTION_TREE_DENOMINATOR');
  const pending = new Set(FACTION_AXES_V1);
  for (const branch of output.branches) {
    exact(branch, ['axis', field]);
    if (!pending.delete(branch.axis) || !Array.isArray(branch[field]) || branch[field].length < 2 || branch[field].length > 4) fail('FACTION_TREE_SCOPE_INVALID');
    for (const q of branch[field]) { exact(q, ['question', 'sourceRefs']); text(q.question, 1200); refs(q.sourceRefs, input); }
  }
  return output;
}
export function validateFactionDraftV1(output, input) {
  exact(output, ['recommendations']);
  if (!Array.isArray(output.recommendations) || !output.recommendations.length || output.recommendations.length > 8) fail('FACTION_DRAFT_DENOMINATOR');
  if (Buffer.byteLength(JSON.stringify(output)) > 65536) fail('FACTION_DRAFT_SIZE_LIMIT');
  for (const r of output.recommendations) {
    exact(r, ['title', 'when', 'procedure', 'alternatives', 'risk', 'reviseIf', 'sourceRefs', 'unproven']);
    text(r.title, 200); text(r.risk, 1600);
    [r.when, r.procedure, r.alternatives, r.reviseIf, r.unproven].forEach(v => strings(v)); refs(r.sourceRefs, input);
    if (/production-heldout\.|heldout\.|independent-condition\./.test(JSON.stringify(r))) fail('FACTION_TEST_MEMORIZATION_REJECTED');
  }
  return output;
}

export function validateFactionOutlineV1(output, { input, section }) {
  exact(output, ['outline']);
  if (!Array.isArray(output.outline) || !output.outline.length || output.outline.length > 8) fail('FACTION_OUTLINE_DENOMINATOR');
  for (const item of output.outline) { exact(item, ['focus', 'sourceRefs']); text(item.focus, 600); refs(item.sourceRefs, input); }
  if (section.requiredSourceRefs.some(ref => !output.outline.some(item => item.sourceRefs.includes(ref)))) fail('FACTION_OUTLINE_SOURCE_OMISSION');
  return output;
}

function adviceBodyHash(r) {
  const { sourceRefs: ignored, ...body } = r;
  return hash(body);
}
export function inspectFactionBatchScopeV1(output, { outline, indices, completedRecommendations = [] }) {
  return seal({ version: 'faction_batch_target_issues_v1', rejectedOutputHash: hash(output),
    completedRecommendationHashes: completedRecommendations.map(hash),
    targets: indices.map(index => {
      const value = output.items?.find(item => item.index === index)?.value;
      return { index, focus: outline[index].focus, requiredSourceRefs: outline[index].sourceRefs,
        missingSourceRefs: outline[index].sourceRefs.filter(ref => !value?.sourceRefs?.includes(ref)),
        duplicatesCompletedIndices: value ? completedRecommendations.flatMap((r, n) => adviceBodyHash(r) === adviceBodyHash(value) ? [n] : []) : [] };
    }), sourceReviewStillRequired: true, trainingTruth: false });
}
export function validateFactionDraftBatchV1(output, { input, outline, indices, completedRecommendations = [] }) {
  exact(output, ['items']);
  if (!Array.isArray(output.items) || output.items.length !== indices.length) fail('FACTION_BATCH_DENOMINATOR');
  const pending = new Set(indices), items = [];
  for (const item of output.items) {
    exact(item, ['index', 'value']);
    if (!pending.delete(item.index)) fail('FACTION_BATCH_SCOPE_INVALID');
    validateFactionDraftV1({ recommendations: [item.value] }, input);
    if ([...completedRecommendations, ...items.map(r => r.value)].some(r => adviceBodyHash(r) === adviceBodyHash(item.value))) fail('FACTION_BATCH_DUPLICATE_RECOMMENDATION');
    if (outline[item.index].sourceRefs.some(ref => !item.value.sourceRefs.includes(ref))) fail('FACTION_BATCH_SOURCE_OMISSION');
    items.push(item);
  }
  return items.sort((a, b) => a.index - b.index);
}

export function validateFactionReviewV1(output, { input, section, draft,
  reviewIndices = draft.recommendations.map((_, i) => i), requiredSourceRefs = section.requiredSourceRefs }) {
  exact(output, ['verdicts', 'coverage']);
  if (!Array.isArray(output.verdicts) || output.verdicts.length !== reviewIndices.length
    || !Array.isArray(output.coverage) || output.coverage.length < requiredSourceRefs.length) fail('FACTION_REVIEW_DENOMINATOR');
  const pending = new Set(reviewIndices);
  for (const v of output.verdicts) {
    exact(v, ['index', 'verdict', 'reason', 'sourceRefs']); text(v.reason, 1200); refs(v.sourceRefs, input);
    if (!pending.delete(v.index) || !['supported', 'unsupported', 'uncertain'].includes(v.verdict)) fail('FACTION_REVIEW_SCOPE_INVALID');
  }
  const required = new Set(requiredSourceRefs);
  // Required sources are a minimum coverage denominator. Preserve additional
  // coverage only for evidence actually cited by this draft, not arbitrary
  // global material. No verdict/negative finding is discarded or rewritten.
  const sources = new Set([...required, ...draft.recommendations.flatMap(r => r.sourceRefs)]);
  for (const c of output.coverage) {
    const keys = ['sourceRef', 'verdict', 'recommendationIndices', 'reason'];
    if (c && Object.hasOwn(c, 'sourceRefs')) {
      keys.push('sourceRefs');
      // Observed redundant alias, retained byte-for-byte rather than asking
      // the model to rewrite a negative review. Conflicting aliases fail.
      if (hash(c.sourceRefs) !== hash([c.sourceRef])) fail('FACTION_REVIEW_COVERAGE_ALIAS_CONFLICT');
    }
    exact(c, keys); text(c.reason, 1200);
    if (!sources.delete(c.sourceRef) || !['covered', 'omitted', 'uncertain'].includes(c.verdict)
      || !Array.isArray(c.recommendationIndices) || new Set(c.recommendationIndices).size !== c.recommendationIndices.length
      || c.recommendationIndices.some(i => !Number.isInteger(i) || !draft.recommendations[i])
      || c.verdict === 'covered' && !c.recommendationIndices.some(i => draft.recommendations[i].sourceRefs.includes(c.sourceRef))) fail('FACTION_REVIEW_COVERAGE_INVALID');
    required.delete(c.sourceRef);
  }
  if (required.size) fail('FACTION_REVIEW_DENOMINATOR');
  return output;
}

// Preserve a model's claimed semantic relationship, but derive direct citation
// membership from the actual draft. Indirect claims never satisfy coverage by
// themselves and are not silently converted into citations.
export function inspectFactionCoverageLinksV1(review, draft) {
  return seal({ draftHash: hash(draft), rawReviewHash: hash(review), links: review.coverage.map(c => ({
    sourceRef: c.sourceRef, verdict: c.verdict, claimedRecommendationIndices: c.recommendationIndices,
    directCitationIndices: c.recommendationIndices.filter(i => draft.recommendations[i].sourceRefs.includes(c.sourceRef)),
    indirectClaimedIndices: c.recommendationIndices.filter(i => !draft.recommendations[i].sourceRefs.includes(c.sourceRef)),
    indirectClaimVerified: false })), semanticCoverageProven: false, trainingTruth: false });
}

export function createFactionRepairIssuesV1(section, draft, reviews) {
  const issues = [];
  for (const [index, r] of draft.recommendations.entries()) {
    const findings = reviews.flatMap(v => [
      ...v.verdicts.filter(c => c.index === index && c.verdict !== 'supported'),
      ...v.coverage.filter(c => c.verdict !== 'covered' && (c.recommendationIndices.length
        ? c.recommendationIndices.includes(index) : r.sourceRefs.includes(c.sourceRef)))
        .map(c => ({ kind: section.requiredSourceRefs.includes(c.sourceRef)
          ? 'assigned_source_content_or_condition' : 'additional_cited_source_coverage', ...c })),
    ]);
    if (findings.length) issues.push({ kind: 'recommendation_source_or_condition', index, oldHash: hash(r), findings });
  }
  for (const sourceRef of section.requiredSourceRefs) {
    const findings = reviews.flatMap(v => v.coverage.filter(c => c.sourceRef === sourceRef && c.verdict !== 'covered'));
    // A negative judgment about existing cited advice requires an edit, not an
    // unrelated ninth recommendation beyond an eight-item section's capacity.
    if (!draft.recommendations.some(r => r.sourceRefs.includes(sourceRef))) issues.push({ kind: 'assigned_source_omission', sourceRef, findings });
  }
  return seal({ sectionId: section.id, parentHash: hash(draft), issues,
    openIssues: issues.length, reviewerConsensusNotRulesAuthority: true, trainingTruth: false });
}

export function applyFactionStrategyPatchV1(output, { input, draft, issues }) {
  verifySeal(issues); exact(output, ['parentHash', 'replacements', 'additions']);
  if (output.parentHash !== hash(draft) || issues.parentHash !== hash(draft)) fail('FACTION_PATCH_PARENT_DRIFT');
  if (Array.isArray(output.replacements) && Array.isArray(output.additions)
    && !output.replacements.length && !output.additions.length) fail('FACTION_PATCH_NO_PROGRESS');
  const expected = new Map(issues.issues.filter(i => i.kind === 'recommendation_source_or_condition').map(i => [i.index, i.oldHash]));
  const omitted = new Set(issues.issues.filter(i => i.kind === 'assigned_source_omission').map(i => i.sourceRef));
  if (!Array.isArray(output.replacements) || output.replacements.length !== expected.size || !Array.isArray(output.additions)
    || output.additions.length > omitted.size) fail('FACTION_PATCH_DENOMINATOR');
  const next = clone(draft);
  for (const r of output.replacements) {
    exact(r, ['index', 'value']);
    if (!expected.has(r.index) || hash(draft.recommendations[r.index]) !== expected.get(r.index)) fail('FACTION_PATCH_SCOPE_INVALID');
    expected.delete(r.index); validateFactionDraftV1({ recommendations: [r.value] }, input);
    if (hash(r.value) === hash(draft.recommendations[r.index])) fail('FACTION_PATCH_NO_PROGRESS');
    next.recommendations[r.index] = clone(r.value);
  }
  for (const r of output.additions) {
    validateFactionDraftV1({ recommendations: [r] }, input);
    if (!r.sourceRefs.some(s => omitted.has(s))) fail('FACTION_PATCH_UNRELATED_ADDITION');
    next.recommendations.push(clone(r));
  }
  if (hash(next) === hash(draft)) fail('FACTION_PATCH_NO_PROGRESS');
  return validateFactionDraftV1(next, input);
}

export async function produceFactionStrategyV1({ input, runtime, store, knownRulePolicy, fieldRepairSeed = null, onProgress = () => {} }) {
  verifySeal(knownRulePolicy);
  if (knownRulePolicy.inputHash !== input.hash) fail('FACTION_KNOWN_RULE_POLICY_DRIFT');
  const fieldRepairBinding = fieldRepairSeed ? (await import('./faction-field-repair-seed-v1.mjs')).validateFactionFieldRepairSeedV1({
    input, knownRulePolicy, seed: fieldRepairSeed }) : null;
  let fieldRepairConsumed = false;
  const plan = createFactionWritingPlanV1(input), common = factionRoleWorkspaceV1(input);
  const packet = seal({ id: 'faction.' + input.factionRecordKey.split(':')[1], inputHash: input.hash, sourceBinding: input.sourceBinding });
  const roleArtifacts = [];
  async function role(id, instruction, workspace, validate, batchScope = null) {
    const request = { packet, roleId: id, instruction, workspace: { ...common, ...workspace }, maxOutput: 4096 };
    let result = await runtime.role(request); roleArtifacts.push({ id, hash: result.hash });
    try { return { artifact: result, value: validate(result.output) }; }
    catch (error) {
      const targets = request.workspace.outputRequestAtEnd?.targetContract;
      if (targets && ['FACTION_REVIEW_TARGET_QUOTE_REQUIRED', 'FACTION_REVIEW_TARGET_QUOTE_MISMATCH'].includes(error.code)) {
        const plan = planFactionReviewFieldBindingV1(result.output, targets);
        const selection = await runtime.role({ ...request, roleId: id + '.field-binding.v1',
          instruction: '上一份审查的对象ID和判断保留，但focus引用无法绑定到候选字段。仅恢复字段引用，不重新审判或改写建议。完整来源、总规则、整节draft及targetContract仍在；逐个阅读preservedJudgments和对应目标所有fields，选择最能定位该判断的1至3个fieldPaths。只返回{"planHash":"reviewBindingRepair.planHash","selections":[{"targetId":"给定ID","fieldPaths":["给定字段路径"]}]}。每个目标一次。不要返回引文、索引、判断、理由、来源或coverage；程序将按所选路径提取候选原文，原始不合法引文保留为未验证证据。字段绑定不是来源真实性或策略有效性的证明。',
          workspace: { ...request.workspace, reviewBindingRepair: { planHash: plan.hash,
            preservedJudgments: plan.preservedJudgments, targetChoices: plan.targetChoices,
            rejectedArtifactHash: result.hash, structuralFailure: error.code } } });
        roleArtifacts.push({ id: id + '.field-binding.v1', hash: selection.hash });
        const rebound = applyFactionReviewFieldBindingV1(result.output, targets, plan, selection.output);
        const value = validate(rebound.output), { hash: ignoredBindingHash, ...body } = value;
        return { artifact: result, value: seal({ ...body, reviewOutputOrigin: 'host_materialized_field_binding',
          fieldBindingRecovery: { receipt: rebound.receipt, originalArtifactHash: result.hash, selectionArtifactHash: selection.hash } }) };
      }
      if (batchScope && ['FACTION_BATCH_SOURCE_OMISSION', 'FACTION_BATCH_DUPLICATE_RECOMMENDATION'].includes(error.code)) {
        const { hash: ignoredIssueHash, ...issueBody } = inspectFactionBatchScopeV1(result.output, batchScope);
        const issue = seal({ ...issueBody, rejectedArtifactHash: result.hash, failureCode: error.code });
        const lease = store.acquire(packet.id + '.' + id + '.target-issue-v1', { issueHash: issue.hash });
        if (!lease.cached) store.finish(lease, issue);
        // Keep all official material, overall guidance, complete outline and
        // accepted prior advice. Omit only the rejected wrong-target prose.
        const recovered = await runtime.role({ ...request, roleId: id + '.target-reconstruction.v1',
          instruction: instruction + '\n这是已确认写错提纲项后的定点重建，不是只换index/引用。不得复制completedRecommendations；必须从来源独立编写outputRequestAtEnd指定focus。旧错误正文不提供；整个来源/整节提纲/成功前文仍在。',
          workspace: { ...request.workspace, targetIssue: issue,
            outputRequestAtEnd: { action: 'write_only_these_new_outline_items', targets: issue.targets,
              forbidden: 'Do not copy completedRecommendations or merely relabel their indices/citations.',
              expectedShape: { items: batchScope.indices.map(index => ({ index, value: ADVICE_SHAPE.recommendations[0] })) } } } });
        roleArtifacts.push({ id: id + '.target-reconstruction.v1', hash: recovered.hash });
        if (hash(recovered.output) === hash(result.output)) fail('FACTION_BATCH_RECONSTRUCTION_NO_PROGRESS');
        return { artifact: recovered, value: validate(recovered.output) };
      }
      if (!/^(OUTPUT_SCHEMA_INVALID|TEXT_INVALID|FACTION_(SOURCE_REFERENCE_INVALID|STRING_ARRAY_INVALID|TREE_|DRAFT_|REVIEW_|ANSWER_|OUTLINE_|BATCH_))/.test(error.code || '')) throw error;
      const repaired = await runtime.role({ ...request, roleId: id + '.schema',
        instruction: instruction + '\n只纠正下面记录的结构/地址错误，不改变否定判断，不删掉上下文或材料，不扩大语义修改范围。',
        workspace: { ...request.workspace, rejectedOutput: result.output, structuralFailure: error.code } });
      roleArtifacts.push({ id: id + '.schema', hash: repaired.hash });
      if (hash(repaired.output) === hash(result.output)) fail('FACTION_SCHEMA_REPAIR_NO_PROGRESS');
      return { artifact: repaired, value: validate(repaired.output) };
    }
  }
  const tutor = await role('tutor', 'Teach：使用完整官方来源和已核验总规则，教授本阵营的决策结构、资源/编军限制、单位与卡牌的条件配合。不是RTS，标签合格不等于编军合法；保留升级成本、时机、例外和特殊单位入场限制。不预先注入某个对手战术，不声称胜率。返回{"lesson":["教学要点"],"uncertainties":["未证明的事项"]}。整份不超过64KB。', {}, validateTutorLessonV3);
  const tree = await role('question-tree', 'Ctx2Skill：从完整中立官方观察及Teach生成问题树。以下六轴各2至4个不同问题：' + FACTION_AXES_V1.join(', ')
    + '。覆盖未知编军泛化、先后手、任务类型、资源取舍、脆弱规则条件；不能把某对抗结论当先验。返回{"branches":[{"axis":"精确轴名","questions":[{"question":"问题","sourceRefs":["存在的官方来源ID，1至8个"]}]}]}。保留全部叶节点，不写答案。',
    { unverifiedTutor: tutor.value }, out => validateFactionTreeV1(out, input));
  const challenger = await role('challenger', 'Challenger：逐轴对问题树提出2至4个能揭示错误策略或不合法推论的反例问题，六轴必须齐全。检查代价、先后顺序、任务目标、不可见信息和对手回应。不提供考试答案或虚构规则。返回{"branches":[{"axis":"精确轴名","probes":[{"question":"反例问题","sourceRefs":["官方来源ID，1至8个"]}]}]}。',
    { unverifiedTutor: tutor.value, questionTree: tree.value }, out => validateFactionTreeV1(out, input, 'probes'));
  const sections = [];
  for (const section of plan.sections) {
    const questions = [...tree.value.branches.find(b => b.axis === section.axis).questions,
      ...challenger.value.branches.find(b => b.axis === section.axis).probes].map((q, index) => ({ index, ...q }));
    const scope = { section, questionTree: tree.value, questions, unverifiedTutor: tutor.value };
    const answers = await role(section.id + '.reasoner', 'Reasoner：根据完整来源、总规则和本节指定来源回答每个question index，只讨论本阵营及本节范围。区分官方事实、条件策略与待验证效果，说明对手回应/替代方案，不声称完整行动合法或胜率已证明。返回{"answers":[{"index":整数,"answer":"完整简洁推理，最多1600字符","sourceRefs":["官方来源ID，1至8"]}],"uncertainties":["未证明事项"]}，每个index一次。', scope, out => {
      exact(out, ['answers', 'uncertainties']); strings(out.uncertainties, { empty: true });
      if (!Array.isArray(out.answers) || out.answers.length !== questions.length) fail('FACTION_ANSWER_DENOMINATOR');
      const pending = new Set(questions.map(q => q.index));
      for (const a of out.answers) { exact(a, ['index', 'answer', 'sourceRefs']); text(a.answer, 1600); refs(a.sourceRefs, input); if (!pending.delete(a.index)) fail('FACTION_ANSWER_SCOPE_INVALID'); }
      return out;
    });
    const judge = await role(section.id + '.judge', 'Judge：独立按完整来源检查每个推理回答的事实、条件、时机、成本、例外与建议范围；策略可以是有条件假设，不得当作已赢对战。正确引用不等于正确结论。返回{"judgments":[{"index":整数,"verdict":"supported|unsupported|uncertain","reason":"具体依据，最多1200字符","sourceRefs":["官方来源ID，1至8"]}]}；每个回答一次。判断是模型审查而非Rules真值。',
      { ...scope, answers: answers.value }, out => {
        exact(out, ['judgments']);
        if (!Array.isArray(out.judgments) || out.judgments.length !== questions.length) fail('FACTION_REVIEW_DENOMINATOR');
        const pending = new Set(questions.map(q => q.index));
        for (const j of out.judgments) { exact(j, ['index', 'verdict', 'reason', 'sourceRefs']); text(j.reason, 1200); refs(j.sourceRefs, input);
          if (!pending.delete(j.index) || !['supported', 'unsupported', 'uncertain'].includes(j.verdict)) fail('FACTION_REVIEW_SCOPE_INVALID'); }
        return out;
      });
    const proposer = await role(section.id + '.proposer', 'Proposer：依据来源、推理和Judge的具体问题，为本节生成最小且完整的策略编写方案。明确保留、纠正与尚不能下结论的事项，不照抄错误回答或自行推翻规则。所有指定单位/卡牌都要有有条件决策用法，不把可选项推荐成必选，不把标签池写成已合法阵容。返回{"lesson":["拟采用的策略结构与修正"],"uncertainties":["保留未证实事项"]}，整份不超过64KB。',
      { ...scope, answers: answers.value, judge: judge.value }, validateTutorLessonV3);
    const outline = await role(section.id + '.generator-outline', 'Generator提纲：本节最终会有1至8条有条件建议。这里只给简短完整提纲，不写完整正文；覆盖每个指定来源和Proposer中全部关键决策，不删除叶问题。每项focus最多600字符，引用1至8个官方ID。返回{"outline":[{"focus":"建议的决策主题与范围","sourceRefs":["实际来源ID"]}]}。每个section.requiredSourceRefs至少关联一项提纲。随后会给完整共同上下文逐批输出正文。',
      { ...scope, proposals: proposer.value, judge: judge.value }, out => validateFactionOutlineV1(out, { input, section }));
    const recommendations = [];
    for (let first = 0; first < outline.value.outline.length; first += 2) {
      const indices = outline.value.outline.slice(first, first + 2).map((_, n) => first + n);
      const generated = await role(section.id + '.generator-items.' + first,
        'Generator：仅为indices指定的1至2项提纲写完整中文策略建议。全部官方来源、总规则、整节提纲和已完成建议均在输入中；分批只限制输出，不限制阅读。逐项保留适用条件、支付/时机/例外、步骤、替代、风险、reviseIf和未证明效果。对于单位考虑装备/规模/任务条件；卡牌保留次数限制和资源替代用途。不保证胜利，不复制题号。返回{"items":[{"index":指定序号,"value":完整建议对象}]}，每个index一次；value字段为'
          + JSON.stringify(ADVICE_SHAPE.recommendations[0]) + '。每项文本不超过1600字符，sourceRefs保留提纲所引来源，可补真实来源至最多8个。不要输出其他index、整份Skill或提纲。',
        { ...scope, proposals: proposer.value, judge: judge.value, outline: outline.value.outline, indices, completedRecommendations: recommendations },
        out => validateFactionDraftBatchV1(out, { input, outline: outline.value.outline, indices, completedRecommendations: recommendations }),
        { outline: outline.value.outline, indices, completedRecommendations: recommendations });
      recommendations.push(...generated.value.map(item => item.value));
      onProgress({ section: section.id, stage: 'generated_items', completedItems: recommendations.length, plannedItems: outline.value.outline.length });
    }
    const rawDraft = validateFactionDraftV1({ recommendations }, input);
    const knownRuleCorrection = correctKnownFactionRuleFailuresV1({ input, policy: knownRulePolicy, draft: rawDraft });
    const correctionLease = store.acquire(section.id + '.known-rule-correction', { correctionHash: knownRuleCorrection.hash });
    if (!correctionLease.cached) store.finish(correctionLease, knownRuleCorrection);
    let draft = validateFactionDraftV1(knownRuleCorrection.draft, input); const rounds = [], edits = [], seen = new Set([hash(draft)]);
    if (knownRuleCorrection.patches.length) onProgress({ section: section.id, stage: 'known_rule_fact_corrected',
      correctedFields: knownRuleCorrection.patches.length, correctionHash: knownRuleCorrection.hash });
    let passed = false;
    for (let revision = 0; revision <= 3; revision++) {
      const reviews = [], reviewHashes = [], reviewPartition = [];
      const coverageAssignmentPlan = createFactionReviewBatchPlanV1({ section, draft });
      for (const route of ['supportive', 'adversarial']) {
        for (const { first, reviewIndices, requiredSourceRefs } of coverageAssignmentPlan.batches) {
          const targets = createFactionReviewTargetsV1({ input, section, draft, indices: reviewIndices });
          const reviewed = await role(section.id + '.review-target-batch-v1.' + route + '.' + revision + '.' + first,
            '独立来源审查，角色' + route + '。完整来源、总规则、整节候选仍在；本次只审查末尾targetContract明确给出的1至2个对象。不要自行数数组位置。以targetId和完整title标识对象，focus引用该对象fields中具体path及原文片段（8至240字符）；不能引用邻近建议代替。核对所有when/procedure/alternatives/risk/reviseIf/unproven字段、算术、支付/时机/例外。区分事实、条件策略、未验证效果；不能因为建议有条件就忽略不真实的确定性断言。focusedSources是同一冻结来源原文，非另一个模型的摘要。返回{"verdicts":[{"targetId":"给定ID","title":"给定完整标题","focus":[{"path":"给定字段路径","quote":"该字段原文片段"}],"verdict":"supported|unsupported|uncertain","reason":"针对此对象的具体依据，最多400字符","sourceRefs":["实际官方来源ID，1至8"]}],"coverage":[{"sourceRef":"指定覆盖来源","verdict":"covered|omitted|uncertain","recommendationIndices":[整节直接引用此来源的建议序号],"reason":"具体覆盖依据，最多400字符"}]}。每个targetId及coverageRequiredSourceRefs一次，coverageRequiredSourceRefs为空则coverage:[]。不要输出其他对象或数字index；否定/不确定判断必须指出对象内具体问题，规则来源优先于候选措辞。',
            { section, draft, reviewIndices, coverageRequiredSourceRefs: requiredSourceRefs,
              outputRequestAtEnd: { targetContract: targets, coverageOnlySourceRefs: requiredSourceRefs } }, out => {
              const bound = validateTargetedFactionReviewV1(out, targets);
              validateFactionReviewV1(bound.review, { input, section, draft, reviewIndices, requiredSourceRefs }); return bound;
            });
          reviews.push(reviewed.value.review); reviewHashes.push(reviewed.artifact.hash);
          reviewPartition.push({ route, reviewIndices, requiredSourceRefs, artifactHash: reviewed.artifact.hash,
            targetContractHash: targets.hash, bindingReceipt: reviewed.value,
            coverageLinks: inspectFactionCoverageLinksV1(reviewed.value.review, draft) });
        }
      }
      const rawIssues = mergeFactionKnownSourceIssuesV1({ input, policy: knownRulePolicy, draft,
        issues: createFactionRepairIssuesV1(section, draft, reviews) });
      const adjudication = adjudicateFactionSourceScopesV1({ input, draft, issues: rawIssues }), issues = adjudication.openIssues;
      const round = seal({ sectionId: section.id, revision, draftHash: hash(draft), reviewHashes, reviews, reviewPartition, coverageAssignmentPlan, issues,
        rawIssues, adjudication,
        priorRoundHash: rounds.at(-1)?.hash || null, oldFailuresRetained: true, trainingTruth: false });
      const lease = store.acquire(section.id + '.issue-journal.' + revision, { roundHash: round.hash });
      const saved = lease.cached ? verifySeal(lease.artifact) : store.finish(lease, round); rounds.push(saved);
      onProgress({ section: section.id, revision, stage: 'reviewed', openIssues: issues.openIssues });
      if (!issues.openIssues) {
        if (fieldRepairBinding?.sectionId === section.id && !fieldRepairConsumed) {
          if (hash(draft) !== fieldRepairBinding.parentDraftHash) fail('FACTION_FIELD_SEED_BASE_NOT_REPRODUCED');
          if (revision === 3) fail('FACTION_FIELD_SEED_FRESH_REVIEW_REQUIRED');
          const patched = validateFactionDraftV1(fieldRepairSeed.candidate.patch.draft, input);
          assertNoKnownFactionRuleFailureV1({ input, policy: knownRulePolicy, draft: patched });
          edits.push(seal({ version: 'verified_field_repair_import_v1', parentHash: hash(draft), resultHash: hash(patched),
            binding: fieldRepairBinding, patch: fieldRepairSeed.candidate.patch,
            oldReviewAcceptanceInherited: false, freshWholeSectionReviewRequired: true, trainingTruth: false }));
          draft = patched; seen.add(hash(draft)); fieldRepairConsumed = true;
          onProgress({ section: section.id, revision, stage: 'actual_field_repair_imported',
            changedFields: fieldRepairSeed.candidate.patch.changes.length, freshReviewPending: true });
          continue;
        }
        passed = true; break;
      }
      if (revision === 3) break;
      const instruction = '按实际来源问题只改被指出的recommendation，其他条目逐字不变。原建议哈希已绑定；source omission只可新增直接引用该遗漏来源的有条件建议。不能把审查意见当新规则；如不确定保留阻断，不编造。返回{"parentHash":"精确父hash","replacements":[{"index":被标记序号,"value":完整recommendation对象}],"additions":[仅补遗漏来源的完整recommendation对象]}。所有被标记index恰好一次；无关不改。对象字段遵循' + JSON.stringify(ADVICE_SHAPE.recommendations[0]) + '。';
      const collected = { parentHash: hash(draft), replacements: [], additions: [] }, editorHashes = [];
      // Output each issue's bounded patch separately, but retain the entire
      // draft/issues/source context. Apply the aggregate atomically afterward.
      for (const [ordinal, issue] of issues.issues.entries()) {
        const localIssues = seal({ ...Object.fromEntries(Object.entries(issues).filter(([k]) => k !== 'hash')), issues: [issue], openIssues: 1 });
        const validatePatch = out => { applyFactionStrategyPatchV1(out, { input, draft, issues: localIssues }); return out; };
        let edit = await role(section.id + '.editor.' + revision + '.' + ordinal, instruction + '\n本次仅输出localIssue这一项的替换或补充，其余问题会分别处理；完整draft及allIssues保留供一致性核对。',
          { section, draft, parentHash: hash(draft), localIssue: issue, issues: localIssues, allIssues: issues,
            editTargetAtEnd: { parentHash: hash(draft), localIssue: issue,
              target: issue.index === undefined ? null : { index: issue.index, title: draft.recommendations[issue.index].title,
                recommendationHash: hash(draft.recommendations[issue.index]), recommendation: draft.recommendations[issue.index] } } }, out => out);
        try { validatePatch(edit.value); }
        catch (error) {
          if (error.code !== 'FACTION_PATCH_NO_PROGRESS') throw error;
          const repairScopes = [issue.kind === 'assigned_source_omission' ? issue : {
            kind: issue.kind, index: issue.index, title: draft.recommendations[issue.index].title,
            findings: issue.findings, sourceRefs: draft.recommendations[issue.index].sourceRefs }];
          edit = await role(section.id + '.source-reconstruction.' + revision + '.' + ordinal,
            instruction + '\n旧编辑为空或未改变被标记内容，已记录为语义无进展而非JSON错误。现不给被标记的旧正文，从完整官方来源与repairScopes重建这一项；其他建议完整保留为上下文。保留父hash和index，不改其他建议。如果来源不能支持修改，保持阻断，不编造。',
            { section, parentHash: hash(draft), repairScopes, noProgressArtifactHash: edit.artifact.hash,
              preservedRecommendations: draft.recommendations.flatMap((r, index) => index === issue.index ? [] : [{ index, recommendation: r }]),
              repairRequestAtEnd: { parentHash: hash(draft), repairScopes } }, out => out);
          validatePatch(edit.value);
        }
        collected.replacements.push(...edit.value.replacements); collected.additions.push(...edit.value.additions); editorHashes.push(edit.artifact.hash);
      }
      const next = applyFactionStrategyPatchV1(collected, { input, draft, issues });
      assertNoKnownFactionRuleFailureV1({ input, policy: knownRulePolicy, draft: next });
      if (seen.has(hash(next))) fail('FACTION_REPAIR_CYCLE'); seen.add(hash(next));
      edits.push(seal({ parentHash: hash(draft), resultHash: hash(next), artifactHashes: editorHashes, patch: collected, trainingTruth: false }));
      draft = next;
    }
    assertNoKnownFactionRuleFailureV1({ input, policy: knownRulePolicy, draft });
    const result = seal({ section, outline: outline.value, outlineArtifactHash: outline.artifact.hash, draft, rounds, edits, knownRuleCorrection, semanticReviewPassed: passed,
      rulesApplicationPassed: false, strategyEffectivenessProven: false, runtimeAccepted: false, trainingTruth: false });
    const lease = store.acquire(section.id + '.result', { resultHash: result.hash });
    sections.push(lease.cached ? verifySeal(lease.artifact) : store.finish(lease, result));
    onProgress({ section: section.id, stage: 'section_complete', completed: sections.length, total: plan.sections.length, passed });
    if (!passed) break;
  }
  if (fieldRepairBinding && !fieldRepairConsumed) fail('FACTION_FIELD_SEED_NOT_CONSUMED');
  const candidate = seal({ schema: 'starcraft_faction_strategy_candidate_v1', gameId: 'starcraft-tmg',
    skillId: 'skill.starcraft-tmg.faction.tactical-cards-' + input.factionRecordKey.split(':')[1].replaceAll('_', '-'), factionRecordKey: input.factionRecordKey,
    inputHash: input.hash, planHash: plan.hash, sourceBinding: input.sourceBinding, overallDependencyHash: input.overallDependencyHash,
    knownRulePolicyHash: knownRulePolicy.hash, knownUnchangedRuleFailuresBlocked: true,
    tutorArtifactHash: tutor.artifact.hash, questionTree: tree.value, challengerTree: challenger.value,
    sections, roleArtifacts, ...(fieldRepairBinding ? { fieldRepairBinding } : {}),
    semanticReviewPassed: sections.length === plan.sections.length && sections.every(s => s.semanticReviewPassed),
    scope: 'conditional_faction_strategy_with_all_assigned_unit_and_card_sources_not_proven_complete_game_strength',
    candidateOnly: true, independentEvaluationPassed: false, actualRoomReplayPerformed: false,
    strategyEffectivenessProven: false, runtimeAccepted: false, humanReviewed: false, canAffectRules: false, trainingTruth: false });
  const lease = store.acquire(packet.id + '.candidate', { candidateHash: candidate.hash });
  return lease.cached ? verifySeal(lease.artifact) : store.finish(lease, candidate);
}

export function renderFactionStrategyV1(candidate) {
  verifySeal(candidate);
  return ['# ' + candidate.factionRecordKey + '：阵营策略 Skill 候选', '',
    '完整总规则依赖：' + candidate.overallDependencyHash, '',
    '来源审查不是实际对战胜率或正式发布。规则器拥有合法性；策略只能建议，仍须LegalSpace/Preview/确认/Apply/Replay。', '',
    ...candidate.sections.flatMap(s => ['## ' + s.section.axis + ' / ' + s.section.id, '',
      ...s.draft.recommendations.flatMap(r => ['### ' + r.title, '', '适用条件：' + r.when.join('；'), '',
        ...r.procedure.map((p, i) => (i + 1) + '. ' + p), '', '替代：' + r.alternatives.join('；'), '',
        '风险：' + r.risk, '', '改变计划：' + r.reviseIf.join('；'), '', '尚未证明：' + r.unproven.join('；'), '',
        '来源：' + r.sourceRefs.join('；'), ''])]), ''].join('\n');
}
