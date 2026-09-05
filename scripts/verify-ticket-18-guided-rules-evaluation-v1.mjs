import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionDrills } from '../packages/skill-evaluation/production-drills-v1.mjs';
import { createSemanticDrills } from '../packages/skill-evaluation/semantic-drills.mjs';
import { createMechanicsVerifier } from '../packages/skill-production/mechanics.mjs';
import { createIndependentConditionDrillsV1 } from '../packages/skill-evaluation/independent-condition-drills-v1.mjs';
import { createSourceAuditProbesV3 } from '../packages/skill-evaluation/source-audit-probes-v3.mjs';
import { createSupplementalSourceProbesV1 } from '../packages/skill-evaluation/supplemental-source-probes-v1.mjs';
import { evaluateGuidedRulesV1 } from '../packages/skill-evaluation/guided-rules-evaluation-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-production-v3');
const json = async file => verifySeal(JSON.parse(await readFile(path.join(base, file), 'utf8')));
const candidate = await json('overall-repair-05a5ac464028e464918e/overall-rules-candidate.json');
const teacher = await json('answer-review-48ec57ad20532aa343ce/actual-answer-review.json');
const exam = await json('overall-repair-05a5ac464028e464918e/actual-model-exam.json');
const catalogue = await loadFrozenSkillEvidence(root), reader = createEvidenceReader(catalogue), context = createGlobalProductionContext(catalogue);
const originalDrills = await createProductionDrills(catalogue), legacyDrills = createSemanticDrills(await createMechanicsVerifier(catalogue));
const independentDrills = await createIndependentConditionDrillsV1({ catalogue, originalDrills, legacyDrills });
const sourceProbes = createSourceAuditProbesV3({ catalogue, reader }), supplemental = createSupplementalSourceProbesV1({ catalogue, reader });
const deps = { candidate, teacher, context, originalDrills, legacyDrills, independentDrills, sourceProbes, supplemental };
const temp = await mkdtemp(path.join(base, 'guided-evaluation-test-'));
const stores = [], makeStore = name => { const s = openProductionStore(path.join(temp, name + '.sqlite'), { runId: 'injected-' + name, recipeHash: hash(name) }); stores.push(s); return s; };
let calls = 0;
const response = output => ({ command: { action: 'finish', content: output }, receiptHash: hash(output) });
const model = async ({ stageId, observed }) => {
  calls++;
  const task = observed.messages[0].content, input = JSON.parse(task.slice(task.indexOf('\n') + 1));
  assert.equal(input.skill.sections.length, 37); assert.equal(input.skill.sections.flatMap(s => s.claims).length, 522);
  assert.deepEqual(input.guide.lessons, teacher.lessons); assert.deepEqual(observed.tools, []);
  assert(!task.includes('"expected":') && !task.includes('"kernelReceipt":') && !task.includes('"originalAnswers":'));
  if (stageId.startsWith('guide-source-review.')) {
    assert.equal(input.frozenSources.hash, context.hash); assert(!input.cases && !input.questions && !input.answers);
    return response({ verdicts: input.steps.map(s => ({ lessonId: s.lessonId, stepIndex: s.stepIndex, verdict: 'supported',
      reason: 'Injected source-review fixture only; not real model approval.', sourceRefs: s.sourceRefs })) });
  }
  assert(!input.frozenSources && !input.answers);
  if (stageId === 'guide-source-controls') return response({ answers: [...sourceProbes.cases, ...supplemental.cases].map(c => ({ id: c.id, answer: c.expected })) });
  return response({ predictions: input.cases.map(c => {
    if (stageId.includes('independent_inputs')) return { id: c.id, answer: independentDrills.proof().find(p => p.inputHash === hash(c.input)).expected };
    const old = exam.results.flatMap(r => r.predictions).find(p => p.id === c.id);
    return c.questions ? { id: c.id, values: Object.fromEntries(old.checks.map(v => [v.key, v.expected])) } : { id: c.id, answer: old.kernelReceipt.expected };
  }) });
};
const store = makeStore('positive');
const result = await evaluateGuidedRulesV1({ ...deps, store, model });
assert(result.passed); assert.deepEqual(result.summary.map(r => r.correct), [69, 36, 30]); assert.equal(result.sourceControl.correct, 22);
assert.equal(calls, 23); assert(!result.formalAcceptance && !result.runtimeAccepted && result.baseSkillAndAllClaimsUnchanged);
assert.equal((await evaluateGuidedRulesV1({ ...deps, store, model })).hash, result.hash); assert.equal(calls, 23);
let negativeCalls = 0;
await assert.rejects(() => evaluateGuidedRulesV1({ ...deps, store: makeStore('source-negative'), model: async args => {
  negativeCalls++; const r = await model(args); r.command.content.verdicts[0].verdict = 'unsupported'; return r;
} }), { code: 'GUIDED_RULES_SOURCE_REVIEW_NOT_PASSED' }); assert.equal(negativeCalls, 1);
await assert.rejects(() => evaluateGuidedRulesV1({ ...deps, store: makeStore('missing-step'), model: async args => {
  const r = await model(args); r.command.content.verdicts.pop(); return r;
} }), { code: 'GUIDED_RULES_REVIEW_DENOMINATOR' });
let wrongCalls = 0;
const wrong = await evaluateGuidedRulesV1({ ...deps, store: makeStore('wrong-answer'), model: async args => {
  wrongCalls++; const r = await model(args);
  if (args.stageId === 'guide-exam.independent_inputs.self_range') r.command.content.predictions[0].answer = !r.command.content.predictions[0].answer;
  return r;
} });
assert(!wrong.passed); assert.equal(wrong.summary[2].correct, 29); assert.equal(wrongCalls, 23, 'a wrong answer must not trigger answer fishing');
for (const s of stores) s.close();
const files = ['packages/skill-evaluation/guided-rules-evaluation-v1.mjs', 'scripts/verify-ticket-18-guided-rules-evaluation-v1.mjs',
  'packages/skill-evaluation/independent-condition-drills-v1.mjs', 'packages/skill-evaluation/overall-rules-package-v3.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 8, candidateHash: candidate.hash, teacherHash: teacher.hash,
  independentManifestHash: independentDrills.manifest.hash, codeHashes, providerCalls: 0,
  correctionWorkflowInjectedOnly: true, actualGuidedQualityProven: false, trainingTruth: false });
await writeFile(path.join(base, 'guided-rules-evaluation-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 8, ruleCases: 135, sourceControls: 22,
  providerCalls: 0, reportHash: report.hash }));
