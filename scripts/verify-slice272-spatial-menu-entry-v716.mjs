// Actual spatial selector matched the unique Goliath move domain, but the
// read gate requested the whole actionSpace, whose domain array was omitted.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowFeedbackRecoveryV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {resolveRosterWorkflowNativeSelectionV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const directory=process.argv[2],run=JSON.parse(await fs.readFile(path.join(directory,'product-run.json'),'utf8'));
const base=path.join(directory,'workspace/decision-workflows',run.workflowId);
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const work=state.work.find(w=>w.id.endsWith('order0:select-goliath-move:input-repair'));assert.ok(work);
const last=work.operationState.calls.at(-1),paid=await get(last.replyRef),request=await get(last.requestRef),assignment=await get(work.inputRef);
assert.ok(work.operationState.correction.errors.every(e=>e.code==='evidence_not_read'&&e.requiredPointer==='/receipt/actionSpace'));
const selection=JSON.parse(paid.output.workOrders[0].steps[0].argumentsJson).selection;
const source=state.evidence[selection.sourceEvidenceNumber-1],raw=await get(source.artifactRef);
const resolved=resolveRosterWorkflowNativeSelectionV1({selection:{...selection,parameters:{}}},{workId:source.id,value:raw.value??raw});
assert.ok(resolved.menuPointer.startsWith('/receipt/actionSpace/parameterDomains/'));
const memory=new Map();let next=0;const paths=[];
const store={load:async()=>state,get:async ref=>memory.has(ref)?memory.get(ref):get(ref),
  put:async value=>{const ref='menu-entry-capture-'+(++next);memory.set(ref,structuredClone(value));return ref;}};
const operation=structuredClone(work.operationState);operation.calls=operation.calls.slice(0,-1);operation.turn--;
operation.pending=null;operation.correction=null;operation.consecutiveCorrections=0;
const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'saved-spatial-menu',deliberation:{deliberate:async()=>structuredClone(paid)}});
const result=await executor(assignment,{operationState:operation,checkpointOperation:async()=>{},readEvidence:async(id,pointer)=>{
  paths.push(pointer);assert.equal(id,source.id);assert.equal(pointer,resolved.menuPointer,'fetch only the model-selected Native entry');
  return {status:'read',evidenceId:id,pointer,kind:source.kind,conditions:source.conditions,validity:'current',value:structuredClone(resolved.item)};
}});
assert.deepEqual(paths,[resolved.menuPointer],'the saved pending selection must fetch its exact entry, not retry the whole menu');
assert.equal(result.value.status,'evidence_reads_pending_recheck');assert.equal(result.value.conclusionAccepted,false);
const recovery=projectRosterWorkflowFeedbackRecoveryV1({work,reply:paid,request});assert.equal(recovery?.repairKind,'spatial_selected_native_menu');
const repaired=structuredClone(request);repaired.promptNodes.find(n=>n.kind==='selected_native_menu_read_contract').version=2;
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work,reply:paid,request:repaired}),null,'a request already carrying the source fix cannot renew it');
console.log(JSON.stringify({passed:true,actualUniqueMoveDomain:true,exactSharedResolverPointer:resolved.menuPointer,
  fetchedEntryNotWholeMenu:true,authorConfirmationStillRequired:true,oneSourceFixRecoveryOnly:true,
  providerCalls:0,nativeActions:0,productionWrites:0,actualProductionRecoveryProven:false,strategyImprovementProven:false}));
