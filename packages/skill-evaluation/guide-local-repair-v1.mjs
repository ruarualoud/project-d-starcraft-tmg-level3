import { seal, verifySeal, hash, exact, text, clone, fail } from '../skill-production/common.mjs';
import { readCompleteOverallRulesContextV3 } from './overall-rules-package-v3.mjs';
import { createAnswerRepairBookV1 } from './answer-internal-review-v1.mjs';
import { createRulesBackedDevelopmentFeedbackV1 } from './rules-backed-answer-repair-v1.mjs';
import { withSessionDeadline } from '../skill-production/deadline.mjs';

// Development feedback can select a local lesson edit. Independent test cases,
// their predictions and verdicts are intentionally not projected into this port.
export function createGuideRepairFeedbackV1({ candidate, teacher, evaluation, catalogue, originalDrills, legacyDrills }) {
  [candidate, teacher, evaluation, catalogue].forEach(verifySeal);
  if (evaluation.schema !== 'starcraft_guided_rules_evaluation_v1' || evaluation.candidateHash !== candidate.hash
    || evaluation.teacherArtifactHash !== teacher.hash || evaluation.guide.teacherArtifactHash !== teacher.hash
    || hash(evaluation.guide.lessons) !== hash(teacher.lessons) || teacher.candidateHash !== candidate.hash
    || teacher.independentConditionCasesExposed) fail('GUIDE_FEEDBACK_PARENT_DRIFT');
  const development = evaluation.results.filter(r => ['development_fresh_original', 'development_legacy'].includes(r.kind));
  const exam = seal({ candidateHash: candidate.hash, results: development.map(r => {
    verifySeal(r);
    return seal({ kind: r.kind === 'development_fresh_original' ? 'fresh' : 'legacy_regression', group: r.group, predictions: r.predictions });
  }) });
  const book = createAnswerRepairBookV1({ candidate, drills: originalDrills, legacyDrills, exam });
  const rules = createRulesBackedDevelopmentFeedbackV1({ candidate, book, catalogue, drills: originalDrills, legacyDrills });
  if (!rules.findings.length) fail('GUIDE_FEEDBACK_NO_DEVELOPMENT_FAILURE');
  const failedRefs = new Set(rules.findings.map(f => f.source.ref));
  const allowedLessons = teacher.lessons.filter(l => l.sourceRefs.some(r => failedRefs.has(r))).map(l => ({ id: l.id, oldLessonHash: hash(l) }));
  if (!allowedLessons.length || rules.findings.some(f => !teacher.lessons.some(l => l.sourceRefs.includes(f.source.ref)))) fail('GUIDE_FEEDBACK_UNMAPPED_SOURCE');
  return seal({ schema: 'starcraft_guide_local_feedback_v1', candidateHash: candidate.hash, parentTeacherHash: teacher.hash,
    parentEvaluationHash: evaluation.hash, catalogueHash: catalogue.hash, book, rules, allowedLessons,
    scope: 'only_procedures_of_existing_lessons_bound_to_actual_development_failures',
    independentConditionCasesExposed: false, formalAcceptance: false, trainingTruth: false });
}

export function applyGuideLocalPatchV1(output, { teacher, feedback }) {
  verifySeal(teacher); verifySeal(feedback); exact(output, ['replacements']);
  if (feedback.parentTeacherHash !== teacher.hash || feedback.candidateHash !== teacher.candidateHash
    || feedback.independentConditionCasesExposed) fail('GUIDE_PATCH_PARENT_DRIFT');
  if (!Array.isArray(output.replacements) || output.replacements.length !== feedback.allowedLessons.length) fail('GUIDE_PATCH_DENOMINATOR');
  const pending = new Map(feedback.allowedLessons.map(l => [l.id, l.oldLessonHash])), lessons = clone(teacher.lessons);
  for (const replacement of output.replacements) {
    exact(replacement, ['lessonId', 'procedure']);
    if (!pending.has(replacement.lessonId)) fail('GUIDE_PATCH_SCOPE_INVALID');
    const lesson = lessons.find(l => l.id === replacement.lessonId);
    if (!lesson || hash(lesson) !== pending.get(replacement.lessonId)) fail('GUIDE_PATCH_PARENT_DRIFT');
    pending.delete(replacement.lessonId);
    if (!Array.isArray(replacement.procedure) || !replacement.procedure.length || replacement.procedure.length > 8) fail('GUIDE_PATCH_PROCEDURE_INVALID');
    replacement.procedure.forEach(s => text(s, 400));
    if (/production-heldout\.|heldout\.|independent-condition\./.test(JSON.stringify(replacement.procedure))) fail('GUIDE_PATCH_CASE_MEMORIZATION_REJECTED');
    if (hash(replacement.procedure) === hash(lesson.procedure)) fail('GUIDE_PATCH_NO_PROGRESS');
    lesson.procedure = clone(replacement.procedure);
  }
  return lessons;
}

export async function repairGuideFromRulesV1({ candidate, teacher, feedback, context, store, model, recovery = null }) {
  [candidate, teacher, feedback, context].forEach(verifySeal);
  if (candidate.hash !== teacher.candidateHash || context.hash !== teacher.contextHash || context.catalogueHash !== candidate.catalogueHash
    || feedback.parentTeacherHash !== teacher.hash || feedback.candidateHash !== candidate.hash
    || feedback.catalogueHash !== candidate.catalogueHash || feedback.independentConditionCasesExposed) fail('GUIDE_REPAIR_BINDING_INVALID');
  const skill = readCompleteOverallRulesContextV3(candidate);
  const input = { candidateHash: candidate.hash, parentTeacherHash: teacher.hash, feedbackHash: feedback.hash,
    contextHash: context.hash, skillHash: skill.hash };
  if (recovery) {
    verifySeal(recovery);
    if (recovery.schema !== 'starcraft_guide_no_progress_evidence_v1' || recovery.feedbackHash !== feedback.hash
      || recovery.teacherHash !== teacher.hash || recovery.candidateHash !== candidate.hash || recovery.sourceFirstAlreadyUsed
      || !recovery.actualRequestReconstructed || recovery.failureCode !== 'GUIDE_PATCH_NO_PROGRESS') fail('GUIDE_RECONSTRUCTION_PARENT_INVALID');
    input.recoveryHash = recovery.hash;
  }
  const id = recovery ? 'guide-local-source-reconstruction' : 'guide-local-development-editor', lease = store.acquire(id, input, 330000);
  if (lease.cached) return verifySeal(lease.artifact);
  let task = '仅修改feedback.allowedLessons指定的既有指引procedure，保留其他指引、来源引用和全部基础Skill。你有完整冻结官方来源、完整522声明、全部旧开发题与真实Rules反例；没有独立测试的输入或答案。旧失败体现条件应用缺陷：针对“并未发生某情况”是否需要该例外许可，明确绑定实际输入字段的true/false分支，不得让问题措辞覆盖给定输入。区分单项条件满足与整个行动合法性；把自然语言条件转换成可检查的通用步骤，必要时写布尔表达式并说明字段含义，不能靠旧case id或固定答案记忆。只按证据做最小修正，不新增游戏规则或猜测。指引仍是待来源审查和独立答题的建议，不是规则器。返回finish，content仅有{"replacements":[{"lessonId":"指定id","procedure":["1至8条步骤，每条最多400字符"]}]}；每个允许的lesson恰好一次，不返回sourceRefs、基础Skill或其他指引。\n'
    + JSON.stringify({ frozenSources: context, skill, guide: { lessons: teacher.lessons }, feedback });
  if (recovery) {
    const allowed = new Set(feedback.allowedLessons.map(l => l.id));
    task = '从完整冻结官方来源重建指定scope的操作指引。旧稿曾被逐字复制，已隔离，不在本次输入中；不要猜测旧稿。完整基础Skill、其他指引、全部开发case和具体Rules反例保留，没有独立测试。逐项区分触发条件为false/true时应不应该要求例外许可，以及其他累积条件；明确绑定真实input字段，不让题目措辞覆盖字段值。不把某条件满足扩大成全行动合法性。通用步骤可用布尔表达式，但不是新规则器。返回finish，content只有{"replacements":[{"lessonId":"scope指定id","procedure":["1至8条，每条最多400字符"]}]}，每个scope一次，不改其他内容。\n'
      + JSON.stringify({ frozenSources: context, skill, unchangedGuides: teacher.lessons.filter(l => !allowed.has(l.id)),
        developmentCases: feedback.book.cases, scopes: teacher.lessons.filter(l => allowed.has(l.id)).map(l => ({ lessonId: l.id, sourceRefs: l.sourceRefs })),
        counterexamples: feedback.rules.findings.map(({ submittedPrediction, ...f }) => f),
        recovery: { mode: 'source_first_without_failed_procedure_or_previous_predictions', evidenceHash: recovery.hash } });
  }
  try {
    const result = await withSessionDeadline(300000, async ({ signal, guard }) => {
      const response = await guard(() => model({ stageId: id, call: 1, maxOutput: 4096, signal,
        observed: { system: 'Offline source-bound local guide repair. Actual Rules counterexamples are development feedback, not unseen evaluation. Full context remains available. No tools; no authority to edit rules or publish.',
          tools: [], messages: [{ role: 'user', content: task }, ...(recovery ? [{ role: 'user', content:
            '现在按末尾scope和Rules反例生成新procedure。必须明确说明每个相关输入字段为false/true的分支与累积条件，并用普通输入名表达通用判断；不要写case编号或记忆答案。只输出所要求的finish/replacements。' }] : [])] } }))();
      if (response.command.action !== 'finish') fail('GUIDE_REPAIR_TOOLS_FORBIDDEN');
      return { lessons: applyGuideLocalPatchV1(response.command.content, { teacher, feedback }), receiptHash: response.receiptHash };
    });
    return store.finish(lease, seal({ schema: 'starcraft_operational_guide_repair_v1', ...input, ...result,
      ...(recovery ? { sourceReconstruction: true, noProgressEvidenceHash: recovery.hash } : {}),
      parentEvaluationHash: feedback.parentEvaluationHash, changedLessons: feedback.allowedLessons.length,
      unchangedLessonHashes: teacher.lessons.filter(l => !feedback.allowedLessons.some(a => a.id === l.id)).map(l => hash(l)),
      baseSkillAndAllClaimsUnchanged: true, sourceRefsUnchanged: true, developmentAnswersExposed: true,
      independentConditionCasesExposed: false, newLessonStatus: 'candidate_pending_source_and_reader_evaluation',
      oldScoresOverwritten: false, formalAcceptance: false, runtimeAccepted: false, trainingTruth: false }));
  } catch (error) { store.release(lease); throw error; }
}
