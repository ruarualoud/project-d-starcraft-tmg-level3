import assert from 'node:assert/strict';
import { hash, verifySeal } from '../packages/skill-production/common.mjs';
import { readFactionTeachFailureEvidenceV1 } from
  '../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';
import { routeFactionOutlineCapacityEvidenceV1 } from
  '../packages/skill-production-v3/faction-outline-capacity-runtime-v1.mjs';

const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const runId = 'faction-v1-6fb3850f59642566130f';
const attemptId =
  'structured-d56c87a28f24d0aabaf0d6f33a7e13f8cd7ff20ec478c4ce';
const expected = readFactionTeachFailureEvidenceV1({ filename, runId,
  attemptId });
const prepared = Object.freeze({
  fullRoleId: expected.rejected.roleRef.id,
  roleRef: expected.rejected.roleRef,
  contextManifestRef: expected.rejected.contextManifestRef,
});
const request = Object.freeze({ roleId: prepared.fullRoleId });
let runtimeCalls = 0;
let readerCalls = 0;

const routed = await routeFactionOutlineCapacityEvidenceV1({
  evidence: null,
  dry: false,
  runtime: { role: async actual => {
    runtimeCalls++;
    assert.equal(actual, request);
    const error = new Error('cached failure code only');
    error.code = 'STRUCTURED_PROVIDER_SCHEMA_INVALID';
    throw error;
  } },
  request,
  prepared,
  readCurrentFailure: ({ prepared: actual, failureReceiptHash }) => {
    readerCalls++;
    assert.equal(actual, prepared);
    assert.equal(failureReceiptHash, undefined);
    return readFactionTeachFailureEvidenceV1({
      filename,
      runId,
      fullRoleId: actual.fullRoleId,
      roleRefHash: actual.roleRef.hash,
      contextManifestRefHash: actual.contextManifestRef.hash,
      failureReceiptHash,
    });
  },
});

assert.equal(routed.evidence.attempt.id, attemptId);
assert.equal(routed.evidence.rejected.hash, expected.rejected.hash);
const receipt = verifySeal(JSON.parse(routed.evidence.attempt.response)).value;
const usage = verifySeal(JSON.parse(routed.evidence.attempt.usage)).value;
assert.equal(receipt.receiptHash, routed.evidence.rejected.safeReceiptHash);
assert.equal(routed.evidence.issue.safeReceiptHash, receipt.receiptHash);
assert.equal(routed.evidence.issue.rejectedCandidateRef.hash,
  routed.evidence.rejected.hash);
assert.equal(hash(receipt.usage), hash(usage));
assert.equal(runtimeCalls, 1);
assert.equal(readerCalls, 1);
console.log(JSON.stringify({ ticket: 18, slice: 174, passed: true,
  attemptId, runtimeCalls, readerCalls, providerCalls: 0,
  lookup: 'runId+roleRef+contextManifestRef' }));
