import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createMechanicsVerifier } from '../packages/skill-production/mechanics.mjs';
import { createProductionDrills } from '../packages/skill-evaluation/production-drills-v1.mjs';
import { createSemanticDrills } from '../packages/skill-evaluation/semantic-drills.mjs';
import { createAnswerRepairBookV1 } from '../packages/skill-evaluation/answer-internal-review-v1.mjs';
import { createRulesBackedDevelopmentFeedbackV1, repairAnswersFromRulesV1 } from '../packages/skill-evaluation/rules-backed-answer-repair-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { createAccountedModel } from '../packages/skill-production/model.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-production-v3');
const parentDir = path.join(base, 'overall-repair-05a5ac464028e464918e');
const json = async name => verifySeal(JSON.parse(await readFile(path.join(parentDir, name + '.json'), 'utf8')));
const candidate = await json('overall-rules-candidate'), exam = await json('actual-model-exam');
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
const drills = await createProductionDrills(catalogue), legacyDrills = createSemanticDrills(await createMechanicsVerifier(catalogue));
const book = createAnswerRepairBookV1({ candidate, exam, drills, legacyDrills });
const feedback = createRulesBackedDevelopmentFeedbackV1({ candidate, book, catalogue, drills, legacyDrills });
assert.equal(feedback.findings.length, 9); assert.equal(feedback.originalCorrect, 96);
assert(feedback.developmentAnswersExposed && !feedback.independentConditionCasesExposed);
assert(feedback.findings.every(f => f.kernelReceipt.passed && f.source.text.length > 10));
const replacements = feedback.findings.map(f => ({ caseIndex: f.caseIndex, prediction: f.rulesPrediction }));
const lessons = [{ id: 'fixture-only', procedure: ['Injected protocol fixture, not a production lesson.'], sourceRefs: ['faq-v1:11'] }];
const { hash: ignored, ...bookBody } = book;
const independentBook = seal({ ...bookBody, cases: book.cases.map((c, n) => n ? c : { ...c, task: { ...c.task, id: 'independent-condition.direct_move.1' } }) });
assert.throws(() => createRulesBackedDevelopmentFeedbackV1({ candidate, book: independentBook, catalogue, drills, legacyDrills }), { code: 'RULES_FEEDBACK_DEVELOPMENT_SCOPE_INVALID' });
const temp = await mkdtemp(path.join(base, 'rules-backed-answer-test-'));
const stores = [], makeStore = name => { const s = openProductionStore(path.join(temp, name + '.sqlite'), { runId: 'injected-' + name, recipeHash: hash(name) }); stores.push(s); return s; };
const store = makeStore('positive'); let calls = 0, requestBytes = 0;
const model = createAccountedModel({ store, commandPolicy: 'finish_only', maxInputBytes: 1_000_000,
  complete: async request => {
    calls++; requestBytes = Buffer.byteLength(JSON.stringify(request)) + 4096;
    const task = request.promptNodes[1].value.messages[0].content;
    const input = JSON.parse(task.slice(task.indexOf('\n') + 1));
    assert.equal(input.frozenSources.hash, context.hash); assert.equal(input.skill.sections.length, 37);
    assert.equal(input.cases.length, 105); assert.equal(input.answers.length, 105);
    assert.equal(input.feedback.findings.length, 9);
    assert(!task.includes('independent-condition.clearance.') && !task.includes('independent-condition.target_number.'));
    return { output: { channels: { skill: { action: 'finish', content: { replacements, lessons } } } }, usageReceipt: {
      requestedModel: 'deepseek-v4-flash', reportedModel: 'deepseek-v4-flash', receiptHash: hash('injected'),
      usage: { inputUnits: 10, outputUnits: 10, totalUnits: 20 } } };
  } });
const result = await repairAnswersFromRulesV1({ candidate, book, feedback, context, store, model });
assert.equal(result.changedCases, 9); assert(!result.formalAcceptance && !result.runtimeAccepted);
const scores = result.answers.map(a => { const c = book.cases[a.caseIndex]; return c.kind === 'fresh' ? drills.verify(a.prediction) : legacyDrills.judge(c.group, a.prediction); });
assert.equal(scores.filter(s => s.passed).length, 105, 'injected correction workflow, not a real model quality claim');
assert.equal((await repairAnswersFromRulesV1({ candidate, book, feedback, context, store, model })).hash, result.hash); assert.equal(calls, 1);
const response = output => ({ command: { action: 'finish', content: output }, receiptHash: hash('injected-negative') });
await assert.rejects(() => repairAnswersFromRulesV1({ candidate, book, feedback, context, store: makeStore('no-op'),
  model: async () => response({ replacements: feedback.findings.map(f => book.answers[f.caseIndex]), lessons }) }), { code: 'ANSWER_REVIEW_PATCH_NO_PROGRESS' });
await assert.rejects(() => repairAnswersFromRulesV1({ candidate, book, feedback, context, store: makeStore('memorization'),
  model: async () => response({ replacements, lessons: [{ ...lessons[0], procedure: ['Always answer heldout.abilities.1 false.'] }] }) }), { code: 'RULES_FEEDBACK_CASE_MEMORIZATION_REJECTED' });
await assert.rejects(() => repairAnswersFromRulesV1({ candidate, book, feedback, context, store: makeStore('source'),
  model: async () => response({ replacements, lessons: [{ ...lessons[0], sourceRefs: ['invented'] }] }) }), { code: 'RULES_FEEDBACK_LESSON_SOURCE_INVALID' });
for (const s of stores) s.close();
const files = ['packages/skill-evaluation/rules-backed-answer-repair-v1.mjs', 'scripts/verify-ticket-18-rules-backed-answer-repair-v1.mjs',
  'packages/skill-evaluation/answer-internal-review-v1.mjs', 'packages/skill-production/model.mjs', 'packages/skill-production-v3/context.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 10, bookHash: book.hash, feedbackHash: feedback.hash, codeHashes,
  fullContextRequestBytesWithAllowance: requestBytes, providerCalls: 0, injectedCorrectionOnly: true,
  actualCorrectionQualityProven: false, trainingTruth: false });
await writeFile(path.join(base, 'rules-backed-answer-repair-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 10, actualDefects: feedback.findings.length,
  requestBytes, providerCalls: 0, feedbackHash: feedback.hash, reportHash: report.hash }));
