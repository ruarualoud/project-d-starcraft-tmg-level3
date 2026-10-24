// Concrete adapter bug: new draft Teach discarded failed public output/usage
// and collapsed unknown charge status to false. No model or Native execution.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createIterativeRosterDraftTeachV1 } from '../packages/roster-strategist/iterative-roster-draft-teach-v1.mjs';
const base = process.argv[2];
const sd = base + '/B/fresh-generation-v240/workspace/iterative-draft/sessions';
const original = JSON.parse(await fs.readFile(sd + '/' + (await fs.readdir(sd))[0], 'utf8')).value;
const state = structuredClone(original); state.pendingDecision = null;
const failedOutputRecord = { rawText: '{"incomplete":', rawTextHash: 'a'.repeat(64), providerStatus: 'incomplete' };
const events = [
  { type: 'round_failed', roundKind: 'teach_framework_agenda', dispatchRequestId: 'known-failed-request',
    paidProviderCall: true, usage: { inputUnits: 12, outputUnits: 3, totalUnits: 15 },
    receiptHash: 'b'.repeat(64), failedOutputRecord, code: 'ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE' },
  { type: 'round_failed', roundKind: 'teach_framework_agenda', dispatchRequestId: 'unknown-request',
    paidProviderCall: null, code: 'ROSTER_WORKSPACE_NETWORK_UNKNOWN' },
];
let saved;
const run = createIterativeRosterDraftTeachV1({ createSceneLaboratory: () => ({}),
  selectSkillGuidance: () => ({}), missionEvidence: {},
  deliberationFactory: { createForRun: async ({ onEvent }) => {
    for (const event of events) await onEvent(event);
    throw Object.assign(new Error('DIAGNOSTIC_STOP'), { code: 'DIAGNOSTIC_STOP' });
  } } });
await assert.rejects(run(state, async next => { saved = structuredClone(next); }), /DIAGNOSTIC_STOP/);
const record = saved.draftTeachSnapshots.at(-1);
const failures = [];
for (const [name, check] of [
  ['failed output retained', () => assert.deepEqual(record.failedOutputs?.[0]?.failedOutputRecord, failedOutputRecord)],
  ['known failed usage retained', () => assert.equal(record.usage[0]?.usage?.totalUnits, 15)],
  ['unknown fee not false zero charge', () => assert.equal(record.events.find(e => e.code === 'ROSTER_WORKSPACE_NETWORK_UNKNOWN')?.paidProviderCall, null)],
]) { try { check(); } catch (error) { failures.push({ name, message: error.message }); } }
const result = { status: failures.length ? 'fail' : 'pass', failures, providerCalls: 0, nativeCalls: 0 };
await fs.writeFile(base + `/draft-failure-ledger-v247-${result.status}.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
if (failures.length) process.exitCode = 1;
