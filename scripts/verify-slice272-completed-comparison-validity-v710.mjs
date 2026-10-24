// Reproduce the actual r16 final review whose comparisonResult caused the
// shared validity prompt to be omitted. Capture requests, never send them.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {assessRosterProductHypothesisCycleV1,ROSTER_STRATEGIC_COMPARISON_OBLIGATIONS_V1} from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const review=state.work.find(w=>w.id.endsWith('comparison:plan-r16:round3:study-contract-v4'));
assert.ok(review);assert.equal(review.comparisonContractVersion,4);
const actual=(await read(review.resultRef)).value;
assert.ok(actual.checks.every(c=>c.verdict==='supported'&&!c.requiredData.length));
const owner=state.work.find(w=>w.id.endsWith('purpose:v1:after-study:decision'));assert.ok(owner);
const memory=new Map();let next=0,request;
const store={load:async()=>state,get:async ref=>memory.has(ref)?memory.get(ref):read(ref),
  put:async value=>{const ref='capture-'+(++next);memory.set(ref,structuredClone(value));return ref;}};
const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'completed-validity-capture',deliberation:{},
  onRequest:async value=>{request=value;throw Error('CAPTURE_ONLY_NO_PROVIDER');}});
for(const work of [review,owner]){
  const assignment=await read(work.inputRef);assert.ok(assignment.inputs.comparisonPurpose);assert.ok(assignment.inputs.comparisonResult);
  request=null;await assert.rejects(executor(assignment,{operationState:{version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0},
    checkpointOperation:async()=>{}}),/CAPTURE_ONLY_NO_PROVIDER/);
  const validity=request.promptNodes.find(n=>n.kind==='current_comparison_validity_contract');
  assert.ok(validity,'completed comparisons and actual strategic owners must receive the same scientific-validity contract');
  assert.equal(validity.designCriterion,ROSTER_STRATEGIC_COMPARISON_OBLIGATIONS_V1[0].question);
  assert.equal(validity.hostChoosesStrategy,false);assert.equal(validity.addsOutputCheckIds,false);
}
const draft=await read(state.draftRef);
const assessment=await assessRosterProductHypothesisCycleV1({state,draft,readArtifact:read});
assert.equal(assessment.comparisonResolved,false,'an old optimistic review without the repaired contract must not release the product');
assert.equal(assessment.comparisonStopped,false,'the one explicit source-fix review may use the same prior round, not reset three rounds');
console.log(JSON.stringify({passed:true,actualOptimisticReview:true,realPromptBuilder:true,strategicOwnerAndFinalReviewCovered:true,
  oldResultNotAltered:true,noExtraReviewCycle:true,providerCalls:0,nativeCalls:0,productionWrites:0,strategyImprovementProven:false}));
