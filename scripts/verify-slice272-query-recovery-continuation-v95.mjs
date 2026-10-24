// Concrete recovery bug: a corrected request still returns a correctable
// unknown, but the coordinator marks it complete after the first execution.
// Captured B query; scripted responses test orchestration, not game legality.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { recoverRosterTeachQueriesV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const base = process.argv[2];
const draft = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json', 'utf8'));
const captured = draft.teachFramework.state.agenda.questions.find(q => q.questionId === 'q-terrain-formation-route-vs-legality');
const failure = draft.teachFramework.state.evidence.find(e => e.challengeId === captured.questionId);
assert.equal(failure.unknownReasonCode, 'CURRENT_ACTION_QUERY_DOMAIN_REFERENCE_REQUIRED');
assert.equal(failure.queryRepair.correctable, true);
const original = JSON.stringify({ captured, failure });

async function exercise(succeedAt) {
  let calls = 0, queries = 0, saved;
  let state = { framework: {}, agenda: { questions: [structuredClone(captured)] },
    evidence: [structuredClone(failure)], investigation: { operations: [], evidence: [] },
    synthesis: { old: true }, synthesisRaw: 'old' };
  const results = [];
  const port = { async query() {
    queries++;
    const result = queries === succeedAt
      ? { status: 'advisory', unknownReasonCode: null }
      : { status: 'unknown', unknownReasonCode: 'CURRENT_ACTION_QUERY_DOMAIN_REFERENCE_REQUIRED',
        queryRepair: { correctable: true, nativeContext: 'scripted feedback ' + queries } };
    const receipt = { ...result, receiptHash: hash({ result, queries }) };
    results.push(receipt);
    return receipt;
  } };
  const run = () => recoverRosterTeachQueriesV1({ state, plan: {}, context: {},
    sourceHash: hash('captured-B-continuation'), evidencePort: port,
    completedBeforeRun: false, checkpoint: async () => { saved = structuredClone(state); },
    ask: async (_kind, nodes) => {
      calls++;
      if (calls > 1) {
        const current = nodes.find(n => n.kind === 'failed_query_to_correct');
        assert.equal(current.result.receiptHash, results.at(-1).receiptHash,
          'The next correction must receive the latest failure, not stale first feedback');
      }
      const toolRequest = structuredClone(captured.evidenceRequest.toolRequest);
      toolRequest.argumentsJson = JSON.stringify({
        ...JSON.parse(toolRequest.argumentsJson), domainId: 'scripted-next-domain-' + calls });
      return { disposition: 'retry', kind: 'spatial', toolRequestJson: JSON.stringify(toolRequest),
        publicReason: 'Scripted correction preserving the captured units/targets.' };
    } });
  await run();
  const expected = Math.min(succeedAt, 3);
  assert.equal(calls, expected, 'Correctable unknown must continue within the existing three-attempt budget');
  assert.equal(queries, expected);
  const operation = state.queryRecovery.operations[0];
  assert.equal(operation.completed, true);
  assert.equal(operation.choices.length, expected);
  assert.equal(operation.result.status, succeedAt <= 3 ? 'advisory' : 'unknown');
  assert.equal(operation.previousResults.length, expected - 1,
    'Earlier executed failures must remain available for trace/review');
  assert.equal(state.synthesis, undefined, 'Stale synthesis is invalidated');
  state = saved;
  await run();
  assert.equal(calls, expected, 'Resume must not repeat a completed or exhausted repair');
  assert.equal(queries, expected);
  assert.deepEqual(operation.originalResult, failure);
}
await exercise(2);
await exercise(99);
assert.equal(JSON.stringify({ captured, failure }), original);
console.log(JSON.stringify({ status: 'PASS', correctableUnknownContinues: true,
  maximumAttemptsPreserved: 3, failuresRetained: true, latestFeedbackUsed: true,
  completedResumeDoesNotRepeat: true, providerCalls: 0, roomActions: 0,
  actualModelRepairOrStrategyProven: false }));
