// Actual empty-parameter probability calls returned an interpretation/error,
// not a Native unknown receipt; the scheduler had no receiver for either one.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {projectRosterWorkflowToolRepairV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {publishRosterWorkflowUnresolvedSourcesV1,createRosterWorkflowToolReturnWorkV1}
  from '../packages/roster-strategist/roster-workflow-tool-return-v1.mjs';
const root=path.resolve(process.argv[2]);
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const read=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const refs=['cd902b8e2e42b9899287cc75f71eeb7822cf158ae20ce480584f64c5c4c61010',
  '3a8b0c4a82db50f7e6f65ee95d4c9c3b249c03db12dd3bbb64d35c9001b55a1d'];
for(const ref of refs){
  const result=await read(ref),before=JSON.stringify(result);
  const repair=projectRosterWorkflowToolRepairV1(result.value);
  assert.equal(repair?.controlReturn,true,'a definite failed read must have a method owner, not strand NO_READY_WORK');
  assert.equal(repair.nativeRetryAuthorized,false);
  assert.equal(repair.factAnswered,false);
  assert.equal(repair.correctable,false,'unknown execution failures must not be promised as parameter-correctable');
  assert.equal(repair.failureClass,'read_execution_failure');
  assert.equal(repair.reasonCode,'PREGAME_LAB_PROBABILITY_ATTACKER_REQUIRED');
  const work=state.work.find(w=>w.resultRef===ref);
  const isolated={...structuredClone(state),work:[structuredClone(work)],evidence:[]};
  const publications=[];
  await publishRosterWorkflowUnresolvedSourcesV1({state:isolated,readArtifact:read,publish:async p=>{
    publications.push(p);isolated.evidence.push({id:p.id});
  }});
  assert.equal(publications.length,1);
  assert.equal(publications[0].kind,'interpretation','an execution diagnostic must NOT be relabelled a Native receipt');
  assert.deepEqual(publications[0].value,result.value);
  const job=createRosterWorkflowToolReturnWorkV1({state:isolated,work,failure:result.value,queryRepair:repair,
    sourceInputs:{},toolDescriptor:{}});
  assert.equal(job.inputs.failedObservation.id,publications[0].id);
  assert.equal(job.inputs.task.value.failure.code,result.value.code);
  assert.equal(projectRosterWorkflowToolRepairV1({...result.value,operation:'native_action'}),null,
    'a possibly stateful action must not gain generic retry/recovery');
  assert.equal(projectRosterWorkflowToolRepairV1({...result.value,nativeSuccess:undefined}),null,
    'an unclassified interrupted execution is not a definite returned failure');
  assert.equal(JSON.stringify(await read(ref)),before);
}
console.log(JSON.stringify({passed:true,actualReadErrorsReturned:2,diagnosticNotNativeFact:true,
  noAutomaticRetryOrParameterSelection:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
