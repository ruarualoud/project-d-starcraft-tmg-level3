// Exact v139 paid reply: an idempotent path replacement must not prevent the
// rest of a syntactically valid patch from reaching Native legality checking.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { applyRosterTeachQueryDeltaV1 } from '../packages/roster-strategist/roster-teach-query-delta-v1.mjs';
import * as framework from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const base = process.argv[2];
const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json', 'utf8'));
const op = d.teachFramework.state.queryRecovery.operations.find(o => o.originalQueryId === 'query-r4-b4c5d6e7f8091a2b3c4d5e6f');
const paid = d.publicOutputs.findLast(x => x.roundKind === 'teach_framework_query_delta_recovery');
const input = { request: op.request, failure: op.result, reply: paid.sanitizedOutput };
const original = JSON.stringify(op.request);
let materialized;
assert.doesNotThrow(() => { materialized = applyRosterTeachQueryDeltaV1(input); },
  'Idempotent sub-edit is valid; only a whole unchanged request is a no-op');
const args = JSON.parse(materialized.toolRequest.followUps[0].argumentsJson);
assert.equal(args.parameters.placements.length, 7);
assert.equal(args.parameters.placements[0].modelId, 'player1-marine-1-model-3');
// The model is WRONG about deleting a duplicate leader: it deleted model2.
// Never certify this malformed formation or insert a replacement on its behalf.
assert.equal(JSON.stringify(op.request), original);
assert.throws(() => applyRosterTeachQueryDeltaV1({ ...input,
  reply: { ...input.reply, edits: input.reply.edits.slice(0, 1) } }), /ROSTER_TEACH_QUERY_DELTA_NO_CHANGE/);
const pending = structuredClone(d.teachFramework.state.replyCorrections.at(-1));
const recovered = framework.revalidateRetainedRosterTeachReplyV1(pending, output => {
  const { schemaVersion, roundKind, ...value } = output;
  applyRosterTeachQueryDeltaV1({ ...input, reply: value });
  return value;
});
assert.equal(recovered.accepted, true);
assert.deepEqual(recovered.value.edits, paid.sanitizedOutput.edits);
assert.equal(pending.status, 'resolved_by_current_validator');
assert.equal(pending.revalidation.newModelCalls, 0);
const invalid = { status: 'pending', correction: { previousOutput: { bad: true } } };
assert.equal(framework.revalidateRetainedRosterTeachReplyV1(invalid, () => { throw Error('still invalid'); }).accepted, false);
assert.equal(invalid.status, 'pending');
console.log(JSON.stringify({ status: 'PASS', paidReplyReused: true,
  wholeNoOpStillRejected: true, nativeMustRejectOrAcceptMaterializedParameters: true,
  modelDeletedNonLeader: 'player1-marine-1-model-2', geometryLegalityProven: false,
  providerCalls: 0, nativeQueries: 0, roomActions: 0 }));
