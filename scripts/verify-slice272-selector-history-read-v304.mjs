import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createIterativeRosterFileStoreV1 } from '../packages/roster-strategist/iterative-roster-file-store-v1.mjs';
import { createIterativeRosterFlashModelPortV1 } from '../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs';
import * as session from '../packages/roster-strategist/iterative-roster-plan-session-v1.mjs';
import * as history from '../packages/roster-strategist/roster-teach-history-view-v1.mjs';
const [directory, mode] = process.argv.slice(2);
const progress = JSON.parse(await fs.readFile(path.join(directory, 'progress.private.json'), 'utf8'));
const store = createIterativeRosterFileStoreV1({ directory: path.join(directory, 'workspace/iterative-draft') });
const state = await store.load(progress.sessionId);
const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const before = fingerprint(state);
const localReplies = new Map();
let reference = '112ddc2193c04f6c1b514d6f79aeb3d964d4d8fdfb7fafdd7515d33149622967';
if (mode !== '--reads-only') {
const model = createIterativeRosterFlashModelPortV1({
  deliberationFactory: { createForRun: () => { throw Error('NO_NEW_PROVIDER_CALL'); } },
  replyStore: { loadRetainedReply: key => localReplies.get(key) || store.loadRetainedReply(key),
    retainReply: async (key, value) => { localReplies.set(key, value); } },
  skillGuidance: {}, missionEvidence: {},
});
const reply = await model.reconcile({ requestKey: 'readonly-source-fix-v304',
  sourceRequestKey: state.iterations.at(-1).requestKey, state });
assert.equal(reply.decision.kind, 'query', 'The paid F request must become usable after the missing read capability is restored');
assert.equal(reply.decision.queries.length, 1, 'Do not re-execute the other three unchanged queries');
const query = reply.decision.queries[0];
assert.equal(query.kind, 'teach_evidence');
reference = JSON.parse(query.argumentsJson).receiptHash;
assert.equal(reference, '112ddc2193c04f6c1b514d6f79aeb3d964d4d8fdfb7fafdd7515d33149622967');
}
const result = session.readIterativeRosterTeachEvidenceV1(state, { receiptHash: reference, path: '' });
assert.equal(result.status, 'advisory', 'The read succeeds; the underlying old failed experiment is still unknown');
assert.equal(result.result.sourceReceiptHash, reference);
assert.equal(session.readIterativeRosterTeachEvidenceV1(state, { receiptHash: reference, path: '/status' }).result.value, 'unknown');
const scoped = history.createIterativeRosterTeachHistoryEvidenceV1(state);
assert(scoped.originals.has(reference));
const changed = { ...state, currentCandidate: { ...state.currentCandidate, candidateHash: 'different-army' } };
assert.equal(history.createIterativeRosterTeachHistoryEvidenceV1(changed).originals.has(reference), false);
assert.equal(fingerprint(state), before, 'Do not alter live history, plans, counters or output');
assert([...localReplies.values()].every(r => r.paidProviderCall === false));
console.log(JSON.stringify({ pass: true, ...(mode === '--reads-only'
  ? { passedPaidOutputRevalidationNotRerun: true }
  : { paidFOutputRevalidated: true, newlyReadableQueries: 1, unchangedQueriesNotExecuted: 3 }),
  historicalUnknownPreserved: true, differentArmyExcluded: true,
  actualFilesReadOnly: true, providerCalls: 0, nativeCalls: 0 }));
