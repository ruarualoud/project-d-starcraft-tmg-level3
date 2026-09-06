import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateFactionRuleUseV1 } from '../packages/skill-evaluation/faction-rule-use-evaluation-v1.mjs';
import { createFactionRuleApplicationDrillsV1 } from '../packages/skill-evaluation/faction-rule-application-drills-v1.mjs';
import { createFactionWritingPlanV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { loadFrozenSkillEvidence } from '../packages/skill-production/evidence.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const json = async n => verifySeal(JSON.parse(await readFile(path.join(base, n + '.json'), 'utf8')));
const names = ['terran_armed_forces', 'zerg_swarm'];
const inputs = await Promise.all(names.map(n => json(n + '-input'))), policies = await Promise.all(names.map(n => json(n + '-known-rule-policy')));
const catalogue = await loadFrozenSkillEvidence(root), drills = await createFactionRuleApplicationDrillsV1({ catalogue });
const questions = drills.list(inputs[0].factionRecordKey), proofs = drills.proof();
const expected = new Map(questions.map((q, n) => [q.id, { id: q.id, answer: proofs[n].independentlySpecifiedExpectation }]));
const candidates = inputs.map((input, n) => {
  const plan = createFactionWritingPlanV1(input);
  return seal({ schema: 'starcraft_faction_strategy_candidate_v1', inputHash: input.hash, planHash: plan.hash,
    factionRecordKey: input.factionRecordKey, sourceBinding: input.sourceBinding, overallDependencyHash: input.overallDependencyHash,
    knownRulePolicyHash: policies[n].hash, semanticReviewPassed: true, runtimeAccepted: false, trainingTruth: false,
    sections: plan.sections.map(section => ({ section, semanticReviewPassed: true,
      draft: { recommendations: [{ title: 'Injected engineering fixture only', when: ['Injected condition'], procedure: ['Injected step'],
        alternatives: ['Injected alternative'], risk: 'Injected risk', reviseIf: ['Injected change'],
        unproven: ['Quality unproven'], sourceRefs: section.requiredSourceRefs }] } })),
    productionDialogue: 'PRODUCTION_HISTORY_MUST_NOT_REACH_CONSUMER', fixtureOnly: true });
});
const temp = await mkdtemp(path.join(base, 'rule-consumer-test-')), stores = [];
const makeStore = id => { const s = openProductionStore(path.join(temp, 'fixture.sqlite'), { runId: id, recipeHash: hash(id) }); stores.push(s); return s; };
let calls = 0, checks = 0, maxTaskBytes = 0;
const check = async (name, fn) => { await fn(); checks++; };
function modelFor(mode) {
  let stopOnce = mode === 'resume';
  return async ({ observed, stageId }) => {
    if (stopOnce && stageId.endsWith('overall_plus_faction.repeat-0')) { stopOnce = false; fail('INJECTED_BEFORE_PROVIDER'); }
    calls++; assert.deepEqual(observed.tools, []); assert.equal(observed.messages.length, 1);
    const text = observed.messages[0].content, payload = JSON.parse(text.slice(text.indexOf('\n') + 1));
    maxTaskBytes = Math.max(maxTaskBytes, Buffer.byteLength(text));
    assert(!text.includes('PRODUCTION_HISTORY_MUST_NOT_REACH_CONSUMER'));
    assert.deepEqual(Object.keys(payload).sort(), (payload.faction ? ['faction', 'overall', 'questions'] : ['overall', 'questions']));
    assert.equal(payload.overall.skill.sections.flatMap(s => s.claims).length, 522); assert.equal(payload.questions.length, 22);
    for (const q of payload.questions) assert.deepEqual(Object.keys(q).sort(), ['answerShape', 'id', 'input', 'question']);
    if (mode === 'tool') return { command: { action: 'tool', name: 'forbidden' }, receiptHash: hash('fixture') };
    const predictions = payload.questions.map(q => structuredClone(expected.get(q.id)));
    if (mode === 'regression' && payload.faction) predictions[0].answer.targetDestroyed = true;
    if (mode === 'duplicate') predictions[1] = predictions[0];
    if (mode === 'authority') predictions[0].answer.trainingTruth = true;
    return { command: { action: 'finish', content: { predictions } }, receiptHash: hash({ fixture: true, stageId, predictions }) };
  };
}
try {
  for (const [n, input] of inputs.entries()) await check('full-context repeated consumer and exact cached resume ' + n, async () => {
    const args = { input, candidate: candidates[n], knownRulePolicy: policies[n], drills, store: makeStore('positive-' + n), model: modelFor('positive') };
    const before = calls, result = await evaluateFactionRuleUseV1(args);
    assert.equal(calls - before, 6); assert(result.boundedRuleApplicationPassed); assert.equal(result.descriptiveCorrectDelta, 0);
    assert.deepEqual(result.summary.map(row => [row.total, row.correct]), [[66, 66], [66, 66]]);
    assert.deepEqual(result.summary[1].groups.map(g => g.total), [24, 24, 18]);
    assert.equal(new Set(result.results.map(row => row.receiptHash)).size, 6);
    assert.equal(result.independentlyHeldOutCases, 0);
    assert(!result.runtimeAccepted && !result.formalAcceptance && !result.actualRoomReplayPerformed && !result.strategyStrengthProven);
    assert.equal((await evaluateFactionRuleUseV1(args)).hash, result.hash); assert.equal(calls - before, 6);
  });
  const args = { input: inputs[0], candidate: candidates[0], knownRulePolicy: policies[0], drills };
  await check('wrong augmented answer remains a repeated failure', async () => {
    const result = await evaluateFactionRuleUseV1({ ...args, store: makeStore('regression'), model: modelFor('regression') });
    assert(!result.boundedRuleApplicationPassed); assert.equal(result.descriptiveCorrectDelta, -3);
    assert.equal(result.summary[1].correct, 63);
  });
  for (const [mode, code] of [['duplicate', 'FACTION_RULE_CONSUMER_ANSWER_SCOPE'], ['authority', 'FACTION_APPLICATION_ANSWER_INVALID'],
    ['tool', 'FACTION_RULE_CONSUMER_TOOLS_FORBIDDEN']]) await check('reject ' + mode, () =>
    assert.rejects(evaluateFactionRuleUseV1({ ...args, store: makeStore(mode), model: modelFor(mode) }), { code }));
  await check('mid-evaluation resume preserves all three completed baseline calls', async () => {
    const params = { ...args, store: makeStore('resume'), model: modelFor('resume') }, before = calls;
    await assert.rejects(evaluateFactionRuleUseV1(params), { code: 'INJECTED_BEFORE_PROVIDER' }); assert.equal(calls - before, 3);
    const result = await evaluateFactionRuleUseV1(params); assert(result.boundedRuleApplicationPassed); assert.equal(calls - before, 6);
  });
  const reseal = (value, fields) => { const { hash: ignored, ...body } = value; return seal({ ...body, ...fields }); };
  await check('unfinished candidate never reaches a consumer', async () => {
    const before = calls;
    await assert.rejects(evaluateFactionRuleUseV1({ ...args, candidate: reseal(candidates[0], { semanticReviewPassed: false }),
      store: makeStore('unfinished'), model: modelFor('positive') }), { code: 'FACTION_CONSUMER_CANDIDATE_NOT_READY' }); assert.equal(calls, before);
  });
  await check('changed source manifest rejected before calls', async () => {
    const before = calls;
    await assert.rejects(evaluateFactionRuleUseV1({ ...args, drills: { ...drills, manifest: reseal(drills.manifest, { catalogueHash: hash('foreign') }) },
      store: makeStore('source-drift'), model: modelFor('positive') }), { code: 'FACTION_RULE_CONSUMER_DRILL_SOURCE_DRIFT' }); assert.equal(calls, before);
  });
  await check('actual independently observed phase debt vetoes supported model flags', async () => {
    const capture = await json('phase-repair-bd58d5270d852324f694/source-capture');
    const stale = reseal(candidates[0], { sections: candidates[0].sections.map(s => s.section.id === capture.request.workspace.section.id
      ? { ...s, draft: capture.request.workspace.draft } : s) });
    const before = calls;
    await assert.rejects(evaluateFactionRuleUseV1({ ...args, candidate: stale, store: makeStore('known-phase-debt'), model: modelFor('positive') }),
      { code: 'FACTION_CANDIDATE_PHASE_SOURCE_DEBT' }); assert.equal(calls, before);
  });
} finally { stores.forEach(store => store.close()); }
const files = ['packages/skill-evaluation/faction-rule-use-evaluation-v1.mjs', 'packages/skill-evaluation/faction-rule-application-drills-v1.mjs',
  'packages/skill-evaluation/faction-roster-use-evaluation-v1.mjs', 'packages/skill-evaluation/faction-phase-source-debt-v1.mjs',
  'packages/skill-evaluation/faction-cross-field-source-audit-v1.mjs', 'packages/skill-evaluation/faction-unit-role-debt-v1.mjs',
  'scripts/verify-ticket-18-faction-rule-use-evaluation-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks, codeHashes, inputHashes: inputs.map(input => input.hash), drillManifestHash: drills.manifest.hash,
  questions: 22, repetitionsPerArm: 3, actualDshSessions: 0, injectedModelCalls: calls, maxTaskBytes,
  fullOverallAndFactionRetained: true, answerKeysAbsentFromPrompts: true, midEvaluationResumeWithoutRepeatedCalls: true,
  actualSkillEvaluationPerformed: false, providerCalls: 0, trainingTruth: false });
await writeFile(path.join(base, 'rule-use-evaluation-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, questions: 22, injectedModelCalls: calls, maxTaskBytes, providerCalls: 0, hash: report.hash }));
