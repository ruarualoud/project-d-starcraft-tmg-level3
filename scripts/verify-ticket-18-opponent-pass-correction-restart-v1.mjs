import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hash, seal, verifySeal } from '../packages/skill-production/common.mjs';
import { createStrategyEvidenceReviewerV2 } from '../packages/strategy-skills/strategy-evidence-review-runtime-v2.mjs';
import { createStrategySourceCorrectionWorkflowV1 } from '../packages/strategy-skills/strategy-source-correction-v1.mjs';
import { separateInitialStrategyAndEvolutionV1 } from '../packages/strategy-skills/strategy-scope-separation-v1.mjs';
import { PARENT_RUN } from './support/strategy-opening-fence-continuation-v1.mjs';
import { BUILD, DB_PATH, json, ledgerSnapshot, providerRegistry, priceUsage,
  codeHashes } from './support/strategy-live-production-support-v1.mjs';

const ledger = ledgerSnapshot(), prefix = 'build/ticket-18-general-strategy-live-v1/' + PARENT_RUN + '/';
const input = await json(prefix + 'production-input.json');
const originalRecipe = await json(prefix + 'recipe.json');
const parent = await json(prefix + 'general-strategy-batch-v1/axis-opponent_response.json');
const actual = await json(prefix + 'opponent-pass-source-correction-v1/axis-opponent_response.json');
const report = await json(prefix + 'opponent-pass-source-correction-v1/report.json');
const separation = await json(prefix + 'opponent-pass-source-correction-v1/strategy-scope-separation.json');
const calibrated = await json(prefix + 'evidence-review-calibration-v2/report.json');
assert.equal(report.failure, null); assert.equal(report.correctedCandidateHash, actual.hash);
assert.equal(report.separationResultHash, separation.hash); assert.equal(actual.lifecycle.events.length, 11);
assert.equal(actual.lifecycle.open, 0); assert.equal(actual.lifecycle.uncertain, 0);
assert.equal(actual.status, 'model_review_clear_pending_independent_validation');
const audit = actual.roleHistory.find(item => item.schema === 'strategy_bound_source_audit_v1');
assert(audit); assert.equal(audit.route, 'exact_host_field_patch_allowed');

const db = new DatabaseSync(DB_PATH, { readOnly: true });
let cachedReads = 0, writes = 0, dshCalls = 0, providerCalls = 0;
const forbiddenWrite = () => { writes++; throw new Error('CORRECTION_RESTART_MUST_NOT_WRITE'); };
const forbiddenDsh = () => { dshCalls++; throw new Error('CORRECTION_RESTART_MUST_NOT_CALL_DSH'); };
const forbiddenProvider = () => { providerCalls++; throw new Error('CORRECTION_RESTART_MUST_NOT_CALL_PROVIDER'); };
const artifact = id => {
  const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(PARENT_RUN, id);
  return row ? verifySeal(JSON.parse(row.artifact)).value : null;
};
const store = { acquire(id, value) {
  const row = db.prepare("SELECT input_hash,artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(PARENT_RUN, id);
  assert(row, 'Missing actual checkpoint: ' + id); assert.equal(row.input_hash, hash(value)); cachedReads++;
  return { cached: true, artifact: verifySeal(JSON.parse(row.artifact)).value };
}, artifact, finish: forbiddenWrite, release: forbiddenWrite, reserve: forbiddenWrite, settle: forbiddenWrite };
try {
  const reviewer = createStrategyEvidenceReviewerV2({ store, dsh: { run: forbiddenDsh },
    providerAdapter: { complete: forbiddenProvider }, egressBinding: providerRegistry().binding,
    capabilityReceipt: calibrated.capability, executionPolicy: originalRecipe.executionPolicy, priceUsage });
  const rebuilt = await createStrategySourceCorrectionWorkflowV1({ input, reviewer, store })
    .repairOpponentResponsePass(parent);
  assert.equal(rebuilt.hash, actual.hash); assert.equal(cachedReads, 4);
  const pilot = await json(prefix + 'evidence-production-pilot-v1/report.json');
  const candidates = [pilot.candidates.find(item => item.axis === 'objective_plan')];
  for (const axis of input.contract.requiredAxes.filter(axis => axis !== 'objective_plan')) {
    candidates.push(axis === 'opponent_response' ? rebuilt
      : await json(prefix + 'general-strategy-batch-v1/axis-' + axis + '.json'));
  }
  assert.equal(separateInitialStrategyAndEvolutionV1({ input, candidates }).hash, separation.hash);
  assert.equal(writes, 0); assert.equal(dshCalls, 0); assert.equal(providerCalls, 0);
  assert.equal(ledgerSnapshot().hash, ledger.hash);
} finally { db.close(); }
const readiness = seal({ schema: 'ticket18_opponent_pass_correction_restart_readiness_v1',
  ticket: 18, slice: 174, passed: true, checks: [
    'actual source failure binds exact parent field and two official passages',
    'one-field Host correction has eleven fresh model evidence events',
    'four real checkpoints reproduce the exact corrected candidate',
    'seven-axis initial and one-axis evolution projection reproduces exact hash',
    'restart performs zero credential DSH Provider write or billing action',
  ], cachedReads, writes, dshCalls, providerCalls, correctedCandidateHash: actual.hash,
  separationResultHash: separation.hash, codeHashes: await codeHashes([
    'packages/strategy-skills/strategy-source-correction-v1.mjs',
    'packages/strategy-skills/strategy-scope-separation-v1.mjs',
    'scripts/run-ticket-18-opponent-pass-source-correction-v1.mjs',
    'scripts/verify-ticket-18-opponent-pass-correction-restart-v1.mjs',
  ]), fullSourceAuditPassed: false, runtimeAccepted: false, trainingTruth: false });
await writeFile(path.join(BUILD, 'opponent-pass-correction-restart-readiness-v1.json'),
  JSON.stringify(readiness, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ passed: true, checks: readiness.checks.length, cachedReads,
  writes, dshCalls, providerCalls, hash: readiness.hash }));
