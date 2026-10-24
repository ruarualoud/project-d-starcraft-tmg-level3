import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { runRosterTeachFrameworkSessionV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { validateRosterTeachSynthesisReaderCommandV1 } from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
const [base] = process.argv.slice(2), started = Date.now();
const directory = `${base}/A/fresh-generation-v264`;
const session = JSON.parse(await fs.readFile(`${directory}/workspace/drafts/rws-5c8ed89c-06a0-4c29-910d-f33d17421516.json`, 'utf8'));
const request = JSON.parse(gunzipSync(await fs.readFile(`${directory}/request-185.private.json.gz`)));
const context = session.teachFramework.context, state = structuredClone(session.teachFramework.state);
const plan = request.promptNodes.find(node => node.kind === 'current_plan_and_context').plan;
const deliveredContext = request.promptNodes.find(node => node.kind === 'current_plan_and_context').context.queryContext;
const paidAnswers = state.synthesisReader.answers;
assert(paidAnswers.some(answer => [...answer.quantitativeEvidence, ...answer.qualitativeEvidence]
  .some(citation => /^(plan|context):\//u.test(citation.receiptRef))), 'Reproduce actual paid document-ID citations, not synthetic errors');
assert.equal(state.phase, 'synthesize');
assert.equal(state.synthesisReader.status, 'reading');
const answersBefore = structuredClone(paidAnswers);
let captured, nativeCalls = 0;
const laboratory = new Proxy({
  describeQueryContext: () => ({ ...structuredClone(context.queryContext), capabilities: structuredClone(deliveredContext.capabilities) }),
  proveMutationZero: () => ({ fixtureOnly: true, mutationZero: true }),
}, { get(target, key) { if (key in target) return target[key]; nativeCalls++; throw Error(`UNEXPECTED_NATIVE:${String(key)}`); } });
await assert.rejects(runRosterTeachFrameworkSessionV1({
  sessionId: session.sessionId, plan, context, state, laboratory,
  selectedCandidateInput: session.selectedCandidateInput,
  retainedPublicOutputs: session.publicOutputs, retainedDispatches: session.providerDispatches,
  deliberation: { deliberate: async next => {
    captured = next;
    throw Object.assign(Error('CAPTURE_WITHOUT_PROVIDER'), { code: 'CAPTURE_WITHOUT_PROVIDER' });
  } }, onCheckpoint: async () => {},
}), { code: 'CAPTURE_WITHOUT_PROVIDER' });
const workspace = captured.promptNodes[0];
assert(workspace.citationFeedback?.correctableFailures?.length > 0,
  'An ordinary reader must see its actual invalid receipt references BEFORE another finish/reinvestigation');
assert(workspace.citationFeedback.correctableFailures.some(item => item.code === 'ROSTER_TEACH_EVIDENCE_RECEIPT_UNKNOWN'));
assert(workspace.citationFeedback.correctableFailures.every(item => item.requiresNativeReexecution === false));
assert.equal(nativeCalls, 0);
assert.deepEqual(state.synthesisReader.answers, answersBefore, 'Host must not replace the paid model argument or choose new evidence');
const finish = { action: 'finish', reads: [], answers: [], proposedPlanChanges: [], proposedRosterChanges: [], frameworkFeedback: [] };
assert.throws(() => validateRosterTeachSynthesisReaderCommandV1({ questions: workspace.questions }, state.synthesisReader, finish),
  { code: 'ROSTER_TEACH_SYNTHESIS_CITATIONS_NEED_REPAIR' });
// A factual unknown is not a malformed citation. It may leave Teach explicitly
// unresolved; final Plan admission remains responsible for material open issues.
assert.doesNotThrow(() => validateRosterTeachSynthesisReaderCommandV1({ questions: workspace.questions },
  { ...state.synthesisReader, citationFeedback: { correctableFailures: [], unresolvedFacts: [{ code: 'ROSTER_TEACH_EVIDENCE_RECEIPT_UNRESOLVED' }] } }, finish));
console.log(JSON.stringify({ pass: true, actualPaidAnswers: paidAnswers.length,
  correctableCitations: workspace.citationFeedback.correctableFailures.length,
  modelOwnedRepair: true, originalsAndArgumentsPreserved: true, providerCalls: 0, nativeCalls,
  elapsedMs: Date.now() - started }));
