// Regression: v135 described changes but re-emitted zero motion and the leader
// in remaining placements. A parameter correction must submit actual edits to
// the exact failed request, not replace the whole query with explanatory prose.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as recovery from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
import { rosterTeachFrameworkContractV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from '../packages/structured-generation/output-contract-registry-v1.mjs';
const base = process.argv[2];
const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json', 'utf8'));
const op = d.teachFramework.state.queryRecovery.operations.find(o => o.originalQueryId === 'query-r4-b4c5d6e7f8091a2b3c4d5e6f');
const input = { request: op.request, failure: op.result };
const apply = reply => recovery.applyRosterTeachQueryDeltaV1?.({ ...input, reply }) || op.request;
assert.throws(() => apply(op.choice), /ROSTER_TEACH_QUERY_DELTA_/, 'Whole-query prose replacement must not masquerade as a causal field correction');
const contract = rosterTeachFrameworkContractV1('teach_framework_query_delta_recovery');
const edits = [
  { op: 'replace', path: '/toolRequest/followUps/0/argumentsJson/parameters/path',
    valueJson: JSON.stringify([{ xMilliInches: 9300, yMilliInches: 27000 }]) },
  { op: 'remove', path: '/toolRequest/followUps/0/argumentsJson/parameters/placements/0', valueJson: '' },
];
const reply = { disposition: 'retry', kind: 'patch', toolRequestJson: '', edits,
  publicReason: 'Fixture demonstrates executable field deltas, not movement legality.' };
assert(validate(contract.providerSchema, { schemaVersion: 'starcraft_tmg_teach_framework_generation_v1',
  roundKind: 'teach_framework_query_delta_recovery', ...reply }).ok);
const fixed = apply(reply);
assert.deepEqual(fixed.toolRequest.spec, op.request.toolRequest.spec);
assert.deepEqual(fixed.toolRequest.followUps[1], op.request.toolRequest.followUps[1]);
const fixedArgs = JSON.parse(fixed.toolRequest.followUps[0].argumentsJson);
assert.equal(fixedArgs.parameters.path[0].xMilliInches, 9300);
assert.equal(fixedArgs.parameters.placements.length, 8);
assert(!fixedArgs.parameters.placements.some(p => p.modelId === fixedArgs.parameters.leadingModelId));
assert.equal(JSON.parse(op.request.toolRequest.followUps[0].argumentsJson).parameters.placements.length, 9);
assert.throws(() => apply({ ...reply, edits: [{ ...edits[0], valueJson: JSON.stringify(JSON.parse(op.request.toolRequest.followUps[0].argumentsJson).parameters.path) }] }), /ROSTER_TEACH_QUERY_DELTA_NO_CHANGE/);
assert.throws(() => apply({ ...reply, edits: [{ op: 'replace', path: '/toolRequest/spec/clearTerrain', valueJson: 'true' }] }), /ROSTER_TEACH_QUERY_DELTA_OUTSIDE_FAILURE/);
assert.throws(() => apply({ ...reply, edits: [{ op: 'replace', path: '/toolRequest/followUps/1/argumentsJson/markerIds', valueJson: '[]' }] }), /ROSTER_TEACH_QUERY_DELTA_OUTSIDE_FAILURE/);
assert.throws(() => apply({ ...reply, edits: [{ op: 'add', path: '/toolRequest/followUps/0/__proto__/bad', valueJson: '1' }] }), /ROSTER_TEACH_QUERY_DELTA_PATH/);

const state = d.teachFramework.state;
state.queryRecovery.selection = { queryIds: [op.originalQueryId], reexecuteSavedQuery: true };
const oldChoices = structuredClone(op.choices);
let asks = 0, executions = 0;
const options = { state, plan: {}, context: d.teachFramework.context, sourceHash: state.sourceHash,
  completedBeforeRun: true, checkpoint: async () => {}, retainEvidence: () => ({ reference: 'fixture' }),
  evidencePort: { descriptor: () => ({ descriptorHash: op.result.evidencePortDescriptorHash }),
    query: async ({ request }) => { executions++; assert.deepEqual(request, fixed);
      return { status: 'advisory', receiptHash: 'a'.repeat(64), trainingTruth: false }; } },
  ask: async (kind, nodes, _instruction, semantic) => { asks++;
    assert.equal(kind, 'teach_framework_query_delta_recovery');
    assert.deepEqual(nodes.find(n => n.kind === 'failed_request_delta_base').semanticRequest.toolRequest.spec, op.request.toolRequest.spec);
    semantic(reply); return reply; },
};
await recovery.recoverRosterTeachQueriesV1(options);
assert.equal(asks, 1); assert.equal(executions, 1);
assert.equal(op.maximumAttempts, 8);
assert.deepEqual(op.choices.slice(0, 7), oldChoices);
assert.equal(op.deltaRecoveryHistory[0].reply.edits.length, 2);
assert.equal(op.causalDeltaFeedbackRecovery.historyReset, false);
await recovery.recoverRosterTeachQueriesV1(options);
assert.equal(asks, 1); assert.equal(executions, 1);
console.log(JSON.stringify({ status: 'PASS', exactPaidFailure: true, actualDeltasRequired: true,
  unchangedScenarioAndSuccessfulSibling: true, sevenChoicesRetained: true,
  noRepeatGrant: true, providerCalls: 0, nativeExecutions: 0,
  fakeAdapterExecutions: executions, roomActions: 0, geometryLegalityProven: false }));
