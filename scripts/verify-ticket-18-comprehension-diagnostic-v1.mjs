import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createProductionDrills } from '../packages/skill-evaluation/production-drills-v1.mjs';
import { createSemanticDrills } from '../packages/skill-evaluation/semantic-drills.mjs';
import { createMechanicsVerifier } from '../packages/skill-production/mechanics.mjs';
import { createSupplementalSourceProbesV1 } from '../packages/skill-evaluation/supplemental-source-probes-v1.mjs';
import { createComprehensionDiagnosticV1, validateComprehensionDiagnosticAnswersV1, evaluateComprehensionDiagnosticV1 } from '../packages/skill-evaluation/comprehension-diagnostic-v1.mjs';
import { readCompleteOverallRulesContextV3 } from '../packages/skill-evaluation/overall-rules-package-v3.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { hash, seal, sha256 } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogue = await loadFrozenSkillEvidence(root), reader = createEvidenceReader(catalogue);
const drills = await createProductionDrills(catalogue), legacyDrills = createSemanticDrills(await createMechanicsVerifier(catalogue));
const supplemental = createSupplementalSourceProbesV1({ catalogue, reader });
const candidate = seal({ schema: 'starcraft_overall_rules_candidate_v3', catalogueHash: catalogue.hash,
  sourceBinding: catalogue.sourceBinding, semanticPassed: true, candidateOnly: true, published: false, trainingTruth: false,
  sections: Array.from({ length: 37 }, (_, n) => ({ id: 'injected-' + n, topics: ['injected'],
    claims: [{ id: 'injected-' + n + '.claims.0', text: 'SYNTHETIC DELIVERY FIXTURE; NOT A RULE ' + n }] })) });
const deps = { candidate, drills, legacyDrills, supplemental }, manifest = createComprehensionDiagnosticV1(deps);
assert.equal(manifest.cases, 25); assert.equal(manifest.groups.length, 4);
assert(!manifest.replacesBaseline && !manifest.formalAcceptance);
assert.deepEqual(manifest.groups[0].cases, drills.list('enemy_link'));
assert.deepEqual(manifest.groups[2].cases, legacyDrills.list('abilities'));
assert(!('expected' in manifest.groups[3].cases[0]));
const { hash: ignored, ...body } = candidate;
assert.throws(() => createComprehensionDiagnosticV1({ ...deps, candidate: seal({ ...body, catalogueHash: hash('drift') }) }),
  { code: 'COMPREHENSION_DIAGNOSTIC_SOURCE_DRIFT' });
const temp = await mkdtemp(path.join(root, 'build/ticket-18-production-v3/comprehension-test-'));
const stores = [], makeStore = name => {
  const store = openProductionStore(path.join(temp, name + '.sqlite'), { runId: 'injected-' + name, recipeHash: hash(name) });
  stores.push(store); return store;
};
function expected(group, c) {
  return group.kind === 'fresh' ? drills.verify({ id: c.id, answer: true }).passed
    : group.kind === 'legacy_regression' ? legacyDrills.judge(group.id, { id: c.id, values: { [c.questions[0].key]: true } }).passed
    : supplemental.cases.find(row => row.id === c.id).expected;
}
function output(group, wrong = false) {
  return { answers: group.cases.map(c => ({ id: c.id, answer: wrong ? !expected(group, c) : expected(group, c),
    claimIds: ['injected-36.claims.0'], conditionSummary: 'Injected schema fixture only; not a semantic justification.' })) };
}
let calls = 0;
const model = wrong => async ({ observed }) => {
  calls++;
  const task = observed.messages[0].content, input = JSON.parse(task.slice(task.indexOf('\n') + 1));
  const group = manifest.groups.find(g => g.cases[0].id === input.cases[0].id);
  assert.equal(input.skill.sections.length, 37); assert.equal(input.skill.omittedClaims, 0);
  assert.deepEqual(input.cases, group.cases); assert.deepEqual(observed.tools, []);
  assert(!task.includes('"expected":') && !task.includes('"score":') && !task.includes('"prior":'));
  return { command: { action: 'finish', content: output(group, wrong) }, receiptHash: hash('injected-' + calls) };
};
const store = makeStore('positive');
const positive = await evaluateComprehensionDiagnosticV1({ ...deps, store, model: model(false) });
assert.equal(positive.correct, 25); assert.equal(calls, 4);
assert(!positive.formalAcceptance && !positive.runtimeAccepted && !positive.baselineOverwritten);
store.close(); stores.splice(stores.indexOf(store), 1);
const reopened = makeStore('positive');
assert.equal((await evaluateComprehensionDiagnosticV1({ ...deps, store: reopened, model: model(false) })).hash, positive.hash);
assert.equal(calls, 4, 'restart must reuse persisted diagnostic results');
const negative = await evaluateComprehensionDiagnosticV1({ ...deps, store: makeStore('negative'), model: model(true) });
assert.equal(negative.correct, 0); assert.equal(calls, 8, 'wrong valid answers are retained without retry');
const group = manifest.groups[0], context = readCompleteOverallRulesContextV3(candidate), valid = output(group);
assert.throws(() => validateComprehensionDiagnosticAnswersV1({ answers: valid.answers.slice(1) }, { group, context }), { code: 'COMPREHENSION_DIAGNOSTIC_DENOMINATOR' });
const changed = fn => { const copy = structuredClone(valid); fn(copy); return copy; };
assert.throws(() => validateComprehensionDiagnosticAnswersV1(changed(c => { c.answers[0].claimIds = ['invented']; }), { group, context }), { code: 'COMPREHENSION_DIAGNOSTIC_CITATION_INVALID' });
assert.throws(() => validateComprehensionDiagnosticAnswersV1(changed(c => { c.answers[0].answer = 'true'; }), { group, context }), { code: 'COMPREHENSION_DIAGNOSTIC_ANSWER_INVALID' });
assert.throws(() => validateComprehensionDiagnosticAnswersV1(changed(c => { c.answers[0].id = c.answers[1].id; }), { group, context }), { code: 'COMPREHENSION_DIAGNOSTIC_ANSWER_INVALID' });
let malformedCalls = 0;
await assert.rejects(() => evaluateComprehensionDiagnosticV1({ ...deps, store: makeStore('malformed'), model: async () => {
  malformedCalls++; return { command: { action: 'finish', content: { answers: [] } }, receiptHash: hash('injected-malformed') };
} }), { code: 'COMPREHENSION_DIAGNOSTIC_DENOMINATOR' });
assert.equal(malformedCalls, 1);
for (const s of stores) s.close();
const files = ['packages/skill-evaluation/comprehension-diagnostic-v1.mjs', 'scripts/verify-ticket-18-comprehension-diagnostic-v1.mjs',
  'packages/skill-evaluation/overall-rules-package-v3.mjs', 'packages/skill-evaluation/production-drills-v1.mjs',
  'packages/skill-evaluation/semantic-drills.mjs', 'packages/skill-evaluation/supplemental-source-probes-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 12, diagnosticCases: manifest.cases, codeHashes, providerCalls: 0,
  injectedRuntimeOnly: true, actualSkillQualityProven: false, trainingTruth: false });
await writeFile(path.join(root, 'build/ticket-18-production-v3/comprehension-diagnostic-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 12, diagnosticCases: manifest.cases, providerCalls: 0, reportHash: report.hash }));
