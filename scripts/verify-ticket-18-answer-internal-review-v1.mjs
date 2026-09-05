import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence } from '../packages/skill-production/evidence.mjs';
import { createMechanicsVerifier } from '../packages/skill-production/mechanics.mjs';
import { createProductionDrills } from '../packages/skill-evaluation/production-drills-v1.mjs';
import { createSemanticDrills } from '../packages/skill-evaluation/semantic-drills.mjs';
import { createAnswerRepairBookV1, materializeAnswerReviewV1, applyAnswerReviewPatchV1, internallyReviewAnswersV1 } from '../packages/skill-evaluation/answer-internal-review-v1.mjs';
import { readCompleteOverallRulesContextV3 } from '../packages/skill-evaluation/overall-rules-package-v3.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-production-v3');
const parentDir = path.join(base, 'overall-repair-05a5ac464028e464918e');
const json = async name => verifySeal(JSON.parse(await readFile(path.join(parentDir, name + '.json'), 'utf8')));
const candidate = await json('overall-rules-candidate'), exam = await json('actual-model-exam');
const catalogue = await loadFrozenSkillEvidence(root), drills = await createProductionDrills(catalogue);
const legacyDrills = createSemanticDrills(await createMechanicsVerifier(catalogue));
const book = createAnswerRepairBookV1({ candidate, exam, drills, legacyDrills }), context = readCompleteOverallRulesContextV3(candidate);
assert.equal(book.cases.length, 105); assert.equal(book.answers.length, 105);
const actualRows = exam.results.flatMap(r => r.predictions);
assert.equal(actualRows.filter(r => r.passed).length, 96, 'retained actual failure is the reproduction, not an injected pass');
const failedIndices = book.cases.filter(c => !actualRows.find(p => p.id === c.task.id).passed).map(c => c.index);
assert.equal(failedIndices.length, 9);
function expectedPrediction(index) {
  const row = book.cases[index], original = actualRows.find(p => p.id === row.task.id);
  return row.kind === 'fresh' ? { id: row.task.id, answer: original.kernelReceipt.expected }
    : { id: row.task.id, values: Object.fromEntries(original.checks.map(c => [c.key, c.expected])) };
}
const reviewedCaseIndices = book.cases.map(c => c.index), claimId = context.sections[0].claims[0].id;
function findings(indices) {
  return { reviewedCaseIndices, findings: indices.map(index => ({ caseIndex: index, kind: 'ignored_input',
    inputKeys: Object.keys(book.cases[index].task.input).slice(0, 1), claimIds: [claimId],
    reason: 'Injected workflow fixture only; this generic citation does not prove semantic correctness.' })), uncertainties: [] };
}
const audit = materializeAnswerReviewV1(findings(failedIndices), { book, context });
assert.equal(audit.findings.length, 9); assert(!audit.semanticCorrectnessProven);
assert.deepEqual(audit.findings[0].claimEvidence[0], context.sections[0].claims[0]);
assert.throws(() => materializeAnswerReviewV1({ ...findings([]), reviewedCaseIndices: reviewedCaseIndices.slice(1) }, { book, context }), { code: 'ANSWER_REVIEW_COVERAGE_INCOMPLETE' });
const forged = findings([0]); forged.findings[0].claimIds = ['invented'];
assert.throws(() => materializeAnswerReviewV1(forged, { book, context }), { code: 'ANSWER_REVIEW_CLAIM_REFERENCE_INVALID' });
const badInput = findings([0]); badInput.findings[0].inputKeys = ['invented'];
assert.throws(() => materializeAnswerReviewV1(badInput, { book, context }), { code: 'ANSWER_REVIEW_INPUT_REFERENCE_INVALID' });
const replacements = failedIndices.map(caseIndex => ({ caseIndex, prediction: expectedPrediction(caseIndex) }));
const next = applyAnswerReviewPatchV1({ replacements }, { book, answers: book.answers, review: audit });
for (let n = 0; n < 105; n++) if (!failedIndices.includes(n)) assert.deepEqual(next[n], book.answers[n]);
assert.throws(() => applyAnswerReviewPatchV1({ replacements: replacements.slice(1) }, { book, answers: book.answers, review: audit }), { code: 'ANSWER_REVIEW_PATCH_DENOMINATOR' });
assert.throws(() => applyAnswerReviewPatchV1({ replacements: failedIndices.map(n => book.answers[n]) }, { book, answers: book.answers, review: audit }), { code: 'ANSWER_REVIEW_PATCH_NO_PROGRESS' });
const temp = await mkdtemp(path.join(base, 'answer-internal-review-test-'));
const stores = [], makeStore = name => { const s = openProductionStore(path.join(temp, name + '.sqlite'), { runId: 'injected-' + name, recipeHash: hash(name) }); stores.push(s); return s; };
const response = output => ({ command: { action: 'finish', content: output }, receiptHash: hash(output) });
let calls = 0;
const store = makeStore('correction');
const model = async ({ stageId, observed }) => {
  calls++;
  const task = observed.messages[0].content, input = JSON.parse(task.slice(task.indexOf('\n') + 1));
  assert.equal(input.skill.sections.length, 37); assert.equal(input.skill.sections.flatMap(s => s.claims).length, 522);
  assert.equal(input.cases.length, 105); assert.equal(input.answers.length, 105);
  assert.deepEqual(input.cases, book.cases); assert.equal(input.skill.omittedClaims, 0); assert.deepEqual(observed.tools, []);
  assert(!task.includes('"expected":') && !task.includes('"kernelReceipt":') && !task.includes('"passed":') && !task.includes('"score":'));
  if (stageId.endsWith('critic.0')) return response(findings(failedIndices));
  if (stageId.includes('editor')) return response({ replacements });
  return response(findings([]));
};
const result = await internallyReviewAnswersV1({ candidate, book, store, model });
assert(result.closed); assert.equal(result.changedCases, 9); assert.equal(calls, 3);
assert(!result.formalAcceptance && !result.runtimeAccepted && result.checkerConsensusIsNotAcceptance);
assert.deepEqual(result.originalAnswers, book.answers);
assert.equal((await internallyReviewAnswersV1({ candidate, book, store, model })).hash, result.hash); assert.equal(calls, 3);
// False consensus cannot become a pass: unchanged bad answers remain visible.
const falseConsensus = await internallyReviewAnswersV1({ candidate, book, store: makeStore('false-consensus'), model: async () => response(findings([])) });
assert(falseConsensus.closed); assert.equal(falseConsensus.changedCases, 0); assert(!falseConsensus.formalAcceptance);
assert.deepEqual(falseConsensus.answers, book.answers);
let oscillationCalls = 0;
const bounded = await internallyReviewAnswersV1({ candidate, book, store: makeStore('bounded'), model: async ({ stageId, observed }) => {
  oscillationCalls++;
  if (stageId.includes('critic')) return response(findings([0]));
  const task = observed.messages[0].content, input = JSON.parse(task.slice(task.indexOf('\n') + 1));
  return response({ replacements: [{ caseIndex: 0, prediction: { ...input.answers[0].prediction, answer: !input.answers[0].prediction.answer } }] });
} });
assert(!bounded.closed); assert.equal(bounded.terminal, 'ANSWER_REVIEW_REVISION_LIMIT'); assert.equal(oscillationCalls, 5);
let paymentCalls = 0;
await assert.rejects(() => internallyReviewAnswersV1({ candidate, book, store: makeStore('payment'), model: async () => {
  paymentCalls++; throw Object.assign(new Error('API_BALANCE_EXHAUSTED_STOP_ALL_WORK'), { code: 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK' });
} }), { code: 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK' }); assert.equal(paymentCalls, 1);
for (const s of stores) s.close();
const files = ['packages/skill-evaluation/answer-internal-review-v1.mjs', 'scripts/verify-ticket-18-answer-internal-review-v1.mjs',
  'packages/skill-evaluation/overall-rules-package-v3.mjs', 'packages/skill-production/model.mjs', 'packages/skill-production/store.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 13, parentCandidateHash: candidate.hash, baselineExamHash: exam.hash,
  bookHash: book.hash, codeHashes, actualBaselineCorrect: 96, actualBaselineTotal: 105,
  correctionRuntimeInjectedOnly: true, providerCalls: 0, actualCorrectionQualityProven: false, trainingTruth: false });
await writeFile(path.join(base, 'answer-internal-review-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 13, actualBaseline: '96/105', injectedCorrectionOnly: true,
  providerCalls: 0, bookHash: book.hash, reportHash: report.hash }));
