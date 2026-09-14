import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hash, seal, verifySeal } from '../packages/skill-production/common.mjs';
import { createStrategyStructuredWorkflowV1 } from '../packages/strategy-skills/strategy-structured-workflow-v1.mjs';
import { createStrategyEvidenceReviewerV2 } from '../packages/strategy-skills/strategy-evidence-review-runtime-v2.mjs';
import { createEvidenceReviewedStrategyProductionV1 } from '../packages/strategy-skills/strategy-evidence-production-v1.mjs';
import { loadEvidenceReviewFixtureV1 } from './support/strategy-evidence-review-fixture-v1.mjs';
import { prepareReviewCapacityMigrationV2 } from './support/strategy-review-capacity-migration-v2.mjs';
import { PARENT_RUN } from './support/strategy-opening-fence-continuation-v1.mjs';
import { BUILD, DB_PATH, json, ledgerSnapshot, providerRegistry, priceUsage, codeHashes } from './support/strategy-live-production-support-v1.mjs';
const ledger = ledgerSnapshot(), fixture = await loadEvidenceReviewFixtureV1();
const prefix = 'build/ticket-18-general-strategy-live-v1/' + PARENT_RUN + '/';
const frozen = await json(prefix + 'evidence-review-calibration-v1/calibration-private.json');
assert.equal(fixture.calibration.hash, frozen.hash, 'Other-axis production must not alter a frozen reviewer calibration identity');
const migration = await prepareReviewCapacityMigrationV2(fixture);
const pilot = await json(prefix + 'evidence-production-pilot-v1/report.json');
const calibrated = await json(prefix + 'evidence-review-calibration-v2/report.json');
const caps = await json('build/ticket-18-general-strategy-live-v1/capabilities.json');
const db = new DatabaseSync(DB_PATH, { readOnly: true });
const checks = ['frozen calibration identity survives actual second-axis generation'];
let cachedReads = 0;
const forbidden = () => { throw new Error('RESTART_MUST_NOT_WRITE_OR_CALL_PROVIDER'); };
const artifact = id => {
  const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(PARENT_RUN, id);
  return row ? verifySeal(JSON.parse(row.artifact)).value : null;
};
const store = { acquire(id, input) {
  const row = db.prepare("SELECT input_hash,artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(PARENT_RUN, id);
  assert(row, 'A real completed checkpoint must exist: ' + id); assert.equal(row.input_hash, hash(input)); cachedReads++;
  return { cached: true, artifact: verifySeal(JSON.parse(row.artifact)).value };
}, artifact, finish: forbidden, release: forbidden, reserve: forbidden, settle: forbidden };
const dsh = { run: forbidden }, providerAdapter = { complete: forbidden }, binding = providerRegistry().binding;
try {
  const byHash = new Map(caps.receipts.map(r => [r.capabilityReceipt.outputContractRef.hash, r.capabilityReceipt]));
  const generator = createStrategyStructuredWorkflowV1({ input: fixture.input, store, dsh, providerAdapter, egressBinding: binding,
    executionPolicy: fixture.originalRecipe.executionPolicy, priceUsage,
    capabilityReceiptRegistry: { resolve: r => ({ ok: byHash.has(r.outputContractRef.hash), capabilityReceipt: byHash.get(r.outputContractRef.hash) }) } });
  const actual = createStrategyEvidenceReviewerV2({ store, dsh, providerAdapter, egressBinding: binding,
    capabilityReceipt: calibrated.capability, executionPolicy: fixture.originalRecipe.executionPolicy, priceUsage });
  const reviewer = { review: prepared => prepared.hash === migration.recovered.preparedHash
    ? Promise.resolve(migration.recovered) : actual.review(prepared) };
  const workflow = createEvidenceReviewedStrategyProductionV1({ input: fixture.input, store, generator, reviewer });
  const first = await workflow.resumeMaterialized({ artifact: fixture.materialized, history: fixture.history });
  const second = await workflow.produceAxis('activation_tempo');
  assert.equal(first.hash, pilot.candidates[0].hash); assert.equal(second.hash, pilot.candidates[1].hash);
  checks.push('both actual candidates reproduce exact hashes through read-only checkpoint ports');
  assert.equal(cachedReads, 14); checks.push('seven generation roles five stored review batches and two candidates reused');
  assert.equal(ledgerSnapshot().hash, ledger.hash); checks.push('no credential lookup DSH Provider write or billing change');
} finally { db.close(); }
const report = seal({ schema: 'ticket18_review_history_isolation_readiness_v1', passed: true, checks, cachedReads,
  calibrationHash: frozen.hash, actualPilotReportHash: pilot.hash,
  codeHashes: await codeHashes(['scripts/support/strategy-evidence-review-fixture-v1.mjs', 'scripts/verify-ticket-18-review-history-isolation-v1.mjs']),
  providerCalls: 0, trainingTruth: false });
await writeFile(path.join(BUILD, 'review-history-isolation-readiness-v1.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ passed: true, checks: checks.length, cachedReads, hash: report.hash }));
