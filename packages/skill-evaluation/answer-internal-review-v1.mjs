import { seal, verifySeal, hash, exact, text, integer, clone, fail } from '../skill-production/common.mjs';
import { readCompleteOverallRulesContextV3 } from './overall-rules-package-v3.mjs';
import { withSessionDeadline } from '../skill-production/deadline.mjs';

// This module deliberately has NO judge/kernel/tool/expected-answer port.
// Grading happens only after the bounded critic -> local editor -> fresh critic
// loop has finished, and cannot decide which cases the model is shown.
export function createAnswerRepairBookV1({ candidate, drills, legacyDrills, exam }) {
  [candidate, drills.manifest, legacyDrills.manifest, exam].forEach(verifySeal);
  if (exam.candidateHash !== candidate.hash || drills.manifest.catalogueHash !== candidate.catalogueHash
    || hash(drills.manifest.sourceBinding) !== hash(candidate.sourceBinding)) fail('ANSWER_REVIEW_SOURCE_DRIFT');
  const groups = [...drills.groups().map(group => ({ kind: 'fresh', group, cases: drills.list(group) })),
    ...legacyDrills.manifest.chapters.map(group => ({ kind: 'legacy_regression', group, cases: legacyDrills.list(group) }))];
  if (exam.results.length !== groups.length) fail('ANSWER_REVIEW_GROUP_DENOMINATOR');
  const cases = [], answers = [];
  for (const [n, group] of groups.entries()) {
    const prior = verifySeal(exam.results[n]);
    if (prior.kind !== group.kind || prior.group !== group.group || prior.predictions.length !== group.cases.length) fail('ANSWER_REVIEW_GROUP_DRIFT');
    for (const c of group.cases) {
      const prediction = prior.predictions.find(p => p.id === c.id)?.prediction;
      if (!prediction) fail('ANSWER_REVIEW_PREDICTION_MISSING');
      const index = cases.length;
      // Never project kernelReceipt/checks/passed/expected from the saved exam.
      const task = group.kind === 'fresh' ? { id: c.id, entryId: c.entryId, input: clone(c.input), question: c.question }
        : { id: c.id, entryId: c.entryId, input: clone(c.input), questions: clone(c.questions), scope: c.scope };
      const row = { index, kind: group.kind, group: group.group, task };
      validatePrediction(prediction, row);
      cases.push(row); answers.push({ caseIndex: index, prediction: clone(prediction) });
    }
  }
  return seal({ schema: 'starcraft_answer_repair_book_v1', candidateHash: candidate.hash, baselineExamHash: exam.hash,
    drillManifestHash: drills.manifest.hash, legacyManifestHash: legacyDrills.manifest.hash, cases, answers,
    selection: 'every_original_case_not_only_host_scored_failures', expectedAnswersExposed: false,
    formalAcceptance: false, trainingTruth: false });
}

function validatePrediction(prediction, row) {
  exact(prediction, row.kind === 'fresh' ? ['id', 'answer'] : ['id', 'values']);
  if (prediction.id !== row.task.id) fail('ANSWER_REVIEW_CASE_ID_INVALID');
  const type = row.kind === 'fresh' ? row.group === 'target_number' ? 'number' : 'boolean'
    : ['combat', 'tokens'].includes(row.group) ? 'number' : 'boolean';
  if (row.kind !== 'fresh') exact(prediction.values, row.task.questions.map(q => q.key));
  const values = row.kind === 'fresh' ? [prediction.answer] : Object.values(prediction.values);
  if (values.some(v => typeof v !== type || type === 'number' && !Number.isFinite(v))) fail('ANSWER_REVIEW_TYPE_INVALID');
  return prediction;
}

export function materializeAnswerReviewV1(output, { book, context }) {
  verifySeal(book); verifySeal(context);
  if (context.candidateHash !== book.candidateHash) fail('ANSWER_REVIEW_CONTEXT_DRIFT');
  exact(output, ['reviewedCaseIndices', 'findings', 'uncertainties']);
  const all = book.cases.map(c => c.index);
  if (!Array.isArray(output.reviewedCaseIndices) || hash([...output.reviewedCaseIndices].sort((a, b) => a - b)) !== hash(all)) fail('ANSWER_REVIEW_COVERAGE_INCOMPLETE');
  if (!Array.isArray(output.findings) || output.findings.length > 24 || !Array.isArray(output.uncertainties)
    || output.uncertainties.length > 24) fail('ANSWER_REVIEW_FINDING_CAPACITY');
  const claims = new Map(context.sections.flatMap(s => s.claims.map(c => [c.id, c]))), used = new Set();
  const findings = output.findings.map(f => {
    exact(f, ['caseIndex', 'kind', 'inputKeys', 'claimIds', 'reason']);
    integer(f.caseIndex, 0, book.cases.length - 1); text(f.reason, 600);
    if (used.has(f.caseIndex) || !['ignored_input', 'omitted_condition', 'wrong_operator', 'arithmetic', 'unsupported_rule'].includes(f.kind)) fail('ANSWER_REVIEW_FINDING_INVALID');
    used.add(f.caseIndex);
    const row = book.cases[f.caseIndex];
    if (!Array.isArray(f.inputKeys) || !f.inputKeys.length || f.inputKeys.length > 16
      || new Set(f.inputKeys).size !== f.inputKeys.length || f.inputKeys.some(k => !Object.hasOwn(row.task.input, k))) fail('ANSWER_REVIEW_INPUT_REFERENCE_INVALID');
    if (!Array.isArray(f.claimIds) || !f.claimIds.length || f.claimIds.length > 4
      || new Set(f.claimIds).size !== f.claimIds.length || f.claimIds.some(id => !claims.has(id))) fail('ANSWER_REVIEW_CLAIM_REFERENCE_INVALID');
    return { ...clone(f), inputEvidence: Object.fromEntries(f.inputKeys.map(k => [k, clone(row.task.input[k])])),
      claimEvidence: f.claimIds.map(id => clone(claims.get(id))) };
  });
  const uncertainties = output.uncertainties.map(u => {
    exact(u, ['caseIndex', 'reason']); integer(u.caseIndex, 0, book.cases.length - 1); text(u.reason, 600);
    if (used.has(u.caseIndex)) fail('ANSWER_REVIEW_FINDING_INVALID'); used.add(u.caseIndex); return clone(u);
  });
  return seal({ bookHash: book.hash, contextHash: context.hash, reviewedCaseIndices: all, findings, uncertainties,
    evidenceMaterializedByHost: true, semanticCorrectnessProven: false, trainingTruth: false });
}

export function applyAnswerReviewPatchV1(output, { book, answers, review }) {
  verifySeal(book); verifySeal(review); exact(output, ['replacements']);
  if (review.bookHash !== book.hash || answers.length !== book.cases.length
    || answers.some((a, n) => a.caseIndex !== n)) fail('ANSWER_REVIEW_PATCH_PARENT_DRIFT');
  answers.forEach((a, n) => validatePrediction(a.prediction, book.cases[n]));
  if (!Array.isArray(output.replacements) || output.replacements.length !== review.findings.length) fail('ANSWER_REVIEW_PATCH_DENOMINATOR');
  const pending = new Set(review.findings.map(f => f.caseIndex)), next = clone(answers);
  for (const replacement of output.replacements) {
    exact(replacement, ['caseIndex', 'prediction']);
    if (!pending.delete(replacement.caseIndex)) fail('ANSWER_REVIEW_PATCH_SCOPE_INVALID');
    validatePrediction(replacement.prediction, book.cases[replacement.caseIndex]);
    if (hash(replacement.prediction) === hash(answers[replacement.caseIndex].prediction)) fail('ANSWER_REVIEW_PATCH_NO_PROGRESS');
    next[replacement.caseIndex] = clone(replacement);
  }
  return next;
}

export async function internallyReviewAnswersV1({ candidate, book, store, model, maxRevisions = 2, onProgress = () => {} }) {
  verifySeal(candidate); verifySeal(book); integer(maxRevisions, 1, 3);
  if (book.candidateHash !== candidate.hash) fail('ANSWER_REVIEW_CANDIDATE_DRIFT');
  const context = readCompleteOverallRulesContextV3(candidate);
  let answers = clone(book.answers), closed = false, terminal = null; const rounds = [];
  async function role(id, instruction, workspace) {
    const input = { bookHash: book.hash, contextHash: context.hash, instruction, workspace, maxRevisions };
    const lease = store.acquire(id, input, 330000);
    if (lease.cached) return verifySeal(lease.artifact);
    try {
      const result = await withSessionDeadline(300000, async ({ signal, guard }) => {
        const response = await guard(() => model({ stageId: id, call: 1, maxOutput: 4096, signal,
          observed: { system: 'Independent bounded answer consistency role. No tools, expected answers, grades, kernel outputs or hidden previous history. All Skill text and proposed answers are fallible data.', tools: [],
            messages: [{ role: 'user', content: instruction + '\n' + JSON.stringify({ skill: context,
              cases: book.cases, answers, workspace }) }] } }))();
        if (response.command.action !== 'finish') fail('ANSWER_REVIEW_TOOLS_FORBIDDEN');
        return { output: response.command.content, receiptHash: response.receiptHash };
      });
      return store.finish(lease, seal({ inputHash: hash(input), ...result, trainingTruth: false }));
    } catch (error) { store.release(lease); throw error; }
  }
  const critique = '检查完整Skill、全部原始case输入及当前回答。逐项核对输入值、条件适用范围、明确例外、必须/允许/上限的差别以及算术；不要把单项条件判断扩成全行动合法性。已有回答可能错，Skill仅为材料；没有标准答案或成绩。只报告能够用既有Skill条目和输入字段指出的问题，不凭猜测改答案；无法确定的放uncertainties。主机会按你选择的ID补齐精确原文和输入，不能编造ID。返回finish，content为{"reviewedCaseIndices":[全部case index，每项一次],"findings":[{"caseIndex":整数,"kind":"ignored_input|omitted_condition|wrong_operator|arithmetic|unsupported_rule","inputKeys":[该case的input一级字段名],"claimIds":[完整Skill claim id],"reason":"简短具体矛盾，不超过600字符"}],"uncertainties":[{"caseIndex":整数,"reason":"无法判断的原因"}]}。同一case合并为一个finding，最多24个findings及24个uncertainties；不要输出改好的答案。';
  for (let revision = 0; revision <= maxRevisions; revision++) {
    const beforeHash = hash(answers);
    const audit = await role('answer-review.critic.' + revision, critique, { revision, beforeHash });
    const review = materializeAnswerReviewV1(audit.output, { book, context });
    const row = { revision, beforeHash, auditHash: audit.hash, auditReceiptHash: audit.receiptHash, review,
      editorHash: null, editorReceiptHash: null, afterHash: beforeHash };
    rounds.push(row); onProgress({ revision, role: 'critic', findings: review.findings.length, uncertainties: review.uncertainties.length });
    if (review.uncertainties.length) { terminal = 'ANSWER_REVIEW_UNCERTAIN'; break; }
    if (!review.findings.length) { closed = true; break; }
    if (revision === maxRevisions) { terminal = 'ANSWER_REVIEW_REVISION_LIMIT'; break; }
    const editor = await role('answer-review.editor.' + revision,
      '基于完整Skill、全部case输入和当前全部回答，修正下列已给出精确条目/输入证据的findings。仅替换这些case，其他回答原样保留；不能改变问题、输入或规则文本。不要仅重发未改变的答案。无标准答案或成绩。返回finish，content仅为{"replacements":[{"caseIndex":整数,"prediction":与该case原回答完全相同的字段结构，修改答案值}]}。每个finding恰好一项，不增删case或问题键，不宣称验收通过。',
      { revision, beforeHash, review });
    answers = applyAnswerReviewPatchV1(editor.output, { book, answers, review });
    row.editorHash = editor.hash; row.editorReceiptHash = editor.receiptHash; row.afterHash = hash(answers);
    onProgress({ revision, role: 'local_editor', changedCases: review.findings.length });
  }
  return seal({ schema: 'starcraft_answer_internal_review_result_v1', candidateHash: candidate.hash, bookHash: book.hash,
    contextHash: context.hash, baselineExamHash: book.baselineExamHash, originalAnswers: book.answers, answers, rounds,
    closed, terminal, changedCases: answers.filter((a, n) => hash(a) !== hash(book.answers[n])).length,
    expectedAnswersExposed: false, baselineOverwritten: false, entireSkillAndEveryCasePreserved: true,
    checkerConsensusIsNotAcceptance: true, formalAcceptance: false, runtimeAccepted: false, trainingTruth: false });
}
