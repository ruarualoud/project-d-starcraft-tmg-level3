// Exact r19 scope leak: the coverage judge received only generic task prose,
// then copied a broader map obligation into the combat classification repair.
// Exercise the shared product projection and actual role request; no Provider.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {rosterReviewCheckPassedV1} from '../packages/roster-strategist/roster-review-data-questions-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [directory,output]=process.argv.slice(2),copy=structuredClone;
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8')),memory=new Map(),checks=[];
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const root=state.work.find(w=>w.id==='review-resolution:r19:combat_and_losses');
const priorReview=state.work.find(w=>w.id===root.id+':source-review:v2');
const before=hash(state);
async function capture(work){
  const assignment=await get(work.inputRef);
  const inputs=await projectRosterWorkflowRoleSourceInputsV1({assignment,state,readArtifact:get});
  const scope=inputs.localObligation?.value;
  assert(scope,'Local source review must receive the actual delegated obligation, not only generic task prose');
  assert.equal(scope.goalWorkId,root.id);
  assert.deepEqual(scope.originalGoal.inputs.reviewIssues,root.inputs.reviewIssues);
  let request;const directoryCopy=copy(assignment.evidenceDirectory);
  const execute=createRosterWorkflowReadRoleExecutorV1({store:{load:async()=>state,get,put},sessionId:'offline-v947',
    deliberation:{deliberate:async value=>{request=value;throw Error('OFFLINE_CAPTURE_ONLY');}}});
  try{await execute({...assignment,inputs},{operationState:work.operationState,checkpointOperation:async()=>{},
    readEvidence:async()=>assert.fail('Capture must not perform additional source queries'),
    publishContext:async(value,metadata={})=>{const ref=await put(value),id='offline-v947:'+ref;
      let index=directoryCopy.findIndex(e=>e.id===id);if(index<0){index=directoryCopy.length;directoryCopy.push({id,artifactRef:ref,
        title:metadata.title??'Offline context',kind:metadata.kind??'interpretation',validity:'current',bindings:copy(state.scope),
        conditions:metadata.conditions??[],availability:'available',readPaths:[]});}
      return {...directoryCopy[index],evidenceNumber:index+1,...(metadata.includeDirectory?{evidenceDirectory:copy(directoryCopy)}:{})};}});
  }catch(error){assert.match(error.message,/OFFLINE_CAPTURE_ONLY/);}
  assert(request,'Must capture the actual product role request');
  const actual=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.localObligation?.value;
  assert.deepEqual(actual,scope);
  assert.match(JSON.stringify(request),/global obligations remain pending with their original owners/);
  return {request,scope};
}
try{
  const review=await capture(priorReview);
  assert.equal(review.scope.reviewLevel,'question_coverage');
  assert.match(review.request.userMessage,/localObligation/);
  checks.push('actual_coverage_request_receives_exact_original_domain_and_local_scope');
  const repair=await capture(state.work.find(w=>w.id===root.id+':source-revision'));
  assert.equal(repair.scope.reviewLevel,'fact_method');
  const stage=repair.request.promptNodes.find(n=>n.kind==='source_review_repair_stage');
  assert(stage.necessaryQuestions.length,'The old review gap is preserved, not silently waived');
  assert.match(stage.instruction,/localObligation/);
  checks.push('cold_resumed_fact_repair_receives_same_scope_without_deleting_feedback');
  const atomic=state.work.find(w=>w.id===root.id+':source-review:v2:claim:0');
  const atomicAssignment=await get(atomic.inputRef);
  const atomicInputs=await projectRosterWorkflowRoleSourceInputsV1({assignment:atomicAssignment,state,readArtifact:get});
  assert.equal(atomicInputs.localObligation.value.reviewLevel,'material_claim');
  assert.equal(atomicInputs.localObligation.value.parentIsContextOnly,true);
  const full=state.work.find(w=>w.id==='final-review:r19:combat_and_losses');
  const fullAssignment=await get(full.inputRef);
  const fullInputs=await projectRosterWorkflowRoleSourceInputsV1({assignment:fullAssignment,state,readArtifact:get});
  assert.equal(fullInputs.localObligation,undefined,'A whole-domain audit must not be silently narrowed');
  checks.push('atomic_claim_does_not_inherit_parent_obligations_and_domain_review_is_not_narrowed');
  const bad=await get(priorReview.resultRef),check=bad.value.checks.find(c=>c.checkId==='question_coverage');
  assert.equal(rosterReviewCheckPassedV1(check),false,'Old model classification must still block; Host cannot reinterpret it');
  const corrected={...copy(check),dataQuestions:[],requiredData:[]};
  assert.equal(rosterReviewCheckPassedV1(corrected),true,'Injected supported LOCAL answer can pass its check only');
  corrected.dataQuestions=[{question:'An actually required local measurement',classification:'necessary_fact',publicReason:'Original predicate requires it',evidenceNumbers:[]}];
  assert.equal(rosterReviewCheckPassedV1(corrected),false);
  assert.equal(hash(state),before,'No global question, Plan, prior reply or production state may change');
  checks.push('normal_and_missing_local_fact_injections_preserve_global_state_and_old_rejection');
  await fs.writeFile(output,JSON.stringify({pass:true,checks,providerCalls:0,nativeCalls:0,productionWrites:0},null,2)+'\n');
  console.log(JSON.stringify({pass:true,checks}));
}catch(error){await fs.writeFile(output,JSON.stringify({pass:false,checks,error:error.message},null,2)+'\n');
  console.log(JSON.stringify({pass:false,checks,error:error.message}));process.exitCode=1;}
