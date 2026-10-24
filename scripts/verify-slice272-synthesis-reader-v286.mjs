// Actual A185 HTTP400 input-capacity failure: use a bounded reader, not a
// shortened strategy or an unchanged multi-megabyte request.
import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import * as framework from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const [base] = process.argv.slice(2);
const started = Date.now();
const mark = stage => process.stderr.write(JSON.stringify({ stage, elapsedMs: Date.now() - started }) + '\n');
const request = JSON.parse(gunzipSync(await fs.readFile(`${base}/A/fresh-generation-v264/request-185.private.json.gz`)));
assert.equal(request.roundKind, 'teach_framework_synthesis');
const original = JSON.stringify(request.promptNodes);
const delivery = framework.planRosterTeachSynthesisDeliveryV1
  ? framework.planRosterTeachSynthesisDeliveryV1(request.promptNodes)
  : { kind: 'inline', bytes: Buffer.byteLength(original) };
assert.equal(delivery.kind, 'evidence_reader', `Actual rejected input cannot be resent inline (${delivery.bytes} bytes)`);
mark('actual_input_routed');
const reader = await import('../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs');
const archive = reader.createRosterTeachSynthesisArchiveV1(request.promptNodes);
const session = reader.createRosterTeachSynthesisReaderStateV1(archive);
const prompt = reader.projectRosterTeachSynthesisReaderV1(archive, session);
assert(Buffer.byteLength(JSON.stringify(prompt)) < 196608);
assert.equal(session.answers.length, 0);
const plan = reader.readRosterTeachSynthesisDocumentV1(archive, { documentId: 'plan', path: '', offset: 0 });
assert.equal(plan.complete, false, 'The large Plan is navigable, never silently truncated');
let pages = 0;
function recover(documentId, path = '') {
  const first = reader.readRosterTeachSynthesisDocumentV1(archive, { documentId, path, offset: 0 }); pages++;
  if (first.kind === 'value') return first.value;
  if (first.kind === 'string_page') {
    let text = first.text, next = first.nextOffset;
    while (next !== null) { const page = reader.readRosterTeachSynthesisDocumentV1(archive, { documentId, path, offset: next }); pages++; text += page.text; next = page.nextOffset; }
    return text;
  }
  const entries = [...first.children]; let next = first.nextOffset;
  while (next !== null) { const page = reader.readRosterTeachSynthesisDocumentV1(archive, { documentId, path, offset: next }); pages++; entries.push(...page.children); next = page.nextOffset; }
  const result = first.nodeType === 'array' ? [] : {};
  for (const item of entries) result[item.key] = recover(documentId, item.path);
  return result;
}
for (const document of archive.documents) assert.deepEqual(recover(document.id), document.value);
mark('every_document_reconstructed');
assert.equal(JSON.stringify(request.promptNodes), original, 'Saved source unchanged');
const one = reader.readRosterTeachSynthesisDocumentV1(archive, { documentId: 'plan', path: '', offset: 0 });
const invalid = reader.readRosterTeachSynthesisDocumentV1(archive, { documentId: 'plan', path: '/not-a-real-field', offset: 0 });
assert.equal(invalid.kind, 'path_error');
assert(invalid.availableChildren.length);
assert.deepEqual(reader.projectRosterTeachSynthesisReaderV1(archive, JSON.parse(JSON.stringify(session))), prompt);
assert.deepEqual(reader.readRosterTeachSynthesisDocumentV1(archive, { documentId: 'plan', path: '', offset: 0 }), one);
// Replay the actual A context through the SHARED production framework, stopping
// after its first persisted reader step. No provider or laboratory is contacted.
const actual = JSON.parse(await fs.readFile(`${base}/A/fresh-generation-v264/workspace/drafts/rws-5c8ed89c-06a0-4c29-910d-f33d17421516.json`, 'utf8'));
let checkpoint = structuredClone(actual.teachFramework.state), calls = 0, stopAfterRead = true;
checkpoint.synthesisReview = { status: 'pending', reason: 'offline_capacity_bug_fixture',
  baselineCallCount: checkpoint.calls.length, maximumProviderCalls: 10 };
const envelope = body => ({ schemaVersion: 'starcraft_tmg_teach_framework_generation_v1',
  roundKind: 'teach_framework_synthesis_step', reads: [], answers: [],
  proposedPlanChanges: [], proposedRosterChanges: [], frameworkFeedback: [], ...body });
const input = () => ({ sessionId: actual.sessionId,
  context: structuredClone(actual.teachFramework.context),
  plan: request.promptNodes.find(node => node.kind === 'current_plan_and_context').plan,
  selectedCandidateInput: actual.selectedCandidateInput,
  state: structuredClone(checkpoint), retainedDispatches: actual.providerDispatches,
  laboratory: {
    describeQueryContext: () => structuredClone(actual.teachFramework.context.queryContext),
    proveMutationZero: () => ({ mutationZero: true, fixtureOnly: true }),
  },
  deliberation: { deliberate: async generated => {
    calls++;
    mark(`fixture_request_${calls}`);
    assert.equal(generated.roundKind, 'teach_framework_synthesis_step');
    assert(Buffer.byteLength(JSON.stringify(generated)) < 196608, 'Actual resumed request is bounded');
    const workspace = generated.promptNodes[0];
    const action = workspace.completedSteps === 0
      ? envelope({ action: 'read', reads: [{ documentId: 'plan', path: '', offset: 0 }] })
      : workspace.completedSteps === 1
        ? envelope({ action: 'answer', answers: workspace.questions.map(question => ({
          questionId: question.questionId, disposition: 'unresolved', evidenceRefs: [],
          publicReason: 'Offline transport fixture; no strategic conclusion asserted.',
          tradeoff: 'Unknown remains unknown.', replanTrigger: 'Real evidence synthesis required.',
          quantitativeEvidence: [], qualitativeEvidence: [] })) })
        : envelope({ action: 'finish' });
    return { output: action, receipt: { fixtureOnly: true } };
  } },
  onCheckpoint: async state => {
    checkpoint = structuredClone(state);
    mark(`checkpoint_${state.synthesisReader?.completedSteps.length ?? 'pre_reader'}`);
    if (stopAfterRead && checkpoint.synthesisReader?.completedSteps.length === 1) {
      stopAfterRead = false;
      throw Object.assign(Error('SIMULATED_CHECKPOINT_PAUSE'), { code: 'SIMULATED_CHECKPOINT_PAUSE' });
    }
  },
});
mark('shared_framework_started');
await assert.rejects(framework.runRosterTeachFrameworkSessionV1(input()), { code: 'SIMULATED_CHECKPOINT_PAUSE' });
assert.equal(checkpoint.synthesisReader.completedSteps.length, 1);
const finished = await framework.runRosterTeachFrameworkSessionV1(input());
assert.equal(calls, 3, 'Resume does not repeat the completed read');
assert.equal(finished.phase, 'completed');
assert.equal(finished.synthesis.answers.length, archive.questions.length);
assert(finished.synthesis.answers.every(answer => answer.disposition === 'unresolved'));
assert.equal(finished.applicationStatus, 'proposed_not_applied');
assert.equal(finished.synthesisReader.readManifest.length, 1);
console.log(JSON.stringify({ pass: true, actualRejectedBytes: Buffer.byteLength(original), readerPromptBytes: Buffer.byteLength(JSON.stringify(prompt)),
  documents: archive.documents.length, reconstructionPages: pages, exactReconstruction: true, checkpointStable: true,
  sharedFrameworkResume: true, fixtureSteps: calls, unknownNotAccepted: true, providerCalls: 0, rulesQueries: 0 }));
