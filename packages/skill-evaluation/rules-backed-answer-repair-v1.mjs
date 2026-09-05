import { seal, verifySeal, hash, exact, text, clone, fail } from '../skill-production/common.mjs';
import { readCompleteOverallRulesContextV3 } from './overall-rules-package-v3.mjs';
import { applyAnswerReviewPatchV1 } from './answer-internal-review-v1.mjs';
import { withSessionDeadline } from '../skill-production/deadline.mjs';

// Explicit TEACH/development boundary. Old evaluated cases now receive real
// Rules feedback; they must never again be advertised as unseen held-out data.
export function createRulesBackedDevelopmentFeedbackV1({ candidate, book, catalogue, drills, legacyDrills }) {
  [candidate, book, catalogue, drills.manifest, legacyDrills.manifest].forEach(verifySeal);
  if (candidate.hash !== book.candidateHash || candidate.catalogueHash !== catalogue.hash
    || book.drillManifestHash !== drills.manifest.hash || book.legacyManifestHash !== legacyDrills.manifest.hash
    || book.cases.some(c => !/^(production-heldout|heldout)\./.test(c.task.id))) fail('RULES_FEEDBACK_DEVELOPMENT_SCOPE_INVALID');
  const findings = [], allScores = [];
  for (const row of book.cases) {
    const prediction = book.answers[row.index].prediction;
    const result = row.kind === 'fresh' ? drills.verify(prediction) : legacyDrills.judge(row.group, prediction);
    allScores.push(result);
    if (result.passed) continue;
    const source = catalogue.rows.find(s => s.id === row.task.entryId);
    if (!source?.executable || source.currentRulesReceiptHash !== catalogue.sourceBinding.rules) fail('RULES_FEEDBACK_SOURCE_UNAVAILABLE');
    const correction = row.kind === 'fresh' ? { id: row.task.id, answer: result.kernelReceipt.expected }
      : { id: row.task.id, values: Object.fromEntries(result.checks.map(c => [c.key, c.expected])) };
    findings.push({ caseIndex: row.index, kind: 'deterministic_rules_counterexample', input: clone(row.task.input),
      submittedPrediction: clone(prediction), rulesPrediction: correction, scoreHash: result.hash,
      kernelReceipt: result.kernelReceipt, source: { ref: source.id, hash: source.hash, text: source.text } });
  }
  return seal({ schema: 'starcraft_rules_backed_development_feedback_v1', bookHash: book.hash,
    candidateHash: candidate.hash, sourceBinding: catalogue.sourceBinding, catalogueHash: catalogue.hash,
    findings, allScoreHashes: allScores.map(s => s.hash), cases: book.cases.length,
    originalCorrect: allScores.filter(s => s.passed).length,
    caseDisposition: 'known_development_regression_after_explicit_rules_feedback_not_unseen_heldout',
    developmentAnswersExposed: true, independentConditionCasesExposed: false,
    feedbackAuthority: 'actual_frozen_rules_kernel_not_model_consensus', formalAcceptance: false, trainingTruth: false });
}

export async function repairAnswersFromRulesV1({ candidate, book, feedback, context, store, model }) {
  [candidate, book, feedback, context].forEach(verifySeal);
  if (feedback.bookHash !== book.hash || feedback.candidateHash !== candidate.hash
    || feedback.catalogueHash !== candidate.catalogueHash || context.catalogueHash !== candidate.catalogueHash
    || !feedback.developmentAnswersExposed || feedback.independentConditionCasesExposed) fail('RULES_FEEDBACK_BINDING_INVALID');
  const skill = readCompleteOverallRulesContextV3(candidate);
  const input = { candidateHash: candidate.hash, bookHash: book.hash, feedbackHash: feedback.hash, contextHash: context.hash, skillHash: skill.hash };
  const id = 'rules-backed-development-editor', lease = store.acquire(id, input, 330000);
  if (lease.cached) return verifySeal(lease.artifact);
  const task = '这是Teach开发纠错，不是无答案考试：旧case的真实Rules反例已经提供。完整官方冻结来源和完整Skill仍保留。只纠正feedback.findings中指出的回答，其他回答保持原样；不得改问题、输入、来源或Rules。然后总结可以用于未来不同输入的简短操作指引，强调逐项条件、例外和运算的落实；不得只记住旧case答案，不得在指引里写旧case id或把样例数值硬编码为规则。指引是待独立来源复核和未参与纠错的新题检验的候选，不得自行宣称发布、合法性权威或策略效果。返回finish，content恰好两个字段：{"replacements":[{"caseIndex":整数,"prediction":该case原回答字段结构下的纠正结果}],"lessons":[{"id":"短小唯一标签","procedure":["通用操作步骤，最多8条，每条不超过400字符"],"sourceRefs":["完整且实际存在的官方来源ID，最多4个"]}]}。每个finding恰好一个replacement，最多6个lessons。规则服务的事实与Skill分开，不把自身总结变成新的规则。\n'
    + JSON.stringify({ frozenSources: context, skill, cases: book.cases, answers: book.answers, feedback });
  try {
    const result = await withSessionDeadline(300000, async ({ signal, guard }) => {
      const response = await guard(() => model({ stageId: id, call: 1, maxOutput: 4096, signal,
        observed: { system: 'Offline source-grounded Teach correction. Frozen official text and explicit Rules receipts are evidence; generated lessons remain unaccepted advice. No tools. Independent future test inputs/answers are absent.',
          tools: [], messages: [{ role: 'user', content: task }] } }))();
      if (response.command.action !== 'finish') fail('RULES_FEEDBACK_TOOLS_FORBIDDEN');
      const output = response.command.content; exact(output, ['replacements', 'lessons']);
      const answers = applyAnswerReviewPatchV1({ replacements: output.replacements }, { book, answers: book.answers, review: feedback });
      if (!Array.isArray(output.lessons) || !output.lessons.length || output.lessons.length > 6) fail('RULES_FEEDBACK_LESSONS_INVALID');
      const allowed = new Set(context.manifest.sourceHashes.map(s => s.ref)), ids = new Set();
      for (const lesson of output.lessons) {
        exact(lesson, ['id', 'procedure', 'sourceRefs']); text(lesson.id, 120);
        if (ids.has(lesson.id)) fail('RULES_FEEDBACK_LESSONS_INVALID'); ids.add(lesson.id);
        if (!Array.isArray(lesson.procedure) || !lesson.procedure.length || lesson.procedure.length > 8) fail('RULES_FEEDBACK_LESSONS_INVALID');
        lesson.procedure.forEach(s => text(s, 400));
        if (/production-heldout\.|heldout\.|independent-condition\./.test(JSON.stringify(lesson.procedure))) fail('RULES_FEEDBACK_CASE_MEMORIZATION_REJECTED');
        if (!Array.isArray(lesson.sourceRefs) || !lesson.sourceRefs.length || lesson.sourceRefs.length > 4
          || new Set(lesson.sourceRefs).size !== lesson.sourceRefs.length || lesson.sourceRefs.some(r => !allowed.has(r))) fail('RULES_FEEDBACK_LESSON_SOURCE_INVALID');
      }
      return { answers, lessons: output.lessons, receiptHash: response.receiptHash };
    });
    return store.finish(lease, seal({ schema: 'starcraft_rules_backed_answer_repair_v1', ...input, ...result,
      originalAnswers: book.answers, changedCases: result.answers.filter((a, n) => hash(a) !== hash(book.answers[n])).length,
      developmentAnswersExposed: true, independentConditionCasesExposed: false,
      newLessonStatus: 'candidate_pending_source_review_and_unseen_input_evaluation',
      oldScoresOverwritten: false, formalAcceptance: false, runtimeAccepted: false, trainingTruth: false }));
  } catch (error) { store.release(lease); throw error; }
}
