import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { produceFactionStrategyV1, createFactionWritingPlanV1, validateFactionOutlineV1,
  createFactionOutlineSourceIssueV1, applyFactionOutlineSourceReconstructionV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { FACTION_PROPOSER_BATCH_BINDING_V1 as proposerBinding } from '../packages/skill-production-v3/faction-proposer-batches-v1.mjs';
import { FACTION_UNIQUE_RISK_CLAUSE_BINDING_V2 as uniqueBinding, inspectFactionUniqueRiskClauseV2 } from '../packages/skill-evaluation/faction-unique-risk-clause-v2.mjs';
import { inspectFactionCardPackageSourceDebtV1 } from '../packages/skill-evaluation/faction-card-package-source-audit-v1.mjs';
import { prepareFactionNativeProductionRoleV1, factionNativeProductionKindV1 } from '../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { FACTION_NATIVE_OUTPUT_CAPACITY_BINDING_V2 as capacity,
  applyFactionNativeOutputCapacityV2 } from '../packages/skill-production-v3/faction-native-output-capacity-v2.mjs';

const base = 'build/ticket-18-faction-production-v1/', originRunId = 'faction-v1-c7ca14be3b96ade06b22';
const read = async file => verifySeal(JSON.parse(await readFile(base + file + '.json', 'utf8')));
const input = await read('terran_armed_forces-input'), knownRulePolicy = await read('terran_armed_forces-known-rule-policy');
const plan = createFactionWritingPlanV1(input), packet = 'faction.terran_armed_forces';
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
let actualSection, tree, challenger, rejectedOutline, rejectedRepair;
try {
  const get = id => verifySeal(verifySeal(JSON.parse(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
    .get(originRunId, id).artifact)).value);
  actualSection = get(packet + '.card_packages.1.result');
  tree = get(packet + '.question-tree').output; challenger = get(packet + '.challenger').output;
  rejectedOutline = get(packet + '.' + packet + '.card_packages.2.generator-outline');
  rejectedRepair = get(packet + '.' + packet + '.card_packages.2.generator-outline.source-reconstruction.v1');
} finally { db.close(); }
const oldOutlineIssue = createFactionOutlineSourceIssueV1(rejectedOutline.output, { input, section: plan.sections.at(-1) });
assert.deepEqual(oldOutlineIssue.missingSourceRefs, ['source:tactical_cards:dropship', 'source:tactical_cards:factory', 'source:tactical_cards:supply_depot']);
assert.throws(() => applyFactionOutlineSourceReconstructionV1(rejectedRepair.output, { input, section: plan.sections.at(-1),
  rejectedOutput: rejectedOutline.output, issue: oldOutlineIssue }), { code: 'FACTION_OUTLINE_SOURCE_RECONSTRUCTION_CONTENT_REQUIRED' });
assert.equal(inspectFactionCardPackageSourceDebtV1({ input, draft: actualSection.draft }).findings.length, 0);
assert.equal(inspectFactionUniqueRiskClauseV2({ input, draft: actualSection.draft }).findings.length, 1);
let checks = 4, freshReviews = 0, actualQuestionCount, plannedBatchCount;
const frozenRoleIds = plan.sections.slice(0, 6).map(s => packet + '.' + s.id + '.proposer');
for (const negative of [false, true]) {
  const store = openProductionStore(':memory:', { runId: 'planning-workflow-' + negative, recipeHash: hash(negative) });
  let corrected = false, result, finalOutlineRequest;
  const newBatches = [], historicalProposers = [], reviewed = new Set();
  const runtime = { role(request) {
    const w = request.workspace, id = request.roleId; let output;
    if (id === 'tutor') output = { lesson: ['Injected tutorial, not model evaluation.'], uncertainties: [] };
    else if (id === 'question-tree') output = tree;
    else if (id === 'challenger') output = challenger;
    else if (id.endsWith('.reasoner')) output = { answers: w.questions.map(q => ({ index: q.index,
      answer: 'Injected answer, retain uncertainty.', sourceRefs: q.sourceRefs })), uncertainties: [] };
    else if (id.endsWith('.judge')) output = { judgments: w.answers.answers.map(a => ({ index: a.index,
      verdict: 'uncertain', reason: 'Injected negative/uncertain must survive.', sourceRefs: a.sourceRefs })) };
    else if (id.endsWith('.proposer')) {
      historicalProposers.push(packet + '.' + id); output = { lesson: ['Historical plan path preserved.'], uncertainties: [] };
    } else if (id.includes('.proposer-batch-v1.')) {
      newBatches.push(structuredClone(request));
      assert.ok(w.judge.judgments.every(j => j.verdict === 'uncertain'));
      output = { plans: w.outputRequestAtEnd.targets.map(t => ({ index: t.index, text: 'Injected conditional writing obligation ' + t.index,
        sourceRefs: t.requiredSourceRefs })), uncertainties: ['Actual strategy effectiveness not tested.'] };
    } else if (id.includes('.generator-outline')) {
      if (w.section === plan.sections.at(-1) || w.section.id === plan.sections.at(-1).id) {
        finalOutlineRequest = request; fail('PLANNING_WORKFLOW_NEW_OUTLINE_CAPTURED');
      }
      output = { outline: w.section.axis === 'card_packages'
        ? actualSection.draft.recommendations.map(r => ({ focus: r.title, sourceRefs: r.sourceRefs }))
        : Array.from({ length: Math.ceil(w.section.requiredSourceRefs.length / 4) }, (_, n) => ({ focus: 'Injected focus ' + n,
          sourceRefs: w.section.requiredSourceRefs.slice(n * 4, n * 4 + 4) })) };
    } else if (id.includes('.generator-items.')) output = { items: w.indices.map(index => ({ index,
      value: w.section.axis === 'card_packages' ? actualSection.draft.recommendations[index] : {
        title: 'Injected advice ' + index, when: ['Observable ' + index], procedure: ['Inspect rules ' + index],
        alternatives: ['Conditional alternative ' + index], risk: 'Unproven ' + index, reviseIf: ['State changes ' + index],
        sourceRefs: w.outline[index].sourceRefs, unproven: ['No strategy evidence.'] } })) };
    else if (id.includes('.review-target-batch-v1.')) {
      const targets = w.outputRequestAtEnd.targetContract.targets;
      if (corrected && w.section.axis === 'card_packages') {
        freshReviews++; targets.forEach(t => reviewed.add(t.index));
        assert.equal(inspectFactionUniqueRiskClauseV2({ input, draft: w.draft }).findings.length, 0);
      }
      output = { verdicts: targets.map(t => ({ targetId: t.targetId, title: t.title,
        focus: [{ path: t.fields[0].path, quote: t.fields[0].text.slice(0, 120) }],
        verdict: negative && corrected && t.index === 0 ? 'unsupported' : 'supported',
        reason: 'Injected workflow judgment, not semantic approval.', sourceRefs: t.recommendation.sourceRefs.slice(0, 1) })),
        coverage: w.coverageRequiredSourceRefs.map(sourceRef => ({ sourceRef, verdict: 'covered',
          recommendationIndices: w.draft.recommendations.flatMap((r, n) => r.sourceRefs.includes(sourceRef) ? [n] : []), reason: 'Injected coverage.' })) };
    } else if (id.includes('.editor.') && corrected) fail('PLANNING_WORKFLOW_NEW_NEGATIVE_BLOCKS');
    else fail('PLANNING_WORKFLOW_UNEXPECTED_ROLE', { id });
    return seal({ roleId: packet + '.' + id, output, fixtureOnly: true });
  } };
  try {
    await assert.rejects(produceFactionStrategyV1({ input, runtime, store, knownRulePolicy,
      proposerBatches: { binding: proposerBinding, frozenRoleIds }, uniqueRiskClauseBinding: uniqueBinding,
      onProgress(row) { if (row.stage === 'observed_unique_clause_corrected') corrected = true;
        if (row.stage === 'section_complete' && row.section === actualSection.section.id) result = store.artifact(row.section + '.result'); } }),
    { code: negative ? 'PLANNING_WORKFLOW_NEW_NEGATIVE_BLOCKS' : 'PLANNING_WORKFLOW_NEW_OUTLINE_CAPTURED' }); checks++;
    assert.ok(corrected); checks++;
    assert.equal(reviewed.size, actualSection.draft.recommendations.length); checks++;
    assert.deepEqual(historicalProposers, frozenRoleIds); checks++;
    if (negative) { assert.equal(result, undefined); checks++; continue; }
    assert.equal(result.rounds.length, 2); checks++;
    assert.equal(result.edits[0].bindingHash, uniqueBinding.hash); checks++;
    assert.equal(result.rounds[1].draftHash, result.edits[0].resultHash); checks++;
    for (const [index, advice] of actualSection.draft.recommendations.entries()) for (const [field, value] of Object.entries(advice)) {
      if (index === 0 && field === 'risk') continue;
      assert.deepEqual(result.draft.recommendations[index][field], value);
    } checks++;
    const w = finalOutlineRequest.workspace;
    actualQuestionCount = w.questions.length; plannedBatchCount = newBatches.length;
    assert.equal(w.proposerPlan.targets.filter(t => t.kind === 'question').length, actualQuestionCount); checks++;
    assert.deepEqual(w.proposerPlan.targets.filter(t => t.kind === 'assigned_source_coverage').flatMap(t => t.requiredSourceRefs), oldOutlineIssue.missingSourceRefs); checks++;
    assert.equal(w.proposals.lesson.length, w.proposerPlan.targets.length); checks++;
    assert.ok(w.judge.judgments.every(j => j.verdict === 'uncertain')); checks++;
    assert.ok(finalOutlineRequest.roleId.includes('.planning-v1.' + w.proposerAssemblyHash.slice(0, 20))); checks++;
    assert.equal(factionNativeProductionKindV1(finalOutlineRequest.roleId), 'outline'); checks++;
    assert.throws(() => validateFactionOutlineV1(rejectedOutline.output, { input, section: w.section }),
      { code: 'FACTION_OUTLINE_SOURCE_OMISSION' }); checks++;
    const prepared = prepareFactionNativeProductionRoleV1({ input, request: applyFactionNativeOutputCapacityV2(finalOutlineRequest, capacity),
      executionPolicy: capacity.executionPolicy, outputCapacityBinding: capacity, proposerBatchBinding: proposerBinding });
    assert.equal(prepared.roleInput.proposerBatchBindingHash, proposerBinding.hash); checks++;
    assert.deepEqual(JSON.parse(prepared.payload).fullFrozenSources, input.frozenSources.prompt); checks++;
  } finally { store.close(); }
}
const files = ['packages/skill-production-v3/faction-proposer-batches-v1.mjs', 'packages/skill-production-v3/faction-strategy-workflow-v1.mjs',
  'packages/skill-production-v3/faction-native-production-runtime-v1.mjs', 'packages/skill-evaluation/faction-unique-risk-clause-v2.mjs',
  'packages/skill-evaluation/faction-candidate-evidence-v1.mjs', 'scripts/verify-ticket-18-faction-planning-workflow-v1.mjs'];
const report = seal({ passed: true, checks, originRunId, proposerBinding, uniqueBinding, frozenRoleIds,
  actualSectionHash: actualSection.hash, actualRejectedOutlineHash: rejectedOutline.hash, actualNoProgressRepairHash: rejectedRepair.hash,
  actualQuestionCount, plannedBatchCount, missingSourceRefs: oldOutlineIssue.missingSourceRefs,
  negativeJudgmentsPreserved: true, wholeSectionFreshReviewsRequired: true, injectedFreshReviewCalls: freshReviews,
  currentKnownRiskCorrectedInFixture: true, unrelatedAdvicePreserved: true, oldOutlineNotReusedForNewPlan: true,
  noProgressRepairRejected: true, productionRunnerWired: false, providerCalls: 0, actualDshSessions: 0,
  actualNewFactionSkillsAccepted: 0, strategyEffectivenessProven: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'planning-workflow-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualQuestionCount, plannedBatchCount, injectedFreshReviewCalls: freshReviews,
  providerCalls: 0, hash: report.hash }));
