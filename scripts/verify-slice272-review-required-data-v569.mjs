// Actual reply36 was forced to remove requiredData by local shape feedback.
// It must remain a review proposal with unresolved data and block release.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {assessRosterWorkflowFinalReviewsV1,createRosterWorkflowReviewResolutionV1} from '../packages/roster-strategist/roster-workflow-readiness-v1.mjs';
const dir=path.resolve(process.argv[2]),base=path.join(dir,'workspace/decision-workflows/projection-owner');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const state=await read(path.join(base,'workflow.json'));
const request=(await read(path.join(dir,'36.request.json'))).request;
const reply=await read(path.join(dir,'36.reply.json')),original=JSON.stringify(reply);
const nodes=request.promptNodes,assignment={...nodes.find(n=>n.kind==='workflow_role_assignment'),
  evidenceDirectory:state.evidence.map(e=>({...e,validity:'current',access:'available_unread'}))};
const memory=new Map(),operationState={version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0};
for(const result of nodes.find(n=>n.kind==='exact_read_results').results){
  const ref=`read:${memory.size}`;memory.set(ref,result);
  operationState.reads.push({evidenceId:result.evidenceId,pointer:result.pointer??'',resultRef:ref});
}
const store={load:async()=>state,get:async ref=>memory.has(ref)?memory.get(ref):read(path.join(base,'artifacts',ref+'.json')),
  put:async value=>{const ref=`fixture:${memory.size}`;memory.set(ref,structuredClone(value));return ref;}};
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'actual36-offline',deliberation:{deliberate:async()=>reply}});
const result=await execute(assignment,{operationState,checkpointOperation:async()=>{},readEvidence:async()=>{throw Error('UNEXPECTED_NEW_SOURCE_READ');}});
assert.equal(result.continuation,undefined,'a declared gap must not cause format correction asking the model to remove it');
assert.deepEqual(result.value.checks[0].requiredData,reply.output.checks[0].requiredData);
assert.equal(result.value.checks[0].verdict,reply.output.checks[0].verdict);
const prior=await read(path.join(dir,'p4-result-1792374118018.json'));
const reviews=await Promise.all(prior.finalAssessment.reviewRefs.map(async r=>({...r,value:(await store.get(r.resultRef)).value})));
reviews.find(r=>r.workId==='final-review:r2:component_choices').value=result.value;
const readiness={...prior.readiness,activeWork:[]};
const assessment=assessRosterWorkflowFinalReviewsV1({state,readiness,reviews});
assert.equal(assessment.readyForRelease,false);
assert.ok(assessment.semanticIssues.some(i=>i.checkId==='component_choices'&&i.requiredData.length));
const jobs=createRosterWorkflowReviewResolutionV1({state,readiness,assessment});
assert.ok(jobs.some(j=>j.reviewDomain==='component_choices'),'unresolved review must route to its fact owner');
assert.equal(JSON.stringify(reply),original,'paid model reply is unchanged');
console.log(JSON.stringify({passed:true,rawReply:36,requiredData:result.value.checks[0].requiredData,
  releaseBlocked:true,resolutionDomains:jobs.map(j=>j.reviewDomain),providerCalls:0,productionWrites:0}));
