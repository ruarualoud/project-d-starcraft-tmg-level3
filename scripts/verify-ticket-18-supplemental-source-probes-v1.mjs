import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createSupplementalSourceProbesV1, verifySupplementalSourceProbesV1 } from '../packages/skill-evaluation/supplemental-source-probes-v1.mjs';
import { evaluateOverallSourceRegressionV3 } from '../packages/skill-evaluation/evaluate-overall-source-regression-v3.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { hash, seal, sha256 } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogue = await loadFrozenSkillEvidence(root), reader = createEvidenceReader(catalogue), deps = { catalogue, reader };
const probes = createSupplementalSourceProbesV1(deps);
assert.equal(probes.cases.length, 8); assert.equal(probes.evidence.length, 8);
assert.equal(new Set(probes.cases.map(c => c.id)).size, 8);
assert.equal(verifySupplementalSourceProbesV1(probes, deps).hash, probes.hash);
assert(probes.knownErrorRegressionNotFreshHeldout && !probes.replacesExistingFourteenOr105CaseExam);
assert.throws(() => createSupplementalSourceProbesV1({ catalogue, reader: { ...reader, catalogueHash: hash('wrong') } }), { code: 'SUPPLEMENTAL_SOURCE_READER_DRIFT' });
const { hash: ignored, ...body } = probes;
assert.throws(() => verifySupplementalSourceProbesV1(seal({ ...body, cases: probes.cases.slice(1) }), deps), { code: 'SUPPLEMENTAL_SOURCE_PROBES_DRIFT' });
assert.throws(() => verifySupplementalSourceProbesV1(seal({ ...body, cases: probes.cases.map((c, i) => i ? c : { ...c, expected: !c.expected }) }), deps), { code: 'SUPPLEMENTAL_SOURCE_PROBES_DRIFT' });
const temp = await mkdtemp(path.join(root, 'build/ticket-18-production-v3/supplemental-source-test-'));
// Synthetic delivery fixture, not a real rule or quality result.
const candidate = seal({ schema: 'starcraft_overall_rules_candidate_v3', catalogueHash: catalogue.hash,
  sourceBinding: catalogue.sourceBinding, semanticPassed: true, trainingTruth: false,
  sections: Array.from({ length: 37 }, (_, i) => ({ id: 'fixture-' + i, topics: ['injected'],
    claims: [{ id: 'claim-' + i, text: 'INJECTED ONLY; NOT A RULE ' + i }] })) });
const stores = [], makeStore = name => {
  const s = openProductionStore(path.join(temp, name + '.sqlite'), { runId: 'fixture-' + name, recipeHash: hash(name) });
  stores.push(s); return s;
};
let calls = 0;
const store = makeStore('pass');
const model = async ({ observed }) => {
  calls++;
  const task = observed.messages[0].content, input = JSON.parse(task.slice(task.indexOf('\n') + 1));
  assert.equal(input.skill.sections.length, 37); assert.equal(input.skill.omittedClaims, 0);
  assert.equal(input.questions.length, 8);
  assert(!task.includes('"expected"') && !task.includes('"anchor"') && !task.includes('"evidence"'));
  assert.deepEqual(observed.tools, []);
  return { command: { action: 'finish', content: { answers: probes.cases.map(c => ({ id: c.id, answer: c.expected })) } }, receiptHash: hash('injected-pass') };
};
const passed = await evaluateOverallSourceRegressionV3({ candidate, probes, store, model });
assert(passed.passed && passed.correct === 8);
await evaluateOverallSourceRegressionV3({ candidate, probes, store, model }); assert.equal(calls, 1);
let negativeCalls = 0;
const failed = await evaluateOverallSourceRegressionV3({ candidate, probes, store: makeStore('negative'), model: async () => {
  negativeCalls++;
  return { command: { action: 'finish', content: { answers: probes.cases.map(c => ({ id: c.id, answer: !c.expected })) } }, receiptHash: hash('injected-fail') };
} });
assert(!failed.passed && failed.correct === 0); assert.equal(negativeCalls, 1, 'valid wrong answers cannot trigger answer fishing');
for (const s of stores) s.close();
const files = ['packages/skill-evaluation/supplemental-source-probes-v1.mjs', 'scripts/verify-ticket-18-supplemental-source-probes-v1.mjs',
  'packages/skill-evaluation/evaluate-overall-source-regression-v3.mjs', 'packages/skill-evaluation/source-audit-probes-v3.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 10, probesHash: probes.hash, codeHashes, providerCalls: 0,
  actualSkillQualityProven: false, injectedRuntimeOnly: true, trainingTruth: false });
await writeFile(path.join(root, 'build/ticket-18-production-v3/supplemental-source-probes.json'), JSON.stringify(probes, null, 2));
await writeFile(path.join(root, 'build/ticket-18-production-v3/supplemental-source-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 10, supplementalCases: 8, probesHash: probes.hash, reportHash: report.hash,
  injectedOnly: true, providerCalls: 0, actualSkillQualityProven: false }));
