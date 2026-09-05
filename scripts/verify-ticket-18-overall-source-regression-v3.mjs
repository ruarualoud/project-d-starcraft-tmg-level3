import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createSourceAuditProbesV3 } from '../packages/skill-evaluation/source-audit-probes-v3.mjs';
import { evaluateOverallSourceRegressionV3 } from '../packages/skill-evaluation/evaluate-overall-source-regression-v3.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), out = path.join(root, 'build/ticket-18-production-v3');
const catalogue = await loadFrozenSkillEvidence(root), probes = createSourceAuditProbesV3({ catalogue, reader: createEvidenceReader(catalogue) });
// Deliberately synthetic package: tests data delivery, not actual Skill quality.
const candidate = seal({ schema: 'starcraft_overall_rules_candidate_v3', catalogueHash: catalogue.hash,
  sourceBinding: catalogue.sourceBinding, semanticPassed: true, trainingTruth: false,
  sections: Array.from({ length: 37 }, (_, i) => ({ id: 'injected-section-' + i, topics: ['fixture'],
    claims: [{ id: 'injected-claim-' + i, text: 'NOT A REAL GAME RULE: engineering payload ' + i }] })) });
const temp = await mkdtemp(path.join(out, 'overall-source-regression-test-'));
const makeStore = name => openProductionStore(path.join(temp, name + '.sqlite'), { runId: 'fixture-' + name, recipeHash: hash(name) });
const store = makeStore('pass'); let calls = 0;
const answers = { answers: probes.cases.map(c => ({ id: c.id, answer: c.expected })) };
const model = async ({ observed }) => {
  calls++; const task = observed.messages[0].content;
  assert.deepEqual(observed.tools, []); assert(!task.includes('"expected"')); assert(!task.includes('expectedBeforeAnswers'));
  const body = JSON.parse(task.slice(task.indexOf('\n') + 1));
  assert.equal(body.skill.sections.length, 37); assert.equal(body.skill.omittedClaims, 0);
  assert.equal(body.skill.sections.at(-1).claims[0].text, candidate.sections.at(-1).claims[0].text);
  assert.equal(body.questions.length, 14);
  return { command: { action: 'finish', content: answers }, receiptHash: hash('injected') };
};
const result = await evaluateOverallSourceRegressionV3({ candidate, probes, store, model });
assert(result.passed); assert.equal(result.correct, 14); assert.equal(result.fullSkillSections, 37);
await evaluateOverallSourceRegressionV3({ candidate, probes, store, model }); assert.equal(calls, 1);
const wrongStore = makeStore('wrong'); let wrongCalls = 0;
const wrong = await evaluateOverallSourceRegressionV3({ candidate, probes, store: wrongStore, model: async () => {
  wrongCalls++; return { command: { action: 'finish', content: { answers: answers.answers.map((r, i) => i ? r : { ...r, answer: true }) } }, receiptHash: hash('wrong') };
} });
assert(!wrong.passed); assert.equal(wrong.correct, 13); assert.equal(wrongCalls, 1);
const malformedStore = makeStore('malformed'); let malformedCalls = 0;
await assert.rejects(evaluateOverallSourceRegressionV3({ candidate, probes, store: malformedStore, model: async () => {
  malformedCalls++; return { command: { action: 'finish', content: { answers: [] } }, receiptHash: hash('malformed') };
} }), { code: 'AUDIT_PROBE_DENOMINATOR_INVALID' });
assert.equal(malformedCalls, 2);
const { hash: originalHash, ...body } = candidate;
await assert.rejects(evaluateOverallSourceRegressionV3({ candidate: seal({ ...body, catalogueHash: hash('other') }), probes, store, model }), { code: 'OVERALL_SOURCE_REGRESSION_DRIFT' });
for (const s of [store, wrongStore, malformedStore]) s.close();
const files = ['packages/skill-evaluation/evaluate-overall-source-regression-v3.mjs', 'packages/skill-evaluation/source-audit-probes-v3.mjs',
  'packages/skill-evaluation/overall-rules-package-v3.mjs', 'scripts/verify-ticket-18-overall-source-regression-v3.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 6, probesHash: probes.hash, codeHashes, injectedOnly: true,
  fullSections: 37, regressionCases: 14, actualModelQualityProven: false, providerCalls: 0, trainingTruth: false });
await writeFile(path.join(out, 'overall-source-regression-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 6, fullSections: 37, regressionCases: 14, injectedOnly: true, providerCalls: 0, hash: report.hash }));
