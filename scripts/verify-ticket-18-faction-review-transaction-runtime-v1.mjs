import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFactionReviewTransactionRuntimeV1, createFactionReviewTransactionBindingV1 } from '../packages/skill-production-v3/faction-review-transaction-runtime-v1.mjs';
import { produceFactionStrategyV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { compileGlobalTask } from '../packages/skill-production-v3/context.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const json = async n => verifySeal(JSON.parse(await readFile(path.join(base, n + '.json'), 'utf8')));
const input = await json('terran_armed_forces-input'), zerg = await json('zerg_swarm-input');
const knownRulePolicy = await json('terran_armed_forces-known-rule-policy');
const phaseRun = 'phase-repair-bd58d5270d852324f694', oldRun = 'field-repair-d393a7c3884ae5104f96';
const phaseFieldSeed = { sourceSection: await json(phaseRun + '/source-section'), candidate: await json(phaseRun + '/candidate'),
  evidence: await json(phaseRun + '/verified-evidence'), capture: await json(phaseRun + '/source-capture') };
const fieldRepairSeed = { sourceSection: await json(oldRun + '/source-section'), candidate: await json(oldRun + '/candidate'),
  evidence: await json(oldRun + '/verified-evidence') };
const diagnosis = await json('faction-v1-182042133d7ba5b21c2a/phase-regression-diagnosis');
const recheckRunId = 'dependency-recheck-521bfe25f3aa939e802e';
const recheck = await json(recheckRunId + '/result'), evidence = await json(recheckRunId + '/verified-evidence');
assert.equal(evidence.resultHash, recheck.hash); assert(evidence.actualProviderRequestsMatched);
assert.equal(evidence.loops.length, 2); assert.equal(evidence.newProviderCalls, 0);
const binding = createFactionReviewTransactionBindingV1({ input, phaseFieldSeed });
const zergBinding = createFactionReviewTransactionBindingV1({ input: zerg });
assert.equal(binding.startSectionIndex, 2); assert.equal(zergBinding.startSectionIndex, 0);
assert.equal(binding.revisionBudgetReset, false);
assert.throws(() => createFactionReviewTransactionBindingV1({ input }), { code: 'FACTION_REVIEW_TRANSACTION_SEED_REQUIRED' });
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let actual, freshFirst;
try {
  actual = new Map(db.prepare("SELECT id,artifact FROM steps WHERE run=? AND state='complete'")
    .all(diagnosis.runId).map(r => [r.id, verifySeal(JSON.parse(r.artifact)).value]));
  freshFirst = new Map(db.prepare("SELECT id,artifact FROM steps WHERE run=? AND state='complete'")
    .all(recheckRunId).filter(r => r.id.endsWith('.supportive') || r.id.endsWith('.adversarial'))
    .map(r => [r.id.split('.').at(-1), verifySeal(JSON.parse(r.artifact)).value]));
} finally { db.close(); }
const temp = await mkdtemp(path.join(base, 'review-transaction-test-'));
let injectedRoles = 0, reusedHistoricalRoles = 0, maxTaskBytes = 0;
const runs = [];
async function exercise(negative) {
  const store = openProductionStore(path.join(temp, 'fixture.sqlite'), { runId: 'transaction-' + negative, recipeHash: hash({ negative }) });
  let freshReviews = 0, reviewBindingRepairs = 0, editors = 0, resultCaptured = false, guardWrites = 0;
  const observedStore = { ...store, finish(lease, value) {
    if (value.version === 'faction_review_transaction_patch_guard_v1') guardWrites++;
    return store.finish(lease, value);
  } };
  const runtime = createFactionReviewTransactionRuntimeV1({ input, phaseFieldSeed, store: observedStore, runtime: { async role(request) {
    const id = request.packet.id + '.' + request.roleId;
    const marker = '.source-evidence-v1.' + binding.hash.slice(0, 20);
    if (!id.includes(marker)) {
      const saved = actual.get(id); assert.equal(saved?.roleId, id); reusedHistoricalRoles++; return saved;
    }
    injectedRoles++;
    assert.equal(request.workspace.overallSkill.sections.flatMap(s => s.claims).length, 522);
    const task = compileGlobalTask(input.frozenSources, request.instruction, request.workspace);
    maxTaskBytes = Math.max(maxTaskBytes, Buffer.byteLength(task));
    assert(task.includes('Terran Tenacity <Active> <Movement Phase>'));
    assert(request.workspace.sourceDependencyContextAtEnd.completeContextStillRequired);
    const originalId = id.replace(marker, ''), raw = actual.get(originalId);
    assert(raw?.output, originalId);
    let output = raw.output;
    if (id.includes('.review-target-batch-v1.')) {
      if (/\.[0-9]+$/u.test(originalId)) freshReviews++; else reviewBindingRepairs++;
      const route = id.includes('.supportive.') ? 'supportive' : 'adversarial';
      if (!negative && originalId.endsWith('.0')) output = freshFirst.get(route).output;
    } else { assert(id.includes('.editor.')); editors++; }
    const artifact = seal({ roleId: id, output, actualSourceArtifactHash: raw.hash,
      fixtureReplayNotNewModelJudgment: true, trainingTruth: false });
    const lease = store.acquire(id, { requestHash: hash(request) });
    return lease.cached ? lease.artifact : store.finish(lease, artifact);
  } } });
  assert.equal(runtime.binding.hash, binding.hash);
  try {
    await assert.rejects(produceFactionStrategyV1({ input, knownRulePolicy, fieldRepairSeed, phaseFieldSeed,
      registeredSourceFieldRepair: true, runtime, store: observedStore, onProgress(row) {
        if (row.stage === 'section_complete' && row.section === binding.startSectionId) {
          resultCaptured = true; fail('INJECTED_TRANSACTION_PHASE_COMPLETE');
        }
      } }), { code: negative ? 'FACTION_PRODUCTION_REPAIR_REVALIDATION_REQUIRED' : 'INJECTED_TRANSACTION_PHASE_COMPLETE' });
    assert.equal(freshReviews, 8);
    if (negative) {
      assert.equal(editors, 1); assert.equal(guardWrites, 1); assert(!resultCaptured);
      assert.equal(store.artifact(binding.startSectionId + '.result'), null);
      const journal = store.summary();
      const guardStep = journal.steps.find(s => s.id.endsWith('.repair-checkpoint-guard'));
      const receipt = store.artifact(guardStep.id);
      assert.equal(receipt.inspection.changes.length, 3); assert.equal(receipt.applied, false);
      assert.equal(store.artifact(guardStep.id.replace('.repair-checkpoint-guard', '')).hash, receipt.rawArtifactHash);
    } else {
      assert.equal(editors, 0); assert(resultCaptured); assert.equal(guardWrites, 0);
      const section = store.artifact(binding.startSectionId + '.result');
      assert.equal(hash(section.draft), recheck.plan.draftHash);
      assert.equal(section.rounds.at(-1).revision, 2); assert.equal(section.edits.length > 0, true);
      assert.equal(section.runtimeAccepted, false);
    }
    runs.push({ negative, freshReviews, reviewBindingRepairs, editors, guardWrites, resultCaptured });
  } finally { store.close(); }
}
await exercise(false); await exercise(true);
const files = ['packages/skill-production-v3/faction-review-transaction-runtime-v1.mjs',
  'packages/skill-production-v3/faction-source-dependency-context-v1.mjs',
  'packages/skill-production-v3/faction-repair-regression-guard-v1.mjs',
  'packages/skill-production-v3/faction-strategy-workflow-v1.mjs',
  'scripts/verify-ticket-18-faction-review-transaction-runtime-v1.mjs'];
const report = seal({ passed: true, inputHashes: [input.hash, zerg.hash], bindingHashes: [binding.hash, zergBinding.hash],
  actualRecheckRunId: recheckRunId, actualRecheckEvidenceHash: evidence.hash,
  actualBadEditCaptureHash: diagnosis.hash, fullOldWorkflowReplayed: true,
  oldRequestsUnchangedBeforeIntervention: true, newReviewNamespaces: true,
  badEditBlockedBeforeApplicationAndBeforeNextReview: true, blockedRawEditAndReceiptPersisted: true,
  modelReviewAcceptanceNotInherited: true, originalRevisionBudgetPreserved: true,
  runs, injectedRoles, reusedHistoricalRoles, maxTaskBytes,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) }))),
  actualCompleteSectionReviewPerformed: false, actualSourceRecheckCallsPreviouslyCompleted: 2, newProviderCalls: 0, trainingTruth: false });
await writeFile(path.join(base, 'review-transaction-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, runs, injectedRoles, reusedHistoricalRoles, maxTaskBytes, newProviderCalls: 0, hash: report.hash }));
