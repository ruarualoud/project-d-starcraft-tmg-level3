// Reproduce E r18/r19: identical exact spatial results acquired new receipt IDs.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createIterativeRosterFlashModelPortV1 } from '../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs';
import { createIterativeRosterPlanSessionV1 } from '../packages/roster-strategist/iterative-roster-plan-session-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [base, mode = 'identity'] = process.argv.slice(2);
assert(['identity', 'compact_query', 'query_contract_recovery', 'corrected_contract_bound'].includes(mode));
const dir = `${base}/roster-plan-matrix-v274/E/fresh-generation-v274/workspace/iterative-draft`;
const file = (await fs.readdir(`${dir}/sessions`)).find(f => f.endsWith('.json'));
const raw = JSON.parse(await fs.readFile(`${dir}/sessions/${file}`, 'utf8'));
const original = raw.value ?? raw;
if (['query_contract_recovery', 'corrected_contract_bound'].includes(mode)) {
  assert.equal(original.revision, 30, 'Captured E stopped after three malformed replies');
  assert.equal(original.pendingDecision, null);
  let saved = structuredClone(original);
  const ledgerHash = hash({ iterations: saved.iterations, observations: saved.observations,
    paidCount: saved.modelDecisionReceiptCount, candidate: saved.currentCandidate, plan: saved.plan });
  const session = createIterativeRosterPlanSessionV1({
    store: { load: async () => saved, save: async (_, state) => { saved = state; } },
    model: { decide: async () => {
      assert.equal(mode, 'corrected_contract_bound');
      return { outcome: 'completed', receiptHash: '1'.repeat(64),
        decision: { kind: 'repair_needed', failureCode: 'ITERATIVE_ROSTER_UNCHANGED_QUERY_LOOP' } };
    } },
    builder: { evaluate: async () => { throw Error('UNEXPECTED_BUILDER'); } },
    tools: { query: async () => { throw Error('UNEXPECTED_QUERY'); } },
    review: { draft: async state => state, final: async () => { throw Error('UNEXPECTED_REVIEW'); } },
  });
  const prepared = await session.prepare(saved.sessionId);
  assert.equal(prepared.modelContextVersion, 15, 'A fixed decoding contract must be explicit, not an erased failure counter');
  assert.equal(prepared.status, 'requires_reconciliation', 'Prepare alone cannot accept or restart an invalid answer');
  assert.equal(prepared.feedbackContextMigrations.at(-1).reason, 'typed_query_arm_decoding_and_semantic_evidence_identity');
  assert.equal(hash({ iterations: prepared.iterations, observations: prepared.observations,
    paidCount: prepared.modelDecisionReceiptCount, candidate: prepared.currentCandidate, plan: prepared.plan }), ledgerHash);
  if (mode === 'corrected_contract_bound') {
    const recovered = await session.resume(saved.sessionId, { advanceAfterKnownInvalid: true });
    assert.equal(recovered.status, 'requires_reconciliation',
      'One extra after a proven fix must stop if still invalid, not reopen three more attempts');
    assert.equal(recovered.revision, 31);
    assert.equal(recovered.iterations.length, original.iterations.length + 1);
  }
  console.log(JSON.stringify({ mode, pass: true, originalHistoryPreserved: true,
    stoppedStatePreserved: true, contractVersion: 15, providerCalls: 0, nativeActions: 0 }));
  process.exit(0);
}
const iterations = original.iterations.filter(i => [18, 19].includes(i.revision));
assert.equal(iterations.length, 2);
assert.deepEqual(iterations[0].publicDecision.queries, iterations[1].publicDecision.queries);
assert.notDeepEqual(iterations[0].toolReceiptHashes, iterations[1].toolReceiptHashes);
const observations = original.observations.filter(o => iterations.some(i => i.requestKey === o.requestKey));
const state = { sessionId: original.sessionId, revision: 19, mineralBudget: 2000,
  modelContextVersion: original.modelContextVersion, frozenContext: original.frozenContext,
  currentCandidate: iterations[1].candidateSnapshot, plan: iterations[1].planSnapshot,
  observations, iterations, pendingDecision: null };
let output;
const replyKey = mode === 'compact_query'
  ? original.iterations.find(i => i.revision === 28).requestKey : iterations[1].requestKey;
for (const name of await fs.readdir(`${dir}/replies`)) {
  const row = JSON.parse(await fs.readFile(`${dir}/replies/${name}`, 'utf8'));
  const reply = row.value ?? row;
  if (reply.requestKey === replyKey) { output = reply.output; break; }
}
assert.equal(output?.kind, 'query');
const before = hash(state);
async function decide(input, label, modelOutput = output) {
  const replies = new Map();
  let captured;
  const port = createIterativeRosterFlashModelPortV1({ skillGuidance: {}, missionEvidence: {},
    replyStore: { loadRetainedReply: async k => replies.get(k), retainReply: async (k, v) => replies.set(k, v) },
    deliberationFactory: { createForRun: async config => ({ deliberate: async request => {
      captured = request.promptNodes[0].content;
      await config.onEvent({ type: 'round_completed', receiptHash: '1'.repeat(64),
        paidProviderCall: false, sanitizedOutputRecord: { sanitizedOutput: structuredClone(modelOutput) } });
    } }) } });
  return { result: await port.decide({ requestKey: `v280-${label}`, state: input }), captured };
}
const same = await decide(state, 'same');
assert.equal(same.result.decision.failureCode, 'ITERATIVE_ROSTER_UNCHANGED_QUERY_LOOP',
  'New queryId/sourceReceiptHash must not disguise identical source-bound query evidence as progress');
assert.equal(same.captured.unchangedQueryEvidence.strategyChosenByHost, false);
assert.equal(same.captured.unchangedQueryEvidence.queries.length, 3);
assert.equal(hash(state), before, 'Retained evidence must remain byte-equivalent');
for (const variant of mode === 'identity' ? ['source_state', 'result', 'missing_receipt'] : []) {
  const changed = structuredClone(state);
  const last = changed.observations.at(-1);
  if (variant === 'source_state') last.receipt.baseStateHash = '2'.repeat(64);
  if (variant === 'result') last.receipt.queryReceipt.result.markerResults[0].supplyTotals.player1 = 1;
  if (variant === 'missing_receipt') changed.observations.pop();
  const allowed = await decide(changed, variant);
  assert.equal(allowed.result.decision.kind, 'query', `${variant} is not a proven repeat`);
  assert.equal(allowed.captured.unchangedQueryEvidence, undefined);
}
if (mode === 'compact_query') {
  const malformed = structuredClone(output);
  delete malformed.queries.find(q => q.kind === 'scene_query').argumentsJson;
  const rejected = await decide(state, 'missing-active-argument', malformed);
  assert.equal(rejected.result.decision.failureCode, 'ITERATIVE_ROSTER_FLASH_OUTPUT_INVALID');
  assert(rejected.result.decision.diagnostics.validationIssues.some(i => i.path.includes('argumentsJson')),
    'An actually missing query argument must return the exact field path to correction');
  assert.equal(rejected.result.decision.diagnostics.strategyFieldsInvented, false);
}
console.log(JSON.stringify({ mode, pass: true, capturedTransitions: 'E-r18-r19',
  sourceBindingsAndResultsPreserved: true, missingEvidenceNotInferred: true,
  originalEvidenceUnchanged: true, providerCalls: 0, roomActions: 0 }));
