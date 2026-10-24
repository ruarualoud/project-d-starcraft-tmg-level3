// B165 kept putting the old successful query first while its latest commit failed.
import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { projectIterativeRosterLatestToolTurnV1 } from '../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const request = JSON.parse(gunzipSync(await fs.readFile(
  `${process.argv[2]}/B/fresh-generation-v264/request-165.private.json.gz`)));
const context = request.promptNodes[0].content;
const before = hash(context);
const state = { ...context.decisionState, modelContextVersion: 18,
  observations: context.decisionState.observations.map(row => ({ ...row,
    receipt: row.receipt || context.decisionState.observationReceipts[row.receiptRef] })) };
const latest = state.iterations.at(-1);
assert.equal(latest.decisionKind, 'repair_needed');
const failure = state.observations.find(row => row.requestKey === latest.requestKey
  && row.query.kind === 'model_output_repair');
assert.equal(failure.receipt.failureCode, 'ITERATIVE_ROSTER_PLAN_REVISION_UNCHANGED');
const projected = projectIterativeRosterLatestToolTurnV1(state, context);
assert.equal(Object.keys(projected)[0], 'latestOperation',
  'Current commit failure must precede old query success, not remain buried in accumulated observations');
assert.equal(projected.latestOperation.kind, 'output_repair');
assert.equal(projected.latestOperation.failureClass, 'no_change');
assert.equal(projected.latestOperation.requestKey, latest.requestKey);
assert.equal(projected.latestOperation.revision, latest.revision);
assert.deepEqual(projected.latestOperation.failure, failure.receipt);
assert.equal(projected.latestOperation.strategyChosenByHost, false);
assert.equal(projected.latestToolTurn.role, 'prior_completed_query_evidence');
assert.deepEqual(projected.latestToolTurn.results, context.latestToolTurn.results);
assert.equal(hash(context), before, 'Saved paid context and history are immutable');
const oldProjection = projectIterativeRosterLatestToolTurnV1({ ...state, modelContextVersion: 17 }, context);
assert.equal(oldProjection.latestOperation, undefined, 'Old pending paid contexts retain their protocol');
console.log(JSON.stringify({ pass: true, case: 'B165', activeFailureCount: 1,
  priorResultsUnchanged: true, historyUnchanged: true, providerCalls: 0, nativeQueries: 0 }));
