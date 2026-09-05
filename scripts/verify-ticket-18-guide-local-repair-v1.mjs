import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionDrills } from '../packages/skill-evaluation/production-drills-v1.mjs';
import { createSemanticDrills } from '../packages/skill-evaluation/semantic-drills.mjs';
import { createMechanicsVerifier } from '../packages/skill-production/mechanics.mjs';
import { createGuideRepairFeedbackV1, applyGuideLocalPatchV1, repairGuideFromRulesV1 } from '../packages/skill-evaluation/guide-local-repair-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-production-v3');
const json = async file => verifySeal(JSON.parse(await readFile(path.join(base, file), 'utf8')));
const candidate = await json('overall-repair-05a5ac464028e464918e/overall-rules-candidate.json');
const teacher = await json('answer-review-48ec57ad20532aa343ce/actual-answer-review.json');
const evaluation = await json('guided-rules-9299efdcb03d2e803b7f/actual-guided-evaluation.json');
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
const originalDrills = await createProductionDrills(catalogue), legacyDrills = createSemanticDrills(await createMechanicsVerifier(catalogue));
const deps = { candidate, teacher, evaluation, catalogue, originalDrills, legacyDrills };
const feedback = createGuideRepairFeedbackV1(deps);
assert.equal(feedback.book.cases.length, 105);
assert.equal(feedback.rules.originalCorrect, 103);
assert.deepEqual(feedback.rules.findings.map(f => f.rulesPrediction.id), ['production-heldout.enemy_link.4', 'production-heldout.enemy_link.8']);
assert.deepEqual(feedback.allowedLessons.map(l => l.id), ['enemy-link-placement']);
assert(!JSON.stringify(feedback).includes('independent-condition.'));
// Injected local editor is only a host-scope test, not a real production result.
const output = { replacements: [{ lessonId: 'enemy-link-placement', procedure: [
  'If linkCrossesEnemy is false, no Enemy-crossing permission is needed. Then check landingOpen and landingCoherent.',
  'If linkCrossesEnemy is true, enemyCurrentlyEngaged must also be true. This checks only these conditions, not an entire action.'
] }] };
const patched = applyGuideLocalPatchV1(output, { teacher, feedback });
assert.deepEqual(patched.slice(1), teacher.lessons.slice(1));
assert.deepEqual(patched[0].sourceRefs, teacher.lessons[0].sourceRefs);
const rejects = (o, code) => assert.throws(() => applyGuideLocalPatchV1(o, { teacher, feedback }), { code });
rejects({ replacements: [{ lessonId: teacher.lessons[0].id, procedure: teacher.lessons[0].procedure }] }, 'GUIDE_PATCH_NO_PROGRESS');
rejects({ replacements: [{ ...output.replacements[0], lessonId: teacher.lessons[1].id }] }, 'GUIDE_PATCH_SCOPE_INVALID');
rejects({ replacements: [] }, 'GUIDE_PATCH_DENOMINATOR');
rejects({ replacements: [output.replacements[0], output.replacements[0]] }, 'GUIDE_PATCH_DENOMINATOR');
rejects({ replacements: [{ ...output.replacements[0], sourceRefs: ['invented'] }] }, 'GUIDE_PATCH_SOURCE_REF_DRIFT');
rejects({ replacements: [{ ...output.replacements[0], procedure: ['production-heldout.enemy_link.4 is always true'] }] }, 'GUIDE_PATCH_CASE_MEMORIZATION_REJECTED');
const altered = seal({ ...Object.fromEntries(Object.entries(teacher).filter(([k]) => k !== 'hash')), lessons: teacher.lessons.slice(1) });
assert.throws(() => applyGuideLocalPatchV1(output, { teacher: altered, feedback }), { code: 'GUIDE_PATCH_PARENT_DRIFT' });
const raw = Object.fromEntries(Object.entries(evaluation).filter(([k]) => k !== 'hash'));
const changed = structuredClone(raw); const changedPrediction = changed.results.find(r => r.kind === 'development_fresh_original').predictions[0].prediction;
changedPrediction.answer = !changedPrediction.answer;
assert.throws(() => createGuideRepairFeedbackV1({ ...deps, evaluation: seal(changed) }), { code: 'ARTIFACT_HASH_MISMATCH' });
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
try {
  const row = db.prepare("SELECT response FROM attempts WHERE run=? AND state='received'").get('guide-repair-1190b257ffa5d310e4e0');
  const actualOutput = verifySeal(JSON.parse(row.response)).value.output.channels.skill.content;
  const actualProjection = applyGuideLocalPatchV1(actualOutput, { teacher, feedback });
  assert.deepEqual(actualProjection[0].procedure, actualOutput.replacements[0].procedure);
  assert.deepEqual(actualProjection[0].sourceRefs, teacher.lessons[0].sourceRefs);
  assert.deepEqual(actualProjection.slice(1), teacher.lessons.slice(1));
  const badExtra = structuredClone(actualOutput); badExtra.replacements[0].extra = 'unapproved';
  rejects(badExtra, 'OUTPUT_SCHEMA_INVALID');
} finally { db.close(); }
const directory = await mkdtemp(path.join(base, 'guide-local-test-'));
const store = openProductionStore(path.join(directory, 'production.sqlite'), { runId: 'injected-local', recipeHash: hash('injected-local') });
let calls = 0;
try {
  const model = async ({ observed }) => {
    calls++;
    const task = observed.messages[0].content, payload = JSON.parse(task.slice(task.indexOf('\n') + 1));
    assert.equal(payload.frozenSources.hash, context.hash);
    assert.equal(payload.skill.sections.length, 37);
    assert.equal(payload.skill.sections.flatMap(s => s.claims).length, 522);
    assert.deepEqual(payload.guide.lessons, teacher.lessons);
    assert.equal(payload.feedback.book.cases.length, 105);
    assert(!task.includes('independent-condition.') && !task.includes('"independent_inputs"'));
    return { command: { action: 'finish', content: output }, receiptHash: hash(output) };
  };
  const result = await repairGuideFromRulesV1({ candidate, teacher, feedback, context, store, model });
  assert.deepEqual(result.lessons, patched); assert.equal(result.parentTeacherHash, teacher.hash);
  assert.equal(result.changedLessons, 1); assert(!result.formalAcceptance && !result.runtimeAccepted && !result.independentConditionCasesExposed);
  assert.equal((await repairGuideFromRulesV1({ candidate, teacher, feedback, context, store, model })).hash, result.hash);
  assert.equal(calls, 1);
  const recovery = seal({ schema: 'starcraft_guide_no_progress_evidence_v1', feedbackHash: feedback.hash,
    teacherHash: teacher.hash, candidateHash: candidate.hash, sourceFirstAlreadyUsed: false,
    actualRequestReconstructed: true, failureCode: 'GUIDE_PATCH_NO_PROGRESS', injectedEvidenceOnly: true });
  let reconstructionCalls = 0;
  const reconstructed = await repairGuideFromRulesV1({ candidate, teacher, feedback, context, store, recovery, model: async ({ observed, stageId }) => {
    reconstructionCalls++;
    assert.equal(stageId, 'guide-local-source-reconstruction');
    const task = observed.messages[0].content, payload = JSON.parse(task.slice(task.indexOf('\n') + 1));
    assert.equal(payload.frozenSources.hash, context.hash); assert.equal(payload.skill.sections.length, 37);
    assert.deepEqual(payload.unchangedGuides, teacher.lessons.slice(1));
    assert.equal(payload.developmentCases.length, 105); assert.equal(payload.counterexamples.length, 2);
    assert(!payload.guide && !payload.feedback && !payload.answers);
    assert(!task.includes(teacher.lessons[0].procedure[0]) && !task.includes('independent-condition.') && !task.includes('submittedPrediction'));
    assert.equal(observed.messages.length, 2);
    return { command: { action: 'finish', content: output }, receiptHash: hash(output) };
  } });
  assert(reconstructed.sourceReconstruction); assert.equal(reconstructed.noProgressEvidenceHash, recovery.hash);
  assert.deepEqual(reconstructed.lessons.slice(1), teacher.lessons.slice(1)); assert.equal(reconstructionCalls, 1);
} finally { store.close(); }
const files = ['packages/skill-evaluation/guide-local-repair-v1.mjs', 'scripts/verify-ticket-18-guide-local-repair-v1.mjs',
  'packages/skill-evaluation/rules-backed-answer-repair-v1.mjs', 'packages/skill-evaluation/answer-internal-review-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 16, candidateHash: candidate.hash, teacherHash: teacher.hash, evaluationHash: evaluation.hash,
  feedbackHash: feedback.hash, codeHashes, providerCalls: 0, injectedEditorOnly: true, actualQualityProven: false, trainingTruth: false });
await writeFile(path.join(base, 'guide-local-repair-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 16, sourceBoundFailures: 2, editableLessons: 1, providerCalls: 0, hash: report.hash }));
