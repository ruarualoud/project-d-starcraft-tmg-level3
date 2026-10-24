// Concrete B regression: a legal partial roster advanced to selection without
// any independent Teach, and its Plan could not change without changing army.
// Real product/session/Teach/laboratory; only Provider responses are fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createRosterPlanningProductModuleV1 } from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import { createIterativeRosterFileStoreV1 } from '../packages/roster-strategist/iterative-roster-file-store-v1.mjs';
import { ROSTER_TEACH_AXES_V1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';

const base = process.argv[2], read = async p => JSON.parse(await fs.readFile(p, 'utf8'));
const assertNativeEvidence = state => {
  const snapshot = state.draftTeachSnapshots.at(-1);
  const row = snapshot.state.evidence.find(r => r.sourceReceipt?.mathKind === 'integer_sum');
  assert.equal(row.status, 'advisory');
  const { receiptHash, ...nativeBody } = row.sourceReceipt;
  assert.equal(hash(nativeBody), receiptHash);
  assert.equal(row.sourceReceipt.result.total, 3);
  assert.equal(snapshot.state.mutationZeroProof.sourceStateHashUnchanged, true);
  assert.equal(snapshot.state.mutationZeroProof.sourceStateMutationCount, 0);
  assert(snapshot.state.mutationZeroProof.receiptLog.includes(receiptHash));
};
if (process.argv[3] === '--inspect-saved-evidence') {
  const directory = process.argv[4];
  const names = await fs.readdir(directory + '/iterative-draft/sessions');
  const saved = (await read(directory + '/iterative-draft/sessions/' + names[0])).value;
  assertNativeEvidence(saved);
  const result = { status: 'pass', check: 'shared laboratory executes the evidence query',
    originalProcessNotRerun: true, otherPassedChecksNotRerun: true,
    providerCalls: 0, nativeCalls: 0, source: directory + '/result.json' };
  await fs.writeFile(directory + '/saved-native-evidence-check.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  process.exit(0);
}
const cfg = await read(base + '/common-v79-plan-recovery-config.private.json');
const sd = base + '/B/fresh-generation-v240/workspace/iterative-draft/sessions';
const original = (await read(sd + '/' + (await fs.readdir(sd))[0])).value;
const state = structuredClone(original);
state.modelContextVersion = 11; state.status = 'active'; state.pendingDecision = null;
state.blockingFinding = null; state.pauseRequested = false;
const dataDirectory = await fs.mkdtemp(base + '/early-teach-v247-');
const calls = [], checks = [], failures = [];
const check = (name, fn) => { try { fn(); checks.push(name); }
  catch (e) { failures.push({ name, message: e.message }); } };
const blank = schema => schema.enum ? schema.enum[0] : schema.type === 'object'
  ? Object.fromEntries(Object.entries(schema.properties).map(([k, v]) => [k, blank(v)]))
  : schema.type === 'array' ? [] : schema.type === 'integer' || schema.type === 'number'
    ? Math.max(0, schema.minimum || 0) : schema.type === 'boolean' ? false
      : schema.minLength ? 'fixture'.padEnd(schema.minLength, 'x') : '';
let selecting = 0, latestResults, capturedSelection;
const factory = {
  descriptor: () => ({ available: true, modelVersion: 'local-fixture', paidProvider: false }),
  createForRun: async config => ({ deliberate: async request => {
    const output = blank(request.responseFormat.schema);
    calls.push({ kind: request.roundKind, contextHash: request.contextHash });
    if (request.roundKind === 'teach_framework_learn') {
      output.principles = ['Fixture method: ask for evidence, never choose tactics.'];
      output.axes = ROSTER_TEACH_AXES_V1.map(axisId => ({ axisId,
        questionMethod: 'Ask a falsifiable question.', evidenceMethod: 'Read the native result.',
        disconfirmationMethod: 'Compare result with the hypothesis.', preserveJustifiedRisk: 'Do not veto strategic risk.' }));
    } else if (request.roundKind === 'teach_framework_agenda') {
      output.coverage = ROSTER_TEACH_AXES_V1.map(axisId => ({ axisId,
        status: axisId === 'victory_route' ? 'questioned' : 'deferred',
        reason: 'Local wiring fixture, not strategic acceptance.' }));
      const q = blank(request.responseFormat.schema.properties.questions.items);
      Object.assign(q, { questionId: 'partial_hypothesis', axisIds: ['victory_route'],
        claim: 'Diagnostic arithmetic only.', question: 'What is 1+2?',
        alternatives: ['Reconsider the draft after evidence.'], scenarioAssumptions: ['Not a score prediction.'],
        falsification: 'A different native sum disproves this arithmetic assumption.' });
      q.evidenceRequest.kind = 'math'; q.evidenceRequest.toolRequest.mathKind = 'integer_sum';
      q.evidenceRequest.toolRequest.inputs.values = [1, 2]; output.questions = [q];
    } else if (request.roundKind === 'teach_framework_investigate') {
      output.publicReason = 'The diagnostic query already returned; no repeated query needed.';
      output.queries = []; output.unresolved = [];
    } else if (request.roundKind === 'teach_framework_synthesis') {
      latestResults = request.promptNodes.find(n => n.kind === 'actual_tool_results')?.evidence;
      output.answers = [{ questionId: 'partial_hypothesis', disposition: 'unresolved',
        evidenceRefs: [], publicReason: 'Arithmetic does not establish a game strategy.',
        tradeoff: 'Improve the opening hypothesis before selecting more units.',
        replanTrigger: 'Use subsequent map and opponent evidence.', quantitativeEvidence: [], qualitativeEvidence: [] }];
      output.proposedPlanChanges = ['Compare an alternative opening before finalising.'];
      output.proposedRosterChanges = []; output.frameworkFeedback = [];
    } else if (request.roundKind === 'iterative_roster_decision') {
      capturedSelection = request.promptNodes[0].content;
      selecting++;
      if (selecting === 1) {
        output.kind = 'query'; output.question = 'Inspect one actual Builder alternative before refining the partial Plan.';
        const q = blank(request.responseFormat.schema.properties.queries.items);
        q.kind = 'budget_branches'; q.candidateHash = state.currentCandidate.candidateHash;
        q.maximumEvaluations = 1; q.maximumMutationDepth = 1; output.queries = [q];
      } else {
        output.kind = 'revise_plan'; output.assumptionDisposition = 'revise';
        output.plan = structuredClone(state.plan);
        output.plan.mapEvidenceHash ||= '';
        delete output.plan.candidateHash; delete output.plan.assumptionDisposition;
        output.plan.strategy.openingSequence = ['Compare an alternative opening using map evidence before committing reserves.'];
        output.plan.strategy.revisionReason = 'Respond to the draft Teach without purchasing different units yet.';
      }
    } else throw new Error('Unexpected fixture request: ' + request.roundKind);
    const receipt = { receiptHash: hash({ request: request.contextHash, output }), paidProviderCall: false };
    await config.onEvent?.({ type: 'round_completed', roundKind: request.roundKind,
      roundIndex: request.roundIndex, paidProviderCall: false, receiptHash: receipt.receiptHash,
      sanitizedOutputRecord: { roundKind: request.roundKind, roundIndex: request.roundIndex,
        contextHash: request.contextHash, outputHash: hash(output),
        outputContractRef: request.responseFormat.outputContractRef, sanitizedOutput: output } });
    return { output, receipt };
  } })
};
const product = await createRosterPlanningProductModuleV1({ root: process.cwd(), fixtureRoot: cfg.fixtureRoot,
  dataDirectory, mapConfiguration: await read(cfg.mapConfigurationFile), enableIterativeDraft: true,
  deliberationFactory: factory });
const store = createIterativeRosterFileStoreV1({ directory: dataDirectory + '/iterative-draft' });
await store.save(state.sessionId, state);
let result = await product.iterativeDraft.resume(state.sessionId);
check('partial army reaches independent Teach before selecting again', () => {
  assert.equal(calls[0].kind, 'teach_framework_learn');
  assert(calls.findIndex(c => c.kind === 'teach_framework_synthesis') < calls.findIndex(c => c.kind === 'iterative_roster_decision'));
  assert.equal(result.currentCandidate.mineralSpent, 1020);
});
check('shared laboratory executes the evidence query', () => {
  // The hot prompt may reference a source receipt; the durable native receipt
  // and mutation-zero log, not the prompt projection, prove actual execution.
  assertNativeEvidence(result);
});
check('unresolved draft feedback reaches selection without becoming final acceptance', () => {
  assert.equal(capturedSelection.decisionState.draftTeachFeedback.synthesis.answers[0].disposition, 'unresolved');
  assert.equal(result.draftTeachSnapshots.at(-1).status, 'completed');
  assert.notEqual(result.status, 'ready_for_match');
  assert.equal(result.teachFeedback ?? null, null);
});
const priorTeachCount = calls.filter(c => c.kind.startsWith('teach_framework_')).length;
result = await product.iterativeDraft.resume(state.sessionId);
check('same draft reuses its Teach instead of buying it again', () => {
  assert.equal(calls.filter(c => c.kind.startsWith('teach_framework_')).length, priorTeachCount);
  assert.equal(result.draftTeachSnapshots.length, 1);
});
check('Plan can change while the partial legal army remains unchanged', () => {
  assert.equal(result.iterations.at(-1).decisionKind, 'revise_plan');
  assert.deepEqual(result.currentCandidate, state.currentCandidate);
  assert.notDeepEqual(result.plan.strategy.openingSequence, state.plan.strategy.openingSequence);
  assert.equal(result.currentCandidate.mineralSpent, 1020);
});
const report = { status: failures.length ? 'fail' : 'pass', checks, failures, calls,
  providerCalls: 0, originalSessionUnchanged: hash((await read(sd + '/' + (await fs.readdir(sd))[0])).value) === hash(original),
  evidenceDirectory: dataDirectory, realModelStrategyAcceptance: false };
await fs.writeFile(dataDirectory + '/result.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
// The real product owns idle spatial worker pools; this dedicated verification
// process owns no live rooms and exits only after all evidence is written.
process.exit(failures.length ? 1 : 0);
