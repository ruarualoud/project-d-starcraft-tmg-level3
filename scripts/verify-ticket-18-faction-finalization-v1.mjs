import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
import { createFactionWritingPlanV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { bindFactionGeneralDependencyV1 } from '../packages/strategy-skills/faction-general-dependency-v1.mjs';
import { finalizeFactionSkillV1, renderFinalFactionSkillV1 } from '../packages/strategy-skills/faction-skill-finalization-v1.mjs';
import { factionConsumerContextV1 } from '../packages/skill-evaluation/faction-roster-use-evaluation-v1.mjs';
import { FACTION_DRAFT_ENVELOPE_BINDING_V2 as draftEnvelopeBinding } from '../packages/skill-production-v3/faction-draft-envelope-v2.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'build/ticket-18-faction-production-v1');
const generalBase = path.join(root, 'build/ticket-18-general-strategy-live-v1/general-strategy-3705e4aa46ecd74a7826207a67b5b096/general-strategy-final-v1');
const json = async (dir, name) => verifySeal(JSON.parse(await readFile(path.join(dir, name + '.json'), 'utf8')));
const generalSkill = await json(generalBase, 'final-general-skill');
const generalLayer = await json(generalBase, 'final-general-strategy-layer');
const actualBoundary = await json(base, 'editor-envelope-boundary-diagnosis-v2');
const reseal = (value, delta) => { const { hash: ignored, ...body } = value; return seal({ ...body, ...delta }); };
let checks = 0;
for (const name of ['terran_armed_forces', 'zerg_swarm']) {
  const input = await json(base, name + '-input'), knownRulePolicy = await json(base, name + '-known-rule-policy');
  const plan = createFactionWritingPlanV1(input);
  const finalGeneral = bindFactionGeneralDependencyV1({ input, generalSkill, generalLayer });
  // Injected evidence tests host contracts only. These are never production artifacts.
  const candidate = seal({ schema: 'starcraft_faction_strategy_candidate_v1', inputHash: input.hash,
    planHash: plan.hash, factionRecordKey: input.factionRecordKey, sourceBinding: input.sourceBinding,
    overallDependencyHash: input.overallDependencyHash, knownRulePolicyHash: knownRulePolicy.hash,
    semanticReviewPassed: true, runtimeAccepted: false, trainingTruth: false, fixtureOnly: true,
    sections: plan.sections.map(section => ({ section, semanticReviewPassed: true,
      rounds: [{ issues: { openIssues: 0 } }], draft: { recommendations: [{
        title: 'Injected engineering fixture — ' + section.id, when: ['Injected conditional situation'],
        procedure: ['Injected procedure'], alternatives: ['Injected alternative'], risk: 'Unproven injected risk',
        reviseIf: ['Injected condition changes'], unproven: ['All content quality unproven'], sourceRefs: section.requiredSourceRefs,
      }] } })) });
  const productionEvidence = seal({ candidateHash: candidate.hash, inputHash: input.hash,
    sourceReviewWorkflowRebuilt: true, newProviderCalls: 0, fixtureOnly: true });
  const common = { candidateHash: candidate.hash, finalGeneralDependencyHash: finalGeneral.hash,
    expectedAnswersExposed: false, fixtureOnly: true };
  const rosterEvaluation = seal({ ...common, boundedRosterChoicePassed: true,
    results: [{ arm: 'overall_only', correct: 0, total: 4 }, { arm: 'overall_plus_faction', correct: 4, total: 4 }] });
  const ruleEvaluation = seal({ ...common, boundedRuleApplicationPassed: true, repetitions: 3,
    summary: [{ arm: 'overall_only', correct: 0, total: 66 }, { arm: 'overall_plus_faction', correct: 66, total: 66 }],
    independentlyHeldOutCases: 0 });
  const consumerEvidence = seal({ candidateHash: candidate.hash, productionEvidenceHash: productionEvidence.hash,
    rosterEvaluationHash: rosterEvaluation.hash, ruleApplicationEvaluationHash: ruleEvaluation.hash,
    finalGeneralDependencyHash: finalGeneral.hash, completeConsumerRequestsReconstructed: true,
    baselineAndNegativeScoresPreserved: true, newProviderCalls: 0, fixtureOnly: true });
  const args = { input, candidate, productionEvidence, rosterEvaluation, ruleEvaluation, consumerEvidence, generalSkill, generalLayer };
  const skill = finalizeFactionSkillV1(args);
  assert.deepEqual(skill.knowledge, candidate.sections.map(({ section, draft }) => ({ section, draft })));
  for (const row of skill.knowledge) assert(renderFinalFactionSkillV1(skill).includes(row.draft.recommendations[0].title));
  assert(!skill.fullGameStrategyEffectivenessProven && !skill.runtimeAccepted && !skill.published && !skill.canAffectRules);
  const oldContext = factionConsumerContextV1({ input, candidate, knownRulePolicy });
  const current = factionConsumerContextV1({ input, candidate, knownRulePolicy, finalGeneral });
  assert.notEqual(current.hash, oldContext.hash);
  assert.equal(current.overall.finalStrategyLayer.hash, generalLayer.hash);
  assert.equal(current.overall.skill.sections.flatMap(s => s.claims).length, 522);
  assert(!oldContext.overall.finalStrategyLayer);
  checks += 7;
  for (const [key, delta, code] of [
    ['candidate', { semanticReviewPassed: false }, 'FACTION_FINAL_CHAPTERS_INCOMPLETE'],
    ['candidate', { sections: candidate.sections.slice(1) }, 'FACTION_FINAL_CHAPTERS_INCOMPLETE'],
    ['candidate', { factionRecordKey: 'tactical_cards:wrong_faction' }, 'FACTION_FINAL_CHAPTERS_INCOMPLETE'],
    ['productionEvidence', { candidateHash: hash('wrong') }, 'FACTION_FINAL_PRODUCTION_EVIDENCE_REQUIRED'],
    ['rosterEvaluation', { boundedRosterChoicePassed: false }, 'FACTION_FINAL_CONSUMER_EVIDENCE_REQUIRED'],
    ['ruleEvaluation', { finalGeneralDependencyHash: hash('old-general') }, 'FACTION_FINAL_CONSUMER_EVIDENCE_REQUIRED'],
    ['consumerEvidence', { baselineAndNegativeScoresPreserved: false }, 'FACTION_FINAL_CONSUMER_REPLAY_REQUIRED'],
    ['generalLayer', { assessment: { sourceReviewPassed: false } }, 'FACTION_FINAL_GENERAL_DEPENDENCY_REQUIRED'],
  ]) { assert.throws(() => finalizeFactionSkillV1({ ...args, [key]: reseal(args[key], delta) }), { code }); checks++; }
  const sample = actualBoundary.samples.find(row => row.faction === name);
  const diagnosis = await json(base, name + '-draft-envelope-diagnosis');
  const sections = structuredClone(candidate.sections);
  const target = sections.find(row => row.section.id === diagnosis.request.workspace.section.id);
  assert(target); checks++;
  target.draft = { recommendations: [structuredClone(sample.originalAdvice)] };
  // Actual paid prose, but all acceptance evidence remains explicitly injected.
  // This exercises the finalizer boundary, NOT source/strategy qualification.
  const actualCandidate = reseal(candidate, { sections, draftEnvelopeBindingHash: draftEnvelopeBinding.hash });
  const bindCandidate = next => {
    const production = reseal(productionEvidence, { candidateHash: next.hash });
    const roster = reseal(rosterEvaluation, { candidateHash: next.hash });
    const rules = reseal(ruleEvaluation, { candidateHash: next.hash });
    const consumer = reseal(consumerEvidence, { candidateHash: next.hash, productionEvidenceHash: production.hash,
      rosterEvaluationHash: roster.hash, ruleApplicationEvaluationHash: rules.hash });
    return { ...args, candidate: next, productionEvidence: production, rosterEvaluation: roster,
      ruleEvaluation: rules, consumerEvidence: consumer, draftEnvelopeBinding };
  };
  const actualArgs = bindCandidate(actualCandidate);
  const projected = finalizeFactionSkillV1(actualArgs);
  assert.deepEqual(projected.knowledge.find(row => row.section.id === target.section.id).draft, target.draft);
  assert.equal(projected.draftEnvelopeBinding.hash, draftEnvelopeBinding.hash);
  assert(!projected.runtimeAccepted && !projected.trainingTruth && !projected.fullGameStrategyEffectivenessProven);
  checks += 3;
  for (const binding of [null, reseal(draftEnvelopeBinding, { maximumAdviceSourceRefs: 1024 })]) {
    assert.throws(() => finalizeFactionSkillV1({ ...actualArgs, draftEnvelopeBinding: binding })); checks++;
  }
  assert.throws(() => finalizeFactionSkillV1(bindCandidate(reseal(actualCandidate,
    { draftEnvelopeBindingHash: hash('foreign-binding') }))), { code: 'FACTION_FINAL_DRAFT_ENVELOPE_BINDING_DRIFT' }); checks++;
  assert.throws(() => finalizeFactionSkillV1({ ...args, draftEnvelopeBinding }),
    { code: 'FACTION_FINAL_DRAFT_ENVELOPE_BINDING_DRIFT' }); checks++;
  for (const mutate of [
    advice => { advice.sourceRefs[0] = 'source:invented'; },
    advice => { advice.procedure = []; },
    advice => { advice.sourceRefs = input.frozenSources.prompt.sources.slice(0, 129).map(row => row.ref); },
  ]) {
    const changed = structuredClone(actualCandidate.sections);
    mutate(changed.find(row => row.section.id === target.section.id).draft.recommendations[0]);
    assert.throws(() => finalizeFactionSkillV1(bindCandidate(reseal(actualCandidate, { sections: changed })))); checks++;
  }
}
const files = ['packages/strategy-skills/faction-general-dependency-v1.mjs',
  'packages/strategy-skills/faction-skill-finalization-v1.mjs',
  'packages/skill-production-v3/faction-draft-envelope-v2.mjs',
  'scripts/finalize-ticket-18-faction-skill-v1.mjs',
  'packages/skill-evaluation/faction-roster-use-evaluation-v1.mjs',
  'scripts/verify-ticket-18-faction-finalization-v1.mjs'];
const report = seal({ passed: true, checks, providerCalls: 0, fixtureOnly: true,
  actualPaidProseBoundarySamples: actualBoundary.samples.length, actualPaidBoundaryHash: actualBoundary.hash,
  actualFactionSkillsAccepted: 0, sourceRefreshPerformed: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) }))) });
await writeFile(path.join(base, 'finalization-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, providerCalls: 0, actualFactionSkillsAccepted: 0, hash: report.hash }));
