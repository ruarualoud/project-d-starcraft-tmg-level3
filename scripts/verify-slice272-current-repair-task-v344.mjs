import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { createIterativeRosterFlashModelPortV1 } from '../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs';
const [directory] = process.argv.slice(2);
const read = async n => JSON.parse(gunzipSync(await fs.readFile(`${directory}/call-${n}.product-request.json.gz`)));
const original = (await read('050')).promptNodes[0].content;
const operation = original.latestOperation;
const iteration = original.decisionState.iterations.at(-1);
const state = { ...original.decisionState, observations: [{ requestKey: operation.requestKey,
  query: { kind: 'model_output_repair' }, receipt: operation.failure }],
  iterations: [iteration], draftTeachFeedback: null };
const before = JSON.stringify(state);
const captured = [];
const sentinel = new Error('CAPTURE_ONLY');
const port = createIterativeRosterFlashModelPortV1({ skillGuidance: {}, missionEvidence: {},
  queryCapabilities: () => original.decisionState.queryCapabilities,
  replyStore: { loadRetainedReply: async () => null, retainReply: async () => {} },
  deliberationFactory: { createForRun: async () => ({ deliberate: async request => {
    captured.push(request); throw sentinel;
  } }) } });
await assert.rejects(port.decide({ requestKey: 'actual50-repair-message', state }), e => e === sentinel);
assert(captured[0].userMessage.includes(operation.failure.failureCode),
  'The actual repair request must name its current failure in the final task message, not only 1.3MB earlier in context');
assert(captured[0].userMessage.includes(operation.failure.diagnostics.instruction),
  'The exact source-owned correction must reach the final task without a new tactical instruction');
assert(captured[0].userMessage.includes(operation.requestKey));
assert.deepEqual(captured[0].promptNodes[0].content.latestOperation.failure, operation.failure);
await assert.rejects(port.decide({ requestKey: 'normal-task', state: { ...state, observations: [], iterations: [] } }), e => e === sentinel);
assert(!captured[1].userMessage.includes(operation.failure.failureCode), 'Old errors must not become the current task');
assert.equal(JSON.stringify(state), before);
console.log(JSON.stringify({ pass: true, checks: 3, actual50RepairFeedback: true,
  currentSourceInstructionAtTaskBoundary: true, oldErrorNotPromoted: true,
  noStrategyOrEvidenceMutation: true, providerCalls: 0, nativeCalls: 0 }));
