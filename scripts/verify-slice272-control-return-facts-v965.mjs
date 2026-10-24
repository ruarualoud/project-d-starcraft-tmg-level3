// Reproduce the actual blocked-conclusion bypass. Immutable sources only;
// no Provider, Native execution, workflow mutation or production writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {verifyRosterNativeFactsV1} from '../packages/roster-strategist/roster-native-fact-claims-v1.mjs';

const [workflowRoot] = process.argv.slice(2);
assert.ok(workflowRoot, 'explicit original workflow directory required');
const get = async ref => JSON.parse(await fs.readFile(`${workflowRoot}/artifacts/${ref}.json`, 'utf8'));
const state = JSON.parse(await fs.readFile(`${workflowRoot}/workflow.json`, 'utf8'));
const entries = state.evidence.map((entry, index) => ({...entry, number: index + 1,
  validity: Object.entries(entry.bindings ?? {}).every(([key, value]) => state.scope[key] === value)
    ? 'current' : 'stale'}));
const replyRef = '4cc1de64f69d18491b8c8fdb997cad6754e54933b93c2830cfe4d40eefc9961f';
const paid = await get(replyRef);
const original = JSON.stringify(paid);
const conclusion = paid.output.conclusion;
assert.equal(conclusion.status, 'blocked');
const verify = (value, {required = false, unread = false, stale = false} = {}) => verifyRosterNativeFactsV1({
  conclusion: value, required, lookup: number => stale && entries[number - 1]
    ? {...entries[number - 1], validity: 'stale'} : entries[number - 1],
  lookupById: id => entries.find(entry => entry.id === id), readArtifact: get,
  isRead: () => !unread,
});
const missingPointer = '/receipt/actionMenuDirectoryIsBodyRead';
const checks = [];
async function check(name, run) {
  await run(); checks.push(name); console.log(JSON.stringify({check: name, pass: true}));
}

await check('actual-blocked-reply-cannot-promote-a-nonexistent-receipt-field', async () => {
  const result = await verify(conclusion);
  assert.ok(result.errors.some(error => error.number === 2099 && error.pointer === missingPointer),
    `blocked reply bypassed declared fact checks: ${JSON.stringify(result)}`);
  assert.ok(!result.facts.some(fact => fact.pointer === missingPointer));
});

// These are injected variants of the same concrete failure, not new scenarios.
const observedClaim = conclusion.nativeFacts.find(fact => fact.evidenceNumber === 2098
  && fact.pointer === '/receipt/actionSpace/counts/parameterDomains');
assert.ok(observedClaim);
const selected = status => ({...conclusion, status, nativeFacts: [structuredClone(observedClaim)],
  evidenceNumbers: [2098]});

await check('control-return-without-facts-stays-available', async () => {
  for (const status of ['blocked', 'strategy_required']) {
    const result = await verify({...conclusion, status, nativeFacts: []}, {required: true});
    assert.deepEqual(result, {errors: [], facts: []});
  }
});
await check('both-control-statuses-check-values-reading-and-source-currency', async () => {
  for (const status of ['blocked', 'strategy_required']) {
    const valid = await verify(selected(status));
    assert.deepEqual(valid.errors, []);
    assert.equal(valid.facts.length, 1);
    assert.equal(valid.facts[0].observedValue, 5);
    assert.equal(valid.facts[0].questionCoverageApproved, false);
    const wrong = selected(status); wrong.nativeFacts[0].expectedValueJson = '6';
    assert.ok((await verify(wrong)).errors.some(error => error.code === 'native_fact_value_mismatch'));
    assert.ok((await verify(selected(status), {unread: true})).errors.some(error => error.code === 'evidence_not_read'));
    assert.ok((await verify(selected(status), {stale: true})).errors.some(error => error.code === 'native_fact_requires_current_executed_receipt'));
  }
});
await check('answered-requirement-is-not-weakened-and-paid-reply-is-unchanged', async () => {
  assert.ok((await verify({...conclusion, status: 'answered', nativeFacts: []}, {required: true}))
    .errors.some(error => error.code === 'native_fact_observations_required'));
  assert.deepEqual((await verify(selected('answered'))).errors, []);
  assert.deepEqual(await verify(null), {errors: [], facts: []});
  assert.equal(JSON.stringify(paid), original);
});
console.log(JSON.stringify({pass: true, checks, replyRef, providerCalls: 0, nativeCalls: 0,
  productionWrites: 0, sourceReplyUnchanged: true, semanticApprovalGranted: false}));
