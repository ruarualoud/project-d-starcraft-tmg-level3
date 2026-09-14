import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hash, seal, verifySeal } from '../packages/skill-production/common.mjs';
import { createStrategyStructuredWorkflowV1 } from '../packages/strategy-skills/strategy-structured-workflow-v1.mjs';
import { createStrategyEvidenceReviewerV2 } from '../packages/strategy-skills/strategy-evidence-review-runtime-v2.mjs';
import { createEvidenceReviewedStrategyProductionV1 } from '../packages/strategy-skills/strategy-evidence-production-v1.mjs';
import { createSourceAdjudicatedStrategyRepairV1 } from '../packages/strategy-skills/strategy-source-adjudicated-repair-v1.mjs';
import { PARENT_RUN } from './support/strategy-opening-fence-continuation-v1.mjs';
import { BUILD, DB_PATH, json, ledgerSnapshot, providerRegistry, priceUsage,
  codeHashes } from './support/strategy-live-production-support-v1.mjs';

const ledger = ledgerSnapshot(), prefix = 'build/ticket-18-general-strategy-live-v1/' + PARENT_RUN + '/';
const input = await json(prefix + 'production-input.json');
const originalRecipe = await json(prefix + 'recipe.json');
const pilot = await json(prefix + 'evidence-production-pilot-v1/report.json');
const activation = await json(prefix + 'evidence-production-pilot-v1/axis-activation_tempo.json');
const batch = await json(prefix + 'general-strategy-batch-v1/report.json');
const recipe = await json(prefix + 'general-strategy-batch-v1/recipe.json');
const calibrated = await json(prefix + 'evidence-review-calibration-v2/report.json');
const capabilities = await json('build/ticket-18-general-strategy-live-v1/capabilities.json');
const remainingAxes = ['movement_position', 'threat_trade', 'resource_timing',
  'uncertainty', 'opponent_response', 'review_adaptation'];
const expected = new Map();
expected.set('objective_plan', pilot.candidates.find(candidate => candidate.axis === 'objective_plan'));
for (const axis of ['activation_tempo', ...remainingAxes]) {
  expected.set(axis, await json(prefix + 'general-strategy-batch-v1/axis-' + axis + '.json'));
}
assert.equal(batch.recipeHash, recipe.hash); assert.equal(batch.failure, null);
assert.deepEqual(batch.completedAxes, input.contract.requiredAxes); assert.equal(batch.candidateCount, 8);
assert.equal(batch.modelReviewClearAxes, 8); assert.equal(batch.targetedSourceRepairVerified, true);
assert.deepEqual(batch.candidateHashes, input.contract.requiredAxes.map(axis => expected.get(axis).hash));
for (const axis of input.contract.requiredAxes) {
  const candidate = expected.get(axis); verifySeal(candidate);
  assert.equal(candidate.axis, axis); assert.equal(candidate.inputHash, input.hash);
  assert.equal(candidate.status, 'model_review_clear_pending_independent_validation');
  assert.equal(candidate.lifecycle.events.length, 11); assert.equal(candidate.lifecycle.open, 0);
  assert.equal(candidate.lifecycle.uncertain, 0); assert.equal(candidate.lifecycle.modelReportedClear, 11);
  assert.equal(candidate.runtimeAccepted, false); assert.equal(candidate.trainingTruth, false);
}

const db = new DatabaseSync(DB_PATH, { readOnly: true });
let cachedReads = 0, dshCalls = 0, providerCalls = 0, writes = 0;
const forbiddenWrite = () => { writes++; throw new Error('BATCH_RESTART_MUST_NOT_WRITE'); };
const forbiddenDsh = () => { dshCalls++; throw new Error('BATCH_RESTART_MUST_NOT_CALL_DSH'); };
const forbiddenProvider = () => { providerCalls++; throw new Error('BATCH_RESTART_MUST_NOT_CALL_PROVIDER'); };
const artifact = id => {
  const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(PARENT_RUN, id);
  return row ? verifySeal(JSON.parse(row.artifact)).value : null;
};
const store = { acquire(id, value) {
  const row = db.prepare("SELECT input_hash,artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(PARENT_RUN, id);
  assert(row, 'Missing actual checkpoint: ' + id); assert.equal(row.input_hash, hash(value)); cachedReads++;
  return { cached: true, artifact: verifySeal(JSON.parse(row.artifact)).value };
}, artifact, finish: forbiddenWrite, release: forbiddenWrite, reserve: forbiddenWrite, settle: forbiddenWrite };
const dsh = { run: forbiddenDsh }, providerAdapter = { complete: forbiddenProvider };
const binding = providerRegistry().binding;
try {
  const byHash = new Map(capabilities.receipts.map(row =>
    [row.capabilityReceipt.outputContractRef.hash, row.capabilityReceipt]));
  const generator = createStrategyStructuredWorkflowV1({ input, store, dsh, providerAdapter,
    egressBinding: binding, executionPolicy: originalRecipe.executionPolicy, priceUsage,
    capabilityReceiptRegistry: { resolve: request => ({ ok: byHash.has(request.outputContractRef.hash),
      capabilityReceipt: byHash.get(request.outputContractRef.hash) }) } });
  const reviewer = createStrategyEvidenceReviewerV2({ store, dsh, providerAdapter,
    egressBinding: binding, capabilityReceipt: calibrated.capability,
    executionPolicy: originalRecipe.executionPolicy, priceUsage });
  const repair = createSourceAdjudicatedStrategyRepairV1({ input, reviewer, store });
  const corrected = await repair.repairActivationTempo(activation);
  assert.equal(corrected.hash, expected.get('activation_tempo').hash);
  const workflow = createEvidenceReviewedStrategyProductionV1({ input, store, generator, reviewer });
  for (const axis of remainingAxes) {
    const candidate = await workflow.produceAxis(axis);
    assert.equal(candidate.hash, expected.get(axis).hash);
  }
  assert.equal(cachedReads, 70);
  assert.equal(dshCalls, 0); assert.equal(providerCalls, 0); assert.equal(writes, 0);
  assert.equal(ledgerSnapshot().hash, ledger.hash);
} finally { db.close(); }

const readable = await readFile(path.join(BUILD, PARENT_RUN, 'general-strategy-batch-v1/strategy-candidates.md'), 'utf8');
for (const axis of input.contract.requiredAxes) assert(readable.includes('(' + axis + ')'));
const report = seal({ schema: 'ticket18_general_strategy_batch_restart_readiness_v1', ticket: 18, slice: 174,
  passed: true, checks: [
    'eight exact candidates cover the frozen general strategy axis denominator',
    'each candidate has eleven current-field model evidence events with no inherited runtime acceptance',
    'targeted activation repair and six generated axes reproduce exact hashes from seventy real checkpoints',
    'read-only restart performs zero DSH Provider credential write or billing operations',
    'expert-readable aggregate contains all eight axes',
  ], cachedReads, providerCalls, dshCalls, writes, batchReportHash: batch.hash,
  candidateHashes: batch.candidateHashes, sourceReviewIndependentlyVerified: false,
  decisionCasesPassed: false, completeGamePassed: false,
  codeHashes: await codeHashes([
    'packages/strategy-skills/strategy-source-adjudicated-repair-v1.mjs',
    'scripts/run-ticket-18-general-strategy-batch-v1.mjs',
    'scripts/verify-ticket-18-general-strategy-batch-restart-v1.mjs',
  ]), runtimeAccepted: false, trainingTruth: false });
await writeFile(path.join(BUILD, 'general-strategy-batch-restart-readiness-v1.json'),
  JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ passed: true, checks: report.checks.length, cachedReads,
  providerCalls, dshCalls, writes, hash: report.hash }));
