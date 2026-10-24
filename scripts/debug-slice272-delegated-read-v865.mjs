// Replay the real A local repair without a Provider or Native call. A read made
// for a pending observation is supporting work, not a new comparison owner.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {prepareRosterWorkflowMethodCompilationV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const [root,output,previous]=process.argv.slice(2);
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const work=state.work.find(w=>w.resultRef==='22e3e03de46061c585098664b96838f5f09a67f85c4bd0a19ca929c08cdcf8d3');
assert.ok(work,'the actual A paid local-repair result must exist');
const result=await get(work.resultRef),order=result.value.failedWorkOrders[0].order;
const context=await prepareRosterWorkflowMethodCompilationV1({state,work,result,readArtifact:get});
const original=JSON.stringify({order,state});
const compile=(o=order,c=context)=>compileRosterWorkflowExperimentV1({order:o,scope:work.bindings,
  namespace:'v865-not-dispatched',evidenceDirectory:state.evidence,...c});
const tests=[
  ['actual-read-under-observation',()=>{
    assert.equal(context.choiceContract.operation,'probability');
    assert.equal(context.choiceContract.delegatedComparison.binding.role,'observation_candidate');
    assert.equal(order.experimentScope.comparisonBinding,null);
    const jobs=compile();assert.equal(jobs.length,1);
    const request=jobs[0].inputs.request.value,b=request.comparisonBinding;
    assert.equal(request.operation,'inspect');assert.equal(b.stage,'prerequisite');
    assert.equal(b.role,'supporting_step');assert.deepEqual(b.observationStepIds,[]);
    assert.equal(b.endpointReached,null);assert.equal(b.sourceApproved,false);
    assert.equal(b.inheritedFromWorkId,context.choiceContract.targetWorkId);
    assert.deepEqual(b.purposeSource,context.choiceContract.delegatedComparison.binding.purposeSource);
    assert.deepEqual(b.measurements,context.choiceContract.delegatedComparison.binding.measurements);
    assert.equal(JSON.stringify({order,state}),original);
    return {jobs:jobs.map(j=>({id:j.id,request:j.inputs.request.value})),immutableOriginal:true};
  }],
  // v870 supersedes the old rejection: exact delegated operations inherit
  // identity, not measurement approval. Do not reuse the old passed check.
  ['matching-measurement-inherits-unapproved-identity-v870',()=>{
    const o=structuredClone(order);o.steps[0].operation='probability';
    const jobs=compile(o),b=jobs[0].inputs.request.value.comparisonBinding;
    assert.equal(b.role,'observation_candidate');assert.equal(b.sourceApproved,false);
    assert.equal(b.endpointReached,null);
    assert.equal(b.inheritedFromWorkId,context.choiceContract.targetWorkId);
  }],
  ['new-scene-still-not-delegated',()=>{
    const o=structuredClone(order);o.steps[0].operation='scenario';
    assert.throws(()=>compile(o),e=>e.code==='ROSTER_WORKFLOW_CHOICE_SCOPE_EXCEEDED');
  }],
  ['explicit-arm-conflict-still-rejected',()=>{
    const o=structuredClone(order),p=context.choiceContract.delegatedComparison.binding;
    o.experimentScope.comparisonBinding={purposeEvidenceNumber:p.purposeSource.evidenceNumber,
      arm:'current',stage:'prerequisite',measurementNumbers:p.measurements.map(m=>m.number),observationStepIds:[]};
    assert.equal(p.arm,'alternative');
    // Before the fix an explicit declaration can relabel this local delegated
    // read; after it must agree with the saved pending operation's identity.
    assert.throws(()=>compile(o),e=>e.code==='ROSTER_COMPARISON_BINDING_INVALID'
      &&e.detail.reason==='delegated_prerequisite_identity_conflict');
  }],
  ['stale-parent-purpose-still-rejected',()=>{
    const c=structuredClone(context);c.choiceContract.delegatedComparison.binding.purposeSource.artifactRef='wrong-source';
    assert.throws(()=>compile(order,c),e=>e.code==='ROSTER_COMPARISON_BINDING_INVALID');
  }],
];
const prior=previous?JSON.parse(await fs.readFile(previous,'utf8')):null,checks=[];
for(const [name,fn] of tests){
  const passed=prior?.checks.find(c=>c.name===name&&c.pass);
  if(passed){checks.push({...passed,inheritedFrom:previous});continue;}
  try{checks.push({name,pass:true,evidence:await fn()});}
  catch(e){checks.push({name,pass:false,error:{code:e.code??null,message:e.message,detail:e.detail??null}});}
}
const report={schema:'slice272_delegated_read_debug_v865',pass:checks.every(c=>c.pass),
  source:{root,workId:work.id,resultRef:work.resultRef},checks,
  providerCalls:0,nativeCalls:0,productionWrites:0,trainingTruth:false};
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,pass:report.pass,checks:checks.map(({name,pass,inheritedFrom,error})=>({name,pass,inheritedFrom,error}))}));
process.exitCode=report.pass?0:1;
