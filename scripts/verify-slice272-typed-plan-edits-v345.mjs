import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { createIterativeRosterFlashModelPortV1 } from '../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs';
const [directory] = process.argv.slice(2);
const read = async name => JSON.parse(gunzipSync(await fs.readFile(`${directory}/${name}`)));
const request = await read('call-052.product-request.json.gz');
const original = (await read('call-052.reply.json.gz')).output;
const current = request.promptNodes[0].content.decisionState;
const route = current.observations.find(row => row.query.kind === 'map_route');
assert.deepEqual(original.plan.strategy.openingSequence, current.plan.strategy.openingSequence,
  'Actual52 claimed a changed opening but returned the old field');
assert.match(original.plan.strategy.revisionReason, /openingSequence is changed/);
const state = { sessionId: current.sessionId, revision: current.revision,
  modelContextVersion: 20, mineralBudget: current.mineralBudget, frozenContext: current.frozenContext,
  currentCandidate: current.currentCandidate, plan: current.plan,
  observations: [{ ...route, receipt: current.observationReceipts[route.receiptRef] }], iterations: [] };
const before = JSON.stringify(state);
let captured;
async function run(output, version = 20) {
  const saved = new Map();
  const port = createIterativeRosterFlashModelPortV1({ skillGuidance: {}, missionEvidence: {},
    queryCapabilities: () => current.queryCapabilities,
    replyStore: { loadRetainedReply: async k => saved.get(k), retainReply: async (k,v) => saved.set(k,v) },
    deliberationFactory: { createForRun: async ({ onEvent }) => ({ deliberate: async input => {
      captured = input;
      await onEvent({ type: 'round_completed', receiptHash: 'fixture-receipt',
        sanitizedOutputRecord: { sanitizedOutput: structuredClone(output) }, paidProviderCall: false });
    } }) } });
  return (await port.decide({ requestKey: 'typed-plan-operation', state: { ...state, modelContextVersion: version } })).decision;
}
const patch = { schemaVersion: original.schemaVersion, kind: 'revise_plan',
  question: 'Fixture: replace the actual named fields; this is not a production strategy.',
  assumptionDisposition: 'revise', planEdits: [
    { field: 'openingSequence', textValue: '', itemsValue: ['Changed opening fixture'] },
    { field: 'counterPlans', textValue: '', itemsValue: ['Changed response fixture'] } ] };
const applied = await run(patch);
assert.equal(applied.kind, 'revise_plan', 'Typed named edits must reach the existing Plan write command');
assert.deepEqual(applied.plan.strategy.openingSequence, patch.planEdits[0].itemsValue);
assert.deepEqual(applied.plan.strategy.counterPlans, patch.planEdits[1].itemsValue);
assert.equal(applied.plan.strategy.rosterRationale, state.plan.strategy.rosterRationale);
assert.equal(applied.plan.mapEvidenceHash, state.plan.mapEvidenceHash);
assert.equal(applied.plan.strategy.revisionReason, patch.question);
assert(captured.responseFormat.schema.properties.planEdits);
assert.equal((await run(original)).kind, 'repair_needed', 'New revision command cannot silently ignore missing edits and copy old Plan');
const bad = structuredClone(patch); bad.planEdits[0].field = 'mapEvidenceHash';
assert.equal((await run(bad)).kind, 'repair_needed', 'Source-owned proof identity is not a model patch field');
const duplicate = structuredClone(patch); duplicate.planEdits.push(patch.planEdits[0]);
assert.equal((await run(duplicate)).kind, 'repair_needed', 'Duplicate writes must not silently choose one');
const wrongType = structuredClone(patch); wrongType.planEdits[0].textValue = 'Wrong array arm';
assert.equal((await run(wrongType)).kind, 'repair_needed');
assert.equal((await run(original, 19)).kind, 'revise_plan', 'Old paid outputs retain their original format');
assert.equal(JSON.stringify(state), before);
console.log(JSON.stringify({ pass: true, checks: 6, actual52WholeDocumentRewriteFailure: true,
  namedEditsAppliedExactly: true, untouchedFieldsPreserved: true, invalidWritesRepairable: true,
  historicalContractPreserved: true, providerCalls: 0, nativeCalls: 0 }));
