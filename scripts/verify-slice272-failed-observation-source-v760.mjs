// Actual v759: the Raptor's unknown query was in task.failure but absent from
// the evidence directory. The model borrowed an unrelated successful receipt.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as returns from '../packages/roster-strategist/roster-workflow-tool-return-v1.mjs';
import {projectRosterWorkflowToolRepairV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const root=path.resolve(process.argv[2]);
const requestOnly=process.argv.includes('--request-only');
const read=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const original=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const ref='37dbf30a104106a00dab82d776c1e4a9c9661944f7aac83bce599cbc2cb48de0';
const sourceWork=original.work.find(w=>w.resultRef===ref);
assert(sourceWork);
const failure=await read(ref),before=JSON.stringify(failure);
// Reproduce the actual pre-return boundary in memory, not in production.
const work={...structuredClone(sourceWork),status:'needs_model_choice',branchReturnRef:null};
const state={...structuredClone(original),work:[work],evidence:[]};
const job=returns.createRosterWorkflowToolReturnWorkV1({state,work,failure:failure.value,
  queryRepair:projectRosterWorkflowToolRepairV1(failure.value),sourceInputs:{},toolDescriptor:{}});
if(!requestOnly)assert.equal(job?.inputs.failedObservation?.source,'evidence',
  'method owner must receive a real, independently citable failure source, not only literal task.failure');
const memory=new Map(),publications=[];
const publish=async p=>{
  publications.push(structuredClone(p));
  const artifactRef=hash(p.value);memory.set(artifactRef,structuredClone(p.value));
  state.evidence.push({id:p.id,title:p.title,kind:p.kind,bindings:p.bindings,
    conditions:p.conditions,artifactRef});
};
await returns.publishRosterWorkflowUnresolvedSourcesV1({state,readArtifact:read,publish});
const entry=state.evidence[0];
if(!requestOnly){
assert.equal(publications.length,1);
assert.equal(job.inputs.failedObservation.id,entry.id);
assert.notEqual(entry.id,'tool:'+work.id,'later successful replacement must not overwrite the failed observation');
assert.deepEqual(publications[0].value,failure.value);
assert.equal(publications[0].value.receipt.resultStatus,'unknown');
assert.equal(publications[0].value.receipt.estimate,null);
assert(publications[0].conditions.some(x=>x.includes('not a successful measurement')));
await returns.publishRosterWorkflowUnresolvedSourcesV1({state,readArtifact:read,publish});
assert.equal(publications.length,1,'cold synchronization must not duplicate the same attempt');
const report={stoppedWork:[{id:work.id,resultRef:ref},{id:'unexecuted',resultRef:null}]};
const returnedSources=returns.rosterWorkflowReturnedFailureInputsV1({state,report});
assert.equal(Object.values(returnedSources).length,1);
assert.deepEqual(Object.values(returnedSources)[0],job.inputs.failedObservation);
assert.deepEqual(returns.rosterWorkflowReturnedFailureInputsV1({state,report:{
  stoppedWork:[{id:work.id,resultRef:'a-different-attempt'}]}}),{},
  'failure from a different attempt cannot be substituted');
}
const input={...job.inputs,failedObservation:{...job.inputs.failedObservation,
  evidenceId:entry.id,status:'read',value:failure.value}};
let captured;
const execute=createRosterWorkflowReadRoleExecutorV1({store:{
  load:async()=>state,get:async id=>memory.get(id)??read(id),
  put:async value=>{const id=hash(value);memory.set(id,structuredClone(value));return id;}},
  sessionId:'failed-observation-source-v760',
  deliberation:{deliberate:()=>{throw Error('NO_PROVIDER');}},
  onRequest:async request=>{captured=request;throw Error('CAPTURE_ONLY');}});
try{
  await execute({workId:job.id,role:job.role,scope:work.bindings,inputs:input,
    evidenceDirectory:state.evidence},
    {checkpointOperation:async()=>{}});
}catch(error){if(error.message!=='CAPTURE_ONLY')throw error;}
assert(captured);
const delivered=captured.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.failedObservation;
assert.equal(delivered.evidenceId,entry.id);
assert.equal(delivered.value.receipt.unknownReason,failure.value.receipt.unknownReason);
assert.equal(delivered.value.receipt.estimate,null);
assert.equal(JSON.stringify(await read(ref)),before);
assert.deepEqual(JSON.parse(await fs.readFile(root+'/workflow.json','utf8')),original);
console.log(JSON.stringify({passed:true,mode:requestOnly?'request-only':'full',actualUnknownSourcePublished:true,
  actualModelRequestCaptured:true,returnedSummaryReceivesOriginal:true,
  immutableAttemptIdentity:true,noUnknownToZero:true,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
