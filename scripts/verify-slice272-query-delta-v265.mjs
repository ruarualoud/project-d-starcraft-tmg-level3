// Reproduce the actual fresh-v264 paid field-repair failure. No Provider/Rules calls.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { applyRosterTeachQueryDeltaV1 } from '../packages/roster-strategist/roster-teach-query-delta-v1.mjs';
import { recoverRosterTeachQueriesV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';

const saved = JSON.parse(await fs.readFile(process.argv[2], 'utf8')).value;
const source = saved.draftTeachSnapshots.at(-1).state;
const original = source.queryRecovery.operations[0];
const paid = source.replyCorrections.at(-1).correction.previousOutput;
assert.equal(original.originalQueryId, 'q-capability-demand-marine-vs-raptor');
assert.equal(source.replyCorrections.at(-1).correction.code, 'ROSTER_TEACH_QUERY_DELTA_PATH_MISSING');
const normalization = [];
const materialized = applyRosterTeachQueryDeltaV1({ request: original.originalRequest,
  failure: original.currentFailure, reply: paid, onNormalization: row => normalization.push(row) });
assert.equal(JSON.parse(materialized.toolRequest.argumentsJson).domainId, JSON.parse(paid.edits[0].valueJson));
assert.deepEqual(normalization.map(x => [x.from, x.to, x.path]),
  [['replace', 'add', '/toolRequest/argumentsJson/domainId']]);

async function checkLoop(reply, expectedCode) {
  const operation = structuredClone(original);
  const question = source.agenda.questions.find(q => q.questionId === original.questionId);
  const state = { agenda: { questions: [question] }, evidence: [],
    investigation: { operations: [{ queryId: original.originalQueryId, questionId: original.questionId,
      request: original.originalRequest }], evidence: [{ ...original.originalResult,
      challengeId: original.originalQueryId }] }, queryRecovery: { version: 1, operations: [operation] } };
  let choices = 0, queryCalls = 0;
  await recoverRosterTeachQueriesV1({ state, plan: saved.plan, context: {}, sourceHash: source.sourceHash,
    evidencePort: { describeQueryContext: () => ({}), query: async () => { queryCalls++; throw Error('must_not_execute'); } },
    checkpoint: async () => {}, ask: async (_kind, content, _instruction, validate) => {
      const value = choices++ === 0 ? structuredClone(reply)
        : { disposition: 'defer', kind: 'patch', toolRequestJson: '', edits: [], publicReason: 'Need the original target; no matching proven domain.' };
      if (choices === 2) assert.equal(content.find(x => x.kind === 'previous_correction_result').result.unknownReasonCode, expectedCode);
      validate(value); return value;
    } });
  assert.equal(choices, 2);
  assert.equal(queryCalls, 0);
  assert.equal(operation.result.status, 'unknown');
  assert.equal(operation.result.unknownReasonCode, expectedCode);
  assert.equal(operation.status, 'model_deferred');
  assert.equal(operation.choices.length, 2);
  return operation;
}

// The saved paid repair swaps Raptor for Swarmling: transport normalization must
// NOT turn that into an executed answer to the original strategic question.
const scope = await checkLoop(paid, 'ROSTER_TEACH_RECOVERY_QUERY_SCOPE_CHANGED');
assert.ok(scope.result.missingScopeValues.includes('player2-raptor'));
assert.equal(scope.deltaRecoveryHistory[0].transportNormalizations.length, 1);

// Same class, malformed parent: route typed feedback through the existing local
// bounded dialogue, not three format repairs that abort the entire Teach.
const malformed = structuredClone(paid);
malformed.edits = [{ op: 'replace', path: '/toolRequest/argumentsJson/missing/leaf', valueJson: '1' }];
await checkLoop(malformed, 'ROSTER_TEACH_QUERY_DELTA_PATH_MISSING');
const safe = structuredClone(paid);
safe.edits = [safe.edits[0]];
const accepted = applyRosterTeachQueryDeltaV1({ request: original.originalRequest, failure: original.currentFailure, reply: safe });
assert.equal(JSON.parse(accepted.toolRequest.argumentsJson).targetUnitId, 'player2-raptor');
assert.equal(accepted.toolRequest.branchIdRef, original.originalRequest.toolRequest.branchIdRef);
for (const path of ['/toolRequest/argumentsJson/__proto__/polluted', '/kind']) {
  assert.throws(() => applyRosterTeachQueryDeltaV1({ request: original.originalRequest,
    failure: original.currentFailure, reply: { ...safe, edits: [{ op: 'replace', path, valueJson: '1' }] } }));
}
console.log(JSON.stringify({ pass: true, actualPaidFailure: true, normalizedMissingLeaf: true,
  wrongTargetExecuted: false, invalidPatchIsLocalFeedback: true, providerCalls: 0, nativeCalls: 0, trainingTruth: false }));
