import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateFactionFieldRepairSeedV1 } from '../packages/skill-production-v3/faction-field-repair-seed-v1.mjs';
import { compareFactionFieldReplayLoopsV1 } from '../packages/skill-evaluation/faction-field-repair-evidence-v1.mjs';
import { produceFactionStrategyV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const json = async name => verifySeal(JSON.parse(await readFile(path.join(base, name + '.json'), 'utf8')));
const runId = 'field-repair-d393a7c3884ae5104f96';
const [input, knownRulePolicy, sourceSection, candidate, evidence] = await Promise.all([
  json('terran_armed_forces-input'), json('terran_armed_forces-known-rule-policy'), json(runId + '/source-section'),
  json(runId + '/candidate'), json(runId + '/verified-evidence')]);
const seed = { sourceSection, candidate, evidence }, params = { input, knownRulePolicy, seed };
const binding = validateFactionFieldRepairSeedV1(params);
assert.equal(binding.parentDraftHash, hash(sourceSection.draft)); assert.equal(binding.repairedDraftHash, candidate.patch.draftHash);
const reseal = (value, fields) => { const { hash: ignored, ...body } = value; return seal({ ...body, ...fields }); };
for (const fields of [{ actualProviderRequestsReplayed: false }, { candidateHash: hash('foreign') },
  { sourceSectionHash: hash('foreign') }, { independentSourceReviewPassed: true },
  { repairedDraftHash: hash('foreign') }, { delivery: { ...evidence.delivery, receiptHashes: [] } }]) {
  assert.throws(() => validateFactionFieldRepairSeedV1({ ...params, seed: { ...seed, evidence: reseal(evidence, fields) } }),
    { code: 'FACTION_FIELD_SEED_EVIDENCE_DRIFT' });
}
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let actualRoles, actualEdit;
try {
  actualRoles = new Map(db.prepare("SELECT id,artifact FROM steps WHERE run=? AND state='complete'")
    .all(evidence.sourceRunId).map(row => [row.id, verifySeal(JSON.parse(row.artifact)).value]));
  actualEdit = db.prepare("SELECT artifact FROM steps WHERE run=? AND state='complete'").all(runId)
    .map(row => verifySeal(JSON.parse(row.artifact)).value).find(value => value.hash === candidate.editArtifactHash);
} finally { db.close(); }
const editedLoop = fields => reseal(actualEdit.loop, fields);
const local = editedLoop({ transcript: actualEdit.loop.transcript.map(t => ({ ...t, observedHash: hash('new local message identity') })),
  events: actualEdit.loop.events.map(e => ['agent/inbox/spliced', 'user/message', 'assistant/message'].includes(e.type)
    ? { ...e, dataHash: hash('new session local message identity') } : e), sandboxReceipt: { freshIsolatedJob: true } });
compareFactionFieldReplayLoopsV1(actualEdit.loop, local, evidence.delivery);
for (const fields of [{ final: { wrong: true } }, { toolTrace: [{ tool: 'forged' }] }, { calls: 2 },
  { transcript: actualEdit.loop.transcript.map(t => ({ ...t, commandHash: hash('wrong') })) },
  { transcript: actualEdit.loop.transcript.map(t => ({ ...t, receiptHash: hash('wrong') })) },
  { events: actualEdit.loop.events.map((e, n) => n === 1 ? { ...e, dataHash: hash('changed stable event') } : e) },
  { deadline: { ...actualEdit.loop.deadline, maxWallMs: 1 } }])
  assert.throws(() => compareFactionFieldReplayLoopsV1(actualEdit.loop, editedLoop(fields), evidence.delivery), { code: 'FACTION_FIELD_EVIDENCE_LOOP_DRIFT' });
assert.throws(() => compareFactionFieldReplayLoopsV1(actualEdit.loop, local,
  reseal(evidence.delivery, { completeRequestsMatchedByHash: false })), { code: 'FACTION_FIELD_EVIDENCE_LOOP_DRIFT' });
const temp = await mkdtemp(path.join(base, 'field-seed-test-'));
async function run(negative) {
  const store = openProductionStore(path.join(temp, negative ? 'negative.sqlite' : 'positive.sqlite'),
    { runId: 'field-seed-' + negative, recipeHash: hash({ fixtureOnly: true, negative }) });
  let injectedReviews = 0, wholeDraftHashes = [], completed = null;
  const runtime = { async role(request) {
    const id = request.packet.id + '.' + request.roleId;
    const fresh = request.roleId.includes('.review-target-batch-v1.') && request.roleId.includes('.2.');
    if (!fresh) {
      if (request.roleId.includes('.editor.2.')) fail('INJECTED_FRESH_NEGATIVE_NOT_WAIVED');
      const saved = actualRoles.get(id); assert(saved?.roleId === id, 'Expected existing real role: ' + id); return saved;
    }
    injectedReviews++; wholeDraftHashes.push(hash(request.workspace.draft));
    assert.equal(hash(request.workspace.draft), candidate.patch.draftHash);
    assert.equal(request.workspace.overallSkill.sections.flatMap(s => s.claims).length, 522);
    const targets = request.workspace.outputRequestAtEnd.targetContract.targets;
    const output = { verdicts: targets.map(t => ({ targetId: t.targetId, title: t.title,
      focus: [{ path: t.fields[0].path, quote: t.fields[0].text.slice(0, 120) }],
      verdict: negative && t.index === 4 ? 'unsupported' : 'supported',
      reason: 'Injected review of the complete corrected draft; not a real semantic judgment.',
      sourceRefs: t.recommendation.sourceRefs.slice(0, 1) })),
      coverage: request.workspace.coverageRequiredSourceRefs.map(sourceRef => ({ sourceRef, verdict: 'covered',
        recommendationIndices: request.workspace.draft.recommendations.flatMap((r, n) => r.sourceRefs.includes(sourceRef) ? [n] : []),
        reason: 'Injected coverage, not semantic proof.' })) };
    return seal({ roleId: id, output, fixtureOnly: true });
  } };
  try {
    await assert.rejects(produceFactionStrategyV1({ input, knownRulePolicy, fieldRepairSeed: seed, runtime, store,
      onProgress(row) { if (row.stage === 'section_complete') { completed = row; fail('INJECTED_FIRST_SECTION_CAPTURED'); } } }),
    { code: negative ? 'INJECTED_FRESH_NEGATIVE_NOT_WAIVED' : 'INJECTED_FIRST_SECTION_CAPTURED' });
    assert.equal(injectedReviews, 8); assert.equal(new Set(wholeDraftHashes).size, 1);
    if (negative) {
      assert.equal(completed, null); assert.equal(store.artifact(sourceSection.section.id + '.result'), null);
    } else {
      assert(completed.passed);
      const result = store.artifact(sourceSection.section.id + '.result');
      assert.equal(hash(result.draft), candidate.patch.draftHash); assert.equal(result.rounds.length, 3);
      const imported = result.edits.find(e => e.version === 'verified_field_repair_import_v1');
      assert.equal(imported.binding.hash, binding.hash); assert.equal(imported.oldReviewAcceptanceInherited, false);
      assert.equal(result.rounds.at(-1).draftHash, imported.resultHash);
      assert.equal(result.runtimeAccepted, false); assert.equal(result.strategyEffectivenessProven, false);
    }
  } finally { store.close(); }
}
await run(false); await run(true);
const files = ['packages/skill-production-v3/faction-field-repair-seed-v1.mjs', 'packages/skill-production-v3/faction-field-repair-v1.mjs',
  'packages/skill-production-v3/faction-strategy-workflow-v1.mjs', 'packages/skill-evaluation/faction-field-repair-evidence-v1.mjs',
  'packages/skill-evaluation/read-only-production-replay-v1.mjs', 'packages/skill-evaluation/faction-semantic-debt-v1.mjs',
  'scripts/verify-ticket-18-faction-field-repair-seed-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 20, codeHashes, inputHash: input.hash, bindingHash: binding.hash,
  evidenceHash: evidence.hash, actualRepairReapplied: true, freshReviewRequired: true, freshNegativeRetained: true,
  injectedReviews: 16, providerCalls: 0, actualFreshSourceReviewPerformed: false, trainingTruth: false });
await writeFile(path.join(base, 'field-seed-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 20, injectedReviews: 16, providerCalls: 0, hash: report.hash }));
