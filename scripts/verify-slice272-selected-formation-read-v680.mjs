// Actual post-reflow turn3 selected option0 of twelve saved menus. Menus 948/950
// are larger than one delivery child: fetch the CHOSEN option, not the whole list.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-I7zekC/workspace/decision-workflows/decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const work=state.work.find(w=>w.id.endsWith('method:2d6d2da07d4cf306'));
const request=await read('5dbce9050c467351c46c23fde07d40b87561a93174a96296c3b792fa7977002d');
const paid=await read('6eaab87e469ac94b675ee4dab59346dba89c789c0e6af5ac90d7df7432183697');
assert.equal(paid.output.action,'finish');assert.equal(paid.output.workOrders.length,1);
const memory=new Map(),store={load:async()=>structuredClone(state),
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const directory=state.evidence.map((e,i)=>({number:i+1,...e}));
const assignment={...request.promptNodes.find(n=>n.kind==='workflow_role_assignment'),evidenceDirectory:directory};
let operation=structuredClone(work.operationState);operation.calls=operation.calls.filter(c=>c.turn<3);operation.turn=2;
operation.reads=operation.reads.filter(r=>r.pointer!=='/receipt/queryReceipt/result/formationOptions');
operation.pending=null;operation.correction=null;delete operation.readPreparationReturnRequired;
const fetched=[];
const control={get operationState(){return operation;},checkpointOperation:async op=>{operation=structuredClone(op);},
  readEvidence:async(id,pointer)=>{
    fetched.push({id,pointer});const e=directory.find(e=>e.id===id);let value=await store.get(e.artifactRef);
    for(const part of pointer.split('/').slice(1))value=value[part.replaceAll('~1','/').replaceAll('~0','~')];
    return {evidenceId:id,pointer,status:'read',value,validity:'current',conditions:e.conditions};
  }};
const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:request.sessionId,
  deliberation:{deliberate:async req=>({...structuredClone(paid),receipt:{...paid.receipt,contextHash:req.contextHash}})}});
const first=await executor(assignment,control);
assert.equal(first.value.status,'evidence_reads_pending_recheck');
assert.deepEqual(fetched.map(r=>r.pointer),['/receipt/queryReceipt/result/formationOptions/0','/receipt/queryReceipt/result/formationOptions/0']);
assert.equal(operation.correction.errors[0].code,'confirmation_after_evidence_reads');
const second=await executor(assignment,control);
assert.equal(second.value.workOrders.length,1,'the same author choice must pass after its exact selected bodies were delivered');
assert.equal(second.continuation,undefined);assert.equal(fetched.length,2,'no full-list or repeated source fetch');
assert.equal(second.value.workOrders[0].steps[0].operation,'formation_scene');
assert.equal(JSON.parse(second.value.workOrders[0].steps[0].argumentsJson).selections.length,12);
console.log(JSON.stringify({status:'passed',actualPaidChoiceReplayedReadOnly:true,selectedBodiesRead:2,
  exactOptionIndex:0,authorConfirmationRequired:true,allTwelveChoicesPreserved:true,wholeMenuNotRequired:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,controlledAuthorReplay:true,doesNotProveJointPlacementOrStrategy:true}));
