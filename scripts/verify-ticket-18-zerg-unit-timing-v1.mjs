import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { produceFactionStrategyV1, validateFactionDraftV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { FACTION_DRAFT_ENVELOPE_BINDING_V2 as draftEnvelopeBinding } from '../packages/skill-production-v3/faction-draft-envelope-v2.mjs';
import { FACTION_ZERG_UNIT_TIMING_BINDING_V1 as binding, inspectFactionZergUnitTimingDebtV1 as inspect,
  proposeFactionZergUnitTimingCorrectionV1 as propose, assertNoFactionZergUnitTimingDebtV1 as veto
} from '../packages/skill-evaluation/faction-zerg-unit-timing-audit-v1.mjs';
import { readFactionZergUnitTimingOriginV1, validateFactionZergUnitTimingMigrationV1 as migrate
} from '../packages/skill-production-v3/faction-zerg-unit-timing-migration-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/', runId = 'faction-v1-3241bb0aff2eda69e7c9';
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const read = async n => verifySeal(JSON.parse(await readFile(base + n + '.json', 'utf8')));
const input = await read(runId + '/zerg_swarm-input'), diagnosis = await read('zerg-explicit-slot-address-diagnosis-v4');
const parent = await read(runId + '/recipe'), knownRulePolicy = await read('zerg_swarm-known-rule-policy');
const origin = readFactionZergUnitTimingOriginV1({ filename, input, diagnosis });
const original = diagnosis.request.workspace.draft, section = diagnosis.request.workspace.section;
const proposal = origin.proposal, patched = proposal.proposedDraft;
let checks = 0;
const ok = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
const rejects = (fn, code) => { assert.throws(fn, { code }); checks++; };
ok(proposal.changes.length, 5);
ok(inspect({ input, draft: patched }).findings.length, 0);
validateFactionDraftV1(patched, input, { draftEnvelopeBinding }); checks++;
ok(propose({ input, draft: patched, binding }), null);
ok(hash(original), proposal.parentDraftHash);
ok(patched.recommendations.length, original.recommendations.length);
const restored = structuredClone(patched);
for (const f of proposal.audit.findings) {
  const [key, n] = f.path.split('.');
  if (n === undefined) restored.recommendations[f.index][key] = f.text;
  else restored.recommendations[f.index][key][Number(n)] = f.text;
}
ok(restored, original);
ok(patched.recommendations.map(r => r.sourceRefs), original.recommendations.map(r => r.sourceRefs));
rejects(() => veto({ input, candidate: { sections: [{ draft: original }] } }), 'FACTION_CANDIDATE_ZERG_UNIT_TIMING_DEBT');
veto({ input, candidate: { sections: [{ draft: patched }] } }); checks++;
const driftInput = structuredClone(input); delete driftInput.hash;
driftInput.frozenSources.prompt.sources.find(s => s.title.includes('8.9.1')).passages[1].text += '\n';
// Change an adjudicating clause, not irrelevant formatting.
const control = driftInput.frozenSources.prompt.sources.find(s => s.title.includes('8.9.1'));
for (const p of control.passages) p.text = p.text.replace('higher total Controls', 'equal total Controls');
rejects(() => inspect({ input: seal(driftInput), draft: original }), 'FACTION_ZERG_UNIT_SOURCE_DRIFT');
const changedDiagnosis = structuredClone(diagnosis); delete changedDiagnosis.hash;
changedDiagnosis.request.workspace.draft.recommendations[0].risk += ' drift';
assert.throws(() => readFactionZergUnitTimingOriginV1({ filename, input, diagnosis: seal(changedDiagnosis) })); checks++;
rejects(() => propose({ input, draft: original, binding: seal({ version: 'other' }) }), 'FACTION_ZERG_UNIT_BINDING_INVALID');
const quoted = structuredClone(original);
for (const f of proposal.audit.findings) {
  const [key, n] = f.path.split('.'), text = '错误示例（不可采用）：' + f.text;
  if (n === undefined) quoted.recommendations[f.index][key] = text;
  else quoted.recommendations[f.index][key][Number(n)] = text;
}
ok(inspect({ input, draft: quoted }).findings.length, 0);
ok(inspect({ input, draft: quoted }).absenceProvesGeneralCorrectness, false);

const db = new DatabaseSync(filename, { readOnly: true });
let first, tree, challenger;
try {
  const get = id => verifySeal(verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get(runId, id).artifact)).value);
  first = get('faction.zerg_swarm.army_resources.1.result');
  tree = get('faction.zerg_swarm.question-tree').output;
  challenger = get('faction.zerg_swarm.challenger').output;
} finally { db.close(); }
const tmp = await mkdtemp(base + 'zerg-unit-timing-test-'), cases = [];
for (const negative of [false, true]) {
  const options = { runId: 'unit-timing-' + negative, recipeHash: hash({ negative, binding: binding.hash }) };
  let store = openProductionStore(tmp + '/' + negative + '.sqlite', options);
  let interrupt = !negative, corrected = false, completed = null, generated = 0;
  const reviews = [], events = [];
  const runtime = { role(request) {
    const w = request.workspace, id = request.roleId;
    if (w.section?.id === section.id && id.includes('.review-target-batch-v1.') && interrupt) {
      interrupt = false; fail('UNIT_TIMING_INJECTED_INTERRUPTION');
    }
    const lease = store.acquire('fixture.' + request.packet.id + '.' + id, { requestHash: hash(request) });
    if (lease.cached) return lease.artifact;
    try {
      let output;
      const draft = w.section?.id === first.section.id ? first.draft : original;
      if (id === 'tutor') output = { lesson: ['Fixture only.'], uncertainties: [] };
      else if (id === 'question-tree') output = tree;
      else if (id === 'challenger') output = challenger;
      else if (![first.section.id, section.id].includes(w.section?.id)) fail('UNIT_TIMING_NEXT_SECTION');
      else if (id.endsWith('.reasoner')) output = { answers: w.questions.map(q => ({ index: q.index,
        answer: 'Fixture, no independent truth.', sourceRefs: q.sourceRefs })), uncertainties: [] };
      else if (id.endsWith('.judge')) output = { judgments: w.answers.answers.map(a => ({ index: a.index,
        verdict: 'uncertain', reason: 'Fixture only.', sourceRefs: a.sourceRefs })) };
      else if (id.endsWith('.proposer')) output = { lesson: ['Fixture.'], uncertainties: [] };
      else if (id.includes('.generator-outline')) output = { outline: draft.recommendations.map(r => ({ focus: r.title, sourceRefs: r.sourceRefs })) };
      else if (id.includes('.generator-items.')) { generated++; output = { items: w.indices.map(index => ({ index, value: draft.recommendations[index] })) }; }
      else if (id.includes('.review-target-batch-v1.')) {
        const targets = w.outputRequestAtEnd.targetContract.targets;
        if (w.section.id === section.id) {
          assert(corrected); ok(w.draft, patched);
          assert(id.includes('.1.')); checks++;
          reviews.push({ id, indices: targets.map(t => t.index), draftHash: hash(w.draft) });
        }
        output = { verdicts: targets.map(t => ({ targetId: t.targetId, title: t.title,
          focus: [{ path: t.fields[0].path, quote: t.fields[0].text.slice(0, 120) }],
          verdict: negative && w.section.id === section.id && t.index === 4 ? 'unsupported' : 'supported',
          reason: 'Injected whole-section review for control-flow proof, not acceptance.', sourceRefs: t.recommendation.sourceRefs.slice(0, 1) })),
          coverage: w.coverageRequiredSourceRefs.map(sourceRef => ({ sourceRef, verdict: 'covered',
            recommendationIndices: w.draft.recommendations.flatMap((r, index) => r.sourceRefs.includes(sourceRef) ? [index] : []), reason: 'Fixture.' })) };
      } else if (id.includes('.editor.') && negative) fail('UNIT_TIMING_NEGATIVE_BLOCKS');
      else fail('UNIT_TIMING_UNEXPECTED_ROLE', { id });
      return store.finish(lease, seal({ roleId: request.packet.id + '.' + id, output, fixtureOnly: true }));
    } catch (e) { store.release(lease); throw e; }
  } };
  const execute = () => produceFactionStrategyV1({ input, runtime, store, knownRulePolicy, draftEnvelopeBinding,
    zergUnitTimingBinding: binding, onProgress(e) {
      if (e.stage === 'zerg_unit_timing_fields_corrected') { corrected = true; events.push(e); }
      if (e.stage === 'section_complete' && e.section === section.id) completed = store.artifact(section.id + '.result');
    } });
  try {
    if (!negative) {
      await assert.rejects(execute(), { code: 'UNIT_TIMING_INJECTED_INTERRUPTION' }); checks++;
      const saved = store.artifact(section.id + '.zerg-unit-timing-correction-v1.0');
      ok(saved.correction.hash, proposal.hash); ok(saved.originalDraft, original);
      ok(saved.revision, 0); ok(reviews.length, 0);
      const before = generated; store.close(); store = openProductionStore(tmp + '/' + negative + '.sqlite', options);
      await assert.rejects(execute(), { code: 'UNIT_TIMING_NEXT_SECTION' }); checks++;
      ok(generated, before);
      ok(completed.rounds.length, 1); ok(completed.rounds[0].revision, 1);
      ok(completed.rounds[0].draftHash, hash(patched)); ok(completed.edits.length, 1);
      ok(completed.edits[0].correction.hash, proposal.hash);
      ok(completed.runtimeAccepted, false); ok(completed.strategyEffectivenessProven, false);
    } else {
      await assert.rejects(execute(), { code: 'UNIT_TIMING_NEGATIVE_BLOCKS' }); checks++;
      ok(completed, null);
    }
    ok(reviews.length, 6);
    for (const route of ['supportive', 'adversarial'])
      ok(reviews.filter(r => r.id.includes('.' + route + '.')).flatMap(r => r.indices), [0, 1, 2, 3, 4, 5]);
    ok(events.every(e => e.changedFields === 5), true);
    ok(store.summary().calls, 0);
    cases.push({ negative, reviews, correctionEvents: events, resultHash: completed?.hash || null });
  } finally { store.close(); }
}

const files = ['packages/skill-evaluation/faction-zerg-unit-timing-audit-v1.mjs',
  'packages/skill-production-v3/faction-zerg-unit-timing-migration-v1.mjs',
  'packages/skill-production-v3/faction-strategy-workflow-v1.mjs', 'packages/skill-production-v3/faction-continuation-v1.mjs',
  'packages/skill-evaluation/faction-candidate-evidence-v1.mjs', 'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'scripts/check-ticket-18-faction-launch-readiness-v1.mjs', 'scripts/verify-ticket-18-zerg-unit-timing-v1.mjs'];
const main = await readFile(files[5], 'utf8'), consumer = await readFile(files[4], 'utf8');
ok((main.match(/initialSourceCorrectionBinding, zergUnitTimingBinding,/gu) || []).length, 2);
ok(main.includes('zergUnitTiming: zergUnitTimingReadiness, zergUnitTimingDiagnosis'), true);
ok(consumer.includes('zergUnitTimingBinding: recipe.zergUnitTimingBinding || null'), true);
ok(consumer.includes('assertNoFactionZergUnitTimingDebtV1({ input, candidate })'), true);
const gate = seal({ passed: true, checks, binding, origin, cases, providerCalls: 0, actualDshSessions: 0,
  fullDraftPreserved: true, correctedBeforePaidReview: true, freshWholeSectionReviewRequired: true,
  negativeReviewBlocks: true, sqliteRestartPassed: true, runnerParametersBound: true,
  independentDebtVetoPassed: true, originalEvidenceAuthenticated: true,
  actualProductionApplied: false, semanticAcceptance: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
const { hash: ignored, ...body } = parent;
const next = seal({ ...body, zergUnitTimingBinding: binding, zergUnitTimingReadinessHash: gate.hash,
  codeHashes: [...parent.codeHashes.filter(r => !files.includes(r.file)), ...gate.codeHashes] });
const args = { filename, parentRunId: runId, parent, next, gate, diagnosis, inputs: [input] };
const migration = migrate(args); ok(migration.accountingReset, false);
rejects(() => migrate({ ...args, parentRunId: 'faction-v1-aaaaaaaaaaaaaaaaaaaa' }), 'FACTION_ZERG_UNIT_MIGRATION_INVALID');
const alter = change => { const { hash: ignoredNext, ...rest } = next; return seal({ ...rest, ...change }); };
rejects(() => migrate({ ...args, next: alter({ limits: { ...next.limits, maxCalls: next.limits.maxCalls + 1 } }) }), 'FACTION_ZERG_UNIT_MIGRATION_INVALID');
rejects(() => migrate({ ...args, next: alter({ zergUnitTimingReadinessHash: hash('wrong') }) }), 'FACTION_ZERG_UNIT_MIGRATION_INVALID');
await writeFile(base + 'zerg-unit-timing-readiness-v1.json', JSON.stringify(gate, null, 2));
await writeFile(base + 'zerg-unit-timing-migration-proof-v1.json', JSON.stringify(migration, null, 2));
console.log(JSON.stringify({ passed: true, checks, gateChecks: gate.checks, migrationChecks: checks - gate.checks,
  actualFields: proposal.changes.length, injectedNewReviewCalls: 12, providerCalls: 0, actualProductionApplied: false, hash: gate.hash }));
