import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
import { classifyStarcraftTmgStructuredFailureV1 } from '../packages/structured-generation/failure-classifier-v1.mjs';

// Evidence-only diagnosis: never retries or changes the running production.
const runId = 'faction-v1-3241bb0aff2eda69e7c9';
const base = 'build/ticket-18-faction-production-v1/';
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
const samples = [];
try {
  if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
    fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  for (const id of ['structured-34d5da73ed13d7fd4aca86335286d223031ab2d7d27c71d6',
    'structured-fb27afa3b71c48f4426c83c2802e714310d556e11c3b9299']) {
    const attempt = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, id);
    const receipt = verifySeal(JSON.parse(attempt.response)).value;
    const issue = verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?')
      .get(runId, id + '.issue').artifact)).value;
    const { receiptHash, ...body } = receipt;
    assert.equal(hash(body), receiptHash);
    assert.equal(issue.safeReceiptHash, receiptHash);
    assert.equal(id, 'structured-' + issue.invocationHash.slice(0, 48));
    assert.equal(attempt.state, 'failed');
    assert.equal(receipt.status, 200);
    assert.equal(receipt.incompleteReason, null);
    assert.equal(receipt.automaticRetries, 0);
    const wire = receipt.schemaIssues.some(row => row.path === '$' && row.code === 'provider_json_not_parseable');
    const currentClassification = classifyStarcraftTmgStructuredFailureV1({
      error: { code: attempt.code }, safeReceipt: receipt,
      policy: { encryptedRawQuarantineAvailable: false },
    });
    assert.equal(currentClassification.class, 'schema_instance');
    if (wire) {
      assert.equal(issue.rejectedCandidateRef, null);
      assert.equal(issue.rawPayloadPersisted, false);
      assert.equal(db.prepare('SELECT count(*) n FROM steps WHERE run=? AND id=?')
        .get(runId, id + '.rejected-candidate').n, 0);
    } else {
      assert.equal(receipt.schemaIssues.length, 1);
      assert.deepEqual(receipt.schemaIssues[0], {
        path: '$.verdicts[1].focus', code: 'array_too_long', actualItems: 17, minItems: 1, maxItems: 16,
      });
      const rejected = verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?')
        .get(runId, issue.rejectedCandidateRef.id).artifact)).value;
      assert.equal(rejected.hash, issue.rejectedCandidateRef.hash);
      assert.equal(rejected.providerValue.verdicts[1].focus.length, 17);
    }
    samples.push({ attemptId: id, attemptHash: hash(attempt), issueHash: issue.hash,
      originalReceiptHash: receiptHash, outputTextHash: receipt.outputTextHash,
      schemaIssues: receipt.schemaIssues, usage: receipt.usage, settledMicros: attempt.settled,
      currentClassification, expectedClass: wire ? 'wire_syntax' : 'schema_instance',
      classificationCorrect: !wire, rawPayloadPersisted: issue.rawPayloadPersisted,
      parsedCandidateAvailable: Boolean(issue.rejectedCandidateRef),
      originalWirePayloadRecoverable: false, originalReceiptOverwritten: false });
  }
} finally { db.close(); }
const report = seal({ version: 'faction_current_review_wire_diagnosis_v1', runId,
  diagnosisReproduced: true, productionFixed: false, samples,
  conclusions: ['Complete wire-invalid output is misclassified as schema_instance.',
    'The old unparseable payload was not retained and cannot be reconstructed from its hash.',
    'The separate 17-focus schema failure retains its parsed candidate for the existing lossless recovery.'],
  requiredNextWork: ['Preserve original failure and bill; do not retry identical whole-context review.',
    'After the active lane settles, bind syntax-aware classification and encrypted raw quarantine.',
    'Old missing raw needs an explicit stronger/decomposed review route, not a claimed lossless import.',
    'Source-negative judgments and known rule debts remain independent qualification blockers.'],
  databaseModified: false, providerCalls: 0, sourceRefreshPerformed: false,
  rawOutputPrinted: false, canAffectRules: false, runtimeAccepted: false, trainingTruth: false,
  codeHashes: await Promise.all(['scripts/diagnose-ticket-18-faction-current-review-wire-v1.mjs',
    'packages/structured-generation/failure-classifier-v1.mjs',
    'packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs']
    .map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
const filename = base + runId + '/review-wire-diagnosis-' + report.hash.slice(0, 20) + '.json';
await writeFile(filename, JSON.stringify(report, null, 2), { flag: 'wx' }).catch(async error => {
  if (error.code !== 'EEXIST' || await readFile(filename, 'utf8') !== JSON.stringify(report, null, 2)) throw error;
});
console.log(JSON.stringify({ diagnosisReproduced: true, productionFixed: false, samples: samples.length,
  providerCalls: 0, hash: report.hash, filename }));
