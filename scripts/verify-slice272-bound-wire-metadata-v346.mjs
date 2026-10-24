import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { createIterativeRosterFlashModelPortV1 } from '../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs';
const [directory] = process.argv.slice(2);
const read = async name => JSON.parse(gunzipSync(await fs.readFile(`${directory}/${name}`)));
const request = await read('call-053.product-request.json.gz');
const original = (await read('call-053.reply.json.gz')).output;
const current = request.promptNodes[0].content.decisionState;
const route = current.observations.find(row => row.query.kind === 'map_route');
const state = { sessionId: current.sessionId, revision: current.revision,
  modelContextVersion: 20, mineralBudget: current.mineralBudget, frozenContext: current.frozenContext,
  currentCandidate: current.currentCandidate, plan: current.plan,
  observations: [{ ...route, receipt: current.observationReceipts[route.receiptRef] }], iterations: [] };
const before = JSON.stringify(original);
async function run(output) {
  const saved = new Map();
  const port = createIterativeRosterFlashModelPortV1({ skillGuidance: {}, missionEvidence: {},
    queryCapabilities: () => current.queryCapabilities,
    replyStore: { loadRetainedReply: async k => saved.get(k), retainReply: async (k,v) => saved.set(k,v) },
    deliberationFactory: { createForRun: async ({ onEvent }) => ({ deliberate: async () =>
      onEvent({ type: 'round_completed', receiptHash: 'fixture-receipt',
        sanitizedOutputRecord: { sanitizedOutput: structuredClone(output) }, paidProviderCall: false }) }) } });
  return (await port.decide({ requestKey: 'actual53-bound-metadata', state })).decision;
}
const applied = await run(original);
assert.equal(applied.kind, 'revise_plan', 'A typo in an echoed schema name must not discard bound valid Plan edits');
assert.deepEqual(applied.plan.strategy.openingSequence, original.planEdits.find(e=>e.field==='openingSequence').itemsValue);
assert.equal(applied.wireMetadataAdjustments[0].supplied, original.schemaVersion);
assert.equal(applied.wireMetadataAdjustments[0].authority, 'bound_request_output_contract');
const wrongOperation = { ...original, kind: 'delete_army' };
assert.equal((await run(wrongOperation)).kind, 'repair_needed');
const wrongValue = structuredClone(original); wrongValue.planEdits[0].textValue = 12;
assert.equal((await run(wrongValue)).kind, 'repair_needed');
assert.equal(JSON.stringify(original), before);
console.log(JSON.stringify({ pass: true, checks: 3, actual53Typo: true,
  existingBoundPayloadReused: true, operationAndValueValidationRetained: true,
  originalReplyUnchanged: true, providerCalls: 0, nativeCalls: 0 }));
