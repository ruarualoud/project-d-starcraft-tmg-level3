// Actual missing /scenarioConstruction/spec binding: it is an unissued model
// work-order error, not an unknown dispatched tool outcome. Memory-only replay.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const base=path.join(path.resolve(process.argv[2]),'workspace/decision-workflows/p4-from-empty');
let state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const id='review-resolution:r10:combat_and_losses:order-repair0:order0:build-scene';
const target=state.work.find(w=>w.id===id),parent=state.work.find(w=>w.id===target.inputs.binding0.id);
state.work=[parent,target];target.status='ready';target.failure=null;
const saved=new Map();let serial=0,executions=0;
const store={load:async()=>structuredClone(state),save:async v=>{state=structuredClone(v);},
  get:async ref=>saved.has(ref)?structuredClone(saved.get(ref)):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
  put:async v=>{const key='temporary-'+(++serial);saved.set(key,structuredClone(v));return key;}};
const workflow=await createRosterDecisionWorkflowV1({store,execute:()=>{executions++;throw Error('NO_EXECUTION_ALLOWED');}});
await workflow.dispatch({type:'run_ready',concurrency:1});
let after=(await workflow.inspect()).work.find(w=>w.id===id);
assert.equal(after.status,'needs_model_choice','a model-selected missing dependency path must return for correction');
assert.equal(executions,0);
const failure=(await store.get(after.resultRef)).value;
assert.equal(failure.queryRepair.correctable,true);
assert.equal(failure.queryRepair.sourceWorkId,parent.id);
assert.equal(failure.queryRepair.requestedPointer,'/value/receipt/scenarioConstruction/spec');
assert.ok(failure.queryRepair.actualSource.value.receipt.scenarioConstruction.placementFields);
const before=JSON.stringify(state);
await workflow.dispatch({type:'reconcile_unissued_input_failures'});
assert.equal(JSON.stringify(state),before,'already routed failures are idempotent');
const replacement={...structuredClone(parent),id:'wrong-operation',resultRef:await store.put({
  kind:'tool_receipt',value:{operation:'inspect',receipt:{}},conditions:[]})};
state.work.push(replacement);
const wrongOperation=await createRosterDecisionWorkflowV1({store,execute:()=>{executions++;}});
await assert.rejects(wrongOperation.dispatch({type:'resolve_with_work',workId:id,replacementWorkId:replacement.id}),
  /ROSTER_WORKFLOW_REPAIR_OPERATION_MISMATCH/,'an inspect receipt must not stand in for a scene construction');
// A paid/unknown operation must not enter this reconciliation path.
state.work[1].status='needs_repair';state.work[1].failure={code:'ROSTER_WORKFLOW_INPUT_PATH_MISSING',dispatchOutcome:'unknown',detail:{input:'binding0'}};
const unknown=await createRosterDecisionWorkflowV1({store,execute:()=>{executions++;}});
await unknown.dispatch({type:'reconcile_unissued_input_failures'});
after=(await unknown.inspect()).work.find(w=>w.id===id);
assert.equal(after.status,'needs_repair');assert.equal(executions,0);
console.log(JSON.stringify({pass:true,checks:8,providerCalls:0,toolExecutions:0,productionWrites:0}));
