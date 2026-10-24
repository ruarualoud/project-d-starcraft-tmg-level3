// Actual Raynor Orders selection was stuck on a 60KiB whole actionSpace read.
// A wrong actionType was hidden by the coarse read gate. One shared resolver
// must report the exact mismatch, then read the actually selected 4KiB domain.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowFeedbackRecoveryV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {projectRosterWorkflowReceiptViewV1} from '../packages/roster-strategist/roster-workflow-receipt-view-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-M86Cg9/workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const paid=await read('28b7a63f099da3def4a3be319ebe53bc51ccb8d0b09cc40e92d2dcba791baee1');
const work=state.work.find(w=>w.operationState?.correction?.originalReplyRef==='28b7a63f099da3def4a3be319ebe53bc51ccb8d0b09cc40e92d2dcba791baee1');
assert(work,'the actual exhausted menu-read failure is the frozen bug source');
const lastCall=work.operationState.calls.at(-1),request=await read(lastCall.requestRef);
const directory=state.evidence.map((e,i)=>({number:i+1,...e}));
let entry=directory[808],raw=await read(entry.artifactRef);entry=directory.find(e=>e.id===raw.evidenceId);raw=await read(entry.artifactRef);
const domain=raw.receipt.actionSpace.parameterDomains.find(x=>x.abilityName==='Orders'&&x.pieceId==='jim-raynor-1');
const domainIndex=raw.receipt.actionSpace.parameterDomains.indexOf(domain);
assert.equal(domain.actionType,'resolve_battlefield_asset_ability');
let operation=structuredClone(work.operationState);operation.pending=null;operation.correction=null;
operation.consecutiveCorrections=0;operation.correctionLimit=3;
const memory=new Map(),store={load:async()=>structuredClone(state),
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const assignment={...request.promptNodes.find(n=>n.kind==='workflow_role_assignment'),evidenceDirectory:directory};
const fetched=[];let output=structuredClone(paid.output);
const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:request.sessionId,
  deliberation:{deliberate:async req=>({...structuredClone(paid),output:structuredClone(output),receipt:{...paid.receipt,contextHash:req.contextHash}})}});
const control={get operationState(){return operation;},checkpointOperation:async value=>{operation=structuredClone(value);},
  readEvidence:async(id,pointer)=>{
    fetched.push({id,pointer});let e=directory.find(e=>e.id===id),v=await store.get(e.artifactRef);
    if(v.schema==='roster_workflow_receipt_view_v1'&&pointer.startsWith('/receipt/')){e=directory.find(e=>e.id===v.evidenceId);v=await store.get(e.artifactRef);}
    for(const part of pointer.split('/').slice(1))v=v[part.replaceAll('~1','/').replaceAll('~0','~')];
    return {evidenceId:id,pointer,status:'read',value:v,validity:'current',conditions:e.conditions};
  }};
const mismatch=await executor(assignment,control);
assert.equal(mismatch.value.status,'needs_local_correction');
const error=mismatch.value.errors.find(e=>e.code==='ROSTER_WORKFLOW_NATIVE_SELECTION_MATCH_NOT_UNIQUE');
assert(error,'report actual wrong identity, not another impossible whole-menu read');
assert(error.detail.availableIdentities.some(i=>i.domainId===domain.domainId&&i.actionType===domain.actionType));
assert.equal(fetched.length,0);
// Controlled author chooses the exact observed ID. The immutable paid reply
// above remains untouched; this is a source-delivery gate, not a live repair.
const args=JSON.parse(output.workOrders[0].steps[0].argumentsJson);args.selection.match={domainId:domain.domainId};
output.workOrders[0].steps[0].argumentsJson=JSON.stringify(args);
const pending=await executor(assignment,control);
assert.equal(pending.value.status,'evidence_reads_pending_recheck');
assert.deepEqual(fetched.map(x=>x.pointer),['/receipt/actionSpace/parameterDomains/'+domainIndex]);
const confirmed=await executor(assignment,control);
assert.equal(confirmed.value.workOrders.length,1);assert.equal(confirmed.continuation,undefined);
assert.deepEqual(JSON.parse(confirmed.value.workOrders[0].steps[0].argumentsJson),args);
const {resolveRosterWorkflowNativeSelectionV1}=await import('../packages/roster-strategist/roster-workflow-laboratory-v1.mjs');
const selected=resolveRosterWorkflowNativeSelectionV1(args,{workId:entry.id,value:raw});
assert.equal(selected.menuPointer,'/receipt/actionSpace/parameterDomains/'+domainIndex);
assert.equal(selected.action.domainId,domain.domainId);assert.deepEqual(selected.item,domain);
const finite=resolveRosterWorkflowNativeSelectionV1({selection:{sourceEvidenceNumber:809,kind:'finite',index:0}},{workId:entry.id,value:raw});
assert.equal(finite.menuPointer,'/receipt/actionSpace/finiteActions/0');
assert.equal(finite.action.actionKey,raw.receipt.actionSpace.finiteActions[0].proposal.actionKey);
const view=projectRosterWorkflowReceiptViewV1({evidenceId:entry.id,value:raw});
assert(view.actionMenuDirectory.some(e=>e.domainId===domain.domainId&&e.readPointer===selected.menuPointer));
const recovery=projectRosterWorkflowFeedbackRecoveryV1({work,reply:paid,request});
assert.equal(recovery.repairKind,'selected_native_menu');assert.equal(recovery.additionalInvalidResultLimit,1);
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work,reply:paid,request:{...request,promptNodes:[...request.promptNodes,{kind:'selected_native_menu_read_contract',version:1}]}}),null);
console.log(JSON.stringify({status:'passed',actualWrongIdentityReported:true,selectedDomainCharacters:JSON.stringify(domain).length,
  fullMenuCharacters:JSON.stringify(raw.receipt.actionSpace).length,sharedExecutionAndReadResolver:true,
  authorConfirmationPreserved:true,finiteAndDomainCovered:true,oneVersionedRecoveryOnly:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,controlledAuthorReplay:true,strategyImprovementNotProven:true}));
