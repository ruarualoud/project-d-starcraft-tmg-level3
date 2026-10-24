// Actual v869 A: a child selects the SAME saved pending operation, but is
// incorrectly asked to re-author its already-owned comparison identity.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {prepareRosterWorkflowMethodCompilationV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {resolveRosterComparisonBindingV1} from '../packages/roster-strategist/roster-comparison-observation-v1.mjs';
import {rosterWorkflowChoiceContractV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
const [root,out,previous]=process.argv.slice(2),copy=structuredClone;
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const work=state.work.find(w=>w.id.endsWith(':s3:observed-choice:order-repair0'));
assert.ok(work?.resultRef,'Actual paid failed local choice must exist');
const result=await get(work.resultRef),order=result.value.failedWorkOrders[0].order;
const context=await prepareRosterWorkflowMethodCompilationV1({state,work,result,readArtifact:get});
const frozen=JSON.stringify({state,order}),checks=[];
const prior=previous?JSON.parse(await fs.readFile(previous,'utf8')):null;
const compile=(o=order,c=context)=>compileRosterWorkflowExperimentV1({order:o,scope:work.bindings,
  namespace:'v870-offline',evidenceDirectory:state.evidence,...c});
async function check(name,fn){const old=prior?.checks.find(x=>x.name===name&&x.pass);
  if(old){checks.push({...old,inheritedFrom:previous});return;}
  try{checks.push({name,pass:true,...await fn()});}catch(e){checks.push({name,pass:false,error:{code:e.code,message:e.message,detail:e.detail}});}
  await fs.writeFile(out,JSON.stringify({pass:checks.every(x=>x.pass),complete:false,checks},null,2)+'\n');
  const {name:label,pass,error}=checks.at(-1);console.log(JSON.stringify({name:label,pass,error}));}
await check('actual-saved-operation-inherits-parent-not-a-new-owner',()=>{
  const jobs=compile();assert.equal(jobs.length,1);
  const request=jobs[0].inputs.request.value,p=context.choiceContract.delegatedComparison.binding,b=request.comparisonBinding;
  assert.equal(request.operation,'formation_scene');assert.deepEqual(b.purposeSource,p.purposeSource);
  assert.equal(b.arm,p.arm);assert.deepEqual(b.measurements,p.measurements);
  assert.equal(b.stage,p.stage);assert.equal(b.role,'observation_candidate');
  assert.deepEqual(b.observationStepIds,['s1']);assert.equal(b.sourceStepId,'s1');
  assert.equal(b.inheritedFromWorkId,context.choiceContract.targetWorkId);
  assert.equal(b.endpointReached,null);assert.equal(b.sourceApproved,false);
  assert.equal(b.toolProofScope.precision,'conditional_scene','Identity inheritance cannot promote geometry to attack measurement');
  assert.equal(JSON.stringify({state,order}),frozen);
  return {request,paidOrderUnchanged:true,measurementNotApproved:true};
});
await check('explicit-child-cannot-change-saved-arm-or-measurements',()=>{
  const o=copy(order),p=context.choiceContract.delegatedComparison.binding;
  o.experimentScope.comparisonBinding={purposeEvidenceNumber:p.purposeSource.evidenceNumber,
    arm:'alternative',stage:p.stage,measurementNumbers:[1],observationStepIds:['s1']};
  assert.throws(()=>compile(o),e=>e.code==='ROSTER_COMPARISON_BINDING_INVALID'
    &&e.detail.reason==='delegated_comparison_identity_conflict');
});
await check('undelegated-operation-and-stale-purpose-still-rejected',()=>{
  const o=copy(order);o.steps[0].operation='probability';
  assert.throws(()=>compile(o),e=>e.code==='ROSTER_WORKFLOW_CHOICE_SCOPE_EXCEEDED');
  const c=copy(context);c.choiceContract.delegatedComparison.binding.purposeSource.artifactRef='wrong-source';
  assert.throws(()=>compile(order,c),e=>e.code==='ROSTER_COMPARISON_BINDING_INVALID');
});
await check('spatial-dispatcher-inherits-only-the-saved-query-kind',()=>{
  const s=copy(state),target=s.work.find(w=>w.id===context.choiceContract.targetWorkId);
  target.inputs.request.value.operation='spatial';
  target.inputs.request.value.args.queryKind='attack_probability';
  const contract=rosterWorkflowChoiceContractV1({state:s,workId:work.id});
  assert.equal(contract.delegatedComparison.queryKind,'attack_probability');
  const o=copy(order);o.steps[0].operation='spatial';
  const resolve=()=>resolveRosterComparisonBindingV1({order:o,scope:work.bindings,
    evidenceDirectory:state.evidence,comparisonPurpose:context.comparisonPurpose,
    delegatedComparison:contract.delegatedComparison});
  o.steps[0].argumentsJson=JSON.stringify({queryKind:'attack_probability'});
  const exact=resolve();assert.deepEqual(exact.observationStepIds,['s1']);
  assert.equal(exact.sourceApproved,false);assert.equal(exact.endpointReached,null);
  o.steps[0].argumentsJson=JSON.stringify({queryKind:'space.solve_static_formation'});
  const prep=resolve();assert.equal(prep.stage,'prerequisite');assert.deepEqual(prep.observationStepIds,[]);
});
await fs.writeFile(out,JSON.stringify({pass:checks.every(x=>x.pass),checks,source:{root,workId:work.id,resultRef:work.resultRef},
  providerCalls:0,nativeCalls:0,productionWrites:0,trainingTruth:false},null,2)+'\n');
process.exitCode=checks.every(x=>x.pass)?0:1;
