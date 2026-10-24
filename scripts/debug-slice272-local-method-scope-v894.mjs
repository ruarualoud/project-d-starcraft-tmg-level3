// Reproduce the actual A choice chain stranded by a Plan-only revision.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterCompletionRevalidationV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const [root,out]=process.argv.slice(2),clone=structuredClone;
const original=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const base='product:strategy-hypothesis:v1:3621f50797e05ed31755:purpose:v2:study:order-repair0:order-repair0:order0';
let state=clone(original);const memory=new Map();let executions=0;
const get=async ref=>memory.has(ref)?clone(memory.get(ref)):JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const store={load:async()=>clone(state),save:async next=>{state=clone(next);},get,
  put:async value=>{const ref=hash(value);memory.set(ref,clone(value));return ref;}};
const report={pass:false,checks:[],providerCalls:0,nativeCalls:0,productionWrites:0};
try{
  await createRosterDecisionWorkflowV1({store,execute:async()=>{executions++;throw Error('unexpected execution');}});
  const old=original.work.filter(w=>w.id.startsWith(base)&&w.role==='roster_workflow_experiment_planner');
  assert.equal(old.length,9);
  for(const before of old){
    const after=state.work.find(w=>w.id===before.id);
    assert.equal(after.status,'evidence_ready','Plan-only invalidation stranded '+before.id);
    assert.equal(after.inputs.draft.scopeUsage,'historical_reference');
    assert.equal(after.resultRef,before.resultRef);assert.deepEqual(after.operationState,before.operationState);
    assert.equal(after.orderRepairGeneration,before.orderRepairGeneration);
    assert.equal(after.orderRepairLimit,before.orderRepairLimit);
  }
  for(const suffix of [':s1',':s2',':s3',':s4']){
    const before=original.work.find(w=>w.id===base+suffix),after=state.work.find(w=>w.id===before.id);
    assert.equal(after.resultRef,before.resultRef);assert.equal(after.status,before.status);
  }
  assert.equal(executions,0);assert.equal(state.draftRef,original.draftRef);
  report.checks.push({name:'actual-nine-role-records-restored-without-replay',pass:true,records:old.length,countersPreserved:true});
  const {projectRosterLocalMethodScopeRepairsV1}=await import('../packages/roster-strategist/roster-workflow-local-method-scope-v1.mjs');
  assert.deepEqual(await projectRosterLocalMethodScopeRepairsV1({state,readArtifact:get}),[],'idempotent cold load');
  const changed=clone(original);changed.scope.army='different-army';
  assert.equal((await projectRosterLocalMethodScopeRepairsV1({state:changed,readArtifact:get})).filter(r=>r.workId.startsWith(base)).length,0);
  const retired=clone(original);retired.work.find(w=>w.id===base+':s3').branchReturnRef='explicit-owner-return';
  assert.equal((await projectRosterLocalMethodScopeRepairsV1({state:retired,readArtifact:get})).filter(r=>r.workId.startsWith(base+':s3:')).length,0);
  const hidden=clone(original),target=hidden.work.find(w=>w.id===base+':s3:observed-choice');
  target.inputs.extra={source:'evidence',id:'stale-real-fact',pointer:''};
  hidden.evidence.push({id:'stale-real-fact',bindings:{army:'different-army'}});
  assert(!(await projectRosterLocalMethodScopeRepairsV1({state:hidden,readArtifact:get})).some(r=>r.workId===target.id));
  report.checks.push({name:'scope-staleness-and-explicit-retirement-still-block',pass:true,negativeCases:3,idempotent:true});
  for(const ref of ['b0d05f7b7064edf4e29d9c8c136c694e73fb72d3a7bd64c30acdc1b5dc04e991','a1364c73ad0fcf95a12185dbef4c3ffdc17703da19777d4784cbdf1a0d7e817c']){
    const work=state.work.find(w=>w.resultRef===ref),result=await get(ref);
    const revalidation=await createRosterCompletionRevalidationV1({state,work,result,readArtifact:get});
    assert(revalidation,'existing saved-reply revalidation must be reachable');
    assert.equal(revalidation.operationState.sourceRevalidation.newProviderCall,false);
    assert.equal(revalidation.sourceResultRef,ref);
  }
  report.checks.push({name:'both-current-source-fixes-reuse-paid-replies',pass:true,newProviderCalls:0});
  report.pass=true;
}catch(error){report.error={code:error.code,message:error.message,stack:error.stack?.split('\n').slice(0,4)};process.exitCode=1;}
await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
