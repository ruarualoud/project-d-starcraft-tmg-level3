// Actual fixed-roster owner repeatedly returned its own declaration fields as
// external necessary facts. Capture its real request; no paid request is sent.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';

const base=path.join(path.resolve(process.argv[2]),'workspace/decision-workflows/decision-a6d75905-a910-49a7-b260-f6eb8f7558d5');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const owner=state.work.find(work=>work.resultRef==='ed9cb87ad20d694f1d47fd4abec401a44df2f6c3d43f6516aa283737df9b1179');
assert.ok(owner,'actual repeated owner must be preserved');
// inputRef is the scheduler assignment BEFORE the product factory adds its
// explicit parent-purpose context. Replay the actual paid prompt's enriched
// inputs, not a raw-assignment shortcut that would omit the existing contract.
const scheduled=await read(owner.inputRef);
const paidRequest=await read(owner.operationState.calls.at(-1).requestRef);
const delivered=paidRequest.promptNodes.find(node=>node.kind==='workflow_role_assignment');
assert.ok(paidRequest.promptNodes.some(node=>node.kind==='current_comparison_validity_contract'));
const assignment={...scheduled,inputs:structuredClone(delivered.inputs)},original=JSON.stringify(assignment);
const actual=(await read(owner.resultRef)).value.decisions[0];
assert.equal(actual.disposition,'retain');
assert.ok(actual.requiredData.some(question=>question.includes('scheduleStatus')));
const memory=new Map();let next=0,request;
const store={load:async()=>state,get:async ref=>memory.has(ref)?memory.get(ref):read(ref),
  put:async value=>{const ref='capture-v721-'+(++next);memory.set(ref,structuredClone(value));return ref;}};
const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'plan-owner-capture',deliberation:{},
  onRequest:async value=>{request=value;throw Error('CAPTURE_ONLY_NO_PROVIDER');}});
await assert.rejects(executor(assignment,{operationState:{version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0},
  checkpointOperation:async()=>{}}),/CAPTURE_ONLY_NO_PROVIDER/);
const responsibility=request.promptNodes.find(node=>node.kind==='current_plan_authoring_responsibility');
assert.ok(responsibility,'actual owner needs an explicit authoring-vs-measurement responsibility contract');
assert.deepEqual(responsibility.actions.map(action=>action.intentPath).sort(),[
  '/deploymentConcept/activationOrderStatus','/lossResourceBudget/lossBudgetStatus','/scoreRoute/scheduleStatus'].sort());
assert.equal(responsibility.ownerRole,'roster_workflow_strategy_decision');
assert.equal(responsibility.rosterEditAuthority,'preset_immutable');
assert.equal(responsibility.fixedArmyDoesNotLockPlan,true);
assert.equal(responsibility.plannedValuesAreObservedFacts,false);
assert.equal(responsibility.hostChoosesPlanValues,false);
assert.ok(request.promptNodes.some(node=>node.kind==='current_comparison_validity_contract'),
  'authoring permission cannot remove the independent experimental-validity requirement');
assert.equal(JSON.stringify(assignment),original,'old queued assignment and paid result remain immutable');
console.log(JSON.stringify({passed:true,actualRepeatedOwner:true,normalPromptBuilder:true,
  exactThreeAuthoringPaths:true,fixedArmyPlanEditable:true,comparisonGatePreserved:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,actualOwnerRevisionStillRequired:true}));
