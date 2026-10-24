// Replay the actual82 correction role offline. It must identify the invalid
// future evidence-number binding, not imply that the inherited parent is valid.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const dir=path.resolve(process.argv[2]),base=path.join(dir,'workspace/decision-workflows/projection-owner');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const before=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(before);
const request=(await read(path.join(dir,'82.request.json'))).request,reply=await read(path.join(dir,'82.reply.json'));
const originalReply=JSON.stringify(reply),nodes=request.promptNodes;
const assignment={...nodes.find(n=>n.kind==='workflow_role_assignment'),evidenceDirectory:state.evidence.map(e=>({...e,validity:'current'}))};
const memory=new Map(),operationState={version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0};
for(const result of nodes.find(n=>n.kind==='exact_read_results').results){
  const ref=`read:${memory.size}`;memory.set(ref,result);
  operationState.reads.push({evidenceId:result.evidenceId,pointer:result.pointer??'',resultRef:ref});
}
let actualRequest;
const store={load:async()=>state,get:async ref=>memory.has(ref)?memory.get(ref):read(path.join(base,'artifacts',ref+'.json')),
  put:async value=>{const ref=`fixture:${memory.size}`;memory.set(ref,structuredClone(value));return ref;}};
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'actual82-offline',deliberation:{deliberate:async r=>{actualRequest=r;return reply;}}});
const result=await execute(assignment,{operationState,checkpointOperation:async()=>{},readEvidence:async()=>{throw Error('UNEXPECTED_READ');}});
const failure=result.value.failedWorkOrders[0];
assert.equal(failure.error.code,'ROSTER_WORKFLOW_NATIVE_SELECTION_INVALID');
assert.ok(failure.error.detail.issues?.some(i=>i.code==='receipt_evidence_number_does_not_exist'
  &&i.argumentPointer==='/selection/sourceEvidenceNumber'&&i.fromStepId==='inspect-branch'),
  'return the actual invalid reference, not only a generic shape instruction');
assert.ok(failure.error.detail.issues.some(i=>i.code==='exactly_one_selection_source_required'));
assert.equal(result.value.workOrders.length,0,'invalid work must not execute');
const inherited=actualRequest.promptNodes.find(n=>n.kind==='inherited_experiment_dependencies');
assert.equal(inherited.selectedParentValidated,false);
assert.equal(inherited.provesSourceExistsOnly,true);
assert.equal(JSON.stringify(reply),originalReply);
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),before);
console.log(JSON.stringify({passed:true,actualReply:82,specificMissingSourceAndFutureNumberReported:true,
  failedParentNotEndorsed:true,invalidOrderNotAdmitted:true,providerCalls:0,productionWrites:0,modelCorrectionProven:false}));
