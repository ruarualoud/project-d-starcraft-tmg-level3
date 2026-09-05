import { DatabaseSync } from 'node:sqlite';
import { hash, sha256, verifySeal, seal, safe, fail } from '../skill-production/common.mjs';
import { createAccountedModel } from '../skill-production/model.mjs';

// Re-execute the exact request-building/scoring program using only persisted
// paid responses. The SQLite connection is read-only; there is no credential,
// HTTP or new-attempt port. This verifies actual prompt delivery as well as
// scores, without copying a model's self-declared acceptance flag.
export function openReadOnlyProductionReplayV1({ filename, runId, recipe, commandPolicy = 'finish_only' }) {
  verifySeal(recipe);
  const db = new DatabaseSync(filename, { readOnly: true }), steps = new Set(), receipts = new Set();
  const decode = raw => verifySeal(JSON.parse(raw)).value;
  try {
    if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(runId)?.recipe !== recipe.hash) fail('READ_ONLY_REPLAY_RECIPE_DRIFT');
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    if (db.prepare("SELECT count(*) n FROM attempts WHERE run=? AND state='intent'").get(runId).n
      || db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(runId).n) fail('READ_ONLY_REPLAY_RUN_NOT_TERMINAL');
  } catch (error) { db.close(); throw error; }
  const store = {
    acquire(id, input) {
      const row = db.prepare("SELECT input_hash,artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(runId, id);
      if (!row || row.input_hash !== hash(safe(input)) || steps.has(id)) fail('READ_ONLY_REPLAY_STEP_INPUT_DRIFT');
      steps.add(id); return { cached: false, id, saved: verifySeal(decode(row.artifact)) };
    },
    finish(lease, value) {
      if (verifySeal(value).hash !== lease.saved.hash) fail('READ_ONLY_REPLAY_STEP_OUTPUT_DRIFT'); return lease.saved;
    },
    release() {},
    reserve(id, request) {
      const row = db.prepare('SELECT request_hash,state,response FROM attempts WHERE run=? AND id=?').get(runId, id);
      if (!row || row.request_hash !== hash(safe(request))) fail('READ_ONLY_REPLAY_REQUEST_DRIFT');
      if (row.state !== 'received' || !row.response) fail('READ_ONLY_REPLAY_RESPONSE_MISSING');
      const response = decode(row.response), receipt = response?.usageReceipt;
      if (!receipt) fail('READ_ONLY_REPLAY_RECEIPT_MISSING');
      const { receiptHash, ...body } = receipt;
      if (hash(body) !== receiptHash || body.schemaVersion !== 'starcraft_tmg_provider_egress_transport_v1.success'
        || body.providerProfileRef?.hash !== recipe.modelHash || body.status !== 200
        || body.physicalAttempts !== 1 || body.automaticRetries !== 0
        || body.responseFingerprint !== sha256(JSON.stringify(response.output)) || receipts.has(receiptHash)) fail('READ_ONLY_REPLAY_RECEIPT_INVALID');
      receipts.add(receiptHash); return { cached: true, response };
    },
    settle() { fail('READ_ONLY_REPLAY_MUTATION_FORBIDDEN'); },
  };
  return Object.freeze({ store,
    model: createAccountedModel({ store, commandPolicy, maxInputBytes: recipe.limits.maxInputBytes, outputRecoveryLimit: 4096,
      complete() { fail('READ_ONLY_REPLAY_EGRESS_FORBIDDEN'); } }),
    evidence: () => seal({ runId, recipeHash: recipe.hash, matchedStepIds: [...steps], receiptHashes: [...receipts],
      completeRequestsMatchedByHash: true, rawResponsesMatchedByFingerprint: true,
      newProviderCalls: 0, sourceRefreshPerformed: false, trainingTruth: false }),
    close: () => db.close(),
  });
}
