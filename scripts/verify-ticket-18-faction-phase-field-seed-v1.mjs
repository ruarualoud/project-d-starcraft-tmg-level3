import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { materializeFactionPhaseFieldSeedV1 } from '../packages/skill-production-v3/faction-phase-field-seed-v1.mjs';
import { clarifyFactionPhaseSeedV1 } from '../packages/skill-production-v3/faction-phase-seed-clarification-v1.mjs';
import { produceFactionStrategyV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const json = async name => verifySeal(JSON.parse(await readFile(path.join(base, name + '.json'), 'utf8')));
const runId = 'phase-repair-bd58d5270d852324f694', oldSeedRun = 'field-repair-d393a7c3884ae5104f96';
const [input, knownRulePolicy, sourceSection, candidate, evidence, capture] = await Promise.all([
  json('terran_armed_forces-input'), json('terran_armed_forces-known-rule-policy'), json(runId + '/source-section'),
  json(runId + '/candidate'), json(runId + '/verified-evidence'), json(runId + '/source-capture')]);
const seed = { sourceSection, candidate, evidence, capture }, params = { input, seed };
const materialized = materializeFactionPhaseFieldSeedV1(params), { binding, clarification } = materialized;
assert.equal(binding.parentDraftHash, hash(sourceSection.draft)); assert.equal(binding.actualRepairedDraftHash, candidate.patch.draftHash);
assert.equal(binding.repairedDraftHash, clarification.draftHash); assert.equal(binding.importBeforeRevision, 2);
assert.equal(clarification.changes.length, 1); assert.equal(clarification.changes[0].path, 'alternatives.1');
assert.equal(clarification.modelAuthorshipClaimed, false); assert.equal(clarification.sourceReviewPassed, false);
const reversed = structuredClone(clarification.draft); reversed.recommendations[0].alternatives[1] = clarification.changes[0].before;
assert.equal(hash(reversed), candidate.patch.draftHash);
const reseal = (value, fields) => { const { hash: ignored, ...body } = value; return seal({ ...body, ...fields }); };
for (const fields of [{ actualProviderRequestsReplayed: false }, { candidateHash: hash('foreign') },
  { sourceSectionHash: hash('foreign') }, { independentSourceReviewPassed: true }, { sourceCaptureHash: hash('foreign') },
  { repairedDraftHash: hash('foreign') }, { delivery: { ...evidence.delivery, receiptHashes: [] } }, { loopComparisons: [] }])
  assert.throws(() => materializeFactionPhaseFieldSeedV1({ ...params, seed: { ...seed, evidence: reseal(evidence, fields) } }),
    { code: 'FACTION_PHASE_SEED_EVIDENCE_DRIFT' });
assert.throws(() => materializeFactionPhaseFieldSeedV1({ ...params, seed: { ...seed,
  capture: reseal(capture, { stageId: capture.stageId.replace('supportive.2.0', 'supportive.3.0') }) } }),
  { code: 'FACTION_PHASE_SEED_REVIEW_BOUNDARY_INVALID' });
assert.throws(() => clarifyFactionPhaseSeedV1({ input: reseal(input, { factionRecordKey: 'other' }), candidate }),
  { code: 'FACTION_PHASE_CLARIFICATION_INPUT_DRIFT' });
const fieldRepairSeed = { sourceSection: await json(oldSeedRun + '/source-section'), candidate: await json(oldSeedRun + '/candidate'),
  evidence: await json(oldSeedRun + '/verified-evidence') };
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let actualRoles;
try { actualRoles = new Map(db.prepare("SELECT id,artifact FROM steps WHERE run=? AND state='complete'")
  .all(evidence.sourceRunId).map(row => [row.id, verifySeal(JSON.parse(row.artifact)).value])); } finally { db.close(); }
const temp = await mkdtemp(path.join(base, 'phase-seed-test-'));
async function run(negative) {
  const store = openProductionStore(path.join(temp, negative ? 'negative.sqlite' : 'positive.sqlite'),
    { runId: 'phase-seed-' + negative, recipeHash: hash({ fixtureOnly: true, negative }) });
  let injectedReviews = 0, imported = null, completed = null;
  const runtime = { async role(request) {
    const id = request.packet.id + '.' + request.roleId;
    const fresh = request.roleId.includes('.phase-seed-v1.');
    if (!fresh) { const saved = actualRoles.get(id); assert(saved?.roleId === id,
      'Expected original role: ' + id + ' / ' + request.workspace.structuralFailure); return saved; }
    if (request.roleId.includes('.editor.')) fail('INJECTED_PHASE_NEGATIVE_RETAINED');
    assert(request.roleId.includes('.review-target-batch-v1.')); injectedReviews++;
    assert.equal(actualRoles.has(id), false); assert.equal(hash(request.workspace.draft), binding.repairedDraftHash);
    assert.equal(request.workspace.overallSkill.sections.flatMap(s => s.claims).length, 522);
    const targets = request.workspace.outputRequestAtEnd.targetContract.targets;
    const output = { verdicts: targets.map(t => ({ targetId: t.targetId, title: t.title,
      focus: [{ path: t.fields[0].path, quote: t.fields[0].text.slice(0, 120) }],
      verdict: negative && t.index === 0 ? 'unsupported' : 'supported',
      reason: 'Injected whole-draft review, not an actual semantic judgment.', sourceRefs: t.recommendation.sourceRefs.slice(0, 1) })),
      coverage: request.workspace.coverageRequiredSourceRefs.map(sourceRef => ({ sourceRef, verdict: 'covered',
        recommendationIndices: request.workspace.draft.recommendations.flatMap((r, n) => r.sourceRefs.includes(sourceRef) ? [n] : []),
        reason: 'Injected coverage, not source truth.' })) };
    return seal({ roleId: id, output, fixtureOnly: true });
  } };
  try {
    await assert.rejects(produceFactionStrategyV1({ input, knownRulePolicy, fieldRepairSeed, phaseFieldSeed: seed,
      registeredSourceFieldRepair: true, runtime, store, onProgress(row) {
        if (row.stage === 'actual_phase_field_repair_imported') imported = row;
        if (row.stage === 'section_complete' && row.section === binding.sectionId) { completed = row; fail('INJECTED_PHASE_CAPTURED'); }
      } }), { code: negative ? 'INJECTED_PHASE_NEGATIVE_RETAINED' : 'INJECTED_PHASE_CAPTURED' });
    assert.equal(injectedReviews, 8); assert.equal(imported.changedFields, 11); assert.equal(imported.hostClarifications, 1);
    const result = store.artifact(binding.sectionId + '.result');
    if (negative) { assert.equal(completed, null); assert.equal(result, null); }
    else {
      assert(completed.passed); assert.equal(hash(result.draft), binding.repairedDraftHash);
      assert.equal(result.rounds.at(-1).phaseFieldBindingHash, binding.hash);
      const applied = result.edits.find(e => e.version === 'verified_phase_field_import_v1');
      assert.equal(applied.actualPatch.hash, candidate.patch.hash); assert.equal(applied.hostClarification.hash, clarification.hash);
      assert.equal(applied.oldReviewAcceptanceInherited, false); assert.equal(result.runtimeAccepted, false);
    }
  } finally { store.close(); }
}
await run(false); await run(true);
const files = ['packages/skill-production-v3/faction-phase-field-seed-v1.mjs', 'packages/skill-production-v3/faction-phase-seed-clarification-v1.mjs',
  'packages/skill-production-v3/faction-phase-field-repair-v1.mjs', 'packages/skill-production-v3/faction-strategy-workflow-v1.mjs',
  'packages/skill-evaluation/faction-phase-field-evidence-v1.mjs', 'packages/skill-evaluation/faction-phase-source-debt-v1.mjs',
  'scripts/verify-ticket-18-faction-phase-field-seed-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 20, codeHashes, inputHash: input.hash, bindingHash: binding.hash,
  evidenceHash: evidence.hash, actualRepairReapplied: true, freshReviewRequired: true, freshNegativeRetained: true,
  freshRequestNamespace: true, previousRawRolesRetained: true, importedFields: 11, disclosedHostClarifications: 1,
  injectedReviews: 16, providerCalls: 0, actualFreshSourceReviewPerformed: false, trainingTruth: false });
await writeFile(path.join(base, 'phase-field-seed-readiness.json'), JSON.stringify(report, null, 2));
await writeFile(path.join(base, runId, 'host-clarification.json'), JSON.stringify(clarification, null, 2));
console.log(JSON.stringify({ passed: true, checks: 20, injectedReviews: 16, providerCalls: 0, hash: report.hash }));
