import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { readRosterTeachTypedEvidenceV1 } from '../packages/roster-strategist/roster-teach-typed-evidence-v1.mjs';
import { qualifyRosterTeachFrameworkSynthesisV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const [directory] = process.argv.slice(2);
const names = (await fs.readdir(`${directory}/workspace/iterative-draft/sessions`)).filter(n => n.endsWith('.json'));
assert.equal(names.length, 1);
const raw = JSON.parse(await fs.readFile(`${directory}/workspace/iterative-draft/sessions/${names[0]}`, 'utf8'));
const state = (raw.value ?? raw).draftTeachSnapshots.at(-1).state;
const evidence = [...state.evidence, ...state.investigation.evidence,
  ...state.queryRecovery.operations.map(o => o.result).filter(Boolean)];
const request = JSON.parse(gunzipSync(await fs.readFile(`${directory}/request-134.private.json.gz`)));
const errors = request.promptNodes[0].citationFeedback.correctableFailures;
const cases = errors.flatMap(issue => {
  const receipt = evidence.find(e => e.receiptHash === issue.receiptRef);
  const dotted = issue.path?.replace(/^\//u, '').replaceAll('/', '.');
  const expected = readRosterTeachTypedEvidenceV1(receipt, dotted);
  return receipt && issue.path.includes('/') && expected.ok ? [{ issue, receipt, expected }] : [];
});
assert(cases.length >= 4, 'Reproduce real E134 values, not fabricated evidence');
const before = JSON.stringify(cases.map(c => c.receipt));
const failed = cases.filter(c => !readRosterTeachTypedEvidenceV1(c.receipt, c.issue.path).ok);
assert.equal(failed.length, 0, `Exact delivered values incorrectly rejected only for slash encoding: ${failed.length}`);
for (const { issue, receipt, expected } of cases) {
  const path = issue.path.replace(/^\//u, '');
  assert.deepEqual(readRosterTeachTypedEvidenceV1(receipt, path), expected);
  assert.deepEqual(readRosterTeachTypedEvidenceV1(receipt, `/${path}`), expected);
  const answer = { questionId: receipt.questionId || receipt.challengeId, disposition: 'retain',
    evidenceRefs: [receipt.receiptHash], quantitativeEvidence: [{ receiptRef: receipt.receiptHash,
      path: `/${path}`, interpretation: 'Original scalar in its original scenario.' }], qualitativeEvidence: [] };
  const qualified = qualifyRosterTeachFrameworkSynthesisV1({ synthesis: { answers: [answer], frameworkFeedback: [] }, evidence });
  const bound = [...qualified.answers[0].quantitativeEvidence, ...qualified.answers[0].qualitativeEvidence][0];
  assert.equal(bound.status, 'receipt_bound');
  assert.deepEqual(bound.values, expected.values);
  assert.equal(bound.interpretationVerified, false);
}
const receipt = cases[0].receipt;
// v295 permits a table REFERENCE, never a table coerced to a numeric value.
const table = readRosterTeachTypedEvidenceV1(receipt, '/sourceReceipt/result/rows');
assert.equal(table.category, 'qualitativeEvidence');
assert.equal(table.valueType, 'structured_reference');
assert.equal(table.value.numericUseAllowed, false);
assert.equal(readRosterTeachTypedEvidenceV1(receipt, '/sourceReceipt/result/not_a_delivered_field').code,
  'ROSTER_TEACH_EVIDENCE_PATH_NOT_FOUND');
assert.equal(readRosterTeachTypedEvidenceV1(receipt, '/sourceReceipt/result/~7invalid').code,
  'ROSTER_TEACH_EVIDENCE_PATH_NOT_FOUND');
const unknown = evidence.find(e => e.status === 'unknown' && typeof e.unknownReasonCode === 'string');
assert(unknown);
const answer = { questionId: unknown.questionId || unknown.challengeId, disposition: 'retain',
  evidenceRefs: [unknown.receiptHash], quantitativeEvidence: [], qualitativeEvidence: [{
    receiptRef: unknown.receiptHash, path: '/unknownReasonCode', interpretation: 'Historical query failure only.' }] };
const qualified = qualifyRosterTeachFrameworkSynthesisV1({ synthesis: { answers: [answer], frameworkFeedback: [] }, evidence });
assert.equal(qualified.answers[0].qualitativeEvidence[0].pathRepair.code, 'ROSTER_TEACH_EVIDENCE_RECEIPT_UNRESOLVED');
assert.equal(JSON.stringify(cases.map(c => c.receipt)), before);
console.log(JSON.stringify({ pass: true, actualPaidPaths: cases.length,
  exactValuesAndTypesPreserved: true, unknownNotPromoted: true, providerCalls: 0, nativeCalls: 0 }));
