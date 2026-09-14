import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { createFactionObservedRosterFactsV1 } from '../packages/skill-evaluation/faction-observed-roster-facts-v1.mjs';
import { openFactionProductionReplayV1 } from '../packages/skill-evaluation/faction-production-replay-v1.mjs';
import { loadFactionStructuredReplayDependenciesV1, createFactionReplayRuntimeStackV1 } from '../packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs';
import { produceFactionStrategyV1, FACTION_AXES_V1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { prepareFactionNativeProductionRoleV1, factionNativeProductionKindV1 } from '../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { FACTION_OBSERVED_SOURCE_REPAIR_BINDING_V1 as binding } from '../packages/skill-production-v3/faction-observed-source-repair-v1.mjs';
import { inspectFactionCardPackageSourceDebtV1 } from '../packages/skill-evaluation/faction-card-package-source-audit-v1.mjs';

const root = process.cwd(), base = 'build/ticket-18-faction-production-v1/';
const originRunId = 'faction-v1-8a5389823de46cf062ae';
const read = async file => verifySeal(JSON.parse(await readFile(base + file + '.json', 'utf8')));
const inputs = await Promise.all(['terran_armed_forces', 'zerg_swarm'].map(n => read(n + '-input')));
const policies = await Promise.all(['terran_armed_forces', 'zerg_swarm'].map(n => read(n + '-known-rule-policy')));
const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const facts = inputs.map(input => createFactionObservedRosterFactsV1({ input, dataset }));
const recipe = await read(originRunId + '/recipe'), diagnosis = await read('native-output-capacity-diagnosis');
const ancestors = []; let parent = recipe.continuation?.parentRunId;
while (parent) { const r = await read(parent + '/recipe'); ancestors.push(r); parent = r.continuation?.parentRunId; }
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
const dependencies = await loadFactionStructuredReplayDependenciesV1({ root, recipe });
const replay = openFactionProductionReplayV1({ filename: 'build/ticket-17-production-redesign-v1/production.sqlite',
  runId: originRunId, recipe, ancestors, input: inputs[1], editorImport: dependencies.editorImport });
const local = openProductionStore(':memory:', { runId: 'source-fact-wiring', recipeHash: binding.hash });
let freshJudge, proposer, replayProof, checks = 0;
try {
  const forbidden = () => fail('OBSERVED_REPAIR_NO_PROVIDER');
  const runtime = createProductionRuntimeV3({ store: replay.store, reader: createEvidenceReader(catalogue), context,
    verifier: {}, model: forbidden, dsh: { run: forbidden } });
  const stack = await createFactionReplayRuntimeStackV1({ root, runId: originRunId, recipe, input: inputs[1], replay, runtime, dependencies });
  const store = { ...replay.store,
    acquire(id, value) { return id.includes('.observed-source-fact-correction-v1') ? { ...local.acquire(id, value), local: true } : replay.store.acquire(id, value); },
    finish(lease, value) { return lease.local ? local.finish(lease, value) : replay.store.finish(lease, value); } };
  await assert.rejects(produceFactionStrategyV1({ input: inputs[1], knownRulePolicy: policies[1], store,
    registeredSourceFieldRepair: true, legacyPromptRoleIds: stack.legacyPromptRoleIds,
    catalogueReviewBinding: recipe.catalogueReviewBinding, structuredReviewValidationBinding: stack.structuredReviewValidationBinding,
    tutorRecovery: recipe.teachRecoveryBindings.find(r => r.inputHash === inputs[1].hash),
    observedSourceRepair: { binding, facts: facts[1] }, runtime: { role(request) {
      if (request.roleId.includes('.judge.source-fact-correction-v1.')) {
        freshJudge = request;
        const output = structuredClone(request.workspace.originalJudge);
        output.judgments[0].verdict = 'uncertain'; output.judgments[0].reason = 'Injected fresh negative must remain visible.';
        return seal({ roleId: request.packet.id + '.' + request.roleId, output, fixtureOnly: true });
      }
      if (request.roleId.endsWith('.proposer')) { proposer = request; fail('OBSERVED_REPAIR_PROPOSER_CAPTURED'); }
      return stack.runtime.role(request);
    } } }), { code: 'OBSERVED_REPAIR_PROPOSER_CAPTURED' }); checks++;
  assert.deepEqual(freshJudge.workspace.originalAnswers, diagnosis.request.workspace.answers); checks++;
  assert.deepEqual(freshJudge.workspace.originalJudge, diagnosis.request.workspace.judge); checks++;
  assert.deepEqual(freshJudge.workspace.questions, diagnosis.request.workspace.questions); checks++;
  assert.equal(freshJudge.workspace.answers.answers.length, 6); checks++;
  assert.deepEqual(proposer.workspace.answers, freshJudge.workspace.answers); checks++;
  assert.equal(proposer.workspace.judge.judgments[0].verdict, 'uncertain'); checks++;
  assert.equal(proposer.workspace.judge.judgments.length, 6); checks++;
  assert.equal(factionNativeProductionKindV1(freshJudge.roleId), 'judge'); checks++;
  assert.equal(factionNativeProductionKindV1(freshJudge.roleId + 'x'), null); checks++;
  const policy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
    allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
  const prepared = prepareFactionNativeProductionRoleV1({ input: inputs[1], request: freshJudge, executionPolicy: policy });
  assert.equal(prepared.kind, 'judge'); checks++;
  assert.deepEqual(JSON.parse(prepared.payload).fullFrozenSources, inputs[1].frozenSources.prompt); checks++;
  assert.ok(prepared.fullContextBytes < 1000000); checks++;
  assert.notEqual(hash(proposer.workspace), hash(diagnosis.request.workspace)); checks++;
  replayProof = replay.evidence();
} finally { local.close(); replay.close(); }
console.log(JSON.stringify({ event: 'actual-zerg-history-replayed', checks, freshJudge: 'injected', providerCalls: 0 }));

// Exercise the actual workflow's post-correction whole-section reviews with
// the real Terran bad paragraph and synthetic surrounding roles. This proves
// control flow, not model/source acceptance or game effectiveness.
const terranActual = await read('target-id-address-diagnosis');
const cardDraft = terranActual.request.workspace.draft;
assert.equal(inspectFactionCardPackageSourceDebtV1({ input: inputs[0], draft: cardDraft }).findings.length, 1); checks++;
let wholeReviews = 0;
for (const negative of [false, true]) {
  const input = inputs[0], store = openProductionStore(':memory:', { runId: 'unique-workflow-' + negative, recipeHash: binding.hash });
  let correctionApplied = false, reviewedIndices = new Set(), result = null;
  const runtime = { role(request) {
    const w = request.workspace, id = request.roleId;
    let output;
    if (id === 'tutor') output = { lesson: ['Injected tutorial.'], uncertainties: [] };
    else if (id === 'question-tree' || id === 'challenger') output = { branches: FACTION_AXES_V1.map(axis => ({ axis,
      [id === 'challenger' ? 'probes' : 'questions']: [0, 1].map(n => ({ question: 'Injected ' + axis + ' ' + n,
        sourceRefs: ['source:' + input.factionRecordKey] })) })) };
    else if (id.endsWith('.reasoner')) output = { answers: w.questions.map(q => ({ index: q.index, answer: 'Injected conditional analysis.', sourceRefs: q.sourceRefs })), uncertainties: [] };
    else if (id.endsWith('.judge')) output = { judgments: w.answers.answers.map(a => ({ index: a.index, verdict: 'uncertain', reason: 'Fixture only.', sourceRefs: a.sourceRefs })) };
    else if (id.endsWith('.proposer')) output = { lesson: ['Injected plan.'], uncertainties: [] };
    else if (id.endsWith('.generator-outline')) output = { outline: w.section.axis === 'card_packages'
      ? cardDraft.recommendations.map(r => ({ focus: r.title, sourceRefs: r.sourceRefs }))
      : Array.from({ length: Math.ceil(w.section.requiredSourceRefs.length / 4) }, (_, n) => ({ focus: 'Injected focus ' + n,
        sourceRefs: w.section.requiredSourceRefs.slice(n * 4, n * 4 + 4) })) };
    else if (id.includes('.generator-items.')) output = { items: w.indices.map(index => ({ index, value: w.section.axis === 'card_packages'
      ? cardDraft.recommendations[index] : { title: 'Injected ' + index, when: ['Observable condition ' + index], procedure: ['Inspect rule service ' + index],
        alternatives: ['Alternative ' + index], risk: 'Unproven risk ' + index, reviseIf: ['State changed ' + index],
        sourceRefs: w.outline[index].sourceRefs, unproven: ['Fixture has no strategy evidence.'] } })) };
    else if (id.includes('.review-target-batch-v1.')) {
      const targets = w.outputRequestAtEnd.targetContract.targets;
      if (correctionApplied && w.section.axis === 'card_packages') {
        wholeReviews++; targets.forEach(t => reviewedIndices.add(t.index));
        assert.equal(inspectFactionCardPackageSourceDebtV1({ input, draft: w.draft }).findings.length, 0);
      }
      output = { verdicts: targets.map(t => ({ targetId: t.targetId, title: t.title,
        focus: [{ path: t.fields[0].path, quote: t.fields[0].text.slice(0, 120) }],
        verdict: negative && correctionApplied && t.index === 0 ? 'unsupported' : 'supported',
        reason: 'Injected workflow judgment, not semantic approval.', sourceRefs: t.recommendation.sourceRefs.slice(0, 1) })),
      coverage: w.coverageRequiredSourceRefs.map(sourceRef => ({ sourceRef, verdict: 'covered',
        recommendationIndices: w.draft.recommendations.flatMap((r, n) => r.sourceRefs.includes(sourceRef) ? [n] : []), reason: 'Injected coverage.' })) };
    } else if (id.includes('.editor.') && correctionApplied) fail('OBSERVED_UNIQUE_NEGATIVE_PRESERVED');
    else fail('OBSERVED_UNIQUE_UNEXPECTED_ROLE', { id });
    return seal({ roleId: request.packet.id + '.' + id, output, fixtureOnly: true });
  } };
  try {
    await assert.rejects(produceFactionStrategyV1({ input, knownRulePolicy: policies[0], runtime, store,
      observedSourceRepair: { binding, facts: facts[0] }, onProgress(row) {
        if (row.stage === 'observed_unique_clause_corrected') correctionApplied = true;
        if (row.stage === 'section_complete' && row.section === 'faction.terran_armed_forces.card_packages.1') {
          result = store.artifact(row.section + '.result'); fail('OBSERVED_UNIQUE_SECTION_CAPTURED');
        }
      } }), { code: negative ? 'OBSERVED_UNIQUE_NEGATIVE_PRESERVED' : 'OBSERVED_UNIQUE_SECTION_CAPTURED' }); checks++;
    assert.ok(correctionApplied); checks++;
    assert.equal(reviewedIndices.size, cardDraft.recommendations.length); checks++;
    if (!negative) {
      assert.equal(result.rounds.length, 2); checks++;
      assert.equal(result.edits.length, 1); checks++;
      assert.equal(result.rounds[1].draftHash, result.edits[0].resultHash); checks++;
      assert.equal(result.runtimeAccepted, false); checks++;
    } else { assert.equal(result, null); checks++; }
  } finally { store.close(); }
}
const files = ['packages/skill-production-v3/faction-observed-source-repair-v1.mjs',
  'packages/skill-evaluation/faction-observed-roster-facts-v1.mjs', 'packages/skill-evaluation/faction-card-package-source-audit-v1.mjs',
  'packages/skill-production-v3/faction-strategy-workflow-v1.mjs', 'packages/skill-production-v3/faction-native-production-runtime-v1.mjs',
  'packages/skill-production-v3/faction-continuation-v1.mjs', 'packages/skill-evaluation/faction-candidate-evidence-v1.mjs',
  'scripts/run-ticket-18-faction-strategy-production-v1.mjs', 'scripts/verify-ticket-18-faction-observed-roster-facts-v1.mjs',
  'scripts/verify-ticket-18-faction-observed-source-repair-v1.mjs', 'scripts/verify-ticket-18-faction-observed-source-repair-wiring-v1.mjs'];
const report = seal({ passed: true, checks, binding, originRunId, factsHashes: facts.map(f => f.hash), actualRulesCases: 9,
  actualAnswerContextRebuilt: true, replayProof, oldRoleInputsUnchanged: true, freshWholeAnswerJudgeRequired: true,
  negativeJudgmentPreserved: true, uniqueWholeSectionReviewVerified: true, injectedWholeSectionReviewCalls: wholeReviews,
  injectedFreshAnswerJudgeCalls: 1, freshJudgeRequest: freshJudge, proposerRequest: proposer,
  providerCalls: 0, actualDshSessions: 0, actualPaidFreshJudgeExecuted: false, strategyEffectivenessProven: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'observed-source-repair-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualRulesCases: 9, injectedWholeSectionReviewCalls: wholeReviews,
  providerCalls: 0, actualPaidFreshJudgeExecuted: false, hash: report.hash }));
