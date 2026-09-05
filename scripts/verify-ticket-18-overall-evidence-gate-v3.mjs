import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createMechanicsVerifier } from '../packages/skill-production/mechanics.mjs';
import { createProductionDrills } from '../packages/skill-evaluation/production-drills-v1.mjs';
import { createSemanticDrills } from '../packages/skill-evaluation/semantic-drills.mjs';
import { createSourceAuditProbesV3 } from '../packages/skill-evaluation/source-audit-probes-v3.mjs';
import { evaluateOverallRulesCandidate } from '../packages/skill-evaluation/evaluate-overall-rules-v2.mjs';
import { evaluateOverallSourceRegressionV3 } from '../packages/skill-evaluation/evaluate-overall-source-regression-v3.mjs';
import { inspectOverallExamsV3 } from '../packages/skill-production-v3/overall-evidence-gate.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, hash, sha256, verifySeal } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogue = await loadFrozenSkillEvidence(root), drills = await createProductionDrills(catalogue);
const verifier = await createMechanicsVerifier(catalogue), legacyDrills = createSemanticDrills(verifier);
const probes = createSourceAuditProbesV3({ catalogue, reader: createEvidenceReader(catalogue) });
const candidate = seal({ schema: 'starcraft_overall_rules_candidate_v3', catalogueHash: catalogue.hash,
  sourceBinding: catalogue.sourceBinding, semanticPassed: true, candidateOnly: true, published: false,
  runtimeAccepted: false, trainingTruth: false, sections: Array.from({ length: 37 }, (_, i) => ({
    id: 'injected-' + i, topics: ['engineering fixture'], claims: [{ id: 'claim-' + i, text: 'SYNTHETIC; NOT A RULE ' + i }] })) });
const temp = await mkdtemp(path.join(root, 'build/ticket-18-production-v3/overall-evidence-gate-test-'));
const profileHash = hash('INJECTED PROFILE ONLY'), expected = new Map(drills.proof().map(r => [r.id, r.expected]));
function predictions(kind, group) {
  if (kind === 'fresh') return drills.list(group).map(c => ({ id: c.id, answer: expected.get(c.id) }));
  return legacyDrills.list(group).map(c => {
    const observed = verifier.run(c.id, { allowHeldout: true }).observed;
    return { id: c.id, values: Object.fromEntries(legacyDrills.manifest.questions[group].map(q => {
      const raw = q.field.split('.').reduce((v, key) => v[key], observed); return [q.key, q.invert ? !raw : raw];
    })) };
  });
}
async function fixture(name, wrong = false) {
  const filename = path.join(temp, name + '.sqlite'), store = openProductionStore(filename, { runId: 'fixture-' + name, recipeHash: hash(name) });
  const receipts = new Map(); let calls = 0;
  const model = async request => {
    calls++; let content;
    if (request.stageId.startsWith('overall-source-regression')) content = { answers: probes.cases.map(c => ({ id: c.id, answer: c.expected })) };
    else {
      const [, kind, group] = request.stageId.split('.'); content = { predictions: predictions(kind, group) };
      if (wrong && kind === 'fresh' && group === 'clearance') content.predictions[0].answer = !content.predictions[0].answer;
    }
    const command = { action: 'finish', content }, output = { channels: { skill: command } };
    const body = { schemaVersion: 'starcraft_tmg_provider_egress_transport_v1.success', providerProfileRef: { hash: profileHash },
      physicalAttempts: 1, automaticRetries: 0, status: 200, responseFingerprint: sha256(JSON.stringify(output)),
      injectedOnly: true, fixtureId: request.stageId };
    const receiptHash = hash(body); receipts.set(receiptHash, { output, usageReceipt: { ...body, receiptHash } });
    return { command, receiptHash };
  };
  const exam = await evaluateOverallRulesCandidate({ candidate, drills, legacyDrills, store, model });
  const regression = await evaluateOverallSourceRegressionV3({ candidate, probes, store, model });
  store.close();
  const db = new DatabaseSync(filename, { readOnly: true });
  const rows = new Map(db.prepare('SELECT id,input_hash,artifact FROM steps').all().map(row => [row.id, {
    inputHash: row.input_hash, value: verifySeal(JSON.parse(row.artifact)).value }])); db.close();
  return { exam, regression, calls, receipts, readStep: id => rows.get(id), readReceipt: h => receipts.get(h) };
}
const good = await fixture('good'), deps = { ...good, candidate, drills, legacyDrills, probes, providerProfileHash: profileHash };
const inspected = inspectOverallExamsV3(deps);
assert.equal(good.calls, 16); assert.equal(inspected.providerReceiptHashes.length, 16);
assert.deepEqual(inspected.summaries, [{ kind: 'fresh', cases: 69, correct: 69 }, { kind: 'legacy_regression', cases: 36, correct: 36 }]);
assert.equal(inspected.sourceCases, 14); assert(!inspected.runtimeAccepted && !inspected.strategyEffectivenessProven);
assert.equal(inspectOverallExamsV3(deps).hash, inspected.hash);
const reseal = (value, edit) => { const copy = structuredClone(value); delete copy.hash; edit(copy); return seal(copy); };
assert.throws(() => inspectOverallExamsV3({ ...deps, providerProfileHash: hash('different model') }), { code: 'OVERALL_EVIDENCE_RECEIPT_INVALID' });
assert.throws(() => inspectOverallExamsV3({ ...deps, readReceipt: () => null }), { code: 'OVERALL_EVIDENCE_RECEIPT_MISSING' });
assert.throws(() => inspectOverallExamsV3({ ...deps, readReceipt: h => {
  const r = structuredClone(good.readReceipt(h)); r.output.channels.skill.content.predictions[0].answer = 'tampered'; return r;
} }), { code: 'OVERALL_EVIDENCE_RECEIPT_INVALID' });
assert.throws(() => inspectOverallExamsV3({ ...deps, readStep: id => ({ ...good.readStep(id), inputHash: hash('wrong input') }) }), { code: 'OVERALL_EVIDENCE_STEP_INVALID' });
assert.throws(() => inspectOverallExamsV3({ ...deps, exam: reseal(good.exam, r => { r.results.pop(); }) }), { code: 'OVERALL_EVIDENCE_GROUP_DENOMINATOR' });
assert.throws(() => inspectOverallExamsV3({ ...deps, exam: reseal(good.exam, r => { r.summary[0].correct++; }) }), { code: 'OVERALL_EVIDENCE_EXAM_INVALID' });
const forgedResult = reseal(good.exam.results[0], r => { r.correct--; });
const forgedExam = reseal(good.exam, r => { r.results[0] = forgedResult; });
assert.throws(() => inspectOverallExamsV3({ ...deps, exam: forgedExam, readStep: id => {
  const row = good.readStep(id); return id === 'overall-evaluation.fresh.clearance' ? { ...row, value: forgedResult } : row;
} }), { code: 'OVERALL_EVIDENCE_SCORE_INVALID' });
const forgedRegression = reseal(good.regression, r => { r.correct--; });
assert.throws(() => inspectOverallExamsV3({ ...deps, regression: forgedRegression, readStep: id => {
  const row = good.readStep(id); return id === 'overall-source-regression' ? { ...row, value: forgedRegression } : row;
} }), { code: 'OVERALL_EVIDENCE_SOURCE_REGRESSION_INVALID' });
const wrong = await fixture('wrong', true);
assert.equal(wrong.exam.summary[0].correct, 68); assert.equal(wrong.calls, 16);
assert.throws(() => inspectOverallExamsV3({ ...deps, ...wrong }), { code: 'OVERALL_EVIDENCE_QUALITY_NOT_PASSED' });
const negativeInspection = inspectOverallExamsV3({ ...deps, ...wrong, requirePassing: false });
assert(negativeInspection.diagnosticOnly && !negativeInspection.qualityPassed && !negativeInspection.runtimeAccepted);
assert.equal(negativeInspection.summaries[0].correct, 68);
assert.throws(() => inspectOverallExamsV3({ ...deps, requirePassing: 'false' }), { code: 'OVERALL_EVIDENCE_PURPOSE_INVALID' });
assert.throws(() => inspectOverallExamsV3({ ...deps, candidate: reseal(candidate, r => { r.runtimeAccepted = true; }) }), { code: 'OVERALL_EVIDENCE_BINDING_INVALID' });
const files = ['packages/skill-production-v3/overall-evidence-gate.mjs', 'scripts/verify-ticket-18-overall-evidence-gate-v3.mjs',
  'packages/skill-production-v3/external-findings.mjs',
  'packages/skill-evaluation/evaluate-overall-rules-v2.mjs', 'packages/skill-evaluation/evaluate-overall-source-regression-v3.mjs',
  'packages/skill-evaluation/overall-rules-package-v3.mjs', 'packages/skill-evaluation/production-drills-v1.mjs',
  'packages/skill-evaluation/semantic-drills.mjs', 'packages/skill-evaluation/source-audit-probes-v3.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 12, codeHashes, examCases: 105, sourceCases: 14,
  injectedProviderReceiptsOnly: true, actualProviderCalls: 0, actualSkillQualityProven: false, trainingTruth: false });
await writeFile(path.join(root, 'build/ticket-18-production-v3/overall-evidence-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 12, reportHash: report.hash, actualProviderCalls: 0,
  injectedEvidenceOnly: true, formalSkillsAccepted: 0 }));
