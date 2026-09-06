import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence } from '../packages/skill-production/evidence.mjs';
import { createFactionRuleApplicationDrillsV1 } from '../packages/skill-evaluation/faction-rule-application-drills-v1.mjs';
import { hash, seal, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogue = await loadFrozenSkillEvidence(root), drills = await createFactionRuleApplicationDrillsV1({ catalogue });
const questions = drills.list('tactical_cards:terran_armed_forces'), proofs = drills.proof();
let checks = 0;
function check(name, run) { run(); checks++; }
check('fixed source-calibrated denominator', () => {
  assert.equal(questions.length, 22); assert.deepEqual(drills.manifest.groups, ['damage_timing', 'reaction_cap', 'active_named_limit']);
  assert.deepEqual(questions, drills.list('tactical_cards:zerg_swarm'));
  assert.equal(drills.manifest.independentlyHeldOutCases, 0); assert(!drills.manifest.suppliedToProduction);
});
check('all independent expectations agree with real repeated kernels', () => {
  assert.equal(proofs.length, 22);
  questions.forEach((q, n) => assert(drills.verify({ id: q.id, answer: proofs[n].independentlySpecifiedExpectation }).passed));
});
check('answer keys and source proofs absent from consumer questions', () => {
  for (const q of questions) assert.deepEqual(Object.keys(q).sort(), ['answerShape', 'group', 'id', 'input', 'novelty', 'question']);
});
check('non-lethal equality and exceed-HP never remove a model', () => {
  for (const prior of [0, 1, 3]) {
    const q = questions.find(row => row.id.endsWith('non_lethal_only.' + prior));
    assert(drills.verify({ id: q.id, answer: { targetDestroyed: false, postDamageMarker: prior + 2, casualtyCount: 0 } }).passed);
    assert(!drills.verify({ id: q.id, answer: { targetDestroyed: true, postDamageMarker: 0, casualtyCount: 1 } }).passed);
  }
});
check('later positive standard damage uses accumulated markers', () => {
  for (const prior of [0, 1, 3]) {
    const index = questions.findIndex(row => row.id.endsWith('non_lethal_then_standard.' + prior));
    assert.equal(proofs[index].observed.steps.length, 2);
    assert.equal(proofs[index].observed.steps[1].priorDamageMarker, prior + 2);
    assert.equal(proofs[index].observed.steps[1].totalDamage, prior + 3);
    assert(drills.verify({ id: questions[index].id, answer: { targetDestroyed: true, postDamageMarker: 0, casualtyCount: 1 } }).passed);
  }
});
check('ordinary low damage remains alive and exact HP removes', () => {
  const low = questions.find(row => row.id.endsWith('ordinary_below_hp_control'));
  assert(drills.verify({ id: low.id, answer: { targetDestroyed: false, postDamageMarker: 1, casualtyCount: 0 } }).passed);
  const exact = questions.find(row => row.id.endsWith('ordinary_lethal_control'));
  assert(drills.verify({ id: exact.id, answer: { targetDestroyed: true, postDamageMarker: 0, casualtyCount: 1 } }).passed);
});
check('Reaction cap switches between activation and trigger, balanced outcomes', () => {
  const rows = questions.map((q, n) => ({ q, p: proofs[n] })).filter(({ q }) => q.group === 'reaction_cap');
  assert.equal(rows.filter(({ p }) => p.independentlySpecifiedExpectation.legalWithinNamedLimit).length, 4);
  for (const { q, p } of rows) assert(!drills.verify({ id: q.id, answer: { legalWithinNamedLimit: !p.independentlySpecifiedExpectation.legalWithinNamedLimit } }).passed);
});
check('Active paid/name/repeatability limits are independent of Reaction history', () => {
  const rows = questions.map((q, n) => ({ q, p: proofs[n] })).filter(({ q }) => q.group === 'active_named_limit');
  assert.equal(rows.filter(({ p }) => p.independentlySpecifiedExpectation.legalWithinNamedLimit).length, 3);
});
const first = { id: questions[0].id, answer: proofs[0].independentlySpecifiedExpectation };
check('unknown question rejected', () => assert.throws(() => drills.verify({ ...first, id: 'unknown' }), { code: 'FACTION_APPLICATION_CASE_UNKNOWN' }));
check('numeric-string and authority fields rejected', () => {
  assert.throws(() => drills.verify({ ...first, answer: { ...first.answer, postDamageMarker: '2' } }), { code: 'FACTION_APPLICATION_ANSWER_INVALID' });
  assert.throws(() => drills.verify({ ...first, answer: { ...first.answer, trainingTruth: true } }), { code: 'FACTION_APPLICATION_ANSWER_INVALID' });
});
check('unknown faction rejected', () => assert.throws(() => drills.list('tactical_cards:other'), { code: 'FACTION_APPLICATION_FACTION_UNKNOWN' }));
check('returned inputs/proofs cannot mutate oracle', () => {
  const altered = drills.list('tactical_cards:terran_armed_forces'); altered[0].input.targetHitPoints = 99;
  const alteredProof = drills.proof(); alteredProof[0].independentlySpecifiedExpectation.targetDestroyed = true;
  assert(drills.verify(first).passed); assert.equal(drills.list('tactical_cards:terran_armed_forces')[0].input.targetHitPoints, 2);
});
const reseal = (value, changes) => { const { hash: ignored, ...body } = value; return seal({ ...body, ...changes }); };
const changedSource = reseal(catalogue, { rows: catalogue.rows.map(row => row.id.endsWith('subItems.47')
  ? reseal(row, { text: row.text.replace('Do not remove any models', 'Remove models') }) : row) });
await assert.rejects(() => createFactionRuleApplicationDrillsV1({ catalogue: changedSource }), { code: 'FACTION_APPLICATION_SOURCE_CALIBRATION_DRIFT' }); checks++;
const changedBinding = reseal(catalogue, { sourceBinding: { ...catalogue.sourceBinding, rules: hash('different') } });
await assert.rejects(() => createFactionRuleApplicationDrillsV1({ catalogue: changedBinding }), { code: 'FACTION_APPLICATION_SOURCE_UNAVAILABLE' }); checks++;
const files = ['packages/skill-evaluation/faction-rule-application-drills-v1.mjs', 'scripts/verify-ticket-18-faction-rule-application-drills-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks, codeHashes, manifest: drills.manifest, kernelProofs: proofs, questions,
  actualProviderCalls: 0, actualSkillPerformanceEvaluated: false, sourceRefreshPerformed: false, trainingTruth: false });
const out = path.join(root, 'build/ticket-18-faction-production-v1'); await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'rule-application-drill-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, cases: questions.length, hash: report.hash, providerCalls: 0 }));
