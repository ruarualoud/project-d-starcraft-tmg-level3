import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { hash, verifySeal } from '../packages/skill-production/common.mjs';
import { readFactionTeachFailureEvidenceV1 } from
  '../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';
import { FACTION_OUTLINE_CAPACITY_BINDING_V1 as binding,
  normalizeFactionOutlineCapacityV1 } from
  '../packages/skill-production-v3/faction-outline-capacity-envelope-v1.mjs';
import { routeFactionOutlineCapacityEvidenceV1 } from
  '../packages/skill-production-v3/faction-outline-capacity-runtime-v1.mjs';

const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const runId = 'faction-v1-6fb3850f59642566130f';
const attemptId =
  'structured-d56c87a28f24d0aabaf0d6f33a7e13f8cd7ff20ec478c4ce';
const input = verifySeal(JSON.parse(await readFile(
  'build/ticket-18-faction-production-v1/zerg_swarm-input.json', 'utf8')));
const evidence = readFactionTeachFailureEvidenceV1({ filename, runId,
  attemptId });
const normalized = normalizeFactionOutlineCapacityV1({ input,
  value: evidence.rejected.providerValue, binding });

assert(normalized.focusLengths.includes(613));
assert(normalized.focusLengths.includes(622));
assert(normalized.focusLengths.every(length => length <= 1600));
assert.equal(hash(normalized.output), hash(evidence.rejected.providerValue));
assert.equal(normalized.contentChanged, false);

const request = Object.freeze({ roleId: 'current-outline' });
const prepared = Object.freeze({ fullRoleId: evidence.rejected.roleRef.id });
let runtimeCalls = 0;
let readerCalls = 0;
const routed = await routeFactionOutlineCapacityEvidenceV1({
  evidence: null,
  dry: false,
  runtime: { role: async value => {
    runtimeCalls++;
    assert.equal(value, request);
    const error = new Error('saved schema failure');
    error.code = 'STRUCTURED_PROVIDER_SCHEMA_INVALID';
    error.safeReceipt = { receiptHash: evidence.rejected.safeReceiptHash };
    throw error;
  } },
  request,
  prepared,
  readCurrentFailure: ({ prepared: actual, failureReceiptHash }) => {
    readerCalls++;
    assert.equal(actual, prepared);
    assert.equal(failureReceiptHash, evidence.rejected.safeReceiptHash);
    return evidence;
  },
});

assert.equal(routed.evidence, evidence);
assert.equal(runtimeCalls, 1);
assert.equal(readerCalls, 1);
console.log(JSON.stringify({ ticket: 18, slice: 174, passed: true,
  focusLengths: normalized.focusLengths, hostMaximum: 1600,
  runtimeCalls, readerCalls, providerRetries: 0 }));
