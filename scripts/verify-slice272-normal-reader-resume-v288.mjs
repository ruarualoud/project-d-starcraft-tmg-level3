import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { runRosterTeachFrameworkSessionV1, isRosterTeachReaderContinuationV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [base] = process.argv.slice(2), started = Date.now();
const directory = `${base}/A/fresh-generation-v264`;
const session = JSON.parse(await fs.readFile(`${directory}/workspace/drafts/rws-5c8ed89c-06a0-4c29-910d-f33d17421516.json`, 'utf8'));
const request = JSON.parse(gunzipSync(await fs.readFile(`${directory}/request-185.private.json.gz`)));
const original = session.teachFramework.state;
assert(original.synthesisReader, 'Actual A has a saved ordinary reader');
assert.equal(original.investigation.completed, true);
assert.equal(original.investigation.operations.filter(operation => !operation.completed).length, 0);
assert(!original.synthesisReview, 'This is ordinary product resume, NOT the special review fixture');
const state = structuredClone(original), context = session.teachFramework.context;
assert.equal(isRosterTeachReaderContinuationV1(state), true);
assert.equal(isRosterTeachReaderContinuationV1({...state, investigation:{...state.investigation,completed:false}}),false);
assert.equal(isRosterTeachReaderContinuationV1({...state, investigation:{...state.investigation,operations:[{completed:false}]}}),false);
assert.equal(isRosterTeachReaderContinuationV1({...state, queryRecovery:{operations:[],selection:{completed:false}}}),false);
assert.equal(isRosterTeachReaderContinuationV1({...state, queryRecovery:{operations:[{completed:false}]}}),false);
assert.equal(isRosterTeachReaderContinuationV1({...state,synthesisReader:null}),false);
const plan = request.promptNodes.find(node => node.kind === 'current_plan_and_context').plan;
// The frozen Plan context predates the v284 math-contract publication. Production
// describeQueryContext returns the CURRENT source-owned catalog, captured in A185;
// using the old context catalog here would test a different input and reset the
// archive legitimately. Keep frozen raw geometry; use the actually delivered
// operational catalog, not a hand-invented default or a second map projection.
const deliveredQueryContext = request.promptNodes.find(node => node.kind === 'current_plan_and_context').context.queryContext;
assert.equal(deliveredQueryContext.sourceStateHash, context.queryContext.sourceStateHash);
const actualQueryContext = { ...structuredClone(context.queryContext),
  capabilities: structuredClone(deliveredQueryContext.capabilities) };
assert.equal(state.sourceHash, hash({ context, plan }));
let captured, nativePreparation = 0, checkpoints = 0;
const laboratory = new Proxy({
  describeQueryContext: () => structuredClone(actualQueryContext),
  proveMutationZero: () => ({ fixtureOnly: true, mutationZero: true }),
}, { get(target, key) {
  if (key in target) return target[key];
  nativePreparation++;
  throw Object.assign(Error(`UNNEEDED_NATIVE_REHYDRATION:${String(key)}`), { code: 'UNNEEDED_NATIVE_REHYDRATION' });
} });
await assert.rejects(runRosterTeachFrameworkSessionV1({
  sessionId: session.sessionId, plan, context, state, laboratory,
  selectedCandidateInput: session.selectedCandidateInput,
  retainedPublicOutputs: session.publicOutputs,
  retainedDispatches: session.providerDispatches,
  deliberation: { deliberate: async next => {
    captured = next;
    throw Object.assign(Error('READER_REQUEST_CAPTURED_WITHOUT_PROVIDER'), { code: 'READER_REQUEST_CAPTURED_WITHOUT_PROVIDER' });
  } },
  onCheckpoint: async next => {
    checkpoints++;
    if (next.phase === 'read_only_queries') throw Object.assign(Error('REENTERED_COMPLETED_QUERY_STAGE'), { code: 'REENTERED_COMPLETED_QUERY_STAGE' });
  },
}), { code: 'READER_REQUEST_CAPTURED_WITHOUT_PROVIDER' });
assert.equal(captured.roundKind, 'teach_framework_synthesis_step');
assert.equal(nativePreparation, 0);
assert.equal(state.synthesisReader.archiveHash, original.synthesisReader.archiveHash, 'Original evidence identity must not change to get a faster resume');
assert.deepEqual(state.synthesisReader.answers, original.synthesisReader.answers);
assert.deepEqual(state.synthesisReader.readManifest, original.synthesisReader.readManifest);
assert.deepEqual(state.synthesisReader.completedSteps, original.synthesisReader.completedSteps);
assert.equal(state.synthesisReaderHistory?.length || 0, original.synthesisReaderHistory?.length || 0);
console.log(JSON.stringify({ pass: true, ordinaryProductResume: true, explicitReviewUsed: false,
  savedSteps: original.synthesisReader.completedSteps.length, originalArchiveAndLedgerPreserved: true,
  nativePreparation, providerCalls: 0, rulesQueries: 0, checkpoints, elapsedMs: Date.now() - started }));
