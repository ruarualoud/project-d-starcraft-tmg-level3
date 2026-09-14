import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { classifyStarcraftTmgStructuredFailureV2 as classify } from '../packages/structured-generation/failure-classifier-v2.mjs';

const runId = 'faction-v1-3241bb0aff2eda69e7c9';
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
const readAttempt = id => {
  const a = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, id);
  return { code: a.code, safeReceipt: verifySeal(JSON.parse(a.response)).value };
};
let wire, schema;
try {
  assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
  wire = readAttempt('structured-34d5da73ed13d7fd4aca86335286d223031ab2d7d27c71d6');
  schema = readAttempt('structured-fb27afa3b71c48f4426c83c2802e714310d556e11c3b9299');
} finally { db.close(); }
let checks = 0;
const check = (label, fn) => { fn(); checks++; };
const wireHash = hash(wire), schemaHash = hash(schema);
check('actual complete bad JSON is wire syntax, not a field error', () => {
  const value = classify(wire);
  assert.equal(value.class, 'wire_syntax');
  assert.equal(value.retryRoute, 'quarantine_no_raw_recovery');
  assert.equal(value.maxAdditionalProviderAttempts, 0);
});
check('actual 17-focus response remains a schema-instance failure', () => {
  assert.equal(classify(schema).class, 'schema_instance');
});
check('historical paid receipts are not rewritten', () => {
  assert.equal(hash(wire), wireHash); assert.equal(hash(schema), schemaHash);
});
for (const [code, receipt, expected] of [
  ['PROVIDER_PAYMENT_REQUIRED', { status: 402 }, 'payment_exhausted'],
  ['STRUCTURED_PROVIDER_INCOMPLETE', { usageKnown: true }, 'output_incomplete'],
  ['STRUCTURED_PROVIDER_AMBIGUOUS_SEND', { requestMayHaveBeenSent: true, usageKnown: false }, 'ambiguous_egress'],
  ['PROVIDER_AUTHENTICATION_FAILED', {}, 'provider_terminal'],
  ['STRUCTURED_PROVIDER_REFUSAL', {}, 'provider_terminal'],
]) check('preserve stronger stop: ' + code, () => {
  assert.equal(classify({ code, safeReceipt: receipt }).class, expected);
});
check('repeated identical failed request still stops', () => {
  const first = classify(wire);
  assert.equal(classify({ ...wire, priorFailureFingerprint: first.fingerprint }).class, 'repeated_no_progress');
});
check('availability flag alone does not invent saved raw', () => {
  assert.equal(classify({ ...wire, policy: { encryptedRawQuarantineAvailable: true } }).retryRoute,
    'quarantine_no_raw_recovery');
});
check('tampered syntax receipt is not classification evidence', () => {
  assert.throws(() => classify({ ...wire, safeReceipt: { ...wire.safeReceipt, outputTextHash: hash('different') } }),
    { code: 'STRUCTURED_WIRE_CLASSIFICATION_RECEIPT_INVALID' });
});
const report = seal({ version: 'wire_classification_component_v2', passed: true, checks,
  actualFailureReceiptHashes: [wire.safeReceipt.receiptHash, schema.safeReceipt.receiptHash],
  originalReceiptsPreserved: true, formalProductionWired: false, providerCalls: 0, trainingTruth: false,
  codeHashes: await Promise.all(['scripts/verify-ticket-18-wire-classification-v2.mjs',
    'packages/structured-generation/failure-classifier-v2.mjs',
    'packages/structured-generation/failure-classifier-v1.mjs']
    .map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile('build/ticket-18-faction-production-v1/wire-classification-component-v2.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, providerCalls: 0, formalProductionWired: false, hash: report.hash }));
