import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { factionConsumerContextV1, evaluateFactionRosterUseV1 } from '../packages/skill-evaluation/faction-roster-use-evaluation-v1.mjs';
import { createFactionWritingPlanV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionRosterChoiceDrillsV1 } from '../packages/skill-evaluation/faction-roster-choice-drills-v1.mjs';
import { loadFrozenSkillEvidence } from '../packages/skill-production/evidence.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const names = ['terran_armed_forces', 'zerg_swarm'];
const json = async name => verifySeal(JSON.parse(await readFile(path.join(base, name + '.json'), 'utf8')));
const inputs = await Promise.all(names.map(n => json(n + '-input'))), policies = await Promise.all(names.map(n => json(n + '-known-rule-policy')));
const [catalogue, { dataset }] = await Promise.all([loadFrozenSkillEvidence(root), loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root })]);
const drills = await createFactionRosterChoiceDrillsV1({ catalogue, dataset }), proofs = drills.proof();
const allCases = inputs.flatMap(i => drills.list(i.factionRecordKey));
const expected = new Map(allCases.map((c, n) => {
  const legal = proofs[n].resolved.filter(r => r.outcome.eligibleWithinDeclaredChecks);
  const minimumVespene = Math.min(...legal.map(r => r.outcome.result.vespeneSpent));
  return [c.id, { id: c.id, eligibleOptionIds: legal.map(r => r.optionId),
    minimumCostOptionIds: legal.filter(r => r.outcome.result.vespeneSpent === minimumVespene).map(r => r.optionId), minimumVespene }];
}));
const candidates = inputs.map((input, n) => {
  const plan = createFactionWritingPlanV1(input);
  return seal({ schema: 'starcraft_faction_strategy_candidate_v1', inputHash: input.hash, planHash: plan.hash,
    factionRecordKey: input.factionRecordKey, sourceBinding: input.sourceBinding, overallDependencyHash: input.overallDependencyHash,
    knownRulePolicyHash: policies[n].hash, semanticReviewPassed: true, runtimeAccepted: false, trainingTruth: false,
    sections: plan.sections.map(section => ({ section, semanticReviewPassed: true,
      draft: { recommendations: [{ title: 'Injected engineering fixture, not actual Skill content', when: ['Injected condition'],
        procedure: ['Injected procedure'], alternatives: ['Injected alternative'], risk: 'Injected risk', reviseIf: ['Injected change'],
        unproven: ['All quality unproven'], sourceRefs: section.requiredSourceRefs }] } })),
    productionDialogue: 'MUST_NOT_REACH_CONSUMER', fixtureOnly: true });
});
const temp = await mkdtemp(path.join(base, 'consumer-evaluation-')), stores = [];
const makeStore = id => { const s = openProductionStore(path.join(temp, 'fixture.sqlite'), { runId: id, recipeHash: hash(id) }); stores.push(s); return s; };
let calls = 0;
function modelFor(mode) {
  return async ({ observed }) => {
    calls++; assert.deepEqual(observed.tools, []);
    const text = observed.messages[0].content, payload = JSON.parse(text.slice(text.indexOf('\n') + 1));
    assert(!text.includes('MUST_NOT_REACH_CONSUMER')); assert(!Object.hasOwn(payload, 'frozenSources'));
    assert.equal(payload.overall.skill.sections.flatMap(s => s.claims).length, 522);
    assert.equal(payload.questions.length, 4);
    assert(payload.questions.every(q => Object.keys(q).sort().join(',') === 'id,input' && !Object.hasOwn(q, 'expected')));
    if (mode === 'tool') return { command: { action: 'tool', name: 'invented' }, receiptHash: hash('injected') };
    const predictions = payload.questions.map(q => structuredClone(expected.get(q.id)));
    if (mode === 'regression' && payload.faction) predictions[0].minimumVespene++;
    if (mode === 'duplicate') predictions[1] = predictions[0];
    return { command: { action: 'finish', content: { predictions } }, receiptHash: hash({ injected: true, mode, predictions }) };
  };
}
try {
  for (const [n, input] of inputs.entries()) {
    const args = { input, candidate: candidates[n], knownRulePolicy: policies[n], drills, store: makeStore('positive-' + n), model: modelFor('positive') };
    const result = await evaluateFactionRosterUseV1(args);
    assert(result.boundedRosterChoicePassed); assert.equal(result.descriptiveCorrectDelta, 0);
    assert(!result.formalAcceptance && !result.runtimeAccepted && !result.actualRoomReplayPerformed && !result.strategyStrengthProven);
    assert.deepEqual(result.results[1].summary.map(s => s.total), n ? [0, 4] : [1, 3]);
    const before = calls; assert.equal((await evaluateFactionRosterUseV1(args)).hash, result.hash); assert.equal(calls, before);
  }
  const args = { input: inputs[0], candidate: candidates[0], knownRulePolicy: policies[0], drills };
  const bad = await evaluateFactionRosterUseV1({ ...args, store: makeStore('regression'), model: modelFor('regression') });
  assert(!bad.boundedRosterChoicePassed); assert.equal(bad.descriptiveCorrectDelta, -1);
  await assert.rejects(() => evaluateFactionRosterUseV1({ ...args, store: makeStore('duplicate'), model: modelFor('duplicate') }), { code: 'FACTION_CONSUMER_ANSWER_SCOPE' });
  await assert.rejects(() => evaluateFactionRosterUseV1({ ...args, store: makeStore('tool'), model: modelFor('tool') }), { code: 'FACTION_CONSUMER_TOOLS_FORBIDDEN' });
  const { hash: ignored, ...candidateBody } = candidates[0];
  assert.throws(() => factionConsumerContextV1({ ...args, candidate: seal({ ...candidateBody, semanticReviewPassed: false }) }), { code: 'FACTION_CONSUMER_CANDIDATE_NOT_READY' });
  assert.throws(() => factionConsumerContextV1({ ...args, candidate: seal({ ...candidateBody, inputHash: hash('drift') }) }), { code: 'FACTION_CONSUMER_CANDIDATE_NOT_READY' });
  const failed = structuredClone(candidateBody); failed.sections[0].draft.recommendations[0].procedure = [policies[0].sourceFindings[0].badText];
  assert.throws(() => factionConsumerContextV1({ ...args, candidate: seal(failed) }), { code: 'FACTION_KNOWN_RULE_FAILURE' });
  const actualDraft = verifySeal(JSON.parse(await readFile(path.join(base,
    'faction-v1-9d47758f9f7f7625a1af/first-repair-inspection.json'), 'utf8'))).after;
  const stale = structuredClone(candidateBody); stale.sections[0].draft = actualDraft;
  assert.throws(() => factionConsumerContextV1({ ...args, candidate: seal(stale) }), { code: 'FACTION_CONSUMER_KNOWN_SEMANTIC_DEBT' });
  const beforeDebt = calls;
  await assert.rejects(() => evaluateFactionRosterUseV1({ ...args, candidate: seal(stale), store: makeStore('actual-semantic-debt'),
    model: modelFor('positive') }), { code: 'FACTION_CONSUMER_KNOWN_SEMANTIC_DEBT' });
  assert.equal(calls, beforeDebt, 'Known real semantic debt is rejected before any consumer call');
} finally { stores.forEach(s => s.close()); }
const files = ['packages/skill-evaluation/faction-roster-use-evaluation-v1.mjs', 'packages/skill-evaluation/faction-roster-choice-drills-v1.mjs',
  'packages/skill-evaluation/faction-semantic-debt-v1.mjs',
  'packages/skill-production-v3/faction-strategy-workflow-v1.mjs', 'packages/skill-production-v3/faction-known-rule-findings-v1.mjs',
  'scripts/verify-ticket-18-faction-roster-use-evaluation-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 14, codeHashes, inputHashes: inputs.map(i => i.hash), drillManifestHash: drills.manifest.hash,
  fixtureOnly: true, injectedModelCalls: calls, providerCalls: 0, actualSkillQualityProven: false, trainingTruth: false });
await writeFile(path.join(base, 'consumer-evaluation-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 14, injectedModelCalls: calls, providerCalls: 0, hash: report.hash }));
