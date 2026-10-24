// Concrete regression: a billed, fully returned malformed output was classified
// as unknown transport and could not enter the new role's local correction.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterWorkflowProviderBoundaryV1} from '../packages/roster-planning-workspace/roster-workflow-provider-boundary-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const events=(await fs.readFile(process.argv[2]+'/provider-events.jsonl','utf8')).trim().split('\n').map(JSON.parse);
const original=events.find(e=>e.type==='round_failed'&&e.code==='ROSTER_WORKSPACE_OUTPUT_UNPARSEABLE');
assert(original?.failedOutputRecord&&original.usage.totalUnits>0);
let persisted=null,executions=0;const artifacts=new Map();
const store={load:async()=>structuredClone(persisted),save:async v=>{persisted=structuredClone(v);},
  put:async v=>{const id=String(artifacts.size+1);artifacts.set(id,structuredClone(v));return id;},get:async id=>structuredClone(artifacts.get(id))};
const boundary=await createRosterWorkflowProviderBoundaryV1({sessionId:'reproduction',factory:{createForRun:async({onEvent})=>({
  deliberate:async request=>{executions++;await onEvent?.({...original,failedOutputRecord:{...original.failedOutputRecord,contextHash:request.contextHash}});
    throw Error(original.code);}})}});
const execute=createRosterWorkflowReadRoleExecutorV1({deliberation:boundary,store,sessionId:'reproduction'});
const workflow=await createRosterDecisionWorkflowV1({store,execute});
await workflow.dispatch({type:'initialize',scope:{source:'same-source'}});
await workflow.dispatch({type:'enqueue',work:[{id:'repair',role:'roster_workflow_strategy_decision',bindings:{source:'same-source'},inputs:{}}]});
await workflow.dispatch({type:'run_ready'});
const work=(await workflow.inspect()).work[0];
assert.equal(work.status,'needs_model_choice','completed billed malformed output must route to local correction, not unknown stop');
assert.equal(work.operationState.pending,null);assert.equal(executions,1);
const saved=await store.get(work.operationState.correction.originalReplyRef);
assert.equal(saved.providerFailure.rawText,original.failedOutputRecord.rawText);
assert.deepEqual(saved.receipt.usage,original.usage);
console.log(JSON.stringify({passed:true,dispatches:executions,knownBilledFailureRetained:true,localCorrectionReady:true,providerCalls:0}));
