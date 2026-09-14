import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { FACTION_OBSERVED_SOURCE_REPAIR_BINDING_V1 as binding,
  correctObservedFactionReasonerSourceFactsV1 } from '../packages/skill-production-v3/faction-observed-source-repair-v1.mjs';
const base = 'build/ticket-18-faction-production-v1/', read = async file => verifySeal(JSON.parse(await readFile(base + file, 'utf8')));
const input = await read('zerg_swarm-input.json'), diagnosis = await read('native-output-capacity-diagnosis.json');
const calibrated = await read('observed-roster-facts-readiness.json');
assert.equal(calibrated.passed, true);
const w = diagnosis.request.workspace, args = { input, section: w.section, questions: w.questions,
  answers: w.answers, judge: w.judge, facts: calibrated.zerg, binding };
const original = hash(w.answers), correction = correctObservedFactionReasonerSourceFactsV1(args);
assert.equal(hash(w.answers), original); assert.equal(correction.changes.length, 7);
assert.deepEqual(correction.correctedAnswers.uncertainties, w.answers.uncertainties);
let checks = 4;
for (const index of [1, 3, 4]) {
  assert.deepEqual(correction.correctedAnswers.answers[index], w.answers.answers[index]); checks++;
}
assert.equal(correction.correctedAnswers.answers[0].sourceRefs.length, 8); checks++;
assert.ok(correction.correctedAnswers.answers[5].sourceRefs.includes('source:tactical_cards:zerg_swarm')); checks++;
assert.ok(correction.correctedAnswers.answers[2].answer.includes('并非Lair更便宜')); checks++;
assert.ok(correction.correctedAnswers.answers[5].answer.includes('剩余0 Elite')); checks++;
assert.ok(correction.correctedAnswers.answers[5].answer.includes('不能据此将Lair变成必选')); checks++;
assert.equal(correction.freshWholeAnswerJudgeRequired, true); checks++;
assert.equal(correction.completeSemanticCorrectnessProven, false); checks++;
for (const field of ['answers', 'questions', 'judge']) {
  const changed = structuredClone(args[field]);
  if (field === 'answers') changed.answers[1].answer += ' changed';
  else if (field === 'questions') changed[0].question += ' changed';
  else changed.judgments[0].verdict = 'unsupported';
  assert.throws(() => correctObservedFactionReasonerSourceFactsV1({ ...args, [field]: changed }),
    { code: 'FACTION_OBSERVED_SOURCE_REPAIR_NEEDS_NEW_ADJUDICATION' }); checks++;
}
const { hash: ignored, ...badFacts } = structuredClone(calibrated.zerg);
badFacts.cases.find(c => c.id === 'hydra_lair').outcome.slots.unusedArmySlots.Elite = 1;
assert.throws(() => correctObservedFactionReasonerSourceFactsV1({ ...args, facts: seal(badFacts) }),
  { code: 'FACTION_OBSERVED_SOURCE_REPAIR_FACT_DRIFT' }); checks++;
const report = seal({ passed: true, checks, binding, correction, actualSourceAnswersHash: original,
  factReadinessHash: calibrated.hash, providerCalls: 0, productionApplied: false,
  freshJudgeExecuted: false, trainingTruth: false,
  codeHashes: await Promise.all(['packages/skill-production-v3/faction-observed-source-repair-v1.mjs',
    'scripts/verify-ticket-18-faction-observed-source-repair-v1.mjs'].map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'observed-source-repair-unit-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualRulesCases: 9, changedAnswerIndices: [0, 2, 5],
  providerCalls: 0, freshJudgeExecuted: false, hash: report.hash }));
