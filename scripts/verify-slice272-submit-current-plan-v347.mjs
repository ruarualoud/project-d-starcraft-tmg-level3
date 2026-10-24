import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { createIterativeRosterFlashModelPortV1 } from '../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs';
const [directory] = process.argv.slice(2);
const read = async name => JSON.parse(gunzipSync(await fs.readFile(`${directory}/${name}`)));
const current = (await read('call-056.product-request.json.gz')).promptNodes[0].content.decisionState;
const original = (await read('call-056.reply.json.gz')).output;
const route = current.observations.find(row=>row.query.kind==='map_route');
const state = { sessionId: current.sessionId, revision: current.revision, modelContextVersion: 20,
  mineralBudget: current.mineralBudget, frozenContext: current.frozenContext,
  currentCandidate: current.currentCandidate, plan: current.plan,
  observations: [{ ...route, receipt: current.observationReceipts[route.receiptRef] }], iterations: [] };
const before = JSON.stringify(state);
async function run(output, inputState = state) {
  const saved = new Map();
  const port = createIterativeRosterFlashModelPortV1({ skillGuidance: {}, missionEvidence: {},
    queryCapabilities: () => current.queryCapabilities,
    replyStore: { loadRetainedReply: async k=>saved.get(k), retainReply: async(k,v)=>saved.set(k,v) },
    deliberationFactory: { createForRun: async({onEvent})=>({deliberate:async()=>onEvent({
      type:'round_completed',receiptHash:'fixture',paidProviderCall:false,
      sanitizedOutputRecord:{sanitizedOutput:structuredClone(output)}})}) } });
  return (await port.decide({requestKey:'actual56-submit',state:inputState})).decision;
}
const result = await run(original);
assert.equal(result.kind,'finish','A bound submit-current command must not require copying a complete saved Plan again');
assert.equal(result.plan.victoryRoute,current.plan.victoryRoute);
assert.deepEqual(result.plan.strategy,current.plan.strategy);
assert.equal(result.planSubmission.sourcePlanHash,current.plan.planHash ?? null);
assert.equal(result.planSubmission.finalAcceptance,false);
const partial = structuredClone(original);partial.plan.strategy.rosterRationale='Partial replacement is not submit-current';
assert.equal((await run(partial)).kind,'repair_needed','Never silently merge a partial document');
assert.equal((await run(original,{...state,plan:null})).kind,'repair_needed');
assert.equal((await run(original,{...state,currentCandidate:{...state.currentCandidate,mineralSpent:1990}})).kind,'repair_needed');
assert.equal(JSON.stringify(state),before);
console.log(JSON.stringify({pass:true,checks:4,actual56:true,currentPlanSubmittedExactly:true,
  partialDocumentNotMerged:true,budgetAndFinalReviewNotBypassed:true,providerCalls:0,nativeCalls:0}));
