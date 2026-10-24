// Fresh A Plan6: one repeated failed query aborted a batch with other work.
// Validate and execute the same cached-result policy at the two actual seams.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as teach from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { normalizeRosterTeachQueryDispatchV1 } from '../packages/roster-strategist/roster-teach-query-dispatch-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const base = process.argv[2];
const draft = JSON.parse(await fs.readFile(base + '/A/fresh-generation-v249/workspace/drafts/rws-8d1ff678-3b59-40d7-b282-4c38d4eafa46.json', 'utf8'));
const state = draft.teachFramework.state;
const output = draft.publicOutputs.findLast(o => o.roundKind === 'teach_framework_investigate'
  && o.sanitizedOutput.queries.some(q => q.queryId === 'q-terrain-route-vs-range-vs-control-retry-3')).sanitizedOutput;
const query = output.queries.find(q => q.queryId === 'q-terrain-route-vs-range-vs-control-retry-3');
const request = normalizeRosterTeachQueryDispatchV1({ kind: query.kind,
  toolRequest: JSON.parse(query.toolRequestJson) }).request;
const prior = state.investigation.operations.findLast(o => o.completed && hash(o.request) === hash(request));
const earlier = state.investigation.evidence.find(e => e.challengeId === prior.queryId);
assert.equal(earlier.status, 'unknown');
const descriptor = earlier.evidencePortDescriptorHash;
assert.ok(descriptor);
const ids = state.agenda.questions.map(q => q.questionId);
assert.doesNotThrow(() => teach.validateRosterTeachInvestigationProgressV1(output, state, ids, descriptor),
  'A cached unknown must not abort this paid batch; the executor already has a no-reexecution path');
const args = { earlier, previousRequest: prior.request, request, queryId: query.queryId,
  questionId: query.questionId, currentDescriptorHash: descriptor };
const reused = teach.reuseRosterTeachFailedQueryEvidenceV1(args);
assert.equal(reused.status, 'unknown');
assert.equal(reused.unknownReasonCode, earlier.unknownReasonCode);
assert.equal(reused.originalReceiptHash, earlier.receiptHash);
assert.equal(reused.repeatedFailedRequest, true);
assert.equal(reused.queryNotExecuted, true);
assert.equal(reused.originalQueryNotAnswered, true);
assert.deepEqual(reused.queryRepair, earlier.queryRepair);
assert.equal(teach.reuseRosterTeachFailedQueryEvidenceV1({ ...args, currentDescriptorHash: 'changed-contract' }), null);
assert.equal(teach.reuseRosterTeachFailedQueryEvidenceV1({ ...args,
  request: { ...request, toolRequest: { ...request.toolRequest, branchIdRef: 'different-scene' } } }), null);
assert.throws(() => teach.validateRosterTeachInvestigationProgressV1(output, state,
  ids.filter(id => id !== query.questionId), descriptor), /ROSTER_TEACH_INVESTIGATION_OUTSIDE_PENDING/);
console.log(JSON.stringify({ status: 'PASS', realFailure: earlier.unknownReasonCode,
  validBatchNotDiscarded: true, unknownPreserved: true, repeatedQueryNotExecuted: true,
  changedRequestOrContractNotReused: true, questionBoundaryPreserved: true,
  providerCalls: 0, nativeCalls: 0, originalWorkspaceWrites: 0 }));
