import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256, fail } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { produceFactionStrategyV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { FACTION_INITIAL_SOURCE_CORRECTION_BINDING_V2 as binding,
  inspectFactionInitialSourceDebtV2 } from '../packages/skill-production-v3/faction-initial-source-correction-v2.mjs';
import { FACTION_DRAFT_ENVELOPE_BINDING_V2 as draftEnvelopeBinding } from '../packages/skill-production-v3/faction-draft-envelope-v2.mjs';

const base = 'build/ticket-18-faction-production-v1/', runId = 'faction-v1-b624e21a2da88377b410';
const read = async n => verifySeal(JSON.parse(await readFile(base + n + '.json', 'utf8')));
const input = await read(runId + '/zerg_swarm-input'), knownRulePolicy = await read('zerg_swarm-known-rule-policy');
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
let actual, tree, challenger;
try {
  const get = id => verifySeal(verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get(runId, id).artifact)).value);
  actual = get('faction.zerg_swarm.army_resources.1.result');
  tree = get('faction.zerg_swarm.question-tree').output; challenger = get('faction.zerg_swarm.challenger').output;
} finally { db.close(); }
const sourceHash = hash(input), originalDraftHash = hash(actual.draft);
assert.equal(inspectFactionInitialSourceDebtV2({ input, draft: actual.draft }).findings.length, 13);
let checks = 1, freshReviewCalls = 0;
const cases = [];
for (const negative of [false, true]) {
  const store = openProductionStore(':memory:', { runId: 'source-correction-workflow-' + negative, recipeHash: hash(negative) });
  let corrected = false, completed = null;
  const reviewRequests = [], mutations = [];
  const runtime = { role(request) {
    const w = request.workspace, id = request.roleId; let output;
    if (id === 'tutor') output = { lesson: ['Injected teaching for workflow verification only.'], uncertainties: [] };
    else if (id === 'question-tree') output = tree;
    else if (id === 'challenger') output = challenger;
    else if (w.section?.id !== actual.section.id) fail('INITIAL_SOURCE_WORKFLOW_NEXT_SECTION');
    else if (id.endsWith('.reasoner')) output = { answers: w.questions.map(q => ({ index: q.index,
      answer: 'Injected answer, not a source finding.', sourceRefs: q.sourceRefs })), uncertainties: [] };
    else if (id.endsWith('.judge')) output = { judgments: w.answers.answers.map(a => ({ index: a.index,
      verdict: 'uncertain', reason: 'Injected judgment is not truth.', sourceRefs: a.sourceRefs })) };
    else if (id.endsWith('.proposer')) output = { lesson: ['Injected plan.'], uncertainties: [] };
    else if (id.includes('.generator-outline')) output = { outline: actual.draft.recommendations.map(r => ({ focus: r.title, sourceRefs: r.sourceRefs })) };
    else if (id.includes('.generator-items.')) output = { items: w.indices.map(index => ({ index, value: actual.draft.recommendations[index] })) };
    else if (id.includes('.review-target-batch-v1.')) {
      const targets = w.outputRequestAtEnd.targetContract.targets;
      if (corrected) {
        freshReviewCalls++; reviewRequests.push({ id, indices: targets.map(t => t.index), draftHash: hash(w.draft) });
        assert.equal(inspectFactionInitialSourceDebtV2({ input, draft: w.draft }).findings.length, 0);
      }
      output = { verdicts: targets.map(t => ({ targetId: t.targetId, title: t.title,
        focus: [{ path: t.fields[0].path, quote: t.fields[0].text.slice(0, 120) }],
        verdict: corrected && negative && t.index === 0 ? 'unsupported' : 'supported',
        reason: 'Injected review for control-flow proof, not independent acceptance.', sourceRefs: t.recommendation.sourceRefs.slice(0, 1) })),
        coverage: w.coverageRequiredSourceRefs.map(sourceRef => ({ sourceRef, verdict: 'covered',
          recommendationIndices: w.draft.recommendations.flatMap((r, index) => r.sourceRefs.includes(sourceRef) ? [index] : []),
          reason: 'Injected source assignment.' })) };
    } else if (id.includes('.editor.') && negative && corrected) fail('INITIAL_SOURCE_WORKFLOW_NEGATIVE_BLOCKS');
    else fail('INITIAL_SOURCE_WORKFLOW_UNEXPECTED_ROLE', { id });
    return seal({ roleId: request.packet.id + '.' + id, output, fixtureOnly: true });
  } };
  try {
    await assert.rejects(produceFactionStrategyV1({ input, runtime, store, knownRulePolicy,
      draftEnvelopeBinding, initialSourceCorrectionBinding: binding,
      onProgress(row) {
        if (row.stage === 'initial_source_fields_corrected') { corrected = true; mutations.push(row); }
        if (row.stage === 'section_complete' && row.section === actual.section.id) completed = store.artifact(row.section + '.result');
      } }), { code: negative ? 'INITIAL_SOURCE_WORKFLOW_NEGATIVE_BLOCKS' : 'INITIAL_SOURCE_WORKFLOW_NEXT_SECTION' }); checks++;
    assert.equal(mutations.length, 1); checks++;
    assert.equal(mutations[0].changedFields, 13); checks++;
    assert.equal(reviewRequests.length, 6); checks++;
    for (const route of ['supportive', 'adversarial']) {
      assert.deepEqual(reviewRequests.filter(r => r.id.includes('.' + route + '.')).flatMap(r => r.indices), [0, 1, 2, 3, 4, 5]); checks++;
    }
    assert.ok(reviewRequests.every(r => r.id.includes('.1.') && r.draftHash !== originalDraftHash)); checks++;
    if (negative) { assert.equal(completed, null); checks++; }
    else {
      assert.equal(completed.rounds.length, 2); checks++;
      assert.equal(completed.rounds[0].draftHash, originalDraftHash); checks++;
      assert.equal(completed.rounds[0].issues.openIssues, 0); checks++;
      assert.equal(completed.edits[0].bindingHash, binding.hash); checks++;
      assert.equal(completed.edits[0].priorRoundHash, completed.rounds[0].hash); checks++;
      assert.equal(completed.rounds[1].draftHash, completed.edits[0].resultHash); checks++;
      const correctedDraft = structuredClone(completed.draft);
      for (const f of completed.edits[0].correction.audit.findings) {
        const [key, n] = f.path.split('.');
        if (n === undefined) correctedDraft.recommendations[f.index][key] = f.text;
        else correctedDraft.recommendations[f.index][key][Number(n)] = f.text;
      }
      assert.deepEqual(correctedDraft, actual.draft); checks++;
      assert.equal(completed.strategyEffectivenessProven, false); checks++;
      assert.equal(completed.runtimeAccepted, false); checks++;
    }
    assert.equal(hash(input), sourceHash); checks++;
    assert.equal(hash(actual.draft), originalDraftHash); checks++;
    cases.push({ negative, newReviewRequests: reviewRequests, correctionEvents: mutations,
      sourceWorkflowFixtureCompleted: !!completed, completeResultHash: completed?.hash || null });
  } finally { store.close(); }
}
const files = ['scripts/verify-ticket-18-initial-source-correction-workflow-v2.mjs',
  'packages/skill-production-v3/faction-initial-source-correction-v2.mjs', 'packages/skill-production-v3/faction-strategy-workflow-v1.mjs',
  'packages/skill-evaluation/faction-zerg-card-economy-audit-v1.mjs', 'packages/skill-evaluation/faction-unique-cross-field-audit-v1.mjs'];
const report = seal({ passed: true, checks, binding, originRunId: runId, actualSourceSectionHash: actual.hash,
  inputHash: input.hash, originalDraftHash, cases, injectedFreshReviewCalls: freshReviewCalls,
  allKnownFieldsAppliedAtomically: true, wholeSectionFreshReviewRequired: true, newNegativeBlocksCompletion: true,
  originalPaidProseAndVerdictsPreserved: true, providerCalls: 0, actualDshSessions: 0,
  officialSourceRefresh: false, actualFormalProductionApplied: false, independentSemanticAcceptance: false,
  trainingTruth: false, codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'initial-source-correction-workflow-v2.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, injectedFreshReviewCalls: freshReviewCalls, providerCalls: 0, hash: report.hash }));
