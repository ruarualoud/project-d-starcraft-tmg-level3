import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectFactionConsumerReplayV1 } from '../packages/skill-evaluation/faction-consumer-evidence-v1.mjs';
import { evaluateFactionRosterUseV1 } from '../packages/skill-evaluation/faction-roster-use-evaluation-v1.mjs';
import { evaluateFactionRuleUseV1 } from '../packages/skill-evaluation/faction-rule-use-evaluation-v1.mjs';
import { createFactionRosterChoiceDrillsV1 } from '../packages/skill-evaluation/faction-roster-choice-drills-v1.mjs';
import { createFactionRuleApplicationDrillsV1 } from '../packages/skill-evaluation/faction-rule-application-drills-v1.mjs';
import { createFactionWritingPlanV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { loadFrozenSkillEvidence } from '../packages/skill-production/evidence.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { createAccountedModel } from '../packages/skill-production/model.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'build/ticket-18-faction-production-v1');
const json = async n => verifySeal(JSON.parse(await readFile(path.join(base, n + '.json'), 'utf8')));
const input = await json('terran_armed_forces-input'), knownRulePolicy = await json('terran_armed_forces-known-rule-policy');
const catalogue = await loadFrozenSkillEvidence(root);
const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const drills = await createFactionRosterChoiceDrillsV1({ catalogue, dataset });
const applicationDrills = await createFactionRuleApplicationDrillsV1({ catalogue });
const rosterProofs = drills.proof(), ruleProofs = applicationDrills.proof();
const expected = new Map(drills.list(input.factionRecordKey).map((q, n) => {
  const legal = rosterProofs[n].resolved.filter(r => r.outcome.eligibleWithinDeclaredChecks);
  const minimumVespene = Math.min(...legal.map(r => r.outcome.result.vespeneSpent));
  return [q.id, { id: q.id, minimumVespene, eligibleOptionIds: legal.map(r => r.optionId),
    minimumCostOptionIds: legal.filter(r => r.outcome.result.vespeneSpent === minimumVespene).map(r => r.optionId) }];
}));
applicationDrills.list(input.factionRecordKey).forEach((q, n) => expected.set(q.id,
  { id: q.id, answer: ruleProofs[n].independentlySpecifiedExpectation }));
const plan = createFactionWritingPlanV1(input);
const candidate = seal({ schema: 'starcraft_faction_strategy_candidate_v1', inputHash: input.hash, planHash: plan.hash,
  factionRecordKey: input.factionRecordKey, sourceBinding: input.sourceBinding, overallDependencyHash: input.overallDependencyHash,
  knownRulePolicyHash: knownRulePolicy.hash, semanticReviewPassed: true, runtimeAccepted: false, trainingTruth: false,
  sections: plan.sections.map(section => ({ section, semanticReviewPassed: true,
    draft: { recommendations: [{ title: 'Injected non-production fixture', when: ['Fixture condition'], procedure: ['Fixture action'],
      alternatives: ['Fixture alternative'], risk: 'Fixture risk', reviseIf: ['Fixture change'],
      unproven: ['No actual strategy evaluation'], sourceRefs: section.requiredSourceRefs }] } })), fixtureOnly: true });
const productionEvidence = seal({ runId: 'faction-v1-' + 'a'.repeat(20), candidateHash: candidate.hash,
  inputHash: input.hash, sourceReviewWorkflowRebuilt: true, fixtureOnly: true });
const temp = await mkdtemp(path.join(base, 'consumer-evidence-test-'));
const filename = path.join(temp, 'fixture.sqlite');
const reseal = (v, fields) => { const { hash: ignored, ...body } = v; return seal({ ...body, ...fields }); };
let injectedCalls = 0, checks = 0;
async function check(fn) { await fn(); checks++; }
async function fixture(negative) {
  const recipe = seal({ version: 'faction_consumer_evaluation_run_v2', sourceRunId: productionEvidence.runId,
    inputHash: input.hash, candidateHash: candidate.hash, productionEvidenceHash: productionEvidence.hash,
    knownRulePolicyHash: knownRulePolicy.hash, catalogueHash: input.catalogueHash, contextHash: input.frozenSources.hash,
    modelHash: hash('injected model profile'), drillManifestHash: drills.manifest.hash,
    applicationDrillManifestHash: applicationDrills.manifest.hash, applicationRepetitionsPerArm: 3,
    fullSourcesExposedToConsumer: false, productionDialogueExposedToConsumer: false, expectedAnswersExposed: false,
    sourceRefreshPerformed: false, trainingTruth: false, limits: { maxInputBytes: 1_000_000 }, fixtureOnly: true, negative });
  const runId = 'faction-consumer-' + recipe.hash.slice(0, 20);
  const store = openProductionStore(filename, { runId, recipeHash: recipe.hash });
  const model = createAccountedModel({ store, commandPolicy: 'finish_only', maxInputBytes: 1_000_000,
    complete: async request => {
      injectedCalls++;
      const content = request.promptNodes.find(n => n.type === 'actual_agent_conversation').value.messages[0].content;
      const payload = JSON.parse(content.slice(content.indexOf('\n') + 1));
      const predictions = payload.questions.map(q => structuredClone(expected.get(q.id)));
      if (negative && payload.faction && predictions[0].answer) predictions[0].answer.targetDestroyed = true;
      const output = { channels: { skill: { action: 'finish', content: { predictions } } } };
      const body = { schemaVersion: 'starcraft_tmg_provider_egress_transport_v1.success', providerProfileRef: { hash: recipe.modelHash },
        status: 200, physicalAttempts: 1, automaticRetries: 0, requestedModel: 'deepseek-v4-flash', reportedModel: 'deepseek-v4-flash',
        responseFingerprint: sha256(JSON.stringify(output)), usage: { inputUnits: 1000, outputUnits: 100, totalUnits: 1100 },
        fixtureRequestHash: hash(request), fixtureOnly: true };
      return { output, usageReceipt: { ...body, receiptHash: hash(body) } };
    } });
  const args = { input, candidate, knownRulePolicy, store, model };
  let evaluation, applicationEvaluation;
  try {
    evaluation = await evaluateFactionRosterUseV1({ ...args, drills });
    applicationEvaluation = await evaluateFactionRuleUseV1({ ...args, drills: applicationDrills });
  } finally { store.close(); }
  const report = seal({ runId, recipeHash: recipe.hash, resultHash: evaluation.hash,
    applicationResultHash: applicationEvaluation.hash, productionEvidenceHash: productionEvidence.hash,
    boundedRosterChoicePassed: evaluation.boundedRosterChoicePassed, boundedRuleApplicationPassed: applicationEvaluation.boundedRuleApplicationPassed,
    ruleApplicationSummary: applicationEvaluation.summary, independentlyHeldOutApplicationCases: 0,
    results: evaluation.results.map(r => ({ arm: r.arm, correct: r.correct, total: r.total })),
    actualRoomReplayPerformed: false, formalSkillsAccepted: 0, strategyStrengthProven: false, trainingTruth: false,
    failure: negative ? { code: 'FACTION_RULE_CONSUMER_BOUNDED_EVALUATION_FAILED' } : null });
  return { filename, runId, recipe, report, input, candidate, productionEvidence, knownRulePolicy, drills, applicationDrills, evaluation, applicationEvaluation };
}
const good = await fixture(false), bad = await fixture(true);
await check(async () => {
  const before = injectedCalls, evidence = await inspectFactionConsumerReplayV1(good);
  assert.equal(injectedCalls, before); assert.equal(evidence.rawAnswersRescored, 140);
  assert.equal(evidence.delivery.receiptHashes.length, 8); assert.equal(evidence.delivery.matchedStepIds.length, 8);
  assert(evidence.boundedRosterChoicePassed && evidence.boundedRuleApplicationPassed);
  assert(!evidence.strategyStrengthProven && !evidence.runtimeAccepted && !evidence.actualRoomReplayPerformed);
});
await check(async () => {
  const evidence = await inspectFactionConsumerReplayV1(bad);
  assert(!evidence.boundedRuleApplicationPassed); assert(evidence.boundedRosterChoicePassed);
  assert.deepEqual(evidence.ruleApplicationSummary.map(s => s.correct), [66, 63]);
});
for (const fields of [{ boundedRuleApplicationPassed: true }, { ruleApplicationSummary: good.report.ruleApplicationSummary },
  { strategyStrengthProven: true }, { formalSkillsAccepted: 1 }]) await check(() => assert.rejects(
    inspectFactionConsumerReplayV1({ ...bad, report: reseal(bad.report, fields) }), { code: 'FACTION_CONSUMER_EVIDENCE_SCORE_DRIFT' }));
await check(() => assert.rejects(inspectFactionConsumerReplayV1({ ...bad, report: reseal(bad.report, { failure: null }) }),
  { code: 'FACTION_CONSUMER_EVIDENCE_FAILURE_DRIFT' }));
await check(() => assert.rejects(inspectFactionConsumerReplayV1({ ...good,
  productionEvidence: reseal(productionEvidence, { candidateHash: hash('foreign') }) }), { code: 'FACTION_CONSUMER_EVIDENCE_BINDING_DRIFT' }));
await check(() => assert.rejects(inspectFactionConsumerReplayV1({ ...good, drills: { ...drills,
  list(faction) { return drills.list(faction).map((q, n) => n ? q : { ...q, input: { ...q.input, changed: 'request drift' } }); } } }),
  { code: 'READ_ONLY_REPLAY_STEP_INPUT_DRIFT' }));
// Tamper only with this test's temporary SQLite response, never production.
await check(async () => {
  const db = new DatabaseSync(filename);
  const row = db.prepare('SELECT id,response FROM attempts WHERE run=? ORDER BY id LIMIT 1').get(good.runId);
  const wrapped = verifySeal(JSON.parse(row.response));
  const changed = structuredClone(wrapped.value); changed.output.channels.skill.content.predictions[0].tampered = true;
  db.prepare('UPDATE attempts SET response=? WHERE run=? AND id=?').run(JSON.stringify(reseal(wrapped, { value: changed })), good.runId, row.id);
  try { await assert.rejects(inspectFactionConsumerReplayV1(good), { code: 'READ_ONLY_REPLAY_RECEIPT_INVALID' }); }
  finally { db.prepare('UPDATE attempts SET response=? WHERE run=? AND id=?').run(row.response, good.runId, row.id); db.close(); }
});
const files = ['packages/skill-evaluation/faction-consumer-evidence-v1.mjs',
  'scripts/inspect-ticket-18-faction-consumer-evidence-v1.mjs', 'scripts/verify-ticket-18-faction-consumer-evidence-v1.mjs',
  'packages/skill-evaluation/read-only-production-replay-v1.mjs', 'packages/skill-evaluation/faction-roster-use-evaluation-v1.mjs',
  'packages/skill-evaluation/faction-rule-use-evaluation-v1.mjs'];
const report = seal({ passed: true, checks, injectedCalls, fixtureOnly: true, actualSkillEvaluationPerformed: false,
  fullRequestsAndBothScoresRebuilt: true, negativeScoresAndFailurePreserved: true, tamperedResponseRejected: true,
  newProviderCalls: 0, productionJournalMutated: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) }))) });
await writeFile(path.join(base, 'consumer-evidence-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, injectedCalls, actualSkillEvaluationPerformed: false, newProviderCalls: 0, hash: report.hash }));
