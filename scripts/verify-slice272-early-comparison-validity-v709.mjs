// Actual source reviewer accepted the declared refutesIf after an immediate
// unchanged control query, while the stronger final design check was later.
// Exercise the real prompt builder, stopping before any Provider dispatch.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {ROSTER_STRATEGIC_COMPARISON_OBLIGATIONS_V1} from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const id='product:strategy-hypothesis:v1:e6ba825710ef1ccd0f58:purpose:v1:study:method:9fb3246ac365b292:source-review:v2:hypothesis:0';
const work=state.work.find(w=>w.id===id);assert.ok(work);
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const verdict=(await read(work.resultRef)).value.checks[0];
assert.equal(verdict.verdict,'supported');assert.ok(verdict.requiredData.length,'actual verdict still lacks the promised effect measurement');
const assignment=await read(work.inputRef);assert.ok(assignment.inputs.comparisonPurpose);
const memory=new Map();let sequence=0,request;
const store={load:async()=>state,get:async ref=>memory.has(ref)?memory.get(ref):read(ref),
  put:async value=>{const ref='fixture-'+(++sequence);memory.set(ref,structuredClone(value));return ref;}};
const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:state.id??'validity-capture',deliberation:{},
  onRequest:async value=>{request=value;throw Error('CAPTURE_ONLY_NO_PROVIDER');}});
const capture=async input=>{
  request=null;await assert.rejects(executor(input,{operationState:{version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0},
    checkpointOperation:async()=>{}}),/CAPTURE_ONLY_NO_PROVIDER/);
  return request;
};
const current=await capture(assignment);
const contract=current.promptNodes.find(node=>node.kind==='current_comparison_validity_contract');
assert.ok(contract,'source review must receive the same design-validity requirement before interpreting a local verdict');
assert.equal(contract.designCriterion,ROSTER_STRATEGIC_COMPARISON_OBLIGATIONS_V1[0].question,
  'one shared criterion, not a weaker source-review copy');
assert.equal(contract.hostChoosesStrategy,false);assert.equal(contract.unmeasuredEqualsZero,false);
assert.equal(contract.localMethodCompletionAnswersParent,false);
assert.equal(contract.addsOutputCheckIds,false);
assert.ok(contract.instruction.includes('refutesIf'));
const ordinary=structuredClone(assignment);delete ordinary.inputs.comparisonPurpose;
assert.equal((await capture(ordinary)).promptNodes.some(node=>node.kind==='current_comparison_validity_contract'),false,
  'unrelated ordinary source checks are unchanged');
console.log(JSON.stringify({passed:true,actualWeakReviewCheckpoint:true,realPromptBuilder:true,
  sharedEarlyDesignCriterion:true,noTacticalPreference:true,noProviderDispatch:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,strategyImprovementProven:false}));
